'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { seedProductsFromJson } from './actions';

export function SeedButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  async function handle() {
    setPending(true);
    setResult(null);
    const res = await seedProductsFromJson();
    setPending(false);
    setResult(res.ok ? { ok: true, message: res.message } : { ok: false, message: res.error });
    if (res.ok) router.refresh();
  }

  return (
    <div>
      <button
        type="button"
        onClick={handle}
        disabled={pending}
        className="bg-amber-900 text-white px-5 py-2.5 rounded-lg text-xs font-bold tracking-wider uppercase hover:bg-amber-950 transition disabled:opacity-60"
      >
        {pending ? 'Importing…' : 'Import 18 products from JSON files'}
      </button>
      {result && (
        <p
          className={`mt-3 text-sm ${
            result.ok ? 'text-emerald-800' : 'text-rose-800'
          }`}
        >
          {result.message}
        </p>
      )}
    </div>
  );
}
