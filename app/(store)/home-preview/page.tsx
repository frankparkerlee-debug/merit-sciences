/**
 * TEMPORARY preview route — /home-preview
 *
 * Renders the REAL HomeView against a snapshot of REAL production data
 * (the four featured products' live prices, and lot LOT2026-06-0001's
 * published certificate values). It exists only because .env.local's
 * Postgres credentials are stale, so the DB-backed sections of / render
 * empty locally and the full page can't be reviewed before deploying.
 *
 * Because HomeView is the actual homepage component, approving this page
 * IS approving the homepage — the only difference is where the data
 * comes from.
 *
 * This is a fixture, not a feature. noindex, and delete it once the local
 * database connection is restored.
 */
import { HomeView, type HomeFeatured, type HomeLot } from '../HomeView';

export const metadata = { title: 'Homepage preview', robots: { index: false, follow: false } };

// Live production values, captured from the catalog + the published ILS
// certificate (public/coa/reports/merit-coa-retatrutide-10mg-lot2026-06-0001.pdf).
const FEATURED: HomeFeatured[] = [
  {
    handle: 'retatrutide-10mg',
    title: 'Retatrutide',
    vialSize: '10 mg',
    format: 'lyophilized',
    priceCents: 9999,
    imageUrl: null,
  },
  {
    handle: 'bpc-10mg-tb-10mg-wolverine-20mg',
    title: 'BPC 10mg + TB 10mg (Wolverine)',
    vialSize: '20 mg',
    format: 'lyophilized',
    priceCents: 9999,
    imageUrl: null,
  },
  {
    handle: 'bpc157-ghk-cu-50-tb500-kpv-klow-80mg',
    title: 'BPC157 + GHK-CU 50 + TB500 + KPV (Klow)',
    vialSize: '80 mg',
    format: 'lyophilized',
    priceCents: 17499,
    imageUrl: null,
  },
  {
    handle: 'tirzepatide-10mg',
    title: 'Tirzepatide',
    vialSize: '10 mg',
    format: 'lyophilized',
    priceCents: 7499,
    imageUrl: null,
  },
];

const LOT_SNAPSHOT: HomeLot = {
  lotId: 'LOT2026-06-0001',
  coaNumber: 'COA-2026-49Y4L7',
  purity: '99.13%',
  compound: 'Retatrutide - 10mg',
  testedDate: '07/30/2026',
};

export default function HomePreviewPage() {
  return <HomeView featured={FEATURED} allCount={29} lot={LOT_SNAPSHOT} lotCount={14} />;
}
