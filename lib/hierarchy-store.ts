import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// #region agent log
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === 'hierarchy-storage') {
      fetch('http://127.0.0.1:7242/ingest/32135cbf-ee74-464b-941b-1e48a621a121',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'hierarchy-store.ts:6',message:'storage event fired',data:{key:e.key,oldValue:e.oldValue,newValue:e.newValue,url:e.url},timestamp:Date.now(),sessionId:'debug-session',runId:'org-switch',hypothesisId:'D'})}).catch(()=>{});
    }
  });
}
// #endregion

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
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/32135cbf-ee74-464b-941b-1e48a621a121',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'hierarchy-store.ts:26',message:'setCurrentOrg called',data:{orgId,prevOrgId:get().currentOrgId,timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'org-switch',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        set({ 
          currentOrgId: orgId,
        });
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/32135cbf-ee74-464b-941b-1e48a621a121',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'hierarchy-store.ts:29',message:'setCurrentOrg completed',data:{newCurrentOrgId:get().currentOrgId},timestamp:Date.now(),sessionId:'debug-session',runId:'org-switch',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
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
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/32135cbf-ee74-464b-941b-1e48a621a121',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'hierarchy-store.ts:72',message:'selectAndExpand called',data:{orgId,prevOrgId:get().currentOrgId,prevExpandedOrgs:Array.from(get().expandedOrgs)},timestamp:Date.now(),sessionId:'debug-session',runId:'org-switch',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        set((state) => {
          const newExpandedOrgs = new Set([...state.expandedOrgs, orgId]);
          return {
            currentOrgId: orgId,
            expandedOrgs: newExpandedOrgs
          };
        });
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/32135cbf-ee74-464b-941b-1e48a621a121',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'hierarchy-store.ts:79',message:'selectAndExpand completed',data:{newCurrentOrgId:get().currentOrgId,newExpandedOrgs:Array.from(get().expandedOrgs)},timestamp:Date.now(),sessionId:'debug-session',runId:'org-switch',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
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
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/32135cbf-ee74-464b-941b-1e48a621a121',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'hierarchy-store.ts:89',message:'persist merge called',data:{persistedState:persisted,currentState:{currentOrgId:currentState.currentOrgId,expandedOrgs:Array.from(currentState.expandedOrgs)}},timestamp:Date.now(),sessionId:'debug-session',runId:'org-switch',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        const merged = {
          ...currentState,
          ...persisted,
          expandedOrgs: new Set(persisted.expandedOrgs || []),
        };
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/32135cbf-ee74-464b-941b-1e48a621a121',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'hierarchy-store.ts:95',message:'persist merge result',data:{mergedCurrentOrgId:merged.currentOrgId,mergedExpandedOrgs:Array.from(merged.expandedOrgs)},timestamp:Date.now(),sessionId:'debug-session',runId:'org-switch',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        return merged;
      }
    }
  )
);
