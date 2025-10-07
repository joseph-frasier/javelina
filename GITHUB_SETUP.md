# GitHub OAuth Authentication Setup Guide

This guide will help you set up direct GitHub OAuth authentication for your Javelina application (no Supabase required).

## Overview: Local + Vercel Setup

This setup covers **both environments**:

- 🏠 **Local development** (`http://localhost:3000`)
- 🚀 **Production on Vercel** (`https://javelina.vercel.app`)

You'll configure GitHub OAuth to work seamlessly in both places!

---

## Step 1: Create GitHub OAuth App (for Local + Vercel)

You have two options for setting up GitHub OAuth:

### Option A: Single OAuth App (Simpler - Recommended)

Create **one** OAuth app that works for both local development and Vercel production.

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click **"OAuth Apps"** in the left sidebar
3. Click **"New OAuth App"**
4. Fill in the application details:

   - **Application name**: `Javelina`
   - **Homepage URL**: `https://javelina.vercel.app`
   - **Authorization callback URL**: `https://javelina.vercel.app/api/auth/callback/github`

5. Click **"Register application"**
6. **Copy the Client ID** shown on the next page
7. Click **"Generate a new client secret"** and **copy it immediately** (you won't see it again!)

8. **Add local development callback URL:**
   - On the same OAuth app page, scroll down
   - Find the **"Authorization callback URL"** section
   - Click **"Add another callback URL"**
   - Enter: `http://localhost:3000/api/auth/callback/github`
   - Click **"Update application"**

Now your app has **two callback URLs** and will work in both environments!

### Option B: Separate OAuth Apps (More Secure)

Create **two** separate OAuth apps - one for development, one for production.

**Development OAuth App:**

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click **"New OAuth App"**
3. Fill in:
   - **Application name**: `Javelina Dev`
   - **Homepage URL**: `http://localhost:3000`
   - **Authorization callback URL**: `http://localhost:3000/api/auth/callback/github`
4. Click **"Register application"**
5. **Copy the Client ID and Client Secret** (save these for local `.env.local`)

**Production OAuth App:**

1. Click **"New OAuth App"** again
2. Fill in:
   - **Application name**: `Javelina Production`
   - **Homepage URL**: `https://javelina.vercel.app`
   - **Authorization callback URL**: `https://javelina.vercel.app/api/auth/callback/github`
3. Click **"Register application"**
4. **Copy the Client ID and Client Secret** (save these for Vercel)

## Step 2: Set Up Environment Variables

You need to configure environment variables in **two places**: locally and on Vercel.

### A. Local Development (.env.local)

Create a `.env.local` file in the **root** of your project:

```bash
# GitHub OAuth (use Dev app credentials if you chose Option B)
GITHUB_ID=your_github_client_id_here
GITHUB_SECRET=your_github_client_secret_here

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_random_secret_here
```

**If using Option A** (single OAuth app): Use the same Client ID and Secret from Step 1

**If using Option B** (separate OAuth apps): Use the **Dev** app Client ID and Secret

### B. Vercel Production (Environment Variables)

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your **Javelina** project
3. Go to **Settings** → **Environment Variables**
4. Add these variables by clicking **"Add New"**:

| Variable Name     | Value                         | Environments to Apply |
| ----------------- | ----------------------------- | --------------------- |
| `GITHUB_ID`       | Your GitHub Client ID         | Production, Preview   |
| `GITHUB_SECRET`   | Your GitHub Client Secret     | Production, Preview   |
| `NEXTAUTH_URL`    | `https://javelina.vercel.app` | Production            |
| `NEXTAUTH_SECRET` | Same secret from local        | Production, Preview   |

**If using Option A**: Use the same Client ID and Secret as local

**If using Option B**: Use the **Production** app Client ID and Secret

> **Important Notes:**
>
> - After adding environment variables in Vercel, you must **redeploy** your app
> - You can redeploy by going to **Deployments** → Click the ⋯ menu on latest deployment → **"Redeploy"**
> - Or just push a new commit to trigger a deployment

### How to generate NEXTAUTH_SECRET:

Run this command in your terminal (use the **same secret** for both local and Vercel):

```bash
openssl rand -base64 32
```

Or use this in Node.js:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Copy the output and use it in both `.env.local` and Vercel environment variables.

## Step 3: Test the Integration

### Local Development:

1. Make sure you've created `.env.local` with your credentials
2. Start your development server:
   ```bash
   npm run dev
   ```
3. Go to `http://localhost:3000/login`
4. Click the **"GitHub"** button
5. You should be redirected to GitHub to authorize
6. After authorization, you'll be redirected back to your app's home page

### Production (Vercel):

1. Push your code to GitHub:
   ```bash
   git add .
   git commit -m "Add GitHub OAuth authentication"
   git push origin feature/supabase-auth
   ```
2. Merge to main branch or deploy the branch directly from Vercel
3. Make sure environment variables are set in Vercel (Step 2B)
4. Visit your Vercel URL: `https://javelina.vercel.app/login`
5. Click the **"GitHub"** button
6. Authorize the app
7. You should be redirected back to your app and logged in!

### What Happens:

1. User clicks "GitHub" button on login page
2. NextAuth redirects to GitHub OAuth
3. User authorizes the app on GitHub
4. GitHub redirects back to `/api/auth/callback/github`
5. NextAuth creates a session
6. User is redirected to home page (`/`)

## Step 4: Check Session Data

The user's GitHub data will be available in the session:

- **Name**: `session.user.name`
- **Email**: `session.user.email`
- **Avatar**: `session.user.image`

You can access this in any component using:

```typescript
import { useSession } from 'next-auth/react';

function MyComponent() {
  const { data: session } = useSession();

  if (session) {
    console.log('User:', session.user);
  }
}
```

## What's Been Implemented

✅ NextAuth.js with GitHub provider
✅ GitHub login button on login page
✅ Session management
✅ User data in Header component
✅ Logout functionality
✅ Automatic redirect after login

## Files Created/Modified

- `lib/auth.ts` - NextAuth configuration
- `app/api/auth/[...nextauth]/route.ts` - NextAuth API routes
- `app/providers.tsx` - Added SessionProvider
- `app/login/page.tsx` - Added GitHub login handler
- `components/layout/Header.tsx` - Added session data and logout

## Troubleshooting

### "Configuration error" on login

- Check that `GITHUB_ID` and `GITHUB_SECRET` are set correctly
- Verify the callback URL in GitHub matches: `http://localhost:3000/api/auth/callback/github`

### "Invalid callback URL" error

- Make sure the callback URL in your GitHub OAuth app settings is exactly:
  - Development: `http://localhost:3000/api/auth/callback/github`
  - Production: `https://javelina.vercel.app/api/auth/callback/github`

### Session not persisting

- Make sure `NEXTAUTH_SECRET` is set
- Check that `SessionProvider` is wrapping your app in `app/providers.tsx`

### Environment variables not loading

- Restart your development server after adding/changing `.env.local`
- Check that the file is named exactly `.env.local` (not `.env`)
- Make sure `.env.local` is in the root directory of your project

### Vercel deployment issues

- Make sure environment variables are set in Vercel dashboard
- Redeploy after adding/changing environment variables
- Check that `NEXTAUTH_URL` is set to `https://javelina.vercel.app`
- Verify the GitHub OAuth callback URL is `https://javelina.vercel.app/api/auth/callback/github`

## Quick Reference: Local vs Vercel

| Setting                   | Local Development                                | Vercel Production                                      |
| ------------------------- | ------------------------------------------------ | ------------------------------------------------------ |
| **Callback URL**          | `http://localhost:3000/api/auth/callback/github` | `https://javelina.vercel.app/api/auth/callback/github` |
| **NEXTAUTH_URL**          | `http://localhost:3000`                          | `https://javelina.vercel.app`                          |
| **Where to set env vars** | `.env.local` file                                | Vercel Dashboard → Settings → Environment Variables    |
| **NEXTAUTH_SECRET**       | Same secret for both                             | Same secret for both                                   |
| **GITHUB_ID/SECRET**      | Same (Option A) or Dev app (Option B)            | Same (Option A) or Prod app (Option B)                 |

## Security Notes

- **Never commit** your `.env.local` file to Git (it's already in `.gitignore`)
- **Keep your GitHub Client Secret secure** - treat it like a password
- **Use different OAuth apps** for development and production
- **Regenerate secrets** if they're ever exposed

## Next Steps (Optional)

- Add email/password authentication alongside GitHub
- Add Google OAuth provider
- Implement protected routes with middleware
- Add user database to store additional user data
- Customize the session callback for more user data
