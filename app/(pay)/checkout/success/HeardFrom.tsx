'use client';

import { useState } from 'react';
import { HEARD_FROM, type HeardFromValue } from '@/lib/heard-from';

/** One optional tap on the confirmation page: where the buyer first heard of us. */
export function HeardFrom({ orderRef }: { orderRef: string }) {
  const [picked, setPicked] = useState<HeardFromValue | null>(null);
  const [detail, setDetail] = useState('');
  const [state, setState] = useState<'idle' | 'saving' | 'done'>('idle');

  async function save(answer: HeardFromValue, text?: string) {
    setState('saving');
    try {
      await fetch('/api/checkout/heard-from', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ref: orderRef, answer, detail: text ?? null }),
        keepalive: true,
      });
    } catch {
      /* optional question; never block the page */
    }
    setState('done');
  }

  function pick(v: HeardFromValue) {
    setPicked(v);
    if (v !== 'other' && v !== 'friend' && v !== 'practitioner') void save(v);
  }

  if (state === 'done') {
    return (
      <div className="bg-white border border-cobalt/10 rounded-2xl p-6 lg:p-8 mb-6 text-center">
        <p className="text-[14px] font-bold text-ink">Thanks, that helps.</p>
      </div>
    );
  }

  const needsDetail = picked === 'other' || picked === 'friend' || picked === 'practitioner';
  const detailPrompt =
    picked === 'friend' ? 'Who sent you? (optional)' : picked === 'practitioner' ? 'Which clinic? (optional)' : 'Where? (optional)';

  return (
    <div className="bg-white border border-cobalt/10 rounded-2xl p-6 lg:p-8 mb-6">
      <h2 className="font-display text-lg font-extrabold text-ink leading-tight mb-4">
        How did you first hear about Merit?
      </h2>
      <div className="flex flex-wrap gap-2">
        {HEARD_FROM.map((o) => (
          <button
            key={o.value}
            type="button"
            disabled={state === 'saving'}
            onClick={() => pick(o.value)}
            aria-pressed={picked === o.value}
            className={`px-3.5 py-2 rounded-full border text-[13px] font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cobalt/40 ${
              picked === o.value ? 'bg-ink text-white border-ink' : 'border-cobalt/20 text-ink hover:border-cobalt/50'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
      {needsDetail && picked && (
        <form
          className="mt-4 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void save(picked, detail);
          }}
        >
          <input
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            maxLength={200}
            placeholder={detailPrompt}
            aria-label={detailPrompt}
            className="flex-1 min-w-0 rounded-xl border border-cobalt/20 px-3.5 py-2 text-[14px] text-ink focus:outline-none focus:border-cobalt"
          />
          <button
            type="submit"
            disabled={state === 'saving'}
            className="px-4 py-2 rounded-xl bg-ink text-white text-[13px] font-bold"
          >
            Send
          </button>
        </form>
      )}
    </div>
  );
}
