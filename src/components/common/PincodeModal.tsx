import React, { useState, useEffect } from 'react';
import { MapPin, X, CheckCircle2, AlertCircle, Clock, Truck, Zap, Map as MapIcon } from 'lucide-react';
import { useDelivery } from '../../context/DeliveryContext';
import { formatDeliveryETA } from '../../utils/deliveryRules';
import { StoreDeliveryCoverageMap } from '../maps/StoreDeliveryCoverageMap';

export const PincodeModal: React.FC = () => {
  const {
    pincode,
    isDeliverable,
    deliverabilityStatus,
    fastDeliveryAvailable,
    fastDeliveryStatus,
    is30MinDelivery,
    estimatedDeliveryTime,
    deliveryArea,
    allAreas,
    isLoading,
    isPincodeModalOpen,
    setPincodeModalOpen,
    setPincode,
  } = useDelivery();

  const [inputCode, setInputCode] = useState(pincode || '');
  const [errorMsg, setErrorMsg] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [showMap, setShowMap] = useState(false);

  useEffect(() => {
    if (isPincodeModalOpen && pincode) {
      setInputCode(pincode);
      setErrorMsg('');
    }
  }, [isPincodeModalOpen, pincode]);

  if (!isPincodeModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = inputCode.replace(/\D/g, '').trim();
    if (clean.length !== 6) {
      setErrorMsg('Please enter a valid 6-digit Indian postal PIN code');
      return;
    }
    setErrorMsg('');
    setIsChecking(true);
    await setPincode(clean);
    setIsChecking(false);
  };

  const handleSelectArea = async (code: string) => {
    const clean = code.replace(/\D/g, '').trim();
    setInputCode(clean);
    setErrorMsg('');
    setIsChecking(true);
    await setPincode(clean);
    setIsChecking(false);
  };

  return (
    <div
      id="pincode-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto"
    >
      <div
        id="pincode-modal"
        className={`bg-white rounded-2xl ${showMap ? 'max-w-2xl' : 'max-w-md'} w-full p-4 sm:p-6 shadow-2xl border border-stone-200 relative animate-in fade-in zoom-in-95 duration-200 my-auto max-h-[94vh] overflow-y-auto transition-all`}
      >
        <button
          id="close-pincode-modal"
          onClick={() => setPincodeModalOpen(false)}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 p-2 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-100 transition touch-manipulation"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center justify-between gap-3 mb-4 pr-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-base sm:text-lg">Check Delivery Area</h3>
              <p className="text-xs text-stone-500">Fast local fresh-food and dairy delivery</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowMap(!showMap)}
            className="flex items-center gap-1.5 text-xs font-bold text-amber-800 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200/90 px-3 py-1.5 rounded-xl transition shadow-2xs touch-manipulation"
          >
            <MapIcon className="w-3.5 h-3.5 text-amber-600" />
            <span>{showMap ? 'Hide Map' : 'Google Maps'}</span>
          </button>
        </div>

        {showMap && (
          <div className="mb-4">
            <StoreDeliveryCoverageMap
              onSelectPincode={(code) => handleSelectArea(code)}
            />
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1.5">
              Enter 6-Digit Delivery Pincode
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                id="pincode-input"
                type="text"
                maxLength={6}
                value={inputCode ?? ''}
                onChange={(e) => {
                  setInputCode(e.target.value.replace(/\D/g, ''));
                  setErrorMsg('');
                }}
                placeholder="e.g. 800001"
                className="flex-1 px-4 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono text-sm sm:text-base tracking-wider min-h-[44px]"
              />
              <button
                id="check-pincode-btn"
                type="submit"
                disabled={isChecking}
                className="bg-amber-600 hover:bg-amber-700 text-white font-semibold px-5 py-2.5 rounded-xl transition disabled:opacity-50 touch-manipulation min-h-[44px]"
              >
                {isChecking ? 'Checking...' : 'Check'}
              </button>
            </div>
            {errorMsg && <p className="text-xs text-rose-600 mt-1">{errorMsg}</p>}
          </div>
        </form>

        {/* Deliverability Status Display strictly adhering to:
            "Customer should see: 'Delivery Available' or 'Currently unavailable in your area'
            If eligible: 'Fast Delivery Available'
            Do not hardcode 30-minute delivery. 30-minute delivery must only be displayed when configured delivery rules confirm it. Otherwise display configured ETA."
        */}
        {(isChecking || isLoading) ? (
          <div className="mt-4 p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 font-semibold">
            Checking delivery availability for PIN <span className="font-mono font-bold">{inputCode || pincode}</span>...
          </div>
        ) : isDeliverable && deliveryArea && inputCode === pincode ? (
          <div className="mt-4 p-4 bg-emerald-50 rounded-2xl border border-emerald-200">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 text-emerald-900 font-bold text-base">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>{deliverabilityStatus}</span>
              </div>
              {fastDeliveryAvailable && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                  <Zap className="w-3 h-3 text-amber-600 fill-amber-500" />
                  {fastDeliveryStatus || 'Fast Delivery Available'}
                </span>
              )}
            </div>

            <p className="text-xs text-emerald-800 mt-2 font-medium">
              Serving: <span className="font-bold">{deliveryArea.areaName}</span> ({deliveryArea.city}, {deliveryArea.state})
            </p>

            <div className="flex items-center gap-4 mt-3 text-xs text-emerald-900 font-semibold flex-wrap">
              <span className="flex items-center gap-1.5 bg-white/70 px-2.5 py-1 rounded-lg border border-emerald-200">
                <Clock className="w-3.5 h-3.5 text-emerald-700" />
                {is30MinDelivery ? '30-minute delivery' : `${estimatedDeliveryTime} ETA`}
              </span>
              <span className="flex items-center gap-1.5 bg-white/70 px-2.5 py-1 rounded-lg border border-emerald-200">
                <Truck className="w-3.5 h-3.5 text-emerald-700" />
                {deliveryArea.deliveryCharge === 0
                  ? 'Free Delivery'
                  : `₹${deliveryArea.deliveryCharge} delivery fee`}
              </span>
            </div>

            {(deliveryArea.minimumOrder ?? 0) > 0 && (
              <p className="text-[11px] text-stone-500 mt-2">
                Min. order: ₹{deliveryArea.minimumOrder} • Free delivery above ₹
                {deliveryArea.freeDeliveryAbove || deliveryArea.freeDeliveryThreshold || 299}
              </p>
            )}
          </div>
        ) : inputCode.length === 6 && inputCode === pincode && !isDeliverable ? (
          <div className="mt-4 p-4 bg-rose-50 rounded-2xl border border-rose-200">
            <div className="flex items-center gap-2 text-rose-900 font-bold text-base">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>Currently unavailable in your area</span>
            </div>
            <p className="text-xs text-rose-700 mt-1.5 leading-relaxed">
              We do not deliver to pincode <span className="font-mono font-bold">{inputCode}</span> yet.
              Please select one of our active delivery zones below or enter a serviceable address.
            </p>
          </div>
        ) : null}

        {/* Popular serviceable locations */}
        <div className="mt-5 pt-4 border-t border-stone-100">
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
            Active Delivery Zones (Click to select)
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(allAreas || [])
              .filter((a) => a.active !== false && a.isDeliverable !== false)
              .slice(0, 6)
              .map((area) => {
                const { etaText, is30MinDelivery: is30 } = formatDeliveryETA(area);
                return (
                  <button
                    key={area.id}
                    id={`area-pill-${area.pincode || area.id}`}
                    type="button"
                    onClick={() => area.pincode && handleSelectArea(area.pincode)}
                    className={`p-2.5 text-left rounded-xl border text-xs transition touch-manipulation min-h-[44px] ${
                      pincode === area.pincode
                        ? 'border-amber-600 bg-amber-50 text-amber-900 font-semibold ring-1 ring-amber-500'
                        : 'border-stone-200 hover:border-stone-300 hover:bg-stone-50 text-stone-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-stone-900">{area.pincode}</span>
                      {area.fastDeliveryAvailable && (
                        <span className="text-[10px] text-amber-700 font-semibold flex items-center gap-0.5">
                          <Zap className="w-2.5 h-2.5 fill-amber-500 text-amber-600" /> Fast
                        </span>
                      )}
                    </div>
                    <div className="truncate text-stone-500 text-[11px] mt-0.5">
                      {(area.areaName || 'Serviceable Zone').split('/')[0]}
                    </div>
                    <div className="text-[10px] text-emerald-700 font-medium mt-0.5">
                      {is30 ? etaText : `${etaText} ETA`}
                    </div>
                  </button>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
};
