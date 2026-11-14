import React from 'react';
import { Star } from 'lucide-react';

export interface RatingProps {
  value: number;
  max?: number;
  reviewCount?: number;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  onChange?: (val: number) => void;
  showScore?: boolean;
  className?: string;
}

export const Rating: React.FC<RatingProps> = ({
  value,
  max = 5,
  reviewCount,
  size = 'md',
  interactive = false,
  onChange,
  showScore = true,
  className = '',
}) => {
  const starSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-5 h-5',
  };

  const currentStarSize = starSizes[size] || starSizes.md;

  return (
    <div
      className={`inline-flex items-center gap-1.5 ${className}`}
      aria-label={`Rating: ${value} out of ${max} stars`}
    >
      <div className="flex items-center gap-0.5">
        {Array.from({ length: max }).map((_, idx) => {
          const starNumber = idx + 1;
          const isFilled = starNumber <= Math.round(value);

          return (
            <button
              key={idx}
              type="button"
              disabled={!interactive}
              onClick={() => interactive && onChange && onChange(starNumber)}
              className={`${
                interactive
                  ? 'cursor-pointer hover:scale-110 transition-transform focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-500 rounded'
                  : 'cursor-default'
              } p-0.5`}
              aria-label={interactive ? `Rate ${starNumber} star${starNumber > 1 ? 's' : ''}` : undefined}
            >
              <Star
                className={`${currentStarSize} ${
                  isFilled
                    ? 'fill-amber-400 text-amber-500'
                    : 'text-stone-300 fill-stone-100'
                }`}
              />
            </button>
          );
        })}
      </div>

      {showScore && (
        <span className="text-xs font-semibold text-stone-700 ml-0.5">
          {value.toFixed(1)}
        </span>
      )}

      {typeof reviewCount === 'number' && (
        <span className="text-xs text-stone-400 font-normal">
          ({reviewCount})
        </span>
      )}
    </div>
  );
};

export default Rating;
