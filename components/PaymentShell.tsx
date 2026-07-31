import Link from 'next/link';
import { headers } from 'next/headers';
import { isCheckoutHostname } from '@/lib/checkout-domain';

/**
 * Header for payment surfaces (/checkout, /pay, /checkout/success).
 *
 * Merchant-of-record presentation: a bare "Merit." wordmark and a
 * secure-payment cue. No navigation, no catalog, no marketing — on the split
 * checkout domain there is no outbound path back to the storefront at all.
 *
 * It exists as ONE component on purpose. The alternative was a `splitCheckout`
 * conditional in every payment page, which meant any future edit to any of them
 * could silently reintroduce a link home. Centralising it puts the rule in a
 * single place, and new payment pages inherit it for free.
 *
 * Same-origin (CHECKOUT_ORIGIN unset) keeps the wordmark clickable, so nothing
 * changes for the current single-domain store.
 */
export function PaymentShellHeader() {
  // Host-aware: suppress the link only when this request is actually being
  // served on the checkout domain, so the storefront is never affected.
  const split = isCheckoutHostname(headers().get('host'));

  const wordmark = (
    <span className="font-display font-black text-ink text-lg tracking-[-0.02em]">
      Merit<span className="text-cobalt">.</span>
    </span>
  );

  return (
    <header className="border-b border-cobalt/10 bg-white">
      <div className="max-w-[1100px] mx-auto px-5 sm:px-6 lg:px-8 py-5 flex items-center justify-between gap-4">
        {/* Plain text on the split domain — a live link here would be exactly
            the association the separate checkout domain exists to remove. */}
        {split ? wordmark : <Link href="/">{wordmark}</Link>}

        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-ink-soft">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          Secure payment
        </span>
      </div>
    </header>
  );
}

/**
 * Policy + contact footer for payment surfaces.
 *
 * Card network rules require the checkout page to make refunds/returns,
 * privacy, terms and delivery policies reachable, plus a contact method.
 * Before this, the payment domain carried NO links at all — "Terms" was plain
 * text and every policy path 404'd. That's a straightforward compliance gap a
 * reviewer would catch immediately.
 *
 * Links point at /legal/* ON THIS DOMAIN, so nothing leads back to the store.
 */
export function PaymentShellFooter() {
  const email =
    process.env.CHECKOUT_SUPPORT_EMAIL?.trim() ||
    process.env.SUPPORT_EMAIL?.trim() ||
    'rx@meritsciences.com';

  return (
    <footer className="max-w-[1100px] mx-auto px-5 sm:px-6 lg:px-8 mt-12 pt-6 border-t border-cobalt/10">
      <nav className="flex flex-wrap gap-x-5 gap-y-2 text-[12px] text-ink-soft mb-3">
        <a href="/legal/terms" className="hover:text-ink">Terms of Service</a>
        <a href="/legal/privacy" className="hover:text-ink">Privacy Policy</a>
        <a href="/legal/returns" className="hover:text-ink">Refunds &amp; Returns</a>
        <a href="/legal/shipping" className="hover:text-ink">Shipping</a>
        <a href={`mailto:${email}`} className="hover:text-ink">Contact</a>
      </nav>
      <p className="text-[11px] text-ink-muted leading-relaxed pb-10">
        US shipping only · All prices in USD · Card details are encrypted end-to-end by
        PayPal and never seen or stored by us.
      </p>
    </footer>
  );
}
