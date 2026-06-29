'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-session';
import { supabaseAdmin } from '@/lib/supabase';

export type CoaActionResult = { ok: true; message: string } | { ok: false; error: string };

/**
 * Upload a COA PDF to the `coas` Supabase Storage bucket + persist a Coa row.
 * Bucket must exist and be public. Mirrors the product-image upload pattern.
 */
export async function uploadCoa(_prev: CoaActionResult | null, fd: FormData): Promise<CoaActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: 'Unauthorized' };

  const compound = String(fd.get('compound') ?? '').trim();
  const lotId = String(fd.get('lotId') ?? '').trim();
  const purity = String(fd.get('purity') ?? '').trim();
  const testedDate = String(fd.get('testedDate') ?? '').trim();
  const productHandle = String(fd.get('productHandle') ?? '').trim() || null;
  const file = fd.get('file');

  if (!compound || !lotId || !purity || !testedDate) {
    return { ok: false, error: 'Compound, lot, purity, and tested date are all required.' };
  }
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: 'Attach the COA PDF.' };
  }
  if (file.type !== 'application/pdf') {
    return { ok: false, error: 'The COA must be a PDF.' };
  }
  if (file.size > 15 * 1024 * 1024) {
    return { ok: false, error: 'Max file size is 15 MB.' };
  }

  try {
    const sb = supabaseAdmin();
    const ts = Date.now();
    const rand = Math.random().toString(36).slice(2, 8);
    const safeLot = lotId.replace(/[^a-zA-Z0-9._-]/g, '_');
    const objectPath = `${safeLot}/${ts}-${rand}.pdf`;
    const buf = Buffer.from(await file.arrayBuffer());

    const { error: upErr } = await sb.storage
      .from('coas')
      .upload(objectPath, buf, { contentType: 'application/pdf', upsert: false });
    if (upErr) {
      console.error('[uploadCoa] storage upload failed', upErr);
      return { ok: false, error: `Upload failed: ${upErr.message}. Is the "coas" bucket created + public?` };
    }
    const { data: pub } = sb.storage.from('coas').getPublicUrl(objectPath);
    if (!pub.publicUrl) return { ok: false, error: 'Could not resolve the public URL.' };

    await prisma.coa.create({
      data: { compound, lotId, purity, testedDate, productHandle, fileUrl: pub.publicUrl, fileName: file.name },
    });

    revalidatePath('/admin/coa');
    revalidatePath('/coa');
    return { ok: true, message: `Published COA for ${compound} (lot ${lotId}).` };
  } catch (err: any) {
    console.error('[uploadCoa] failed', err);
    return { ok: false, error: err?.message ?? 'Upload failed — confirm the "coas" table + bucket exist.' };
  }
}

export async function deleteCoa(id: string): Promise<CoaActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: 'Unauthorized' };
  try {
    await prisma.coa.delete({ where: { id } });
    revalidatePath('/admin/coa');
    revalidatePath('/coa');
    return { ok: true, message: 'Removed.' };
  } catch (err: any) {
    return { ok: false, error: err?.message ?? 'Delete failed.' };
  }
}
