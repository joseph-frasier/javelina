# Hierarchy Structure Diagram

## Visual Structure

```
Dashboard (Landing Page)
│
├─ Shows aggregated stats across ALL organizations
├─ Total Orgs: 2
├─ Total Environments: 5  
├─ Total Zones: 242
└─ Total Queries (24h): 3M+

    ↓ Click Organization

Organization Page
│
├─ Company Corp
│   ├─ Stats: 3 Environments, 234 Zones, 2.98M queries/day
│   │
│   ├─ Environment: Production [RED BADGE]
│   │   ├─ 120 zones
│   │   ├─ 1,450 records
│   │   ├─ 2.45M queries/day
│   │   └─ 99.8% uptime
│   │
│   ├─ Environment: Staging [YELLOW BADGE]
│   │   ├─ 80 zones
│   │   ├─ 950 records
│   │   ├─ 450K queries/day
│   │   └─ 99.5% uptime
│   │
│   └─ Environment: Development [GREEN BADGE]
│       ├─ 34 zones
│       ├─ 380 records
│       ├─ 85K queries/day
│       └─ 98.9% uptime
│
└─ Personal Projects
    ├─ Stats: 2 Environments, 8 Zones, 15.5K queries/day
    │
    ├─ Environment: Production [RED BADGE]
    │   ├─ 5 zones
    │   ├─ 45 records
    │   └─ 12K queries/day
    │
    └─ Environment: Development [GREEN BADGE]
        ├─ 3 zones
        ├─ 28 records
        └─ 3.5K queries/day

        ↓ Click Environment

Environment Page
│
├─ Breadcrumb: Company Corp → Production
├─ Stats: 120 Zones, 1,450 Records, 2.45M queries/day
│
├─ Zones Table:
│   ├─ company.com [ACTIVE] - 24 records, 1.25M queries
│   ├─ api.company.com [ACTIVE] - 18 records, 890K queries  
│   ├─ cdn.company.com [ACTIVE] - 12 records, 310K queries
│   └─ ... (117 more zones)
│
└─ Actions: Add Zone (Editor+), Analytics

        ↓ Click Zone

Zone Detail Page
│
├─ Breadcrumb: Company Corp → Production → company.com
├─ Environment Badge: Production [RED]
├─ Context: Company Corp → Production
│
├─ DNS Records:
│   ├─ @ A 192.0.2.1
│   ├─ @ AAAA 2001:db8::1
│   ├─ www CNAME company.com
│   ├─ @ MX 10 mail.company.com
│   └─ ... more records
│
├─ Query Stats: 1.25M/day, 99.8% success, 12ms avg
└─ Actions: Edit, Delete, Reload
```

## Role-Based Permissions

### Organization Level

```
SuperAdmin (Marcus)
├─ Company Corp
│   ├─ Create/Delete Environments ✓
│   ├─ Manage All Zones ✓
│   ├─ View All Data ✓
│   └─ Manage Settings ✓
│
└─ Personal Projects
    └─ (Same permissions)

Admin
├─ Organization
│   ├─ Create/Delete Environments ✓
│   ├─ Manage Zones ✓
│   ├─ Invite Members ✓
│   └─ Manage Settings ✓

Editor (Sarah)
├─ Company Corp
│   ├─ Create/Delete Environments ✗
│   ├─ Create Zones ✓
│   ├─ Edit Zones ✓
│   ├─ Edit Records ✓
│   └─ View All Data ✓

Viewer
├─ Organization
│   ├─ Create/Edit/Delete ✗
│   └─ View Only ✓ (Read-only)
```

### Environment Level (Optional Override)

```
Sarah Chen Example:
├─ Company Corp [Editor at Org Level]
│   ├─ Production [Editor] - Can edit zones
│   ├─ Staging [Editor] - Can edit zones
│   └─ Development [Admin] - Elevated to Admin in dev!
```

## Sidebar Navigation Tree

```
📁 Organizations
│
├─ ▼ 📁 Company Corp
│   ├─ ▼ 🖥️ Production
│   │   ├─ 🌐 company.com
│   │   ├─ 🌐 api.company.com
│   │   └─ 🌐 cdn.company.com
│   │
│   ├─ ▶ 🖥️ Staging
│   │   ├─ 🌐 staging.company.com
│   │   ├─ 🌐 api-staging.company.com
│   │   └─ 🌐 test.company.com
│   │
│   └─ ▶ 🖥️ Development
│       ├─ 🌐 dev.company.com
│       ├─ 🌐 local.company.com
│       └─ 🌐 sandbox.company.com
│
└─ ▶ 📁 Personal Projects
    ├─ ▶ 🖥️ Production
    └─ ▶ 🖥️ Development
```

## URL Structure

```
/                                                    Dashboard
/organization/org_company                            Organization Page
/organization/org_company/environment/env_prod       Environment Page
/zone/zone_company_prod_1                            Zone Detail

Old (Removed):
/project/production                                  ❌ Deleted
```

## Data Flow

```
User Login
    ↓
useAuthStore
    ├─ user.organizations[] ← List of orgs user has access to
    └─ Each org has environments[]
        ↓
Sidebar filters organizations
        ↓
mockOrganizations (lib/mock-hierarchy-data.ts)
    ├─ Full org details
    ├─ Environment stats
    └─ Zone data
        ↓
useHierarchyStore (optional)
    ├─ currentOrgId
    └─ currentEnvironmentId
```

## Color Coding

- **🔴 Production**: Red/Orange badges - Handle with care!
- **🟡 Staging**: Yellow badges - Testing environment
- **🟢 Development**: Green badges - Safe to experiment

## Quick Reference

| Entity | Count (Company Corp) | Count (Personal) |
|--------|---------------------|------------------|
| Environments | 3 | 2 |
| Total Zones | 234 | 8 |
| Prod Zones | 120 | 5 |
| Staging Zones | 80 | 0 |
| Dev Zones | 34 | 3 |
| Total Records | 2,780 | 73 |
| Queries/day | 2.98M | 15.5K |

---

**Legend**:
- ▶ = Collapsed
- ▼ = Expanded
- 📁 = Organization
- 🖥️ = Environment (Server)
- 🌐 = Zone (DNS)

