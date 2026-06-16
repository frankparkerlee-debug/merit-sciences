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
        </div>
        <div className="flex items-center gap-4">
          <CartIcon />
        </div>
      </div>
    </nav>
  );
}
