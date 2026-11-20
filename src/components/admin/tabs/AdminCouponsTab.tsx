import React, { useState } from 'react';
import {
  Tag,
  Plus,
  Edit2,
  Trash2,
  Percent,
  Calendar,
  CheckCircle2,
  XCircle,
  Copy,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Users,
  ShoppingBag,
  Sparkles,
  Layers,
  ChevronDown,
} from 'lucide-react';
import { Coupon, Category, Product } from '../../../types';
import { formatFirestorePermissionMessage } from '../../../firebase/config';

interface AdminCouponsTabProps {
  coupons: Coupon[];
  categories?: Category[];
  products?: Product[];
  onSaveCoupon: (coupon: Coupon) => Promise<void>;
  onDeleteCoupon: (couponId: string, code: string) => Promise<void>;
  onToggleCouponStatus?: (couponId: string, currentStatus: boolean) => Promise<void>;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const AdminCouponsTab: React.FC<AdminCouponsTabProps> = ({
  coupons,
  categories = [] as Category[],
  products = [] as Product[],
  onSaveCoupon,
  onDeleteCoupon,
  onToggleCouponStatus,
  showToast,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    code: '',
    discountType: 'percentage' as 'percentage' | 'fixed',
    discountValue: 15,
    minOrderAmount: 299,
    maxDiscount: 100,
    description: '',
    startDate: new Date().toISOString().split('T')[0],
    expiryDate: new Date(Date.now() + 86400000 * 30).toISOString().split('T')[0],
    usageLimit: 500,
    perUserLimit: 1,
    firstOrderOnly: false,
    restrictedProductIds: [] as string[],
    restrictedCategoryIds: [] as string[],
    active: true,
  });

  const handleOpenAdd = () => {
    setEditingCoupon(null);
    setFormData({
      code: '',
      discountType: 'percentage',
      discountValue: 15,
      minOrderAmount: 299,
      maxDiscount: 100,
      description: 'Authentic festival discount on fresh rural Bihari delicacies',
      startDate: new Date().toISOString().split('T')[0],
      expiryDate: new Date(Date.now() + 86400000 * 30).toISOString().split('T')[0],
      usageLimit: 500,
      perUserLimit: 1,
      firstOrderOnly: false,
      restrictedProductIds: [],
      restrictedCategoryIds: [],
      active: true,
    });
    setIsModalOpen(true);
  };

  const handlePresetPure50 = () => {
    setEditingCoupon(null);
    setFormData({
      code: 'PURE50',
      discountType: 'fixed',
      discountValue: 50,
      minOrderAmount: 299,
      maxDiscount: 50,
      description: 'Flat ₹50 OFF on orders above ₹299 (Sample Promo Code)',
      startDate: new Date().toISOString().split('T')[0],
      expiryDate: new Date(Date.now() + 86400000 * 30).toISOString().split('T')[0],
      usageLimit: 500,
      perUserLimit: 1,
      firstOrderOnly: false,
      restrictedProductIds: [],
      restrictedCategoryIds: [],
      active: false, // Sample coupons inactive in production by default
    });
    setIsModalOpen(true);
    showToast('Loaded PURE50 preset (Default inactive for production safety)', 'info');
  };

  const handlePresetFirstOrder = () => {
    setEditingCoupon(null);
    setFormData({
      code: 'FIRSTORDER',
      discountType: 'percentage',
      discountValue: 20,
      minOrderAmount: 199,
      maxDiscount: 100,
      description: 'Welcome 20% OFF on your very first order (Max ₹100)',
      startDate: new Date().toISOString().split('T')[0],
      expiryDate: new Date(Date.now() + 86400000 * 60).toISOString().split('T')[0],
      usageLimit: 1000,
      perUserLimit: 1,
      firstOrderOnly: true,
      restrictedProductIds: [],
      restrictedCategoryIds: [],
      active: false, // Sample coupons inactive in production by default
    });
    setIsModalOpen(true);
    showToast('Loaded FIRSTORDER preset (Default inactive for production safety)', 'info');
  };

