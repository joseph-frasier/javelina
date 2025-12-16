import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

// Mock Supabase SSR - must be done before importing middleware
const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getUser: mockGetUser,
    },
    from: mockFrom,
  })),
}));

// Import middleware AFTER mocking
const { middleware } = await import('../../middleware');

describe('middleware - auth gating', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Set environment variables
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
  });

  it('redirects unauthenticated users from protected routes to /login with redirect param', async () => {
    // Mock getUser to return no user (unauthenticated)
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    // Create a NextRequest for a protected route
    const protectedUrl = 'http://localhost:3000/organization/org-123';
    const request = new NextRequest(protectedUrl, {
      method: 'GET',
    });

    // Call the middleware
    const response = await middleware(request);

    // Assert: Should redirect to login
    expect(response).toBeInstanceOf(NextResponse);
    expect(response.status).toBe(307); // Next.js redirect status
    
    // Assert: Redirect location should be /login with redirect query param
    const location = response.headers.get('location');
    expect(location).toBeTruthy();
    expect(location).toContain('/login');
    expect(location).toContain('redirect=%2Forganization%2Forg-123'); // URL-encoded original path
  });

  it('allows authenticated user through to protected route without redirect', async () => {
    // Mock getUser to return a valid user (authenticated)
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          aud: 'authenticated',
          role: 'authenticated',
        },
      },
      error: null,
    });

    // Create a NextRequest for a protected route
    const protectedUrl = 'http://localhost:3000/organization/org-123';
    const request = new NextRequest(protectedUrl, {
      method: 'GET',
    });

    // Call the middleware
    const response = await middleware(request);

    // Assert: Should NOT redirect (allow through)
    expect(response).toBeInstanceOf(NextResponse);
    expect(response.status).not.toBe(307);
    expect(response.status).not.toBe(308);
    
    // Assert: No redirect location header
    const location = response.headers.get('location');
    expect(location).toBeNull();
  });
});
