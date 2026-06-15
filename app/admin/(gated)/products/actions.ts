'use server';

import fs from 'fs';
import path from 'path';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-session';
import { supabaseAdmin } from '@/lib/supabase';

export type ActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

const PRODUCTS_DIR = path.join(process.cwd(), 'content', 'products');

/**
 * One-shot seed: read every JSON file from content/products/ and upsert
 * into the Product table. Safe to run multiple times — uses upsert keyed
 * on handle. This is the entry point for migrating the legacy file-based
 * catalog into Supabase.
 */
export async function seedProductsFromJson(): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: 'Unauthorized' };

  if (!fs.existsSync(PRODUCTS_DIR)) {
    return { ok: false, error: `No products directory at ${PRODUCTS_DIR}` };
  }

  const files = fs.readdirSync(PRODUCTS_DIR).filter((f) => f.endsWith('.json'));
  if (files.length === 0) return { ok: false, error: 'No JSON files found.' };

  let count = 0;
  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(PRODUCTS_DIR, file), 'utf8');
      const j = JSON.parse(raw);
      await prisma.product.upsert({
        where: { handle: j.handle },
        update: {
          title: j.title,
          compound: j.compound,
          eyebrow: j.eyebrow,
          vialSize: j.vialSize,
          format: tsFormat(j.format),
          oneLiner: j.oneLiner ?? '',
          priceCents: j.priceCents ?? 0,
          compareAtCents: j.compareAtCents ?? null,
          bundles: j.bundles ?? null,
          specCas: j.spec?.cas ?? null,
          specMw: j.spec?.mw ?? null,
          specFormula: j.spec?.formula ?? null,
          specSequence: j.spec?.sequence ?? null,
          specAminoAcids: j.spec?.aminoAcids ?? null,
          lotId: j.lot?.id ?? 'TBD',
          lotPurity: j.lot?.purity ?? '',
          lotTestedDate: j.lot?.testedDate ?? '',
          lotBud: j.lot?.bud ?? '',
          lotCoaUrl: j.lot?.coaUrl ?? null,
          segment: tsSegment(j.segment),
          channel: tsChannel(j.channel),
          shopifySuspended: !!j.shopifySuspended,
          status: tsStatus(j.status),
          imageUrl: j.imageUrl ?? null,
          images: j.images ?? [],
        },
        create: {
          handle: j.handle,
          title: j.title,
          compound: j.compound,
          eyebrow: j.eyebrow,
          vialSize: j.vialSize,
          format: tsFormat(j.format),
          oneLiner: j.oneLiner ?? '',
          priceCents: j.priceCents ?? 0,
          compareAtCents: j.compareAtCents ?? null,
          bundles: j.bundles ?? null,
          specCas: j.spec?.cas ?? null,
          specMw: j.spec?.mw ?? null,
          specFormula: j.spec?.formula ?? null,
          specSequence: j.spec?.sequence ?? null,
          specAminoAcids: j.spec?.aminoAcids ?? null,
          lotId: j.lot?.id ?? 'TBD',
          lotPurity: j.lot?.purity ?? '',
          lotTestedDate: j.lot?.testedDate ?? '',
          lotBud: j.lot?.bud ?? '',
          lotCoaUrl: j.lot?.coaUrl ?? null,
          segment: tsSegment(j.segment),
          channel: tsChannel(j.channel),
          shopifySuspended: !!j.shopifySuspended,
          status: tsStatus(j.status),
          imageUrl: j.imageUrl ?? null,
          images: j.images ?? [],
        },
      });
      count++;
    } catch (err) {
      console.error(`[seedProducts] failed for ${file}`, err);
    }
  }

  revalidatePath('/admin/products');
  revalidatePath('/catalog');
  return { ok: true, message: `Seeded ${count} of ${files.length} products from JSON.` };
}

/* ─── Update product ─── */

