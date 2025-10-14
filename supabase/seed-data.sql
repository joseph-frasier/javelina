-- =====================================================
-- Javelina DNS Management - Seed Data (Fixed)
-- This version works with existing users or creates mock data
-- =====================================================

-- =====================================================
-- 1. CHECK FOR EXISTING USERS
-- =====================================================

-- First, let's see what users exist in your auth.users table
-- Run this query to see your existing users:
-- SELECT id, email FROM auth.users LIMIT 5;

-- =====================================================
-- 2. ORGANIZATIONS (No user dependency)
-- =====================================================

-- Insert sample organizations
INSERT INTO public.organizations (id, name, description, created_at, updated_at) VALUES
  -- Company organization
  ('660e8400-e29b-41d4-a716-446655440000', 'Acme Corporation', 'Leading technology company providing cloud infrastructure and DNS management services to enterprise clients worldwide.', now() - interval '2 years', now() - interval '1 month'),
  
  -- Personal organization
  ('660e8400-e29b-41d4-a716-446655440001', 'Personal Projects', 'Personal domains and side projects including blog, portfolio, and experimental applications.', now() - interval '1 year', now() - interval '2 weeks'),
  
  -- Client organization
  ('660e8400-e29b-41d4-a716-446655440002', 'CloudFlow Solutions', 'Fast-growing startup requiring robust DNS infrastructure for their SaaS platform and customer domains.', now() - interval '6 months', now() - interval '1 week'),
  
  -- Additional organization
  ('660e8400-e29b-41d4-a716-446655440003', 'DataVault Systems', 'Enterprise data management and analytics platform serving Fortune 500 companies with secure, scalable infrastructure.', now() - interval '3 years', now() - interval '2 weeks')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  updated_at = now();

-- =====================================================
-- 3. ENVIRONMENTS (No user dependency)
-- =====================================================

-- Insert environments for each organization
INSERT INTO public.environments (id, organization_id, name, environment_type, location, status, description, created_at, updated_at) VALUES
  -- Acme Corporation environments
  ('770e8400-e29b-41d4-a716-446655440000', '660e8400-e29b-41d4-a716-446655440000', 'Production', 'production', 'US-East-1', 'active', 'Live production environment serving customer traffic with 99.9% uptime SLA', now() - interval '2 years', now() - interval '1 day'),
  ('770e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440000', 'Staging', 'staging', 'US-East-1', 'active', 'Pre-production testing environment for QA and integration testing', now() - interval '18 months', now() - interval '3 days'),
  ('770e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440000', 'Development', 'development', 'US-West-2', 'active', 'Development environment for feature development and testing', now() - interval '1 year', now() - interval '1 week'),
  
  -- Personal Projects environments
  ('770e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440001', 'Production', 'production', 'US-Central', 'active', 'Personal projects production environment', now() - interval '1 year', now() - interval '2 days'),
  ('770e8400-e29b-41d4-a716-446655440004', '660e8400-e29b-41d4-a716-446655440001', 'Development', 'development', 'US-Central', 'active', 'Personal projects development environment', now() - interval '8 months', now() - interval '5 days'),
  
  -- CloudFlow Solutions environments
  ('770e8400-e29b-41d4-a716-446655440005', '660e8400-e29b-41d4-a716-446655440002', 'Production', 'production', 'US-East-1', 'active', 'CloudFlow production environment for SaaS platform', now() - interval '6 months', now() - interval '1 day'),
  ('770e8400-e29b-41d4-a716-446655440006', '660e8400-e29b-41d4-a716-446655440002', 'Staging', 'staging', 'US-East-1', 'active', 'CloudFlow staging environment for client testing', now() - interval '4 months', now() - interval '2 days'),
  
  -- DataVault Systems environments
  ('770e8400-e29b-41d4-a716-446655440007', '660e8400-e29b-41d4-a716-446655440003', 'Production', 'production', 'US-West-2', 'active', 'DataVault production environment serving enterprise clients with 99.99% uptime SLA', now() - interval '3 years', now() - interval '1 day'),
  ('770e8400-e29b-41d4-a716-446655440008', '660e8400-e29b-41d4-a716-446655440003', 'Staging', 'staging', 'US-West-2', 'active', 'DataVault staging environment for enterprise client testing and validation', now() - interval '2 years', now() - interval '3 days'),
  ('770e8400-e29b-41d4-a716-446655440009', '660e8400-e29b-41d4-a716-446655440003', 'Development', 'development', 'US-East-1', 'active', 'DataVault development environment for feature development and testing', now() - interval '1 year', now() - interval '1 week')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  environment_type = EXCLUDED.environment_type,
  location = EXCLUDED.location,
  status = EXCLUDED.status,
  description = EXCLUDED.description,
  updated_at = now();

