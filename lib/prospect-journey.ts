/**
 * Consumer prospect drip — orchestration for the nurture track in
 * `prospect-emails.ts`. Runs off the existing NewsletterSubscriber row
 * (no separate journey table): `createdAt` = enrollment (day 0), and
 * `lastSentKey` / `lastSentAt` track progress.
 *
 * Day 0 is the instant transactional welcome sent by /api/newsletter, so this
 * drip starts at day 2 with the "proof" email — no second welcome.
 *
 *   tickProspects()          — cron handler. Sends each subscriber their next
 *                              due email and advances the pointer.
 *   unsubUrl(email)          — signed one-click unsubscribe link for the footer.
 *   unsubscribeNewsletter()  — verify token + flip isSubscribed=false.
 */
import 'server-only';
import crypto from 'crypto';
import { prisma } from './db';
import { sendEmail } from './email';
import {
  renderProspectProof,
  renderProspectTelegram,
  renderProspectSourcing,
  renderProspectVetting,
  renderProspectShipping,
  renderProspectReengage,
  renderProspectSocialProof,
  renderProspectLastCall,
  type ProspectEmailData,
} from './prospect-emails';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://meritsciences.com').replace(/\/$/, '');
const CODE = 'WELCOME20';
// Sign unsubscribe tokens with an existing server secret (never exposed).
const UNSUB_SECRET = process.env.UNSUB_SECRET || process.env.CRON_SECRET || 'merit-unsub-fallback';

type Rendered = { subject: string; html: string; text: string };
type Step = { key: string; day: number; render: (d: ProspectEmailData) => Rendered };

// The 8-email drip. `day` = days after the drip timer (dripStartedAt) that the
// email becomes due — at most one a day, spread across ~3.5 weeks. The instant
// transactional welcome covers the literal day-0 hello; this funnel earns the sale.
const SEQUENCE: Step[] = [
  { key: 'prospect-proof', day: 0, render: renderProspectProof },
  { key: 'prospect-telegram', day: 2, render: renderProspectTelegram },
  { key: 'prospect-sourcing', day: 4, render: renderProspectSourcing },
  { key: 'prospect-vetting', day: 7, render: renderProspectVetting },
  { key: 'prospect-shipping', day: 10, render: renderProspectShipping },
  { key: 'prospect-reengage', day: 14, render: renderProspectReengage },
  { key: 'prospect-socialproof', day: 18, render: renderProspectSocialProof },
  { key: 'prospect-lastcall', day: 24, render: renderProspectLastCall },
];
const LAST_KEY = SEQUENCE[SEQUENCE.length - 1].key;

// ── Unsubscribe ────────────────────────────────────────────────────────────
export function unsubToken(email: string): string {
  return crypto
    .createHmac('sha256', UNSUB_SECRET)
    .update(email.trim().toLowerCase())
    .digest('hex')
    .slice(0, 32);
}

export function unsubUrl(email: string): string {
  const e = email.trim().toLowerCase();
  return `${SITE_URL}/unsubscribe?e=${encodeURIComponent(e)}&t=${unsubToken(e)}`;
}

/** Verify the signed token and flip the subscriber to unsubscribed. */
export async function unsubscribeNewsletter(email: string, token: string): Promise<boolean> {
  const e = (email || '').trim().toLowerCase();
  if (!e || !token) return false;
  let valid = false;
  try {
    valid = crypto.timingSafeEqual(Buffer.from(token), Buffer.from(unsubToken(e)));
  } catch {
    valid = false;
  }
  if (!valid) return false;
  try {
    await prisma.newsletterSubscriber.updateMany({
      where: { email: e },
      data: { isSubscribed: false, unsubscribedAt: new Date() },
    });
    return true;
  } catch (err) {
    console.error('[prospect] unsubscribe failed', err);
    return false;
  }
}

// ── Cron tick ────────────────────────────────────────────────────────────
/**
 * Send every due prospect email. Idempotent within a day (the 20h gap guard +
 * advanced `lastSentKey` make a second same-day run a no-op). One email per
 * lead per run, neediest-first, capped to protect sender reputation.
 */
export async function tickProspects(now: Date = new Date()): Promise<{
  sent: number;
  skipped: number;
  done: number;
  errors: number;
}> {
  const subs = await prisma.newsletterSubscriber.findMany({
    where: {
      isSubscribed: true,
      // Not yet finished the sequence. Explicit null branch — Prisma `not`
      // excludes nulls, so brand-new (lastSentKey=null) leads need it spelled out.
      OR: [{ lastSentKey: null }, { lastSentKey: { not: LAST_KEY } }],
    },
    // Neediest-first: never-sent (null) lead, then longest-since-last-send. With
    // a >200 list every subscriber matches the funnel filter, so newest-first
    // ordering would starve the oldest rows forever; this rotates the queue so
    // no one is stranded across daily runs.
    orderBy: [{ lastSentAt: { sort: 'asc', nulls: 'first' } }],
    take: 250,
  });

  let sent = 0;
  let skipped = 0;
  let done = 0;
  let errors = 0;

  for (const s of subs) {
    const lastIdx = s.lastSentKey ? SEQUENCE.findIndex((x) => x.key === s.lastSentKey) : -1;
    const step = SEQUENCE[lastIdx + 1];
    if (!step) {
      done++;
      continue;
    }

    // Due only once (drip timer + step.day) has passed. dripStartedAt is set to
    // "today" for the existing backlog (SQL backfill) so nobody gets blasted for
    // an old signup date; new signups anchor at their signup instead.
    const anchor = s.dripStartedAt ?? s.createdAt;
    if (addDays(anchor, step.day) > now) {
      skipped++;
      continue;
    }
    // …and never two within ~a day (guards double cron runs + paces the backlog).
    if (s.lastSentAt && now.getTime() - s.lastSentAt.getTime() < 20 * 3600 * 1000) {
      skipped++;
      continue;
    }
    // Suppress anyone who has already purchased on the storefront.
    const bought = await prisma.customer.findUnique({ where: { email: s.email }, select: { id: true } });
    if (bought) {
      skipped++;
      continue;
    }

    try {
      const { subject, html, text } = step.render({ code: CODE, unsubscribeUrl: unsubUrl(s.email) });
      await sendEmail({ to: s.email, subject, html, text });
      sent++;
    } catch (err) {
      console.error(`[prospect-tick] send failed for ${s.email} key=${step.key}`, err);
      errors++;
      // fall through and still advance — a bad address must not wedge the drip
    }

    await prisma.newsletterSubscriber.update({
      where: { id: s.id },
      data: { lastSentKey: step.key, lastSentAt: new Date() },
    });
  }

  return { sent, skipped, done, errors };
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
