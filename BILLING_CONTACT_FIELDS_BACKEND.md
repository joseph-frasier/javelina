# Billing Contact Fields - Backend Implementation Guide

## Overview

This document outlines the backend changes required to support billing and administrative contact fields for organizations. These fields were added to enable proper billing management and contact tracking for each organization.

## Database Schema Changes

### Migration File

**File**: `supabase/migrations/20251230191655_add_billing_contact_fields.sql`

### New Columns Added to `organizations` Table

| Column Name | Data Type | Nullable | Description |
|------------|-----------|----------|-------------|
| `billing_phone` | TEXT | YES | Billing contact phone number (US format) |
| `billing_email` | TEXT | YES | Billing contact email address |
| `billing_address` | TEXT | YES | Billing street address |
| `billing_city` | TEXT | YES | Billing address city |
| `billing_state` | TEXT | YES | Billing address state (US 2-letter code) |
| `billing_zip` | TEXT | YES | Billing address ZIP code (5-digit) |
| `admin_contact_email` | TEXT | YES | Administrative contact email address |
| `admin_contact_phone` | TEXT | YES | Administrative contact phone number (US format) |

### Database Constraints

The migration includes the following CHECK constraints for data validation:

```sql
-- State must be 2 uppercase letters (e.g., 'CA', 'NY')
billing_state_format CHECK (billing_state IS NULL OR billing_state ~ '^[A-Z]{2}$')

-- ZIP must be exactly 5 digits
billing_zip_format CHECK (billing_zip IS NULL OR billing_zip ~ '^\d{5}$')

-- Basic email format validation for billing_email
billing_email_format CHECK (billing_email IS NULL OR billing_email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')

-- Basic email format validation for admin_contact_email
admin_contact_email_format CHECK (admin_contact_email IS NULL OR admin_contact_email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
```

### Why Nullable?

All fields are nullable in the database to support existing organizations that were created before these fields existed. However, **application-level validation enforces these fields as required for new organizations**.

## API Changes Required

### 1. POST `/api/organizations` - Create Organization

**Purpose**: Accept new billing/contact fields when creating an organization.

#### Request Body (Updated)

```typescript
{
  "name": string,                    // Required
  "description"?: string,            // Optional
  "billing_phone": string,           // Required (new)
  "billing_email": string,           // Required (new)
  "billing_address": string,         // Required (new)
  "billing_city": string,            // Required (new)
  "billing_state": string,           // Required (new) - 2-letter US state code
  "billing_zip": string,             // Required (new) - 5-digit ZIP
  "admin_contact_email": string,     // Required (new)
  "admin_contact_phone": string      // Required (new)
}
```

#### Validation Requirements

- **billing_phone** & **admin_contact_phone**: 
  - Must match US phone format: `(XXX) XXX-XXXX` or `XXX-XXX-XXXX`
  - Backend should accept either format and normalize to `(XXX) XXX-XXXX`
  
- **billing_email** & **admin_contact_email**:
  - Must be valid email format
  - Can be the same email address (user preference)
  
- **billing_state**:
  - Must be valid 2-letter US state code (uppercase)
  - Valid codes: AL, AK, AZ, AR, CA, CO, CT, DE, DC, FL, GA, HI, ID, IL, IN, IA, KS, KY, LA, ME, MD, MA, MI, MN, MS, MO, MT, NE, NV, NH, NJ, NM, NY, NC, ND, OH, OK, OR, PA, RI, SC, SD, TN, TX, UT, VT, VA, WA, WV, WI, WY
  
- **billing_zip**:
  - Must be exactly 5 digits
  
- **billing_address**:
  - Minimum 5 characters
  
- **billing_city**:
  - Minimum 2 characters

#### Response (Updated)

```typescript
{
  "data": {
    "id": string,
    "name": string,
    "description": string | null,
    "billing_phone": string,
    "billing_email": string,
    "billing_address": string,
    "billing_city": string,
    "billing_state": string,
    "billing_zip": string,
    "admin_contact_email": string,
    "admin_contact_phone": string,
    "created_at": string,
    "updated_at": string,
    // ... other organization fields
  }
}
```

#### Error Responses