  const handleOpenEdit = (c: Coupon) => {
    setEditingCoupon(c);
    const startRaw = c.validFrom || c.startDate;
    const endRaw = c.validUntil || c.validTill || c.expiryDate;
    setFormData({
      code: c.code,
      discountType: (c.discountType === 'flat' ? 'fixed' : c.discountType) as 'percentage' | 'fixed',
      discountValue: c.discountValue,
      minOrderAmount: c.minOrderAmount ?? c.minimumOrder ?? 0,
      maxDiscount: c.maxDiscount || 0,
      description: c.description || '',
      startDate: startRaw ? startRaw.split('T')[0] : new Date().toISOString().split('T')[0],
      expiryDate: endRaw ? endRaw.split('T')[0] : '',
      usageLimit: c.usageLimit || 100,
      perUserLimit: c.perUserLimit ?? c.perCustomerLimit ?? 1,
      firstOrderOnly: Boolean(c.firstOrderOnly),
      restrictedProductIds: c.restrictedProductIds || c.productRestrictions || [],
      restrictedCategoryIds: c.restrictedCategoryIds || c.categoryRestrictions || [],
      active: c.active !== false,
    });
    setIsModalOpen(true);
  };

  const handleCodeChange = (val: string) => {
    setFormData((prev) => ({
      ...prev,
      code: val.toUpperCase().replace(/[^A-Z0-9_]/g, ''),
    }));
  };

  const toggleCategoryRestriction = (catId: string) => {
    setFormData((prev) => {
      const exists = prev.restrictedCategoryIds.includes(catId);
      return {
        ...prev,
        restrictedCategoryIds: exists
          ? prev.restrictedCategoryIds.filter((id) => id !== catId)
          : [...prev.restrictedCategoryIds, catId],
      };
    });
  };

