/**
 * Sample data for rendering each email template in the admin preview.
 * Realistic but obviously fake (e.g. "Test Customer", "MS-PREVIEW-001")
 * so accidentally-sent emails are recognizable.
 */

export type TemplateKey =
  | 'order_confirmation'
  | 'shipment'
  | 'order_lookup'
  | 'refund_full'
  | 'refund_partial'
  | 'order_canceled'
  | 'abandoned_cart'
  | 'welcome'
  | 'post_delivery'
  // Prospect nurture (subscriber, no purchase yet)
  | 'prospect_welcome'
  | 'prospect_proof'
  | 'prospect_telegram'
  | 'prospect_sourcing'
  | 'prospect_vetting'
  | 'prospect_shipping'
  | 'prospect_reengage'
  | 'prospect_social_proof'
  | 'prospect_last_call'
  // Customer lifecycle (post-purchase revenue)
  | 'replenishment'
  | 'winback'
  // Broadcasts
  | 'lab_report'
  | 'interest_picker'
  // Compound education sequences (approved-counterpart) — tirzepatide = the
  // trial-rich exemplar; sermorelin beat 2 = the no-trial branch
  | 'seq_tirzepatide_1'
  | 'seq_tirzepatide_2'
  | 'seq_tirzepatide_3'
  | 'seq_tirzepatide_4'
  | 'seq_sermorelin_2'
  // Category (mechanism-class) sequences — NAD⁺/cellular exemplar
  | 'cat_cellular_1'
  | 'cat_cellular_2'
  | 'cat_cellular_3'
  | 'cat_cellular_4';

export type TemplateMeta = {
  key: TemplateKey;
  label: string;
  description: string;
  group: 'transactional' | 'marketing' | 'prospect' | 'sequences';
};

