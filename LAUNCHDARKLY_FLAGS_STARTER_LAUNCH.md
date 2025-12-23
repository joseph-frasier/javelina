# LaunchDarkly Flags for Starter-Only Launch

This document describes the LaunchDarkly feature flags used to temporarily limit plan offerings to **Starter subscription** and **Starter Lifetime** during the initial product launch.

## Overview

We use **4 boolean feature flags** to hide higher-tier plans and certain features at launch:

1. **`pricing-hide-pro-plans`** – Hide Pro subscription & Pro Lifetime
2. **`pricing-hide-business-plans`** – Hide Business subscription & Business Lifetime  
3. **`billing-hide-upgrade-limit-cta`** – Hide upgrade CTA in zone/record limit banners
4. **`orgs-hide-team-invites`** – Hide team member invite/management UI

All flags default to `false` (show everything) to preserve existing behavior when LaunchDarkly is unavailable or flags are not configured.

---

## Creating Flags in LaunchDarkly UI

### General Steps (for all 4 flags)

1. **Navigate** to your LaunchDarkly project (e.g. `javelina`)
2. **Select** the environment (`Test`, `Production`, etc.)
3. **Click** "Feature flags" → "+ Flag"
4. **Configure** each flag with the settings below
5. **Enable** "Client-side SDK availability" → "SDKs using client-side ID"
6. **Set** the default targeting:
   - **Off variation**: `1` (false)
   - **On variation / Fallthrough**: `0` (true)

---

## Flag 1: Hide Pro Plans

**Purpose**: Hide Pro monthly subscription and Pro Lifetime from all self-serve pricing and upgrade UIs.

### Configuration

| Field | Value |
|-------|-------|
| **Flag name** | `Pricing: Hide Pro plans` |
| **Key** | `pricing-hide-pro-plans` |
| **Description** | When true, hide Pro subscription and Pro Lifetime from all self-serve pricing and upgrade UIs. |
| **Type** | Boolean |
| **Variations** | `true` (Hide Pro), `false` (Show Pro) |
| **Client-side availability** | ✅ Enabled |

### Recommended Defaults

- **Development/Staging**: Off (`false`) – all plans visible for testing
- **Production (launch)**: On (`true`) – only Starter visible to users

### Reference JSON

```json
{
  "key": "pricing-hide-pro-plans",
  "name": "Pricing: Hide Pro plans",
  "description": "When true, hide Pro subscription and Pro Lifetime from all self-serve pricing and upgrade UIs.",
  "variationType": "boolean",
  "variations": [
    {
      "value": true,
      "name": "Hide Pro",
      "description": "Pro plans are hidden from pricing and change-plan UIs."
    },
    {
      "value": false,
      "name": "Show Pro",
      "description": "Pro plans are visible everywhere."
    }
  ],
  "defaults": {
    "onVariation": 0,
    "offVariation": 1
  },
  "clientSideAvailability": {
    "usingEnvironmentId": true,
    "usingMobileKey": false
  }
}
```

---

## Flag 2: Hide Business Plans

**Purpose**: Hide Business monthly subscription and Business Lifetime (`premium_lifetime`) from all self-serve pricing and upgrade UIs.

### Configuration

| Field | Value |
|-------|-------|
| **Flag name** | `Pricing: Hide Business plans` |
| **Key** | `pricing-hide-business-plans` |
| **Description** | When true, hide Business subscription and Business Lifetime plans from all self-serve pricing and upgrade UIs. |
| **Type** | Boolean |
| **Variations** | `true` (Hide Business), `false` (Show Business) |
| **Client-side availability** | ✅ Enabled |

### Recommended Defaults

- **Development/Staging**: Off (`false`)
- **Production (launch)**: On (`true`)

### Reference JSON

