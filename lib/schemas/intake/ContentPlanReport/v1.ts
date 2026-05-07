import { z } from "zod";

export const CONTENT_PLAN_NAME = "ContentPlanReport";
export const CONTENT_PLAN_VERSION = 1;

const PageSection = z.object({
  type: z.string(),
  heading: z.string(),
  content: z.string(),
});

const Page = z.object({
  name: z.string(),
  sections: z.array(PageSection),
  metaTitle: z.string(),
  metaDescription: z.string(),
});

const MissingAsset = z.object({
  asset: z.string(),
  why_needed: z.string(),
  example: z.string(),
});

export const ContentPlanReportSchema = z.object({
  brandVoice: z.object({
    tone: z.string(),
    personality: z.string(),
    languageGuidelines: z.array(z.string()),
  }),
  heroSection: z.object({
    headline: z.string(),
    subheadline: z.string(),
    ctaText: z.string(),
  }),
  pages: z.array(Page),
  seoStrategy: z.object({
    primaryKeywords: z.array(z.string()),
    contentThemes: z.array(z.string()),
  }),
  missingAssets: z.array(MissingAsset),
  colorRationale: z.string(),
});

export type ContentPlanReport = z.infer<typeof ContentPlanReportSchema>;
