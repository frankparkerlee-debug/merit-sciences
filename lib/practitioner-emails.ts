/**
 * Practitioner email sequences — content + send schedule.
 *
 * Three phases, each with its own enter/exit semantics:
 *
 *   PROSPECT   (10 emails, days 0-40)  → exit when application submitted
 *   ONBOARDING ( 6 emails, days 0-28)  → exit when first order placed
 *   RETENTION  (10 emails, days 0-135) → ongoing
 *
 * Each email is described by:
 *   • phase         — which sequence
 *   • dayOffset     — days after phase enter
 *   • subject       — production subject line
 *   • body(ctx)     — returns the inner HTML (header/footer applied
 *                     by `renderEmail()`)
 *
 * Tone rules: data-dense, brief, professional peer voice. No emojis,
 * no exclamation marks, no clinical-outcome claims, no pricing quoted.
 */

import 'server-only';

export type EmailPhase = 'PROSPECT' | 'ONBOARDING' | 'RETENTION';

export type EmailContext = {
  /** First name extracted from providerName */
  firstName: string;
  practiceName: string;
  /** Base URL — e.g. https://meritsciences.com */
  siteUrl: string;
  /** Token for one-click unsubscribe */
  unsubscribeUrl: string;
  /** When the practitioner has a first SKU on file, plug it in for P3 emails */
  firstCompound?: string;
  /** For P3 lot-release emails */
  lotRelease?: { compound: string; lot: string; date: string; purity: string };
};

export type EmailDefinition = {
  /** Unique key — used as the dedupe + log key */
  key: string;
  phase: EmailPhase;
  /** Days after phase enter — 0 means same-day */
  dayOffset: number;
  subject: (ctx: EmailContext) => string;
  /** Returns BODY HTML only; header/footer wrap is applied by renderEmail */
  body: (ctx: EmailContext) => string;
};

const COBALT = '#2E4DDB';
const INK = '#0B0F1A';
const INK_SOFT = '#5C6378';
const CREAM = '#F4F1EA';

// ── Shared chrome ─────────────────────────────────────────────────────────
export function renderEmail(def: EmailDefinition, ctx: EmailContext): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${escape(def.subject(ctx))}</title></head>
<body style="margin:0;padding:0;background:${CREAM};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:${INK};">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:${CREAM};padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="560" style="max-width:560px;background:#fff;border-radius:14px;overflow:hidden;">
        <tr><td style="padding:24px 32px 8px;">
          <p style="margin:0;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:${COBALT};font-weight:700;">— Merit Sciences</p>
        </td></tr>
        <tr><td style="padding:12px 32px 28px;font-size:15px;line-height:23px;color:${INK};">
          ${def.body(ctx)}
        </td></tr>
        <tr><td style="padding:18px 32px;border-top:1px solid #EBE6D7;font-size:11px;line-height:18px;color:${INK_SOFT};">
          Merit Sciences &middot; Dallas, TX &middot; 503B outsourcing facility &middot; ISO certified<br>
          <a href="${ctx.unsubscribeUrl}" style="color:${INK_SOFT};text-decoration:underline;">Unsubscribe</a> &middot;
          <a href="mailto:info@meritpeptides.com" style="color:${INK_SOFT};text-decoration:underline;">Reply directly</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

const btn = (label: string, href: string) =>
  `<p style="margin:18px 0 4px;"><a href="${href}" style="display:inline-block;background:${COBALT};color:#fff;padding:11px 20px;border-radius:8px;text-decoration:none;font-weight:700;letter-spacing:0.06em;font-size:13px;">${label}</a></p>`;

const link = (label: string, href: string) =>
  `<a href="${href}" style="color:${COBALT};text-decoration:underline;">${label}</a>`;

