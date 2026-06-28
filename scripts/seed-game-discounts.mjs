// Seed the Peptide Tycoon game reward codes as real, product-specific
// discount rows. Idempotent — safe to run repeatedly (upsert by code).
//
//   node scripts/seed-game-discounts.mjs
//
// Each hero unlocks three discount tiers (5 / 10 / 15% off) for the ONE real
// compound it parodies. Codes follow the in-game convention `${PREFIX}${pct}`
// (stored lowercase), e.g. RETA10 → 10% off Retatrutide. They are:
//   - PERCENT, value in basis points (5% = 500)
//   - productHandle-scoped (only discount that product's line — enforced in
//     lib/discount.ts), so they can't be used as a blanket store-wide coupon
//   - oncePerCustomer (a leaked code can't be farmed by one buyer)
//
// Mirror of lib/game/characters.ts — keep the prefixes/handles in sync if the
// roster changes.

import { PrismaClient } from '../lib/generated/prisma/index.js';

const prisma = new PrismaClient();

// [codePrefix, productHandle, compound] — mirrors CHARACTERS in characters.ts
const HEROES = [
  ['GHK', 'ghk-cu', 'GHK-Cu'],
  ['SERM', 'sermorelin', 'Sermorelin Acetate'],
  ['SEMA', 'semax', 'Semax'],
  ['SLNK', 'selank', 'Selank'],
  ['TAN', 'melanotan-ii', 'Melanotan II'],
  ['PT', 'pt-141', 'PT-141'],
  ['MOTS', 'mots-c', 'MOTS-c'],
  ['THY', 'thymosin-alpha-1', 'Thymosin Alpha-1'],
  ['AOD', 'aod-9604', 'AOD-9604'],
  ['WOLV', 'bpc-157-tb-500', 'BPC-157 + TB-500'],
  ['IGF', 'igf-1-lr3', 'IGF-1 LR3'],
  ['NAD', 'nad-500mg', 'NAD+'],
  ['EPI', 'epitalon', 'Epitalon'],
  ['TESA', 'th9507', 'Tesamorelin'],
  ['TIRZ', 'ly3298176', 'Tirzepatide'],
  ['RETA', 'ly3437943', 'Retatrutide'],
];

// Mirrors REWARD_TIERS in characters.ts
const TIERS = [
  { pct: 5, label: 'Initiate' },
  { pct: 10, label: 'Researcher' },
  { pct: 15, label: 'Director' },
];

async function main() {
  // Warn (don't fail) if a handle has no matching product — the code would
  // simply never apply to a real cart line.
  const handles = HEROES.map(([, h]) => h);
  const existing = await prisma.product.findMany({
    where: { handle: { in: handles } },
    select: { handle: true },
  });
  const known = new Set(existing.map((p) => p.handle));
  for (const h of handles) {
    if (!known.has(h)) console.warn(`⚠️  no product found for handle "${h}" — code will be inert`);
  }

  let created = 0;
  let updated = 0;
  for (const [prefix, handle, compound] of HEROES) {
    for (const tier of TIERS) {
      const code = `${prefix}${tier.pct}`.toLowerCase();
      const data = {
        title: `${compound} — Peptide Tycoon ${tier.label} (${tier.pct}% off)`,
        type: 'PERCENT',
        value: tier.pct * 100, // basis points
        method: 'CODE',
        productHandle: handle,
        oncePerCustomer: true,
        status: 'ACTIVE',
        createdByEmail: 'peptide-tycoon-game',
      };
      const before = await prisma.discount.findUnique({ where: { code }, select: { id: true } });
      await prisma.discount.upsert({
        where: { code },
        update: data,
        create: { code, ...data },
      });
      if (before) updated++;
      else created++;
    }
  }

  console.log(`✅ Peptide Tycoon discounts seeded — ${created} created, ${updated} updated (${created + updated} total).`);
}

main()
  .catch((err) => {
    console.error('❌ seed-game-discounts failed:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
