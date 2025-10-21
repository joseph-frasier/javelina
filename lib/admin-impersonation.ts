import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Admin Impersonation Store
 * Allows admins to view the app as a specific user for support purposes
 */

interface ImpersonatedUser {
  id: string;
  name: string;
  email: string;
}

interface ImpersonationState {
  isImpersonating: boolean;
  impersonatedUser: ImpersonatedUser | null;
  adminSessionToken: string | null;
  startImpersonation: (user: ImpersonatedUser, adminToken: string) => void;
  endImpersonation: () => void;
}

export const useImpersonationStore = create<ImpersonationState>()(
  persist(
    (set) => ({
      isImpersonating: false,
      impersonatedUser: null,
      adminSessionToken: null,

      startImpersonation: (user: ImpersonatedUser, adminToken: string) => {
        set({
          isImpersonating: true,
          impersonatedUser: user,
          adminSessionToken: adminToken,
        });
      },

      endImpersonation: () => {
        set({
          isImpersonating: false,
          impersonatedUser: null,
          adminSessionToken: null,
        });
      },
    }),
    {
      name: 'admin-impersonation-storage',
    }
  )
);

/**
 * Start impersonating a user
 */
export function startImpersonation(userId: string, userName: string, userEmail: string): void {
  const adminToken = localStorage.getItem('admin_session_token') || 'mock-admin-token';
  
  useImpersonationStore.getState().startImpersonation(
    {
      id: userId,
      name: userName,
      email: userEmail,
    },
    adminToken
  );
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

