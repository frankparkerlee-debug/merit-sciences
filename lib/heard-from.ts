/**
 * "How did you first hear about Merit?" on the order confirmation page.
 * Shared by the picker, the API route and the channel report so the stored
 * value, the button and the report row can never drift apart.
 */
export const HEARD_FROM = [
  { value: 'google', label: 'Google search', channel: 'Google search (said)' },
  { value: 'ai', label: 'ChatGPT or another AI', channel: 'ChatGPT and AI (said)' },
  { value: 'friend', label: 'A friend or family member', channel: 'Word of mouth (said)' },
  { value: 'practitioner', label: 'My doctor or clinic', channel: 'Practitioner referral (said)' },
  { value: 'instagram', label: 'Instagram', channel: 'Instagram (said)' },
  { value: 'tiktok', label: 'TikTok', channel: 'TikTok (said)' },
  { value: 'reddit', label: 'Reddit', channel: 'Reddit (said)' },
  { value: 'youtube', label: 'YouTube or a podcast', channel: 'YouTube or podcast (said)' },
  { value: 'other', label: 'Something else', channel: 'Other (said)' },
] as const;

export type HeardFromValue = (typeof HEARD_FROM)[number]['value'];

export function isHeardFrom(v: unknown): v is HeardFromValue {
  return typeof v === 'string' && HEARD_FROM.some((o) => o.value === v);
}

export function heardFromChannel(v: string | null | undefined): string | null {
  return HEARD_FROM.find((o) => o.value === v)?.channel ?? null;
}
