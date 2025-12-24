/**
 * FAQ Content for Javelina DNS Management
 * Used for both display and structured data (Schema.org FAQPage)
 */

export interface FAQItem {
  question: string;
  answer: string;
}

export const PRICING_FAQS: FAQItem[] = [
  {
    question: 'Can I change my plan later?',
    answer: 'Yes! You can upgrade or downgrade your plan at any time. Changes will be prorated and reflected in your next billing cycle.',
  },
  {
    question: 'What payment methods do you accept?',
    answer: 'We accept all major credit cards (Visa, Mastercard, American Express) and support automatic billing for your convenience.',
  },
  {
    question: 'Can I migrate my existing DNS records?',
    answer: 'Yes! You can easily import your existing DNS records from other providers. We support bulk imports via CSV and BIND zone file formats, making the migration process quick and seamless.',
  },
];

export const GENERAL_FAQS: FAQItem[] = [
  {
    question: 'What is Javelina DNS Management?',
    answer: 'Javelina is a powerful, user-friendly DNS management platform that helps you take control of your DNS infrastructure. Manage zones, records, and organizations with ease.',
  },
  {
    question: 'How do I get started?',
    answer: 'Simply sign up for an account, choose a plan that fits your needs, create an organization, and start managing your DNS zones. Our intuitive interface makes it easy to get started.',
  },
  {
    question: 'Is my data secure?',
    answer: 'Yes! We use industry-standard encryption and security practices to protect your data. All connections are encrypted with TLS, and we follow best practices for data storage and access control.',
  },
  {
    question: 'Do you offer customer support?',
    answer: 'Yes! We offer email support for all plans. Contact us at javelina@irongrove.com and we\'ll be happy to help with any questions or issues.',
  },
];

