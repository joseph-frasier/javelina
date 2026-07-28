import { AdminStatusBadge } from '@/components/admin/AdminStatusBadge';

export function pricingStatusBadge(org: { has_custom_pricing?: boolean }) {
  return org.has_custom_pricing ? (
    <AdminStatusBadge variant="info" label="Custom Pricing" />
  ) : null;
}
