import React, { useState } from 'react';
import {
  Image as ImageIcon,
  Plus,
  Edit2,
  Trash2,
  ExternalLink,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { OfferBanner } from '../../../types';
import { MediaUploader } from '../../common/MediaUploader';

interface AdminBannersTabProps {
  banners: OfferBanner[];
  onSaveBanner: (banner: OfferBanner) => Promise<void>;
  onDeleteBanner: (bannerId: string, title: string) => Promise<void>;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const AdminBannersTab: React.FC<AdminBannersTabProps> = ({
  banners,
  onSaveBanner,
  onDeleteBanner,
  showToast,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<OfferBanner | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    tag: '',
    imageUrl: '',
    link: '/shop',
    buttonText: 'Order Fresh Now',
    displayOrder: 1,
    active: true,
  });

  const handleOpenAdd = () => {
    setEditingBanner(null);
    setFormData({
      title: '',
      subtitle: '',
      tag: '',
      imageUrl: '',
      link: '/shop',
      buttonText: 'Order Fresh Now',
      displayOrder: banners.length + 1,
      active: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (b: OfferBanner) => {
    setEditingBanner(b);
    setFormData({
      title: b.title,
      subtitle: b.subtitle || '',
      tag: b.tag || '',
      imageUrl: b.imageUrl,
      link: b.link || '/shop',
      buttonText: b.buttonText || 'Shop Now',
      displayOrder: b.displayOrder || 1,
      active: b.active,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title?.trim()) {
      showToast('Banner title is required', 'error');
      return;
    }
    if (!formData.imageUrl || !formData.imageUrl.trim()) {
      showToast('Please upload a banner image', 'error');
      return;
    }

    const bId = editingBanner?.id || `ban-${Date.now()}`;
    const bannerToSave: OfferBanner = {
      id: bId,
      title: formData.title.trim(),
      subtitle: formData.subtitle?.trim() || undefined,
      tag: formData.tag?.trim() || undefined,
      imageUrl: formData.imageUrl.trim(),
      link: formData.link?.trim() || '/shop',
      buttonText: formData.buttonText?.trim() || 'Shop Now',
      displayOrder: Number(formData.displayOrder) || 1,
      active: formData.active,
    };

    await onSaveBanner(bannerToSave);
    showToast(`Banner "${bannerToSave.title}" saved!`, 'success');
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
            Hero Banners & Visual Sliders
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-semibold border border-amber-200">
              {banners.length} slides
            </span>
          </h2>
          <p className="text-sm text-stone-500 mt-0.5">
            Hero image carousels, seasonal festival greetings, and promotional calls-to-action
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 rounded-xl transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" />
          Add Hero Banner
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {banners.map((banner) => {
          return (
            <div
              key={banner.id}
              className={`bg-white rounded-2xl border shadow-xs overflow-hidden flex flex-col justify-between transition-colors ${
                banner.active ? 'border-stone-200/80 hover:border-amber-400' : 'border-stone-200 opacity-60'
              }`}
            >
              <div className="relative h-44 bg-stone-100">
                <img src={banner.imageUrl} alt={banner.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent flex flex-col justify-end p-4 text-white">
                  {banner.tag && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
                      {banner.tag}
                    </span>
                  )}
                  <h3 className="font-bold text-lg text-white leading-tight">{banner.title}</h3>
                  {banner.subtitle && (
                    <p className="text-xs text-stone-200 line-clamp-1 mt-0.5">{banner.subtitle}</p>
                  )}
                </div>
                <div className="absolute top-2 left-2 bg-stone-900/80 text-white text-[10px] font-bold px-2 py-0.5 rounded-md backdrop-blur-xs">
                  Slide #{banner.displayOrder || 1}
                </div>
                <div className="absolute top-2 right-2">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      banner.active ? 'bg-emerald-600 text-white' : 'bg-stone-600 text-white'
                    }`}
                  >
                    {banner.active ? 'Active' : 'Disabled'}
                  </span>
                </div>
              </div>

              <div className="p-4 flex items-center justify-between text-xs">
                <div className="text-stone-600 flex items-center gap-1 font-medium">
                  <ExternalLink className="w-3.5 h-3.5 text-stone-400" />
                  Links to: <span className="font-mono text-stone-900">{banner.link || '/shop'}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleOpenEdit(banner)}
                    className="p-1.5 rounded-lg text-stone-600 hover:text-amber-800 hover:bg-amber-50 transition-colors"
                    title="Edit Banner"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onDeleteBanner(banner.id, banner.title)}
                    className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    title="Delete Banner"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Banner Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 border border-stone-200 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="text-base font-bold text-stone-900">
                {editingBanner ? 'Edit Hero Banner' : 'Create Hero Banner'}
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
                <label className="block font-semibold text-stone-700 mb-1">Banner Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 100% Pure A2 Bilona Cow Ghee"
                  value={formData.title ?? ''}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-50 rounded-lg border border-stone-300 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Subtitle / Punchline</label>
                <input
                  type="text"
                  placeholder="e.g. Hand churned bilona method with no preservatives"
                  value={formData.subtitle ?? ''}
                  onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-50 rounded-lg border border-stone-300 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Tag / Category Badge</label>
                  <input
                    type="text"
                    placeholder="e.g. Vedic A2 Tradition"
                    value={formData.tag ?? ''}
                    onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 rounded-lg border border-stone-300 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Display Order</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.displayOrder ?? 1}
                    onChange={(e) =>
                      setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 1 })
                    }
                    className="w-full px-3 py-2 bg-stone-50 rounded-lg border border-stone-300 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <MediaUploader
                  preset="banner"
                  pathParams={{ bannerId: formData.id || 'new' }}
                  currentImageUrl={formData.imageUrl}
                  onImageUploaded={(url) => setFormData({ ...formData, imageUrl: url })}
                  label="Upload High-Res Banner Image *"
                  aspectRatio="16:9"
                  compact
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">CTA Button Text</label>
                  <input
                    type="text"
                    placeholder="e.g. Shop Now"
                    value={formData.buttonText ?? ''}
                    onChange={(e) => setFormData({ ...formData, buttonText: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 rounded-lg border border-stone-300 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Target Link URL</label>
                  <input
                    type="text"
                    placeholder="/shop"
                    value={formData.link ?? ''}
                    onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 rounded-lg border border-stone-300 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="banner-active-check"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="rounded text-amber-700 focus:ring-amber-500"
                />
                <label htmlFor="banner-active-check" className="font-semibold text-stone-800">
                  Banner is active and displayed in homepage hero rotation
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
                  {editingBanner ? 'Update Banner' : 'Save Banner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
