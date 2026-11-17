import React, { useState } from 'react';
import {
  MapPin,
  Phone,
  User,
  Home,
  Briefcase,
  Building,
  ArrowRight,
  ChevronLeft,
  Navigation,
  CheckCircle2,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { Address } from '../../../types';
import { isTemporaryOrFakePhone, normalizeIndianPhone10, sanitizePhoneInput10 } from '../../../validation';

interface AddressStepProps {
  name: string;
  setName: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  pincode: string;
  setPincode: (v: string) => void;
  addressLine: string;
  setAddressLine: (v: string) => void;
  landmark: string;
  setLandmark: (v: string) => void;
  city: string;
  setCity: (v: string) => void;
  state: string;
  setState: (v: string) => void;
  addressType: 'home' | 'work' | 'other';
  setAddressType: (v: 'home' | 'work' | 'other') => void;
  isDeliverable: boolean;
  deliverabilityStatus: string;
  estimatedDeliveryTime?: string;
  onOpenMapPicker: () => void;
  onBackToCart: () => void;
  onProceedToDelivery: () => void;
}

export const AddressStep: React.FC<AddressStepProps> = ({
  name,
  setName,
  phone,
  setPhone,
  pincode,
  setPincode,
  addressLine,
  setAddressLine,
  landmark,
  setLandmark,
  city,
  setCity,
  state,
  setState,
  addressType,
  setAddressType,
  isDeliverable,
  deliverabilityStatus,
  estimatedDeliveryTime,
  onOpenMapPicker,
  onBackToCart,
  onProceedToDelivery,
}) => {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleValidateAndProceed = () => {
    if (!name.trim()) {
      setErrorMsg('Please provide recipient name');
      return;
    }
    const phoneCheck = isTemporaryOrFakePhone(phone);
    if (phoneCheck.isFake) {
      setErrorMsg(phoneCheck.reason || 'Please enter a genuine 10-digit mobile number for order delivery coordination.');
      return;
    }
    if (!pincode.trim() || pincode.replace(/\D/g, '').length !== 6) {
      setErrorMsg('Please enter a valid 6-digit postal pincode');
      return;
    }
    if (!addressLine.trim()) {
      setErrorMsg('Please enter complete street address, flat, or house number');
      return;
    }
    if (!isDeliverable) {
      setErrorMsg(`Pincode ${pincode} is outside our current delivery zone.`);
      return;
    }

    setErrorMsg(null);
    onProceedToDelivery();
  };

  return (
    <div className="space-y-6">
      {/* Header & Map Pin Button */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-amber-700" />
            Where Should We Deliver?
          </h3>
          <p className="text-xs text-stone-500 mt-0.5">
            Enter your doorstep delivery details for fresh desi ghee sweets & snacks
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenMapPicker}
          className="inline-flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold transition-all shadow-2xs cursor-pointer"
        >
          <Navigation className="w-3.5 h-3.5 text-amber-700" />
          <span>Pin Location on Google Maps</span>
        </button>
      </div>

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Address Form Card */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6 shadow-xs space-y-4">
        {/* Row 1: Name and Phone */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">
              Recipient Name *
            </label>
            <div className="relative">
              <input
                type="text"
                id="address-name-input"
                value={name ?? ''}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Rajesh Sharma"
                className="w-full text-xs sm:text-sm pl-9 pr-3 py-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-amber-600 focus:outline-none"
              />
              <User className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">
              10-Digit Mobile Phone (+91) *
            </label>
            <div className="flex items-stretch">
              <span className="inline-flex items-center px-3 bg-stone-100 border border-r-0 border-stone-300 rounded-l-xl text-xs sm:text-sm font-bold text-stone-700 select-none">
                +91
              </span>
              <div className="relative flex-1">
                <input
                  type="tel"
                  inputMode="numeric"
                  id="address-phone-input"
                  value={normalizeIndianPhone10(phone ?? '')}
                  onChange={(e) => setPhone(sanitizePhoneInput10(e.target.value))}
                  maxLength={10}
                  placeholder="10-digit mobile number"
                  className="w-full text-xs sm:text-sm pl-9 pr-3 py-2.5 rounded-r-xl border border-stone-300 focus:ring-2 focus:ring-amber-600 focus:outline-none"
                />
                <Phone className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
              </div>
            </div>
          </div>
        </div>

        {/* Row 2: Pincode and City */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">
              Delivery Pincode *
            </label>
            <input
              type="text"
              id="address-pincode-input"
              value={pincode ?? ''}
              onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="e.g. 800001"
              maxLength={6}
              className="w-full text-xs sm:text-sm px-3 py-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-amber-600 focus:outline-none font-mono"
            />
            {pincode && pincode.length === 6 && (
              <p
                className={`text-[11px] mt-1 font-semibold flex items-center gap-1 ${
                  isDeliverable ? 'text-emerald-700' : 'text-rose-600'
                }`}
              >
                {isDeliverable ? (
                  <>
                    <CheckCircle2 className="w-3 h-3" />
                    {deliverabilityStatus} ({estimatedDeliveryTime || '25-35 mins'})
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3 h-3" />
                    Currently unavailable in this area
                  </>
                )}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">
              City
            </label>
            <input
              type="text"
              value={city ?? ''}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Patna"
              className="w-full text-xs sm:text-sm px-3 py-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-amber-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">
              State
            </label>
            <input
              type="text"
              value={state ?? ''}
              onChange={(e) => setState(e.target.value)}
              placeholder="Bihar"
              className="w-full text-xs sm:text-sm px-3 py-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-amber-600 focus:outline-none"
            />
          </div>
        </div>

        {/* Row 3: Complete Street Address */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">
            Flat, House No., Building, Apartment, Street *
          </label>
          <input
            type="text"
            id="address-line-input"
            value={addressLine ?? ''}
            onChange={(e) => setAddressLine(e.target.value)}
            placeholder="e.g. Flat 302, Radha Krishna Tower, Boring Road"
            className="w-full text-xs sm:text-sm px-3 py-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-amber-600 focus:outline-none"
          />
        </div>

        {/* Row 4: Landmark */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">
            Nearby Landmark (Optional)
          </label>
          <input
            type="text"
            value={landmark ?? ''}
            onChange={(e) => setLandmark(e.target.value)}
            placeholder="e.g. Opposite State Bank of India, Near Pillar 45"
            className="w-full text-xs sm:text-sm px-3 py-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-amber-600 focus:outline-none"
          />
        </div>

        {/* Row 5: Address Type Pill Selector */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-2">
            Address Type
          </label>
          <div className="flex items-center gap-3">
            {[
              { id: 'home', label: 'Home (All Day)', icon: Home },
              { id: 'work', label: 'Office / Work', icon: Briefcase },
              { id: 'other', label: 'Other', icon: Building },
            ].map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setAddressType(t.id as any)}
                  className={`flex items-center gap-1.5 py-2 px-3.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    addressType === t.id
                      ? 'bg-amber-100/70 border-amber-600 text-amber-900 font-bold shadow-2xs'
                      : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={onBackToCart}
          className="py-3 px-5 rounded-xl border border-stone-300 hover:bg-stone-100 text-stone-700 font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Cart</span>
        </button>

        <button
          type="button"
          id="proceed-to-delivery-btn"
          onClick={handleValidateAndProceed}
          className="py-3 px-6 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-bold text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer"
        >
          <span>Proceed to Delivery</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
