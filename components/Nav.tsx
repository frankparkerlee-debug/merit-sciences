import Link from 'next/link';

export function Nav() {
  return (
    <nav className="sticky top-0 z-40 bg-white border-b border-border-soft">
      <div className="max-w-container mx-auto flex items-center justify-between px-8 py-3.5">
        <Link href="/" className="font-display text-xl font-bold tracking-tight">
          Merit<span className="text-cobalt">.</span>
        </Link>
        <div className="hidden md:flex gap-6 text-sm font-medium">
          <Link href="/catalog">Catalog</Link>
          <Link href="/catalog#blends">Blends</Link>
          <Link href="/about">About</Link>
          <Link href="/clinic">For Clinics</Link>
        </div>
        <div className="flex items-center gap-4 text-ink-soft">
          <Link href="/cart" className="text-sm font-medium hover:text-ink">
            Cart
          </Link>
        </div>
      </div>
    </nav>
  );
}
