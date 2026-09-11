import Image from 'next/image';
import Link from 'next/link';

export const metadata = {
  title: 'Page not found',
  robots: { index: false, follow: true },
};

const LIME = '#B9FF66';

/**
 * Storefront 404. Same scene as the homepage hero (the defocused vial wall and
 * its scrim) so a dead link still lands somewhere that feels like Merit, and a
 * two-line poster headline in the "Same stack. Better source." cadence.
 *
 * Deliberately generic: NO "did you mean" product suggestions derived from the
 * URL. Orphaned handles 404 here on purpose (see lib/handle-aliases.ts) to
 * sever an old name from a product, and suggesting the product that used to
 * live at that URL would rebuild exactly the link the orphaning removed.
 *
 * The checkout domain never reaches this page: middleware answers its unknown
 * paths with a bare noindexed 404, because that host must not name or link to
 * the store.
 */
export default function NotFound() {
  return (
    <section className="relative isolate flex min-h-[78svh] items-end overflow-hidden bg-[#08090A] text-white">
      <Image
        src="/brand/pattern-vials-dof.webp"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover opacity-70"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(90deg, rgba(8,9,10,0.9) 0%, rgba(8,9,10,0.66) 42%, rgba(8,9,10,0.32) 72%, rgba(8,9,10,0.4) 100%), linear-gradient(180deg, rgba(8,9,10,0.55) 0%, rgba(8,9,10,0.1) 38%, rgba(8,9,10,0.92) 100%)',
        }}
      />

      <div className="relative z-10 w-full max-w-[1400px] mx-auto px-6 lg:px-12 pb-16 lg:pb-20">
        <p className="font-mono text-[11px] lg:text-[12px] tracking-[0.16em] uppercase mb-5" style={{ color: LIME }}>
          404 · Page not found
        </p>
        <h1
          className="font-poster font-black uppercase leading-[0.84] tracking-[-0.05em]"
          style={{ fontSize: 'clamp(42px, 7.2vw, 116px)' }}
        >
          Wrong shelf.
          <br />
          <span className="text-transparent" style={{ WebkitTextStroke: '2px rgba(255,255,255,0.6)' }}>
            Right store.
          </span>
        </h1>

        <div className="mt-9 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
          <p className="max-w-[46ch] text-[15px] leading-[1.62] text-white/70">
            This page has moved or never existed. Everything we carry is in the catalog, and every
            lot we have released has its lab report on file.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            <Link
              href="/catalog"
              className="bg-white text-black px-9 py-4 text-center text-[12px] font-poster font-black tracking-[0.16em] uppercase hover:bg-[#B9FF66] hover:text-black transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B9FF66]"
            >
              Browse the catalog
            </Link>
            <Link
              href="/coa"
              className="border border-white/40 px-9 py-4 text-center text-[12px] font-poster font-black tracking-[0.16em] uppercase hover:bg-white hover:text-black transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Look up a lot
            </Link>
          </div>
        </div>

        <p className="mt-12 text-[12px] text-white/45">
          Or head back to the{' '}
          <Link href="/" className="underline underline-offset-4 hover:text-white">
            homepage
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