export const TEMPLATES: TemplateMeta[] = [
  // ── Transactional (order lifecycle)
  {
    key: 'order_confirmation',
    label: 'Order confirmation',
    description: 'Sent when PayPal capture completes. Receipt + magic link to view order.',
    group: 'transactional',
  },
  {
    key: 'shipment',
    label: 'Shipment notification',
    description: 'Sent when admin marks the order shipped with carrier + tracking.',
    group: 'transactional',
  },
  {
    key: 'refund_full',
    label: 'Refund — full',
    description: 'Sent when a full refund is issued via PayPal.',
    group: 'transactional',
  },
  {
    key: 'refund_partial',
    label: 'Refund — partial',
    description: 'Sent when a partial refund is issued. Includes amount + context.',
    group: 'transactional',
  },
  {
    key: 'order_canceled',
    label: 'Order canceled',
    description: 'Sent when an order is canceled. Branches based on whether money was charged.',
    group: 'transactional',
  },
  {
    key: 'order_lookup',
    label: 'Order lookup link',
    description: 'Sent when a customer requests a magic link to view their order page.',
    group: 'transactional',
  },
  // ── Marketing (behavior + lifecycle outreach)
  {
    key: 'abandoned_cart',
    label: 'Abandoned cart',
    description: 'Recovers cart left at PENDING_PAYMENT. Includes contents + optional discount nudge. Trigger: not yet wired (cron).',
    group: 'marketing',
  },
  {
    key: 'welcome',
    label: 'Welcome (newsletter)',
    description: 'Welcomes new newsletter subscribers. Includes welcome discount code. Trigger: not yet wired (signup popup).',
    group: 'marketing',
  },
  {
    key: 'post_delivery',
    label: 'Post-delivery follow-up',
    description: 'Sent 7 days after delivered. Offers CoA, reconstitution help, cross-sell. Trigger: not yet wired (cron).',
    group: 'marketing',
  },
  // ── Prospect nurture: instant welcome (day 0) + an 8-email funnel. Timer
  //    starts "today" for the whole backlog; one email/day max. Some witty.
  { key: 'prospect_welcome', label: '0 · Welcome + 20% (instant)', description: 'Sent the moment they subscribe. Hands over the code. Not part of the drip cadence.', group: 'prospect' },
  { key: 'prospect_proof', label: '1 · Show the receipt', description: 'Day 0. COA / proof — transparency as the hook. Links the live lot library.', group: 'prospect' },
  { key: 'prospect_telegram', label: "2 · Don't buy off Telegram", description: 'Day 2. The funny one — gray-market gamble vs tested. Telegram-vs-Merit table.', group: 'prospect' },
  { key: 'prospect_sourcing', label: '3 · Not a garage. A pharmacy.', description: 'Day 4. The sourcing story vs the gray market.', group: 'prospect' },
  { key: 'prospect_vetting', label: '4 · The 4 questions', description: 'Day 7. The four questions serious buyers ask.', group: 'prospect' },
  { key: 'prospect_shipping', label: '5 · What actually ships', description: 'Day 10. Sealed, lot-labeled, QR-to-COA. Operational trust.', group: 'prospect' },
  { key: 'prospect_reengage', label: '6 · Did we lose you?', description: 'Day 14. The witty re-engagement nudge.', group: 'prospect' },
  { key: 'prospect_social_proof', label: '7 · Good company', description: 'Day 18. Who sources from Merit.', group: 'prospect' },
  { key: 'prospect_last_call', label: '8 · Last call', description: 'Day 24. Final value + the 20%. Branches out the moment they buy.', group: 'prospect' },
  // ── Customer lifecycle + broadcasts (post-purchase revenue engine)
  {
    key: 'replenishment',
    label: 'Replenishment (+35d)',
    description: 'Vial plausibly running low → one-click reorder rebuilds the exact order. No discount by design. Trigger: daily customer-emails cron.',
    group: 'marketing',
  },
  {
    key: 'winback',
    label: 'Win-back (+75d)',
    description: 'Lapsed customer, latest order only. New-lots angle + one-click rebuild. Trigger: daily customer-emails cron.',
    group: 'marketing',
  },
  {
    key: 'lab_report',
    label: 'The Lab Report (broadcast)',
    description: 'Recurring issue: new lots first, running purity ledger, reply-to-vote. Manually fired: /api/cron/lab-report?tag=…',
    group: 'marketing',
  },
  {
    key: 'interest_picker',
    label: 'Interest picker (broadcast)',
    description: 'The self-segmentation activator — six one-tap mechanism-class lanes; each tap enrolls that subscriber in the class sequence. Manually fired: /api/cron/interest-picker?tag=…',
    group: 'marketing',
  },
  // ── Compound + category education sequences (BEAT_DAYS 0/2/4/6; daily
  //    product-sequences cron). Tirzepatide = trial-rich exemplar; sermorelin
  //    beat 2 = the no-trial branch; NAD⁺ class = category exemplar.
  { key: 'seq_tirzepatide_1', label: 'Tirzepatide · 1 identity', description: 'Day 0. "The molecule inside Mounjaro/Zepbound" — borrowed recognition, RUO line.', group: 'sequences' },
  { key: 'seq_tirzepatide_2', label: 'Tirzepatide · 2 the data', description: 'Day 2. SURMOUNT-1 22.5%, attributed to the APPROVED drug. The compliance-critical beat.', group: 'sequences' },
  { key: 'seq_tirzepatide_3', label: 'Tirzepatide · 3 the angle', description: 'Day 4. Same molecule + per-lot COA + price gap.', group: 'sequences' },
  { key: 'seq_tirzepatide_4', label: 'Tirzepatide · 4 the receipt', description: 'Day 6. COA library proof → shop, code baked into the buttons.', group: 'sequences' },
  { key: 'seq_sermorelin_2', label: 'Sermorelin · 2 (no-trial branch)', description: 'The beat-2 variant for compounds without a headline trial — leads with the approval history (Geref).', group: 'sequences' },
  { key: 'cat_cellular_1', label: 'NAD⁺ class · 1 pathway', description: 'Day 0. The mechanism class, no compound hype.', group: 'sequences' },
  { key: 'cat_cellular_2', label: 'NAD⁺ class · 2 roster', description: 'Day 2. NAD⁺/MOTS-c/5-Amino-1MQ/Epitalon + what research explores for each (read from research-data.ts).', group: 'sequences' },
  { key: 'cat_cellular_3', label: 'NAD⁺ class · 3 the angle', description: 'Day 4. Same pathway, the per-lot COA receipt included.', group: 'sequences' },
  { key: 'cat_cellular_4', label: 'NAD⁺ class · 4 the receipt', description: 'Day 6. Check any lot in the class → shop, code baked in.', group: 'sequences' },
];

const SAMPLE_LINES = [
  { title: 'BPC-157 + TB-500 (Wolverine Blend)', bundleLabel: '3-Pack', qty: 1, unitCents: 21375 },
  { title: 'NAD+ 500mg', bundleLabel: 'Single', qty: 1, unitCents: 8500 },
];

const SAMPLE_LINES_ABANDONED = [
  { title: 'Retatrutide (LY3437943)', bundleLabel: '6-Pack', qty: 1, unitCents: 49500 },
  { title: 'Tirzepatide (LY3298176)', bundleLabel: '3-Pack', qty: 1, unitCents: 28500 },
];

