'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useAuthStore } from '@/lib/auth-store';
import { useEffect, useState } from 'react';
import { WelcomeGuidance } from '@/components/dashboard/WelcomeGuidance';
import { Logo } from '@/components/ui/Logo';

export default function HomePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, login } = useAuthStore();
  const organizations = user?.organizations || [];
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Redirect authenticated users with orgs to their most recent org page
  useEffect(() => {
    if (isAuthenticated && user && organizations.length > 0) {
      setIsRedirecting(true);
      const mostRecentOrg = organizations[organizations.length - 1];
      router.push(`/organization/${mostRecentOrg.id}`);
    }
  }, [isAuthenticated, user, organizations, router]);

  // Show loading state while auth is initializing
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-orange-light">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange"></div>
          <span className="text-orange-dark">Loading...</span>
        </div>
      </div>
    );
  }

  // Show loading state while redirecting users with orgs
  if (isRedirecting || (isAuthenticated && user && organizations.length > 0)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-orange-light">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange"></div>
          <span className="text-orange-dark">Loading...</span>
        </div>
      </div>
    );
  }

  // Show login page for unauthenticated users
  if (!isAuthenticated || !user) {
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
                onClick={login}
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

  // Show welcome dashboard for authenticated users without organizations
  return (
    <div className="max-w-[1600px] 2xl:max-w-[1900px] 3xl:max-w-full mx-auto px-4 sm:px-6 lg:px-6 py-4 sm:py-6 md:py-8">
      {/* Hero Section - Welcome */}
      <div className="mb-8">
        <h1 className="font-black font-sans text-4xl text-orange-dark mb-2">
          Welcome to Javelina
        </h1>
        <p className="font-light text-gray-slate text-lg">
          Get started with DNS management in just a few simple steps
        </p>
      </div>

      {/* Content Grid - Welcome View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Quick Actions */}
        <Card
          title="Quick Actions"
          description="Common tasks and shortcuts"
          className="lg:col-span-1 h-fit"
        >
          <div className="space-y-4 mt-4">
            <Link href="/pricing" className="block">
              <Button variant="primary" className="w-full justify-start">
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Create Organization
              </Button>
            </Link>
            <Link href="/profile" className="block">
              <Button variant="secondary" className="w-full justify-start">
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                Your Profile
              </Button>
            </Link>
            <Link href="/settings" className="block">
              <Button variant="outline" className="w-full justify-start">
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                Settings
              </Button>
            </Link>
          </div>
        </Card>

        {/* Welcome Guidance */}
        <Card
          title="Getting Started with Javelina"
          description="Follow these steps to set up your DNS infrastructure"
          className="lg:col-span-2"
        >
          <WelcomeGuidance />
        </Card>
      </div>
    </div>
  );
}
