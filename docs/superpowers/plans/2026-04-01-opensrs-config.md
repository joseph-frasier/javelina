# OpenSRS Config Admin Page — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an "OpenSRS Config" tab to the admin sidebar with a filterable transaction log showing all domain registrations, transfers, and links.

**Architecture:** New admin API endpoint (`GET /admin/domains`) in the Express backend joins `domains` with `profiles` for user info. Frontend adds a new tabbed page at `/admin/opensrs` with the transaction log as the first tab. All filtering is client-side.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS, Express, Supabase (via backend)

**Spec:** `docs/superpowers/specs/2026-04-01-opensrs-config-design.md`

---

## File Structure

### Backend (`javelina-backend`)
- **Modify:** `src/controllers/adminController.ts` — Add `listAllDomains()` handler
- **Modify:** `src/routes/admin.ts` — Add `GET /admin/domains` route

### Frontend (`javelina`)
- **Modify:** `components/admin/AdminLayout.tsx` — Add "OpenSRS Config" nav item
- **Modify:** `lib/api-client.ts` — Add `adminApi.listDomains()` method
- **Create:** `app/admin/opensrs/page.tsx` — OpenSRS Config page with tabbed layout and transaction log

---

## Task 1: Backend — Add `GET /admin/domains` endpoint

**Files:**
- Modify: `javelina-backend/src/controllers/adminController.ts`
- Modify: `javelina-backend/src/routes/admin.ts`

- [ ] **Step 1: Add the `listAllDomains` handler to adminController.ts**

Add this function at the end of the file, before the closing exports (if any). Follow the existing pattern from `listAllUsers()` (line ~59) and the batch lookup pattern from `getAllAuditLogs()` (line ~374):

```typescript
/**
 * List all domains across all users (admin only)
 */
export const listAllDomains = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const userId = req.user!.id;

  const isSuperuser = await checkSuperuser(userId);
  if (!isSuperuser) {
    throw new ForbiddenError("This endpoint requires superuser access");
  }

  const { data: domains, error } = await supabaseAdmin
    .from("domains")
    .select("id, domain_name, tld, registration_type, status, opensrs_order_id, opensrs_transfer_id, amount_paid, currency, registered_at, expires_at, years, auto_renew, user_id, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch domains: ${error.message}`);
  }

  // Batch lookup user profiles
  const userIds = [...new Set((domains || []).map((d: any) => d.user_id).filter(Boolean))];
  let profilesMap = new Map<string, { name: string; email: string }>();

  if (userIds.length > 0) {
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, name, email")
      .in("id", userIds);

    profilesMap = new Map(
      (profiles || []).map((p: any) => [p.id, { name: p.name, email: p.email }])
    );
  }

  const enrichedDomains = (domains || []).map((domain: any) => {
    const profile = profilesMap.get(domain.user_id);
    return {
      ...domain,
      user_name: profile?.name || "Unknown",
      user_email: profile?.email || "Unknown",
    };
  });

  sendSuccess(res, enrichedDomains);
};
```

- [ ] **Step 2: Add the route to admin.ts**

In `javelina-backend/src/routes/admin.ts`, add the route alongside the other GET routes. The file uses a namespace import (`import * as controller from "../controllers/adminController"`), so no import changes are needed — the new export is picked up automatically:

```typescript
// Add the route (after existing GET routes like /users, /organizations, /audit-logs):
router.get("/domains", asyncHandler(controller.listAllDomains));
```

- [ ] **Step 3: Test the endpoint manually**

Start the backend dev server and test with curl or the browser:

```bash
# From javelina-backend directory
npm run dev

