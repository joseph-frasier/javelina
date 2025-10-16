# Google OAuth - Quick Start Guide

**TL;DR**: 2-3 hours to set up, mostly waiting for Google/Supabase dashboards.

---

## 🚀 Start Here

### Prerequisites
- [ ] Google account
- [ ] Access to [Google Cloud Console](https://console.cloud.google.com/)
- [ ] Access to [Supabase Dashboard](https://app.supabase.com/)

---

## ⏱️ Timeline

| Phase | Time | Actions |
|-------|------|---------|
| **1** | 30-45 min | Google Cloud Console setup |
| **2** | 5-10 min | Supabase configuration |
| **3** | 10-15 min | Local testing |
| **4** | 5-10 min | Production deployment |
| **Total** | ~2 hours | ✅ Google OAuth ready |

---

## 🔧 Phase 1: Google Cloud (30-45 min)

### 1.1 Create Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click project dropdown → **NEW PROJECT**
3. Name: "Javelina DNS" → **CREATE**
4. Wait ~1 minute for project to be created

### 1.2 Enable API
1. Search for "Google+ API"
2. Click result → **ENABLE**

### 1.3 Create OAuth Credentials
1. Go to **APIs & Services** → **Credentials**
2. Click **+ CREATE CREDENTIALS** → **OAuth client ID**
3. Select **Web application**
4. Name: "Javelina Web App"
5. Add redirect URIs:
   ```
   http://localhost:3000/auth/callback
   ```
6. For production, also add:
   ```
   https://<your-vercel-url>/auth/callback
   https://<your-production-domain>/auth/callback
   ```
7. Click **CREATE**
8. **⚠️ Copy Client ID and Client Secret** (save somewhere safe)

---

## 🔐 Phase 2: Supabase (5-10 min)

### 2.1 Enable Google Provider
1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Click your project
3. Go to **Authentication** → **Providers**
4. Click **Google** to expand
5. Toggle **Enable** to ON
6. Paste **Client ID** from Phase 1.3
7. Paste **Client Secret** from Phase 1.3
8. Click **SAVE**

### 2.2 Verify URLs
1. Go to **Authentication** → **URL Configuration**
2. Set **Site URL** to:
   - Dev: `http://localhost:3000`
   - Prod: `https://<your-domain>`
3. Under **Redirect URLs**, ensure these exist:
   - `http://localhost:3000/auth/callback`
   - `https://<your-vercel-url>/auth/callback`

---

## 🧪 Phase 3: Test Locally (10-15 min)

### 3.1 Setup Environment
1. Copy `.env.example` to `.env.local`
2. Fill in from Supabase **Settings** → **API**:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```

### 3.2 Test OAuth Flow
1. Run: `npm run dev`
2. Go to: `http://localhost:3000/login`
3. Click **Google** button
4. Sign in with your Google account
5. Authorize the app
6. ✅ Should redirect to home and be logged in

### 3.3 Verify Session
1. Refresh page (Cmd+R / Ctrl+F5)
2. ✅ Should still be logged in
3. Open DevTools → **Application** → **Cookies**
4. ✅ Should see `sb-*` cookies
5. Click logout
6. ✅ Should be logged out

---

## 🚢 Phase 4: Deploy (5-10 min)

### 4.1 Push to GitHub
```bash
git add .
git commit -m "feat: implement google oauth"
git push origin feat/google-oauth
```

### 4.2 Merge to Main
1. Create Pull Request on GitHub
2. Merge to `main`
3. Vercel auto-deploys ✅

### 4.3 Verify Production
1. Go to your Vercel URL: `https://<your-vercel-url>/login`
2. Click **Google** button
3. Complete flow
4. ✅ Should work same as local

---

## ✅ Success Criteria

- [ ] Google button visible on login page
- [ ] Clicking redirects to Google
- [ ] OAuth redirects back to app
- [ ] User is logged in
- [ ] Session persists after refresh
- [ ] Works locally and in production

---

## ❌ Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| Button doesn't work | Check `.env.local`, verify Supabase Google enabled, restart dev server |
| "Redirect URI mismatch" | Check exact URL in Google Console matches `<domain>/auth/callback` |
| Session not persisting | Check browser cookies for `sb-*`, verify Site URL in Supabase |
| Works locally but not prod | Verify environment variables in Vercel, check Vercel logs |

For more help: See `GOOGLE_OAUTH_SETUP.md` → **Troubleshooting**

---

## 📚 Full Documentation

- **Detailed Setup**: `supabase/GOOGLE_OAUTH_SETUP.md`
- **Checklist**: `supabase/GOOGLE_OAUTH_CHECKLIST.md`
- **Status**: `GOOGLE_OAUTH_IMPLEMENTATION.md`

---

## 🎯 You're Ready!

The app already has all code in place. You just need to:

1. ✅ Create Google credentials (Phase 1)
2. ✅ Add them to Supabase (Phase 2)
3. ✅ Test locally (Phase 3)
4. ✅ Deploy (Phase 4)

**Start with Phase 1 → Google Cloud Console**

Good luck! 🚀

