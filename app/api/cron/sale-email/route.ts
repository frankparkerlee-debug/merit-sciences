/**
 * Sale broadcast sender (Black Friday 2026). Manually triggered, one beat at
 * a time, tag-deduped so a re-run can never double-send.
 *
 *   GET /api/cron/sale-email?beat=launch|reminder|favorites|lastday
 *       &batch=200      max sends this invocation (default 200, max 400)
 *       &to=me@x.com    TEST MODE: send only to this address, no tagging
 *       &dry=1          DRY RUN: report counts and subject, send nothing
 *   Authorization: Bearer ${CRON_SECRET}
 *
 * Audience: every subscribed NewsletterSubscriber (people who asked for
 * email). Past buyers who never joined the list are not included. Anyone with
 * a paid order on the sale code is skipped. Dedupe: each recipient gets the
 * tag `sale-<code>-<beat>`, and recipients are selected where it is absent.
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import { unsubUrl } from '@/lib/prospect-journey';
import { saleLaunch, saleReminder, saleFavorites, saleLastDay, type SaleData, type LineupProduct } from '@/lib/lifecycle-emails';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const SALE = { code: 'BLACKFRIDAY', pct: 30, endsLabel: 'Friday, December 4', endsAt: new Date('2026-12-05T06:00:00Z') };
const BEATS = { launch: saleLaunch, reminder: saleReminder, favorites: saleFavorites, lastday: saleLastDay } as const;

async function topProducts(): Promise<LineupProduct[]> {
  const since = new Date(Date.now() - 60 * 24 * 3600 * 1000);
  const rows = await prisma.orderLine.groupBy({
    by: ['handle'],
    where: { order: { createdAt: { gte: since }, status: { not: 'PENDING_PAYMENT' } } },
    _sum: { qty: true },
    orderBy: { _sum: { qty: 'desc' } },
    take: 20,
  });
  const products = await prisma.product.findMany({
    where: { handle: { in: rows.map((r) => r.handle) }, status: 'ACTIVE' },
    select: { handle: true, title: true, vialSize: true, priceCents: true, imageUrl: true },
  });
  const by = new Map(products.map((p) => [p.handle, p]));
  const out: LineupProduct[] = [];
  for (const r of rows) {
    const p = by.get(r.handle);
    if (!p || /bacteriostatic/i.test(p.title)) continue;
    out.push({ title: [p.title, p.vialSize].filter(Boolean).join(' '), priceCents: p.priceCents, handle: p.handle, imageUrl: p.imageUrl });
    if (out.length === 4) break;
  }
  return out;
}

export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return NextResponse.json({ ok: false, error: 'CRON_SECRET not configured on server' }, { status: 500 });
  if (request.headers.get('authorization') !== `Bearer ${expected}`) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const beat = (url.searchParams.get('beat') || '') as keyof typeof BEATS;
  if (!BEATS[beat]) return NextResponse.json({ ok: false, error: 'beat must be launch, reminder, favorites or lastday' }, { status: 400 });
  if (Date.now() > SALE.endsAt.getTime()) return NextResponse.json({ ok: false, error: 'sale has ended' }, { status: 400 });
  const batch = Math.min(400, Math.max(1, parseInt(url.searchParams.get('batch') || '200', 10) || 200));
  const testTo = (url.searchParams.get('to') || '').trim().toLowerCase();
  const dry = url.searchParams.get('dry') === '1';
  const tag = `sale-${SALE.code.toLowerCase()}-${beat}`;

  const products = beat === 'favorites' ? await topProducts() : undefined;
  const renderFor = (email: string) =>
    BEATS[beat]({ code: SALE.code, pct: SALE.pct, endsLabel: SALE.endsLabel, products, unsubscribeUrl: unsubUrl(email) } satisfies SaleData);

  if (testTo) {
    const { subject, html, text } = renderFor(testTo);
    const res = await sendEmail({ to: testTo, subject, html, text, stream: 'marketing', unsubscribeUrl: unsubUrl(testTo) });
    return NextResponse.json({ ok: res.ok, mode: 'test', to: testTo, subject, ...(res.ok ? { id: res.id } : { error: res.error }) });
  }

  // Anyone who already bought on the code is done with this sale.
  const used = new Set(
    (
      await prisma.order.findMany({
        where: { discountCode: { equals: SALE.code, mode: 'insensitive' }, status: { not: 'PENDING_PAYMENT' } },
        select: { customerEmail: true },
      })
    ).map((o) => o.customerEmail.trim().toLowerCase()),
  );

  const where = { isSubscribed: true, NOT: { tags: { has: tag } } };

  if (dry) {
    const onList = await prisma.newsletterSubscriber.count({ where });
    return NextResponse.json({
      ok: true, mode: 'dry', tag, beat,
      subscribersUnsent: onList, alreadyUsedCode: used.size,
      subject: renderFor('preview@meritsciences.com').subject,
      products: products?.map((p) => p.title),
    });
  }

  const recipients = await prisma.newsletterSubscriber.findMany({ where, select: { id: true, email: true }, orderBy: { createdAt: 'asc' }, take: batch });
  let sent = 0, skipped = 0, errors = 0;
  for (const r of recipients) {
    try {
      if (used.has(r.email.toLowerCase())) {
        skipped++;
      } else {
        const { subject, html, text } = renderFor(r.email);
        const res = await sendEmail({ to: r.email, subject, html, text, stream: 'marketing', unsubscribeUrl: unsubUrl(r.email) });
        if (!res.ok) throw new Error(res.error);
        sent++;
      }
      await prisma.newsletterSubscriber.update({ where: { id: r.id }, data: { tags: { push: tag } } });
    } catch (err) {
      console.error(`[sale-email] send failed for ${r.email}`, err);
      errors++;
    }
    await new Promise((res) => setTimeout(res, 550)); // stay under Resend's rate limit
  }
  const remaining = await prisma.newsletterSubscriber.count({ where });
  return NextResponse.json({ ok: true, mode: 'send', tag, beat, sent, skipped, errors, remaining });
}
