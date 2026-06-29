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
  renderProspectSourcing,
  renderProspectVetting,
  renderProspectSocialProof,
  renderProspectLastCall,
} from '@/lib/prospect-emails';
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
    case 'prospect_sourcing':
      return renderProspectSourcing(data as any);
    case 'prospect_vetting':
      return renderProspectVetting(data as any);
    case 'prospect_social_proof':
      return renderProspectSocialProof(data as any);
    case 'prospect_last_call':
      return renderProspectLastCall(data as any);
    default:
      return null;
  }
}
