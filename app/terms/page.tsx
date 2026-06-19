import { readFileSync } from 'fs';
import { join } from 'path';
import { PolicyLayout } from '@/components/PolicyLayout';

export const metadata = {
  title: 'Terms of Service',
  description:
    'Merit Sciences Terms of Service. Conditions of purchase, acceptable use, intellectual property, limitation of liability, and governing law.',
};

export default function TermsPage() {
  const html = readFileSync(
    join(process.cwd(), 'content/policies/terms.html'),
    'utf-8',
  );
  return (
    <PolicyLayout
      title="Terms of Service"
      subtitle="The conditions under which Merit Sciences offers research compounds."
      lastUpdated="June 17, 2026"
    >
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </PolicyLayout>
  );
}
