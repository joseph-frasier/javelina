'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import { getAdminUser, logoutAdmin } from '@/lib/admin-auth';

export function AdminHeader() {
  const router = useRouter();
  const [admin, setAdmin] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAdmin = async () => {
      const user = await getAdminUser();
      setAdmin(user);
      setLoading(false);
    };
    fetchAdmin();
  }, []);

  const handleLogout = async () => {
    await logoutAdmin();
    router.push('/admin/login');
  };

  return (
    <header className="bg-white border-b border-gray-light px-8 py-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold text-orange-dark">Irongrove DNS</h2>
      </div>

      <div className="flex items-center gap-4">
        {!loading && admin && (
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{admin.name}</p>
              <p className="text-xs text-gray-slate">{admin.email}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-orange-light flex items-center justify-center">
              <span className="text-sm font-bold text-orange-dark">
                {admin.name.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={handleLogout}
        >
          Logout
        </Button>
      </div>
    </header>
  );
}
