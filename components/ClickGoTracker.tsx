'use client';

import { useEffect } from 'react';
import { trackClickGoLanding } from '@/lib/clickgo';

/**
 * Ad vendor's click tracker (bhsclick.com ClickGo) on every page a visitor can
 * land on. Runs once per full page load; App Router navigations keep the
 * layout mounted, and the stored click id lasts 90 days. See lib/clickgo.ts.
 */
export function ClickGoTracker() {
  useEffect(() => {
    trackClickGoLanding();
  }, []);
  return null;
}
