/**
 * Compound education sequences — the 4-beat, per-compound track that "pushes
 * the envelope" by talking about the FDA-approved counterpart, never about
 * what a Merit vial does to a body.
 *
 * The four beats, one data-driven template across all 7 compounds:
 *   0 identity   — "X is the molecule inside <brand>" (borrow the recognition)
 *   1 the data   — the trial number, attributed to the APPROVED drug + a hard
 *                  RUO line; compounds with no trial pivot to the approval story
 *   2 the angle  — pharmacy-grade + per-lot COA + the price gap
 *   3 the receipt— COA proof → shop (code rides along via DiscountCodeCapture)
 *
 * Every beat carries the RUO disclaimer and attributes outcomes to the drug's
 * clinical trials, not to the research compound. This is the compliance line
 * that keeps it science-reporting instead of an unapproved-drug claim.
 */
import 'server-only';
import { wrapMarketingEmail, h, p, cta, quiet, proof, SITE } from './marketing-email-shell';
import type { Counterpart } from './approved-counterparts';

export const BEAT_DAYS = [0, 2, 4, 6]; // days after enrollment each beat is due
export const BEAT_COUNT = BEAT_DAYS.length;

export type SequenceCtx = {
  code?: string;          // promo to ride the CTAs (optional)
  unsubscribeUrl: string;
};

type Rendered = { subject: string; html: string; text: string };

// The standing RUO line — appears on every beat of every compound sequence.
const RUO =
  'Merit sells research compounds for laboratory use only — not a treatment, not for human or veterinary use. Any results named above are from clinical trials of the approved drug, not claims about this research compound.';

function shopUrl(handle: string, code?: string): string {
  const base = `${SITE}/products/${handle}`;
  return code ? `${base}?code=${encodeURIComponent(code)}` : base;
}
function coaUrl(code?: string): string {
  const base = `${SITE}/coa`;
  return code ? `${base}?code=${encodeURIComponent(code)}` : base;
}

function brandPhrase(c: Counterpart): string {
  if (c.brandNames.length === 0) return `${c.sponsor}’s investigational program`;
  if (c.brandNames.length === 1) return c.brandNames[0];
  return `${c.brandNames.slice(0, -1).join(', ')} and ${c.brandNames[c.brandNames.length - 1]}`;
}

/* ── Beat 0 · identity ───────────────────────────────────────────────────── */
function beatIdentity(c: Counterpart, ctx: SequenceCtx): Rendered {
  const subject = `${c.compound}: the molecule inside ${brandPhrase(c)}`;
  const html = wrapMarketingEmail({
    subject,
    eyebrow: `Know your compound · ${c.compound}`,
    bodyHtml:
      h(`You&rsquo;ve heard of ${brandPhrase(c)}. Meet the molecule inside it.`) +
      p(`<strong>${c.compound}</strong>${c.aka ? ` (${c.aka})` : ''} is the active compound behind ${brandPhrase(c)}. ${c.approvalNote}`) +
      p('The name on the box is marketing. The molecule is chemistry — and chemistry is what Merit sells, pharmacy-grade and verified per lot.') +
      cta(`See Merit&rsquo;s ${c.compound} →`, shopUrl(c.handle, ctx.code)) +
      quiet(RUO),
    unsubscribeUrl: ctx.unsubscribeUrl,
  });
  const text = `You've heard of ${brandPhrase(c)}. ${c.compound}${c.aka ? ` (${c.aka})` : ''} is the molecule inside it. ${c.approvalNote}

Merit sells that molecule pharmacy-grade, verified per lot: ${shopUrl(c.handle, ctx.code)}

${RUO}
— Merit Sciences`;
  return { subject, html, text };
}

