import React, { useState } from 'react';
import {
  Tag,
  CheckCircle2,
  X,
  Sparkles,
  ChevronLeft,
  ArrowRight,
  Percent,
  Gift,
  AlertCircle,
} from 'lucide-react';

interface CouponStepProps {
  couponCode: string;
  onApplyCoupon: (code: string) => Promise<boolean>;
  onRemoveCoupon: () => void;
  appliedDiscount: number;
  subtotal: number;
  onBackToDelivery: () => void;
  onProceedToPayment: () => void;
}

const AVAILABLE_COUPONS = [
  {
    code: 'WELCOME10',
    title: '10% Off Welcome Treat',
    description: 'Get 10% instant discount up to ₹100 on orders above ₹199',
    minOrder: 199,
    discountType: 'percentage',
  },
  {
    code: 'PURE50',
    title: 'Flat ₹50 Super Savings',
    description: 'Flat ₹50 off on our pure bhatti desi ghee delicacies above ₹499',
    minOrder: 499,
    discountType: 'fixed',
  },
  {
    code: 'DESIGHEE',
    title: '15% Desi Ghee Connoisseur',
    description: 'Special 15% discount up to ₹150 for desi ghee lovers above ₹599',
    minOrder: 599,
    discountType: 'percentage',
  },
  {
    code: 'FREESHIP',
    title: '100% Free Delivery',
    description: 'Zero delivery fee waiver on any pure order above ₹299',
    minOrder: 299,
    discountType: 'shipping',
  },
];

export const CouponStep: React.FC<CouponStepProps> = ({
  couponCode,
  onApplyCoupon,
  onRemoveCoupon,
  appliedDiscount,
  subtotal,
  onBackToDelivery,
  onProceedToPayment,
}) => {
  const [inputCode, setInputCode] = useState(couponCode || '');
  const [isApplying, setIsApplying] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  const handleApply = async (codeToApply: string) => {
    if (!codeToApply.trim()) return;
    setIsApplying(true);
    setFeedback(null);
    try {
      const success = await onApplyCoupon(codeToApply.trim().toUpperCase());
      if (success) {
        setFeedback({
          type: 'success',
          message: `Coupon '${codeToApply.toUpperCase()}' applied successfully!`,
        });
      } else {
        setFeedback({
          type: 'error',
          message: `Coupon '${codeToApply.toUpperCase()}' is invalid or minimum order value is not met.`,
        });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error applying coupon' });
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6 shadow-xs">
        <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
          <Tag className="w-5 h-5 text-amber-700" />
          Apply Offers & Coupons
        </h3>
        <p className="text-xs text-stone-500 mt-0.5">
          Save more on your order with our exclusive festival & promo discounts
        </p>

        {/* Input box */}
        <div className="mt-4 flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              id="coupon-code-input"
              value={inputCode ?? ''}
              onChange={(e) => setInputCode(e.target.value.toUpperCase())}
              placeholder="Enter coupon code (e.g. WELCOME10)"
              className="w-full text-xs sm:text-sm pl-9 pr-3 py-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-amber-600 focus:outline-none uppercase font-mono font-bold tracking-wider"
            />
            <Percent className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
          </div>

          <button
            type="button"
            id="apply-coupon-btn"
            disabled={isApplying || !inputCode.trim()}
            onClick={() => handleApply(inputCode)}
            className="py-2.5 px-5 rounded-xl bg-amber-700 hover:bg-amber-800 disabled:opacity-50 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
          >
            {isApplying ? 'Applying...' : 'Apply'}
          </button>
        </div>

        {/* Feedback message */}
        {feedback && (
          <div
            className={`mt-3 p-3 rounded-xl text-xs flex items-center gap-2 ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Applied Coupon Card */}
        {couponCode && appliedDiscount > 0 && (
          <div className="mt-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-mono font-extrabold text-xs">
                %
              </div>
              <div>
                <span className="font-mono font-extrabold text-xs text-emerald-950 block">
                  {couponCode} APPLIED
                </span>
                <span className="text-xs text-emerald-800 font-semibold">
                  You are saving ₹{appliedDiscount} on this order!
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                onRemoveCoupon();
                setInputCode('');
                setFeedback(null);
              }}
              className="text-xs text-rose-600 hover:text-rose-800 font-bold flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              Remove
            </button>
          </div>
        )}
      </div>

      {/* Available Coupons List */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-700" />
          Verified Active Coupons for You
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {AVAILABLE_COUPONS.map((coupon) => {
            const isEligible = subtotal >= coupon.minOrder;
            const isCurrentlyApplied = couponCode === coupon.code;

            return (
              <div
                key={coupon.code}
                className={`p-4 rounded-2xl border transition-all ${
                  isCurrentlyApplied
                    ? 'border-emerald-500 bg-emerald-50/60 shadow-xs'
                    : 'border-stone-200 bg-white hover:border-amber-300'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-mono font-extrabold text-xs text-amber-900 bg-amber-100 px-2.5 py-1 rounded-md border border-amber-200">
                    {coupon.code}
                  </span>

                  {isCurrentlyApplied ? (
                    <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Applied
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={!isEligible}
                      onClick={() => {
                        setInputCode(coupon.code);
                        handleApply(coupon.code);
                      }}
                      className="text-xs font-bold text-amber-800 hover:text-amber-900 disabled:opacity-40 disabled:hover:text-amber-800 underline decoration-amber-300 cursor-pointer"
                    >
                      {isEligible ? 'Apply Code' : `Min order ₹${coupon.minOrder}`}
                    </button>
                  )}
                </div>

                <h5 className="text-xs font-bold text-stone-900 mt-2.5">{coupon.title}</h5>
                <p className="text-[11px] text-stone-500 mt-0.5 leading-relaxed">
                  {coupon.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={onBackToDelivery}
          className="py-3 px-5 rounded-xl border border-stone-300 hover:bg-stone-100 text-stone-700 font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Delivery</span>
        </button>

        <button
          type="button"
          id="proceed-to-payment-btn"
          onClick={onProceedToPayment}
          className="py-3 px-6 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-bold text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer"
        >
          <span>Proceed to Payment</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