-- =====================================================
-- 4. DNS ZONES (No user dependency)
-- =====================================================

-- Insert DNS zones for each environment
INSERT INTO public.zones (id, environment_id, name, zone_type, description, active, created_at, updated_at) VALUES
  -- Acme Corporation - Production zones
  ('880e8400-e29b-41d4-a716-446655440000', '770e8400-e29b-41d4-a716-446655440000', 'acme.com', 'primary', 'Main corporate website and email domain', true, now() - interval '2 years', now() - interval '2 hours'),
  ('880e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440000', 'api.acme.com', 'primary', 'REST API endpoints and microservices', true, now() - interval '18 months', now() - interval '1 hour'),
  ('880e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440000', 'cdn.acme.com', 'primary', 'Content delivery network for static assets', true, now() - interval '1 year', now() - interval '4 hours'),
  ('880e8400-e29b-41d4-a716-446655440003', '770e8400-e29b-41d4-a716-446655440000', 'mail.acme.com', 'primary', 'Email services and mail server infrastructure', true, now() - interval '2 years', now() - interval '1 day'),
  ('880e8400-e29b-41d4-a716-446655440004', '770e8400-e29b-41d4-a716-446655440000', 'monitoring.acme.com', 'primary', 'Monitoring and observability platform', true, now() - interval '1 year', now() - interval '6 hours'),
  
  -- Acme Corporation - Staging zones
  ('880e8400-e29b-41d4-a716-446655440005', '770e8400-e29b-41d4-a716-446655440001', 'staging.acme.com', 'primary', 'Staging environment for testing and QA', true, now() - interval '18 months', now() - interval '1 day'),
  ('880e8400-e29b-41d4-a716-446655440006', '770e8400-e29b-41d4-a716-446655440001', 'api-staging.acme.com', 'primary', 'Staging API endpoints for integration testing', true, now() - interval '1 year', now() - interval '2 days'),
  ('880e8400-e29b-41d4-a716-446655440007', '770e8400-e29b-41d4-a716-446655440001', 'test.acme.com', 'primary', 'Testing environment for automated tests', true, now() - interval '1 year', now() - interval '3 days'),
  
  -- Acme Corporation - Development zones
  ('880e8400-e29b-41d4-a716-446655440008', '770e8400-e29b-41d4-a716-446655440002', 'dev.acme.com', 'primary', 'Development environment for feature development', true, now() - interval '1 year', now() - interval '1 week'),
  ('880e8400-e29b-41d4-a716-446655440009', '770e8400-e29b-41d4-a716-446655440002', 'local.acme.com', 'primary', 'Local development environment', true, now() - interval '8 months', now() - interval '2 weeks'),
  ('880e8400-e29b-41d4-a716-446655440010', '770e8400-e29b-41d4-a716-446655440002', 'sandbox.acme.com', 'primary', 'Sandbox environment for experimentation', false, now() - interval '6 months', now() - interval '1 month'),
  
  -- Personal Projects - Production zones
  ('880e8400-e29b-41d4-a716-446655440011', '770e8400-e29b-41d4-a716-446655440003', 'blog.example.com', 'primary', 'Personal blog and portfolio website', true, now() - interval '1 year', now() - interval '1 day'),
  ('880e8400-e29b-41d4-a716-446655440012', '770e8400-e29b-41d4-a716-446655440003', 'portfolio.example.com', 'primary', 'Professional portfolio and resume', true, now() - interval '8 months', now() - interval '3 days'),
  ('880e8400-e29b-41d4-a716-446655440013', '770e8400-e29b-41d4-a716-446655440003', 'projects.example.com', 'primary', 'Side projects and experiments showcase', true, now() - interval '6 months', now() - interval '1 week'),
  ('880e8400-e29b-41d4-a716-446655440014', '770e8400-e29b-41d4-a716-446655440003', 'api.example.com', 'primary', 'Personal API services and utilities', true, now() - interval '4 months', now() - interval '2 days'),
  
  -- Personal Projects - Development zones
  ('880e8400-e29b-41d4-a716-446655440015', '770e8400-e29b-41d4-a716-446655440004', 'dev.blog.example.com', 'primary', 'Development version of personal blog', true, now() - interval '8 months', now() - interval '1 week'),
  ('880e8400-e29b-41d4-a716-446655440016', '770e8400-e29b-41d4-a716-446655440004', 'test.portfolio.example.com', 'primary', 'Testing environment for portfolio updates', true, now() - interval '6 months', now() - interval '2 weeks'),
  
  -- CloudFlow Solutions - Production zones
  ('880e8400-e29b-41d4-a716-446655440017', '770e8400-e29b-41d4-a716-446655440005', 'cloudflow.io', 'primary', 'Main SaaS platform domain', true, now() - interval '6 months', now() - interval '1 day'),
  ('880e8400-e29b-41d4-a716-446655440018', '770e8400-e29b-41d4-a716-446655440005', 'app.cloudflow.io', 'primary', 'Customer application portal', true, now() - interval '5 months', now() - interval '2 days'),
  ('880e8400-e29b-41d4-a716-446655440019', '770e8400-e29b-41d4-a716-446655440005', 'api.cloudflow.io', 'primary', 'Customer API endpoints', true, now() - interval '4 months', now() - interval '1 day'),
  ('880e8400-e29b-41d4-a716-446655440020', '770e8400-e29b-41d4-a716-446655440005', 'docs.cloudflow.io', 'primary', 'API documentation and guides', true, now() - interval '3 months', now() - interval '3 days'),
  
  -- CloudFlow Solutions - Staging zones
  ('880e8400-e29b-41d4-a716-446655440021', '770e8400-e29b-41d4-a716-446655440006', 'staging.cloudflow.io', 'primary', 'Staging environment for client testing', true, now() - interval '4 months', now() - interval '1 day'),
  ('880e8400-e29b-41d4-a716-446655440022', '770e8400-e29b-41d4-a716-446655440006', 'test-app.cloudflow.io', 'primary', 'Staging application for QA testing', true, now() - interval '3 months', now() - interval '2 days'),
  
  -- DataVault Systems - Production zones
  ('880e8400-e29b-41d4-a716-446655440023', '770e8400-e29b-41d4-a716-446655440007', 'datavault.com', 'primary', 'Main enterprise data management platform', true, now() - interval '3 years', now() - interval '2 hours'),
  ('880e8400-e29b-41d4-a716-446655440024', '770e8400-e29b-41d4-a716-446655440007', 'api.datavault.com', 'primary', 'Enterprise API endpoints for data operations', true, now() - interval '2 years', now() - interval '1 hour'),
  ('880e8400-e29b-41d4-a716-446655440025', '770e8400-e29b-41d4-a716-446655440007', 'analytics.datavault.com', 'primary', 'Advanced analytics and reporting dashboard', true, now() - interval '2 years', now() - interval '4 hours'),
  ('880e8400-e29b-41d4-a716-446655440026', '770e8400-e29b-41d4-a716-446655440007', 'secure.datavault.com', 'primary', 'Secure data access portal for enterprise clients', true, now() - interval '2 years', now() - interval '6 hours'),
  ('880e8400-e29b-41d4-a716-446655440027', '770e8400-e29b-41d4-a716-446655440007', 'monitor.datavault.com', 'primary', 'Real-time monitoring and alerting system', true, now() - interval '1 year', now() - interval '1 day'),
  
  -- DataVault Systems - Staging zones
  ('880e8400-e29b-41d4-a716-446655440028', '770e8400-e29b-41d4-a716-446655440008', 'staging.datavault.com', 'primary', 'Staging environment for enterprise client testing', true, now() - interval '2 years', now() - interval '1 day'),
  ('880e8400-e29b-41d4-a716-446655440029', '770e8400-e29b-41d4-a716-446655440008', 'test-api.datavault.com', 'primary', 'Staging API for integration testing', true, now() - interval '1 year', now() - interval '2 days'),
  ('880e8400-e29b-41d4-a716-446655440030', '770e8400-e29b-41d4-a716-446655440008', 'demo.datavault.com', 'primary', 'Demo environment for client presentations', true, now() - interval '1 year', now() - interval '3 days'),
  
  -- DataVault Systems - Development zones
  ('880e8400-e29b-41d4-a716-446655440031', '770e8400-e29b-41d4-a716-446655440009', 'dev.datavault.com', 'primary', 'Development environment for feature development', true, now() - interval '1 year', now() - interval '1 week'),
  ('880e8400-e29b-41d4-a716-446655440032', '770e8400-e29b-41d4-a716-446655440009', 'local.datavault.com', 'primary', 'Local development environment', true, now() - interval '8 months', now() - interval '2 weeks'),
  ('880e8400-e29b-41d4-a716-446655440033', '770e8400-e29b-41d4-a716-446655440009', 'experimental.datavault.com', 'primary', 'Experimental features and testing', false, now() - interval '6 months', now() - interval '1 month')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  zone_type = EXCLUDED.zone_type,
  description = EXCLUDED.description,
  active = EXCLUDED.active,
  updated_at = now();

