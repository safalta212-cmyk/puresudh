import React, { useState } from 'react';
import { Tag, Copy, Check, Clock } from 'lucide-react';
import { Coupon } from '../../types';
import { formatCurrency } from '../../utilities';

export interface OfferCardProps {
  coupon: Coupon;
  onApply?: (code: string) => void;
  className?: string;
}

export const OfferCard: React.FC<OfferCardProps> = ({
  coupon,
  onApply,
  className = '',
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard?.writeText(coupon.code);
    setCopied(true);
    if (onApply) onApply(coupon.code);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`relative bg-gradient-to-br from-amber-50/70 via-white to-emerald-50/50 rounded-2xl border border-amber-200/80 p-4 sm:p-5 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between overflow-hidden ${className}`}
    >
      {/* Decorative dash line */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
            <Tag className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider">
              {coupon.discountType === 'flat' ? 'Flat Discount' : 'Percentage Savings'}
            </span>
            <h4 className="text-base font-serif font-bold text-stone-900">
              {coupon.discountType === 'flat'
                ? `Save ${formatCurrency(coupon.discountValue)}`
                : `${coupon.discountValue}% OFF`}
            </h4>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-2xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
          aria-label={`Copy coupon code ${coupon.code}`}
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>Applied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>{coupon.code}</span>
            </>
          )}
        </button>
      </div>

      <p className="text-xs text-stone-600 mb-3 leading-relaxed">
        {coupon.description || `Applicable on orders above ${formatCurrency(coupon.minOrderAmount)}`}
      </p>

      <div className="flex items-center justify-between text-[11px] text-stone-500 pt-3 border-t border-amber-100">
        <span>Min Order: <strong>{formatCurrency(coupon.minOrderAmount)}</strong></span>
        {coupon.validTill && (
          <span className="flex items-center gap-1 text-stone-400">
            <Clock className="w-3 h-3" />
            Till {coupon.validTill}
          </span>
        )}
      </div>
    </div>
  );
};

export default OfferCard;
