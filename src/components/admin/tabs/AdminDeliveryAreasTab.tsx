import React, { useState } from 'react';
import {
  MapPin,
  Plus,
  Edit2,
  Trash2,
  Zap,
  Clock,
  IndianRupee,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { DeliveryArea } from '../../../types';

interface AdminDeliveryAreasTabProps {
  deliveryAreas: DeliveryArea[];
  onSaveArea: (area: DeliveryArea) => Promise<void>;
  onDeleteArea: (areaId: string, areaName: string) => Promise<void>;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const AdminDeliveryAreasTab: React.FC<AdminDeliveryAreasTabProps> = ({
  deliveryAreas,
  onSaveArea,
  onDeleteArea,
  showToast,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<DeliveryArea | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    city: 'Patna',
    pincodes: '',
    deliveryCharge: 30,
    freeDeliveryThreshold: 499,
    estimatedTime: '30-45 mins',
    isFastDelivery: true,
    active: true,
  });

  const handleOpenAdd = () => {
    setEditingArea(null);
    setFormData({
      name: '',
      city: 'Patna',
      pincodes: '800001, 800020',
      deliveryCharge: 30,
      freeDeliveryThreshold: 499,
      estimatedTime: '30-45 mins',
      isFastDelivery: true,
      active: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (a: DeliveryArea) => {
    setEditingArea(a);
    setFormData({
      name: a.name,
      city: a.city || 'Patna',
      pincodes: a.pincodes ? a.pincodes.join(', ') : '',
      deliveryCharge: a.deliveryCharge,
      freeDeliveryThreshold: a.freeDeliveryThreshold || 499,
      estimatedTime: a.estimatedTime,
      isFastDelivery: a.isFastDelivery || false,
      active: a.active,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('Area name is required', 'error');
      return;
    }

    const pinArray = formData.pincodes
      .split(',')
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    const aId = editingArea?.id || `area-${Date.now()}`;
    const areaToSave: DeliveryArea = {
      id: aId,
      name: formData.name.trim(),
      city: formData.city.trim() || 'Patna',
      pincodes: pinArray,
      deliveryCharge: Number(formData.deliveryCharge),
      freeDeliveryThreshold: Number(formData.freeDeliveryThreshold),
      estimatedTime: formData.estimatedTime.trim() || '30-45 mins',
      isFastDelivery: formData.isFastDelivery,
      active: formData.active,
      createdAt: editingArea?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await onSaveArea(areaToSave);
    showToast(`Delivery area "${areaToSave.name}" saved!`, 'success');
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
            Serviceable Delivery Areas
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-semibold border border-amber-200">
              {deliveryAreas.length} zones
            </span>
          </h2>
          <p className="text-sm text-stone-500 mt-0.5">
            Configure Patna neighborhood routes, pincode whitelist, express dispatch, and fee tiers
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 rounded-xl transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" />
          Add Delivery Area
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {deliveryAreas.map((area) => {
          return (
            <div
              key={area.id}
              className={`bg-white rounded-2xl border p-5 shadow-xs flex flex-col justify-between transition-colors ${
                area.active ? 'border-stone-200/80 hover:border-amber-400' : 'border-stone-200 opacity-60'
              }`}
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-800 flex items-center justify-center">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-stone-900 text-sm">{area.name}</h3>
                      <p className="text-[11px] text-stone-500">{area.city || 'Patna'}</p>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      area.active
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-stone-100 text-stone-600 border-stone-200'
                    }`}
                  >
                    {area.active ? 'Active' : 'Disabled'}
                  </span>
                </div>

                {/* Badges / Attributes */}
                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  {area.isFastDelivery && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">
                      <Zap className="w-3 h-3 text-amber-700 fill-amber-500" />
                      Fast Delivery (Express)
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-stone-600 bg-stone-100 px-2 py-0.5 rounded-md">
                    <Clock className="w-3 h-3" />
                    ETA: {area.estimatedTime}
                  </span>
                </div>

                {/* Charges */}
                <div className="mt-3 p-2.5 bg-stone-50 rounded-xl border border-stone-200/70 text-xs grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] text-stone-500 block">Delivery Charge:</span>
                    <span className="font-bold text-stone-900">₹{area.deliveryCharge}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-500 block">Free Above:</span>
                    <span className="font-bold text-emerald-700">₹{area.freeDeliveryThreshold}</span>
                  </div>
                </div>

                {/* Pincodes */}
                <div className="mt-3">
                  <span className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider block mb-1">
                    Pincodes ({area.pincodes?.length || 0})
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {area.pincodes?.map((pin, i) => (
                      <span
                        key={i}
                        className="text-[11px] font-mono px-2 py-0.5 rounded bg-stone-100 text-stone-700 border border-stone-200"
                      >
                        {pin}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-end gap-1.5">
                <button
                  onClick={() => handleOpenEdit(area)}
                  className="p-1.5 rounded-lg text-stone-600 hover:text-amber-800 hover:bg-amber-50 transition-colors"
                  title="Edit Area"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onDeleteArea(area.id, area.name)}
                  className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  title="Delete Area"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Area Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 border border-stone-200 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="text-base font-bold text-stone-900">
                {editingArea ? 'Edit Delivery Area' : 'Add Delivery Area'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 text-lg leading-none"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Area / Hub Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Boring Road & Bailey Road"
                    value={formData.name ?? ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 rounded-lg border border-stone-300 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">City</label>
                  <input
                    type="text"
                    value={formData.city ?? ''}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 rounded-lg border border-stone-300 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Pincodes (Comma separated) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="800001, 800020, 800013"
                  value={formData.pincodes ?? ''}
                  onChange={(e) => setFormData({ ...formData, pincodes: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-50 rounded-lg border border-stone-300 font-mono focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Delivery Charge (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.deliveryCharge ?? 0}
                    onChange={(e) =>
                      setFormData({ ...formData, deliveryCharge: parseInt(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 bg-stone-50 rounded-lg border border-stone-300 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Free Above (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.freeDeliveryThreshold ?? 0}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        freeDeliveryThreshold: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 bg-stone-50 rounded-lg border border-stone-300 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Estimated ETA</label>
                  <input
                    type="text"
                    placeholder="30-45 mins"
                    value={formData.estimatedTime ?? ''}
                    onChange={(e) => setFormData({ ...formData, estimatedTime: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 rounded-lg border border-stone-300 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="area-fast-check"
                    checked={formData.isFastDelivery}
                    onChange={(e) => setFormData({ ...formData, isFastDelivery: e.target.checked })}
                    className="rounded text-amber-700 focus:ring-amber-500"
                  />
                  <label htmlFor="area-fast-check" className="font-semibold text-stone-800">
                    Fast Delivery Badge (Express dispatch available)
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="area-active-check"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    className="rounded text-amber-700 focus:ring-amber-500"
                  />
                  <label htmlFor="area-active-check" className="font-semibold text-stone-800">
                    Area active for customer checkout address selection
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 font-semibold text-stone-600 hover:bg-stone-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold text-white bg-amber-700 hover:bg-amber-800 rounded-lg shadow-xs"
                >
                  {editingArea ? 'Update Area' : 'Save Area'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
