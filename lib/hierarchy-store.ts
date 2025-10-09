import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface HierarchyContext {
  currentOrgId: string | null;
  currentEnvironmentId: string | null;
}

interface HierarchyState extends HierarchyContext {
  setCurrentOrg: (orgId: string | null) => void;
  setCurrentEnvironment: (environmentId: string | null) => void;
  getCurrentContext: () => HierarchyContext;
  clearContext: () => void;
}

export const useHierarchyStore = create<HierarchyState>()(
  persist(
    (set, get) => ({
      currentOrgId: null,
      currentEnvironmentId: null,

      setCurrentOrg: (orgId) => {
        set({ 
          currentOrgId: orgId,
          // Clear environment when switching orgs
          currentEnvironmentId: null
        });
      },

      setCurrentEnvironment: (environmentId) => {
        set({ currentEnvironmentId: environmentId });
      },

      getCurrentContext: () => {
        const state = get();
        return {
          currentOrgId: state.currentOrgId,
          currentEnvironmentId: state.currentEnvironmentId
        };
      },

      clearContext: () => {
        set({
          currentOrgId: null,
          currentEnvironmentId: null
        });
      }
    }),
    {
      name: 'hierarchy-storage',
      partialize: (state) => ({
        currentOrgId: state.currentOrgId,
        currentEnvironmentId: state.currentEnvironmentId
      }),
    }
  )
);

