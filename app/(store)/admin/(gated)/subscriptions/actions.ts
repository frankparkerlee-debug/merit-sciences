'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin-session';
import { applyAction, type ManageAction } from '@/lib/retail-subscriptions';

/** Skip, pause, resume or cancel a customer's subscription from the admin. */
export async function adminSubscriptionAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (!admin) return;
  const id = String(formData.get('id') ?? '');
  const action = String(formData.get('action') ?? '') as ManageAction;
  if (!id || !['skip', 'pause', 'resume', 'cancel'].includes(action)) return;
  await applyAction(id, action, 'admin');
  revalidatePath('/admin/subscriptions');
}
