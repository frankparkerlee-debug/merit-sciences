import Link from 'next/link';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getPractitionerSession } from '@/lib/practitioner-session';

export const metadata = { title: 'Order history — Merit Sciences Practitioner Portal' };
export const dynamic = 'force-dynamic';

const STATUS_LABEL: Record<string, string> = {
  PENDING_PAYMENT: 'Pending payment',
  PAID: 'Paid',
  SHIPPED: 'Shipped',
  DELIVERED: 'Delivered',
  CANCELED: 'Canceled',
  REFUNDED: 'Refunded',
};

function statusStyles(status: string): string {
  switch (status) {
    case 'PAID':
      return 'bg-cobalt/10 text-cobalt border-cobalt/30';
    case 'SHIPPED':
      return 'bg-amber-50 text-amber-800 border-amber-300';
    case 'DELIVERED':
      return 'bg-emerald-50 text-emerald-800 border-emerald-300';
    case 'CANCELED':
    case 'REFUNDED':
      return 'bg-rose-50 text-rose-800 border-rose-300';
    default:
      return 'bg-ink/5 text-ink-soft border-ink/10';
  }
}

function fmtMoney(cents: bigint | number): string {
  const n = typeof cents === 'bigint' ? Number(cents) : cents;
  return `$${(n / 100).toFixed(2)}`;
}

export default async function PractitionerOrdersPage() {
  const session = await getPractitionerSession();
  if (!session) redirect('/practitioners/login?error=Sign+in+required');

  const orders = await prisma.order.findMany({
    where: { customerEmail: session.email },
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: {
      id: true,
      status: true,
      totalCents: true,
      createdAt: true,
      shippedAt: true,
      lines: { select: { title: true, qty: true } },
    },
  });

  return (
    <main className="bg-cream min-h-screen">
      <header className="bg-white border-b border-cobalt/10">
        <div className="max-w-[1240px] mx-auto px-6 lg:px-10 py-4 flex items-center justify-between gap-4">
          <Link href="/practitioners/portal" className="flex items-center gap-3">
            <span className="font-display font-black text-ink text-lg tracking-[-0.02em]">
              Merit Sciences
            </span>
            <span className="hidden sm:inline-block text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold border-l border-cobalt/20 pl-3 ml-1">
              Practitioner Portal
            </span>
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link
              href="/practitioners/portal"
              className="text-ink-soft hover:text-ink transition font-bold tracking-wide text-[11px] uppercase"
            >
              ← Portal
            </Link>
            <form action="/auth/logout?next=/practitioners" method="POST">
              <button
                type="submit"
                className="text-ink-soft hover:text-ink transition font-bold tracking-wide text-[11px] uppercase"
              >
                Sign out
              </button>
            </form>
          </nav>
        </div>
      </header>

      <div className="max-w-[1240px] mx-auto px-6 lg:px-10 py-12">
        <div className="mb-10">
          <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold mb-3">
            — Records
          </p>
          <h1
            className="font-display font-black tracking-[-0.025em] leading-[0.95] mb-2"
            style={{ fontSize: 'clamp(32px, 5vw, 56px)' }}
          >
            Order history<span className="text-cobalt">.</span>
          </h1>
          <p className="text-[15px] text-ink-soft">
            Every order placed under <strong>{session.email}</strong>. Click any order for line
            items, COA, and tracking.
          </p>
        </div>

        {orders.length === 0 ? (
          <div className="rounded-2xl border border-cobalt/15 bg-white p-12 text-center">
            <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold mb-3">
              — No orders yet
            </p>
            <p className="text-sm text-ink-soft mb-6 max-w-md mx-auto leading-relaxed">
              Your first order will land here with the COA, lot data, and tracking link. Browse the
              catalog whenever you&rsquo;re ready &mdash; practitioner pricing already applied.
            </p>
            <Link
              href="/catalog"
              className="inline-flex items-center bg-cobalt text-white text-[11px] tracking-[0.16em] uppercase font-bold px-6 py-3 rounded-lg hover:bg-ink transition-colors"
            >
              Browse the catalog →
            </Link>
          </div>
        ) : (
          <div className="rounded-2xl border border-cobalt/15 bg-white overflow-hidden">
            <div className="grid grid-cols-[1.4fr_120px_100px_110px_60px] gap-3 px-5 py-3 bg-cobalt/[0.04] text-[10px] tracking-[0.18em] uppercase font-bold text-ink-soft min-w-[820px]">
              <div>Order</div>
              <div>Date</div>
              <div className="text-right">Total</div>
              <div className="text-right">Status</div>
              <div></div>
            </div>
            {orders.map((order) => {
              const titles = order.lines
                .map((l) => `${l.qty} × ${l.title}`)
                .join(' · ');
              return (
                <Link
                  key={order.id}
                  href={`/orders/${order.id}`}
                  className="grid grid-cols-[1.4fr_120px_100px_110px_60px] gap-3 px-5 py-4 border-t border-cobalt/5 hover:bg-cobalt/[0.02] transition items-center text-sm min-w-[820px]"
                >
                  <div className="min-w-0">
                    <div className="text-ink font-bold truncate">
                      Order {order.id.slice(0, 8)}
                    </div>
                    <div className="text-[11px] text-ink-soft truncate">{titles || '—'}</div>
                  </div>
                  <div className="text-[12px] text-ink-soft tabular-nums">
                    {order.createdAt.toISOString().slice(0, 10)}
                  </div>
                  <div className="text-right text-ink font-bold tabular-nums">
                    {fmtMoney(order.totalCents)}
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-block text-[10px] tracking-[0.16em] uppercase font-bold px-2 py-0.5 rounded border ${statusStyles(order.status)}`}
                    >
                      {STATUS_LABEL[order.status] ?? order.status}
                    </span>
                  </div>
                  <div className="text-right text-[10px] text-cobalt font-bold">→</div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
