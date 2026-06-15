'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-session';

export type ActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

/* ─── Suspend (deactivate) affiliate ─── */

export async function suspendAffiliate(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: 'Unauthorized' };

  const id = String(formData.get('id') ?? '').trim();
  const reason = String(formData.get('reason') ?? '').trim() || null;
  if (!id) return { ok: false, error: 'Missing id' };

  const affiliate = await prisma.affiliate.findUnique({ where: { id } });
  if (!affiliate) return { ok: false, error: 'Affiliate not found' };
  if (affiliate.status === 'SUSPENDED') return { ok: false, error: 'Already suspended.' };

  await prisma.affiliate.update({
    where: { id },
    data: {
      status: 'SUSPENDED',
      suspendedAt: new Date(),
      suspendReason: reason,
    },
  });

  revalidatePath('/admin/affiliates');
  revalidatePath(`/admin/affiliates/${id}`);
  revalidatePath('/admin/discounts');
  return { ok: true, message: 'Affiliate suspended. They can no longer earn commissions; their discount code stops working.' };
}

/* ─── Reactivate affiliate ─── */

export async function reactivateAffiliate(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: 'Unauthorized' };

  const id = String(formData.get('id') ?? '').trim();
  if (!id) return { ok: false, error: 'Missing id' };

  const affiliate = await prisma.affiliate.findUnique({ where: { id } });
  if (!affiliate) return { ok: false, error: 'Affiliate not found' };
  if (affiliate.status === 'ACTIVE') return { ok: false, error: 'Already active.' };

  await prisma.affiliate.update({
    where: { id },
    data: {
      status: 'ACTIVE',
      suspendedAt: null,
      suspendReason: null,
    },
  });

  revalidatePath('/admin/affiliates');
  revalidatePath(`/admin/affiliates/${id}`);
  revalidatePath('/admin/discounts');
  return { ok: true, message: 'Affiliate reactivated.' };
}

/* ─── Delete affiliate ─── */
/**
 * Hard delete only if the affiliate has no history (no commissions, no
 * customer locks, no payouts). When there IS history, refuse with a
 * pointer to Suspend instead — deleting would either lose the audit
 * trail or break foreign keys.
 */
export async function deleteAffiliate(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: 'Unauthorized' };

  const id = String(formData.get('id') ?? '').trim();
  if (!id) return { ok: false, error: 'Missing id' };

  const affiliate = await prisma.affiliate.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          orderCommissions: true,
          customerLinks: true,
          payouts: true,
          clicks: true,
        },
      },
    },
  });
  if (!affiliate) return { ok: false, error: 'Affiliate not found' };

  const { orderCommissions, customerLinks, payouts } = affiliate._count;
  if (orderCommissions > 0 || customerLinks > 0 || payouts > 0) {
    return {
      ok: false,
      error: `Cannot delete — this affiliate has ${orderCommissions} commission(s), ${customerLinks} locked customer(s), and ${payouts} payout(s). Suspend them instead to preserve audit history.`,
    };
  }

  // Safe to delete — also clean up click records (no FK constraint elsewhere)
  await prisma.$transaction([
    prisma.click.deleteMany({ where: { affiliateId: id } }),
    prisma.affiliate.delete({ where: { id } }),
  ]);

  revalidatePath('/admin/affiliates');
  revalidatePath('/admin/discounts');
  redirect('/admin/affiliates');
}
