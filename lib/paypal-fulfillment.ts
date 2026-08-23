import { prisma } from './db';
import { tierForOrderCount } from './affiliate';
import { createOrderFromPayPal, issueOrderConfirmationEmail } from './orders';
import { notifyOpsOfOrder } from './ops-notify';
import { sendMetaPurchase } from './meta-capi';
import { notifyAffiliateOfSale } from './affiliate-sale-email';
import { computeGrossProfitCommission, referringAffiliateFor } from './practitioner-commission';

/**
 * Everything that must happen once a PayPal capture is COMPLETED: persist/
 * promote the order, send the confirmation email, fire the ad-conversion
 * event, and record the affiliate commission.
 *
 * This is the single source of truth for post-payment fulfillment. It runs
 * from TWO places:
 *   - /api/paypal/capture  (synchronous — the durable path while the PayPal
 *     webhook is NOT yet wired on the Merchant-of-Record account)
 *   - /api/paypal/webhook  (async, when a webhook is eventually configured)
 *
 * It is fully idempotent — `createOrderFromPayPal` dedupes on capture id and
 * `OrderCommission.paypalCaptureId` is @unique — so running from both paths
 * (once the webhook exists) never double-books an order or a commission.
 */
export async function fulfillCapturedOrder(
  paypalOrder: any,
  source: 'capture' | 'webhook' = 'capture',
): Promise<{ orderId: string | null; isNew: boolean; commissionCents: number }> {
  const pu = paypalOrder?.purchase_units?.[0];
  const capture = pu?.payments?.captures?.[0];
  if (!pu || !capture?.id) return { orderId: null, isNew: false, commissionCents: 0 };

  const captureId: string = capture.id;
  const orderId: string = paypalOrder.id;
  const amountCents = Math.round(parseFloat(capture.amount?.value ?? '0') * 100);

  // Attribution packed into custom_id at create-order time.
  let attribution: { a?: string | null; c?: string | null } = {};
  if (pu.custom_id) { try { attribution = JSON.parse(pu.custom_id); } catch { /* ignore */ } }
  const affiliateId = attribution.a ?? null;
  const discountCode = attribution.c ?? null;

  // 1) Persist / promote the order (PENDING_PAYMENT → PAID) + emails
  let persisted: { order: { id: string }; isNew: boolean } | null = null;
  try {
    const result = await createOrderFromPayPal(paypalOrder, {
      affiliateId,
      discountCode: discountCode?.toUpperCase() ?? null,
    });
    if (result) {
      persisted = result;

      // Customer confirmation — only on first promotion, since a redelivered
      // webhook must not send the buyer a second receipt. AWAITED: it was
      // fire-and-forget, which risks losing the send if the process turns over
      // before the promise settles.
      if (result.isNew) {
        await issueOrderConfirmationEmail(result.order.id).catch((err) =>
          console.error('[fulfill] confirmation email failed', err),
        );
      }

      // Ops notification — NOT gated on isNew. notifyOpsOfOrder is idempotent
      // on the ADMIN_NOTIFIED event, so a redelivered webhook can't double-send,
      // while an order whose first notification failed still gets one here.
      // Sequential after the customer email so the two never race into Resend's
      // rate limiter — the failure mode that made ops emails vanish silently.
      await notifyOpsOfOrder(result.order.id).catch((err) =>
        console.error('[fulfill] ops notification failed', err),
      );
    }
  } catch (err) {
    console.error('[fulfill] order persistence failed', err);
  }

  // 2) Server-side ad Purchase signal (deduped vs browser pixel by order id)
  sendMetaPurchase({
    eventId: orderId,
    value: amountCents / 100,
    currency: capture.amount?.currency_code || 'USD',
    email: (paypalOrder.payer?.email_address ?? '').toLowerCase() || null,
  }).catch(() => {});

  // 3) Affiliate commission
  let commissionCents = 0;
  try {
    commissionCents = await recordAffiliateCommission(paypalOrder);
  } catch (err) {
    console.error('[fulfill] commission failed', err);
  }

  void source; // reserved for future per-source event labeling
  return { orderId: persisted?.order.id ?? null, isNew: persisted?.isNew ?? false, commissionCents };
}

