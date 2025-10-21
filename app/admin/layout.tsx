import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Irongrove Admin - DNS Management',
  description: 'Admin panel for Irongrove DNS',
};

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
