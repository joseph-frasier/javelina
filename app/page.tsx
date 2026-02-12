'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useAuthStore } from '@/lib/auth-store';
import { useEffect, useState } from 'react';
import { WelcomeGuidance } from '@/components/dashboard/WelcomeGuidance';
import { EmailVerificationBanner } from '@/components/auth/EmailVerificationBanner';
import { Logo } from '@/components/ui/Logo';

export default function HomePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, login, signup } = useAuthStore();
  const organizations = user?.organizations || [];
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Force light mode on landing page
  useEffect(() => {
    if (!isAuthenticated && !user) {
      document.documentElement.classList.remove('theme-dark');
      document.documentElement.classList.add('theme-light');
    }
  }, [isAuthenticated, user]);

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
          <span className="text-orange-dark font-medium">Loading...</span>
        </div>
      </div>
    );
  }

  // Show sign-in page for unauthenticated users (after logout or first visit)
  if (!isAuthenticated && !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50">
        {/* Navigation */}
        <nav className="border-b border-gray-200 bg-white/80 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <Logo width={120} height={32} />
              <Button
                variant="outline"
                size="md"
                onClick={login}
              >
                Login
              </Button>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 sm:pt-24 sm:pb-20">
          <div className="text-center">
            <h1 className="font-black text-5xl sm:text-6xl lg:text-7xl text-gray-900 mb-6 tracking-tight">
              DNS Management
              <br />
              <span className="text-orange">Made Simple</span>
            </h1>
            <p className="text-xl sm:text-2xl text-gray-600 max-w-3xl mx-auto mb-10 font-light leading-relaxed">
              Powerful DNS infrastructure management for modern teams.
              Secure, fast, and built for scale.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                variant="primary"
                size="lg"
                onClick={signup}
                className="w-full sm:w-auto px-8 py-4 text-lg font-semibold"
              >
                Get Started
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={login}
                className="w-full sm:w-auto px-8 py-4 text-lg"
              >
                Login
              </Button>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Lightning Fast</h3>
              <p className="text-gray-600 leading-relaxed">
                Instant DNS propagation and real-time updates across your entire infrastructure.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Enterprise Security</h3>
              <p className="text-gray-600 leading-relaxed">
                Multi-factor authentication, audit logs, and granular access controls.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Team Collaboration</h3>
              <p className="text-gray-600 leading-relaxed">
                Built for teams with role-based permissions and seamless collaboration.
              </p>
            </div>
          </div>
        </div>

        {/* Social Proof / Stats */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="bg-gradient-to-r from-orange to-orange-dark rounded-3xl p-12 text-center text-white shadow-xl">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Ready to simplify your DNS management?
            </h2>
            <p className="text-xl mb-8 text-orange-50">
              Join teams already using Javelina to manage their infrastructure.
            </p>
            <Button
              variant="secondary"
              size="lg"
              onClick={signup}
              className="bg-white text-orange hover:bg-gray-50 px-8 py-4 text-lg font-semibold"
            >
              Get Started Now
            </Button>
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-gray-200 bg-white mt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col md:flex-row items-center justify-between">
              <div className="flex items-center space-x-2 mb-4 md:mb-0">
                <Logo width={100} height={27} />
                <span className="text-gray-600">© 2026 Javelina DNS</span>
              </div>
              <div className="flex space-x-6 text-gray-600">
                <a href="#" className="hover:text-orange transition-colors">Documentation</a>
                <a href="#" className="hover:text-orange transition-colors">Support</a>
                <a href="#" className="hover:text-orange transition-colors">Privacy</a>
              </div>
            </div>
          </div>
        </footer>
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

  // Show welcome dashboard for authenticated users without organizations
  return (
    <div className="max-w-[1600px] 2xl:max-w-[1900px] 3xl:max-w-full mx-auto px-4 sm:px-6 lg:px-6 py-4 sm:py-6 md:py-8">
      {/* Email Verification Banner */}
      {user && !user.email_verified && (
        <EmailVerificationBanner email={user.email} />
      )}

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
