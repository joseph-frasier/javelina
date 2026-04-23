import type { ReactNode } from 'react';
import { BusinessTopbar } from '@/components/business/dashboard/BusinessTopbar';

export default function BusinessLayout({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f7f8fa',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <BusinessTopbar />
      <div style={{ flex: 1, minHeight: 0 }}>{children}</div>
    </div>
  );
}
