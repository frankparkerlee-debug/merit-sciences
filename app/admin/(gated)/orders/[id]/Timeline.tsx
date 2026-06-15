import type { OrderEventKind } from '@/lib/generated/prisma/index.js';

type TimelineEvent = {
  id: string;
  kind: OrderEventKind;
  message: string;
  metadata: any;
  actorEmail: string | null;
  createdAt: Date;
};

/**
 * Server-rendered activity timeline. Groups events by calendar day with
 * date dividers. System events have no actor; admin events show the
 * operator's initials + email.
 */
export function Timeline({ events }: { events: TimelineEvent[] }) {
  if (events.length === 0) {
    return (
      <section className="rounded-2xl border border-cobalt/15 bg-white p-6">
        <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold mb-2">— Timeline</p>
        <p className="text-sm text-ink-soft">No activity recorded yet.</p>
      </section>
    );
  }

  // Group events by calendar day (descending so newest is at top)
  const grouped = groupByDay(events);

  return (
    <section className="rounded-2xl border border-cobalt/15 bg-white p-6">
      <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold mb-4">— Timeline</p>

      <div className="space-y-6">
        {grouped.map(({ day, events: dayEvents }) => (
          <div key={day.toISOString()}>
            <p className="text-[11px] tracking-[0.14em] uppercase font-bold text-ink-soft border-b border-cobalt/10 pb-2 mb-3">
              {fmtDay(day)}
            </p>
            <ul className="space-y-3">
              {dayEvents.map((ev) => (
                <li key={ev.id} className="flex gap-3">
                  {/* Icon dot */}
                  <div className="flex-shrink-0 mt-1">
                    <EventDot kind={ev.kind} />
                  </div>
                  {/* Body */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className={`text-sm leading-snug ${ev.kind === 'ADMIN_COMMENT' ? 'text-ink' : 'text-ink-soft'}`}>
                        {ev.kind === 'ADMIN_COMMENT' && ev.actorEmail && (
                          <span className="font-bold text-ink">{initialsFor(ev.actorEmail)} · </span>
                        )}
                        {ev.message}
                      </p>
                      <span className="text-[10px] text-ink-soft/60 tabular-nums whitespace-nowrap">
                        {fmtTime(ev.createdAt)}
                      </span>
                    </div>
                    {/* Actor email row for non-comment admin events */}
                    {ev.actorEmail && ev.kind !== 'ADMIN_COMMENT' && (
                      <p className="text-[10px] text-ink-soft/60 mt-0.5">by {ev.actorEmail}</p>
                    )}
                    {/* Email id badge for sent emails */}
                    {(ev.kind === 'CONFIRMATION_EMAIL_SENT' || ev.kind === 'SHIPMENT_EMAIL_SENT') &&
                      ev.metadata?.email_id && (
                        <p className="text-[10px] text-ink-soft/60 mt-0.5 font-mono">
                          Resend id: {String(ev.metadata.email_id)}
                        </p>
                      )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

function groupByDay(events: TimelineEvent[]): Array<{ day: Date; events: TimelineEvent[] }> {
  // Events come in DESC; preserve order
  const map = new Map<string, TimelineEvent[]>();
  for (const ev of events) {
    const day = new Date(ev.createdAt);
    day.setHours(0, 0, 0, 0);
    const key = day.toISOString();
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(ev);
  }
  return Array.from(map.entries()).map(([key, evs]) => ({ day: new Date(key), events: evs }));
}

function fmtDay(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function fmtTime(d: Date): string {
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function initialsFor(email: string): string {
  const local = email.split('@')[0];
  return local.slice(0, 2).toUpperCase();
}

/* ─── Per-event dot styling ─── */

function EventDot({ kind }: { kind: OrderEventKind }) {
  const { bg, ring, icon } = dotStyle(kind);
  return (
    <span
      className={`flex items-center justify-center w-6 h-6 rounded-full ring-2 ring-offset-2 ring-offset-white ${bg} ${ring}`}
      aria-hidden
    >
      <span className="text-[11px] leading-none">{icon}</span>
    </span>
  );
}

function dotStyle(kind: OrderEventKind): { bg: string; ring: string; icon: string } {
  switch (kind) {
    case 'ORDER_PLACED':
      return { bg: 'bg-cobalt/10', ring: 'ring-cobalt/20', icon: '🛒' };
    case 'PAYMENT_CAPTURED':
      return { bg: 'bg-amber-100', ring: 'ring-amber-200', icon: '💳' };
    case 'CONFIRMATION_EMAIL_SENT':
    case 'SHIPMENT_EMAIL_SENT':
    case 'ADMIN_NOTIFIED':
      return { bg: 'bg-emerald-50', ring: 'ring-emerald-200', icon: '✉' };
    case 'MARKED_PROCESSING':
      return { bg: 'bg-cobalt/10', ring: 'ring-cobalt/20', icon: '⚙' };
    case 'LABEL_PURCHASED':
      return { bg: 'bg-blue-50', ring: 'ring-blue-200', icon: '🏷' };
    case 'MARKED_SHIPPED':
      return { bg: 'bg-blue-50', ring: 'ring-blue-200', icon: '📦' };
    case 'MARKED_DELIVERED':
      return { bg: 'bg-emerald-100', ring: 'ring-emerald-300', icon: '✓' };
    case 'MARKED_CANCELED':
      return { bg: 'bg-gray-100', ring: 'ring-gray-200', icon: '✕' };
    case 'REFUND_FULL':
    case 'REFUND_PARTIAL':
      return { bg: 'bg-rose-50', ring: 'ring-rose-200', icon: '↩' };
    case 'COMMISSION_CLAWED_BACK':
      return { bg: 'bg-rose-50', ring: 'ring-rose-200', icon: '$' };
    case 'ADMIN_COMMENT':
      return { bg: 'bg-yellow-50', ring: 'ring-yellow-200', icon: '💬' };
    case 'EMAIL_FAILED':
      return { bg: 'bg-rose-50', ring: 'ring-rose-300', icon: '!' };
    default:
      return { bg: 'bg-gray-100', ring: 'ring-gray-200', icon: '·' };
  }
}
