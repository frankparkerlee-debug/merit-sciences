import Link from 'next/link';
import { prisma } from '@/lib/db';
import { manageUrl } from '@/lib/retail-subscriptions';
import { adminSubscriptionAction } from './actions';

export const metadata = { title: 'Subscriptions — Merit Admin' };
export const dynamic = 'force-dynamic';

const TONE: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-900',
  PAUSED: 'bg-amber-100 text-amber-900',
  PAST_DUE: 'bg-rose-100 text-rose-900',
  CANCELED: 'bg-ink/10 text-ink-soft',
};
const LABEL: Record<string, string> = { ACTIVE: 'Active', PAUSED: 'Paused', PAST_DUE: 'Payment failed', CANCELED: 'Canceled' };

const fmt = (d: Date | null) => (d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/Chicago' }) : '');
const money = (c: number) => `$${(c / 100).toFixed(2)}`;

type Line = { title: string; qty: number; unitCents: number };

export default async function AdminSubscriptionsPage() {
  const subs = await prisma.retailSubscription.findMany({ orderBy: [{ status: 'asc' }, { nextChargeAt: 'asc' }], take: 500 });
  const live = subs.filter((s) => s.status !== 'CANCELED');
  const perCycle = live.reduce((sum, s) => sum + ((s.lines as unknown as Line[]) ?? []).reduce((a, l) => a + Number(l.unitCents) * l.qty, 0), 0);

  return (
    <div className="p-6 lg:p-8">
      <h1 className="font-display font-black text-ink text-[28px] tracking-[-0.02em] mb-1">Subscriptions</h1>
      <p className="text-[13px] text-ink-soft mb-6">
        {live.length} running, {money(perCycle)} per cycle before shipping. Renewals are charged by the daily job and appear as normal orders.
      </p>

      {subs.length === 0 ? (
        <p className="rounded-xl border border-ink/10 bg-white px-5 py-8 text-[14px] text-ink-soft">
          No subscriptions yet. One starts when a customer checks out with a Subscribe item and ticks the subscription box.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-ink/10 bg-white">
          <table className="w-full text-[13px]">
            <thead className="text-left text-[11px] uppercase tracking-wider text-ink-soft">
              <tr>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3">Schedule</th>
                <th className="px-4 py-3">Next charge</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Change</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/10">
              {subs.map((s) => {
                const lines = (s.lines as unknown as Line[]) ?? [];
                const ended = s.status === 'CANCELED';
                return (
                  <tr key={s.id} className="align-top">
                    <td className="px-4 py-3">
                      <div className="font-bold text-ink">{s.customerName}</div>
                      <div className="text-ink-soft">{s.customerEmail}</div>
                      <div className="text-ink-muted capitalize">{s.cardBrand ?? 'card'} {s.cardLast4 ?? ''}</div>
                    </td>
                    <td className="px-4 py-3 text-ink">
                      {lines.map((l, i) => (
                        <div key={i}>{l.qty} x {l.title} <span className="text-ink-soft">{money(Number(l.unitCents))}</span></div>
                      ))}
                      <Link href={`/admin/orders/${s.originOrderId}`} className="text-cobalt underline">First order</Link>
                      {s.lastOrderId && (
                        <> · <Link href={`/admin/orders/${s.lastOrderId}`} className="text-cobalt underline">Latest renewal</Link></>
                      )}
                    </td>
                    <td className="px-4 py-3 text-ink">
                      Every {s.intervalCount === 1 ? s.intervalUnit : `${s.intervalCount} ${s.intervalUnit}s`}
                      <div className="text-ink-soft">{s.cycleCount} renewal{s.cycleCount === 1 ? '' : 's'} so far</div>
                    </td>
                    <td className="px-4 py-3 text-ink">
                      {ended ? <span className="text-ink-soft">Ended {fmt(s.canceledAt)}</span> : fmt(s.nextChargeAt)}
                      {s.failedAttempts > 0 && !ended && <div className="text-rose-700">{s.failedAttempts} failed attempt{s.failedAttempts === 1 ? '' : 's'}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${TONE[s.status] ?? ''}`}>{LABEL[s.status] ?? s.status}</span>
                      {ended && s.cancelReason && <div className="mt-1 text-ink-muted">{s.cancelReason.replace(/_/g, ' ')}</div>}
                    </td>
                    <td className="px-4 py-3">
                      {!ended && (
                        <form action={adminSubscriptionAction} className="flex flex-wrap gap-1.5">
                          <input type="hidden" name="id" value={s.id} />
                          {s.status === 'PAUSED' ? (
                            <button name="action" value="resume" className="rounded-md border border-ink/15 px-2.5 py-1 font-bold text-ink">Resume</button>
                          ) : (
                            <>
                              <button name="action" value="skip" className="rounded-md border border-ink/15 px-2.5 py-1 font-bold text-ink">Skip next</button>
                              <button name="action" value="pause" className="rounded-md border border-ink/15 px-2.5 py-1 font-bold text-ink">Pause</button>
                            </>
                          )}
                          <button name="action" value="cancel" className="rounded-md border border-rose-300 px-2.5 py-1 font-bold text-rose-800">Cancel</button>
                        </form>
                      )}
                      <a href={manageUrl(s.id)} className="mt-1.5 inline-block text-cobalt underline">Customer&rsquo;s page</a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
