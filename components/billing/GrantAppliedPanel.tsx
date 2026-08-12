'use client';

/**
 * The green confirmation box shown once a discount code has been previewed or
 * redeemed.
 *
 * Checkout and billing settings each carried their own copy of this markup,
 * with comments in each pointing at the other. They had already drifted: the
 * empty-grant line read "Applied to this organization." on one and "Discount
 * applied to this organization." on the other, for the same state. The two
 * genuine differences — the dismiss affordance means "remove this preview" at
 * checkout and "redeem another code" in billing settings, and the button styling
 * differs — are props rather than a reason to fork.
 */
interface GrantAppliedPanelProps {
  /** Headline: what the code grants, or the already-applied sentence. */
  summary: string;
  /** Supporting line: how long the grant lasts. */
  duration: string;
  /**
   * The code's customer-facing blurb, when it has one.
   *
   * The admin modal promises "Shown to the customer when they redeem the code"
   * and the backend deliberately ships it in the trimmed public payload, but
   * nothing rendered it. This is that surface.
   */
  blurb?: string | null;
  /**
   * Rendered when the sync to Stripe has not happened yet — the org's
   * subscription is not in a live state, so the grant is recorded but the
   * invoice-side discount lands later.
   */
  pendingSync?: boolean;
  /** Omit to render no dismiss control at all. */
  onDismiss?: () => void;
  /** Must describe what dismissing actually does on this surface. */
  dismissLabel?: string;
  /** Tailwind classes for the dismiss control, so each surface keeps its look. */
  dismissClassName?: string;
}

export function GrantAppliedPanel({
  summary,
  duration,
  blurb,
  pendingSync = false,
  onDismiss,
  dismissLabel,
  dismissClassName = 'text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0',
}: GrantAppliedPanelProps) {
  return (
    <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
      <div className="flex items-center space-x-2">
        <svg
          className="w-5 h-5 text-green-600 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        <div>
          <p className="font-medium text-green-700 text-sm">{summary}</p>
          <p className="text-xs text-green-600">{duration}</p>
          {blurb ? <p className="text-xs text-green-700 mt-1 italic">{blurb}</p> : null}
          {pendingSync ? (
            <p className="text-xs text-green-600 mt-1">
              Applying to your billing — this can take up to an hour.
            </p>
          ) : null}
        </div>
      </div>
      {onDismiss ? (
        <button onClick={onDismiss} className={dismissClassName} aria-label={dismissLabel}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      ) : null}
    </div>
  );
}
