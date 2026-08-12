import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { requireAdmin } from '@/lib/admin-session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Serves the label-designer document to the /admin/labels iframe as a REAL
 * top-level-style document instead of iframe srcDoc. The tool is a 2,600-line
 * self-contained page (inline QR generator, inline scripts); embedding it via
 * srcDoc broke its buttons in production, and a served document restores the
 * exact conditions it was built and proofed under. Admin-gated like the page.
 */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const html = await fs.readFile(
    path.join(process.cwd(), 'app/(store)/admin/(gated)/labels/template.html'),
    'utf8',
  );
  return new NextResponse(html, {
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
  });
}
