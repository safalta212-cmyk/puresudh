import React from 'react';
import { Plus, Minus } from 'lucide-react';

export interface QuantitySelectorProps {
  quantity: number;
  onIncrement: () => void;
  onDecrement: () => void;
  onChange?: (val: number) => void;
  min?: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  disabled?: boolean;
}

export const QuantitySelector: React.FC<QuantitySelectorProps> = ({
  quantity,
  onIncrement,
  onDecrement,
  onChange,
  min = 1,
  max = 99,
  size = 'md',
  className = '',
  disabled = false,
}) => {
  const sizeStyles = {
    sm: {
      btn: 'w-7 h-7 min-w-[28px] min-h-[28px]',
      input: 'w-8 text-xs',
      icon: 'w-3 h-3',
      container: 'p-0.5 rounded-lg',
    },
    md: {
      btn: 'w-8 h-8 min-w-[36px] min-h-[36px]',
      input: 'w-10 text-sm font-semibold',
      icon: 'w-3.5 h-3.5',
      container: 'p-1 rounded-xl',
    },
    lg: {
      btn: 'w-10 h-10 min-w-[44px] min-h-[44px]',
      input: 'w-12 text-base font-bold',
      icon: 'w-4 h-4',
      container: 'p-1 rounded-xl',
    },
  };

  const currentSize = sizeStyles[size] || sizeStyles.md;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!onChange) return;
    const parsed = parseInt(e.target.value, 10);
    if (!isNaN(parsed)) {
      const clamped = Math.max(min, Math.min(max, parsed));
      onChange(clamped);
    }
  };

  return (
    <div
      className={`inline-flex items-center bg-white border border-stone-200/90 shadow-2xs select-none ${currentSize.container} ${className}`}
      role="group"
      aria-label="Quantity Selector"
    >
      <button
        type="button"
        disabled={disabled || quantity <= min}
        onClick={onDecrement}
        className={`flex items-center justify-center rounded-lg bg-stone-100 hover:bg-stone-200 active:bg-stone-300 text-stone-700 disabled:opacity-40 disabled:hover:bg-stone-100 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-700 ${currentSize.btn}`}
        aria-label="Decrease quantity"
      >
        <Minus className={currentSize.icon} />
      </button>

      {onChange ? (
        <input
          type="number"
          min={min}
          max={max}
          value={quantity ?? 1}
          onChange={handleInputChange}
          disabled={disabled}
          className={`text-center bg-transparent text-stone-900 focus:outline-none ${currentSize.input}`}
          aria-label="Quantity"
        />
      ) : (
        <span className={`text-center text-stone-900 ${currentSize.input}`}>
          {quantity}
        </span>
      )}

      <button
        type="button"
        disabled={disabled || quantity >= max}
        onClick={onIncrement}
        className={`flex items-center justify-center rounded-lg bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white disabled:opacity-40 disabled:hover:bg-emerald-700 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-700 ${currentSize.btn}`}
        aria-label="Increase quantity"
      >
        <Plus className={currentSize.icon} />
      </button>
    </div>
  );
};

export default QuantitySelector;
