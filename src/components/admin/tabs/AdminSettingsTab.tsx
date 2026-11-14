import React, { useState } from 'react';
import {
  Settings,
  Save,
  Store,
  Phone,
  MessageCircle,
  CreditCard,
  Truck,
  Globe,
  Share2,
  RefreshCw,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { SiteSettings } from '../../../types';
import { MediaUploader } from '../../common/MediaUploader';

interface AdminSettingsTabProps {
  settings: SiteSettings;
  onSaveSettings: (settings: SiteSettings) => Promise<void>;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const AdminSettingsTab: React.FC<AdminSettingsTabProps> = ({
  settings,
  onSaveSettings,
  showToast,
}) => {
  const [activeSection, setActiveSection] = useState<'store' | 'contact' | 'whatsapp' | 'payment' | 'delivery' | 'seo'>('store');
  const [formData, setFormData] = useState<SiteSettings>({ ...settings });
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSaveSettings(formData);
      showToast('System settings saved and applied to storefront!', 'success');
    } catch (err) {
      showToast('Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
            System & Store Configurations
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-semibold border border-amber-200">
              Live Production
            </span>
          </h2>
          <p className="text-sm text-stone-500 mt-0.5">
            Store identity, FSSAI regulatory compliance, payment channels, WhatsApp desk, and SEO
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 disabled:opacity-50 rounded-xl transition-colors shadow-xs"
        >
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Changes
        </button>
      </div>

      {/* Settings Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 pb-2 overflow-x-auto text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveSection('store')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-colors whitespace-nowrap ${
            activeSection === 'store'
              ? 'bg-amber-700 text-white shadow-xs'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <Store className="w-4 h-4" />
          Store Profile & FSSAI
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('contact')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-colors whitespace-nowrap ${
            activeSection === 'contact'
              ? 'bg-amber-700 text-white shadow-xs'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <Phone className="w-4 h-4" />
          Contact & Address
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('whatsapp')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-colors whitespace-nowrap ${
            activeSection === 'whatsapp'
              ? 'bg-amber-700 text-white shadow-xs'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <MessageCircle className="w-4 h-4" />
          WhatsApp Order Desk
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('payment')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-colors whitespace-nowrap ${
            activeSection === 'payment'
              ? 'bg-amber-700 text-white shadow-xs'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          Payment Channels
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('delivery')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-colors whitespace-nowrap ${
            activeSection === 'delivery'
              ? 'bg-amber-700 text-white shadow-xs'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <Truck className="w-4 h-4" />
          Delivery Defaults
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('seo')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-colors whitespace-nowrap ${
            activeSection === 'seo'
              ? 'bg-amber-700 text-white shadow-xs'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <Globe className="w-4 h-4" />
          SEO & Social Cards
        </button>
      </div>

      <form onSubmit={handleSave} className="bg-white p-6 rounded-2xl border border-stone-200/80 shadow-xs space-y-6 text-xs">
        {/* Section 1: Store Profile */}
        {activeSection === 'store' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-stone-900 border-b border-stone-100 pb-2 flex items-center gap-2">
              <Store className="w-4 h-4 text-amber-700" />
              Store Identity & Branding
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Store Brand Name</label>
                <input
                  type="text"
                  value={formData.storeName ?? 'PURE SUDH'}
                  onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-50 rounded-lg border border-stone-300 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Hindi Brand Name / Tag</label>
                <input
                  type="text"
                  value={formData.storeTagline ?? 'शुद्धता ही हमारी पहचान'}
                  onChange={(e) => setFormData({ ...formData, storeTagline: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-50 rounded-lg border border-stone-300 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">Store Description</label>
              <textarea
                rows={3}
                value={
                  formData.storeDescription ??
                  'Authentic Bihari Desi Cow A2 Ghee, Fresh Morning Dairy, and Festive Sweets delivered fast.'
                }
                onChange={(e) => setFormData({ ...formData, storeDescription: e.target.value })}
                className="w-full px-3 py-2 bg-stone-50 rounded-lg border border-stone-300 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-stone-700 mb-1 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  FSSAI License Registration Number
                </label>
                <input
                  type="text"
                  value={formData.fssaiLicense ?? '10424000000123'}
                  onChange={(e) => setFormData({ ...formData, fssaiLicense: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-50 rounded-lg border border-stone-300 font-mono focus:outline-none"
                />
              </div>

              <div>
                <MediaUploader
                  preset="category"
                  currentImageUrl={formData.logoUrl}
                  onImageUploaded={(url) => setFormData({ ...formData, logoUrl: url })}
                  label="Upload Brand Logo Image"
                  compact
                />
              </div>
            </div>
          </div>
        )}

        {/* Section 2: Contact & Address */}
        {activeSection === 'contact' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-stone-900 border-b border-stone-100 pb-2 flex items-center gap-2">
              <Phone className="w-4 h-4 text-amber-700" />
              Customer Support & Kitchen Address
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Support Phone Helpline</label>
                <input
                  type="tel"
                  value={formData.phone ?? '+91 91234 56789'}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-50 rounded-lg border border-stone-300 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Support Email</label>
                <input
                  type="email"
                  value={formData.email ?? 'care@email.com'}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-50 rounded-lg border border-stone-300 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">Kitchen & Store Address</label>
              <input
                type="text"
                value={formData.address ?? 'Shop #12, Bailey Road, Near Saguna More, Patna, Bihar'}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 bg-stone-50 rounded-lg border border-stone-300 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Instagram Handle URL</label>
                <input
                  type="url"
                  value={formData.socialLinks?.instagram ?? 'https://www.instagram.com/pure.sudh'}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      socialLinks: { ...formData.socialLinks, instagram: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 bg-stone-50 rounded-lg border border-stone-300 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Facebook Page URL</label>
                <input
                  type="url"
                  value={formData.socialLinks?.facebook ?? 'https://facebook.com/puresudh'}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      socialLinks: { ...formData.socialLinks, facebook: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 bg-stone-50 rounded-lg border border-stone-300 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">YouTube Channel URL</label>
                <input
                  type="url"
                  value={formData.youtubeUrl ?? formData.socialLinks?.youtube ?? 'https://www.youtube.com/@puresudh'}
                  placeholder="https://www.youtube.com/@puresudh"
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      youtubeUrl: e.target.value,
                      socialLinks: { ...formData.socialLinks, youtube: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 bg-stone-50 rounded-lg border border-stone-300 focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* Section 3: WhatsApp Desk */}
        {activeSection === 'whatsapp' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-stone-900 border-b border-stone-100 pb-2 flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-emerald-600" />
              WhatsApp Direct Order Desk
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  WhatsApp Helpline Number (with country code)
                </label>
                <input
                  type="tel"
                  placeholder="919123456789"
                  value={formData.whatsappPhone ?? '919123456789'}
                  onChange={(e) => setFormData({ ...formData, whatsappPhone: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-50 rounded-lg border border-stone-300 font-mono focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-6">
                <input
                  type="checkbox"
                  id="whatsapp-enable-check"
                  checked={formData.whatsappEnabled !== false}
                  onChange={(e) =>
                    setFormData({ ...formData, whatsappEnabled: e.target.checked })
                  }
                  className="rounded text-amber-700 focus:ring-amber-500"
                />
                <label htmlFor="whatsapp-enable-check" className="font-semibold text-stone-800">
                  Enable Floating WhatsApp Order Button on Store
                </label>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">
                Default Prefilled Greeting Text
              </label>
              <textarea
                rows={2}
                value={
                  formData.whatsappMessage ??
                  'Namaste PURE SUDH team! I would like to order fresh Gir cow ghee and sweets.'
                }
                onChange={(e) => setFormData({ ...formData, whatsappMessage: e.target.value })}
                className="w-full px-3 py-2 bg-stone-50 rounded-lg border border-stone-300 focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* Section 4: Payment Channels */}
        {activeSection === 'payment' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-stone-900 border-b border-stone-100 pb-2 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-amber-700" />
              Payment Channels & Gateway Integrations
            </h3>

            <div className="space-y-3 p-4 bg-stone-50 rounded-xl border border-stone-200">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-stone-900 block">Cash on Delivery (COD)</span>
                  <span className="text-[11px] text-stone-500">Allow customers to pay at door</span>
                </div>
                <input
                  type="checkbox"
                  checked={formData.paymentConfig?.codEnabled !== false}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      paymentConfig: {
                        ...(formData.paymentConfig || {}),
                        codEnabled: e.target.checked,
                      },
                    })
                  }
                  className="rounded text-amber-700 focus:ring-amber-500"
                />
              </div>

              <div className="border-t border-stone-200 pt-3">
                <label className="block font-semibold text-stone-700 mb-1">
                  UPI ID for Instant QR / PhonePe
                </label>
                <input
                  type="text"
                  placeholder="puresudh@upi"
                  value={formData.paymentConfig?.upiId ?? 'puresudh@okhdfcbank'}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      paymentConfig: {
                        ...(formData.paymentConfig || {}),
                        upiId: e.target.value,
                      },
                    })
                  }
                  className="w-full px-3 py-2 bg-white rounded-lg border border-stone-300 font-mono focus:outline-none"
                />
              </div>

              <div className="border-t border-stone-200 pt-3">
                <label className="block font-semibold text-stone-700 mb-1">
                  Razorpay Key ID (For Credit / Debit Cards & Net Banking)
                </label>
                <input
                  type="text"
                  placeholder="rzp_live_..."
                  value={formData.paymentConfig?.razorpayKeyId ?? 'rzp_test_puresudh1234'}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      paymentConfig: {
                        ...(formData.paymentConfig || {}),
                        razorpayKeyId: e.target.value,
                      },
                    })
                  }
                  className="w-full px-3 py-2 bg-white rounded-lg border border-stone-300 font-mono focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* Section 5: Delivery Defaults */}
        {activeSection === 'delivery' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-stone-900 border-b border-stone-100 pb-2 flex items-center gap-2">
              <Truck className="w-4 h-4 text-amber-700" />
              Storewide Delivery Fee Defaults
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Standard Delivery Fee (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.deliveryCharge ?? 30}
                  onChange={(e) =>
                    setFormData({ ...formData, deliveryCharge: parseInt(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2 bg-stone-50 rounded-lg border border-stone-300 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Free Delivery Threshold (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.freeDeliveryThreshold ?? 499}
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
                <label className="block font-semibold text-stone-700 mb-1">Default ETA Window</label>
                <input
                  type="text"
                  value={formData.defaultEta ?? '30-45 mins'}
                  onChange={(e) => setFormData({ ...formData, defaultEta: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-50 rounded-lg border border-stone-300 focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* Section 6: SEO & Meta */}
        {activeSection === 'seo' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-stone-900 border-b border-stone-100 pb-2 flex items-center gap-2">
              <Globe className="w-4 h-4 text-amber-700" />
              Search Engine Optimization (SEO) & Social Graph
            </h3>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">HTML Meta Title</label>
              <input
                type="text"
                value={
                  formData.seoMeta?.title ??
                  'PURE SUDH - 100% Pure Desi Cow Ghee & Authentic Dairy in Patna'
                }
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    seoMeta: { ...(formData.seoMeta || {}), title: e.target.value },
                  })
                }
                className="w-full px-3 py-2 bg-stone-50 rounded-lg border border-stone-300 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">
                HTML Meta Description
              </label>
              <textarea
                rows={2}
                value={
                  formData.seoMeta?.description ??
                  'Order pure Vedic A2 bilona cow ghee, fresh buffalo milk, and traditional sweets online with 30-min express delivery in Patna.'
                }
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    seoMeta: { ...(formData.seoMeta || {}), description: e.target.value },
                  })
                }
                className="w-full px-3 py-2 bg-stone-50 rounded-lg border border-stone-300 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Meta Keywords</label>
                <input
                  type="text"
                  value={
                    formData.seoMeta?.keywords ??
                    'desi ghee patna, pure cow milk, authentic thekua bihar, chhath pooja dairy'
                  }
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      seoMeta: { ...(formData.seoMeta || {}), keywords: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 bg-stone-50 rounded-lg border border-stone-300 focus:outline-none"
                />
              </div>

              <div>
                <MediaUploader
                  preset="banner"
                  currentImageUrl={formData.seoMeta?.ogImage}
                  onImageUploaded={(url) =>
                    setFormData({
                      ...formData,
                      seoMeta: { ...(formData.seoMeta || {}), ogImage: url },
                    })
                  }
                  label="Upload OpenGraph Social Card Image"
                  compact
                />
              </div>
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-stone-100 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2.5 font-bold text-white bg-amber-700 hover:bg-amber-800 disabled:opacity-50 rounded-xl transition-colors shadow-xs"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save All Configurations
          </button>
        </div>
      </form>
    </div>
  );
};
