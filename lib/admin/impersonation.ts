import { create } from 'zustand';

/**
 * Admin Impersonation Store
 * Allows admins to view the app as a specific user for support purposes
 * 
 * SECURITY: This store is intentionally NOT persisted to localStorage.
 * Storing admin session tokens in localStorage exposes them to XSS attacks
 * and malicious browser extensions. The in-memory store is cleared on
 * page refresh, which is the safer default for sensitive admin state.
 */

interface ImpersonatedUser {
  id: string;
  name: string;
  email: string;
}

interface ImpersonationState {
  isImpersonating: boolean;
  impersonatedUser: ImpersonatedUser | null;
  startImpersonation: (user: ImpersonatedUser) => void;
  endImpersonation: () => void;
}

export const useImpersonationStore = create<ImpersonationState>()(
  (set) => ({
    isImpersonating: false,
    impersonatedUser: null,

    startImpersonation: (user: ImpersonatedUser) => {
      set({
        isImpersonating: true,
        impersonatedUser: user,
      });
    },

    endImpersonation: () => {
      set({
        isImpersonating: false,
        impersonatedUser: null,
      });
    },
  })
);

/**
 * Start impersonating a user
 * Admin context is validated server-side via the admin session cookie.
 */
export function startImpersonation(userId: string, userName: string, userEmail: string): void {
  useImpersonationStore.getState().startImpersonation({
    id: userId,
    name: userName,
    email: userEmail,
  });
}

/**
 * Stop impersonating and return to admin context
 */
export function endImpersonation(): void {
  useImpersonationStore.getState().endImpersonation();
}

/**
 * Check if currently impersonating
 */
export function isImpersonating(): boolean {
  return useImpersonationStore.getState().isImpersonating;
}

/**
 * Get impersonated user info
 */
export function getImpersonatedUser(): ImpersonatedUser | null {
  return useImpersonationStore.getState().impersonatedUser;
}
