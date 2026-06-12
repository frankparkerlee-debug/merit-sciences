/**
 * Admin auth gate.
 *
 * Operators sign in via the same Supabase Auth magic-link flow as
 * affiliates. The /admin route group is gated by ADMIN_EMAILS — a
 * comma-separated list of email addresses allowed to operate the store.
 *
 *   ADMIN_EMAILS="frank.parker.lee@gmail.com,ops@meritsciences.com"
 *
 * Adding/removing operators is an env-var change + redeploy. No
 * separate admin user table — keeps the surface small.
 */

import 'server-only';
import { createServerSupabase } from '@/lib/supabase-server';

function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export async function requireAdmin(): Promise<{ email: string; userId: string } | null> {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return null;
  const email = user.email.toLowerCase();
  if (!adminEmails().includes(email)) return null;
  return { email, userId: user.id };
}

export async function isAdmin(): Promise<boolean> {
  return (await requireAdmin()) !== null;
}
