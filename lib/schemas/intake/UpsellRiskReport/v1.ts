import { z } from "zod";

export const UPSELL_RISK_NAME = "UpsellRiskReport";
export const UPSELL_RISK_VERSION = 1;

export const UpsellRiskReportSchema = z.object({
  upsell_opportunities: z.array(
    z.object({
      opportunity: z.string(),
      rationale: z.string(),
      estimated_revenue_band: z.string(),
      when_to_pitch: z.string(),
    }),
  ),
  risk_inventory: z.array(
    z.object({
      risk: z.string(),
      likelihood: z.string(),
      impact: z.string(),
      mitigation: z.string(),
    }),
  ),
  recommended_package_adjustments: z.array(z.string()),
});

export type UpsellRiskReport = z.infer<typeof UpsellRiskReportSchema>;
