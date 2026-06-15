'use server';

import { requireAdmin } from '@/lib/admin-session';
import { sendEmail } from '@/lib/email';
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
import { sampleDataFor, type TemplateKey } from './sample-data';

export type ActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

/**
 * Send a test render of one template to the operator's own inbox. Useful
 * for iterating on copy/design without doing a full test order. The
 * "to" address is forced to the admin's own email so previews can't
 * accidentally spam real customers.
 */
export async function sendTestEmail(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: 'Unauthorized' };

  const key = String(formData.get('template') ?? '') as TemplateKey;
  if (!key) return { ok: false, error: 'Missing template key' };

  const rendered = renderTemplate(key);
  if (!rendered) return { ok: false, error: `Unknown template: ${key}` };

  const result = await sendEmail({
    to: admin.email,
    subject: `[TEST] ${rendered.subject}`,
    html: rendered.html,
    text: rendered.text,
    tags: [
      { name: 'type', value: 'preview_test' },
      { name: 'template', value: key },
    ],
  });

  if (!result.ok) {
    return { ok: false, error: `Send failed: ${result.error}` };
  }
  return { ok: true, message: `Sent to ${admin.email} (Resend id ${result.id})` };
}

/* ─── Internal: render any template by key with its sample data ─── */

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
    default:
      return null;
  }
}
