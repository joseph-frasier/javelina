export interface MailboxPricingTier {
  id: string;
  tier_name: string;
  storage_gb: number;
  price: number;
  mailbox_limit: number;
}

export interface MailboxPricingAdminTier {
  id: string;
  tier_name: string;
  storage_gb: number;
  opensrs_cost: number;
  margin_percent: number;
  sale_price_override: number | null;
  mailbox_limit: number;
  is_active: boolean;
  computed_price: number;
  has_sale_override: boolean;
  created_at: string;
  updated_at: string;
}

export interface RequiredMailDnsRecord {
  type: "MX" | "TXT" | "CNAME";
  host: string;
  value: string;
  priority?: number;
  description: string;
}

export interface DomainEmailStatus {
  enabled: boolean;
  status?: "active" | "suspended" | "disabled";
  tier?: MailboxPricingTier | null;
  mailbox_count?: number;
  webmail_url?: string;
  required_dns_records?: RequiredMailDnsRecord[];
  created_at?: string;
}

export interface Mailbox {
  user: string;
  domain: string;
  mailbox_type: "mailbox" | "forward" | "filter";
  suspended: boolean;
  max_storage: number;
  current_usage?: number;
  created?: string;
}

export interface MailAlias {
  alias: string;
  domain: string;
  target: string;
}
