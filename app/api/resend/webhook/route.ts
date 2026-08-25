/**
 * POST /api/resend/webhook — bounce & complaint feedback loop.
 *
 * Until this existed, a hard-bouncing address kept receiving every drip and
 * broadcast forever: nothing fed Resend's delivery outcomes back into the
 * subscriber list, and repeated sends to dead addresses are the classic
 * sender-reputation killer — independent of the bot-signup problem.
 *
 * On `email.bounced` or `email.complained`, every recipient of that message
 * is suppressed in newsletter_subscribers (isSubscribed=false + a tag naming
 * the reason). Transactional order email is deliberately NOT suppressed — a
 * buyer's receipt must always attempt delivery.
 *
 * ARMING (one-time, Resend dashboard — needs Parker's login):
 *   1. resend.com → Webhooks → Add endpoint
 *      URL: https://meritsciences.com/api/resend/webhook
 *      Events: email.bounced, email.complained
 *   2. Copy the signing secret (whsec_…) → Render env RESEND_WEBHOOK_SECRET
 *   3. Redeploy. Until the env is set this endpoint answers 503 and does
 *      nothing, so it is safe to ship ahead of the dashboard step.
 *
 * Signature scheme is Svix (what Resend uses): HMAC-SHA256 over
 * "{svix-id}.{svix-timestamp}.{raw body}" keyed with the base64-decoded
 * secret; header `svix-signature` holds space-separated "v1,<base64sig>"
 * candidates. Verified manually — no svix dependency.
 */
import { NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function verifySvix(req: Request, rawBody: string): boolean {
  const secret = process.env.RESEND_WEBHOOK_SECRET ?? '';
  if (!secret.startsWith('whsec_')) return false;
  const id = req.headers.get('svix-id') ?? '';
  const ts = req.headers.get('svix-timestamp') ?? '';
  const sigHeader = req.headers.get('svix-signature') ?? '';
  if (!id || !ts || !sigHeader) return false;
  // Reject replays older than 5 minutes.
  const age = Math.abs(Date.now() / 1000 - Number(ts));
  if (!Number.isFinite(age) || age > 300) return false;

  const key = Buffer.from(secret.slice('whsec_'.length), 'base64');
  const expected = createHmac('sha256', key).update(`${id}.${ts}.${rawBody}`).digest('base64');
  for (const candidate of sigHeader.split(' ')) {
    const [version, sig] = candidate.split(',');
    if (version !== 'v1' || !sig) continue;
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    try {
      if (a.length === b.length && timingSafeEqual(a, b)) return true;
    } catch {
      /* length mismatch — keep scanning */
    }
  }
  return false;
}

export async function POST(req: Request) {
  if (!process.env.RESEND_WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: 'RESEND_WEBHOOK_SECRET not configured — endpoint disarmed. See file header for setup.' },
      { status: 503 },
    );
  }

  const rawBody = await req.text();
  if (!verifySvix(req, rawBody)) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }

  const type = String(event?.type ?? '');
  if (type !== 'email.bounced' && type !== 'email.complained') {
    return NextResponse.json({ ok: true, ignored: type });
  }

  const tag = type === 'email.bounced' ? 'suppressed-bounce' : 'suppressed-complaint';
  const recipients: string[] = (Array.isArray(event?.data?.to) ? event.data.to : [event?.data?.to])
    .filter(Boolean)
    .map((e: string) => e.toLowerCase());

  let suppressed = 0;
  for (const email of recipients) {
    const row = await prisma.newsletterSubscriber.findUnique({
      where: { email },
      select: { id: true, tags: true, isSubscribed: true },
    });
    if (!row) continue;
    await prisma.newsletterSubscriber.update({
      where: { id: row.id },
      data: {
        isSubscribed: false,
        unsubscribedAt: new Date(),
        ...(row.tags.includes(tag) ? {} : { tags: { push: tag } }),
      },
    });
    suppressed += 1;
  }
  if (suppressed > 0) {
    console.warn(`[resend-webhook] ${type}: suppressed ${suppressed} subscriber(s)`);
  }
  return NextResponse.json({ ok: true, type, suppressed });
}
