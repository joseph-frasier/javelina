import { Suspense } from 'react';
import Script from 'next/script';
import { PRICING_FAQS } from '@/lib/constants/faq';
import { generateFAQSchema, generateSoftwareApplicationSchema } from '@/lib/utils/structured-data';
import { generateBreadcrumbSchema } from '@/lib/utils/breadcrumbs';
import { PLANS_CONFIG } from '@/lib/plans-config';
import PricingContent from './PricingContent';

// Generate structured data at build time (server-side)
const faqSchema = generateFAQSchema(PRICING_FAQS);
const breadcrumbSchema = generateBreadcrumbSchema([
  { name: 'Home', url: '/' },
  { name: 'Pricing', url: '/pricing' }
]);
const softwareSchema = generateSoftwareApplicationSchema({
  name: 'Javelina DNS Management',
  description: 'Take control of your DNS with Javelina. Manage zones, records, and organizations with ease.',
  applicationCategory: 'BusinessApplication',
  offers: PLANS_CONFIG.filter(p => p.monthly && !p.code.includes('_lifetime') && p.id !== 'enterprise').map(plan => ({
    name: plan.name,
    description: plan.description,
    price: plan.monthly!.amount.toString(),
    priceCurrency: 'USD',
    billingDuration: 'P1M', // ISO 8601 duration: 1 month
  })),
  features: [
    'DNS zone management',
    'Record management (A, AAAA, CNAME, MX, TXT, etc.)',
    'Organization and team management',
    'Bulk import/export (CSV, BIND)',
    'Tag-based organization',
    'Real-time updates',
  ],
});

export default function PricingPage() {
  return (
    <>
      {/* Structured Data for SEO - Rendered server-side in initial HTML */}
      <Script
        id="faq-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        strategy="beforeInteractive"
      />
      <Script
        id="breadcrumb-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
        strategy="beforeInteractive"
      />
      <Script
        id="software-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
        strategy="beforeInteractive"
      />

      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-orange-light">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange"></div>
            <span className="text-orange-dark">Loading...</span>
          </div>
        </div>
      }>
        <PricingContent />
      </Suspense>
    </>
  );
}
