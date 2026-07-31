import { readFileSync } from 'fs';
import { join } from 'path';
import { notFound } from 'next/navigation';
import { PaymentShellHeader, PaymentShellFooter } from '@/components/PaymentShell';

/**
 * Policies served ON the payment domain.
 *
 * Card network rules require a checkout page to make the refund/return,
 * privacy, terms and delivery policies reachable — plus a contact method.
 * Before this, meritcheckout.com had ZERO links: "Terms" was plain text and
 * every policy path 404'd. That is a straightforward compliance failure, and
 * a reviewer would flag it faster than any domain association.
 *
 * Mounted at /legal/<slug> rather than /terms etc. because those paths already
 * exist in the (store) group — route groups don't namespace URLs, so reusing
 * them would be a build-time route collision.
 *
 * Same source of truth as the storefront (content/policies/*.html), rendered
 * in the minimal payment shell so nothing links back to the catalog.
 */

const POLICIES: Record<string, { file: string; title: string; subtitle: string; updated: string }> = {
  terms: {
    file: 'terms.html',
    title: 'Terms of Service',
    subtitle: 'The conditions under which Merit offers research compounds.',
    updated: 'June 17, 2026',
  },
  privacy: {
    file: 'privacy.html',
    title: 'Privacy Policy',
    subtitle: 'What we collect, why, and how it is handled.',
    updated: 'June 17, 2026',
  },
  returns: {
    file: 'returns.html',
    title: 'Refund & Return Policy',
    subtitle: 'How refunds and returns are handled.',
    updated: 'June 17, 2026',
  },
  shipping: {
    file: 'shipping.html',
    title: 'Shipping Policy',
    subtitle: 'Fulfillment timelines, carriers, and delivery.',
    updated: 'June 17, 2026',
  },
};

export function generateStaticParams() {
  return Object.keys(POLICIES).map((slug) => ({ slug }));
}

export const metadata = {
  robots: { index: false, follow: false },
};

export default function PayLegalPage({ params }: { params: { slug: string } }) {
  const policy = POLICIES[params.slug];
  if (!policy) notFound();

  let html = '';
  try {
    html = readFileSync(join(process.cwd(), 'content/policies', policy.file), 'utf-8');
  } catch {
    notFound();
  }

  return (
    <>
      <PaymentShellHeader />
      <article className="max-w-[760px] mx-auto px-5 sm:px-6 lg:px-8 py-12">
        <h1 className="font-display font-black text-ink tracking-[-0.035em] leading-[1.02] mb-2" style={{ fontSize: 'clamp(28px,4.5vw,40px)' }}>
          {policy.title}
        </h1>
        <p className="text-base text-ink-soft leading-relaxed mb-1">{policy.subtitle}</p>
        <p className="text-[12px] text-ink-muted mb-8">Last updated {policy.updated}</p>
        <div className="library-prose" dangerouslySetInnerHTML={{ __html: html }} />
      </article>
      <PaymentShellFooter />
    </>
  );
}
