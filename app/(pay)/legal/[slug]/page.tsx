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

/** Contact shown on payment surfaces. Compliance requires a reachable
 *  address; set CHECKOUT_SUPPORT_EMAIL to one on the checkout domain. */
function contactEmail(): string {
  return (
    process.env.CHECKOUT_SUPPORT_EMAIL?.trim() ||
    process.env.SUPPORT_EMAIL?.trim() ||
    'rx@meritsciences.com'
  );
}

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

  // ── Domain de-linking for the payment surface ────────────────────────────
  // The shared policy source is written for the storefront and names its
  // domains. On the payment domain those are pure connectivity: they tell a
  // reader (or a processor) exactly which store this checkout belongs to.
  // Rewritten here at render time; the storefront copies keep the real
  // references, which is where they belong and where they're accurate.
  //
  // NOTE: the ENTITY name ("Merit Sciences") is deliberately left intact.
  // These are binding terms with a governing-law clause — they must identify
  // who the buyer is actually contracting with. Stripping the counterparty
  // would make them unenforceable, which is a worse compliance problem than
  // the one we're solving.
  html = html
    .replace(/info@meritpeptides\.com/g, contactEmail())
    .replace(
      /operates the meritsciences\.com storefront and related research-compound services/g,
      'operates this checkout and related research-compound services',
    )
    .replace(
      /use of meritsciences\.com and the products and services we offer through it/g,
      'use of this checkout and the products and services we offer through it',
    )
    .replace(/visitors to meritsciences\.com/g, 'visitors to the Services')
    // Backstop for any remaining bare mention.
    .replace(/meritsciences\.com/g, 'the Services')
    .replace(/meritpeptides\.com/g, 'the Services');

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
