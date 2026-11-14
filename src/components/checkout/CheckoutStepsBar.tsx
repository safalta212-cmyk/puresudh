import React from 'react';
import {
  ShoppingBag,
  MapPin,
  Truck,
  Tag,
  CreditCard,
  FileCheck,
  CheckCircle2,
} from 'lucide-react';

export type CheckoutStepType =
  | 'cart'
  | 'address'
  | 'delivery'
  | 'coupon'
  | 'payment'
  | 'review'
  | 'confirmation';

interface CheckoutStepsBarProps {
  currentStep: CheckoutStepType;
  onStepClick?: (step: CheckoutStepType) => void;
  allowedStepIndex?: number;
}

const STEPS: { id: CheckoutStepType; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'cart', label: 'Cart', icon: ShoppingBag },
  { id: 'address', label: 'Address', icon: MapPin },
  { id: 'delivery', label: 'Delivery', icon: Truck },
  { id: 'coupon', label: 'Coupon', icon: Tag },
  { id: 'payment', label: 'Payment', icon: CreditCard },
  { id: 'review', label: 'Review', icon: FileCheck },
  { id: 'confirmation', label: 'Confirmation', icon: CheckCircle2 },
];

export const CheckoutStepsBar: React.FC<CheckoutStepsBarProps> = ({
  currentStep,
  onStepClick,
  allowedStepIndex = 6,
}) => {
  const currentIndex = STEPS.findIndex((s) => s.id === currentStep);

  return (
    <nav aria-label="Checkout Progress" className="w-full bg-white border-b border-stone-200 py-3 sm:py-4 px-2 sm:px-6 sticky top-0 z-30 shadow-xs">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        {STEPS.map((step, idx) => {
          const Icon = step.icon;
          const isCompleted = idx < currentIndex;
          const isCurrent = idx === currentIndex;
          const isClickable = onStepClick && idx <= allowedStepIndex && currentStep !== 'confirmation';

          return (
            <React.Fragment key={step.id}>
              {/* Step item */}
              <button
                type="button"
                disabled={!isClickable}
                onClick={() => isClickable && onStepClick?.(step.id)}
                className={`flex flex-col sm:flex-row items-center gap-1.5 sm:gap-2 text-left transition-all ${
                  isClickable ? 'cursor-pointer hover:opacity-80' : 'cursor-default'
                } ${
                  isCurrent
                    ? 'text-amber-800 font-bold'
                    : isCompleted
                    ? 'text-emerald-700 font-medium'
                    : 'text-stone-400'
                }`}
                title={step.label}
              >
                <div
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold transition-all ${
                    isCurrent
                      ? 'bg-amber-700 text-white shadow-md ring-3 ring-amber-100'
                      : isCompleted
                      ? 'bg-emerald-600 text-white'
                      : 'bg-stone-100 text-stone-400 border border-stone-200'
                  }`}
                >
                  {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                </div>
                <span className="text-[11px] sm:text-xs tracking-tight whitespace-nowrap hidden md:inline">
                  {step.label}
                </span>
              </button>

              {/* Connecting line between steps */}
              {idx < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-1 sm:mx-2 rounded-full transition-colors ${
                    idx < currentIndex ? 'bg-emerald-500' : 'bg-stone-200'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </nav>
  );
};
