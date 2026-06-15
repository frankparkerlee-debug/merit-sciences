'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-session';

export type BulkRow = {
  handle: string;
  status: 'active' | 'draft';
  stockQty: number;
  priceCents: number;
  physicianPriceCents: number | null;
  costCents: number | null;
  imageUrl: string | null;
};

export type BulkSaveResult =
  | { ok: true; updated: number; skipped: number }
  | { ok: false; error: string };

/**
 * Apply a batch of row edits in one transaction. Only writes when at
 * least one field actually changed vs the current DB row — keeps the
 * audit log clean and avoids triggering stale-cache invalidations on
 * untouched products.
 */
export async function saveBulkProductChanges(rows: BulkRow[]): Promise<BulkSaveResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: 'Unauthorized' };

  if (!Array.isArray(rows) || rows.length === 0) {
    return { ok: false, error: 'No rows to save.' };
  }

  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    if (!row.handle) {
      skipped++;
      continue;
    }
    const current = await prisma.product.findUnique({
      where: { handle: row.handle },
      select: {
        status: true,
        stockQty: true,
        priceCents: true,
        physicianPriceCents: true,
        costCents: true,
        imageUrl: true,
      },
    });
    if (!current) {
      skipped++;
      continue;
    }

    const data: Record<string, unknown> = {};
    const nextStatus = row.status === 'active' ? 'ACTIVE' : 'DRAFT';
    if (current.status !== nextStatus) data.status = nextStatus;
    if (current.stockQty !== row.stockQty) data.stockQty = row.stockQty;
    if (current.priceCents !== row.priceCents) data.priceCents = row.priceCents;
    if (current.physicianPriceCents !== row.physicianPriceCents) {
      data.physicianPriceCents = row.physicianPriceCents;
    }
    if (current.costCents !== row.costCents) data.costCents = row.costCents;
    if ((current.imageUrl ?? null) !== (row.imageUrl ?? null)) {
      data.imageUrl = row.imageUrl;
    }

    if (Object.keys(data).length === 0) {
      skipped++;
      continue;
    }
    await prisma.product.update({ where: { handle: row.handle }, data });
    updated++;
  }

  revalidatePath('/admin/products');
  revalidatePath('/admin/products/bulk');
  revalidatePath('/catalog');
  return { ok: true, updated, skipped };
}
