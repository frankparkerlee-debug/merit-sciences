import type { Metadata } from 'next';
import { EnterButton } from './EnterButton';

/**
 * /access — clean-room ad gate for PAID traffic (Meta / TikTok).
 *
 * Compliance: NO compound names, prices, vial imagery, or catalog links
 * except the single verify CTA; noindex; "compounds" vocabulary only.
 *
 * Design (per direction): bold, offer-led, immersive — the conversion energy
 * of a full-bleed cobalt takeover, but built flag-safe (no vials) and
 * fast-loading (one optimized form + CSS) so it actually delivers at scale.
 * Mechanism: offer + one-click hybrid — "20% off" hook, one tap into the
 * catalog (welcome code stashed for the site to apply). No email friction.
 */
export const metadata: Metadata = {
  title: 'Get 20% off · Merit Sciences',
  description:
    'American made, lab-verified. The opposite of a mystery source — third-party tested, shipped from Dallas. 20% off your first order.',
  robots: { index: false, follow: false },
};

// Inline film-grain (SVG turbulence) — adds editorial texture, no asset request.
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

export default function AccessPage() {
  return (
    <div className="relative isolate flex min-h-[calc(100vh-2.5rem)] flex-col items-center justify-center overflow-hidden bg-[#0A1240]">
      {/* Immersive cobalt field */}
      <div
        aria-hidden
        className="absolute inset-0 -z-30"
        style={{
          background:
            'radial-gradient(125% 90% at 50% -15%, #4763F0 0%, #2438B4 32%, #111B6E 60%, #060B33 90%)',
        }}
      />
      {/* Grain */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-[0.06] mix-blend-overlay"
        style={{ backgroundImage: GRAIN }}
      />
      {/* Chromatogram signature */}
      <svg
        aria-hidden
        viewBox="0 0 1440 120"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[18vh] w-full opacity-[0.14]"
      >
        <path
          d="M0,100 L320,100 L356,94 L384,40 L412,94 L452,100 L720,100 L760,90 L788,52 L816,90 L860,100 L1120,100 L1160,86 L1188,30 L1216,86 L1256,100 L1440,100"
          fill="none"
          stroke="#8FA6FF"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>

      {/* Centered offer card */}
      <div className="relative z-10 mx-auto flex w-full max-w-[640px] flex-col items-center px-6 py-16 text-center">
        <p className="mb-6 font-mono text-[11px] font-semibold uppercase tracking-[0.28em] text-cobalt-soft">
          American Made · Lab-Tested
        </p>

        <h1
          className="font-display font-black leading-[0.96] tracking-[-0.03em] text-cream"
          style={{ fontSize: 'clamp(36px, 7.2vw, 70px)' }}
        >
          You research everything.
          <br />
          Then you trusted{' '}
          <span className="whitespace-nowrap text-cream/45 line-through decoration-cobalt-soft decoration-[5px]">
            a group chat
          </span>
          .
          <br />
          <span className="text-cobalt-soft">Now it&apos;s lab-tested.</span>
        </h1>

        <p className="mt-7 max-w-lg text-lg leading-relaxed text-cream/70">
          Merit is American made and independently tested —
          shipped from Dallas in 48 hours. The opposite of a stranger and a Venmo.
        </p>

        <p className="mt-6 text-base font-semibold text-cream/90">
          Enter your email — unlock 20% off + instant access.
        </p>

        <div className="mt-5">
          <EnterButton href="/" label="Unlock &amp; enter" code="WELCOME20" />
        </div>

        <p className="mt-5 text-xs leading-relaxed text-cream/40">
          Your 20% code lands in your inbox instantly. For research use only —
          by entering you confirm you are a qualified researcher or laboratory.
        </p>
      </div>
    </div>
  );
}
