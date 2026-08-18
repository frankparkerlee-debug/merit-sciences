import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getPractitionerSession } from '@/lib/practitioner-session';
import { prisma } from '@/lib/db';
import { getPricingContext, priceFor } from '@/lib/pricing';
import { CardOnFile } from './CardOnFile';

export const metadata = { title: { absolute: 'Practitioner Portal — Merit Sciences' } };
export const dynamic = 'force-dynamic';

export default async function PractitionerPortalPage() {
  const session = await getPractitionerSession();
  if (!session) redirect('/practitioners/login?error=Sign+in+required');

  // Card facts for display only — brand, last4 and expiry. The instrument
  // itself is at Stripe; nothing here could reconstruct a card.
  const cardRow = await prisma.practitionerApplication
    .findUnique({
      where: { id: session.applicationId },
      select: { cardBrand: true, cardLast4: true, cardExpMonth: true, cardExpYear: true },
    })
    .catch(() => null);
  const savedCard =
    cardRow?.cardBrand && cardRow.cardLast4 && cardRow.cardExpMonth && cardRow.cardExpYear
      ? {
          brand: cardRow.cardBrand,
          last4: cardRow.cardLast4,
          expMonth: cardRow.cardExpMonth,
          expYear: cardRow.cardExpYear,
        }
      : null;

  /* Greeting name. Splitting on the first space returned the honorific for
     anyone stored as "Dr. Jane Smith" — and since the page appends its own
     period, that rendered "Dr..". Drop a leading title, then take the first
     remaining word; if a name is nothing but a title, fall back to the whole
     string rather than greeting someone with an empty space. */
  const firstName = (() => {
    const parts = session.providerName
      .trim()
      .split(/\s+/)
      .filter((w) => !/^(dr|mr|mrs|ms|mx|prof)\.?$/i.test(w));
    return parts[0] || session.providerName.trim();
  })();

  // The portal used to say "account pricing is applied across the catalog"
  // and then show nothing — an empty room as the first impression after
  // approval. Resolve this practitioner's ACTUAL prices through the same
  // waterfall checkout uses, so they land on proof instead of a promise.
  const myPrices = await (async () => {
    try {
      /* Every active SKU is in scope. A practice is priced individually now,
         so there is no shared-tier subset to filter to — the earlier filter
         under-reported the count (30 of 32) and hid products they were in
         fact getting a rate on. */
      const ctx = await getPricingContext();
      const [products] = await Promise.all([
        prisma.product.findMany({
          where: {
            status: 'ACTIVE',
            NOT: [{ title: { contains: 'water', mode: 'insensitive' } }],
          },
          select: {
            handle: true, title: true, vialSize: true,
            priceCents: true, physicianPriceCents: true,
          },
          orderBy: { priceCents: 'desc' },
          take: 60,
        }),
      ]);
      type Row = { handle: string; title: string; vialSize: string; retail: number; yours: number; save: number; isPractitionerPricing: boolean };
      const rows: Row[] = products
        .map((p): Row => {
          const { effectivePriceCents, isPractitionerPricing } = priceFor(
            { handle: p.handle, priceCents: Number(p.priceCents), physicianPriceCents: Number(p.physicianPriceCents) },
            ctx,
          );
          return {
            handle: p.handle,
            title: p.title,
            vialSize: p.vialSize,
            retail: Number(p.priceCents),
            yours: effectivePriceCents,
            save: Number(p.priceCents) - effectivePriceCents,
            isPractitionerPricing,
          };
        })
        .filter((r: Row) => r.isPractitionerPricing && r.save > 0);
      rows.sort((a: Row, b: Row) => b.save - a.save);
      const annualIfOnePerMonth = rows.reduce((acc: number, r: Row) => acc + r.save, 0) * 12;
      return { rows: rows.slice(0, 6), total: rows.length, annualIfOnePerMonth };
    } catch {
      return { rows: [], total: 0, annualIfOnePerMonth: 0 };
    }
  })();

  const money = (c: number) =>
    `$${(c / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <main className="bg-cream min-h-screen">
      {/* Top bar — practitioner-specific so it's visually distinct from the
          public Nav, signals "you're in your portal" */}
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
              href="/catalog"
              className="text-ink-soft hover:text-ink transition font-bold tracking-wide text-[11px] uppercase"
            >
              Catalog
            </Link>
            <Link
              href="/practitioners/portal/orders"
              className="text-ink-soft hover:text-ink transition font-bold tracking-wide text-[11px] uppercase"
            >
              Orders
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
        {/* Welcome header */}
        <div className="mb-10">
          <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold mb-3">
            — Welcome
          </p>
          <h1
            className="font-display font-black tracking-[-0.025em] leading-[0.95] mb-2"
            style={{ fontSize: 'clamp(32px, 5vw, 56px)' }}
          >
            {firstName}<span className="text-cobalt">.</span>
          </h1>
          <p className="text-[15px] text-ink-soft">
            {myPrices.rows.length > 0 ? (
              <>
                Signed in to <strong>{session.practiceName}</strong>. Your account pricing is live on{' '}
                <strong>{myPrices.total}</strong>
                {myPrices.total === 1 ? ' compound' : ' compounds'} — applied automatically at the
                catalog and at checkout, on every pack size.
              </>
            ) : (
              <>
                {/* No assigned pricing yet. Saying "your account pricing is
                    live" here would be a promise the catalog then breaks, so
                    the portal states the real position instead. */}
                Signed in to <strong>{session.practiceName}</strong>. Your account is active and
                ordering is open at list price — account pricing hasn&rsquo;t been set for your
                practice yet. Reply to your approval email and we&rsquo;ll get it assigned.
              </>
            )}
          </p>
        </div>

        {/* Your pricing — the proof that the account is worth having. Same
            resolver as checkout, so what is shown is what is charged. */}
        {myPrices.rows.length > 0 && (
          <section className="rounded-2xl border border-cobalt/15 bg-white overflow-hidden mb-8">
            <div className="px-6 py-4 border-b border-cobalt/10 flex items-baseline justify-between gap-4 flex-wrap">
              <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold">
                — Your account pricing
              </p>
              <Link
                href="/catalog"
                className="text-[11px] font-bold tracking-[0.1em] uppercase text-cobalt hover:underline underline-offset-4"
              >
                See all {myPrices.total} →
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead>
                  <tr className="text-[10px] tracking-[0.14em] uppercase text-ink-muted border-b border-cobalt/10">
                    <th className="px-6 py-3 font-normal">Compound</th>
                    <th className="px-6 py-3 font-normal text-right">Retail</th>
                    <th className="px-6 py-3 font-normal text-right">Your price</th>
                    <th className="px-6 py-3 font-normal text-right">You save</th>
                  </tr>
                </thead>
                <tbody>
                  {myPrices.rows.map((r) => (
                    <tr key={r.handle} className="border-b border-cobalt/5 last:border-b-0">
                      <td className="px-6 py-3.5">
                        <Link href={`/products/${r.handle}`} className="font-bold text-ink hover:text-cobalt transition">
                          {r.title}
                        </Link>
                        <span className="block text-[11px] text-ink-muted">{r.vialSize}</span>
                      </td>
                      <td className="px-6 py-3.5 text-right text-ink-muted line-through tabular-nums">{money(r.retail)}</td>
                      <td className="px-6 py-3.5 text-right font-bold text-ink tabular-nums">{money(r.yours)}</td>
                      <td className="px-6 py-3.5 text-right font-bold text-emerald-700 tabular-nums">{money(r.save)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="px-6 py-3.5 text-[11px] text-ink-soft border-t border-cobalt/10">
              Prices shown are what you&rsquo;re charged at checkout while signed in — no code to enter.
              Ordering one of each above monthly would save{' '}
              <strong className="text-ink">{money(myPrices.annualIfOnePerMonth)}</strong> a year
              against retail.
            </p>
          </section>
        )}

        {/* Quick links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-12">
          <PortalCard
            tag="Shop"
            title="Browse the catalog"
            body="Practitioner pricing applies to every SKU while you're signed in."
            href="/catalog"
            cta="Open catalog →"
          />
          <PortalCard
            tag="Records"
            title="Order history + COAs"
            body="Your past orders, lots, and Certificates of Analysis in one place."
            href="/orders/lookup"
            cta="View orders →"
          />
          <PortalCard
            tag="Support"
            title="Reach the Merit team"
            body="Email info@meritpeptides.com — replies go to the same humans who packed your order."
            href="mailto:info@meritpeptides.com"
            cta="Email support →"
          />
        </div>

        {/* Card on file — sits above the account block because it is the one
            thing on this page a practice acts on rather than reads. */}
        <section className="mb-8">
          <CardOnFile card={savedCard} />
        </section>

        {/* Account info */}
        <section className="rounded-2xl border border-cobalt/15 bg-white p-7">
          <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold mb-4">
            — Account
          </p>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
            <InfoRow label="Practice">{session.practiceName}</InfoRow>
            <InfoRow label="Provider">{session.providerName}</InfoRow>
            <InfoRow label="Email">{session.email}</InfoRow>
            <InfoRow label="Pricing tier">
              {session.retailDiscountBps != null
                ? `${(session.retailDiscountBps / 100)
                    .toFixed(2)
                    .replace(/\.?0+$/, '')}% off retail`
                : session.priceMultiplierBps !== 10000
                  ? `Account tier (${session.priceMultiplierBps < 10000 ? '−' : '+'}${(
                      Math.abs(session.priceMultiplierBps - 10000) / 100
                    ).toFixed(2).replace(/\.?0+$/, '')}%)`
                  : 'Account pricing'}
            </InfoRow>
          </dl>
          <p className="text-[11px] text-ink-soft mt-5">
            To update your account or request a custom pricing tier, reply to your approval email
            or contact info@meritpeptides.com.
          </p>
        </section>
      </div>
    </main>
  );
}

function PortalCard({
  tag,
  title,
  body,
  href,
  cta,
}: {
  tag: string;
  title: string;
  body: string;
  href: string;
  cta: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-2xl border border-cobalt/15 bg-white p-6 hover:border-cobalt/40 transition group"
    >
      <p className="text-[10px] tracking-[0.22em] uppercase font-bold text-cobalt mb-2">— {tag}</p>
      <h3 className="font-display font-black text-xl text-ink leading-tight mb-2 tracking-[-0.02em]">
        {title}
      </h3>
      <p className="text-[13px] text-ink-soft leading-relaxed mb-4">{body}</p>
      <p className="text-[11px] tracking-[0.16em] uppercase font-bold text-cobalt group-hover:underline">
        {cta}
      </p>
    </Link>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[10px] tracking-[0.18em] uppercase font-bold text-ink-soft mb-1">
        {label}
      </dt>
      <dd className="text-ink">{children}</dd>
    </div>
  );
}
