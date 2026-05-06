export function formatAge(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffMs = now - then;
  if (diffMs <= 0) return '0m';

  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;

  const days = Math.floor(hours / 24);
  const remHours = hours - days * 24;
  return remHours > 0 ? `${days}d ${remHours}h` : `${days}d`;
}
