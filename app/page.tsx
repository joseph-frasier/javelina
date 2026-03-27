import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { generateSoftwareApplicationSchema, generateWebPageSchema } from '@/lib/utils/structured-data';
import LandingPageClient from '@/components/landing/LandingPageClient';
import { getURL } from '@/lib/utils/get-url';

export const metadata: Metadata = {
  title: 'Javelina Premium DNS, built on Anycast',
  description:
    'Premium DNS infrastructure powered by Anycast routing. 31 PoPs across 6 continents and 19 countries. Low-latency DNS resolution worldwide with zero-downtime failover.',
  openGraph: {
    title: 'Javelina Premium DNS, built on Anycast',
    description: 'Anycast routing across 31 global PoPs. Low-latency resolution, zero-downtime failover, DDoS resilience through architecture.',
    url: '/',
    siteName: 'Javelina DNS',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Javelina Premium DNS, built on Anycast',
    description: 'Anycast routing across 31 global PoPs. Low-latency resolution, zero-downtime failover, DDoS resilience through architecture.',
    images: ['/og-image.png'],
  },
  alternates: { canonical: '/' },
};

interface HomePageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;

  // Auth0 org invitation emails link to the Application Login URI (the app root).
  // Forward to the dedicated invite handoff route.
  if (typeof params.invitation === 'string' && typeof params.organization === 'string') {
    redirect(`/invite/accept?invitation=${encodeURIComponent(params.invitation)}&organization=${encodeURIComponent(params.organization)}`);
  }

  const baseUrl = getURL();

  const softwareAppSchema = generateSoftwareApplicationSchema({
    name: 'Javelina DNS',
    description:
      'Premium DNS infrastructure powered by Anycast routing. 31 PoPs across 6 continents and 19 countries with low-latency resolution and zero-downtime failover.',
    applicationCategory: 'NetworkingApplication',
    features: [
      'Anycast DNS routing via BGP',
      '31 global Points of Presence',
      '6 continents, 19 countries',
      'Low-latency DNS resolution worldwide',
      'Zero-downtime BGP-level failover',
      'Architectural DDoS resilience',
      'Single IP, 31 global nodes',
      'Local DNS resolution at every PoP',
      'No TTL-dependent failover delays',
      'Role-based access control',
      'Multi-organization management',
      'Full audit logging',
      'Built with Zig for predictable performance',
    ],
  });

  const webPageSchema = generateWebPageSchema({
    name: 'Javelina Premium DNS, built on Anycast',
    description:
      'Premium DNS infrastructure powered by Anycast routing. 31 PoPs across 6 continents and 19 countries. Low-latency DNS resolution worldwide with zero-downtime failover.',
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
