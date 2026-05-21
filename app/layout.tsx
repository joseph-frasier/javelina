import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { Providers } from '@/app/providers';
import { ConditionalLayout } from '@/components/layout/ConditionalLayout';
import { generateOrganizationSchema, generateWebSiteSchema } from '@/lib/utils/structured-data';
import Script from 'next/script';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: {
    default: 'Javelina - DNS Management Dashboard',
    template: '%s | Javelina DNS',
  },
  description: 'Take control of your DNS with Javelina. Manage zones, records, and organizations with ease. Powerful, user-friendly DNS management platform.',
  keywords: ['DNS management', 'DNS hosting', 'domain management', 'DNS zones', 'DNS records', 'Javelina', 'Irongrove'],
  authors: [{ name: 'Irongrove' }],
  creator: 'Irongrove',
  publisher: 'Irongrove',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    siteName: 'Javelina DNS Management',
    title: 'Javelina - DNS Management Dashboard',
    description: 'Take control of your DNS with Javelina. Manage zones, records, and organizations with ease.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Javelina DNS Management Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Javelina - DNS Management Dashboard',
    description: 'Take control of your DNS with Javelina. Manage zones, records, and organizations with ease.',
    images: ['/og-image.png'],
    creator: '@irongrove',
  },
  verification: {
    // Add verification tokens when available
    // google: 'your-google-verification-token',
    // yandex: 'your-yandex-verification-token',
  },
  alternates: {
    canonical: '/',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Generate global structured data
  const organizationSchema = generateOrganizationSchema();
  const websiteSchema = generateWebSiteSchema();

  return (
    <html
      lang="en"
      className={`theme-dark ${inter.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Theme bootstrap — dark is default; light requires explicit user opt-in. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const key = 'javelina:theme';
                  const stored = localStorage.getItem(key);
                  function apply(t) {
                    document.documentElement.classList.remove('theme-light', 'theme-dark');
                    document.documentElement.classList.add(t === 'light' ? 'theme-light' : 'theme-dark');
                  }
                  apply(stored === 'light' ? 'light' : 'dark');
                } catch(e) {
                  document.documentElement.classList.add('theme-dark');
                }
              })();
            `,
          }}
        />
      </head>
      <body className="antialiased">
        {/* Global Structured Data */}
        <Script
          id="organization-schema"
          type="application/ld+json"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <Script
          id="website-schema"
          type="application/ld+json"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
        
        <Providers>
          <ConditionalLayout>
            {children}
          </ConditionalLayout>
        </Providers>
      </body>
    </html>
  );
}
