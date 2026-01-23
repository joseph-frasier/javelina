# Javelina

A modern DNS management platform built with Next.js, offering enterprise-grade DNS record management, multi-organization support, and comprehensive billing integration.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL database (via Supabase account)
- Stripe account (for billing features)
- External Express.js backend API (separate repository)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/joseph-frasier/javelina.git
   cd javelina
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**

   Create a `.env.local` file:
   ```env
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

   # Stripe
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key

   # Backend API
   NEXT_PUBLIC_API_URL=your_backend_api_url

   # Optional: Mock Mode (development without backend)
   NEXT_PUBLIC_MOCK_MODE=false
   ```

4. **Run development server**
   ```bash
   npm run dev
   ```
   
   Frontend will start at **http://localhost:3000**

### Mock Mode (No Backend Required)

Enable mock mode for development:
```env
NEXT_PUBLIC_MOCK_MODE=true
```

Mock credentials:
- `sarah.chen@company.com` / `password123`
- `marcus.rodriguez@company.com` / `admin2024`

## 📋 Current Functionality

### 🔐 Authentication & Authorization

**Authentication Methods:**
- Email/password authentication via Supabase Auth
- OAuth providers:
  - Google OAuth (configurable)
  - GitHub OAuth (configurable)
- Password reset flow with email verification
- Email verification on signup
- Automatic JWT token management
- Session persistence and refresh

**Authorization System:**
- **Global SuperAdmin** - Javelina staff with access to all organizations (via `profiles.superadmin = true`)
- **Organization Roles**: 
  - **SuperAdmin** - Full org control, can delete organization
  - **Admin** - User & resource management, billing access
  - **BillingContact** - Billing and subscription management only
  - **Editor** - DNS management (zones, records, tags)
  - **Viewer** - Read-only access
- Row Level Security (RLS) enforced at database level
- Protected routes with automatic redirects
- Admin-only access controls

### 🏢 Organization Management

**Organization Features:**
- Create and manage multiple organizations
- Organization settings and configuration
- Custom organization metadata
- Stripe customer integration per organization
- Organization deletion with cascading cleanup

**Team Management:**
- Invite users to organizations via email
- Assign and modify user roles
- Remove team members
- View team member activity
- Pending invitation management
- Role-based access control enforcement

### 🌐 DNS Zone Management

**Zone Operations:**
- Create DNS zones under organizations
- Configure zone settings:
  - Zone name and description
  - Zone type (primary, secondary, redirect)
  - TTL settings
  - Admin email
- Zone verification with nameserver checks
- Verification status tracking
- Zone activation/deactivation
- Zone deletion with record cleanup

**Zone Information:**
- SOA serial tracking
- Nameserver assignment
- Record count display
- Last verification timestamp
- Zone health status

### 📝 DNS Records Management

**Record Types Supported:**
- A (IPv4 address)
- AAAA (IPv6 address)
- CNAME (Canonical name)
- MX (Mail exchange)
- TXT (Text records)
- NS (Name server)
- PTR (Pointer)
- SRV (Service)
- CAA (Certificate Authority Authorization)

**Record Operations:**
- Create new DNS records
- Edit existing records
- Delete records (single or bulk)
- Duplicate records
- View detailed record information
- Record validation before saving

**Record Management Features:**
- Search and filter records by type
- Sort by name, type, or TTL
- Bulk selection and actions
- Record detail modal with full information
- TTL heatmap visualization
- Record distribution charts

### 💳 Billing & Subscriptions

**Subscription Plans:**

| Plan | Monthly | Lifetime | Features |
|------|---------|----------|----------|
| **Starter** | $9.95/mo | $238.80 | 1 org, 1 user, 2 zones, 200 records, 5M queries/mo |
| **Pro** | $49.95/mo | $1,198.80 | 1 org, 5 users, 20 zones, 2K records, 50M queries/mo |
| **Business** | $199.95/mo | $4,776.00 | 1 org, 20 users, 50 zones, 5K records, 500M queries/mo |
| **Enterprise** | Contact Sales | Contact Sales | Unlimited everything, custom roles, SSO, SLA |

