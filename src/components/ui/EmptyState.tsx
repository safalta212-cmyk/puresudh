import React from 'react';
import { PackageOpen, ArrowRight } from 'lucide-react';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionText,
  onAction,
  className = '',
}) => {
  return (
    <div
      className={`max-w-md mx-auto my-10 p-8 rounded-2xl bg-white border border-stone-200/90 shadow-2xs text-center ${className}`}
      role="status"
    >
      <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-emerald-800 flex items-center justify-center mx-auto mb-4 shadow-2xs">
        {icon || <PackageOpen className="w-8 h-8" />}
      </div>
      <h3 className="text-xl font-serif font-bold text-stone-900 mb-2">{title}</h3>
      <p className="text-sm text-stone-600 mb-6 leading-relaxed">{description}</p>
      {actionText && onAction && (
        <Button
          variant="primary"
          onClick={onAction}
          rightIcon={<ArrowRight className="w-4 h-4" />}
          className="mx-auto"
        >
          {actionText}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
