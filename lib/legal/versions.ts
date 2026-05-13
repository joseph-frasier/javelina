// Single source of truth for legal document versions on the frontend.
// Must match javelina-backend/src/lib/legalVersions.ts — CI parity check enforces this.

export const CURRENT_VERSIONS = {
  terms_of_service: "v1.0.0",
  privacy_policy: "v1.0.0",
  acceptable_use: "v1.0.0",
} as const;

export type DocumentType = keyof typeof CURRENT_VERSIONS;

export const CURRENT_TOS_VERSION = CURRENT_VERSIONS.terms_of_service;
export const CURRENT_PRIVACY_VERSION = CURRENT_VERSIONS.privacy_policy;
export const CURRENT_AUP_VERSION = CURRENT_VERSIONS.acceptable_use;
