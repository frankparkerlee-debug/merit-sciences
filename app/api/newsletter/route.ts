import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import { wrapPractitionerEmail, heading, p, btn, note } from '@/lib/practitioner-email-shell';

export const runtime = 'nodejs';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://meritsciences.com').replace(/\/$/, '');
const WELCOME_CODE = 'WELCOME20';

/* ── Signed submission token ─────────────────────────────────────────────
   The Aug-5 gates (honeypot / Origin / rate limit) did not stop the
   list-bombing: the addresses are REAL scraped ones, the bots send a
   Referer, rotate IPs, and post only the visible field. What they do NOT
   do is execute our client code. Every legitimate consumer of this API is
   a client component, so each now GETs a short-lived signed token and
   threads it into the POST. No token, no signup — the response still says
   ok so the bot doesn't adapt. */
import { createHmac, timingSafeEqual } from 'crypto';

function tokenSecret(): string {
  return createHmac('sha256', process.env.CRON_SECRET || 'dev-secret')
    .update('newsletter-token-v1')
    .digest('hex');
}

function mintToken(): string {
  const ts = Date.now().toString(36);
  const sig = createHmac('sha256', tokenSecret()).update(ts).digest('base64url').slice(0, 24);
  return `${ts}.${sig}`;
}

function tokenValid(t: string): boolean {
  const dot = t.indexOf('.');
  if (dot <= 0) return false;
  const ts = t.slice(0, dot);
  const given = t.slice(dot + 1);
  const expected = createHmac('sha256', tokenSecret()).update(ts).digest('base64url').slice(0, 24);
  if (given.length !== expected.length) return false;
  try {
    if (!timingSafeEqual(Buffer.from(given), Buffer.from(expected))) return false;
  } catch {
    return false;
  }
  const age = Date.now() - parseInt(ts, 36);
  return age >= 0 && age < 24 * 60 * 60 * 1000;
}

/** Clients fetch their submission token here before posting. */
export async function GET() {
  return NextResponse.json({ t: mintToken() }, { headers: { 'cache-control': 'no-store' } });
}

/**
 * Newsletter / subscribe-popup capture.
 *
 * Accepts JSON (popup fetch) or form-encoded (the homepage <form> POST,
 * which previously 404'd — this route is its missing handler). Captures the
 * email, ensures the WELCOME20 first-order discount exists, and sends a
 * branded welcome email carrying the code. The welcome email is the first
 * touch of the nurture funnel.
 */

// Idempotent: create the 20%-off first-order code if it isn't there yet.
// update:{} so we never clobber an admin-edited version.
async function ensureWelcomeDiscount() {
  await prisma.discount.upsert({
    where: { code: WELCOME_CODE.toLowerCase() },
    update: {},
    create: {
      code: WELCOME_CODE.toLowerCase(),
      title: 'Welcome — 20% off first order',
      type: 'PERCENT',
      value: 2000, // 20% in basis points
      oncePerCustomer: true,
    },
  });
}

// The footer form was getting 25-40 bot signups/day (list-bombing: temp-mail
// and scraped corporate addresses POSTed straight at this endpoint). Three
// cheap gates, all of which return a fake "ok" so bots don't adapt:
// honeypot field, Origin allowlist, and a per-IP rate limit.
const DISPOSABLE_DOMAINS = new Set([
  'besttempmail.com', 'justdefinition.com', 'tempmail.com', 'mailinator.com',
  'guerrillamail.com', '10minutemail.com', 'yopmail.com', 'sharklasers.com',
  'trashmail.com', 'temp-mail.org', 'getnada.com', 'dropmail.me', 'maildrop.cc',
]);

const ipHits = new Map<string, { count: number; windowStart: number }>();
const RATE_WINDOW_MS = 60 * 60 * 1000;
const RATE_MAX = 5;

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const hit = ipHits.get(ip);
  if (!hit || now - hit.windowStart > RATE_WINDOW_MS) {
    ipHits.set(ip, { count: 1, windowStart: now });
    if (ipHits.size > 5000) ipHits.clear(); // crude memory bound
    return false;
  }
  hit.count += 1;
  return hit.count > RATE_MAX;
}