  const toggleProductRestriction = (prodId: string) => {
    setFormData((prev) => {
      const exists = prev.restrictedProductIds.includes(prodId);
      return {
        ...prev,
        restrictedProductIds: exists
          ? prev.restrictedProductIds.filter((id) => id !== prodId)
          : [...prev.restrictedProductIds, prodId],
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code.trim()) {
      showToast('Coupon code is required', 'error');
      return;
    }

    const cId = editingCoupon?.id || `cpn-${formData.code.toLowerCase()}`;
    const validFromIso = formData.startDate ? new Date(formData.startDate).toISOString() : new Date().toISOString();
    const validUntilIso = formData.expiryDate ? new Date(formData.expiryDate).toISOString() : new Date(Date.now() + 86400000 * 30).toISOString();
    const minOrderNum = Number(formData.minOrderAmount) || 0;
    const perUserNum = Number(formData.perUserLimit) || 1;
    const prodRestricts = formData.restrictedProductIds.length > 0 ? formData.restrictedProductIds : undefined;
    const catRestricts = formData.restrictedCategoryIds.length > 0 ? formData.restrictedCategoryIds : undefined;

    const couponToSave: Coupon = {
      id: cId,
      code: formData.code.trim().toUpperCase(),
      discountType: formData.discountType,
      discountValue: Number(formData.discountValue),
      minOrderAmount: minOrderNum,
      minimumOrder: minOrderNum,
      maxDiscount: formData.discountType === 'percentage' && Number(formData.maxDiscount) > 0 ? Number(formData.maxDiscount) : undefined,
      description: formData.description.trim(),
      validFrom: validFromIso,
      startDate: validFromIso,
      validUntil: validUntilIso,
      validTill: validUntilIso,
      expiryDate: validUntilIso,
      usageLimit: Number(formData.usageLimit) || 100,
      usageCount: editingCoupon?.usageCount || 0,
      perUserLimit: perUserNum,
      perCustomerLimit: perUserNum,
      firstOrderOnly: formData.firstOrderOnly,
      restrictedProductIds: prodRestricts,
      productRestrictions: prodRestricts,
      restrictedCategoryIds: catRestricts,
      categoryRestrictions: catRestricts,
      active: formData.active,
      createdAt: editingCoupon?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setSubmitting(true);
    try {
      await onSaveCoupon(couponToSave);
      showToast(`Coupon "${couponToSave.code}" saved successfully!`, 'success');
      setIsModalOpen(false);
    } catch (err: any) {
      showToast(formatFirestorePermissionMessage(err, 'Failed to save coupon'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleCoupon = async (coupon: Coupon) => {
    if (!onToggleCouponStatus) return;
    setTogglingId(coupon.id);
    try {
      await onToggleCouponStatus(coupon.id, !coupon.active);
    } catch (err: any) {
      showToast(formatFirestorePermissionMessage(err, 'Failed to update coupon status'), 'error');
    } finally {
      setTogglingId(null);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    showToast(`Copied "${code}" to clipboard!`, 'info');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-stone-900">
              Promotional Coupons & Abuse Prevention
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-semibold border border-amber-200">
              {coupons.length} codes
            </span>
          </div>
          <p className="text-sm text-stone-500 mt-0.5">
            Manage percentage & fixed discounts, min orders, max caps, date windows, product/category rules, and customer limits.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Preset Buttons */}
          <button
            type="button"
            onClick={handlePresetPure50}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 rounded-xl border border-amber-200 transition cursor-pointer"
            title="Load standard ₹50 sample code"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Preset: PURE50</span>
          </button>

          <button
            type="button"
            onClick={handlePresetFirstOrder}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 rounded-xl border border-amber-200 transition cursor-pointer"
            title="Load First-Order 20% discount code"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Preset: FIRSTORDER</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 rounded-xl transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Coupon</span>
          </button>
        </div>
      </div>

      {/* Production Safety Banner */}
      <div className="bg-stone-50 rounded-2xl border border-stone-200 p-4 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
        <div className="text-xs text-stone-600 leading-relaxed">
          <span className="font-bold text-stone-800">Coupon Abuse & Production Safety Active:</span>{' '}
          Sample coupons (like <code>PURE50</code> and <code>FIRSTORDER</code>) are not automatically activated in production without admin toggle. Every redemption checks per-customer limits, first-order validation, and product/category restrictions to prevent abuse.
        </div>
      </div>

      {/* Coupons Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {coupons.map((coupon) => {
          const effectiveUntil = coupon.validUntil || coupon.validTill || coupon.expiryDate;
          const effectiveFrom = coupon.validFrom || coupon.startDate;
          const effectiveMinOrder = coupon.minOrderAmount ?? coupon.minimumOrder ?? 0;
          const effectivePerUser = coupon.perUserLimit ?? coupon.perCustomerLimit ?? 1;
          const effectiveCatRestrict = coupon.restrictedCategoryIds || coupon.categoryRestrictions || [];
          const effectiveProdRestrict = coupon.restrictedProductIds || coupon.productRestrictions || [];
          const isExpired = effectiveUntil && new Date(effectiveUntil) < new Date();
          const isUpcoming = effectiveFrom && new Date(effectiveFrom) > new Date();

          return (
            <div
              key={coupon.id}
              className={`bg-white rounded-2xl border p-5 shadow-xs flex flex-col justify-between transition-colors ${
                coupon.active && !isExpired && !isUpcoming
                  ? 'border-stone-200/80 hover:border-amber-400'
                  : 'border-stone-200 opacity-80 bg-stone-50/50'
              }`}
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopyCode(coupon.code)}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-mono font-extrabold text-sm transition cursor-pointer"
                    >
                      <span>{coupon.code}</span>
                      <Copy className="w-3.5 h-3.5 text-amber-700" />
                    </button>
                    {coupon.firstOrderOnly && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 text-purple-800">
                        1st Order
                      </span>
                    )}
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                      coupon.active && !isExpired && !isUpcoming
                        ? 'bg-emerald-100 text-emerald-800'
                        : isExpired
                        ? 'bg-rose-100 text-rose-800'
                        : isUpcoming
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-stone-200 text-stone-600'
                    }`}
                  >
                    {coupon.active && !isExpired && !isUpcoming ? (
                      <>
                        <CheckCircle2 className="w-3 h-3" /> Active
                      </>
                    ) : isExpired ? (
                      <>
                        <XCircle className="w-3 h-3" /> Expired
                      </>
                    ) : isUpcoming ? (
                      <>
                        <Clock className="w-3 h-3" /> Scheduled
                      </>
                    ) : (
                      'Inactive'
                    )}
                  </span>
                </div>

                {/* Discount Summary */}
                <div className="mb-2">
                  <div className="text-lg font-black text-amber-900 flex items-center gap-1">
                    {coupon.discountType === 'percentage' ? (
                      <>
                        <span>{coupon.discountValue}% OFF</span>
                        {coupon.maxDiscount && (
                          <span className="text-xs font-normal text-stone-500">
                            (Up to ₹{coupon.maxDiscount})
                          </span>
                        )}
                      </>
                    ) : (
                      <span>Flat ₹{coupon.discountValue} OFF</span>
                    )}
                  </div>
                  {coupon.description && (
                    <p className="text-xs text-stone-600 line-clamp-2 mt-1 leading-relaxed">
                      {coupon.description}
                    </p>
                  )}
                </div>

                {/* Restrictions & Abuse Guardrails Pills */}
                <div className="space-y-1.5 py-3 my-2 border-y border-stone-100 text-[11px] text-stone-600">
                  <div className="flex items-center justify-between">
                    <span className="text-stone-500">Min. Order:</span>
                    <span className="font-semibold text-stone-800">₹{effectiveMinOrder}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-stone-500">Usage Cap / Used:</span>
                    <span className="font-semibold text-stone-800">
                      {coupon.usageCount || 0} / {coupon.usageLimit || '∞'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-stone-500">Per-Customer Limit:</span>
                    <span className="font-semibold text-stone-800">
                      {effectivePerUser} time(s)
                    </span>
                  </div>

                  {effectiveUntil && (
                    <div className="flex items-center justify-between">
                      <span className="text-stone-500">Expiry:</span>
                      <span className="font-semibold text-stone-800">
                        {new Date(effectiveUntil).toLocaleDateString()}
                      </span>
                    </div>
                  )}

                  {effectiveCatRestrict.length > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-stone-500">Categories:</span>
                      <span className="font-semibold text-amber-800">
                        {effectiveCatRestrict.length} restricted
                      </span>
                    </div>
                  )}

                  {effectiveProdRestrict.length > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-stone-500">Products:</span>
                      <span className="font-semibold text-amber-800">
                        {effectiveProdRestrict.length} restricted
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-stone-100">
                {onToggleCouponStatus && (
                  <button
                    type="button"
                    disabled={togglingId === coupon.id}
                    onClick={() => handleToggleCoupon(coupon)}
                    className="text-xs font-semibold text-stone-600 hover:text-stone-900 disabled:opacity-50 transition cursor-pointer"
                  >
                    {togglingId === coupon.id
                      ? 'Updating...'
                      : coupon.active
                      ? 'Deactivate'
                      : 'Activate'}
                  </button>
                )}

                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(coupon)}
                    className="p-1.5 text-stone-500 hover:text-amber-700 hover:bg-stone-100 rounded-lg transition cursor-pointer"
                    title="Edit Coupon"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteCoupon(coupon.id, coupon.code)}
                    className="p-1.5 text-stone-500 hover:text-rose-700 hover:bg-stone-100 rounded-lg transition cursor-pointer"
                    title="Delete Coupon"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl border border-stone-200 overflow-hidden my-8">
            <div className="p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50/70">
              <h3 className="font-bold text-stone-900 text-base">
                {editingCoupon ? `Edit Coupon: ${editingCoupon.code}` : 'Create New Promotional Coupon'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Coupon Code *
                  </label>
                  <input
                    type="text"
                    value={formData.code ?? ''}
                    onChange={(e) => handleCodeChange(e.target.value)}
                    placeholder="e.g. PURE50"
                    required
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm font-mono font-bold uppercase focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Discount Type *
                  </label>
                  <select
                    value={formData.discountType ?? 'percentage'}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        discountType: e.target.value as 'percentage' | 'fixed',
                      })
                    }
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  >
                    <option value="percentage">Percentage Discount (%)</option>
                    <option value="fixed">Fixed Discount (₹)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    {formData.discountType === 'percentage' ? 'Discount % *' : 'Discount (₹) *'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={formData.discountType === 'percentage' ? 100 : 5000}
                    value={formData.discountValue ?? 0}
                    onChange={(e) =>
                      setFormData({ ...formData, discountValue: Number(e.target.value) || 0 })
                    }
                    required
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Minimum Order (₹) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.minOrderAmount ?? 0}
                    onChange={(e) =>
                      setFormData({ ...formData, minOrderAmount: Number(e.target.value) || 0 })
                    }
                    required
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Max Discount Cap (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    disabled={formData.discountType === 'fixed'}
                    value={formData.maxDiscount ?? 0}
                    onChange={(e) =>
                      setFormData({ ...formData, maxDiscount: Number(e.target.value) || 0 })
                    }
                    placeholder="Leave 0 for no cap"
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none disabled:bg-stone-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Public Description
                </label>
                <input
                  type="text"
                  value={formData.description ?? ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g. Save ₹50 on authentic Desi Ghee & Fresh Paneer"
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              {/* Date Ranges */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.startDate ?? ''}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    value={formData.expiryDate ?? ''}
                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Limits & Abuse Prevention */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-stone-50 rounded-xl border border-stone-200">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Total Usage Limit
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.usageLimit ?? 100}
                    onChange={(e) =>
                      setFormData({ ...formData, usageLimit: Number(e.target.value) || 1 })
                    }
                    className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-stone-500">Max times this coupon can be redeemed across store</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Per-Customer Limit (Abuse Prevention)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.perUserLimit ?? 1}
                    onChange={(e) =>
                      setFormData({ ...formData, perUserLimit: Number(e.target.value) || 1 })
                    }
                    className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-stone-500">Maximum redemptions allowed per customer account</span>
                </div>
              </div>

              {/* Category & Product Restrictions */}
              {categories.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Category Restriction (Optional)
                  </label>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 bg-stone-50 rounded-xl border border-stone-200">
                    {categories.map((cat: Category) => {
                      const isSelected = formData.restrictedCategoryIds.includes(cat.id);
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => toggleCategoryRestriction(cat.id)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                            isSelected
                              ? 'bg-amber-800 text-white shadow-xs'
                              : 'bg-white text-stone-700 border border-stone-300 hover:bg-stone-100'
                          }`}
                        >
                          {cat.name}
                        </button>
                      );
                    })}
                  </div>
                  <span className="text-[10px] text-stone-500">
                    If selected, discount applies only when cart contains items from these categories
                  </span>
                </div>
              )}

              {products.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Product Restriction (Optional)
                  </label>
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2 bg-stone-50 rounded-xl border border-stone-200">
                    {products.map((prod: Product) => {
                      const isSelected = formData.restrictedProductIds.includes(prod.id);
                      return (
                        <button
                          key={prod.id}
                          type="button"
                          onClick={() => toggleProductRestriction(prod.id)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                            isSelected
                              ? 'bg-amber-800 text-white shadow-xs'
                              : 'bg-white text-stone-700 border border-stone-300 hover:bg-stone-100'
                          }`}
                        >
                          {prod.name}
                        </button>
                      );
                    })}
                  </div>
                  <span className="text-[10px] text-stone-500">
                    Restrict coupon validity to specific products ({formData.restrictedProductIds.length} selected)
                  </span>
                </div>
              )}

              {/* Checkbox Flags */}
              <div className="flex flex-col sm:flex-row gap-4 pt-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-stone-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.firstOrderOnly}
                    onChange={(e) =>
                      setFormData({ ...formData, firstOrderOnly: e.target.checked })
                    }
                    className="w-4 h-4 rounded-md border-stone-300 text-amber-600 focus:ring-amber-500"
                  />
                  <span>First-Time Customer Orders Only</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-semibold text-stone-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.active}
                    onChange={(e) =>
                      setFormData({ ...formData, active: e.target.checked })
                    }
                    className="w-4 h-4 rounded-md border-stone-300 text-amber-600 focus:ring-amber-500"
                  />
                  <span>Active & Ready for Checkout</span>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-amber-800 hover:bg-amber-900 disabled:opacity-50 rounded-xl transition shadow-xs cursor-pointer"
                >
                  {submitting ? 'Saving...' : editingCoupon ? 'Update Coupon' : 'Create Coupon'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