-- =====================================================
-- 5. AUDIT LOGS (No user dependency)
-- =====================================================

-- Insert sample audit log entries
INSERT INTO public.audit_logs (id, table_name, record_id, action, old_data, new_data, created_at) VALUES
  -- Recent organization activities
  ('990e8400-e29b-41d4-a716-446655440000', 'organizations', '660e8400-e29b-41d4-a716-446655440000', 'UPDATE', 
   '{"name": "Acme Corp", "description": "Technology company"}', 
   '{"name": "Acme Corporation", "description": "Leading technology company providing cloud infrastructure and DNS management services to enterprise clients worldwide."}', 
   now() - interval '1 month'),
  
  -- Recent environment activities
  ('990e8400-e29b-41d4-a716-446655440001', 'environments', '770e8400-e29b-41d4-a716-446655440000', 'UPDATE',
   '{"status": "maintenance"}',
   '{"status": "active"}',
   now() - interval '1 day'),
  
  -- Recent zone activities
  ('990e8400-e29b-41d4-a716-446655440002', 'zones', '880e8400-e29b-41d4-a716-446655440000', 'UPDATE',
   '{"active": false}',
   '{"active": true}',
   now() - interval '2 hours'),
  
  ('990e8400-e29b-41d4-a716-446655440003', 'zones', '880e8400-e29b-41d4-a716-446655440001', 'INSERT',
   null,
   '{"id": "880e8400-e29b-41d4-a716-446655440001", "name": "api.acme.com", "zone_type": "primary", "active": true}',
   now() - interval '1 hour'),
  
  ('990e8400-e29b-41d4-a716-446655440004', 'zones', '880e8400-e29b-41d4-a716-446655440010', 'UPDATE',
   '{"active": true}',
   '{"active": false}',
   now() - interval '1 month'),
  
  -- Personal project activities
  ('990e8400-e29b-41d4-a716-446655440005', 'zones', '880e8400-e29b-41d4-a716-446655440011', 'UPDATE',
   '{"description": "Personal blog"}',
   '{"description": "Personal blog and portfolio website"}',
   now() - interval '1 day'),
  
  -- CloudFlow activities
  ('990e8400-e29b-41d4-a716-446655440006', 'zones', '880e8400-e29b-41d4-a716-446655440017', 'INSERT',
   null,
   '{"id": "880e8400-e29b-41d4-a716-446655440017", "name": "cloudflow.io", "zone_type": "primary", "active": true}',
   now() - interval '6 months'),
  
  ('990e8400-e29b-41d4-a716-446655440007', 'zones', '880e8400-e29b-41d4-a716-446655440018', 'INSERT',
   null,
   '{"id": "880e8400-e29b-41d4-a716-446655440018", "name": "app.cloudflow.io", "zone_type": "primary", "active": true}',
   now() - interval '5 months'),
  
  -- DataVault Systems activities
  ('990e8400-e29b-41d4-a716-446655440008', 'zones', '880e8400-e29b-41d4-a716-446655440025', 'UPDATE',
   '{"description": "Analytics dashboard"}',
   '{"description": "Advanced analytics and reporting dashboard"}',
   now() - interval '4 hours'),
  
  ('990e8400-e29b-41d4-a716-446655440009', 'zones', '880e8400-e29b-41d4-a716-446655440033', 'UPDATE',
   '{"active": true}',
   '{"active": false}',
   now() - interval '1 month')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 6. VERIFICATION QUERIES
