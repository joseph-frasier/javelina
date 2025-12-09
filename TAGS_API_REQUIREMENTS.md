# Tags API Backend Requirements

This document specifies the Express API endpoints required to support the tagging system for DNS zones.

## Overview

Tags are organization-scoped labels that users can create and assign to zones for organization and filtering. Tags have colors, can be marked as favorites (organization-wide), and can be reordered.

## Database Schema Reference

See migration: `supabase/migrations/20251209000000_create_tags_tables.sql`

**Tables:**
- `tags` - Stores tag definitions per organization
- `zone_tags` - Junction table linking zones to tags

## API Endpoints

### 1. GET /api/tags

List all tags for an organization, including assignment counts.

**Query Parameters:**
- `org_id` (required) - Organization ID

**Authorization:** 
- Requires valid JWT token
- User must be a member of the organization

**Response (200 OK):**
```json
{
  "data": {
    "tags": [
      {
        "id": "uuid",
        "organization_id": "uuid",
        "name": "Production",
        "color": "#22C55E",
        "is_favorite": true,
        "display_order": 0,
        "created_by": "uuid",
        "created_at": "2025-12-09T00:00:00Z",
        "updated_at": "2025-12-09T00:00:00Z",
        "zone_count": 5
      }
    ],
    "assignments": [
      {
        "zone_id": "uuid",
        "tag_ids": ["uuid1", "uuid2"]
      }
    ]
  }
}
```

**Implementation Notes:**
```sql
-- Get tags with zone counts
SELECT 
  t.*,
  COUNT(zt.zone_id) as zone_count
FROM tags t
LEFT JOIN zone_tags zt ON zt.tag_id = t.id
WHERE t.organization_id = $org_id
GROUP BY t.id
ORDER BY t.display_order, t.created_at;

-- Get all zone-tag assignments for the org
SELECT 
  z.id as zone_id,
  ARRAY_AGG(zt.tag_id) as tag_ids
FROM zones z
LEFT JOIN zone_tags zt ON zt.zone_id = z.id
WHERE z.organization_id = $org_id
  AND zt.tag_id IS NOT NULL
GROUP BY z.id;
```

**Error Responses:**
- `400` - Missing or invalid org_id
- `401` - Not authenticated
- `403` - User not member of organization

---

### 2. POST /api/tags

Create a new tag for an organization.

**Authorization:**
- Requires valid JWT token
- User must be SuperAdmin or Admin of the organization

**Request Body:**
```json
{
  "organization_id": "uuid",
  "name": "Staging",
  "color": "#EAB308"
}
```

