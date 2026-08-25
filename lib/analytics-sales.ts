import 'server-only';
import { unstable_cache } from 'next/cache';
import { prisma } from './db';

/* ─────────────────────────────────────────────────────────────────────────
   SALES ANALYTICS — "where does the money come from", answered from DB truth.

   The channel for each paid order is resolved from the strongest signal the
   order actually carries, in a fixed priority:

     1. practitioner        — the buyer HAS a practitioner login: the order is
                              stamped with practitionerApplicationId, or its
                              customer email belongs to a practitioner profile
                              (APPROVED or DEACTIVATED — a practice stays a
                              practice for history; PENDING is excluded)
     2. affiliate credit    — ?ref= cookie or typed affiliate code
     3. click-level attr    — UTMs / click ids from the merit_attr cookie
     4. first-touch referrer— external site the buyer arrived from
     5. discount-code hint  — WELCOME* = the site's own popup, COMEBACK* =
                              win-back email (affiliate codes resolved in 2)
     6. Direct / untracked  — everything else

   PERFORMANCE SHAPE: everything the report needs — orders with channels
   already resolved, plus their lines — loads once into a 2-minute
   unstable_cache as plain JSON. salesReport() then filters and aggregates
   IN MEMORY, so changing the date-range or source filter on the analytics
   page costs no database work at all. Before this, every filter click
   re-fetched four tables and ran a raw aggregate, which (stacked on the
   page's PostHog calls) made filtering feel broken.
   ───────────────────────────────────────────────────────────────────────── */

/** Money actually landed (and stayed) — matches lib/affiliate-repair.ts's
 *  COMMISSIONABLE set. CANCELED is excluded: unpaid intent is not a sale. */
const PAID_STATUSES = ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'PARTIALLY_REFUNDED'];

export type ChannelRow = { channel: string; orders: number; revenueCents: number };
export type NamedRow = { name: string; orders: number; revenueCents: number; href?: string };
export type WeekRow = { weekStart: string; orders: number; revenueCents: number };
export type TrendPoint = { start: string; startMs: number; endMs: number; orders: number; revenueCents: number };
export type ProductRow = { title: string; units: number; revenueCents: number; href?: string };

export type SalesParams = {
  /** Window in days for the "windowed" aggregates; null = all time. */
  rangeDays: number | null;
  /** Restrict trend / products / codes / AOV to one resolved channel. */
  channel: string | null;
  /** Explicit date window (ms epoch) — from a chart-bar drill-down. When
   *  set, overrides rangeDays. `toMs` is EXCLUSIVE. */
  fromMs?: number | null;
  toMs?: number | null;
};

