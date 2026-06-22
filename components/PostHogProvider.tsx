'use client';

import { useEffect, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';

// Set these in Render → Environment. NEXT_PUBLIC_ so they reach the browser.
// Until the key is set, the provider no-ops and the storefront is unaffected.
const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

if (typeof window !== 'undefined' && KEY) {
  posthog.init(KEY, {
    api_host: HOST,
    capture_pageview: false, // captured manually below (App Router SPA nav)
    capture_pageleave: true,
    autocapture: true, // clicks/inputs/behavior, no manual instrumentation
    person_profiles: 'identified_only', // cheaper — only profile known users
  });
}

/**
 * App-wide PostHog: autocapture (clicks/behavior) + manual pageviews on
 * route change (App Router doesn't fire pageviews on client navigation).
 * Renders children untouched when NEXT_PUBLIC_POSTHOG_KEY is unset, so the
 * site runs fine before analytics is configured.
 */
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  if (!KEY) return <>{children}</>;
  return (
    <PHProvider client={posthog}>
      <Suspense fallback={null}>
        <PageViewTracker />
      </Suspense>
      {children}
    </PHProvider>
  );
}

function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  useEffect(() => {
    if (!pathname) return;
    let url = window.location.origin + pathname;
    const qs = searchParams?.toString();
    if (qs) url += `?${qs}`;
    posthog.capture('$pageview', { $current_url: url });
  }, [pathname, searchParams]);
  return null;
}
