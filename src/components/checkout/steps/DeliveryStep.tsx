import React, { useMemo, useEffect } from 'react';
import {
  Truck,
  Zap,
  Calendar,
  Clock,
  ChevronLeft,
  ArrowRight,
  BellOff,
  PhoneCall,
  DoorClosed,
  Gift,
} from 'lucide-react';
import { useDelivery } from '../../../context/DeliveryContext';
import { initialDeliverySlots } from '../../../data/seedData';

interface DeliveryStepProps {
  deliveryType: 'express' | 'scheduled';
  setDeliveryType: (v: 'express' | 'scheduled') => void;
  selectedSlotId: string;
  setSelectedSlotId: (id: string) => void;
  deliveryInstruction: string;
  setDeliveryInstruction: (v: string) => void;
  specialNotes: string;
  setSpecialNotes: (v: string) => void;
  estimatedDeliveryTime?: string;
  onBackToAddress: () => void;
  onProceedToCoupon: () => void;
}

const QUICK_INSTRUCTIONS = [
  { id: 'door', label: 'Leave at doorstep / gate', icon: DoorClosed },
  { id: 'call', label: 'Call before arriving', icon: PhoneCall },
  { id: 'no_bell', label: 'Do not ring bell', icon: BellOff },
  { id: 'gift', label: 'Gift packaging required', icon: Gift },
];

export const DeliveryStep: React.FC<DeliveryStepProps> = ({
  deliveryType,
  setDeliveryType,
  selectedSlotId,
  setSelectedSlotId,
  deliveryInstruction,
  setDeliveryInstruction,
  specialNotes,
  setSpecialNotes,
  estimatedDeliveryTime = '25-35 mins',
  onBackToAddress,
  onProceedToCoupon,
}) => {
  const { deliverySlots } = useDelivery();

  const availableSlots = useMemo(() => {
    const source = deliverySlots && deliverySlots.length > 0 ? deliverySlots : initialDeliverySlots;
    return source
      .filter((s) => s.active !== false && s.isActive !== false)
      .map((s) => ({
        id: s.id,
        label: s.name,
        time: `${s.startTime} - ${s.endTime}`,
        tag: s.cutoffTime ? `Cutoff ${s.cutoffTime}` : 'Fresh Dispatch',
      }));
  }, [deliverySlots]);

  useEffect(() => {
    if (deliveryType === 'scheduled' && availableSlots.length > 0) {
      const stillValid = availableSlots.some((s) => s.id === selectedSlotId);
      if (!stillValid) {
        setSelectedSlotId(availableSlots[0].id);
      }
    }
  }, [deliveryType, availableSlots, selectedSlotId, setSelectedSlotId]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs">
        <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
          <Truck className="w-5 h-5 text-amber-700" />
          Choose Delivery Speed & Time Slot
        </h3>
        <p className="text-xs text-stone-500 mt-0.5">
          Select when you want your fresh desi ghee sweets & savouries delivered
        </p>

        {/* Options Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          {/* 1. Express Delivery */}
          <div
            onClick={() => setDeliveryType('express')}
            className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative ${
              deliveryType === 'express'
                ? 'border-amber-700 bg-amber-50/70 shadow-sm'
                : 'border-stone-200 hover:border-stone-300 bg-white'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-700 text-white flex items-center justify-center shadow-xs">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-stone-900">Express Delivery</h4>
                  <p className="text-xs font-semibold text-amber-900 flex items-center gap-1 mt-0.5">
                    <Clock className="w-3.5 h-3.5" />
                    {estimatedDeliveryTime}
                  </p>
                </div>
              </div>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md">
                Fastest
              </span>
            </div>
            <p className="text-[11px] text-stone-500 mt-3 border-t border-stone-200/60 pt-2">
              Freshly packaged from the nearest kitchen bhatti straight to your doorstep.
            </p>
          </div>

          {/* 2. Scheduled Delivery Slot */}
          <div
            onClick={() => setDeliveryType('scheduled')}
            className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative ${
              deliveryType === 'scheduled'
                ? 'border-amber-700 bg-amber-50/70 shadow-sm'
                : 'border-stone-200 hover:border-stone-300 bg-white'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-stone-800 text-white flex items-center justify-center shadow-xs">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-stone-900">Scheduled Slot</h4>
                  <p className="text-xs text-stone-500 mt-0.5">Choose your preferred time</p>
                </div>
              </div>
              <span className="bg-stone-100 text-stone-700 text-[10px] font-bold uppercase px-2 py-0.5 rounded-md">
                Pre-book
              </span>
            </div>
            <p className="text-[11px] text-stone-500 mt-3 border-t border-stone-200/60 pt-2">
              Prepared fresh in the designated shift slot of your choice.
            </p>
          </div>
        </div>

        {/* Scheduled Slot Selection (if chosen) */}
        {deliveryType === 'scheduled' && (
          <div className="mt-5 p-4 rounded-xl bg-stone-50 border border-stone-200 animate-in fade-in duration-200">
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-2">
              Available Delivery Slots Today
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {availableSlots.map((slot) => (
                <button
                  key={slot.id}
                  type="button"
                  onClick={() => setSelectedSlotId(slot.id)}
                  className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                    selectedSlotId === slot.id
                      ? 'border-amber-700 bg-white shadow-xs ring-2 ring-amber-700/20'
                      : 'border-stone-200 bg-white hover:bg-stone-100/60'
                  }`}
                >
                  <span className="text-[10px] font-bold text-amber-800 uppercase block mb-0.5">
                    {slot.tag}
                  </span>
                  <span className="text-xs font-bold text-stone-900 block">{slot.label}</span>
                  <span className="text-[11px] text-stone-500 block mt-0.5">{slot.time}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Delivery Instructions & Rider Note */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-4">
        <h4 className="text-sm font-bold text-stone-900">Delivery Instructions</h4>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {QUICK_INSTRUCTIONS.map((inst) => {
            const Icon = inst.icon;
            const isSelected = deliveryInstruction === inst.label;
            return (
              <button
                key={inst.id}
                type="button"
                onClick={() => setDeliveryInstruction(isSelected ? '' : inst.label)}
                className={`p-2.5 rounded-xl border text-xs font-medium flex flex-col items-center text-center gap-1.5 transition-all cursor-pointer ${
                  isSelected
                    ? 'border-amber-700 bg-amber-50 text-amber-900 font-bold'
                    : 'border-stone-200 text-stone-700 hover:bg-stone-50'
                }`}
              >
                <Icon className="w-4 h-4 text-stone-600" />
                <span className="text-[11px]">{inst.label}</span>
              </button>
            );
          })}
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">
            Special Instructions / Kitchen Notes
          </label>
          <input
            type="text"
            value={specialNotes ?? ''}
            onChange={(e) => setSpecialNotes(e.target.value)}
            placeholder="e.g. Ring doorbell twice, deliver before 7 PM for pooja"
            className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-amber-600 focus:outline-none"
          />
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={onBackToAddress}
          className="py-3 px-5 rounded-xl border border-stone-300 hover:bg-stone-100 text-stone-700 font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Address</span>
        </button>

        <button
          type="button"
          id="proceed-to-coupon-btn"
          onClick={onProceedToCoupon}
          className="py-3 px-6 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-bold text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer"
        >
          <span>Proceed to Coupon</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
