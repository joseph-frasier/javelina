'use client';

import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { clsx } from 'clsx';
import gsap from 'gsap';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useAuthStore } from '@/lib/auth-store';

export default function SignupPage() {
  const router = useRouter();
  const { signUp, loginWithOAuth, isAuthenticated, isLoading } = useAuthStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    terms?: string;
  }>({});
  const [successMessage, setSuccessMessage] = useState('');
  const [isFlipped, setIsFlipped] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  const heroRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const mobileFormRef = useRef<HTMLDivElement>(null);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  // Reset form scroll position when flipping to form side
  useEffect(() => {
    if (isFlipped && mobileFormRef.current) {
      mobileFormRef.current.scrollTop = 0;
    }
  }, [isFlipped]);

  // GSAP slide animation for desktop - slide both sections apart like cards
  useLayoutEffect(() => {
    setMounted(true);
    if (window.innerWidth >= 768 && heroRef.current && formRef.current) {
      // Start with hero covering form (both at left: 0)
      gsap.set(heroRef.current, {
        x: '0%', // Hero starts at position 0, covering form
      });
      
      gsap.set(formRef.current, {
        x: '0%', // Form also at position 0, but behind hero (z-index 10 vs 20)
      });

      // Slide both sections apart after delay
      gsap.to(heroRef.current, {
        x: '66.67%', // Hero slides right (40% of card width / 60% hero width = 66.67%)
        duration: 1.2,
        delay: 0.5,
        ease: 'power3.inOut',
      });
      
      gsap.to(formRef.current, {
        x: '0%', // Form stays in place as hero reveals it
        duration: 1.2,
        delay: 0.5,
        ease: 'power3.inOut',
      });
    }
  }, []);

  const validateForm = (): boolean => {
    const newErrors: any = {};

    if (!name) {
      newErrors.name = 'Name is required';
    } else if (name.length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      newErrors.password =
        'Password must contain uppercase, lowercase, and a number';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!agreedToTerms) {
      newErrors.terms = 'You must agree to the terms and conditions';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const result = await signUp(email, password, name);

    if (result.success) {
      setSuccessMessage(
        'Account created! Please check your email to verify your account, then return here to sign in.'
      );
    } else {
      setErrors({
        email: result.error,
      });
    }
  };

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  return (
    <>
      {/* Desktop Layout */}
      <div className="hidden md:flex min-h-screen items-center justify-center bg-gradient-to-br from-orange-light to-orange-light/50 dark:from-gray-900 dark:to-gray-800 px-8 py-12">
        <div className="relative w-full max-w-6xl h-[700px] rounded-2xl shadow-2xl overflow-hidden">
          {/* Form Section - Left Side */}
          <div 
            ref={formRef}
            className="absolute left-0 top-0 w-2/5 h-full flex items-center justify-center px-8 py-12 bg-white dark:bg-slate-800 z-10 overflow-y-auto"
          >
            <div className="w-full max-w-[420px]">
            {successMessage ? (
              <div className="text-center">
                <div className="mb-4">
                  <svg
                    className="w-16 h-16 mx-auto text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-orange-dark mb-2">
                  Success!
                </h2>
                <p className="text-gray-slate mb-6">{successMessage}</p>
                
                <div className="mt-6">
                  <p className="text-sm text-gray-slate mb-3">
                    Already verified your email?
                  </p>
                  <Link href="/login">
                    <Button
                      type="button"
                      variant="primary"
                      size="lg"
                      className="w-full"
                    >
                      Sign In
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-orange-dark">
                    Create your account
                  </h2>
                  <p className="text-sm text-gray-slate mt-1">
                    Start managing your DNS today
                  </p>
                </div>

                <Input
                  id="name"
                  type="text"
                  label="Full Name"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (errors.name) setErrors({ ...errors, name: undefined });
                  }}
                  error={errors.name}
                  autoComplete="name"
                  required
                />

                <Input
                  id="email"
                  type="email"
                  label="Email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors({ ...errors, email: undefined });
                  }}
                  error={errors.email}
                  autoComplete="email"
                  required
                />

                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-orange-dark mb-2"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (errors.password)
                          setErrors({ ...errors, password: undefined });
                      }}
                      autoComplete="new-password"
                      required
                      className={clsx(
                        'w-full px-4 py-2.5 rounded-md border transition-colors',
                        'font-regular text-orange-dark placeholder:text-gray-slate/50',
                        'focus:outline-none focus:ring-2 focus:ring-offset-1',
                        errors.password
                          ? 'border-red-500 focus:ring-red-500'
                          : 'border-gray-light focus:ring-orange hover:border-orange/50'
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-slate hover:text-orange transition-colors"
                    >
                      {showPassword ? (
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="mt-1.5 text-sm font-regular text-red-500">
                      {errors.password}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="block text-sm font-medium text-orange-dark mb-2"
                  >
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (errors.confirmPassword)
                          setErrors({ ...errors, confirmPassword: undefined });
                      }}
                      autoComplete="new-password"
                      required
                      className={clsx(
                        'w-full px-4 py-2.5 rounded-md border transition-colors',
                        'font-regular text-orange-dark placeholder:text-gray-slate/50',
                        'focus:outline-none focus:ring-2 focus:ring-offset-1',
                        errors.confirmPassword
                          ? 'border-red-500 focus:ring-red-500'
                          : 'border-gray-light focus:ring-orange hover:border-orange/50'
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-slate hover:text-orange transition-colors"
                    >
                      {showConfirmPassword ? (
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                      )}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="mt-1.5 text-sm font-regular text-red-500">
                      {errors.confirmPassword}
                    </p>
                  )}
                </div>

                <div>
                  <label className="flex items-start cursor-pointer">
                    <input
                      type="checkbox"
                      checked={agreedToTerms}
                      onChange={(e) => {
                        setAgreedToTerms(e.target.checked);
                        if (errors.terms)
                          setErrors({ ...errors, terms: undefined });
                      }}
                      className="w-4 h-4 mt-1 text-orange border-gray-light rounded focus:ring-orange focus:ring-2 cursor-pointer"
                    />
                    <span className="ml-2 text-sm text-gray-slate">
                      I agree to the{' '}
                      <Link
                        href="/terms"
                        className="text-orange hover:underline"
                      >
                        Terms of Service
                      </Link>{' '}
                      and{' '}
                      <Link
                        href="/privacy"
                        className="text-orange hover:underline"
                      >
                        Privacy Policy
                      </Link>
                    </span>
                  </label>
                  {errors.terms && (
                    <p className="mt-1.5 text-sm font-regular text-red-500">
                      {errors.terms}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <svg
                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Creating account...
                    </div>
                  ) : (
                    'Create Account'
                  )}
                </Button>

                <div className="relative pt-2">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-light"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-3 bg-white dark:bg-gray-900 text-gray-slate font-light">
                      or sign up with
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="md"
                    className="w-full text-sm"
                    onClick={() => loginWithOAuth('google')}
                  >
                    <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Google
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="md"
                    className="w-full text-sm"
                    onClick={() => loginWithOAuth('github')}
                  >
                    <svg
                      className="w-4 h-4 mr-2"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                    </svg>
                    GitHub
                  </Button>
                </div>

                <p className="mt-6 text-center text-sm font-light text-gray-slate">
                  Already have an account?{' '}
                  <Link
                    href="/login"
                    className="font-medium text-orange hover:underline transition-colors"
                  >
                    Sign in
                  </Link>
                </p>
              </form>
            )}
          </div>
        </div>

          {/* Hero Section - Starts covering form, then slides right */}
          <div
            ref={heroRef}
            className="absolute left-0 top-0 w-3/5 h-full overflow-hidden z-20"
          >
            {/* Gradient Background - Rich Slate/Charcoal for contrast */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 animate-subtle-gradient">
              <div className="absolute inset-0 bg-gradient-to-tr from-blue-900/20 via-transparent to-slate-900/40 animate-subtle-glow"></div>
            </div>

            {/* Content */}
            <div className="relative z-10 h-full flex flex-col items-center justify-center text-white px-12">
              <div className="max-w-xl text-center animate-float">
                <div className="mb-8">
                  <Image
                    src="/JAVELINA_WHITE_BLACK_BACKGROUND-REMOVED.png"
                    alt="Javelina - Take control of your DNS"
                    width={400}
                    height={160}
                    priority
                    className="mx-auto"
                  />
                </div>
                <h1 className="text-5xl font-black mb-6 leading-tight">
                  Take control of your DNS
                </h1>
                <p className="text-xl font-light text-white/90 leading-relaxed">
                  Manage zones, records, and environments with confidence
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Layout - Flip Card */}
      <div className="md:hidden min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-orange-light to-orange-light/50 dark:from-gray-900 dark:to-gray-800">
        <div className="w-full max-w-md perspective-1000">
          <div
            className={clsx(
              'relative w-full transition-transform duration-700 transform-style-3d',
              isFlipped ? 'rotate-y-180' : ''
            )}
            style={{ transformStyle: 'preserve-3d', minHeight: '600px' }}
          >
            {/* Front - Hero */}
            <div
              className={clsx(
                'absolute inset-0 w-full backface-hidden',
                'bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900',
                'rounded-2xl shadow-2xl p-8 flex flex-col items-center justify-center text-white'
              )}
              style={{ backfaceVisibility: 'hidden' }}
            >
              <div className="text-center animate-float">
                <div className="mb-8">
                  <Image
                    src="/JAVELINA_WHITE_BLACK_BACKGROUND-REMOVED.png"
                    alt="Javelina - Take control of your DNS"
                    width={280}
                    height={112}
                    priority
                    className="mx-auto"
                  />
                </div>
                <h1 className="text-4xl font-black mb-4 leading-tight">
                  Take control of your DNS
                </h1>
                <p className="text-lg font-light text-white/90 mb-8 leading-relaxed">
                  Manage zones, records, and environments with confidence
                </p>
                <Button
                  onClick={handleFlip}
                  variant="primary"
                  size="lg"
                  className="bg-orange hover:bg-orange-dark text-white border-none shadow-lg"
                >
                  Sign Up
                </Button>
              </div>
            </div>

            {/* Back - Form */}
            <div
              ref={mobileFormRef}
              className={clsx(
                'absolute inset-0 w-full backface-hidden rotate-y-180',
                'bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 overflow-y-auto'
              )}
              style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
            >
              {successMessage ? (
                <div className="text-center py-8">
                  <div className="mb-4">
                    <svg
                      className="w-16 h-16 mx-auto text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-orange-dark mb-2">
                    Success!
                  </h2>
                  <p className="text-gray-slate mb-6">{successMessage}</p>
                  
                  <div className="mt-6 space-y-3">
                    <p className="text-sm text-gray-slate">
                      Already verified your email?
                    </p>
                    <Link href="/login">
                      <Button
                        type="button"
                        variant="primary"
                        size="lg"
                        className="w-full"
                      >
                        Sign In
                      </Button>
                    </Link>
                    <Button
                      onClick={handleFlip}
                      variant="outline"
                      size="md"
                      className="w-full"
                    >
                      Back
                    </Button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="text-center mb-4">
                    <h2 className="text-xl font-bold text-orange-dark">
                      Create your account
                    </h2>
                    <p className="text-xs text-gray-slate mt-1">
                      Start managing your DNS today
                    </p>
                  </div>

                  <Input
                    id="name-mobile"
                    type="text"
                    label="Full Name"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (errors.name) setErrors({ ...errors, name: undefined });
                    }}
                    error={errors.name}
                    autoComplete="name"
                    required
                  />

                  <Input
                    id="email-mobile"
                    type="email"
                    label="Email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errors.email) setErrors({ ...errors, email: undefined });
                    }}
                    error={errors.email}
                    autoComplete="email"
                    required
                  />

                  <div>
                    <label
                      htmlFor="password-mobile"
                      className="block text-sm font-medium text-orange-dark mb-2"
                    >
                      Password
                    </label>
                    <div className="relative">
                      <input
                        id="password-mobile"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (errors.password)
                            setErrors({ ...errors, password: undefined });
                        }}
                        autoComplete="new-password"
                        required
                        className={clsx(
                          'w-full px-4 py-2.5 rounded-md border transition-colors',
                          'font-regular text-orange-dark placeholder:text-gray-slate/50',
                          'focus:outline-none focus:ring-2 focus:ring-offset-1',
                          errors.password
                            ? 'border-red-500 focus:ring-red-500'
                            : 'border-gray-light focus:ring-orange hover:border-orange/50'
                        )}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-slate hover:text-orange transition-colors"
                      >
                        {showPassword ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="mt-1.5 text-sm font-regular text-red-500">
                        {errors.password}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="confirmPassword-mobile"
                      className="block text-sm font-medium text-orange-dark mb-2"
                    >
                      Confirm Password
                    </label>
                    <div className="relative">
                      <input
                        id="confirmPassword-mobile"
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          if (errors.confirmPassword)
                            setErrors({ ...errors, confirmPassword: undefined });
                        }}
                        autoComplete="new-password"
                        required
                        className={clsx(
                          'w-full px-4 py-2.5 rounded-md border transition-colors',
                          'font-regular text-orange-dark placeholder:text-gray-slate/50',
                          'focus:outline-none focus:ring-2 focus:ring-offset-1',
                          errors.confirmPassword
                            ? 'border-red-500 focus:ring-red-500'
                            : 'border-gray-light focus:ring-orange hover:border-orange/50'
                        )}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-slate hover:text-orange transition-colors"
                      >
                        {showConfirmPassword ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                    {errors.confirmPassword && (
                      <p className="mt-1.5 text-sm font-regular text-red-500">
                        {errors.confirmPassword}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="flex items-start cursor-pointer">
                      <input
                        type="checkbox"
                        checked={agreedToTerms}
                        onChange={(e) => {
                          setAgreedToTerms(e.target.checked);
                          if (errors.terms)
                            setErrors({ ...errors, terms: undefined });
                        }}
                        className="w-4 h-4 mt-1 text-orange border-gray-light rounded focus:ring-orange focus:ring-2 cursor-pointer"
                      />
                      <span className="ml-2 text-xs text-gray-slate">
                        I agree to the{' '}
                        <Link href="/terms" className="text-orange hover:underline">
                          Terms of Service
                        </Link>{' '}
                        and{' '}
                        <Link href="/privacy" className="text-orange hover:underline">
                          Privacy Policy
                        </Link>
                      </span>
                    </label>
                    {errors.terms && (
                      <p className="mt-1.5 text-sm font-regular text-red-500">
                        {errors.terms}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="w-full"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Creating account...' : 'Create Account'}
                  </Button>

                  <div className="relative pt-2">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-light"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-3 bg-white dark:bg-gray-900 text-gray-slate font-light text-xs">
                        or sign up with
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => loginWithOAuth('google')}
                    >
                      <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                      </svg>
                      Google
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => loginWithOAuth('github')}
                    >
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                      </svg>
                      GitHub
                    </Button>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <Button
                      type="button"
                      onClick={handleFlip}
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                    >
                      ← Back
                    </Button>
                    <p className="text-xs text-gray-slate">
                      Have an account?{' '}
                      <Link href="/login" className="text-orange hover:underline">
                        Sign in
                      </Link>
                    </p>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .perspective-1000 {
          perspective: 1000px;
        }
        .transform-style-3d {
          transform-style: preserve-3d;
        }
        .backface-hidden {
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }
        .rotate-y-180 {
          transform: rotateY(180deg);
        }
        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        @keyframes subtle-gradient {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.95;
          }
        }
        @keyframes subtle-glow {
          0%, 100% {
            opacity: 0.3;
          }
          50% {
            opacity: 0.5;
          }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        .animate-subtle-gradient {
          animation: subtle-gradient 8s ease-in-out infinite;
        }
        .animate-subtle-glow {
          animation: subtle-glow 6s ease-in-out infinite;
        }
      `}</style>
    </>
  );
}
