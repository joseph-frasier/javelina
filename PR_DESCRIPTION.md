# Database Schema Refactoring and Organization Creation Fix

## Overview

This PR refactors the database schema to improve data normalization, renames the DNS records table for better clarity, and fixes a critical bug in the organization creation flow that was preventing users from completing checkout.

## Changes

### 🗄️ Database Schema Changes

#### 1. DNS Records Table Creation & Renaming
- **Created** `dns_records` table (migration `20250103150000_create_dns_records_table.sql`)
  - Supports all standard DNS record types (A, AAAA, CNAME, MX, NS, TXT, SOA, SRV, CAA)
  - Includes SOA serial management with auto-increment triggers
  - Automatic records count tracking on zones table
  - Full RLS (Row Level Security) policies for organization-based access control
  - Comprehensive audit logging for all record changes

- **Renamed** `dns_records` → `zone_records` (migration `20250103160000_rename_dns_records_to_zone_records.sql`)
  - More accurate naming convention that aligns with the zone hierarchy
  - Updated all triggers, functions, indexes, and RLS policies
  - Maintains backward compatibility in audit logs for historical records

#### 2. Organization Members Schema Normalization
- **Removed** `environments_count` and `zones_count` from `organization_members` table
  - These counts belong in `organizations` and `environments` tables respectively
  - Migration: `20250104000000_remove_counts_from_organization_members.sql`
  - Improves data normalization and prevents duplication

### 🔧 Code Updates

#### Frontend API Routes
- **`app/api/organizations/create/route.ts`**: Removed references to deleted `environments_count` and `zones_count` columns when creating organization memberships

#### Backend Controllers
- **`backend/src/controllers/dnsRecordsController.ts`**: 
  - Updated all table references from `dns_records` to `zone_records`
  - Fixed field name from `status` to `active` to match schema
- **`backend/src/controllers/organizationsController.ts`**: Removed references to deleted columns

#### Frontend Libraries
- **`lib/auth-store.ts`**: 
  - Refactored to fetch `environments_count` from `organizations` table (via join)
  - Dynamically calculates `zones_count` by summing `zones_count` from all environments
  - Improved data fetching with proper error handling

- **`lib/hooks/useProfile.ts`**: 
  - Updated to match new schema structure
  - Fetches counts from correct tables using joins and aggregations
  - Maintains backward compatibility for existing data

- **`lib/api/dns.ts`**: Updated table references from `dns_records` to `zone_records`

- **`lib/mock-dns-data.ts`**: Updated mock data to use `zone_records` table name

#### Type Definitions
- **`types/supabase.ts`**: 
  - Removed `environments_count` and `zones_count` from `organization_members` types
  - Updated `zone_records` type definitions (replacing `dns_records`)
  - Ensured type safety matches database schema

- **`backend/src/types/index.ts`**: Updated type definitions to match schema changes

### 🐛 Bug Fixes

#### Critical: Organization Creation Flow
**Problem**: After creating a new organization, users encountered "You do not have access to this organization" error during checkout.

**Root Cause**: The organization creation code was attempting to insert `environments_count: 0` and `zones_count: 0` into `organization_members` table, but these columns had been removed by migration. This caused membership creation to fail silently, preventing the checkout flow from verifying user permissions.

**Solution**: Removed the non-existent columns from the insert statement in `app/api/organizations/create/route.ts`. The membership record now creates successfully, allowing the checkout flow to properly verify user access.

### 📦 Infrastructure

- **Added** `supabase/config.toml`: Supabase CLI configuration for local development
- **Added** `supabase/.gitignore`: Excludes local development artifacts
- **Added** VS Code settings for better development experience

## Migration Path

The migrations are designed to be run in order:

1. `20250103150000_create_dns_records_table.sql` - Creates DNS records table
2. `20250103160000_rename_dns_records_to_zone_records.sql` - Renames to zone_records
3. `20250104000000_remove_counts_from_organization_members.sql` - Normalizes schema

All migrations are idempotent and use `IF EXISTS` / `IF NOT EXISTS` clauses for safety.

## Testing

✅ Organization creation flow now works end-to-end  
✅ Checkout process completes successfully for new organizations  
✅ Zone records functionality tested with renamed table  
✅ Count calculations verified from correct source tables  

## Breaking Changes

⚠️ **API Changes**:
- All DNS records endpoints now reference `zone_records` instead of `dns_records`
- Backend API field name changed from `status` to `active` for DNS records

⚠️ **Database Changes**:
- `organization_members.environments_count` and `organization_members.zones_count` columns removed
- Applications must now fetch these counts from `organizations.environments_count` and by aggregating `environments.zones_count`

## Files Changed

- **20 files changed**: 1,051 insertions(+), 64 deletions(-)
- **4 new migration files** added
- **2 new configuration files** added

## Related Issues

Fixes organization creation and checkout flow after database schema normalization.

