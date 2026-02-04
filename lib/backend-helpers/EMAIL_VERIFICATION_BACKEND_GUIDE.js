/**
 * ============================================================================
 * EMAIL VERIFICATION & BOT PROTECTION - BACKEND IMPLEMENTATION GUIDE
 * ============================================================================
 * 
 * This file contains everything needed to implement email verification
 * enforcement in your Express backend.
 * 
 * QUICK START:
 * 1. Read the "Integration Steps" section below
 * 2. Copy the code sections marked with "COPY THIS"
 * 3. Follow the 4 integration steps (~75 minutes total)
 * 4. Test using the provided test cases
 * 
 * SECTIONS:
 * - Integration Steps (overview)
 * - Section 1: Callback Handler Update
 * - Section 2: Email Verification Middleware
 * - Section 3: Verification Endpoints
 * - Section 4: Apply Middleware to Routes
 * - Section 5: Environment Variables
 * - Section 6: Testing Guide
 * - Section 7: Troubleshooting
 * 
 * ============================================================================
 */

/**
 * ============================================================================
 * INTEGRATION STEPS - OVERVIEW
 * ============================================================================
 * 
 * Step 1: Update Auth0 Callback Handler (15 mins)
 *   - Sync email_verified from Auth0 JWT to database & session
 *   - See Section 1 below
 * 
 * Step 2: Add Email Verification Middleware (5 mins)
 *   - Create middleware/requireEmailVerification.js
 *   - Copy code from Section 2 below
 * 
 * Step 3: Add Verification Endpoints (10 mins)
 *   - Add two new routes to routes/auth.js
 *   - Copy handlers from Section 3 below
 * 
 * Step 4: Apply Middleware to Protected Routes (15 mins)
 *   - Add middleware to write operations
 *   - See examples in Section 4 below
 * 
 * Step 5: Test End-to-End (30 mins)
 *   - Follow test cases in Section 6
 * 
 * TOTAL TIME: ~75 minutes
 */

/**
 * ============================================================================
 * SECTION 1: UPDATE AUTH0 CALLBACK HANDLER
 * ============================================================================
 * 
 * FILE: routes/auth.js (or wherever your /auth/callback route is)
 * 
 * WHAT TO DO:
 * Find your existing Auth0 callback handler and update it to include
 * email_verified syncing as shown below.
 * 
 * WHY: This syncs Auth0's verification status to your database and session
 * on every login. The user verifies email outside our app (clicks Auth0 link),
 * so we only know the updated status when they next log in.
 */

// ========== EXISTING CODE (for reference) ==========
// This is what your callback handler likely looks like now:

/*
router.get('/callback', async (req, res) => {
  try {
    // ... CSRF validation, code exchange, token verification ...
    
    const decoded = await verifyToken(id_token);
    
    const auth0UserId = decoded.sub;
    const email = decoded.email;
    const name = decoded.name || email;
    
    // ========== ADD THIS LINE ==========
    const emailVerified = decoded.email_verified || false; // ← ADD THIS - Extract from JWT
    // ===================================
    
    // Check for existing user
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('*')
      .eq('auth0_user_id', auth0UserId)
      .single();
    
    let userId;
    
    if (existingUser) {
      userId = existingUser.id;
      
      // ========== UPDATE THIS SECTION ==========
      // BEFORE: Only updated last_login
      // await supabase
      //   .from('profiles')
      //   .update({ last_login: new Date().toISOString() })
      //   .eq('id', userId);
      
      // AFTER: Also sync email_verified status
      await supabase
        .from('profiles')
        .update({ 
          last_login: new Date().toISOString(),
          email_verified: emailVerified // ← ADD THIS - Sync verification status on every login
        })
        .eq('id', userId);
      // =========================================
      
    } else {
      // Create new user
      const { data: newUser } = await supabase
        .from('profiles')
        .insert({
          auth0_user_id: auth0UserId,
          email: email,
          name: name,
          email_verified: emailVerified, // ← ADD THIS - Set initial status
          last_login: new Date().toISOString()
        })
        .select()
        .single();
      
      userId = newUser.id;
    }
    
    // ========== UPDATE SESSION DATA ==========
    // Create session data
    const sessionData = {
      userId: userId,
      auth0UserId: auth0UserId,
      email: email,
      name: name,
      emailVerified: emailVerified, // ← ADD THIS - Include in session
      loginTime: Date.now()
    };
    // =========================================
    
    // Sign and set session cookie
    const sessionToken = jwt.sign(sessionData, process.env.SESSION_SECRET, {
      expiresIn: '7d'
    });
    
    res.cookie('javelina_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
    
    // Redirect to frontend
    res.redirect(`${process.env.FRONTEND_URL}/`);
    
  } catch (error) {
    console.error('Callback error:', error);
    res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`);
  }
});
*/