**Billing Features:**
- Multiple payment options (monthly subscription or lifetime)
- Stripe Checkout integration
- Secure payment processing with Stripe Elements
- Subscription status tracking
- Plan upgrade/downgrade with automatic proration
- Lifetime plan upgrades (pay difference)
- Cancel subscriptions (at period end)
- Stripe Customer Portal access
- Invoice history viewing
- Payment method management
- Usage tracking and display

**Payment Flows:**
- New subscription checkout
- Plan change with proration calculation
- Lifetime plan purchase
- Upgrade between lifetime tiers
- Webhook-driven status updates

**Proration Logic:**
- Day-level granularity with whole-day rounding
- Credit = (Remaining Days / Total Days) × Monthly Price
- Automatic charging for upgrades using saved payment method
- Proration disabled in Stripe, handled by backend
- Full credit for lifetime-to-lifetime upgrades

### 👤 User Profile & Settings

**Profile Management:**
- Edit profile information (name, title, phone)
- Update display name and bio
- Upload and manage avatar
- Timezone configuration
- Language preferences
- Contact information management

**Account Settings:**
- Change password
- Update email address
- MFA enable/disable (UI ready)
- Connect OAuth providers (Google, GitHub)
- View last login time
- Account status display

**User Settings Sections:**
- General Settings (profile, preferences)
- Security Settings (password, MFA, OAuth)
- Billing & Subscriptions (per organization)
- Access Control (organization roles, permissions)
- Audit Logs (user activity history)

### 📊 Dashboard & Analytics

**Main Dashboard:**
- Welcome guidance for new users
- Quick action cards
- Organization selector
- Recent activity feed
- Quick navigation to zones and settings
- Usage statistics overview

**Analytics Page:**
- Filter by organization and zone
- Query volume charts
- DNS record distribution
- Zone health monitoring
- Time-based analytics
- Export analytics data

**Visualizations:**
- Record type distribution pie charts
- TTL heatmaps
- Query volume over time
- Zone verification status

### 🔧 Admin Panel

**Admin Dashboard:**
- System-wide statistics
- User growth metrics
- Organization count
- Total zones and records
- Recent system activity
- Quick action buttons

**User Management:**
- View all users with search and filtering
- Bulk user selection
- User role management (promote to SuperAdmin)
- User impersonation for support
- Delete users with confirmation
- Export user data (Excel, PDF)
- View user details and organizations

**Organization Management:**
- View all organizations
- Organization statistics
- Subscription status per org
- Delete organizations
- Export organization data
- Quick actions menu

**Zone Management:**
- View all zones across organizations
- Zone status monitoring
- Bulk zone operations
- Export zone configurations

**Audit Logs:**
- System-wide activity tracking
- Filter by user, action, resource
- Date range selection
- Export audit logs
- Detailed activity information

**Discount Codes:**
- Create and manage discount codes (backend feature)
- Code expiration and usage limits
- Apply to specific plans

**Admin Features:**
- User impersonation banner
- Exit impersonation
- Bulk data export
- Pagination for large datasets
- Quick actions dropdown
- Select all functionality

### 🏷️ Tagging System

**Tag Management:**
- Create custom tags
- Assign tags to zones
- Color-coded tag display
- Filter zones by tags
- Tag usage tracking
- Delete unused tags

### 📋 Audit Trail

**Activity Logging:**
- All user actions logged
- DNS record change tracking
- Organization modifications
- User access events
- Timestamp and IP address capture
- User agent tracking

**Audit Information:**
- Action type
- Resource affected
- Old and new values (for updates)
- Actor information
- Context metadata

### 💬 AI Chat Assistant

**Help Widget:**
- AI-powered assistance
- Context-aware help
- Quick answers to common questions
- Expandable chat interface
- Minimizable widget

