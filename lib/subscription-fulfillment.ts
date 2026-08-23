import 'server-only';
import type Stripe from 'stripe';
import type { PractitionerSubscription } from './generated/prisma';
import { prisma } from './db';
import { fulfillCapturedOrder } from './paypal-fulfillment';

/**
 * Turn a paid subscription invoice into a shipped Merit order.
 *
 * Stripe knows an amount settled. It does not know what is in the box — by
 * design, since nothing product-identifying is sent to it. The mirror row is
 * the only place the contents exist, so the order is rebuilt from that
 * snapshot and handed to the SAME fulfilment function a one-off purchase
 * uses. One fulfilment path means renewals get ShipStation, the confirmation
 * email and affiliate commission without any of it being reimplemented.
 *
 * Idempotency matters more here than on a one-off: Stripe retries webhook
 * delivery, and a duplicate would ship a second box. The invoice id is the
 * natural key — one invoice is one shipment — so it is used as the processor
 * id and the existing promote-by-id lookup absorbs redelivery.
 */
export async function fulfillSubscriptionInvoice(
  mirror: PractitionerSubscription,
  invoice: Stripe.Invoice,
): Promise<{ orderId: string | null; isNew: boolean }> {
  const already = await prisma.order.findFirst({
    where: { paypalOrderId: invoice.id },
    select: { id: true },
  });
  if (already) return { orderId: already.id, isNew: false };

  const lines = (mirror.lines as unknown as Array<{
    handle: string; title: string; bundleLabel: string; unitCents: number; qty: number;
  }>) ?? [];

  // Shaped like the PayPal order the shared fulfilment path consumes — the
  // same adapter trick paymentIntentAsPayPalOrder() uses for card payments.
  const asPayPalOrder = {
    id: invoice.id,
    status: 'COMPLETED',
    payer: { email_address: mirror.customerEmail },
    purchase_units: [
      {
        // `p` rides along INTERNALLY only — this shaped object never reaches
        // Stripe. It lets the commission recorder credit the practice's
        // referring affiliate on renewals, where no order row exists yet at
        // the moment the commission is written.
        custom_id: JSON.stringify({
          a: mirror.affiliateId ?? null,
          c: mirror.discountCode ?? null,
          p: mirror.applicationId ?? null,
        }),
        amount: { value: (invoice.amount_paid / 100).toFixed(2) },
        shipping: mirror.shipping ?? undefined,
        items: lines.map((l) => ({
          name: l.title,
          quantity: String(l.qty),
          unit_amount: { value: (l.unitCents / 100).toFixed(2) },
          sku: l.handle,
          description: l.bundleLabel,
        })),
        payments: {
          captures: [
            { id: invoice.id, amount: { value: (invoice.amount_paid / 100).toFixed(2) } },
          ],
        },
      },
    ],
  };

  const result = await fulfillCapturedOrder(asPayPalOrder, 'webhook');

  // Stamp the practice onto the order row the fulfilment just created, so the
  // repair path and exports see the same linkage the live commission used.
  if (result.orderId && mirror.applicationId) {
    await prisma.order
      .update({
        where: { id: result.orderId },
        data: { practitionerApplicationId: mirror.applicationId },
      })
      .catch(() => {});
  }
  return { orderId: result.orderId, isNew: result.isNew };
}