function escape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ═══════════════ PHASE 1 — PROSPECT (10 emails, 0-40 days) ═══════════════
// Goal: drive application. Exit when PractitionerApplication is created
// matching this email address.
// ═════════════════════════════════════════════════════════════════════════
const PROSPECT: EmailDefinition[] = [
  {
    key: 'P1.01_brief',
    phase: 'PROSPECT',
    dayOffset: 0,
    subject: () => 'Your Merit Sciences practitioner brief',
    body: (ctx) => `
      <p>Thanks for the interest in Merit.</p>
      <p>Over the next few weeks we&rsquo;ll send a short, deliberate series — no marketing fluff. Topics:</p>
      <ul style="padding-left:18px;margin:8px 0 16px;">
        <li>How a Merit lot gets released</li>
        <li>The acetate-vs-TFA chemistry most discount peptides skip</li>
        <li>How to read a peptide COA</li>
        <li>What the application + portal experience looks like</li>
      </ul>
      <p>If you&rsquo;d rather skip the series and apply now, it takes about four minutes.</p>
      ${btn('Apply for portal access →', `${ctx.siteUrl}/practitioners#apply`)}
      <p style="font-size:13px;color:${INK_SOFT};margin-top:18px;">&mdash; The Merit pharmacy team</p>
    `,
  },
  {
    key: 'P1.02_inside_a_lot',
    phase: 'PROSPECT',
    dayOffset: 2,
    subject: () => 'How a Merit lot gets released',
    body: (ctx) => `
      <p>Most practitioners we talk to have never been walked through their supplier&rsquo;s release chain. Worth knowing what&rsquo;s in ours.</p>
      <ol style="padding-left:20px;margin:8px 0 16px;">
        <li><strong>API procurement</strong> — FDA-registered upstream suppliers, COA on receipt.</li>
        <li><strong>Compounding</strong> — under USP &lt;797&gt; in a 503B facility. ISO Class 5 fill room.</li>
        <li><strong>Characterization</strong> — HPLC &ge;99% purity per lot. Sterility (USP &lt;71&gt;), endotoxin (USP &lt;85&gt;), particulate (USP &lt;788&gt;).</li>
        <li><strong>Pharmacist release</strong> — a US-licensed pharmacist signs off on every batch.</li>
        <li><strong>COA</strong> — accompanies every shipment. Lot # on the label.</li>
      </ol>
      <p>Every step is documented, dated, and traceable. That&rsquo;s the chain you can name.</p>
      ${btn('Apply for portal access →', `${ctx.siteUrl}/practitioners#apply`)}
    `,
  },
  {
    key: 'P1.03_acetate_vs_tfa',
    phase: 'PROSPECT',
    dayOffset: 5,
    subject: () => 'Why your peptides ship as acetate, not TFA',
    body: (ctx) => `
      <p>Short chemistry note that matters.</p>
      <p>Most discount peptides ship as the <strong>trifluoroacetate (TFA)</strong> salt because TFA is the synthesis byproduct of standard solid-phase peptide synthesis. Removing it requires an acetate exchange step that&rsquo;s expensive and time-consuming.</p>
      <p>Characterized pharmaceutical references use the <strong>acetate</strong> counterion. That&rsquo;s what Merit exchanges to. Always.</p>
      <p>We pay for it because the salt form changes the dosing math and the impurity profile. Most discount suppliers don&rsquo;t.</p>
      ${btn('See sample COA →', `${ctx.siteUrl}/practitioners#apply`)}
    `,
  },
  {
    key: 'P1.04_reading_a_coa',
    phase: 'PROSPECT',
    dayOffset: 9,
    subject: () => 'Reading a peptide COA',
    body: (ctx) => `
      <p>A practical reference for evaluating any supplier — not just Merit.</p>
      <p><strong>What to look for:</strong></p>
      <ul style="padding-left:18px;margin:8px 0 16px;">
        <li><strong>HPLC purity &ge;99%</strong> — area % at the target retention time. Below 99% is a flag.</li>
        <li><strong>Sterility</strong> per USP &lt;71&gt; — pass/fail.</li>
        <li><strong>Endotoxin</strong> per USP &lt;85&gt; — EU/mL, should be well under threshold.</li>
        <li><strong>Particulate</strong> per USP &lt;788&gt;.</li>
        <li><strong>Lot # + manufacture date + BUD</strong> — beyond-use date.</li>
        <li><strong>Counterion</strong> — should specify (acetate or TFA).</li>
      </ul>
      <p>If a COA is missing any of these, ask why. If the supplier can&rsquo;t produce one, that&rsquo;s an answer.</p>
      ${btn('Apply for Merit access →', `${ctx.siteUrl}/practitioners#apply`)}
    `,
  },
  {
    key: 'P1.05_supplier_story',
    phase: 'PROSPECT',
    dayOffset: 13,
    subject: () => 'The supplier story you can name',
    body: (ctx) => `
      <p>A lot of supplier stories are vapor — &ldquo;manufactured in a sterile lab, tested rigorously&rdquo; with no entity name, no facility address, no inspectable chain.</p>
      <p>Ours: a <strong>503B outsourcing facility in Dallas</strong>, FDA-registered, ISO certified. US-licensed pharmacy team. Named in your COA. Inspectable on the FDA&rsquo;s 503B registration list.</p>
      <p>That&rsquo;s what we mean when we say sourcing that holds up to scrutiny.</p>
      ${btn('Apply →', `${ctx.siteUrl}/practitioners#apply`)}
    `,
  },
  {
    key: 'P1.06_portal_walkthrough',
    phase: 'PROSPECT',
    dayOffset: 17,
    subject: () => 'What changes after approval',
    body: (ctx) => `
      <p>Approved practitioner accounts unlock:</p>
      <ul style="padding-left:18px;margin:8px 0 16px;">
        <li>Account-tier pricing (set at approval — never published)</li>
        <li>Order history with COA archive per order</li>
        <li>Lot tracking per order</li>
        <li>One-click reorder</li>
        <li>Practitioner-only compounds when applicable</li>
      </ul>
      <p>Verification takes one business day. License + NPI is all we need.</p>
      ${btn('Apply →', `${ctx.siteUrl}/practitioners#apply`)}
    `,
  },
  {
    key: 'P1.07_faq',
    phase: 'PROSPECT',
    dayOffset: 21,
    subject: () => 'Practitioner FAQ',
    body: (ctx) => `
      <p>Common questions we hear before applying.</p>
      <p><strong>Do I need a DEA?</strong> Only for scheduled substances. The Merit catalog doesn&rsquo;t currently include controlled compounds.</p>
      <p><strong>Do I need an NPI?</strong> Yes — 10-digit NPI is required.</p>
      <p><strong>Can I apply with an NP / PA / PharmD / ND license?</strong> Yes — all licensed practitioners qualify.</p>
      <p><strong>Can multiple providers share one account?</strong> Yes — practice account, individual sign-ins.</p>
      <p><strong>Lead time on first order?</strong> Same as retail: 48 hours dispatch from Dallas.</p>
      <p><strong>Approval time?</strong> One business day after we receive the application.</p>
      <p>Other questions? Reply directly to this email — you&rsquo;ll reach the team.</p>
      ${btn('Apply →', `${ctx.siteUrl}/practitioners#apply`)}
    `,
  },
  {
    key: 'P1.08_checklist',
    phase: 'PROSPECT',
    dayOffset: 26,
    subject: () => 'What you&rsquo;ll need to apply',
    body: (ctx) => `
      <p>The application takes about four minutes. Have ready:</p>
      <ul style="padding-left:18px;margin:8px 0 16px;">
        <li>Practice / clinic name</li>
        <li>Your full name + credentials (MD/DO/NP/PA/DC/PharmD/ND)</li>
        <li>State + license number</li>
        <li>10-digit NPI</li>
        <li>Email + phone</li>
        <li>Specialty / practice focus (one line)</li>
      </ul>
      <p>No fee. No commitment.</p>
      ${btn('Apply →', `${ctx.siteUrl}/practitioners#apply`)}
    `,
  },
  {
    key: 'P1.09_check_in',
    phase: 'PROSPECT',
    dayOffset: 32,
    subject: () => 'Still considering Merit?',
    body: (ctx) => `
      <p>Quick check-in. We don&rsquo;t want to add to your inbox without value.</p>
      <p>If something specific would help you decide — sample COA, manufacturing walkthrough video, conversation with our chief pharmacist — reply to this email and we&rsquo;ll get it to you.</p>
      <p>If now&rsquo;s not the right time, that&rsquo;s fine too. We&rsquo;re not going anywhere.</p>
      <p style="font-size:13px;color:${INK_SOFT};">&mdash; The Merit pharmacy team</p>
      ${btn('Apply →', `${ctx.siteUrl}/practitioners#apply`)}
    `,
  },
  {
    key: 'P1.10_closing',
    phase: 'PROSPECT',
    dayOffset: 40,
    subject: () => 'Closing your file',
    body: (ctx) => `
      <p>We keep our list lean. If Merit&rsquo;s not a fit, no hard feelings.</p>
      <p>If you&rsquo;d like to apply now, the link&rsquo;s below. If you&rsquo;d rather stay subscribed for occasional updates (new lot releases, research roundups), reply &ldquo;stay&rdquo; and we&rsquo;ll move you to a low-frequency list. Otherwise we&rsquo;ll close your file at the end of the week.</p>
      ${btn('Apply now →', `${ctx.siteUrl}/practitioners#apply`)}
      <p style="font-size:12px;margin-top:18px;">${link('Stay subscribed', ctx.siteUrl + '/account/preferences')} &middot; ${link('Unsubscribe', ctx.unsubscribeUrl)}</p>
    `,
  },
];

// ═══════════════ PHASE 2 — ONBOARDING (6 emails, 0-28 days) ═══════════════
// Enters when application status → APPROVED (the approval email is sent
// separately as the immediate notification; ONBOARDING starts the day
// after). Exits when an Order is placed by this email address.
// ═════════════════════════════════════════════════════════════════════════
const ONBOARDING: EmailDefinition[] = [
  {
    key: 'P2.01_where_to_start',
    phase: 'ONBOARDING',
    dayOffset: 1,
    subject: () => 'Your first Merit order — where practitioners start',
    body: (ctx) => `
      <p>Welcome aboard. Three common starting points we see from new practitioner accounts:</p>
      <p><strong>1. Mirror your current protocol.</strong> Order what you already use — same compound, same vial size. Evaluate Merit next to your current supplier.</p>
      <p><strong>2. Diversify your supply.</strong> Add Merit as a second supplier alongside your current one. Reduces single-source risk.</p>
      <p><strong>3. Start small.</strong> A 1-2 vial order on a single SKU lets you see the packaging, the COA, and the dispatch speed before committing volume.</p>
      <p>Whatever you start with, your account-tier pricing applies the moment you sign in.</p>
      ${btn('View catalog →', `${ctx.siteUrl}/catalog`)}
    `,
  },
  {
    key: 'P2.02_what_ships',
    phase: 'ONBOARDING',
    dayOffset: 4,
    subject: () => 'What ships in a Merit order',
    body: (ctx) => `
      <p>Every vial includes:</p>
      <ul style="padding-left:18px;margin:8px 0 16px;">
        <li>Lot # printed on the label, tied to the COA</li>
        <li>Lyophilized peptide</li>
        <li>Tamper-evident closure</li>
        <li>Cold-pack shipping for temperature stability in transit</li>
      </ul>
      <p>Every shipment includes:</p>
      <ul style="padding-left:18px;margin:8px 0 16px;">
        <li>Itemized packing slip</li>
        <li>Full COA for each lot in the order</li>
        <li>Cold-chain documentation</li>
      </ul>
      ${btn('Browse catalog →', `${ctx.siteUrl}/catalog`)}
    `,
  },
  {
    key: 'P2.03_delivery_expectations',
    phase: 'ONBOARDING',
    dayOffset: 8,
    subject: () => 'Your first shipment — what to expect',
    body: (ctx) => `
      <p>If you&rsquo;re ordering in the next week, here&rsquo;s the picture:</p>
      <ul style="padding-left:18px;margin:8px 0 16px;">
        <li><strong>Dispatch within 48 hours</strong> of order confirmation, from Dallas</li>
        <li><strong>Cold-chain shipping</strong> — temperature-controlled</li>
        <li><strong>Tracking number</strong> in your portal as soon as the label prints</li>
        <li><strong>COA archive</strong> in your portal — pull it anytime</li>
      </ul>
      <p>If anything&rsquo;s off when the box arrives, reply directly to the order confirmation — you reach the pharmacy team.</p>
      ${btn('View catalog →', `${ctx.siteUrl}/catalog`)}
    `,
  },
  {
    key: 'P2.04_portal_only',
    phase: 'ONBOARDING',
    dayOffset: 13,
    subject: () => 'SKUs available only inside the portal',
    body: (ctx) => `
      <p>A few compounds aren&rsquo;t listed on the public catalog — they&rsquo;re available to practitioner accounts only.</p>
      <p>When you sign in, anything portal-only in our inventory shows up automatically alongside the public catalog. Worth a look before your first order.</p>
      ${btn('Sign in to your portal →', `${ctx.siteUrl}/practitioners/portal`)}
    `,
  },
  {
    key: 'P2.05_check_in',
    phase: 'ONBOARDING',
    dayOffset: 19,
    subject: () => 'Anything blocking your first order?',
    body: (ctx) => `
      <p>Quick check. We saw your account is active but haven&rsquo;t seen a first order yet.</p>
      <p>If something specific would help — pricing detail on a compound, lead-time confirmation, a conversation about volume — reply directly.</p>
      <p>We&rsquo;re trying to be useful, not noisy.</p>
      <p style="font-size:13px;color:${INK_SOFT};">&mdash; The Merit pharmacy team</p>
    `,
  },
  {
    key: 'P2.06_recap',
    phase: 'ONBOARDING',
    dayOffset: 28,
    subject: () => 'Why practitioners switch to Merit',
    body: (ctx) => `
      <p>A quick recap of what your account gives you:</p>
      <ul style="padding-left:18px;margin:8px 0 16px;">
        <li><strong>503B + ISO certified facility</strong> in Dallas</li>
        <li><strong>HPLC &ge;99% per lot</strong> with full USP &lt;71&gt;/&lt;85&gt;/&lt;788&gt; characterization</li>
        <li><strong>Acetate counterion</strong> across the catalog</li>
        <li><strong>COA with every shipment</strong></li>
        <li><strong>48-hour dispatch</strong>, no MOQ</li>
      </ul>
      <p>Your account-tier pricing is already applied. First order whenever you&rsquo;re ready.</p>
      ${btn('Place first order →', `${ctx.siteUrl}/catalog`)}
    `,
  },
];

// ═══════════════ PHASE 3 — RETENTION (10 emails, 3-135 days) ═══════════════
// Enters when first order delivered (or paid, configurable). Continues
// regardless of subsequent orders — these are nurture/education/loyalty,
// not "you haven't ordered" pressure.
// ═════════════════════════════════════════════════════════════════════════
const RETENTION: EmailDefinition[] = [
  {
    key: 'P3.01_first_lot',
    phase: 'RETENTION',
    dayOffset: 3,
    subject: () => 'Your first lot is documented',
    body: (ctx) => `
      <p>Quick note: your first order was delivered, and the COA + lot data is now archived in your portal under Order History. Pull it anytime.</p>
      <p>If anything in the shipment was off — quality, packaging, documentation — reply to this email and you&rsquo;ll reach the pharmacy team directly.</p>
      <p>If everything was right, here&rsquo;s where most practitioners go next:</p>
      <ul style="padding-left:18px;margin:8px 0 16px;">
        <li><strong>Reorder same SKU</strong> — keeps lot continuity for your records</li>
        <li><strong>Expand to a second compound</strong> — your pricing applies across the catalog</li>
      </ul>
      ${btn('View order history →', `${ctx.siteUrl}/practitioners/portal`)}
    `,
  },
  {
    key: 'P3.02_stack_patterns',
    phase: 'RETENTION',
    dayOffset: 14,
    subject: (ctx) => `What practitioners commonly stack with ${ctx.firstCompound ?? 'your formulary'}`,
    body: (ctx) => `
      <p>Practitioners ordering ${ctx.firstCompound ?? '[that compound]'} frequently also order related compounds in adjacent research families.</p>
      <p>(These are observed ordering patterns, not protocol guidance — your practice, your call.)</p>
      <p>If any of these are already in your formulary at another supplier, your Merit pricing might surprise you.</p>
      ${btn('Browse the catalog →', `${ctx.siteUrl}/catalog`)}
    `,
  },
  {
    key: 'P3.03_lot_release',
    phase: 'RETENTION',
    dayOffset: 30,
    subject: (ctx) =>
      ctx.lotRelease ? `New lot released — ${ctx.lotRelease.compound}` : 'New lot released',
    body: (ctx) => `
      <p>${
        ctx.lotRelease
          ? `Lot <strong>${ctx.lotRelease.lot}</strong> for <strong>${ctx.lotRelease.compound}</strong> released on <strong>${ctx.lotRelease.date}</strong>.`
          : 'New lots have released across the catalog.'
      }</p>
      ${
        ctx.lotRelease
          ? `<ul style="padding-left:18px;margin:8px 0 16px;">
              <li>HPLC purity: ${ctx.lotRelease.purity}</li>
              <li>Sterility: pass</li>
              <li>Endotoxin: within USP &lt;85&gt; limit</li>
            </ul>
            <p>If you&rsquo;ve been waiting for fresh lot stock to reorder, this is it.</p>`
          : '<p>Check the portal for current lot inventory across your usual SKUs.</p>'
      }
      ${btn('Reorder →', `${ctx.siteUrl}/catalog`)}
    `,
  },
  {
    key: 'P3.04_forecasting',
    phase: 'RETENTION',
    dayOffset: 45,
    subject: () => 'Forecasting your next order',
    body: (ctx) => `
      <p>If you&rsquo;re ordering on a regular cadence, a few things that might help:</p>
      <ul style="padding-left:18px;margin:8px 0 16px;">
        <li><strong>Auto-reorder</strong> at your preferred interval (monthly, bi-monthly, quarterly)</li>
        <li><strong>Standing order</strong> with batch reservation — we hold inventory for you</li>
        <li><strong>Multi-provider account</strong> if your practice has multiple ordering clinicians</li>
      </ul>
      <p>If any of these are interesting, reply and we&rsquo;ll set it up.</p>
      <p style="font-size:13px;color:${INK_SOFT};">&mdash; The Merit pharmacy team</p>
    `,
  },
  {
    key: 'P3.05_research_roundup',
    phase: 'RETENTION',
    dayOffset: 60,
    subject: () => 'Research roundup — recent literature in your formulary',
    body: (ctx) => `
      <p>Recent updates worth surfacing:</p>
      <ul style="padding-left:18px;margin:8px 0 16px;">
        <li>New PubMed releases on dual/triple-agonist incretin research</li>
        <li>Regulatory updates on relevant parent molecules</li>
        <li>Notable preprints on tissue-repair pathway peptides</li>
      </ul>
      <p>Not recommendations — signal.</p>
      ${btn('Browse research-linked PDPs →', `${ctx.siteUrl}/catalog`)}
    `,
  },
  {
    key: 'P3.06_portal_tools',
    phase: 'RETENTION',
    dayOffset: 75,
    subject: () => 'Portal features worth knowing',
    body: (ctx) => `
      <p>A few portal capabilities that don&rsquo;t get enough airtime:</p>
      <ul style="padding-left:18px;margin:8px 0 16px;">
        <li><strong>COA archive</strong> — pull any historical COA by order or lot</li>
        <li><strong>Lot history</strong> — every lot you&rsquo;ve received, sortable</li>
        <li><strong>Auto-reorder</strong> — set cadence per SKU</li>
        <li><strong>Practice ordering</strong> — multiple providers, one account</li>
        <li><strong>Export</strong> — download order history as CSV</li>
      </ul>
      ${btn('Sign in →', `${ctx.siteUrl}/practitioners/portal`)}
    `,
  },
  {
    key: 'P3.07_quarterly',
    phase: 'RETENTION',
    dayOffset: 90,
    subject: () => 'Quarterly check-in',
    body: (ctx) => `
      <p>You&rsquo;ve been on Merit for about 90 days. One reflection question:</p>
      <p><strong>What&rsquo;s working, and what&rsquo;s not?</strong></p>
      <p>We read every reply. If there&rsquo;s a compound you&rsquo;d like us to add, a portal feature missing, or an experience issue — we want to know.</p>
      <p style="font-size:13px;color:${INK_SOFT};">&mdash; The Merit pharmacy team</p>
    `,
  },
  {
    key: 'P3.08_referral',
    phase: 'RETENTION',
    dayOffset: 105,
    subject: () => 'Know a practitioner who&rsquo;d benefit?',
    body: (ctx) => `
      <p>If Merit has been a good fit, the highest compliment is an introduction.</p>
      <p>Reply with a name + email and we&rsquo;ll reach out gently — no spam, no pressure. If they convert to an account, we credit your account on the next invoice.</p>
      <p style="font-size:13px;color:${INK_SOFT};">&mdash; The Merit pharmacy team</p>
    `,
  },
  {
    key: 'P3.09_year_in_lots',
    phase: 'RETENTION',
    dayOffset: 120,
    subject: () => 'Your year in lots',
    body: (ctx) => `
      <p>Quick year-end recap of your Merit account (the numbers populate from your order history):</p>
      <ul style="padding-left:18px;margin:8px 0 16px;">
        <li>Orders placed</li>
        <li>Distinct lots received</li>
        <li>Compounds in your formulary</li>
        <li>Average dispatch time</li>
      </ul>
      <p>Your COA archive is complete. Reorder shortcuts in your portal. Thanks for the year.</p>
      <p style="font-size:13px;color:${INK_SOFT};">&mdash; The Merit pharmacy team</p>
    `,
  },
  {
    key: 'P3.10_volume_tier',
    phase: 'RETENTION',
    dayOffset: 135,
    subject: () => 'Volume-tier conversation',
    body: (ctx) => `
      <p>For practitioners ordering at scale, we have a few features worth a conversation:</p>
      <ul style="padding-left:18px;margin:8px 0 16px;">
        <li><strong>Custom pricing tier</strong> for sustained volume</li>
        <li><strong>Dedicated account contact</strong> at the pharmacy</li>
        <li><strong>Batch reservation</strong> for forecasted volume</li>
        <li><strong>Priority dispatch</strong> windows</li>
      </ul>
      <p>If this fits your practice trajectory, reply to schedule 15 minutes.</p>
      <p style="font-size:13px;color:${INK_SOFT};">&mdash; The Merit pharmacy team</p>
    `,
  },
];

// ── Registry ──────────────────────────────────────────────────────────────
export const SEQUENCES: Record<EmailPhase, EmailDefinition[]> = {
  PROSPECT,
  ONBOARDING,
  RETENTION,
};

/** Flat list for iteration / dashboard preview. */
export const ALL_EMAILS: EmailDefinition[] = [...PROSPECT, ...ONBOARDING, ...RETENTION];

/** Look up a single email by key (for resend / preview). */
export function getEmail(key: string): EmailDefinition | null {
  return ALL_EMAILS.find((e) => e.key === key) ?? null;
}