### 🎨 UI/UX Features

**Interface Components:**
- Responsive design (mobile, tablet, desktop)
- Dark mode ready (system preference)
- Toast notifications for feedback
- Modal dialogs for forms
- Breadcrumb navigation
- Loading states and skeletons
- Empty state displays
- Error handling with user-friendly messages
- Form validation with inline errors
- Confirmation dialogs for destructive actions

**Navigation:**
- Persistent sidebar with org selector
- Header with user menu
- Breadcrumb trails
- Quick actions from header
- Mobile-responsive hamburger menu

**Data Display:**
- Sortable tables
- Searchable lists
- Pagination controls
- Bulk selection checkboxes
- Status badges and indicators
- Progress meters
- Charts and visualizations

### 🔄 State Management

**Client State (Zustand):**
- Authentication state
- User profile data
- Subscription information
- Organization hierarchy
- Settings preferences
- Toast notifications

**Server State (TanStack Query):**
- Organizations data
- Zones and records
- Subscription status
- Analytics data
- Automatic cache invalidation
- Background refetching

### 🔒 Security Features

**Data Protection:**
- JWT-based authentication
- Row Level Security (RLS) policies
- Secure API communication
- CORS configuration
- Input validation and sanitization
- SQL injection prevention
- XSS protection

**Access Control:**
- Role-based permissions
- Resource-level authorization
- Organization isolation
- Admin-only routes
- Protected API endpoints

### 📱 Pages & Routes

**Public Pages:**
- `/login` - Login with email or OAuth
- `/signup` - User registration
- `/forgot-password` - Password reset request
- `/reset-password` - Password reset form
- `/pricing` - Plan selection and comparison
- `/email-verified` - Email confirmation success

**Authenticated Pages:**
- `/` - Main dashboard / welcome
- `/organization/[orgId]` - Organization overview with zones
- `/zone/[id]` - Zone detail with DNS records
- `/analytics` - Analytics dashboard
- `/profile` - User profile
- `/settings` - User settings with tabs:
  - General Settings
  - Security Settings
  - Billing & Subscriptions
  - Access Control
  - Audit Logs

**Admin Pages (SuperAdmin only):**
- `/admin` - Admin dashboard
- `/admin/login` - Admin login portal
- `/admin/users` - User management
- `/admin/organizations` - Organization management
- `/admin/zones` - Zone management
- `/admin/audit` - System audit logs
- `/admin/discounts` - Discount code management

**Billing Pages:**
- `/checkout` - Stripe checkout page
- `/stripe/success` - Payment success
- `/stripe/cancel` - Payment cancelled
- `/settings/billing` - Billing management

**Utility Pages:**
- `/test-api` - API connectivity testing
- `/auth/callback` - OAuth callback handler
- `/auth/signout` - Logout handler

### 🛠 Development Features

**Mock Mode:**
- Complete mock data for all features
- Simulated API responses
- Mock authentication
- Test organizations and zones
- No backend required for UI development

**Developer Tools:**
- Environment switcher scripts
- API testing page
- TypeScript strict mode
- ESLint configuration
- Hot module replacement

## 🛠 Tech Stack

- **Framework**: Next.js 15+ (App Router)
- **Language**: TypeScript 5.7+
- **Runtime**: React 19
- **Styling**: Tailwind CSS 3.4+
- **State Management**: Zustand 5.0+
- **Data Fetching**: TanStack Query 5.6+
- **Database**: PostgreSQL (via Supabase 2.74+)
- **Authentication**: Supabase Auth
- **Payment Processing**: Stripe 19+
- **Deployment**: Vercel

## 📚 Project Structure

