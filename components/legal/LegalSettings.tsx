"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { useAuthStore } from "@/lib/auth-store";
import { CURRENT_TOS_VERSION } from "@/lib/legal/versions";

interface AcceptanceRow {
  id: string;
  document_type: string;
  document_version: string;
  accepted_at: string;
  context: string;
  ip_address: string | null;
}

const formatDateTime = (iso: string | null) => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
};

const documentLabel: Record<string, string> = {
  terms_of_service: "Terms of Service",
  privacy_policy: "Privacy Policy",
  acceptable_use: "Acceptable Use Policy",
};

export function LegalSettings() {
  const user = useAuthStore((s) => s.user);
  const [history, setHistory] = useState<AcceptanceRow[] | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  useEffect(() => {
    if (!historyOpen || history !== null) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/backend/legal/history", {
          credentials: "include",
        });
        if (!res.ok) {
          throw new Error(`Request failed (${res.status})`);
        }
        const json = await res.json();
        if (!cancelled) setHistory(json.data ?? []);
      } catch (e) {
        if (!cancelled)
          setHistoryError(
            e instanceof Error ? e.message : "Failed to load history."
          );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [historyOpen, history]);

  const accepted = user?.tos_version_accepted ?? null;
  const acceptedAt = user?.tos_accepted_at ?? null;
  const isCurrent = accepted === CURRENT_TOS_VERSION;

  return (
    <div className="space-y-6">
      <Card className="p-4 sm:p-6">
        <h2 className="text-xl font-semibold text-text mb-1">Legal</h2>
        <p className="text-sm text-text-muted mb-6">
          Your acceptance status and links to the current legal documents.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-lg border border-border bg-surface-alt p-4">
            <p className="text-xs uppercase tracking-wide text-text-muted">
              Terms of Service accepted
            </p>
            <p className="mt-1 text-sm text-text">
              {accepted ? (
                <>
                  <span className="font-mono">{accepted}</span>
                  {!isCurrent && (
                    <span className="ml-2 text-xs text-amber-500">
                      (out of date — current is {CURRENT_TOS_VERSION})
                    </span>
                  )}
                </>
              ) : (
                <span className="text-text-muted">Not yet accepted</span>
              )}
            </p>
            <p className="mt-1 text-xs text-text-muted">
              {formatDateTime(acceptedAt)}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-surface-alt p-4">
            <p className="text-xs uppercase tracking-wide text-text-muted">
              Documents
            </p>
            <ul className="mt-1 space-y-1 text-sm">
              <li>
                <Link
                  href="/legal/terms-of-service"
                  className="text-accent hover:underline"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link
                  href="/legal/privacy-policy"
                  className="text-accent hover:underline"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/legal/acceptable-use"
                  className="text-accent hover:underline"
                >
                  Acceptable Use Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-6">
          <button
            type="button"
            onClick={() => setHistoryOpen((v) => !v)}
            className="text-sm text-accent hover:underline"
          >
            {historyOpen ? "Hide acceptance history" : "View acceptance history"}
          </button>
        </div>

        {historyOpen && (
          <div className="mt-4">
            {historyError && (
              <p className="text-sm text-danger">{historyError}</p>
            )}
            {!historyError && history === null && (
              <p className="text-sm text-text-muted">Loading…</p>
            )}
            {history && history.length === 0 && (
              <p className="text-sm text-text-muted">
                No acceptances on file yet.
              </p>
            )}
            {history && history.length > 0 && (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="min-w-full text-sm">
                  <thead className="bg-surface-alt text-left text-xs uppercase tracking-wide text-text-muted">
                    <tr>
                      <th className="px-3 py-2">Document</th>
                      <th className="px-3 py-2">Version</th>
                      <th className="px-3 py-2">Accepted at</th>
                      <th className="px-3 py-2">Context</th>
                      <th className="px-3 py-2">IP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((row) => (
                      <tr
                        key={row.id}
                        className="border-t border-border bg-surface"
                      >
                        <td className="px-3 py-2 text-text">
                          {documentLabel[row.document_type] ?? row.document_type}
                        </td>
                        <td className="px-3 py-2 font-mono text-text">
                          {row.document_version}
                        </td>
                        <td className="px-3 py-2 text-text-muted">
                          {formatDateTime(row.accepted_at)}
                        </td>
                        <td className="px-3 py-2 text-text-muted">
                          {row.context}
                        </td>
                        <td className="px-3 py-2 font-mono text-text-muted">
                          {row.ip_address ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
