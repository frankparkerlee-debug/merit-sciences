import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/admin-session';
import { AdminSidebar } from './AdminSidebar';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  if (!admin) {
    redirect('/admin/login');
  }

  return (
    <div className="min-h-screen bg-cream">
      <AdminSidebar adminEmail={admin.email} />
      {/* Offset for the fixed desktop sidebar; on mobile the sidebar is a
          sticky top bar + drawer, so no offset needed there. */}
      <div className="lg:pl-60">{children}</div>
    </div>
  );
}
