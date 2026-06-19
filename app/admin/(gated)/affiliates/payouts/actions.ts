'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin-session';
import { runPayouts, retryPayout } from '@/lib/affiliate-payouts';

export type PayoutRunResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

/** Run the full payout batch for every eligible affiliate. */
export async function runPayoutsAction(
  _prev: PayoutRunResult | null,
  _formData: FormData,
): Promise<PayoutRunResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: 'Unauthorized' };

  try {
    const r = await runPayouts();
    revalidatePath('/admin/affiliates/payouts');
    if (r.paidCount === 0 && r.failedCount === 0) {
      return { ok: true, message: 'No affiliates were eligible for payout right now.' };
    }
    const paid = `Paid ${r.paidCount} affiliate${r.paidCount === 1 ? '' : 's'} · $${(r.paidCents / 100).toFixed(2)}`;
    const failed = r.failedCount ? ` · ${r.failedCount} failed (see below)` : '';
    return { ok: true, message: paid + failed };
  } catch (err) {
    console.error('[payouts] run failed', err);
    return { ok: false, error: `Payout run failed: ${String(err).slice(0, 200)}` };
  }
}

/** Retry one FAILED payout. */
export async function retryPayoutAction(
  _prev: PayoutRunResult | null,
  formData: FormData,
): Promise<PayoutRunResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: 'Unauthorized' };

  const payoutId = String(formData.get('payoutId') ?? '').trim();
  if (!payoutId) return { ok: false, error: 'Missing payout id' };

  const r = await retryPayout(payoutId);
  revalidatePath('/admin/affiliates/payouts');
  return r.ok ? { ok: true, message: 'Payout retried successfully.' } : { ok: false, error: r.error ?? 'Retry failed' };
}
