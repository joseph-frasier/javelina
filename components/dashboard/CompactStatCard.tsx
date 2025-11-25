'use client';

import React from 'react';

interface CompactStatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  className?: string;
}

export function CompactStatCard({
  title,
  value,
  subtitle,
  icon,
  className = '',
}: CompactStatCardProps) {
  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-light dark:border-gray-slate p-4 ${className}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-slate dark:text-gray-light mb-1">
            {title}
          </p>
          <p className="text-2xl font-bold text-orange-dark dark:text-orange">
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-gray-slate dark:text-gray-light mt-1">
              {subtitle}
            </p>
          )}
        </div>
        <div className="flex-shrink-0 ml-4">
          <div className="w-10 h-10 rounded-lg bg-orange/10 dark:bg-orange/20 flex items-center justify-center">
            {icon}
          </div>
        </div>
      </div>
    </div>
  );
}

