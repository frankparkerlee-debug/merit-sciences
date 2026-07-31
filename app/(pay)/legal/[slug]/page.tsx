import { notFound } from 'next/navigation';
import { PaymentShellHeader, PaymentShellFooter } from '@/components/PaymentShell';

/**
 * Minimal policies for the PAYMENT domain.
 *
 * Deliberately NOT the storefront policies. Those are written for the catalog
 * and describe the business in detail — sealed vials, lyophilized product,
 * dose and vial counts, lot numbers, facility classification, research-use
 * essays. Publishing that here would re-expose the entire product category on
 * the one surface this domain exists to keep clean.
 *
 * What a payment surface actually needs is narrower: card network rules require
 * that a checkout make refund/return, delivery, privacy and terms reachable,
 * plus a contact method. That's the whole bar. It says nothing about product
 * detail — so there is none here.
 *
 * Kept short on purpose: every extra sentence is disclosure with no upside.
 * The full policies remain on the storefront, where the detail belongs and
 * where the buyer sees them before ordering.
 */

function contactEmail(): string {
  return (
    process.env.CHECKOUT_SUPPORT_EMAIL?.trim() ||
    process.env.SUPPORT_EMAIL?.trim() ||
    'rx@meritsciences.com'
  );
}

type Section = { h?: string; p: string[] };
type Policy = { title: string; subtitle: string; sections: Section[] };

function policies(email: string): Record<string, Policy> {
  return {
    returns: {
      title: 'Refunds & Returns',
      subtitle: 'How refunds are handled.',
      sections: [
        {
          p: [
            'If your order arrives damaged, incorrect, incomplete, or does not arrive at all, contact us within 7 days of the delivery date shown by the carrier and we will replace it or refund it at no cost to you.',
          ],
        },
        {
          h: 'How refunds are issued',
          p: [
            'Approved refunds go back to the original payment method used at checkout. Refunds typically post within 3–10 business days depending on your bank or card issuer. We email a confirmation as soon as the refund is initiated.',
            'Partial refunds are issued where only part of an order qualifies.',
          ],
        },
        {
          h: 'What is not eligible',
          p: [
            'Items that have been opened or used, requests made more than 7 days after delivery, returns sent without prior authorization, and orders undeliverable due to an incorrect address provided at checkout.',
          ],
        },
        {
          h: 'Cancellations',
          p: [
            'Orders can be cancelled for a full refund any time before they are packed. Once an order has shipped it cannot be cancelled.',
          ],
        },
        { h: 'Contact', p: [`Email ${email} from the address on the order.`] },
      ],
    },
    shipping: {
      title: 'Shipping',
      subtitle: 'Delivery timelines and coverage.',
      sections: [
        {
          p: [
            'Orders ship within 48 hours on business days from the United States. We ship within the United States only, and cannot ship to PO boxes, freight forwarders, or APO/FPO addresses.',
          ],
        },
        {
          h: 'Tracking',
          p: [
            'A tracking number is emailed as soon as the carrier scans your parcel. Transit is typically 2–5 business days.',
          ],
        },
        {
          h: 'Problems with delivery',
          p: [
            `If tracking shows delivered and you did not receive the parcel, or delivery stalls for more than 7 days, email ${email} and we will open a carrier claim and make it right.`,
          ],
        },
      ],
    },
    privacy: {
      title: 'Privacy',
      subtitle: 'What we collect at checkout, and why.',
      sections: [
        {
          p: [
            'This page collects only what is required to process and deliver an order: your name, email address, phone number, and shipping address.',
          ],
        },
        {
          h: 'Payment information',
          p: [
            'Card details are entered into fields hosted and encrypted by PayPal. They are transmitted directly to PayPal and are never seen, processed, or stored by us. PayPal’s handling of that data is governed by their privacy notice.',
          ],
        },
        {
          h: 'How your information is used',
          p: [
            'Order details are used to process payment, fulfil and ship the order, and provide support. We share information with our payment processor and shipping carrier only as needed to complete your order. We do not sell personal information.',
          ],
        },
        {
          h: 'Your choices',
          p: [
            `Email ${email} to request a copy of the information we hold about you, or to ask us to delete it, subject to records we are required to retain.`,
          ],
        },
      ],
    },
    terms: {
      title: 'Terms',
      subtitle: 'The terms that apply to orders placed here.',
      sections: [
        {
          p: [
            'These terms apply to orders placed through this checkout, which is operated by Merit Sciences. Placing an order means you accept them.',
          ],
        },
        {
          h: 'Eligibility',
          p: [
            'You must be at least 18 years old and located in the United States. Products are supplied for laboratory research use only — not for human or veterinary use, and not for diagnostic or therapeutic use. You confirm this when you place your order.',
          ],
        },
        {
          h: 'Payment',
          p: [
            'Prices are in US dollars. Submitting an order authorizes the total shown, including shipping, to be charged to the payment method you provide. Orders may be declined or cancelled with a full refund if they cannot be fulfilled or fail verification.',
          ],
        },
        {
          h: 'Refunds and delivery',
          p: [
            'Refund and delivery terms are set out in the Refunds & Returns and Shipping policies, which form part of these terms.',
          ],
        },
        {
          h: 'Liability',
          p: [
            'To the fullest extent permitted by law, our liability for any order is limited to the amount paid for that order.',
          ],
        },
        {
          h: 'Governing law & contact',
          p: [
            `These terms are governed by the laws of the State of Texas. Questions: ${email}.`,
          ],
        },
      ],
    },
  };
}

export function generateStaticParams() {
  return ['returns', 'shipping', 'privacy', 'terms'].map((slug) => ({ slug }));
}

export const metadata = {
  robots: { index: false, follow: false, nocache: true },
  alternates: { canonical: null },
  keywords: null,
  openGraph: null,
  twitter: null,
};

export default function PayLegalPage({ params }: { params: { slug: string } }) {
  const policy = policies(contactEmail())[params.slug];
  if (!policy) notFound();

  return (
    <>
      <PaymentShellHeader />
      <article className="max-w-[680px] mx-auto px-5 sm:px-6 lg:px-8 py-12">
        <h1
          className="font-display font-black text-ink tracking-[-0.035em] leading-[1.02] mb-2"
          style={{ fontSize: 'clamp(26px,4vw,36px)' }}
        >
          {policy.title}
        </h1>
        <p className="text-base text-ink-soft leading-relaxed mb-10">{policy.subtitle}</p>

        {policy.sections.map((s, i) => (
          <section key={i} className="mb-7">
            {s.h && (
              <h2 className="font-display font-bold text-ink text-[17px] mb-2">{s.h}</h2>
            )}
            {s.p.map((text, j) => (
              <p key={j} className="text-[14.5px] text-ink-soft leading-relaxed mb-2">
                {text}
              </p>
            ))}
          </section>
        ))}
      </article>
      <PaymentShellFooter />
    </>
  );
}
