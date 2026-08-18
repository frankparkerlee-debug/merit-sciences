'use client';

import { useState } from 'react';

type Props = {
  card: { brand: string; last4: string; expMonth: number; expYear: number } | null;
};

/**
 * Card-on-file panel.
 *
 * "Add a card" does not render a card form here — it asks the server for a
 * one-time link and sends the practice to the checkout domain, because Stripe
 * must never see the storefront host. The redirect is the feature, not a
 * detour.
 */
export function CardOnFile({ card }: Props) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [removed, setRemoved] = useState(false);

  const current = removed ? null : card;

  async function startSetup() {
    setBusy(true); setErr(null);
    try {
      const r = await fetch('/api/practitioner/card/start', { method: 'POST' });
      const d = await r.json();
      if (!r.ok || !d?.url) { setErr(d?.error || 'Could not open card setup.'); setBusy(false); return; }
      window.location.href = d.url;
    } catch {
      setErr('Could not open card setup.'); setBusy(false);
    }
  }

  async function remove() {
    setBusy(true); setErr(null);
    try {
      const r = await fetch('/api/practitioner/card/remove', { method: 'POST' });
      if (!r.ok) { setErr('Could not remove that card.'); setBusy(false); return; }
      setRemoved(true);
    } catch {
      setErr('Could not remove that card.');
    }
    setBusy(false);
  }

  return (
    <div className="rounded-2xl border border-cobalt/15 bg-white p-6">
      <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold mb-3">
        — Payment
      </p>

      {current ? (
        <>
          <p className="font-display text-[18px] font-extrabold text-ink capitalize leading-tight">
            {current.brand} ending {current.last4}
          </p>
          <p className="text-[12px] text-ink-soft mt-1">
            Expires {String(current.expMonth).padStart(2, '0')}/{String(current.expYear).slice(-2)} · used for
            future orders so you don&rsquo;t re-enter it.
          </p>
          <div className="flex items-center gap-4 mt-4">
            <button
              onClick={startSetup}
              disabled={busy}
              className="text-[11px] tracking-[0.1em] uppercase font-bold text-cobalt hover:text-ink transition-colors disabled:opacity-50"
            >
              Replace card →
            </button>
            <button
              onClick={remove}
              disabled={busy}
              className="text-[11px] tracking-[0.1em] uppercase font-bold text-ink-muted hover:text-rose-700 transition-colors disabled:opacity-50"
            >
              Remove
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="font-display text-[18px] font-extrabold text-ink leading-tight">
            No card on file
          </p>
          <p className="text-[12px] text-ink-soft mt-1 leading-relaxed">
            Save a card once and future orders can be paid without re-entering it.
            Nothing is charged when you add it.
          </p>
          <button
            onClick={startSetup}
            disabled={busy}
            className="mt-4 inline-flex items-center rounded-lg bg-ink text-white font-bold text-[12px] tracking-[0.06em] uppercase px-4 py-2.5 hover:bg-cobalt transition-colors disabled:opacity-50"
          >
            {busy ? 'Opening…' : 'Add a card →'}
          </button>
        </>
      )}

      {err && <p className="mt-3 text-[12px] font-bold text-rose-700">{err}</p>}
    </div>
  );
}
