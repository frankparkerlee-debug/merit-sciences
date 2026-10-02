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

/**
 * Discount codes an affiliate may not claim: anything that reads as a Merit
 * promotion. "welcome*" is the house first-order offer, whatever the number
 * after it happens to be this quarter. Callers also check the Discount table
 * so a code an operator created can never be taken either.
 */
const RESERVED_CODE_PREFIXES = ['welcome', 'merit', 'first', 'newcustomer', 'new-customer'];
export function isReservedDiscountCode(code: string): boolean {
  const c = normalizeIdentifier(code);
  return RESERVED_CODE_PREFIXES.some((p) => c === p || c.startsWith(p));
}

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
  // LEGACY plan: flat 20% for affiliates who joined before 2026-10-02
  // (locked 2026-07-14). Still the rate for every Affiliate row whose plan
  // columns are NULL. New signups get NEW_AFFILIATE_PLAN below.
  tiers: [
    { name: 'Partner', commissionPct: 20, minOrders: 0, maxOrders: null as number | null },
  ],
  // The referral cookie follows the visitor for 30 days (the live value is
  // COOKIE_MAX_AGE_SECONDS in middleware.ts; keep the two in step). The only
  // thing that overrides affiliate attribution is Merit's own paid traffic:
  // a sale on the ad-funnel code (AD_FUNNEL_CODES in lib/welcome-offer.ts)
  // pays no commission.
  cookieWindowDays: 30,
  // Payout minimum. $75 since 2026-10-02 (Parker), was $50. The env var
  // PAYOUT_MIN_USD on Render overrides this at runtime (lib/affiliate-payouts).
  payoutMinUsd: 75,
} as const;

/**
 * The offer for affiliates who join on or after 2026-10-02 (Parker):
 * 40% of a referred customer's FIRST order, 15% of every order that
 * customer places after it, for life. Buyer discount unchanged at 10%.
 * Written onto the Affiliate row at creation (signup route, admin invite)
 * so the roster that predates the change keeps its flat 20%.
 */
export const NEW_AFFILIATE_PLAN = {
  firstOrderRateBp: 4000,
  repeatRateBp: 1500,
} as const;
export const NEW_AFFILIATE_PLAN_SINCE = '2026-10-02';

export type AffiliatePlan = {
  firstOrderRateBp: number | null;
  repeatRateBp: number | null;
};

/** True when the row carries the first/repeat plan (both columns set). */
export function hasSplitPlan(plan: AffiliatePlan | null | undefined): plan is { firstOrderRateBp: number; repeatRateBp: number } {
  return !!plan && plan.firstOrderRateBp != null && plan.repeatRateBp != null;
}

/** Rate in basis points for an order under the split plan, or null when
 *  the affiliate is on the legacy flat program (use tierForOrderCount). */
export function planRateBp(plan: AffiliatePlan | null | undefined, isFirstOrder: boolean): number | null {
  if (!hasSplitPlan(plan)) return null;
  return isFirstOrder ? plan.firstOrderRateBp : plan.repeatRateBp;
}

/** Human label for a plan, for dashboards and emails. */
export function describePlan(plan: AffiliatePlan | null | undefined): string {
  if (hasSplitPlan(plan)) {
    return `${plan.firstOrderRateBp / 100}% on a customer's first order · ${plan.repeatRateBp / 100}% on every order after`;
  }
  const t = AFFILIATE_PROGRAM.tiers[0];
  return `${t.commissionPct}% flat on every order`;
}

/**
 * LEGACY rate: given the affiliate's order count in the trailing 30 days,
 * return the tier + commission rate in basis points. With the single
 * "Partner" tier this always returns 20%. Only used for affiliates whose
 * plan columns are NULL. Stored as basis points on OrderCommission so the
 * rate paid is permanently locked in even if program rates change later.
 */
export function tierForOrderCount(count: number): {
  tierName: string;
  rateBp: number;
} {
  for (const t of AFFILIATE_PROGRAM.tiers) {
    if (t.maxOrders === null || count <= t.maxOrders) {
      return { tierName: t.name, rateBp: t.commissionPct * 100 };
    }
  }
  // Fallback — unreachable given our tier ordering, but typescript-safe
  const top = AFFILIATE_PROGRAM.tiers[AFFILIATE_PROGRAM.tiers.length - 1];
  return { tierName: top.name, rateBp: top.commissionPct * 100 };
}
