import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useAuthStore } from '@/lib/stores/auth-store'

const PROFILE_URL = '/api/backend/users/profile'
const PROBE_URL = '/api/backend-auth/me'

function resetStore() {
  useAuthStore.setState({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    profileReady: false,
    profileError: null,
  })
}

function profileResponse() {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      data: {
        id: 'u1',
        name: 'Test User',
        email: 't@example.com',
        role: 'user',
        organizations: [
          { id: 'o1', name: 'Org One', role: 'Admin', pending_plan_code: null },
        ],
      },
    }),
    text: async () => '',
  }
}

describe('auth-store initializeAuth', () => {
  beforeEach(() => {
    resetStore()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('fetches the profile without a separate session probe', async () => {
    const calls: string[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        calls.push(url)
        return profileResponse()
      })
    )

    await useAuthStore.getState().initializeAuth()

    expect(calls).toEqual([PROFILE_URL])
    expect(calls).not.toContain(PROBE_URL)

    const s = useAuthStore.getState()
    expect(s.isAuthenticated).toBe(true)
    expect(s.profileReady).toBe(true)
    expect(s.isLoading).toBe(false)
  })

  it('sets a clean unauthenticated state on 401 without an error banner', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 401,
        json: async () => ({}),
        text: async () => 'Unauthorized',
      }))
    )

    await useAuthStore.getState().initializeAuth()

    const s = useAuthStore.getState()
    expect(s.isAuthenticated).toBe(false)
    expect(s.user).toBeNull()
    expect(s.profileReady).toBe(false)
    // A logged-out visitor must not see "we could not load your profile".
    expect(s.profileError).toBeNull()
    expect(s.isLoading).toBe(false)
  })

  it('surfaces a profile error on a 500', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 500,
        json: async () => ({}),
        text: async () => 'boom',
      }))
    )

    await useAuthStore.getState().initializeAuth()

    const s = useAuthStore.getState()
    expect(s.isAuthenticated).toBe(false)
    expect(s.profileError).toBeTruthy()
    expect(s.isLoading).toBe(false)
  })

  it('clears isLoading even when fetch throws', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('network')
      })
    )

    await useAuthStore.getState().initializeAuth()

    const s = useAuthStore.getState()
    expect(s.isLoading).toBe(false)
    expect(s.isAuthenticated).toBe(false)
  })
})
