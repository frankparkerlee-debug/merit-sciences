import Link from 'next/link';

type Props = {
  title: string;
  subtitle?: string;
  lastUpdated?: string;
  children: React.ReactNode;
};

/**
 * Shared layout for all policy pages — Shipping, Returns, Terms, Privacy,
 * Research Disclosure. Editorial header + cream-tinted body container
 * with .merit-policy-prose typography (defined in globals.css).
 */
export function PolicyLayout({ title, subtitle, lastUpdated, children }: Props) {
  return (
    <main className="bg-cream min-h-screen">
      {/* Header */}
      <section className="bg-white border-b border-cobalt/10">
        {/* Thin cobalt accent strip — matches the cart drawer treatment */}
        <div className="h-1 bg-gradient-to-r from-cobalt via-[#5078FF] to-cobalt" />
        <div className="max-w-3xl mx-auto px-5 sm:px-6 lg:px-8 pt-8 lg:pt-12 pb-8 lg:pb-10">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-[11px] tracking-[0.22em] uppercase text-cobalt font-bold mb-4 hover:text-ink transition"
          >
            ← Merit Sciences
          </Link>
          <h1
            className="font-display font-black text-ink tracking-[-0.035em] leading-[0.95]"
            style={{ fontSize: 'clamp(28px, 4vw, 52px)' }}
          >
            {title}<span className="text-cobalt">.</span>
          </h1>
          {subtitle && (
            <p className="mt-3 text-sm sm:text-base text-ink-soft leading-relaxed max-w-2xl">
              {subtitle}
            </p>
          )}
          {lastUpdated && (
            <p className="mt-4 text-[10px] tracking-[0.22em] uppercase text-ink-muted font-bold">
              Last updated · {lastUpdated}
            </p>
          )}
        </div>
      </section>

      {/* Body */}
      <section>
        <div className="max-w-3xl mx-auto px-5 sm:px-6 lg:px-8 py-10 lg:py-14">
          <article className="merit-policy-prose">{children}</article>

          {/* Footer note */}
          <div className="mt-12 pt-8 border-t border-cobalt/10 text-[12px] text-ink-muted">
            Questions about this policy? Email{' '}
            <a
              href="mailto:info@meritpeptides.com"
              className="text-cobalt font-bold underline-offset-2 hover:underline"
            >
              info@meritpeptides.com
            </a>
            .
          </div>
        </div>
      </section>
    </main>
  );
}