```
javelina/
├── app/                      # Next.js app directory (App Router)
│   ├── admin/               # Admin panel pages
│   ├── analytics/           # Analytics dashboard
│   ├── auth/                # Auth callbacks
│   ├── checkout/            # Payment checkout
│   ├── login/               # Login page
│   ├── organization/        # Org pages
│   ├── pricing/             # Pricing page
│   ├── profile/             # User profile
│   ├── settings/            # User settings
│   ├── zone/                # Zone detail pages
│   └── ...
├── components/              # React components
│   ├── admin/              # Admin components
│   ├── auth/               # Auth components
│   ├── billing/            # Billing components
│   ├── chat/               # AI chat widget
│   ├── dns/                # DNS components
│   ├── modals/             # Modal dialogs
│   └── ui/                 # Reusable UI
├── lib/                     # Business logic
│   ├── actions/            # Server actions
│   ├── api/                # API clients
│   ├── hooks/              # Custom hooks
│   ├── supabase/           # Supabase utils
│   └── *-store.ts          # State stores
├── supabase/               # Database
│   └── migrations/         # SQL migrations
├── types/                   # TypeScript types
└── public/                 # Static assets
```

## 🗄 Database Schema

**Current Hierarchy:**
```
Organizations → Zones → Zone Records
```

**Core Tables:**
- `profiles` - Extended user information
- `organizations` - Organization data
- `organization_members` - User-org relationships
- `zones` - DNS zones
- `zone_records` - DNS records
- `plans` - Subscription plans
- `subscriptions` - Organization subscriptions
- `audit_logs` - Activity tracking

**Security:**
- Row Level Security (RLS) enabled on all tables
- JWT-based authentication
- Role-based access policies

## 💳 Stripe Setup

1. **Create products** in Stripe Dashboard
2. **Configure webhook endpoint**:
   ```bash
   # Local development
   stripe listen --forward-to localhost:3001/api/stripe/webhooks
   ```
3. **Update environment variables**:
   ```env
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
   ```

**Webhook Events:**
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`
- `payment_intent.succeeded`

**Backend Configuration:**
Backend handles webhooks at `/api/stripe/webhooks`. Ensure these environment variables are set in the backend:
```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## 🔐 OAuth Setup

### Google OAuth
1. Create OAuth credentials in Google Cloud Console
2. Add authorized redirect URI: `https://[project].supabase.co/auth/v1/callback`
3. Configure in Supabase Dashboard → Authentication → Providers

### GitHub OAuth
1. Create OAuth App in GitHub Settings
2. Add callback URL: `https://[project].supabase.co/auth/v1/callback`
3. Configure in Supabase Dashboard → Authentication → Providers

## 📊 Available Scripts

```bash
# Development
npm run dev          # Start dev server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint

# Full Stack (Frontend + Backend)
npm run dev:full     # Run both frontend and backend
npm run build:full   # Build both
npm run start:full   # Start both in production

# Backend Only
npm run dev:backend     # Run Express API (port 5001)
npm run build:backend   # Build backend
npm run start:backend   # Start backend in production

# Environment Management
npm run env:dev      # Switch to dev environment
npm run env:prod     # Switch to prod environment
npm run env:status   # Check current environment
```

## 🏗️ Architecture

### Data Flow
```
Frontend (Next.js) → Express API → Supabase
  localhost:3000      localhost:3001 (or 5001)
```

- Frontend makes API calls through `lib/api-client.ts`
- Express API validates JWT tokens and queries Supabase
- Supabase handles data storage and RLS policies

### Authorization Layers

1. **Database (Supabase RLS)**
   - Row Level Security policies on all tables
   - Global SuperAdmin bypass via `profiles.superadmin = true`
   - Role-based policies for org members

2. **Backend API (Express)**
   - RBAC middleware validates user roles
   - Applied to routes before handlers execute
   - Fetches user's org role and validates against allowed roles

3. **Frontend UI (React/Next.js)**
   - Permission helper functions (`lib/permissions.ts`)
   - UI elements conditionally render based on permissions
   - Provides immediate feedback without server round-trip

## 🔐 Role-Based Access Control (RBAC)

### Organization Roles

