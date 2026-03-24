// ──────────────────────────────────────────────
// Domain Registration Types
// ──────────────────────────────────────────────

export type DomainStatus =
  | "pending"
  | "processing"
  | "active"
  | "expired"
  | "transferring"
  | "transfer_complete"
  | "failed"
  | "cancelled";

export type DomainRegistrationType = "new" | "transfer" | "linked";

export type DomainAvailability =
  | "available"
  | "taken"
  | "in_progress"
  | "undetermined"
  | "justsold";

export interface DomainContact {
  first_name: string;
  last_name: string;
  org_name?: string;
  email: string;
  phone: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

export interface DomainPricing {
  price: number;
  currency: string;
  tld: string;
}

export interface DomainSearchResult {
  domain: string;
  status: DomainAvailability;
  price?: string;
  pricing: DomainPricing | null;
}

export interface DomainSearchResponse {
  lookup: DomainSearchResult[];
  suggestions: DomainSearchResult[];
  supported_tlds: string[];
}

export interface DomainPricingResponse {
  domain: string;
  available: boolean;
  pricing: DomainPricing;
}

export interface DomainCheckoutParams {
  domain: string;
  years?: number;
  contact_info: DomainContact;
  registration_type?: DomainRegistrationType;
  auth_code?: string;
}

export interface DomainCheckoutResponse {
  checkout_url: string;
  session_id: string;
  domain_record_id: string;
}

export interface DomainTransferCheckResponse {
  domain: string;
  transferable: boolean;
  reason?: string;
  status?: string;
  pricing: DomainPricing | null;
}

export interface DomainTransferStatusResponse {
  id: string;
  domain_name: string;
  status: DomainStatus;
  opensrs_status?: string;
  created_at: string;
  updated_at: string;
}

export interface Domain {
  id: string;
  user_id: string;
  domain_name: string;
  tld: string;
  status: DomainStatus;
  registration_type: DomainRegistrationType;
  opensrs_order_id?: string;
  opensrs_transfer_id?: string;
  registered_at?: string;
  expires_at?: string;
  years: number;
  auto_renew: boolean;
  stripe_checkout_session_id?: string;
  stripe_payment_intent_id?: string;
  amount_paid?: number;
  currency: string;
  contact_info?: DomainContact;
  nameservers?: Array<{ name: string; sortorder: number }>;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface DomainsListResponse {
  domains: Domain[];
}

export interface DomainDetailResponse {
  domain: Domain;
}

export interface DomainManagementResponse {
  domain: Domain;
  live: {
    expiry_date?: string;
    registered_date?: string;
    nameservers?: string[];
    contact_info?: Record<string, any>;
  };
  zone: {
    id: string;
    name: string;
    organization_id: string;
    organization_name: string;
  } | null;
}