```typescript
// 400 Bad Request - Validation Error
{
  "error": "Validation failed",
  "details": {
    "billing_phone": "Invalid phone format. Use (XXX) XXX-XXXX or XXX-XXX-XXXX",
    "billing_state": "Invalid US state code",
    "billing_zip": "ZIP code must be 5 digits"
  }
}

// 409 Conflict - Database constraint violation
{
  "error": "Invalid data format",
  "message": "Billing state must be a 2-letter uppercase code"
}
```

### 2. PUT `/api/organizations/:id` - Update Organization

**Purpose**: Allow updating billing/contact fields for existing organizations.

#### Request Body (Updated)

All billing fields are **optional** in updates (to allow partial updates):

```typescript
{
  "name"?: string,
  "description"?: string,
  "billing_phone"?: string,           // Optional in updates
  "billing_email"?: string,           // Optional in updates
  "billing_address"?: string,         // Optional in updates
  "billing_city"?: string,            // Optional in updates
  "billing_state"?: string,           // Optional in updates
  "billing_zip"?: string,             // Optional in updates
  "admin_contact_email"?: string,     // Optional in updates
  "admin_contact_phone"?: string      // Optional in updates
}
```

#### Validation Requirements

Same validation rules as POST endpoint apply to any fields that are provided.

#### Response

Same structure as POST endpoint.

### 3. GET `/api/organizations/:id` - Get Organization Details

**Purpose**: Return billing/contact fields in organization details.

#### Response (Updated)

```typescript
{
  "data": {
    "id": string,
    "name": string,
    "description": string | null,
    "billing_phone": string | null,        // New field
    "billing_email": string | null,        // New field
    "billing_address": string | null,      // New field
    "billing_city": string | null,         // New field
    "billing_state": string | null,        // New field
    "billing_zip": string | null,          // New field
    "admin_contact_email": string | null,  // New field
    "admin_contact_phone": string | null,  // New field
    "created_at": string,
    "updated_at": string,
    // ... other organization fields
  }
}
```

### 4. GET `/api/organizations` - List Organizations

**Purpose**: Include billing fields in organization list (optional, for admin views).

**Note**: For privacy reasons, consider whether to include billing details in list endpoints. You may want to:
- Exclude billing fields from list responses for non-admin users
- Only include them for users with `BillingContact`, `Admin`, or `SuperAdmin` roles

## Security Considerations

### 1. Access Control

Billing information is **sensitive PII (Personally Identifiable Information)**. Implement proper access controls:

#### Who Can View Billing Information?
- Users with roles: `SuperAdmin`, `Admin`, `BillingContact`
- The organization owner
- System superadmins (with `superadmin: true` flag)

#### Who Can Edit Billing Information?
- Users with roles: `SuperAdmin`, `Admin`, `BillingContact`
- The organization owner
- System superadmins

#### Implementation Example

```typescript
// Middleware to check billing access
async function checkBillingAccess(userId: string, orgId: string) {
  const membership = await supabase
    .from('organization_members')
    .select('role')
    .eq('user_id', userId)
    .eq('organization_id', orgId)
    .single();
    
  if (!membership.data) {
    throw new Error('Access denied');
  }
  
  const allowedRoles = ['SuperAdmin', 'Admin', 'BillingContact'];
  if (!allowedRoles.includes(membership.data.role)) {
    throw new Error('Insufficient permissions to access billing information');
  }
}
```

### 2. Row Level Security (RLS) Policies

The existing RLS policies on the `organizations` table should be reviewed. Consider adding a specific policy for billing field access:

```sql
-- Policy to restrict billing field updates to authorized users
CREATE POLICY "Users can update billing info if they have billing access"
ON organizations
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_members.organization_id = organizations.id
    AND organization_members.user_id = auth.uid()
    AND organization_members.role IN ('SuperAdmin', 'Admin', 'BillingContact')
  )
);
```

### 3. Data Privacy

- **Logging**: Be careful not to log billing information (emails, phones, addresses) in application logs
- **API Responses**: Only return billing fields to authorized users
- **Caching**: Avoid caching billing information in browser or CDN
- **Encryption**: Consider encrypting sensitive fields at rest (future enhancement)

## Audit Logging

The existing `audit_logs` table should automatically capture changes to billing fields through the audit trigger. Verify that:

1. **INSERT operations** on organizations log all billing fields in `new_data`
2. **UPDATE operations** log changed billing fields in both `old_data` and `new_data`
3. **DELETE operations** (soft deletes) log billing fields in `old_data`

