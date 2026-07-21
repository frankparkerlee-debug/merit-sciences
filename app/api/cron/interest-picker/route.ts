/**
 * The self-segmentation broadcast sender — routes the general list into the
 * compound sequences. Manually triggered, tag-deduped, batched (same pattern
 * as /api/cron/lab-report).
 *
 *   GET /api/cron/interest-picker?tag=<key>   ← required dedupe key
 *       &batch=150   max sends this invocation (default 150)
 *       &to=me@x.com TEST MODE: one address, no tagging
 *       &dry=1       DRY RUN: counts + subject only
 *   Authorization: Bearer ${CRON_SECRET}
 *
 * Dedupe: pushes `picker-<tag>` into NewsletterSubscriber.tags; re-runs
 * resume where the last batch stopped. Each recipient's lane buttons carry
 * their email-bound token, so one tap enrolls THEM specifically.
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import { unsubToken, unsubUrl } from '@/lib/prospect-journey';
import { renderInterestPicker, type PickerLane } from '@/lib/interest-picker-email';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://meritsciences.com').replace(/\/$/, '');

// The six mechanism-class lanes → the category (cat-*) sequences. label + sub
// are research-framed, never outcomes. Each tap enrolls the recipient in that
// class's education sequence and lands them on the class hero PDP.
const LANES: { key: string; label: string; sub: string }[] = [
  { key: 'cat-incretin', label: 'Weight & GLP-1s', sub: 'the Ozempic / Mounjaro class' },
  { key: 'cat-cellular', label: 'NAD⁺ & longevity', sub: 'cellular-energy pathways' },
  { key: 'cat-gh-axis', label: 'Growth-hormone axis', sub: 'secretagogues + IGF-1' },
  { key: 'cat-repair', label: 'Tissue repair', sub: 'BPC-157, GHK-Cu & blends' },
  { key: 'cat-neuro', label: 'Neuropeptides', sub: 'Selank & Semax' },
  { key: 'cat-melanocortin', label: 'Vitality', sub: 'PT-141 & melanocortin' },
];

function laneLinksFor(email: string): PickerLane[] {
  const t = unsubToken(email);
  const e = encodeURIComponent(email);
  return LANES.map((l) => ({
    label: l.label,
    sub: l.sub,
    href: `${SITE}/enroll?seq=${l.key}&e=${e}&t=${t}`,
  }));
}

export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json({ ok: false, error: 'CRON_SECRET not configured on server' }, { status: 500 });
  }
  if (request.headers.get('authorization') !== `Bearer ${expected}`) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const tag = (url.searchParams.get('tag') || '').trim();
  if (!/^[a-z0-9-]{4,32}$/i.test(tag)) {
    return NextResponse.json(
      { ok: false, error: 'tag required (4-32 chars, alphanum/hyphen) — the dedupe key, e.g. ?tag=2026-07' },
      { status: 400 },
    );
  }
  const fullTag = `picker-${tag.toLowerCase()}`;
  const batch = Math.min(400, Math.max(1, parseInt(url.searchParams.get('batch') || '150', 10) || 150));
  const testTo = (url.searchParams.get('to') || '').trim().toLowerCase();
  const dry = url.searchParams.get('dry') === '1';

  try {
    if (testTo) {
      const { subject, html, text } = renderInterestPicker({
        lanes: laneLinksFor(testTo),
        unsubscribeUrl: unsubUrl(testTo),
      });
      const res = await sendEmail({ to: testTo, subject, html, text });
      return NextResponse.json({ ok: res.ok, mode: 'test', to: testTo, subject, ...(res.ok ? { id: res.id } : { error: res.error }) });
    }

    const recipients = await prisma.newsletterSubscriber.findMany({
      where: { isSubscribed: true, NOT: { tags: { has: fullTag } } },
      select: { id: true, email: true },
      orderBy: { createdAt: 'asc' },
      take: batch,
    });
    const totalUnsent = await prisma.newsletterSubscriber.count({
      where: { isSubscribed: true, NOT: { tags: { has: fullTag } } },
    });

    if (dry) {
      return NextResponse.json({ ok: true, mode: 'dry', tag: fullTag, wouldSendThisRun: recipients.length, totalUnsent, subject: 'What are you researching? (one tap)' });
    }

    let sent = 0;
    let errors = 0;
    for (const r of recipients) {
      try {
        const { subject, html, text } = renderInterestPicker({
          lanes: laneLinksFor(r.email),
          unsubscribeUrl: unsubUrl(r.email),
        });
        const res = await sendEmail({ to: r.email, subject, html, text });
        if (!res.ok) throw new Error(res.error);
        sent++;
      } catch (err) {
        console.error(`[interest-picker] send failed for ${r.email}`, err);
        errors++;
      }
      await prisma.newsletterSubscriber.update({ where: { id: r.id }, data: { tags: { push: fullTag } } });
    }

    return NextResponse.json({ ok: true, tag: fullTag, sent, errors, remaining: Math.max(0, totalUnsent - recipients.length) });
  } catch (err) {
    console.error('[cron/interest-picker] failed', err);
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : 'unknown' }, { status: 500 });
  }
}
