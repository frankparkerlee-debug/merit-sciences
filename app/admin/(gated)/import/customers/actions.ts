'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-session';
import { parseCsvWithHeaders } from '../csv-util';

export type ActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

export type ParsedCustomer = {
  email: string;
  firstName: string | null;
  lastName: string | null;
  fullName: string;
  phone: string | null;
  address1: string | null;
  address2: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  zip: string | null;
  acceptsEmail: boolean;
  totalSpentCents: number;
  totalOrders: number;
  tags: string[];
  // Classification — drives which destination table
  classification: 'customer' | 'affiliate' | 'newsletter_only' | 'skip';
};

export type CustomerDiff = {
  rows: Array<{
    row: ParsedCustomer;
    existingId: string | null;       // existing Customer.id if match found
    action: 'create' | 'update' | 'skip-affiliate' | 'skip-newsletter';
    reason?: string;
  }>;
  totalRows: number;
  toCreate: number;
  toUpdate: number;
  skippedAffiliate: number;
  skippedNewsletter: number;
};

export async function parseCustomersCsv(_prev: any, formData: FormData): Promise<CustomerDiff | { error: string }> {
  const admin = await requireAdmin();
  if (!admin) return { error: 'Unauthorized' };

  const file = formData.get('csv');
  if (!(file instanceof File)) return { error: 'No file uploaded' };
  if (file.size === 0) return { error: 'File is empty' };
  if (file.size > 5 * 1024 * 1024) return { error: 'File too large (max 5MB)' };

  const text = await file.text();
  const rows = parseCsvWithHeaders(text);
  if (rows.length === 0) return { error: 'No data rows found in CSV. Check the column layout.' };

  // Pre-fetch every existing Customer keyed by email for fast match
  const existing = await prisma.customer.findMany({
    select: { id: true, email: true },
  });
  const existingByEmail = new Map(existing.map((c) => [c.email.toLowerCase(), c.id]));

  const parsed: ParsedCustomer[] = [];
  for (const row of rows) {
    const email = (row['Email'] ?? '').trim().toLowerCase();
    if (!email) continue;

    const tags = (row['Tags'] ?? '')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const classification = classify(tags, row);

    parsed.push({
      email,
      firstName: emptyToNull(row['First Name']),
      lastName: emptyToNull(row['Last Name']),
      fullName: `${row['First Name'] ?? ''} ${row['Last Name'] ?? ''}`.trim() || email.split('@')[0],
      phone: emptyToNull(row['Default Address Phone'] ?? row['Phone']),
      address1: emptyToNull(row['Default Address Address1']),
      address2: emptyToNull(row['Default Address Address2']),
      city: emptyToNull(row['Default Address City']),
      state: emptyToNull(row['Default Address Province Code']),
      country: emptyToNull(row['Default Address Country Code']),
      zip: emptyToNull(row['Default Address Zip']),
      acceptsEmail: (row['Accepts Email Marketing'] ?? '').toLowerCase() === 'yes',
      totalSpentCents: Math.round(parseFloat(row['Total Spent'] ?? '0') * 100) || 0,
      totalOrders: parseInt(row['Total Orders'] ?? '0', 10) || 0,
      tags,
      classification,
    });
  }

  const diff: CustomerDiff = {
    rows: [],
    totalRows: parsed.length,
    toCreate: 0,
    toUpdate: 0,
    skippedAffiliate: 0,
    skippedNewsletter: 0,
  };

  for (const row of parsed) {
    if (row.classification === 'affiliate') {
      diff.rows.push({ row, existingId: null, action: 'skip-affiliate', reason: 'Bixgrow affiliate tag — manage via /admin/affiliates' });
      diff.skippedAffiliate++;
      continue;
    }
    if (row.classification === 'newsletter_only') {
      diff.rows.push({ row, existingId: null, action: 'skip-newsletter', reason: 'Newsletter-only signup (no orders)' });
      diff.skippedNewsletter++;
      continue;
    }
    const existingId = existingByEmail.get(row.email) ?? null;
    if (existingId) {
      diff.rows.push({ row, existingId, action: 'update' });
      diff.toUpdate++;
    } else {
      diff.rows.push({ row, existingId: null, action: 'create' });
      diff.toCreate++;
    }
  }

  return diff;
}

export async function applyCustomersCsv(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: 'Unauthorized' };

  const raw = String(formData.get('diff') ?? '');
  if (!raw) return { ok: false, error: 'Missing diff payload' };
  let diff: CustomerDiff;
  try {
    diff = JSON.parse(raw) as CustomerDiff;
  } catch {
    return { ok: false, error: 'Invalid diff payload' };
  }

  let created = 0;
  let updated = 0;
  let errors = 0;

  for (const r of diff.rows) {
    if (r.action !== 'create' && r.action !== 'update') continue;
    try {
      if (r.action === 'create') {
        await prisma.customer.create({
          data: {
            email: r.row.email,
            name: r.row.fullName,
            phone: r.row.phone,
          },
        });
        created++;
      } else if (r.existingId) {
        await prisma.customer.update({
          where: { id: r.existingId },
          data: {
            name: r.row.fullName,
            phone: r.row.phone ?? undefined,
          },
        });
        updated++;
      }
    } catch (err) {
      console.error('[customer-import] failed', r.row.email, err);
      errors++;
    }
  }

  revalidatePath('/admin/customers');
  const errorTail = errors > 0 ? ` ⚠ ${errors} failed (see Render logs).` : '';
  return { ok: true, message: `Created ${created}, updated ${updated} customers.${errorTail}` };
}

/* ─── Classification logic ─── */

function classify(tags: string[], row: Record<string, string>): ParsedCustomer['classification'] {
  const tagSet = new Set(tags.map((t) => t.toLowerCase()));
  // Bixgrow affiliate users are managed in /admin/affiliates, not customers
  if (tagSet.has('bixgrow_affiliate')) return 'affiliate';

  const totalOrders = parseInt(row['Total Orders'] ?? '0', 10) || 0;
  const tagsLower = tags.join(' ').toLowerCase();
  // Newsletter-only: tagged "newsletter" / "popup-signup" / "discount-10" but never ordered
  const isNewsletterTag =
    tagSet.has('newsletter') ||
    tagSet.has('popup-signup') ||
    tagSet.has('discount-10') ||
    tagsLower.includes('newsletter');
  if (isNewsletterTag && totalOrders === 0) return 'newsletter_only';

  return 'customer';
}

function emptyToNull(s: string | undefined | null): string | null {
  const trimmed = (s ?? '').trim();
  return trimmed === '' ? null : trimmed;
}
