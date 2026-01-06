export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

/**
 * Database types generated from Supabase schema
 * Based on schema.sql
 */
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          name: string | null
          email: string | null
          display_name: string | null
          title: string | null
          phone: string | null
          timezone: string | null
          bio: string | null
          avatar_url: string | null
          role: 'user' | 'superuser'
          superadmin: boolean
          mfa_enabled: boolean | null
          sso_connected: boolean | null
          last_login: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          name?: string | null
          email?: string | null
          display_name?: string | null
          title?: string | null
          phone?: string | null
          timezone?: string | null
          bio?: string | null
          avatar_url?: string | null
          role?: 'user' | 'superuser'
          superadmin?: boolean
          mfa_enabled?: boolean | null
          sso_connected?: boolean | null
          last_login?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string | null
          email?: string | null
          display_name?: string | null
          title?: string | null
          phone?: string | null
          timezone?: string | null
          bio?: string | null
          avatar_url?: string | null
          role?: 'user' | 'superuser'
          superadmin?: boolean
          mfa_enabled?: boolean | null
          sso_connected?: boolean | null
          last_login?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'profiles_id_fkey'
            columns: ['id']
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      organizations: {
        Row: {
          id: string
          name: string
          description: string | null
          stripe_customer_id: string | null
          subscription_status: 'free' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'unpaid'
          trial_ends_at: string | null
          current_period_end: string | null
          billing_phone: string | null
          billing_email: string | null
          billing_address: string | null
          billing_city: string | null
          billing_state: string | null
          billing_zip: string | null
          admin_contact_email: string | null
          admin_contact_phone: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          stripe_customer_id?: string | null
          subscription_status?: 'free' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'unpaid'
          trial_ends_at?: string | null
          current_period_end?: string | null
          billing_phone?: string | null
          billing_email?: string | null
          billing_address?: string | null
          billing_city?: string | null
          billing_state?: string | null
          billing_zip?: string | null
          admin_contact_email?: string | null
          admin_contact_phone?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          stripe_customer_id?: string | null
          subscription_status?: 'free' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'unpaid'
          trial_ends_at?: string | null
          current_period_end?: string | null
          billing_phone?: string | null
          billing_email?: string | null
          billing_address?: string | null
          billing_city?: string | null
          billing_state?: string | null
          billing_zip?: string | null
          admin_contact_email?: string | null
          admin_contact_phone?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      organization_members: {
        Row: {
          organization_id: string
          user_id: string
          role: 'SuperAdmin' | 'Admin' | 'BillingContact' | 'Editor' | 'Viewer'
          created_at: string
        }
        Insert: {
          organization_id: string
          user_id: string
          role: 'SuperAdmin' | 'Admin' | 'BillingContact' | 'Editor' | 'Viewer'
          created_at?: string
        }
        Update: {
          organization_id?: string
          user_id?: string
          role?: 'SuperAdmin' | 'Admin' | 'BillingContact' | 'Editor' | 'Viewer'
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'organization_members_organization_id_fkey'
            columns: ['organization_id']
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'organization_members_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      environments: {
        Row: {
          id: string
          organization_id: string
          name: string
          environment_type: 'production' | 'staging' | 'development'
          location: string | null
          status: 'active' | 'disabled' | 'archived'
          description: string | null
          health_status: 'healthy' | 'degraded' | 'down' | 'unknown'
          last_deployed_at: string | null
          created_at: string
          updated_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          environment_type: 'production' | 'staging' | 'development'
          location?: string | null
          status?: 'active' | 'disabled' | 'archived'
          description?: string | null
          health_status?: 'healthy' | 'degraded' | 'down' | 'unknown'
          last_deployed_at?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          environment_type?: 'production' | 'staging' | 'development'
          location?: string | null
          status?: 'active' | 'disabled' | 'archived'
          description?: string | null
          health_status?: 'healthy' | 'degraded' | 'down' | 'unknown'
          last_deployed_at?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'environments_organization_id_fkey'
            columns: ['organization_id']
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          }
        ]
      }
      zones: {
        Row: {
          id: string
          organization_id: string
          name: string
          description: string | null
          soa_serial: number
          last_valid_serial: number
          admin_email: string
          negative_caching_ttl: number
          live: boolean
          error: string | null
          deleted_at: string | null
          created_at: string
          updated_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          description?: string | null
          soa_serial?: number
          last_valid_serial?: number
          admin_email?: string
          negative_caching_ttl?: number
          live?: boolean
          error?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          description?: string | null
          soa_serial?: number
          last_valid_serial?: number
          admin_email?: string
          negative_caching_ttl?: number
          live?: boolean
          error?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'zones_organization_id_fkey'
            columns: ['organization_id']
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          }
        ]
      }
      audit_logs: {
        Row: {
          id: string
          table_name: string
          record_id: string
          action: 'INSERT' | 'UPDATE' | 'DELETE'
          old_data: Json | null
          new_data: Json | null
          user_id: string | null
          ip_address: string | null
          user_agent: string | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          table_name: string
          record_id: string
          action: 'INSERT' | 'UPDATE' | 'DELETE'
          old_data?: Json | null
          new_data?: Json | null
          user_id?: string | null
          ip_address?: string | null
          user_agent?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          table_name?: string
          record_id?: string
          action?: 'INSERT' | 'UPDATE' | 'DELETE'
          old_data?: Json | null
          new_data?: Json | null
          user_id?: string | null
          ip_address?: string | null
          user_agent?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Relationships: []
      }
      zone_records: {
        Row: {
          id: string
          zone_id: string
          name: string
          type: 'A' | 'AAAA' | 'CNAME' | 'MX' | 'NS' | 'TXT' | 'SOA' | 'SRV' | 'CAA' | 'PTR'
          value: string
          ttl: number
          comment: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          zone_id: string
          name: string
          type: 'A' | 'AAAA' | 'CNAME' | 'MX' | 'NS' | 'TXT' | 'SOA' | 'SRV' | 'CAA' | 'PTR'
          value: string
          ttl: number
          comment?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          zone_id?: string
          name?: string
          type?: 'A' | 'AAAA' | 'CNAME' | 'MX' | 'NS' | 'TXT' | 'SOA' | 'SRV' | 'CAA' | 'PTR'
          value?: string
          ttl?: number
          comment?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'zone_records_zone_id_fkey'
            columns: ['zone_id']
            referencedRelation: 'zones'
            referencedColumns: ['id']
          }
        ]
      }
      subscription_plans: {
        Row: {
          id: string
          name: string
          stripe_price_id: string | null
          description: string | null
          price_monthly: number | null
          price_annual: number | null
          limits: Json
          features: Json | null
          is_active: boolean
          display_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          stripe_price_id?: string | null
          description?: string | null
          price_monthly?: number | null
          price_annual?: number | null
          limits: Json
          features?: Json | null
          is_active?: boolean
          display_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          stripe_price_id?: string | null
          description?: string | null
          price_monthly?: number | null
          price_annual?: number | null
          limits?: Json
          features?: Json | null
          is_active?: boolean
          display_order?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      organization_subscriptions: {
        Row: {
          id: string
          organization_id: string
          stripe_subscription_id: string | null
          stripe_customer_id: string | null
          plan_id: string | null
          status: 'free' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'unpaid'
          current_period_start: string | null
          current_period_end: string | null
          trial_start: string | null
          trial_end: string | null
          cancel_at_period_end: boolean
          canceled_at: string | null
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          stripe_subscription_id?: string | null
          stripe_customer_id?: string | null
          plan_id?: string | null
          status?: 'free' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'unpaid'
          current_period_start?: string | null
          current_period_end?: string | null
          trial_start?: string | null
          trial_end?: string | null
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          stripe_subscription_id?: string | null
          stripe_customer_id?: string | null
          plan_id?: string | null
          status?: 'free' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'unpaid'
          current_period_start?: string | null
          current_period_end?: string | null
          trial_start?: string | null
          trial_end?: string | null
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'organization_subscriptions_organization_id_fkey'
            columns: ['organization_id']
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'organization_subscriptions_plan_id_fkey'
            columns: ['plan_id']
            referencedRelation: 'subscription_plans'
            referencedColumns: ['id']
          }
        ]
      }
      usage_tracking: {
        Row: {
          id: string
          organization_id: string
          period_start: string
          period_end: string
          organizations_count: number
          environments_count: number
          zones_count: number
          dns_records_count: number
          api_calls_count: number
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          period_start: string
          period_end: string
          organizations_count?: number
          environments_count?: number
          zones_count?: number
          dns_records_count?: number
          api_calls_count?: number
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          period_start?: string
          period_end?: string
          organizations_count?: number
          environments_count?: number
          zones_count?: number
          dns_records_count?: number
          api_calls_count?: number
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'usage_tracking_organization_id_fkey'
            columns: ['organization_id']
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Convenience type exports
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Organization = Database['public']['Tables']['organizations']['Row']
export type OrganizationMember = Database['public']['Tables']['organization_members']['Row']
export type Environment = Database['public']['Tables']['environments']['Row']
export type Zone = Database['public']['Tables']['zones']['Row']
export type AuditLog = Database['public']['Tables']['audit_logs']['Row']
export type DNSRecord = Database['public']['Tables']['zone_records']['Row']
export type SubscriptionPlan = Database['public']['Tables']['subscription_plans']['Row']
export type OrganizationSubscription = Database['public']['Tables']['organization_subscriptions']['Row']
export type UsageTracking = Database['public']['Tables']['usage_tracking']['Row']
