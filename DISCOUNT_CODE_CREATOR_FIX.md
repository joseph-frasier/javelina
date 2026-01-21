# Discount Code Creator Column - CORRECTED Backend Implementation

## The Problem

The error `"Could not find a relationship between 'promotion_codes' and 'created_by'"` occurs because:
- `promotion_codes.created_by` references `auth.users(id)` 
- You can't automatically expand `auth.users` through PostgREST/Supabase client
- The relationship needs to be manually joined with the `profiles` table

## Database Schema Reality

```sql
-- promotion_codes table
created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL

-- profiles table  
id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY
name TEXT  -- NOT "full_name"!
email TEXT
```

## Correct Backend Solution

### Option 1: Raw SQL Query (Recommended)

Since both `promotion_codes.created_by` and `profiles.id` reference the same `auth.users(id)`, you can join them directly:

```typescript
const query = `
  SELECT 
    pc.*,
    p.name as creator_name,
    p.email as creator_email
  FROM promotion_codes pc
  LEFT JOIN profiles p ON pc.created_by = p.id
  WHERE 
    ($1::boolean = false OR pc.is_active = true)
  ORDER BY pc.created_at DESC
  LIMIT $2 OFFSET $3
`;

const result = await supabase.rpc('exec_sql', {
  query,
  params: [active_only, limit, offset]
});
```

### Option 2: Supabase Client with Manual Join

If you're using Supabase client, you can't use automatic relationship expansion. Instead:

```typescript
// First, get promotion codes
const { data: codes, error } = await supabase
  .from('promotion_codes')
  .select('*')
  .order('created_at', { ascending: false });

if (error) throw error;

// Get unique creator IDs
const creatorIds = [...new Set(codes.map(c => c.created_by).filter(Boolean))];

// Fetch creator profiles
const { data: profiles } = await supabase
  .from('profiles')
  .select('id, name, email')
  .in('id', creatorIds);

// Create a lookup map
const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

// Merge data
const codesWithCreators = codes.map(code => ({
  ...code,
  creator_name: profileMap.get(code.created_by)?.name || null,
  creator_email: profileMap.get(code.created_by)?.email || null,
}));
```

### Option 3: Database View (Best Long-term Solution)

Create a database view that includes creator information:

```sql
CREATE OR REPLACE VIEW promotion_codes_with_creators AS
SELECT 
  pc.*,
  p.name as creator_name,
  p.email as creator_email
FROM promotion_codes pc
LEFT JOIN profiles p ON pc.created_by = p.id;
```

Then query the view:

```typescript
const { data, error } = await supabase
  .from('promotion_codes_with_creators')
  .select('*')
  .order('created_at', { ascending: false });
```

## Updated API Response

```typescript
export interface PromotionCode {
  id: string;
  stripe_promotion_code_id: string;
  stripe_coupon_id: string;
  code: string;
  discount_type: 'percent_off' | 'amount_off';
  discount_value: number;
  currency: string;
  max_redemptions: number | null;
  times_redeemed: number;
  first_time_transaction_only: boolean;
  applies_to_plans: string[] | null;
  expires_at: string | null;
  is_active: boolean;
  metadata: Record<string, any>;
  created_by: string | null;
  creator_name: string | null;  // From profiles.name (not full_name)
  creator_email: string | null;  // From profiles.email
  created_at: string;
  updated_at: string;
}
```

## What I Got Wrong

1. ❌ Suggested using `profiles.full_name` - **doesn't exist**, it's `profiles.name`
2. ❌ Implied PostgREST could auto-expand the relationship - **it can't** because `created_by` references `auth.users`, not `profiles`
3. ❌ Didn't verify the actual schema before writing documentation

## Apologies

I should have:
1. Read the actual migration files first
2. Understood how Supabase/PostgREST relationship expansion works
3. Tested the query structure before documenting it

The frontend is correct and will work once the backend uses one of the solutions above.
