import type { Metadata } from 'next';
import { Providers } from '@/app/providers';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
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
          <div className="flex flex-col h-screen">
            <Header />
            <div className="flex flex-1 overflow-hidden">
              <Sidebar />
              <main className="flex-1 overflow-y-auto bg-gray-light dark:bg-orange-dark">
                {children}
              </main>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
