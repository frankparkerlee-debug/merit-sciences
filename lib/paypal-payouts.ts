/**
 * PayPal Payouts — sending affiliate commission checks OUT.
 *
 * Separate from lib/paypal.ts (which handles taking customer money IN
 * at checkout). Reuses the same OAuth token + sandbox/live base.
 *
 * Requires the PayPal account to have the **Payouts** product enabled
 * (Business account → Pay & Get Paid → Payouts). Uses one single-item
 * batch per affiliate so a single failure never blocks the others.
 *
 * Docs: https://developer.paypal.com/docs/api/payments.payouts-batch/v1/
 */

import 'server-only';
import { getAccessToken } from '@/lib/paypal';

const SANDBOX_BASE = 'https://api-m.sandbox.paypal.com';
const LIVE_BASE = 'https://api-m.paypal.com';

function baseUrl(): string {
  return (process.env.PAYPAL_ENV ?? 'sandbox') === 'live' ? LIVE_BASE : SANDBOX_BASE;
}

export type PayoutSendResult =
  | { ok: true; batchId: string; itemId: string; batchStatus: string }
  | { ok: false; error: string };

/**
 * Send one affiliate commission payout via PayPal Payouts.
 *
 * @param receiverEmail  the affiliate's PayPal email (payout destination)
 * @param amountCents    integer cents to send (USD)
 * @param payoutId       our Payout row id — used as the idempotency key
 *                       (sender_batch_id + sender_item_id) so a retry of
 *                       the same Payout can't double-pay.
 */
export async function sendAffiliatePayout(args: {
  receiverEmail: string;
  amountCents: number;
  payoutId: string;
  note?: string;
}): Promise<PayoutSendResult> {
  const { receiverEmail, amountCents, payoutId } = args;
  if (amountCents <= 0) return { ok: false, error: 'Payout amount must be positive' };

  const value = (amountCents / 100).toFixed(2);
  const body = {
    sender_batch_header: {
      // Idempotency: PayPal rejects a duplicate sender_batch_id, so a
      // re-run of the same Payout id can't pay twice.
      sender_batch_id: `merit-payout-${payoutId}`,
      email_subject: 'You have a payout from Merit Sciences',
      email_message:
        'Your Merit Sciences affiliate commission has been sent. Thank you for partnering with us.',
    },
    items: [
      {
        recipient_type: 'EMAIL' as const,
        amount: { value, currency: 'USD' },
        receiver: receiverEmail,
        note: args.note ?? 'Merit Sciences affiliate commission',
        sender_item_id: payoutId,
      },
    ],
  };

  let res: Response;
  try {
    const token = await getAccessToken();
    res = await fetch(`${baseUrl()}/v1/payments/payouts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
  } catch (err) {
    return { ok: false, error: `PayPal Payouts request failed: ${String(err)}` };
  }

  const text = await res.text();
  if (!res.ok) {
    return { ok: false, error: `PayPal Payouts ${res.status}: ${text.slice(0, 500)}` };
  }

  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: 'PayPal Payouts returned non-JSON' };
  }

  const batchId: string | undefined = data?.batch_header?.payout_batch_id;
  const batchStatus: string = data?.batch_header?.batch_status ?? 'PENDING';
  if (!batchId) {
    return { ok: false, error: `PayPal Payouts response missing batch id: ${text.slice(0, 300)}` };
  }

  // PayPal returns the per-item payout_item_id only on a subsequent GET
  // of the batch; for create we use our own sender_item_id (payoutId)
  // as the stable item reference.
  return { ok: true, batchId, itemId: payoutId, batchStatus };
}
