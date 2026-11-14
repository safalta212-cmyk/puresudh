import React, { useState } from 'react';
import {
  Sparkles,
  Plus,
  Edit2,
  Trash2,
  Calendar,
  Layers,
  Package,
  CheckCircle2,
  XCircle,
  Percent,
  Flame,
  Gift,
  ShieldCheck,
  ShoppingBag,
  Tag,
} from 'lucide-react';
import { Offer, OfferType, Category, Product } from '../../../types';
import { MediaUploader } from '../../common/MediaUploader';

interface AdminOffersTabProps {
  offers: Offer[];
  categories: Category[];
  products: Product[];
  onSaveOffer: (offer: Offer) => Promise<void>;
  onDeleteOffer: (offerId: string, title: string) => Promise<void>;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

const OFFER_TYPE_CONFIG: Record<
  OfferType,
  { label: string; icon: React.FC<{ className?: string }>; color: string }
> = {
  todays_offers: { label: "Today's Offers", icon: Flame, color: 'text-amber-700 bg-amber-50 border-amber-200' },
  special_deals: { label: 'Special Deals', icon: Gift, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  festival_offers: { label: 'Festival Offers', icon: Sparkles, color: 'text-rose-700 bg-rose-50 border-rose-200' },
  new_customer: { label: 'New Customer Offers', icon: ShieldCheck, color: 'text-purple-700 bg-purple-50 border-purple-200' },
  product_offers: { label: 'Product Offers', icon: ShoppingBag, color: 'text-blue-700 bg-blue-50 border-blue-200' },
  category_offers: { label: 'Category Offers', icon: Percent, color: 'text-orange-700 bg-orange-50 border-orange-200' },
};

export const AdminOffersTab: React.FC<AdminOffersTabProps> = ({
  offers,
  categories,
  products,
  onSaveOffer,
  onDeleteOffer,
  showToast,
}) => {
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    discountText: '',
    badge: '',
    offerType: 'todays_offers' as OfferType,
    imageUrl: '',
    link: '/shop',
    code: '',
    terms: '',
    targetCategoryId: '',
    targetProductIds: [] as string[],
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 86400000 * 14).toISOString().split('T')[0],
    active: true,
  });

  const handleOpenAdd = (defaultType: OfferType = 'todays_offers') => {
    setEditingOffer(null);
    setFormData({
      title: '',
      subtitle: '',
      discountText: '',
      badge: '',
      offerType: defaultType,
      imageUrl: '',
      link: '/shop',
      code: '',
      terms: '',
      targetCategoryId: '',
      targetProductIds: [],
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 86400000 * 14).toISOString().split('T')[0],
      active: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (o: Offer) => {
    setEditingOffer(o);
    setFormData({
      title: o.title,
      subtitle: o.subtitle || '',
      discountText: o.discountText || '',
      badge: o.badge || '',
      offerType: o.offerType || 'todays_offers',
      imageUrl: o.bannerImage || o.imageUrl || '',
      link: o.link || '/shop',
      code: o.code || '',
      terms: (o.termsAndConditions || []).join('\n'),
      targetCategoryId: o.targetCategoryId || '',
      targetProductIds: o.targetProductIds || [],
      startDate: o.startDate ? o.startDate.split('T')[0] : '',
      endDate: o.endDate ? o.endDate.split('T')[0] : '',
      active: o.active,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      showToast('Offer title is required', 'error');
      return;
    }

    const offerId = editingOffer?.id || `ofr-${Date.now()}`;
    const offerToSave: Offer = {
      id: offerId,
      title: formData.title.trim(),
      subtitle: formData.subtitle.trim() || undefined,
      discountText: formData.discountText.trim() || undefined,
      badge: formData.badge.trim() || undefined,
      offerType: formData.offerType,
      imageUrl: formData.imageUrl.trim() || undefined,
      bannerImage: formData.imageUrl.trim() || undefined,
      link: formData.link.trim() || '/shop',
      code: formData.code.trim().toUpperCase() || undefined,
      termsAndConditions: formData.terms
        .split('\n')
        .map((t) => t.trim())
        .filter(Boolean),
      targetCategoryId: formData.targetCategoryId || undefined,
      targetProductIds: formData.targetProductIds.length > 0 ? formData.targetProductIds : undefined,
      startDate: formData.startDate ? new Date(formData.startDate).toISOString() : new Date().toISOString(),
      endDate: formData.endDate ? new Date(formData.endDate).toISOString() : new Date(Date.now() + 86400000 * 14).toISOString(),
      active: formData.active,
      createdAt: editingOffer?.createdAt || new Date().toISOString(),
    };

    await onSaveOffer(offerToSave);
    showToast(`Offer "${offerToSave.title}" saved successfully!`, 'success');
    setIsModalOpen(false);
  };

  const filteredOffers = offers.filter((o) => {
    if (selectedTypeFilter === 'all') return true;
    return o.offerType === selectedTypeFilter;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
            Marketing Offers & Deal Campaigns
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-semibold border border-amber-200">
              {offers.length} campaigns
            </span>
          </h2>
          <p className="text-sm text-stone-500 mt-0.5">
            Manage Today&apos;s Offers, Special Deals, Festival Offers, New Customer, Product, and Category campaigns.
          </p>
        </div>
        <button
          type="button"
          onClick={() => handleOpenAdd(selectedTypeFilter !== 'all' ? (selectedTypeFilter as OfferType) : 'todays_offers')}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 rounded-xl transition-colors shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Create Offer</span>
        </button>
      </div>

      {/* Offer Type Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          type="button"
          onClick={() => setSelectedTypeFilter('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
            selectedTypeFilter === 'all'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-100'
          }`}
        >
          All ({offers.length})
        </button>
        {(Object.keys(OFFER_TYPE_CONFIG) as OfferType[]).map((type) => {
          const cfg = OFFER_TYPE_CONFIG[type];
          const Icon = cfg.icon;
          const count = offers.filter((o) => o.offerType === type).length;
          const isSelected = selectedTypeFilter === type;

          return (
            <button
              key={type}
              type="button"
              onClick={() => setSelectedTypeFilter(type)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                isSelected
                  ? 'bg-amber-800 text-white shadow-xs'
                  : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-100'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{cfg.label}</span>
              <span className="opacity-70 text-[10px]">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Offers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredOffers.map((offer) => {
          const cfg = OFFER_TYPE_CONFIG[offer.offerType || 'todays_offers'];
          const Icon = cfg?.icon || Sparkles;

          return (
            <div
              key={offer.id}
              className={`bg-white rounded-2xl border p-5 shadow-xs flex flex-col justify-between transition-colors ${
                offer.active ? 'border-stone-200/80 hover:border-amber-400' : 'border-stone-200 opacity-70 bg-stone-50/50'
              }`}
            >
              <div>
                <div className="relative h-32 rounded-xl bg-stone-100 overflow-hidden mb-3">
                  <img
                    src={offer.bannerImage || offer.imageUrl || 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=600&q=80'}
                    alt={offer.title}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  {offer.badge && (
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-600 text-white shadow-xs">
                      {offer.badge}
                    </span>
                  )}
                  {offer.discountText && (
                    <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-lg text-[11px] font-black bg-white/95 text-stone-900 shadow-xs">
                      {offer.discountText}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 mb-1.5">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                      cfg?.color || 'text-stone-700 bg-stone-100 border-stone-200'
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    <span>{cfg?.label || offer.offerType}</span>
                  </span>
                  {offer.code && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-200">
                      Code: {offer.code}
                    </span>
                  )}
                </div>

                <h3 className="font-bold text-stone-900 text-sm mb-1">{offer.title}</h3>
                {offer.subtitle && (
                  <p className="text-xs text-stone-500 line-clamp-2 mb-2 leading-relaxed">
                    {offer.subtitle}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-stone-100 mt-2">
                <span className="text-[11px] font-medium text-stone-500">
                  {offer.active ? (
                    <span className="text-emerald-700 font-bold">● Active in Store</span>
                  ) : (
                    <span className="text-stone-400">○ Inactive</span>
                  )}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(offer)}
                    className="p-1.5 text-stone-500 hover:text-amber-700 hover:bg-stone-100 rounded-lg transition cursor-pointer"
                    title="Edit Offer"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Delete offer "${offer.title}"?`)) {
                        onDeleteOffer(offer.id, offer.title);
                      }
                    }}
                    className="p-1.5 text-stone-500 hover:text-rose-700 hover:bg-stone-100 rounded-lg transition cursor-pointer"
                    title="Delete Offer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal for Creating / Editing Offers */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-xl shadow-xl border border-stone-200 overflow-hidden my-8">
            <div className="p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50/70">
              <h3 className="font-bold text-stone-900 text-base">
                {editingOffer ? 'Edit Marketing Offer' : 'Create New Marketing Offer'}
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
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Offer Type *
                </label>
                <select
                  value={formData.offerType ?? 'todays_offers'}
                  onChange={(e) =>
                    setFormData({ ...formData, offerType: e.target.value as OfferType })
                  }
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  <option value="todays_offers">Today&apos;s Offers</option>
                  <option value="special_deals">Special Deals</option>
                  <option value="festival_offers">Festival Offers</option>
                  <option value="new_customer">New Customer Offers</option>
                  <option value="product_offers">Product Offers</option>
                  <option value="category_offers">Category Offers</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title ?? ''}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Traditional Thekua & Cow Ghee Combo"
                  required
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Subtitle
                </label>
                <input
                  type="text"
                  value={formData.subtitle ?? ''}
                  onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                  placeholder="e.g. Save ₹50 on freshly prepared traditional treats"
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Discount Highlight Badge
                  </label>
                  <input
                    type="text"
                    value={formData.discountText ?? ''}
                    onChange={(e) => setFormData({ ...formData, discountText: e.target.value })}
                    placeholder="e.g. Flat 20% OFF"
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Attached Coupon Code
                  </label>
                  <input
                    type="text"
                    value={formData.code ?? ''}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="e.g. PURE50"
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm font-mono font-bold uppercase focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <MediaUploader
                  preset="banner"
                  pathParams={{ bannerId: formData.id || 'new' }}
                  currentImageUrl={formData.imageUrl}
                  onImageUploaded={(url) => setFormData({ ...formData, imageUrl: url })}
                  label="Upload Offer Banner Image"
                  compact
                />
              </div>

              {/* Target Category if category_offers */}
              {formData.offerType === 'category_offers' && (
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Target Category
                  </label>
                  <select
                    value={formData.targetCategoryId ?? ''}
                    onChange={(e) => setFormData({ ...formData, targetCategoryId: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  >
                    <option value="">Select a Category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Terms & Conditions (One per line)
                </label>
                <textarea
                  rows={2}
                  value={formData.terms ?? ''}
                  onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                  placeholder="e.g. Min order ₹299&#10;Valid across Patna delivery areas"
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-stone-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    className="w-4 h-4 rounded-md border-stone-300 text-amber-600 focus:ring-amber-500"
                  />
                  <span>Active & visible on Offers page and store banners</span>
                </label>
              </div>

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
                  className="px-5 py-2 text-xs font-bold text-white bg-amber-800 hover:bg-amber-900 rounded-xl transition shadow-xs cursor-pointer"
                >
                  {editingOffer ? 'Update Offer' : 'Create Offer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
