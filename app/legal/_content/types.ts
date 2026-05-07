import type { ReactNode } from "react";

export interface LegalSection {
  slug: string;
  title: string;
  body: ReactNode;
}

export interface LegalDocumentMeta {
  title: string;
  version: string;
  lastUpdated: string;
  sections: LegalSection[];
}
