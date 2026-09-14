import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Class-name merge used by the vendored magic-ui components in components/ui. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
