import type { Metadata } from 'next';
import { Providers } from '@/app/providers';
import { ConditionalLayout } from '@/components/layout/ConditionalLayout';
import './globals.css';

export const metadata: Metadata = {
  title: 'Javelina - DNS Management Dashboard',
  description: 'Take control of your DNS with Javelina',
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
                    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
                    apply(prefersDark ? 'dark' : 'light');
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
