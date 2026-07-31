'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { useState } from 'react';
import {
  approveApplication,
  rejectApplication,
  deactivateApplication,
  reactivateApplication,
  deleteApplication,
  type ReviewResult,
} from '../actions';

type Mode = null | 'approve' | 'reject' | 'deactivate' | 'reactivate' | 'delete';

type Props = {
  id: string;
  status: string;
  providerFirst: string;
  practiceName: string;
};

export function ReviewActions({ id, status, providerFirst, practiceName }: Props) {
  const [mode, setMode] = useState<Mode>(null);

  const [approveResult, approveAction] = useFormState<ReviewResult | null, FormData>(approveApplication, null);
  const [rejectResult, rejectAction] = useFormState<ReviewResult | null, FormData>(rejectApplication, null);
  const [deactivateResult, deactivateAction] = useFormState<ReviewResult | null, FormData>(deactivateApplication, null);
  const [reactivateResult, reactivateAction] = useFormState<ReviewResult | null, FormData>(reactivateApplication, null);
  const [deleteResult, deleteAction] = useFormState<ReviewResult | null, FormData>(deleteApplication, null);

  const result =
    mode === 'approve' ? approveResult :
    mode === 'reject' ? rejectResult :
    mode === 'deactivate' ? deactivateResult :
    mode === 'reactivate' ? reactivateResult :
    mode === 'delete' ? deleteResult :
    null;

  if (result?.ok) {
    return (
      <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-6">
        <p className="text-[10px] tracking-[0.22em] uppercase font-bold text-emerald-700 mb-2">
          — Done
        </p>
        <p className="text-sm text-emerald-900">{result.message}</p>
      </div>
    );
  }

  return (
    <section className="rounded-2xl border border-cobalt/15 bg-white p-6">
      <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold mb-4">— Actions</p>

      {result && !result.ok && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 mb-4">
          {result.error}
        </div>
      )}

      {/* Default state — show buttons based on current status */}
      {mode === null && (
        <div className="flex flex-wrap gap-3">
          {status === 'PENDING' && (
            <>
              <PrimaryBtn onClick={() => setMode('approve')}>Approve →</PrimaryBtn>
              <DangerOutlineBtn onClick={() => setMode('reject')}>Reject</DangerOutlineBtn>
            </>
          )}
          {status === 'APPROVED' && (
            <>
              <DangerOutlineBtn onClick={() => setMode('deactivate')}>Deactivate</DangerOutlineBtn>
              <DangerBtn onClick={() => setMode('delete')}>Delete permanently</DangerBtn>
            </>
          )}
          {status === 'DEACTIVATED' && (
            <>
              <PrimaryBtn onClick={() => setMode('reactivate')}>Reactivate</PrimaryBtn>
              <DangerBtn onClick={() => setMode('delete')}>Delete permanently</DangerBtn>
            </>
          )}
          {status === 'REJECTED' && (
            <DangerBtn onClick={() => setMode('delete')}>Delete permanently</DangerBtn>
          )}
        </div>
      )}

      {/* APPROVE confirmation */}
      {mode === 'approve' && (
        <form action={approveAction} className="space-y-4">
          <input type="hidden" name="id" value={id} />
          <p className="text-sm text-ink leading-relaxed">
            Approving flips status to APPROVED, records you as reviewer, and emails{' '}
            <strong>{providerFirst}</strong> a one-click magic-link sign-in to their portal.
          </p>
          <NoteField label="Internal note (optional, not emailed)" placeholder="Pricing tier, special notes for the team…" />
          <FormButtons setMode={setMode} pendingLabel="Approving…" confirmLabel="Confirm approval" SubmitBtn={ApproveSubmit} />
        </form>
      )}

      {/* REJECT confirmation */}
      {mode === 'reject' && (
        <form action={rejectAction} className="space-y-4">
          <input type="hidden" name="id" value={id} />
          <p className="text-sm text-ink leading-relaxed">
            Rejecting sends <strong>{providerFirst}</strong> a polite decline. If you add a reason,
            it gets included verbatim in the email body.
          </p>
          <NoteField label="Reason (optional, included in email)" placeholder="We couldn't verify your NPI…" rows={3} />
          <FormButtons setMode={setMode} pendingLabel="Sending…" confirmLabel="Send rejection" SubmitBtn={RejectSubmit} />
        </form>
      )}

      {/* DEACTIVATE confirmation */}
      {mode === 'deactivate' && (
        <form action={deactivateAction} className="space-y-4">
          <input type="hidden" name="id" value={id} />
          <p className="text-sm text-ink leading-relaxed">
            Deactivating revokes <strong>{practiceName}</strong>&rsquo;s portal access. They&rsquo;ll
            see retail pricing on the next page load and the portal will redirect them to sign-in.
            Past orders stay intact for audit. Reversible via Reactivate.
          </p>
          <NoteField label="Internal note (optional)" placeholder="Reason for deactivation…" />
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" name="notify" defaultChecked />
            Email {providerFirst} to let them know
          </label>
          <FormButtons setMode={setMode} pendingLabel="Deactivating…" confirmLabel="Confirm deactivation" SubmitBtn={DeactivateSubmit} />
        </form>
      )}

      {/* REACTIVATE confirmation */}
      {mode === 'reactivate' && (
        <form action={reactivateAction} className="space-y-4">
          <input type="hidden" name="id" value={id} />
          <p className="text-sm text-ink leading-relaxed">
            Reactivating restores <strong>{practiceName}</strong>&rsquo;s portal access immediately.
            On their next sign-in they&rsquo;ll see practitioner pricing again. No email is sent;
            if you want them to know, reach out directly.
          </p>
          <FormButtons setMode={setMode} pendingLabel="Reactivating…" confirmLabel="Confirm reactivation" SubmitBtn={ReactivateSubmit} />
        </form>
      )}

      {/* DELETE confirmation */}
      {mode === 'delete' && (
        <form action={deleteAction} className="space-y-4">
          <input type="hidden" name="id" value={id} />
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 leading-relaxed">
            <p className="font-bold mb-1">This is permanent.</p>
            <p>
              Hard-deletes the application record, the Supabase Auth user, and any in-progress email
              sequence. Past orders are preserved as audit trail. <strong>Use Deactivate instead</strong>{' '}
              unless you need to fully purge.
            </p>
          </div>
          <FormButtons setMode={setMode} pendingLabel="Deleting…" confirmLabel="Permanently delete" SubmitBtn={DeleteSubmit} />
        </form>
      )}
    </section>
  );
}

