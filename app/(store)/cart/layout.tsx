import type { Metadata } from 'next';

/**
 * The cart page itself is a client component ('use client'), and Next.js
 * cannot read a `metadata` export from one — attempting it throws at
 * request time. Route metadata therefore lives here, in a server layout
 * wrapping it.
 *
 * Transactional surface: no SEO value, and it reflects a visitor's own
 * basket, so it stays out of the index. robots.ts also disallows /cart —
 * this is the page-level belt to that suspenders.
 */
export const metadata: Metadata = {
  title: 'Your cart',
  robots: { index: false, follow: false, nocache: true },
};

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
