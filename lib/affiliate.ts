// Affiliate-related validation + helper utilities.
// Lives outside `app/` so both the sign-up page and the API route can
// import without pulling in server-only modules.

// Identifier rules — slugs (referral URLs) and discount codes share
// the same format. Lowercase, alphanumeric + hyphen, 3-30 chars.
const IDENT_RE = /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])?$/;

// Reserved identifiers we never let anyone claim. Includes obvious
// brand names + a few profanity / impersonation guards.
const RESERVED = new Set([
  'admin', 'administrator', 'api', 'app', 'auth', 'bac', 'bac-water',
  'cart', 'catalog', 'checkout', 'compounds', 'contact',
  'dashboard', 'help', 'home', 'login', 'logout', 'merit', 'merit-sciences',
  'meritsciences', 'merit-peptides', 'meritpeptides', 'official',
  'order', 'orders', 'page', 'pages', 'pharmacist', 'policy', 'privacy',
  'rep', 'returns', 'rx', 'science', 'sciences', 'shipping', 'shop',
  'signup', 'sign-up', 'staff', 'support', 'team', 'terms', 'test',
  'user', 'users', 'verify', 'www', 'help',
]);

export function normalizeIdentifier(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, '-');
}

export type ValidationResult = { ok: true } | { ok: false; reason: string };

export function validateIdentifier(raw: string, fieldName: string): ValidationResult {
  const v = normalizeIdentifier(raw);
  if (v.length < 3) return { ok: false, reason: `${fieldName} must be at least 3 characters` };
  if (v.length > 30) return { ok: false, reason: `${fieldName} must be 30 characters or fewer` };
  if (!IDENT_RE.test(v)) return { ok: false, reason: `${fieldName} can only contain letters, numbers, and hyphens` };
  if (RESERVED.has(v)) return { ok: false, reason: `${fieldName} "${v}" is reserved — try a different one` };
  return { ok: true };
}

export function validateEmail(raw: string): ValidationResult {
  const v = raw.trim().toLowerCase();
  // Permissive but practical regex — most real-world addresses
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
    return { ok: false, reason: 'Please enter a valid email address' };
  }
  if (v.length > 254) return { ok: false, reason: 'Email is too long' };
  return { ok: true };
}

export function validateName(raw: string): ValidationResult {
  const v = raw.trim();
  if (v.length < 2) return { ok: false, reason: 'Name must be at least 2 characters' };
  if (v.length > 80) return { ok: false, reason: 'Name must be 80 characters or fewer' };
  return { ok: true };
}

// Suggest a sane slug from a display name when the user lets us
// auto-fill (e.g. "Frank Parker Lee" → "frank-parker-lee").
export function suggestSlug(name: string): string {
  return normalizeIdentifier(name).replace(/[^a-z0-9-]/g, '').slice(0, 30);
}

// Static config — these are the locked product values.
export const AFFILIATE_PROGRAM = {
  // Discount given to buyers who use an affiliate's code at checkout
  buyerDiscountPct: 10,
  // Discount the affiliate gets on their own purchases
  selfDiscountPct: 15,
  // Tier thresholds (orders in trailing 30 days)
  tiers: [
    { name: 'Affiliate', commissionPct: 15, minOrders: 0,  maxOrders: 25 },
    { name: 'Partner',   commissionPct: 20, minOrders: 26, maxOrders: 75 },
    { name: 'Elite',     commissionPct: 25, minOrders: 76, maxOrders: null as number | null },
  ],
  cookieWindowDays: 30,
  payoutMinUsd: 50,
} as const;
