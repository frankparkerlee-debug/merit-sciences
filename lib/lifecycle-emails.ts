/**
 * Merit's consumer emails, as pure render functions.
 *
 *   NEW SIGNUP      5 emails over 14 days   signupWelcome → signupLastNote
 *   ABANDONED CART  3 emails over 3 days    cartSaved → cartLastNote
 *   POST-PURCHASE   3 emails over 75 days   orderCheckIn → orderNewBatches
 *   SALE            4 emails over 8 days    saleLaunch → saleLastDay
 *
 * Copy rules these follow (do not relax without asking Parker):
 *   · A headline with some life in it, then plain facts. Positive, never a
 *     dig at anyone else, never a scold.
 *   · The lab report is the message, said like a person would say it,
 *     next to shipping, price and the offer.
 *   · No preparation, reconstitution or dosing content. Research use only.
 *   · No "pharmacy" or grade framing. No invented deadlines: the welcome
 *     code has none, and a sale names its real end date.
 *   · Every fact matches the published policies: carrier handoff in 1 to 2
 *     business days, USPS or UPS with tracking, free standard
 *     shipping at $300, replace or refund within 7 days of delivery.
 *
 * Each function returns { subject, preheader, html, text }. The headline of
 * each email lives in its art (public/brand/email/art-*.jpg) and in the alt.
 */
import { WELCOME_PCT } from './welcome-offer';
import { wrapLifecycleEmail, kit, THEMES, money, esc, SITE, type ItemRow, type Card } from './lifecycle-email-shell';

// Mirrors FREE_SHIPPING_CENTS_THRESHOLD in lib/checkout-pricing.ts (server-only).
const FREE_SHIP_CENTS = 30_000;

const CATALOG = `${SITE}/catalog`;
const COA = `${SITE}/coa`;
const RETURNS = `${SITE}/returns`;
const ART = '/brand/email/art-';

/** Carry the code on the link so checkout applies it without typing. */
const withCode = (base: string, code: string) => `${base}${base.includes('?') ? '&' : '?'}code=${encodeURIComponent(code)}`;

export type Rendered = { subject: string; preheader: string; html: string; text: string };

const SIGNUP_REASON = 'You are getting this because you signed up at meritsciences.com.';
const CART_REASON = 'You are getting this because you started an order at meritsciences.com.';
const ORDER_REASON = 'You are getting this because you ordered from Merit Sciences.';
const SALE_REASON = 'You are getting this because you signed up or ordered at meritsciences.com.';
const SIGN = `\n\nMerit Sciences\nFor research use only. Not for human or veterinary use.`;

const THE_BASICS: [string, string][] = [
  ['1 to 2', 'business days to ship'],
  ['$300', 'and standard shipping is free'],
  ['Every', 'batch tested by an independent lab'],
];

/* ════════════════════════════════════════════════════════════════════════
   1 · NEW SIGNUP  (cobalt)
   ════════════════════════════════════════════════════════════════════════ */

export type SignupData = { code: string; unsubscribeUrl?: string };

/** Sent the moment someone signs up. */
export function signupWelcome(d: SignupData): Rendered {
  const k = kit(THEMES.signup);
  const shop = withCode(CATALOG, d.code);
  const subject = `Well, hello. Here's ${WELCOME_PCT}% off.`;
  const preheader = 'Your code is inside. It applies itself at checkout.';
  return {
    subject,
    preheader,
    html: wrapLifecycleEmail({
      theme: THEMES.signup,
      subject,
      preheader,
      art: { src: `${ART}s1.jpg`, alt: `Well, hello. Here's ${WELCOME_PCT}% off your first order.`, href: shop },
      body:
        k.sec(
          k.lede(`You're on the list. Your first order is ${WELCOME_PCT}% off.`) +
            k.p('Tap the button and the code rides along to checkout. Nothing to type, nothing to remember.') +
            k.coupon(d.code, WELCOME_PCT, 'Good on your first order. No clock on it.') +
            k.button(`Shop with ${WELCOME_PCT}% off`, shop),
        ) +
        k.stats(THE_BASICS) +
        k.sec(k.p(`One more thing worth knowing: every batch is tested by an independent lab before it is listed, and ${k.link('the reports are public', withCode(COA, d.code))}.`), undefined, '28px 40px 20px'),
      unsubscribeUrl: d.unsubscribeUrl,
      reason: SIGNUP_REASON,
    }),
    text: `Well, hello. You're on the list, and your first order is ${WELCOME_PCT}% off.

Code: ${d.code}. This link applies it for you:
${shop}

Ships in 1 to 2 business days. Standard shipping is free at $300.

Every batch is tested by an independent lab before it is listed. The reports are public: ${COA}${SIGN}`,
  };
}

