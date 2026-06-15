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
    action: 'update' | 'create' | 'no-data';
    // For 'create' rows, the handle that will be generated
    newHandle?: string;
    // For 'create' rows whose compound matches an existing product but
    // whose vialSize doesn't — the handle of the sibling product. The UI
    // can label this row as "new SIZE of an existing product" so the
    // admin doesn't fear a duplicate. Once the ProductVariant model
    // lands these will collapse to variants of one parent product.
    sizeVariantOf?: { handle: string; title: string; vialSize: string };
    changes: {
      stockQty?: { from: number; to: number };
      priceCents?: { from: number; to: number };
      physicianPriceCents?: { from: number | null; to: number };
      costCents?: { from: number | null; to: number };
    };
  }>;
  totalRows: number;
  matchedCount: number;
  toCreateCount: number;
  toCreateAsSizeVariantCount: number;
  noDataCount: number;
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
  if (file.size > 10 * 1024 * 1024) return { error: 'File too large (max 10MB)' };

  // Detect xlsx vs csv from filename. Excel's CSV export mangles special
  // chars (≥, ², µ, etc) so xlsx is preferred when available.
  const filename = file.name.toLowerCase();
  const isXlsx = filename.endsWith('.xlsx') || filename.endsWith('.xls');

  const rows: ParsedRow[] = [];

  if (isXlsx) {
    // Dynamic import keeps the xlsx package out of the client bundle.
    const XLSX = await import('xlsx');
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: 'array' });
    // Use the first sheet — Merit's inventory file is single-sheet
    const sheet = wb.Sheets[wb.SheetNames[0]];
    // Convert to 2D array of cell values. defval keeps empty cells as '' so
    // column indices stay aligned even when a row has trailing blanks.
    const data: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    for (const row of data) {
      if (!row || row.length < 5) continue;
      const firstCell = String(row[0] ?? '').trim();
      if (!firstCell) continue;
      if (firstCell.toLowerCase() === 'sku') continue;
      if (firstCell.toLowerCase().includes('inventory position')) continue;

      const sku = firstCell;
      const productName = String(row[1] ?? '').trim();
      const vialSize = String(row[2] ?? '').trim();
      if (!sku || !productName) continue;

      rows.push({
        sku,
        productName,
        vialSize,
        unitsOnHand: parseIntSafe(row[5]),
        unitCostCents: parseDollarsToCents(row[6]),
        physicianPriceCents: parseDollarsToCents(row[8]),
        retailPriceCents: parseDollarsToCents(row[10]),
      });
    }
  } else {
    // CSV path — preserved for users who still prefer CSV
    const text = await file.text();
    const lines = text.split(/\r?\n/);
    for (const line of lines) {
      if (!line.trim()) continue;
      const cells = parseCsvLine(line);
      if (cells.length < 5) continue;
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
  }

  if (rows.length === 0) return { error: 'No data rows found in file. Check the column layout (Col A=SKU, B=Product, C=Vial Size, F=Units, G=Cost, I=Physician, K=Retail).' };

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
    toCreateCount: 0,
    toCreateAsSizeVariantCount: 0,
    noDataCount: 0,
  };

  // Track handles we plan to generate so we don't collide across rows
  const handlesInUseAfterImport = new Set(allProducts.map((p) => p.handle));

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
      diff.rows.push({
        row,
        matchedHandle: matched.handle,
        matchedTitle: matched.title,
        action: 'update',
        changes,
      });
    } else if (row.retailPriceCents !== null) {
      // Rows without a match get CREATED as draft products. Skip rows that
      // don't have a retail price — those are usually blank stub rows in
      // the inventory sheet and shouldn't become products.
      const newHandle = uniqueHandle(slugify(`${row.productName} ${row.vialSize}`), handlesInUseAfterImport);
      handlesInUseAfterImport.add(newHandle);

      // Detect "sibling size" — same compound, different vialSize. The
      // admin should see "Retatrutide 30mg → new SIZE of existing
      // Retatrutide (60mg)" rather than fearing a duplicate. Once the
      // ProductVariant model lands these collapse into variants of one
      // parent product.
      const sibling = findSizeSibling(row, allProducts);
      if (sibling) {
        diff.toCreateAsSizeVariantCount++;
      } else {
        diff.toCreateCount++;
      }

      diff.rows.push({
        row,
        matchedHandle: null,
        matchedTitle: null,
        action: 'create',
        newHandle,
        sizeVariantOf: sibling
          ? { handle: sibling.handle, title: sibling.title, vialSize: sibling.vialSize }
          : undefined,
        changes: {
          stockQty: { from: 0, to: row.unitsOnHand },
          priceCents: { from: 0, to: row.retailPriceCents },
          ...(row.physicianPriceCents !== null
            ? { physicianPriceCents: { from: null, to: row.physicianPriceCents } }
            : {}),
          ...(row.unitCostCents !== null
            ? { costCents: { from: null, to: row.unitCostCents } }
            : {}),
        },
      });
    } else {
      // No match AND no retail price → not enough data to create
      diff.noDataCount++;
      diff.rows.push({
        row,
        matchedHandle: null,
        matchedTitle: null,
        action: 'no-data',
        changes: {},
      });
    }
  }

  return diff;
}