// Cross-sell sample uses real product handles from the seeded catalog so
// the preview shows accurate imagery + pricing. In production this is
// pulled from the live DB via getCrossSellProducts().
// Image URLs use the new canonical Merit-branded vial assets. These are
// served from /public/products/ so the admin preview matches what real
// emails render in customer inboxes.
const SAMPLE_CROSS_SELL = [
  {
    handle: 'bpc-157-tb-500',
    title: 'Wolverine Blend',
    oneLiner: 'Tissue repair blend, lyophilized',
    priceCents: 9500,
    imageUrl: 'https://meritsciences.com/products/sku-bpc-10mg-tb-10mg-wolverine-20mg.webp',
    url: 'https://meritsciences.com/products/bpc-157-tb-500',
  },
  {
    handle: 'ipamorelin',
    title: 'Ipamorelin',
    oneLiner: 'GHRH peptide, 10mg lyophilized vial',
    priceCents: 6500,
    imageUrl: 'https://meritsciences.com/products/sku-ipamorelin-10mg.webp',
    url: 'https://meritsciences.com/products/ipamorelin',
  },
  {
    handle: 'nad-500mg',
    title: 'NAD+ 500mg',
    oneLiner: 'Cellular research, single vial',
    priceCents: 8500,
    imageUrl: 'https://meritsciences.com/products/sku-nad-500mg.webp',
    url: 'https://meritsciences.com/products/nad-500mg',
  },
];

