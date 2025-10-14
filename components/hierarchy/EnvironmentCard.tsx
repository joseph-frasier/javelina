import Link from 'next/link';
import { EnvironmentDetail } from '@/lib/mock-hierarchy-data';
import { getRoleBadgeColor, getRoleDisplayText } from '@/lib/permissions';

interface EnvironmentCardProps {
  environment: EnvironmentDetail;
  orgId: string;
  showRole?: boolean;
}

export function EnvironmentCard({ environment, orgId, showRole = false }: EnvironmentCardProps) {
  return (
    <Link
      href={`/organization/${orgId}/environment/${environment.id}`}
      className="block"
    >
      <div className="bg-white dark:bg-orange-dark border border-gray-light rounded-lg p-6 hover:shadow-md transition-all hover:border-orange">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <svg
              className="w-6 h-6 text-orange"
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
            <h3 className="text-lg font-semibold text-orange-dark dark:text-white">
              {environment.name}
            </h3>
          </div>
          {showRole && (
            <span className={`px-2 py-0.5 text-xs rounded-full border ${getRoleBadgeColor(environment.role)}`}>
              {getRoleDisplayText(environment.role)}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-sm text-gray-slate">Zones</p>
            <p className="text-2xl font-bold text-orange">{environment.zones_count}</p>
          </div>
          <div>
            <p className="text-sm text-gray-slate">Records</p>
            <p className="text-2xl font-bold text-orange">{environment.total_records}</p>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-4 text-gray-slate">
            <span>{environment.queries_24h.toLocaleString()} queries/day</span>
            <span>•</span>
            <span>{environment.success_rate}% uptime</span>
          </div>
          <div className="text-orange hover:text-orange-dark flex items-center">
            <span className="mr-1">View</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
    </Link>
  );
}