**Validation:**
- `name` - Required, 1-30 characters, must be unique within organization (case-insensitive)
- `color` - Required, valid hex color (#RRGGBB)
- `organization_id` - Required, must be valid UUID

**Response (201 Created):**
```json
{
  "data": {
    "id": "uuid",
    "organization_id": "uuid",
    "name": "Staging",
    "color": "#EAB308",
    "is_favorite": false,
    "display_order": 0,
    "created_by": "uuid",
    "created_at": "2025-12-09T00:00:00Z",
    "updated_at": "2025-12-09T00:00:00Z"
  }
}
```

**Implementation Notes:**
```sql
-- Set display_order to max + 1 for new tags
INSERT INTO tags (
  organization_id, 
  name, 
  color, 
  created_by,
  display_order
)
VALUES (
  $org_id,
  $name,
  $color,
  $user_id,
  COALESCE((SELECT MAX(display_order) + 1 FROM tags WHERE organization_id = $org_id), 0)
)
RETURNING *;
```

**Error Responses:**
- `400` - Invalid request body or validation failed
- `401` - Not authenticated
- `403` - User not Admin/SuperAdmin of organization
- `409` - Tag name already exists in organization (case-insensitive)

---

### 3. PUT /api/tags/:id

Update an existing tag.

**Authorization:**
- Requires valid JWT token
- User must be SuperAdmin or Admin of the organization

**Request Body:**
```json
{
  "name": "Production Updated",
  "color": "#10B981",
  "is_favorite": true,
  "display_order": 5
}
```

**Validation:**
- All fields optional
- `name` - If provided, 1-30 characters, must be unique within organization (case-insensitive)
- `color` - If provided, valid hex color (#RRGGBB)
- `is_favorite` - Boolean
- `display_order` - Integer >= 0

**Response (200 OK):**
```json
{
  "data": {
    "id": "uuid",
    "organization_id": "uuid",
    "name": "Production Updated",
    "color": "#10B981",
    "is_favorite": true,
    "display_order": 5,
    "created_by": "uuid",
    "created_at": "2025-12-09T00:00:00Z",
    "updated_at": "2025-12-09T00:00:00Z"
  }
}
```

**Implementation Notes:**
- RLS policies will enforce organization membership
- `updated_at` is automatically updated via trigger

**Error Responses:**
- `400` - Invalid request body or validation failed
- `401` - Not authenticated
- `403` - User not Admin/SuperAdmin of organization
- `404` - Tag not found
- `409` - Tag name already exists in organization (case-insensitive)

---

### 4. DELETE /api/tags/:id

Delete a tag and remove all its assignments to zones.

**Authorization:**
- Requires valid JWT token
- User must be SuperAdmin or Admin of the organization

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Tag deleted successfully",
  "zone_assignments_removed": 12
}
```

**Implementation Notes:**
- Cascade delete via foreign key will automatically remove zone_tags entries
- Return count of affected zones for user feedback

**Error Responses:**
- `401` - Not authenticated
- `403` - User not Admin/SuperAdmin of organization
- `404` - Tag not found

---

### 5. GET /api/tags/zones/:zoneId

Get all tags assigned to a specific zone.

**Authorization:**
- Requires valid JWT token
- User must be a member of the organization that owns the zone

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "uuid",
      "organization_id": "uuid",
      "name": "Production",
      "color": "#22C55E",
      "is_favorite": true,
      "display_order": 0,
      "created_by": "uuid",
      "created_at": "2025-12-09T00:00:00Z",
      "updated_at": "2025-12-09T00:00:00Z"
    }
  ]
}
```

**Implementation Notes:**
```sql
SELECT t.*
FROM tags t
JOIN zone_tags zt ON zt.tag_id = t.id
WHERE zt.zone_id = $zone_id
ORDER BY t.display_order, t.created_at;
```

**Error Responses:**
- `401` - Not authenticated
- `403` - User not member of organization that owns zone
- `404` - Zone not found

---

### 6. PUT /api/tags/zones/:zoneId

Update the tag assignments for a zone (replaces all existing assignments).

**Authorization:**
- Requires valid JWT token
- User must be SuperAdmin, Admin, or Editor of the organization

**Request Body:**
```json
{
  "tag_ids": ["uuid1", "uuid2", "uuid3"]
}
```

**Validation:**
- `tag_ids` - Required, array of valid tag UUIDs (can be empty to remove all tags)
- All tag IDs must belong to the same organization as the zone

**Response (200 OK):**
```json
{
  "data": {
    "zone_id": "uuid",
    "tag_ids": ["uuid1", "uuid2", "uuid3"]
  }
}
```

**Implementation Notes:**
```sql
-- Delete existing assignments
DELETE FROM zone_tags WHERE zone_id = $zone_id;

-- Insert new assignments
INSERT INTO zone_tags (zone_id, tag_id)
SELECT $zone_id, unnest($tag_ids::uuid[])
ON CONFLICT DO NOTHING;
```

**Error Responses:**
- `400` - Invalid tag IDs or tags from different organization
- `401` - Not authenticated
- `403` - User not Admin/SuperAdmin/Editor of organization
- `404` - Zone not found

---

## Bulk Operations (Optional Enhancement)

### POST /api/tags/zones/bulk-assign

Assign tags to multiple zones at once.

**Request Body:**
```json
{
  "zone_ids": ["uuid1", "uuid2"],
  "tag_ids": ["uuid3", "uuid4"],
  "mode": "add"
}
```

**Modes:**
- `add` - Add tags to zones (keep existing)
- `replace` - Replace all zone tags with specified tags
- `remove` - Remove specified tags from zones

---

## Error Response Format

All error responses follow this format:

```json
{
  "error": "Error message",
  "details": {
    "field": "Additional context"
  }
}
```

---

## Authentication

All endpoints require a JWT token from Supabase auth in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

The token should be validated using Supabase's JWT verification, and the user ID extracted from `auth.uid()` for RLS policy enforcement.

---

## Rate Limiting

Consider implementing rate limiting on tag creation/update endpoints:
- Tag creation: 50 requests per minute per user
- Tag updates: 100 requests per minute per user
- Tag assignment: 100 requests per minute per user

---

## Testing Checklist

- [ ] Create tag with valid data
- [ ] Create tag with duplicate name (should fail)
- [ ] Create tag with invalid color format (should fail)
- [ ] Update tag name, color, favorite status
- [ ] Update tag display_order for reordering
- [ ] Delete tag (verify zone_tags cascade delete)
- [ ] List tags with correct zone counts
- [ ] Assign tags to zone
- [ ] Remove all tags from zone
- [ ] Verify RLS prevents unauthorized access
- [ ] Test with user who is not org member (should fail)
- [ ] Test with Viewer role (should fail for create/update/delete)