/**
 * Write the OrderCommission + evergreen CustomerAffiliateLink for a paid
 * order, if it carries affiliate attribution. Ported verbatim from the
 * webhook so both paths credit affiliates identically. Idempotent on
 * OrderCommission.paypalCaptureId. Returns the commission cents written (0
 * if none / self-purchase / already processed).
 */
async function recordAffiliateCommission(paypalOrder: any): Promise<number> {
  const pu = paypalOrder?.purchase_units?.[0];
  const capture = pu?.payments?.captures?.[0];
  if (!pu || !capture?.id) return 0;

  const captureId: string = capture.id;
  const orderId: string = paypalOrder.id;
  const amountCents = Math.round(parseFloat(capture.amount?.value ?? '0') * 100);

  let attribution: { a?: string | null; c?: string | null; p?: string | null } = {};
  if (pu.custom_id) { try { attribution = JSON.parse(pu.custom_id); } catch { /* ignore */ } }

  // One fetch serves three fallbacks below: affiliate resolved at persistence,
  // buyer email for card-flow captures, and the practitioner stamp.
  const persisted = await prisma.order.findUnique({
    where: { paypalOrderId: orderId },
    select: {
      affiliateId: true,
      customerEmail: true,
      practitionerApplicationId: true,
      // For the gross-profit basis. Stripe intents carry no line items
      // (nothing product-identifying is sent to Stripe), so the persisted
      // order is the only source of what actually shipped.
      lines: { select: { handle: true, bundleLabel: true, unitCents: true, qty: true } },
    },
  });

  const payerEmail = (paypalOrder.payer?.email_address ?? '').toLowerCase();
  const payerId: string | null = paypalOrder.payer?.payer_id ?? null;

  // Advanced Card Fields captures omit payer.email_address — fall back to the
  // pre-created order's email so card-flow referrals still earn.
  const buyerEmail: string | null = payerEmail || persisted?.customerEmail?.toLowerCase() || null;
  if (!buyerEmail) return 0;

  /* Attribution, in priority order:
       1. custom_id from the checkout session (?ref= cookie),
       2. Order.affiliateId resolved at persistence (typed code),
       3. the practice's referring affiliate, assigned by the admin on the
          practitioner application. Physicians are introduced offline and
          carry neither cookie nor code — the dashboard assignment IS their
          attribution, and it also decides the gross-profit basis below. */
  const practitionerReferrer = await referringAffiliateFor(
    buyerEmail,
    attribution.p ?? persisted?.practitionerApplicationId ?? null,
  ).catch(() => null);

  const affiliateId = attribution.a ?? persisted?.affiliateId ?? practitionerReferrer ?? null;
  if (!affiliateId) return 0;

  const affiliate = await prisma.affiliate.findUnique({
    where: { id: affiliateId },
    select: { id: true, email: true, status: true },
  });
  if (!affiliate || affiliate.status !== 'ACTIVE') return 0;

  const isSelfPurchase = buyerEmail === affiliate.email.toLowerCase();

  // Evergreen lock: find-or-create by email; historical lock wins.
  let link = await prisma.customerAffiliateLink.findUnique({ where: { customerEmail: buyerEmail } });
  if (!link) {
    link = await prisma.customerAffiliateLink.create({
      data: { customerEmail: buyerEmail, paypalPayerId: payerId, affiliateId: affiliate.id },
    });
  } else if (link.affiliateId !== affiliate.id) {
    affiliate.id = link.affiliateId; // credit the original affiliate
  } else if (payerId && !link.paypalPayerId) {
    await prisma.customerAffiliateLink.update({ where: { id: link.id }, data: { paypalPayerId: payerId } });
  }

  // Commissionable base = items − discount (fall back to capture amount).
  const orderTotalCents = (() => {
    const breakdown = pu.amount?.breakdown;
    if (breakdown?.item_total?.value) {
      const itemTotal = Math.round(parseFloat(breakdown.item_total.value) * 100);
      const discount = Math.round(parseFloat(breakdown.discount?.value ?? '0') * 100);
      return Math.max(0, itemTotal - discount);
    }
    return amountCents;
  })();
  if (orderTotalCents <= 0) return 0;

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const trailing30 = await prisma.orderCommission.count({
    where: { affiliateId: affiliate.id, occurredAt: { gte: since }, status: { not: 'CLAWED_BACK' } },
  });
  const { rateBp: tierRateBp } = tierForOrderCount(trailing30);

  /* Practitioner referrals earn on GROSS PROFIT, not revenue.
     A practice buys at account pricing and reorders steadily, so a share of
     revenue there would pay commission on volume carrying very little margin.
     Only orders from a practice this same affiliate introduced switch basis —
     an ordinary customer who happens to share an affiliate is unaffected.
     (practitionerReferrer was resolved above, id-first, alongside attribution
     — one resolution decides both credit and basis, so they cannot drift.) */
  const useGrossProfit = practitionerReferrer != null && practitionerReferrer === affiliate.id;

  let rateBp = tierRateBp;
  let commissionCents = isSelfPurchase ? 0 : Math.floor((orderTotalCents * rateBp) / 10_000);
  let basis: 'REVENUE' | 'GROSS_PROFIT' = 'REVENUE';
  let gp: Awaited<ReturnType<typeof computeGrossProfitCommission>> | null = null;

  if (useGrossProfit && !isSelfPurchase) {
    const items: any[] = Array.isArray(pu.items) ? pu.items : [];
    let lines = items.map((it) => ({
      handle: String(it?.sku ?? ''),
      bundleLabel: String(it?.description ?? ''),
      unitCents: Math.round(parseFloat(it?.unit_amount?.value ?? '0') * 100),
      qty: Math.max(1, parseInt(String(it?.quantity ?? '1'), 10) || 1),
    }));
    // Stripe payloads carry no items — cost the order from its own lines, or
    // the basis would silently fall back to revenue on every card order.
    if (lines.length === 0 && persisted?.lines?.length) {
      lines = persisted.lines.map((l) => ({
        handle: l.handle,
        bundleLabel: l.bundleLabel,
        unitCents: Number(l.unitCents),
        qty: l.qty,
      }));
    }
    if (lines.length > 0) {
      gp = await computeGrossProfitCommission(lines);
      basis = 'GROSS_PROFIT';
      rateBp = gp.rateBp;
      commissionCents = gp.commissionCents;
      if (gp.uncostedHandles.length > 0) {
        // Withheld rather than guessed — see computeGrossProfitCommission.
        console.warn(
          `[commission] gross-profit withheld on ${orderId}: no cost for ${gp.uncostedHandles.join(', ')}`,
        );
      }
    }
  }

  try {
    await prisma.$transaction([
      prisma.orderCommission.create({
        data: {
          paypalOrderId: orderId,
          paypalCaptureId: captureId,
          paypalPayerId: payerId,
          customerLinkId: link.id,
          affiliateId: affiliate.id,
          orderTotalCents: BigInt(orderTotalCents),
          commissionRateBp: rateBp,
          commissionCents: BigInt(commissionCents),
          basis,
          // Snapshotted so the figure can be re-derived months later; product
          // cost moves, and without these the number is unarguable.
          productCostCents: gp ? BigInt(gp.productCostCents) : null,
          shippingDeductionCents: gp ? BigInt(gp.shippingDeductionCents) : null,
          grossProfitCents: gp ? BigInt(gp.grossProfitCents) : null,
          status: 'PENDING',
        },
      }),
      prisma.customerAffiliateLink.update({
        where: { id: link.id },
        data: { totalOrders: { increment: 1 }, totalCommissionCents: { increment: BigInt(commissionCents) } },
      }),
    ]);
  } catch (err: any) {
    if (err?.code === 'P2002') return 0; // already processed
    throw err;
  }

  // Momentum email — non-blocking; skip $0 self-purchase rows.
  if (commissionCents > 0) {
    void notifyAffiliateOfSale(affiliate.id, { commissionCents, orderTotalCents, rateBp }).catch(() => {});
  }
  return commissionCents;
}
