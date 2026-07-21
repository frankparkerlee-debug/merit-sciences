/**
 * Compound-education sequence engine. Advances SequenceEnrollment rows through
 * their compound's 4 beats (lib/product-sequences.ts), one per run, time-gated
 * by BEAT_DAYS, deduped by beatIndex, suppression-aware.
 *
 *   enrollInSequence(email, seqKey, source)  — idempotent enroll (no-op if the
 *                                              row already exists)
 *   tickSequences(now)                       — cron handler
 *
 * beatIndex = last-sent beat (-1 = enrolled, nothing sent). A beat is due when
 *   addDays(startedAt, BEAT_DAYS[beatIndex+1]) <= now  AND  >20h since lastSentAt.
 * status flips to 'completed' after the final beat, 'stopped' on unsubscribe.
 */
import 'server-only';
import { prisma } from './db';
import { sendEmail } from './email';
import { unsubUrl } from './prospect-journey';
import {
  resolveSequenceBeat,
  sequenceExists,
  laneFor,
  BEAT_DAYS,
  BEAT_COUNT,
  type SequenceCtx,
} from './sequences-registry';
import { sequenceKeyFor } from './approved-counterparts';

const DEFAULT_CODE = 'WELCOME20';
const DAILY_CAP = () => Math.max(1, parseInt(process.env.SEQUENCE_DAILY_CAP || '120', 10) || 120);

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/**
 * Idempotent enrollment. Keyed by (email, sequenceKey); a second call for the
 * same pair is a no-op (the buyer clicked the link twice, or is enrolled from
 * two surfaces). Also stamps an interest tag on the newsletter row for future
 * targeting (upsert — the person may not be a subscriber yet).
 */
export async function enrollInSequence(
  emailRaw: string,
  sequenceKey: string,
  source = 'manual',
): Promise<{ ok: boolean; already?: boolean; error?: string }> {
  const email = (emailRaw || '').trim().toLowerCase();
  if (!email || !sequenceExists(sequenceKey)) return { ok: false, error: 'invalid email or sequence' };

  try {
    const existing = await prisma.sequenceEnrollment.findUnique({
      where: { email_sequenceKey: { email, sequenceKey } },
      select: { id: true },
    });
    if (existing) return { ok: true, already: true };

    await prisma.sequenceEnrollment.create({
      data: { email, sequenceKey, source, beatIndex: -1, status: 'active' },
    });

    // Durable interest tag for future segmentation (best-effort).
    const tag = `interest-${laneFor(sequenceKey) ?? 'unknown'}`;
    await prisma.newsletterSubscriber
      .upsert({
        where: { email },
        update: { tags: { push: tag } },
        create: { email, source: `seq:${source}`, tags: [tag] },
      })
      .catch(() => {});

    return { ok: true };
  } catch (err) {
    console.error('[sequence] enroll failed', err);
    return { ok: false, error: err instanceof Error ? err.message : 'unknown' };
  }
}

export type SequenceTickResult = { sent: number; skipped: number; completed: number; errors: number; cap: number };

export async function tickSequences(now: Date = new Date()): Promise<SequenceTickResult> {
  const cap = DAILY_CAP();
  const rows = await prisma.sequenceEnrollment.findMany({
    where: { status: 'active' },
    orderBy: [{ lastSentAt: { sort: 'asc', nulls: 'first' } }],
    take: Math.min(cap * 4, 1000),
  });

  let sent = 0;
  let skipped = 0;
  let completed = 0;
  let errors = 0;

  for (const e of rows) {
    if (sent >= cap) break;

    const nextIndex = e.beatIndex + 1;
    if (nextIndex >= BEAT_COUNT) {
      await prisma.sequenceEnrollment.update({ where: { id: e.id }, data: { status: 'completed' } });
      completed++;
      continue;
    }

    if (!sequenceExists(e.sequenceKey)) {
      // Sequence retired / handle removed — retire the enrollment quietly.
      await prisma.sequenceEnrollment.update({ where: { id: e.id }, data: { status: 'stopped' } });
      skipped++;
      continue;
    }

    // Time gate: this beat's day offset must have elapsed since enrollment…
    if (addDays(e.startedAt, BEAT_DAYS[nextIndex]) > now) { skipped++; continue; }
    // …and never two sends within ~a day.
    if (e.lastSentAt && now.getTime() - e.lastSentAt.getTime() < 20 * 3600 * 1000) { skipped++; continue; }

    // Suppression: an unsubscribe (isSubscribed=false) stops the sequence.
    const sub = await prisma.newsletterSubscriber.findUnique({
      where: { email: e.email },
      select: { isSubscribed: true },
    });
    if (sub && !sub.isSubscribed) {
      await prisma.sequenceEnrollment.update({ where: { id: e.id }, data: { status: 'stopped' } });
      skipped++;
      continue;
    }

    const ctx: SequenceCtx = { code: DEFAULT_CODE, unsubscribeUrl: unsubUrl(e.email) };
    const beat = resolveSequenceBeat(e.sequenceKey, nextIndex, ctx);
    if (!beat) { skipped++; continue; }

    try {
      const res = await sendEmail({
        to: e.email,
        subject: beat.subject,
        html: beat.html,
        text: beat.text,
        tags: [
          { name: 'type', value: 'compound_sequence' },
          { name: 'sequence', value: e.sequenceKey },
          { name: 'beat', value: String(nextIndex) },
        ],
      });
      if (!res.ok) throw new Error(res.error);
      sent++;
    } catch (err) {
      console.error(`[sequence-tick] send failed ${e.email} ${e.sequenceKey} beat=${nextIndex}`, err);
      errors++;
      // fall through and still advance — a bad address must not wedge the row
    }

    const done = nextIndex >= BEAT_COUNT - 1;
    await prisma.sequenceEnrollment.update({
      where: { id: e.id },
      data: { beatIndex: nextIndex, lastSentAt: new Date(), ...(done ? { status: 'completed' } : {}) },
    });
    if (done) completed++;
  }

  return { sent, skipped, completed, errors, cap };
}

export { sequenceKeyFor };
