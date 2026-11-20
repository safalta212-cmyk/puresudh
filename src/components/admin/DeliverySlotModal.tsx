import React, { useState, useEffect } from 'react';
import { X, Clock, CheckCircle2 } from 'lucide-react';
import { DeliverySlot } from '../../types';
import { formatFirestorePermissionMessage } from '../../firebase/config';

interface DeliverySlotModalProps {
  isOpen: boolean;
  slot: DeliverySlot | null;
  onClose: () => void;
  onSave: (slot: DeliverySlot) => Promise<void>;
}

export const DeliverySlotModal: React.FC<DeliverySlotModalProps> = ({
  isOpen,
  slot,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [startTime, setStartTime] = useState('07:00 AM');
  const [endTime, setEndTime] = useState('09:30 AM');
  const [maxOrders, setMaxOrders] = useState(50);
  const [cutoffHours, setCutoffHours] = useState(2);
  const [active, setActive] = useState(true);
  const [vendorId, setVendorId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (slot) {
      setName(slot.name || '');
      setStartTime(slot.startTime || '07:00 AM');
      setEndTime(slot.endTime || '09:30 AM');
      setMaxOrders(slot.maxOrders ?? 50);
      setCutoffHours(slot.cutoffHours ?? 2);
      setActive(slot.active ?? true);
      setVendorId(slot.vendorId || '');
    } else {
      setName('');
      setStartTime('07:00 AM');
      setEndTime('09:30 AM');
      setMaxOrders(50);
      setCutoffHours(2);
      setActive(true);
      setVendorId('');
    }
    setError('');
  }, [slot, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a Slot Name (e.g. Morning Express)');
      return;
    }
    if (!startTime.trim() || !endTime.trim()) {
      setError('Please provide both Start and End times');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const slotData: DeliverySlot = {
        id: slot?.id || `slot-${Date.now()}`,
        name: name.trim(),
        startTime: startTime.trim(),
        endTime: endTime.trim(),
        cutoffHours: Number(cutoffHours) || 2,
        maxOrders: Number(maxOrders) || 50,
        active,
        vendorId: vendorId.trim() || undefined,
      };

      await onSave(slotData);
      onClose();
    } catch (err: any) {
      setError(formatFirestorePermissionMessage(err, 'Failed to save delivery slot'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      id="delivery-slot-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4 overflow-y-auto"
    >
      <div
        id="delivery-slot-modal"
        className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 relative my-auto animate-in fade-in zoom-in-95 duration-150"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-100 transition"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-stone-900 text-base">
              {slot ? 'Edit Delivery Slot' : 'Add Delivery Slot'}
            </h3>
            <p className="text-xs text-stone-500">Configure time windows for customer order dispatch</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-stone-700 mb-1">
              Slot Title * (e.g. Morning Express)
            </label>
            <input
              type="text"
              required
              value={name ?? ''}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Morning Express"
              className="w-full p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-stone-700 mb-1">Start Time *</label>
              <input
                type="text"
                required
                value={startTime ?? '07:00 AM'}
                onChange={(e) => setStartTime(e.target.value)}
                placeholder="07:00 AM"
                className="w-full p-2.5 rounded-xl border border-stone-300 text-sm"
              />
            </div>
            <div>
              <label className="block font-semibold text-stone-700 mb-1">End Time *</label>
              <input
                type="text"
                required
                value={endTime ?? '09:30 AM'}
                onChange={(e) => setEndTime(e.target.value)}
                placeholder="09:30 AM"
                className="w-full p-2.5 rounded-xl border border-stone-300 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-stone-700 mb-1">Max Orders</label>
              <input
                type="number"
                min={1}
                value={maxOrders ?? 50}
                onChange={(e) => setMaxOrders(Number(e.target.value))}
                className="w-full p-2.5 rounded-xl border border-stone-300 text-sm"
              />
            </div>
            <div>
              <label className="block font-semibold text-stone-700 mb-1">Cutoff (Hrs)</label>
              <input
                type="number"
                min={0}
                value={cutoffHours ?? 2}
                onChange={(e) => setCutoffHours(Number(e.target.value))}
                className="w-full p-2.5 rounded-xl border border-stone-300 text-sm"
              />
            </div>
            <div>
              <label className="block font-semibold text-stone-700 mb-1">Vendor ID</label>
              <input
                type="text"
                value={vendorId ?? ''}
                onChange={(e) => setVendorId(e.target.value)}
                placeholder="All Vendors"
                className="w-full p-2.5 rounded-xl border border-stone-300 text-xs font-mono"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-stone-100">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(active)}
                onChange={(e) => setActive(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded-md focus:ring-emerald-500"
              />
              <span className="font-semibold text-stone-800 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Active Slot (Visible to Customers)
              </span>
            </label>
          </div>

          <div className="flex justify-end gap-2.5 pt-4 border-t border-stone-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-amber-800 hover:bg-amber-900 text-white font-bold transition disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : slot ? 'Update Slot' : 'Save Slot'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
