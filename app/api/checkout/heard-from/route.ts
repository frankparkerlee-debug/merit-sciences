/**
 * Saves the buyer's answer to "How did you first hear about Merit?" from the
 * confirmation page. The order reference is the same one the page itself was
 * loaded with (our order id or the processor id), and an answer is written
 * once: a second post for the same order is ignored, so the reference alone
 * can't be used to rewrite history.
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isHeardFrom } from '@/lib/heard-from';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
  const ref = typeof body?.ref === 'string' ? body.ref.slice(0, 120) : '';
  const answer = body?.answer;
  const detail = typeof body?.detail === 'string' ? body.detail.trim().slice(0, 200) || null : null;
  if (!ref || !isHeardFrom(answer)) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  try {
    const order = await prisma.order.findFirst({
      where: { OR: [{ id: ref }, { paypalOrderId: ref }] },
      select: { paypalOrderId: true },
    });
    if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const data = { heardFrom: answer, heardFromDetail: detail, heardFromAt: new Date() };
    const updated = await prisma.orderAttribution.updateMany({
      where: { paypalOrderId: order.paypalOrderId, heardFrom: null },
      data,
    });
    if (updated.count === 0) {
      const exists = await prisma.orderAttribution.findUnique({
        where: { paypalOrderId: order.paypalOrderId },
        select: { id: true },
      });
      if (!exists) {
        await prisma.orderAttribution.create({ data: { paypalOrderId: order.paypalOrderId, ...data } });
      }
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[heard-from] save failed', err);
    return NextResponse.json({ error: 'Could not save' }, { status: 500 });
  }
}
