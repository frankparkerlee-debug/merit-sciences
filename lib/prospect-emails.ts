/**
 * Prospect nurture track — for subscribers who gave us their email but
 * haven't purchased yet. The "long-tail conversion": NOT coupon-blasting.
 * The 20% is a quiet throughline; the real job is earning trust through
 * craft so a skeptical researcher takes Merit seriously. Voice = calm,
 * confident, value-first.
 *
 * Each render fn returns { subject, html, text } so it slots into both the
 * admin preview (/admin/email-previews) and the future drip cron unchanged.
 */

import 'server-only';
import { wrapPractitionerEmail, heading, p, btn, note, calloutBox } from './practitioner-email-shell';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://meritsciences.com').replace(/\/$/, '');
const CATALOG = `${SITE_URL}/catalog`;

export type ProspectEmailData = { code: string; unsubscribeUrl?: string };
type Rendered = { subject: string; html: string; text: string };

function shell(subject: string, eyebrow: string, bodyHtml: string, d: ProspectEmailData): string {
  return wrapPractitionerEmail({ subject, eyebrow, bodyHtml, unsubscribeUrl: d.unsubscribeUrl });
}

/* ── 1 · Welcome ─────────────────────────────────────────────────────── */
export function renderProspectWelcome(d: ProspectEmailData): Rendered {
  const subject = "You're in — and your 20% is waiting";
  const body =
    heading('You found the good stuff.') +
    p("You're on the Merit list, which tells me one thing: you care where your compounds come from. Good instinct.") +
    p('Here it is in one line — every Merit lot is HPLC-tested to <strong>≥99% purity</strong>, made in the USA, and shipped from Dallas within 48 hours.') +
    calloutBox(`<strong>Your code:</strong> ${d.code} &mdash; 20% off your first order.`) +
    btn('See what’s inside →', CATALOG) +
    note('No spam. Just the occasional note actually worth opening.');
  return {
    subject,
    html: shell(subject, `Welcome · 20% inside`, body, d),
    text: `You're on the Merit list. Every lot is HPLC-tested to ≥99% purity, US-made, shipped in 48 hours.\n\nYour code: ${d.code} — 20% off your first order.\n\nSee what's inside: ${CATALOG}`,
  };
}

/* ── 2 · See the data (the proof email) ──────────────────────────────── */
export function renderProspectProof(d: ProspectEmailData): Rendered {
  const subject = 'The part most suppliers hope you skip';
  const body =
    heading('The test most people never ask to see.') +
    p('We hope you do.') +
    p('Every Merit lot ships with its Certificate of Analysis — the HPLC trace, the measured purity, the lot number. Because <em>“trust us”</em> isn’t a standard.') +
    calloutBox(
      '<strong>Lot MS-2406-A</strong><br>HPLC purity: <strong>99.2%</strong><br>Endotoxin: &lt;0.5 EU/mg<br>Tested: independent lab, USA',
    ) +
    btn('See a real COA →', CATALOG) +
    note(`Quietly: your 20% (${d.code}) is still here whenever you’re ready.`);
  return {
    subject,
    html: shell(subject, 'Proof, not promises', body, d),
    text: `Most people never ask to see the test. We hope you do. Every Merit lot ships with its COA — HPLC trace, purity, lot number.\n\nSee a real one: ${CATALOG}\n\nYour 20% code: ${d.code}`,
  };
}

/* ── 3 · Where it comes from ─────────────────────────────────────────── */
export function renderProspectSourcing(d: ProspectEmailData): Rendered {
  const subject = 'Not a garage. A pharmacy.';
  const body =
    heading('Where your compounds actually come from.') +
    p('Most of what’s sold online is bulk-imported, repackaged, and sold on a guess. We don’t work that way.') +
    p('Merit is sourced and handled in a US pharmacy environment, under pharmacist oversight, with a COA on every lot. The difference is the part you can’t see in a product photo — so we document it instead of asking you to assume it.') +
    btn('How a Merit lot is made →', CATALOG) +
    note('Made in the USA · sealed sterile · shipped in 48 hours.');
  return {
    subject,
    html: shell(subject, 'Where it comes from', body, d),
    text: `Most online compounds are bulk-imported and sold on a guess. Merit is sourced + handled in a US pharmacy environment, pharmacist oversight, COA on every lot.\n\nHow a lot is made: ${CATALOG}`,
  };
}

/* ── 4 · Is this legit? ──────────────────────────────────────────────── */
export function renderProspectVetting(d: ProspectEmailData): Rendered {
  const subject = 'Smart to ask.';
  const body =
    heading('The four questions worth asking.') +
    p('Before you buy from anyone in this space, four questions separate the real from the risky:') +
    calloutBox(
      '✓ Is <strong>every</strong> lot third-party tested?<br>✓ Is the COA <strong>published</strong>, not just promised?<br>✓ Is it made in the USA?<br>✓ Is it sold for research use, clearly and honestly?',
    ) +
    p('Merit is a yes on all four. If a supplier dodges any one of them — that’s your answer.') +
    btn('Browse with confidence →', CATALOG);
  return {
    subject,
    html: shell(subject, 'For the careful ones', body, d),
    text: `Four questions separate the real from the risky: every lot tested? COA published? made in USA? sold for research, honestly? Merit is yes on all four.\n\nBrowse: ${CATALOG}`,
  };
}

/* ── 5 · Social proof ────────────────────────────────────────────────── */
export function renderProspectSocialProof(d: ProspectEmailData): Rendered {
  const subject = 'Who actually sources from Merit';
  const body =
    heading('You’re not the only careful one.') +
    p('Merit’s people tend to be the ones who read the label, check the source, and refuse to gamble on quality — researchers, the detail-obsessed, the ones who’ve been burned by a sketchy vendor before and decided never again.') +
    p('If that sounds like you, you’ll feel right at home.') +
    btn('See the lineup →', CATALOG) +
    note(`Your 20% is still on: ${d.code}.`);
  return {
    subject,
    html: shell(subject, 'Good company', body, d),
    text: `Merit's customers read the label, check the source, and won't gamble on quality. If that's you, you'll feel at home.\n\nSee the lineup: ${CATALOG} · Code: ${d.code}`,
  };
}

/* ── 6 · Last call ───────────────────────────────────────────────────── */
export function renderProspectLastCall(d: ProspectEmailData): Rendered {
  const subject = 'Your 20% is still here (last call)';
  const body =
    heading('Still thinking it over?') +
    p('No pressure — but your first-order 20% is sitting here, and it won’t wait forever.') +
    p('Whenever you’re ready, every lot comes with the same things: a published COA, ≥99% purity, and a 48-hour ship from Dallas. The easy part is us. The first step is you.') +
    calloutBox(`<strong>${d.code}</strong> &mdash; 20% off your first order.`) +
    btn('Use your 20% →', CATALOG);
  return {
    subject,
    html: shell(subject, 'Before it slips your mind', body, d),
    text: `Your first-order 20% is still here, and it won't wait forever. Every lot: published COA, ≥99% purity, 48-hour ship from Dallas.\n\nUse ${d.code}: ${CATALOG}`,
  };
}
