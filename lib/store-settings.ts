import 'server-only';
import { prisma } from '@/lib/db';

export type StoreSettings = {
  freeShippingThreshold: number; // cents
};

const DEFAULTS: StoreSettings = { freeShippingThreshold: 35_000 };

// Module-level cache — avoids a DB round-trip on every request while still
// picking up changes within ~60s of an admin save.
let cache: { data: StoreSettings; expiresAt: number } | null = null;
const TTL_MS = 60_000;

export async function getStoreSettings(): Promise<StoreSettings> {
  if (cache && Date.now() < cache.expiresAt) return cache.data;
  try {
    const row = await prisma.storeSettings.upsert({
      where: { id: 1 },
      create: { id: 1 },
      update: {},
    });
    const data: StoreSettings = { freeShippingThreshold: row.freeShippingThreshold };
    cache = { data, expiresAt: Date.now() + TTL_MS };
    return data;
  } catch {
    // Table may not exist yet on a fresh deploy; fall back to code defaults.
    return DEFAULTS;
  }
}

export async function updateStoreSettings(patch: Partial<StoreSettings>): Promise<StoreSettings> {
  const row = await prisma.storeSettings.upsert({
    where: { id: 1 },
    create: { id: 1, ...patch },
    update: patch,
  });
  cache = null; // invalidate so next read fetches fresh
  return { freeShippingThreshold: row.freeShippingThreshold };
}
