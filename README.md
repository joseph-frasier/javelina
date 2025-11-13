# Javelina

A modern DNS management platform built with Next.js, offering enterprise-grade DNS record management, multi-organization support, and comprehensive billing integration.

## 🚀 Features

- **DNS Management**: Create, update, and manage DNS records with an intuitive interface
- **Multi-Organization Support**: Manage multiple organizations and environments
- **Role-Based Access Control**: Fine-grained permissions for admins, users, and organizations
- **Billing & Subscriptions**: Stripe-powered subscription management with multiple plan tiers
- **Admin Panel**: Comprehensive admin dashboard for user, organization, and zone management
- **Audit Trail**: Complete audit logging for DNS changes and system events
- **Real-time Analytics**: Monitor DNS performance and usage metrics
- **OAuth Authentication**: Support for Google and GitHub OAuth providers
- **AI Chat Assistant**: Built-in AI-powered help widget
- **Mock Mode**: Development-friendly mock data for testing without backend dependencies

## 🛠 Tech Stack

### Frontend
- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **UI Components**: Custom component library with Radix UI primitives
- **Authentication**: Supabase Auth

### Backend
- **API**: Express.js (Node.js)
- **Database**: PostgreSQL (via Supabase)
- **Authentication**: Supabase
- **Payment Processing**: Stripe
- **Deployment**: Vercel

## 📋 Prerequisites

- Node.js 18+ and npm/yarn
- PostgreSQL (or Supabase account)
- Stripe account (for billing features)
- Google Cloud Console credentials (for OAuth)
- GitHub OAuth App (for OAuth)

## 🔧 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/javelina.git
   cd javelina
   ```

2. **Install frontend dependencies**
   ```bash
   npm install
   ```

3. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   cd ..
   ```

4. **Set up environment variables**

   Create a `.env.local` file in the root directory:
   ```env
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

   # Stripe
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
   STRIPE_SECRET_KEY=your_stripe_secret_key
   STRIPE_WEBHOOK_SECRET=your_webhook_secret

   # Backend API
   NEXT_PUBLIC_API_URL=http://localhost:3001

   # App Configuration
   NEXT_PUBLIC_MOCK_MODE=false
   ```

   Create a `.env` file in the `backend` directory:
   ```env
   PORT=3001
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

## 🗄 Database Setup

1.   Project uses supabase cloud DB so just confirm that supabase env vars are correct.

## 🚀 Running the Application

### Development Mode

1. **Start the backend server**
   ```bash
   cd backend
   npm run dev
   ```

2. **Start the Next.js frontend** (in a new terminal)
   ```bash
   npm run dev
   ```

3. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001

### Mock Mode

For development without a backend, enable mock mode:
```env
NEXT_PUBLIC_MOCK_MODE=true
```

This will use local mock data instead of making API calls.

## 📚 Project Structure

```
javelina/
├── app/                      # Next.js app directory
│   ├── admin/               # Admin panel pages
│   ├── api/                 # API routes
│   ├── auth/                # Authentication flows
│   ├── organization/        # Organization management
│   ├── zone/                # DNS zone management
│   └── ...
├── backend/                 # Express.js backend
│   ├── src/
│   │   ├── controllers/     # Route controllers
│   │   ├── routes/          # API routes
│   │   ├── middleware/      # Express middleware
│   │   └── config/          # Configuration files
│   └── ...
├── components/              # React components
│   ├── admin/              # Admin-specific components
│   ├── auth/               # Authentication components
│   ├── dns/                # DNS management components
│   ├── billing/            # Billing components
│   └── ui/                 # Reusable UI components
├── lib/                     # Utility libraries
│   ├── actions/            # Server actions
│   ├── api/                # API clients
│   ├── hooks/              # Custom React hooks
│   └── supabase/           # Supabase utilities
├── supabase/               # Database migrations and schemas
├── types/                   # TypeScript type definitions
└── public/                 # Static assets
```

## 🔐 Authentication Setup

### Email/Password Authentication
Email/password authentication is enabled by default through Supabase.

### OAuth Setup
For detailed OAuth setup instructions, see:
- Frontend: Check existing OAuth configuration in `lib/auth-store.ts`
- Supabase Dashboard: Configure OAuth providers in Authentication → Providers

Supported providers:
- Google OAuth
- GitHub OAuth

## 💳 Stripe Integration

1. **Configure Stripe products**
   - Create products in Stripe Dashboard
   - Update plan IDs in `lib/plans-config.ts`

2. **Set up webhooks**
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```

3. **Configure webhook endpoint** in production
   - See `STRIPE_WEBHOOK_SETUP.md` for details

## 🔒 Admin Features

### Creating an Admin User

Run the admin seed script:
```bash
psql -h your_host -U postgres -d postgres -f supabase/seed-admin-user.sql
```

### Admin Access
- Navigate to `/admin/login`
- Admin dashboard: `/admin`
- Features:
  - User management
  - Organization management
  - Zone management
  - Audit logs
  - User impersonation

## 📊 Available Scripts

### Frontend
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Backend
- `npm run dev` - Start with nodemon (auto-reload)
- `npm run build` - Compile TypeScript
- `npm start` - Start production server

### Utilities
- `./scripts/switch-env.sh` - Switch between development environments

## 🧪 Testing

Access the test API page at `/test-api` to verify backend connectivity and API functionality.

## 🌐 Deployment

### Frontend (Vercel)
1. Connect your repository to Vercel
2. Configure environment variables
3. Deploy

### Backend (Vercel/Railway/Heroku)
1. Set up environment variables
2. Configure build settings (TypeScript compilation)
3. Deploy

Configuration files are provided:
- `vercel.json` (root and backend)

## 🤝 Contributing

1. Create a feature branch (`git checkout -b feature/amazing-feature`)
2. Commit your changes (`git commit -m 'Add some amazing feature'`)
3. Push to the branch (`git push origin feature/amazing-feature`)
4. Open a Pull Request

## 📄 Documentation

Additional documentation can be found in:
- `documentation/JAVELINA_DOCUMENTATION.md` - Comprehensive platform documentation
- `ENVIRONMENT_SETUP.md` - Environment setup guide
- `supabase/README.md` - Database schema and migration info
- `ADMIN_SUPERADMIN_CHANGES.md` - Admin feature documentation
- `STRIPE_WEBHOOK_SETUP.md` - Stripe integration guide

## 🐛 Troubleshooting

### Common Issues

**Issue**: OAuth not working
- **Solution**: Verify OAuth credentials in Supabase dashboard and environment variables

**Issue**: Stripe webhooks failing
- **Solution**: Check webhook secret and ensure endpoint is accessible

**Issue**: Database connection errors
- **Solution**: Verify Supabase credentials and network connectivity

**Issue**: Mock mode not working
- **Solution**: Ensure `NEXT_PUBLIC_MOCK_MODE=true` in `.env.local`

## 📝 License

[Add your license here]

## 👥 Authors

[Add author information here]

## 🙏 Acknowledgments

- Built with Next.js, Supabase, and Stripe
- UI components inspired by Radix UI and shadcn/ui


