'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFormState, useFormStatus } from 'react-dom';
import { inviteAffiliate, type ActionResult } from '../actions';

const inputCls =
  'block w-full rounded-lg border border-cobalt/20 bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-soft/40 focus:outline-none focus:border-cobalt';
const labelCls = 'block text-[11px] font-bold tracking-wider uppercase text-ink-soft mb-1';

/** Lowercase alphanumeric+hyphen, trimmed to the 3-30 char identifier rules. */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30)
    .replace(/-+$/g, '');
}

export function InviteAffiliateForm() {
  const router = useRouter();
  const [result, formAction] = useFormState<ActionResult | null, FormData>(inviteAffiliate, null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [code, setCode] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [codeTouched, setCodeTouched] = useState(false);

  // Suggest slug + code from the name until the admin edits them directly.
  useEffect(() => {
    const s = slugify(name);
    if (!slugTouched) setSlug(s);
    if (!codeTouched) setCode(s ? `${s.slice(0, 27)}10` : '');
  }, [name, slugTouched, codeTouched]);

  useEffect(() => {
    if (result?.ok) router.push(`/admin/affiliates/${result.message}`);
  }, [result, router]);

  return (
    <form action={formAction} className="space-y-6">
      <section className="rounded-2xl border border-cobalt/15 bg-white p-6 space-y-4">
        <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold">— Affiliate</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Name <span className="text-rose-500">*</span></label>
            <input
              name="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputCls}
              placeholder="Jane Smith"
            />
          </div>
          <div>
            <label className={labelCls}>Email <span className="text-rose-500">*</span></label>
            <input name="email" type="email" required className={inputCls} placeholder="jane@example.com" />
            <p className="text-[10px] text-ink-soft mt-1">Their dashboard sign-in + where the invite goes.</p>
          </div>
          <div>
            <label className={labelCls}>Referral handle <span className="text-rose-500">*</span></label>
            <input
              name="slug"
              required
              value={slug}
              onChange={(e) => { setSlug(e.target.value); setSlugTouched(true); }}
              className={`${inputCls} font-mono lowercase`}
              placeholder="jane-smith"
            />
            <p className="text-[10px] text-ink-soft mt-1">meritsciences.com/?ref=<span className="font-mono">{slug || 'handle'}</span></p>
          </div>
          <div>
            <label className={labelCls}>Discount code <span className="text-rose-500">*</span></label>
            <input
              name="discountCode"
              required
              value={code}
              onChange={(e) => { setCode(e.target.value); setCodeTouched(true); }}
              className={`${inputCls} font-mono lowercase`}
              placeholder="jane10"
            />
            <p className="text-[10px] text-ink-soft mt-1">Buyers type it for 10% off; must differ from the handle.</p>
          </div>
        </div>
      </section>

      <label className="flex items-start gap-3 rounded-2xl border border-cobalt/15 bg-white p-5 cursor-pointer">
        <input type="checkbox" name="sendInvite" defaultChecked className="mt-0.5 h-4 w-4 accent-cobalt" />
        <span className="text-sm text-ink-soft leading-relaxed">
          <strong className="text-ink">Send the invite email now</strong> — their referral link,
          discount code, and a one-click sign-in to the dashboard. Leave unchecked to set things up
          quietly first.
        </span>
      </label>

      {result && !result.ok && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {result.error}
        </div>
      )}

      <div className="flex justify-end gap-3">
        <a
          href="/admin/affiliates"
          className="bg-white border border-cobalt/20 text-ink px-5 py-2.5 rounded-xl text-xs font-bold tracking-wider uppercase hover:border-cobalt/40 transition"
        >
          Cancel
        </a>
        <SubmitButton />
      </div>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-ink text-white px-6 py-2.5 rounded-xl text-xs font-bold tracking-wider uppercase hover:bg-cobalt transition disabled:opacity-50"
    >
      {pending ? 'Inviting…' : 'Create + invite'}
    </button>
  );
}
