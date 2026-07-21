/**
 * The Lab Report — Merit's recurring broadcast franchise (the engagement
 * vehicle after the 24-day drip goes quiet). Every issue is an OFFER stack,
 * never an outcome claim:
 *
 *   · new lots posted since the last issue (list gets them before we promote)
 *   · running transparency stats (published count, mean purity)
 *   · a reply-to-vote hook ("which compound should we stock next?") — replies
 *     are the strongest deliverability signal there is
 *   · the shop CTA rides along with the ?code= auto-apply
 *
 * Rendered per-recipient (unsubscribe link is signed per email address).
 * Sent by /api/cron/lab-report — manually triggered, tag-deduped, batched.
 */
import 'server-only';
import { wrapMarketingEmail, h, p, cta, quiet, proof, SITE } from './marketing-email-shell';

export type LabReportLot = {
  compound: string;
  lotId: string;
  purity: string;
  testedDate?: string | null;
};

export type LabReportData = {
  issueLabel: string;            // e.g. "July 2026"
  lots: LabReportLot[];          // new lots this issue (may be empty)
  totalPublished: number;        // running library size
  meanPurity: string | null;     // e.g. "99.43%" — null hides the stat
  voteOptions: string[];         // [] hides the vote block
  code?: string;                 // optional promo to ride the CTAs
  unsubscribeUrl: string;
};

const VOTE_TO = 'rx@meritsciences.com';

function lotRows(lots: LabReportLot[]): string {
  return lots
    .slice(0, 8)
    .map(
      (l) =>
        `<strong>${l.compound}</strong> · lot ${l.lotId} · ${l.purity} HPLC${l.testedDate ? ` · tested ${l.testedDate}` : ''}`,
    )
    .join('<br>');
}

export function renderLabReport(d: LabReportData): { subject: string; html: string; text: string } {
  const withCode = (base: string) => (d.code ? `${base}?code=${encodeURIComponent(d.code)}` : base);
  const coaUrl = withCode(`${SITE}/coa`);
  const catalogUrl = withCode(`${SITE}/catalog`);

  const subject =
    d.lots.length > 0
      ? `The Lab Report — ${d.lots.length} new lot${d.lots.length === 1 ? '' : 's'} posted (${d.issueLabel})`
      : `The Lab Report — ${d.issueLabel}`;

  const voteBlock =
    d.voteOptions.length > 0
      ? p(
          `<strong>Your vote, our next stock.</strong> We're picking what joins the catalog next. Hit reply with one word — ${d.voteOptions
            .map(
              (o) =>
                `<a href="mailto:${VOTE_TO}?subject=${encodeURIComponent(`Vote: ${o}`)}" style="color:inherit;font-weight:700;">${o}</a>`,
            )
            .join(' · ')} — and we'll tally it in the next issue.`,
        )
      : '';

  const lotsBlock =
    d.lots.length > 0
      ? p('Fresh out of the lab and into the public library — you&rsquo;re seeing these before we promote them anywhere:') +
        proof(lotRows(d.lots))
      : p(
          'No new lots posted this cycle — which is its own kind of receipt: nothing ships until it clears HPLC, and nothing cleared early.',
        );

  const statsLine =
    d.meanPurity !== null
      ? quiet(
          `The running ledger: <strong>${d.totalPublished} lots published</strong> · mean purity <strong>${d.meanPurity}</strong> · and the ones that failed identity never shipped at all. Every number is checkable at ${coaUrl.replace('https://', '').split('?')[0]}.`,
        )
      : quiet(`The full library — every lot we&rsquo;ve ever shipped — is public at ${coaUrl.replace('https://', '').split('?')[0]}.`);

  const html = wrapMarketingEmail({
    subject,
    eyebrow: `The Lab Report · ${d.issueLabel}`,
    bodyHtml:
      h('The receipts, before anyone else sees them.') +
      lotsBlock +
      cta('Browse the new lab results →', coaUrl) +
      voteBlock +
      statsLine +
      p(
        `Need to restock? The catalog is a tap away${d.code ? ' — your code applies itself at checkout' : ''}.`,
      ) +
      cta('Shop the catalog →', catalogUrl),
    unsubscribeUrl: d.unsubscribeUrl,
  });

  const text = `THE LAB REPORT — ${d.issueLabel}

${
  d.lots.length > 0
    ? `New lots posted (you're seeing these first):\n${d.lots
        .slice(0, 8)
        .map((l) => `  · ${l.compound} — lot ${l.lotId} — ${l.purity} HPLC${l.testedDate ? ` — tested ${l.testedDate}` : ''}`)
        .join('\n')}`
    : 'No new lots this cycle — nothing ships until it clears HPLC, and nothing cleared early.'
}

Browse the lab results: ${coaUrl}
${d.voteOptions.length > 0 ? `\nVote on what we stock next — reply with one word: ${d.voteOptions.join(' / ')}\n` : ''}
${d.meanPurity !== null ? `The running ledger: ${d.totalPublished} lots published · mean purity ${d.meanPurity}.` : ''}

Restock: ${catalogUrl}${d.code ? ` (code ${d.code} applies automatically)` : ''}

— Merit Sciences`;

  return { subject, html, text };
}
