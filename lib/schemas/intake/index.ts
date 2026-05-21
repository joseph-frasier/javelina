import { z } from 'zod';
import { LeadRecordSchema } from './LeadRecord/v1';
import { ResearchReportSchema } from './ResearchReport/v1';
import { SimilarityReportSchema } from './SimilarityReport/v1';
import { UpsellRiskReportSchema } from './UpsellRiskReport/v1';
import { ContentPlanReportSchema } from './ContentPlanReport/v1';
import { DesignDirectionReportSchema } from './DesignDirectionReport/v1';

export type LeadRecord = z.infer<typeof LeadRecordSchema>;
export type ResearchReport = z.infer<typeof ResearchReportSchema>;
export type SimilarityReport = z.infer<typeof SimilarityReportSchema>;
export type UpsellRiskReport = z.infer<typeof UpsellRiskReportSchema>;
export type ContentPlanReport = z.infer<typeof ContentPlanReportSchema>;
export type DesignDirectionReport = z.infer<typeof DesignDirectionReportSchema>;

export {
  LeadRecordSchema,
  ResearchReportSchema,
  SimilarityReportSchema,
  UpsellRiskReportSchema,
  ContentPlanReportSchema,
  DesignDirectionReportSchema,
};
