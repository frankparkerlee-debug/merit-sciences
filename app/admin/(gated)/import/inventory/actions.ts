'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-session';

export type ActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

export type ParsedRow = {
  sku: string;
  productName: string;
  vialSize: string;
  unitsOnHand: number;
  unitCostCents: number | null;
  physicianPriceCents: number | null;
  retailPriceCents: number | null;
};

export type Diff = {
  rows: Array<{
    row: ParsedRow;
    matchedHandle: string | null;
    matchedTitle: string | null;
    action: 'update' | 'no-match';
    changes: {
      stockQty?: { from: number; to: number };
      priceCents?: { from: number; to: number };
      physicianPriceCents?: { from: number | null; to: number };
      costCents?: { from: number | null; to: number };
    };
  }>;
  totalRows: number;
  matchedCount: number;
  unmatchedCount: number;
};

/**
 * Parse a Shopify-style inventory CSV (or our internal format) into
 * normalized rows. The CSV columns we look for:
 *   A: SKU            (e.g. "BPC 10mg + TB 10mg (Wolverine) | 20mg")
 *   B: Product        (e.g. "BPC 10mg + TB 10mg (Wolverine)")
 *   C: Vial Size      (e.g. "20mg")
 *   F: Units On Hand
 *   G: Unit Cost
 *   I: Physician Unit (USD per piece)
 *   K: Retail Unit    (USD per piece)
 *
 * Tolerates extra/missing columns and skips header rows / blank rows.
 */
export async function parseInventoryCsv(_prev: any, formData: FormData): Promise<Diff | { error: string }> {
  const admin = await requireAdmin();
  if (!admin) return { error: 'Unauthorized' };

  const file = formData.get('csv');
  if (!(file instanceof File)) return { error: 'No file uploaded' };
  if (file.size === 0) return { error: 'File is empty' };
  if (file.size > 5 * 1024 * 1024) return { error: 'File too large (max 5MB)' };

  const text = await file.text();
  const rows: ParsedRow[] = [];
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    if (!line.trim()) continue;
    const cells = parseCsvLine(line);
    if (cells.length < 5) continue;
    // Skip the header banner row + the column-name row
    const firstCell = (cells[0] ?? '').trim();
    if (firstCell.toLowerCase() === 'sku') continue;
    if (firstCell.toLowerCase().includes('inventory position')) continue;

    const sku = firstCell;
    const productName = (cells[1] ?? '').trim();
    const vialSize = (cells[2] ?? '').trim();
    if (!sku || !productName) continue;

    rows.push({
      sku,
      productName,
      vialSize,
      unitsOnHand: parseIntSafe(cells[5]),
      unitCostCents: parseDollarsToCents(cells[6]),
      physicianPriceCents: parseDollarsToCents(cells[8]),
      retailPriceCents: parseDollarsToCents(cells[10]),
    });
  }

  if (rows.length === 0) return { error: 'No data rows found in CSV. Check the column layout.' };

  // Match each row to an existing Product by SKU/title/handle
  const allProducts = await prisma.product.findMany({
    select: {
      handle: true,
      title: true,
      compound: true,
      vialSize: true,
      priceCents: true,
      physicianPriceCents: true,
      costCents: true,
      stockQty: true,
    },
  });

  const diff: Diff = {
    rows: [],
    totalRows: rows.length,
    matchedCount: 0,
    unmatchedCount: 0,
  };

  for (const row of rows) {
    const matched = findProductMatch(row, allProducts);
    const changes: Diff['rows'][number]['changes'] = {};

    if (matched) {
      diff.matchedCount++;
      if (row.unitsOnHand !== matched.stockQty) {
        changes.stockQty = { from: matched.stockQty, to: row.unitsOnHand };
      }
      if (row.retailPriceCents !== null && row.retailPriceCents !== matched.priceCents) {
        changes.priceCents = { from: matched.priceCents, to: row.retailPriceCents };
      }
      if (row.physicianPriceCents !== null && row.physicianPriceCents !== matched.physicianPriceCents) {
        changes.physicianPriceCents = { from: matched.physicianPriceCents, to: row.physicianPriceCents };
      }
      if (row.unitCostCents !== null && row.unitCostCents !== matched.costCents) {
        changes.costCents = { from: matched.costCents, to: row.unitCostCents };
      }
    } else {
      diff.unmatchedCount++;
    }

    diff.rows.push({
      row,
      matchedHandle: matched?.handle ?? null,
      matchedTitle: matched?.title ?? null,
      action: matched ? 'update' : 'no-match',
      changes,
    });
  }

  return diff;
}