/* ── Beat 1 · the data (trial number, attributed) OR the approval story ──── */
function beatData(c: Counterpart, ctx: SequenceCtx): Rendered {
  if (c.trial) {
    const t = c.trial;
    const subject = `What ${t.name} showed`;
    const html = wrapMarketingEmail({
      subject,
      eyebrow: `The clinical record · ${c.compound}`,
      bodyHtml:
        h(`The number everyone quotes — and where it actually comes from.`) +
        p(`In <strong>${t.name}</strong> (${t.source}), ${t.sponsorDrug} produced a <strong>${t.stat}</strong> — ${t.detail}.`) +
        proof(`<strong>${t.name}</strong><br>${t.sponsorDrug}<br>${t.stat} · ${t.detail}<br><span style="opacity:0.7">${t.source}</span>`) +
        p(`That result belongs to the approved drug in a controlled trial. Merit sells the same molecule as a <strong>research compound</strong> — the chemistry, documented per lot, for the lab.`) +
        cta('See the compound + its COA →', shopUrl(c.handle, ctx.code)) +
        quiet(RUO),
      unsubscribeUrl: ctx.unsubscribeUrl,
    });
    const text = `In ${t.name} (${t.source}), ${t.sponsorDrug} produced a ${t.stat} — ${t.detail}.

That result belongs to the approved drug in a controlled trial. Merit sells the same molecule as a research compound, documented per lot: ${shopUrl(c.handle, ctx.code)}

${RUO}
— Merit Sciences`;
    return { subject, html, text };
  }
  // No trial number → lead with the approval status as the credibility hook.
  const subject = `${c.compound} has something most research compounds don’t`;
  const html = wrapMarketingEmail({
    subject,
    eyebrow: `The record · ${c.compound}`,
    bodyHtml:
      h('An approval history most research compounds can’t claim.') +
      p(c.approvalNote) +
      p(`Regulatory history like that is rare in this space. Merit sells the same molecule as a research compound — pharmacy-grade, HPLC-verified, with the COA public per lot.`) +
      cta(`See Merit&rsquo;s ${c.compound} →`, shopUrl(c.handle, ctx.code)) +
      quiet(RUO),
    unsubscribeUrl: ctx.unsubscribeUrl,
  });
  const text = `${c.approvalNote}

Merit sells the same molecule as a research compound, pharmacy-grade and lot-verified: ${shopUrl(c.handle, ctx.code)}

${RUO}
— Merit Sciences`;
  return { subject, html, text };
}

/* ── Beat 2 · the Merit angle ────────────────────────────────────────────── */
function beatAngle(c: Counterpart, ctx: SequenceCtx): Rendered {
  const subject = `Same molecule. The receipt included.`;
  const html = wrapMarketingEmail({
    subject,
    eyebrow: `Why Merit · ${c.compound}`,
    bodyHtml:
      h('Same molecule. The part the brand name hides.') +
      p(c.meritAngle) +
      proof('Every Merit lot:<br>• HPLC-verified ≥99% before release<br>• Identity confirmed — or it doesn’t ship<br>• A per-lot COA behind the QR on the label<br>• Sealed sterile vial, 48-hour dispatch from Dallas') +
      cta(`See ${c.compound} at Merit →`, shopUrl(c.handle, ctx.code)) +
      quiet(RUO),
    unsubscribeUrl: ctx.unsubscribeUrl,
  });
  const text = `${c.meritAngle}

Every Merit lot: HPLC-verified >=99%, identity confirmed or it doesn't ship, per-lot COA behind the QR, sealed sterile vial, 48-hour dispatch from Dallas.

See it: ${shopUrl(c.handle, ctx.code)}

${RUO}
— Merit Sciences`;
  return { subject, html, text };
}

/* ── Beat 3 · the receipt → shop ─────────────────────────────────────────── */
function beatReceipt(c: Counterpart, ctx: SequenceCtx): Rendered {
  const subject = `Don’t trust us on ${c.compound} — check the lot`;
  const html = wrapMarketingEmail({
    subject,
    eyebrow: `The proof · ${c.compound}`,
    bodyHtml:
      h('Don’t take our word for it. Take the lab’s.') +
      p(`Every ${c.compound} lot we ship is in the public library — scan the label or search the lot number and read the HPLC result yourself. That&rsquo;s the whole point of Merit.`) +
      cta('Browse the lab results →', coaUrl(ctx.code)) +
      p(`When you&rsquo;re ready, the compound&rsquo;s a tap away${ctx.code ? ' — your code applies itself at checkout' : ''}.`) +
      cta(`Shop ${c.compound} →`, shopUrl(c.handle, ctx.code)) +
      quiet(RUO),
    unsubscribeUrl: ctx.unsubscribeUrl,
  });
  const text = `Every ${c.compound} lot is in the public library — scan the label or search the lot number and read the HPLC result yourself.

Lab results: ${coaUrl(ctx.code)}
Shop ${c.compound}: ${shopUrl(c.handle, ctx.code)}${ctx.code ? ` (code applies automatically)` : ''}

${RUO}
— Merit Sciences`;
  return { subject, html, text };
}

const BEATS: ((c: Counterpart, ctx: SequenceCtx) => Rendered)[] = [
  beatIdentity,
  beatData,
  beatAngle,
  beatReceipt,
];

/** Render beat `index` (0-based) for a compound. Returns null if out of range. */
export function renderSequenceBeat(c: Counterpart, index: number, ctx: SequenceCtx): Rendered | null {
  const fn = BEATS[index];
  return fn ? fn(c, ctx) : null;
}
