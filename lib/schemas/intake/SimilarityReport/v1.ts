import { z } from "zod";

export const SIMILARITY_REPORT_NAME = "SimilarityReport";
export const SIMILARITY_REPORT_VERSION = 1;

// Note: Anthropic's structured-output rejects min/max numeric constraints,
// minLength/maxLength on strings, and minItems/maxItems on arrays. We keep
// the schema to types-only and rely on the system prompt + a runtime check
// in the runner to enforce range/length invariants.
export const MatchedProject = z.object({
  project_id: z.string(),
  similarity_score: z.number(),
  reasoning: z.string(),
});

export const EstimateAnchors = z.object({
  low_cents: z.number(),
  high_cents: z.number(),
  basis: z.string(),
});

// Note: Anthropic's structured-output rejects array `maxItems`/`minItems`. The
// "up to 5" cap on matched_projects is enforced by the prompt and a runtime
// length check in the runner instead of the schema.
export const SimilarityReportSchema = z.object({
  matched_projects: z.array(MatchedProject),
  reusable_components: z.array(z.string()),
  estimate_anchors: EstimateAnchors,
});

export type SimilarityReport = z.infer<typeof SimilarityReportSchema>;
export type MatchedProjectT = z.infer<typeof MatchedProject>;
