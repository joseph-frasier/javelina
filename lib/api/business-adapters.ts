// javelina/lib/api/business-adapters.ts
import type { BusinessDetail } from './business';

// Adapts the server's BusinessDetail into the legacy BusinessIntakeData
// shape that BusinessPlaceholderDashboard and SideNav consume. This is a
// transitional adapter; once those components read BusinessDetail directly,
// it can go away.
export function adaptDetailToLegacyIntake(detail: BusinessDetail): {
  orgId: string;
  planCode: 'business_starter' | 'business_pro';
  currentStep: 4;
  dns: any;
  website: any;
  domain: any;
  contact: any;
  completedAt: string | null;
} {
  const intake = (detail.intake ?? {}) as Record<string, any>;
  return {
    orgId: detail.org.id,
    planCode: (intake.planCode ?? 'business_starter') as 'business_starter' | 'business_pro',
    currentStep: 4,
    dns: intake.dns ?? { mode: 'jbp' },
    website: intake.website ?? { bizName: detail.org.name, pages: [] },
    domain: intake.domain ?? { mode: 'connect' },
    contact: intake.contact ?? {
      firstName: '', lastName: '', email: '', phone: '',
      address: '', city: '', state: '', zip: '', whois: true,
    },
    completedAt: intake.completed_at ?? null,
  };
}
