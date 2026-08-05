import Link from 'next/link';

/**
 * Chrome for the clinic supply storefront.
 *
 * Separate from PaymentShell — that one is bare because a buyer mid-payment
 * should have nothing to click. This is a catalog and needs navigation. Both
 * sit under the same (pay) root layout, so neither can pull in storefront
 * markup, and nothing here names or links to meritsciences.com.
 *
 * Register is medical-device, not consumer commerce: cool neutrals, hairline
 * rules, square corners, no shadows. Colour appears only on interaction.
 */

export function SupplyHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-8 px-6 py-3.5">
        <Link href="/" className="flex shrink-0 items-baseline gap-2.5">
          <span className="text-[18px] font-bold tracking-[-0.03em] text-ink">Merit</span>
          <span className="hidden border-l border-line pl-2.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-muted sm:inline">
            Clinical
          </span>
        </Link>

        <nav className="flex items-center gap-6 text-[13px] font-medium text-ink-soft">
          <Link href="/shop" className="transition-colors hover:text-ink">
            Catalog
          </Link>
          <Link
            href="/shop?category=COLLAGEN"
            className="hidden transition-colors hover:text-ink md:inline"
          >
            Collagen
          </Link>
          <Link
            href="/shop?category=WOUND_CARE"
            className="hidden transition-colors hover:text-ink md:inline"
          >
            Wound care
          </Link>
          <Link
            href="/checkout"
            className="border border-ink bg-ink px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-white transition-opacity hover:opacity-85"
          >
            Cart
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SupplyFooter() {
  return (
    <footer className="mt-24 border-t border-line bg-white">
      <div className="mx-auto max-w-[1280px] px-6 py-12">
        <div className="flex flex-wrap justify-between gap-8">
          <div>
            <div className="flex items-baseline gap-2.5">
              <span className="text-[15px] font-bold tracking-[-0.03em] text-ink">Merit</span>
              <span className="border-l border-line pl-2.5 text-[9px] font-semibold uppercase tracking-[0.2em] text-ink-muted">
                Clinical
              </span>
            </div>
            <p className="mt-3 max-w-xs text-[12px] leading-relaxed text-ink-muted">
              Advanced wound care and clinical supply, direct to practice.
            </p>
          </div>

          <nav className="flex flex-wrap gap-x-10 gap-y-2 text-[12.5px] text-ink-soft">
            <Link href="/shop" className="transition-colors hover:text-ink">Catalog</Link>
            <Link href="/legal/terms" className="transition-colors hover:text-ink">Terms</Link>
            <Link href="/legal/privacy" className="transition-colors hover:text-ink">Privacy</Link>
            <Link href="/legal/refunds" className="transition-colors hover:text-ink">Returns</Link>
            <Link href="/legal/shipping" className="transition-colors hover:text-ink">Shipping</Link>
            <Link href="/legal/contact" className="transition-colors hover:text-ink">Contact</Link>
          </nav>
        </div>

        <div className="mt-10 border-t border-line-soft pt-6">
          <p className="max-w-3xl text-[11.5px] leading-relaxed text-ink-muted">
            Supplied to licensed clinicians and healthcare facilities. Products are furnished as
            labeled by their manufacturers. HCPCS codes are listed for reference only and are not a
            representation of coverage, medical necessity, or payment — verify against the
            payer&rsquo;s current policy before billing.
          </p>
          <p className="mt-3 text-[11.5px] text-ink-muted">
            US shipping only · All prices in USD
          </p>
        </div>
      </div>
    </footer>
  );
}
