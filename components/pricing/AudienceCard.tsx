'use client';

import { useRouter } from 'next/navigation';

export type AudienceId = 'dns' | 'business';

interface AudienceCardProps {
  audience: AudienceId;
  title: string;
  description: string;
  startingPrice: string;
  href: string;
}

function AudienceIcon({ audience }: { audience: AudienceId }) {
  if (audience === 'dns') {
    return (
      <svg
        className="w-10 h-10 text-text-muted"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" strokeWidth={1.75} />
        <path strokeWidth={1.75} d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18" />
      </svg>
    );
  }
  return (
    <svg
      className="w-10 h-10 text-text-muted"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path strokeWidth={1.75} strokeLinejoin="round" d="M5 21V5a1 1 0 011-1h9a1 1 0 011 1v16" />
      <path strokeWidth={1.75} strokeLinejoin="round" d="M16 9h3a1 1 0 011 1v11" />
      <path strokeWidth={1.75} d="M3 21h18" />
      <path strokeWidth={1.5} d="M8 8h2M8 12h2M8 16h2M12 8h2M12 12h2M12 16h2" />
    </svg>
  );
}

export function AudienceCard({
  audience,
  title,
  description,
  startingPrice,
  href,
}: AudienceCardProps) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.push(href)}
      className="group flex flex-col items-center text-center p-6 rounded-xl bg-surface border border-border shadow-card hover:shadow-lg hover:border-border-strong focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/30 transition-all duration-150 cursor-pointer min-h-[260px]"
      aria-label={`Choose ${title}: ${description} Starting at ${startingPrice} per month.`}
    >
      <div className="mb-5">
        <AudienceIcon audience={audience} />
      </div>
      <h3 className="text-lg font-bold text-text mb-3">{title}</h3>
      <p className="text-sm text-text-muted leading-relaxed mb-6 max-w-xs">
        {description}
      </p>
      <div className="mt-auto text-accent text-sm font-medium">
        From {startingPrice}/mo&nbsp;<span aria-hidden="true">→</span>
      </div>
    </button>
  );
}

export default AudienceCard;
