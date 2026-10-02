import 'server-only';
import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { prisma } from './db';

/**
 * Cached reads of the certificate library.
 *
 * Certificates change when an admin publishes or deletes one, a few times a
 * month. Until 2026-10-02 every public page that showed one (home receipt
 * panel, /coa, /coa/[lot], /practitioners, the ads lander) ran its own raw
 * Prisma query on every request against a database in us-east-1 from a
 * server in Oregon, over a connection string that allowed one connection at
 * a time. That was most of the 0.7 to 1.4 s time-to-first-byte on those
 * pages. These readers sit in Next's data cache for five minutes and are
 * busted instantly by revalidateTag(COAS_TAG) from the admin COA actions.
 *
 * Only successful results are cached: a thrown Prisma error propagates out
 * of unstable_cache uncached, so a transient blip cannot pin an empty
 * result for the whole window. Callers keep their own try/catch.
 */
export const COAS_TAG = 'coas';
const REVALIDATE_SECONDS = 300;

/* Water is released on a sterility and preservative assay, not HPLC, so its
   purity column is benzyl alcohol content. It must never be the headline
   purity figure anywhere. */
const NOT_WATER = {
  NOT: [
    { compound: { contains: 'water', mode: 'insensitive' as const } },
    { compound: { contains: 'bacteriostatic', mode: 'insensitive' as const } },
  ],
};

/** Newest published certificate (never water). Home receipt panel and
 *  /practitioners assay panel. */
export const getLatestLot = unstable_cache(
  async () =>
    prisma.coa.findFirst({
      where: NOT_WATER,
      orderBy: { createdAt: 'desc' },
      select: { lotId: true, coaNumber: true, purity: true, compound: true, testedDate: true },
    }),
  ['coa-latest-lot'],
  { revalidate: REVALIDATE_SECONDS, tags: [COAS_TAG] },
);

/** Certificate count. `publicOnly` excludes retired legacy rows. */
export const countCoas = unstable_cache(
  async (publicOnly: boolean) => prisma.coa.count({ where: publicOnly ? { retiredAt: null } : {} }),
  ['coa-count'],
  { revalidate: REVALIDATE_SECONDS, tags: [COAS_TAG] },
);

/** The public /coa index, newest first. The page slices this for its
 *  pagination, so one cached read serves every page number. */
export const listPublicCoas = unstable_cache(
  async () =>
    prisma.coa.findMany({
      where: { retiredAt: null },
      orderBy: [{ createdAt: 'desc' }, { compound: 'asc' }],
      take: 500,
      select: {
        id: true, compound: true, lotId: true, coaNumber: true, purity: true,
        identity: true, appearance: true, testedDate: true, fileUrl: true,
      },
    }),
  ['coa-public-list'],
  { revalidate: REVALIDATE_SECONDS, tags: [COAS_TAG] },
);

/** The newest few public certificates, for the ads lander's live ticket. */
export const listRecentCoas = unstable_cache(
  async (take: number) =>
    prisma.coa.findMany({
      where: { retiredAt: null },
      orderBy: { createdAt: 'desc' },
      take,
      select: { coaNumber: true, lotId: true, purity: true, testedDate: true, identity: true },
    }),
  ['coa-recent'],
  { revalidate: REVALIDATE_SECONDS, tags: [COAS_TAG] },
);

/** /coa/[lot]: rows matching a certificate number or a batch reference.
 *  Wrapped in React cache() as well, because generateMetadata and the page
 *  both call it in the same request and used to run the query twice. */
export const findCoasByKey = cache(
  unstable_cache(
    async (key: string) =>
      prisma.coa.findMany({
        where: {
          OR: [
            { coaNumber: { equals: key, mode: 'insensitive' } },
            { lotId: { equals: key, mode: 'insensitive' } },
          ],
        },
        orderBy: [{ compound: 'asc' }, { createdAt: 'desc' }],
        take: 100,
        select: {
          id: true, compound: true, productHandle: true, lotId: true, coaNumber: true,
          purity: true, identity: true, appearance: true, testedDate: true, fileUrl: true,
          retiredAt: true, supersededBy: true,
        },
      }),
    ['coa-by-key'],
    { revalidate: REVALIDATE_SECONDS, tags: [COAS_TAG] },
  ),
);
