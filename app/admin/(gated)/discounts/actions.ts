'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-session';
import { validateCodeFormat } from '@/lib/code-rules';

export type ActionResult =
  | { ok: true; message: string; redirectTo?: string }
  | { ok: false; error: string };

/**
 * POST a new discount. Validates inputs, normalizes code to lowercase,
 * converts percent→basis points and dollar amount→cents, and writes
 * the row. Throws redirect on success so the form posts via server
 * action and lands on the list page.
 */
export async function createDiscount(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: 'Unauthorized' };

  const code = String(formData.get('code') ?? '').trim().toLowerCase();
  const title = String(formData.get('title') ?? '').trim() || null;
  const typeInput = String(formData.get('type') ?? 'PERCENT');
  const valueInput = String(formData.get('value') ?? '').trim();
  const methodInput = String(formData.get('method') ?? 'CODE');
  const minPurchaseInput = String(formData.get('minPurchase') ?? '').trim();
  const minQuantityInput = String(formData.get('minQuantity') ?? '').trim();
  const maxUsesInput = String(formData.get('maxUses') ?? '').trim();
  const oncePerCustomer = formData.get('oncePerCustomer') === 'on';
  const freeShipping = formData.get('freeShipping') === 'on';
  const customerEmail = String(formData.get('customerEmail') ?? '').trim().toLowerCase() || null;
  const startsAtInput = String(formData.get('startsAt') ?? '').trim();
  const endsAtInput = String(formData.get('endsAt') ?? '').trim();

  // Validate code format + blocklist
  const codeFormatErr = validateCodeFormat(code);
  if (codeFormatErr) return { ok: false, error: codeFormatErr };

  // Validate type + value
  if (!['PERCENT', 'FIXED_AMOUNT', 'FREE_SHIPPING'].includes(typeInput)) {
    return { ok: false, error: 'Invalid discount type.' };
  }
  const type = typeInput as 'PERCENT' | 'FIXED_AMOUNT' | 'FREE_SHIPPING';

  let value = 0;
  if (type === 'PERCENT') {
    const pct = parseFloat(valueInput.replace(/[%\s]/g, ''));
    if (!isFinite(pct) || pct <= 0 || pct > 100) {
      return { ok: false, error: 'Percent must be between 0 and 100.' };
    }
    // Store as basis points: 25% → 2500
    value = Math.round(pct * 100);
  } else if (type === 'FIXED_AMOUNT') {
    const dollars = parseFloat(valueInput.replace(/[$,\s]/g, ''));
    if (!isFinite(dollars) || dollars <= 0) {
      return { ok: false, error: 'Amount must be a positive number.' };
    }
    value = Math.round(dollars * 100);
  }
  // FREE_SHIPPING → value stays 0

  // Validate method
  if (!['CODE', 'AUTOMATIC'].includes(methodInput)) {
    return { ok: false, error: 'Invalid method.' };
  }
  const method = methodInput as 'CODE' | 'AUTOMATIC';

  // Optional limits
  const minPurchaseCents = minPurchaseInput
    ? Math.round(parseFloat(minPurchaseInput.replace(/[$,\s]/g, '')) * 100)
    : null;
  if (minPurchaseCents !== null && (!isFinite(minPurchaseCents) || minPurchaseCents < 0)) {
    return { ok: false, error: 'Invalid minimum purchase amount.' };
  }

  const minQuantity = minQuantityInput ? parseInt(minQuantityInput, 10) : null;
  if (minQuantity !== null && (!isFinite(minQuantity) || minQuantity < 1)) {
    return { ok: false, error: 'Minimum quantity must be at least 1.' };
  }

  const maxUses = maxUsesInput ? parseInt(maxUsesInput, 10) : null;
  if (maxUses !== null && (!isFinite(maxUses) || maxUses < 1)) {
    return { ok: false, error: 'Max uses must be at least 1.' };
  }

  // Dates
  const startsAt = startsAtInput ? new Date(startsAtInput) : new Date();
  if (isNaN(startsAt.getTime())) return { ok: false, error: 'Invalid start date.' };
  const endsAt = endsAtInput ? new Date(endsAtInput) : null;
  if (endsAt && isNaN(endsAt.getTime())) return { ok: false, error: 'Invalid end date.' };
  if (endsAt && endsAt <= startsAt) {
    return { ok: false, error: 'End date must be after start date.' };
  }

  // Check uniqueness — code is enforced unique at DB level, but pre-check
  // gives a nicer error than a P2002.
  const existing = await prisma.discount.findUnique({ where: { code } });
  if (existing) return { ok: false, error: `Code "${code}" already exists.` };

  await prisma.discount.create({
    data: {
      code,
      title,
      type,
      value,
      method,
      minPurchaseCents: minPurchaseCents !== null ? BigInt(minPurchaseCents) : null,
      minQuantity,
      maxUses,
      oncePerCustomer,
      freeShipping,
      customerEmail,
      startsAt,
      endsAt,
      status: 'ACTIVE',
      createdByEmail: admin.email,
    },
  });

  revalidatePath('/admin/discounts');
  redirect('/admin/discounts');
}

/* ─── Update existing discount ─── */

