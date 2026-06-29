import Link from 'next/link';
import { prisma } from '@/lib/db';
import { getPayoutPreview, COMMISSION_HOLD_DAYS } from '@/lib/affiliate-payouts';
import { AFFILIATE_PROGRAM } from '@/lib/affiliate';
import { RunPayoutsButton } from './RunPayoutsButton';

export const metadata = { title: 'Affiliate payouts — Merit Admin' };
export const dynamic = 'force-dynamic';

function money(cents: bigint | number): string {
  const n = typeof cents === 'bigint' ? Number(cents) : cents;
  return `$${(n / 100).toFixed(2)}`;
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default async function AffiliatePayoutsPage() {
  const [preview, recent, paidAgg] = await Promise.all([
    getPayoutPreview(),
    prisma.payout.findMany({
      orderBy: { createdAt: 'desc' },
      take: 25,
      include: { affiliate: { select: { name: true, email: true } } },
    }),
    prisma.payout.aggregate({ where: { status: 'PAID' }, _sum: { totalCents: true } }),
  ]);

  const payable = preview.filter((p) => p.payable);
  const blocked = preview.filter((p) => !p.payable);
  const totalDueCents = payable.reduce((s, p) => s + p.eligibleCents, 0);
  // Running tally across ALL affiliates — what's owed + what's been paid.
  const totalMaturedCents = preview.reduce((s, p) => s + p.eligibleCents, 0);
  const totalHeldCents = preview.reduce((s, p) => s + p.heldCents, 0);
  const lifetimePaidCents = Number(paidAgg._sum.totalCents ?? 0n);

  return (
    <main className="max-w-[1000px] mx-auto px-5 sm:px-6 lg:px-8 py-8">
      <Link
        href="/admin/affiliates"
        className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold mb-3 inline-block hover:underline underline-offset-4"
      >
        ← Affiliates
      </Link>
      <h1 className="font-display font-black text-ink tracking-[-0.025em] text-3xl mb-1">
        Affiliate payouts<span className="text-cobalt">.</span>
      </h1>
      <p className="text-sm text-ink-soft mb-6">
        Commissions become payable {COMMISSION_HOLD_DAYS} days after the order (refund window), then
        pay out by PayPal once an affiliate clears the ${AFFILIATE_PROGRAM.payoutMinUsd} minimum.
      </p>

      {/* Running tally — what's owed + what's been paid, across all affiliates */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <TallyTile label="Payable now" value={money(totalMaturedCents)} />
        <TallyTile label="In refund hold" value={money(totalHeldCents)} />
        <TallyTile label="Total accrued" value={money(totalMaturedCents + totalHeldCents)} />
        <TallyTile label="Paid to date" value={money(lifetimePaidCents)} />
      </section>

      {/* Run band */}
      <section className="rounded-2xl border border-cobalt/15 bg-white p-6 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold mb-1">
            — Due now
          </p>
          <p className="font-display font-black text-ink text-3xl tracking-tight">
            {money(totalDueCents)}
            <span className="text-ink-soft text-base font-bold ml-2">
              across {payable.length} affiliate{payable.length === 1 ? '' : 's'}
            </span>
          </p>
        </div>
        <RunPayoutsButton eligibleCount={payable.length} />
      </section>

      {/* Eligible now */}
      <SectionTitle>Eligible now</SectionTitle>
      {payable.length === 0 ? (
        <Empty>No affiliates have cleared the ${AFFILIATE_PROGRAM.payoutMinUsd} minimum yet.</Empty>
      ) : (
        <Table head={['Affiliate', 'PayPal', 'Commissions', 'Amount']}>
          {payable.map((p) => (
            <tr key={p.affiliateId} className="border-t border-cobalt/10">
              <Td>
                <span className="font-bold text-ink">{p.name}</span>
                <span className="block text-[11px] text-ink-muted">{p.email}</span>
              </Td>
              <Td>{p.paypalEmail}</Td>
              <Td>{p.commissionCount}</Td>
              <Td className="text-right font-bold tabular-nums text-cobalt">{money(p.eligibleCents)}</Td>
            </tr>
          ))}
        </Table>
      )}

      {/* Accruing / blocked */}
      {blocked.length > 0 && (
        <>
          <SectionTitle>Accruing (not payable yet)</SectionTitle>
          <Table head={['Affiliate', 'Earned', 'Status']}>
            {blocked.map((p) => (
              <tr key={p.affiliateId} className="border-t border-cobalt/10">
                <Td>
                  <span className="font-bold text-ink">{p.name}</span>
                  <span className="block text-[11px] text-ink-muted">{p.email}</span>
                </Td>
                <Td className="tabular-nums">
                  {money(p.eligibleCents + p.heldCents)}
                  {p.heldCents > 0 && p.eligibleCents > 0 && (
                    <span className="block text-[10px] text-ink-muted">
                      {money(p.eligibleCents)} cleared · {money(p.heldCents)} in hold
                    </span>
                  )}
                </Td>
                <Td>
                  <span className="text-[11px] tracking-wide uppercase font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-0.5">
                    {p.blockedReason}
                  </span>
                </Td>
              </tr>
            ))}
          </Table>
        </>
      )}

      {/* History */}
      <SectionTitle>Recent payouts</SectionTitle>
      {recent.length === 0 ? (
        <Empty>No payouts run yet.</Empty>
      ) : (
        <Table head={['Date', 'Affiliate', 'Amount', 'Status']}>
          {recent.map((p) => (
            <tr key={p.id} className="border-t border-cobalt/10">
              <Td>{fmtDate(p.createdAt)}</Td>
              <Td>
                <span className="font-bold text-ink">{p.affiliate.name}</span>
                <span className="block text-[11px] text-ink-muted">{p.affiliate.email}</span>
              </Td>
              <Td className="tabular-nums">{money(p.totalCents)}</Td>
              <Td>
                <PayoutStatusPill status={p.status} reason={p.failureReason} />
              </Td>
            </tr>
          ))}
        </Table>
      )}
    </main>
  );
}

function TallyTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-cobalt/15 bg-white px-4 py-3">
      <p className="text-[10px] tracking-[0.18em] uppercase text-ink-soft font-bold">{label}</p>
      <p className="font-display font-black text-ink text-xl tabular-nums mt-1">{value}</p>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold mt-8 mb-3">
      — {children}
    </p>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-cobalt/20 bg-cobalt/[0.02] px-5 py-6 text-sm text-ink-soft">
      {children}
    </div>
  );
}

function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-cobalt/12 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-cream/50">
          <tr className="text-left text-[10px] tracking-[0.18em] uppercase text-ink-soft">
            {head.map((h, i) => (
              <th key={h} className={`px-4 py-2.5 font-bold ${i === head.length - 1 ? 'text-right' : ''}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function Td({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-2.5 align-middle ${className}`}>{children}</td>;
}

function PayoutStatusPill({ status, reason }: { status: string; reason: string | null }) {
  const styles: Record<string, string> = {
    PAID: 'bg-emerald-50 border-emerald-300 text-emerald-800',
    PROCESSING: 'bg-blue-50 border-blue-300 text-blue-800',
    PENDING: 'bg-amber-50 border-amber-300 text-amber-800',
    FAILED: 'bg-rose-50 border-rose-300 text-rose-800',
  };
  return (
    <span
      className={`inline-block text-[10px] tracking-[0.14em] uppercase font-bold px-2 py-0.5 rounded border ${styles[status] ?? styles.PENDING}`}
      title={reason ?? undefined}
    >
      {status}
    </span>
  );
}
