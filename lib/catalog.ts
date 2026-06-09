import 'server-only';
import fs from 'fs';
import path from 'path';
import type { Product } from './product-types';

// Re-export the shared type + utilities so existing server-side imports
// from '@/lib/catalog' keep working.
export type { Product } from './product-types';
export { money } from './product-types';

const PRODUCTS_DIR = path.join(process.cwd(), 'content', 'products');

export function listProducts(filter?: {
  status?: Product['status'];
  channel?: Product['channel'];
}): Product[] {
  if (!fs.existsSync(PRODUCTS_DIR)) return [];
  const files = fs.readdirSync(PRODUCTS_DIR).filter((f) => f.endsWith('.json'));
  const products = files.map((f) => {
    const raw = fs.readFileSync(path.join(PRODUCTS_DIR, f), 'utf8');
    return JSON.parse(raw) as Product;
  });
  return products.filter((p) => {
    if (filter?.status && p.status !== filter.status) return false;
    if (filter?.channel && p.channel !== filter.channel && p.channel !== 'both') return false;
    return true;
  });
}

export function getProduct(handle: string): Product | null {
  const file = path.join(PRODUCTS_DIR, `${handle}.json`);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8')) as Product;
}
