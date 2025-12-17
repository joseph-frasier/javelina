# Plan Limits Backend Implementation Guide

This document describes the required Express API changes to enforce plan limits using LaunchDarkly.

## Overview

The backend is responsible for:
1. Fetching plan limits from LaunchDarkly
2. Checking current usage against limits before resource creation
3. Returning appropriate errors when limits are exceeded
4. Providing usage count endpoints for the frontend

## Prerequisites

### Install LaunchDarkly Node SDK

```bash
npm install @launchdarkly/node-server-sdk
```

### Environment Variables

```env
LAUNCHDARKLY_SDK_KEY=your-server-side-sdk-key
```

---

## 1. LaunchDarkly Client Singleton

Create `lib/launchdarkly.js`:

```javascript
const LaunchDarkly = require('@launchdarkly/node-server-sdk');

let ldClient = null;

/**
 * Initialize LaunchDarkly client (singleton)
 */
async function initLaunchDarkly() {
  if (ldClient) return ldClient;
  
  const sdkKey = process.env.LAUNCHDARKLY_SDK_KEY;
  if (!sdkKey) {
    console.warn('LaunchDarkly SDK key not configured. Using default limits.');
    return null;
  }
  
  ldClient = LaunchDarkly.init(sdkKey);
  await ldClient.waitForInitialization();
  console.log('LaunchDarkly client initialized');
  
  return ldClient;
}

/**
 * Get the LaunchDarkly client
 */
function getLDClient() {
  return ldClient;
}

/**
 * Close LaunchDarkly client on shutdown
 */
async function closeLaunchDarkly() {
  if (ldClient) {
    await ldClient.close();
    ldClient = null;
  }
}

module.exports = { initLaunchDarkly, getLDClient, closeLaunchDarkly };
```

---

## 2. Plan Limits Helper

Create `lib/planLimits.js`:

```javascript
const { getLDClient } = require('./launchdarkly');

/**
 * Default limits per tier (fallback if LaunchDarkly unavailable)
 */
const DEFAULT_LIMITS = {
  starter: { zones: 2, records: 200, users: 1, organizations: 1 },
  pro: { zones: 20, records: 2000, users: 5, organizations: 1 },
  business: { zones: 50, records: 5000, users: 20, organizations: 1 },
  enterprise: { zones: -1, records: -1, users: -1, organizations: -1 }, // -1 = unlimited
};

/**
 * Normalize plan code to tier
 * e.g., 'starter_lifetime' -> 'starter', 'premium_lifetime' -> 'business'
 */
function getPlanTier(planCode) {
  if (!planCode) return 'starter';
  
  if (planCode.includes('enterprise')) return 'enterprise';
  if (planCode.includes('business') || planCode.includes('premium')) return 'business';
  if (planCode.includes('pro')) return 'pro';
  
  return 'starter';
}

/**
 * Get plan limits from LaunchDarkly or defaults
 * 
 * @param {string} planCode - The plan code (e.g., 'starter_lifetime', 'pro')
 * @param {string} orgId - Organization ID for targeting context
 * @returns {Promise<{zones: number, records: number, users: number, organizations: number}>}
 */
async function getPlanLimits(planCode, orgId) {
  const tier = getPlanTier(planCode);
  const defaults = DEFAULT_LIMITS[tier] || DEFAULT_LIMITS.starter;
  
  const ldClient = getLDClient();
  if (!ldClient) {
    return defaults;
  }
  
  // Create context for LaunchDarkly
  // Using organization context allows targeting specific orgs for custom limits
  const context = {
    kind: 'organization',
    key: orgId || 'anonymous',
    planTier: tier,
    planCode: planCode || 'starter',
  };
  
  try {
    const flagKey = `plan-limits-${tier}`;
    const limits = await ldClient.variation(flagKey, context, defaults);
    return limits;
  } catch (error) {
    console.error('Error fetching LaunchDarkly flag:', error);
    return defaults;
  }
}

module.exports = { getPlanLimits, getPlanTier, DEFAULT_LIMITS };
```

---

## 3. Database Helper Functions

The following SQL functions should be created in Supabase (see migration `20251211000000_add_usage_count_functions.sql`):

- `get_org_zone_count(org_uuid UUID)` - Returns zone count
- `get_org_record_count(org_uuid UUID)` - Returns total DNS records
- `get_org_member_count(org_uuid UUID)` - Returns member count (excludes superadmins)

Create `lib/usageCounts.js`:

