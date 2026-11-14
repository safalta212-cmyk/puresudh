import React, { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'earthy';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className = '',
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled,
      leftIcon,
      rightIcon,
      type = 'button',
      ...props
    },
    ref
  ) => {
    // Base styles: Focus visible rings, minimum touch target on mobile, smooth transition
    const baseStyles =
      'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-150 select-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 touch-manipulation active:scale-[0.98]';

    // Variants with Fresh Green primary (#15803D), earthy amber, and clean neutrals
    const variantStyles: Record<string, string> = {
      primary:
        'bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs hover:shadow-sm focus-visible:ring-emerald-700 focus-visible:ring-offset-[#FAF8F5]',
      secondary:
        'bg-stone-900 hover:bg-stone-800 text-stone-100 shadow-xs focus-visible:ring-stone-900 focus-visible:ring-offset-[#FAF8F5]',
      earthy:
        'bg-amber-800 hover:bg-amber-900 text-amber-50 shadow-xs focus-visible:ring-amber-800 focus-visible:ring-offset-[#FAF8F5]',
      outline:
        'bg-transparent hover:bg-emerald-50 text-emerald-800 border border-emerald-300/80 focus-visible:ring-emerald-700 focus-visible:ring-offset-[#FAF8F5]',
      ghost:
        'bg-transparent hover:bg-stone-100 text-stone-700 hover:text-stone-900 focus-visible:ring-stone-400',
      danger:
        'bg-rose-600 hover:bg-rose-700 text-white shadow-xs focus-visible:ring-rose-600 focus-visible:ring-offset-[#FAF8F5]',
    };

    // Sizes: button horizontal padding is 2x vertical padding per design guidelines
    const sizeStyles: Record<string, string> = {
      sm: 'text-xs px-3 py-1.5 min-h-[36px] gap-1.5',
      md: 'text-sm px-4 py-2 min-h-[44px] gap-2',
      lg: 'text-base px-6 py-3 min-h-[48px] gap-2.5',
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${variantStyles[variant] || variantStyles.primary} ${
          sizeStyles[size] || sizeStyles.md
        } ${className}`}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin shrink-0 text-current" />
        ) : (
          leftIcon && <span className="shrink-0">{leftIcon}</span>
        )}
        <span className="truncate whitespace-nowrap">{children}</span>
        {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
export default Button;
