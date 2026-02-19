import type { Metadata } from 'next';
import { generateSoftwareApplicationSchema, generateWebPageSchema } from '@/lib/utils/structured-data';
import LandingPageClient from '@/components/landing/LandingPageClient';
import { getURL } from '@/lib/utils/get-url';

export const metadata: Metadata = {
  title: 'Javelina — DNS that just works',
  description:
    'Manage DNS zones, records, and organizations with speed and security. 30 global PoPs, sub-50ms propagation, 99.99% SLA.',
  openGraph: {
    title: 'Javelina — DNS that just works',
    description: 'Built for teams that need speed, security, and total control.',
    url: '/',
    siteName: 'Javelina DNS',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Javelina — DNS that just works',
    description: 'Built for teams that need speed, security, and total control.',
    images: ['/og-image.png'],
  },
  alternates: { canonical: '/' },
};

export default function HomePage() {
  const baseUrl = getURL();

  const softwareAppSchema = generateSoftwareApplicationSchema({
    name: 'Javelina DNS',
    description:
      'A modern DNS management platform for teams. Manage zones, records, and infrastructure with sub-50ms propagation and 99.99% uptime SLA.',
    applicationCategory: 'NetworkingApplication',
    features: [
      'Real-time DNS propagation',
      'Role-based access control',
      'Multi-organization management',
      'Full audit logging',
      'Bulk record operations',
      'Zone health monitoring',
      '10 DNS record types supported',
      'Team workspaces',
      '30 global Points of Presence',
      'Sub-50ms propagation',
      '99.99% uptime SLA',
    ],
  });

  const webPageSchema = generateWebPageSchema({
    name: 'Javelina — DNS that just works',
    description:
      'Manage DNS zones, records, and organizations with speed and security. 30 global PoPs, sub-50ms propagation, 99.99% SLA.',
    url: baseUrl,
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }}
      />
      <LandingPageClient />
    </>
  );
}
