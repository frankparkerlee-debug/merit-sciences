'use client';

import { useMemo, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';

type Sub = {
  id: string;
  status: string;
  cadence: string;
  nextChargeAt: string;
  card: string | null;
  shipTo: string;
  lines: Array<{ title: string; qty: number; lineCents: number; imageUrl: string | null }>;
  subtotalCents: number | null;
  shippingCents: number | null;
  totalCents: number | null;
  failedAttempts: number;
  cycleCount: number;
};

const money = (c: number) => `$${(c / 100).toFixed(2)}`;
const day = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'America/Chicago' });

const STATUS: Record<string, { label: string; tone: string }> = {
  ACTIVE: { label: 'Active', tone: 'bg-emerald-100 text-emerald-900' },
  PAUSED: { label: 'Paused', tone: 'bg-amber-100 text-amber-900' },
  PAST_DUE: { label: 'Payment needed', tone: 'bg-rose-100 text-rose-900' },
  CANCELED: { label: 'Canceled', tone: 'bg-ink/10 text-ink' },
};

export function ManageSubscription({ token, initial }: { token: string; initial: Sub }) {
  const [sub, setSub] = useState<Sub>(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cardSecret, setCardSecret] = useState<string | null>(null);
  const [pk, setPk] = useState<string | null>(null);
  const stripePromise = useMemo(() => (pk ? loadStripe(pk) : null), [pk]);

  async function act(action: 'skip' | 'pause' | 'resume' | 'cancel', done: string) {
    setBusy(action); setError(null); setNote(null);
    try {
      const r = await fetch('/api/subscription/manage', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, action }),
      });
      const d = await r.json();
      if (!r.ok) setError(d?.error || 'That did not work. Try again.');
      else { setSub(d.subscription); setNote(done); setConfirmCancel(false); }
    } catch { setError('Could not reach the server. Try again.'); }
    setBusy(null);
  }

  async function startCard() {
    setBusy('card'); setError(null); setNote(null);
    try {
      const r = await fetch('/api/subscription/card-intent', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }),
      });
      const d = await r.json();
      if (!r.ok) setError(d?.error || 'Could not open the card form.');
      else { setCardSecret(d.clientSecret); setPk(d.publishableKey); }
    } catch { setError('Could not reach the payment service. Try again.'); }
    setBusy(null);
  }

  const st = STATUS[sub.status] ?? STATUS.ACTIVE;
  const ended = sub.status === 'CANCELED';
  const paused = sub.status === 'PAUSED';
  const btn = 'rounded-xl border border-ink/15 bg-white px-4 py-3 text-[14px] font-bold text-ink text-left transition hover:border-cobalt disabled:opacity-50';

  return (
    <main className="bg-cream min-h-screen">
      <div className="max-w-[560px] mx-auto px-5 sm:px-6 pt-12 pb-20">
        <div className="flex items-center justify-between gap-3 mb-3">
          <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold">Your subscription</p>
          <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${st.tone}`}>{st.label}</span>
        </div>
        <h1 className="font-display font-black text-ink tracking-[-0.03em] leading-[1.02] mb-6" style={{ fontSize: 'clamp(28px, 5vw, 40px)' }}>
          {ended ? 'This subscription has ended' : paused ? 'Paused. Nothing ships until you resume' : `Ships ${sub.cadence}`}
          <span className="text-cobalt">.</span>
        </h1>

        {note && <div className="mb-5 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-[13px] font-bold text-emerald-900">{note}</div>}
        {error && <div className="mb-5 rounded-lg border border-rose-300 bg-rose-50 px-4 py-3 text-[13px] font-bold text-rose-800">{error}</div>}

        <div className="rounded-2xl bg-white border border-ink/10 p-5 mb-5">
          <ul className="divide-y divide-ink/10">
            {sub.lines.map((l, i) => (
              <li key={i} className="flex items-center gap-3 py-3 first:pt-0">
                {l.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={l.imageUrl} alt="" width={56} height={56} className="h-14 w-14 rounded-lg bg-cream object-cover" />
                ) : (
                  <div className="h-14 w-14 rounded-lg bg-cream" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-bold text-ink truncate">{l.title}</p>
                  <p className="text-[12px] text-ink-soft">Qty {l.qty}</p>
                </div>
                <p className="text-[14px] font-bold text-ink">{money(l.lineCents)}</p>
              </li>
            ))}
          </ul>
          {!ended && sub.totalCents != null && (
            <dl className="mt-3 border-t-2 border-ink pt-3 text-[13px] text-ink-soft space-y-1">
              <div className="flex justify-between"><dt>Shipping</dt><dd>{sub.shippingCents ? money(sub.shippingCents) : 'Free'}</dd></div>
              <div className="flex justify-between text-ink text-[16px] font-extrabold"><dt>Each renewal</dt><dd>{money(sub.totalCents)}</dd></div>
            </dl>
          )}
        </div>

        {!ended && (
          <dl className="rounded-2xl bg-white border border-ink/10 p-5 mb-5 text-[14px] space-y-3">
            <div>
              <dt className="text-[11px] uppercase tracking-wider font-bold text-ink-soft">{paused ? 'Was due' : sub.status === 'PAST_DUE' ? 'Next attempt' : 'Next charge'}</dt>
              <dd className="text-ink font-bold">{day(sub.nextChargeAt)}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wider font-bold text-ink-soft">Card</dt>
              <dd className="text-ink capitalize">{sub.card ?? 'Card on file'}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wider font-bold text-ink-soft">Ships to</dt>
              <dd className="text-ink">{sub.shipTo}</dd>
            </div>
          </dl>
        )}

        {!ended && !cardSecret && (
          <div className="grid gap-2.5">
            {!paused && (
              <button className={btn} disabled={!!busy} onClick={() => act('skip', 'Skipped. Your next shipment moved out one cycle.')}>
                {busy === 'skip' ? 'Skipping…' : 'Skip the next shipment'}
                <span className="block text-[12px] font-normal text-ink-soft">Moves the next charge out one cycle.</span>
              </button>
            )}
            {paused ? (
              <button className={btn} disabled={!!busy} onClick={() => act('resume', 'Resumed. We will email you three days before the next charge.')}>
                {busy === 'resume' ? 'Resuming…' : 'Resume my subscription'}
              </button>
            ) : (
              <button className={btn} disabled={!!busy} onClick={() => act('pause', 'Paused. Nothing will be charged or shipped until you resume.')}>
                {busy === 'pause' ? 'Pausing…' : 'Pause'}
                <span className="block text-[12px] font-normal text-ink-soft">Stops charges and shipments until you resume.</span>
              </button>
            )}
            <button className={btn} disabled={!!busy} onClick={startCard}>
              {busy === 'card' ? 'Opening…' : 'Use a different card'}
            </button>
            {!confirmCancel ? (
              <button className={`${btn} text-rose-800`} disabled={!!busy} onClick={() => setConfirmCancel(true)}>
                Cancel subscription
              </button>
            ) : (
              <div className="rounded-xl border border-rose-300 bg-rose-50 p-4">
                <p className="text-[14px] font-bold text-rose-900 mb-3">Cancel for good? You will not be charged again.</p>
                <div className="flex gap-2">
                  <button className="rounded-lg bg-rose-700 px-4 py-2.5 text-[13px] font-bold text-white disabled:opacity-50" disabled={!!busy} onClick={() => act('cancel', 'Canceled. You will not be charged again.')}>
                    {busy === 'cancel' ? 'Canceling…' : 'Yes, cancel it'}
                  </button>
                  <button className="rounded-lg border border-ink/15 bg-white px-4 py-2.5 text-[13px] font-bold text-ink" onClick={() => setConfirmCancel(false)}>
                    Keep it
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {cardSecret && stripePromise && (
          <div className="rounded-2xl bg-white border border-ink/10 p-5">
            <p className="text-[14px] font-bold text-ink mb-1">New card</p>
            <p className="text-[12px] text-ink-soft mb-4">Nothing is charged now. This card is used for your renewals from here on.</p>
            <Elements stripe={stripePromise} options={{ clientSecret: cardSecret, appearance: { theme: 'flat', variables: { colorPrimary: '#2E4DDB', borderRadius: '10px' } } }}>
              <CardForm
                token={token}
                onSaved={(s, label) => { setSub(s); setCardSecret(null); setNote(`Card saved: ${label}.`); }}
                onCancel={() => setCardSecret(null)}
              />
            </Elements>
          </div>
        )}

        <p className="mt-8 text-[12px] text-ink-muted leading-relaxed">
          Your per-vial price is locked for as long as you stay subscribed. Shipping is added to each renewal. We email you three days before
          every charge. For research use only. Not for human or veterinary use.
        </p>
      </div>
    </main>
  );
}

function CardForm({ token, onSaved, onCancel }: { token: string; onSaved: (s: Sub, label: string) => void; onCancel: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements || busy) return;
    setBusy(true); setErr(null);
    const { error, setupIntent } = await stripe.confirmSetup({ elements, redirect: 'if_required' });
    if (error || !setupIntent?.id) { setErr(error?.message || 'That card could not be saved.'); setBusy(false); return; }
    try {
      const r = await fetch('/api/subscription/card-save', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, setupIntentId: setupIntent.id }),
      });
      const d = await r.json();
      if (!r.ok) setErr(d?.error || 'That card could not be saved.');
      else onSaved(d.subscription, `${d.brand} ending ${d.last4}`);
    } catch { setErr('Card confirmed but not recorded. Reply to your subscription email before trying again.'); }
    setBusy(false);
  }

  return (
    <form onSubmit={onSubmit}>
      <PaymentElement options={{ layout: 'tabs' }} />
      {err && <p className="mt-3 text-[13px] font-bold text-rose-700">{err}</p>}
      <div className="mt-4 flex gap-2">
        <button type="submit" disabled={!stripe || busy} className="rounded-xl bg-ink px-5 py-3 text-[14px] font-bold text-white disabled:opacity-50">
          {busy ? 'Saving…' : 'Save card'}
        </button>
        <button type="button" onClick={onCancel} className="rounded-xl border border-ink/15 bg-white px-5 py-3 text-[14px] font-bold text-ink">
          Back
        </button>
      </div>
    </form>
  );
}
