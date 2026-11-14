import React from 'react';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items, className = '' }) => {
  return (
    <nav aria-label="Breadcrumb" className={`py-3 ${className}`}>
      <ol className="flex items-center flex-wrap gap-1.5 text-xs text-stone-500">
        <li className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={items[0]?.onClick}
            className="hover:text-emerald-800 transition-colors flex items-center gap-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-700 rounded"
          >
            <Home className="w-3.5 h-3.5 text-stone-400" />
            <span className="sr-only">Home</span>
          </button>
        </li>

        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={index} className="flex items-center gap-1.5">
              <ChevronRight className="w-3.5 h-3.5 text-stone-300 shrink-0" aria-hidden="true" />
              {isLast ? (
                <span
                  className="font-semibold text-stone-900 truncate max-w-[200px]"
                  aria-current="page"
                >
                  {item.label}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={item.onClick}
                  className="hover:text-emerald-800 transition-colors truncate max-w-[150px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-700 rounded"
                >
                  {item.label}
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumb;
