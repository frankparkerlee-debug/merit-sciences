#!/usr/bin/env node
/**
 * seed-inventory-to-prod.mjs — Push all SKUs from Inventory 6.14.xlsx
 * directly into the live Supabase Product table via PostgREST + the
 * SUPABASE_SECRET_KEY. Mirrors /admin/import/inventory logic but skips
 * the click-through.
 *
 *   • Strict (compound + vialSize) matching, mirroring the importer
 *   • Updates: pricing/stock/cost + imageUrl from sku-image-manifest.json
 *     (overwrites stale Shopify CDN URLs with our branded vials)
 *   • Creates: new SKUs as DRAFT products with pricing + imageUrl baked in
 *
 * Run from the repo root:
 *   node scripts/seed-inventory-to-prod.mjs --dry-run
 *   node scripts/seed-inventory-to-prod.mjs        # writes to prod
 */

import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(HERE, '..');
const ENV_PATH = path.join(REPO_ROOT, '.env.local');

if (existsSync(ENV_PATH)) {
  for (const line of readFileSync(ENV_PATH, 'utf8').split('\n')) {
    if (!line || line.startsWith('#')) continue;
    const i = line.indexOf('=');
    if (i < 0) continue;
    const k = line.slice(0, i).trim();
    let v = line.slice(i + 1).trim();
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    process.env[k] = v;
  }
}