/** Day 2. The lab report, said plainly. */
export function signupProof(d: SignupData): Rendered {
  const k = kit(THEMES.signup);
  const reports = withCode(COA, d.code);
  const subject = 'We show our work';
  const preheader = 'Every batch has a lab report. Read it before you order.';
  return {
    subject,
    preheader,
    html: wrapLifecycleEmail({
      theme: THEMES.signup,
      subject,
      preheader,
      art: { src: `${ART}s2.jpg`, alt: 'We show our work. Every batch. Every report. Public.', href: reports },
      body: k.sec(
        k.lede('Every batch gets tested before it gets listed.') +
          k.p('Not a sample from last year. The batch your vial comes from. Here is how it goes:') +
          k.steps([
            ['A batch comes in', 'It stays off the site until it has been checked.'],
            ['An independent lab tests it', 'They measure purity and confirm the compound is what the label says.'],
            ['The report goes public', 'It lands in one library, searchable by compound. The QR code on your vial opens the same library.'],
          ]) +
          k.button('Read the lab reports', reports) +
          k.small(`Your ${WELCOME_PCT}% code, ${esc(d.code)}, stays with you from this link to checkout.`),
      ),
      unsubscribeUrl: d.unsubscribeUrl,
      reason: SIGNUP_REASON,
    }),
    text: `We show our work.

Every batch gets tested before it gets listed.

1. A batch comes in. It stays off the site until it has been checked.
2. An independent lab tests it. They measure purity and confirm the compound is what the label says.
3. The report goes public, in one library, searchable by compound.

Read the lab reports: ${reports}

Your ${WELCOME_PCT}% code, ${d.code}, stays with you from that link to checkout.${SIGN}`,
  };
}

/** Day 5. What the order looks like when it lands. */
export function signupWhatArrives(d: SignupData): Rendered {
  const k = kit(THEMES.signup);
  const shop = withCode(CATALOG, d.code);
  const subject = 'From Texas, with tracking';
  const preheader = 'What is in the box, how fast it moves, and what happens if something is off.';
  return {
    subject,
    preheader,
    html: wrapLifecycleEmail({
      theme: THEMES.signup,
      subject,
      preheader,
      art: { src: `${ART}s3.jpg`, alt: 'From Texas, with tracking. Out the door in 1 to 2 business days.', href: shop },
      body:
        k.sec(k.lede('Here is exactly what shows up, and when.'), undefined, '38px 40px 14px') +
        k.stats(THE_BASICS) +
        k.sec(
          k.qa([
            ['In the box', 'Sealed glass vials of freeze-dried powder, packed for the trip.'],
            ['On the label', 'The compound, the size, the lot number, and a QR code that opens the lab report library.'],
            ['On the way', 'USPS or UPS, tracked from our door to yours.'],
            ['If something is off', `Tell us within 7 days of delivery and we replace it or refund it. ${k.link('The policy', RETURNS)} is short.`],
          ]) +
            k.button('Shop the catalog', shop) +
            k.small(`${esc(d.code)} still takes ${WELCOME_PCT}% off your first order.`),
          undefined,
          '18px 40px 34px',
        ),
      unsubscribeUrl: d.unsubscribeUrl,
      reason: SIGNUP_REASON,
    }),
    text: `From Texas, with tracking.

Ships in 1 to 2 business days. Standard shipping is free at $300.

In the box: sealed glass vials of freeze-dried powder, packed for the trip.
On the label: the compound, the size, the lot number, and a QR code that opens the lab report library.
On the way: USPS or UPS, tracked from our door to yours.
If something is off: tell us within 7 days of delivery and we replace it or refund it. ${RETURNS}

Shop the catalog (${d.code} applies itself): ${shop}${SIGN}`,
  };
}

export type LineupProduct = { title: string; priceCents: number; handle: string; imageUrl?: string | null };

