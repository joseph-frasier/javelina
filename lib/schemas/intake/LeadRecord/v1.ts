import { z } from "zod";

export const LEAD_RECORD_NAME = "LeadRecord";
export const LEAD_RECORD_VERSION = 1;

const ColorRef = z.object({
  hex: z.string(),
  name: z.string(),
});

const Service = z.object({
  name: z.string(),
  description: z.string(),
  keywords: z.array(z.string()),
});

export const LeadRecordSchema = z.object({
  client: z.object({
    name: z.string(),
    businessName: z.string(),
    email: z.string(),
    phone: z.string(),
    industry: z.string(),
    industryCategory: z.string(),
    location: z.string(),
  }),
  brand: z.object({
    tagline: z.string(),
    tone: z.array(z.string()),
    voiceGuidelines: z.string(),
    colors: z.object({
      primary: ColorRef,
      secondary: ColorRef,
    }),
  }),
  services: z.array(Service),
  seo: z.object({
    primaryKeywords: z.array(z.string()),
    secondaryKeywords: z.array(z.string()),
    metaDescription: z.string(),
  }),
  businessDetails: z.object({
    yearsInBusiness: z.string(),
    serviceArea: z.string(),
    uniqueSellingPoints: z.array(z.string()),
  }),
});

export type LeadRecord = z.infer<typeof LeadRecordSchema>;