# In another terminal, test (replace with valid admin session cookie):
curl -b "session=<admin-cookie>" http://localhost:3001/api/admin/domains
```

Expected: JSON response with `{ success: true, data: [...] }` containing domain objects with `user_name` and `user_email` fields.

- [ ] **Step 4: Commit backend changes**

```bash
cd /Users/sethchesky/Documents/GitHub/javelina-backend
git add src/controllers/adminController.ts src/routes/admin.ts
git commit -m "feat(admin): add GET /admin/domains endpoint for OpenSRS transaction log"
```

---

## Task 2: Frontend — Add `adminApi.listDomains()` to API client

**Files:**
- Modify: `javelina/lib/api-client.ts`

- [ ] **Step 1: Add the listDomains method to the adminApi object**

In `javelina/lib/api-client.ts`, find the `adminApi` object (starts around line 513). Add this method alongside the other admin methods (e.g., after `getAuditLogs` around line 641):

```typescript
  /**
   * List all domains across all users (admin only)
   */
  listDomains: () => {
    return apiClient.get('/admin/domains');
  },
```

- [ ] **Step 2: Commit**

```bash
cd /Users/sethchesky/Documents/GitHub/javelina
git add lib/api-client.ts
git commit -m "feat(admin): add adminApi.listDomains() method"
```

---

## Task 3: Frontend — Add "OpenSRS Config" to admin sidebar

**Files:**
- Modify: `javelina/components/admin/AdminLayout.tsx`

- [ ] **Step 1: Add the navigation item**

In `javelina/components/admin/AdminLayout.tsx`, find the `navigationItems` array (lines 16-80). Add this item at the end of the array, after the "Support Review" entry:

```typescript
    {
      href: '/admin/opensrs',
      label: 'OpenSRS Config',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
        </svg>
      ),
    },
```

This uses a globe icon consistent with the domain/DNS theme.

- [ ] **Step 2: Verify the sidebar renders correctly**

```bash
cd /Users/sethchesky/Documents/GitHub/javelina
npm run dev
```

Navigate to any admin page and confirm "OpenSRS Config" appears in the sidebar. Clicking it should navigate to `/admin/opensrs` (which will 404 until the next task).

- [ ] **Step 3: Commit**

```bash
cd /Users/sethchesky/Documents/GitHub/javelina
git add components/admin/AdminLayout.tsx
git commit -m "feat(admin): add OpenSRS Config tab to admin sidebar"
```

---

## Task 4: Frontend — Create the OpenSRS Config page with Transaction Log

**Files:**
- Create: `javelina/app/admin/opensrs/page.tsx`

- [ ] **Step 1: Create the page file**

Create `javelina/app/admin/opensrs/page.tsx` with the full page implementation. This follows the patterns from the audit logs page (filtering, search, sorting) and the settings layout (tabbed sections):

```tsx
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminProtectedRoute } from '@/components/admin/AdminProtectedRoute';
import { adminApi } from '@/lib/api-client';
import { useToastStore } from '@/lib/toast-store';

interface DomainTransaction {
  id: string;
  domain_name: string;
  tld: string;
  registration_type: string;
  status: string;
  opensrs_order_id: string | null;
  opensrs_transfer_id: string | null;
  amount_paid: number | null;
  currency: string;
  registered_at: string | null;
  expires_at: string | null;
  years: number;
  auto_renew: boolean;
  user_id: string;
  user_name: string;
  user_email: string;
  created_at: string;
}

type SortKey = 'domain_name' | 'registration_type' | 'status' | 'amount_paid' | 'expires_at' | 'registered_at' | 'user_email';
type SortDirection = 'asc' | 'desc';

const TABS = [
  { id: 'transaction-log', label: 'Transaction Log' },
] as const;

type TabId = typeof TABS[number]['id'];