export async function updateProduct(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: 'Unauthorized' };

  const handle = String(formData.get('handle') ?? '').trim();
  if (!handle) return { ok: false, error: 'Missing handle' };

  const data: any = {
    title: String(formData.get('title') ?? '').trim(),
    compound: String(formData.get('compound') ?? '').trim(),
    eyebrow: String(formData.get('eyebrow') ?? '').trim(),
    vialSize: String(formData.get('vialSize') ?? '').trim(),
    format: tsFormat(String(formData.get('format') ?? 'lyophilized')),
    oneLiner: String(formData.get('oneLiner') ?? '').trim(),
    priceCents: dollarsToCents(String(formData.get('price') ?? '0')),
    compareAtCents: formData.get('compareAtPrice')
      ? dollarsToCents(String(formData.get('compareAtPrice')))
      : null,
    physicianPriceCents: formData.get('physicianPrice')
      ? dollarsToCents(String(formData.get('physicianPrice')))
      : null,
    costCents: formData.get('costPrice')
      ? dollarsToCents(String(formData.get('costPrice')))
      : null,
    stockQty: formData.get('stockQty')
      ? parseInt(String(formData.get('stockQty')), 10) || 0
      : 0,
    specCas: emptyToNull(String(formData.get('specCas') ?? '')),
    specMw: emptyToNull(String(formData.get('specMw') ?? '')),
    specFormula: emptyToNull(String(formData.get('specFormula') ?? '')),
    specSequence: emptyToNull(String(formData.get('specSequence') ?? '')),
    specAminoAcids: formData.get('specAminoAcids')
      ? parseInt(String(formData.get('specAminoAcids')), 10) || null
      : null,
    lotId: String(formData.get('lotId') ?? 'TBD').trim() || 'TBD',
    lotPurity: String(formData.get('lotPurity') ?? '').trim(),
    lotTestedDate: String(formData.get('lotTestedDate') ?? '').trim(),
    lotBud: String(formData.get('lotBud') ?? '').trim(),
    lotCoaUrl: emptyToNull(String(formData.get('lotCoaUrl') ?? '')),
    segment: tsSegment(String(formData.get('segment') ?? 'biohacker')),
    channel: tsChannel(String(formData.get('channel') ?? 'rua')),
    shopifySuspended: formData.get('shopifySuspended') === 'on',
    status: tsStatus(String(formData.get('status') ?? 'active')),
    imageUrl: emptyToNull(String(formData.get('imageUrl') ?? '')),
    images: parseImagesList(String(formData.get('images') ?? '')),
  };

  // Validate required fields
  if (!data.title) return { ok: false, error: 'Title is required.' };
  if (!data.compound) return { ok: false, error: 'Compound is required.' };
  if (!data.vialSize) return { ok: false, error: 'Vial size is required.' };
  if (data.priceCents <= 0) return { ok: false, error: 'Price must be greater than 0.' };

  // Bundles — JSON edit
  const bundlesRaw = String(formData.get('bundlesJson') ?? '').trim();
  if (bundlesRaw) {
    try {
      const parsed = JSON.parse(bundlesRaw);
      if (!Array.isArray(parsed)) {
        return { ok: false, error: 'Bundles must be a JSON array.' };
      }
      data.bundles = parsed;
    } catch {
      return { ok: false, error: 'Bundles JSON is invalid.' };
    }
  } else {
    data.bundles = null;
  }

  await prisma.product.update({ where: { handle }, data });

  revalidatePath('/admin/products');
  revalidatePath(`/admin/products/${handle}`);
  revalidatePath(`/products/${handle}`);
  revalidatePath('/catalog');
  return { ok: true, message: 'Product saved.' };
}

/* ─── Create product ─── */

