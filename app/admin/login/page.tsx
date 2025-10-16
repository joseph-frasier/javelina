'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { loginAdmin } from '@/lib/admin-auth';
import { checkRateLimit, getRateLimitReset } from '@/lib/rate-limit';
import { useToastStore } from '@/lib/toast-store';

export default function AdminLoginPage() {
  const router = useRouter();
  const { addToast } = useToastStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [rateLimited, setRateLimited] = useState(false);
  const [resetSeconds, setResetSeconds] = useState<number | null>(null);

  const validateForm = (): boolean => {
    const newErrors: { email?: string; password?: string } = {};

    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Check rate limit
    const rateLimitKey = email.toLowerCase();
    const rateLimit = checkRateLimit(rateLimitKey);

    if (!rateLimit.allowed) {
      const reset = getRateLimitReset(rateLimitKey);
      setRateLimited(true);
      setResetSeconds(reset);
      addToast(
        'error',
        `Too many login attempts. Please try again in ${reset} seconds.`
      );
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const clientIp = await fetch('https://api.ipify.org?format=json')
        .then(res => res.json())
        .then(data => data.ip)
        .catch(() => 'unknown');

      const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown';

      const result = await loginAdmin(email, password, clientIp, userAgent);

      if (result.error) {
        addToast('error', result.error);
        setErrors({
          email: result.error,
          password: result.error
        });
      } else if (result.success) {
        addToast('success', 'Admin login successful!');
        router.push('/admin');
      }
    } catch (error) {
      addToast('error', 'An error occurred during login');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{
      background: 'var(--background)'
    }}>
      <div className="rounded-lg shadow-lg max-w-md w-full p-8" style={{
        backgroundColor: 'var(--bg-primary)'
      }}>
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 bg-orange rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-2xl">🛡️</span>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-center mb-2" style={{
          color: 'var(--orange-dark)'
        }}>
          Admin Panel
        </h1>
        <p className="text-center mb-8" style={{
          color: 'var(--text-secondary)'
        }}>
          Irongrove DNS Administration
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {rateLimited && resetSeconds && (
            <div className="p-4 rounded-lg" style={{
              backgroundColor: 'rgba(239, 114, 21, 0.1)',
              borderColor: 'var(--orange)',
              borderWidth: '1px'
            }}>
              <p className="text-sm" style={{
                color: 'var(--orange)'
              }}>
                Too many login attempts. Please try again in {resetSeconds} seconds.
              </p>
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-2" style={{
              color: 'var(--orange-dark)'
            }}>
              Email Address
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@irongrove.com"
              disabled={isLoading || rateLimited}
              className={errors.email ? 'border-red-500' : ''}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email}</p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="password" className="block text-sm font-medium" style={{
                color: 'var(--orange-dark)'
              }}>
                Password
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-xs transition hover:opacity-80" style={{
                  color: 'var(--orange)'
                }}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={isLoading || rateLimited}
              className={errors.password ? 'border-red-500' : ''}
            />
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">{errors.password}</p>
            )}
          </div>

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            disabled={isLoading || rateLimited}
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </Button>
        </form>

        <div className="mt-8 pt-8" style={{
          borderTopColor: 'var(--border-color)',
          borderTopWidth: '1px'
        }}>
          <p className="text-xs text-center" style={{
            color: 'var(--text-secondary)'
          }}>
            Authorized personnel only. All access is logged.
          </p>
        </div>
      </div>
    </div>
  );
}
