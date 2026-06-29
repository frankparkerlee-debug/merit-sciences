'use client';

import { useState } from 'react';

export function CopyBlock({ platform, text }: { platform: string; text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-2xl border border-cobalt/15 bg-white p-5 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] tracking-[0.18em] uppercase text-cobalt font-bold">{platform}</p>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(text);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            } catch {
              /* clipboard blocked — user can still select the text */
            }
          }}
          className="text-[11px] font-bold tracking-wider uppercase text-cobalt hover:underline"
        >
          {copied ? 'Copied ✓' : 'Copy'}
        </button>
      </div>
      <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap flex-1">{text}</p>
    </div>
  );
}
