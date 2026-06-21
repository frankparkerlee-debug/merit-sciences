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
    const product = (from, to) => ({
      source: `/products/${from}`,
      destination: `/products/${to}`,
      permanent: true,
    });
    return [
      // Metabolic money pages: real-name handles → chemical-code handles.
      // Both legacy size variants point at the live compound page (its
      // size selector covers the rest).
      product('tirzepatide', 'ly3298176'),
      product('tirzepatide-10mg', 'ly3298176'),
      product('tirzepatide-30mg', 'ly3298176'),
      product('retatrutide', 'ly3437943'),
      product('retatrutide-10mg', 'ly3437943'),
      product('retatrutide-30mg', 'ly3437943'),
      product('tesamorelin', 'th9507'),
      product('tesamorelin-10mg', 'th9507'),
      // Strength-suffix dropped on the new site.
      product('ghk-cu-50mg', 'ghk-cu'),
      product('mots-c-20mg', 'mots-c'),
      product('semax-10mg', 'semax'),
      product('epitalon-100mg', 'epitalon'),
      product('thymosin-alpha-1-10mg', 'thymosin-alpha-1'),
      // Collections (a Shopify store's biggest organic surface) → catalog.
      { source: '/collections/:slug*', destination: '/catalog', permanent: true },
      // Shopify policy / info pages → their merit-render equivalents.
      { source: '/pages/privacy-policy', destination: '/privacy', permanent: true },
      { source: '/pages/refund-policy', destination: '/returns', permanent: true },
      { source: '/pages/terms-of-service', destination: '/terms', permanent: true },
      { source: '/pages/frequently-asked-questions', destination: '/catalog', permanent: true },
      // Any other legacy Shopify page.
      { source: '/pages/:slug*', destination: '/', permanent: true },
    ];
  },
};

export default nextConfig;
