import React from 'react';

export interface SkeletonProps {
  className?: string;
  variant?: 'rect' | 'circle' | 'text' | 'card' | 'product-grid';
  count?: number;
}

export const LoadingSkeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'rect',
  count = 1,
}) => {
  if (variant === 'product-grid') {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: count || 4 }).map((_, idx) => (
          <div
            key={idx}
            className="bg-white rounded-2xl border border-stone-200/80 p-3 space-y-3 animate-pulse"
          >
            <div className="aspect-4/3 w-full bg-stone-200 rounded-xl" />
            <div className="h-4 bg-stone-200 rounded w-3/4" />
            <div className="h-3 bg-stone-200 rounded w-1/2" />
            <div className="flex items-center justify-between pt-2">
              <div className="h-5 bg-stone-200 rounded w-16" />
              <div className="h-8 bg-stone-200 rounded-xl w-20" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div className={`bg-white rounded-2xl border border-stone-200/80 p-4 space-y-3 animate-pulse ${className}`}>
        <div className="h-36 w-full bg-stone-200 rounded-xl" />
        <div className="h-4 bg-stone-200 rounded w-2/3" />
        <div className="h-3 bg-stone-200 rounded w-1/3" />
      </div>
    );
  }

  const baseStyle = 'animate-pulse bg-stone-200/80';
  const variantStyles = {
    rect: 'rounded-xl',
    circle: 'rounded-full',
    text: 'rounded h-3.5 w-full my-1',
  };

  return (
    <>
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className={`${baseStyle} ${variantStyles[variant] || variantStyles.rect} ${className}`}
        />
      ))}
    </>
  );
};

export default LoadingSkeleton;
