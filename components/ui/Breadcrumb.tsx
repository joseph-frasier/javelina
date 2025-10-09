import Link from 'next/link';

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
    <nav className={`flex items-center space-x-2 text-sm ${className}`} aria-label="Breadcrumb">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        
        return (
          <div key={index} className="flex items-center space-x-2">
            {index > 0 && (
              <svg
                className="w-4 h-4 text-gray-slate"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
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
                className="text-gray-slate hover:text-orange transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span className={isLast ? 'text-orange-dark font-medium' : 'text-gray-slate'}>
                {item.label}
              </span>
            )}
          </div>
        );
      })}
    </nav>
  );
}

