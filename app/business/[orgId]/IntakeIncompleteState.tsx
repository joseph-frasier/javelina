// javelina/app/business/[orgId]/IntakeIncompleteState.tsx
'use client';

import Link from 'next/link';
import { FONT } from '@/components/business/ui/tokens';
import { useBusinessTheme } from '@/lib/business-theme-store';
import { Button } from '@/components/business/ui/Button';
import { Icon } from '@/components/business/ui/Icon';
import { Card } from '@/components/business/ui/Card';

interface Props {
  orgId: string;
  orgName: string;
  planCode?: string;
}

export function IntakeIncompleteState({ orgId, orgName, planCode }: Props) {
  const t = useBusinessTheme();
  const resumeHref = `/business/setup?org_id=${orgId}&plan_code=${planCode ?? 'business_starter'}&org_name=${encodeURIComponent(orgName)}`;

  return (
    <div style={{ maxWidth: 640, margin: '32px auto' }}>
      <Card t={t}>
        <div style={{ padding: '24px 4px', textAlign: 'center', fontFamily: FONT }}>
          <h1
            style={{
              margin: 0,
              fontSize: 24,
              fontWeight: 700,
              color: t.text,
              letterSpacing: -0.4,
            }}
          >
            Finish setting up {orgName}
          </h1>
          <p
            style={{
              margin: '12px 0 24px',
              fontSize: 14,
              color: t.textMuted,
              lineHeight: 1.6,
            }}
          >
            Your subscription is active, but we still need a few details to build your site, configure DNS, and set up email. It only takes a few minutes.
          </p>
          <Link href={resumeHref} style={{ textDecoration: 'none' }}>
            <Button t={t} size="md" iconLeft={<Icon name="sparkle" size={14} color="#fff" />}>
              Continue setup
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}

export default IntakeIncompleteState;
