/**
 * Sync helper to render any template by key with its sample data.
 * Kept OUT of actions.ts because Next.js requires every export from a
 * 'use server' module to be async — and we want this helper callable
 * from server components + route handlers, where async-only would be
 * needlessly awkward.
 */

import {
  renderOrderConfirmation,
  renderShipmentNotification,
  renderOrderLookupLink,
  renderRefundIssued,
  renderOrderCanceled,
  renderAbandonedCart,
  renderWelcome,
  renderPostDeliveryFollowUp,
} from '@/lib/email-templates';
import {
  renderProspectWelcome,
  renderProspectProof,
  renderProspectTelegram,
  renderProspectSourcing,
  renderProspectVetting,
  renderProspectShipping,
  renderProspectReengage,
  renderProspectSocialProof,
  renderProspectLastCall,
} from '@/lib/prospect-emails';
import { renderReplenishment, renderWinBack } from '@/lib/customer-emails';
import { renderLabReport } from '@/lib/lab-report-email';
import { renderInterestPicker } from '@/lib/interest-picker-email';
import { resolveSequenceBeat } from '@/lib/sequences-registry';
import { sampleDataFor, type TemplateKey } from './sample-data';

export function renderTemplate(key: TemplateKey): { subject: string; html: string; text: string } | null {
  const data = sampleDataFor(key);
  switch (key) {
    case 'order_confirmation':
      return renderOrderConfirmation(data as any);
    case 'shipment':
      return renderShipmentNotification(data as any);
    case 'order_lookup':
      return renderOrderLookupLink(data as any);
    case 'refund_full':
    case 'refund_partial':
      return renderRefundIssued(data as any);
    case 'order_canceled':
      return renderOrderCanceled(data as any);
    case 'abandoned_cart':
      return renderAbandonedCart(data as any);
    case 'welcome':
      return renderWelcome(data as any);
    case 'post_delivery':
      return renderPostDeliveryFollowUp(data as any);
    case 'prospect_welcome':
      return renderProspectWelcome(data as any);
    case 'prospect_proof':
      return renderProspectProof(data as any);
    case 'prospect_telegram':
      return renderProspectTelegram(data as any);
    case 'prospect_sourcing':
      return renderProspectSourcing(data as any);
    case 'prospect_vetting':
      return renderProspectVetting(data as any);
    case 'prospect_shipping':
      return renderProspectShipping(data as any);
    case 'prospect_reengage':
      return renderProspectReengage(data as any);
    case 'prospect_social_proof':
      return renderProspectSocialProof(data as any);
    case 'prospect_last_call':
      return renderProspectLastCall(data as any);
    // ── Customer lifecycle + broadcasts
    case 'replenishment':
      return renderReplenishment(data as any);
    case 'winback':
      return renderWinBack(data as any);
    case 'lab_report':
      return renderLabReport(data as any);
    case 'interest_picker':
      return renderInterestPicker(data as any);
    // ── Compound sequences (approved-counterpart) — resolve via the registry
    case 'seq_tirzepatide_1':
      return resolveSequenceBeat('seq-ly3298176', 0, data as any);
    case 'seq_tirzepatide_2':
      return resolveSequenceBeat('seq-ly3298176', 1, data as any);
    case 'seq_tirzepatide_3':
      return resolveSequenceBeat('seq-ly3298176', 2, data as any);
    case 'seq_tirzepatide_4':
      return resolveSequenceBeat('seq-ly3298176', 3, data as any);
    case 'seq_sermorelin_2':
      return resolveSequenceBeat('seq-sermorelin', 1, data as any);
    // ── Category (mechanism-class) sequences
    case 'cat_cellular_1':
      return resolveSequenceBeat('cat-cellular', 0, data as any);
    case 'cat_cellular_2':
      return resolveSequenceBeat('cat-cellular', 1, data as any);
    case 'cat_cellular_3':
      return resolveSequenceBeat('cat-cellular', 2, data as any);
    case 'cat_cellular_4':
      return resolveSequenceBeat('cat-cellular', 3, data as any);
    default:
      return null;
  }
}
