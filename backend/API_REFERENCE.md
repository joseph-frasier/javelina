# API Reference

Base URL: `http://localhost:3001/api`

All protected endpoints require: `Authorization: Bearer <jwt_token>`

## Response Format

**Success:**

```json
{
  "success": true,
  "data": { ... },
  "message": "Optional message"
}
```

**Error:**

```json
{
  "success": false,
  "error": "Error message"
}
```

## Health Check

### `GET /health`

Check API health status.

**Response:**

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "timestamp": "2025-10-24T...",
    "uptime": 1234.56
  }
}
```

### `GET /health/db`

Test database connection.

### `GET /health/auth` 🔒

Test authentication (requires token).

## Organizations

### `GET /organizations` 🔒

List user's organizations.

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Org Name",
      "description": "Description",
      "created_at": "2025-10-24T...",
      "updated_at": "2025-10-24T...",
      "organization_members": [{ "role": "SuperAdmin" }]
    }
  ]
}
```

### `POST /organizations` 🔒

Create organization.

**Body:**

```json
{
  "name": "Organization Name",
  "description": "Optional description"
}
```

**Permissions:** Any authenticated user

### `GET /organizations/:id` 🔒

Get organization details.

**Permissions:** Organization member

### `PUT /organizations/:id` 🔒

Update organization.

**Body:**

```json
{
  "name": "New Name",
  "description": "New description"
}
```

**Permissions:** SuperAdmin, Admin

### `DELETE /organizations/:id` 🔒

Delete organization.

**Permissions:** SuperAdmin, Admin

### `GET /organizations/:id/members` 🔒

List organization members.

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "user_id": "uuid",
      "organization_id": "uuid",
      "role": "SuperAdmin",
      "environments_count": 5,
      "zones_count": 12,
      "created_at": "2025-10-24T...",
      "profiles": {
        "name": "John Doe",
        "email": "john@example.com",
        "avatar_url": "..."
      }
    }
  ]
}
```

## Environments

### `GET /environments` 🔒

List all accessible environments.

### `GET /environments/organization/:orgId` 🔒

List environments for organization.

**Permissions:** Organization member

### `POST /environments` 🔒

Create environment.

**Body:**

```json
{
  "name": "Production",
  "environment_type": "production",
  "location": "us-east-1",
  "description": "Production environment",
  "organization_id": "uuid"
}
```

**Fields:**

- `environment_type`: `production` | `staging` | `development`

**Permissions:** SuperAdmin, Admin

### `GET /environments/:id` 🔒

Get environment details.

### `PUT /environments/:id` 🔒

Update environment.

**Permissions:** SuperAdmin, Admin, Editor

### `DELETE /environments/:id` 🔒

Delete environment.

**Permissions:** SuperAdmin, Admin

## Zones

### `GET /zones` 🔒

List all accessible zones.

### `GET /zones/environment/:envId` 🔒

List zones for environment.

**Permissions:** Organization member

### `POST /zones` 🔒

Create zone.

**Body:**

```json
{
  "name": "example.com",
  "zone_type": "primary",
  "description": "Main domain",
  "environment_id": "uuid"
}
```

**Fields:**

- `zone_type`: `primary` | `secondary` | `redirect`
- `name`: Valid domain name (max 253 chars)

**Permissions:** SuperAdmin, Admin

### `GET /zones/:id` 🔒

Get zone details.

### `PUT /zones/:id` 🔒

Update zone.

**Permissions:** SuperAdmin, Admin, Editor

### `DELETE /zones/:id` 🔒

Delete zone.

**Permissions:** SuperAdmin, Admin

### `POST /zones/:id/verify` 🔒

Verify zone nameservers.

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "verification_status": "verified",
    "last_verified_at": "2025-10-24T...",
    "message": "Nameservers verified successfully"
  }
}
```

**Note:** Currently simulated - implement actual DNS verification as needed.

## DNS Records

### `GET /dns-records/zone/:zoneId` 🔒

List DNS records for zone.

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "zone_id": "uuid",
      "name": "@",
      "type": "A",
      "value": "192.168.1.1",
      "ttl": 3600,
      "priority": null,
      "status": "active",
      "created_at": "2025-10-24T...",
      "updated_at": "2025-10-24T..."
    }
  ]
}
```

### `POST /dns-records` 🔒

Create DNS record.

**Body:**

```json
{
  "zone_id": "uuid",
  "name": "@",
  "type": "A",
  "value": "192.168.1.1",
  "ttl": 3600,
  "priority": null,
  "status": "active"
}
```

**Fields:**

- `type`: `A` | `AAAA` | `CNAME` | `MX` | `NS` | `TXT` | `SOA` | `SRV` | `CAA`
- `ttl`: Positive number (seconds)
- `priority`: Required for MX, SRV records

**Permissions:** SuperAdmin, Admin, Editor

### `GET /dns-records/:id` 🔒

Get DNS record details.

### `PUT /dns-records/:id` 🔒

Update DNS record.

**Permissions:** SuperAdmin, Admin, Editor

### `DELETE /dns-records/:id` 🔒

Delete DNS record.

**Permissions:** SuperAdmin, Admin, Editor

## Profiles

### `GET /profiles/me` 🔒

Get current user's profile.

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "display_name": "John",
    "title": "DevOps Engineer",
    "phone": "+1234567890",
    "timezone": "America/New_York",
    "bio": "...",
    "avatar_url": "...",
    "role": "user",
    "mfa_enabled": false,
    "sso_connected": false,
    "last_login": "2025-10-24T...",
    "created_at": "2025-10-24T...",
    "updated_at": "2025-10-24T..."
  }
}
```

