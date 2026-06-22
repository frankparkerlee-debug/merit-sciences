import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { RecoverCart } from './RecoverCart';
import type { CartLine } from '@/lib/cart';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Restoring your cart… — Merit Sciences',
  robots: { index: false, follow: false },
};

type Props = { params: { token: string } };

/**
 * One-click "return to your cart" landing for the recovery email. Looks up
 * the saved cart by its opaque token, then hands off to a client component
 * that rehydrates the (localStorage) cart, re-seeds the referral cookie so
 * the discount + attribution come back, and bounces to /checkout. Works
 * cross-device because the cart lives in the DB, not just the browser.
 */
export default async function RecoverPage({ params }: Props) {
  const token = params.token?.trim();
  if (!token) notFound();

  const cart = await prisma.abandonedCart
    .findUnique({
      where: { recoverToken: token },
      select: { lines: true, referralSlug: true },
    })
    .catch(() => null);

  if (!cart) notFound();

  return (
    <RecoverCart lines={(cart.lines as unknown as CartLine[]) ?? []} referralSlug={cart.referralSlug} />
  );
}
