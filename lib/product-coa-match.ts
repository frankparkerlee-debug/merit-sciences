import {
  certificatePath,
  classifyCoas,
  compoundKey,
  countLots,
  type BatchGroup,
  type BatchRow,
} from './coa-batch';

/**
 * The current certificate for a product, so a PDP or monograph can link the
 * certificate page itself instead of a search.
 *
 * Uses the same cached read and the same batch classifier as /coa, the
 * sitemap and llms.txt, so "current" here always agrees with what /coa
 * shows. Matching, in order:
 *   1. a certificate whose productHandle is this product;
 *   2. a certificate whose normalized compound name and size equal the
 *      product's (COA_NAME_FOR_HANDLE overrides the product's own compound
 *      string where the certificate names the material differently).
 * No match returns null, and the caller falls back to /coa?q=<search term>.
 */

/** Certificate name for products whose catalog compound string differs from
 *  how the lab names the material on the certificate. */
const COA_NAME_FOR_HANDLE: Record<string, string> = {
  'cjc-1295-w-o-dac-10-ipa-10-20mg': 'CJC-1295 / Ipamorelin 20mg',
  'tesamorelin-ipamorelin': 'Tesamorelin / Ipamorelin',
  'melanotan-ii': 'Melanotan II 10mg',
};

/** Search term for /coa?q= when no current certificate is matched. The
 *  product titles "MT-II" and "CJC-1295 w/o DAC 10 + IPA 10" match nothing in
 *  the certificate index, which names them differently. */
const COA_SEARCH_FOR_HANDLE: Record<string, string> = {
  'melanotan-ii': 'Melanotan II',
  'cjc-1295-w-o-dac-10-ipa-10-20mg': 'CJC-1295 / Ipamorelin',
  'tesamorelin-ipamorelin': 'Tesamorelin / Ipamorelin',
};

export function coaSearchTerm(p: { handle: string; title: string }): string {
  return COA_SEARCH_FOR_HANDLE[p.handle] ?? p.title;
}

export type CurrentCertificate = {
  /** /coa/<ref> */
  path: string;
  /** "July 2026 batch" */
  batchLabel: string;
  purity: string | null;
};

export type CertRow = BatchRow & { purity?: string | null };
export type ProductLike = { handle: string; title: string; compound: string; vialSize: string };

function rowMatches(r: CertRow, base: string, size: string | null): boolean {
  const k = compoundKey(r.compound);
  if (k.base !== base) return false;
  return size === null ? true : k.size === size;
}

function findGroup(groups: BatchGroup<CertRow>[], p: ProductLike): BatchGroup<CertRow> | null {
  const live = groups.filter((g) => g.current.length > 0);
  const all = (g: BatchGroup<CertRow>) => [...g.current, ...g.archived, ...g.retired];

  const byHandle = live.find((g) => all(g).some((r) => r.productHandle === p.handle));
  if (byHandle) return byHandle;

  const name = COA_NAME_FOR_HANDLE[p.handle] ?? `${p.compound} ${p.vialSize}`;
  const { base, size } = compoundKey(name);
  if (!base) return null;
  // Exact name and size first; a sizeless target matches the base alone.
  return (
    live.find((g) => all(g).some((r) => rowMatches(r, base, size))) ??
    (size ? null : live.find((g) => all(g).some((r) => compoundKey(r.compound).base === base)) ?? null)
  );
}

/** Current certificate per product handle, from already-loaded certificate
 *  records. Pure: shared by lib/product-coa (server) and scripts. */
export function matchCurrentCertificates(
  records: CertRow[],
  products: ProductLike[],
): Map<string, CurrentCertificate> {
  const out = new Map<string, CurrentCertificate>();
  if (!records.length) return out;
  const { groups } = classifyCoas(records);
  const lotCounts = countLots(records);
  for (const p of products) {
    const g = findGroup(groups, p);
    const lead = g?.current[0];
    if (!g || !lead || !g.currentBatchLabel) continue;
    out.set(p.handle, {
      path: certificatePath(lead, lotCounts),
      batchLabel: g.currentBatchLabel,
      purity: lead.purity ?? null,
    });
  }
  return out;
}
