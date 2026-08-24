import 'server-only';
import { prisma } from './db';

/* ─────────────────────────────────────────────────────────────────────────
   SALES ANALYTICS — "where does the money come from", answered from DB truth.

   The channel for each paid order is resolved from the strongest signal the
   order actually carries, in a fixed priority:

     1. practitioner        — the buyer HAS a practitioner login: the order is
                              stamped with practitionerApplicationId, or its
                              customer email belongs to a practitioner profile
                              (APPROVED or DEACTIVATED — a practice stays a
                              practice for history; PENDING is excluded so an
                              unreviewed application can't reclassify orders)
     2. affiliate credit    — ?ref= cookie or typed affiliate code
     3. click-level attr    — UTMs / click ids from the merit_attr cookie
     4. first-touch referrer— external site the buyer arrived from (captured
                              from 2026-08-24; older orders never had it)
     5. discount-code hint  — WELCOME* = the site's own popup, COMEBACK* =
                              win-back email (affiliate codes resolved in 2)
     6. Direct / untracked  — everything else

   Priority matters: an affiliate-referred practice order is practitioner
   revenue (the practice relationship is the durable asset; the affiliate is
   paid separately via the commission ledger).

   Everything here is deliberately computed in TS over the full paid-order
   set. At the current scale (hundreds of rows) that is faster to reason
   about and to test than SQL CASE pyramids; revisit past ~50k orders.
   ───────────────────────────────────────────────────────────────────────── */

/** Money actually landed (and stayed). Matches lib/affiliate-repair.ts's
 *  COMMISSIONABLE, not the KPI row's looser "not pending" — CANCELED orders
 *  are excluded here because unpaid intent is not a sale from any channel. */
const PAID_STATUSES = ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'PARTIALLY_REFUNDED'];

export type ChannelRow = { channel: string; orders: number; revenueCents: number };
export type NamedRow = { name: string; orders: number; revenueCents: number };
export type WeekRow = { weekStart: string; orders: number; revenueCents: number };
export type ProductRow = { title: string; units: number; revenueCents: number };

export type SalesParams = {
  /** Window in days for the "windowed" aggregates; null = all time. */
  rangeDays: number | null;
  /** Restrict trend / products / codes / AOV to one resolved channel. */
  channel: string | null;
};

export type SalesReport = {
  /** Channel split inside the selected window (respects rangeDays only —
   *  filtering the channel split BY channel would just echo the filter). */
  channelsWindow: ChannelRow[];
  channelsAll: ChannelRow[];
  /** Every channel name seen all-time — powers the filter pills. */
  channelNames: string[];
  topAffiliates: NamedRow[];
  topCodes: NamedRow[];
  weekly: WeekRow[];
  topProducts: ProductRow[];
  buyers: {
    total: number;
    returning: number;
    repeatRatePct: number;
    repeatRevenueCents: number;
    totalRevenueCents: number;
    aovWindowCents: number;
  };
  /** Orders matched by the active filters (drives panel headers). */
  windowOrders: number;
  windowRevenueCents: number;
  coverage: { paid: number; withClickAttr: number; withReferrer: number };
};

/** Map an external referrer hostname to a channel label. */
function channelFromReferrer(host: string): string {
  const h = host.toLowerCase();
  if (/(^|\.)google\./.test(h)) return 'Google organic';
  if (/(^|\.)bing\.com$/.test(h)) return 'Bing';
  if (/(^|\.)duckduckgo\.com$/.test(h)) return 'DuckDuckGo';
  if (/chatgpt\.com$|chat\.openai\.com$/.test(h)) return 'ChatGPT';
  if (/perplexity\.ai$/.test(h)) return 'Perplexity';
  if (/claude\.ai$/.test(h)) return 'Claude';
  if (/gemini\.google/.test(h)) return 'Gemini';
  if (/(^|\.)reddit\.com$/.test(h)) return 'Reddit';
  if (/facebook\.com$|instagram\.com$|fb\.com$/.test(h)) return 'Meta organic';
  if (/(^|\.)t\.co$|twitter\.com$|(^|\.)x\.com$/.test(h)) return 'X';
  if (/youtube\.com$|youtu\.be$/.test(h)) return 'YouTube';
  if (/tiktok\.com$/.test(h)) return 'TikTok organic';
  return `Referral — ${h}`;
}

/** Map UTM source/medium (or inferred click-id source) to a channel label. */
function channelFromUtm(source: string, medium: string | null, clickId: string | null): string {
  const s = source.toLowerCase();
  const m = (medium ?? '').toLowerCase();
  const paid = !!clickId || /cpc|ppc|paid/.test(m);
  if (/google/.test(s)) return paid ? 'Google Ads' : 'Google organic';
  if (/meta|facebook|^fb$|instagram|^ig$/.test(s)) return paid ? 'Meta Ads' : 'Meta organic';
  if (/tiktok/.test(s)) return paid ? 'TikTok Ads' : 'TikTok organic';
  if (/reddit/.test(s)) return paid ? 'Reddit Ads' : 'Reddit';
  if (/bing|microsoft/.test(s)) return paid ? 'Microsoft Ads' : 'Bing';
  if (/email|klaviyo|resend|newsletter/.test(s) || m === 'email') return 'Email';
  if (/chatgpt|openai/.test(s)) return 'ChatGPT';
  return `Campaign — ${s}`;
}

