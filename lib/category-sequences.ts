/**
 * Category (mechanism-class) education sequences — 4 beats, same cadence as the
 * compound sequences (BEAT_DAYS [0,2,4,6]). The compliant angle for compounds
 * with no approved counterpart: teach the PATHWAY and the published research,
 * attribute nothing to a Merit vial, RUO every beat.
 *
 * Per-compound science (research applications, class) is read from the VERIFIED
 * lib/research-data.ts at render time — this renderer only authors the
 * connective copy, so no new claims are introduced.
 */
import 'server-only';
import { wrapMarketingEmail, h, p, cta, quiet, proof, vialStrip, SITE } from './marketing-email-shell';
import { seqHero } from './product-sequences';
import type { CompoundCategory } from './compound-categories';
import { RESEARCH_DATA } from './research-data';
import type { SequenceCtx } from './product-sequences';

const RUO =
  'Merit sells research compounds for laboratory use only — not a treatment, not for human or veterinary use. Descriptions above are of the research/mechanism class; nothing here is a claim about what these compounds do in a person.';

function shopUrl(handle: string, code?: string): string {
  const base = `${SITE}/products/${handle}`;
  return code ? `${base}?code=${encodeURIComponent(code)}` : base;
}
function catalogUrl(code?: string): string {
  const base = `${SITE}/catalog`;
  return code ? `${base}?code=${encodeURIComponent(code)}` : base;
}
function coaUrl(code?: string): string {
  const base = `${SITE}/coa`;
  return code ? `${base}?code=${encodeURIComponent(code)}` : base;
}

