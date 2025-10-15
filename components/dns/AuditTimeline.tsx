'use client';

import { useState } from 'react';
import { AuditLog, formatRelativeTime } from '@/lib/mock-dns-data';
import Dropdown from '@/components/ui/Dropdown';

interface AuditTimelineProps {
  auditLogs: AuditLog[];
  onDiffClick: (log: AuditLog) => void;
}

export function AuditTimeline({ auditLogs, onDiffClick }: AuditTimelineProps) {
  const [filterAction, setFilterAction] = useState<string>('all');
  const [filterUser, setFilterUser] = useState<string>('all');

  // Get unique users
  const uniqueUsers = Array.from(new Set(auditLogs.map(log => log.user_email)));

  // Filter logs
  const filteredLogs = auditLogs.filter(log => {
    if (filterAction !== 'all' && log.action !== filterAction) return false;
    if (filterUser !== 'all' && log.user_email !== filterUser) return false;
    return true;
  });

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'INSERT':
        return (
          <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
          </svg>
        );
      case 'UPDATE':
        return (
          <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
          </svg>
        );
      case 'DELETE':
        return (
          <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      default:
        return null;
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'INSERT':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'UPDATE':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'DELETE':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const actionOptions = [
    { value: 'all', label: 'All Actions' },
    { value: 'INSERT', label: 'Create' },
    { value: 'UPDATE', label: 'Update' },
    { value: 'DELETE', label: 'Delete' },
  ];

  const userOptions = [
    { value: 'all', label: 'All Users' },
    ...uniqueUsers.map(email => ({ value: email, label: email })),
  ];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center space-x-4 pb-4 border-b border-gray-light">
        <div className="flex-1">
          <Dropdown
            label="Filter by Action"
            value={filterAction}
            onChange={setFilterAction}
            options={actionOptions}
          />
        </div>
        <div className="flex-1">
          <Dropdown
            label="Filter by User"
            value={filterUser}
            onChange={setFilterUser}
            options={userOptions}
          />
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {filteredLogs.length === 0 ? (
          <div className="text-center py-8">
            <svg className="mx-auto h-12 w-12 text-gray-slate" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-orange-dark">No changes found</h3>
            <p className="mt-1 text-sm text-gray-slate">
              Try adjusting your filters
            </p>
          </div>
        ) : (
          filteredLogs.map((log, index) => (
            <div
              key={log.id}
              className="flex items-start space-x-3 p-3 rounded-lg border border-gray-light hover:bg-gray-light/30 transition-colors group"
            >
              {/* Icon */}
              <div className="flex-shrink-0 mt-0.5">
                {getActionIcon(log.action)}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getActionBadge(log.action)}`}>
                        {log.action === 'INSERT' && 'Created'}
                        {log.action === 'UPDATE' && 'Updated'}
                        {log.action === 'DELETE' && 'Deleted'}
                      </span>
                      <span className="text-xs text-gray-slate">
                        {formatRelativeTime(log.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-slate">
                      <span className="font-medium text-orange-dark">{log.user_name}</span>
                      {' '}
                      {log.action === 'INSERT' && 'created a record'}
                      {log.action === 'UPDATE' && 'updated a record'}
                      {log.action === 'DELETE' && 'deleted a record'}
                    </p>
                    <p className="text-xs text-gray-slate mt-1">
                      {log.user_email}
                      {log.ip_address && ` • ${log.ip_address}`}
                    </p>
                  </div>
                  
                  {/* View Diff Button */}
                  <button
                    onClick={() => onDiffClick(log)}
                    className="ml-2 px-3 py-1 text-xs font-medium text-orange hover:text-orange-dark hover:bg-orange-light/20 rounded transition-colors opacity-0 group-hover:opacity-100"
                  >
                    View Diff
                  </button>
                </div>

                {/* Quick preview of changes */}
                {log.action === 'UPDATE' && log.old_data && log.new_data && (
                  <div className="mt-2 text-xs font-mono text-gray-slate bg-gray-50 p-2 rounded">
                    {Object.keys(log.new_data).filter(key => 
                      JSON.stringify(log.old_data[key]) !== JSON.stringify(log.new_data[key])
                    ).map(key => (
                      <div key={key} className="truncate">
                        <span className="text-red-600">- {key}: {JSON.stringify(log.old_data[key])}</span>
                        <br />
                        <span className="text-green-600">+ {key}: {JSON.stringify(log.new_data[key])}</span>
                      </div>
                    )).slice(0, 2)}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Summary */}
      {filteredLogs.length > 0 && (
        <div className="pt-3 border-t border-gray-light text-xs text-gray-slate text-center">
          Showing {filteredLogs.length} of {auditLogs.length} changes
        </div>
      )}
    </div>
  );
}

