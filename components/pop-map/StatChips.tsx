import { Globe, Zap, Shield } from 'lucide-react';

interface Chip {
  icon: React.ReactNode;
  label: string;
  value: string;
}

interface StatChipsProps {
  compact?: boolean;
}

const chips: Chip[] = [
  {
    icon: <Globe className="w-4 h-4 text-orange-400" />,
    label: 'PoPs',
    value: '30 Locations',
  },
  {
    icon: <Zap className="w-4 h-4 text-orange-400" />,
    label: 'Latency',
    value: '<5ms Avg',
  },
  {
    icon: <Shield className="w-4 h-4 text-orange-400" />,
    label: 'Uptime',
    value: '99.99% SLA',
  },
];

export function StatChips({ compact = false }: StatChipsProps) {
  return (
    <div className={`flex flex-wrap gap-3 ${compact ? '' : 'justify-center'}`}>
      {chips.map((chip) => (
        <div
          key={chip.label}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm"
        >
          {chip.icon}
          <span className="text-sm text-white/60">{chip.label}:</span>
          <span className="text-sm font-semibold text-white">{chip.value}</span>
        </div>
      ))}
    </div>
  );
}
