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
          <Link href="/coa" className="hover:text-cobalt transition">COA</Link>
          <Link href="/library" className="hover:text-cobalt transition">Library</Link>
          <Link href="/practitioners" className="hover:text-cobalt transition">Practitioner Program</Link>
          <Link href="/about" className="hover:text-cobalt transition">About</Link>
        </div>
        <div className="flex items-center gap-4">
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