export async function createProduct(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: 'Unauthorized' };

  const handle = String(formData.get('handle') ?? '').trim().toLowerCase();
  if (!handle || !/^[a-z0-9-]{2,60}$/.test(handle)) {
    return { ok: false, error: 'Handle: 2–60 chars, lowercase letters/numbers/hyphens.' };
  }

  const existing = await prisma.product.findUnique({ where: { handle } });
  if (existing) return { ok: false, error: `Handle "${handle}" already exists.` };

  await prisma.product.create({
    data: {
      handle,
      title: String(formData.get('title') ?? '').trim() || handle,
      compound: String(formData.get('compound') ?? '').trim() || handle,
      eyebrow: String(formData.get('eyebrow') ?? '').trim(),
      vialSize: String(formData.get('vialSize') ?? '').trim() || '5 mg',
      format: 'LYOPHILIZED',
      oneLiner: '',
      priceCents: 0,
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

  revalidatePath('/admin/products');
  redirect(`/admin/products/${handle}`);
}

/* ─── Delete product ─── */

export async function deleteProduct(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: 'Unauthorized' };
  const handle = String(formData.get('handle') ?? '').trim();
  if (!handle) return { ok: false, error: 'Missing handle' };

  await prisma.product.delete({ where: { handle } });

  revalidatePath('/admin/products');
  revalidatePath('/catalog');
  redirect('/admin/products');
}

/* ─── Image upload (Supabase Storage) ─── */

export type UploadImageResult =
  | { ok: true; publicUrl: string; field: 'imageUrl' | 'images' }
  | { ok: false; error: string };

/**
 * Upload a product image to Supabase Storage bucket `product-images`,
 * then immediately persist the resulting public URL onto the product
 * row. `field` controls whether the upload becomes the primary image
 * or appends to the gallery.
 *
 * The bucket must exist and be public-readable. Create it once in the
 * Supabase dashboard: Storage → New bucket → name `product-images` →
 * Public bucket ON.
 */
export async function uploadProductImage(formData: FormData): Promise<UploadImageResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: 'Unauthorized' };

  const handle = String(formData.get('handle') ?? '').trim();
  const field = (String(formData.get('field') ?? 'imageUrl') === 'images'
    ? 'images'
    : 'imageUrl') as 'imageUrl' | 'images';
  const file = formData.get('file') as File | null;

  if (!handle) return { ok: false, error: 'Missing handle.' };
  if (!file) return { ok: false, error: 'No file provided.' };
  if (file.size === 0) return { ok: false, error: 'Empty file.' };
  if (file.size > 8 * 1024 * 1024) return { ok: false, error: 'Max file size is 8 MB.' };

  const allowed = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
  if (!allowed.includes(file.type)) {
    return { ok: false, error: `Unsupported type ${file.type}. Use PNG / JPEG / WebP / SVG.` };
  }

  const ext =
    file.type === 'image/png'      ? 'png'  :
    file.type === 'image/jpeg'     ? 'jpg'  :
    file.type === 'image/webp'     ? 'webp' :
    file.type === 'image/svg+xml'  ? 'svg'  : 'bin';

  // Filename is `${handle}/${timestamp}-${random}.${ext}` — collision-free
  // and human-debuggable in the Supabase dashboard.
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  const objectPath = `${handle}/${ts}-${rand}.${ext}`;

  try {
    const sb = supabaseAdmin();
    const buf = Buffer.from(await file.arrayBuffer());
    const { error: upErr } = await sb.storage
      .from('product-images')
      .upload(objectPath, buf, {
        contentType: file.type,
        upsert: false,
      });
    if (upErr) {
      console.error('[uploadProductImage] supabase upload failed', upErr);
      return { ok: false, error: upErr.message || 'Upload failed.' };
    }
    const { data: pub } = sb.storage.from('product-images').getPublicUrl(objectPath);
    const publicUrl = pub.publicUrl;
    if (!publicUrl) return { ok: false, error: 'Could not resolve public URL.' };

    // Persist onto product row immediately
    if (field === 'imageUrl') {
      await prisma.product.update({
        where: { handle },
        data: { imageUrl: publicUrl },
      });
    } else {
      const existing = await prisma.product.findUnique({
        where: { handle },
        select: { images: true },
      });
      const nextImages = [...(existing?.images ?? []), publicUrl];
      await prisma.product.update({
        where: { handle },
        data: { images: nextImages },
      });
    }

    revalidatePath('/admin/products');
    revalidatePath(`/admin/products/${handle}`);
    revalidatePath(`/products/${handle}`);
    revalidatePath('/catalog');

    return { ok: true, publicUrl, field };
  } catch (err: any) {
    console.error('[uploadProductImage] threw', err);
    return { ok: false, error: err?.message || 'Upload failed unexpectedly.' };
  }
}

/* ─── helpers ─── */

function tsFormat(s: string): 'LYOPHILIZED' | 'RECONSTITUTED' {
  return s === 'reconstituted' ? 'RECONSTITUTED' : 'LYOPHILIZED';
}
function tsSegment(s: string): 'BIOHACKER' | 'CLINIC' | 'AESTHETIC' | 'ATHLETIC' | 'RESEARCHER' {
  const upper = s.toUpperCase();
  if (['CLINIC', 'AESTHETIC', 'ATHLETIC', 'RESEARCHER'].includes(upper)) return upper as any;
  return 'BIOHACKER';
}
function tsChannel(s: string): 'RUA' | 'CLINIC' | 'BOTH' {
  const upper = s.toUpperCase();
  if (upper === 'CLINIC' || upper === 'BOTH') return upper as any;
  return 'RUA';
}
function tsStatus(s: string): 'ACTIVE' | 'DRAFT' {
  return s === 'draft' ? 'DRAFT' : 'ACTIVE';
}
function dollarsToCents(s: string): number {
  const cleaned = s.replace(/[$,\s]/g, '');
  const n = parseFloat(cleaned);
  if (!isFinite(n)) return 0;
  return Math.round(n * 100);
}
function emptyToNull(s: string): string | null {
  const trimmed = s.trim();
  return trimmed === '' ? null : trimmed;
}
function parseImagesList(s: string): string[] {
  return s
    .split(/[\n,]+/)
    .map((url) => url.trim())
    .filter(Boolean);
}
