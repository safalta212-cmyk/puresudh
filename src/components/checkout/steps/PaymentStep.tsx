import React, { useState } from 'react';
import {
  CreditCard,
  QrCode,
  Smartphone,
  Building2,
  Banknote,
  ShieldCheck,
  ChevronLeft,
  ArrowRight,
  CheckCircle2,
  Lock,
  Wallet,
  Sparkles,
} from 'lucide-react';
import { PaymentMethod } from '../../../types';

interface PaymentStepProps {
  selectedPaymentMethod: PaymentMethod;
  setSelectedPaymentMethod: (m: PaymentMethod) => void;
  grandTotal: number;
  onBackToCoupon: () => void;
  onProceedToReview: () => void;
  paymentDetails: {
    upiVpa: string;
    cardNumber: string;
    cardExpiry: string;
    cardCvv: string;
    cardName: string;
    selectedBank: string;
  };
  setPaymentDetails: React.Dispatch<
    React.SetStateAction<{
      upiVpa: string;
      cardNumber: string;
      cardExpiry: string;
      cardCvv: string;
      cardName: string;
      selectedBank: string;
    }>
  >;
}

const PAYMENT_METHODS: {
  id: PaymentMethod;
  title: string;
  subtitle: string;
  icon: React.FC<{ className?: string }>;
  tag?: string;
}[] = [
  {
    id: 'UPI',
    title: 'UPI (QR Code / Any UPI App)',
    subtitle: 'Scan dynamic QR or enter your UPI ID',
    icon: QrCode,
    tag: 'Fastest',
  },
  {
    id: 'PhonePe',
    title: 'PhonePe',
    subtitle: 'Pay directly with PhonePe UPI or Wallet',
    icon: Smartphone,
  },
  {
    id: 'Google Pay',
    title: 'Google Pay',
    subtitle: 'Fast and secure checkout via Google Pay',
    icon: Smartphone,
  },
  {
    id: 'Paytm',
    title: 'Paytm',
    subtitle: 'Pay via Paytm UPI, Postpaid or Wallet',
    icon: Wallet,
  },
  {
    id: 'Credit/Debit Card',
    title: 'Credit / Debit Cards',
    subtitle: 'Visa, MasterCard, RuPay, Maestro accepted',
    icon: CreditCard,
  },
  {
    id: 'Net Banking',
    title: 'Net Banking',
    subtitle: 'All major Indian retail & corporate banks',
    icon: Building2,
  },
  {
    id: 'Cash on Delivery',
    title: 'Cash on Delivery (COD)',
    subtitle: 'Pay cash or UPI to delivery rider at doorstep',
    icon: Banknote,
    tag: 'Doorstep',
  },
];

const POPULAR_BANKS = [
  'State Bank of India (SBI)',
  'HDFC Bank',
  'ICICI Bank',
  'Axis Bank',
  'Punjab National Bank (PNB)',
  'Kotak Mahindra Bank',
  'Bank of Baroda',
  'Canara Bank',
];

