/**
 * LEGACY DOMAIN RECOVERY — meritpeptides.com → meritsciences.com
 *
 * The Shopify-era domain still holds every backlink, citation and AI-index
 * association Merit earned before the rebrand. Until 2026-08-25 it answered
 * HTTP with a blanket 301 to the homepage and did not answer HTTPS at all —
 * so the links that actually exist in the wild (Shopify forced https on
 * every storefront) hit a timeout and transferred nothing.
 *
 * Pointing the domain at Render fixes TLS. This module fixes the other half:
 * a blanket homepage redirect is read as a soft-404 and passes little signal,
 * so each legacy path maps to its real modern equivalent instead.
 *
 * Shape of the old store (Shopify defaults):
 *   /products/<handle>      → the PDP, handles were chemical codes
 *   /collections/<handle>   → catalog (or a filtered view)
 *   /pages/<handle>         → about / policy pages
 *   /blogs/<blog>/<article> → the research library
 *   /cart, /account/*       → live equivalents
 *
 * Edge-runtime safe: pure string work, no imports, no DB.
 */

/** Modern product handles, lowercase, longest-first so the most specific
 *  token match wins (e.g. "semaglutide-20mg" before "semaglutide"). */
const PRODUCT_HANDLES = [
  'bpc157-ghk-cu-50-tb500-kpv-klow-80mg',
  'bpc157-ghk-cu-50-tb500-glow-70mg',
  'bpc-10mg-tb-10mg-wolverine-20mg',
  'cjc-1295-w-o-dac-10-ipa-10-20mg',
  'slu-pp-332-injectable-5mg',
  'tesamorelin-ipamorelin',
  'bacteriostatic-water',
  'thymosin-alpha-1',
  '5-amino-1mq-50mg',
  'glutathione-1500mg',
  'semaglutide-20mg',
  'semaglutide-10mg',
  'retatrutide-10mg',
  'tirzepatide-10mg',
  'tesamorelin-20mg',
  'ipamorelin-10mg',
  'melanotan-ii',
  'bpc-157-10mg',
  'semax-30mg',
  'nad-500mg',
  'igf-1-lr3',
  'sermorelin',
  'ly3437943',
  'ly3298176',
  'aod-9604',
  'epitalon',
  'dsip-5mg',
  'th9507',
  'mots-c',
  'ghk-cu',
  'pt-141',
  'selank',
];

/** Aliases the old store used that no longer match a handle by substring.
 *  Keys are checked against the normalized legacy slug. */
const HANDLE_ALIASES: Record<string, string> = {
  bpc: 'bpc-157-10mg',
  'bpc-157': 'bpc-157-10mg',
  bpc157: 'bpc-157-10mg',
  'tb-500': 'bpc-10mg-tb-10mg-wolverine-20mg',
  tb500: 'bpc-10mg-tb-10mg-wolverine-20mg',
  wolverine: 'bpc-10mg-tb-10mg-wolverine-20mg',
  glow: 'bpc157-ghk-cu-50-tb500-glow-70mg',
  klow: 'bpc157-ghk-cu-50-tb500-kpv-klow-80mg',
  kpv: 'bpc157-ghk-cu-50-tb500-kpv-klow-80mg',
  'ghk-copper': 'ghk-cu',
  ghkcu: 'ghk-cu',
  copper: 'ghk-cu',
  nad: 'nad-500mg',
  'nad-plus': 'nad-500mg',
  'nicotinamide-adenine-dinucleotide': 'nad-500mg',
  semax: 'semax-30mg',
  glutathione: 'glutathione-1500mg',
  ipamorelin: 'ipamorelin-10mg',
  'cjc-1295': 'cjc-1295-w-o-dac-10-ipa-10-20mg',
  cjc: 'cjc-1295-w-o-dac-10-ipa-10-20mg',
  'cjc-ipamorelin': 'cjc-1295-w-o-dac-10-ipa-10-20mg',
  tesamorelin: 'tesamorelin-20mg',
  'tesamorelin-10mg': 'th9507',
  tirzepatide: 'tirzepatide-10mg',
  retatrutide: 'retatrutide-10mg',
  reta: 'retatrutide-10mg',
  semaglutide: 'semaglutide-10mg',
  sema: 'semaglutide-10mg',
  'melanotan-2': 'melanotan-ii',
  'melanotan-ii': 'melanotan-ii',
  mt2: 'melanotan-ii',
  'mt-2': 'melanotan-ii',
  'igf-1': 'igf-1-lr3',
  igf: 'igf-1-lr3',
  'thymosin-alpha': 'thymosin-alpha-1',
  ta1: 'thymosin-alpha-1',
  'amino-1mq': '5-amino-1mq-50mg',
  '5-amino-1mq': '5-amino-1mq-50mg',
  'slu-pp-332': 'slu-pp-332-injectable-5mg',
  dsip: 'dsip-5mg',
  'bac-water': 'bacteriostatic-water',
  'bacteriostatic-water': 'bacteriostatic-water',
  water: 'bacteriostatic-water',
};

