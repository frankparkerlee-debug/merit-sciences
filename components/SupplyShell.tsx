import Link from 'next/link';

/**
 * Chrome for the clinic supply storefront on meritcheckout.com.
 *
 * Separate from PaymentShell: that one is deliberately bare because a buyer
 * mid-payment should have nothing to click. This is a store — it needs
 * navigation. Both live under the same (pay) root layout, so neither can pull
 * in storefront markup.
 *
 * Nothing here names or links to meritsciences.com. The peptide catalog and
 * this catalog share infrastructure, never a surface.
 */

export function SupplyHeader() {
  return (
    <header className="border-b border-ink/10 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-5 py-4">
        <Link href="/" className="shrink-0">
          <span className="text-[19px] font-extrabold tracking-tight text-ink">Merit</span>
          <span className="text-[19px] font-extrabold text-cobalt">.</span>
          <span className="ml-2 hidden text-[11px] font-bold uppercase tracking-[0.18em] text-ink-muted sm:inline">
            Clinical Supply
          </span>
        </Link>

        <nav className="flex items-center gap-5 text-[13px] font-semibold text-ink-soft">
          <Link href="/shop" className="transition hover:text-ink">
            Shop all
          </Link>
          <Link href="/shop?category=COLLAGEN" className="hidden transition hover:text-ink sm:inline">
            Collagen
          </Link>
          <Link href="/shop?category=WOUND_CARE" className="hidden transition hover:text-ink sm:inline">
            Wound care
          </Link>
          <Link
            href="/checkout"
            className="rounded-lg bg-ink px-3.5 py-2 text-[12px] font-bold uppercase tracking-wider text-white transition hover:opacity-90"
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
    <footer className="mt-20 border-t border-ink/10 bg-white">
      <div className="mx-auto max-w-6xl px-5 py-10">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] font-semibold text-ink-soft">
          <Link href="/shop" className="transition hover:text-ink">Shop all</Link>
          <Link href="/legal/terms" className="transition hover:text-ink">Terms</Link>
          <Link href="/legal/privacy" className="transition hover:text-ink">Privacy</Link>
          <Link href="/legal/refunds" className="transition hover:text-ink">Refunds &amp; returns</Link>
          <Link href="/legal/shipping" className="transition hover:text-ink">Shipping</Link>
          <Link href="/legal/contact" className="transition hover:text-ink">Contact</Link>
        </div>
        <p className="mt-4 max-w-2xl text-[12px] leading-relaxed text-ink-muted">
          Medical supplies sold to licensed clinicians and healthcare facilities. Products are
          supplied as labeled by their manufacturers. HCPCS codes are provided for reference only
          and are not a guarantee of coverage or reimbursement — verify against the payer&rsquo;s
          current policy.
        </p>
        <p className="mt-3 text-[12px] text-ink-muted">US shipping only · All prices in USD</p>
      </div>
    </footer>
  );
}