/**
 * Apply the parsed diff — update stock / price / physician price / cost
 * for every row that has changes. Idempotent: re-running with the same
 * CSV after a successful import is a no-op.
 */
export async function applyInventoryCsv(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: 'Unauthorized' };

  // The diff is serialized into the form as JSON; we re-validate against
  // the DB so a stale diff can't apply wrong values.
  const raw = String(formData.get('diff') ?? '');
  if (!raw) return { ok: false, error: 'Missing diff payload' };
  let diff: Diff;
  try {
    diff = JSON.parse(raw) as Diff;
  } catch {
    return { ok: false, error: 'Invalid diff payload' };
  }

  let updated = 0;
  for (const r of diff.rows) {
    if (r.action !== 'update' || !r.matchedHandle) continue;
    if (Object.keys(r.changes).length === 0) continue;

    const data: any = {};
    if (r.changes.stockQty) data.stockQty = r.changes.stockQty.to;
    if (r.changes.priceCents) data.priceCents = r.changes.priceCents.to;
    if (r.changes.physicianPriceCents) data.physicianPriceCents = r.changes.physicianPriceCents.to;
    if (r.changes.costCents) data.costCents = r.changes.costCents.to;

    try {
      await prisma.product.update({
        where: { handle: r.matchedHandle },
        data,
      });
      updated++;
    } catch (err) {
      console.error('[inventory-import] update failed', r.matchedHandle, err);
    }
  }

  revalidatePath('/admin/products');
  revalidatePath('/catalog');
  return { ok: true, message: `Updated ${updated} product(s) from CSV.` };
}

/* ─── Matching logic ─── */

function findProductMatch<P extends { handle: string; title: string; compound: string; vialSize: string }>(
  row: ParsedRow,
  products: P[],
): P | null {
  // Strategy: normalize all candidate strings + score by overlap on compound name
  // and vial size. Inventory SKU "BPC 10mg + TB 10mg (Wolverine) | 20mg" matches
  // product handle "bpc-157-tb-500" via the compound name "Wolverine" overlap
  // (which is what we display: "Wolverine Blend").
  const targetCompound = normalize(row.productName);
  const targetSize = normalize(row.vialSize);

  let best: { product: typeof products[number]; score: number } | null = null;

  for (const p of products) {
    let score = 0;
    const pCompound = normalize(p.compound);
    const pTitle = normalize(p.title);
    const pSize = normalize(p.vialSize);

    // Compound name match (most reliable)
    if (pCompound && targetCompound.includes(pCompound)) score += 10;
    if (pTitle && targetCompound.includes(extractRoot(pTitle))) score += 7;
    if (targetCompound.includes(extractRoot(pCompound))) score += 5;

    // Vial size match
    if (pSize && targetSize === pSize) score += 5;
    if (pSize && targetSize.includes(pSize)) score += 3;

    // Special-case Wolverine / KLOW / GLOW blend names
    if (row.productName.toLowerCase().includes('wolverine') && p.handle.includes('bpc-157-tb-500')) {
      score += 15;
    }
    if (row.productName.toLowerCase().includes('klow') && p.handle === 'klow') {
      score += 15;
    }

    if (score > 0 && (!best || score > best.score)) {
      best = { product: p, score };
    }
  }

  return best && best.score >= 7 ? best.product : null;
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function extractRoot(s: string): string {
  // For "BPC-157" → "bpc", for "TB-500" → "tb", etc.
  const parts = s.split(/\s+/);
  return parts[0] ?? s;
}

function parseIntSafe(s: any): number {
  const n = parseInt(String(s ?? '0').replace(/[,\s]/g, ''), 10);
  return isFinite(n) ? n : 0;
}

function parseDollarsToCents(s: any): number | null {
  const str = String(s ?? '').trim();
  if (!str) return null;
  const cleaned = str.replace(/[$,\s]/g, '');
  const n = parseFloat(cleaned);
  if (!isFinite(n) || n <= 0) return null;
  return Math.round(n * 100);
}

function parseCsvLine(line: string): string[] {
  // Minimal CSV parser supporting quoted strings with commas inside.
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}