// Short research-framed blurb for a member, straight from verified data.
function memberBlurb(handle: string): string {
  const d = RESEARCH_DATA[handle];
  if (!d) return '';
  const app = d.researchApplications?.[0];
  if (app) return app;
  // Fallback: first clause of the (factual) compound class.
  return (d.compoundClass || '').split(/[—(]/)[0].trim();
}

function rosterRows(cat: CompoundCategory): string {
  return cat.members
    .map((m) => {
      const blurb = memberBlurb(m.handle);
      return `<strong>${m.name}</strong>${blurb ? ` — ${blurb}` : ''}`;
    })
    .join('<br>');
}

type Rendered = { subject: string; html: string; text: string };

/* ── Beat 0 · the pathway ────────────────────────────────────────────────── */
function beatPathway(cat: CompoundCategory, ctx: SequenceCtx): Rendered {
  const subject = `${cat.name}: the pathway, not the hype`;
  const html = wrapMarketingEmail({
    subject,
    eyebrow: `The pathway · ${cat.name}`,
    bodyHtml:
      seqHero(ctx, `${cat.name} — Merit Sciences research compounds`) +
      h(cat.name + '.') +
      p(cat.tagline + (cat.classContext ? ` ${cat.classContext}` : '')) +
      p('There are several compounds in this class in the research literature. Merit stocks them pharmacy-grade, each with a per-lot COA — so you can study the pathway without gambling on the source.') +
      cta(`Browse the ${cat.name} compounds →`, shopUrl(cat.heroHandle, ctx.code)) +
      quiet(RUO),
    unsubscribeUrl: ctx.unsubscribeUrl,
  });
  const text = `${cat.name}. ${cat.tagline}${cat.classContext ? ` ${cat.classContext}` : ''}

Several compounds in this class are in the research literature. Merit stocks them pharmacy-grade, per-lot COA on each: ${shopUrl(cat.heroHandle, ctx.code)}

${RUO}
— Merit Sciences`;
  return { subject, html, text };
}

/* ── Beat 1 · the roster + research ──────────────────────────────────────── */
function beatRoster(cat: CompoundCategory, ctx: SequenceCtx): Rendered {
  const subject = `What’s in the ${cat.name} class`;
  const html = wrapMarketingEmail({
    subject,
    eyebrow: `The roster · ${cat.name}`,
    bodyHtml:
      // The lineup shot: member vial thumbnails when resolved, else the hero.
      (ctx.memberImages?.length
        ? vialStrip(ctx.memberImages)
        : seqHero(ctx, `${cat.name} — Merit Sciences research compounds`)) +
      h('The compounds researchers actually reach for here.') +
      p(`A quick map of the ${cat.name.toLowerCase()} class and what the published research explores for each:`) +
      proof(rosterRows(cat)) +
      p('Merit sells each as a research compound — the molecule, documented per lot, for the lab.') +
      cta('See them at Merit →', catalogUrl(ctx.code)) +
      quiet(RUO),
    unsubscribeUrl: ctx.unsubscribeUrl,
  });
  const text = `The ${cat.name} class and what published research explores for each:
${cat.members.map((m) => `  · ${m.name}${memberBlurb(m.handle) ? ` — ${memberBlurb(m.handle)}` : ''}`).join('\n')}

Merit sells each as a research compound, documented per lot: ${catalogUrl(ctx.code)}

${RUO}
— Merit Sciences`;
  return { subject, html, text };
}

/* ── Beat 2 · the Merit angle ────────────────────────────────────────────── */
function beatAngle(cat: CompoundCategory, ctx: SequenceCtx): Rendered {
  const subject = `Same pathway. The receipt included.`;
  const html = wrapMarketingEmail({
    subject,
    eyebrow: `Why Merit · ${cat.name}`,
    bodyHtml:
      seqHero(ctx, `${cat.name} — Merit Sciences research compounds`) +
      h('The part a product photo can’t show you.') +
      p(`Anyone can list ${cat.name.toLowerCase()} compounds. The question is whether what’s in the vial is what the label says — and whether they’ll show you. Merit does, per lot.`) +
      proof('Every Merit lot:<br>• HPLC-verified ≥99% before release<br>• Identity confirmed — or it doesn’t ship<br>• A per-lot COA behind the QR on the label<br>• Sealed sterile vial, 48-hour dispatch from Dallas') +
      cta(`Browse the ${cat.name} class →`, shopUrl(cat.heroHandle, ctx.code)) +
      quiet(RUO),
    unsubscribeUrl: ctx.unsubscribeUrl,
  });
  const text = `Anyone can list ${cat.name.toLowerCase()} compounds. Merit shows you what's in the vial — per lot: HPLC-verified >=99%, identity confirmed or it doesn't ship, COA behind the QR, sealed sterile, 48-hour dispatch from Dallas.

${shopUrl(cat.heroHandle, ctx.code)}

${RUO}
— Merit Sciences`;
  return { subject, html, text };
}

/* ── Beat 3 · the receipt → shop ─────────────────────────────────────────── */
function beatReceipt(cat: CompoundCategory, ctx: SequenceCtx): Rendered {
  const subject = `Check the lot before you buy anything in this class`;
  const html = wrapMarketingEmail({
    subject,
    eyebrow: `The proof · ${cat.name}`,
    bodyHtml:
      seqHero(ctx, `${cat.name} — Merit Sciences research compounds`) +
      h('Don’t take our word for it. Take the lab’s.') +
      p(`Every lot we ship — across the whole ${cat.name.toLowerCase()} class — is in the public library. Scan a label or search the lot number and read the HPLC result yourself.`) +
      cta('Browse the lab results →', coaUrl(ctx.code)) +
      p(`When you’re ready, the class is a tap away${ctx.code ? ' — your code applies itself at checkout' : ''}.`) +
      cta(`Shop ${cat.name} →`, shopUrl(cat.heroHandle, ctx.code)) +
      quiet(RUO),
    unsubscribeUrl: ctx.unsubscribeUrl,
  });
  const text = `Every lot across the ${cat.name} class is in the public library — scan a label or search the lot number and read the HPLC result yourself.

Lab results: ${coaUrl(ctx.code)}
Shop the class: ${shopUrl(cat.heroHandle, ctx.code)}${ctx.code ? ' (code applies automatically)' : ''}

${RUO}
— Merit Sciences`;
  return { subject, html, text };
}

const BEATS: ((cat: CompoundCategory, ctx: SequenceCtx) => Rendered)[] = [
  beatPathway,
  beatRoster,
  beatAngle,
  beatReceipt,
];

export function renderCategoryBeat(cat: CompoundCategory, index: number, ctx: SequenceCtx): Rendered | null {
  const fn = BEATS[index];
  return fn ? fn(cat, ctx) : null;
}
