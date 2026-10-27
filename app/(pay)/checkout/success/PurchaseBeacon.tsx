'use client';

import { useEffect } from 'react';
import { identify, trackPurchase } from '@/lib/analytics';
import { fireClickGoConversion } from '@/lib/clickgo';
import { pushStape, stapeItems, splitName } from '@/lib/stape';

type Props = {
  /** Processor id or order id; used as the dedupe key and transaction id. */
  orderRef: string;
  valueUsd: number;
  email: string | null;
  itemCount: number;
  /** Only fire once the payment is known good (order promoted, or Stripe
   *  returned redirect_status=succeeded). A hand-loaded URL fires nothing. */
  fire: boolean;
  /** Order detail for the ad vendor's server-side purchase event. */
  stape?: {
    shippingUsd: number;
    lines: Array<{ handle: string; title: string; bundleLabel: string; qty: number; unitCents: number }>;
    phone: string | null;
    fullName: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
};

/**
 * Purchase analytics for payments that arrive here by redirect.
 *
 * The PayPal path fires trackPurchase() from the checkout page before it
 * navigates. The Stripe path cannot: Stripe.js performs the navigation to
 * return_url itself, so the checkout page never gets the chance, and until
 * this component existed no card payment ever produced a Google Ads purchase
 * conversion or a PostHog purchase event. Deduped per order in localStorage
 * so a refresh of this page does not double count.
 */
export function PurchaseBeacon({ orderRef, valueUsd, email, itemCount, fire, stape }: Props) {
  useEffect(() => {
    if (!fire || !orderRef) return;
    const key = `merit_purchase_fired_${orderRef}`;
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, '1');
    } catch {
      /* private mode: fire once per load, which is still better than never */
    }
    try {
      if (email) identify(email.toLowerCase());
    } catch {
      /* analytics must never break the confirmation page */
    }
    trackPurchase({ orderId: orderRef, value: valueUsd, currency: 'USD', item_count: itemCount, surface: 'success_page' }).catch(
      () => {},
    );
    // Ad vendor's ClickGo conversion (order id + total only; no-op unless the
    // buyer arrived on a ClickGo click).
    fireClickGoConversion({ orderId: orderRef, orderTotal: valueUsd }).catch(() => {});
    // Ad vendor's server-side container (Stape). event_id is keyed to the
    // order so their browser and server copies deduplicate.
    if (stape) {
      pushStape(
        'purchase',
        {
          transaction_id: orderRef,
          value: valueUsd,
          tax: 0,
          shipping: stape.shippingUsd,
          items: stapeItems(stape.lines),
        },
        {
          eventId: `${orderRef}_purchase`,
          userData: {
            email: email?.toLowerCase() || undefined,
            phone: stape.phone || undefined,
            address: {
              ...splitName(stape.fullName),
              city: stape.city,
              state: stape.state,
              postal_code: stape.zip,
              country: stape.country,
            },
          },
        },
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fire, orderRef, valueUsd, email, itemCount]);
  return null;
}
