'use server';

import { updateStoreSettings } from '@/lib/store-settings';
import { revalidatePath } from 'next/cache';

export async function saveStoreSettings(formData: FormData) {
  const raw = formData.get('freeShippingThreshold');
  const dollars = parseFloat(String(raw));
  if (isNaN(dollars) || dollars < 0) throw new Error('Invalid threshold');
  await updateStoreSettings({ freeShippingThreshold: Math.round(dollars * 100) });
  revalidatePath('/admin/settings');
}
