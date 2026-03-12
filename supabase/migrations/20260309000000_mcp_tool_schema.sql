-- Javelina MCP: initial schema
-- Postgres / Supabase compatible
-- NOTE: This file is designed to run against the existing Javelina dev branch DB.
-- It must be additive and avoid redefining core app tables.

-- Tenant membership: maps (iss, sub) to tenantId with a role
CREATE TABLE IF NOT EXISTS tenant_memberships (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  iss           TEXT NOT NULL,
  sub           TEXT NOT NULL,
  tenant_id     UUID NOT NULL,
  role          TEXT NOT NULL DEFAULT 'viewer',  -- viewer | editor | admin
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (iss, sub, tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_memberships_identity ON tenant_memberships (iss, sub);
CREATE INDEX IF NOT EXISTS idx_memberships_tenant   ON tenant_memberships (tenant_id);

-- Plan entitlements: per-tenant feature gates and quotas
CREATE TABLE IF NOT EXISTS tenant_entitlements (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL UNIQUE,
  plan_name         TEXT NOT NULL DEFAULT 'free',
  write_enabled     BOOLEAN NOT NULL DEFAULT true,
  allowed_record_types TEXT[] NOT NULL DEFAULT '{A,AAAA,CNAME,MX,TXT,NS,SRV,CAA}',
  max_zones         INT NOT NULL DEFAULT 5,
  max_records_per_zone INT NOT NULL DEFAULT 100,
  rate_limit_rpm    INT NOT NULL DEFAULT 60,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_entitlements_tenant ON tenant_entitlements (tenant_id);

-- Audit log integration: extend existing public.audit_logs with MCP-specific columns.
-- The Javelina app already owns this table (table_name/record_id/action schema).
-- We add MCP columns instead of creating a conflicting second definition.
ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS request_id TEXT,
  ADD COLUMN IF NOT EXISTS iss TEXT,
  ADD COLUMN IF NOT EXISTS sub TEXT,
  ADD COLUMN IF NOT EXISTS tenant_id UUID,
  ADD COLUMN IF NOT EXISTS tool_name TEXT,
  ADD COLUMN IF NOT EXISTS input_summary JSONB,    -- redacted summary, never raw input
  ADD COLUMN IF NOT EXISTS output_summary JSONB,   -- shape/size only
  ADD COLUMN IF NOT EXISTS success BOOLEAN,
  ADD COLUMN IF NOT EXISTS error_code TEXT,
  ADD COLUMN IF NOT EXISTS latency_ms INT,
  ADD COLUMN IF NOT EXISTS upstream_status INT;

-- Ensure MCP inserts can succeed on shared audit_logs rows where app-required
-- columns are not provided by the MCP code path.
ALTER TABLE public.audit_logs
  ALTER COLUMN table_name SET DEFAULT 'mcp_tool',
  ALTER COLUMN record_id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN action SET DEFAULT 'TOOL_CALL';

CREATE INDEX IF NOT EXISTS idx_mcp_audit_tenant_created_at
  ON public.audit_logs (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mcp_audit_identity_created_at
  ON public.audit_logs (iss, sub, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mcp_audit_request
  ON public.audit_logs (request_id);

-- Idempotency keys: TTL-based deduplication for write operations
CREATE TABLE IF NOT EXISTS idempotency_keys (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  tool_name       TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  payload_hash    TEXT NOT NULL,          -- SHA-256 of canonical input
  response        JSONB NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours'),
  UNIQUE (tenant_id, tool_name, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_idempotency_expires ON idempotency_keys (expires_at);
