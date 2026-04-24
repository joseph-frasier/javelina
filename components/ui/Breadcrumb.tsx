import Link from 'next/link';
import { clsx } from 'clsx';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className = '' }: BreadcrumbProps) {
  return (
    <nav
      className={clsx('flex items-center gap-1.5 text-sm', className)}
      aria-label="Breadcrumb"
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <div key={index} className="flex items-center gap-1.5">
            {index > 0 && (
              <svg
                className="w-3.5 h-3.5 text-text-faint"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            )}
            {!isLast && item.href ? (
              <Link
                href={item.href}
                className="text-text-muted hover:text-text transition-colors duration-150"
              >
                {item.label}
              </Link>
            ) : (
              <span
                className={
                  isLast ? 'text-text font-medium' : 'text-text-muted'
                }
                aria-current={isLast ? 'page' : undefined}
              >
                {item.label}
              </span>
            )}
          </div>
        );
      })}
    </nav>
  );
}