function originAllowed(req: Request): boolean {
  const origin = req.headers.get('origin') ?? req.headers.get('referer') ?? '';
  // Browsers always send Origin on cross- and same-origin POSTs; a missing or
  // foreign origin means a scripted client.
  if (!origin) return false;
  try {
    const host = new URL(origin).hostname;
    return (
      host === 'meritsciences.com' ||
      host.endsWith('.meritsciences.com') ||
      host === 'merit-sciences.onrender.com' ||
      host === 'localhost'
    );
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  const ctype = req.headers.get('content-type') ?? '';
  const isForm =
    ctype.includes('application/x-www-form-urlencoded') || ctype.includes('multipart/form-data');

  const fakeOk = () =>
    isForm
      ? NextResponse.redirect(`${SITE_URL}/?subscribe=ok#newsletter`, 303)
      : NextResponse.json({ ok: true, code: WELCOME_CODE });

  /* Form-encoded submissions are REJECTED outright. Every live consumer of
     this API (popup, LP capture, /access gate) posts JSON; there is no
     form-encoded surface on the site anymore. The 948-address "footer" list
     — 30-43 bot signups/day, ZERO buyers ever, boeing.com next to
     besttempmail.com — arrived entirely through this shape. The bot still
     sees a success redirect so it has nothing to adapt to. */
  if (isForm) {
    console.warn('[newsletter] rejected form-encoded signup (bot vector)');
    return fakeOk();
  }

  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? '').trim().toLowerCase();
  const source = String(body.source ?? 'popup');
  const honeypot = String(body.website ?? '').trim();
  const token = String(body.t ?? '');

  const ip =
    (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown';
  const domain = email.split('@')[1] ?? '';
  if (!tokenValid(token) || honeypot || !originAllowed(req) || rateLimited(ip) || DISPOSABLE_DOMAINS.has(domain)) {
    console.warn('[newsletter] rejected signup', {
      ip, source, domain, honeypot: !!honeypot, badToken: !tokenValid(token),
    });
    return fakeOk();
  }

  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!valid) {
    if (isForm) return NextResponse.redirect(`${SITE_URL}/?subscribe=error#newsletter`, 303);
    return NextResponse.json({ ok: false, error: 'Enter a valid email.' }, { status: 400 });
  }

  let isNew = false;
  try {
    const existing = await prisma.newsletterSubscriber.findUnique({
      where: { email },
      select: { id: true, tags: true },
    });
    isNew = !existing;
    // A quarantined (list-bombed) address never auto-resubscribes — the bot
    // re-posting its scraped list must not undo the scrub. A real owner of
    // one of these addresses can write in; nobody has.
    if (existing?.tags?.some((t) => t.startsWith('scrub-'))) {
      console.warn('[newsletter] blocked resubscribe of quarantined address', { domain });
      return fakeOk();
    }
    await prisma.newsletterSubscriber.upsert({
      where: { email },
      update: { isSubscribed: true, unsubscribedAt: null },
      create: {
        email,
        source,
        tags: [`${source}-signup`, 'discount-20'],
        isSubscribed: true,
        dripStartedAt: new Date(), // start the nurture clock at signup
      },
    });
    await ensureWelcomeDiscount();
  } catch (err) {
    console.error('[newsletter] capture failed', err);
    if (isForm) return NextResponse.redirect(`${SITE_URL}/?subscribe=error#newsletter`, 303);
    return NextResponse.json({ ok: false, error: 'Something went wrong. Try again.' }, { status: 500 });
  }

  // Welcome email only on the first subscribe (don't re-spam re-submits).
  // Fire-and-forget so a slow/failed send never blocks the response.
  if (isNew) {
    const codeChip = `<span style="display:inline-block;font-family:monospace;font-size:18px;font-weight:800;letter-spacing:0.08em;background:#F4F1EA;border:1px dashed #C9CBD1;border-radius:8px;padding:10px 18px;">${WELCOME_CODE}</span>`;
    const bodyHtml =
      heading('Welcome to Merit Sciences.') +
      p('Here’s <strong>20% off your first order</strong> — use this code at checkout:') +
      p(codeChip) +
      btn('Shop the catalog →', `${SITE_URL}/catalog`) +
      note('Every lot is HPLC-tested to ≥99% purity and ships with its Certificate of Analysis. For research use only.');
    sendEmail({
      to: email,
      subject: `Your 20% code: ${WELCOME_CODE}`,
      html: wrapPractitionerEmail({
        subject: `Your 20% code: ${WELCOME_CODE}`,
        eyebrow: 'Welcome · 20% off',
        bodyHtml,
        footerNote: 'Merit Sciences &middot; Dallas, TX',
      }),
    }).catch((err) => console.error('[newsletter] welcome email failed', err));
  }

  if (isForm) return NextResponse.redirect(`${SITE_URL}/?subscribe=ok#newsletter`, 303);
  return NextResponse.json({ ok: true, code: WELCOME_CODE });
}
