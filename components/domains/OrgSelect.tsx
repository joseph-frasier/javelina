'use client';

import type { RBACRole } from '@/lib/stores/auth-store';

interface OrgOption {
  id: string;
  name: string;
  role: RBACRole;
}

interface OrgSelectProps {
  value: string;
  onChange: (orgId: string) => void;
  orgs: OrgOption[];
}

export default function OrgSelect({ value, onChange, orgs }: OrgSelectProps) {
  if (orgs.length < 2) return null;

  return (
    <label className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
      <span>Organization</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-border bg-transparent px-2 py-1 text-sm text-text"
      >
        {orgs.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
    </label>
  );
}
