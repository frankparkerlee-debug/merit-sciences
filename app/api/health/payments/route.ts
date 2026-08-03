/**
 * GET /api/health/payments
 *
 * Reports which processor checkout will present, and why. Exists because on
 * 2026-08-01 checkout went down with both Stripe keys correctly set: the page
 * rendered "Payment processor not configured" and there was no way, short of
 * reading the RSC payload, to tell whether PAYMENTS_PROVIDER had actually
 * reached the running process. Two rebuilds were spent guessing.
 *
 * The key field is `rawPaymentsProvider`, which reports the env value the way
 * the process literally received it — JSON-escaped, with its length. That is
 * what distinguishes "the variable never arrived" (null) from "it arrived as
 * `\"stripe\"` with quotes" or "it arrived with a zero-width space", which look
 * identical in Render's UI and identical in a screenshot.
 *
 * SAFE TO EXPOSE: no secrets. Key *presence* and non-secret prefixes only — the
 * publishable key already ships to every browser, and a mode prefix (test/live)
 * is not a credential.
 */
import { NextResponse } from 'next/server';
import { paymentsProvider, stripeEnabled, paypalEnabled } from '@/lib/stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Mode prefix only — never the key. `sk_live_51ABC…` → `sk_live_`. */
function keyMode(v: string | undefined): string | null {
  const s = v?.trim();
  if (!s) return null;
  const m = /^(sk|pk|whsec)_(test|live)_/.exec(s);
  if (m) return `${m[1]}_${m[2]}_`;
  return s.startsWith('whsec_') ? 'whsec_' : '(unrecognized prefix)';
}

export async function GET() {
  const raw = process.env.PAYMENTS_PROVIDER;
  const provider = paymentsProvider();
  const stripeOk = stripeEnabled();
  const paypalOk = paypalEnabled();

  const secretMode = keyMode(process.env.STRIPE_SECRET_KEY);
  const publishableMode = keyMode(process.env.STRIPE_PUBLISHABLE_KEY);
  const webhookSet = !!process.env.STRIPE_WEBHOOK_SECRET?.trim();

  // A live secret key paired with a test webhook secret (or vice versa) is the
  // silent killer: cards charge, signature verification fails, and nothing
  // fulfils — no PAID flip, no email, no commission.
  const modeMismatch =
    !!secretMode && !!publishableMode && secretMode.split('_')[1] !== publishableMode.split('_')[1];

  return NextResponse.json({
    // Which commit is actually SERVING this request. Render injects
    // RENDER_GIT_COMMIT at build time. Included because three separate
    // debugging rounds on 2026-08-02 were spent reasoning about production
    // behaviour from code that had never been deployed — the live SHA makes
    // that a one-second check instead of forensics on event timestamps.
    commit: (process.env.RENDER_GIT_COMMIT ?? '').slice(0, 7) || 'unknown',
    branch: process.env.RENDER_GIT_BRANCH ?? null,
    provider,
    reason: (() => {
      const n = (raw ?? '').trim().replace(/^["']|["']$/g, '').toLowerCase();
      if (n === 'stripe' || n === 'paypal') return `explicit PAYMENTS_PROVIDER=${n}`;
      if (raw != null) return 'PAYMENTS_PROVIDER present but unrecognized — fell back to credentials';
      return 'no PAYMENTS_PROVIDER — resolved from which processor has credentials';
    })(),
    // Exactly as the process received it, so pastes with quotes or invisible
    // characters are visible rather than inferred.
    rawPaymentsProvider: raw === undefined ? null : JSON.stringify(raw),
    rawPaymentsProviderLength: raw === undefined ? null : raw.length,
    stripe: {
      configured: stripeOk,
      secretKeyMode: secretMode,
      publishableKeyMode: publishableMode,
      webhookSecretSet: webhookSet,
      warnings: [
        modeMismatch && 'STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY are in different modes.',
        stripeOk && !webhookSet && 'STRIPE_WEBHOOK_SECRET is not set — payments will succeed but nothing will fulfil.',
      ].filter(Boolean),
    },
    paypal: { configured: paypalOk },
    ops: opsRecipients(),
  });
}

/**
 * Shape of ADMIN_EMAILS as the running process sees it.
 *
 * Ops notifications and the /admin gate both read this one variable, and when
 * it is empty BOTH fail silently — no new-order email, and nobody can log in.
 * On 2026-08-02 it read as empty in production while being present in Render's
 * UI, and there was no way to tell "absent" from "present but unparseable"
 * without shipping a probe.
 *
 * Addresses are masked because this endpoint is unauthenticated. The masked
 * form still shows whether the RIGHT mailbox is on the list, which is the
 * question actually being asked.
 */
function opsRecipients() {
  const raw = process.env.ADMIN_EMAILS;
  const parsed = (raw ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  return {
    count: parsed.length,
    masked: parsed.map(maskEmail),
    rawLength: raw === undefined ? null : raw.length,
    // A value pasted with surrounding quotes splits into fragments that carry
    // a stray " on the first and last entries, so those two never match — the
    // failure looks identical to "not set" in every UI.
    looksQuoted: /^["'].*["']$/.test((raw ?? '').trim()),
    warnings: [
      parsed.length === 0 &&
        'ADMIN_EMAILS is empty — ops notifications will not send AND /admin is locked to everyone.',
    ].filter(Boolean),
  };
}

/** `frank.parker.lee@gmail.com` → `f***e@gmail.com` */
function maskEmail(e: string): string {
  const [user, domain] = e.split('@');
  if (!domain) return '***';
  const head = user.slice(0, 1);
  const tail = user.length > 1 ? user.slice(-1) : '';
  return `${head}***${tail}@${domain}`;
}