function formatCurrency(amountCents: number | null, currency: string): string {
  if (amountCents === null || amountCents === undefined) return '—';
  const amount = amountCents / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function isExpiringSoon(dateStr: string | null): boolean {
  if (!dateStr) return false;
  const expires = new Date(dateStr);
  const now = new Date();
  const daysUntilExpiry = (expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  return daysUntilExpiry > 0 && daysUntilExpiry <= 30;
}

function isExpired(dateStr: string | null): boolean {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

function RegistrationTypeBadge({ type }: { type: string }) {
  const styles: Record<string, string> = {
    new: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    transfer: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    linked: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${styles[type] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
      {type}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${styles[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
      {status}
    </span>
  );
}

function SortableHeader({
  label,
  sortKey: key,
  currentSortKey,
  sortDirection,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  currentSortKey: SortKey | null;
  sortDirection: SortDirection;
  onSort: (key: SortKey) => void;
}) {
  const isActive = currentSortKey === key;
  return (
    <th
      className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-orange transition-colors select-none"
      onClick={() => onSort(key)}
    >
      <div className="flex items-center gap-1">
        {label}
        {isActive && (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            {sortDirection === 'asc' ? (
              <path d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L10 6.414l-3.293 3.293a1 1 0 01-1.414 0z" />
            ) : (
              <path d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L10 13.586l3.293-3.293a1 1 0 011.414 0z" />
            )}
          </svg>
        )}
      </div>
    </th>
  );
}

export default function AdminOpenSRSPage() {
  const [activeTab, setActiveTab] = useState<TabId>('transaction-log');
  const [domains, setDomains] = useState<DomainTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortKey, setSortKey] = useState<SortKey | null>('registered_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const { addToast } = useToastStore();

  const fetchDomains = useCallback(async () => {
    try {
      const data = await adminApi.listDomains();
      setDomains((data || []) as DomainTransaction[]);
    } catch (error: any) {
      addToast('error', error.message || 'Failed to fetch domains');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchDomains();
  }, [fetchDomains]);

  const filteredDomains = useMemo(() => {
    let filtered = domains;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((d) =>
        d.domain_name.toLowerCase().includes(query) ||
        d.user_email.toLowerCase().includes(query) ||
        d.user_name.toLowerCase().includes(query) ||
        d.opensrs_order_id?.toLowerCase().includes(query)
      );
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter((d) => d.registration_type === typeFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((d) => d.status === statusFilter);
    }

    // Sorting
    if (sortKey) {
      filtered = [...filtered].sort((a, b) => {
        let aVal: any = a[sortKey];
        let bVal: any = b[sortKey];

        // Handle nulls
        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;

        // Handle dates
        if (sortKey === 'registered_at' || sortKey === 'expires_at') {
          aVal = new Date(aVal).getTime();
          bVal = new Date(bVal).getTime();
        }

        // Handle numbers
        if (sortKey === 'amount_paid') {
          aVal = aVal || 0;
          bVal = bVal || 0;
        }

        // Handle strings
        if (typeof aVal === 'string') {
          aVal = aVal.toLowerCase();
          bVal = (bVal as string).toLowerCase();
        }

        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [domains, searchQuery, typeFilter, statusFilter, sortKey, sortDirection]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  return (
    <AdminProtectedRoute>
      <AdminLayout>
        <div className="space-y-6">
          <h1 className="text-3xl font-bold text-orange-dark dark:text-white">OpenSRS Config</h1>

          {/* Tab Navigation */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex gap-4">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-orange text-orange'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Transaction Log Tab */}
          {activeTab === 'transaction-log' && (
            <div className="space-y-4">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Search domains, users, order IDs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-orange-dark dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange focus:border-transparent"
                  />
                </div>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-orange-dark dark:text-white focus:outline-none focus:ring-2 focus:ring-orange focus:border-transparent"
                >
                  <option value="all">All Types</option>
                  <option value="new">New</option>
                  <option value="transfer">Transfer</option>
                  <option value="linked">Linked</option>
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-orange-dark dark:text-white focus:outline-none focus:ring-2 focus:ring-orange focus:border-transparent"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                </select>
              </div>

              {/* Results count */}
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {filteredDomains.length} domain{filteredDomains.length !== 1 ? 's' : ''}
                {(searchQuery || typeFilter !== 'all' || statusFilter !== 'all') && ` (filtered from ${domains.length})`}
              </p>

              {/* Table */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-900/50">
                      <tr>
                        <SortableHeader label="Domain" sortKey="domain_name" currentSortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} />
                        <SortableHeader label="Action" sortKey="registration_type" currentSortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} />
                        <SortableHeader label="Status" sortKey="status" currentSortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} />
                        <SortableHeader label="Cost" sortKey="amount_paid" currentSortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} />
                        <SortableHeader label="Valid Until" sortKey="expires_at" currentSortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} />
                        <SortableHeader label="Registered" sortKey="registered_at" currentSortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} />
                        <SortableHeader label="User" sortKey="user_email" currentSortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} />
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Order ID
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {loading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <tr key={i}>
                            {Array.from({ length: 8 }).map((_, j) => (
                              <td key={j} className="px-4 py-3">
                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                              </td>
                            ))}
                          </tr>
                        ))
                      ) : filteredDomains.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                            {domains.length === 0 ? 'No domains found.' : 'No domains match your filters.'}
                          </td>
                        </tr>
                      ) : (
                        filteredDomains.map((domain) => (
                          <tr key={domain.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                            <td className="px-4 py-3 text-sm font-medium text-orange-dark dark:text-white">
                              {domain.domain_name}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <RegistrationTypeBadge type={domain.registration_type} />
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <StatusBadge status={domain.status} />
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                              {formatCurrency(domain.amount_paid, domain.currency)}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <span
                                className={
                                  isExpired(domain.expires_at)
                                    ? 'text-red-600 dark:text-red-400 font-medium'
                                    : isExpiringSoon(domain.expires_at)
                                    ? 'text-yellow-600 dark:text-yellow-400 font-medium'
                                    : 'text-gray-700 dark:text-gray-300'
                                }
                              >
                                {formatDate(domain.expires_at)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                              {formatDate(domain.registered_at)}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                              <div>{domain.user_name}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">{domain.user_email}</div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 font-mono text-xs">
                              {domain.opensrs_order_id || '—'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </AdminLayout>
    </AdminProtectedRoute>
  );
}
```

- [ ] **Step 2: Verify the page renders**

```bash
cd /Users/sethchesky/Documents/GitHub/javelina
npm run dev
```

Navigate to `/admin/opensrs`. Confirm:
- Page loads with "OpenSRS Config" heading
- "Transaction Log" tab is shown and active
- Search input, type dropdown, and status dropdown render
- Table shows domain data with all columns
- Sorting works on each column header
- Filters narrow results correctly
- Skeleton loading shows while fetching
- Empty state shows if no results
- Expiring-soon dates highlight in yellow, expired in red
- Dark mode works correctly

- [ ] **Step 3: Commit**

```bash
cd /Users/sethchesky/Documents/GitHub/javelina
git add app/admin/opensrs/page.tsx
git commit -m "feat(admin): add OpenSRS Config page with domain transaction log"
```

---

## Task 5: Verify end-to-end

- [ ] **Step 1: Ensure both repos are running**

```bash
# Terminal 1 - backend
cd /Users/sethchesky/Documents/GitHub/javelina-backend
npm run dev

# Terminal 2 - frontend
cd /Users/sethchesky/Documents/GitHub/javelina
npm run dev
```

- [ ] **Step 2: End-to-end verification**

1. Log in as admin at `/admin/login`
2. Confirm "OpenSRS Config" appears in the sidebar with a globe icon
3. Click it — navigates to `/admin/opensrs`
4. Confirm transaction log table loads with domain data
5. Test search: type a domain name — table filters
6. Test type filter: select "New" — only new registrations shown
7. Test status filter: select "Active" — only active domains shown
8. Test sorting: click "Cost" header — toggles sort direction
9. Test dark mode toggle — all elements render correctly
10. Test mobile responsive — sidebar collapses, table scrolls horizontally

- [ ] **Step 3: Final commit (if any fixes needed)**

```bash
# If adjustments were needed, commit them
git add -A
git commit -m "fix(admin): polish OpenSRS Config page"
```
