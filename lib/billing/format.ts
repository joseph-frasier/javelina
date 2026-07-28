// Formats an integer cent amount as a USD string, e.g. 3920 -> "$39.20".
export function formatUsdCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