/** Legacy /pages/<slug> → modern path. */
const PAGE_MAP: Record<string, string> = {
  about: '/about',
  'about-us': '/about',
  contact: '/about',
  'contact-us': '/about',
  faq: '/about',
  faqs: '/about',
  shipping: '/shipping',
  'shipping-policy': '/shipping',
  returns: '/returns',
  'refund-policy': '/returns',
  'return-policy': '/returns',
  privacy: '/privacy',
  'privacy-policy': '/privacy',
  terms: '/terms',
  'terms-of-service': '/terms',
  'terms-and-conditions': '/terms',
  coa: '/coa',
  coas: '/coa',
  'certificates-of-analysis': '/coa',
  'lab-results': '/coa',
  'lab-testing': '/coa',
  testing: '/coa',
  research: '/library',
  library: '/library',
  wholesale: '/practitioners',
  practitioners: '/practitioners',
  clinics: '/practitioners',
  'for-clinics': '/practitioners',
  affiliate: '/affiliate',
  affiliates: '/affiliate',
  'research-disclosure': '/research-disclosure',
  disclaimer: '/research-disclosure',
};

function normalizeSlug(raw: string): string {
  return decodeURIComponent(raw).toLowerCase().replace(/\.(html?|php)$/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/** Best modern product handle for a legacy product slug, or null. */
function matchProduct(slug: string): string | null {
  const s = normalizeSlug(slug);
  if (!s) return null;
  if (HANDLE_ALIASES[s]) return HANDLE_ALIASES[s];
  // Exact, then containment either direction (longest handle wins because the
  // list is ordered longest-first).
  for (const h of PRODUCT_HANDLES) if (h === s) return h;
  for (const h of PRODUCT_HANDLES) if (s.includes(h) || h.includes(s)) return h;
  // Alias containment — catches "buy-bpc-157-5mg-vial" style legacy slugs.
  for (const [alias, handle] of Object.entries(HANDLE_ALIASES)) {
    if (s.includes(alias)) return handle;
  }
  return null;
}

/**
 * Map a legacy meritpeptides.com path to its modern equivalent.
 * Always returns a path (worst case '/'), so every legacy URL 301s to
 * something real rather than dead-ending.
 */
export function legacyPathTarget(pathname: string): string {
  const path = pathname.replace(/\/+$/, '') || '/';
  if (path === '/') return '/';

  const seg = path.split('/').filter(Boolean);
  const [first, second, third] = seg;

  switch (first) {
    case 'products': {
      const handle = second ? matchProduct(second) : null;
      return handle ? `/products/${handle}` : '/catalog';
    }
    case 'collections': {
      // /collections/<c>/products/<handle> — the product wins.
      if (third === undefined && second) {
        const handle = matchProduct(second);
        if (handle) return `/products/${handle}`;
        return '/catalog';
      }
      if (seg[2] === 'products' && seg[3]) {
        const handle = matchProduct(seg[3]);
        if (handle) return `/products/${handle}`;
      }
      return '/catalog';
    }
    case 'pages': {
      const s = second ? normalizeSlug(second) : '';
      return PAGE_MAP[s] ?? '/about';
    }
    case 'blogs':
    case 'blog':
      return '/library';
    case 'cart':
      return '/cart';
    case 'account':
    case 'apps':
      return '/';
    case 'search':
      return '/catalog';
    case 'coa':
    case 'library':
    case 'catalog':
    case 'about':
    case 'practitioners':
      // Paths that already exist on the modern site — carry them straight over.
      return path;
    default: {
      // A bare product-ish slug at the root (some Shopify themes did this).
      const handle = matchProduct(first ?? '');
      return handle ? `/products/${handle}` : '/';
    }
  }
}