| Role | Permissions |
|------|-------------|
| **SuperAdmin** | Full control, can delete organization |
| **Admin** | Manage resources, team, billing |
| **BillingContact** | Billing management only, read-only for DNS |
| **Editor** | Full DNS management (zones, records, tags) |
| **Viewer** | Read-only access |

### Permission Matrix

| Permission | SuperAdmin | Admin | BillingContact | Editor | Viewer |
|-----------|-----------|-------|----------------|--------|--------|
| Edit org settings | ✅ | ✅ | ❌ | ❌ | ❌ |
| Invite/remove members | ✅ | ✅ | ❌ | ❌ | ❌ |
| View/manage billing | ✅ | ✅ | ✅ | ❌ | ❌ |
| Create/edit zones | ✅ | ✅ | ❌ | ✅ | ❌ |
| Create/edit records | ✅ | ✅ | ❌ | ✅ | ❌ |
| View zones/records | ✅ | ✅ | ✅ | ✅ | ✅ |

## 🧪 Testing

**Manual Testing:**
1. Authentication flows (email, OAuth)
2. Organization CRUD operations
3. Zone and record management
4. Subscription checkout
5. Plan upgrades
6. Admin features

**Test Page:**
- Navigate to `/test-api` for backend connectivity testing

## 🌐 Deployment

### Frontend (Vercel)

1. Connect GitHub repository to Vercel
2. Configure environment variables
3. Set build command: `npm run build`
4. Set output directory: `.next`
5. Deploy

**Branch Deployment:**
- `main` → Production
- `dev` → Development preview
- `qa` → QA/staging

### Backend

The Express.js backend is deployed separately. Ensure:
- Backend accessible at `NEXT_PUBLIC_API_URL`
- All environment variables configured
- Stripe webhooks configured

## 🐛 Troubleshooting

**OAuth Issues:**
- Verify redirect URIs in OAuth provider settings
- Check Supabase Auth configuration
- Ensure callback route is accessible

**Stripe Issues:**
- Verify webhook secret matches environment variable
- Check Stripe dashboard for failed events
- Test with Stripe test cards

**Backend Connection:**
- Verify `NEXT_PUBLIC_API_URL` is correct
- Check backend is running
- Test with `/test-api` page

**Database Issues:**
- Verify Supabase credentials
- Check RLS policies
- Ensure migrations are applied

## 🔧 Environment Variables

```env
# Required
NEXT_PUBLIC_SUPABASE_URL=              # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=         # Supabase anon key
NEXT_PUBLIC_API_URL=                    # Backend API URL
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=    # Stripe publishable key

# Optional
NEXT_PUBLIC_MOCK_MODE=false            # Enable mock mode
NEXT_PUBLIC_APP_URL=                   # Frontend URL
```

### Backend Environment Variables

```env
# Server Configuration
PORT=5001
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

## 📝 Key Implementation Notes

### Proration Calculation
- Day-level granularity with rounding to nearest whole day
- Formula: `Credit = (Remaining Days / Total Days) × Monthly Price`
- Automatic charging for upgrades using saved payment method
- Full credit for lifetime-to-lifetime upgrades

### Webhook Handling
- Webhooks handled by Express API at `/api/stripe/webhooks`
- Raw body parsing configured for signature verification
- Events: subscription created/updated/deleted, invoice payment succeeded/failed

### Team Management
- Only SuperAdmin and Admin can invite/remove members
- Cannot change own role or remove self
- Warn when removing last SuperAdmin/Admin
- Invitation flow tracks pending invitations

### Audit Logging
- All user actions logged with timestamp, IP, user agent
- Tracks DNS record changes, org modifications, access events
- Filterable by user, action, resource, date range

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request to `dev` branch

## 📝 License

[Add your license here]

## 👥 Authors

[Add author information here]

---

**Version**: 0.1.0  
**Last Updated**: January 2026  
**Repository**: https://github.com/joseph-frasier/javelina
