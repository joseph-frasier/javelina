'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/Card';

interface Environment {
  id: string;
  name: string;
  organization_id: string;
  environment_type?: 'production' | 'staging' | 'development';
  status?: 'active' | 'disabled' | 'archived';
  zones_count?: number;
  total_records?: number;
}

interface EnvironmentsListProps {
  organizationId: string;
  environments: Environment[];
}

export function EnvironmentsList({ organizationId, environments }: EnvironmentsListProps) {
  const getEnvironmentIcon = (type?: string) => {
    switch (type) {
      case 'production':
        return (
          <svg
            className="w-5 h-5 text-orange"
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
        );
      case 'staging':
        return (
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
              d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
            />
          </svg>
        );
      default:
        return (
          <svg
            className="w-5 h-5 text-gray-slate"
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
        );
    }
  };

  const getEnvironmentBadgeColor = (type?: string) => {
    switch (type) {
      case 'production':
        return 'bg-orange/10 text-orange border-orange/20';
      case 'staging':
        return 'bg-blue-electric/10 text-blue-electric border-blue-electric/20';
      case 'development':
        return 'bg-gray-slate/10 text-gray-slate border-gray-slate/20';
      default:
        return 'bg-gray-light/10 text-gray-slate border-gray-light/20';
    }
  };

  if (environments.length === 0) {
    return (
      <Card>
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
              d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
            />
          </svg>
          <p className="text-gray-slate dark:text-gray-light text-sm">
            No environments yet. Add your first environment to get started.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {environments.map((env) => (
        <Card key={env.id} className="hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 flex-1 min-w-0">
              {/* Icon */}
              <div className="flex-shrink-0">
                {getEnvironmentIcon(env.environment_type)}
              </div>

              {/* Environment Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <h3 className="text-base font-bold text-orange-dark dark:text-orange truncate">
                    {env.name}
                  </h3>
                  {env.environment_type && (
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full border font-medium ${getEnvironmentBadgeColor(
                        env.environment_type
                      )}`}
                    >
                      {env.environment_type}
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
                        d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span>{env.zones_count || 0} zones</span>
                  </span>
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
                    <span>{env.total_records || 0} records</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    <span>0% uptime</span>
                  </span>
                </div>
              </div>
            </div>

            {/* View Button */}
            <div className="flex-shrink-0 ml-4">
              <Link
                href={`/organization/${organizationId}/environment/${env.id}`}
              >
                <button className="px-4 py-2 text-sm font-medium text-orange hover:text-orange-dark dark:hover:text-orange border border-orange rounded-lg hover:bg-orange/5 transition-colors">
                  View →
                </button>
              </Link>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

