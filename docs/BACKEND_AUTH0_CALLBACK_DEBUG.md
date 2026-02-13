# Debug: Auth0 Callback Failing - Consent Screen Loop

## Problem

Auth0 consent screen appears on EVERY login attempt, even in fresh incognito windows. This indicates the `/auth/callback` endpoint is failing before completing successfully.

## Why This Happens

Auth0 only remembers user consent AFTER the callback completes successfully. If callback fails:
1. Auth0 never records consent as granted
2. Next login shows consent screen again
3. Infinite consent screen loop

## Backend Debugging Steps

### 1. Check Express Server Logs

**Look for errors in the backend console during login:**

```bash
# Run your Express backend with verbose logging
# Watch for errors after you click "Accept" on consent screen
```

**What to look for:**
- ❌ Database errors (Supabase connection, query failures)
- ❌ JWT signing errors 
- ❌ "Cannot set headers after they are sent"
- ❌ Unhandled promise rejections
- ❌ Timeout errors
- ❌ Any 500 errors

### 2. Check Callback Endpoint Code

**File:** `routes/auth.js` (or wherever `/auth/callback` is)

**Common failure points:**

```javascript
router.get('/callback', async (req, res) => {
  try {
    // 1. Get code and state from query params
    const code = req.query.code;
    const state = req.query.state;
    
    // FAIL POINT 1: State validation
    const storedState = req.cookies.auth_state;
    if (state !== storedState) {
      console.error('[Callback] State mismatch');  // CHECK LOGS
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=state_mismatch`);
    }
    
    // 2. Exchange code for tokens
    // FAIL POINT 2: Token exchange with Auth0
    const tokenResponse = await axios.post(`https://${process.env.AUTH0_DOMAIN}/oauth/token`, {
      grant_type: 'authorization_code',
      client_id: process.env.AUTH0_CLIENT_ID,
      client_secret: process.env.AUTH0_CLIENT_SECRET,
      code: code,
      redirect_uri: process.env.AUTH0_CALLBACK_URL,
      code_verifier: req.cookies.auth_code_verifier,
    });
    
    // FAIL POINT 3: Decode ID token
    const idToken = tokenResponse.data.id_token;
    const decoded = jwt.decode(idToken);
    
    // 3. Get user info
    const auth0UserId = decoded.sub;
    const email = decoded.email;
    
    // FAIL POINT 4: Database query/connection
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    // FAIL POINT 5: Database lookup
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('auth0_user_id', auth0UserId)
      .single();
    
    let userId;
    if (existingUser) {
      userId = existingUser.id;
      // FAIL POINT 6: Update query
      await supabase
        .from('profiles')
        .update({ last_login: new Date().toISOString() })
        .eq('id', userId);
    } else {
      // FAIL POINT 7: Insert query
      const { data: newUser, error: createError } = await supabase
        .from('profiles')
        .insert({
          auth0_user_id: auth0UserId,
          email: email,
          name: decoded.name,
          email_verified: decoded.email_verified,
          last_login: new Date().toISOString()
        })
        .select()
        .single();
      
      if (createError) {
        console.error('[Callback] Error creating user:', createError);  // CHECK LOGS
        throw createError;
      }
      userId = newUser.id;
    }
    
    // FAIL POINT 8: Session creation
    const sessionData = {
      userId: userId,
      auth0UserId: auth0UserId,
      email: email,
      name: decoded.name,
      emailVerified: decoded.email_verified,
      loginTime: Date.now(),
      lastActivity: Date.now()
    };
    
    // FAIL POINT 9: JWT signing
    const sessionToken = jwt.sign(sessionData, process.env.SESSION_SECRET, {
      expiresIn: '24h'
    });
    
    // FAIL POINT 10: Cookie settings
    res.cookie(process.env.SESSION_COOKIE_NAME || 'javelina_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',  // MUST be false in development!
      sameSite: 'lax',
      maxAge: parseInt(process.env.SESSION_MAX_AGE) || 86400000,
      path: '/'
    });
    
    // Clear temp cookies
    res.clearCookie('auth_state', { path: '/auth' });
    res.clearCookie('auth_code_verifier', { path: '/auth' });
    
    // FAIL POINT 11: Redirect (must be AFTER all cookie operations)
    res.redirect(`${process.env.FRONTEND_URL}/`);
    
  } catch (error) {
    // FAIL POINT 12: Error handler
    console.error('[Callback] Error:', error);  // CHECK LOGS
    res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`);
  }
});
```

### 3. Most Likely Culprits

Based on your symptoms, check these in order:

#### A. **Supabase Connection Failure**

```bash
# Check if these environment variables are set correctly:
echo $SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY  # NOT anon key!
```

**Common mistake:** Using `SUPABASE_ANON_KEY` instead of `SUPABASE_SERVICE_ROLE_KEY`
- Anon key can't create/update user profiles
- Callback fails silently on database operation
- Cookie never set

#### B. **profiles Table Missing auth0_user_id Column**

```sql
-- Run this in Supabase SQL editor:
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles';

-- Should see:
-- auth0_user_id | text
```

If missing, add it:
```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS auth0_user_id TEXT UNIQUE;
CREATE INDEX IF NOT EXISTS idx_profiles_auth0_user_id ON profiles(auth0_user_id);
```

#### C. **Cookie Secure Flag Wrong**

In **development** (localhost), `secure: true` prevents cookies from being set:

```javascript
res.cookie('javelina_session', sessionToken, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',  // CRITICAL - must be false locally
  sameSite: 'lax',
  maxAge: 86400000,
  path: '/'
});
```

#### D. **Wrong Redirect URL**

Check `FRONTEND_URL` in backend `.env`:
```env
FRONTEND_URL=http://localhost:3000  # NOT https:// for local dev
```

#### E. **Session Secret Missing**

```bash
# Check if SESSION_SECRET exists:
echo $SESSION_SECRET

# If empty, generate one:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Add Detailed Logging

Add this to your `/auth/callback` to see exactly where it fails:

```javascript
router.get('/callback', async (req, res) => {
  console.log('[Callback] START - query params:', { code: !!req.query.code, state: !!req.query.state });
  
  try {
    const code = req.query.code;
    const state = req.query.state;
    console.log('[Callback] Step 1: Got code and state');
    
    // ... state validation ...
    console.log('[Callback] Step 2: State validated');
    
    // ... token exchange ...
    console.log('[Callback] Step 3: Got tokens from Auth0');
    
    const decoded = jwt.decode(idToken);
    console.log('[Callback] Step 4: Decoded ID token:', { sub: decoded.sub, email: decoded.email });
    
    // ... database lookup ...
    console.log('[Callback] Step 5: Checked database for existing user');
    
    // ... create/update user ...
    console.log('[Callback] Step 6: Created/updated user, userId:', userId);
    
    const sessionData = { /* ... */ };
    console.log('[Callback] Step 7: Created session data');
    
    const sessionToken = jwt.sign(sessionData, process.env.SESSION_SECRET, { expiresIn: '24h' });
    console.log('[Callback] Step 8: Signed JWT token');
    
    res.cookie('javelina_session', sessionToken, { /* ... */ });
    console.log('[Callback] Step 9: Set session cookie');
    
    res.clearCookie('auth_state', { path: '/auth' });
    res.clearCookie('auth_code_verifier', { path: '/auth' });
    console.log('[Callback] Step 10: Cleared temp cookies');
    
    const redirectUrl = `${process.env.FRONTEND_URL}/`;
    console.log('[Callback] Step 11: Redirecting to:', redirectUrl);
    
    res.redirect(redirectUrl);
    console.log('[Callback] Step 12: COMPLETE');
    
  } catch (error) {
    console.error('[Callback] FAILED at step:', error.message);
    console.error('[Callback] Full error:', error);
    res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`);
  }
});
```

### 5. Test Callback Directly

After you click "Accept" on the consent screen, Auth0 redirects to your backend callback. 

**Watch your backend logs** and see which step fails or which step never logs.

### 6. Quick Fixes to Try

**Try these in order:**

1. **Restart backend server** - sometimes env variables don't reload
2. **Check backend is running** - confirm it's listening on the right port
3. **Verify AUTH0_CALLBACK_URL** - must match exactly what's in Auth0 dashboard
4. **Check Supabase connection** - try a simple query in a test endpoint
5. **Verify SESSION_SECRET** - must be set and consistent

## Expected Backend Logs

After clicking "Accept" on consent screen, you should see:

```
[Callback] START - query params: { code: true, state: true }
[Callback] Step 1: Got code and state
[Callback] Step 2: State validated
[Callback] Step 3: Got tokens from Auth0
[Callback] Step 4: Decoded ID token: { sub: 'auth0|...', email: 'user@example.com' }
[Callback] Step 5: Checked database for existing user
[Callback] Step 6: Created/updated user, userId: abc-123-def
[Callback] Step 7: Created session data
[Callback] Step 8: Signed JWT token
[Callback] Step 9: Set session cookie
[Callback] Step 10: Cleared temp cookies
[Callback] Step 11: Redirecting to: http://localhost:3000/
[Callback] Step 12: COMPLETE
```

**If ANY step is missing**, that's where the callback is failing.

## What to Share

To help debug further, please share:

1. **Backend console logs** from the moment you click "Accept" on consent screen
2. **Which step fails** (or which is the last successful step)
3. **Any error messages** you see in backend logs
4. **Environment check:**
   ```bash
   echo "SUPABASE_URL: ${SUPABASE_URL:0:30}..."
   echo "SUPABASE_SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_ROLE_KEY:0:20}..."
   echo "SESSION_SECRET: ${SESSION_SECRET:0:10}..."
   echo "FRONTEND_URL: $FRONTEND_URL"
   echo "NODE_ENV: $NODE_ENV"
   ```

The repeated consent screen is definitely a backend callback failure. Once we see which step fails, we can fix it quickly!