// ── Button + form helpers ────────────────────────────────────────────────
function PrimaryBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="bg-cobalt text-white font-bold tracking-[0.16em] uppercase text-xs px-5 py-3 rounded-lg hover:bg-ink transition-colors"
    >
      {children}
    </button>
  );
}

function DangerOutlineBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="bg-white border border-rose-300 text-rose-800 font-bold tracking-[0.16em] uppercase text-xs px-5 py-3 rounded-lg hover:bg-rose-50 transition-colors"
    >
      {children}
    </button>
  );
}

function DangerBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="bg-rose-700 text-white font-bold tracking-[0.16em] uppercase text-xs px-5 py-3 rounded-lg hover:bg-rose-900 transition-colors"
    >
      {children}
    </button>
  );
}

function NoteField({
  label,
  placeholder,
  rows = 2,
}: {
  label: string;
  placeholder: string;
  rows?: number;
}) {
  return (
    <label className="block">
      <span className="block text-[10px] tracking-[0.18em] uppercase font-bold text-ink-soft mb-1.5">
        {label}
      </span>
      <textarea
        name="note"
        rows={rows}
        placeholder={placeholder}
        className="w-full rounded-lg border border-cobalt/20 bg-white px-3 py-2 text-sm focus:outline-none focus:border-cobalt resize-y"
      />
    </label>
  );
}

function FormButtons({
  setMode,
  pendingLabel,
  confirmLabel,
  SubmitBtn,
}: {
  setMode: (m: Mode) => void;
  pendingLabel: string;
  confirmLabel: string;
  SubmitBtn: (props: { label: string; pendingLabel: string }) => React.ReactElement;
}) {
  return (
    <div className="flex gap-3">
      <SubmitBtn label={confirmLabel} pendingLabel={pendingLabel} />
      <button
        type="button"
        onClick={() => setMode(null)}
        className="text-ink-soft font-bold tracking-[0.16em] uppercase text-xs px-4 py-3 hover:text-ink"
      >
        Cancel
      </button>
    </div>
  );
}

function ApproveSubmit({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-cobalt text-white font-bold tracking-[0.16em] uppercase text-xs px-5 py-3 rounded-lg hover:bg-ink transition-colors disabled:opacity-60"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}
function RejectSubmit({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-rose-700 text-white font-bold tracking-[0.16em] uppercase text-xs px-5 py-3 rounded-lg hover:bg-rose-900 transition-colors disabled:opacity-60"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}
function DeactivateSubmit({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-rose-700 text-white font-bold tracking-[0.16em] uppercase text-xs px-5 py-3 rounded-lg hover:bg-rose-900 transition-colors disabled:opacity-60"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}
function ReactivateSubmit({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-cobalt text-white font-bold tracking-[0.16em] uppercase text-xs px-5 py-3 rounded-lg hover:bg-ink transition-colors disabled:opacity-60"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}
function DeleteSubmit({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-rose-900 text-white font-bold tracking-[0.16em] uppercase text-xs px-5 py-3 rounded-lg hover:bg-black transition-colors disabled:opacity-60"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}
