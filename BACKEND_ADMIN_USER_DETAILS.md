# Backend Admin User Details API Specification

## Overview

This document specifies the backend API endpoint required for viewing detailed user information in the admin portal. This endpoint enables administrators to view a read-only modal with comprehensive user profile information.

---

## Architecture

- **Frontend**: Next.js app makes API call via `lib/api-client.ts` adminApi.getUser() method
- **Backend**: Express.js API validates admin privileges, fetches user data from profiles table
- **Authentication**: Uses standard JWT tokens from Supabase Auth
- **Database**: Queries `profiles` table for user information

---

## Required API Endpoint

### GET `/api/admin/users/:userId`

**Purpose**: Fetch detailed user information for admin view (read-only modal display).

**Authorization**: 
- Verify JWT token from Supabase Auth
- Check that user has `superadmin = true` in profiles table
- Return 403 Forbidden if not authorized

**URL Parameters**:
- `userId` (string, UUID): User ID

**Response (200 OK)**:

```json
{
  "data": {
    "id": "uuid",
    "name": "John Doe",
    "display_name": "Johnny",
    "email": "john@example.com",
    "title": "Senior Developer",
    "phone": "(555) 123-4567",
    "timezone": "America/Los_Angeles",
    "bio": "Software engineer with 10 years of experience...",
    "status": "active",
    "created_at": "2024-01-01T00:00:00Z",
    "last_login": "2024-01-15T10:30:00Z"
  }
}
```

**Implementation**:

```javascript
// GET /api/admin/users/:userId
router.get('/admin/users/:userId',
  authenticateUser,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const { userId } = req.params;
      
      // Fetch user profile
      const { data: user, error: userError } = await supabase
        .from('profiles')
        .select(`
          id,
          name,
          display_name,
          email,
          title,
          phone,
          timezone,
          bio,
          status,
          created_at,
          last_login
        `)
        .eq('id', userId)
        .single();
        
      if (userError || !user) {
        return res.status(404).json({ 
          error: 'User not found' 
        });
      }
      
      // Log audit action
      await logAdminAction({
        actorId: req.user.id,
        action: 'admin.user.view',
        resourceType: 'user',
        resourceId: userId,
        details: { 
          user_name: user.name,
          user_email: user.email
        }
      });
      
      res.json({ data: user });
    } catch (error) {
      console.error('Error fetching user details:', error);
      res.status(500).json({ 
        error: 'Failed to fetch user details' 
      });
    }
  }
);
```

**Error Responses**:
- `401 Unauthorized`: Missing or invalid JWT token
- `403 Forbidden`: User is not a superadmin
- `404 Not Found`: User does not exist
- `500 Internal Server Error`: Database or server error

---

## Database Schema

### Profiles Table Fields

The endpoint returns the following fields from the `profiles` table:

| Field | Type | Description | Required |
|-------|------|-------------|----------|
| `id` | UUID | User ID (primary key) | Yes |
| `name` | TEXT | Full name | Yes |
| `display_name` | TEXT | Display name / nickname | No |
| `email` | TEXT | Email address | Yes |
| `title` | TEXT | Job title / role | No |
| `phone` | TEXT | Phone number | No |
| `timezone` | TEXT | User's timezone | No |
| `bio` | TEXT | User biography / description | No |
| `status` | TEXT | Account status (active/disabled) | Yes |
| `created_at` | TIMESTAMPTZ | Account creation timestamp | Yes |
| `last_login` | TIMESTAMPTZ | Last login timestamp | No |

**Note**: All optional fields should be handled gracefully in the frontend if they are NULL or empty.

---

## Frontend Integration

### API Client Update

**File**: `lib/api-client.ts`

Add the following method to the `adminApi` object:

```typescript
/**
 * Get user details (admin only)
 */
getUser: (userId: string) => {
  return apiClient.get(`/admin/users/${userId}`);
},
```

**Location**: Add after `listUsers` method (around line 485)

---

## Audit Logging

The endpoint logs the following audit action:

| Field | Value |
|-------|-------|
| `action` | `admin.user.view` |
| `resourceType` | `user` |
| `resourceId` | User ID being viewed |
| `actorId` | Admin user ID performing the action |
| `details` | `{ user_name, user_email }` |

This ensures all admin views of user details are tracked for compliance and security purposes.

---

## Security Considerations

1. **Authentication**: All requests require valid JWT token from Supabase Auth
2. **Authorization**: All requests require `superadmin = true` in profiles table
3. **Audit Logging**: All successful views are logged with actor and timestamp
4. **Input Validation**: UUID format validated for userId parameter
5. **Error Handling**: No sensitive information leaked in error messages
6. **Rate Limiting**: Consider applying rate limits to prevent abuse

---

## Testing Checklist

### Backend Tests
- [ ] `GET /api/admin/users/:userId` returns full user details
- [ ] `GET /api/admin/users/:userId` requires superadmin authentication
- [ ] `GET /api/admin/users/:userId` returns 404 for non-existent user
- [ ] `GET /api/admin/users/:userId` returns 403 for non-superadmin users
- [ ] Audit log entry created with admin ID and timestamp
- [ ] All profile fields returned correctly (including optional fields)
- [ ] NULL/empty optional fields handled gracefully

### Frontend Tests
- [ ] Modal opens from "View Detail" action in admin users page
- [ ] All fields display correctly in modal
- [ ] Optional fields handled gracefully when missing
- [ ] Modal closes properly
- [ ] Error states handled (user not found, permission denied)
- [ ] Loading state displays while fetching data

---

## Error Response Format

All endpoints follow consistent error response format:

```json
{
  "error": "Short error identifier"
}
```

**Common Error Codes**:
- `401`: Missing or invalid JWT token
- `403`: Insufficient permissions (not superadmin)
- `404`: Resource not found
- `500`: Internal server error

---

## Implementation Notes

1. **Similar Pattern**: This endpoint follows the same pattern as `GET /api/admin/organizations/:orgId` for consistency
2. **Read-Only**: This endpoint is strictly read-only; no mutations are performed
3. **No Sensitive Data**: Do not expose password hashes or authentication tokens
4. **Timezone Handling**: Timestamps should be returned in ISO 8601 format with timezone info
5. **Optional Fields**: Frontend must handle NULL values for optional fields (display_name, title, phone, timezone, bio, last_login)

---

## Summary

**Endpoint**: `GET /api/admin/users/:userId`

**Purpose**: Fetch detailed user profile information for admin view

**Authentication**: JWT token + superadmin check

**Authorization**: Superadmin only

**Audit Logging**: Yes (`admin.user.view`)

**Rate Limiting**: Recommended (10 requests per minute per admin)

**Frontend Component**: `ViewUserDetailsModal.tsx` (displays read-only user details)

**Backend Location**: `routes/admin.js` or `routes/admin/users.js`

