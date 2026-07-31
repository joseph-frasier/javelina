interface PageSkeletonProps {
  /** Number of placeholder rows to render. */
  rows?: number;
  /** Render a title/subtitle block above the rows. */
  showHeader?: boolean;
}

/**
 * Neutral loading placeholder for route-level loading.tsx files.
 *
 * Purely presentational — no data, no client hooks — so it stays a server
 * component and can stream immediately while the route's data resolves.
 */
export default function PageSkeleton({ rows = 6, showHeader = true }: PageSkeletonProps) {
  return (
    <div className="max-w-[1600px] 2xl:max-w-[1900px] 3xl:max-w-full mx-auto lg:px-6 py-8">
      {showHeader && (
        <div className="mb-8 space-y-3">
          <div className="h-8 w-64 rounded bg-surface-alt animate-pulse" />
          <div className="h-4 w-96 max-w-full rounded bg-surface-alt animate-pulse" />
        </div>
      )}
      <div className="space-y-3">
        {[...Array(rows)].map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-border bg-surface p-4"
          >
            <div className="h-4 w-3/4 rounded bg-surface-alt animate-pulse" />
            <div className="mt-2 h-3 w-1/2 rounded bg-surface-alt animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
