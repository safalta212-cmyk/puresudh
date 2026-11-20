import React, { useState, useEffect } from 'react';
import { X, MapPin, Zap, Truck } from 'lucide-react';
import { DeliveryArea } from '../../types';
import { formatFirestorePermissionMessage } from '../../firebase/config';

interface DeliveryAreaModalProps {
  isOpen: boolean;
  area: DeliveryArea | null;
  onClose: () => void;
  onSave: (area: DeliveryArea) => Promise<void>;
}

export const DeliveryAreaModal: React.FC<DeliveryAreaModalProps> = ({
  isOpen,
  area,
  onClose,
  onSave,
}) => {
  const [areaName, setAreaName] = useState('');
  const [pincode, setPincode] = useState('');
  const [additionalPincodes, setAdditionalPincodes] = useState('');
  const [city, setCity] = useState('Patna');
  const [state, setState] = useState('Bihar');
  const [deliveryCharge, setDeliveryCharge] = useState(0);
  const [minimumOrder, setMinimumOrder] = useState(99);
  const [freeDeliveryThreshold, setFreeDeliveryThreshold] = useState(299);
  const [estimatedDeliveryTime, setEstimatedDeliveryTime] = useState('25-35 mins');
  const [estimatedTimeMinutes, setEstimatedTimeMinutes] = useState(30);
  const [fastDeliveryAvailable, setFastDeliveryAvailable] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const [vendorId, setVendorId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (area) {
      setAreaName(area.areaName || '');
      setPincode(area.pincode || '');
      const otherPins = (area.pincodes || []).filter((p) => p !== area.pincode);
      setAdditionalPincodes(otherPins.join(', '));
      setCity(area.city || 'Patna');
      setState(area.state || 'Bihar');
      setDeliveryCharge(area.deliveryCharge ?? 0);
      setMinimumOrder(area.minimumOrder ?? 99);
      setFreeDeliveryThreshold(area.freeDeliveryAbove ?? area.freeDeliveryThreshold ?? 299);
      setEstimatedDeliveryTime(area.estimatedDeliveryTime || `${area.estimatedTimeMinutes || 30} mins`);
      setEstimatedTimeMinutes(area.estimatedTimeMinutes || 30);
      setFastDeliveryAvailable(area.fastDeliveryAvailable ?? true);
      setIsActive(area.active ?? area.isDeliverable ?? true);
      setVendorId(area.vendorId || '');
    } else {
      setAreaName('');
      setPincode('');
      setAdditionalPincodes('');
      setCity('Patna');
      setState('Bihar');
      setDeliveryCharge(0);
      setMinimumOrder(99);
      setFreeDeliveryThreshold(299);
      setEstimatedDeliveryTime('25-35 mins');
      setEstimatedTimeMinutes(30);
      setFastDeliveryAvailable(true);
      setIsActive(true);
      setVendorId('');
    }
    setError('');
  }, [area, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPrimaryPin = pincode.trim().replace(/\D/g, '');
    if (!cleanPrimaryPin || cleanPrimaryPin.length !== 6) {
      setError('Please provide a valid 6-digit primary PIN code');
      return;
    }
    if (!areaName.trim()) {
      setError('Please provide an Area Name');
      return;
    }

    // Parse additional pincodes
    const extraPins = additionalPincodes
      .split(',')
      .map((p) => p.trim().replace(/\D/g, ''))
      .filter((p) => p.length === 6 && p !== cleanPrimaryPin);
    const allPincodes = Array.from(new Set([cleanPrimaryPin, ...extraPins]));

    setIsSaving(true);
    setError('');

    try {
      const areaData: DeliveryArea = {
        id: area?.id || `area-${cleanPrimaryPin}-${Date.now()}`,
        pincode: cleanPrimaryPin,
        pincodes: allPincodes,
        areaName: areaName.trim(),
        city: city.trim() || 'Patna',
        state: state.trim() || 'Bihar',
        estimatedTimeMinutes: Number(estimatedTimeMinutes) || 30,
        estimatedDeliveryTime: estimatedDeliveryTime.trim() || `${estimatedTimeMinutes} mins`,
        deliveryCharge: Number(deliveryCharge) || 0,
        minimumOrder: Number(minimumOrder) || 0,
        freeDeliveryThreshold: Number(freeDeliveryThreshold) || 299,
        freeDeliveryAbove: Number(freeDeliveryThreshold) || 299,
        isDeliverable: isActive,
        active: isActive,
        fastDeliveryAvailable,
        vendorId: vendorId.trim() || undefined,
      };

      await onSave(areaData);
      onClose();
    } catch (err: any) {
      setError(formatFirestorePermissionMessage(err, 'Failed to save delivery area configuration'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      id="delivery-area-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4 overflow-y-auto"
    >
      <div
        id="delivery-area-modal"
        className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-stone-200 relative my-auto max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-100 transition"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-stone-900 text-lg">
              {area ? 'Edit Delivery Area' : 'Add Delivery Area'}
            </h3>
            <p className="text-xs text-stone-500">
              Configure serviceable pincodes, charges, minimum order, and dynamic ETA rules
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block font-semibold text-stone-700 mb-1">
                Area Name * (e.g. Boring Road / Patliputra Colony)
              </label>
              <input
                type="text"
                required
                value={areaName ?? ''}
                onChange={(e) => setAreaName(e.target.value)}
                placeholder="e.g. Boring Road / Kankarbagh Central"
                className="w-full p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
              />
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">
                Primary Pincode * (6 Digits)
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={pincode ?? ''}
                onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                placeholder="e.g. 800001"
                className="w-full p-2.5 rounded-xl border border-stone-300 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">
                Additional Pincodes (Comma-separated)
              </label>
              <input
                type="text"
                value={additionalPincodes ?? ''}
                onChange={(e) => setAdditionalPincodes(e.target.value)}
                placeholder="e.g. 800013, 800020"
                className="w-full p-2.5 rounded-xl border border-stone-300 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <p className="text-[10px] text-stone-400 mt-0.5">Multiple postal codes covered by this hub</p>
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">City *</label>
              <input
                type="text"
                required
                value={city ?? 'Patna'}
                onChange={(e) => setCity(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-stone-300 text-sm"
              />
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">State *</label>
              <input
                type="text"
                required
                value={state ?? 'Bihar'}
                onChange={(e) => setState(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-stone-300 text-sm"
              />
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">Delivery Charge (₹)</label>
              <input
                type="number"
                min={0}
                value={deliveryCharge ?? 0}
                onChange={(e) => setDeliveryCharge(Number(e.target.value))}
                className="w-full p-2.5 rounded-xl border border-stone-300 text-sm"
              />
              <p className="text-[10px] text-stone-400 mt-0.5">Set to 0 for Free Delivery by default</p>
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">Minimum Order (₹)</label>
              <input
                type="number"
                min={0}
                value={minimumOrder ?? 99}
                onChange={(e) => setMinimumOrder(Number(e.target.value))}
                className="w-full p-2.5 rounded-xl border border-stone-300 text-sm"
              />
              <p className="text-[10px] text-stone-400 mt-0.5">Minimum basket value required to order</p>
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">Free Delivery Threshold (₹)</label>
              <input
                type="number"
                min={0}
                value={freeDeliveryThreshold ?? 299}
                onChange={(e) => setFreeDeliveryThreshold(Number(e.target.value))}
                className="w-full p-2.5 rounded-xl border border-stone-300 text-sm"
              />
              <p className="text-[10px] text-stone-400 mt-0.5">Orders above this amount get free delivery</p>
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">
                Configured ETA Text (e.g. &quot;30 mins&quot;, &quot;25-35 mins&quot;, &quot;Same Day&quot;)
              </label>
              <input
                type="text"
                required
                value={estimatedDeliveryTime ?? ''}
                onChange={(e) => setEstimatedDeliveryTime(e.target.value)}
                placeholder="e.g. 25-35 mins or 30 mins"
                className="w-full p-2.5 rounded-xl border border-stone-300 text-sm"
              />
              <p className="text-[10px] text-amber-700 font-medium mt-0.5">
                Note: 30-minute delivery label is displayed only when this ETA confirms it.
              </p>
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">ETA in Minutes</label>
              <input
                type="number"
                min={5}
                value={estimatedTimeMinutes ?? 30}
                onChange={(e) => setEstimatedTimeMinutes(Number(e.target.value))}
                className="w-full p-2.5 rounded-xl border border-stone-300 text-sm"
              />
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">
                Vendor ID (Future Architecture)
              </label>
              <input
                type="text"
                value={vendorId ?? ''}
                onChange={(e) => setVendorId(e.target.value)}
                placeholder="Leave blank for Central Hub / All Vendors"
                className="w-full p-2.5 rounded-xl border border-stone-300 text-xs font-mono"
              />
              <p className="text-[10px] text-stone-400 mt-0.5">Vendor-specific fulfillment routing</p>
            </div>
          </div>

          <div className="pt-3 border-t border-stone-100 flex flex-wrap gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={fastDeliveryAvailable}
                onChange={(e) => setFastDeliveryAvailable(e.target.checked)}
                className="w-4 h-4 text-amber-600 rounded-md focus:ring-amber-500"
              />
              <span className="font-semibold text-stone-800 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
                Fast Delivery Eligible
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded-md focus:ring-emerald-500"
              />
              <span className="font-semibold text-stone-800 flex items-center gap-1">
                <Truck className="w-3.5 h-3.5 text-emerald-600" />
                Active / Serviceable
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
              {isSaving ? 'Saving...' : area ? 'Update Delivery Area' : 'Save Delivery Area'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
