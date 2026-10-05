/**
 * POST /api/cart/refresh   { handles: string[] }
 *   →  { renamed: [{ from, handle, title, imageUrl }] }
 *
 * The browser cart persists each line's handle, name and thumbnail. After a
 * product is renamed, a cart saved earlier keeps showing the old name until it
 * asks. lib/cart.ts asks here once per session. The old-to-new mapping stays
 * server-side, so no retired name or handle is ever shipped in the bundle.
 */
import { NextResponse } from 'next/server';
import { refreshRenamedLines } from '@/lib/handle-aliases';

export async function POST(req: Request) {
  let handles: string[] = [];
  try {
    const body = await req.json();
    if (Array.isArray(body?.handles)) {
      handles = body.handles
        .filter((h: unknown): h is string => typeof h === 'string' && h.length > 0 && h.length <= 120)
        .slice(0, 50);
    }
  } catch {
    return NextResponse.json({ renamed: [] }, { status: 400 });
  }
  if (handles.length === 0) return NextResponse.json({ renamed: [] });

  try {
    const refreshed = await refreshRenamedLines(
      handles.map((handle) => ({ handle, title: '', imageUrl: undefined as string | undefined })),
    );
    const renamed = refreshed
      .map((l, i) => ({ from: handles[i], handle: l.handle, title: l.title, imageUrl: l.imageUrl }))
      .filter((r) => r.handle !== r.from);
    return NextResponse.json({ renamed });
  } catch (err) {
    console.error('[cart/refresh] failed', err);
    return NextResponse.json({ renamed: [] });
  }
}
