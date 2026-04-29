-- 20260429000000_business_intake_assets_buckets.sql
-- Private buckets for business intake wizard image uploads.
-- Bytes are accessed only via service-role (Express backend); frontend never
-- reads these buckets directly — instead it consumes short-lived signed URLs.

-- 1. Logos: 5 MB cap; png/jpeg/svg/webp.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'dev-business-logos',
  'dev-business-logos',
  false,
  5242880,
  ARRAY['image/png','image/jpeg','image/svg+xml','image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public            = EXCLUDED.public,
  file_size_limit   = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Photos: 25 MB cap; png/jpeg/webp/heic/heif.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'dev-business-photos',
  'dev-business-photos',
  false,
  26214400,
  ARRAY['image/png','image/jpeg','image/webp','image/heic','image/heif']
)
ON CONFLICT (id) DO UPDATE SET
  public            = EXCLUDED.public,
  file_size_limit   = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 3. Deny all non-service-role access on these two buckets.
-- (service_role bypasses RLS, so no positive policy is needed for the backend.)
DROP POLICY IF EXISTS "Deny anon/authed read on business intake assets" ON storage.objects;
CREATE POLICY "Deny anon/authed read on business intake assets"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (
  bucket_id NOT IN ('dev-business-logos', 'dev-business-photos')
);

DROP POLICY IF EXISTS "Deny anon/authed insert on business intake assets" ON storage.objects;
CREATE POLICY "Deny anon/authed insert on business intake assets"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (
  bucket_id NOT IN ('dev-business-logos', 'dev-business-photos')
);

DROP POLICY IF EXISTS "Deny anon/authed update on business intake assets" ON storage.objects;
CREATE POLICY "Deny anon/authed update on business intake assets"
ON storage.objects FOR UPDATE
TO anon, authenticated
USING (
  bucket_id NOT IN ('dev-business-logos', 'dev-business-photos')
);

DROP POLICY IF EXISTS "Deny anon/authed delete on business intake assets" ON storage.objects;
CREATE POLICY "Deny anon/authed delete on business intake assets"
ON storage.objects FOR DELETE
TO anon, authenticated
USING (
  bucket_id NOT IN ('dev-business-logos', 'dev-business-photos')
);
