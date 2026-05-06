import { Layers, Globe, Server, Mail, Link2 } from 'lucide-react';
import { AdminStatusBadge } from '@/components/admin/AdminStatusBadge';
import { Tooltip } from '@/components/ui/Tooltip';
import { formatAge } from '@/app/admin/pipelines/_lib/age';
import type { ServiceKey } from '@/app/admin/pipelines/_lib/runner-registry';
import { SERVICE_LABEL } from '@/app/admin/pipelines/_lib/runner-registry';
import type { ServiceState } from '@/app/admin/pipelines/_lib/section-state';
import { SERVICE_STATE_VARIANT } from '@/app/admin/pipelines/_lib/section-state';

const SERVICE_ICON: Record<ServiceKey, React.ReactNode> = {
  foundation: <Layers className="w-4 h-4" />,
  website: <Globe className="w-4 h-4" />,
  dns: <Server className="w-4 h-4" />,
  email: <Mail className="w-4 h-4" />,
  domain: <Link2 className="w-4 h-4" />,
};

interface ServiceSectionHeaderProps {
  serviceKey: ServiceKey;
  state: ServiceState;
  progressLabel: string;
  updatedAt: { label: string; iso: string };
}

export function ServiceSectionHeader({
  serviceKey,
  state,
  progressLabel,
  updatedAt,
}: ServiceSectionHeaderProps) {
  const variant = SERVICE_STATE_VARIANT[state];
  const animate = state === 'in_progress';

  return (
    <div className="flex items-center gap-2 flex-1 min-w-0">
      {/* Icon */}
      <span className="text-text-muted flex-shrink-0">{SERVICE_ICON[serviceKey]}</span>

      {/* Service name */}
      <span className="font-semibold text-text text-sm">{SERVICE_LABEL[serviceKey]}</span>

      {/* Foundation internal tag */}
      {serviceKey === 'foundation' && (
        <span className="text-xs text-text-faint bg-surface-alt px-1.5 py-0.5 rounded hidden sm:inline">
          Internal
        </span>
      )}

      {/* Progress label */}
      {progressLabel && progressLabel !== '—' && (
        <span className="text-xs text-text-muted truncate hidden md:block">{progressLabel}</span>
      )}

      {/* Spacer */}
      <span className="flex-1" />

      {/* State badge */}
      <AdminStatusBadge
        variant={variant}
        label={state.replace(/_/g, ' ')}
        animate={animate}
      />

      {/* Timestamp */}
      <Tooltip content={`${updatedAt.label}: ${updatedAt.iso}`}>
        <span className="text-xs text-text-faint cursor-default whitespace-nowrap hidden sm:inline">
          {formatAge(updatedAt.iso)} ago
        </span>
      </Tooltip>
    </div>
  );
}
