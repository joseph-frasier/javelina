'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Tooltip, InfoIcon } from '@/components/ui/Tooltip';
import { AnimatedNavIcon } from '@/components/business/ui/AnimatedNavIcon';

export type AudienceId = 'dns' | 'business';

interface AudienceCardProps {
  audience: AudienceId;
  title: string;
  description: string;
  startingPrice: string;
  href: string;
  tooltip: string;
}

export function AudienceCard({
  audience,
  title,
  description,
  startingPrice,
  href,
  tooltip,
}: AudienceCardProps) {
  const router = useRouter();
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      type="button"
      onClick={() => router.push(href)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group flex flex-col items-center text-center p-6 rounded-xl bg-surface border border-border shadow-card hover:shadow-lg hover:border-border-strong focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/30 transition-all duration-150 cursor-pointer min-h-[260px]"
      aria-label={`Choose ${title}: ${description} Starting at ${startingPrice} per month.`}
    >
      <div className="mb-5 text-text-muted">
        <AnimatedNavIcon
          name={audience === 'dns' ? 'globe' : 'building'}
          size={40}
          color="currentColor"
          isHovered={isHovered}
        />
      </div>
      <div className="flex items-center justify-center gap-1.5 mb-3">
        <h3 className="text-lg font-bold text-text">{title}</h3>
        <span onClick={(e) => e.stopPropagation()}>
          <Tooltip content={tooltip} position="top">
            <InfoIcon />
          </Tooltip>
        </span>
      </div>
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
