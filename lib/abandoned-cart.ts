import 'server-only';
import { prisma } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import { wrapPractitionerEmail, heading, p, btn, note } from '@/lib/practitioner-email-shell';

/**
 * Abandoned-cart engine.
 *
 *   recordAbandonedCart()  — upsert the live cart for an email (called the
 *                            moment a valid email is typed at /checkout).
 *   markCartsRecovered()   — flip carts RECOVERED when a paid order lands.
 *   sweepAbandonedCarts()  — cron: email shoppers who left a cart behind.
 *
 * Recovery EMAILS are an outward-facing action, so they're OFF until the
 * operator sets ABANDONED_CART_RECOVERY=on. Capture + visibility always run;
 * only the automated nudge is gated. Every write is wrapped so a missing
 * table (pre-migration) or a flaky DB never breaks checkout.
 */

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://meritsciences.com').replace(/\/$/, '');

/** Automated recovery email is opt-in (outward-facing). Default OFF. */
export const recoveryEmailsEnabled = process.env.ABANDONED_CART_RECOVERY === 'on';

// Wait this long after the LAST cart activity before treating it as abandoned.
const GRACE_MS = 60 * 60 * 1000; // 1 hour
// Don't chase carts older than this — stale leads, and a very late email reads as creepy.
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type AbandonedLine = {
  handle: string;
  title: string;
  bundleLabel: string;
  unitCents: number;
  qty: number;
  imageUrl?: string;
  components?: string[];
};

/** Coerce untrusted client `lines` into a clean, bounded array. */
function sanitize(lines: unknown): AbandonedLine[] {
  if (!Array.isArray(lines)) return [];
  return lines
    .filter((l): l is Record<string, unknown> =>
      !!l && typeof (l as any).handle === 'string' && typeof (l as any).title === 'string')
    .slice(0, 50)
    .map((l) => ({
      handle: String(l.handle),
      title: String(l.title),
      bundleLabel: String(l.bundleLabel ?? 'Single'),
      unitCents: Math.max(0, Math.round(Number(l.unitCents) || 0)),
      qty: Math.max(1, Math.round(Number(l.qty) || 1)),
      imageUrl: l.imageUrl ? String(l.imageUrl) : undefined,
      components: Array.isArray(l.components) ? (l.components as unknown[]).map(String) : undefined,
    }));
}

/**
 * Upsert the living cart for an email. One row per email; reopens a
 * RECOVERED row if the shopper starts a fresh cart. emailCount is left
 * untouched so a shopper already nudged once is never re-spammed.
 */
export async function recordAbandonedCart(input: {
  email: string;
  lines: unknown;
  referralCode?: string | null;
  referralSlug?: string | null;
  source?: string;
}): Promise<{ ok: boolean }> {
  const email = String(input.email ?? '').trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return { ok: false };
  const lines = sanitize(input.lines);
  if (lines.length === 0) return { ok: false };

  const itemCount = lines.reduce((n, l) => n + l.qty, 0);
  const subtotalCents = lines.reduce((s, l) => s + l.unitCents * l.qty, 0);
  const referralCode = input.referralCode ? String(input.referralCode).toUpperCase() : null;
  const referralSlug = input.referralSlug ? String(input.referralSlug) : null;
  const source = input.source ? String(input.source) : 'checkout';

  try {
    await prisma.abandonedCart.upsert({
      where: { email },
      update: {
        lines: lines as any,
        itemCount,
        subtotalCents,
        referralCode,
        referralSlug,
        source,
        status: 'OPEN',
        recoveredAt: null,
      },
      create: { email, lines: lines as any, itemCount, subtotalCents, referralCode, referralSlug, source },
    });
    return { ok: true };
  } catch (err) {
    console.error('[abandoned-cart] record failed', err);
    return { ok: false };
  }
}

