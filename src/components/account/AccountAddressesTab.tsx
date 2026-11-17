import React, { useState } from 'react';
import {
  MapPin,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  Home,
  Briefcase,
  Navigation,
  AlertCircle,
  Check,
} from 'lucide-react';
import { Address } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { AddressLocationPickerModal } from '../maps/AddressLocationPickerModal';
import { PATNA_PINCODES } from '../../utils/deliveryRules';
import {
  isTemporaryOrFakePhone,
  normalizeIndianPhone10,
  sanitizePhoneInput10,
  formatIndianPhone,
} from '../../validation';

interface AccountAddressesTabProps {
  addresses: Address[];
  onUpdateAddresses: (addresses: Address[]) => Promise<void>;
}

export const AccountAddressesTab: React.FC<AccountAddressesTabProps> = ({
  addresses,
  onUpdateAddresses,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showMapPicker, setShowMapPicker] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [landmark, setLandmark] = useState('');
  const [city, setCity] = useState('Patna');
  const [state, setState] = useState('Bihar');
  const [pincode, setPincode] = useState('800001');
  const [type, setType] = useState<'home' | 'work' | 'other'>('home');
  const [isDefault, setIsDefault] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [addressToDelete, setAddressToDelete] = useState<Address | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const resetForm = () => {
    setName(user?.displayName || '');
    setPhone(normalizeIndianPhone10(user?.phone || ''));
    setAddressLine('');
    setLandmark('');
    setCity('Patna');
    setState('Bihar');
    setPincode('800001');
    setType('home');
    setIsDefault(addresses.length === 0);
    setEditingId(null);
    setFormError(null);
  };

  const openAddModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (addr: Address) => {
    setEditingId(addr.id);
    setName(addr.name || user?.displayName || '');
    setPhone(normalizeIndianPhone10(addr.phone || ''));
    setAddressLine(addr.addressLine || addr.address || '');
    setLandmark(addr.landmark || '');
    setCity(addr.city || 'Patna');
    setState(addr.state || 'Bihar');
    setPincode(addr.pincode || '800001');
    setType(addr.type || 'home');
    setIsDefault(!!addr.isDefault);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSetDefault = async (addressId: string) => {
    const updated = addresses.map((a) => ({
      ...a,
      isDefault: a.id === addressId,
    }));
    await onUpdateAddresses(updated);
    showToast('Default delivery address updated.', 'success');
  };

  const handleDeleteConfirm = async () => {
    if (!addressToDelete) return;
    setIsDeleting(true);
    try {
      const remaining = addresses.filter((a) => a.id !== addressToDelete.id);
      if (remaining.length > 0 && !remaining.some((a) => a.isDefault)) {
        remaining[0] = { ...remaining[0], isDefault: true };
      }
      await onUpdateAddresses(remaining);
      showToast('Address removed.', 'info');
      setAddressToDelete(null);
    } catch {
      showToast('Failed to delete address.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !addressLine.trim() || !pincode.trim()) {
      setFormError('Please fill in all required fields.');
      return;
    }

    const phoneCheck = isTemporaryOrFakePhone(phone);
    if (phoneCheck.isFake) {
      setFormError(phoneCheck.reason || 'Please enter a valid 10-digit Indian mobile number (+91).');
      return;
    }

    setIsSaving(true);
    setFormError(null);

    try {
      const newAddress: Address = {
        id: editingId || `addr-${Date.now()}`,
        name: name.trim(),
        phone: formatIndianPhone(phone),
        addressLine: addressLine.trim(),
        address: addressLine.trim(),
        landmark: landmark.trim(),
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
        type,
        isDefault: isDefault || addresses.length === 0,
      };

      let updatedList: Address[];
      if (editingId) {
        updatedList = addresses.map((a) => (a.id === editingId ? newAddress : a));
      } else {
        updatedList = [...addresses, newAddress];
      }

      // If set as default, clear default from others
      if (newAddress.isDefault) {
        updatedList = updatedList.map((a) => ({
          ...a,
          isDefault: a.id === newAddress.id,
        }));
      }

      await onUpdateAddresses(updatedList);
      showToast(editingId ? 'Address updated successfully!' : 'New address added!', 'success');
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Failed to save address.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLocationPicked = (loc: {
    lat: number;
    lng: number;
    formattedAddress?: string;
    pincode?: string;
    city?: string;
  }) => {
    if (loc.formattedAddress) {
      setAddressLine(loc.formattedAddress);
    }
    if (loc.pincode) {
      setPincode(loc.pincode);
    }
    if (loc.city) {
      setCity(loc.city);
    }
    setShowMapPicker(false);
    showToast('Address pin located on map!', 'success');
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-stone-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-stone-900 text-base sm:text-lg flex items-center gap-2">
            <MapPin className="w-5 h-5 text-amber-700" />
            Saved Delivery Addresses
          </h3>
          <p className="text-xs text-stone-500 mt-0.5">
            Manage home and work addresses for instant 30-45 min delivery in Patna.
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="bg-amber-800 hover:bg-amber-900 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add New Address
        </button>
      </div>

      {/* Address Cards Grid */}
      {addresses.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 sm:p-14 text-center border border-stone-200 space-y-3">
          <MapPin className="w-12 h-12 text-stone-300 mx-auto" />
          <h4 className="font-bold text-stone-900 text-base">No Saved Addresses</h4>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            Add your primary residence or work address for seamless one-tap checkout.
          </p>
          <button
            type="button"
            onClick={openAddModal}
            className="bg-amber-800 hover:bg-amber-900 text-white font-semibold text-xs px-5 py-2.5 rounded-xl transition cursor-pointer"
          >
            Add Address Now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {addresses.map((addr) => (
            <div
              key={addr.id}
              className={`bg-white p-5 rounded-3xl border transition shadow-xs flex flex-col justify-between gap-4 relative ${
                addr.isDefault ? 'border-amber-700 ring-2 ring-amber-100' : 'border-stone-200 hover:border-stone-300'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-stone-100 text-stone-700">
                      {addr.type === 'work' ? (
                        <Briefcase className="w-3.5 h-3.5" />
                      ) : (
                        <Home className="w-3.5 h-3.5" />
                      )}
                    </span>
                    <span className="font-bold text-stone-900 text-sm">{addr.name}</span>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-stone-100 text-stone-700">
                      {addr.type || 'Home'}
                    </span>
                  </div>

                  {addr.isDefault ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Default Address
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSetDefault(addr.id)}
                      className="text-[11px] font-semibold text-stone-500 hover:text-amber-800 transition cursor-pointer"
                    >
                      Set as Default
                    </button>
                  )}
                </div>

                <p className="text-xs text-stone-600 leading-relaxed pt-1">
                  {addr.addressLine || addr.address}
                  {addr.landmark && `, Near ${addr.landmark}`}
                </p>

                <p className="text-xs font-mono text-stone-700">
                  {addr.city || 'Patna'}, {addr.state || 'Bihar'} - <span className="font-bold">{addr.pincode}</span>
                </p>

                <p className="text-xs text-stone-500">📞 {formatIndianPhone(addr.phone)}</p>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => openEditModal(addr)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-700 transition flex items-center gap-1 cursor-pointer"
                >
                  <Edit2 className="w-3 h-3" />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => setAddressToDelete(addr)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 transition flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Address Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full border border-stone-200 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h4 className="font-bold text-stone-900 text-base">
                {editingId ? 'Edit Delivery Address' : 'Add New Address'}
              </h4>
              <button
                type="button"
                onClick={() => setShowMapPicker(true)}
                className="text-xs font-semibold text-amber-800 hover:text-amber-900 flex items-center gap-1 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 cursor-pointer"
              >
                <Navigation className="w-3.5 h-3.5" />
                Pick on Map
              </button>
            </div>

            <form onSubmit={handleSaveAddress} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    value={name ?? ''}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Recipient's Name"
                    className="w-full p-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Mobile Number (India +91) *</label>
                  <div className="flex items-stretch">
                    <span className="inline-flex items-center px-2.5 bg-stone-100 border border-r-0 border-stone-300 rounded-l-xl text-xs font-bold text-stone-700 select-none">
                      +91
                    </span>
                    <input
                      type="tel"
                      inputMode="numeric"
                      value={phone ?? ''}
                      onChange={(e) => setPhone(sanitizePhoneInput10(e.target.value))}
                      required
                      maxLength={10}
                      placeholder="10-digit mobile"
                      className="w-full p-2.5 rounded-r-xl border border-stone-300 focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Flat, House No., Apartment & Street *
                </label>
                <textarea
                  value={addressLine ?? ''}
                  onChange={(e) => setAddressLine(e.target.value)}
                  required
                  rows={2}
                  placeholder="e.g. Flat 304, Ganga View Apts, Bailey Road"
                  className="w-full p-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Landmark (Optional)</label>
                  <input
                    type="text"
                    value={landmark ?? ''}
                    onChange={(e) => setLandmark(e.target.value)}
                    placeholder="e.g. Near Saguna More"
                    className="w-full p-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Pincode *</label>
                  <input
                    type="text"
                    value={pincode ?? ''}
                    onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    required
                    placeholder="800001"
                    className="w-full p-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-amber-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">City</label>
                  <input
                    type="text"
                    value={city ?? ''}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-stone-300 bg-stone-50"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">State</label>
                  <input
                    type="text"
                    value={state ?? ''}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-stone-300 bg-stone-50"
                  />
                </div>
              </div>

              {/* Address Type */}
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Address Label</label>
                <div className="flex gap-2">
                  {(['home', 'work', 'other'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setType(t)}
                      className={`px-3 py-1.5 rounded-xl font-bold uppercase text-[10px] transition cursor-pointer ${
                        type === t
                          ? 'bg-amber-800 text-white shadow-xs'
                          : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Default Checkbox */}
              <label className="flex items-center gap-2 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="rounded text-amber-700 focus:ring-amber-500 w-4 h-4"
                />
                <span className="font-semibold text-stone-700 text-xs">
                  Set as default delivery address
                </span>
              </label>

              {formError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSaving}
                  className="px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl bg-amber-800 hover:bg-amber-900 text-white font-bold text-xs transition cursor-pointer shadow-xs"
                >
                  {isSaving ? 'Saving...' : editingId ? 'Update Address' : 'Save Address'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Map Location Picker Modal */}
      {showMapPicker && (
        <AddressLocationPickerModal
          isOpen={showMapPicker}
          onClose={() => setShowMapPicker(false)}
          onSelectAddress={handleLocationPicked}
          onSelectLocation={handleLocationPicked}
          onLocationSelect={handleLocationPicked}
          initialPincode={pincode}
        />
      )}
      {/* Delete Address Confirmation Modal */}
      {addressToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full border border-stone-200 shadow-2xl space-y-4">
            <h4 className="font-bold text-stone-900 text-base">Delete Delivery Address?</h4>
            <p className="text-xs text-stone-600 leading-relaxed">
              Remove <strong>{addressToDelete.name}</strong> ({addressToDelete.pincode}) from your saved delivery addresses?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setAddressToDelete(null)}
                className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold text-xs transition cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteConfirm}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete Address'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
