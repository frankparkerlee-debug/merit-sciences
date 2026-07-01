/**
 * Prospect nurture track — for subscribers who gave us their email but haven't
 * purchased. An 8-email funnel: earn trust through craft (and a little humor),
 * with the 20% as a quiet throughline. Voice = confident, a bit funny, never
 * coupon-desperate.
 *
 * Each render fn returns { subject, html, text } so it slots into the admin
 * preview (/admin/email-previews) and the drip cron (lib/prospect-journey.ts)
 * unchanged.
 */
import 'server-only';
import {
  wrapMarketingEmail,
  h,
  p,
  cta,
  quiet,
  proof,
  codeChip,
  versus,
  stat,
  a,
  SITE,
} from './marketing-email-shell';

const CATALOG = `${SITE}/catalog`;
const COA = `${SITE}/coa`;

export type ProspectEmailData = { code: string; unsubscribeUrl?: string };
type Rendered = { subject: string; html: string; text: string };

function build(subject: string, eyebrow: string, body: string, text: string, d: ProspectEmailData): Rendered {
  return { subject, html: wrapMarketingEmail({ subject, eyebrow, bodyHtml: body, unsubscribeUrl: d.unsubscribeUrl }), text };
}

/* ── 0 · Welcome (day 0 reference — the instant signup email covers this live) ── */
export function renderProspectWelcome(d: ProspectEmailData): Rendered {
  return build(
    "You're in — and your 20% is ready",
    'Welcome',
    h('You found the good stuff.') +
      p("You joined the Merit list, which tells me one thing: you actually care where your compounds come from. That instinct is rare. Keep it.") +
      p('One line: every Merit lot is HPLC-tested to <strong>≥99% purity</strong>, made in the USA, and on your porch in 48 hours.') +
      codeChip(d.code) +
      cta("See what's inside →", CATALOG) +
      quiet('No spam. Just the occasional note actually worth opening.'),
    `You're on the Merit list. Every lot is HPLC-tested to ≥99% purity, US-made, shipped in 48 hours.\nYour code: ${d.code} — 20% off your first order.\nSee what's inside: ${CATALOG}`,
    d,
  );
}

/* ── 1 · Proof ───────────────────────────────────────────────────────────── */
export function renderProspectProof(d: ProspectEmailData): Rendered {
  return build(
    'The test most suppliers hope you skip',
    'Proof, not promises',
    h('Anyone can say 99%. We hand you the receipt.') +
      p('Every Merit lot ships with its Certificate of Analysis — the HPLC trace, the measured purity, the lot number. Because <em>“trust us”</em> is not a standard.') +
      proof(
        '<strong>Lot MRT-2603-03 · Tirzepatide 30mg</strong><br>HPLC purity: <strong>99.827%</strong> &nbsp;·&nbsp; Identity: conforms<br>Independently tested — verifiable by lot number',
      ) +
      p(`We even put the whole library online — ${a('every lot we’ve shipped', COA)}, searchable by the number on your bottle.`) +
      cta('Browse the lab results →', COA) +
      quiet(`Your 20% (<strong>${d.code}</strong>) is still here whenever you’re ready.`),
    `Anyone can say 99%. Merit hands you the receipt — every lot ships with its COA (HPLC trace, purity, lot #). The whole library is searchable online.\nSee it: ${COA}\nYour code: ${d.code}`,
    d,
  );
}

/* ── 2 · Don't buy off Telegram (the funny one) ──────────────────────────── */
export function renderProspectTelegram(d: ProspectEmailData): Rendered {
  return build(
    "Please don't buy peptides off Telegram",
    'A public service announcement',
    h('That guy in the group chat is not a lab.') +
      p('We need to talk about your “source.” You know the one — unbeatable prices, blurry vial photos, pays in crypto, disappears every few weeks and returns with a new username.') +
      p('Here’s what nobody in the chat mentions: no COA, no lot number, no real idea what’s in the vial. That’s not a purchase. That’s a vibe with shipping.') +
      versus('Telegram plug', 'Merit', [
        ['Testing', "“trust me bro”", 'HPLC COA, every lot'],
        ['Identity', 'who knows', "confirmed or it doesn't ship"],
        ['If it’s wrong', 'you find out', 'we find out first'],
        ['Ships from', 'a crypto wallet', 'a pharmacy in Dallas'],
      ]) +
      p('Not hypothetical: last month we held back a whole Semax lot because it came back as the <em>wrong molecule</em>. The group chat would’ve shipped it to you with a fire emoji.') +
      cta('Buy like a grown-up →', CATALOG) +
      quiet(`20% off your first tested, traceable order: <strong>${d.code}</strong>`),
    `That guy in the group chat is not a lab. No COA, no lot number, no idea what's in the vial. Merit: HPLC COA on every lot, identity confirmed or it doesn't ship, from a pharmacy in Dallas.\nBuy like a grown-up: ${CATALOG}\nCode: ${d.code}`,
    d,
  );
}

