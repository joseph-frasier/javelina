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
    <html lang="en">
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
