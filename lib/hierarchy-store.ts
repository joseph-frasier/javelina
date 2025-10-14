import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface HierarchyContext {
  currentOrgId: string | null;
  currentEnvironmentId: string | null;
  expandedOrgs: Set<string>;
  expandedEnvironments: Set<string>;
}

interface HierarchyState extends HierarchyContext {
  setCurrentOrg: (orgId: string | null) => void;
  setCurrentEnvironment: (environmentId: string | null) => void;
  getCurrentContext: () => HierarchyContext;
  clearContext: () => void;
  expandOrg: (orgId: string) => void;
  collapseOrg: (orgId: string) => void;
  toggleOrg: (orgId: string) => void;
  expandEnvironment: (envId: string) => void;
  collapseEnvironment: (envId: string) => void;
  toggleEnvironment: (envId: string) => void;
  // Helper method to auto-expand and select when creating new items
  selectAndExpand: (orgId: string, environmentId?: string) => void;
}

export const useHierarchyStore = create<HierarchyState>()(
  persist(
    (set, get) => ({
      currentOrgId: null,
      currentEnvironmentId: null,
      expandedOrgs: new Set(),
      expandedEnvironments: new Set(),

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
          currentEnvironmentId: state.currentEnvironmentId,
          expandedOrgs: state.expandedOrgs,
          expandedEnvironments: state.expandedEnvironments
        };
      },

      clearContext: () => {
        set({
          currentOrgId: null,
          currentEnvironmentId: null
        });
      },

      expandOrg: (orgId) => {
        set((state) => ({
          expandedOrgs: new Set([...state.expandedOrgs, orgId])
        }));
      },

      collapseOrg: (orgId) => {
        set((state) => {
          const newExpanded = new Set(state.expandedOrgs);
          newExpanded.delete(orgId);
          return { expandedOrgs: newExpanded };
        });
      },

      toggleOrg: (orgId) => {
        set((state) => {
          const newExpanded = new Set(state.expandedOrgs);
          if (newExpanded.has(orgId)) {
            newExpanded.delete(orgId);
          } else {
            newExpanded.add(orgId);
          }
          return { expandedOrgs: newExpanded };
        });
      },

      expandEnvironment: (envId) => {
        set((state) => ({
          expandedEnvironments: new Set([...state.expandedEnvironments, envId])
        }));
      },

      collapseEnvironment: (envId) => {
        set((state) => {
          const newExpanded = new Set(state.expandedEnvironments);
          newExpanded.delete(envId);
          return { expandedEnvironments: newExpanded };
        });
      },

      toggleEnvironment: (envId) => {
        set((state) => {
          const newExpanded = new Set(state.expandedEnvironments);
          if (newExpanded.has(envId)) {
            newExpanded.delete(envId);
          } else {
            newExpanded.add(envId);
          }
          return { expandedEnvironments: newExpanded };
        });
      },

      selectAndExpand: (orgId, environmentId) => {
        set((state) => {
          const newExpandedOrgs = new Set([...state.expandedOrgs, orgId]);
          const updates: Partial<HierarchyState> = {
            currentOrgId: orgId,
            expandedOrgs: newExpandedOrgs
          };

          if (environmentId) {
            updates.currentEnvironmentId = environmentId;
            updates.expandedEnvironments = new Set([...state.expandedEnvironments, environmentId]);
          }

          return updates;
        });
      }
    }),
    {
      name: 'hierarchy-storage',
      partialize: (state) => ({
        currentOrgId: state.currentOrgId,
        currentEnvironmentId: state.currentEnvironmentId,
        expandedOrgs: Array.from(state.expandedOrgs),
        expandedEnvironments: Array.from(state.expandedEnvironments)
      }),
      // Custom merge function to handle Set serialization/deserialization
      merge: (persistedState, currentState) => {
        const persisted = persistedState as any;
        return {
          ...currentState,
          ...persisted,
          expandedOrgs: new Set(persisted.expandedOrgs || []),
          expandedEnvironments: new Set(persisted.expandedEnvironments || [])
        };
      }
    }
  )
);