### Example Audit Log Entry

```json
{
  "table_name": "organizations",
  "record_id": "uuid-here",
  "action": "UPDATE",
  "old_data": {
    "billing_email": "old@example.com",
    "billing_phone": "(555) 123-4567"
  },
  "new_data": {
    "billing_email": "new@example.com",
    "billing_phone": "(555) 987-6543"
  },
  "user_id": "uuid-here",
  "created_at": "2025-12-30T19:16:55Z"
}
```

## Backend Validation Implementation

### Validation Utilities Needed

The frontend includes a comprehensive validation utility at `lib/utils/billing-validation.ts`. The backend should implement equivalent validation:

```typescript
// Example backend validation (Node.js/TypeScript)

function validateUSPhone(phone: string): boolean {
  const format1 = /^\(\d{3}\)\s?\d{3}-\d{4}$/;  // (XXX) XXX-XXXX
  const format2 = /^\d{3}-\d{3}-\d{4}$/;        // XXX-XXX-XXXX
  return format1.test(phone) || format2.test(phone);
}

function formatUSPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length !== 10) return phone;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}

function validateUSZip(zip: string): boolean {
  return /^\d{5}$/.test(zip);
}

function validateEmail(email: string): boolean {
  return /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email);
}

function isValidUSState(state: string): boolean {
  const validStates = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'DC', 'FL',
    'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME',
    'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH',
    'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI',
    'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
  ];
  return validStates.includes(state.toUpperCase());
}

interface BillingContactFields {
  billing_phone: string;
  billing_email: string;
  billing_address: string;
  billing_city: string;
  billing_state: string;
  billing_zip: string;
  admin_contact_email: string;
  admin_contact_phone: string;
}

function validateBillingFields(fields: Partial<BillingContactFields>): string[] {
  const errors: string[] = [];
  
  if (fields.billing_phone && !validateUSPhone(fields.billing_phone)) {
    errors.push('Invalid billing phone format');
  }
  
  if (fields.billing_email && !validateEmail(fields.billing_email)) {
    errors.push('Invalid billing email');
  }
  
  if (fields.billing_state && !isValidUSState(fields.billing_state)) {
    errors.push('Invalid US state code');
  }
  
  if (fields.billing_zip && !validateUSZip(fields.billing_zip)) {
    errors.push('ZIP code must be 5 digits');
  }
  
  if (fields.admin_contact_email && !validateEmail(fields.admin_contact_email)) {
    errors.push('Invalid admin contact email');
  }
  
  if (fields.admin_contact_phone && !validateUSPhone(fields.admin_contact_phone)) {
    errors.push('Invalid admin contact phone format');
  }
  
  if (fields.billing_address && fields.billing_address.length < 5) {
    errors.push('Address must be at least 5 characters');
  }
  
  if (fields.billing_city && fields.billing_city.length < 2) {
    errors.push('City must be at least 2 characters');
  }
  
  return errors;
}
```

## Migration Strategy

### For Existing Organizations

Organizations created before this migration will have `NULL` values for all billing fields. The application handles this gracefully:

1. **Display**: Shows "Not set" for missing fields
2. **Warning**: Displays a prominent yellow warning banner when billing info is incomplete
3. **Enforcement**: New organizations MUST provide all billing fields
4. **Updates**: Existing organizations can be updated at any time via the "Edit Billing Info" button

### Data Migration (Optional)

If you want to prompt existing organizations to fill in their billing information, consider:

1. **Email Campaign**: Send emails to organization admins requesting billing information
2. **Banner Notification**: Show a banner on organization dashboard pages
3. **Billing Page Redirect**: Redirect to billing settings on next login if info is missing
4. **Grace Period**: Allow a grace period (e.g., 30 days) before enforcement

**Note**: The current implementation uses option #2 (warning banner on billing page).

## Testing Checklist

### API Endpoint Tests

