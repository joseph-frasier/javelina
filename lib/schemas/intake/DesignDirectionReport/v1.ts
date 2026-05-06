import { z } from "zod";

export const DESIGN_DIRECTION_NAME = "DesignDirectionReport";
export const DESIGN_DIRECTION_VERSION = 1;

const ColorToken = z.object({
  role: z.string(),
  hex: z.string(),
  name: z.string(),
  usage: z.string(),
});

const LayoutSection = z.object({
  name: z.string(),
  type: z.string(),
  columns: z.number(),
});

export const DesignDirectionReportSchema = z.object({
  colors: z.array(ColorToken),
  typography: z.object({
    headingFont: z.string(),
    bodyFont: z.string(),
    headingWeight: z.string(),
    bodyWeight: z.string(),
  }),
  layout: z.object({
    maxWidth: z.string(),
    sections: z.array(LayoutSection),
  }),
  spacing: z.object({
    sectionPadding: z.string(),
    componentGap: z.string(),
  }),
});

export type DesignDirectionReport = z.infer<typeof DesignDirectionReportSchema>;