```javascript
const { supabase } = require('./supabase'); // Your Supabase client

/**
 * Get organization's plan code from subscription
 */
async function getOrgPlanCode(orgId) {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('plans(code)')
    .eq('org_id', orgId)
    .single();
  
  if (error || !data) {
    console.error('Error fetching org plan:', error);
    return null;
  }
  
  return data.plans?.code || null;
}

/**
 * Get zone count for organization using database function
 */
async function getOrgZoneCount(orgId) {
  const { data, error } = await supabase
    .rpc('get_org_zone_count', { org_uuid: orgId });
  
  if (error) {
    console.error('Error getting zone count:', error);
    return 0;
  }
  
  return data || 0;
}

/**
 * Get record count for organization using database function
 */
async function getOrgRecordCount(orgId) {
  const { data, error } = await supabase
    .rpc('get_org_record_count', { org_uuid: orgId });
  
  if (error) {
    console.error('Error getting record count:', error);
    return 0;
  }
  
  return data || 0;
}

/**
 * Get member count for organization using database function
 * NOTE: This excludes superadmin users (system accounts)
 */
async function getOrgMemberCount(orgId) {
  const { data, error } = await supabase
    .rpc('get_org_member_count', { org_uuid: orgId });
  
  if (error) {
    console.error('Error getting member count:', error);
    return 0;
  }
  
  return data || 0;
}

module.exports = {
  getOrgPlanCode,
  getOrgZoneCount,
  getOrgRecordCount,
  getOrgMemberCount,
};
```

---

## 4. Limit Enforcement Middleware

Create `middleware/enforcePlanLimits.js`:

```javascript
const { getPlanLimits } = require('../lib/planLimits');
const { 
  getOrgPlanCode, 
  getOrgZoneCount, 
  getOrgRecordCount, 
  getOrgMemberCount 
} = require('../lib/usageCounts');

/**
 * Create a limit error response
 */
function limitExceededError(res, limitType, current, max) {
  return res.status(403).json({
    error: `${limitType.charAt(0).toUpperCase() + limitType.slice(1)} limit reached. Please upgrade your plan.`,
    code: 'LIMIT_EXCEEDED',
    limit_type: limitType,
    current: current,
    max: max,
  });
}

/**
 * Middleware to check zone creation limit
 */
async function checkZoneLimit(req, res, next) {
  try {
    const orgId = req.body.organization_id;
    
    if (!orgId) {
      return res.status(400).json({ error: 'organization_id is required' });
    }
    
    const planCode = await getOrgPlanCode(orgId);
    const limits = await getPlanLimits(planCode, orgId);
    
    // -1 means unlimited
    if (limits.zones === -1) {
      return next();
    }
    
    const currentCount = await getOrgZoneCount(orgId);
    
    if (currentCount >= limits.zones) {
      return limitExceededError(res, 'zones', currentCount, limits.zones);
    }
    
    // Attach limits to request for potential use in route handler
    req.planLimits = limits;
    req.currentUsage = { zones: currentCount };
    
    next();
  } catch (error) {
    console.error('Error checking zone limit:', error);
    // Don't block on error - allow the request to proceed
    next();
  }
}

/**
 * Middleware to check DNS record creation limit
 */
async function checkRecordLimit(req, res, next) {
  try {
    const zoneId = req.body.zone_id || req.params.zoneId;
    
    if (!zoneId) {
      return res.status(400).json({ error: 'zone_id is required' });
    }
    
    // Get organization ID from zone
    const { data: zone, error } = await supabase
      .from('zones')
      .select('organization_id')
      .eq('id', zoneId)
      .single();
    
    if (error || !zone) {
      return res.status(404).json({ error: 'Zone not found' });
    }
    
    const orgId = zone.organization_id;
    const planCode = await getOrgPlanCode(orgId);
    const limits = await getPlanLimits(planCode, orgId);
    
    // -1 means unlimited
    if (limits.records === -1) {
      return next();
    }
    
    const currentCount = await getOrgRecordCount(orgId);
    
    if (currentCount >= limits.records) {
      return limitExceededError(res, 'records', currentCount, limits.records);
    }
    
    req.planLimits = limits;
    req.currentUsage = { records: currentCount };
    
    next();
  } catch (error) {
    console.error('Error checking record limit:', error);
    next();
  }
}

/**
 * Middleware to check member invitation limit
 */
async function checkMemberLimit(req, res, next) {
  try {
    const orgId = req.params.id || req.body.organization_id;
    
    if (!orgId) {
      return res.status(400).json({ error: 'organization_id is required' });
    }
    
    const planCode = await getOrgPlanCode(orgId);
    const limits = await getPlanLimits(planCode, orgId);
    
    // -1 means unlimited
    if (limits.users === -1) {
      return next();
    }
    
    const currentCount = await getOrgMemberCount(orgId);
    
    if (currentCount >= limits.users) {
      return limitExceededError(res, 'members', currentCount, limits.users);
    }
    
    req.planLimits = limits;
    req.currentUsage = { members: currentCount };
    
    next();
  } catch (error) {
    console.error('Error checking member limit:', error);
    next();
  }
}

module.exports = { checkZoneLimit, checkRecordLimit, checkMemberLimit };
```

