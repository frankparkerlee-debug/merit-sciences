/**
 * TEMPORARY preview route — /catalog-preview
 *
 * Renders the REAL CatalogClient against a snapshot of REAL production
 * product data (handles, titles, vial sizes, prices captured from the live
 * catalog). It exists only because .env.local's Postgres credentials are
 * stale, so /catalog renders empty locally and the populated grid — derived
 * filter chips, per-mg badges, family grouping — can't be reviewed before
 * deploying.
 *
 * This is a fixture, not a feature. noindex, and delete it once the local
 * database connection is restored.
 */
import { CatalogClient } from '../catalog/CatalogClient';
import { familyByCompound, familySortRank } from '@/lib/catalog-meta';
import type { Product } from '@/lib/product-types';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Catalog preview', robots: { index: false, follow: false } };

const SNAPSHOT = [
  {
    "handle": "nad-500mg",
    "title": "NAD+",
    "compound": "NAD+",
    "vialSize": "500 mg",
    "format": "lyophilized",
    "priceCents": 8499,
    "imageUrl": null
  },
  {
    "handle": "mots-c",
    "title": "MOTS-c",
    "compound": "MOTS-c",
    "vialSize": "40 mg",
    "format": "lyophilized",
    "priceCents": 13799,
    "imageUrl": null
  },
  {
    "handle": "ghk-cu",
    "title": "GHK-Cu",
    "compound": "GHK-Cu",
    "vialSize": "100 mg",
    "format": "lyophilized",
    "priceCents": 8599,
    "imageUrl": null
  },
  {
    "handle": "sermorelin",
    "title": "Sermorelin Acetate",
    "compound": "Sermorelin Acetate",
    "vialSize": "10 mg",
    "format": "lyophilized",
    "priceCents": 6900,
    "imageUrl": null
  },
  {
    "handle": "igf-1-lr3",
    "title": "IGF-1 LR3",
    "compound": "IGF-1 LR3",
    "vialSize": "1 mg",
    "format": "lyophilized",
    "priceCents": 9199,
    "imageUrl": null
  },
  {
    "handle": "5-amino-1mq-50mg",
    "title": "5-Amino-1MQ",
    "compound": "5-Amino-1MQ",
    "vialSize": "50 mg",
    "format": "lyophilized",
    "priceCents": 6499,
    "imageUrl": null
  },
  {
    "handle": "aod-9604",
    "title": "AOD-9604",
    "compound": "AOD-9604",
    "vialSize": "5 mg",
    "format": "lyophilized",
    "priceCents": 8599,
    "imageUrl": null
  },
  {
    "handle": "retatrutide-10mg",
    "title": "Retatrutide",
    "compound": "Retatrutide",
    "vialSize": "10 mg",
    "format": "lyophilized",
    "priceCents": 9999,
    "imageUrl": null
  },
  {
    "handle": "ly3437943",
    "title": "Retatrutide",
    "compound": "Retatrutide",
    "vialSize": "30 mg",
    "format": "lyophilized",
    "priceCents": 16999,
    "imageUrl": null
  },
  {
    "handle": "semaglutide-10mg",
    "title": "Semaglutide",
    "compound": "Semaglutide",
    "vialSize": "10 mg",
    "format": "lyophilized",
    "priceCents": 6499,
    "imageUrl": null
  },
  {
    "handle": "semaglutide-20mg",
    "title": "Semaglutide",
    "compound": "Semaglutide",
    "vialSize": "20 mg",
    "format": "lyophilized",
    "priceCents": 9999,
    "imageUrl": null
  },
  {
    "handle": "th9507",
    "title": "Tesamorelin",
    "compound": "Tesamorelin",
    "vialSize": "10 mg",
    "format": "lyophilized",
    "priceCents": 8699,
    "imageUrl": null
  },
  {
    "handle": "tesamorelin-20mg",
    "title": "Tesamorelin",
    "compound": "Tesamorelin",
    "vialSize": "20 mg",
    "format": "lyophilized",
    "priceCents": 14999,
    "imageUrl": null
  },
  {
    "handle": "tirzepatide-10mg",
    "title": "Tirzepatide",
    "compound": "Tirzepatide",
    "vialSize": "10 mg",
    "format": "lyophilized",
    "priceCents": 7499,
    "imageUrl": null
  },
  {
    "handle": "ly3298176",
    "title": "Tirzepatide",
    "compound": "Tirzepatide",
    "vialSize": "30 mg",
    "format": "lyophilized",
    "priceCents": 14999,
    "imageUrl": null
  },
  {
    "handle": "bpc-10mg-tb-10mg-wolverine-20mg",
    "title": "BPC 10mg + TB 10mg (Wolverine)",
    "compound": "BPC 10mg + TB 10mg (Wolverine)",
    "vialSize": "20 mg",
    "format": "lyophilized",
    "priceCents": 9999,
    "imageUrl": null
  },
  {
    "handle": "bpc-157-10mg",
    "title": "BPC-157",
    "compound": "BPC-157",
    "vialSize": "10 mg",
    "format": "lyophilized",
    "priceCents": 6099,
    "imageUrl": null
  },
  {
    "handle": "bpc157-ghk-cu-50-tb500-glow-70mg",
    "title": "BPC157 + GHK-CU 50 + TB500 (Glow)",
    "compound": "BPC157 + GHK-CU 50 + TB500 (Glow)",
    "vialSize": "70 mg",
    "format": "lyophilized",
    "priceCents": 14499,
    "imageUrl": null
  },
  {
    "handle": "bpc157-ghk-cu-50-tb500-kpv-klow-80mg",
    "title": "BPC157 + GHK-CU 50 + TB500 + KPV (Klow)",
    "compound": "BPC157 + GHK-CU 50 + TB500 + KPV (Klow)",
    "vialSize": "80 mg",
    "format": "lyophilized",
    "priceCents": 17499,
    "imageUrl": null
  },
  {
    "handle": "cjc-1295-w-o-dac-10-ipa-10-20mg",
    "title": "CJC-1295 w/o DAC 10 + IPA 10",
    "compound": "CJC-1295 w/o DAC 10 + IPA 10",
    "vialSize": "20 mg",
    "format": "lyophilized",
    "priceCents": 7999,
    "imageUrl": null
  },
  {
    "handle": "ipamorelin-10mg",
    "title": "Ipamorelin",
    "compound": "Ipamorelin",
    "vialSize": "10 mg",
    "format": "lyophilized",
    "priceCents": 5999,
    "imageUrl": null
  },
  {
    "handle": "thymosin-alpha-1",
    "title": "Thymosin Alpha-1",
    "compound": "Thymosin Alpha-1",
    "vialSize": "10 mg",
    "format": "lyophilized",
    "priceCents": 13199,
    "imageUrl": null
  },
  {
    "handle": "epitalon",
    "title": "Epitalon",
    "compound": "Epitalon",
    "vialSize": "50 mg",
    "format": "lyophilized",
    "priceCents": 11499,
    "imageUrl": null
  },
  {
    "handle": "glutathione-1500mg",
    "title": "Glutathione",
    "compound": "Glutathione",
    "vialSize": "1500 mg",
    "format": "lyophilized",
    "priceCents": 8499,
    "imageUrl": null
  },
  {
    "handle": "dsip-5mg",
    "title": "DSIP",
    "compound": "DSIP",
    "vialSize": "5 mg",
    "format": "lyophilized",
    "priceCents": 3999,
    "imageUrl": null
  },
  {
    "handle": "melanotan-ii",
    "title": "MT-II",
    "compound": "Melanotan II",
    "vialSize": "10 mg",
    "format": "lyophilized",
    "priceCents": 5799,
    "imageUrl": null
  },
  {
    "handle": "pt-141",
    "title": "PT-141",
    "compound": "PT-141",
    "vialSize": "10 mg",
    "format": "lyophilized",
    "priceCents": 31668,
    "imageUrl": null
  },
  {
    "handle": "selank",
    "title": "Selank",
    "compound": "Selank",
    "vialSize": "10 mg",
    "format": "lyophilized",
    "priceCents": 5599,
    "imageUrl": null
  },
  {
    "handle": "semax-30mg",
    "title": "Semax",
    "compound": "Semax",
    "vialSize": "30 mg",
    "format": "lyophilized",
    "priceCents": 11102,
    "imageUrl": null
  }
] as const;

function centsPerMg(p: Product): number | null {
  const m = /([\d.]+)\s*mg/i.exec(p.vialSize);
  if (!m) return null;
  const mg = parseFloat(m[1]);
  if (!isFinite(mg) || mg <= 0) return null;
  return p.priceCents / mg;
}

export default function CatalogPreviewPage() {
  const products = SNAPSHOT.map((r) => ({
    ...r,
    status: 'active',
    channel: 'rua',
    segment: 'research',
    bundles: [],
    spec: {},
    lot: { id: '', purity: '', testedDate: '', bud: '' },
  })) as unknown as Product[];

  const enriched = products
    .map((p) => ({
      product: p,
      family: familyByCompound(p.compound),
      pharmacistNote: null,
      restock: null,
      centsPerMg: centsPerMg(p),
    }))
    .sort((a, b) => {
      const d = familySortRank(a.family) - familySortRank(b.family);
      return d !== 0 ? d : a.product.compound.localeCompare(b.product.compound);
    });

  return (
    <CatalogClient
      products={enriched}
      stacks={[]}
      accessories={[]}
      totalCount={enriched.length}
    />
  );
}