- [ ] POST `/api/organizations` accepts all billing fields
- [ ] POST `/api/organizations` validates phone format
- [ ] POST `/api/organizations` validates email format
- [ ] POST `/api/organizations` validates state code
- [ ] POST `/api/organizations` validates ZIP code
- [ ] POST `/api/organizations` returns 400 for invalid data
- [ ] POST `/api/organizations` enforces required fields
- [ ] PUT `/api/organizations/:id` updates billing fields
- [ ] PUT `/api/organizations/:id` validates updated fields
- [ ] PUT `/api/organizations/:id` allows partial updates
- [ ] GET `/api/organizations/:id` returns billing fields
- [ ] GET `/api/organizations` handles billing fields appropriately

### Database Tests

- [ ] Migration runs successfully on dev database
- [ ] CHECK constraints work correctly
- [ ] Existing organizations remain accessible
- [ ] New organizations can be created with billing fields
- [ ] Billing fields can be updated
- [ ] Audit logs capture billing field changes

### Security Tests

- [ ] Non-authorized users cannot view billing info
- [ ] Non-authorized users cannot edit billing info
- [ ] BillingContact role can edit billing info
- [ ] Admin role can edit billing info
- [ ] SuperAdmin role can edit billing info
- [ ] Viewer role cannot edit billing info
- [ ] Editor role cannot edit billing info

### Integration Tests

- [ ] Create organization via frontend → data saved correctly
- [ ] Edit billing info via frontend → data updated correctly
- [ ] Validation errors display correctly
- [ ] Phone numbers auto-format correctly
- [ ] State dropdown works correctly
- [ ] ZIP code accepts only digits
- [ ] "Copy from billing email" checkbox works

## Deployment Steps

1. **Review Migration**: Ensure migration SQL is correct
2. **Backup Database**: Create backup before running migration
3. **Run Migration**: Apply migration to dev database first
4. **Verify Schema**: Check that columns exist with correct constraints
5. **Test API**: Verify API endpoints handle new fields
6. **Deploy Backend**: Deploy updated API code
7. **Deploy Frontend**: Deploy updated Next.js application
8. **Monitor**: Watch for errors in logs and user reports
9. **Production Migration**: Apply migration to production database
10. **Verify Production**: Test organization creation and updates in production

## Rollback Plan

If issues occur after deployment:

1. **Frontend Rollback**: Revert to previous Next.js deployment (fields will be hidden)
2. **Backend Rollback**: Revert to previous API version (will ignore billing fields)
3. **Database Rollback**: 
   ```sql
   -- Remove columns (only if absolutely necessary)
   ALTER TABLE organizations
   DROP COLUMN billing_phone,
   DROP COLUMN billing_email,
   DROP COLUMN billing_address,
   DROP COLUMN billing_city,
   DROP COLUMN billing_state,
   DROP COLUMN billing_zip,
   DROP COLUMN admin_contact_email,
   DROP COLUMN admin_contact_phone;
   ```

**Warning**: Database rollback will result in data loss for any billing information that was entered. Only rollback database as a last resort.

## Support and Troubleshooting

### Common Issues

1. **Migration fails with "column already exists"**
   - Check if migration was already run
   - Run: `SELECT column_name FROM information_schema.columns WHERE table_name = 'organizations'`

2. **CHECK constraint violations**
   - Verify data format before insert/update
   - Use backend validation functions to normalize data first

3. **Users can't edit billing info**
   - Check organization_members role
   - Verify RLS policies are correct
   - Check middleware auth logic

4. **Phone numbers not formatting**
   - Ensure `formatUSPhone()` is called before saving
   - Check that input contains exactly 10 digits

## Future Enhancements

1. **International Support**: Add support for international addresses and phone numbers
2. **Address Validation**: Integrate with USPS or similar service for address verification
3. **Multiple Contacts**: Support multiple billing/admin contacts per organization
4. **Contact History**: Track changes to contact information over time
5. **Email Verification**: Send verification emails to billing/admin contacts
6. **Phone Verification**: Implement SMS verification for phone numbers
7. **Field Encryption**: Encrypt sensitive billing fields at rest
8. **Stripe Integration**: Sync billing address with Stripe customer records

## Questions or Issues?

For questions about this implementation, contact the development team or refer to:
- Migration file: `supabase/migrations/20251230191655_add_billing_contact_fields.sql`
- Validation utilities: `lib/utils/billing-validation.ts`
- Create modal: `components/modals/AddOrganizationModal.tsx`
- Edit modal: `components/modals/EditBillingInfoModal.tsx`
- Billing page: `app/settings/billing/[org_id]/page.tsx`