---

## 5. Apply Middleware to Routes

Update your route files to use the middleware:

### Zones Routes (`routes/zones.js`)

```javascript
const { checkZoneLimit } = require('../middleware/enforcePlanLimits');

// Create zone - add limit check middleware
router.post('/', authenticateUser, checkZoneLimit, async (req, res) => {
  // Your existing zone creation logic
});
```

### DNS Records Routes (`routes/dns-records.js`)

```javascript
const { checkRecordLimit } = require('../middleware/enforcePlanLimits');

// Create DNS record - add limit check middleware
router.post('/', authenticateUser, checkRecordLimit, async (req, res) => {
  // Your existing record creation logic
});
```

### Organization Members Routes (`routes/organizations.js`)

```javascript
const { checkMemberLimit } = require('../middleware/enforcePlanLimits');

// Add member - add limit check middleware
router.post('/:id/members', authenticateUser, checkMemberLimit, async (req, res) => {
  // Your member addition logic
  // See TEAM_MEMBERS_API_REQUIREMENTS.md for complete implementation details
});
```

---

## 6. Usage Count Endpoint

Create a new endpoint for the frontend to fetch usage counts:

```javascript
const { getPlanLimits } = require('../lib/planLimits');
const { 
  getOrgPlanCode, 
  getOrgZoneCount, 
  getOrgRecordCount, 
  getOrgMemberCount 
} = require('../lib/usageCounts');

/**
 * GET /api/organizations/:id/usage
 * Returns current usage and limits for an organization
 */
router.get('/:id/usage', authenticateUser, async (req, res) => {
  try {
    const orgId = req.params.id;
    
    // Verify user has access to this organization
    // (Your existing authorization logic here)
    
    // Get plan code and limits
    const planCode = await getOrgPlanCode(orgId);
    const limits = await getPlanLimits(planCode, orgId);
    
    // Get current usage counts
    const [zones, records, members] = await Promise.all([
      getOrgZoneCount(orgId),
      getOrgRecordCount(orgId),
      getOrgMemberCount(orgId),
    ]);
    
    res.json({
      zones: { current: zones, max: limits.zones },
      records: { current: records, max: limits.records },
      members: { current: members, max: limits.users },
    });
  } catch (error) {
    console.error('Error fetching usage:', error);
    res.status(500).json({ error: 'Failed to fetch usage data' });
  }
});
```

---

## 7. Initialize LaunchDarkly on Server Start

In your main `app.js` or `server.js`:

```javascript
const { initLaunchDarkly, closeLaunchDarkly } = require('./lib/launchdarkly');

// Initialize on startup
async function startServer() {
  try {
    await initLaunchDarkly();
    
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Cleanup on shutdown
process.on('SIGTERM', async () => {
  await closeLaunchDarkly();
  process.exit(0);
});

startServer();
```

---

## 8. LaunchDarkly Flag Configuration

Create these flags in your LaunchDarkly dashboard (project: "Irongrove, LLC"):

### Flag: `plan-limits-starter`
- **Type:** JSON
- **Default Value:**
```json
{
  "zones": 2,
  "records": 200,
  "users": 1,
  "organizations": 1
}
```

### Flag: `plan-limits-pro`
- **Type:** JSON
- **Default Value:**
```json
{
  "zones": 20,
  "records": 2000,
  "users": 5,
  "organizations": 1
}
```

### Flag: `plan-limits-business`
- **Type:** JSON
- **Default Value:**
```json
{
  "zones": 50,
  "records": 5000,
  "users": 20,
  "organizations": 1
}
```

---

## 9. Error Response Format

When a limit is exceeded, the API returns:

```json
{
  "error": "Zones limit reached. Please upgrade your plan.",
  "code": "LIMIT_EXCEEDED",
  "limit_type": "zones",
  "current": 5,
  "max": 5
}
```

HTTP Status: `403 Forbidden`

The frontend checks for `code: 'LIMIT_EXCEEDED'` to show appropriate upgrade prompts.

---

## 10. Grandfathering Logic

The implementation follows these rules:
- Limits are checked **only on creation** (POST endpoints)
- Existing resources are **never blocked** from viewing/editing/deleting
- Users who exceed limits can keep their existing resources but cannot add more
- This ensures existing customers are not disrupted if limits change

---

## Testing Checklist

- [ ] LaunchDarkly client initializes successfully
- [ ] Zone creation blocked when at limit
- [ ] DNS record creation blocked when at limit  
- [ ] Member invitation blocked when at limit
- [ ] `/api/organizations/:id/usage` returns correct counts
- [ ] Error responses include `LIMIT_EXCEEDED` code
- [ ] Enterprise plans (unlimited) bypass all checks
- [ ] Superadmin users are excluded from member counts

