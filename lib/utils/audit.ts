/**
 * Shared admin audit-log types and interpretation helpers.
 * Extracted from app/admin/page.tsx and app/admin/audit/page.tsx (identical
 * implementations); behavior is preserved byte-for-byte.
 */

export interface AuditLog {
  id: string;
  created_at: string;
  action: string;
  table_name: string;
  record_id?: string;
  metadata?: Record<string, any>;
  ip_address?: string;
  old_data?: Record<string, any>;
  new_data?: Record<string, any>;
  profiles: { name: string; email: string } | null;
  target_name?: string | null;
  target_email?: string | null;
}

export interface AuditActionDescription {
  action: string;
  targetName: string;
  targetEmail?: string;
  details: string;
}

/**
 * Interpret an admin audit log row into a human-readable action description.
 * Output must match the prior inline helpers exactly — do not modify logic.
 */
export function getActionDescription(log: AuditLog): AuditActionDescription {
  const targetName = log.target_name || 'Unknown';
  const targetEmail = log.target_email || undefined;

  if (log.table_name === 'profiles') {
    const oldStatus = log.old_data?.status;
    const newStatus = log.new_data?.status;

    if (oldStatus === 'active' && newStatus === 'disabled') {
      return {
        action: 'disabled user',
        targetName,
        targetEmail,
        details: `Status changed from active to disabled`,
      };
    }
    if (oldStatus === 'disabled' && newStatus === 'active') {
      return {
        action: 'enabled user',
        targetName,
        targetEmail,
        details: `Status changed from disabled to active`,
      };
    }
  }

  if (log.table_name === 'organizations') {
    const oldActive = log.old_data?.is_active;
    const newActive = log.new_data?.is_active;

    if (oldActive === true && newActive === false) {
      return {
        action: 'disabled organization',
        targetName,
        details: `Organization disabled (is_active: true → false)`,
      };
    }
    if (oldActive === false && newActive === true) {
      return {
        action: 'enabled organization',
        targetName,
        details: `Organization enabled (is_active: false → true)`,
      };
    }
  }

  if (log.table_name === 'promotion_codes') {
    const codeName =
      log.metadata?.code ||
      log.new_data?.code ||
      log.old_data?.code ||
      'Unknown';

    if (log.action === 'INSERT') {
      return {
        action: 'created discount code',
        targetName: codeName,
        details: `Discount code "${codeName}" created`,
      };
    }

    const oldActive = log.old_data?.is_active;
    const newActive = log.new_data?.is_active;

    if (oldActive === true && newActive === false) {
      return {
        action: 'deactivated discount code',
        targetName: codeName,
        details: `Discount code "${codeName}" deactivated`,
      };
    }

    return {
      action: 'updated discount code',
      targetName: codeName,
      details: `Discount code "${codeName}" modified`,
    };
  }

  return {
    action: `updated ${log.table_name}`,
    targetName,
    targetEmail,
    details: `${log.action} operation on ${log.table_name}`,
  };
}
