import { PaymentShellHeader } from '@/components/PaymentShell';

/**
 * Landing page for the ROOT of the payment domain.
 *
 * Reached via a middleware rewrite of "/" on the checkout host (it can't live
 * at app/(pay)/page.tsx — the storefront homepage already owns "/", and route
 * groups don't namespace URLs).
 *
 * Why this exists at all: the root used to return a bare "Not found". A domain
 * that 404s everything except one payment path is itself a cloaking signal —
 * precisely the pattern payment-risk teams look for. An honest, minimal page
 * that says what the domain is, names the merchant, and links the required
 * policies is both more compliant AND less suspicious than an empty 404.
 *
 * Deliberately contains no catalog, no product names, no prices, and no link
 * to the storefront.
 */

export const metadata = {
  title: { absolute: 'Merit — Secure Payments' },
  description: null,
  robots: { index: false, follow: false, nocache: true },
  alternates: { canonical: null },
  keywords: null,
  openGraph: null,
  twitter: null,
};

/** Compliance requires a reachable contact. CHECKOUT_SUPPORT_EMAIL should be
 *  set to an address on this domain; the fallback keeps us contactable. */
function contactEmail(): string {
  return (
    process.env.CHECKOUT_SUPPORT_EMAIL?.trim() ||
    process.env.SUPPORT_EMAIL?.trim() ||
    'rx@meritsciences.com'
  );
}

export default function PayHomePage() {
  const email = contactEmail();

  return (
    <>
      <PaymentShellHeader />
      <section className="max-w-[640px] mx-auto px-5 sm:px-6 lg:px-8 py-16">
        <p className="text-[10px] tracking-[0.28em] uppercase text-cobalt font-bold mb-3">
          — Payments
        </p>
        <h1
          className="font-display font-black text-ink tracking-[-0.035em] leading-[1.0] mb-5"
          style={{ fontSize: 'clamp(28px,4.5vw,42px)' }}
        >
          Secure checkout for Merit orders<span className="text-cobalt">.</span>
        </h1>
        <p className="text-base text-ink-soft leading-relaxed mb-4">
          This domain handles payment for orders placed with Merit. Card details are
          encrypted end-to-end by PayPal — they are never seen or stored by us.
        </p>
        <p className="text-base text-ink-soft leading-relaxed mb-8">
          If you were sent here to complete an order, use the link from your email or
          return to your cart and select checkout again. There is nothing to browse
          on this page.
        </p>

        <div className="rounded-2xl border border-cobalt/12 bg-white p-6">
          <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold mb-3">
            — Policies &amp; contact
          </p>
          <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-bold text-cobalt mb-4">
            <a href="/legal/terms" className="hover:underline">Terms of Service</a>
            <a href="/legal/privacy" className="hover:underline">Privacy Policy</a>
            <a href="/legal/returns" className="hover:underline">Refunds &amp; Returns</a>
            <a href="/legal/shipping" className="hover:underline">Shipping</a>
          </nav>
          <p className="text-[13px] text-ink-soft leading-relaxed">
            Questions about an order? Email{' '}
            <a href={`mailto:${email}`} className="text-cobalt font-bold hover:underline">
              {email}
            </a>
            . US shipping only. All prices in USD.
          </p>
        </div>

        <p className="mt-8 text-[12px] text-ink-muted leading-relaxed">
          Products are supplied for laboratory research use only — not for human or
          veterinary use, and not for diagnostic or therapeutic use.
        </p>
      </section>
    </>
  );
}
