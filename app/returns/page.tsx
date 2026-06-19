import { readFileSync } from 'fs';
import { join } from 'path';
import { PolicyLayout } from '@/components/PolicyLayout';

export const metadata = {
  title: 'Returns & Refunds',
  description:
    'Merit Sciences returns and refund policy. How to request a refund, replacement criteria, and conditions for returning research compounds.',
};

export default function ReturnsPage() {
  const html = readFileSync(
    join(process.cwd(), 'content/policies/returns.html'),
    'utf-8',
  );
  return (
    <PolicyLayout
      title="Returns & Refunds"
      subtitle="Our refund and replacement policy for research compounds."
      lastUpdated="June 17, 2026"
    >
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </PolicyLayout>
  );
}
