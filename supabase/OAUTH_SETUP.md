# OAuth Provider Setup Guide

## Google OAuth Setup

### 1. Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth client ID**
5. Choose **Web application**
6. Add authorized redirect URIs:
   ```
   https://your-project.supabase.co/auth/v1/callback
   ```
7. Copy the **Client ID** and **Client Secret**

### 2. Configure in Supabase

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **Providers**
3. Find **Google** and enable it
4. Paste your Client ID and Client Secret
5. Click **Save**

---

## GitHub OAuth Setup

### 1. Create GitHub OAuth App

1. Go to [GitHub Settings](https://github.com/settings/developers)
2. Click **OAuth Apps** → **New OAuth App**
3. Fill in details:
   - **Application name**: Javelina DNS Management
   - **Homepage URL**: `https://yourdomain.com` (or your Vercel URL)
   - **Authorization callback URL**: `https://your-project.supabase.co/auth/v1/callback`
4. Click **Register application**
5. Copy the **Client ID**
6. Generate and copy the **Client Secret**

### 2. Configure in Supabase

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **Providers**
3. Find **GitHub** and enable it
4. Paste your Client ID and Client Secret
5. Click **Save**

---

## Supabase URL Configuration

### Configure Redirect URLs

1. In Supabase dashboard, go to **Authentication** → **URL Configuration**
2. **Site URL**: Set to your production domain
   ```
   https://yourdomain.com
   ```

3. **Redirect URLs**: Add all environments:
   ```
   http://localhost:3000/auth/callback
   https://yourdomain.com/auth/callback
   https://*.vercel.app/auth/callback
   ```

### Email Templates

1. Go to **Authentication** → **Email Templates**
2. Update redirect URLs in email templates:
   - **Confirm signup**: `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=signup`
   - **Reset password**: `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=recovery`

---

## Testing OAuth

### Local Development
1. Start your dev server: `npm run dev`
2. Go to `http://localhost:3000/login`
3. Click on Google or GitHub button
4. Should redirect to OAuth provider
5. After authorization, should redirect back to `http://localhost:3000/auth/callback`
6. Then redirect to home page

### Production (Vercel)
1. Deploy to Vercel
2. Test the same flow on your production URL
3. Verify cookies are set correctly
4. Check Vercel logs if issues occur

---

## Troubleshooting

### Common Issues

**"Redirect URI mismatch"**
- Verify the callback URL in Google/GitHub matches exactly
- Should be: `https://your-project.supabase.co/auth/v1/callback`

**"Invalid client"**
- Check that Client ID and Secret are correct
- Make sure they're saved in Supabase

**OAuth works locally but not on Vercel**
- Verify environment variables are set in Vercel
- Check that redirect URLs include your Vercel domain
- Look at Vercel function logs for errors

**Session not persisting**
- Check that cookies are being set (browser DevTools → Application → Cookies)
- Verify middleware is running (check Vercel logs)

---

## Security Notes

⚠️ **Important**:
- Keep Client Secrets secure (never commit to git)
- Use environment variables for all secrets
- Enable email verification for production
- Consider enabling MFA for admin users
- Review RLS policies before launching

