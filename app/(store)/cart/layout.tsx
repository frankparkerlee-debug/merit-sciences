import type { Metadata } from 'next';

/* Transactional surface — no SEO value and it exposes a user's own basket,
   so it stays out of the index entirely (robots.ts disallows /cart too;
   this is the page-level belt to that suspenders).

   This lives in the layout rather than the page because page.tsx is a
   client component, and Next disallows exporting `metadata` from one. It
   had been exported there anyway: invalid, silently doing nothing, and it
   only surfaced as a build error once an unrelated module grew enough to
   change how the route was compiled. The robots directive below is the
   first time this route has actually carried one. */
export const metadata: Metadata = {
  title: 'Your cart',
  robots: { index: false, follow: false, nocache: true },
};

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return children;
}
