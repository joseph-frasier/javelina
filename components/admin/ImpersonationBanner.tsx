'use client';

import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import { useImpersonationStore, endImpersonation } from '@/lib/admin-impersonation';

export function ImpersonationBanner() {
  const router = useRouter();
  const { isImpersonating, impersonatedUser } = useImpersonationStore();

  if (!isImpersonating || !impersonatedUser) return null;

  const handleExitImpersonation = () => {
    endImpersonation();
    router.push('/admin/users');
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-lg">
      <div className="max-w-[1600px] mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Warning Icon */}
          <div className="flex items-center gap-2">
            <svg className="w-6 h-6 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <div className="font-bold text-sm">Admin Impersonation Active</div>
              <div className="text-xs opacity-90">
                Viewing as: <span className="font-semibold">{impersonatedUser.name}</span> ({impersonatedUser.email})
              </div>
            </div>
          </div>
        </div>

        <Button
          size="sm"
          onClick={handleExitImpersonation}
          className="!bg-white !text-orange-600 hover:!bg-orange-50 font-semibold"
        >
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Exit Impersonation
        </Button>
      </div>
    </div>
  );
}

