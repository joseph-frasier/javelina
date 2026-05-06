'use client';

import { useState } from 'react';
import { CollapsibleCard } from '@/components/ui/CollapsibleCard';

interface Props {
  agentName: string;
  field: string;
  data: unknown;
  storageKey: string;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function ValueNode({ value, depth }: { value: unknown; depth: number }) {
  if (value === null || value === undefined) {
    return <span className="text-text-faint italic">—</span>;
  }
  if (typeof value === 'string') {
    return <span className="text-sm text-text break-words">{value}</span>;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return <span className="text-sm text-text">{String(value)}</span>;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-text-faint italic">empty</span>;
    return (
      <ul className="list-disc list-inside space-y-1">
        {value.map((item, i) => (
          <li key={i} className="text-sm">
            <ValueNode value={item} depth={depth + 1} />
          </li>
        ))}
      </ul>
    );
  }
  if (isPlainObject(value)) {
    return <ObjectNode obj={value} depth={depth + 1} />;
  }
  return <span className="text-sm text-text">{String(value)}</span>;
}

function ObjectNode({ obj, depth }: { obj: Record<string, unknown>; depth: number }) {
  return (
    <dl className={depth === 0 ? 'space-y-3' : 'space-y-2 pl-4 border-l border-border'}>
      {Object.entries(obj).map(([k, v]) => (
        <div key={k}>
          <dt className="text-xs font-medium uppercase tracking-wide text-text-muted">{k}</dt>
          <dd className="mt-1"><ValueNode value={v} depth={depth} /></dd>
        </div>
      ))}
    </dl>
  );
}

export function GenericAgentCard({ agentName, field, data, storageKey }: Props) {
  const [showRaw, setShowRaw] = useState(false);
  return (
    <CollapsibleCard title={agentName} storageKey={storageKey}>
      <div className="text-xs text-text-muted mb-3 font-mono">{field}</div>
      {data === null ? (
        <p className="text-sm text-text-muted italic">Not yet generated</p>
      ) : isPlainObject(data) ? (
        <ObjectNode obj={data} depth={0} />
      ) : (
        <pre className="text-xs">{JSON.stringify(data, null, 2)}</pre>
      )}
      {data !== null && (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setShowRaw((v) => !v)}
            className="text-xs text-text-muted underline"
          >
            {showRaw ? 'Hide raw JSON' : 'View raw JSON'}
          </button>
          {showRaw && (
            <pre className="mt-2 p-3 bg-surface-alt rounded text-xs overflow-auto max-h-80">
              {JSON.stringify(data, null, 2)}
            </pre>
          )}
        </div>
      )}
    </CollapsibleCard>
  );
}
