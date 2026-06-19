import { readFileSync } from 'fs';
import { join } from 'path';
import { PolicyLayout } from '@/components/PolicyLayout';

export const metadata = {
  title: 'Shipping Policy',
  description:
    'How Merit Sciences ships research compounds: dispatch timing, carriers, tracking, packaging, and lost/damaged shipment procedure. Ships from Dallas, TX.',
};

export default function ShippingPage() {
  const html = readFileSync(
    join(process.cwd(), 'content/policies/shipping.html'),
    'utf-8',
  );
  return (
    <PolicyLayout
      title="Shipping"
      subtitle="How orders move from our 503B facility in Dallas to your lab."
      lastUpdated="June 17, 2026"
    >
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </PolicyLayout>
  );
}
