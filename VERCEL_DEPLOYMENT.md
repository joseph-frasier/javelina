# Vercel Monorepo Deployment Guide

## Overview
This project is configured as a monorepo on Vercel with:
- **Frontend**: Next.js app (root directory)
- **Backend**: Express API (`/backend` directory)

In production, the backend runs as Vercel serverless functions, and all `/api/*` requests are routed to it via rewrites.

## Changes Made

### 1. Created Next.js API Catch-All Route (`app/api/[...slug]/route.ts`)
- Wraps the Express backend using `@vendia/serverless-express`
- Handles all `/api/*` requests as Vercel serverless functions
- Express app runs in Node.js runtime (not Edge)

### 2. Updated Backend for Serverless (`backend/src/index.ts`)
- Only calls `app.listen()` when run directly (not in serverless)
- Exports Express app for import by Next.js API route
- Compatible with both traditional server and serverless environments

### 3. Updated API Client Configuration
The following files now detect production and use relative URLs:
- `lib/api-client.ts`
- `lib/actions/zones.ts`
- `lib/actions/organizations.ts`
- `lib/actions/environments.ts`
- `lib/actions/dns-records.ts`

**Behavior:**
- **Development**: Calls `http://localhost:3001/api/*` (Express server)
- **Production**: Calls `/api/*` (same domain, routed to Next.js API route → Express)

## Required Vercel Environment Variables

Set these in your Vercel project dashboard (Settings → Environment Variables):

### Backend Environment Variables
```
FRONTEND_URL=https://javelina-pi.vercel.app
NODE_ENV=production
SUPABASE_URL=your-supabase-project-url
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

**⚠️ IMPORTANT - FRONTEND_URL Security:**
- The `FRONTEND_URL` must match your production domain EXACTLY
- This is used for CORS security to whitelist your domain
- In production, requests without an Origin header are blocked
- In development, no-origin requests are allowed (for Postman/curl testing)

### Frontend Environment Variables (if needed)
```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### Optional: Stripe Variables (if using Stripe)
```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

## Deployment Process

### 1. Push to Main Branch
```bash
git add .
git commit -m "fix: configure Vercel monorepo with backend routing"
git push origin fix/vercel-backend-routing
```

### 2. Create Pull Request & Merge
- Create PR on GitHub
- Vercel will create a preview deployment
- Test the preview deployment
- Merge to main

### 3. Verify Production Deployment
- Vercel will automatically deploy to production
- Check logs in Vercel dashboard
- Test API endpoints: `https://javelina-pi.vercel.app/api/health`

## How It Works

### Request Flow (Production)
```
User Browser
    ↓
https://javelina-pi.vercel.app/api/environments
    ↓
Next.js Routing (App Router)
    ↓
/app/api/[...slug]/route.ts (Catch-all API Route)
    ↓
@vendia/serverless-express (Adapter)
    ↓
Express App (backend/src/index.ts)
    ↓
Express Route Handler
    ↓
Response
```

### Request Flow (Development)
```
User Browser
    ↓
http://localhost:3000 (Next.js)
    ↓
API Call to http://localhost:3001/api/environments
    ↓
Express Server (backend/src/index.ts)
    ↓
Response
```

## Development Setup

### Start Both Servers
```bash
# Option 1: Run both concurrently
npm run dev:full

# Option 2: Run separately
npm run dev              # Frontend (terminal 1)
npm run dev:backend      # Backend (terminal 2)
```

## Troubleshooting

### CORS Errors in Production
- Check that `FRONTEND_URL` is set correctly in Vercel
- Verify the environment variable matches your production domain exactly

### 404 on API Routes
- Check Vercel build logs for backend compilation errors
- Verify `backend/dist/` is being generated during build
- Check that `npm run build:backend` succeeds locally

### Backend Not Starting
- Check Vercel function logs in dashboard
- Verify all required environment variables are set
- Ensure `backend/src/index.ts` exports the Express app

### Environment Variables Not Working
- Make sure variables are set for the correct environment (Production/Preview/Development)
- Redeploy after adding new variables
- Check variable names match exactly (case-sensitive)

## Testing Locally

### Test Backend Directly
```bash
cd backend
npm run dev

# In another terminal
curl http://localhost:3001/api/health
```

### Test Full Stack
```bash
npm run dev:full

# Visit http://localhost:3000
# Frontend will call backend at localhost:3001
```

## Key Files

- `/vercel.json` - Vercel configuration with rewrites
- `/backend/vercel.json` - Backend-specific Vercel config
- `/backend/src/index.ts` - Express app entry point
- `/lib/api-client.ts` - API client with environment detection
- `/lib/actions/*.ts` - Server actions that call the backend

## Notes

- The backend runs as **serverless functions** on Vercel, not as a persistent server
- Each API request creates a new function invocation
- Cold starts may occur after periods of inactivity
- Database connections should be managed appropriately for serverless
- File uploads/downloads work but have size limits (check Vercel limits)

