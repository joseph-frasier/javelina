# Javelina DNS Management Application Documentation

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Technology Stack](#technology-stack)
4. [Database Schema](#database-schema)
5. [Authentication & Authorization](#authentication--authorization)
6. [Stripe Integration](#stripe-integration)
7. [API Endpoints](#api-endpoints)
8. [Frontend Components](#frontend-components)
9. [State Management](#state-management)
10. [Environment Configuration](#environment-configuration)
11. [Deployment](#deployment)
12. [Development Workflow](#development-workflow)
13. [Troubleshooting](#troubleshooting)

## Overview

Javelina is a comprehensive DNS management platform built with Next.js 15, TypeScript, and Supabase. The application provides organizations with tools to manage DNS zones, records, and team members across multiple environments, with integrated billing and subscription management through Stripe.

### Key Features

- **Multi-tenant Architecture**: Organizations can manage multiple environments and DNS zones
- **Role-based Access Control**: Different permission levels for team members
- **Subscription Management**: Integrated Stripe billing with multiple plan tiers
- **DNS Zone Management**: Create, configure, and manage DNS zones and records
- **Audit Logging**: Track all system activities and changes
- **Admin Dashboard**: Comprehensive administrative interface for system management
- **Real-time Updates**: Live data synchronization across the application

## Architecture

### System Architecture

The application follows a modern full-stack architecture with clear separation of concerns:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │   Database      │
│   (Next.js)     │◄──►│   (Express.js)  │◄──►│   (Supabase)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Stripe        │    │   Webhooks      │    │   File Storage  │
│   (Payments)    │    │   (Stripe)      │    │   (Supabase)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Frontend Architecture

- **Next.js 15** with App Router for routing and server-side rendering
- **React 19** with TypeScript for type safety
- **Tailwind CSS** for styling with custom Javelina brand design system
- **Zustand** for client-side state management
- **TanStack Query** for server state management and caching
- **Stripe Elements** for secure payment processing

### Backend Architecture

- **Express.js** with TypeScript for API endpoints
- **Supabase** for authentication, database, and real-time features
- **Stripe** for payment processing and subscription management
- **Row Level Security (RLS)** for data access control
- **JWT-based authentication** with Supabase

## Technology Stack

### Frontend Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 15.5.4 | React framework with App Router |
| React | 19.0.0 | UI library |
| TypeScript | 5.7.3 | Type safety |
| Tailwind CSS | 3.4.17 | Styling framework |
| Zustand | 5.0.3 | State management |
| TanStack Query | 5.64.2 | Server state management |
| Stripe React | 5.2.0 | Payment processing |
| Supabase JS | 2.74.0 | Database and auth client |

### Backend Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 18+ | Runtime environment |
| Express.js | Latest | Web framework |
| TypeScript | 5.7.3 | Type safety |
| Supabase | 2.74.0 | Database and auth |
| Stripe | 19.1.0 | Payment processing |
| Helmet | Latest | Security headers |
| CORS | Latest | Cross-origin requests |

### Database

- **PostgreSQL** (via Supabase)
- **Row Level Security (RLS)** for data isolation
- **Real-time subscriptions** for live updates
- **Triggers and functions** for automated processes

## Database Schema

### Core Tables

#### profiles
Extended user information beyond Supabase auth.users:
```sql
- id (uuid, primary key, references auth.users)
- name, email, display_name, title, phone
- timezone, bio, avatar_url
- role (user, superuser)
- mfa_enabled, sso_connected
- last_login, created_at, updated_at
```

#### organizations
Company/organization information:
```sql
- id (uuid, primary key)
- name, description, slug
- logo_url, settings (JSONB)
- stripe_customer_id (unique)
- is_active, owner_id
- environments_count (cached)
- created_at, updated_at
```

#### organization_members
Junction table linking users to organizations:
```sql
- id (uuid, primary key)
- organization_id (references organizations)
- user_id (references profiles)
- role (SuperAdmin, Admin, Editor, Viewer)
- invited_by, invited_at, joined_at
- last_accessed_at, permissions (JSONB)
- status (active, pending, suspended)
```

#### environments
Environment management within organizations:
```sql
- id (uuid, primary key)
- organization_id (references organizations)
- name, description, type
- configuration (JSONB), metadata (JSONB)
- parent_environment_id
- zones_count (cached)
- last_deployed_at, health_status
- created_at, updated_at
```

#### zones
DNS zone management within environments:
```sql
- id (uuid, primary key)
- environment_id (references environments)
- name, description, domain
- metadata (JSONB), ttl
- nameservers, last_verified_at
- verification_status, records_count (cached)
- created_at, updated_at
```

### Billing Tables

#### plans
Subscription plan definitions:
```sql
- id (uuid, primary key)
- code (unique), name, description
- billing_interval (month, year)
- stripe_product_id, stripe_price_id
- is_active, sort_order
- created_at, updated_at
```

#### entitlements
Available features and limits:
```sql
- id (uuid, primary key)
- key (unique), name, description
- type (boolean, integer, string)
- default_value, created_at, updated_at
```

#### plan_entitlements
Maps entitlements to plans:
```sql
- id (uuid, primary key)
- plan_id (references plans)
- entitlement_id (references entitlements)
- value, created_at, updated_at
```

#### subscriptions
Organization subscriptions linked to Stripe:
```sql
- id (uuid, primary key)
- organization_id (references organizations)
- stripe_subscription_id (unique)
- plan_id (references plans)
- status, current_period_start
- current_period_end, cancel_at_period_end
- created_at, updated_at
```

### Audit and Logging

#### audit_logs
System activity tracking:
```sql
- id (uuid, primary key)
- user_id (references profiles)
- organization_id (references organizations)
- action, resource_type, resource_id
- details (JSONB), ip_address
- user_agent, created_at
```

## Authentication & Authorization

### Authentication Flow

1. **User Registration/Login**: Handled by Supabase Auth
2. **JWT Token Generation**: Supabase generates JWT tokens
3. **Token Validation**: Backend validates tokens on each request
4. **User Profile Creation**: Automatic profile creation on first login
5. **Session Management**: Handled by Supabase with automatic refresh

### Authorization Levels

#### User Roles
- **Superuser**: Full system access, admin capabilities
- **User**: Standard user with organization-based permissions

#### Organization Roles
- **SuperAdmin**: Full organization control
- **Admin**: Organization management, user management
- **Editor**: Content management, DNS operations
- **Viewer**: Read-only access

### Security Features

- **Row Level Security (RLS)**: Database-level access control
- **JWT Token Validation**: Server-side token verification
- **CORS Configuration**: Controlled cross-origin access
- **Helmet Security Headers**: Additional security measures
- **Input Validation**: Server-side validation for all inputs

## Stripe Integration

### Payment Processing

The application uses Stripe for subscription management with the following components:

#### Stripe Configuration
- **API Version**: Pinned to '2024-06-20' for stability
- **Test Mode**: Development with test cards
- **Live Mode**: Production with real payments
- **Webhook Integration**: Real-time subscription updates

#### Subscription Plans

| Plan | Monthly Price | Annual Price | Features |
|------|---------------|--------------|----------|
| Free | $0 | $0 | 1 environment, 3 zones, 100 records/zone, 2 team members |
| Basic | $3.50 | $42.00 | 3 environments, 10 zones, 500 records/zone, 5 team members |
| Pro | $6.70 | $80.40 | 10 environments, 50 zones, 5,000 records/zone, 10 team members |
| Enterprise | $450 | - | Unlimited resources, custom roles, SSO, SLA |

#### Stripe Products and Prices

```typescript
// Free Plan
price_1SL5MCA8kaNOs7rye16c39RS - $0.00/month

// Basic Plan
price_1SL5NJA8kaNOs7rywCjYzPgH - $3.50/month
price_1SLSWiA8kaNOs7ryllPfcTHx - $42.00/year

// Pro Plan
price_1SLSXKA8kaNOs7ryKJ6hCHd5 - $6.70/month
price_1SLSYMA8kaNOs7ryrJU9oOYL - $80.40/year

// Enterprise Plan
price_1SLSZFA8kaNOs7rywWLjhQ8b - $450.00/month
```

### Webhook Handling

Critical webhook events processed:
- `invoice.payment_succeeded`: Activate subscriptions
- `invoice.payment_failed`: Mark subscriptions as past due
- `customer.subscription.created`: Initial subscription sync
- `customer.subscription.updated`: Plan changes, renewals
- `customer.subscription.deleted`: Subscription cancellation

### Customer Portal

Self-service billing management:
- Invoice history viewing
- Payment method updates
- Subscription cancellation
- Plan changes

## API Endpoints

### Frontend API Routes (Next.js)

#### Authentication
- `POST /api/auth/callback` - OAuth callback handling
- `POST /api/auth/signout` - User signout

#### Stripe Integration
- `POST /api/stripe/create-subscription-intent` - Create checkout session
- `POST /api/stripe/webhook` - Handle Stripe webhooks
- `POST /api/stripe/create-portal-session` - Open billing portal

#### Subscriptions
- `GET /api/subscriptions/current` - Get current subscription
- `GET /api/subscriptions/can-create` - Check resource limits
- `POST /api/subscriptions/upgrade` - Upgrade subscription

#### Organizations
- `GET /api/organizations` - List user organizations
- `POST /api/organizations` - Create organization
- `PUT /api/organizations/[id]` - Update organization

### Backend API Routes (Express.js)

#### Health Checks
- `GET /api/health` - Basic health check
- `GET /api/health/ping` - Simple ping
- `GET /api/health/db` - Database connection test
- `GET /api/health/auth` - Authentication test

#### Organizations
- `GET /api/organizations` - List organizations
- `POST /api/organizations` - Create organization
- `GET /api/organizations/:id` - Get organization details
- `PUT /api/organizations/:id` - Update organization
- `DELETE /api/organizations/:id` - Delete organization
- `GET /api/organizations/:id/members` - List members

#### Environments
- `GET /api/environments` - List environments
- `POST /api/environments` - Create environment
- `GET /api/environments/organization/:orgId` - List by organization
- `GET /api/environments/:id` - Get environment details
- `PUT /api/environments/:id` - Update environment
- `DELETE /api/environments/:id` - Delete environment

#### Zones
- `GET /api/zones` - List zones
- `POST /api/zones` - Create zone
- `GET /api/zones/environment/:envId` - List by environment
- `GET /api/zones/:id` - Get zone details
- `PUT /api/zones/:id` - Update zone
- `DELETE /api/zones/:id` - Delete zone
- `POST /api/zones/:id/verify` - Verify nameservers

#### DNS Records
- `GET /api/dns-records/zone/:zoneId` - List records for zone
- `POST /api/dns-records` - Create DNS record
- `GET /api/dns-records/:id` - Get record details
- `PUT /api/dns-records/:id` - Update record
- `DELETE /api/dns-records/:id` - Delete record

#### Admin (Superuser Only)
- `GET /api/admin/users` - List all users
- `GET /api/admin/stats` - System statistics
- `GET /api/admin/organizations` - List all organizations
- `GET /api/admin/audit-logs` - Get all audit logs
- `DELETE /api/admin/users/:id` - Delete user
- `PUT /api/admin/users/:id/role` - Update user role

## Frontend Components

### Layout Components

#### ConditionalLayout
Main layout wrapper that conditionally renders based on authentication state:
- Public pages (login, signup, pricing)
- Authenticated pages (dashboard, settings)
- Admin pages (admin dashboard)

#### Header
Application header with:
- Navigation menu
- User profile dropdown
- Theme toggle
- Organization switcher

### Authentication Components

#### AuthProvider
Supabase authentication context provider:
- User session management
- Authentication state
- Login/logout methods
- OAuth integration

#### LoginForm
User authentication form:
- Email/password login
- OAuth buttons (Google, GitHub)
- Form validation
- Error handling

### DNS Management Components

#### ZoneList
Display and manage DNS zones:
- Zone listing with status
- Create new zone modal
- Zone actions (edit, delete, verify)
- Search and filtering

#### ZoneForm
Create/edit DNS zones:
- Zone configuration
- Nameserver settings
- Validation
- Error handling

#### RecordList
Manage DNS records within zones:
- Record listing by type
- Create/edit/delete records
- Bulk operations
- Record validation

### Billing Components

#### PricingPage
Subscription plan selection:
- Plan comparison table
- Feature highlighting
- Pricing display
- Checkout integration

#### BillingSettings
Subscription management:
- Current plan display
- Usage statistics
- Billing portal access
- Plan upgrade options

### Admin Components

#### AdminDashboard
System administration interface:
- User management
- Organization overview
- System statistics
- Audit log viewing

#### UserManagement
User administration:
- User listing and search
- Role management
- User actions
- Bulk operations

## State Management

### Client-Side State (Zustand)

#### AuthStore
Authentication state management:
```typescript
interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loginWithOAuth: (provider: string) => Promise<void>;
}
```

#### SubscriptionStore
Subscription and billing state:
```typescript
interface SubscriptionState {
  currentSubscription: Subscription | null;
  plans: Plan[];
  loading: boolean;
  fetchSubscription: () => Promise<void>;
  upgradePlan: (planId: string) => Promise<void>;
}
```

#### HierarchyStore
Organization hierarchy management:
```typescript
interface HierarchyState {
  organizations: Organization[];
  currentOrganization: Organization | null;
  environments: Environment[];
  zones: Zone[];
  loading: boolean;
  fetchOrganizations: () => Promise<void>;
  setCurrentOrganization: (org: Organization) => void;
}
```

### Server State (TanStack Query)

#### Query Keys
Organized query key structure:
```typescript
const queryKeys = {
  organizations: ['organizations'] as const,
  organization: (id: string) => ['organizations', id] as const,
  environments: (orgId: string) => ['environments', orgId] as const,
  zones: (envId: string) => ['zones', envId] as const,
  subscription: (orgId: string) => ['subscription', orgId] as const,
};
```

#### Custom Hooks
Reusable data fetching hooks:
```typescript
export function useOrganizations() {
  return useQuery({
    queryKey: queryKeys.organizations,
    queryFn: fetchOrganizations,
  });
}

export function useSubscription(orgId: string) {
  return useQuery({
    queryKey: queryKeys.subscription(orgId),
    queryFn: () => fetchSubscription(orgId),
    enabled: !!orgId,
  });
}
```

## Environment Configuration

### Required Environment Variables

#### Supabase Configuration
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

#### Stripe Configuration
```bash
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_... # or pk_live_...
STRIPE_SECRET_KEY=sk_test_... # or sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

#### Application Configuration
```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000 # or https://yourdomain.com
NODE_ENV=development # or production
```

### Environment-Specific Setup

#### Development
- Use test mode Stripe keys
- Local Supabase project
- Stripe CLI for webhook forwarding
- Debug logging enabled

#### Production
- Use live mode Stripe keys
- Production Supabase project
- Production webhook endpoints
- Error tracking enabled

## Deployment

### Frontend Deployment (Vercel)

1. **Connect Repository**: Link GitHub repository to Vercel
2. **Configure Environment Variables**: Set all required variables
3. **Deploy**: Automatic deployment on git push
4. **Custom Domain**: Configure custom domain if needed

### Backend Deployment

1. **Build Application**: `npm run build`
2. **Set Environment Variables**: Configure production variables
3. **Deploy**: Deploy to hosting platform (Railway, Render, etc.)
4. **Configure Reverse Proxy**: Set up Nginx or similar

### Database Setup

1. **Create Supabase Project**: Set up new project
2. **Run Schema**: Execute schema.sql in SQL Editor
3. **Configure RLS**: Enable row level security
4. **Seed Data**: Load initial data if needed

### Stripe Configuration

1. **Create Products**: Set up subscription products
2. **Configure Webhooks**: Set up webhook endpoints
3. **Test Integration**: Verify payment flow
4. **Go Live**: Switch to live mode for production

## Development Workflow

### Getting Started

1. **Clone Repository**: `git clone <repository-url>`
2. **Install Dependencies**: `npm install`
3. **Set Environment Variables**: Copy `.env.example` to `.env.local`
4. **Start Development Server**: `npm run dev`
5. **Start Backend**: `cd backend && npm run dev`

### Code Standards

- **TypeScript**: Strict mode enabled
- **ESLint**: Code quality enforcement
- **Prettier**: Code formatting
- **Conventional Commits**: Standardized commit messages
- **Component Structure**: Consistent component organization

### Testing

- **Unit Tests**: Component and utility testing
- **Integration Tests**: API endpoint testing
- **E2E Tests**: Full user flow testing
- **Stripe Testing**: Test mode payment flows

### Git Workflow

1. **Feature Branches**: Create feature branches from main
2. **Pull Requests**: Submit PRs for code review
3. **Code Review**: Peer review process
4. **Merge**: Merge approved PRs to main
5. **Deploy**: Automatic deployment on merge

## Troubleshooting

### Common Issues

#### Authentication Issues
- **Invalid JWT Token**: Check token expiration and refresh
- **Permission Denied**: Verify user roles and RLS policies
- **OAuth Failures**: Check provider configuration

#### Stripe Integration Issues
- **Webhook Failures**: Verify webhook endpoint and secret
- **Payment Failures**: Check Stripe keys and test cards
- **Subscription Not Created**: Verify webhook processing

#### Database Issues
- **Connection Failed**: Check Supabase URL and keys
- **RLS Errors**: Verify row level security policies
- **Query Timeouts**: Check query performance and indexes

### Debug Tools

- **Browser DevTools**: Frontend debugging
- **Supabase Dashboard**: Database monitoring
- **Stripe Dashboard**: Payment monitoring
- **Application Logs**: Server-side debugging

### Performance Optimization

- **Query Optimization**: Optimize database queries
- **Caching**: Implement appropriate caching strategies
- **Bundle Size**: Monitor and optimize bundle size
- **Image Optimization**: Use Next.js image optimization

### Security Considerations

- **Environment Variables**: Never commit secrets
- **API Keys**: Rotate keys regularly
- **CORS Configuration**: Restrict cross-origin access
- **Input Validation**: Validate all user inputs
- **Rate Limiting**: Implement rate limiting for APIs

---

This documentation provides a comprehensive overview of the Javelina DNS Management application. For specific implementation details, refer to the source code and inline documentation within the codebase.
