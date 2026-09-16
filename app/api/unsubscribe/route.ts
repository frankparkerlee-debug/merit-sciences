/**
 * POST /api/unsubscribe  — RFC 8058 one-click unsubscribe
 * GET  /api/unsubscribe  — redirect to the human confirmation page
 *
 * The `List-Unsubscribe` header Gmail and Yahoo render as an "Unsubscribe"
 * button next to the sender name points here. The spec requires the endpoint
 * to act on POST and nothing else, which is also what keeps it safe: the
 * link-prefetching scanners in front of corporate inboxes follow header URLs
 * with GET, and a GET that unsubscribed would quietly drop people who never
 * clicked anything. So GET only redirects; POST is the only verb that changes
 * state.
 *
 * Accepts either of the two token schemes already in use:
 *   ?e=<email>&t=<hmac>   newsletter / customer lifecycle
 *   ?token=<opaque>       practitioner journey
 *
 * Always answers 200. An unsubscribe that reports failure invites the mail
 * client to retry or, worse, to show the recipient an error and push them
 * toward the spam button instead — which is the outcome this whole endpoint
 * exists to avoid.
 */
import { NextResponse } from 'next/server';
import { unsubscribeNewsletter } from '@/lib/prospect-journey';
import { onUnsubscribe as unsubscribePractitioner } from '@/lib/practitioner-journey';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Render terminates TLS at its proxy and forwards to the app on localhost, so
 *  `new URL(req.url).origin` is `https://localhost:10000` here, not the public
 *  host. Redirect targets have to come from config. */
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://meritsciences.com').replace(/\/$/, '');

async function unsubscribe(params: URLSearchParams): Promise<boolean> {
  const token = params.get('token')?.trim();
  if (token) return unsubscribePractitioner(token);

  const email = params.get('e')?.trim();
  const t = params.get('t')?.trim();
  if (email && t) return unsubscribeNewsletter(email, t);

  return false;
}

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  let ok = false;
  try {
    ok = await unsubscribe(searchParams);
  } catch (err) {
    // A DB blip must not surface as a failed unsubscribe; log and move on.
    console.error('[unsubscribe] one-click failed:', err);
  }
  return NextResponse.json({ ok }, { status: 200 });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const page = url.searchParams.get('token')
    ? '/practitioners/unsubscribe'
    : '/unsubscribe';
  return NextResponse.redirect(`${SITE_URL}${page}${url.search}`, 302);
}