```json
{
  "key": "pricing-hide-business-plans",
  "name": "Pricing: Hide Business plans",
  "description": "When true, hide Business subscription and Business Lifetime plans from all self-serve pricing and upgrade UIs.",
  "variationType": "boolean",
  "variations": [
    {
      "value": true,
      "name": "Hide Business",
      "description": "Business plans are hidden from pricing and change-plan UIs."
    },
    {
      "value": false,
      "name": "Show Business",
      "description": "Business plans are visible everywhere."
    }
  ],
  "defaults": {
    "onVariation": 0,
    "offVariation": 1
  },
  "clientSideAvailability": {
    "usingEnvironmentId": true,
    "usingMobileKey": false
  }
}
```

---

## Flag 3: Hide Upgrade Limit CTA

**Purpose**: Hide only the **Upgrade / Upgrade Plan button** in zone/record limit banners while keeping the warning text and progress bar visible.

### Configuration

| Field | Value |
|-------|-------|
| **Flag name** | `Billing: Hide limit upgrade button` |
| **Key** | `billing-hide-upgrade-limit-cta` |
| **Description** | When true, hide the Upgrade/Upgrade Plan button in zone/record limit banners, but keep the warning text and progress bar visible. |
| **Type** | Boolean |
| **Variations** | `true` (Hide button), `false` (Show button) |
| **Client-side availability** | ✅ Enabled |

### Behavior

- Applies to `resourceType = "zones"` and `"records"` in `UpgradeLimitBanner`
- Does **not** change member-limit behavior (member limit banners still show upgrade prompts)

### Recommended Defaults

- **Development/Staging**: Off (`false`)
- **Production (launch)**: On (`true`)

### Reference JSON

```json
{
  "key": "billing-hide-upgrade-limit-cta",
  "name": "Billing: Hide limit upgrade button",
  "description": "When true, hide the Upgrade/Upgrade Plan button in zone/record limit banners while keeping the warning visible.",
  "variationType": "boolean",
  "variations": [
    {
      "value": true,
      "name": "Hide upgrade button",
      "description": "Limit banners show warnings only, without an upgrade CTA."
    },
    {
      "value": false,
      "name": "Show upgrade button",
      "description": "Limit banners show the Upgrade/Upgrade Plan button as normal."
    }
  ],
  "defaults": {
    "onVariation": 0,
    "offVariation": 1
  },
  "clientSideAvailability": {
    "usingEnvironmentId": true,
    "usingMobileKey": false
  }
}
```

---

## Flag 4: Hide Team Invites

**Purpose**: Hide the **team member invite & management UI** for **all orgs** when on, regardless of plan.

### Configuration

| Field | Value |
|-------|-------|
| **Flag name** | `Orgs: Hide team invites` |
| **Key** | `orgs-hide-team-invites` |
| **Description** | When true, hide the team member invite and manage members UI for all organizations. |
| **Type** | Boolean |
| **Variations** | `true` (Hide invites), `false` (Show invites) |
| **Client-side availability** | ✅ Enabled |

### Scope

- Hides `InviteUsersBox` component on the organization page
- Hides `InviteUsersModal` and `ManageTeamMembersModal` 
- Applies to **all organizations**, not just Starter tier

### Recommended Defaults

- **Development/Staging**: Off (`false`)
- **Production (launch)**: On (`true`)

### Reference JSON

```json
{
  "key": "orgs-hide-team-invites",
  "name": "Orgs: Hide team invites",
  "description": "When true, hide the team member invite and manage members UI for all organizations.",
  "variationType": "boolean",
  "variations": [
    {
      "value": true,
      "name": "Hide team invites",
      "description": "Team member invite/management UI is hidden in the app."
    },
    {
      "value": false,
      "name": "Show team invites",
      "description": "Team member invite/management UI is visible as normal."
    }
  ],
  "defaults": {
    "onVariation": 0,
    "offVariation": 1
  },
  "clientSideAvailability": {
    "usingEnvironmentId": true,
    "usingMobileKey": false
  }
}
```

---

## Using Flags in Code

### Frontend Hook

```tsx
import { useFeatureFlags } from '@/lib/hooks/useFeatureFlags';

function MyComponent() {
  const { 
    hideProPlans, 
    hideBusinessPlans, 
    hideUpgradeLimitCta, 
    hideTeamInvites 
  } = useFeatureFlags();
  
  // Use flags to conditionally render UI
  if (!hideProPlans) {
    // Show Pro plans
  }
}
```