function lineup(products: LineupProduct[], code: string, pctOff = 0): Card[] {
  return products.slice(0, 4).map((x) => ({
    title: x.title,
    price: money(Math.round(x.priceCents * (1 - pctOff / 100))),
    was: pctOff ? money(x.priceCents) : undefined,
    imageUrl: x.imageUrl,
    href: withCode(`${SITE}/products/${x.handle}`, code),
  }));
}

/** Day 9. The products people order most, live from the store. */
export function signupMostOrdered(d: SignupData & { products: LineupProduct[] }): Rendered {
  const k = kit(THEMES.signup);
  const shop = withCode(CATALOG, d.code);
  const subject = 'Crowd favorites';
  const preheader = 'The four compounds ordered most, with prices.';
  return {
    subject,
    preheader,
    html: wrapLifecycleEmail({
      theme: THEMES.signup,
      subject,
      preheader,
      art: { src: `${ART}s4.jpg`, alt: 'Crowd favorites. What gets ordered most, live from the store.', href: shop },
      body: k.sec(
        k.lede('Not sure where to start? Start where most people do.') +
          k.p('These four have been ordered more than anything else over the last two months. Each has its own page, its price and its lab report.') +
          k.cards(lineup(d.products, d.code)) +
          k.button('See the full catalog', shop) +
          k.small(`Prices shown before your ${WELCOME_PCT}%. ${esc(d.code)} comes off at checkout.`),
      ),
      unsubscribeUrl: d.unsubscribeUrl,
      reason: SIGNUP_REASON,
    }),
    text: `Crowd favorites.

The four compounds ordered most over the last two months:
${d.products.slice(0, 4).map((x) => `- ${x.title}, ${money(x.priceCents)}: ${SITE}/products/${x.handle}`).join('\n')}

Full catalog (${d.code} applies itself): ${shop}${SIGN}`,
  };
}

/** Day 14. The last note in the series. No invented deadline. */
export function signupLastNote(d: SignupData): Rendered {
  const k = kit(THEMES.signup);
  const shop = withCode(CATALOG, d.code);
  const subject = `Still holding your ${WELCOME_PCT}%`;
  const preheader = 'No clock on it. It works whenever you are ready.';
  return {
    subject,
    preheader,
    html: wrapLifecycleEmail({
      theme: THEMES.signup,
      subject,
      preheader,
      art: { src: `${ART}s5.jpg`, alt: `Still holding your ${WELCOME_PCT}%. No clock on it.`, href: shop },
      body: k.sec(
        k.lede('No countdown. No "last chance." It is just here when you want it.') +
          k.coupon(d.code, WELCOME_PCT, 'Good on your first order, whenever that is.') +
          k.button(`Shop with ${WELCOME_PCT}% off`, shop) +
          k.p('<br>If a question is what kept you from ordering, hit reply and ask it. A person reads every one.') +
          k.small('This is the last email in this series. We will not keep nudging.'),
      ),
      unsubscribeUrl: d.unsubscribeUrl,
      reason: SIGNUP_REASON,
    }),
    text: `Still holding your ${WELCOME_PCT}%. No clock on it.

${d.code} works on your first order whenever you are ready:
${shop}

If a question is what kept you from ordering, hit reply and ask it. A person reads every one.

This is the last email in this series.${SIGN}`,
  };
}

/* ════════════════════════════════════════════════════════════════════════
   2 · ABANDONED CART  (orange)
   ════════════════════════════════════════════════════════════════════════ */

export type CartLineData = { title: string; bundleLabel?: string; qty: number; unitCents: number; imageUrl?: string | null };
export type CartData = {
  lines: CartLineData[];
  subtotalCents: number;
  /** Signed /cart/recover/<token> link that rebuilds the cart. */
  recoverUrl: string;
  /** A code already attached to the cart (affiliate or house), if any. */
  appliedCode?: string | null;
  /** True when this email has never ordered, so the welcome code is theirs to use. */
  firstOrder?: boolean;
  welcomeCode?: string;
  unsubscribeUrl?: string;
};

function cartRows(d: CartData): ItemRow[] {
  return d.lines.map((l) => ({
    title: l.title,
    meta: [l.bundleLabel && l.bundleLabel !== 'Single' ? l.bundleLabel : null, `Qty ${l.qty}`].filter(Boolean).join(' · '),
    price: money(l.unitCents * l.qty),
    imageUrl: l.imageUrl,
  }));
}

