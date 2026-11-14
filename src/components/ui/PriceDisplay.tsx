import React from 'react';
import { formatCurrency } from '../../utilities';

export interface PriceDisplayProps {
  price: number;
  originalPrice?: number;
  unit?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSavings?: boolean;
  className?: string;
}

export const PriceDisplay: React.FC<PriceDisplayProps> = ({
  price,
  originalPrice,
  unit,
  size = 'md',
  showSavings = true,
  className = '',
}) => {
  const hasDiscount = originalPrice && originalPrice > price;
  const savings = hasDiscount ? originalPrice - price : 0;
  const discountPercent = hasDiscount ? Math.round((savings / originalPrice) * 100) : 0;

  const sizeStyles = {
    sm: { current: 'text-sm font-bold', original: 'text-xs', savings: 'text-[10px]' },
    md: { current: 'text-base font-bold', original: 'text-xs', savings: 'text-xs' },
    lg: { current: 'text-xl font-bold', original: 'text-sm', savings: 'text-xs' },
    xl: { current: 'text-2xl sm:text-3xl font-bold', original: 'text-base', savings: 'text-sm' },
  };

  const selectedSize = sizeStyles[size] || sizeStyles.md;

  return (
    <div className={`flex flex-wrap items-baseline gap-x-2 gap-y-0.5 ${className}`}>
      <span className={`text-emerald-900 font-sans tracking-tight ${selectedSize.current}`}>
        {formatCurrency(price)}
      </span>

      {unit && (
        <span className="text-xs text-stone-500 font-medium">/{unit}</span>
      )}

      {hasDiscount && (
        <span className={`text-stone-400 line-through font-normal ${selectedSize.original}`}>
          {formatCurrency(originalPrice)}
        </span>
      )}

      {hasDiscount && showSavings && (
        <span className={`font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60 ${selectedSize.savings}`}>
          {discountPercent}% OFF
        </span>
      )}
    </div>
  );
};

export default PriceDisplay;
