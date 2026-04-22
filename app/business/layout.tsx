import type { ReactNode } from 'react';

// Intentionally NOT importing global Tailwind overrides here. The business
// surface uses its own token object (components/business/ui/tokens.ts) and
// inline styles — this layout just isolates the route tree and could inject
// dark-mode detection later without affecting the rest of the app.
export default function BusinessLayout({ children }: { children: ReactNode }) {
  return <div style={{ minHeight: '100vh', background: '#f7f8fa' }}>{children}</div>;
}
