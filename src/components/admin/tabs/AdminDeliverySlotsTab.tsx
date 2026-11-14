import React, { useState } from 'react';
import {
  Clock,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Users,
  Sun,
  Sunrise,
  Sunset,
} from 'lucide-react';
import { DeliverySlot } from '../../../types';

interface AdminDeliverySlotsTabProps {
  deliverySlots: DeliverySlot[];
  onSaveSlot: (slot: DeliverySlot) => Promise<void>;
  onDeleteSlot: (slotId: string, slotName: string) => Promise<void>;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const AdminDeliverySlotsTab: React.FC<AdminDeliverySlotsTabProps> = ({
  deliverySlots,
  onSaveSlot,
  onDeleteSlot,
  showToast,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<DeliverySlot | null>(null);

  const [formData, setFormData] = useState({
    name: 'Morning Fresh Milk & Sweets',
    startTime: '06:30 AM',
    endTime: '09:30 AM',
    maxOrders: 50,
    cutoffTime: '05:00 AM',
    days: ['Daily'],
    isActive: true,
  });

  const handleOpenAdd = () => {
    setEditingSlot(null);
    setFormData({
      name: 'Morning Batch Dispatch',
      startTime: '07:00 AM',
      endTime: '10:00 AM',
      maxOrders: 60,
      cutoffTime: '06:00 AM',
      days: ['Daily'],
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (s: DeliverySlot) => {
    setEditingSlot(s);
    setFormData({
      name: s.name,
      startTime: s.startTime,
      endTime: s.endTime,
      maxOrders: s.maxOrders || 50,
      cutoffTime: s.cutoffTime || '06:00 AM',
      days: s.days || ['Daily'],
      isActive: s.isActive,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('Slot name is required', 'error');
      return;
    }

    const sId = editingSlot?.id || `slot-${Date.now()}`;
    const slotToSave: DeliverySlot = {
      id: sId,
      name: formData.name.trim(),
      startTime: formData.startTime.trim(),
      endTime: formData.endTime.trim(),
      maxOrders: Number(formData.maxOrders),
      cutoffTime: formData.cutoffTime.trim(),
      days: formData.days,
      isActive: formData.isActive,
    };

    await onSaveSlot(slotToSave);
    showToast(`Delivery slot "${slotToSave.name}" saved!`, 'success');
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
            Delivery Dispatch Windows
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-semibold border border-amber-200">
              {deliverySlots.length} windows
            </span>
          </h2>
          <p className="text-sm text-stone-500 mt-0.5">
            Set morning fresh milk, noon kitchen, and evening festive dispatch time slots with capacity limits
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 rounded-xl transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" />
          Add Time Slot
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {deliverySlots.map((slot) => {
          return (
            <div
              key={slot.id}
              className={`bg-white rounded-2xl border p-5 shadow-xs flex flex-col justify-between transition-colors ${
                slot.isActive ? 'border-stone-200/80 hover:border-amber-400' : 'border-stone-200 opacity-60'
              }`}
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-800 flex items-center justify-center">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-stone-900 text-sm">{slot.name}</h3>
                      <p className="text-xs text-amber-800 font-semibold">
                        {slot.startTime} - {slot.endTime}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      slot.isActive
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-stone-100 text-stone-600 border-stone-200'
                    }`}
                  >
                    {slot.isActive ? 'Active' : 'Disabled'}
                  </span>
                </div>

                <div className="mt-4 p-3 bg-stone-50 rounded-xl border border-stone-200/70 text-xs grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] text-stone-500 block">Cutoff Time:</span>
                    <span className="font-bold text-stone-900">{slot.cutoffTime || '1 hour prior'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-500 block">Max Orders Capacity:</span>
                    <span className="font-bold text-amber-900">{slot.maxOrders || 50} orders</span>
                  </div>
                  <div className="col-span-2 pt-1">
                    <span className="text-[10px] text-stone-500 block">Available Days:</span>
                    <span className="font-semibold text-stone-700">
                      {slot.days?.join(', ') || 'All Days'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-end gap-1.5">
                <button
                  onClick={() => handleOpenEdit(slot)}
                  className="p-1.5 rounded-lg text-stone-600 hover:text-amber-800 hover:bg-amber-50 transition-colors"
                  title="Edit Slot"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onDeleteSlot(slot.id, slot.name)}
                  className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  title="Delete Slot"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Slot Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 border border-stone-200 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="text-base font-bold text-stone-900">
                {editingSlot ? 'Edit Delivery Slot' : 'Add Delivery Slot'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 text-lg leading-none"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Slot Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Morning Fresh Milk Dispatch"
                  value={formData.name ?? ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-50 rounded-lg border border-stone-300 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Start Time *</label>
                  <input
                    type="text"
                    required
                    placeholder="07:00 AM"
                    value={formData.startTime ?? ''}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 rounded-lg border border-stone-300 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">End Time *</label>
                  <input
                    type="text"
                    required
                    placeholder="10:00 AM"
                    value={formData.endTime ?? ''}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 rounded-lg border border-stone-300 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    Order Cutoff Time
                  </label>
                  <input
                    type="text"
                    placeholder="06:00 AM"
                    value={formData.cutoffTime ?? ''}
                    onChange={(e) => setFormData({ ...formData, cutoffTime: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 rounded-lg border border-stone-300 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    Max Orders Capacity
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.maxOrders ?? 50}
                    onChange={(e) =>
                      setFormData({ ...formData, maxOrders: parseInt(e.target.value) || 50 })
                    }
                    className="w-full px-3 py-2 bg-stone-50 rounded-lg border border-stone-300 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="slot-active-check"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded text-amber-700 focus:ring-amber-500"
                />
                <label htmlFor="slot-active-check" className="font-semibold text-stone-800">
                  Slot is open for customer order checkout
                </label>
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
                  {editingSlot ? 'Update Slot' : 'Save Slot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
