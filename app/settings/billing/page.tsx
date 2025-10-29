'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { SettingsLayout } from '@/components/layout/SettingsLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';

interface Organization {
  id: string;
  name: string;
  current_plan: string;
  plan_status: string;
  next_billing_date: string | null;
  stripe_customer_id: string | null;
}

export default function BillingPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchAdminOrganizations();
    }
  }, [user]);

  const fetchAdminOrganizations = async () => {
    try {
      const supabase = createClient();
      
      // Get organizations where user is Admin or SuperAdmin
      const { data: memberships, error: memberError } = await supabase
        .from('organization_members')
        .select(`
          organization_id,
          role,
          organizations!inner(
            id,
            name,
            stripe_customer_id
          )
        `)
        .eq('user_id', user?.id)
        .in('role', ['Admin', 'SuperAdmin']);

      if (memberError) throw memberError;

      if (!memberships || memberships.length === 0) {
        setOrganizations([]);
        setLoading(false);
        return;
      }

      // Get subscription data for each organization
      const orgIds = memberships.map(m => m.organization_id);
      const { data: subscriptions, error: subError } = await supabase
        .from('subscriptions')
        .select('org_id, status, current_period_end, plan_id')
        .in('org_id', orgIds);

      if (subError) {
        console.error('Error fetching subscriptions:', subError);
      }

      // Get plans separately if we have subscriptions
      let plans: any[] = [];
      if (subscriptions?.length) {
        const planIds = [...new Set(subscriptions.map(s => s.plan_id).filter(Boolean))];
        if (planIds.length) {
          const { data: plansData } = await supabase
            .from('plans')
            .select('id, code, name')
            .in('id', planIds);
          plans = plansData || [];
        }
      }

      console.log('Subscriptions data:', subscriptions);
      console.log('Plans data:', plans);
      console.log('Organization IDs:', orgIds);

      // Combine data
      const orgs: Organization[] = memberships.map(m => {
        const org = (m.organizations as any);
        const sub = subscriptions?.find(s => s.org_id === m.organization_id);
        const plan = sub?.plan_id ? plans.find(p => p.id === sub.plan_id) : null;
        
        return {
          id: org.id,
          name: org.name,
          current_plan: plan?.name || 'Free',
          plan_status: sub?.status || 'active',
          next_billing_date: sub?.current_period_end || null,
          stripe_customer_id: org.stripe_customer_id,
        };
      });

      setOrganizations(orgs);
    } catch (error) {
      console.error('Error fetching admin organizations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleManageBilling = (orgId: string) => {
    router.push(`/settings/billing/${orgId}`);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'canceled':
      case 'past_due':
        return 'bg-red-100 text-red-800';
      case 'trialing':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <ProtectedRoute>
      <SettingsLayout>
        <Card className="p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-orange-dark mb-2">
              Billing & Subscription
            </h2>
            <p className="text-sm text-gray-slate">
              Manage billing for your organizations
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange"></div>
            </div>
          ) : organizations.length === 0 ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
              <svg
                className="w-12 h-12 text-yellow-600 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <h3 className="text-lg font-bold text-yellow-800 mb-2">
                No Organizations Available
              </h3>
              <p className="text-sm text-yellow-700">
                You don&apos;t have admin access to any organizations. Only admins can manage billing.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {organizations.map((org) => (
                <div
                  key={org.id}
                  className="flex items-center justify-between p-5 border border-gray-light rounded-lg hover:border-orange/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-orange-dark">
                        {org.name}
                      </h3>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${getStatusColor(
                          org.plan_status
                        )}`}
                      >
                        {org.plan_status}
                      </span>
                    </div>
                    <div className="flex items-center gap-6 text-sm text-gray-slate">
                      <div>
                        <span className="font-medium">Plan:</span>{' '}
                        <span className="text-orange-dark font-semibold">
                          {org.current_plan}
                        </span>
                      </div>
                      {org.next_billing_date && (
                        <div>
                          <span className="font-medium">Next Billing:</span>{' '}
                          {formatDate(org.next_billing_date)}
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => handleManageBilling(org.id)}
                  >
                    Manage Billing
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </SettingsLayout>
    </ProtectedRoute>
  );
}
