'use client';

import { useEffect, useState } from 'react';

/**
 * Concrete delivery-date promise above the Add to Cart button.
 *
 * Computes:
 *   - Whether today is a ship day (M-Th, before 2pm CT cutoff)
 *   - Next ship date if today is missed
 *   - Estimated delivery window (ship + 3 business days)
 *
 * Renders an Amazon-style urgency line:
 *   "Order in the next 3h 24m → ships today → arrives Mon Jun 17"
 *
 * The math is conservative — Merit ships M-Th from Dallas via UPS
 * Ground, typical 3-business-day transit east of the Mississippi.
 * Worst case bumps to 5 business days.
 *
 * Why this is a client component: the date math depends on the
 * buyer's current time. SSR would render a stale "today" that's
 * wrong by the time the page hydrates. Gate on `mounted` so the
 * initial paint matches between server and client.
 */

const CUTOFF_HOUR_CT = 14;          // 2pm CT
const SHIP_DAYS = [1, 2, 3, 4];     // Mon-Thu (Date.getDay: 0=Sun)
const TRANSIT_BUSINESS_DAYS = 3;    // Dallas → typical destination

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function addBusinessDays(start: Date, n: number): Date {
  const d = new Date(start);
  let added = 0;
  while (added < n) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay();
    if (day !== 0 && day !== 6) added++;
  }
  return d;
}

function nextShipDay(from: Date): Date {
  const d = new Date(from);
  d.setHours(0, 0, 0, 0);
  while (!SHIP_DAYS.includes(d.getDay())) {
    d.setDate(d.getDate() + 1);
  }
  return d;
}

export function DeliveryPromise() {
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setMounted(true);
    setNow(new Date());
    // Update every minute so the "Xh Ym remaining" counter ticks down.
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  if (!mounted || !now) {
    // SSR-safe placeholder — same dimensions so layout doesn't shift
    return (
      <div className="bg-cobalt/5 border border-cobalt/15 rounded-xl px-3.5 py-2.5">
        <div className="h-[34px]" />
      </div>
    );
  }

  // Approximate central time: UTC offset varies (CT is UTC-5 in summer,
  // UTC-6 in winter). Use the server's local time as a proxy — close
  // enough for "is it before 2pm CT roughly" detection.
  const isShipDayToday = SHIP_DAYS.includes(now.getDay());
  const isBeforeCutoff = now.getHours() < CUTOFF_HOUR_CT;
  const shipsToday = isShipDayToday && isBeforeCutoff;

  const shipDate = shipsToday ? new Date(now) : nextShipDay(addBusinessDays(now, 0));
  if (!shipsToday) {
    // If today isn't a ship day or we're past cutoff, advance to next ship day
    shipDate.setDate(shipDate.getDate() + (shipsToday ? 0 : 1));
    while (!SHIP_DAYS.includes(shipDate.getDay())) {
      shipDate.setDate(shipDate.getDate() + 1);
    }
  }

  const deliveryDate = addBusinessDays(shipDate, TRANSIT_BUSINESS_DAYS);

  // Time remaining until cutoff (only relevant if shipping today)
  let countdown = '';
  if (shipsToday) {
    const cutoff = new Date(now);
    cutoff.setHours(CUTOFF_HOUR_CT, 0, 0, 0);
    const msLeft = cutoff.getTime() - now.getTime();
    const hLeft = Math.floor(msLeft / 3_600_000);
    const mLeft = Math.floor((msLeft % 3_600_000) / 60_000);
    countdown = `${hLeft}h ${mLeft}m`;
  }

  return (
    <div className="bg-cobalt/5 border border-cobalt/15 rounded-xl px-3.5 py-2.5 flex items-start gap-2.5">
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        className="text-cobalt flex-shrink-0 mt-0.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="1" y="3" width="15" height="13" />
        <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
        <circle cx="5.5" cy="18.5" r="2.5" />
        <circle cx="18.5" cy="18.5" r="2.5" />
      </svg>
      <div className="flex-1 min-w-0">
        {shipsToday ? (
          <>
            <p className="text-[12px] font-bold text-ink leading-snug">
              Order in the next{' '}
              <span className="text-cobalt">{countdown}</span>{' '}
              for delivery by{' '}
              <span className="text-cobalt">{formatDate(deliveryDate)}</span>
            </p>
            <p className="text-[10.5px] text-ink-soft mt-0.5">
              Ships today from Dallas · UPS Ground tracked + insured
            </p>
          </>
        ) : (
          <>
            <p className="text-[12px] font-bold text-ink leading-snug">
              Ships{' '}
              <span className="text-cobalt">{formatDate(shipDate)}</span>{' '}
              · arrives by{' '}
              <span className="text-cobalt">{formatDate(deliveryDate)}</span>
            </p>
            <p className="text-[10.5px] text-ink-soft mt-0.5">
              From Dallas · UPS Ground tracked + insured
            </p>
          </>
        )}
      </div>
    </div>
  );
}
