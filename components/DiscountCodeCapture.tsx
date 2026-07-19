'use client';

import { useEffect } from 'react';

/**
 * Site-wide `?code=` capture — the low-friction bridge from email links to
 * checkout. An email CTA can point anywhere (`/catalog?code=WELCOME20`,
 * `/coa?code=...`) and the code rides along: we stash it in the SAME
 * localStorage slot the /access ad gate uses (`merit_welcome_code`), which
 * checkout already auto-applies silently as its highest-priority code. The
 * subscriber never types anything.
 *
 * Most-recent-promise-wins: a fresh `?code=` overwrites a stale stored code.
 * The param is stripped from the URL after capture so it doesn't linger in
 * copied/shared links. Invalid-looking codes are ignored (checkout would
 * reject them server-side anyway — this just avoids junk in storage).
 */

const CODE_RE = /^[A-Za-z0-9][A-Za-z0-9-]{2,23}$/;

export function DiscountCodeCapture() {
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const raw = url.searchParams.get('code');
      if (!raw) return;
      const code = raw.trim().toUpperCase();
      if (!CODE_RE.test(code)) return;
      localStorage.setItem('merit_welcome_code', code);
      url.searchParams.delete('code');
      window.history.replaceState(null, '', url.pathname + url.search + url.hash);
    } catch {
      /* private mode / malformed URL — nothing to do */
    }
  }, []);

  return null;
}
