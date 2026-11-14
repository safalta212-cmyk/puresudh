import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'fresh' | 'earthy' | 'neutral' | 'sale' | 'veg' | 'fssai' | 'warning';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'fresh',
  size = 'md',
  className = '',
  ...props
}) => {
  const variantStyles: Record<string, string> = {
    fresh: 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
    earthy: 'bg-amber-50 text-amber-900 border-amber-200/80',
    neutral: 'bg-stone-100 text-stone-700 border-stone-200',
    sale: 'bg-rose-50 text-rose-700 border-rose-200',
    veg: 'bg-emerald-50 text-emerald-900 border-emerald-300 font-bold',
    fssai: 'bg-blue-50 text-blue-800 border-blue-200',
    warning: 'bg-amber-50 text-amber-800 border-amber-300',
  };

  const sizeStyles: Record<string, string> = {
    sm: 'text-[10px] px-2 py-0.5 rounded-md font-semibold tracking-wide',
    md: 'text-xs px-2.5 py-1 rounded-lg font-semibold tracking-normal',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 border whitespace-nowrap select-none ${
        variantStyles[variant] || variantStyles.fresh
      } ${sizeStyles[size] || sizeStyles.md} ${className}`}
      {...props}
    >
      {variant === 'veg' && (
        <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block shrink-0" />
      )}
      {children}
    </span>
  );
};

export default Badge;