const DRY_RUN = process.argv.includes('--dry-run');
const INVENTORY = path.join(REPO_ROOT, '..', 'Merit Peptides', 'Inventory 6.14.xlsx');
const MANIFEST = path.join(REPO_ROOT, 'public', 'products', 'sku-image-manifest.json');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SECRET = process.env.SUPABASE_SECRET_KEY;
if (!SUPABASE_URL || !SUPABASE_SECRET) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY');
  process.exit(1);
}
const sb = createClient(SUPABASE_URL, SUPABASE_SECRET, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ── Helpers ───────────────────────────────────────────────────────────────
async function parseInventory() {
  const xlsx = (await import('xlsx')).default ?? (await import('xlsx'));
  const wb = xlsx.readFile(INVENTORY);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(ws, { header: 1, defval: '' });
  const out = [];
  for (const r of rows) {
    if (!r || !r[0]) continue;
    const sku = String(r[0]).trim();
    if (!sku || sku.toLowerCase() === 'sku') continue;
    if (sku.toLowerCase().includes('totals') ||
        sku.toLowerCase().includes('inventory position')) continue;
    const compound = String(r[1] ?? '').trim();
    const vialSize = String(r[2] ?? '').trim();
    if (!compound || !vialSize) continue;
    out.push({
      sku,
      compound,
      vialSize,
      stockQty: parseInt(String(r[3] ?? '0').replace(/[,\s]/g, ''), 10) || 0,
      unitCostCents: parseDollarsToCents(r[6]),
      physicianPriceCents: parseDollarsToCents(r[8]),
      retailPriceCents: parseDollarsToCents(r[10]),
    });
  }
  return out;
}

function parseDollarsToCents(v) {
  if (v === '' || v === null || v === undefined) return null;
  const n = parseFloat(String(v).replace(/[$,\s]/g, ''));
  if (!isFinite(n) || n === 0) return null;
  return Math.round(n * 100);
}

function slugify(s) {
  return s.toLowerCase()
    .replace(/[+/&]/g, '-')
    .replace(/[()]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

const normalizeSize = (s) => String(s).toLowerCase().replace(/\s+/g, '').trim();
const normalize = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const extractRoot = (s) => String(s).split(/\s+/)[0] ?? s;

function findMatch(row, products) {
  const targetCompound = normalize(row.compound);
  const targetSize = normalizeSize(row.vialSize);
  const scored = [];
  for (const p of products) {
    let score = 0;
    const pCompound = normalize(p.compound);
    const pTitle = normalize(p.title);
    if (pCompound && targetCompound.includes(pCompound)) score += 10;
    if (pTitle && targetCompound.includes(extractRoot(pTitle))) score += 7;
    if (targetCompound.includes(extractRoot(pCompound))) score += 5;
    if (row.compound.toLowerCase().includes('wolverine') && p.handle.includes('bpc-157-tb-500')) score += 15;
    if (row.compound.toLowerCase().includes('klow') && p.handle === 'klow') score += 15;
    if (score >= 7) scored.push({ p, score });
  }
  if (!scored.length) return null;
  const sizeExact = scored.filter((s) => normalizeSize(s.p.vialSize) === targetSize);
  if (!sizeExact.length) return null;
  sizeExact.sort((a, b) => b.score - a.score);
  return sizeExact[0].p;
}

// ── Main ──────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n${DRY_RUN ? '[DRY RUN] ' : ''}Seeding Inventory 6.14 → live Supabase\n`);

  const manifest = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : [];
  const imageMap = new Map();
  for (const e of manifest) {
    imageMap.set(`${e.compound.trim().toLowerCase()}|${normalizeSize(e.vialSize)}`, e.imageUrl);
  }
  console.log(`Manifest entries: ${imageMap.size}`);

  const inventory = await parseInventory();
  console.log(`Inventory rows: ${inventory.length}`);

  const { data: products, error: fetchErr } = await sb
    .from('products')
    .select('handle,title,compound,vialSize,priceCents,physicianPriceCents,costCents,stockQty,imageUrl,status');
  if (fetchErr) {
    console.error('Fetch failed:', fetchErr);
    process.exit(1);
  }
  console.log(`Existing products in DB: ${products.length}\n`);

  const updates = [];
  const creates = [];
  let unchanged = 0;
  let skipped = 0;

  for (const row of inventory) {
    const matched = findMatch(row, products);
    const skuKey = `${row.compound.trim().toLowerCase()}|${normalizeSize(row.vialSize)}`;
    const skuImage = imageMap.get(skuKey) ?? null;

    if (matched) {
      const data = {};
      if (row.stockQty !== matched.stockQty) data.stockQty = row.stockQty;
      if (row.retailPriceCents !== null && row.retailPriceCents !== matched.priceCents) {
        data.priceCents = row.retailPriceCents;
      }
      if (row.physicianPriceCents !== null && row.physicianPriceCents !== matched.physicianPriceCents) {
        data.physicianPriceCents = row.physicianPriceCents;
      }
      if (row.unitCostCents !== null && row.unitCostCents !== matched.costCents) {
        data.costCents = row.unitCostCents;
      }
      const isAdminUpload = /supabase\.co\/storage|\/products\/(?!sku-|placeholder)/.test(matched.imageUrl ?? '');
      if (skuImage && !isAdminUpload && matched.imageUrl !== skuImage) {
        data.imageUrl = skuImage;
      }
      if (Object.keys(data).length === 0) {
        unchanged++;
      } else {
        updates.push({ handle: matched.handle, title: matched.title, data });
      }
    } else if (row.retailPriceCents !== null) {
      const handle = slugify(`${row.compound} ${row.vialSize}`);
      creates.push({
        handle,
        title: `${row.compound} ${row.vialSize}`.trim(),
        compound: row.compound,
        eyebrow: '',
        vialSize: row.vialSize || 'TBD',
        format: 'LYOPHILIZED',
        oneLiner: '',
        priceCents: row.retailPriceCents,
        physicianPriceCents: row.physicianPriceCents,
        costCents: row.unitCostCents,
        stockQty: row.stockQty,
        lotId: 'TBD',
        lotPurity: '≥99%',
        lotTestedDate: '',
        lotBud: '',
        segment: 'BIOHACKER',
        channel: 'RUA',
        status: 'DRAFT',
        imageUrl: skuImage,
        images: [],
      });
    } else {
      skipped++;
    }
  }

  console.log(`Plan:`);
  console.log(`  Will update:   ${updates.length}`);
  console.log(`  Will create:   ${creates.length} (DRAFT)`);
  console.log(`  Unchanged:     ${unchanged}`);
  console.log(`  Skipped:       ${skipped} (no retail price)\n`);

  if (DRY_RUN) {
    console.log('Sample updates (first 6):');
    for (const u of updates.slice(0, 6)) {
      console.log(`  /${u.handle} (${u.title}):`, u.data);
    }
    console.log('\nSample creates (first 6):');
    for (const c of creates.slice(0, 6)) {
      console.log(`  /${c.handle} — ${c.title} — $${(c.priceCents / 100).toFixed(2)} — ${c.imageUrl ?? 'no image'}`);
    }
    return;
  }

  let updated = 0, created = 0, errors = 0;
  for (const u of updates) {
    const { error } = await sb.from('products').update(u.data).eq('handle', u.handle);
    if (error) {
      console.error(`  ✗ update /${u.handle}:`, error.message);
      errors++;
    } else {
      updated++;
    }
  }
  for (const c of creates) {
    const { error } = await sb.from('products').insert(c);
    if (error) {
      console.error(`  ✗ create /${c.handle}:`, error.message);
      errors++;
    } else {
      created++;
    }
  }

  console.log(`\n${'═'.repeat(50)}`);
  console.log(`Updated:  ${updated}`);
  console.log(`Created:  ${created}`);
  console.log(`Errors:   ${errors}`);
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
