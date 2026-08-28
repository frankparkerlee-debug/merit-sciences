/**
 * Self-purchase detection for affiliate commission.
 *
 * An affiliate must not earn commission on their own order. The original
 * check was a single strict equality:
 *
 *     buyerEmail === affiliate.email.toLowerCase()
 *
 * which failed in two ways, both seen in production:
 *
 *   1. A SECOND EMAIL defeats it entirely. An affiliate registered under a
 *      personal address who checks out with their work address is not matched,
 *      so they collect the full rate on their own purchase — on top of any
 *      discount code they used. Two affiliates were doing this, stacking a
 *      37.5% staff discount with 20% commission for an effective 50% off list.
 *
 *   2. It was evaluated against the WRONG AFFILIATE. Callers resolved an
 *      affiliate, computed the flag, and only afterwards let the evergreen
 *      customer link redirect credit to a different affiliate — leaving the
 *      flag testing the previous affiliate's email. The same buyer therefore
 *      earned $0 on one order and full commission on a later identical one.
 *
 * The fix is this module plus one rule at the call sites: resolve the evergreen
 * link FIRST, then judge self-purchase against the affiliate actually credited.
 *
 * Matching is deliberately identity-based rather than email-based: an affiliate
 * has several addresses (login, payout) and a name that appears on their own
 * shipments. Names are compared only as an exact normalized full-name match, so
 * "Angie Fidler" ordering to "Angie Fidler" is caught while ordinary customers
 * are not — a shared first name or a substring can never trigger it.
 */

export type AffiliateIdentity = {
  email: string;
  name?: string | null;
  paypalEmail?: string | null;
};

export type BuyerIdentity = {
  email?: string | null;
  customerName?: string | null;
  shippingFullName?: string | null;
};

export type SelfPurchaseVerdict = {
  isSelf: boolean;
  /** Which signal matched — recorded so a $0 row can be explained later. */
  reason: 'login-email' | 'payout-email' | 'name' | null;
};

/**
 * Canonical form of an email for identity comparison.
 *
 * Strips the +tag (every provider treats it as the same mailbox) and, for
 * Google-hosted addresses only, the dots — a.b@gmail.com and ab@gmail.com are
 * one inbox. Dots are NOT stripped elsewhere, where they can be significant.
 * This is for matching a person to themselves, never for sending or storage.
 */
export function normalizeEmail(raw: string | null | undefined): string | null {
  const s = (raw ?? '').trim().toLowerCase();
  if (!s || !s.includes('@')) return null;
  const at = s.lastIndexOf('@');
  let local = s.slice(0, at);
  const domain = s.slice(at + 1);
  if (!local || !domain) return null;
  const plus = local.indexOf('+');
  if (plus > 0) local = local.slice(0, plus);
  if (domain === 'gmail.com' || domain === 'googlemail.com') local = local.replace(/\./g, '');
  return local ? `${local}@${domain}` : null;
}

/** Canonical form of a person's name: accent-folded, punctuation-free, single-spaced. */
export function normalizeName(raw: string | null | undefined): string | null {
  const s = (raw ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // combining accents
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  // A single token is too weak to identify anyone — require a full name.
  return s && s.includes(' ') ? s : null;
}

/**
 * Is this order the credited affiliate buying from themselves?
 *
 * Pass the identity of the affiliate ACTUALLY BEING CREDITED (post evergreen
 * lock), not whichever affiliate attribution first resolved.
 */
export function detectSelfPurchase(
  affiliate: AffiliateIdentity | null | undefined,
  buyer: BuyerIdentity,
): SelfPurchaseVerdict {
  if (!affiliate) return { isSelf: false, reason: null };

  const buyerEmail = normalizeEmail(buyer.email);
  if (buyerEmail) {
    if (buyerEmail === normalizeEmail(affiliate.email)) return { isSelf: true, reason: 'login-email' };
    if (buyerEmail === normalizeEmail(affiliate.paypalEmail)) return { isSelf: true, reason: 'payout-email' };
  }

  const affName = normalizeName(affiliate.name);
  if (affName) {
    for (const candidate of [buyer.shippingFullName, buyer.customerName]) {
      if (normalizeName(candidate) === affName) return { isSelf: true, reason: 'name' };
    }
  }

  return { isSelf: false, reason: null };
}
