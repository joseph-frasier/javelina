# Backend Quick Start Guide

## Setup (5 minutes)

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in your Supabase credentials:

```bash
# Create .env file
PORT=3001
NODE_ENV=development

# Get these from your Supabase Dashboard > Settings > API
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Your frontend URL
FRONTEND_URL=http://localhost:3000
```

### 3. Start the Server

```bash
npm run dev
```

You should see:

```
==================================================
🚀 Javelina Backend API Server
==================================================
Environment: development
Port: 3001
URL: http://localhost:3001
Health: http://localhost:3001/api/health
==================================================
```

## Test the API

### 1. Health Check (No Auth Required)

```bash
curl http://localhost:3001/api/health
```

Expected response:

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "timestamp": "2025-10-24T...",
    "uptime": 1.234
  },
  "message": "Service is healthy"
}
```

### 2. Test Database Connection

```bash
curl http://localhost:3001/api/health/db
```

### 3. Test Authentication

First, get a token from your frontend or Supabase:

```bash
# Example: Login to get token
TOKEN="your_supabase_jwt_token"

# Test protected endpoint
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/health/auth
```

### 4. Create an Organization

```bash
curl -X POST http://localhost:3001/api/organizations \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Test Organization",
    "description": "Testing the backend API"
  }'
```

### 5. List Organizations

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/organizations
```

## API Endpoints Overview

### Public Routes (No Auth)

- `GET /` - API info
- `GET /api/health` - Health check
- `GET /api/health/ping` - Ping
- `GET /api/health/db` - Database test

### Protected Routes (Require Auth Token)

**Organizations**

- `GET /api/organizations` - List all
- `POST /api/organizations` - Create
- `GET /api/organizations/:id` - Get one
- `PUT /api/organizations/:id` - Update
- `DELETE /api/organizations/:id` - Delete
- `GET /api/organizations/:id/members` - List members

**Environments**

- `GET /api/environments` - List all
- `GET /api/environments/organization/:orgId` - By org
- `POST /api/environments` - Create
- `GET /api/environments/:id` - Get one
- `PUT /api/environments/:id` - Update
- `DELETE /api/environments/:id` - Delete

**Zones**

- `GET /api/zones` - List all
- `GET /api/zones/environment/:envId` - By environment
- `POST /api/zones` - Create
- `GET /api/zones/:id` - Get one
- `PUT /api/zones/:id` - Update
- `DELETE /api/zones/:id` - Delete
- `POST /api/zones/:id/verify` - Verify nameservers

**DNS Records**

- `GET /api/dns-records/zone/:zoneId` - By zone
- `POST /api/dns-records` - Create
- `GET /api/dns-records/:id` - Get one
- `PUT /api/dns-records/:id` - Update
- `DELETE /api/dns-records/:id` - Delete

**Profiles**

- `GET /api/profiles/me` - Current user
- `PUT /api/profiles/me` - Update current user
- `GET /api/profiles/:id` - Get user

**Audit Logs**

- `GET /api/audit-logs` - List (filtered)
- `GET /api/audit-logs/resource/:resourceId` - By resource
- `GET /api/audit-logs/user/:userId` - By user

**Admin** (Superuser only)

- `GET /api/admin/users` - All users
- `GET /api/admin/stats` - Statistics
- `GET /api/admin/organizations` - All orgs
- `GET /api/admin/audit-logs` - All logs
- `DELETE /api/admin/users/:id` - Delete user
- `PUT /api/admin/users/:id/role` - Update role

## Integration with Frontend

In your frontend, update API calls to point to the backend:

```typescript
// Instead of calling Supabase directly:
const { data } = await supabase.from("organizations").select("*");

// Call the backend:
const response = await fetch("http://localhost:3001/api/organizations", {
  headers: {
    Authorization: `Bearer ${session.access_token}`,
    "Content-Type": "application/json",
  },
});
const { data } = await response.json();
```

## Common Issues

### Port Already in Use

```bash
# Find process
lsof -i :3001
# Kill it
kill -9 <PID>
# Or use a different port in .env
```

### Authentication Errors

- Verify Supabase URL and keys are correct
- Check token hasn't expired
- Ensure Authorization header format: `Bearer <token>`

### Database Connection Errors

- Check Supabase project is running
- Verify SUPABASE_URL is correct
- Confirm service role key has proper permissions

## Next Steps

1. ✅ Backend is running on port 3001
2. 🔄 Update frontend to call backend API endpoints
3. 🧪 Test all CRUD operations
4. 🔒 Verify authentication works
5. 📊 Test with real data from Supabase

## Production Deployment

When deploying to production:

1. Set `NODE_ENV=production` in `.env`
2. Build the TypeScript: `npm run build`
3. Start with: `npm start`
4. Use a process manager (PM2, systemd)
5. Set up reverse proxy (Nginx)
6. Enable SSL/TLS
7. Configure proper CORS origins

## Support

See `README.md` for full documentation.
