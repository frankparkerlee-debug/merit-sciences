'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

type Item = { label: string; href?: string; children?: { label: string; href: string }[] };
type Section = { section: string; items: Item[] };

// Single source of truth for the admin IA. Logically-associated pages are
// tucked under their parent (Payouts under Affiliates, the imports grouped).
const NAV: Section[] = [
  { section: 'Overview', items: [{ label: 'Analytics', href: '/admin/analytics' }] },
  {
    section: 'Commerce',
    items: [
      { label: 'Orders', href: '/admin/orders' },
      { label: 'Discounts', href: '/admin/discounts' },
      { label: 'Products', href: '/admin/products' },
    ],
  },
  {
    section: 'Audience',
    items: [
      { label: 'Customers', href: '/admin/customers' },
      { label: 'Newsletter', href: '/admin/newsletter' },
      {
        label: 'Affiliates',
        href: '/admin/affiliates',
        children: [{ label: 'Payouts', href: '/admin/affiliates/payouts' }],
      },
      { label: 'Practitioners', href: '/admin/practitioners' },
    ],
  },
  {
    section: 'Store',
    items: [{ label: 'Settings', href: '/admin/settings' }],
  },
  {
    section: 'Data',
    items: [
      {
        label: 'Import',
        children: [
          { label: 'Customers', href: '/admin/import/customers' },
          { label: 'Orders', href: '/admin/import/orders' },
          { label: 'Inventory', href: '/admin/import/inventory' },
        ],
      },
      { label: 'Email previews', href: '/admin/email-previews' },
    ],
  },
];

const ALL_HREFS: string[] = NAV.flatMap((s) =>
  s.items.flatMap((i) => [...(i.href ? [i.href] : []), ...(i.children?.map((c) => c.href) ?? [])]),
);

function itemClass(active: boolean, child = false) {
  const base = `block px-3 py-1.5 rounded-lg text-[13px] transition ${child ? 'font-medium' : 'font-bold'}`;
  return active ? `${base} bg-cobalt/10 text-cobalt` : `${base} text-ink-soft hover:text-ink hover:bg-cream`;
}

export function AdminSidebar({ adminEmail }: { adminEmail: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Longest matching href wins, so /admin/affiliates/payouts highlights
  // Payouts (not its Affiliates parent), and detail pages stay under their
  // section.
  const activeHref = ALL_HREFS
    .filter((h) => pathname === h || pathname.startsWith(`${h}/`))
    .sort((a, b) => b.length - a.length)[0];

  const brand = (
    <Link href="/admin/analytics" onClick={() => setOpen(false)} className="font-display font-black text-ink text-base tracking-[-0.02em]">
      Merit <span className="text-cobalt text-[10px] tracking-[0.2em] uppercase font-bold align-middle">Admin</span>
    </Link>
  );

  const nav = (
    <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
      {NAV.map((sec) => (
        <div key={sec.section}>
          <p className="px-3 mb-1.5 text-[10px] tracking-[0.18em] uppercase font-bold text-ink-soft/50">{sec.section}</p>
          <ul className="space-y-0.5">
            {sec.items.map((item) => (
              <li key={item.label}>
                {item.href ? (
                  <Link href={item.href} onClick={() => setOpen(false)} className={itemClass(item.href === activeHref)}>
                    {item.label}
                  </Link>
                ) : (
                  <p className="px-3 py-1.5 text-[13px] font-bold text-ink">{item.label}</p>
                )}
                {item.children && (
                  <ul className="ml-3 mt-0.5 space-y-0.5 border-l border-cobalt/10 pl-2">
                    {item.children.map((c) => (
                      <li key={c.label}>
                        <Link href={c.href} onClick={() => setOpen(false)} className={itemClass(c.href === activeHref, true)}>
                          {c.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );

  const footer = (
    <div className="border-t border-cobalt/10 px-4 py-3">
      <p className="text-[11px] text-ink-soft truncate mb-2">{adminEmail}</p>
      <div className="flex items-center justify-between">
        <Link href="/" className="text-[11px] font-bold tracking-wider uppercase text-ink-soft hover:text-ink transition">View site ↗</Link>
        <form action="/auth/logout" method="POST">
          <button type="submit" className="text-[11px] font-bold tracking-wider uppercase text-ink-soft hover:text-ink transition">Sign out</button>
        </form>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop: fixed sidebar */}
      <aside className="hidden lg:flex flex-col fixed inset-y-0 left-0 w-60 bg-white border-r border-cobalt/10 z-20">
        <div className="px-4 h-14 flex items-center border-b border-cobalt/10">{brand}</div>
        {nav}
        {footer}
      </aside>

      {/* Mobile: top bar + slide-in drawer */}
      <div className="lg:hidden sticky top-0 z-30 bg-white border-b border-cobalt/10 h-14 flex items-center justify-between px-4">
        {brand}
        <button type="button" onClick={() => setOpen(true)} aria-label="Open admin menu" className="w-9 h-9 flex items-center justify-center text-ink">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
        </button>
      </div>
      {open && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 bg-white flex flex-col shadow-2xl">
            <div className="px-4 h-14 flex items-center justify-between border-b border-cobalt/10">
              {brand}
              <button type="button" onClick={() => setOpen(false)} aria-label="Close menu" className="w-8 h-8 flex items-center justify-center text-ink-soft hover:text-ink">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            {nav}
            {footer}
          </aside>
        </div>
      )}
    </>
  );
}
