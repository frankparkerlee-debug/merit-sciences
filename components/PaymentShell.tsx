import Link from 'next/link';
import { checkoutOrigin } from '@/lib/checkout-handoff';

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
  const split = checkoutOrigin() !== null;

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
