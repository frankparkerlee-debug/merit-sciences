/**
 * The self-segmentation email — the general-list activator (the hims
 * "Mood / Sex / Energy / Muscle" move, research-framed). One broadcast, four
 * one-click lanes; each tap enrolls the subscriber in that lane's compound
 * sequence (lib/sequence-journey) and lands them on the compound PDP.
 *
 * Fully RUO: lanes are research areas, not promises. The click IS the
 * engagement + the segmentation signal in one.
 */
import 'server-only';
import { wrapMarketingEmail, h, p, cta, quiet, heroImg } from './marketing-email-shell';

export type PickerLane = { label: string; sub: string; href: string };

export function renderInterestPicker(d: {
  lanes: PickerLane[];
  unsubscribeUrl: string;
}): { subject: string; html: string; text: string } {
  const subject = 'What are you researching? (one tap)';

  const laneButtons = d.lanes
    .map((l) => cta(`${l.label} — ${l.sub} →`, l.href))
    .join('');

  const html = wrapMarketingEmail({
    subject,
    eyebrow: 'Point us in a direction',
    bodyHtml:
      heroImg('/brand/hero-A-cluster.webp', 'The Merit Sciences research compound lineup') +
      h('What brought you to Merit?') +
      p('You&rsquo;re on the list because you care where compounds come from. Tell us which corner of the catalog you&rsquo;re actually here for, and we&rsquo;ll send you the real story on it — the approved-drug lineage, the published trials, and the lab receipts. One tap, no form:') +
      laneButtons +
      quiet(
        'Every tap just tells us what to send — nothing is ordered, nothing is charged. Research use only; not a treatment. Not the right fit? One-tap unsubscribe below.',
      ),
    unsubscribeUrl: d.unsubscribeUrl,
  });

  const text = `What brought you to Merit? Tap the area you're researching and we'll send you the real story — approved-drug lineage, published trials, lab receipts.

${d.lanes.map((l) => `• ${l.label} (${l.sub}): ${l.href}`).join('\n')}

Every tap just tells us what to send — nothing ordered, nothing charged. Research use only; not a treatment.
— Merit Sciences`;

  return { subject, html, text };
}
