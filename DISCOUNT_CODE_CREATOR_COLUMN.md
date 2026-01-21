# Discount Code Creator Column Implementation

## Overview

Added a "Creator" column to the discount codes listing that displays the name of the superadmin who created each discount code. This column appears between the "Created" and "Actions" columns.

## Frontend Changes Completed ✅

### 1. Updated TypeScript Interface
**File:** `lib/api-client.ts`

Added creator fields to the `PromotionCode` interface:
```typescript
export interface PromotionCode {
  // ... existing fields ...
  created_by: string | null;
  creator_name: string | null;
  creator_email: string | null;
  created_at: string;
  updated_at: string;
}
```

### 2. Updated Admin Discount Codes Page
**File:** `app/admin/discounts/page.tsx`

#### Desktop Table View
- Added "Creator" column header between "Created" and "Actions"
- Displays creator name with email tooltip on hover
- Shows "Unknown" if no creator information is available

```tsx
<th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-gray-100">Creator</th>
```

```tsx
<td className="py-3 px-4">
  {code.creator_name ? (
    <Tooltip content={code.creator_email || 'No email available'}>
      <span className="text-gray-600 dark:text-gray-300 cursor-help">
        {code.creator_name}
      </span>
    </Tooltip>
  ) : (
    <span className="text-gray-400">Unknown</span>
  )}
</td>
```

#### Mobile Card View
- Added "Created by" field to mobile cards
- Shows creator name or "Unknown" if not available

```tsx
<div className="flex justify-between">
  <span className="text-gray-500">Created by:</span>
  <span className="text-gray-900 dark:text-white">
    {code.creator_name || 'Unknown'}
  </span>
</div>
```

### 3. Updated Backend Documentation
**File:** `documentation/DISCOUNT_CODES_BACKEND.md`

Updated the List Promotion Codes API response to include creator fields and added SQL JOIN example.

---

## Backend Implementation Required ⚠️

### What Needs to Be Done

The backend API endpoint `GET /api/discounts` must be updated to include creator information by joining with the `profiles` table.

### Database Query

Update the query to join with the `profiles` table:

```sql
SELECT 
  pc.*,
  p.name as creator_name,
  p.email as creator_email
FROM promotion_codes pc
LEFT JOIN profiles p ON pc.created_by = p.id
WHERE 
  (${active_only} = false OR pc.is_active = true)
ORDER BY pc.created_at DESC
LIMIT ${limit} OFFSET ${offset};
```

**Important Note:** Both `promotion_codes.created_by` and `profiles.id` reference `auth.users(id)`, so you can join them directly. However, you **cannot** use PostgREST automatic relationship expansion because `created_by` references `auth.users` schema, not `profiles` directly.

### API Response Format

The response should include these additional fields for each promotion code:

```json
{
  "promotion_codes": [
    {
      "id": "uuid",
      "code": "SAVE20",
      // ... other fields ...
      "created_by": "user-uuid-123",
      "creator_name": "John Smith",
      "creator_email": "john.smith@example.com",
      "created_at": "2025-12-01T00:00:00Z",
      "updated_at": "2025-12-01T00:00:00Z"
    }
  ],
  "total": 10,
  "page": 1,
  "limit": 25
}
```

### Handling Missing Data

- If `created_by` is `NULL`, return `NULL` for both `creator_name` and `creator_email`
- If the profile doesn't exist (user deleted), return `NULL` for both fields
- The frontend will display "Unknown" in these cases

### Backend Implementation Checklist

- [ ] Update the `GET /api/discounts` endpoint to join with `profiles` table
- [ ] Add `creator_name` and `creator_email` to the response
- [ ] Ensure the query handles NULL values gracefully
- [ ] Test with codes created by existing users
- [ ] Test with codes that have NULL `created_by`
- [ ] Test with codes where the creator's profile was deleted

---

## Testing

### Frontend Testing (Already Working)

The frontend is ready and will:
1. Display creator names when the backend provides them
2. Show "Unknown" when creator information is not available
3. Display creator email in a tooltip when hovering over the name

### Backend Testing Needed

Once the backend is updated:
1. Create a discount code as a superadmin
2. Verify the API returns your name and email
3. List all discount codes and verify creator information appears
4. Check that codes with NULL `created_by` show as "Unknown"

---

## Database Schema Reference

The `promotion_codes` table already has the `created_by` column:

```sql
created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
```

The `profiles` table has the necessary fields:
- `id` (UUID, primary key)
- `full_name` (TEXT)
- `email` (TEXT)

---

## Summary

✅ **Frontend:** Fully implemented and ready  
⚠️ **Backend:** Requires SQL query update to join with profiles table  
📝 **Documentation:** Updated with implementation details

The frontend will gracefully handle missing data until the backend is updated.
