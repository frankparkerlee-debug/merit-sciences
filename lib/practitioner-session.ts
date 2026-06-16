/**
 * Practitioner session gate.
 *
 * A practitioner is signed in if and only if:
 *   (1) They have a valid Supabase Auth session
 *   (2) Their email matches an APPROVED PractitionerApplication row
 *
 * Mirrors the admin-session.ts pattern but checks the DB instead of an
 * env-var allowlist — practitioners are user data, admins are operators.
 */

import 'server-only';
import { createServerSupabase } from '@/lib/supabase-server';
import { prisma } from '@/lib/db';

export type PractitionerSession = {
  email: string;
  userId: string;
  applicationId: string;
  practiceName: string;
  providerName: string;
  /** Pricing tier — currently always 'standard'. Custom tiers per
   *  practitioner will plug in here when admin assigns them. */
  tier: 'standard';
};

export async function getPractitionerSession(): Promise<PractitionerSession | null> {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return null;
  const email = user.email.toLowerCase();

  const app = await prisma.practitionerApplication.findFirst({
    where: { email, status: 'APPROVED' },
    select: { id: true, practiceName: true, providerName: true },
  });
  if (!app) return null;

  return {
    email,
    userId: user.id,
    applicationId: app.id,
    practiceName: app.practiceName,
    providerName: app.providerName,
    tier: 'standard',
  };
}

export async function isApprovedPractitioner(email: string): Promise<boolean> {
  const app = await prisma.practitionerApplication.findFirst({
    where: { email: email.toLowerCase(), status: 'APPROVED' },
    select: { id: true },
  });
  return !!app;
}
