'use server';

import { requireAdmin } from '@/lib/admin-session';
import { backfillMissingCommissions, type BackfillResult } from '@/lib/backfill-commissions';

export type BackfillActionResult =
  | { ok: true; result: BackfillResult }
  | { ok: false; error: string };

/**
 * One-off: create the missing commission rows for past affiliate orders.
 * Admin-gated (server actions are their own endpoints — the (gated) layout does
 * not protect them, so we re-check here). Idempotent — safe to click twice.
 */
export async function runBackfill(): Promise<BackfillActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: 'Unauthorized' };
  try {
    const result = await backfillMissingCommissions();
    return { ok: true, result };
  } catch (err: any) {
    console.error('[backfill-commissions] failed', err);
    return { ok: false, error: err?.message ?? 'Backfill failed — check server logs.' };
  }
}
