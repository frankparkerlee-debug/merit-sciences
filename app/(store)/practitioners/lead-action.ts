'use server';

import { enrollLead } from '@/lib/practitioner-journey';

export type LeadResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

/**
 * Lightweight lead capture — used by the "Get the practitioner brief"
 * form on /practitioners. Enrolls them in the PROSPECT email sequence;
 * the first email (the brief itself) goes out on the next cron tick.
 */
export async function captureLead(
  _prev: LeadResult | null,
  formData: FormData,
): Promise<LeadResult> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const firstName = String(formData.get('firstName') ?? '').trim() || undefined;
  const practiceName = String(formData.get('practiceName') ?? '').trim() || undefined;

  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { ok: false, error: 'Please enter a valid email address.' };
  }

  try {
    const result = await enrollLead({ email, firstName, practiceName, source: 'lead-form' });
    if (!result.enrolled) {
      // Already on a journey — pretend success so we don't reveal state
      return { ok: true, message: "You're on the list. Watch your inbox for the brief." };
    }
    return { ok: true, message: "You're in. The brief lands in your inbox shortly." };
  } catch (err) {
    console.error('[capture-lead] failed', err);
    return { ok: false, error: 'Something went wrong. Please try again or apply directly.' };
  }
}
