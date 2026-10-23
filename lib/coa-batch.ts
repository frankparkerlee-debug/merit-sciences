/**
 * Batch labels and current/earlier classification for certificates of analysis.
 *
 * Merit identifies releases by batch date, not by lot number (Parker,
 * 2026-10-22: "We do not use lot numbers, we use batch dates. Currently we
 * are on the July batch."). The lab's own identifiers (lotId, coaNumber) are
 * printed on the signed PDF, so they stay visible as a secondary "Lab
 * reference", but the customer-facing name of a certificate is its batch:
 * "July 2026 batch".
 *
 * Everything here is derived at read time from existing columns; nothing is
 * written back to the database.
 *
 *   batch      the month of testing (testedDate), with a small override table
 *              for test runs that finished just after the month closed;
 *              createdAt month when testedDate is missing.
 *   group      one sellable product: certificates whose compound strings
 *              normalize to the same name and size, joined through
 *              productHandle where one is set.
 *   current    the certificate belongs to its group's most recent batch.
 *   archived   an earlier batch of the same group (or a retired legacy
 *              certificate). Archived pages stay live (QR codes and links keep
 *              working) but are noindex and left out of the sitemap and
 *              llms.txt.
 *
 * When grouping is ambiguous the code fails OPEN: the certificate keeps its
 * own group and therefore stays current and visible.
 *
 * Pure functions only (no server-only import), so pages, the sitemap and
 * route handlers can all share it.
 */

export type BatchRow = {
  id: string;
  compound: string;
  productHandle?: string | null;
  lotId: string;
  coaNumber?: string | null;
  testedDate: string | null;
  /** Date from Prisma, ISO string when it has passed through the data cache. */
  createdAt: Date | string;
  retiredAt?: Date | string | null;
};

export type BatchStatus = 'current' | 'archived';

export type BatchGroup<T extends BatchRow> = {
  key: string;
  /** Display name: the compound string of the newest current certificate. */
  name: string;
  /** Most recent batch among non-retired certificates, e.g. "2026-07". */
  currentBatchKey: string | null;
  currentBatchLabel: string | null;
  /** Non-retired certificates in the most recent batch, newest test first. */
  current: T[];
  /** Non-retired certificates from earlier batches, newest first. */
  archived: T[];
  /** Retired legacy certificates that belong to this group. */
  retired: T[];
  /** True when a sizeless compound string could not be matched to one size. */
  failedOpen: boolean;
};

export type ClassifiedCoa<T extends BatchRow> = {
  row: T;
  group: BatchGroup<T>;
  batchKey: string;
  batchLabel: string;
  status: BatchStatus;
  retired: boolean;
};

export type BatchIndex<T extends BatchRow> = {
  groups: BatchGroup<T>[];
  byId: Map<string, ClassifiedCoa<T>>;
  /** Group keys where grouping was ambiguous and the code kept rows visible. */
  failedOpen: string[];
};

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * Test runs that finished just after their batch month closed. The July 2026
 * batch's panel completed on 2026-08-01; those certificates belong to July.
 */
const BATCH_DATE_OVERRIDES: { from: string; to: string; batch: string }[] = [
  { from: '2026-08-01', to: '2026-08-05', batch: '2026-07' },
];

function isoDay(v: Date | string | null | undefined): string | null {
  if (!v) return null;
  if (typeof v === 'string') {
    const m = v.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  }
  const d = v instanceof Date ? v : new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

/** "YYYY-MM" batch key for a certificate. */
export function batchKeyOf(row: Pick<BatchRow, 'testedDate' | 'createdAt'>): string {
  const day = isoDay(row.testedDate) ?? isoDay(row.createdAt);
  if (!day) return '0000-00';
  for (const o of BATCH_DATE_OVERRIDES) {
    if (day >= o.from && day <= o.to) return o.batch;
  }
  return day.slice(0, 7);
}

/** "July 2026" for a batch key. */
export function batchMonthLabel(key: string): string {
  const [y, m] = key.split('-').map((n) => parseInt(n, 10));
  if (!y || !m || m < 1 || m > 12) return 'Undated';
  return `${MONTHS[m - 1]} ${y}`;
}

/** "July 2026 batch" for a certificate. */
export function batchLabelOf(row: Pick<BatchRow, 'testedDate' | 'createdAt'>): string {
  const key = batchKeyOf(row);
  return key === '0000-00' ? 'Undated batch' : `${batchMonthLabel(key)} batch`;
}

const SIZE_RE = /(\d+(?:\.\d+)?)\s*(mg|mcg|ml|iu)\b/gi;

/**
 * Normalized compound name and size. "GLOW 70mg" -> { base: "glow", size:
 * "70mg" }; "BPC-157 + TB-500 (Wolverine)" -> { base: "bpc-157+tb-500",
 * size: null }; "CJC-1295 / Ipamorelin 20mg" -> { base: "cjc-1295+ipamorelin",
 * size: "20mg" }.
 */
export function compoundKey(compound: string): { base: string; size: string | null } {
  let s = compound.toLowerCase().replace(/\([^)]*\)/g, ' ');
  const sizes: string[] = [];
  s = s.replace(SIZE_RE, (_m, n: string, u: string) => {
    sizes.push(`${parseFloat(n)}${u.toLowerCase()}`);
    return ' ';
  });
  const base = s
    .replace(/\s*[/+]\s*/g, '+')
    .replace(/\s+/g, ' ')
    .trim();
  return { base, size: sizes.length ? sizes.join('+') : null };
}

function ts(v: Date | string | null | undefined): number {
  if (!v) return 0;
  const t = (v instanceof Date ? v : new Date(v)).getTime();
  return isNaN(t) ? 0 : t;
}

