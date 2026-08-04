/**
 * Supply-line types and formatters that BOTH server and client may import.
 *
 * Deliberately free of `server-only` and of prisma. lib/supply.ts carries the
 * database access and is server-only; putting the shared shape and the money
 * helpers there too meant a client component importing `money()` dragged
 * `server-only` into the client bundle and failed the build.
 *
 * Rule of thumb: data access in lib/supply.ts, everything a card needs here.
 */
import type { SupplyCategory } from '@/lib/generated/prisma';

export type SupplyListItem = {
  handle: string;
  title: string;
  brand: string | null;
  eyebrow: string | null;
  category: SupplyCategory;
  oneLiner: string;
  priceCents: number;
  compareAtCents: number | null;
  sku: string | null;
  size: string | null;
  unitsPerBox: number | null;
  hcpcsCode: string | null;
  imageUrl: string | null;
  stockQty: number;
  rxOnly: boolean;
  sterile: boolean;
};

/** Display metadata per category. Order here is the order shown on the site. */
export const SUPPLY_CATEGORIES: Array<{
  key: SupplyCategory;
  label: string;
  blurb: string;
}> = [
  {
    key: 'COLLAGEN',
    label: 'Collagen',
    blurb: 'Native collagen matrix, particulate, and gel for stalled wounds.',
  },
  {
    key: 'WOUND_CARE',
    label: 'Wound care',
    blurb: 'Alginates, foams, hydrogels, gauze, cleansers, and securement.',
  },
  {
    key: 'DME',
    label: 'NPWT & equipment',
    blurb: 'Negative-pressure kits, canisters, and disposables.',
  },
];

export function categoryLabel(c: SupplyCategory): string {
  return SUPPLY_CATEGORIES.find((x) => x.key === c)?.label ?? String(c);
}

export function money(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/** Per-piece price, shown alongside the box price so clinics can compare. */
export function perUnit(priceCents: number, unitsPerBox: number | null): string | null {
  if (!unitsPerBox || unitsPerBox <= 1) return null;
  return `$${(priceCents / unitsPerBox / 100).toFixed(2)}`;
}
