# Utility Functions

## `get-url.ts` - Dynamic URL Detection

### Purpose
Automatically detects the correct site URL across all environments without manual configuration.

### Functions

#### `getURL()`
Returns the base URL for the application.

**Priority order:**
1. `NEXT_PUBLIC_SITE_URL` (if explicitly set)
2. `VERCEL_URL` (for Vercel preview deployments)
3. `window.location.origin` (client-side)
4. `http://localhost:3000` (fallback for local dev)

**Usage:**
```typescript
import { getURL } from '@/lib/utils/get-url'

const baseUrl = getURL()
// Local: "http://localhost:3000"
// Preview: "https://your-app-git-branch-username.vercel.app"
// Production: "https://yourdomain.com" (from NEXT_PUBLIC_SITE_URL or window.location)
```

#### `getBaseURL()`
Alias for `getURL()` with a more descriptive name.

#### `getAuthCallbackURL()`
Returns the full OAuth callback URL.

**Usage:**
```typescript
import { getAuthCallbackURL } from '@/lib/utils/get-url'

const callbackUrl = getAuthCallbackURL()
// Returns: "http://localhost:3000/auth/callback" (local)
// Returns: "https://yourdomain.com/auth/callback" (production)
```

### Environment-Specific Behavior

| Environment | Detection Method | Example URL |
|-------------|-----------------|-------------|
| **Local Dev** | Fallback to localhost:3000 | `http://localhost:3000` |
| **Vercel Preview** | Uses `VERCEL_URL` env var | `https://app-git-branch.vercel.app` |
| **Vercel Production** | Uses `NEXT_PUBLIC_SITE_URL` or `window.location.origin` | `https://yourdomain.com` |

### When to Override

You rarely need to set `NEXT_PUBLIC_SITE_URL` manually. Only override if:
- You have a custom domain setup that isn't detected
- You're using a reverse proxy or load balancer
- You want to force a specific URL in all environments

### Examples

**In Supabase auth configuration:**
```typescript
import { getAuthCallbackURL } from '@/lib/utils/get-url'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: getAuthCallbackURL(), // Automatically correct for any environment
  },
})
```

**In middleware:**
```typescript
import { getURL } from '@/lib/utils/get-url'

const redirectUrl = new URL('/login', getURL())
return NextResponse.redirect(redirectUrl)
```

**In email templates (Supabase):**
```
{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=signup
```
Note: Supabase's `{{ .SiteURL }}` automatically uses your configured Site URL, so no changes needed in templates.

### Testing

Test across all environments:

```bash
# Local dev
npm run dev
# Check console: Should show http://localhost:3000

# Vercel preview
# Deploy to preview branch
# Check logs: Should show https://your-app-git-branch.vercel.app

# Vercel production  
# Deploy to production
# Check logs: Should show your production domain
```

