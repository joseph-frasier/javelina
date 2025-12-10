import { getURL } from './get-url';
import type { FAQItem } from '../constants/faq';

/**
 * Structured Data (JSON-LD) Utilities for SEO
 * Generates Schema.org compliant structured data
 */

/**
 * Generate FAQPage structured data
 */
export function generateFAQSchema(faqs: FAQItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

/**
 * Generate SoftwareApplication structured data for SaaS products
 */
export function generateSoftwareApplicationSchema(params: {
  name: string;
  description: string;
  applicationCategory: string;
  offers?: Array<{
    name: string;
    description: string;
    price: string;
    priceCurrency: string;
    billingDuration?: string;
  }>;
  aggregateRating?: {
    ratingValue: number;
    reviewCount: number;
  };
  features?: string[];
}) {
  const baseUrl = getURL();
  
  const schema: any = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: params.name,
    description: params.description,
    applicationCategory: params.applicationCategory,
    operatingSystem: 'Web',
    url: baseUrl,
    provider: {
      '@type': 'Organization',
      name: 'Irongrove',
      url: baseUrl,
    },
  };

  if (params.offers && params.offers.length > 0) {
    schema.offers = params.offers.map(offer => ({
      '@type': 'Offer',
      name: offer.name,
      description: offer.description,
      price: offer.price,
      priceCurrency: offer.priceCurrency,
      ...(offer.billingDuration && { billingDuration: offer.billingDuration }),
      availability: 'https://schema.org/InStock',
      url: `${baseUrl}/pricing`,
    }));
  }

  if (params.aggregateRating) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: params.aggregateRating.ratingValue,
      reviewCount: params.aggregateRating.reviewCount,
    };
  }

  if (params.features && params.features.length > 0) {
    schema.featureList = params.features;
  }

  return schema;
}

/**
 * Generate Organization structured data
 */
export function generateOrganizationSchema() {
  const baseUrl = getURL();
  
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Irongrove',
    url: baseUrl,
    logo: `${baseUrl}/logo.png`,
    description: 'DNS Management Platform',
    contactPoint: {
      '@type': 'ContactPoint',
      email: 'support@irongrove.com',
      contactType: 'Customer Support',
    },
    sameAs: [
      // Add social media URLs here if available
    ],
  };
}

/**
 * Generate WebSite structured data for search functionality
 */
export function generateWebSiteSchema() {
  const baseUrl = getURL();
  
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Javelina DNS Management',
    description: 'Take control of your DNS with Javelina',
    url: baseUrl,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${baseUrl}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

/**
 * Generate Article structured data for blog posts or documentation
 */
export function generateArticleSchema(params: {
  headline: string;
  description: string;
  datePublished: string;
  dateModified?: string;
  author: string;
  url: string;
}) {
  const baseUrl = getURL();
  
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: params.headline,
    description: params.description,
    datePublished: params.datePublished,
    dateModified: params.dateModified || params.datePublished,
    author: {
      '@type': 'Person',
      name: params.author,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Irongrove',
      logo: {
        '@type': 'ImageObject',
        url: `${baseUrl}/logo.png`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': params.url,
    },
  };
}

