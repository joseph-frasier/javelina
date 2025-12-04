import type { Metadata } from 'next';
import { Providers } from '@/app/providers';
import { ConditionalLayout } from '@/components/layout/ConditionalLayout';
import './globals.css';

export const metadata: Metadata = {
  title: 'Javelina - DNS Management Dashboard',
  description: 'Take control of your DNS with Javelina',
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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="theme-light" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const key = 'javelina:theme';
                  const stored = localStorage.getItem(key);
                  function apply(t) {
                    document.documentElement.classList.remove('theme-light', 'theme-dark');
                    if (t === 'dark') document.documentElement.classList.add('theme-dark');
                    else document.documentElement.classList.add('theme-light');
                  }
                  if (stored === 'light' || stored === 'dark') {
                    apply(stored);
                  } else {
                    // Default to light mode for first-time visitors
                    apply('light');
                  }
                } catch(e) { 
                  document.documentElement.classList.add('theme-light');
                }
              })();
            `,
          }}
        />
      </head>
      <body className="antialiased">
        <Providers>
          <ConditionalLayout>
            {children}
          </ConditionalLayout>
        </Providers>
      </body>
    </html>
  );
}
