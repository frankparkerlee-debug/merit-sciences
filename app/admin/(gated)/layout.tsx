import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requireAdmin } from '@/lib/admin-session';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  if (!admin) {
    redirect('/admin/login');
  }

  return (
    <div className="min-h-screen bg-cream">
      {/* Admin nav */}
      <div className="border-b border-cobalt/10 bg-white sticky top-0 z-10">
        <div className="max-w-[1280px] mx-auto px-5 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/admin/orders" className="font-display font-black text-ink text-base tracking-[-0.02em]">
              Merit Sciences <span className="text-cobalt">·</span> <span className="text-cobalt text-xs tracking-[0.2em] uppercase font-bold ml-1">Admin</span>
            </Link>
            <nav className="hidden sm:flex items-center gap-5 text-xs font-bold tracking-wider uppercase">
              <Link href="/admin/orders" className="text-ink-soft hover:text-ink transition">Orders</Link>
              <Link href="/admin/customers" className="text-ink-soft hover:text-ink transition">Customers</Link>
              <Link href="/admin/affiliates" className="text-ink-soft hover:text-ink transition">Affiliates</Link>
              <Link href="/admin/discounts" className="text-ink-soft hover:text-ink transition">Discounts</Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden sm:block text-[11px] text-ink-soft">{admin.email}</span>
            <form action="/auth/logout" method="POST">
              <button type="submit" className="text-xs font-bold tracking-wider uppercase text-ink-soft hover:text-ink transition">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </div>

      {children}
    </div>
  );
}
