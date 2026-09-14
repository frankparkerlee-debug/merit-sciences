'use client';

import { useEffect, useState } from 'react';

/**
 * Phone-only sticky bar that appears once the hero's own button has scrolled
 * out of view. Rendered unconditionally it sat on top of that button: two
 * identical calls to action 90px apart, with the card's last trust line
 * hidden under the bar.
 *
 * `sentinelId` is the hero button. While any of it is visible, the bar stays
 * hidden; the moment it leaves the viewport the bar slides up.
 */
export function StickyCta({ sentinelId, children }: { sentinelId: string; children: React.ReactNode }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const el = document.getElementById(sentinelId);
    if (!el || typeof IntersectionObserver === 'undefined') {
      setShow(true);
      return;
    }
    const io = new IntersectionObserver(([entry]) => setShow(!entry.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, [sentinelId]);

  return (
    <div
      aria-hidden={!show}
      className={
        'fixed inset-x-0 bottom-0 z-40 lg:hidden bg-white/95 backdrop-blur border-t border-border-soft p-3 pb-[max(12px,env(safe-area-inset-bottom))] transition-transform duration-300 motion-reduce:transition-none ' +
        (show ? 'translate-y-0' : 'translate-y-full pointer-events-none')
      }
    >
      {children}
    </div>
  );
}
