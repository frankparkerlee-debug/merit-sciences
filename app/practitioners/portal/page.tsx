import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getPractitionerSession } from '@/lib/practitioner-session';

export const metadata = { title: 'Practitioner Portal — Merit Sciences' };
export const dynamic = 'force-dynamic';

export default async function PractitionerPortalPage() {
  const session = await getPractitionerSession();
  if (!session) redirect('/practitioners/login?error=Sign+in+required');

  const firstName = session.providerName.split(' ')[0];

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
              href="/orders/lookup"
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
            Signed in to <strong>{session.practiceName}</strong>. Account-tier pricing is applied
            across the catalog while you&rsquo;re signed in.
          </p>
        </div>

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
            title="Reach the pharmacy team"
            body="Email info@meritpeptides.com — replies go to the same humans who packed your order."
            href="mailto:info@meritpeptides.com"
            cta="Email support →"
          />
        </div>

        {/* Account info */}
        <section className="rounded-2xl border border-cobalt/15 bg-white p-7">
          <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold mb-4">
            — Account
          </p>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
            <InfoRow label="Practice">{session.practiceName}</InfoRow>
            <InfoRow label="Provider">{session.providerName}</InfoRow>
            <InfoRow label="Email">{session.email}</InfoRow>
            <InfoRow label="Pricing tier">{session.tier === 'standard' ? 'Standard' : session.tier}</InfoRow>
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
