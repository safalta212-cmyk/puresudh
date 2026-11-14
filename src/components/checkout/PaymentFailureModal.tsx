import React from 'react';
import {
  AlertTriangle,
  RotateCcw,
  Banknote,
  CreditCard,
  X,
  ShieldAlert,
} from 'lucide-react';
import { PaymentMethod } from '../../types';

interface PaymentFailureModalProps {
  isOpen: boolean;
  onClose: () => void;
  failureReason?: string;
  selectedPaymentMethod: PaymentMethod;
  onRetryPayment: () => void;
  onSwitchToCod: () => void;
  onChangePaymentMethod: () => void;
  orderTotal: number;
}

export const PaymentFailureModal: React.FC<PaymentFailureModalProps> = ({
  isOpen,
  onClose,
  failureReason = 'Payment authorization could not be completed by your bank or PSP app.',
  selectedPaymentMethod,
  onRetryPayment,
  onSwitchToCod,
  onChangePaymentMethod,
  orderTotal,
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="payment-failure-modal-overlay"
      className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div
        id="payment-failure-dialog"
        className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-rose-200 relative animate-in zoom-in-95 duration-200"
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 p-1 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-full bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600 mb-4">
            <AlertTriangle className="w-8 h-8" />
          </div>

          <h3 className="text-xl font-extrabold text-stone-900 mb-1">
            Payment Failed or Declined
          </h3>
          <p className="text-xs text-stone-500 mb-4">
            Attempted via <span className="font-bold text-stone-800">{selectedPaymentMethod}</span>
          </p>

          <div className="w-full bg-rose-50 border border-rose-200 rounded-xl p-3.5 mb-5 text-left">
            <div className="flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-xs text-rose-800 leading-relaxed">
                <span className="font-semibold block mb-0.5">Failure Reason:</span>
                {failureReason}
              </div>
            </div>
            <p className="text-[11px] text-stone-500 mt-2 border-t border-rose-200/60 pt-2">
              Don't worry: Your cart and delivery address are completely safe. No money was deducted from your account.
            </p>
          </div>

          {/* Quick Action Choices */}
          <div className="w-full space-y-2.5">
            {/* 1. Retry Payment */}
            <button
              id="retry-payment-btn"
              onClick={onRetryPayment}
              className="w-full py-3 px-4 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.99]"
            >
              <RotateCcw className="w-4 h-4" />
              Retry Payment with {selectedPaymentMethod}
            </button>

            {/* 2. Switch to Cash on Delivery (COD) */}
            <button
              id="switch-to-cod-btn"
              onClick={onSwitchToCod}
              className="w-full py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-xs transition-all active:scale-[0.99]"
            >
              <Banknote className="w-4 h-4" />
              Switch to Cash on Delivery (Pay ₹{orderTotal} at doorstep)
            </button>

            {/* 3. Change Payment Method */}
            <button
              id="change-payment-method-btn"
              onClick={onChangePaymentMethod}
              className="w-full py-2.5 px-4 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-semibold text-xs flex items-center justify-center gap-2 transition-all"
            >
              <CreditCard className="w-4 h-4" />
              Choose Another Payment Method (UPI / Cards / Net Banking)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
