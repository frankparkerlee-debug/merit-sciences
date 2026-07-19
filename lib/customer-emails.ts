/**
 * Customer lifecycle emails — for people who have ALREADY bought. Two beats:
 *
 *   renderReplenishment — ~5 weeks after purchase, when the vial from that
 *     order is plausibly running low. One job: the one-click reorder.
 *   renderWinBack       — ~11 weeks since their last order. New-lots angle +
 *     the same one-click reorder.
 *
 * Deliberately NO discount codes here — these buyers already converted at
 * full price; a coupon would just train discount-waiting. The friction relief
 * IS the offer (cart rebuilds itself at current prices).
 *
 * Both use the marketing shell WITH the signed unsubscribe link (CAN-SPAM:
 * these are promotional sends to customers, not transactional notices).
 */
import 'server-only';
import { wrapMarketingEmail, h, p, cta, quiet, proof, SITE } from './marketing-email-shell';

export type CustomerEmailData = {
  firstName: string;
  primaryProductTitle: string;   // headline item of the referenced order
  reorderUrl: string;            // signed /reorder/<token> deep link
  unsubscribeUrl: string;
};

type Rendered = { subject: string; html: string; text: string };

/* ── Replenishment · +35 days after purchase ─────────────────────────────── */
export function renderReplenishment(d: CustomerEmailData): Rendered {
  const subject = `Running low on ${d.primaryProductTitle}?`;
  const html = wrapMarketingEmail({
    subject,
    eyebrow: 'Resupply',
    bodyHtml:
      h('About that lot from a few weeks back.') +
      p(
        `${d.firstName}, quick math on our side says your <strong>${d.primaryProductTitle}</strong> supply from that order is probably getting thin right about now.`,
      ) +
      p(
        'One tap below rebuilds that exact order — same lineup, the current lot, today&rsquo;s COA behind the QR — and drops you straight at checkout. Nothing to re-pick.',
      ) +
      cta('Reorder in one click →', d.reorderUrl) +
      quiet(
        'Every restock ships the same way: sealed sterile vial, lot number on the label, HPLC-verified ≥99% before release, 48-hour dispatch from Dallas.',
      ),
    unsubscribeUrl: d.unsubscribeUrl,
  });
  const text = `Quick math says your ${d.primaryProductTitle} from that order is probably running low.

One tap rebuilds the exact order (same lineup, current lot) and drops you at checkout:
${d.reorderUrl}

Sealed sterile vials, lot number on the label, HPLC-verified >=99%, 48-hour dispatch from Dallas.

— Merit Sciences`;
  return { subject, html, text };
}

/* ── Win-back · ~75 days since last order ────────────────────────────────── */
export function renderWinBack(d: CustomerEmailData): Rendered {
  const subject = "New lots just posted — and your reorder is one tap away";
  const catalog = `${SITE}/catalog`;
  const coa = `${SITE}/coa`;
  const html = wrapMarketingEmail({
    subject,
    eyebrow: 'Since you were here',
    bodyHtml:
      h('The catalog kept moving.') +
      p(
        `${d.firstName}, it&rsquo;s been a while since your last Merit order. Since then: fresh lots posted to the public COA library, same ≥99% HPLC bar, same 48-hour Dallas dispatch.`,
      ) +
      proof(
        `Everything still works the way you vetted it:<br>• Per-lot COA behind the QR on every label<br>• Identity confirmed before anything ships<br>• The full lab library, public at ${coa.replace('https://', '')}`,
      ) +
      p(
        `Your last order is saved. One tap rebuilds it — <strong>${d.primaryProductTitle}</strong> and all — at the current lot.`,
      ) +
      cta('Rebuild my last order →', d.reorderUrl) +
      quiet(`Or start fresh in the <a href="${catalog}" style="color:inherit;">catalog</a>. Either way: tested, traceable, fast.`),
    unsubscribeUrl: d.unsubscribeUrl,
  });
  const text = `It's been a while since your last Merit order. Since then: fresh lots in the public COA library (${coa}), same >=99% HPLC bar, same 48-hour Dallas dispatch.

Your last order is saved — one tap rebuilds it (${d.primaryProductTitle} and all) at the current lot:
${d.reorderUrl}

Or start fresh: ${catalog}

— Merit Sciences`;
  return { subject, html, text };
}
