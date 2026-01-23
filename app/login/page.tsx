'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import { useAuthStore } from '@/lib/auth-store';
import { Logo } from '@/components/ui/Logo';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, user } = useAuthStore();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      router.push('/');
    }
  }, [isAuthenticated, user, router]);

  const handleLogin = () => {
    // Redirect to Auth0 via Express backend
    login();
  };

  return (
    <div className="min-h-screen bg-orange-light flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-[420px]">
        {/* Logo/Brand Section */}
        <div className="flex flex-col items-center mb-0">
          <Logo
            width={300}
            height={120}
            priority
          />
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-light p-8">
          <div className="space-y-5">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-semibold text-orange-dark mb-2">
                Welcome Back
              </h1>
              <p className="text-gray-slate">
                Sign in to manage your DNS zones
              </p>
            </div>

            {/* Auth0 Login Button */}
            <Button
              type="button"
              variant="primary"
              size="lg"
              className="w-full"
              onClick={handleLogin}
            >
              Sign In with Auth0
            </Button>

            <div className="text-center text-sm text-gray-slate mt-4">
              <p>
                Auth0 handles secure authentication with email/password,
                Google, and GitHub
              </p>
            </div>
          </div>
        </div>

        {/* Sign Up Link */}
        <p className="mt-6 text-center text-sm font-light text-gray-slate">
          Don&rsquo;t have an account?{' '}
          <Link
            href="/signup"
            className="font-medium text-orange hover:underline transition-colors"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