export type SalesReport = {
  channelsWindow: ChannelRow[];
  channelsAll: ChannelRow[];
  channelNames: string[];
  topAffiliates: NamedRow[];
  topCodes: NamedRow[];
  /** Revenue trend over the ACTIVE window: daily bars up to 31 days,
   *  weekly beyond. Each point carries its own [startMs, endMs) so the
   *  page can render it as a drill-down link. */
  trend: { bucket: 'day' | 'week'; points: TrendPoint[] };
  topProducts: ProductRow[];
  buyers: {
    total: number;
    returning: number;
    repeatRatePct: number;
    repeatRevenueCents: number;
    totalRevenueCents: number;
    aovWindowCents: number;
  };
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

/* ── Cached base — plain JSON only (unstable_cache serializes) ── */

type BaseRow = {
  id: string;
  /** Revenue date: paidAt when stamped, createdAt as legacy fallback —
   *  an invoice order belongs to the day the money landed. */
  paidMs: number;
  cents: number;
  email: string;
  channel: string;
  affiliateName: string | null;
  affiliateId: string | null;
  code: string | null;
};

type BaseLine = { orderId: string; title: string; handle: string; unitCents: number; qty: number };

type SalesBase = {
  rows: BaseRow[];
  lines: BaseLine[];
  coverage: { paid: number; withClickAttr: number; withReferrer: number };
};

const loadSalesBase = unstable_cache(
  async (): Promise<SalesBase> => {
    const orders = await prisma.order.findMany({
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

    const [attrs, affiliates, practitioners, lines] = await Promise.all([
      prisma.orderAttribution.findMany({
        where: { paypalOrderId: { in: orders.map((o) => o.paypalOrderId) } },
        select: { paypalOrderId: true, source: true, medium: true, clickId: true, referrer: true },
      }),
      prisma.affiliate.findMany({ select: { id: true, name: true } }),
      prisma.practitionerApplication.findMany({
        where: { status: { in: ['APPROVED', 'DEACTIVATED'] } },
        select: { email: true },
      }),
      prisma.orderLine.findMany({
        where: { orderId: { in: orders.map((o) => o.id) } },
        select: { orderId: true, title: true, handle: true, unitCents: true, qty: true },
      }),
    ]);
    const attrByOrder = new Map(attrs.map((a) => [a.paypalOrderId, a]));
    const affName = new Map(affiliates.map((a) => [a.id, a.name]));
    const practitionerEmails = new Set(practitioners.map((p) => p.email.toLowerCase()));

    const rows: BaseRow[] = orders.map((o) => {
      const attr = attrByOrder.get(o.paypalOrderId);
      let channel: string;
      if (o.practitionerApplicationId || practitionerEmails.has(o.customerEmail.toLowerCase())) {
        channel = 'Practitioner';
      } else if (o.affiliateId) {
        channel = 'Affiliate';
      } else if (attr?.source) {
        channel = channelFromUtm(attr.source, attr.medium, attr.clickId);
      } else if (attr?.referrer) {
        channel = channelFromReferrer(attr.referrer);
      } else {
        const code = (o.discountCode ?? '').toLowerCase();
        channel = code.startsWith('welcome')
          ? 'Direct — welcome popup'
          : code.startsWith('comeback')
            ? 'Email — win-back'
            : 'Direct / untracked';
      }
      return {
        id: o.id,
        paidMs: (o.paidAt ?? o.createdAt).getTime(),
        cents: Number(o.totalCents),
        email: o.customerEmail.toLowerCase(),
        channel,
        affiliateName: o.affiliateId ? (affName.get(o.affiliateId) ?? 'Unknown affiliate') : null,
        affiliateId: o.affiliateId,
        code: o.discountCode,
      };
    });
    rows.sort((a, b) => a.paidMs - b.paidMs);

    return {
      rows,
      lines: lines.map((l) => ({
        orderId: l.orderId,
        title: l.title,
        handle: l.handle,
        unitCents: Number(l.unitCents),
        qty: l.qty,
      })),
      coverage: {
        paid: orders.length,
        withClickAttr: orders.filter((o) => attrByOrder.get(o.paypalOrderId)?.source).length,
        withReferrer: orders.filter((o) => attrByOrder.get(o.paypalOrderId)?.referrer).length,
      },
    };
  },
  ['analytics-sales-base-v2'],
  { revalidate: 120 },
);

function aggregate(rows: BaseRow[]): ChannelRow[] {
  const m = new Map<string, ChannelRow>();
  for (const r of rows) {
    const cur = m.get(r.channel) ?? { channel: r.channel, orders: 0, revenueCents: 0 };
    cur.orders += 1;
    cur.revenueCents += r.cents;
    m.set(r.channel, cur);
  }
  return [...m.values()].sort((a, b) => b.revenueCents - a.revenueCents);
}

function topNamed(rows: BaseRow[], key: (r: BaseRow) => string | null): NamedRow[] {
  const m = new Map<string, NamedRow>();
  for (const r of rows) {
    const name = key(r);
    if (!name) continue;
    const cur = m.get(name) ?? { name, orders: 0, revenueCents: 0 };
    cur.orders += 1;
    cur.revenueCents += r.cents;
    m.set(name, cur);
  }
  return [...m.values()].sort((a, b) => b.revenueCents - a.revenueCents).slice(0, 8);
}

export async function salesReport(
  params: SalesParams = { rangeDays: 30, channel: null },
): Promise<SalesReport> {
  const base = await loadSalesBase();
  const DAY = 24 * 60 * 60 * 1000;
  const explicit = params.fromMs != null && params.toMs != null;
  const windowStartMs = explicit
    ? params.fromMs!
    : params.rangeDays != null
      ? Date.now() - params.rangeDays * DAY
      : null;
  const windowEndMs = explicit ? params.toMs! : null;

  const inWindow = base.rows.filter(
    (r) => (!windowStartMs || r.paidMs >= windowStartMs) && (!windowEndMs || r.paidMs < windowEndMs),
  );
  const filtered = params.channel ? inWindow.filter((r) => r.channel === params.channel) : inWindow;

  const channelsAll = aggregate(base.rows);
  const channelsWindow = aggregate(inWindow);

  // Revenue trend over the ACTIVE window (channel-aware). Bucket size adapts:
  // daily up to 31 days so a 7-day view visibly differs from a 30-day view;
  // weekly (Monday-start, UTC) for longer spans. Zero-revenue buckets are
  // filled in so the x-axis is honest time, not just "days with sales".
  const filteredForTrend = filtered;
  const trendStartMs =
    windowStartMs ??
    (filteredForTrend.length ? filteredForTrend[0].paidMs : Date.now() - 12 * 7 * DAY);
  const trendEndMs = windowEndMs ?? Date.now();
  const spanDays = Math.max(1, Math.ceil((trendEndMs - trendStartMs) / DAY));
  const bucket: 'day' | 'week' = spanDays <= 31 ? 'day' : 'week';

  function bucketStart(ms: number): number {
    const d = new Date(ms);
    d.setUTCHours(0, 0, 0, 0);
    if (bucket === 'week') {
      const day = (d.getUTCDay() + 6) % 7; // Mon=0
      d.setUTCDate(d.getUTCDate() - day);
    }
    return d.getTime();
  }
  const step = bucket === 'day' ? DAY : 7 * DAY;
  const pointMap = new Map<number, TrendPoint>();
  for (let ms = bucketStart(trendStartMs); ms < trendEndMs; ms += step) {
    pointMap.set(ms, {
      start: new Date(ms).toISOString().slice(0, 10),
      startMs: ms,
      endMs: ms + step,
      orders: 0,
      revenueCents: 0,
    });
  }
  for (const r of filteredForTrend) {
    const p = pointMap.get(bucketStart(r.paidMs));
    if (!p) continue;
    p.orders += 1;
    p.revenueCents += r.cents;
  }
  const trendPoints = [...pointMap.values()].sort((a, b) => a.startMs - b.startMs).slice(-92);

  // Buyer economics — identity metrics stay all-time; AOV follows the filters.
  const seen = new Set<string>();
  const buyersWithRepeat = new Set<string>();
  let returningBuyers = 0;
  let repeatRevenueCents = 0;
  let totalRevenueCents = 0;
  for (const r of base.rows) {
    totalRevenueCents += r.cents;
    if (seen.has(r.email)) {
      repeatRevenueCents += r.cents;
      if (!buyersWithRepeat.has(r.email)) {
        buyersWithRepeat.add(r.email);
        returningBuyers += 1;
      }
    } else {
      seen.add(r.email);
    }
  }

  // Top products inside the active filters — pure in-memory join on lines.
  const filteredIds = new Set(filtered.map((r) => r.id));
  const prodMap = new Map<string, ProductRow>();
  for (const l of base.lines) {
    if (!filteredIds.has(l.orderId)) continue;
    const cur =
      prodMap.get(l.title) ??
      ({ title: l.title, units: 0, revenueCents: 0, href: l.handle ? `/admin/products/${l.handle}` : undefined } as ProductRow);
    cur.units += l.qty;
    cur.revenueCents += l.unitCents * l.qty;
    prodMap.set(l.title, cur);
  }

  return {
    channelsWindow,
    channelsAll,
    channelNames: channelsAll.map((c) => c.channel),
    topAffiliates: (() => {
      const m = new Map<string, NamedRow>();
      for (const r of base.rows) {
        if (!r.affiliateName) continue;
        const cur =
          m.get(r.affiliateName) ??
          ({
            name: r.affiliateName,
            orders: 0,
            revenueCents: 0,
            href: r.affiliateId ? `/admin/affiliates/${r.affiliateId}` : undefined,
          } as NamedRow);
        cur.orders += 1;
        cur.revenueCents += r.cents;
        m.set(r.affiliateName, cur);
      }
      return [...m.values()].sort((a, b) => b.revenueCents - a.revenueCents).slice(0, 8);
    })(),
    topCodes: topNamed(filtered, (r) => (r.code ? r.code.toUpperCase() : null)),
    trend: { bucket, points: trendPoints },
    topProducts: [...prodMap.values()].sort((a, b) => b.revenueCents - a.revenueCents).slice(0, 8),
    buyers: {
      total: seen.size,
      returning: returningBuyers,
      repeatRatePct: seen.size ? Math.round((returningBuyers / seen.size) * 100) : 0,
      repeatRevenueCents,
      totalRevenueCents,
      aovWindowCents: filtered.length
        ? Math.round(filtered.reduce((s, r) => s + r.cents, 0) / filtered.length)
        : 0,
    },
    windowOrders: filtered.length,
    windowRevenueCents: filtered.reduce((s, r) => s + r.cents, 0),
    coverage: base.coverage,
  };
}
