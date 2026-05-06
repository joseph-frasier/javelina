import type { SimilarityReport } from '@/lib/schemas/intake';
import { GenericAgentCard } from './GenericAgentCard';

export function MatchmakerCard({ data }: { data: SimilarityReport | null }) {
  return <GenericAgentCard agentName="Matchmaker" field="similarity_report" data={data} storageKey="pipelines.agentcard.matchmaker" />;
}
