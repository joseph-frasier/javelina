'use client';

interface DisabledOrganizationBannerProps {
  className?: string;
}

export function DisabledOrganizationBanner({ className = '' }: DisabledOrganizationBannerProps) {
  return (
    <div className={`bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <svg
          className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-red-800 dark:text-red-400">
            Organization Disabled
          </h3>
          <p className="text-sm text-red-700 dark:text-red-300 mt-1">
            This organization has been disabled by an administrator. No actions can be taken until it is re-enabled. Please contact support for assistance.
          </p>
        </div>
      </div>
    </div>
  );
}