type OrderLite = {
  id: string;
  paypalOrderId: string;
  createdAt: Date;
  paidAt: Date | null;
  totalCents: bigint;
  customerEmail: string;
  affiliateId: string | null;
  practitionerApplicationId: string | null;
  discountCode: string | null;
};

/** Revenue is dated by when the money LANDED, not when the order row was
 *  created — an invoice order can sit PENDING_PAYMENT for days before the
 *  customer pays, and it belongs to the week of the payment. createdAt is
 *  the fallback for any row that predates paidAt stamping. */
function paidDate(o: OrderLite): Date {
  return o.paidAt ?? o.createdAt;
}

type AttrLite = {
  source: string | null;
  medium: string | null;
  clickId: string | null;
  referrer: string | null;
};

function resolveChannel(
  o: OrderLite,
  attr: AttrLite | undefined,
  practitionerEmails: Set<string>,
): string {
  if (o.practitionerApplicationId || practitionerEmails.has(o.customerEmail.toLowerCase())) {
    return 'Practitioner';
  }
  if (o.affiliateId) return 'Affiliate';
  if (attr?.source) return channelFromUtm(attr.source, attr.medium, attr.clickId);
  if (attr?.referrer) return channelFromReferrer(attr.referrer);
  const code = (o.discountCode ?? '').toLowerCase();
  if (code.startsWith('welcome')) return 'Direct — welcome popup';
  if (code.startsWith('comeback')) return 'Email — win-back';
  return 'Direct / untracked';
}

function aggregate(rows: { channel: string; cents: number }[]): ChannelRow[] {
  const m = new Map<string, ChannelRow>();
  for (const r of rows) {
    const cur = m.get(r.channel) ?? { channel: r.channel, orders: 0, revenueCents: 0 };
    cur.orders += 1;
    cur.revenueCents += r.cents;
    m.set(r.channel, cur);
  }
  return [...m.values()].sort((a, b) => b.revenueCents - a.revenueCents);
}

