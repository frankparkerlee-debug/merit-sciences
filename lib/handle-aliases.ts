/**
 * Product handle forwarding.
 *
 * handle is Product's primary key and it leaks everywhere a product is
 * referenced by URL or by value: storefront links, emailed links, AI citations,
 * carts persisted in the buyer's localStorage, reorder tokens, abandoned-cart
 * snapshots. Renaming one without a forwarding record 404s every old link, and
 * because checkout prices server-side and fails CLOSED on a handle it cannot
 * resolve, any cart still holding the old handle becomes unpurchasable. That
 * exact failure took the PDP bac-water add-on down for two and a half weeks.
 *
 * Chains are collapsed when a rename is written, so resolution is one hop.
 */
import 'server-only';
import { prisma } from './db';
import {
  FAMILY_BY_HANDLE,
  PHARMACIST_NOTES,
  RESTOCK_SIGNALS,
  STACK_TEMPLATES,
} from './catalog-meta';
import { COUNTERPARTS } from './approved-counterparts';

export const HANDLE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Where a PUBLIC request for `handle` should go. Returns the current handle
 * for a forwarding alias, `handle` itself when it isn't retired, and null when
 * it was ORPHANED: the caller should 404 rather than reveal where it went.
 * Orphaning exists for handles whose name we want gone from the public record,
 * where a 308 would hand that name's association straight to the product.
 */
export async function resolvePublicHandle(handle: string): Promise<string | null> {
  const row = await prisma.productHandleAlias.findUnique({
    where: { oldHandle: handle },
    select: { newHandle: true, redirect: true },
  });
  if (!row) return handle;
  return row.redirect ? row.newHandle : null;
}

/**
 * Where `handle` points INTERNALLY, orphaned or not. For admin navigation and
 * anything that never produces a public response.
 */
export async function resolveHandle(handle: string): Promise<string> {
  const row = await prisma.productHandleAlias.findUnique({
    where: { oldHandle: handle },
    select: { newHandle: true },
  });
  return row?.newHandle ?? handle;
}

/**
 * Batch form for checkout: one query, returns old → current for any retired
 * handle, INCLUDING orphaned ones. Orphaning severs the public URL, not the
 * buyer's saved cart. Nothing here reaches a crawler.
 */
export async function resolveHandles(handles: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(handles.filter(Boolean))];
  if (unique.length === 0) return new Map();
  const rows = await prisma.productHandleAlias.findMany({
    where: { oldHandle: { in: unique } },
    select: { oldHandle: true, newHandle: true },
  });
  return new Map(rows.map((r) => [r.oldHandle, r.newHandle]));
}

/**
 * Places in SOURCE CODE that key on this handle literally. A database rename
 * cannot reach these, so the admin is told before renaming rather than
 * discovering afterwards that a stack stopped pricing or an email sequence
 * stopped sending.
 */
export function codeReferencesFor(handle: string): string[] {
  const refs: string[] = [];
  if (handle in FAMILY_BY_HANDLE) refs.push('catalog family mapping');
  if (handle in PHARMACIST_NOTES) refs.push('pharmacist note');
  if (handle in RESTOCK_SIGNALS) refs.push('restock message');
  for (const t of STACK_TEMPLATES) {
    if (t.handles.includes(handle)) refs.push(`stack "${t.name}"`);
  }
  if (handle in COUNTERPARTS) refs.push('approved-counterpart email sequence');
  return refs;
}
