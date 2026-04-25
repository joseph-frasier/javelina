/**
 * User activity status helpers
 * Determines activity status based on the most recent activity or login timestamp.
 * Prefers `lastActivity` (updated on every authenticated request) over `lastLogin`
 * (only set at sign-in time) when available.
 */

/**
 * Calculate activity status from the best available timestamp.
 * @param lastLogin    - ISO timestamp of user's last login
 * @param lastActivity - ISO timestamp of user's last authenticated action (preferred)
 * @returns Activity status: 'online' | 'active' | 'recent' | 'inactive'
 */
export function getActivityStatus(
  lastLogin: string | undefined,
  lastActivity?: string | undefined,
): string {
  const timestamp = lastActivity || lastLogin;
  if (!timestamp) return 'inactive';

  const diffMinutes = (Date.now() - new Date(timestamp).getTime()) / (1000 * 60);

  if (diffMinutes < 5) return 'online';             // < 5 minutes
  if (diffMinutes < 24 * 60) return 'active';       // < 1 day
  if (diffMinutes < 30 * 24 * 60) return 'recent';  // < 30 days
  return 'inactive';                                  // > 30 days
}

/**
 * Get badge styling props for activity status
 * @param status - Activity status from getActivityStatus
 * @returns Object with label, color classes, dot color, and animation flag
 */
export function getActivityBadge(status: string) {
  switch (status) {
    case 'online':
      return {
        label: 'Online',
        color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
        dotColor: 'bg-green-600',
        animate: true,
      };
    case 'active':
      return {
        label: 'Active',
        color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
        dotColor: 'bg-blue-600',
        animate: false,
      };
    case 'recent':
      return {
        label: 'Recent',
        color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
        dotColor: 'bg-gray-500 dark:bg-gray-300',
        animate: false,
      };
    default:
      return {
        label: 'Inactive',
        color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
        dotColor: 'bg-gray-400 dark:bg-gray-400',
        animate: false,
      };
  }
}

