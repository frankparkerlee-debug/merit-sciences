import { readFileSync } from 'fs';
import { join } from 'path';
import { PolicyLayout } from '@/components/PolicyLayout';

export const metadata = {
  title: 'Privacy Policy',
  description:
    'How Merit Sciences collects, uses, and protects personal information. Data we hold, who we share it with, and your rights as a customer.',
};

export default function PrivacyPage() {
  const html = readFileSync(
    join(process.cwd(), 'content/policies/privacy.html'),
    'utf-8',
  );
  return (
    <PolicyLayout
      title="Privacy Policy"
      subtitle="How we handle the personal information you provide when you order from us."
      lastUpdated="Jun 2026"
    >
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </PolicyLayout>
  );
}
