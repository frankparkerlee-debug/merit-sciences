'use client';

import { useSearchParams } from 'next/navigation';
import { ADS_VIEW_PARAM } from '@/lib/ads-restricted';

/**
 * The footer's "Popular research" links, hidden on the paid-traffic view.
 *
 * These exist to push crawl equity site-wide into the highest-intent monograph
 * pages, which is worth doing on every indexed page. `/catalog?ads=1` is
 * noindex, so they earn nothing there, and five of the nine label themselves
 * with prescription drug names (Tirzepatide, Retatrutide, Semaglutide,
 * Tesamorelin, PT-141). That put those words on the exact page paid ads point
 * at, which is the one place the whole ads view exists to keep clean.
 *
 * Dropping the nav wholesale beats curating a shorter list: nothing to keep in
 * sync, and no judgement call about which compound names are acceptable on a
 * page a policy reviewer is reading.
 */

const LINKS = [
  ['Tirzepatide', 'tirzepatide'], ['Retatrutide', 'retatrutide'], ['Semaglutide', 'semaglutide'],
  ['Tesamorelin', 'tesamorelin'], ['BPC-157 + TB-500', 'bpc-157-tb-500'], ['GHK-Cu', 'ghk-cu'],
  ['NAD+', 'nad'], ['MOTS-c', 'mots-c'], ['PT-141', 'pt-141'],
] as const;

export function FooterResearchNav() {
  const params = useSearchParams();
  if (params?.get(ADS_VIEW_PARAM) === '1') return null;

  return (
    <nav
      className="max-w-container mx-auto mt-6 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px]"
      aria-label="Popular research"
    >
      <span className="text-white/40 font-bold uppercase tracking-[0.16em]">Research</span>
      {LINKS.map(([label, slug]) => (
        <a key={slug} href={`/library/${slug}`} className="text-white/50 hover:text-white transition">
          {label}
        </a>
      ))}
    </nav>
  );
}
