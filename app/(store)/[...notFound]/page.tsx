import { notFound } from 'next/navigation';

/**
 * Catch-all for URLs no route matches.
 *
 * This app has two root layouts, (store) and (pay), and no app/layout.tsx.
 * Next 14 only renders app/not-found.tsx for UNMATCHED URLs, and that file
 * requires a root layout, so unmatched paths fell through to Next's blank
 * default. Routing them here and calling notFound() renders
 * app/(store)/not-found.tsx inside the store layout instead.
 *
 * Every specific route in either group still wins over a catch-all, and the
 * checkout host never gets this far: middleware dead-ends its unknown paths.
 */
// Without its own metadata, the store layout's default title and
// index, follow take over once the page hydrates.
export const metadata = {
  title: 'Page not found',
  robots: { index: false, follow: true },
};

export default function CatchAll() {
  notFound();
}
