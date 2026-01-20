import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAuthStore } from '@/lib/auth-store';
import { createClient } from '@/lib/supabase/client';

// Mock the Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(),
}));

describe('Auth Store - Signup with hCaptcha', () => {
  let mockSupabase: any;
  let mockSignUp: any;

  beforeEach(() => {
    // Reset the store state
    useAuthStore.setState({
      user: null,
      profile: null,
      isAuthenticated: false,
      isLoading: false,
    });

    // Create mock functions
    mockSignUp = vi.fn();
    mockSupabase = {
      auth: {
        signUp: mockSignUp,
        getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
        onAuthStateChange: vi.fn().mockReturnValue({
          data: { subscription: { unsubscribe: vi.fn() } },
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      }),
    };

    (createClient as any).mockReturnValue(mockSupabase);
  });

  it('should pass captchaToken to supabase.auth.signUp when provided', async () => {
    const mockUser = {
      id: 'test-user-id',
      email: 'test@example.com',
      created_at: new Date().toISOString(),
    };

    mockSignUp.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const { signUp } = useAuthStore.getState();
    const captchaToken = 'test-captcha-token-12345';

    await signUp('test@example.com', 'Password123', 'Test User', captchaToken);

    expect(mockSignUp).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'Password123',
      options: {
        data: {
          name: 'Test User',
        },
        captchaToken: 'test-captcha-token-12345',
      },
    });
  });

  it('should pass undefined captchaToken when not provided', async () => {
    const mockUser = {
      id: 'test-user-id',
      email: 'test@example.com',
      created_at: new Date().toISOString(),
    };

    mockSignUp.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const { signUp } = useAuthStore.getState();

    await signUp('test@example.com', 'Password123', 'Test User');

    expect(mockSignUp).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'Password123',
      options: {
        data: {
          name: 'Test User',
        },
        captchaToken: undefined,
      },
    });
  });

  it('should handle captcha-related errors from Supabase', async () => {
    mockSignUp.mockResolvedValue({
      data: { user: null },
      error: {
        message: 'Captcha verification failed',
        status: 400,
      },
    });

    const { signUp } = useAuthStore.getState();
    const captchaToken = 'invalid-captcha-token';

    const result = await signUp('test@example.com', 'Password123', 'Test User', captchaToken);

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
    expect(mockSignUp).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          captchaToken: 'invalid-captcha-token',
        }),
      })
    );
  });
});
