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
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      organization_members: {
        Row: {
          organization_id: string
          user_id: string
          role: 'SuperAdmin' | 'Admin' | 'Editor' | 'Viewer'
          environments_count: number
          zones_count: number
          created_at: string
        }
        Insert: {
          organization_id: string
          user_id: string
          role: 'SuperAdmin' | 'Admin' | 'Editor' | 'Viewer'
          environments_count?: number
          zones_count?: number
          created_at?: string
        }
        Update: {
          organization_id?: string
          user_id?: string
          role?: 'SuperAdmin' | 'Admin' | 'Editor' | 'Viewer'
          environments_count?: number
          zones_count?: number
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
          environment_id: string
          name: string
          zone_type: 'primary' | 'secondary' | 'redirect'
          description: string | null
          active: boolean
          verification_status: 'verified' | 'pending' | 'failed' | 'unverified'
          last_verified_at: string | null
          nameservers: string[] | null
          ttl: number | null
          records_count: number | null
          metadata: Json | null
          created_at: string
          updated_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          environment_id: string
          name: string
          zone_type: 'primary' | 'secondary' | 'redirect'
          description?: string | null
          active?: boolean
          verification_status?: 'verified' | 'pending' | 'failed' | 'unverified'
          last_verified_at?: string | null
          nameservers?: string[] | null
          ttl?: number | null
          records_count?: number | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          environment_id?: string
          name?: string
          zone_type?: 'primary' | 'secondary' | 'redirect'
          description?: string | null
          active?: boolean
          verification_status?: 'verified' | 'pending' | 'failed' | 'unverified'
          last_verified_at?: string | null
          nameservers?: string[] | null
          ttl?: number | null
          records_count?: number | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'zones_environment_id_fkey'
            columns: ['environment_id']
            referencedRelation: 'environments'
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
      dns_records: {
        Row: {
          id: string
          zone_id: string
          name: string
          type: 'A' | 'AAAA' | 'CNAME' | 'MX' | 'NS' | 'TXT' | 'SOA' | 'SRV' | 'CAA'
          value: string
          ttl: number
          priority: number | null
          status: 'active' | 'inactive'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          zone_id: string
          name: string
          type: 'A' | 'AAAA' | 'CNAME' | 'MX' | 'NS' | 'TXT' | 'SOA' | 'SRV' | 'CAA'
          value: string
          ttl: number
          priority?: number | null
          status?: 'active' | 'inactive'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          zone_id?: string
          name?: string
          type?: 'A' | 'AAAA' | 'CNAME' | 'MX' | 'NS' | 'TXT' | 'SOA' | 'SRV' | 'CAA'
          value?: string
          ttl?: number
          priority?: number | null
          status?: 'active' | 'inactive'
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'dns_records_zone_id_fkey'
            columns: ['zone_id']
            referencedRelation: 'zones'
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
export type DNSRecord = Database['public']['Tables']['dns_records']['Row']
