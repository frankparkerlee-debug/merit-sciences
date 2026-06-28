import Link from 'next/link';
import { CartIcon } from './CartIcon';

export function Nav() {
  return (
    <nav className="sticky top-0 z-40 bg-white border-b border-border-soft">
      <div className="max-w-container mx-auto flex items-center justify-between px-6 sm:px-8 py-3.5">
        <Link href="/" className="font-display text-xl font-bold tracking-tight">
          Merit<span className="text-cobalt">.</span>
        </Link>
        <div className="hidden md:flex gap-6 text-sm font-medium">
          <Link href="/catalog" className="hover:text-cobalt transition">Catalog</Link>
          <Link href="/catalog#blends" className="hover:text-cobalt transition">Blends</Link>
          <Link href="/about" className="hover:text-cobalt transition">About</Link>
          <Link href="/practitioners" className="hover:text-cobalt transition">Practitioner Program</Link>
          <Link
            href="/game"
            className="inline-flex items-center gap-1 font-semibold text-cobalt hover:text-cobalt-soft transition"
          >
            <span aria-hidden>🎮</span> Game
          </Link>
        </div>
        <div className="flex items-center gap-4">
          {/* Compact game entry for mobile (desktop uses the text link above). */}
          <Link
            href="/game"
            aria-label="Play Peptide Tycoon"
            className="md:hidden text-lg leading-none"
          >
            🎮
          </Link>
          <Link
            href="/practitioners/login"
            className="hidden sm:inline-flex text-[11px] tracking-[0.12em] uppercase font-bold text-ink-soft hover:text-cobalt transition"
          >
            Sign in
          </Link>
          <CartIcon />
        </div>
      </div>
    </nav>
  );
}
