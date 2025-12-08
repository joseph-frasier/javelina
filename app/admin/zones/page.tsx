'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminProtectedRoute } from '@/components/admin/AdminProtectedRoute';
import {
  getFlaggedZones,
  approveFlaggedZone,
  renameFlaggedZone,
  deleteFlaggedZone
} from '@/lib/actions/admin/zones';
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
      const result = await getFlaggedZones();
      if (result.error) {
        addToast('error', result.error);
      } else {
        setZones(result.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch flagged zones:', error);
      addToast('error', 'Failed to fetch flagged zones');
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
      const result = await approveFlaggedZone(zoneId);
      if (result.error) {
        addToast('error', result.error);
      } else {
        addToast('success', `Zone "${zoneName}" approved successfully!`);
        fetchZones(); // Refresh the list
      }
    } catch (error) {
      console.error('Failed to approve zone:', error);
      addToast('error', 'Failed to approve zone');
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
      const result = await renameFlaggedZone(zoneId, newZoneName.trim());
      if (result.error) {
        addToast('error', result.error);
      } else {
        addToast('success', `Zone renamed to "${newZoneName}" successfully!`);
        setRenameZoneId(null);
        setNewZoneName('');
        fetchZones(); // Refresh the list
      }
    } catch (error) {
      console.error('Failed to rename zone:', error);
      addToast('error', 'Failed to rename zone');
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
      const result = await deleteFlaggedZone(zoneId);
      if (result.error) {
        addToast('error', result.error);
      } else {
        addToast('success', `Zone "${zoneName}" deleted successfully!`);
        fetchZones(); // Refresh the list
      }
    } catch (error) {
      console.error('Failed to delete zone:', error);
      addToast('error', 'Failed to delete zone');
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
      minute: '2-digit'
    });
  };

  return (
    <AdminProtectedRoute>
      <AdminLayout>
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-orange-dark">Flagged Zones</h1>
            <p className="text-gray-slate mt-2">
              Review and manage zones that have been flagged for duplicate names
            </p>
          </div>

          {/* Stats Card */}
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Total Flagged Zones</h2>
                <p className="text-3xl font-bold text-yellow-600 mt-2">
                  {loading ? '...' : zones.length}
                </p>
              </div>
              <div className="w-16 h-16 rounded-lg bg-yellow-50 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-yellow-600"
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
              </div>
            </div>
          </Card>

          {/* Zones List */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Zones Needing Review</h2>

            {loading ? (
              <div className="text-center py-12">
                <p className="text-gray-slate">Loading flagged zones...</p>
              </div>
            ) : zones.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-green-50 mx-auto flex items-center justify-center mb-4">
                  <svg
                    className="w-8 h-8 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <p className="text-gray-slate text-lg font-medium">All zones are approved!</p>
                <p className="text-gray-500 text-sm mt-2">
                  No flagged zones found. All zones have unique names.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {zones.map((zone) => (
                  <div
                    key={zone.id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-orange transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {zone.name}
                          </h3>
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded">
                            Flagged
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-1">
                          <strong>Organization:</strong> {zone.organizations?.name || 'Unknown'}
                        </p>
                        <p className="text-sm text-gray-600 mb-1">
                          <strong>Created by:</strong> {zone.created_by || 'Unknown'}
                        </p>
                        <p className="text-xs text-gray-500">
                          Created: {formatDate(zone.created_at)}
                        </p>
                      </div>
                    </div>

                    {/* Rename Input */}
                    {renameZoneId === zone.id && (
                      <div className="mb-3 p-3 bg-gray-50 rounded">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
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

                    {/* Action Buttons */}
                    <div className="flex gap-2">
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
                        variant="ghost"
                        onClick={() => handleDelete(zone.id, zone.name)}
                        disabled={processingZone === zone.id}
                        className="!text-red-600 hover:!bg-red-50"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </AdminLayout>
    </AdminProtectedRoute>
  );
}
