import type { Metadata } from 'next';
import { Providers } from '@/app/providers';
import '@/app/globals.css';

export const metadata: Metadata = {
  title: 'Irongrove Admin - DNS Management',
  description: 'Admin panel for Irongrove DNS',
};

export default function AdminLayout({
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
          {children}
        </Providers>
      </body>
    </html>
  );
}
