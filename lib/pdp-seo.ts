/**
 * Title, meta description and answer-first summary for product pages.
 *
 * Pure functions over the product row and its monograph, so the rules can be
 * checked in one place (scripts/check-pdp-seo.ts prints every active PDP and flags rule breaks).
 *
 *   title    "Name N mg: ≥99% HPLC, Scan-to-Verify COA", kept to 60 characters
 *            before the root layout's " · Merit Sciences" suffix by stepping
 *            down to a shorter tail when the name is long.
 *   meta     unique per product, 140 to 160 characters, names the compound
 *            and says "research".
 *   summary  40 to 60 words: what it is, research context, FDA status,
 *            research use only. Server-rendered near the top of the PDP.
 *
 * Copy rules: no em or en dashes, no dosing, preparation, route or human-use
 * language, RT3 and TZ2 by code only.
 */
import type { Monograph } from './monographs';
import type { CompoundStatus } from './compound-status';

type P = { handle: string; title: string; vialSize: string };

/** Search-facing names where the catalog title is a code, carries a route
 *  word, or is too long for a title tag. The catalog title itself (cart
 *  lines, checkout, emails) is unchanged. */
const SEO_NAME: Record<string, string> = {
  'melanotan-ii': 'Melanotan II',
  'bpc-10mg-tb-10mg-wolverine-20mg': 'Wolverine (BPC-157 + TB-500)',
  'bpc157-ghk-cu-50-tb500-glow-70mg': 'GLOW (BPC-157, GHK-Cu, TB-500)',
  'bpc157-ghk-cu-50-tb500-kpv-klow-80mg': 'KLOW (BPC-157, GHK-Cu, TB-500, KPV)',
  'cjc-1295-w-o-dac-10-ipa-10-20mg': 'CJC-1295 no DAC + Ipamorelin',
  'slu-pp-332-injectable-5mg': 'SLU-PP-332',
};

/** H1 and summary name. Melanotan II's catalog title is the code "MT-II". */
export function pdpName(p: P): string {
  return SEO_NAME[p.handle] ?? p.title;
}

/** "10mg" and "10 mg" both render as "10 mg". */
export function normSize(size: string): string {
  return size.replace(/(\d)\s*(mg|mcg|ml|iu)\b/gi, (_m, d: string, u: string) => `${d} ${u.toLowerCase() === 'ml' ? 'mL' : u.toLowerCase() === 'iu' ? 'IU' : u.toLowerCase()}`);
}

const TITLE_MAX = 60;

export function pdpTitle(p: P, isWater: boolean): string {
  const name = `${pdpName(p)} ${normSize(p.vialSize)}`;
  if (isWater) return `${name}: Scan-to-Verify COA`;
  const tails = [': ≥99% HPLC, Scan-to-Verify COA', ': ≥99% HPLC, Verified COA', ': ≥99% HPLC COA'];
  for (const t of tails) if ((name + t).length <= TITLE_MAX) return name + t;
  return name + tails[tails.length - 1];
}

/** First clause of a definition, for the meta: stops at the first comma or
 *  semicolon that introduces the research context, when what precedes it
 *  stands alone as a noun phrase. */
function shortDefinition(def: string): string {
  const d = def.replace(/\.$/, '');
  const cut = d.search(/[;,] (studied|used|one of|with|each|this|that|which|an enzyme|an immune|the redox|developed)| (that|which) /);
  return cut > 20 ? d.slice(0, cut) : d;
}

/**
 * Meta description: a lead naming the compound and what it is, then proof
 * lines added in order while they fit under 160 characters. The certificate
 * line is only claimed when a current certificate is actually published.
 */
export function pdpMetaDescription(
  p: P,
  m: Monograph | undefined,
  isWater: boolean,
  hasCertificate: boolean,
): string {
  const name = pdpName(p);
  const size = normSize(p.vialSize);
  if (isWater) {
    return `${name} ${size} for laboratory research, batch-documented with a scan-to-verify certificate. Ships in 48 hours from San Antonio. Research use only.`;
  }
  let lead = m
    ? `${name} ${size}: ${m.metaDefinition ?? shortDefinition(m.definition)}, supplied for research.`
    : `${name} ${size} research compound from Merit Sciences.`;
  const proofs = [
    hasCertificate
      ? 'HPLC-tested to ≥99%, current batch certificate published.'
      : 'Independently tested to ≥99% HPLC purity before release.',
    'Ships in 48 hours from San Antonio.',
    'Research use only.',
    'Not for human use.',
    'Merit Sciences.',
  ];
  let out = lead;
  for (const s of proofs) {
    if (`${out} ${s}`.length <= 160) out = `${out} ${s}`;
  }
  return out;
}

/** Answer-first summary. Null when there is no monograph to define the
 *  compound (blends without one, bacteriostatic water). */
export function pdpSummary(p: P, m: Monograph | undefined, status: CompoundStatus | null): string | null {
  if (!m || !status) return null;
  const name = pdpName(p);
  const parts = [`${name} is ${m.definition}`, status.fdaStatus];
  if (!/research use only/i.test(status.fdaStatus)) parts.push('Merit supplies it for research use only.');
  return parts.join(' ');
}

export function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}