/* ─── Handle generation ─── */

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[+/&]/g, '-')              // common separators in SKU names
    .replace(/[()]/g, '')                // strip parens like "(Wolverine)"
    .replace(/[^a-z0-9\s-]/g, '')        // strip remaining punctuation
    .replace(/\s+/g, '-')                // spaces → hyphens
    .replace(/-+/g, '-')                 // collapse consecutive hyphens
    .replace(/^-|-$/g, '')               // trim leading/trailing hyphens
    .slice(0, 60);
}

function uniqueHandle(base: string, taken: Set<string>): string {
  if (!taken.has(base)) return base;
  for (let i = 2; i < 100; i++) {
    const candidate = `${base}-${i}`;
    if (!taken.has(candidate)) return candidate;
  }
  // Pathological fallback — shouldn't hit with <100 collisions
  return `${base}-${Date.now()}`;
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
  let created = 0;
  let errors = 0;

  for (const r of diff.rows) {
    if (r.action === 'update' && r.matchedHandle) {
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
        errors++;
      }
    } else if (r.action === 'create' && r.newHandle) {
      // Create new draft product. status='DRAFT' so it doesn't go live
      // on the catalog/storefront until the operator opens it, fills in
      // eyebrow/oneLiner/imageUrl/lot info, and flips to ACTIVE.
      try {
        await prisma.product.create({
          data: {
            handle: r.newHandle,
            title: `${r.row.productName} ${r.row.vialSize}`.trim(),
            compound: r.row.productName,
            eyebrow: '',
            vialSize: r.row.vialSize || 'TBD',
            format: 'LYOPHILIZED',
            oneLiner: '',
            priceCents: r.row.retailPriceCents ?? 0,
            physicianPriceCents: r.row.physicianPriceCents,
            costCents: r.row.unitCostCents,
            stockQty: r.row.unitsOnHand,
            lotId: 'TBD',
            lotPurity: '≥99%',
            lotTestedDate: '',
            lotBud: '',
            segment: 'BIOHACKER',
            channel: 'RUA',
            status: 'DRAFT',
            images: [],
          },
        });
        created++;
      } catch (err) {
        console.error('[inventory-import] create failed', r.newHandle, err);
        errors++;
      }
    }
  }

  revalidatePath('/admin/products');
  revalidatePath('/catalog');
  const errorTail = errors > 0 ? ` ⚠ ${errors} failed (see Render logs).` : '';
  return {
    ok: true,
    message: `Updated ${updated} product${updated === 1 ? '' : 's'}, created ${created} draft${created === 1 ? '' : 's'}.${errorTail}`,
  };
}

/* ─── Matching logic ─── */

