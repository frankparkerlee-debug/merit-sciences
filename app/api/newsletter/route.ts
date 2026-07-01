import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import { wrapPractitionerEmail, heading, p, btn, note } from '@/lib/practitioner-email-shell';

export const runtime = 'nodejs';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://meritsciences.com').replace(/\/$/, '');
const WELCOME_CODE = 'WELCOME20';

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

export async function POST(req: Request) {
  const ctype = req.headers.get('content-type') ?? '';
  const isForm =
    ctype.includes('application/x-www-form-urlencoded') || ctype.includes('multipart/form-data');

  let email = '';
  let source = 'popup';
  if (isForm) {
    const fd = await req.formData();
    email = String(fd.get('email') ?? '').trim().toLowerCase();
    source = String(fd.get('source') ?? 'footer');
  } else {
    const body = await req.json().catch(() => ({}));
    email = String(body.email ?? '').trim().toLowerCase();
    source = String(body.source ?? 'popup');
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
      select: { id: true },
    });
    isNew = !existing;
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
