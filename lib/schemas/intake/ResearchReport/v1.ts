import { z } from "zod";

export const RESEARCH_REPORT_NAME = "ResearchReport";
export const RESEARCH_REPORT_VERSION = 1;

export const ResearchReportSchema = z.object({
  company_overview: z.object({
    summary: z.string(),
    likely_size: z.string(),
    target_audience: z.string(),
    differentiators: z.array(z.string()),
  }),
  tech_stack_signals: z.object({
    likely_current_stack: z.array(z.string()),
    inferred_from: z.string(),
    confidence: z.string(),
  }),
  growth_signals: z.array(
    z.object({
      signal: z.string(),
      interpretation: z.string(),
    }),
  ),
  risk_flags: z.array(
    z.object({
      risk: z.string(),
      severity: z.string(),
      mitigation: z.string(),
    }),
  ),
  competitor_notes: z.array(
    z.object({
      competitor_type: z.string(),
      observation: z.string(),
    }),
  ),
});

export type ResearchReport = z.infer<typeof ResearchReportSchema>;
