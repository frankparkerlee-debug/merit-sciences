'use client';

import { useFormState, useFormStatus } from 'react-dom';
import {
  markProcessing,
  markShipped,
  markDelivered,
  markCanceled,
  refundOrder,
  updateInternalNote,
  recheckPayPalCapture,
  type ActionResult,
} from './actions';
import type { OrderStatus } from '@/lib/generated/prisma/index.js';

function fmtDate(d: Date | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
}

/* ─── Status panel — orchestrates state machine + actions ─── */

function StatusPanel({
  orderId, status,
  paidAt, processingAt, shippedAt, deliveredAt, refundedAt,
  shippingCarrier, trackingNumber, trackingUrl,
}: {
  orderId: string;
  status: OrderStatus;
  paidAt: Date | null;
  processingAt: Date | null;
  shippedAt: Date | null;
  deliveredAt: Date | null;
  refundedAt: Date | null;
  shippingCarrier: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
}) {
  const isRefunded = status === 'REFUNDED';
  const isCanceled = status === 'CANCELED';
  const isDelivered = status === 'DELIVERED';
  const isShipped = status === 'SHIPPED';
  const isProcessing = status === 'PROCESSING';
  const isPaid = status === 'PAID';
  const isPending = status === 'PENDING_PAYMENT';
  const isTerminal = isRefunded || isCanceled;

  return (
    <section className="rounded-2xl border border-cobalt/15 bg-white p-5 space-y-4">
      <div>
        <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold mb-2">— Status</p>
        <div className={`inline-block text-xs tracking-[0.14em] uppercase font-bold px-3 py-1.5 rounded-lg border ${
          status === 'PAID' ? 'bg-amber-50 text-amber-900 border-amber-200' :
          status === 'PROCESSING' ? 'bg-cobalt/10 text-cobalt border-cobalt/20' :
          status === 'SHIPPED' ? 'bg-blue-50 text-blue-900 border-blue-200' :
          status === 'DELIVERED' ? 'bg-emerald-50 text-emerald-900 border-emerald-200' :
          status === 'REFUNDED' ? 'bg-rose-50 text-rose-900 border-rose-200' :
          'bg-gray-50 text-gray-700 border-gray-200'
        }`}>
          {status.replace('_', ' ')}
        </div>
      </div>

      {/* Timeline */}
      <div className="border-t border-cobalt/10 pt-4 space-y-2 text-[11px]">
        {paidAt && <TimelineRow label="Paid" date={paidAt} active />}
        {processingAt && <TimelineRow label="Processing" date={processingAt} active />}
        {shippedAt && <TimelineRow label="Shipped" date={shippedAt} active />}
        {deliveredAt && <TimelineRow label="Delivered" date={deliveredAt} active />}
        {refundedAt && <TimelineRow label="Refunded" date={refundedAt} active />}
      </div>

      {/* Tracking display (if shipped) */}
      {shippingCarrier && trackingNumber && (
        <div className="border-t border-cobalt/10 pt-4">
          <p className="text-[10px] tracking-[0.18em] uppercase text-ink-soft font-bold mb-2">Tracking</p>
          <p className="text-sm text-ink"><strong>{shippingCarrier.toUpperCase()}</strong> · <span className="font-mono">{trackingNumber}</span></p>
          {trackingUrl && (
            <a href={trackingUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-cobalt font-bold underline mt-1 inline-block">
              View carrier page ↗
            </a>
          )}
        </div>
      )}

      {/* Pending-payment banner — webhook hasn't confirmed capture yet */}
      {isPending && (
        <div className="border-t border-cobalt/10 pt-4">
          <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-3 text-xs text-yellow-900 leading-relaxed mb-3">
            <p className="font-bold mb-1">Awaiting PayPal capture confirmation.</p>
            <p>This order was pre-created at checkout. PayPal&rsquo;s webhook will promote it to PAID once the capture lands. If it&rsquo;s been more than a minute, click <strong>Re-check capture</strong> below to pull status directly from PayPal.</p>
          </div>
        </div>
      )}

      {/* Action buttons by state */}
      {!isTerminal && (
        <div className="border-t border-cobalt/10 pt-4 space-y-2">
          {isPending && <PrimaryAction action={recheckPayPalCapture} orderId={orderId} label="Re-check PayPal capture" />}
          {isPaid && <PrimaryAction action={markProcessing} orderId={orderId} label="Mark Processing" />}
          {(isPaid || isProcessing) && <ShipForm orderId={orderId} />}
          {isShipped && <PrimaryAction action={markDelivered} orderId={orderId} label="Mark Delivered" />}
          {!isDelivered && !isRefunded && <SecondaryAction action={markCanceled} orderId={orderId} label="Cancel order" destructive />}
          {/* Refund only makes sense once a capture exists */}
          {!isPending && (
            <SecondaryAction action={refundOrder} orderId={orderId} label="Issue refund (full)" destructive confirm="Refund the full amount to the buyer? This calls PayPal's refund API and cannot be undone." />
          )}
        </div>
      )}
    </section>
  );
}

function TimelineRow({ label, date, active }: { label: string; date: Date | null; active: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={active ? 'text-ink font-bold' : 'text-ink-soft/50'}>{label}</span>
      <span className="text-ink-soft tabular-nums">{fmtDate(date)}</span>
    </div>
  );
}

function PrimaryAction({ action, orderId, label }: { action: any; orderId: string; label: string }) {
  const [result, formAction] = useFormState<ActionResult | null, FormData>(action, null);
  return (
    <form action={formAction}>
      <input type="hidden" name="orderId" value={orderId} />
      <SubmitButton label={label} />
      {result && <ResultBanner result={result} />}
    </form>
  );
}

function SecondaryAction({ action, orderId, label, destructive, confirm }: { action: any; orderId: string; label: string; destructive?: boolean; confirm?: string }) {
  const [result, formAction] = useFormState<ActionResult | null, FormData>(action, null);
  return (
    <form action={formAction} onSubmit={(e) => {
      if (confirm && !window.confirm(confirm)) {
        e.preventDefault();
      }
    }}>
      <input type="hidden" name="orderId" value={orderId} />
      <SubmitButton label={label} variant={destructive ? 'destructive' : 'secondary'} />
      {result && <ResultBanner result={result} />}
    </form>
  );
}

function ShipForm({ orderId }: { orderId: string }) {
  const [result, formAction] = useFormState<ActionResult | null, FormData>(markShipped, null);
  return (
    <form action={formAction} className="space-y-2 border border-cobalt/15 rounded-xl p-3">
      <input type="hidden" name="orderId" value={orderId} />
      <p className="text-[11px] tracking-[0.14em] uppercase font-bold text-cobalt">Ship now</p>
      <select
        name="carrier"
        required
        defaultValue=""
        className="w-full rounded-lg border border-cobalt/20 bg-white px-3 py-2 text-sm text-ink focus:outline-none focus:border-cobalt"
      >
        <option value="" disabled>— Pick carrier —</option>
        <option value="usps">USPS</option>
        <option value="ups">UPS</option>
        <option value="fedex">FedEx</option>
        <option value="dhl">DHL</option>
      </select>
      <input
        type="text"
        name="trackingNumber"
        required
        placeholder="Tracking number"
        className="w-full rounded-lg border border-cobalt/20 bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-soft/40 focus:outline-none focus:border-cobalt"
      />
      <SubmitButton label="Mark Shipped + Notify Customer" />
      {result && <ResultBanner result={result} />}
    </form>
  );
}

function NotesForm({ orderId, initialNote }: { orderId: string; initialNote: string }) {
  const [result, formAction] = useFormState<ActionResult | null, FormData>(updateInternalNote, null);
  return (
    <section className="rounded-2xl border border-cobalt/15 bg-white p-6">
      <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold mb-2">— Internal notes</p>
      <p className="text-xs text-ink-soft mb-3">Only visible to admins. Customer never sees these.</p>
      <form action={formAction}>
        <input type="hidden" name="orderId" value={orderId} />
        <textarea
          name="note"
          defaultValue={initialNote}
          rows={4}
          placeholder="e.g. Customer called about delay — promised expedited ship"
          className="w-full rounded-xl border border-cobalt/20 bg-white px-4 py-3 text-sm text-ink placeholder:text-ink-soft/40 focus:outline-none focus:border-cobalt resize-y"
        />
        <div className="mt-3">
          <SubmitButton label="Save note" variant="secondary" />
        </div>
        {result && <ResultBanner result={result} />}
      </form>
    </section>
  );
}

function SubmitButton({ label, variant = 'primary' }: { label: string; variant?: 'primary' | 'secondary' | 'destructive' }) {
  const { pending } = useFormStatus();
  const cls =
    variant === 'destructive'
      ? 'bg-rose-50 text-rose-900 border border-rose-200 hover:bg-rose-100'
      : variant === 'secondary'
      ? 'bg-white text-ink border border-cobalt/20 hover:border-cobalt/40'
      : 'bg-ink text-white hover:bg-cobalt';
  return (
    <button type="submit" disabled={pending} className={`w-full text-xs font-bold tracking-wide uppercase px-4 py-2.5 rounded-lg transition disabled:opacity-50 ${cls}`}>
      {pending ? 'Working…' : label}
    </button>
  );
}

function ResultBanner({ result }: { result: ActionResult }) {
  return (
    <div className={`mt-2 rounded-lg px-3 py-2 text-xs ${result.ok ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' : 'bg-rose-50 text-rose-900 border border-rose-200'}`}>
      {result.ok ? result.message : result.error}
    </div>
  );
}

// Export directly — Next's client boundary handles named exports
// reliably. The previous object export caused render issues.
export { StatusPanel, NotesForm };
