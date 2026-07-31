'use server';

import { requireAdmin } from '@/lib/admin-session';
import { sendEmail } from '@/lib/email';
import { renderTemplate } from './render-template';
import type { TemplateKey } from './sample-data';

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
