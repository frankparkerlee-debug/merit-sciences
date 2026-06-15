import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-session';
import { renderTemplate } from '../../actions';
import type { TemplateKey } from '../../sample-data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Serves the rendered HTML of a single template for iframe preview.
 * Admin-gated — operators only. Sample data is used so we don't leak
 * any real customer info in previews.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ key: string }> }) {
  const admin = await requireAdmin();
  if (!admin) {
    return new NextResponse('Unauthorized', { status: 401 });
  }
  const { key } = await params;
  const rendered = renderTemplate(key as TemplateKey);
  if (!rendered) {
    return new NextResponse('Unknown template', { status: 404 });
  }
  return new NextResponse(rendered.html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      // Prevent caching so iframe always shows latest
      'Cache-Control': 'no-store',
    },
  });
}