### `PUT /profiles/me` 🔒

Update current user's profile.

**Body:**

```json
{
  "name": "John Doe",
  "display_name": "John",
  "title": "Senior DevOps",
  "phone": "+1234567890",
  "timezone": "America/New_York",
  "bio": "DevOps professional",
  "avatar_url": "https://..."
}
```

### `GET /profiles/:id` 🔒

Get user profile (if shares organization).

**Response:** Limited fields for privacy

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "John Doe",
    "display_name": "John",
    "title": "DevOps Engineer",
    "email": "john@example.com",
    "avatar_url": "...",
    "created_at": "2025-10-24T..."
  }
}
```

## Audit Logs

### `GET /audit-logs` 🔒

List audit logs (filtered by access).

**Query Parameters:**

- `page`: Page number (default: 1)
- `limit`: Items per page (max: 100, default: 50)
- `table_name`: Filter by table
- `action`: Filter by action (INSERT, UPDATE, DELETE)

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "table_name": "organizations",
      "record_id": "uuid",
      "action": "UPDATE",
      "old_data": { ... },
      "new_data": { ... },
      "user_id": "uuid",
      "created_at": "2025-10-24T...",
      "profiles": {
        "name": "John Doe",
        "email": "john@example.com"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "totalPages": 3
  }
}
```

### `GET /audit-logs/resource/:resourceId` 🔒

Get audit logs for specific resource.

**Query Parameters:**

- `table_name`: Required (organizations, environments, zones)

### `GET /audit-logs/user/:userId` 🔒

Get logs for user's actions.

**Query Parameters:**

- `page`: Page number
- `limit`: Items per page

## Admin (Superuser Only)

### `GET /admin/users` 🔒 👑

List all users.

**Query Parameters:**

- `page`: Page number
- `limit`: Items per page
- `search`: Search by name or email

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "display_name": "John",
      "title": "DevOps",
      "role": "user",
      "mfa_enabled": false,
      "last_login": "2025-10-24T...",
      "created_at": "2025-10-24T..."
    }
  ],
  "pagination": { ... }
}
```

### `GET /admin/stats` 🔒 👑

Get system statistics.

**Response:**

```json
{
  "success": true,
  "data": {
    "users": {
      "total": 150,
      "active": 89
    },
    "organizations": 25,
    "environments": 45,
    "zones": 120,
    "dnsRecords": 1543,
    "activity": {
      "recentAuditLogs": 234
    },
    "timestamp": "2025-10-24T..."
  }
}
```

### `GET /admin/organizations` 🔒 👑

List all organizations.

**Query Parameters:**

- `page`: Page number
- `limit`: Items per page
- `search`: Search by name

### `GET /admin/audit-logs` 🔒 👑

Get all audit logs (unfiltered).

**Query Parameters:**

- `page`, `limit`, `table_name`, `action`

### `DELETE /admin/users/:id` 🔒 👑

Delete user.

**Note:** Cannot delete yourself

### `PUT /admin/users/:id/role` 🔒 👑

Update user role.

**Body:**

```json
{
  "role": "superuser"
}
```

**Fields:**

- `role`: `user` | `superuser`

**Note:** Cannot change your own role

## Error Codes

| Code | Meaning                              |
| ---- | ------------------------------------ |
| 200  | Success                              |
| 201  | Created                              |
| 400  | Bad Request / Validation Error       |
| 401  | Unauthorized / Invalid Token         |
| 403  | Forbidden / Insufficient Permissions |
| 404  | Not Found                            |
| 500  | Internal Server Error                |
| 503  | Service Unavailable                  |

## Rate Limiting

Currently no rate limiting is implemented. Consider adding for production:

- express-rate-limit
- Redis-based rate limiting for distributed systems

## Pagination

Endpoints that return lists support pagination:

**Query Parameters:**

- `page`: Page number (default: 1)
- `limit`: Items per page (max: 100, default: 50)

**Response:**

```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "totalPages": 3
  }
}
```

## Legend

- 🔒 = Requires authentication
- 👑 = Requires superuser role

## cURL Examples

```bash
# Set your token
TOKEN="your_jwt_token"

# List organizations
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/organizations

# Create organization
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Acme Corp","description":"Main org"}' \
  http://localhost:3001/api/organizations

# Get organization
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/organizations/{id}

# Update profile
curl -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","title":"Senior DevOps"}' \
  http://localhost:3001/api/profiles/me

# List zones with pagination
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3001/api/zones?page=1&limit=20"
```
