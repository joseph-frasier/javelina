import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface HierarchyContext {
  currentOrgId: string | null;
  expandedOrgs: Set<string>;
}

interface HierarchyState extends HierarchyContext {
  setCurrentOrg: (orgId: string | null) => void;
  getCurrentContext: () => HierarchyContext;
  clearContext: () => void;
  expandOrg: (orgId: string) => void;
  collapseOrg: (orgId: string) => void;
  toggleOrg: (orgId: string) => void;
  // Helper method to auto-expand and select when creating new items
  selectAndExpand: (orgId: string) => void;
}

export const useHierarchyStore = create<HierarchyState>()(
  persist(
    (set, get) => ({
      currentOrgId: null,
      expandedOrgs: new Set(),

      setCurrentOrg: (orgId) => {
        set({ 
          currentOrgId: orgId,
        });
      },

      getCurrentContext: () => {
        const state = get();
        return {
          currentOrgId: state.currentOrgId,
          expandedOrgs: state.expandedOrgs,
        };
      },

      clearContext: () => {
        set({
          currentOrgId: null,
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

      selectAndExpand: (orgId) => {
        set((state) => {
          const newExpandedOrgs = new Set([...state.expandedOrgs, orgId]);
          return {
            currentOrgId: orgId,
            expandedOrgs: newExpandedOrgs
          };
        });
      }
    }),
    {
      name: 'hierarchy-storage',
      partialize: (state) => ({
        currentOrgId: state.currentOrgId,
        expandedOrgs: Array.from(state.expandedOrgs),
      }),
      // Custom merge function to handle Set serialization/deserialization
      merge: (persistedState, currentState) => {
        const persisted = persistedState as any;
        return {
          ...currentState,
          ...persisted,
          expandedOrgs: new Set(persisted.expandedOrgs || []),
        };
      }
    }
  )
);
