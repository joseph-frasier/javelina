import { describe, it, expect } from 'vitest';
import {
  canCreateEnvironment,
  canDeleteEnvironment,
  canCreateZone,
  canEditZone,
  canDeleteZone,
  canEditRecords,
  canViewOrganization,
  canManageOrganizationSettings,
  canInviteMembers,
  canManageRoles,
  canViewBilling,
  canManageBilling,
  canChangePlan,
  canUpdatePaymentMethods,
  canViewInvoices,
  isReadOnly,
  isRoleDowngrade,
  getRoleDisplayText,
  getRoleBadgeColor,
} from '@/lib/permissions';
import type { RBACRole } from '@/lib/auth-store';

describe('Permission Helper Functions', () => {
  describe('Organization Management', () => {
    it('canViewOrganization - all roles can view', () => {
      expect(canViewOrganization('SuperAdmin')).toBe(true);
      expect(canViewOrganization('Admin')).toBe(true);
      expect(canViewOrganization('BillingContact')).toBe(true);
      expect(canViewOrganization('Editor')).toBe(true);
      expect(canViewOrganization('Viewer')).toBe(true);
    });

    it('canManageOrganizationSettings - only SuperAdmin and Admin', () => {
      expect(canManageOrganizationSettings('SuperAdmin')).toBe(true);
      expect(canManageOrganizationSettings('Admin')).toBe(true);
      expect(canManageOrganizationSettings('BillingContact')).toBe(false);
      expect(canManageOrganizationSettings('Editor')).toBe(false);
      expect(canManageOrganizationSettings('Viewer')).toBe(false);
    });
  });

  describe('Team Management', () => {
    it('canInviteMembers - only SuperAdmin and Admin', () => {
      expect(canInviteMembers('SuperAdmin')).toBe(true);
      expect(canInviteMembers('Admin')).toBe(true);
      expect(canInviteMembers('BillingContact')).toBe(false);
      expect(canInviteMembers('Editor')).toBe(false);
      expect(canInviteMembers('Viewer')).toBe(false);
    });

    it('canManageRoles - only SuperAdmin and Admin', () => {
      expect(canManageRoles('SuperAdmin')).toBe(true);
      expect(canManageRoles('Admin')).toBe(true);
      expect(canManageRoles('BillingContact')).toBe(false);
      expect(canManageRoles('Editor')).toBe(false);
      expect(canManageRoles('Viewer')).toBe(false);
    });
  });

  describe('Billing Management', () => {
    it('canViewBilling - SuperAdmin, Admin, and BillingContact', () => {
      expect(canViewBilling('SuperAdmin')).toBe(true);
      expect(canViewBilling('Admin')).toBe(true);
      expect(canViewBilling('BillingContact')).toBe(true);
      expect(canViewBilling('Editor')).toBe(false);
      expect(canViewBilling('Viewer')).toBe(false);
    });

    it('canManageBilling - SuperAdmin, Admin, and BillingContact', () => {
      expect(canManageBilling('SuperAdmin')).toBe(true);
      expect(canManageBilling('Admin')).toBe(true);
      expect(canManageBilling('BillingContact')).toBe(true);
      expect(canManageBilling('Editor')).toBe(false);
      expect(canManageBilling('Viewer')).toBe(false);
    });

    it('canChangePlan - SuperAdmin, Admin, and BillingContact', () => {
      expect(canChangePlan('SuperAdmin')).toBe(true);
      expect(canChangePlan('Admin')).toBe(true);
      expect(canChangePlan('BillingContact')).toBe(true);
      expect(canChangePlan('Editor')).toBe(false);
      expect(canChangePlan('Viewer')).toBe(false);
    });

    it('canUpdatePaymentMethods - SuperAdmin, Admin, and BillingContact', () => {
      expect(canUpdatePaymentMethods('SuperAdmin')).toBe(true);
      expect(canUpdatePaymentMethods('Admin')).toBe(true);
      expect(canUpdatePaymentMethods('BillingContact')).toBe(true);
      expect(canUpdatePaymentMethods('Editor')).toBe(false);
      expect(canUpdatePaymentMethods('Viewer')).toBe(false);
    });

    it('canViewInvoices - SuperAdmin, Admin, and BillingContact', () => {
      expect(canViewInvoices('SuperAdmin')).toBe(true);
      expect(canViewInvoices('Admin')).toBe(true);
      expect(canViewInvoices('BillingContact')).toBe(true);
      expect(canViewInvoices('Editor')).toBe(false);
      expect(canViewInvoices('Viewer')).toBe(false);
    });
  });

  describe('DNS Zones', () => {
    it('canCreateZone - SuperAdmin, Admin, and Editor', () => {
      expect(canCreateZone('SuperAdmin')).toBe(true);
      expect(canCreateZone('Admin')).toBe(true);
      expect(canCreateZone('BillingContact')).toBe(false);
      expect(canCreateZone('Editor')).toBe(true);
      expect(canCreateZone('Viewer')).toBe(false);
    });

    it('canEditZone - SuperAdmin, Admin, and Editor', () => {
      expect(canEditZone('SuperAdmin')).toBe(true);
      expect(canEditZone('Admin')).toBe(true);
      expect(canEditZone('BillingContact')).toBe(false);
      expect(canEditZone('Editor')).toBe(true);
      expect(canEditZone('Viewer')).toBe(false);
    });

    it('canDeleteZone - only SuperAdmin and Admin', () => {
      expect(canDeleteZone('SuperAdmin')).toBe(true);
      expect(canDeleteZone('Admin')).toBe(true);
      expect(canDeleteZone('BillingContact')).toBe(false);
      expect(canDeleteZone('Editor')).toBe(false);
      expect(canDeleteZone('Viewer')).toBe(false);
    });
  });

  describe('DNS Records', () => {
    it('canEditRecords - SuperAdmin, Admin, and Editor', () => {
      expect(canEditRecords('SuperAdmin')).toBe(true);
      expect(canEditRecords('Admin')).toBe(true);
      expect(canEditRecords('BillingContact')).toBe(false);
      expect(canEditRecords('Editor')).toBe(true);
      expect(canEditRecords('Viewer')).toBe(false);
    });
  });

  describe('Environment Management (Legacy)', () => {
    it('canCreateEnvironment - SuperAdmin and Admin', () => {
      expect(canCreateEnvironment('SuperAdmin')).toBe(true);
      expect(canCreateEnvironment('Admin')).toBe(true);
      expect(canCreateEnvironment('BillingContact')).toBe(false);
      expect(canCreateEnvironment('Editor')).toBe(false);
      expect(canCreateEnvironment('Viewer')).toBe(false);
    });

    it('canDeleteEnvironment - SuperAdmin and Admin', () => {
      expect(canDeleteEnvironment('SuperAdmin')).toBe(true);
      expect(canDeleteEnvironment('Admin')).toBe(true);
      expect(canDeleteEnvironment('BillingContact')).toBe(false);
      expect(canDeleteEnvironment('Editor')).toBe(false);
      expect(canDeleteEnvironment('Viewer')).toBe(false);
    });
  });

  describe('Read-Only Check', () => {
    it('isReadOnly - Viewer and BillingContact are read-only for DNS', () => {
      expect(isReadOnly('SuperAdmin')).toBe(false);
      expect(isReadOnly('Admin')).toBe(false);
      expect(isReadOnly('BillingContact')).toBe(true);
      expect(isReadOnly('Editor')).toBe(false);
      expect(isReadOnly('Viewer')).toBe(true);
    });
  });

  describe('Role Hierarchy', () => {
    it('isRoleDowngrade - detects role downgrades correctly', () => {
      // SuperAdmin to anything else is downgrade
      expect(isRoleDowngrade('SuperAdmin', 'Admin')).toBe(true);
      expect(isRoleDowngrade('SuperAdmin', 'BillingContact')).toBe(true);
      expect(isRoleDowngrade('SuperAdmin', 'Editor')).toBe(true);
      expect(isRoleDowngrade('SuperAdmin', 'Viewer')).toBe(true);
      expect(isRoleDowngrade('SuperAdmin', 'SuperAdmin')).toBe(false);

      // Admin to lower roles is downgrade
      expect(isRoleDowngrade('Admin', 'BillingContact')).toBe(true);
      expect(isRoleDowngrade('Admin', 'Editor')).toBe(true);
      expect(isRoleDowngrade('Admin', 'Viewer')).toBe(true);
      expect(isRoleDowngrade('Admin', 'Admin')).toBe(false);
      expect(isRoleDowngrade('Admin', 'SuperAdmin')).toBe(false); // Upgrade, not downgrade

      // BillingContact to lower roles is downgrade
      expect(isRoleDowngrade('BillingContact', 'Editor')).toBe(true);
      expect(isRoleDowngrade('BillingContact', 'Viewer')).toBe(true);
      expect(isRoleDowngrade('BillingContact', 'BillingContact')).toBe(false);

      // Editor to Viewer is downgrade
      expect(isRoleDowngrade('Editor', 'Viewer')).toBe(true);
      expect(isRoleDowngrade('Editor', 'Editor')).toBe(false);

      // Viewer has no downgrades
      expect(isRoleDowngrade('Viewer', 'Viewer')).toBe(false);
    });
  });

  describe('Role Display', () => {
    it('getRoleDisplayText - returns correct display names', () => {
      expect(getRoleDisplayText('SuperAdmin')).toBe('SuperUser');
      expect(getRoleDisplayText('Admin')).toBe('SuperUser');
      expect(getRoleDisplayText('BillingContact')).toBe('Billing Contact');
      expect(getRoleDisplayText('Editor')).toBe('Editor');
      expect(getRoleDisplayText('Viewer')).toBe('Viewer');
    });

    it('getRoleBadgeColor - returns correct color classes', () => {
      expect(getRoleBadgeColor('SuperAdmin')).toContain('orange');
      expect(getRoleBadgeColor('Admin')).toContain('orange');
      expect(getRoleBadgeColor('BillingContact')).toContain('blue');
      expect(getRoleBadgeColor('Editor')).toContain('orange');
      expect(getRoleBadgeColor('Viewer')).toContain('gray');
    });
  });

  describe('Complete Role Permission Matrix', () => {
    const testMatrix: Array<{
      role: RBACRole;
      permissions: {
        viewOrg: boolean;
        manageOrg: boolean;
        inviteMembers: boolean;
        manageRoles: boolean;
        viewBilling: boolean;
        manageBilling: boolean;
        createZone: boolean;
        editZone: boolean;
        deleteZone: boolean;
        editRecords: boolean;
        isReadOnlyDNS: boolean;
      };
    }> = [
      {
        role: 'SuperAdmin',
        permissions: {
          viewOrg: true,
          manageOrg: true,
          inviteMembers: true,
          manageRoles: true,
          viewBilling: true,
          manageBilling: true,
          createZone: true,
          editZone: true,
          deleteZone: true,
          editRecords: true,
          isReadOnlyDNS: false,
        },
      },
      {
        role: 'Admin',
        permissions: {
          viewOrg: true,
          manageOrg: true,
          inviteMembers: true,
          manageRoles: true,
          viewBilling: true,
          manageBilling: true,
          createZone: true,
          editZone: true,
          deleteZone: true,
          editRecords: true,
          isReadOnlyDNS: false,
        },
      },
      {
        role: 'BillingContact',
        permissions: {
          viewOrg: true,
          manageOrg: false,
          inviteMembers: false,
          manageRoles: false,
          viewBilling: true,
          manageBilling: true,
          createZone: false,
          editZone: false,
          deleteZone: false,
          editRecords: false,
          isReadOnlyDNS: true,
        },
      },
      {
        role: 'Editor',
        permissions: {
          viewOrg: true,
          manageOrg: false,
          inviteMembers: false,
          manageRoles: false,
          viewBilling: false,
          manageBilling: false,
          createZone: true,
          editZone: true,
          deleteZone: false,
          editRecords: true,
          isReadOnlyDNS: false,
        },
      },
      {
        role: 'Viewer',
        permissions: {
          viewOrg: true,
          manageOrg: false,
          inviteMembers: false,
          manageRoles: false,
          viewBilling: false,
          manageBilling: false,
          createZone: false,
          editZone: false,
          deleteZone: false,
          editRecords: false,
          isReadOnlyDNS: true,
        },
      },
    ];

    testMatrix.forEach(({ role, permissions }) => {
      it(`${role} has correct permission matrix`, () => {
        expect(canViewOrganization(role)).toBe(permissions.viewOrg);
        expect(canManageOrganizationSettings(role)).toBe(permissions.manageOrg);
        expect(canInviteMembers(role)).toBe(permissions.inviteMembers);
        expect(canManageRoles(role)).toBe(permissions.manageRoles);
        expect(canViewBilling(role)).toBe(permissions.viewBilling);
        expect(canManageBilling(role)).toBe(permissions.manageBilling);
        expect(canCreateZone(role)).toBe(permissions.createZone);
        expect(canEditZone(role)).toBe(permissions.editZone);
        expect(canDeleteZone(role)).toBe(permissions.deleteZone);
        expect(canEditRecords(role)).toBe(permissions.editRecords);
        expect(isReadOnly(role)).toBe(permissions.isReadOnlyDNS);
      });
    });
  });
});