-- =====================================================

-- Verify the seed data was inserted correctly
SELECT 'Profiles' as table_name, COUNT(*) as record_count FROM public.profiles
UNION ALL
SELECT 'Organizations', COUNT(*) FROM public.organizations
UNION ALL
SELECT 'Organization Members', COUNT(*) FROM public.organization_members
UNION ALL
SELECT 'Environments', COUNT(*) FROM public.environments
UNION ALL
SELECT 'Zones', COUNT(*) FROM public.zones
UNION ALL
SELECT 'Audit Logs', COUNT(*) FROM public.audit_logs;

-- Show sample data
SELECT 'Sample Organizations:' as info;
SELECT id, name, description FROM public.organizations LIMIT 3;

SELECT 'Sample Environments:' as info;
SELECT e.name, e.environment_type, o.name as organization_name 
FROM public.environments e 
JOIN public.organizations o ON o.id = e.organization_id 
LIMIT 5;

SELECT 'Sample Zones:' as info;
SELECT z.name, z.zone_type, e.name as environment_name, o.name as organization_name
FROM public.zones z
JOIN public.environments e ON e.id = z.environment_id
JOIN public.organizations o ON o.id = e.organization_id
LIMIT 5;

-- =====================================================
-- SEED DATA COMPLETE
-- =====================================================

-- Summary of inserted data:
-- - 4 organizations with realistic names
-- - 10 environments across the organizations
-- - 36 DNS zones with realistic names and descriptions
-- - 10 audit log entries showing recent activity
-- - No user dependencies (works with any existing users)