function findProductMatch<P extends { handle: string; title: string; compound: string; vialSize: string }>(
  row: ParsedRow,
  products: P[],
): P | null {
  // Match in two stages so size mismatches never silently overwrite pricing:
  //
  //   1. Score products on compound/title/handle overlap.
  //   2. From scored candidates, require an EXACT vial-size match.
  //
  // The inventory sheet has multiple rows per compound (Retatrutide 10mg,
  // 20mg, 30mg, 60mg) — without strict size enforcement, the importer
  // collapses them all onto whichever product wins on compound score and
  // last-write wins on price. That's the bug behind "30mg got 60mg
  // pricing". A row whose size doesn't match any product is returned as
  // "no match" so the apply step creates a new draft instead of clobbering.
  const targetCompound = normalize(row.productName);
  const targetSize = normalizeSize(row.vialSize);

  type Scored = { product: typeof products[number]; score: number };
  const scored: Scored[] = [];

  for (const p of products) {
    let score = 0;
    const pCompound = normalize(p.compound);
    const pTitle = normalize(p.title);

    // Compound name match (most reliable signal of "same molecule")
    if (pCompound && targetCompound.includes(pCompound)) score += 10;
    if (pTitle && targetCompound.includes(extractRoot(pTitle))) score += 7;
    if (targetCompound.includes(extractRoot(pCompound))) score += 5;

    // Special-case Wolverine / KLOW blend names
    if (row.productName.toLowerCase().includes('wolverine') && p.handle.includes('bpc-157-tb-500')) {
      score += 15;
    }
    if (row.productName.toLowerCase().includes('klow') && p.handle === 'klow') {
      score += 15;
    }

    if (score >= 7) scored.push({ product: p, score });
  }

  if (scored.length === 0) return null;

  // From compound-matching candidates, require exact size equality.
  // "30mg" === "30 mg" after normalizeSize() strips whitespace.
  const sizeExact = scored.filter((s) => normalizeSize(s.product.vialSize) === targetSize);
  if (sizeExact.length === 0) return null;

  // If multiple products share the same compound AND size (shouldn't happen,
  // but archived duplicates exist in legacy data), pick the highest scorer.
  sizeExact.sort((a, b) => b.score - a.score);
  return sizeExact[0].product;
}

/**
 * Find an existing product that shares the row's compound but NOT its
 * vialSize. Used to label new-draft rows as "new SIZE of an existing
 * product" so the admin understands the relationship at preview time.
 *
 * Returns the best compound match (highest score) that has a DIFFERENT
 * vialSize. Returns null if no compound match exists (truly new product).
 */
function findSizeSibling<P extends { handle: string; title: string; compound: string; vialSize: string }>(
  row: ParsedRow,
  products: P[],
): P | null {
  const targetCompound = normalize(row.productName);
  const targetSize = normalizeSize(row.vialSize);

  let best: { product: P; score: number } | null = null;

  for (const p of products) {
    if (normalizeSize(p.vialSize) === targetSize) continue; // not a sibling — same size

    let score = 0;
    const pCompound = normalize(p.compound);
    const pTitle = normalize(p.title);

    if (pCompound && targetCompound.includes(pCompound)) score += 10;
    if (pTitle && targetCompound.includes(extractRoot(pTitle))) score += 7;
    if (targetCompound.includes(extractRoot(pCompound))) score += 5;

    if (row.productName.toLowerCase().includes('wolverine') && p.handle.includes('bpc-157-tb-500')) {
      score += 15;
    }
    if (row.productName.toLowerCase().includes('klow') && p.handle === 'klow') {
      score += 15;
    }

    if (score >= 7 && (!best || score > best.score)) {
      best = { product: p, score };
    }
  }

  return best?.product ?? null;
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function normalizeSize(s: string): string {
  // "30mg", "30 mg", "30MG", "30 MG" all collapse to "30mg" so the
  // exact-equality check ignores whitespace and case.
  return s.toLowerCase().replace(/\s+/g, '').trim();
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
