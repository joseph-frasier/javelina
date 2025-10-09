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
          projects_count: number
          zones_count: number
          created_at: string
        }
        Insert: {
          organization_id: string
          user_id: string
          role: 'SuperAdmin' | 'Admin' | 'Editor' | 'Viewer'
          projects_count?: number
          zones_count?: number
          created_at?: string
        }
        Update: {
          organization_id?: string
          user_id?: string
          role?: 'SuperAdmin' | 'Admin' | 'Editor' | 'Viewer'
          projects_count?: number
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