export async function updateDiscount(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: 'Unauthorized' };

  const code = String(formData.get('code') ?? '').trim().toLowerCase();
  if (!code) return { ok: false, error: 'Missing code' };

  const existing = await prisma.discount.findUnique({ where: { code } });
  if (!existing) return { ok: false, error: 'Discount not found' };

  // Same parsing as createDiscount — keep these in lockstep so the
  // basis-points math (PERCENT input × 100) and cents math (FIXED_AMOUNT
  // input × 100) match. If you change one, change the other.
  const title = String(formData.get('title') ?? '').trim() || null;
  const typeInput = String(formData.get('type') ?? existing.type);
  const valueInput = String(formData.get('value') ?? '').trim();
  const methodInput = String(formData.get('method') ?? existing.method);
  const minPurchaseInput = String(formData.get('minPurchase') ?? '').trim();
  const minQuantityInput = String(formData.get('minQuantity') ?? '').trim();
  const maxUsesInput = String(formData.get('maxUses') ?? '').trim();
  const oncePerCustomer = formData.get('oncePerCustomer') === 'on';
  const freeShipping = formData.get('freeShipping') === 'on';
  const customerEmail = String(formData.get('customerEmail') ?? '').trim().toLowerCase() || null;
  const startsAtInput = String(formData.get('startsAt') ?? '').trim();
  const endsAtInput = String(formData.get('endsAt') ?? '').trim();

  if (!['PERCENT', 'FIXED_AMOUNT', 'FREE_SHIPPING'].includes(typeInput)) {
    return { ok: false, error: 'Invalid discount type.' };
  }
  const type = typeInput as 'PERCENT' | 'FIXED_AMOUNT' | 'FREE_SHIPPING';

  let value = 0;
  if (type === 'PERCENT') {
    const pct = parseFloat(valueInput.replace(/[%\s]/g, ''));
    if (!isFinite(pct) || pct <= 0 || pct > 100) {
      return { ok: false, error: 'Percent must be between 0 and 100.' };
    }
    // Store as basis points: 25% → 2500, 100% → 10000
    value = Math.round(pct * 100);
  } else if (type === 'FIXED_AMOUNT') {
    const dollars = parseFloat(valueInput.replace(/[$,\s]/g, ''));
    if (!isFinite(dollars) || dollars <= 0) {
      return { ok: false, error: 'Amount must be a positive number.' };
    }
    value = Math.round(dollars * 100);
  }

  if (!['CODE', 'AUTOMATIC'].includes(methodInput)) {
    return { ok: false, error: 'Invalid method.' };
  }
  const method = methodInput as 'CODE' | 'AUTOMATIC';

  const minPurchaseCents = minPurchaseInput
    ? Math.round(parseFloat(minPurchaseInput.replace(/[$,\s]/g, '')) * 100)
    : null;
  const minQuantity = minQuantityInput ? parseInt(minQuantityInput, 10) : null;
  const maxUses = maxUsesInput ? parseInt(maxUsesInput, 10) : null;

  const startsAt = startsAtInput ? new Date(startsAtInput) : existing.startsAt;
  if (isNaN(startsAt.getTime())) return { ok: false, error: 'Invalid start date.' };
  const endsAt = endsAtInput ? new Date(endsAtInput) : null;
  if (endsAt && isNaN(endsAt.getTime())) return { ok: false, error: 'Invalid end date.' };
  if (endsAt && endsAt <= startsAt) {
    return { ok: false, error: 'End date must be after start date.' };
  }

  await prisma.discount.update({
    where: { code },
    data: {
      title,
      type,
      value,
      method,
      minPurchaseCents: minPurchaseCents !== null ? BigInt(minPurchaseCents) : null,
      minQuantity,
      maxUses,
      oncePerCustomer,
      freeShipping,
      customerEmail,
      startsAt,
      endsAt,
    },
  });

  revalidatePath('/admin/discounts');
  revalidatePath(`/admin/discounts/${encodeURIComponent(code)}`);
  return { ok: true, message: 'Discount updated.' };
}

/* ─── Toggle discount enabled / disabled ─── */

export async function toggleDiscount(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: 'Unauthorized' };
  const code = String(formData.get('code') ?? '').trim().toLowerCase();
  if (!code) return { ok: false, error: 'Missing code' };

  const existing = await prisma.discount.findUnique({ where: { code } });
  if (!existing) return { ok: false, error: 'Discount not found' };

  const newStatus = existing.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
  await prisma.discount.update({
    where: { code },
    data: { status: newStatus },
  });

  revalidatePath('/admin/discounts');
  revalidatePath(`/admin/discounts/${encodeURIComponent(code)}`);
  return { ok: true, message: newStatus === 'ACTIVE' ? 'Discount re-enabled.' : 'Discount disabled.' };
}

/* ─── Delete discount ─── */

export async function deleteDiscount(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: 'Unauthorized' };
  const code = String(formData.get('code') ?? '').trim().toLowerCase();
  if (!code) return { ok: false, error: 'Missing code' };

  await prisma.discount.delete({ where: { code } });

  revalidatePath('/admin/discounts');
  redirect('/admin/discounts');
}
