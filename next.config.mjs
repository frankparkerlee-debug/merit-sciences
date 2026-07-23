/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow loading product images from anywhere during prototype phase.
  // Tighten this once production image hosting is wired up.
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
    // Required for the Merit-branded placeholder vial SVG fallback used
    // when a product has no imageUrl yet. The SVG is internally authored
    // — not user-supplied — so the loosening of next/image's default
    // SVG block is safe.
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  async headers() {
    return [
      {
        // Apple Pay domain association — Apple/PayPal expect
        // application/json (Next defaults extension-less files to
        // application/octet-stream which fails verification).
        source: '/.well-known/apple-developer-merchantid-domain-association',
        headers: [
          { key: 'Content-Type', value: 'application/json' },
          { key: 'Cache-Control', value: 'public, max-age=300' },
        ],
      },
    ];
  },
  // ── Shopify → merit-render migration 301s ──────────────────────────
  // Google ranks URLs, not domains. Every Shopify URL it had indexed
  // must resolve here, or its ranking equity is lost (the symptom:
  // traffic cliff on the same domain). The Shopify auto-301s died with
  // Shopify, so we re-create them. Old handles recovered from the
  // migration export (aup-phase2-live-handles.json + redirects-import).
  // permanent: true → 308, which Google treats as a 301 for SEO.
  async redirects() {
    // Map built by cross-referencing the old Shopify handles (migration
    // export) against the LIVE catalog. Rule: only redirect an old URL
    // if it does NOT already exist on the new site — handles like
    // tirzepatide-10mg / retatrutide-10mg are live and must NOT move.
    const p = (from, to) => ({ source: `/products/${from}`, destination: `/products/${to}`, permanent: true });
    const gone = (from) => ({ source: `/products/${from}`, destination: '/catalog', permanent: true });
    const lib = (from, to) => ({ source: `/library/${from}`, destination: `/library/${to}`, permanent: true });
    const libIndex = (from) => ({ source: `/library/${from}`, destination: '/library', permanent: true });
    return [
      // ── Renamed / re-handled products (old → its live equivalent) ──
      p('tirzepatide-30mg', 'ly3298176'),      // 30mg now lives at the code handle
      p('tirzepatide', 'tirzepatide-10mg'),    // bare → the live 10mg
      p('retatrutide-30mg', 'ly3437943'),
      p('retatrutide', 'retatrutide-10mg'),
      p('tesamorelin-10mg', 'th9507'),
      p('tesamorelin', 'th9507'),
      p('semaglutide', 'semaglutide-10mg'),
      p('ghk-cu-50mg', 'ghk-cu'),
      p('mots-c-20mg', 'mots-c'),
      p('semax-10mg', 'semax'),
      p('epitalon-100mg', 'epitalon'),
      p('thymosin-alpha-1-10mg', 'thymosin-alpha-1'),
      p('glutathione-600mg', 'glutathione-1500mg'),
      p('glutathione', 'glutathione-1500mg'),
      p('nad-plus', 'nad-500mg'),
      p('nad', 'nad-500mg'),
      p('glow', 'bpc157-ghk-cu-50-tb500-glow-70mg'),
      p('cjc-1295-ipamorelin', 'cjc-1295-w-o-dac-10-ipa-10-20mg'),
      p('cjc-1295-ipamorelin-7-5mg-10mg-injectable-vial', 'cjc-1295-w-o-dac-10-ipa-10-20mg'),
      p('bpc-157-tb-500-10mg-10mg-injectable-vial', 'bpc-157-tb-500'),
      // ── Bacteriostatic-water sizes → the single live listing ──
      p('bacteriostatic-water-3ml', 'bacteriostatic-water'),
      p('bacteriostatic-water-10ml', 'bacteriostatic-water'),
      p('bacteriostatic-water-30ml', 'bacteriostatic-water'),
      // ── Discontinued SKUs (nasal sprays, premixes, supplies, standalone
      //    KPV) — no current equivalent → catalog ──
      gone('kpv'),
      gone('kpv-10mg'),
      gone('ss-31'),
      gone('injection-syringe-kit'),
      gone('bpc-157-30mg-nasal-spray'),
      gone('bpc-157-tb-500-5mg-10mg-nasal-spray'),
      gone('tb-500-30mg-nasal-spray'),
      gone('cjc-1295-10mg-nasal-spray'),
      gone('cjc-1295-ipamorelin-10mg-10mg-nasal-spray'),
      gone('epitalon-thymulin-50mg-10mg-nasal-spray'),
      gone('ghk-cu-kpv-50mg-10mg-nasal-spray'),
      gone('ghk-cu-kpv-skin-premix'),
      gone('nad-plus-cjc-1295-500mg-20mg-nasal-spray'),
      gone('oxytocin-10mg-nasal-spray'),
      gone('oxytocin-pt-141-5mg-10mg-nasal-spray'),
      gone('pt-141-oxytocin-tesamorelin-10mg-3mg-10mg-nasal-spray'),
      gone('retatrutide-semaglutide-25mg-15mg-nasal-spray'),
      gone('semax-selank-15mg-15mg-nasal-spray'),
      gone('semax-selank-day-night-mind'),
      gone('ta-1-kpv-10mg-10mg-nasal-spray'),
      // ── Collections + Shopify pages ──
      { source: '/collections/:slug*', destination: '/catalog', permanent: true },
      { source: '/pages/privacy-policy', destination: '/privacy', permanent: true },
      { source: '/pages/refund-policy', destination: '/returns', permanent: true },
      { source: '/pages/terms-of-service', destination: '/terms', permanent: true },
      { source: '/pages/frequently-asked-questions', destination: '/catalog', permanent: true },
      { source: '/pages/:slug*', destination: '/', permanent: true },

      // ── Retired reconstitution protocols (removed 2026-07-23) ──────────
      // The 16 Protocol articles were unpublished — step-by-step preparation
      // procedures don't belong on a research-use-only catalog. These URLs
      // were indexed, so they 308 to the matching compound monograph (same
      // compound, same search intent, no procedure) rather than 404ing and
      // dumping their ranking equity. The 4 with no monograph go to /library.
      lib('tirzepatide-reconstitution-protocol', 'tirzepatide'),
      lib('ly3437943-reconstitution-protocol', 'retatrutide'),
      lib('tesamorelin-reconstitution-protocol', 'tesamorelin'),
      lib('bpc-157-tb-500-blend-reconstitution-protocol', 'bpc-157-tb-500'),
      lib('bpc-157-reconstitution-protocol', 'bpc-157-tb-500'),
      lib('thymosin-alpha-1-reconstitution-protocol', 'thymosin-alpha-1'),
      lib('nad-reconstitution-protocol', 'nad'),
      lib('ghk-cu-reconstitution-protocol', 'ghk-cu'),
      lib('mots-c-reconstitution-protocol', 'mots-c'),
      lib('epitalon-reconstitution-protocol', 'epitalon'),
      lib('semax-reconstitution-protocol', 'semax'),
      lib('glow-blend-reconstitution-protocol', 'glow-blend'),
      lib('klow-blend-reconstitution-protocol', 'klow-blend'),
      // No monograph for these compounds → library index.
      libIndex('cjc-1295-ipamorelin-reconstitution-protocol'),
      libIndex('glutathione-reconstitution-protocol'),
      libIndex('kpv-reconstitution-protocol'),
    ];
  },
};

export default nextConfig;