export function sampleDataFor(key: TemplateKey): Record<string, any> {
  const lookupUrl = 'https://meritsciences.com/orders/preview?token=sample';
  const catalogUrl = 'https://meritsciences.com/catalog';

  switch (key) {
    case 'prospect_welcome':
    case 'prospect_proof':
    case 'prospect_telegram':
    case 'prospect_sourcing':
    case 'prospect_vetting':
    case 'prospect_shipping':
    case 'prospect_reengage':
    case 'prospect_social_proof':
    case 'prospect_last_call':
      return { code: 'WELCOME20', unsubscribeUrl: 'https://meritsciences.com/unsubscribe?e=you@example.com&t=sample' };
    // Compound sequence beats — ctx + the compound's hero vial (in prod the
    // image is resolved per-enrollment from the live catalog).
    case 'seq_tirzepatide_1':
    case 'seq_tirzepatide_2':
    case 'seq_tirzepatide_3':
    case 'seq_tirzepatide_4':
      return { code: 'WELCOME20', unsubscribeUrl: 'https://meritsciences.com/unsubscribe?e=you@example.com&t=sample', heroImageUrl: '/products/sku-tirzepatide-30mg.webp' };
    case 'seq_sermorelin_2':
      return { code: 'WELCOME20', unsubscribeUrl: 'https://meritsciences.com/unsubscribe?e=you@example.com&t=sample', heroImageUrl: '/products/sku-sermorelin-acetate-10mg.webp' };
    // Category sequence beats — hero + the roster thumbnails (the "lineup" shot).
    case 'cat_cellular_1':
    case 'cat_cellular_2':
    case 'cat_cellular_3':
    case 'cat_cellular_4':
      return {
        code: 'WELCOME20',
        unsubscribeUrl: 'https://meritsciences.com/unsubscribe?e=you@example.com&t=sample',
        heroImageUrl: '/products/sku-nad-500mg.webp',
        memberImages: [
          { src: '/products/sku-nad-500mg.webp', alt: 'NAD⁺ research vial' },
          { src: '/products/sku-mots-c-40mg.webp', alt: 'MOTS-c research vial' },
          { src: '/products/sku-5-amino-1mq-50mg.webp', alt: '5-Amino-1MQ research vial' },
          { src: '/products/sku-epitalon-50mg.webp', alt: 'Epitalon research vial' },
        ],
      };
    case 'replenishment':
    case 'winback':
      return {
        firstName: 'Alex',
        primaryProductTitle: 'Tirzepatide 30mg',
        reorderUrl: 'https://meritsciences.com/reorder/sample.signature',
        unsubscribeUrl: 'https://meritsciences.com/unsubscribe?e=you@example.com&t=sample',
        productImageUrl: '/products/sku-tirzepatide-30mg.webp',
      };
    case 'lab_report':
      return {
        issueLabel: 'July 2026',
        lots: [
          { compound: 'Tirzepatide 30mg', lotId: 'MRT-2607-02', purity: '99.6%', testedDate: 'Jul 5, 2026' },
          { compound: 'NAD⁺ 500mg', lotId: 'MRT-2606-08', purity: '99.1%', testedDate: 'Jun 28, 2026' },
          { compound: 'Semaglutide 10mg', lotId: 'MRT-2607-05', purity: '99.4%', testedDate: 'Jul 12, 2026' },
        ],
        totalPublished: 77,
        meanPurity: '99.43%',
        voteOptions: ['Cagrilintide', 'KPV', 'SS-31'],
        code: 'WELCOME20',
        unsubscribeUrl: 'https://meritsciences.com/unsubscribe?e=you@example.com&t=sample',
      };
    case 'interest_picker':
      return {
        lanes: [
          { label: 'Weight & GLP-1s', sub: 'the Ozempic / Mounjaro class', href: 'https://meritsciences.com/enroll?seq=cat-incretin&e=you@example.com&t=sample' },
          { label: 'NAD⁺ & longevity', sub: 'cellular-energy pathways', href: 'https://meritsciences.com/enroll?seq=cat-cellular&e=you@example.com&t=sample' },
          { label: 'Growth-hormone axis', sub: 'secretagogues + IGF-1', href: 'https://meritsciences.com/enroll?seq=cat-gh-axis&e=you@example.com&t=sample' },
          { label: 'Tissue repair', sub: 'BPC-157, GHK-Cu & blends', href: 'https://meritsciences.com/enroll?seq=cat-repair&e=you@example.com&t=sample' },
          { label: 'Neuropeptides', sub: 'Selank & Semax', href: 'https://meritsciences.com/enroll?seq=cat-neuro&e=you@example.com&t=sample' },
          { label: 'Vitality', sub: 'PT-141 & melanocortin', href: 'https://meritsciences.com/enroll?seq=cat-melanocortin&e=you@example.com&t=sample' },
        ],
        unsubscribeUrl: 'https://meritsciences.com/unsubscribe?e=you@example.com&t=sample',
      };
    case 'order_confirmation':
      return {
        orderId: 'cuid-preview',
        paypalOrderId: 'MS-PREVIEW-001',
        customerName: 'Alex Sample',
        shippingFullName: 'Alex Sample',
        shippingLine1: '1234 Research Park Dr',
        shippingLine2: 'Suite 200',
        shippingCity: 'Dallas',
        shippingState: 'TX',
        shippingZip: '75201',
        lines: SAMPLE_LINES,
        subtotalCents: 29875,
        shippingCents: 0,
        discountCents: 2988,
        totalCents: 26887,
        discountCode: 'WELCOME10',
        lookupUrl,
        crossSell: SAMPLE_CROSS_SELL,
      };
    case 'shipment':
      return {
        customerName: 'Alex Sample',
        paypalOrderId: 'MS-PREVIEW-001',
        carrier: 'usps',
        trackingNumber: '9405511899223197425678',
        trackingUrl: 'https://tools.usps.com/go/TrackConfirmAction?qtc_tLabels1=9405511899223197425678',
        estimatedDeliveryAt: new Date(Date.now() + 1000 * 60 * 60 * 48),
        lookupUrl,
        crossSell: SAMPLE_CROSS_SELL,
      };
    case 'order_lookup':
      return {
        email: 'alex@example.com',
        paypalOrderId: 'MS-PREVIEW-001',
        lookupUrl,
      };
    case 'refund_full':
      return {
        customerName: 'Alex Sample',
        paypalOrderId: 'MS-PREVIEW-001',
        refundedCents: 26887,
        totalCents: 26887,
        isFull: true,
        reason: null,
        lookupUrl,
      };
    case 'refund_partial':
      return {
        customerName: 'Alex Sample',
        paypalOrderId: 'MS-PREVIEW-001',
        refundedCents: 8500,
        totalCents: 26887,
        isFull: false,
        reason: 'NAD+ vial shipped with damaged seal — replacement ships separately.',
        lookupUrl,
      };
    case 'order_canceled':
      return {
        customerName: 'Alex Sample',
        paypalOrderId: 'MS-PREVIEW-001',
        reason: 'Out of stock on one of the lots ordered. Refund issued in full.',
        wasPaid: true,
        lookupUrl,
      };
    case 'abandoned_cart':
      return {
        customerName: 'Alex Sample',
        lines: SAMPLE_LINES_ABANDONED,
        subtotalCents: 78000,
        recoveryUrl: 'https://meritsciences.com/checkout?recover=sample',
        discountCode: 'COMEBACK10',
        discountPercent: 10,
        crossSell: SAMPLE_CROSS_SELL,
      };
    case 'welcome':
      return {
        firstName: 'Alex',
        discountCode: 'WELCOME10',
        discountPercent: 10,
        catalogUrl,
        crossSell: SAMPLE_CROSS_SELL,
      };
    case 'post_delivery':
      return {
        customerName: 'Alex Sample',
        paypalOrderId: 'MS-PREVIEW-001',
        primaryProductTitle: 'Wolverine Blend',
        lookupUrl,
        catalogUrl,
        crossSell: SAMPLE_CROSS_SELL,
      };
  }
}