/** Newest test first, then newest record. */
function newestFirst<T extends BatchRow>(a: T, b: T): number {
  const da = isoDay(a.testedDate) ?? isoDay(a.createdAt) ?? '';
  const db = isoDay(b.testedDate) ?? isoDay(b.createdAt) ?? '';
  if (da !== db) return da < db ? 1 : -1;
  return ts(b.createdAt) - ts(a.createdAt);
}

/**
 * Groups certificates by product and marks each one current or archived.
 *
 * @param knownHandles optional set of real product handles. When given, a
 *   productHandle outside the set is ignored for grouping (the normalized
 *   compound key still applies).
 */
export function classifyCoas<T extends BatchRow>(
  rows: T[],
  knownHandles?: Set<string>,
): BatchIndex<T> {
  // Union-find over rows.
  const parent = rows.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const union = (a: number, b: number) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[rb] = ra;
  };

  const keys = rows.map((r) => compoundKey(r.compound));

  // 1. Same base and size.
  const firstByKey = new Map<string, number>();
  keys.forEach((k, i) => {
    const id = `${k.base}|${k.size ?? ''}`;
    const seen = firstByKey.get(id);
    if (seen === undefined) firstByKey.set(id, i);
    else union(seen, i);
  });

  // 2. Same real product handle.
  const firstByHandle = new Map<string, number>();
  rows.forEach((r, i) => {
    const h = r.productHandle?.trim();
    if (!h || (knownHandles && !knownHandles.has(h))) return;
    const seen = firstByHandle.get(h);
    if (seen === undefined) firstByHandle.set(h, i);
    else union(seen, i);
  });

  // 3. A sizeless compound string ("GLOW") joins its base's sized group when
  //    the base has exactly one size on record. With several sizes it is
  //    ambiguous which product it was, so it keeps its own group (fail open).
  const sizesByBase = new Map<string, Set<string>>();
  keys.forEach((k) => {
    if (!k.size) return;
    if (!sizesByBase.has(k.base)) sizesByBase.set(k.base, new Set());
    sizesByBase.get(k.base)!.add(k.size);
  });
  const ambiguous = new Set<number>();
  keys.forEach((k, i) => {
    if (k.size) return;
    const sizes = sizesByBase.get(k.base);
    if (!sizes || sizes.size === 0) return;
    if (sizes.size === 1) {
      const only = Array.from(sizes)[0];
      const target = firstByKey.get(`${k.base}|${only}`);
      if (target !== undefined) union(target, i);
    } else {
      ambiguous.add(i);
    }
  });

  // Collect groups.
  const members = new Map<number, number[]>();
  rows.forEach((_, i) => {
    const root = find(i);
    if (!members.has(root)) members.set(root, []);
    members.get(root)!.push(i);
  });

  const groups: BatchGroup<T>[] = [];
  const byId = new Map<string, ClassifiedCoa<T>>();
  const failedOpen: string[] = [];

  for (const idxs of Array.from(members.values())) {
    const live = idxs.filter((i) => !rows[i].retiredAt).map((i) => rows[i]).sort(newestFirst);
    const retired = idxs.filter((i) => rows[i].retiredAt).map((i) => rows[i]).sort(newestFirst);
    let currentBatchKey: string | null = null;
    for (const r of live) {
      const k = batchKeyOf(r);
      if (currentBatchKey === null || k > currentBatchKey) currentBatchKey = k;
    }
    const current = live.filter((r) => batchKeyOf(r) === currentBatchKey);
    const archived = live.filter((r) => batchKeyOf(r) !== currentBatchKey);
    const lead = current[0] ?? retired[0] ?? rows[idxs[0]];
    const k0 = keys[idxs[0]];
    const group: BatchGroup<T> = {
      key: `${k0.base}|${k0.size ?? ''}`,
      name: lead.compound,
      currentBatchKey,
      currentBatchLabel: currentBatchKey ? `${batchMonthLabel(currentBatchKey)} batch` : null,
      current,
      archived,
      retired,
      failedOpen: idxs.some((i) => ambiguous.has(i)),
    };
    if (group.failedOpen) failedOpen.push(group.key);
    groups.push(group);

    for (const i of idxs) {
      const r = rows[i];
      const isRetired = Boolean(r.retiredAt);
      byId.set(r.id, {
        row: r,
        group,
        batchKey: batchKeyOf(r),
        batchLabel: batchLabelOf(r),
        status: !isRetired && batchKeyOf(r) === currentBatchKey ? 'current' : 'archived',
        retired: isRetired,
      });
    }
  }

  groups.sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));
  return { groups, byId, failedOpen };
}

/**
 * Stable public path for a certificate. A lot reference shared by several
 * certificates renders an index at its own URL, so those certificates use the
 * certificate number; a single-certificate reference uses the lot reference
 * (its certificate-number alias 308s there). Unchanged from the URLs already
 * printed in QR codes and links.
 */
export function certificatePath(
  row: Pick<BatchRow, 'lotId' | 'coaNumber'>,
  lotCounts: Map<string, number>,
): string {
  const shared = (lotCounts.get(row.lotId.toLowerCase()) ?? 0) > 1;
  return `/coa/${encodeURIComponent(row.coaNumber && shared ? row.coaNumber : row.lotId)}`;
}

/** Certificates per lot reference (case-insensitive), across all rows. */
export function countLots(rows: Pick<BatchRow, 'lotId'>[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of rows) m.set(r.lotId.toLowerCase(), (m.get(r.lotId.toLowerCase()) ?? 0) + 1);
  return m;
}

/** "COA-2026-HENG1L · LOT2026-06-0001": the identifiers printed on the lab PDF. */
export function labReference(row: Pick<BatchRow, 'lotId' | 'coaNumber'>): string {
  return [row.coaNumber, row.lotId].filter(Boolean).join(' · ');
}