function shippingLine(d: CartData): string {
  return d.subtotalCents >= FREE_SHIP_CENTS
    ? 'This order ships free.'
    : `Standard shipping is free on orders of $${FREE_SHIP_CENTS / 100} or more.`;
}

function cartText(d: CartData): string {
  return `${d.lines.map((l) => `- ${l.title} x${l.qty}, ${money(l.unitCents * l.qty)}`).join('\n')}\nSubtotal: ${money(d.subtotalCents)}`;
}

/** 1 hour after the cart goes quiet. */
export function cartSaved(d: CartData): Rendered {
  const k = kit(THEMES.cart);
  const subject = 'You left something on the bench';
  const preheader = 'Your cart is saved. One click puts it back.';
  return {
    subject,
    preheader,
    html: wrapLifecycleEmail({
      theme: THEMES.cart,
      subject,
      preheader,
      art: { src: `${ART}c1.jpg`, alt: 'You left something on the bench.', href: d.recoverUrl },
      body: k.sec(
        k.lede('Your cart is right where you left it.') +
          k.p('One click puts it back together, on any device.') +
          k.items(cartRows(d), { label: 'Subtotal', value: money(d.subtotalCents) }) +
          k.button('Back to my cart', d.recoverUrl) +
          k.small(shippingLine(d) + (d.appliedCode ? ` Your code ${esc(d.appliedCode)} comes back with the cart.` : '')),
      ),
      unsubscribeUrl: d.unsubscribeUrl,
      reason: CART_REASON,
    }),
    text: `You left something on the bench. Your cart is right where you left it.

${cartText(d)}

Back to my cart: ${d.recoverUrl}

${shippingLine(d)}${SIGN}`,
  };
}

/** 24 hours. Answers the questions that stop a first order. */
export function cartAnswers(d: CartData): Rendered {
  const k = kit(THEMES.cart);
  const subject = 'Fair questions, straight answers';
  const preheader = 'Shipping, testing, payment, and what happens if something is wrong.';
  return {
    subject,
    preheader,
    html: wrapLifecycleEmail({
      theme: THEMES.cart,
      subject,
      preheader,
      art: { src: `${ART}c2.jpg`, alt: 'Fair questions. Straight answers.', href: d.recoverUrl },
      body: k.sec(
        k.lede('Four things people ask before a first order.') +
          k.qa([
            ['How fast does it ship?', 'It is with the carrier in 1 to 2 business days. USPS or UPS, tracked.'],
            ['Is it tested?', `Yes. Every batch goes to an independent lab before it is listed, and ${k.link('the reports are public', COA)}.`],
            ['How do I pay?', 'By card. Visa, Mastercard, Amex and Discover.'],
            ['What if it arrives wrong?', `Tell us within 7 days of delivery and we replace it or refund it. ${k.link('Read the policy', RETURNS)}.`],
          ]) +
          k.button('Back to my cart', d.recoverUrl) +
          k.small(`Your cart is still saved, ${money(d.subtotalCents)} before shipping. Got a fifth question? Hit reply.`),
      ),
      unsubscribeUrl: d.unsubscribeUrl,
      reason: CART_REASON,
    }),
    text: `Fair questions, straight answers.

How fast does it ship? With the carrier in 1 to 2 business days. USPS or UPS, tracked.
Is it tested? Yes. Every batch goes to an independent lab before it is listed. Reports: ${COA}
How do I pay? By card. Visa, Mastercard, Amex and Discover.
What if it arrives wrong? Tell us within 7 days of delivery and we replace it or refund it. ${RETURNS}

Back to my cart: ${d.recoverUrl}

Got a fifth question? Hit reply.${SIGN}`,
  };
}

