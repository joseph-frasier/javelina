-- Add billing and admin contact fields to organizations table
-- All fields are nullable to support existing organizations
-- New organizations will require these fields via application-level validation

ALTER TABLE organizations
ADD COLUMN billing_phone TEXT,
ADD COLUMN billing_email TEXT,
ADD COLUMN billing_address TEXT,
ADD COLUMN billing_city TEXT,
ADD COLUMN billing_state TEXT,
ADD COLUMN billing_zip TEXT,
ADD COLUMN admin_contact_email TEXT,
ADD COLUMN admin_contact_phone TEXT;

-- Add comments for documentation
COMMENT ON COLUMN organizations.billing_phone IS 'Billing contact phone number (US format)';
COMMENT ON COLUMN organizations.billing_email IS 'Billing contact email address';
COMMENT ON COLUMN organizations.billing_address IS 'Billing street address';
COMMENT ON COLUMN organizations.billing_city IS 'Billing address city';
COMMENT ON COLUMN organizations.billing_state IS 'Billing address state (US 2-letter code)';
COMMENT ON COLUMN organizations.billing_zip IS 'Billing address ZIP code (5-digit)';
COMMENT ON COLUMN organizations.admin_contact_email IS 'Administrative contact email address';
COMMENT ON COLUMN organizations.admin_contact_phone IS 'Administrative contact phone number (US format)';

-- Add check constraints for data validation
ALTER TABLE organizations
ADD CONSTRAINT billing_state_format CHECK (billing_state IS NULL OR billing_state ~ '^[A-Z]{2}$'),
ADD CONSTRAINT billing_zip_format CHECK (billing_zip IS NULL OR billing_zip ~ '^\d{5}$'),
ADD CONSTRAINT billing_email_format CHECK (billing_email IS NULL OR billing_email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
ADD CONSTRAINT admin_contact_email_format CHECK (admin_contact_email IS NULL OR admin_contact_email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

