import type { UpsellRiskReport } from '@/lib/schemas/intake';
import { GenericAgentCard } from './GenericAgentCard';

export function StrategistCard({ data }: { data: UpsellRiskReport | null }) {
  return <GenericAgentCard agentName="Strategist" field="upsell_risk_report" data={data} storageKey="pipelines.agentcard.strategist" />;
}