/* ── 3 · Sourcing ────────────────────────────────────────────────────────── */
export function renderProspectSourcing(d: ProspectEmailData): Rendered {
  return build(
    'Not a garage. A pharmacy.',
    'Where it comes from',
    h('Where your compounds actually come from.') +
      p('Most of what’s sold online is bulk-imported, repackaged in someone’s spare room, and sold on a guess.') +
      p('Merit is sourced and handled in a US pharmacy environment, under pharmacist oversight, with a COA on every lot. The difference is the part you can’t see in a product photo — so we document it instead of asking you to assume it.') +
      stat('48 hrs', 'sealed, tested, and shipped from Dallas') +
      cta('See how a Merit lot is made →', CATALOG),
    `Most online compounds are bulk-imported and sold on a guess. Merit is sourced + handled in a US pharmacy environment, pharmacist oversight, COA on every lot, shipped from Dallas in 48 hours.\n${CATALOG}`,
    d,
  );
}

/* ── 4 · Vetting ─────────────────────────────────────────────────────────── */
export function renderProspectVetting(d: ProspectEmailData): Rendered {
  return build(
    'Smart people ask these 4 questions',
    'For the careful ones',
    h('Four questions that separate the real from the risky.') +
      p('Before you buy from anyone in this space, four questions do the vetting for you:') +
      proof(
        '✓ Is <strong>every</strong> lot third-party tested?<br>✓ Is the COA <strong>published</strong>, not just promised?<br>✓ Is it made in the USA?<br>✓ Is it sold for research, clearly and honestly?',
      ) +
      p('Merit is a yes on all four. If a supplier dodges even one of them — that’s your answer.') +
      cta('Browse with confidence →', CATALOG),
    `Four questions separate the real from the risky: every lot tested? COA published? made in USA? sold for research, honestly? Merit is yes on all four.\nBrowse: ${CATALOG}`,
    d,
  );
}

/* ── 5 · What ships ──────────────────────────────────────────────────────── */
export function renderProspectShipping(d: ProspectEmailData): Rendered {
  return build(
    'What actually shows up at your door',
    'The unboxing',
    h('Sealed, labeled, and boring — on purpose.') +
      p('No mystery baggies. No hand-written Sharpie labels. No “should arrive in 3–5 weeks (maybe).”') +
      p('A Merit order arrives as a sealed, lot-labeled vial with a scannable QR that pulls up its exact COA — shipped from Dallas, usually on your porch in 48 hours.') +
      proof('On every vial:<br>• The compound + dose<br>• The lot number<br>• A QR → the exact HPLC result') +
      cta('See what ships →', CATALOG) +
      quiet(`Still holding your 20%: <strong>${d.code}</strong>`),
    `A Merit order shows up sealed and lot-labeled, with a QR to its exact COA, shipped from Dallas in ~48 hours. No mystery baggies.\nSee what ships: ${CATALOG}\nCode: ${d.code}`,
    d,
  );
}

/* ── 6 · Did we lose you? (the re-engagement one) ────────────────────────── */
export function renderProspectReengage(d: ProspectEmailData): Rendered {
  return build(
    'Did we lose you?',
    'Checking in',
    h('Did we lose you? Or are you just busy?') +
      p('You joined the list, we sent a few (genuinely useful, we like to think) emails, and then… crickets. No judgment — inboxes are a warzone.') +
      p('Quick gut check. If it’s a “not right now,” all good, we’ll be here. If it’s a “I completely forgot I had 20% off,” well — you have 20% off.') +
      codeChip(d.code) +
      p(`And if it’s a “please stop,” there’s a one-tap unsubscribe right down there, zero hard feelings.`) +
      cta('Okay, show me the goods →', CATALOG),
    `Did we lose you, or are you just busy? If you forgot you had 20% off — you have 20% off (${d.code}). If you're done, one-tap unsubscribe below, no hard feelings.\n${CATALOG}`,
    d,
  );
}

/* ── 7 · Social proof ────────────────────────────────────────────────────── */
export function renderProspectSocialProof(d: ProspectEmailData): Rendered {
  return build(
    'The people who source from Merit',
    'Good company',
    h('You’re not the only careful one.') +
      p('Merit’s people tend to be the ones who read the label, check the source, and refuse to gamble on quality — researchers, the detail-obsessed, and the ones who got burned by a sketchy vendor once and swore never again.') +
      p('If that sounds like you, you’ll feel right at home.') +
      cta('See the lineup →', CATALOG) +
      quiet(`Your 20% is still on: <strong>${d.code}</strong>`),
    `Merit's customers read the label, check the source, and won't gamble on quality. If that's you, you'll feel at home.\nSee the lineup: ${CATALOG} · Code: ${d.code}`,
    d,
  );
}

/* ── 8 · Last call ───────────────────────────────────────────────────────── */
export function renderProspectLastCall(d: ProspectEmailData): Rendered {
  return build(
    'Your 20% is about to expire (last call)',
    'Before it slips your mind',
    h('Your 20% is getting lonely.') +
      p('No pressure — but your first-order 20% has been sitting in your inbox for a few weeks, and it won’t wait forever.') +
      p('Whenever you’re ready, every lot comes with the same things: a published COA, ≥99% purity, and a 48-hour ship from Dallas. The hard part is on us. The first step is on you.') +
      codeChip(d.code) +
      cta("Use it before it's gone →", CATALOG),
    `Your first-order 20% won't wait forever. Every lot: published COA, ≥99% purity, 48-hour ship from Dallas.\nUse ${d.code}: ${CATALOG}`,
    d,
  );
}