/** 72 hours. The last reminder, with the welcome code for first-time buyers. */
export function cartLastNote(d: CartData): Rendered {
  const k = kit(THEMES.cart);
  const offer = Boolean(d.firstOrder && d.welcomeCode && !d.appliedCode);
  const url = offer ? withCode(d.recoverUrl, d.welcomeCode!) : d.recoverUrl;
  const subject = offer ? `Last call, and ${WELCOME_PCT}% off your cart` : 'Last call for your cart';
  const preheader = offer
    ? `First order with Merit? ${d.welcomeCode} takes ${WELCOME_PCT}% off.`
    : 'This is the last reminder we will send about it.';
  return {
    subject,
    preheader,
    html: wrapLifecycleEmail({
      theme: THEMES.cart,
      subject,
      preheader,
      art: { src: `${ART}c3.jpg`, alt: 'Last call for your cart. Then we will leave you be.', href: url },
      body: k.sec(
        (offer
          ? k.lede(`First order? Take ${WELCOME_PCT}% off this cart.`) +
            k.p('The button brings your cart back with the code already on it.') +
            k.coupon(d.welcomeCode!, WELCOME_PCT, 'Good on your first order.')
          : k.lede('Your cart is still saved. This is our last nudge.')) +
          k.items(cartRows(d), { label: 'Subtotal', value: money(d.subtotalCents) }) +
          k.button(offer ? `Finish with ${WELCOME_PCT}% off` : 'Back to my cart', url) +
          k.small('This is the last reminder we will send about this cart.'),
      ),
      unsubscribeUrl: d.unsubscribeUrl,
      reason: CART_REASON,
    }),
    text: `Last call for your cart.

${offer ? `First order with Merit? ${d.welcomeCode} takes ${WELCOME_PCT}% off it.\n\n` : ''}${cartText(d)}

${offer ? 'Finish with the code applied' : 'Back to my cart'}: ${url}

This is the last reminder we will send about this cart.${SIGN}`,
  };
}

/* ════════════════════════════════════════════════════════════════════════
   3 · POST-PURCHASE  (ink and cream)
   ════════════════════════════════════════════════════════════════════════ */

export type OrderEmailData = {
  firstName: string;
  /** Headline item of the order this email refers to. */
  primaryProductTitle: string;
  productImageUrl?: string | null;
  /** How many other line items the order had, for "and 2 more". */
  otherItemCount?: number;
  /** Signed order page link (details and tracking). */
  orderUrl: string;
  /** Signed /reorder/<token> link that rebuilds the order at current prices. */
  reorderUrl: string;
  unsubscribeUrl?: string;
};

function orderRow(d: OrderEmailData): ItemRow[] {
  const more = d.otherItemCount && d.otherItemCount > 0 ? `and ${d.otherItemCount} more in this order` : 'Your last order';
  return [{ title: d.primaryProductTitle, meta: more, imageUrl: d.productImageUrl }];
}

/** 7 days after the order ships. Service first, nothing to sell. */
export function orderCheckIn(d: OrderEmailData): Rendered {
  const k = kit(THEMES.order);
  const subject = 'Did it land right?';
  const preheader = 'If anything is off, reply and we will fix it.';
  return {
    subject,
    preheader,
    html: wrapLifecycleEmail({
      theme: THEMES.order,
      subject,
      preheader,
      art: { src: `${ART}o1.jpg`, alt: 'Did it land right?', href: d.orderUrl },
      body: k.sec(
        k.lede(`${esc(d.firstName)}, your order should be with you by now.`) +
          k.p('If everything looks good, you are done. Nothing to click.') +
          k.p('If anything is wrong, damaged or missing, reply to this email within 7 days of delivery. We replace it or refund it.') +
          k.qa([
            ['Your lab report', `The QR code on each label opens the report library. ${k.link('Open it here', COA)}.`],
            ['Your order', `Items, totals and tracking are on ${k.link('your order page', d.orderUrl)}.`],
          ]) +
          k.button('View my order', d.orderUrl),
      ),
      unsubscribeUrl: d.unsubscribeUrl,
      reason: ORDER_REASON,
    }),
    text: `Did it land right?

${d.firstName}, your order should be with you by now. If everything looks good, you are done.

If anything is wrong, damaged or missing, reply to this email within 7 days of delivery. We replace it or refund it.

Your lab report: the QR code on each label opens the report library. ${COA}
Your order: ${d.orderUrl}${SIGN}`,
  };
}

