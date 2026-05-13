'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { LaunchDarklyProvider } from '@/components/providers/LaunchDarklyProvider';
import { ToastContainer } from '@/components/ui/Toast';
import { useToastStore } from '@/lib/toast-store';
import { TosGate } from '@/components/legal/TosGate';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  const { toasts, removeToast } = useToastStore();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TosGate>
          <LaunchDarklyProvider>
            {children}
            <ToastContainer toasts={toasts} onClose={removeToast} />
          </LaunchDarklyProvider>
        </TosGate>
      </AuthProvider>
    </QueryClientProvider>
  );
}
