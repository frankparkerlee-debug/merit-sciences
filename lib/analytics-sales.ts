import 'server-only';
import { prisma } from './db';

/* ─────────────────────────────────────────────────────────────────────────
   SALES ANALYTICS — "where does the money come from", answered from DB truth.

   The channel for each paid order is resolved from the strongest signal the
   order actually carries, in a fixed priority:

     1. practitioner link   — the practice bought through their account
     2. affiliate credit    — ?ref= cookie or typed affiliate code
     3. click-level attr    — UTMs / click ids from the merit_attr cookie
     4. first-touch referrer— external site the buyer arrived from (captured
                              from 2026-08-24; older orders never had it)
     5. discount-code hint  — WELCOME* = the site's own popup, COMEBACK* =
                              win-back email (affiliate codes resolved in 2)
     6. Direct / untracked  — everything else

   Priority matters: an affiliate-referred practice order is practitioner
   revenue (the practice relationship is the durable asset; the affiliate is
   paid separately via the commission ledger). A UTM click that also typed
   WELCOME20 is paid/organic traffic, not "popup" — the popup was en route.

   Everything here is deliberately computed in TS over the full paid-order
   set. At the current scale (hundreds of rows) that is faster to reason
   about and to test than SQL CASE pyramids; revisit past ~50k orders.
   ───────────────────────────────────────────────────────────────────────── */

/** Money actually landed (and stayed). Matches lib/affiliate-repair.ts's
 *  COMMISSIONABLE, not the KPI row's looser "not pending" — CANCELED orders
 *  are excluded here because unpaid intent is not a sale from any channel. */
const PAID_STATUSES = ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'PARTIALLY_REFUNDED'] as const;

export type ChannelRow = { channel: string; orders: number; revenueCents: number };
export type NamedRow = { name: string; orders: number; revenueCents: number };
export type WeekRow = { weekStart: string; orders: number; revenueCents: number };
export type ProductRow = { title: string; units: number; revenueCents: number };

export type SalesReport = {
  channels30: ChannelRow[];
  channelsAll: ChannelRow[];
  topAffiliates: NamedRow[];
  topCodes: NamedRow[];
  weekly: WeekRow[];
  topProducts30: ProductRow[];
  buyers: {
    total: number;
    returning: number;
    repeatRatePct: number;
    repeatRevenueCents: number;
    totalRevenueCents: number;
    aov30Cents: number;
  };
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
  paypalOrderId: string;
  createdAt: Date;
  totalCents: bigint;
  customerEmail: string;
  affiliateId: string | null;
  practitionerApplicationId: string | null;
  discountCode: string | null;
};

type AttrLite = {
  source: string | null;
  medium: string | null;
  clickId: string | null;
  referrer: string | null;
};

function resolveChannel(o: OrderLite, attr: AttrLite | undefined): string {
  if (o.practitionerApplicationId) return 'Practitioner';
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

export async function salesReport(): Promise<SalesReport> {
  const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const since12w = new Date(Date.now() - 12 * 7 * 24 * 60 * 60 * 1000);

  const orders: OrderLite[] = await prisma.order.findMany({
    where: { status: { in: PAID_STATUSES as unknown as any[] } },
    select: {
      paypalOrderId: true,
      createdAt: true,
      totalCents: true,
      customerEmail: true,
      affiliateId: true,
      practitionerApplicationId: true,
      discountCode: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  const [attrs, affiliates] = await Promise.all([
    prisma.orderAttribution.findMany({
      where: { paypalOrderId: { in: orders.map((o) => o.paypalOrderId) } },
      select: { paypalOrderId: true, source: true, medium: true, clickId: true, referrer: true },
    }),
    prisma.affiliate.findMany({ select: { id: true, name: true } }),
  ]);
  const attrByOrder = new Map(attrs.map((a) => [a.paypalOrderId, a]));
  const affName = new Map(affiliates.map((a) => [a.id, a.name]));

  const resolved = orders.map((o) => ({
    o,
    cents: Number(o.totalCents),
    channel: resolveChannel(o, attrByOrder.get(o.paypalOrderId)),
  }));

  // Channel splits
  const channelsAll = aggregate(resolved.map((r) => ({ channel: r.channel, cents: r.cents })));
  const channels30 = aggregate(
    resolved.filter((r) => r.o.createdAt >= since30).map((r) => ({ channel: r.channel, cents: r.cents })),
  );

  // Affiliate leaderboard (revenue they drove, not commission they earned)
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

  // Discount-code usage (top codes by revenue carried)
  const codeAgg = new Map<string, NamedRow>();
  for (const r of resolved) {
    if (!r.o.discountCode) continue;
    const name = r.o.discountCode.toUpperCase();
    const cur = codeAgg.get(name) ?? { name, orders: 0, revenueCents: 0 };
    cur.orders += 1;
    cur.revenueCents += r.cents;
    codeAgg.set(name, cur);
  }
  const topCodes = [...codeAgg.values()].sort((a, b) => b.revenueCents - a.revenueCents).slice(0, 8);

  // Weekly revenue, last 12 weeks (Monday-start buckets, UTC)
  const weekMap = new Map<string, WeekRow>();
  for (const r of resolved) {
    if (r.o.createdAt < since12w) continue;
    const d = new Date(r.o.createdAt);
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

  // Buyer economics. Orders are createdAt-ascending, so the first order per
  // email is genuinely the first; everything after is repeat revenue.
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
  const in30 = resolved.filter((r) => r.o.createdAt >= since30);
  const aov30Cents = in30.length ? Math.round(in30.reduce((s, r) => s + r.cents, 0) / in30.length) : 0;

  // Top products, 30 days — from order lines (unit price × qty at sale time)
  const topProductsRaw = await prisma.$queryRaw<
    { title: string; units: bigint; revenue: bigint }[]
  >`
    SELECT ol.title, SUM(ol.qty)::bigint AS units, SUM(ol."unitCents" * ol.qty)::bigint AS revenue
    FROM order_lines ol
    JOIN orders o ON o.id = ol."orderId"
    WHERE o.status::text = ANY(ARRAY['PAID','PROCESSING','SHIPPED','DELIVERED','PARTIALLY_REFUNDED'])
      AND o."createdAt" >= ${since30}
    GROUP BY ol.title
    ORDER BY revenue DESC
    LIMIT 8
  `.catch(() => [] as { title: string; units: bigint; revenue: bigint }[]);

  return {
    channels30,
    channelsAll,
    topAffiliates,
    topCodes,
    weekly,
    topProducts30: topProductsRaw.map((p) => ({
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
      aov30Cents,
    },
    coverage: {
      paid: orders.length,
      withClickAttr: resolved.filter((r) => attrByOrder.get(r.o.paypalOrderId)?.source).length,
      withReferrer: resolved.filter((r) => attrByOrder.get(r.o.paypalOrderId)?.referrer).length,
    },
  };
}
