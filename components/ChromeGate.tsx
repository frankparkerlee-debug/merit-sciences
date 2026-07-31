'use client';

import { usePathname } from 'next/navigation';

/**
 * Hides global site chrome (Nav, Footer, cart drawer, subscribe popup) on
 * "clean-room" landing routes that are used as PAID-AD destinations.
 *
 * Why: Meta/TikTok crawl the ad's destination URL. Those pages must expose
 * NO catalog links, product/compound names, prices, or shop navigation — or
 * the ad is rejected and the (burner) ad account risks a drug-policy strike.
 * Stripping Nav/Footer here removes the catalog links a crawler would follow.
 *
 * The global "Research Use Only" banner and <main> stay (they live outside
 * this gate in the root layout). Keep BARE_PREFIXES tight — only true ad LPs.
 */
// Payment surfaces get no storefront chrome ON ANY DOMAIN. Two reasons:
//   1. On the split checkout domain, Nav/Footer would put live /catalog links
//      on the payment host — the one association it exists to remove.
//   2. On the storefront it's simply better checkout UX: fewer exits from the
//      page where the buyer is deciding to pay.
//
// Deliberately path-based (client) rather than host-based (server): reading
// the request host requires headers() in the ROOT layout, which forces dynamic
// rendering across the whole app and breaks the 36 statically-exported
// /library pages that declare `dynamic = 'error'`. Payment pages are
// force-dynamic and read the host directly where they need it.
const BARE_PREFIXES = ['/access', '/lp', '/checkout', '/pay', '/reorder'];

export function ChromeGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '';
  const isBare = BARE_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + '/'),
  );
  if (isBare) return null;
  return <>{children}</>;
}
