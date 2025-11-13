# Environment Setup

## Frontend Environment Variables

Add these to your `.env.local` file in the root directory:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Express API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3001

# Stripe Configuration (if using Stripe directly from frontend)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

## Backend Environment Variables

Add these to `backend/.env`:

```bash
# Server Configuration
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Supabase Configuration
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## Development Setup

### 1. Frontend (Next.js)
```bash
# Install dependencies
npm install

# Start development server
npm run dev
# Runs on http://localhost:3000
```

### 2. Backend (Express)
```bash
# Navigate to backend
cd backend

# Install dependencies
npm install

# Start development server
npm run dev
# Runs on http://localhost:3001
```

### 3. Test API Connection

```bash
# Test backend health
curl http://localhost:3001/api/health

# Test authenticated endpoint (requires JWT token)
curl http://localhost:3001/api/subscriptions/current?org_id=YOUR_ORG_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## API Client Usage

The frontend uses a centralized API client (`lib/api-client.ts`) that automatically:
- Attaches JWT tokens from Supabase auth
- Handles errors consistently
- Provides domain-specific API methods

### Example Usage:

```typescript
import { organizationsApi, stripeApi, subscriptionsApi } from '@/lib/api-client';

// Get organizations
const orgs = await organizationsApi.list();

// Create subscription
const subscription = await stripeApi.createSubscription(orgId, priceId);

// Check entitlements
const canCreate = await subscriptionsApi.canCreate(orgId, 'environment');
```

## Architecture Flow

```
Frontend (Next.js) → Express API → Supabase
  localhost:3000      localhost:3001    
```

- Frontend makes API calls through `lib/api-client.ts`
- Express API validates JWT tokens and queries Supabase
- Supabase handles data storage and RLS policies

---

## Additional Setup

### Stripe Webhooks

For billing features to work properly, configure Stripe webhooks. See **[STRIPE_WEBHOOK_SETUP.md](./STRIPE_WEBHOOK_SETUP.md)** for detailed instructions on:

- Setting up webhook endpoints (local development & production)
- Configuring webhook secrets
- Testing webhook delivery
- Monitoring and troubleshooting webhook events

