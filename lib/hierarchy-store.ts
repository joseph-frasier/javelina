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
      partialize: (state) => {
        const serialized = {
          currentOrgId: state.currentOrgId,
          expandedOrgs: Array.from(state.expandedOrgs),
        };
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/32135cbf-ee74-464b-941b-1e48a621a121',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'hierarchy-store.ts:84',message:'persist partialize (before save)',data:{serialized,localStorageBefore:typeof window !== 'undefined' ? window.localStorage.getItem('hierarchy-storage') : null},timestamp:Date.now(),sessionId:'debug-session',runId:'org-switch',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        return serialized;
      },
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
