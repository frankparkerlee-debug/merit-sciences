'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CartIcon } from './CartIcon';

export function Nav() {
  // Routes rendered on the near-black ground: the homepage's full-bleed hero
  // and the lab-results surfaces. A white bar across the top of those cuts
  // the page in half, so the nav goes dark to match. Everything else —
  // catalog, PDPs, library, policies — is light, and keeps the white bar.
  // Keep this list in sync with any page whose <main> is bg-black.
  const pathname = usePathname();
  const onHome = pathname === '/' || pathname === '/coa' || pathname.startsWith('/coa/');

  return (
    <nav
      className={
        onHome
          ? 'sticky top-0 z-40 bg-black/70 backdrop-blur-md border-b border-white/10 text-white'
          : 'sticky top-0 z-40 bg-white border-b border-border-soft'
      }
    >
      <div className="max-w-container mx-auto flex items-center justify-between px-6 sm:px-8 py-3.5">
        <Link href="/" className="font-display text-xl font-bold tracking-tight">
          Merit<span className={onHome ? 'text-cobalt-soft' : 'text-cobalt'}>.</span>
        </Link>
        <div
          className={`hidden md:flex gap-6 text-sm font-medium ${
            onHome ? 'text-white/75' : ''
          }`}
        >
          <Link href="/catalog" className="hover:text-cobalt transition">Catalog</Link>
          <Link href="/coa" className="hover:text-cobalt transition">COA</Link>
          <Link href="/library" className="hover:text-cobalt transition">Library</Link>
          <Link href="/practitioners" className="hover:text-cobalt transition">Practitioner Program</Link>
          <Link href="/about" className="hover:text-cobalt transition">About</Link>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/practitioners/login"
            className={`hidden sm:inline-flex text-[11px] tracking-[0.12em] uppercase font-bold hover:text-cobalt transition ${
              onHome ? 'text-white/70' : 'text-ink-soft'
            }`}
          >
            Sign in
          </Link>
          <CartIcon />
        </div>
      </div>
    </nav>
  );
}
