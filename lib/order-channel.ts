/**
 * Which channel brought in each order, from everything Merit already records:
 * the affiliate credited, a vendor (BHS) click, the first-touch attribution
 * row (UTMs, ad click ids, referrer), the discount code typed, and the
 * customer's own order history.
 *
 * Precedence, strongest signal first:
 *   1. Affiliate      an affiliate is paid on the order, so it is theirs
 *   2. BHS            a vendor click; their rep is paid on it
 *   3. Paid ads       an ad click id or a cpc/paid UTM (Google, Meta, ...)
 *   4. Private code   a non-public code (friends & family, a team code)
 *   5. Email, AI assistants, organic search, social, other referral sites
 *   6. Returning      no signal on this order: inherit the customer's first
 *   7. Unknown        a first order that arrived with no signal at all
 *                     (typed URL, a text from a friend, an app's browser)
 */

export type ChannelInput = {
  createdAt: Date;
  customerEmail: string;
  affiliateId: string | null;
  discountCode: string | null;
  attr: {
    source: string | null;
    medium: string | null;
    campaign: string | null;
    clickId: string | null;
    referrer: string | null;
  } | null;
};

/** Codes anyone can get; they say nothing about where the buyer came from. */
const PUBLIC_CODE = /^(welcome\d*|bhstest)$/i;

const AI_HOSTS = /(^|\.)(chatgpt\.com|openai\.com|perplexity\.ai|claude\.ai|gemini\.google\.com|copilot\.microsoft\.com)$/i;
const SEARCH: [RegExp, string][] = [
  [/(^|\.)google\.[a-z.]+$|^com\.google\.android/i, 'Google organic'],
  [/(^|\.)(bing\.com|duckduckgo\.com|yahoo\.com|search\.brave\.com|ecosia\.org)$/i, 'Other search'],
];
const SOCIAL = /(^|\.)(instagram\.com|facebook\.com|fb\.com|reddit\.com|tiktok\.com|youtube\.com|x\.com|t\.co|threads\.net|linkedin\.com)$/i;

const PAID_SOURCE: Record<string, string> = {
  google: 'Google Ads',
  meta: 'Meta ads',
  facebook: 'Meta ads',
  instagram: 'Meta ads',
  ig: 'Meta ads',
  tiktok: 'TikTok ads',
  reddit: 'Reddit ads',
  bing: 'Microsoft ads',
};

function signalChannel(o: ChannelInput): string | null {
  if (o.affiliateId) return 'Affiliate';
  const a = o.attr;
  const src = a?.source?.toLowerCase().trim() ?? '';
  const med = a?.medium?.toLowerCase().trim() ?? '';
  const ref = a?.referrer?.toLowerCase().trim() ?? '';

  if (src === 'bhs') return 'BHS';
  const paidMedium = /cpc|ppc|paid|display|ads?$/.test(med);
  if (src && PAID_SOURCE[src] && (a?.clickId || paidMedium)) return PAID_SOURCE[src];

  const code = o.discountCode?.trim();
  if (code && !PUBLIC_CODE.test(code)) return `Code: ${code.toUpperCase()}`;

  if (src === 'email' || med === 'email' || med === 'transactional') return 'Email';
  if (AI_HOSTS.test(src) || AI_HOSTS.test(ref)) return 'ChatGPT and AI';
  if (src && PAID_SOURCE[src]) return PAID_SOURCE[src];
  for (const [re, label] of SEARCH) if (re.test(ref)) return label;
  if (SOCIAL.test(ref)) return 'Social (unpaid)';
  if (src) return `Tagged: ${src}`;
  if (ref) return `Referral: ${ref}`;
  return null;
}

/**
 * Channel per order. Pass the full order history (any order), not a date
 * window, so a returning customer can inherit the channel of their first
 * order; filter to the window afterwards.
 */
export function classifyOrders<T extends ChannelInput>(orders: T[]): Map<T, string> {
  const sorted = [...orders].sort((x, y) => x.createdAt.getTime() - y.createdAt.getTime());
  const firstChannel = new Map<string, string>();
  const out = new Map<T, string>();
  for (const o of sorted) {
    const email = o.customerEmail.trim().toLowerCase();
    const own = signalChannel(o);
    const prior = firstChannel.get(email);
    const channel = own ?? (prior ? `Returning: ${prior}` : 'Unknown');
    if (!prior) firstChannel.set(email, channel);
    out.set(o, channel);
  }
  return out;
}
