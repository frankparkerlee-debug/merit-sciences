/**
 * GET /api/health/paypal
 *
 * Reports whether the server can authenticate to PayPal, and if not, PayPal's
 * literal error. Exists because create-order catches everything and returns a
 * generic "Could not start checkout" — which has now hidden three separate
 * multi-hour outages whose real cause was a mismatched credential pair.
 *
 * SAFE TO EXPOSE: never returns the client secret. The client id prefix is
 * already public (it ships to every browser in the SDK URL), and PAYPAL_ENV is
 * configuration, not a credential. Everything else is a boolean or PayPal's
 * own error string.
 */
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const LIVE = 'https://api-m.paypal.com';
const SANDBOX = 'https://api-m.sandbox.paypal.com';

export async function GET() {
  const id = process.env.PAYPAL_CLIENT_ID?.trim() ?? '';
  const secret = process.env.PAYPAL_CLIENT_SECRET?.trim() ?? '';
  const env = process.env.PAYPAL_ENV?.trim() ?? '(unset)';
  const base = env === 'live' ? LIVE : SANDBOX;

  const config = {
    PAYPAL_ENV: env,
    // `?? 'sandbox'` in lib/paypal.ts means anything other than exactly "live"
    // silently targets sandbox — live credentials then fail with invalid_client.
    resolvedApi: base === LIVE ? 'live' : 'sandbox',
    clientIdPresent: !!id,
    clientIdPrefix: id ? id.slice(0, 10) + '…' : null,
    clientIdLength: id.length || null,
    clientSecretPresent: !!secret,
    clientSecretLength: secret.length || null,
  };

  if (!id || !secret) {
    return NextResponse.json(
      { ok: false, stage: 'config', problem: 'PAYPAL_CLIENT_ID and/or PAYPAL_CLIENT_SECRET is not set', config },
      { status: 200 },
    );
  }

  try {
    const res = await fetch(`${base}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: 'grant_type=client_credentials',
      cache: 'no-store',
    });

    const text = await res.text();
    if (res.ok) {
      return NextResponse.json({ ok: true, stage: 'oauth', message: 'PayPal authentication succeeded.', config });
    }

    // PayPal returns {error, error_description} — surface both verbatim.
    let paypal: any = null;
    try { paypal = JSON.parse(text); } catch { paypal = { raw: text.slice(0, 300) }; }

    return NextResponse.json(
      {
        ok: false,
        stage: 'oauth',
        httpStatus: res.status,
        paypalError: paypal?.error ?? null,
        paypalErrorDescription: paypal?.error_description ?? null,
        // The two failures that actually happen, in plain language.
        likelyCause:
          paypal?.error === 'invalid_client'
            ? config.resolvedApi === 'sandbox'
              ? 'PAYPAL_ENV is not "live", so live credentials are being sent to the sandbox API. Set PAYPAL_ENV=live.'
              : 'PAYPAL_CLIENT_SECRET does not match PAYPAL_CLIENT_ID. They are a matched pair — update the secret to the one issued with this client id.'
            : null,
        config,
      },
      { status: 200 },
    );
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, stage: 'network', problem: String(err?.message ?? err).slice(0, 300), config },
      { status: 200 },
    );
  }
}