export async function salesReport(
  params: SalesParams = { rangeDays: 30, channel: null },
): Promise<SalesReport> {
  const windowStart =
    params.rangeDays != null ? new Date(Date.now() - params.rangeDays * 24 * 60 * 60 * 1000) : null;
  const since12w = new Date(Date.now() - 12 * 7 * 24 * 60 * 60 * 1000);

  const orders: OrderLite[] = await prisma.order.findMany({
    where: { status: { in: PAID_STATUSES as any } },
    select: {
      id: true,
      paypalOrderId: true,
      createdAt: true,
      paidAt: true,
      totalCents: true,
      customerEmail: true,
      affiliateId: true,
      practitionerApplicationId: true,
      discountCode: true,
    },
  });
  // First-purchase detection below depends on chronological order — by
  // payment date, matching how every window in this report is bucketed.
  orders.sort((a, b) => paidDate(a).getTime() - paidDate(b).getTime());

  const [attrs, affiliates, practitioners] = await Promise.all([
    prisma.orderAttribution.findMany({
      where: { paypalOrderId: { in: orders.map((o) => o.paypalOrderId) } },
      select: { paypalOrderId: true, source: true, medium: true, clickId: true, referrer: true },
    }),
    prisma.affiliate.findMany({ select: { id: true, name: true } }),
    // A practice stays practitioner revenue even if later deactivated.
    prisma.practitionerApplication.findMany({
      where: { status: { in: ['APPROVED', 'DEACTIVATED'] } },
      select: { email: true },
    }),
  ]);
  const attrByOrder = new Map(attrs.map((a) => [a.paypalOrderId, a]));
  const affName = new Map(affiliates.map((a) => [a.id, a.name]));
  const practitionerEmails = new Set(practitioners.map((p) => p.email.toLowerCase()));

  const resolved = orders.map((o) => ({
    o,
    cents: Number(o.totalCents),
    channel: resolveChannel(o, attrByOrder.get(o.paypalOrderId), practitionerEmails),
  }));

  // Window + channel filter (channel filter never applies to the channel
  // split itself — it would just echo back the filter)
  const inWindow = resolved.filter((r) => !windowStart || paidDate(r.o) >= windowStart);
  const filtered = params.channel ? inWindow.filter((r) => r.channel === params.channel) : inWindow;

  const channelsAll = aggregate(resolved.map((r) => ({ channel: r.channel, cents: r.cents })));
  const channelsWindow = aggregate(inWindow.map((r) => ({ channel: r.channel, cents: r.cents })));
  const channelNames = channelsAll.map((c) => c.channel);

  // Affiliate leaderboard (revenue driven, all-time — a durable ranking)
  const affAgg = new Map<string, NamedRow>();
  for (const r of resolved) {
    if (!r.o.affiliateId) continue;
    const name = affName.get(r.o.affiliateId) ?? 'Unknown affiliate';
    const cur = affAgg.get(name) ?? { name, orders: 0, revenueCents: 0 };
    cur.orders += 1;
    cur.revenueCents += r.cents;
    affAgg.set(name, cur);
  }
  const topAffiliates = [...affAgg.values()].sort((a, b) => b.revenueCents - a.revenueCents).slice(0, 8);

  // Discount-code usage inside the active filters
  const codeAgg = new Map<string, NamedRow>();
  for (const r of filtered) {
    if (!r.o.discountCode) continue;
    const name = r.o.discountCode.toUpperCase();
    const cur = codeAgg.get(name) ?? { name, orders: 0, revenueCents: 0 };
    cur.orders += 1;
    cur.revenueCents += r.cents;
    codeAgg.set(name, cur);
  }
  const topCodes = [...codeAgg.values()].sort((a, b) => b.revenueCents - a.revenueCents).slice(0, 8);

  // Weekly revenue, last 12 weeks (Monday-start buckets, UTC), channel-aware
  const trendBase = params.channel ? resolved.filter((r) => r.channel === params.channel) : resolved;
  const weekMap = new Map<string, WeekRow>();
  for (const r of trendBase) {
    if (paidDate(r.o) < since12w) continue;
    const d = new Date(paidDate(r.o));
    const day = (d.getUTCDay() + 6) % 7; // Mon=0
    d.setUTCDate(d.getUTCDate() - day);
    d.setUTCHours(0, 0, 0, 0);
    const key = d.toISOString().slice(0, 10);
    const cur = weekMap.get(key) ?? { weekStart: key, orders: 0, revenueCents: 0 };
    cur.orders += 1;
    cur.revenueCents += r.cents;
    weekMap.set(key, cur);
  }
  const weekly = [...weekMap.values()].sort((a, b) => a.weekStart.localeCompare(b.weekStart));

  // Buyer economics — identity metrics stay all-time; AOV follows the filters.
  const seen = new Set<string>();
  let returningBuyers = 0;
  let repeatRevenueCents = 0;
  let totalRevenueCents = 0;
  const buyersWithRepeat = new Set<string>();
  for (const r of resolved) {
    const email = r.o.customerEmail.toLowerCase();
    totalRevenueCents += r.cents;
    if (seen.has(email)) {
      repeatRevenueCents += r.cents;
      if (!buyersWithRepeat.has(email)) {
        buyersWithRepeat.add(email);
        returningBuyers += 1;
      }
    } else {
      seen.add(email);
    }
  }
  const aovWindowCents = filtered.length
    ? Math.round(filtered.reduce((s, r) => s + r.cents, 0) / filtered.length)
    : 0;

  // Top products inside the active filters — driven by the resolved order-id
  // list so the channel filter applies without re-deriving channels in SQL.
  const filteredIds = filtered.map((r) => r.o.id);
  const topProductsRaw = filteredIds.length
    ? await prisma.$queryRaw<{ title: string; units: bigint; revenue: bigint }[]>`
        SELECT ol.title, SUM(ol.qty)::bigint AS units, SUM(ol."unitCents" * ol.qty)::bigint AS revenue
        FROM order_lines ol
        WHERE ol."orderId" = ANY(${filteredIds})
        GROUP BY ol.title
        ORDER BY revenue DESC
        LIMIT 8
      `.catch(() => [] as { title: string; units: bigint; revenue: bigint }[])
    : [];

  return {
    channelsWindow,
    channelsAll,
    channelNames,
    topAffiliates,
    topCodes,
    weekly,
    topProducts: topProductsRaw.map((p) => ({
      title: p.title,
      units: Number(p.units),
      revenueCents: Number(p.revenue),
    })),
    buyers: {
      total: seen.size,
      returning: returningBuyers,
      repeatRatePct: seen.size ? Math.round((returningBuyers / seen.size) * 100) : 0,
      repeatRevenueCents,
      totalRevenueCents,
      aovWindowCents,
    },
    windowOrders: filtered.length,
    windowRevenueCents: filtered.reduce((s, r) => s + r.cents, 0),
    coverage: {
      paid: orders.length,
      withClickAttr: resolved.filter((r) => attrByOrder.get(r.o.paypalOrderId)?.source).length,
      withReferrer: resolved.filter((r) => attrByOrder.get(r.o.paypalOrderId)?.referrer).length,
    },
  };
}