/** 35 days after the order. One job: the one-click reorder. */
export function orderReorder(d: OrderEmailData): Rendered {
  const k = kit(THEMES.order);
  const subject = 'Running low?';
  const preheader = `Your last order, rebuilt in one click. ${d.primaryProductTitle} included.`;
  return {
    subject,
    preheader,
    html: wrapLifecycleEmail({
      theme: THEMES.order,
      subject,
      preheader,
      art: { src: `${ART}o2.jpg`, alt: 'Running low? Same order. One click.', href: d.reorderUrl },
      body: k.sec(
        k.lede(`${esc(d.firstName)}, your last order is one click from checkout.`) +
          k.p('Nothing to search for and nothing to pick again.') +
          k.items(orderRow(d)) +
          k.button('Reorder', d.reorderUrl) +
          k.small('The cart is rebuilt at today’s prices from the current batch. Change anything you like before you pay.'),
      ),
      unsubscribeUrl: d.unsubscribeUrl,
      reason: ORDER_REASON,
    }),
    text: `Running low?

${d.firstName}, this link rebuilds your last order (${d.primaryProductTitle}) and takes you straight to checkout:
${d.reorderUrl}

The cart is rebuilt at today's prices from the current batch. Change anything you like before you pay.${SIGN}`,
  };
}

/** 75 days after the last order. New batches, same one-click reorder. */
export function orderNewBatches(d: OrderEmailData): Rendered {
  const k = kit(THEMES.order);
  const subject = 'Fresh batches are in';
  const preheader = 'Tested, published and ready. Your last order rebuilds in one click.';
  return {
    subject,
    preheader,
    html: wrapLifecycleEmail({
      theme: THEMES.order,
      subject,
      preheader,
      art: { src: `${ART}o3.jpg`, alt: 'Fresh batches are in.', href: d.reorderUrl },
      body: k.sec(
        k.lede(`${esc(d.firstName)}, it has been a minute. The shelves have turned over.`) +
          k.p(`New batches are listed. Each one was tested first, and ${k.link('the reports are in the library', COA)}.`) +
          k.items(orderRow(d)) +
          k.button('Rebuild my last order', d.reorderUrl) +
          k.small(`Want something different this time? ${k.link('Browse the catalog', CATALOG)}.`),
      ),
      unsubscribeUrl: d.unsubscribeUrl,
      reason: ORDER_REASON,
    }),
    text: `Fresh batches are in.

${d.firstName}, since your last order we have listed new batches. Each one was tested first. Reports: ${COA}

One click rebuilds your last order from the current batch:
${d.reorderUrl}

Or browse the catalog: ${CATALOG}${SIGN}`,
  };
}

/* ════════════════════════════════════════════════════════════════════════
   4 · SALE  (black)

   Black Friday 2026: code BLACKFRIDAY, 30% off everything, Friday Nov 27
   through Friday Dec 4 at 11:59 pm Central. Sends: launch (Fri), reminder
   (Mon), favorites (Wed), last day (Fri). Anyone who has used the code
   should be dropped from the remaining sends.
   ════════════════════════════════════════════════════════════════════════ */

export type SaleData = {
  code: string;
  pct: number;
  /** How the end date is written, e.g. "Friday, December 4". */
  endsLabel: string;
  products?: LineupProduct[];
  unsubscribeUrl?: string;
};

const saleFine = (d: SaleData) => `${esc(d.code)} takes ${d.pct}% off through ${d.endsLabel} at 11:59 pm Central. One code per order, one use per customer. It applies to one-time purchases, single vials and multi-packs.`;

/** Friday. The sale opens. */
export function saleLaunch(d: SaleData): Rendered {
  const k = kit(THEMES.promo);
  const shop = withCode(CATALOG, d.code);
  const subject = `${d.pct}% off everything. Black Friday is on.`;
  const preheader = `Code ${d.code}, through ${d.endsLabel}.`;
  return {
    subject,
    preheader,
    html: wrapLifecycleEmail({
      theme: THEMES.promo,
      subject,
      preheader,
      art: { src: `${ART}bf1.jpg`, alt: `Black Friday. ${d.pct}% off everything. Code ${d.code}, through ${d.endsLabel}.`, href: shop },
      body:
        k.sec(
          k.lede(`One week. One code. ${d.pct}% off the whole catalog.`) +
            k.p('Every compound in the catalog, single vials and multi-packs. Tap the button and the code is already on your cart.') +
            k.coupon(d.code, d.pct, `Everything, through ${d.endsLabel}.`) +
            k.button(`Shop ${d.pct}% off`, shop),
        ) +
        k.stats(THE_BASICS) +
        k.sec(k.small(saleFine(d)), undefined, '10px 40px 26px'),
      unsubscribeUrl: d.unsubscribeUrl,
      reason: SALE_REASON,
    }),
    text: `Black Friday: ${d.pct}% off everything.

Code ${d.code}, through ${d.endsLabel} at 11:59 pm Central. This link applies it for you:
${shop}

Ships in 1 to 2 business days. Standard shipping is free at $300.${SIGN}`,
  };
}

