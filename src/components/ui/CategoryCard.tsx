import React from 'react';
import { ChevronRight } from 'lucide-react';
import { Category } from '../../types';

export interface CategoryCardProps {
  category: Category;
  onClick: (category: Category) => void;
  className?: string;
  variant?: 'compact' | 'standard' | 'featured';
}

export const CategoryCard: React.FC<CategoryCardProps> = ({
  category,
  onClick,
  className = '',
  variant = 'standard',
}) => {
  if (variant === 'compact') {
    return (
      <button
        type="button"
        onClick={() => onClick(category)}
        className={`flex flex-col items-center p-3 rounded-2xl bg-white border border-stone-200/80 hover:border-emerald-300 hover:shadow-xs transition-all duration-200 text-center group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 ${className}`}
        aria-label={`Browse ${category.name}`}
      >
        <div className="w-14 h-14 rounded-full overflow-hidden mb-2 bg-stone-100 p-0.5 border border-stone-200/60 group-hover:scale-105 transition-transform">
          <img
            src={category.image}
            alt={category.name}
            className="w-full h-full object-cover rounded-full"
            loading="lazy"
          />
        </div>
        <span className="text-xs font-semibold text-stone-900 group-hover:text-emerald-800 transition-colors line-clamp-1">
          {category.name}
        </span>
        <span className="text-[10px] text-stone-400 mt-0.5">{category.itemCount} items</span>
      </button>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick(category)}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onClick(category)}
      className={`group relative overflow-hidden rounded-2xl bg-white border border-stone-200/90 shadow-2xs hover:shadow-md hover:border-emerald-300 transition-all duration-200 cursor-pointer flex flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 ${className}`}
      aria-label={`Explore category ${category.name}`}
    >
      <div className="relative aspect-4/3 w-full overflow-hidden bg-stone-100">
        <img
          src={category.image}
          alt={category.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ease-out"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950/70 via-stone-950/20 to-transparent" />

        <div className="absolute bottom-3 left-3 right-3 text-white">
          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-700/90 text-white mb-1">
            {category.itemCount} Fresh Items
          </span>
          <h3 className="text-base sm:text-lg font-serif font-bold text-white tracking-wide drop-shadow-xs">
            {category.name}
          </h3>
        </div>
      </div>

      <div className="p-3.5 flex items-center justify-between bg-white text-xs text-stone-600">
        <p className="line-clamp-1 text-stone-500 font-medium">
          {category.description || 'Pure, authentic delicacies'}
        </p>
        <span className="w-6 h-6 rounded-full bg-stone-100 text-stone-600 group-hover:bg-emerald-700 group-hover:text-white flex items-center justify-center shrink-0 transition-colors ml-2">
          <ChevronRight className="w-3.5 h-3.5" />
        </span>
      </div>
    </div>
  );
};

export default CategoryCard;
