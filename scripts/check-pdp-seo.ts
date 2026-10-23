/**
 * Prints the title, meta description and summary for every active product,
 * with lengths, and flags anything outside the rules in lib/pdp-seo.ts.
 * Read-only. Run: DATABASE_URL=... npx tsx scripts/check-pdp-seo.ts
 */
import { PrismaClient } from '../lib/generated/prisma';
import { getMonographForHandle } from '../lib/monographs';
import { getCompoundStatus } from '../lib/compound-status';
import { matchCurrentCertificates } from '../lib/product-coa-match';
import { pdpMetaDescription, pdpSummary, pdpTitle, wordCount } from '../lib/pdp-seo';

const BANNED = /[–—]|dose|dosing|reconstitut|inject|tirzepatide|retatrutide|pharmacy-grade|503B|ISO-certified/i;

async function main() {
  const prisma = new PrismaClient();
  const rows = await prisma.product.findMany({ where: { status: 'ACTIVE' }, orderBy: { createdAt: 'asc' } });
  const coas = await prisma.coa.findMany({ take: 1000 });
  const certs = matchCurrentCertificates(coas, rows);
  const metas = new Set<string>();
  let problems = 0;
  for (const p of rows) {
    const isWater = p.handle === 'bacteriostatic-water';
    const m = getMonographForHandle(p.handle);
    const title = pdpTitle(p, isWater);
    const cert = certs.get(p.handle);
    const meta = pdpMetaDescription(p, m, isWater, Boolean(cert));
    const summary = pdpSummary(p, m, m ? getCompoundStatus(m.slug) : null);
    const flags: string[] = [];
    if (title.length > 60) flags.push(`title ${title.length}`);
    if (meta.length < 140 || meta.length > 160) flags.push(`meta ${meta.length}`);
    if (!/research/i.test(meta)) flags.push('meta lacks "research"');
    if (metas.has(meta)) flags.push('duplicate meta');
    metas.add(meta);
    if (summary && (wordCount(summary) < 40 || wordCount(summary) > 60)) flags.push(`summary ${wordCount(summary)} words`);
    for (const [k, v] of [['title', title], ['meta', meta], ['summary', summary ?? '']] as const) {
      if (BANNED.test(v)) flags.push(`${k} has banned term: ${v.match(BANNED)?.[0]}`);
    }
    problems += flags.length;
    console.log(`\n${p.handle}${flags.length ? `  !! ${flags.join('; ')}` : ''}`);
    console.log(`  T(${title.length}) ${title}`);
    console.log(`  M(${meta.length}) ${meta}`);
    console.log(`  C ${cert ? `${cert.batchLabel} ${cert.path}` : '(no current certificate: /coa search fallback)'}`);
    console.log(`  S(${summary ? wordCount(summary) : 0}w) ${summary ?? '(none: no monograph)'}`);
  }
  console.log(`\n${rows.length} active products, ${problems} flags`);
  await prisma.$disconnect();
}
main();
