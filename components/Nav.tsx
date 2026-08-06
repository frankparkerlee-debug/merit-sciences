import Link from 'next/link';
import { CartIcon } from './CartIcon';

/**
 * Always dark, on every route. It used to switch on pathname to sit inside
 * the homepage's black hero; now that the pages themselves are light, a
 * constant black bar is both simpler and better — it reads as a masthead
 * against white content and still sits correctly over the dark hero
 * photography. No pathname dependency, so this stays a server component.
 */
export function Nav() {
  return (
    <nav className="sticky top-0 z-40 bg-ink text-white border-b border-white/10">
      <div className="max-w-container mx-auto flex items-center justify-between px-6 sm:px-8 py-3.5">
        <Link href="/" className="font-display text-xl font-bold tracking-tight">
          Merit<span className="text-cobalt-soft">.</span>
        </Link>
        <div className="hidden md:flex gap-6 text-sm font-medium text-white/75">
          <Link href="/catalog" className="hover:text-white transition">Catalog</Link>
          <Link href="/coa" className="hover:text-white transition">COA</Link>
          <Link href="/library" className="hover:text-white transition">Library</Link>
          <Link href="/practitioners" className="hover:text-white transition">Practitioner Program</Link>
          <Link href="/about" className="hover:text-white transition">About</Link>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/practitioners/login"
            className="hidden sm:inline-flex text-[11px] tracking-[0.12em] uppercase font-bold text-white/70 hover:text-white transition"
          >
            Sign in
          </Link>
          <CartIcon />
        </div>
      </div>
    </nav>
  );
}
