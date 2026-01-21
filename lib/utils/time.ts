/**
 * Formats a date string into a relative time (e.g., "5 minutes ago")
 */
export function getRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInSeconds = Math.floor(diffInMs / 1000);
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInSeconds < 60) {
    return 'just now';
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
  } else if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
  } else if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
  } else if (diffInDays < 30) {
    const weeks = Math.floor(diffInDays / 7);
    return `${weeks} week${weeks !== 1 ? 's' : ''} ago`;
  } else if (diffInDays < 365) {
    const months = Math.floor(diffInDays / 30);
    return `${months} month${months !== 1 ? 's' : ''} ago`;
  } else {
    const years = Math.floor(diffInDays / 365);
    return `${years} year${years !== 1 ? 's' : ''} ago`;
  }
}

/**
 * Formats a date string with both absolute and relative times
 */
export function formatDateWithRelative(dateString?: string): {
  absolute: string;
  relative: string;
} {
  if (!dateString) {
    return { absolute: 'Never', relative: 'Never' };
  }

  const date = new Date(dateString);
  const absolute = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return {
    absolute,
    relative: getRelativeTime(dateString),
  };
}

/**
 * Formats an expiration date for display
 * Returns date only for display, and date + time for tooltip
 */
export function formatExpirationDate(dateString?: string): {
  date: string;
  dateTime: string;
} {
  if (!dateString) {
    return { date: 'Never', dateTime: 'Never' };
  }

  const date = new Date(dateString);
  
  // Date only format for display (e.g., "Jan 22, 2026")
  const dateOnly = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  // Date + time format for tooltip (e.g., "Jan 22, 2026 at 02:05 PM")
  const dateTime = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return {
    date: dateOnly,
    dateTime,
  };
}
