export function Footer() {
  return (
    <footer className="bg-steel text-white/65 px-6 sm:px-8 pt-10 pb-7 text-xs">
      <div className="max-w-container mx-auto grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-8 pb-8 border-b border-white/10">
        {/* Brand */}
        <div className="col-span-2 sm:col-span-1">
          <div className="font-display text-xl font-bold tracking-tight text-white">
            Merit<span className="text-cobalt-soft">.</span>
          </div>
          <p className="mt-2 text-[11px] text-white/45 leading-relaxed max-w-[200px]">
            Research-grade compounds from an ISO-certified US facility in Dallas.
          </p>
          <a
            href="mailto:rx@meritsciences.com"
            className="inline-block mt-3 text-[11px] text-cobalt-soft hover:text-white transition"
          >
            rx@meritsciences.com
          </a>
        </div>

        {/* Shop */}
        <div>
          <p className="text-[10px] tracking-[0.22em] uppercase text-white/40 font-bold mb-3">Shop</p>
          <ul className="space-y-2">
            <li><a href="/catalog" className="hover:text-white transition">Catalog</a></li>
            <li><a href="/catalog#stacks" className="hover:text-white transition">Stacks</a></li>
            <li><a href="/library" className="hover:text-white transition">Research Library</a></li>
            <li><a href="/coa" className="hover:text-white transition">Certificates of Analysis</a></li>
            <li><a href="/about" className="hover:text-white transition">About</a></li>
            <li><a href="/practitioners" className="hover:text-white transition">Practitioner Program</a></li>
            <li><a href="/affiliate" className="hover:text-white transition">Affiliate Program</a></li>
          </ul>
        </div>

        {/* Policies */}
        <div>
          <p className="text-[10px] tracking-[0.22em] uppercase text-white/40 font-bold mb-3">Policies</p>
          <ul className="space-y-2">
            <li><a href="/shipping" className="hover:text-white transition">Shipping</a></li>
            <li><a href="/returns" className="hover:text-white transition">Returns</a></li>
            <li><a href="/terms" className="hover:text-white transition">Terms of Service</a></li>
            <li><a href="/privacy" className="hover:text-white transition">Privacy</a></li>
          </ul>
        </div>

        {/* Compliance */}
        <div>
          <p className="text-[10px] tracking-[0.22em] uppercase text-white/40 font-bold mb-3">Compliance</p>
          <ul className="space-y-2">
            <li>
              <a href="/research-disclosure" className="hover:text-white transition font-semibold text-white/85">
                Research Disclosure
              </a>
            </li>
            <li className="text-[11px] text-white/45 leading-snug">
              For Research Use Only · Not for human or veterinary use
            </li>
          </ul>
        </div>
      </div>

      {/* Popular research — deep internal links to the top compound monographs,
          site-wide crawl equity straight to the highest-intent SEO pages. */}
      <nav className="max-w-container mx-auto mt-6 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px]" aria-label="Popular research">
        <span className="text-white/40 font-bold uppercase tracking-[0.16em]">Research</span>
        {([
          ['Tirzepatide', 'tirzepatide'], ['Retatrutide', 'retatrutide'], ['Semaglutide', 'semaglutide'],
          ['Tesamorelin', 'tesamorelin'], ['BPC-157 + TB-500', 'bpc-157-tb-500'], ['GHK-Cu', 'ghk-cu'],
          ['NAD+', 'nad'], ['MOTS-c', 'mots-c'], ['PT-141', 'pt-141'],
        ] as const).map(([label, slug]) => (
          <a key={slug} href={`/library/${slug}`} className="text-white/50 hover:text-white transition">{label}</a>
        ))}
      </nav>

      {/* RUO + copyright */}
      <p className="max-w-container mx-auto mt-6 text-[10.5px] leading-relaxed text-white/45">
        All Merit Sciences products are sold strictly for laboratory and
        scientific research use only. Products have not been evaluated
        by the FDA and are not intended to diagnose, treat, cure, or
        prevent any disease. By purchasing, you confirm that you are a
        qualified researcher 21+ purchasing for in-vitro research,
        laboratory analysis, or other lawful scientific use.
      </p>
      <p className="max-w-container mx-auto mt-3 text-[10.5px] text-white/40">
        © {new Date().getFullYear()} Merit Sciences LLC · Dallas, TX
      </p>
    </footer>
  );
}
