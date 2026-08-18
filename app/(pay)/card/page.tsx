import { CardSetup } from './CardSetup';

export const metadata = {
  title: { absolute: 'Save a card — Merit Sciences' },
  robots: { index: false, follow: false, nocache: true },
};
export const dynamic = 'force-dynamic';

/**
 * Card capture for practitioner accounts, on the CHECKOUT origin.
 *
 * It lives here rather than in the portal because Stripe must never see the
 * storefront domain. The practice arrives with a short-lived signed grant in
 * the URL, which is the only thing identifying them on this origin.
 */
export default function PractitionerCardPage({
  searchParams,
}: {
  searchParams: { t?: string };
}) {
  return <CardSetup token={searchParams.t ?? ''} />;
}
