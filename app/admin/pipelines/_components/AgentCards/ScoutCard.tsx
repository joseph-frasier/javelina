import type { ResearchReport } from '@/lib/schemas/intake';
import { GenericAgentCard } from './GenericAgentCard';

export function ScoutCard({ data }: { data: ResearchReport | null }) {
  return <GenericAgentCard agentName="Scout" field="research_report" data={data} />;
}
