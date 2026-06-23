import type { Metadata } from 'next';
import Image from 'next/image';
import { EnterButton } from './EnterButton';

/**
 * /access — clean-room ad gate for PAID traffic (Meta / TikTok).
 *
 * Compliance (see ChromeGate + funnel plan): NO compound names, prices,
 * add-to-cart, or vial imagery; NO catalog links except the verify CTA;
 * noindex; "compounds" vocabulary only.
 *
 * Design: Merit's editorial language — warm cream ground + a bold cobalt
 * form (the cobalt ink-bloom, a policy-safe abstract, NOT a product) +
 * monumental ink type. A premium single-screen "velvet-rope" doorway that
 * converts cold mobile traffic on one tap.
 */
export const metadata: Metadata = {
  title: 'Enter · Merit Sciences',
  description:
    'Independent third-party lab reports, published for every lot. Verify access to the research-grade catalog.',
  robots: { index: false, follow: false },
};

const TRUST = [
  'Independent third-party testing',
  'US-licensed pharmacy team',
  'Published lab report, every lot',
];

export default function AccessPage() {
  return (
    <div className="relative isolate flex min-h-[calc(100vh-2.5rem)] flex-col overflow-hidden bg-[#E8DBC4]">
      {/* Hero cobalt form — abstract ink-bloom (policy-safe). Its cream ground
          blends with the page so it reads as a floating editorial element.
          Desktop: bleeds off the right. Mobile: a smaller top-right accent. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-[18%] -top-[8%] z-0 aspect-square w-[78vw] max-w-[300px] sm:right-[-4%] sm:top-1/2 sm:w-[52vw] sm:max-w-[620px] sm:-translate-y-1/2"
        style={{
          maskImage:
            'radial-gradient(circle at 50% 47%, #000 66%, transparent 99%)',
          WebkitMaskImage:
            'radial-gradient(circle at 50% 47%, #000 66%, transparent 99%)',
        }}
      >
        <Image
          src="/editorial/cobalt-ink-bloom.png"
          alt=""
          fill
          priority
          sizes="(max-width: 768px) 78vw, 620px"
          className="object-contain"
        />
      </div>

      {/* Faint chromatogram baseline — the "we publish the data" signature */}
      <svg
        aria-hidden
        viewBox="0 0 1440 120"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-x-0 bottom-[76px] z-0 h-[16vh] w-full opacity-[0.10]"
      >
        <path
          d="M0,100 L320,100 L356,94 L384,40 L412,94 L452,100 L720,100 L760,90 L788,52 L816,90 L860,100 L1120,100 L1160,86 L1188,30 L1216,86 L1256,100 L1440,100"
          fill="none"
          stroke="#2E4DDB"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>

      <div className="relative z-10 mx-auto flex w-full max-w-[1100px] flex-1 flex-col justify-center px-6 py-16 lg:px-10">
        <p className="mb-7 font-mono text-[11px] font-semibold uppercase tracking-[0.26em] text-cobalt">
          Merit Sciences · Verified per lot
        </p>

        <h1
          className="max-w-[10ch] font-display font-black leading-[0.9] tracking-[-0.035em] text-ink"
          style={{ fontSize: 'clamp(46px, 10vw, 100px)' }}
        >
          Verified.
          <br />
          Published.
          <br />
          Every lot.
        </h1>

        <p className="mt-8 max-w-md text-lg leading-relaxed text-ink-soft sm:text-xl">
          Independent third-party HPLC, mass spec, and endotoxin — the full lab
          report, on every lot. Not a sticker on a label. The receipts.
        </p>

        <div className="mt-10">
          <EnterButton href="/" />
          <p className="mt-4 max-w-md text-xs leading-relaxed text-ink-muted">
            For research use only. By entering, you confirm you are a qualified
            researcher or laboratory.
          </p>
        </div>
      </div>

      {/* Trust row */}
      <div className="relative z-10 border-t border-black/10 bg-[#E8DBC4]/85 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-3 px-6 py-5 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted sm:flex-row sm:items-center sm:gap-8 lg:px-10">
          {TRUST.map((t) => (
            <span key={t} className="flex items-center gap-2">
              <span aria-hidden className="h-1 w-1 rounded-full bg-cobalt" />
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
