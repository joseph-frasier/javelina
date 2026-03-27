export type CertificateStatus =
  | "pending"
  | "processing"
  | "awaiting_approval"
  | "in_progress"
  | "active"
  | "expired"
  | "cancelled"
  | "declined"
  | "failed"
  | "renewing";

export type CertificateRegType = "new" | "renew" | "upgrade";
export type DvAuthMethod = "email" | "dns" | "file";

export interface CertificateContact {
  first_name: string;
  last_name: string;
  org_name: string;
  email: string;
  phone: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  title?: string;
}

export interface SslProduct {
  product_type: string;
  display_name: string;
  validation_level: "dv" | "ov" | "ev";
  wildcard: boolean;
  san: boolean;
  price: number;
  currency: string;
}

export interface SslCertificate {
  id: string;
  user_id: string;
  domain: string;
  product_type: string;
  status: CertificateStatus;
  reg_type: CertificateRegType;
  opensrs_order_id?: string;
  opensrs_product_id?: string;
  csr?: string;
  certificate?: string;
  ca_certificates?: string;
  dv_auth_method?: DvAuthMethod;
  dv_auth_details?: Record<string, any>;
  approver_email?: string;
  contact_info?: CertificateContact;
  server_type?: string;
  issued_at?: string;
  expires_at?: string;
  period: number;
  amount_paid?: number;
  currency: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface SslCheckoutParams {
  domain: string;
  product_type: string;
  csr: string;
  contact_info: CertificateContact;
  dv_auth_method?: DvAuthMethod;
  approver_email?: string;
  server_type?: string;
  additional_domains?: string[];
  reg_type?: CertificateRegType;
}

export interface SslCheckoutResponse {
  checkout_url: string;
  session_id: string;
  certificate_record_id: string;
}

export interface ApproverInfo {
  domain: string;
  email: string;
  type: "generic" | "manual";
}

export interface CertificateDetailResponse {
  certificate: SslCertificate;
  live: {
    certificate?: string;
    ca_certificates?: string;
    state?: string;
    issue_date?: string;
    expiry_date?: string;
  };
}

export interface CertificateDownloadResponse {
  certificate: string;
  ca_certificates?: string;
  pkcs7?: string;
  domain: string;
  product_type: string;
  expiry_date?: string;
}

export interface CertificatesListResponse {
  certificates: SslCertificate[];
}

export interface SslProductsListResponse {
  products: SslProduct[];
}

export interface CSRValidationResponse {
  valid: boolean;
  domain?: string;
  org_name?: string;
  key_size?: string;
}