export const PaymentStep: React.FC<PaymentStepProps> = ({
  selectedPaymentMethod,
  setSelectedPaymentMethod,
  grandTotal,
  onBackToCoupon,
  onProceedToReview,
  paymentDetails,
  setPaymentDetails,
}) => {
  const [upiTab, setUpiTab] = useState<'qr' | 'id'>('qr');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-amber-700" />
            Select Payment Method
          </h3>
          <p className="text-xs text-stone-500 mt-0.5">
            100% secure payment gateway with server-side signature verification
          </p>
        </div>

        <div className="text-right">
          <span className="text-[11px] text-stone-400 font-semibold block">Total to Pay</span>
          <span className="text-lg font-extrabold text-amber-900">₹{grandTotal}</span>
        </div>
      </div>

      {/* Main Payment Options Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Payment Method Selector (5 cols) */}
        <div className="lg:col-span-5 space-y-2.5">
          {PAYMENT_METHODS.map((method) => {
            const Icon = method.icon;
            const isSelected = selectedPaymentMethod === method.id;

            return (
              <button
                key={method.id}
                type="button"
                id={`payment-method-${method.id.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                onClick={() => setSelectedPaymentMethod(method.id)}
                className={`w-full p-3.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                  isSelected
                    ? 'border-amber-700 bg-amber-50/80 shadow-xs ring-2 ring-amber-700/20'
                    : 'border-stone-200 bg-white hover:bg-stone-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      isSelected
                        ? 'bg-amber-700 text-white shadow-xs'
                        : 'bg-stone-100 text-stone-700'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-stone-900">{method.title}</span>
                      {method.tag && (
                        <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 bg-amber-200/80 text-amber-950 rounded-sm">
                          {method.tag}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-stone-500 block leading-tight">
                      {method.subtitle}
                    </span>
                  </div>
                </div>

                <div
                  className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    isSelected ? 'border-amber-700 bg-amber-700' : 'border-stone-300'
                  }`}
                >
                  {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
              </button>
            );
          })}
        </div>

        {/* Right: Method Configuration Details (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-stone-200 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          {/* UPI Method Details */}
          {(selectedPaymentMethod === 'UPI' ||
            selectedPaymentMethod === 'PhonePe' ||
            selectedPaymentMethod === 'Google Pay' ||
            selectedPaymentMethod === 'Paytm') && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
                  <QrCode className="w-4 h-4 text-amber-700" />
                  {selectedPaymentMethod} Payment Setup
                </h4>
                <div className="flex gap-1 bg-stone-100 p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setUpiTab('qr')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                      upiTab === 'qr' ? 'bg-white shadow-2xs text-stone-900' : 'text-stone-500'
                    }`}
                  >
                    Scan QR
                  </button>
                  <button
                    type="button"
                    onClick={() => setUpiTab('id')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                      upiTab === 'id' ? 'bg-white shadow-2xs text-stone-900' : 'text-stone-500'
                    }`}
                  >
                    Enter UPI ID
                  </button>
                </div>
              </div>

              {upiTab === 'qr' ? (
                <div className="flex flex-col items-center text-center py-2">
                  <div className="p-3 bg-white border-2 border-stone-900 rounded-2xl shadow-md mb-2">
                    {/* Simulated Dynamic UPI QR code graphic */}
                    <div className="w-40 h-40 bg-stone-950 p-2 rounded-xl flex flex-col items-center justify-center text-white relative">
                      <div className="grid grid-cols-6 gap-1 w-full h-full p-1 opacity-90">
                        {Array.from({ length: 36 }).map((_, i) => (
                          <div
                            key={i}
                            className={`rounded-xs ${
                              (i % 3 === 0 || i % 7 === 0 || i < 6 || i > 30)
                                ? 'bg-white'
                                : 'bg-transparent'
                            }`}
                          />
                        ))}
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="bg-amber-600 text-white font-black text-[10px] px-2 py-1 rounded-md shadow-lg border border-amber-400">
                          PURE SUDH UPI
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs font-bold text-stone-800">
                    Scan with any UPI App (GPay, PhonePe, Paytm, BHIM, CRED)
                  </p>
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    UPI ID: <span className="font-mono font-bold text-amber-900">puresudh@okhdfcbank</span>
                  </p>
                </div>
              ) : (
                <div className="py-3">
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">
                    Enter Virtual Payment Address (VPA / UPI ID)
                  </label>
                  <input
                    type="text"
                    id="upi-vpa-input"
                    value={paymentDetails.upiVpa ?? ''}
                    onChange={(e) =>
                      setPaymentDetails((prev) => ({ ...prev, upiVpa: e.target.value }))
                    }
                    placeholder="e.g. yourname@oksbi or 9876543210@paytm"
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-amber-600 focus:outline-none font-mono"
                  />
                  <p className="text-[11px] text-stone-500 mt-2">
                    A payment request of ₹{grandTotal} will be sent to your UPI app.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Cards Method Details */}
          {selectedPaymentMethod === 'Credit/Debit Card' && (
            <div className="space-y-3.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5 border-b border-stone-100 pb-2">
                <CreditCard className="w-4 h-4 text-amber-700" />
                Enter Card Credentials
              </h4>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-600 mb-1">
                  Card Number
                </label>
                <input
                  type="text"
                  maxLength={19}
                  id="card-number-input"
                  value={paymentDetails.cardNumber ?? ''}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, '').slice(0, 16);
                    const formatted = v.match(/.{1,4}/g)?.join(' ') || v;
                    setPaymentDetails((prev) => ({ ...prev, cardNumber: formatted }));
                  }}
                  placeholder="4111 2222 3333 4444"
                  className="w-full text-xs sm:text-sm px-3 py-2 rounded-xl border border-stone-300 focus:ring-2 focus:ring-amber-600 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-600 mb-1">
                    Expiry (MM/YY)
                  </label>
                  <input
                    type="text"
                    maxLength={5}
                    value={paymentDetails.cardExpiry ?? ''}
                    onChange={(e) =>
                      setPaymentDetails((prev) => ({ ...prev, cardExpiry: e.target.value }))
                    }
                    placeholder="12/28"
                    className="w-full text-xs sm:text-sm px-3 py-2 rounded-xl border border-stone-300 focus:ring-2 focus:ring-amber-600 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-600 mb-1">
                    CVV / CVC
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    value={paymentDetails.cardCvv ?? ''}
                    onChange={(e) =>
                      setPaymentDetails((prev) => ({ ...prev, cardCvv: e.target.value }))
                    }
                    placeholder="•••"
                    className="w-full text-xs sm:text-sm px-3 py-2 rounded-xl border border-stone-300 focus:ring-2 focus:ring-amber-600 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-600 mb-1">
                  Cardholder Full Name
                </label>
                <input
                  type="text"
                  value={paymentDetails.cardName ?? ''}
                  onChange={(e) =>
                    setPaymentDetails((prev) => ({ ...prev, cardName: e.target.value }))
                  }
                  placeholder="e.g. Ramesh Chandra"
                  className="w-full text-xs sm:text-sm px-3 py-2 rounded-xl border border-stone-300 focus:ring-2 focus:ring-amber-600"
                />
              </div>
            </div>
          )}

          {/* Net Banking Method Details */}
          {selectedPaymentMethod === 'Net Banking' && (
            <div className="space-y-3.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5 border-b border-stone-100 pb-2">
                <Building2 className="w-4 h-4 text-amber-700" />
                Select Your Bank
              </h4>

              <div className="space-y-2">
                {POPULAR_BANKS.map((bank) => (
                  <label
                    key={bank}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                      paymentDetails.selectedBank === bank
                        ? 'border-amber-700 bg-amber-50 font-bold text-amber-900'
                        : 'border-stone-200 hover:bg-stone-50 text-stone-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="bank_choice"
                      value={bank ?? ''}
                      checked={paymentDetails.selectedBank === bank}
                      onChange={() =>
                        setPaymentDetails((prev) => ({ ...prev, selectedBank: bank }))
                      }
                      className="text-amber-700"
                    />
                    <span>{bank}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* COD Method Details */}
          {selectedPaymentMethod === 'Cash on Delivery' && (
            <div className="space-y-3 py-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-2">
                <Banknote className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-stone-900">
                Pay with Cash or UPI at Doorstep
              </h4>
              <p className="text-xs text-stone-600 leading-relaxed">
                You can pay ₹{grandTotal} in cash or via our delivery partner's handheld UPI QR code when your fresh package arrives.
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900">
                Tip: Keeping exact change helps our delivery partners deliver faster!
              </div>
            </div>
          )}

          {/* Security footnote */}
          <div className="mt-6 pt-4 border-t border-stone-100 flex items-center gap-2 text-[11px] text-stone-400">
            <Lock className="w-3.5 h-3.5 text-stone-500" />
            <span>256-Bit SSL Encrypted • Direct PCI-DSS Bank Gateway</span>
          </div>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={onBackToCoupon}
          className="py-3 px-5 rounded-xl border border-stone-300 hover:bg-stone-100 text-stone-700 font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Coupon</span>
        </button>

        <button
          type="button"
          id="proceed-to-review-btn"
          onClick={onProceedToReview}
          className="py-3 px-6 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-bold text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer"
        >
          <span>Review Order Summary</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
