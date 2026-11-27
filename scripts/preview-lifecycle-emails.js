/**
 * Renders every lifecycle email with sample data to JSON on stdout.
 * Usage: node scripts/preview-lifecycle-emails.js > emails.json
 */
require('sucrase/register/ts');
const E = require('../lib/lifecycle-emails.ts');

const unsub = 'https://meritsciences.com/unsubscribe?e=sample&t=sample';
const signup = { code: 'WELCOME15', unsubscribeUrl: unsub };
const products = [
  { title: 'RT3 30 mg', priceCents: 16999, handle: 'rt3', imageUrl: '/products/sku-rt3.webp' },
  { title: 'Klow 80 mg', priceCents: 17499, handle: 'bpc157-ghk-cu-50-tb500-kpv-klow-80mg', imageUrl: '/products/sku-bpc157-ghk-cu-50-tb500-kpv-klow-80mg.webp' },
  { title: 'Tesamorelin 20 mg', priceCents: 14999, handle: 'tesamorelin-20mg', imageUrl: '/products/sku-tesamorelin-20mg.webp' },
  { title: 'TZ2 30 mg', priceCents: 14999, handle: 'tz2', imageUrl: '/products/sku-tz2.webp' },
];
const cart = {
  lines: [
    { title: 'RT3 30 mg', bundleLabel: 'Single', qty: 1, unitCents: 16999, imageUrl: '/products/sku-rt3.webp' },
    { title: 'Tesamorelin 20 mg', bundleLabel: 'Single', qty: 1, unitCents: 14999, imageUrl: '/products/sku-tesamorelin-20mg.webp' },
  ],
  subtotalCents: 31998,
  recoverUrl: 'https://meritsciences.com/cart/recover/sample',
  firstOrder: true,
  welcomeCode: 'WELCOME15',
  unsubscribeUrl: unsub,
};
const order = {
  firstName: 'Taylor',
  primaryProductTitle: 'RT3 30 mg',
  productImageUrl: '/products/sku-rt3.webp',
  otherItemCount: 1,
  orderUrl: 'https://meritsciences.com/orders/sample',
  reorderUrl: 'https://meritsciences.com/reorder/sample',
  unsubscribeUrl: unsub,
};

const sale = { code: 'BLACKFRIDAY', pct: 30, endsLabel: 'Friday, December 4', products, unsubscribeUrl: unsub };

const out = [
  ['signup', 'signup-1', 'Right away', E.signupWelcome(signup)],
  ['signup', 'signup-2', 'Day 2', E.signupProof(signup)],
  ['signup', 'signup-3', 'Day 5', E.signupWhatArrives(signup)],
  ['signup', 'signup-4', 'Day 9', E.signupMostOrdered({ ...signup, products })],
  ['signup', 'signup-5', 'Day 14', E.signupLastNote(signup)],
  ['cart', 'cart-1', '1 hour', E.cartSaved(cart)],
  ['cart', 'cart-2', '24 hours', E.cartAnswers(cart)],
  ['cart', 'cart-3', '3 days', E.cartLastNote(cart)],
  ['order', 'order-1', '7 days after shipping', E.orderCheckIn(order)],
  ['order', 'order-2', '35 days after the order', E.orderReorder(order)],
  ['order', 'order-3', '75 days after the last order', E.orderNewBatches(order)],
  ['sale', 'sale-1', 'Fri Nov 27', E.saleLaunch(sale)],
  ['sale', 'sale-2', 'Mon Nov 30', E.saleReminder(sale)],
  ['sale', 'sale-3', 'Wed Dec 2', E.saleFavorites(sale)],
  ['sale', 'sale-4', 'Fri Dec 4', E.saleLastDay(sale)],
].map(([seq, key, when, r]) => ({ seq, key, when, subject: r.subject, preheader: r.preheader, html: r.html, text: r.text }));
process.stdout.write(JSON.stringify(out));
