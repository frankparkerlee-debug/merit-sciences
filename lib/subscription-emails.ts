/**
 * Account notices for retail subscriptions (lib/retail-subscriptions.ts).
 *
 * These are transactional: each one tells a subscriber something about a
 * charge they agreed to. Every one carries the manage link, because a
 * subscription a buyer cannot easily stop is a chargeback waiting to happen.
 * Same copy rules as lib/lifecycle-emails.ts.
 */
import { wrapLifecycleEmail, kit, THEMES, money, esc, type ItemRow } from './lifecycle-email-shell';

export type SubEmailLine = { title: string; qty: number; lineCents: number; imageUrl?: string | null };
type Rendered = { subject: string; preheader: string; html: string; text: string };

const REASON = 'You are getting this because you have a subscription with Merit Sciences.';
const SIGN = `\n\nMerit Sciences\nFor research use only. Not for human or veterinary use.`;
const T = THEMES.order;

const day = (d: Date) =>
  d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'America/Chicago' });
const hi = (n: string) => (n ? `${esc(n)}, ` : '');
const rowsOf = (lines: SubEmailLine[]): ItemRow[] =>
  lines.map((l) => ({ title: l.title, meta: `Qty ${l.qty}`, price: money(l.lineCents), imageUrl: l.imageUrl }));
const textOf = (lines: SubEmailLine[]) => lines.map((l) => `- ${l.title} x${l.qty}, ${money(l.lineCents)}`).join('\n');

/** Right after the first order is paid. */
export function subscriptionStarted(d: {
  firstName: string;
  lines: SubEmailLine[];
  cadence: string;
  nextChargeAt: Date;
  renewalTotalCents: number | null;
  card: string | null;
  manageUrl: string;
}): Rendered {
  const k = kit(T);
  const subject = 'Your subscription is set up';
  const preheader = `It renews ${d.cadence}. Next charge ${day(d.nextChargeAt)}.`;
  const amount = d.renewalTotalCents != null ? money(d.renewalTotalCents) : 'the price you subscribed at';
  return {
    subject,
    preheader,
    html: wrapLifecycleEmail({
      theme: T,
      subject,
      preheader,
      body: k.sec(
        k.lede(`${hi(d.firstName)}your subscription is set up.`) +
          k.p(`It renews ${esc(d.cadence)}. We email you three days before every charge, so nothing ships as a surprise.`) +
          k.items(rowsOf(d.lines)) +
          k.qa([
            ['Next charge', `${day(d.nextChargeAt)}, ${amount}${d.renewalTotalCents != null ? ' including shipping' : ''}. Your per-vial price is locked for as long as you stay subscribed.`],
            ['Paid with', d.card ? `Your ${esc(d.card)}.` : 'The card you used at checkout.'],
            ['Changing it', 'Skip a shipment, pause, switch cards or cancel from one page. No calls, no forms.'],
          ]) +
          k.button('Manage my subscription', d.manageUrl) +
          k.small('You can cancel any time before a charge and you will not be billed again.'),
      ),
      reason: REASON,
    }),
    text: `Your subscription is set up. It renews ${d.cadence}.

${textOf(d.lines)}

Next charge: ${day(d.nextChargeAt)}, ${amount}. We email you three days before every charge.

Skip, pause, switch cards or cancel here: ${d.manageUrl}${SIGN}`,
  };
}

/** Three days before a renewal. */
export function subscriptionUpcoming(d: {
  firstName: string;
  lines: SubEmailLine[];
  chargeAt: Date;
  totalCents: number;
  shippingCents: number;
  card: string | null;
  manageUrl: string;
}): Rendered {
  const k = kit(T);
  const subject = `Your subscription renews ${day(d.chargeAt)}`;
  const preheader = `${money(d.totalCents)} to ${d.card ?? 'your card on file'}. Skip or change it before then.`;
  return {
    subject,
    preheader,
    html: wrapLifecycleEmail({
      theme: T,
      subject,
      preheader,
      body: k.sec(
        k.lede(`${hi(d.firstName)}your next shipment is three days out.`) +
          k.p(`On ${day(d.chargeAt)} we will charge ${d.card ? `your ${esc(d.card)}` : 'your card on file'} and ship this:`) +
          k.items(rowsOf(d.lines), { label: d.shippingCents > 0 ? `Total with ${money(d.shippingCents)} shipping` : 'Total, shipping free', value: money(d.totalCents) }) +
          k.button('Skip or change this shipment', d.manageUrl) +
          k.small('Happy with it? Do nothing and it ships. Skip, pause or cancel any time before the charge.'),
      ),
      reason: REASON,
    }),
    text: `Your subscription renews ${day(d.chargeAt)}.

${textOf(d.lines)}
Total: ${money(d.totalCents)}${d.card ? `, charged to your ${d.card}` : ''}.

Skip, pause, switch cards or cancel before then: ${d.manageUrl}${SIGN}`,
  };
}

/** A renewal charge was declined. */
export function subscriptionPaymentFailed(d: {
  firstName: string;
  card: string | null;
  retryAt: Date;
  attemptsLeft: number;
  manageUrl: string;
}): Rendered {
  const k = kit(T);
  const subject = 'Your subscription payment did not go through';
  const preheader = `We will try again ${day(d.retryAt)}. You can update the card now.`;
  return {
    subject,
    preheader,
    html: wrapLifecycleEmail({
      theme: T,
      subject,
      preheader,
      body: k.sec(
        k.lede(`${hi(d.firstName)}your renewal payment did not go through.`) +
          k.p(`${d.card ? `Your ${esc(d.card)}` : 'Your card'} was declined, so nothing has shipped and nothing was charged.`) +
          k.qa([
            ['What happens next', `We try the card again on ${day(d.retryAt)}. ${d.attemptsLeft === 1 ? 'If that attempt fails, the subscription ends.' : `There are ${d.attemptsLeft} attempts left before the subscription ends.`}`],
            ['Fix it now', 'Add a different card and we will charge it on the next daily run instead of waiting.'],
          ]) +
          k.button('Update my card', d.manageUrl),
      ),
      reason: REASON,
    }),
    text: `Your subscription renewal payment did not go through. Nothing was charged and nothing has shipped.

We will try the card again on ${day(d.retryAt)}.

Update your card here: ${d.manageUrl}${SIGN}`,
  };
}

/** The subscription ended: canceled, or the card failed three times. */
export function subscriptionEnded(d: { firstName: string; reason: 'canceled' | 'payment_failed'; lines: SubEmailLine[] }): Rendered {
  const k = kit(T);
  const failed = d.reason === 'payment_failed';
  const subject = failed ? 'Your subscription has ended' : 'Your subscription is canceled';
  const preheader = 'You will not be charged again.';
  return {
    subject,
    preheader,
    html: wrapLifecycleEmail({
      theme: T,
      subject,
      preheader,
      body: k.sec(
        k.lede(failed ? `${hi(d.firstName)}your subscription has ended.` : `${hi(d.firstName)}your subscription is canceled.`) +
          k.p(
            failed
              ? 'The card on file was declined three times, so we stopped trying. You will not be charged again.'
              : 'Done. You will not be charged again, and nothing else will ship.',
          ) +
          k.items(d.lines.map((l) => ({ title: l.title, meta: `Qty ${l.qty}`, imageUrl: l.imageUrl }))) +
          k.small('Want it back? Order again any time and choose Subscribe at checkout.'),
      ),
      reason: REASON,
    }),
    text: `${failed ? 'Your subscription has ended. The card on file was declined three times.' : 'Your subscription is canceled.'} You will not be charged again.${SIGN}`,
  };
}
