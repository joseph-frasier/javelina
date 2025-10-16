'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getAdminUser, logoutAdmin } from '@/lib/admin-auth';
import { Logo } from '@/components/ui/Logo';

export function AdminHeader() {
  const router = useRouter();
  const [admin, setAdmin] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
    setIsDropdownOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    }

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  const adminName = admin?.name || 'Admin User';
  const adminEmail = admin?.email || '';
  const adminInitial = adminName.charAt(0).toUpperCase();

  return (
    <header className="bg-white border-b border-gray-light">
      <div className="max-w-full mx-auto pr-4 sm:pr-6 lg:pr-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link href="/admin" className="flex items-center">
              <Logo
                width={325}
                height={130}
                priority
                className="h-20 w-auto"
              />
            </Link>
          </div>

          <div className="flex items-center space-x-6">
            <nav className="hidden md:flex items-center space-x-6">
              <Link
                href="/admin"
                className="text-gray-slate hover:text-orange font-regular text-sm transition-colors"
              >
                Dashboard
              </Link>
              <Link
                href="/admin/users"
                className="text-gray-slate hover:text-orange font-regular text-sm transition-colors"
              >
                Users
              </Link>
              <Link
                href="/admin/organizations"
                className="text-gray-slate hover:text-orange font-regular text-sm transition-colors"
              >
                Organizations
              </Link>
            </nav>

            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-8 h-8 bg-orange rounded-full flex items-center justify-center hover:bg-orange-dark transition-colors focus:outline-none focus:ring-2 focus:ring-orange focus:ring-offset-2"
              >
                <span className="text-white font-bold text-base">
                  {adminInitial}
                </span>
              </button>

              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-light overflow-hidden">
                  <div className="p-4 border-b border-gray-light">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-orange rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-lg">
                          {adminInitial}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-orange-dark truncate">
                          {adminName}
                        </p>
                        <p className="text-xs text-gray-slate truncate">
                          {adminEmail}
                        </p>
                        <p className="text-xs font-semibold text-orange truncate">
                          Administrator
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="py-2">
                    <button
                      className="w-full text-left px-4 py-2 text-sm text-gray-slate hover:bg-gray-light/30 hover:text-orange transition-colors"
                      onClick={handleLogout}
                    >
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