/**
 * ============================================================================
 * SECTION 2: EMAIL VERIFICATION MIDDLEWARE
 * ============================================================================
 * 
 * FILE: middleware/requireEmailVerification.js (NEW FILE)
 * 
 * WHAT TO DO: Create this file and copy the code below
 */

// ========== COPY THIS → middleware/requireEmailVerification.js ==========

/**
 * Middleware to enforce email verification for sensitive operations
 * Returns 403 if user's email is not verified
 * 
 * Prerequisites:
 * - req.user must exist (set by authenticateSession middleware)
 * - req.user.emailVerified must be a boolean value synced from Auth0 JWT
 */
function requireEmailVerification(req, res, next) {
  // First check authentication
  if (!req.user) {
    return res.status(401).json({ 
      error: 'Not authenticated',
      code: 'NOT_AUTHENTICATED'
    });
  }
  
  // Then check email verification
  // emailVerified should be synced from Auth0 JWT on every login
  if (!req.user.emailVerified) {
    return res.status(403).json({ 
      error: 'Email verification required',
      message: 'Please verify your email address to perform this action. Check your inbox for a verification link.',
      code: 'EMAIL_NOT_VERIFIED',
      email: req.user.email
    });
  }
  
  // Email is verified, proceed
  next();
}

module.exports = { requireEmailVerification };

// ========== END COPY ==========

/**
 * ============================================================================
 * SECTION 3: VERIFICATION ENDPOINTS
 * ============================================================================
 * 
 * FILE: routes/auth.js
 * 
 * WHAT TO DO: Add these two route handlers to your auth router
 * 
 * DEPENDENCIES: npm install axios @supabase/supabase-js (if not already installed)
 */

// ========== COPY THIS → Add to routes/auth.js ==========

const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

/**
 * POST /auth/resend-verification
 * Triggers Auth0 to resend verification email via Management API
 */
