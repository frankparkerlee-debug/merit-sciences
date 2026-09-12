/**
 * Shipping-info line above the Add to Cart button.
 *
 * Static and date-free by design. The previous version computed a specific
 * "arrives by <date>" promise (ship-day + transit-day math) and an
 * Amazon-style countdown — a concrete delivery-date promise on every PDP,
 * which breaks the standing rule against promising delivery dates. Replaced
 * with the same neutral shipping line the checkout success page already
 * uses ("ships within 48 hours from our facility in San Antonio"), so the
 * claim is consistent pre- and post-purchase and makes no date commitment.
 *
 * No client-side date math needed any more, so this can render on the
 * server — no hydration placeholder, no layout shift, smaller bundle.
 */
export function DeliveryPromise() {
  return (
    <div className="bg-cobalt/5 border border-cobalt/15 rounded-xl px-3.5 py-2.5 flex items-start gap-2.5">
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        className="text-cobalt flex-shrink-0 mt-0.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="1" y="3" width="15" height="13" />
        <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
        <circle cx="5.5" cy="18.5" r="2.5" />
        <circle cx="18.5" cy="18.5" r="2.5" />
      </svg>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-bold text-ink leading-snug">
          Ships within 48 hours from San Antonio
        </p>
        <p className="text-[10.5px] text-ink-soft mt-0.5">
          UPS Ground · tracked + insured · released after independent lab testing
        </p>
      </div>
    </div>
  );
}
