import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { PackingSlipDoc, type SlipData } from '../PackingSlipDoc';
import { PrintButton } from './PrintButton';

export const metadata = { title: 'Packing slip — Merit Admin' };
export const dynamic = 'force-dynamic';

export default async function PackingSlipPage({ params }: { params: { id: string } }) {
  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: { lines: true },
  });
  if (!order) notFound();

  const d: SlipData = {
    orderRef: order.paypalOrderId,
    orderDate: order.createdAt.toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    }),
    shipTo: {
      name: order.shippingFullName,
      line1: order.shippingLine1,
      line2: order.shippingLine2,
      city: order.shippingCity,
      state: order.shippingState,
      zip: order.shippingZip,
    },
    lines: order.lines.map((l) => ({
      title: l.title,
      bundleLabel: l.bundleLabel,
      qty: l.qty,
      unitCents: Number(l.unitCents),
      components: l.components,
    })),
    subtotalCents: Number(order.subtotalCents),
    discountCents: Number(order.discountCents),
    discountCode: order.discountCode,
    shippingCents: Number(order.shippingCents),
    totalCents: Number(order.totalCents),
  };

  return (
    <main className="max-w-[860px] mx-auto px-5 sm:px-6 py-8">
      {/* Screen chrome only — the slip's own print CSS hides everything else. */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <Link
          href={`/admin/orders/${order.id}`}
          className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold hover:underline underline-offset-4"
        >
          ← Back to order
        </Link>
        <PrintButton />
      </div>
      <div className="bg-white rounded-2xl border border-cobalt/15 p-8 print:border-0 print:p-0 print:rounded-none">
        <PackingSlipDoc d={d} />
      </div>
    </main>
  );
}
