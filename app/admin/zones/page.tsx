'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminProtectedRoute } from '@/components/admin/AdminProtectedRoute';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminStatCard } from '@/components/admin/AdminStatCard';
import { AdminStatusBadge } from '@/components/admin/AdminStatusBadge';
import { adminApi } from '@/lib/api-client';
import { useToastStore } from '@/lib/toast-store';

interface FlaggedZone {
  id: string;
  name: string;
  created_at: string;
  created_by: string;
  organization_id: string;
  organizations: {
    id: string;
    name: string;
  };
}

export default function AdminZonesPage() {
  const { addToast } = useToastStore();
  const [zones, setZones] = useState<FlaggedZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingZone, setProcessingZone] = useState<string | null>(null);
  const [renameZoneId, setRenameZoneId] = useState<string | null>(null);
  const [newZoneName, setNewZoneName] = useState('');

  const fetchZones = async () => {
    setLoading(true);
    try {
      const data = await adminApi.getFlaggedZones();
      setZones(data || []);
    } catch (error) {
      console.error('Failed to fetch flagged zones:', error);
      addToast('error', error instanceof Error ? error.message : 'Failed to fetch flagged zones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchZones();
  }, []);

  const handleApprove = async (zoneId: string, zoneName: string) => {
    setProcessingZone(zoneId);
    try {
      await adminApi.approveFlaggedZone(zoneId);
      addToast('success', `Zone "${zoneName}" approved successfully!`);
      fetchZones();
    } catch (error) {
      console.error('Failed to approve zone:', error);
      addToast('error', error instanceof Error ? error.message : 'Failed to approve zone');
    } finally {
      setProcessingZone(null);
    }
  };

  const handleRename = async (zoneId: string) => {
    if (!newZoneName.trim()) {
      addToast('error', 'Please enter a new zone name');
      return;
    }

    setProcessingZone(zoneId);
    try {
      await adminApi.renameFlaggedZone(zoneId, newZoneName.trim());
      addToast('success', `Zone renamed to "${newZoneName}" successfully!`);
      setRenameZoneId(null);
      setNewZoneName('');
      fetchZones();
    } catch (error) {
      console.error('Failed to rename zone:', error);
      addToast('error', error instanceof Error ? error.message : 'Failed to rename zone');
    } finally {
      setProcessingZone(null);
    }
  };

  const handleDelete = async (zoneId: string, zoneName: string) => {
    if (!confirm(`Are you sure you want to delete the zone "${zoneName}"? This action will archive the zone.`)) {
      return;
    }

    setProcessingZone(zoneId);
    try {
      await adminApi.deleteFlaggedZone(zoneId);
      addToast('success', `Zone "${zoneName}" deleted successfully!`);
      fetchZones();
    } catch (error) {
      console.error('Failed to delete zone:', error);
      addToast('error', error instanceof Error ? error.message : 'Failed to delete zone');
    } finally {
      setProcessingZone(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <AdminProtectedRoute>
      <AdminLayout>
        <AdminPageHeader
          title="Flagged Zones"
          subtitle="Review and manage zones that have been flagged for duplicate names"
        />

        <div className="mb-6">
          <AdminStatCard
            label="Total Flagged Zones"
            tone="warning"
            value={loading ? '…' : zones.length}
            icon={
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            }
          />
        </div>

        <Card title="Zones Needing Review" description="Approve, rename, or delete each flagged zone">
          {loading ? (
            <div className="py-12 text-center">
              <p className="text-text-muted">Loading flagged zones...</p>
            </div>
          ) : zones.length === 0 ? (
            <div className="py-12 flex items-center justify-center border border-border rounded-lg">
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-green-500/10 dark:bg-green-500/15 mx-auto flex items-center justify-center mb-3">
                  <svg
                    className="w-6 h-6 text-green-600 dark:text-green-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-text font-medium">All zones are approved!</p>
                <p className="text-text-muted text-sm mt-1">
                  No flagged zones found. All zones have unique names.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {zones.map((zone) => (
                <div
                  key={zone.id}
                  className="rounded-lg border border-border bg-surface p-4 transition-colors hover:border-accent/50"
                >
                  <div className="flex items-start justify-between mb-3 gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h3 className="text-lg font-semibold text-text break-all">
                          {zone.name}
                        </h3>
                        <AdminStatusBadge variant="warning" label="Flagged" dot={false} />
                      </div>
                      <p className="text-sm text-text-muted mb-1">
                        <strong className="text-text">Organization:</strong>{' '}
                        {zone.organizations?.name || 'Unknown'}
                      </p>
                      <p className="text-sm text-text-muted mb-1">
                        <strong className="text-text">Created by:</strong>{' '}
                        {zone.created_by || 'Unknown'}
                      </p>
                      <p className="text-xs text-text-faint">
                        Created: {formatDate(zone.created_at)}
                      </p>
                    </div>
                  </div>

                  {renameZoneId === zone.id && (
                    <div className="mb-3 p-3 bg-surface-alt rounded-md border border-border">
                      <label className="block text-sm font-medium text-text mb-2">
                        New Zone Name
                      </label>
                      <Input
                        type="text"
                        value={newZoneName}
                        onChange={(e) => setNewZoneName(e.target.value)}
                        placeholder="Enter new zone name"
                        className="mb-2"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => handleRename(zone.id)}
                          disabled={processingZone === zone.id || !newZoneName.trim()}
                        >
                          {processingZone === zone.id ? 'Saving...' : 'Save'}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setRenameZoneId(null);
                            setNewZoneName('');
                          }}
                          disabled={processingZone === zone.id}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 flex-wrap">
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => handleApprove(zone.id, zone.name)}
                      disabled={processingZone === zone.id}
                      className="!bg-green-600 hover:!bg-green-700"
                    >
                      {processingZone === zone.id ? 'Processing...' : 'Approve'}
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setRenameZoneId(zone.id);
                        setNewZoneName(zone.name);
                      }}
                      disabled={processingZone === zone.id || renameZoneId === zone.id}
                    >
                      Rename
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleDelete(zone.id, zone.name)}
                      disabled={processingZone === zone.id}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </AdminLayout>
    </AdminProtectedRoute>
  );
}