/** Mark any open carts for these emails RECOVERED (a paid order landed). */
export async function markCartsRecovered(emails: (string | null | undefined)[]): Promise<void> {
  const uniq = Array.from(
    new Set(emails.map((e) => String(e ?? '').trim().toLowerCase()).filter((e) => EMAIL_RE.test(e))),
  );
  if (uniq.length === 0) return;
  try {
    await prisma.abandonedCart.updateMany({
      where: { email: { in: uniq }, status: { not: 'RECOVERED' } },
      data: { status: 'RECOVERED', recoveredAt: new Date() },
    });
  } catch (err) {
    console.error('[abandoned-cart] markRecovered failed', err);
  }
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Build the branded recovery email body for a saved cart. */
function recoveryEmailHtml(cart: {
  recoverToken: string;
  lines: unknown;
  subtotalCents: number;
  referralCode: string | null;
}): string {
  const lines = sanitize(cart.lines);
  const recoverUrl = `${SITE_URL}/cart/recover/${cart.recoverToken}`;
  const rows = lines
    .map(
      (l) => `
    <tr>
      <td style="padding:9px 0;font-size:14px;color:#0B0F1A;border-bottom:1px solid #F0EDE4;">
        <strong>${esc(l.title)}</strong><br>
        <span style="font-size:12px;color:#5C6378;">${esc(l.bundleLabel)} &middot; Qty ${l.qty}</span>
      </td>
      <td style="padding:9px 0;font-size:14px;color:#0B0F1A;text-align:right;white-space:nowrap;border-bottom:1px solid #F0EDE4;">$${((l.unitCents * l.qty) / 100).toFixed(2)}</td>
    </tr>`,
    )
    .join('');
  const codeLine = cart.referralCode
    ? note(`Your <strong>${esc(cart.referralCode)}</strong> discount is still applied — it comes right back when you return.`)
    : '';
  return (
    heading('You left something behind.') +
    p('Your cart is saved — pick up exactly where you left off. Every lot is HPLC-tested to &ge;99% purity and ships with its Certificate of Analysis.') +
    `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid #E5E1D6;margin:8px 0 2px;">
      ${rows}
      <tr>
        <td style="padding:11px 0 0;font-size:13px;color:#5C6378;">Subtotal</td>
        <td style="padding:11px 0 0;font-size:15px;font-weight:800;color:#0B0F1A;text-align:right;">$${(cart.subtotalCents / 100).toFixed(2)}</td>
      </tr>
    </table>` +
    btn('Return to your cart →', recoverUrl) +
    codeLine +
    note('For research use only. Not for human or veterinary use.')
  );
}

/**
 * Cron sweep. Emails shoppers who entered an email at checkout but didn't
 * pay, after a 1h grace, once each. No-ops entirely unless recovery is
 * enabled. Skips anyone who actually bought (guards against a missed
 * mark-recovered write).
 */
export async function sweepAbandonedCarts(): Promise<{
  enabled: boolean;
  scanned: number;
  emailed: number;
  recovered: number;
  skipped: number;
}> {
  if (!recoveryEmailsEnabled) {
    return { enabled: false, scanned: 0, emailed: 0, recovered: 0, skipped: 0 };
  }

  const now = Date.now();
  const before = new Date(now - GRACE_MS);
  const after = new Date(now - MAX_AGE_MS);

  let candidates: Array<{
    id: string;
    email: string;
    lines: unknown;
    subtotalCents: number;
    referralCode: string | null;
    recoverToken: string;
    createdAt: Date;
  }> = [];
  try {
    candidates = await prisma.abandonedCart.findMany({
      where: {
        status: 'OPEN',
        emailCount: 0,
        subtotalCents: { gt: 0 },
        updatedAt: { lt: before, gt: after },
      },
      orderBy: { updatedAt: 'asc' },
      take: 200,
      select: {
        id: true, email: true, lines: true, subtotalCents: true,
        referralCode: true, recoverToken: true, createdAt: true,
      },
    });
  } catch (err) {
    console.error('[abandoned-cart] sweep query failed', err);
    return { enabled: true, scanned: 0, emailed: 0, recovered: 0, skipped: 0 };
  }

  let emailed = 0;
  let recovered = 0;
  let skipped = 0;

  for (const cart of candidates) {
    // Don't email someone who actually bought (recovery write may have missed).
    try {
      const paid = await prisma.order.findFirst({
        where: {
          customerEmail: { equals: cart.email, mode: 'insensitive' },
          status: { not: 'PENDING_PAYMENT' },
          createdAt: { gte: cart.createdAt },
        },
        select: { id: true },
      });
      if (paid) {
        await prisma.abandonedCart.update({
          where: { id: cart.id },
          data: { status: 'RECOVERED', recoveredAt: new Date() },
        });
        recovered++;
        continue;
      }
    } catch {
      /* fall through and attempt the send */
    }

    const res = await sendEmail({
      to: cart.email,
      subject: 'Your Merit Sciences cart is saved',
      html: wrapPractitionerEmail({
        subject: 'Your Merit Sciences cart is saved',
        eyebrow: 'Your cart · saved',
        bodyHtml: recoveryEmailHtml(cart),
        footerNote: 'Merit Sciences &middot; Dallas, TX',
      }),
      tags: [{ name: 'type', value: 'abandoned-cart' }],
    });

    // Mark as nudged regardless of send result so a hard-bouncing address
    // isn't retried forever; a transient Resend blip is acceptable to miss.
    try {
      await prisma.abandonedCart.update({
        where: { id: cart.id },
        data: { emailCount: { increment: 1 }, lastEmailedAt: new Date() },
      });
    } catch {
      /* bookkeeping failure shouldn't abort the sweep */
    }

    if (res.ok) emailed++;
    else skipped++;
  }

  return { enabled: true, scanned: candidates.length, emailed, recovered, skipped };
}
