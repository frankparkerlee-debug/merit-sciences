/**
 * The Lab Report broadcast sender — manually triggered (editorial cadence,
 * not a schedule), tag-deduped so a re-run can never double-send, batched so
 * a big list warms out over several invocations.
 *
 *   GET /api/cron/lab-report?tag=2026-07            ← required dedupe key
 *       &days=30        window for "new lots" (default 30)
 *       &batch=150      max sends this invocation (default 150)
 *       &vote=A,B,C     reply-to-vote options (optional)
 *       &code=WELCOME20 promo to ride the CTAs (optional — omit for none)
 *       &to=me@x.com    TEST MODE: send only to this address, no tagging
 *       &dry=1          DRY RUN: report counts + subject, send nothing
 *   Authorization: Bearer ${CRON_SECRET}
 *
 * Dedupe: each send pushes `labreport-<tag>` into NewsletterSubscriber.tags;
 * recipients are selected where that tag is absent. Re-invoking with the same
 * tag resumes exactly where the last batch stopped. New issue = new tag.
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import { renderLabReport, type LabReportLot } from '@/lib/lab-report-email';
import { unsubUrl } from '@/lib/prospect-journey';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function parsePurity(s: string): number {
  const n = parseFloat(String(s).replace(/[^0-9.]/g, ''));
  return isFinite(n) ? n : NaN;
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
      { ok: false, error: 'tag required (4-32 chars, alphanum/hyphen) — it is the dedupe key, e.g. ?tag=2026-07' },
      { status: 400 },
    );
  }
  const fullTag = `labreport-${tag.toLowerCase()}`;
  const days = Math.min(120, Math.max(1, parseInt(url.searchParams.get('days') || '30', 10) || 30));
  const batch = Math.min(400, Math.max(1, parseInt(url.searchParams.get('batch') || '150', 10) || 150));
  const voteOptions = (url.searchParams.get('vote') || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 4);
  const code = (url.searchParams.get('code') || '').trim().toUpperCase() || undefined;
  const testTo = (url.searchParams.get('to') || '').trim().toLowerCase();
  const dry = url.searchParams.get('dry') === '1';

  const started = Date.now();
  try {
    // ── Issue content: new lots in the window + running ledger stats ──────
    const since = new Date(Date.now() - days * 24 * 3600 * 1000);
    const [recent, all] = await Promise.all([
      prisma.coa.findMany({
        where: { createdAt: { gte: since } },
        orderBy: { createdAt: 'desc' },
        select: { compound: true, lotId: true, purity: true, testedDate: true },
        take: 24,
      }),
      prisma.coa.findMany({ select: { purity: true } }),
    ]);
    // De-dupe lots by lotId (latest first wins)
    const seen = new Set<string>();
    const lots: LabReportLot[] = [];
    for (const r of recent) {
      const k = r.lotId.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      lots.push(r);
    }
    const purities = all.map((c) => parsePurity(c.purity)).filter((n) => !isNaN(n) && n > 90);
    const meanPurity =
      purities.length > 0 ? `${(purities.reduce((a, b) => a + b, 0) / purities.length).toFixed(2)}%` : null;

    const issueLabel = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const renderFor = (email: string) =>
      renderLabReport({
        issueLabel,
        lots,
        totalPublished: all.length,
        meanPurity,
        voteOptions,
        code,
        unsubscribeUrl: unsubUrl(email),
      });

    // ── TEST MODE: one address, no tagging ───────────────────────────────
    if (testTo) {
      const { subject, html, text } = renderFor(testTo);
      const res = await sendEmail({ to: testTo, subject, html, text });
      return NextResponse.json({
        ok: res.ok,
        mode: 'test',
        to: testTo,
        subject,
        lots: lots.length,
        ...(res.ok ? { id: res.id } : { error: res.error }),
      });
    }

    // ── Recipient batch: subscribed, not yet tagged for this issue ───────
    const recipients = await prisma.newsletterSubscriber.findMany({
      where: { isSubscribed: true, NOT: { tags: { has: fullTag } } },
      select: { id: true, email: true },
      orderBy: { createdAt: 'asc' },
      take: batch,
    });
    const remainingAfter = await prisma.newsletterSubscriber.count({
      where: { isSubscribed: true, NOT: { tags: { has: fullTag } } },
    });

    if (dry) {
      const preview = renderFor('preview@meritsciences.com');
      return NextResponse.json({
        ok: true,
        mode: 'dry',
        tag: fullTag,
        wouldSendThisRun: recipients.length,
        totalUnsent: remainingAfter,
        lots: lots.length,
        totalPublished: all.length,
        meanPurity,
        subject: preview.subject,
      });
    }

    let sent = 0;
    let errors = 0;
    for (const r of recipients) {
      try {
        const { subject, html, text } = renderFor(r.email);
        const res = await sendEmail({ to: r.email, subject, html, text });
        if (!res.ok) throw new Error(res.error);
        sent++;
      } catch (err) {
        console.error(`[lab-report] send failed for ${r.email}`, err);
        errors++;
        // Tag anyway — a hard-bouncing address must not wedge the batch loop
        // on every re-run. Resend's suppression handles true bounces.
      }
      await prisma.newsletterSubscriber.update({
        where: { id: r.id },
        data: { tags: { push: fullTag } },
      });
    }

    return NextResponse.json({
      ok: true,
      tag: fullTag,
      sent,
      errors,
      remaining: Math.max(0, remainingAfter - recipients.length),
      lots: lots.length,
      durationMs: Date.now() - started,
    });
  } catch (err) {
    console.error('[cron/lab-report] failed', err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'unknown' },
      { status: 500 },
    );
  }
}