/** Monday. Short reminder. */
export function saleReminder(d: SaleData): Rendered {
  const k = kit(THEMES.promo);
  const shop = withCode(CATALOG, d.code);
  const subject = `It's Monday. Still ${d.pct}% off.`;
  const preheader = `Same code, same ${d.pct}%, through ${d.endsLabel}.`;
  return {
    subject,
    preheader,
    html: wrapLifecycleEmail({
      theme: THEMES.promo,
      subject,
      preheader,
      art: { src: `${ART}bf2.jpg`, alt: `It's Monday. Still ${d.pct}% off.`, href: shop },
      body: k.sec(
        k.lede(`Same code. Same ${d.pct}%. Four more days.`) +
          k.p('Nothing changed over the weekend, which is the point. Here is what you get with every order, sale or not:') +
          k.steps([
            ['A tested batch', `An independent lab checks every batch before it is listed. ${k.link('The reports are public', withCode(COA, d.code))}.`],
            ['A fast handoff', 'With the carrier in 1 to 2 business days. Tracked.'],
            ['A simple fix', 'If it arrives wrong, damaged or short, we replace it or refund it.'],
          ]) +
          k.button(`Shop ${d.pct}% off`, shop) +
          k.small(saleFine(d)),
      ),
      unsubscribeUrl: d.unsubscribeUrl,
      reason: SALE_REASON,
    }),
    text: `It's Monday. Still ${d.pct}% off.

Same code, same ${d.pct}%, through ${d.endsLabel} at 11:59 pm Central:
${shop}${SIGN}`,
  };
}

/** Wednesday. The most ordered products at the sale price. */
export function saleFavorites(d: SaleData): Rendered {
  const k = kit(THEMES.promo);
  const shop = withCode(CATALOG, d.code);
  const subject = `The favorites, ${d.pct}% off`;
  const preheader = `Two days left on ${d.code}.`;
  const list = d.products ?? [];
  return {
    subject,
    preheader,
    html: wrapLifecycleEmail({
      theme: THEMES.promo,
      subject,
      preheader,
      art: { src: `${ART}bf3.jpg`, alt: `The favorites, ${d.pct}% off. Two days left.`, href: shop },
      body: k.sec(
        k.lede(`The four most ordered, at ${d.pct}% off.`) +
          k.p('The new price is the one in blue. The code is already on these links.') +
          k.cards(lineup(list, d.code, d.pct)) +
          k.button(`Shop everything at ${d.pct}% off`, shop) +
          k.small(saleFine(d)),
      ),
      unsubscribeUrl: d.unsubscribeUrl,
      reason: SALE_REASON,
    }),
    text: `The favorites, ${d.pct}% off. Two days left.

${list.slice(0, 4).map((x) => `- ${x.title}: ${money(Math.round(x.priceCents * (1 - d.pct / 100)))} (was ${money(x.priceCents)})`).join('\n')}

Everything else is ${d.pct}% off too: ${shop}${SIGN}`,
  };
}

/** Final Friday. Last day. */
export function saleLastDay(d: SaleData): Rendered {
  const k = kit(THEMES.promo);
  const shop = withCode(CATALOG, d.code);
  const subject = `Ends tonight: ${d.pct}% off everything`;
  const preheader = `${d.code} closes at 11:59 pm Central.`;
  return {
    subject,
    preheader,
    html: wrapLifecycleEmail({
      theme: THEMES.promo,
      subject,
      preheader,
      art: { src: `${ART}bf4.jpg`, alt: `Ends tonight. ${d.pct}% off closes at midnight Central.`, href: shop },
      body: k.sec(
        k.lede(`Last day. ${d.pct}% off ends tonight at 11:59 pm Central.`) +
          k.coupon(d.code, d.pct, 'Everything. Ends tonight.') +
          k.button(`Use my ${d.pct}% off`, shop) +
          k.small('This is the last email about this sale. Thanks for reading all week.'),
      ),
      unsubscribeUrl: d.unsubscribeUrl,
      reason: SALE_REASON,
    }),
    text: `Ends tonight: ${d.pct}% off everything.

${d.code} closes at 11:59 pm Central. This link applies it for you:
${shop}

This is the last email about this sale.${SIGN}`,
  };
}
