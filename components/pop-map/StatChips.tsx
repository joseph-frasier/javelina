import { Globe, Zap, Shield } from 'lucide-react';
import { POPS } from './popData';

interface Chip {
  icon: React.ReactNode;
  label: string;
  value: string;
}

interface StatChipsProps {
  compact?: boolean;
}

const activePoPCount = POPS.filter((pop) => !pop.comingSoon).length;

const chips: Chip[] = [
  {
    icon: <Globe className="w-4 h-4 text-orange-400" />,
    label: 'PoPs',
    value: `${activePoPCount} Active`,
  },
  {
    icon: <Zap className="w-4 h-4 text-orange-400" />,
    label: 'Latency',
    value: 'Low',
  },
  {
    icon: <Shield className="w-4 h-4 text-orange-400" />,
    label: 'Uptime',
    value: 'Enterprise SLA',
  },
];

export function StatChips({ compact = false }: StatChipsProps) {
  return (
    <div className={`flex flex-wrap gap-3 ${compact ? '' : 'justify-center'}`}>
      {chips.map((chip) => (
        <div
          key={chip.label}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-surface/5 border border-white/10"
        >
          {chip.icon}
          <span className="text-sm text-white/60">{chip.label}:</span>
          <span className="text-sm font-semibold text-white">{chip.value}</span>
        </div>
      ))}
    </div>
  );
}
