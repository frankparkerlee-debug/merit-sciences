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
const BARE_PREFIXES = ['/access', '/lp'];

export function ChromeGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '';
  const isBare = BARE_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + '/'),
  );
  if (isBare) return null;
  return <>{children}</>;
}
