# Javelina Backend API

Express.js TypeScript backend for Javelina DNS Management application.

## Features

- **TypeScript** - Full type safety
- **Supabase Integration** - JWT authentication validation and database proxy
- **RESTful API** - Standard REST endpoints for all resources
- **Security** - Helmet, CORS, JWT validation
- **Error Handling** - Centralized error handling with proper status codes
- **Request Logging** - Morgan HTTP request logger
- **Hot Reload** - Nodemon for development

## Tech Stack

- Node.js + Express
- TypeScript
- Supabase (Auth + PostgreSQL)
- Helmet (Security)
- CORS
- Morgan (Logging)

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account with project set up

### Installation

1. Install dependencies:

```bash
cd backend
npm install
```

2. Create `.env` file from template:

```bash
cp .env.example .env
```

3. Fill in your environment variables in `.env`:

```env
PORT=3001
NODE_ENV=development
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
FRONTEND_URL=http://localhost:3000
```

### Running the Server

**Development mode** (with hot reload):

```bash
npm run dev
```

**Production mode**:

```bash
npm run build
npm start
```

The server will start on `http://localhost:3001` (or your configured PORT).

## API Documentation

### Health Check Routes

- `GET /api/health` - Basic health check
- `GET /api/health/ping` - Simple ping endpoint
- `GET /api/health/db` - Test database connection
- `GET /api/health/auth` - Test authentication (requires token)

### Organizations

- `GET /api/organizations` - List user's organizations
- `POST /api/organizations` - Create organization
- `GET /api/organizations/:id` - Get organization details
- `PUT /api/organizations/:id` - Update organization
- `DELETE /api/organizations/:id` - Delete organization
- `GET /api/organizations/:id/members` - List members

### Environments

- `GET /api/environments` - List all accessible environments
- `POST /api/environments` - Create environment
- `GET /api/environments/organization/:orgId` - List by organization
- `GET /api/environments/:id` - Get environment details
- `PUT /api/environments/:id` - Update environment
- `DELETE /api/environments/:id` - Delete environment

### Zones

- `GET /api/zones` - List all accessible zones
- `POST /api/zones` - Create zone
- `GET /api/zones/environment/:envId` - List by environment
- `GET /api/zones/:id` - Get zone details
- `PUT /api/zones/:id` - Update zone
- `DELETE /api/zones/:id` - Delete zone
- `POST /api/zones/:id/verify` - Verify nameservers

### DNS Records

- `GET /api/dns-records/zone/:zoneId` - List records for zone
- `POST /api/dns-records` - Create DNS record
- `GET /api/dns-records/:id` - Get record details
- `PUT /api/dns-records/:id` - Update record
- `DELETE /api/dns-records/:id` - Delete record

### Profiles

- `GET /api/profiles/me` - Get current user profile
- `PUT /api/profiles/me` - Update current user profile
- `GET /api/profiles/:id` - Get user profile (if accessible)

### Audit Logs

- `GET /api/audit-logs` - List audit logs (filtered by permissions)
- `GET /api/audit-logs/resource/:resourceId` - Get logs for specific resource
- `GET /api/audit-logs/user/:userId` - Get logs for user's actions

### Admin (Superuser Only)

- `GET /api/admin/users` - List all users
- `GET /api/admin/stats` - System statistics
- `GET /api/admin/organizations` - List all organizations
- `GET /api/admin/audit-logs` - Get all audit logs
- `DELETE /api/admin/users/:id` - Delete user
- `PUT /api/admin/users/:id/role` - Update user role

## Authentication

All protected endpoints require a valid Supabase JWT token in the Authorization header:

```
Authorization: Bearer <your_supabase_jwt_token>
```

The backend validates tokens using Supabase's `getUser()` method and attaches user information to the request.

## API Response Format

### Success Response

```json
{
  "success": true,
  "data": { ... },
  "message": "Optional success message"
}
```

### Error Response

```json
{
  "success": false,
  "error": "Error message"
}
```

### Paginated Response

```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 100,
    "totalPages": 2
  }
}
```

## Error Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request / Validation Error
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error
- `503` - Service Unavailable

## Testing

### Using cURL

```bash
# Health check
curl http://localhost:3001/api/health

# Test database connection
curl http://localhost:3001/api/health/db

# Test authenticated endpoint
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/health/auth

# Create organization
curl -X POST http://localhost:3001/api/organizations \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Org", "description": "Test"}'
```

### Using Postman

1. Import the API endpoints
2. Set Authorization header: `Bearer <your_token>`
3. Test each endpoint

## Project Structure

```
backend/
├── src/
│   ├── config/          # Configuration files
│   ├── controllers/     # Route controllers
│   ├── middleware/      # Express middleware
│   ├── routes/          # Route definitions
│   ├── types/           # TypeScript types
│   ├── utils/           # Utility functions
│   └── index.ts         # Entry point
├── .env                 # Environment variables
├── package.json         # Dependencies
├── tsconfig.json        # TypeScript config
└── nodemon.json         # Nodemon config
```

## Development

### Adding New Endpoints

1. Create controller in `src/controllers/`
2. Create route in `src/routes/`
3. Import and mount route in `src/routes/index.ts`
4. Test endpoint

### Code Standards

- Use TypeScript strict mode
- Use async/await for async operations
- Wrap async route handlers with `asyncHandler`
- Use validation utilities for input validation
- Use response utilities for consistent responses
- Follow existing patterns and naming conventions

## Deployment

### Environment Variables

Ensure all required environment variables are set:

- `PORT`
- `NODE_ENV` (production)
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `FRONTEND_URL`

### Build and Run

```bash
npm run build
npm start
```

### Reverse Proxy (Nginx)

```nginx
location /api {
    proxy_pass http://localhost:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
}
```

## Security Considerations

- All routes except health checks require authentication
- JWT tokens are validated with Supabase
- RLS policies in Supabase provide additional security layer
- CORS is configured to allow only specified origins
- Helmet adds security headers
- Input validation prevents injection attacks
- Service role key should never be exposed to frontend

## Troubleshooting

### Port already in use

```bash
# Find process using port 3001
lsof -i :3001
# Kill the process
kill -9 <PID>
```

### Database connection failed

- Check Supabase URL and keys in `.env`
- Verify Supabase project is running
- Check network connectivity

### Authentication failed

- Verify JWT token is valid
- Check token hasn't expired
- Ensure Authorization header is properly formatted

## License

Proprietary - All rights reserved