### Flag Keys (Constants)

```tsx
import { LD_FLAG_KEYS } from '@/lib/hooks/useFeatureFlags';

// LD_FLAG_KEYS.HIDE_PRO_PLANS = 'pricing-hide-pro-plans'
// LD_FLAG_KEYS.HIDE_BUSINESS_PLANS = 'pricing-hide-business-plans'
// LD_FLAG_KEYS.HIDE_UPGRADE_LIMIT_CTA = 'billing-hide-upgrade-limit-cta'
// LD_FLAG_KEYS.HIDE_TEAM_INVITES = 'orgs-hide-team-invites'
```

---

## Environment Setup

### Required Environment Variable

```bash
NEXT_PUBLIC_LAUNCHDARKLY_CLIENT_ID=<your-client-side-id>
```

Get the client-side ID from:
- LaunchDarkly Dashboard → Project → Environment → Settings → Client-side ID

### Testing

1. **Test environment**: Create all 4 flags in your Test environment first
2. **Verify** flags are accessible with the Test client-side ID
3. **Production**: Mirror the same flags (with identical keys) to Production before launch
4. **Toggle** flags on/off per environment as needed

---

## Impact of Flag States

### All Flags OFF (Development default)

- ✅ All plans visible on pricing page
- ✅ Change/upgrade modals show all tiers
- ✅ Team invite UI visible
- ✅ Upgrade CTAs appear in limit banners

### Launch Configuration (Production)

- `pricing-hide-pro-plans` = **ON**
- `pricing-hide-business-plans` = **ON**
- `orgs-hide-team-invites` = **ON**
- `billing-hide-upgrade-limit-cta` = **ON**

**Result**:
- ✅ Only **Starter subscription** and **Starter Lifetime** visible
- ✅ Enterprise (contact sales) still visible but not self-serve
- ❌ Team invite UI hidden for all orgs
- ⚠️ Zone/record limit banners show warnings **without** upgrade buttons

---

## Rollout Strategy

1. **Create flags** in Test environment with keys exactly as documented above
2. **Deploy code** that uses the flags (defaults to `false`, existing behavior)
3. **Test** in Test environment with flags toggled on/off
4. **Mirror flags** to Production environment (same keys, initially OFF)
5. **Deploy to production** (flags still OFF, no change in behavior)
6. **Launch day**: Toggle flags ON in Production via LaunchDarkly UI
7. **Gradual rollout** (optional): Use LD targeting rules to enable for % of users
8. **Future tiers**: Toggle individual flags OFF as Pro/Business become available

---

## Notes for Ops/DevOps

- **No code deployment needed** to change flag states after initial deploy
- **Flag changes** take effect immediately (typically < 1 second)
- **Targeting JSON** shown above is for documentation/API use; not pasted into UI
- **Reference JSON blocks** in this doc can be used with LaunchDarkly REST API if scripting flag creation
- **Variations order matters**: Ensure variation 0 = `true`, variation 1 = `false` when configuring

---

## Troubleshooting

### Flags not working

1. Check `NEXT_PUBLIC_LAUNCHDARKLY_CLIENT_ID` is set correctly
2. Verify flags exist in the environment matching your client-side ID
3. Check browser console for LaunchDarkly connection errors
4. Ensure "Client-side SDK availability" is enabled for each flag

### Flags showing wrong values

1. Check targeting configuration in LaunchDarkly UI
2. Verify `offVariation` = 1 (false) and fallthrough `variation` = 0 (true)
3. Clear browser localStorage and refresh (LD uses local caching)
4. Check for user-specific targeting rules that might override defaults

---

## Related Documentation

- `lib/hooks/useFeatureFlags.ts` – Feature flag hook implementation
- `BACKEND_CHECKOUT_VALIDATION_STARTER_ONLY.md` – Backend validation requirements
- LaunchDarkly SDK: https://docs.launchdarkly.com/sdk/client-side/react/react-web