async function resendVerification(req, res) {
  try {
    const auth0UserId = req.user.auth0UserId;
    
    if (!auth0UserId) {
      return res.status(400).json({ 
        error: 'Not an Auth0 user',
        message: 'Email verification is only available for Auth0 users' 
      });
    }
    
    // 1. Get Management API access token
    const tokenResponse = await axios.post(
      `https://${process.env.AUTH0_DOMAIN}/oauth/token`,
      {
        client_id: process.env.AUTH0_CLIENT_ID,
        client_secret: process.env.AUTH0_CLIENT_SECRET,
        audience: `https://${process.env.AUTH0_DOMAIN}/api/v2/`,
        grant_type: 'client_credentials'
      },
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
    const managementToken = tokenResponse.data.access_token;
    
    // 2. Trigger verification email via Management API
    await axios.post(
      `https://${process.env.AUTH0_DOMAIN}/api/v2/jobs/verification-email`,
      {
        user_id: auth0UserId,
        client_id: process.env.AUTH0_CLIENT_ID // Associate with your app for correct redirect URL
      },
      {
        headers: {
          'Authorization': `Bearer ${managementToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log(`Verification email sent to ${req.user.email} (${auth0UserId})`);
    
    return res.json({ 
      success: true,
      message: 'Verification email sent successfully. Please check your inbox.' 
    });
    
  } catch (error) {
    console.error('Error resending verification email:', error.response?.data || error);
    
    // Handle specific Auth0 errors
    if (error.response?.status === 429) {
      return res.status(429).json({ 
        error: 'Too many requests',
        message: 'Please wait a few minutes before requesting another verification email'
      });
    }
    
    return res.status(500).json({ 
      error: 'Failed to send verification email',
      message: error.response?.data?.message || 'Please try again later'
    });
  }
}

/**
 * GET /auth/me/verification-status
 * Returns current email verification status from database
 */
async function getVerificationStatus(req, res) {
  try {
    const userId = req.user.userId;
    
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    const { data: user, error } = await supabase
      .from('profiles')
      .select('email_verified, email')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error('Error fetching verification status:', error);
      return res.status(500).json({ error: 'Failed to fetch verification status' });
    }
    
    return res.json({ 
      email_verified: user.email_verified || false,
      email: user.email
    });
    
  } catch (error) {
    console.error('Error checking verification status:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ========== THEN ADD THESE ROUTES ==========

// In your auth router setup:
router.post('/auth/resend-verification', authenticateSession, resendVerification);
router.get('/auth/me/verification-status', authenticateSession, getVerificationStatus);

// ========== END COPY ==========

/**
 * ============================================================================
 * SECTION 4: APPLY MIDDLEWARE TO PROTECTED ROUTES
 * ============================================================================
 * 
 * FILE: routes/* (wherever your API routes are registered)
 * 
 * WHAT TO DO: Apply requireEmailVerification middleware to write operations
 * 
 * STRATEGY: Block creates/updates/deletes but allow reads. Users can browse
 * but not modify until verified.
 */

// ========== EXAMPLE: How to apply middleware ==========

const { authenticateSession } = require('../middleware/auth'); // Your existing auth middleware
const { requireEmailVerification } = require('../middleware/requireEmailVerification'); // NEW

// === REQUIRE VERIFICATION FOR WRITE OPERATIONS ===

// Organizations
router.post('/api/organizations', authenticateSession, requireEmailVerification, createOrganization);
router.put('/api/organizations/:id', authenticateSession, requireEmailVerification, updateOrganization);
router.delete('/api/organizations/:id', authenticateSession, requireEmailVerification, deleteOrganization);

// Zones
router.post('/api/zones', authenticateSession, requireEmailVerification, createZone);
router.put('/api/zones/:id', authenticateSession, requireEmailVerification, updateZone);
router.delete('/api/zones/:id', authenticateSession, requireEmailVerification, deleteZone);

// DNS Records
router.post('/api/dns-records', authenticateSession, requireEmailVerification, createDNSRecord);
router.put('/api/dns-records/:id', authenticateSession, requireEmailVerification, updateDNSRecord);
router.delete('/api/dns-records/:id', authenticateSession, requireEmailVerification, deleteDNSRecord);

// Subscriptions/Billing
router.post('/api/subscriptions', authenticateSession, requireEmailVerification, createSubscription);
router.put('/api/subscriptions/:id', authenticateSession, requireEmailVerification, updateSubscription);

// === ALLOW READ OPERATIONS WITHOUT VERIFICATION ===
// Let users explore the app while waiting for email verification

router.get('/api/organizations/:id', authenticateSession, getOrganization);
router.get('/api/zones/:id', authenticateSession, getZone);
router.get('/api/dns-records/zone/:zoneId', authenticateSession, getDNSRecords);
router.get('/api/users/profile', authenticateSession, getProfile);

// ========== END EXAMPLE ==========

/**
 * ============================================================================
 * SECTION 5: ENVIRONMENT VARIABLES
 * ============================================================================
 * 
 * FILE: .env
 * 
 * WHAT TO DO: Ensure these variables are set in your Express backend .env file
 */

/*
# Auth0 Configuration
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_CLIENT_ID=your_client_id
AUTH0_CLIENT_SECRET=your_client_secret  # ← IMPORTANT: Required for Management API
AUTH0_CALLBACK_URL=http://localhost:3001/auth/callback

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Session Configuration
SESSION_SECRET=your_session_secret
SESSION_COOKIE_NAME=javelina_session
SESSION_MAX_AGE=604800000  # 7 days

# Frontend URL
FRONTEND_URL=http://localhost:3000
*/

/**
 * ============================================================================
 * SECTION 6: TESTING GUIDE
 * ============================================================================
 * 
 * After implementing the above changes, test the complete flow:
 */

/**
 * TEST 1: Callback Handler Syncs email_verified
 * ------------------------------------------------
 * 1. Create a new test account in the app
 * 2. Check profiles table - should have email_verified: false
 * 3. Manually verify in Auth0 dashboard:
 *    - User Management → Users → Select user
 *    - Toggle email_verified to true
 * 4. Log out and log back in
 * 5. Check profiles table - should now have email_verified: true
 * 6. Decode session cookie (jwt.io) - should have emailVerified: true
 * 
 * ✅ PASS: email_verified syncs from Auth0 to database on login
 */

/**
 * TEST 2: Middleware Blocks Unverified Users
 * -------------------------------------------
 * 1. Create test account (unverified)
 * 2. Try to create a zone via API: POST /api/zones
 * 3. Should return:
 *    {
 *      "error": "Email verification required",
 *      "message": "Please verify your email address...",
 *      "code": "EMAIL_NOT_VERIFIED",
 *      "email": "test@example.com"
 *    }
 *    Status code: 403 Forbidden
 * 
 * ✅ PASS: Middleware blocks write operations for unverified users
 */

/**
 * TEST 3: Read Operations Still Work
 * -----------------------------------
 * 1. With same unverified account
 * 2. Try to read zones: GET /api/zones/:id
 * 3. Should return zone data (200 OK)
 * 
 * ✅ PASS: Read operations work without verification
 */

/**
 * TEST 4: Resend Verification Email
 * ----------------------------------
 * 1. Call: POST /auth/resend-verification (with session cookie)
 * 2. Should return:
 *    {
 *      "success": true,
 *      "message": "Verification email sent successfully..."
 *    }
 * 3. Check email inbox - should receive verification email
 * 
 * ✅ PASS: Resend endpoint triggers Auth0 email
 */

/**
 * TEST 5: Verification Status Endpoint
 * -------------------------------------
 * 1. Call: GET /auth/me/verification-status (with session cookie)
 * 2. Should return:
 *    {
 *      "email_verified": false,
 *      "email": "test@example.com"
 *    }
 * 
 * ✅ PASS: Status endpoint returns correct data
 */

/**
 * TEST 6: Frontend Integration (End-to-End)
 * ------------------------------------------
 * 1. Create test account on localhost:3000
 * 2. Banner should appear on dashboard/org/zone pages
 * 3. Click "Resend Email" - should receive email
 * 4. Try to create zone - should see error toast
 * 5. Can still view existing zones (read-only)
 * 6. Click verification link in email
 * 7. Should redirect to /email-verified page
 * 8. Log out and log back in
 * 9. Banner should disappear
 * 10. Can now create/edit/delete resources
 * 
 * ✅ PASS: Complete flow works end-to-end
 */

/**
 * ============================================================================
 * SECTION 7: TROUBLESHOOTING
 * ============================================================================
 */

/**
 * ISSUE: "client_secret required" error
 * --------------------------------------
 * PROBLEM: Auth0 Management API requires client secret
 * SOLUTION: Add AUTH0_CLIENT_SECRET to your backend .env file
 *          (from Auth0 Dashboard → Applications → Your App → Settings)
 */

/**
 * ISSUE: Verification email uses wrong redirect URL
 * --------------------------------------------------
 * PROBLEM: Email redirects to wrong environment
 * SOLUTION: Make sure you're using the correct client_id for your environment.
 *          The client_id parameter in /jobs/verification-email determines
 *          which Auth0 app's redirect URL is used.
 */

/**
 * ISSUE: Email verification status not syncing
 * ---------------------------------------------
 * PROBLEM: User verifies email but status doesn't update
 * SOLUTION: User must log out and log back in after verification.
 *          The sync happens during login when Auth0 sends the updated JWT.
 *          Check that email_verified is being extracted from decoded.email_verified
 *          in callback handler.
 */

/**
 * ISSUE: Middleware blocks all users
 * -----------------------------------
 * PROBLEM: Even verified users can't perform actions
 * SOLUTION: Check session cookie has emailVerified: true (decode it at jwt.io).
 *          Verify callback handler is including emailVerified in session data.
 *          Check middleware is reading req.user.emailVerified (not req.user.email_verified).
 */

/**
 * ISSUE: Frontend banner not appearing
 * -------------------------------------
 * PROBLEM: Banner doesn't show for unverified users
 * SOLUTION: Frontend checks user.email_verified field. Make sure the
 *          /api/users/profile endpoint returns this field from the database.
 */

/**
 * ============================================================================
 * QUICK REFERENCE: What Goes Where
 * ============================================================================
 * 
 * File: routes/auth.js
 * - Update callback handler to sync email_verified (Section 1)
 * - Add resendVerification handler (Section 3)
 * - Add getVerificationStatus handler (Section 3)
 * - Add two new routes (Section 3)
 * 
 * File: middleware/requireEmailVerification.js (NEW)
 * - Copy entire middleware from Section 2
 * 
 * File: routes/* (all route files)
 * - Import requireEmailVerification middleware
 * - Apply to POST/PUT/DELETE routes (Section 4)
 * 
 * File: .env
 * - Add/verify environment variables (Section 5)
 * 
 * ============================================================================
 * 
 * Questions? Check the troubleshooting section above or review the test cases.
 * 
 * ============================================================================
 */
