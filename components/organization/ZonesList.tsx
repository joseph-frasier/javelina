'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/Card';

interface Zone {
  id: string;
  name: string;
  environment_id: string;
  environment_name?: string;
  status?: 'active' | 'inactive';
  records_count?: number;
}

interface ZonesListProps {
  organizationId: string;
  zones: Zone[];
}

export function ZonesList({ organizationId, zones }: ZonesListProps) {
  const getStatusBadgeColor = (status?: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'inactive':
        return 'bg-gray-slate/10 text-gray-slate border-gray-slate/20';
      default:
        return 'bg-gray-light/10 text-gray-slate border-gray-light/20';
    }
  };

  return (
    <Card
      title="Zones"
      description="All DNS zones across environments"
    >
      {zones.length === 0 ? (
        <div className="text-center py-12">
          <svg
            className="w-16 h-16 text-gray-slate dark:text-gray-light mx-auto mb-4 opacity-50"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-gray-slate dark:text-gray-light text-sm">
            No zones yet. Add your first zone to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-3 mt-4">
          {zones.map((zone) => (
            <div
              key={zone.id}
              className="p-4 rounded-lg border border-gray-light dark:border-gray-600 hover:border-orange dark:hover:border-orange transition-colors bg-white dark:bg-gray-800"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4 flex-1 min-w-0">
                  {/* Icon */}
                  <div className="flex-shrink-0">
                    <svg
                      className="w-5 h-5 text-blue-electric"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>

                  {/* Zone Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="text-base font-bold text-orange-dark dark:text-orange truncate">
                        {zone.name}
                      </h3>
                      {zone.status && (
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full border font-medium ${getStatusBadgeColor(
                            zone.status
                          )}`}
                        >
                          {zone.status}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-4 text-xs text-gray-slate dark:text-gray-light">
                      <span className="flex items-center space-x-1">
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                        <span>{zone.records_count || 0} records</span>
                      </span>
                      {zone.environment_name && (
                        <span className="flex items-center space-x-1">
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
                            />
                          </svg>
                          <span>{zone.environment_name}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* View Button */}
                <div className="flex-shrink-0 ml-4">
                  <Link href={`/zone/${zone.id}`}>
                    <button className="px-4 py-2 text-sm font-medium text-orange hover:text-orange-dark dark:hover:text-orange border border-orange rounded-lg hover:bg-orange/5 transition-colors">
                      View →
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

