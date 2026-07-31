'use client';

import { useState } from 'react';
import { uploadCoa, type CoaActionResult } from './actions';

const inputCls =
  'w-full rounded-lg border border-cobalt/20 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-cobalt';
const labelCls = 'block text-[11px] font-bold uppercase tracking-wider text-ink-soft mb-1';

export function CoaUploadForm() {
  const [res, setRes] = useState<CoaActionResult | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        setLoading(true);
        setRes(null);
        try {
          const out = await uploadCoa(null, new FormData(form));
          setRes(out);
          if (out.ok) form.reset();
        } catch (err: any) {
          setRes({ ok: false, error: err?.message ?? 'Upload failed.' });
        } finally {
          setLoading(false);
        }
      }}
      className="rounded-2xl border border-cobalt/15 bg-white p-5 sm:p-6"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Compound *</label>
          <input name="compound" required placeholder="CJC-1295 / Ipamorelin" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Lot ID * (matches the bottle)</label>
          <input name="lotId" required placeholder="MRT-2603-204" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>HPLC purity *</label>
          <input name="purity" required placeholder="99.9%" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Tested date (optional)</label>
          <input name="testedDate" type="date" className={inputCls} />
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls}>Identity — tested compounds (optional)</label>
          <input name="identity" placeholder="GHK-Cu, BPC-157, TB-500" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Appearance (optional)</label>
          <input name="appearance" placeholder="White lyophilized powder" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Product handle (optional)</label>
          <input name="productHandle" placeholder="ly3437943" className={inputCls} />
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls}>Masked report PDF (optional — redact the lab letterhead first)</label>
          <input name="file" type="file" accept="application/pdf" className="block w-full text-sm text-ink-soft file:mr-3 file:rounded-lg file:border-0 file:bg-cobalt file:px-4 file:py-2 file:text-sm file:font-bold file:text-white" />
        </div>
      </div>

      <div className="mt-5 flex items-center gap-4">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-cobalt px-5 py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-60"
        >
          {loading ? 'Publishing…' : 'Publish COA'}
        </button>
        {res && (
          <span className={`text-sm ${res.ok ? 'text-emerald-700' : 'text-rose-700'}`}>
            {res.ok ? res.message : res.error}
          </span>
        )}
      </div>
    </form>
  );
}
