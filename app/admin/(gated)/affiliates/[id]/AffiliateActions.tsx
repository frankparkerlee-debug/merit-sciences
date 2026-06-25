'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { suspendAffiliate, reactivateAffiliate, deleteAffiliate, changeAffiliateCode, type ActionResult } from '../actions';

export function AffiliateActions({
  id,
  isSuspended,
  canDelete,
}: {
  id: string;
  isSuspended: boolean;
  canDelete: boolean;
}) {
  return (
    <section className="rounded-2xl border border-cobalt/15 bg-white p-5 space-y-4">
      <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold">— Actions</p>

      <ChangeCodeForm id={id} />
      <div className="w-full h-px bg-cobalt/10" />
      {isSuspended ? <ReactivateForm id={id} /> : <SuspendForm id={id} />}
      <DeleteForm id={id} canDelete={canDelete} />
    </section>
  );
}

function ChangeCodeForm({ id }: { id: string }) {
  const [result, formAction] = useFormState<ActionResult | null, FormData>(changeAffiliateCode, null);
  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={id} />
      <label className="block text-[11px] font-bold tracking-wider uppercase text-ink-soft mb-1">
        Change discount code
      </label>
      <p className="text-[11px] text-ink-soft mb-2">
        Cannot contain &ldquo;merit&rdquo;. Must be unique. Existing referral links using this code will continue to work at the old slug.
      </p>
      <input
        type="text"
        name="code"
        placeholder="e.g. SUMMER30, DRSMITH10"
        maxLength={40}
        className="block w-full rounded-lg border border-cobalt/20 bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-soft/40 focus:outline-none focus:border-cobalt mb-2 font-mono uppercase"
      />
      <ChangeCodeButton />
      {result && (
        <p className={`mt-2 text-xs ${result.ok ? 'text-emerald-700' : 'text-rose-700'}`}>
          {result.ok ? result.message : result.error}
        </p>
      )}
    </form>
  );
}

function ChangeCodeButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full bg-cobalt/10 text-cobalt border border-cobalt/20 px-4 py-2.5 rounded-lg text-xs font-bold tracking-wide uppercase hover:bg-cobalt/15 transition disabled:opacity-60"
    >
      {pending ? 'Updating…' : 'Update code'}
    </button>
  );
}

function SuspendForm({ id }: { id: string }) {
  const [result, formAction] = useFormState<ActionResult | null, FormData>(suspendAffiliate, null);
  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!window.confirm('Suspend this affiliate? They stop earning commissions and their discount code stops working at checkout.')) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <label className="block text-[11px] font-bold tracking-wider uppercase text-ink-soft mb-1">
        Suspend reason <span className="text-ink-soft/50 normal-case">(optional)</span>
      </label>
      <input
        type="text"
        name="reason"
        placeholder="e.g. fraud review, TOS violation"
        className="block w-full rounded-lg border border-cobalt/20 bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-soft/40 focus:outline-none focus:border-cobalt mb-2"
      />
      <SuspendButton />
      {result && (
        <p className={`mt-2 text-xs ${result.ok ? 'text-emerald-700' : 'text-rose-700'}`}>
          {result.ok ? result.message : result.error}
        </p>
      )}
    </form>
  );
}

function SuspendButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full bg-amber-50 text-amber-900 border border-amber-200 px-4 py-2.5 rounded-lg text-xs font-bold tracking-wide uppercase hover:bg-amber-100 transition disabled:opacity-60"
    >
      {pending ? 'Suspending…' : 'Suspend affiliate'}
    </button>
  );
}

function ReactivateForm({ id }: { id: string }) {
  const [result, formAction] = useFormState<ActionResult | null, FormData>(reactivateAffiliate, null);
  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={id} />
      <ReactivateButton />
      {result && (
        <p className={`mt-2 text-xs ${result.ok ? 'text-emerald-700' : 'text-rose-700'}`}>
          {result.ok ? result.message : result.error}
        </p>
      )}
    </form>
  );
}

function ReactivateButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full bg-emerald-50 text-emerald-900 border border-emerald-200 px-4 py-2.5 rounded-lg text-xs font-bold tracking-wide uppercase hover:bg-emerald-100 transition disabled:opacity-60"
    >
      {pending ? 'Reactivating…' : 'Reactivate affiliate'}
    </button>
  );
}

function DeleteForm({ id, canDelete }: { id: string; canDelete: boolean }) {
  const [result, formAction] = useFormState<ActionResult | null, FormData>(deleteAffiliate, null);
  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!canDelete) {
          e.preventDefault();
          return;
        }
        if (!window.confirm('Delete this affiliate permanently? This is only allowed because they have NO commissions, customers, or payouts. Cannot be undone.')) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        disabled={!canDelete}
        title={canDelete ? 'Delete affiliate' : 'Suspend instead — this affiliate has commission/customer/payout history'}
        className="w-full bg-rose-50 text-rose-900 border border-rose-200 px-4 py-2.5 rounded-lg text-xs font-bold tracking-wide uppercase hover:bg-rose-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Delete affiliate
      </button>
      {!canDelete && (
        <p className="mt-2 text-[11px] text-ink-soft leading-relaxed">
          Delete is disabled while there&rsquo;s commission, customer, or payout history. Suspend
          instead to preserve the audit trail.
        </p>
      )}
      {result && !result.ok && (
        <p className="mt-2 text-xs text-rose-700">{result.error}</p>
      )}
    </form>
  );
}
