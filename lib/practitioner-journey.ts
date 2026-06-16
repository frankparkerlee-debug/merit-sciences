/**
 * Practitioner email journey orchestration. Pure server-side.
 *
 *   enrollLead(email, ...)         — start a PROSPECT journey
 *   onApplicationSubmitted(email)  — pause PROSPECT, mark AWAITING_APPROVAL
 *   onApplicationApproved(...)     — start ONBOARDING (Day 0 = same day as
 *                                    approval; the immediate approval email
 *                                    is sent separately by the admin action)
 *   onFirstOrder(email, compound)  — exit ONBOARDING → start RETENTION
 *   onUnsubscribe(token)           — flip to PAUSED
 *
 *   tick()                         — cron handler. Finds journeys whose
 *                                    nextDueAt has passed, sends the
 *                                    pending email, advances pointer.
 */

import 'server-only';
import { prisma } from './db';
import { sendEmail } from './email';
import {
  SEQUENCES,
  renderEmail,
  type EmailDefinition,
  type EmailContext,
  type EmailPhase,
} from './practitioner-emails';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://meritsciences.com';

// ── Enrollment ────────────────────────────────────────────────────────────
export async function enrollLead(args: {
  email: string;
  firstName?: string;
  practiceName?: string;
  source?: string;
}): Promise<{ enrolled: boolean; reason?: string }> {
  const email = args.email.trim().toLowerCase();
  const existing = await prisma.practitionerJourney.findUnique({ where: { email } });
  if (existing) {
    // Already on a journey somewhere — don't reset
    return { enrolled: false, reason: `already on ${existing.phase}` };
  }
  await prisma.practitionerJourney.create({
    data: {
      email,
      firstName: args.firstName ?? null,
      practiceName: args.practiceName ?? null,
      phase: 'PROSPECT',
      nextEmailIndex: 0,
      nextDueAt: new Date(), // first email goes immediately on next tick
      source: args.source ?? 'lead-form',
    },
  });
  return { enrolled: true };
}

/** When a PractitionerApplication is submitted for this email, pause
 *  the PROSPECT sequence — the application + admin emails take over. */
export async function onApplicationSubmitted(email: string): Promise<void> {
  const j = await prisma.practitionerJourney.findUnique({
    where: { email: email.trim().toLowerCase() },
  });
  if (!j) return;
  // Only pause if currently prospecting — leave other phases alone
  if (j.phase === 'PROSPECT') {
    await prisma.practitionerJourney.update({
      where: { id: j.id },
      data: { phase: 'AWAITING_APPROVAL', nextDueAt: new Date('9999-12-31') },
    });
  }
}

/** When admin approves, start the ONBOARDING sequence (Day 1 = tomorrow,
 *  since Day 0 = the approval email itself). */
export async function onApplicationApproved(args: {
  email: string;
  firstName?: string;
  practiceName?: string;
}): Promise<void> {
  const email = args.email.trim().toLowerCase();
  const j = await prisma.practitionerJourney.findUnique({ where: { email } });
  if (j) {
    await prisma.practitionerJourney.update({
      where: { id: j.id },
      data: {
        phase: 'ONBOARDING',
        nextEmailIndex: 0,
        phaseStartedAt: new Date(),
        nextDueAt: tomorrow(),
        firstName: args.firstName ?? j.firstName,
        practiceName: args.practiceName ?? j.practiceName,
      },
    });
  } else {
    // They applied directly without ever being a lead — start their
    // journey at ONBOARDING.
    await prisma.practitionerJourney.create({
      data: {
        email,
        firstName: args.firstName ?? null,
        practiceName: args.practiceName ?? null,
        phase: 'ONBOARDING',
        nextEmailIndex: 0,
        phaseStartedAt: new Date(),
        nextDueAt: tomorrow(),
        source: 'approval',
      },
    });
  }
}

/** Exit ONBOARDING, start RETENTION. Called when a first order is detected. */
export async function onFirstOrder(args: {
  email: string;
  firstCompound?: string;
}): Promise<void> {
  const email = args.email.trim().toLowerCase();
  const j = await prisma.practitionerJourney.findUnique({ where: { email } });
  if (!j) return;
  if (j.phase === 'RETENTION' || j.phase === 'COMPLETED') return; // already there
  await prisma.practitionerJourney.update({
    where: { id: j.id },
    data: {
      phase: 'RETENTION',
      nextEmailIndex: 0,
      phaseStartedAt: new Date(),
      nextDueAt: daysFromNow(SEQUENCES.RETENTION[0]?.dayOffset ?? 0),
      firstCompound: args.firstCompound ?? j.firstCompound,
    },
  });
}

export async function onUnsubscribe(token: string): Promise<boolean> {
  const j = await prisma.practitionerJourney.findUnique({ where: { unsubToken: token } });
  if (!j) return false;
  await prisma.practitionerJourney.update({
    where: { id: j.id },
    data: { phase: 'PAUSED', nextDueAt: new Date('9999-12-31') },
  });
  return true;
}

// ── Cron tick ─────────────────────────────────────────────────────────────
/**
 * Process every due email. Idempotent on the same day — if the same
 * journey row is processed twice, the second pass sees an advanced
 * `nextEmailIndex` and is a no-op.
 *
 * Returns { sent, skipped, completed, errors }.
 */
export async function tick(now: Date = new Date()): Promise<{
  sent: number;
  skipped: number;
  completed: number;
  errors: number;
}> {
  const due = await prisma.practitionerJourney.findMany({
    where: {
      phase: { in: ['PROSPECT', 'ONBOARDING', 'RETENTION'] },
      nextDueAt: { lte: now },
    },
    take: 200,
  });

  let sent = 0, skipped = 0, completed = 0, errors = 0;

  for (const j of due) {
    const phase = j.phase as EmailPhase;
    const seq = SEQUENCES[phase];
    if (!seq) continue;
    const def = seq[j.nextEmailIndex];

    // Sequence complete?
    if (!def) {
      await prisma.practitionerJourney.update({
        where: { id: j.id },
        data: { phase: phase === 'RETENTION' ? 'COMPLETED' : j.phase, nextDueAt: new Date('9999-12-31') },
      });
      completed++;
      continue;
    }

    try {
      const ctx: EmailContext = {
        firstName: j.firstName ?? 'there',
        practiceName: j.practiceName ?? 'your practice',
        siteUrl: SITE_URL,
        unsubscribeUrl: `${SITE_URL}/practitioners/unsubscribe?token=${j.unsubToken}`,
        firstCompound: j.firstCompound ?? undefined,
      };
      await sendEmail({
        to: j.email,
        subject: def.subject(ctx),
        html: renderEmail(def, ctx),
      });
      sent++;
    } catch (err) {
      console.error(`[journey-tick] send failed for ${j.email} key=${def.key}`, err);
      errors++;
      // Advance anyway so we don't loop forever on a bad address
    }

    const nextIdx = j.nextEmailIndex + 1;
    const nextDef = seq[nextIdx];
    await prisma.practitionerJourney.update({
      where: { id: j.id },
      data: {
        lastSentKey: def.key,
        lastSentAt: new Date(),
        nextEmailIndex: nextIdx,
        nextDueAt: nextDef
          ? addDays(j.phaseStartedAt, nextDef.dayOffset)
          : new Date('9999-12-31'),
      },
    });
  }

  return { sent, skipped, completed, errors };
}

// ── Helpers ───────────────────────────────────────────────────────────────
function tomorrow(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d;
}
function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}
function addDays(start: Date, n: number): Date {
  const d = new Date(start);
  d.setDate(d.getDate() + n);
  return d;
}
