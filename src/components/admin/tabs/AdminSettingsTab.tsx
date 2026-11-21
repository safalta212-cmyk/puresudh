import React, { useState, useEffect } from 'react';
import {
  Save,
  Store,
  Phone,
  MessageCircle,
  CreditCard,
  Truck,
  Globe,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { SiteSettings } from '../../../types';
import { formatFirestorePermissionMessage } from '../../../firebase/config';
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
  const [activeSection, setActiveSection] = useState<
    'store' | 'contact' | 'whatsapp' | 'payment' | 'delivery' | 'seo'
  >('store');
  const [formData, setFormData] = useState<SiteSettings>({ ...settings });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFormData({ ...settings });
  }, [settings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: SiteSettings = {
        ...formData,
        id: formData.id || 'site_settings',
        siteName: formData.storeName,
        defaultDeliveryCharge:
          formData.standardDeliveryCharge ?? formData.defaultDeliveryCharge ?? 30,
        standardDeliveryCharge:
          formData.standardDeliveryCharge ?? formData.defaultDeliveryCharge ?? 30,
      };
      await onSaveSettings(payload);
      showToast('System settings saved and applied to storefront!', 'success');
    } catch (err: any) {
      showToast(formatFirestorePermissionMessage(err, 'Failed to save settings'), 'error');
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
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 disabled:opacity-50 rounded-xl transition-colors shadow-xs cursor-pointer"
        >
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Changes
        </button>
      </div>

      {/* Settings Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 pb-2 overflow-x-auto no-scrollbar text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveSection('store')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-colors whitespace-nowrap cursor-pointer ${
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
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-colors whitespace-nowrap cursor-pointer ${
            activeSection === 'contact'
              ? 'bg-amber-700 text-white shadow-xs'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <Phone className="w-4 h-4" />
          Contact & Social
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('whatsapp')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-colors whitespace-nowrap cursor-pointer ${
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
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-colors whitespace-nowrap cursor-pointer ${
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
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-colors whitespace-nowrap cursor-pointer ${
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
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-colors whitespace-nowrap cursor-pointer ${
            activeSection === 'seo'
              ? 'bg-amber-700 text-white shadow-xs'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <Globe className="w-4 h-4" />
          SEO & Social Cards
        </button>
      </div>

      <form
        onSubmit={handleSave}
        className="bg-white p-5 sm:p-6 rounded-2xl border border-stone-200/80 shadow-xs space-y-6 text-xs"
      >
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
                  value={formData.storeName ?? ''}
                  onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-50 rounded-lg border border-stone-300 focus:outline-none focus:border-amber-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Hindi Tagline</label>
                <input
                  type="text"
                  value={formData.hindiTagline ?? ''}
                  onChange={(e) => setFormData({ ...formData, hindiTagline: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-50 rounded-lg border border-stone-300 focus:outline-none focus:border-amber-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Primary Tagline</label>
                <input
                  type="text"
                  value={formData.primaryTagline ?? ''}
                  onChange={(e) => setFormData({ ...formData, primaryTagline: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-50 rounded-lg border border-stone-300 focus:outline-none focus:border-amber-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Secondary Tagline</label>
                <input
                  type="text"
                  value={formData.secondaryTagline ?? ''}
                  onChange={(e) => setFormData({ ...formData, secondaryTagline: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-50 rounded-lg border border-stone-300 focus:outline-none focus:border-amber-600"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">
                Top Header Announcement Text
              </label>
              <input
                type="text"
                value={formData.announcementText ?? ''}
                onChange={(e) => setFormData({ ...formData, announcementText: e.target.value })}
                placeholder="⚡ Pure Food • Pure Quality • Pure Trust - Fast Local Delivery!"
                className="w-full px-3 py-2 bg-stone-50 rounded-lg border border-stone-300 focus:outline-none focus:border-amber-600"
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
                  value={formData.fssaiLicense ?? ''}
                  onChange={(e) => setFormData({ ...formData, fssaiLicense: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-50 rounded-lg border border-stone-300 font-mono focus:outline-none focus:border-amber-600"
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
              Customer Support, Kitchen Address & Social Handles
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Support Phone Helpline
                </label>
                <input
                  type="tel"
                  value={formData.contactPhone ?? ''}
                  onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-50 rounded-lg border border-stone-300 focus:outline-none focus:border-amber-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Support Email</label>
                <input
                  type="email"
                  value={formData.contactEmail ?? ''}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-50 rounded-lg border border-stone-300 focus:outline-none focus:border-amber-600"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">
                Kitchen & Store Address
              </label>
              <input
                type="text"
                value={formData.storeAddress ?? ''}
                onChange={(e) => setFormData({ ...formData, storeAddress: e.target.value })}
                className="w-full px-3 py-2 bg-stone-50 rounded-lg border border-stone-300 focus:outline-none focus:border-amber-600"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Instagram Profile URL</label>
                <input
                  type="url"
                  value={formData.instagramUrl ?? ''}
                  placeholder="https://www.instagram.com/pure.sudh"
                  onChange={(e) => setFormData({ ...formData, instagramUrl: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-50 rounded-lg border border-stone-300 focus:outline-none focus:border-amber-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Facebook Page URL</label>
                <input
                  type="url"
                  value={formData.facebookUrl ?? ''}
                  placeholder="https://www.facebook.com/puresudh"
                  onChange={(e) => setFormData({ ...formData, facebookUrl: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-50 rounded-lg border border-stone-300 focus:outline-none focus:border-amber-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">YouTube Channel URL</label>
                <input
                  type="url"
                  value={formData.youtubeUrl ?? ''}
                  placeholder="https://www.youtube.com/@puresudh"
                  onChange={(e) => setFormData({ ...formData, youtubeUrl: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-50 rounded-lg border border-stone-300 focus:outline-none focus:border-amber-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">X / Twitter Profile URL</label>
                <input
                  type="url"
                  value={formData.twitterUrl ?? ''}
                  placeholder="https://x.com/puresudh"
                  onChange={(e) => setFormData({ ...formData, twitterUrl: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-50 rounded-lg border border-stone-300 focus:outline-none focus:border-amber-600"
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
                  value={formData.whatsappNumber ?? ''}
                  onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-50 rounded-lg border border-stone-300 font-mono focus:outline-none focus:border-amber-600"
                />
              </div>

              <div className="flex items-center gap-2 sm:pt-6">
                <input
                  type="checkbox"
                  id="whatsapp-enable-check"
                  checked={formData.whatsappChatEnabled !== false}
                  onChange={(e) =>
                    setFormData({ ...formData, whatsappChatEnabled: e.target.checked })
                  }
                  className="rounded text-amber-700 focus:ring-amber-500"
                />
                <label htmlFor="whatsapp-enable-check" className="font-semibold text-stone-800 cursor-pointer">
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
                  formData.whatsappPrefillMessage ??
                  'Namaste PURE SUDH team! I would like to order fresh Desi Cow Ghee and sweets.'
                }
                onChange={(e) =>
                  setFormData({ ...formData, whatsappPrefillMessage: e.target.value })
                }
                className="w-full px-3 py-2 bg-stone-50 rounded-lg border border-stone-300 focus:outline-none focus:border-amber-600"
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex items-center justify-between p-3 bg-white rounded-xl border border-stone-200 cursor-pointer">
                  <div>
                    <span className="font-bold text-stone-900 block">Cash on Delivery (COD)</span>
                    <span className="text-[11px] text-stone-500">Allow payment on delivery</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.allowCod !== false}
                    onChange={(e) => setFormData({ ...formData, allowCod: e.target.checked })}
                    className="rounded text-amber-700 focus:ring-amber-500"
                  />
                </label>

                <label className="flex items-center justify-between p-3 bg-white rounded-xl border border-stone-200 cursor-pointer">
                  <div>
                    <span className="font-bold text-stone-900 block">UPI / PhonePe / GPay</span>
                    <span className="text-[11px] text-stone-500">Direct instant UPI checkout</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.allowUpi !== false}
                    onChange={(e) => setFormData({ ...formData, allowUpi: e.target.checked })}
                    className="rounded text-amber-700 focus:ring-amber-500"
                  />
                </label>

                <label className="flex items-center justify-between p-3 bg-white rounded-xl border border-stone-200 cursor-pointer">
                  <div>
                    <span className="font-bold text-stone-900 block">Credit & Debit Cards</span>
                    <span className="text-[11px] text-stone-500">Visa, Mastercard, RuPay</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.allowCards !== false}
                    onChange={(e) => setFormData({ ...formData, allowCards: e.target.checked })}
                    className="rounded text-amber-700 focus:ring-amber-500"
                  />
                </label>

                <label className="flex items-center justify-between p-3 bg-white rounded-xl border border-stone-200 cursor-pointer">
                  <div>
                    <span className="font-bold text-stone-900 block">Net Banking</span>
                    <span className="text-[11px] text-stone-500">All major Indian banks</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.allowNetBanking !== false}
                    onChange={(e) => setFormData({ ...formData, allowNetBanking: e.target.checked })}
                    className="rounded text-amber-700 focus:ring-amber-500"
                  />
                </label>
              </div>

              <div className="border-t border-stone-200 pt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    Merchant UPI ID for Instant QR / PhonePe
                  </label>
                  <input
                    type="text"
                    placeholder="puresudh@upi"
                    value={formData.upiId ?? ''}
                    onChange={(e) => setFormData({ ...formData, upiId: e.target.value })}
                    className="w-full px-3 py-2 bg-white rounded-lg border border-stone-300 font-mono focus:outline-none focus:border-amber-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    Razorpay Key ID (Public Checkout Key)
                  </label>
                  <input
                    type="text"
                    placeholder="rzp_live_..."
                    value={formData.razorpayKeyId ?? ''}
                    onChange={(e) => setFormData({ ...formData, razorpayKeyId: e.target.value })}
                    className="w-full px-3 py-2 bg-white rounded-lg border border-stone-300 font-mono focus:outline-none focus:border-amber-600"
                  />
                </div>
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
                  value={formData.standardDeliveryCharge ?? formData.defaultDeliveryCharge ?? 30}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10) || 0;
                    setFormData({
                      ...formData,
                      standardDeliveryCharge: val,
                      defaultDeliveryCharge: val,
                    });
                  }}
                  className="w-full px-3 py-2 bg-stone-50 rounded-lg border border-stone-300 focus:outline-none focus:border-amber-600"
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
                      freeDeliveryThreshold: parseInt(e.target.value, 10) || 0,
                    })
                  }
                  className="w-full px-3 py-2 bg-stone-50 rounded-lg border border-stone-300 focus:outline-none focus:border-amber-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Default ETA Window</label>
                <input
                  type="text"
                  value={formData.defaultDeliveryETA ?? '30-45 mins'}
                  onChange={(e) => setFormData({ ...formData, defaultDeliveryETA: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-50 rounded-lg border border-stone-300 focus:outline-none focus:border-amber-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Express Delivery Fee (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.expressDeliveryCharge ?? 49}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      expressDeliveryCharge: parseInt(e.target.value, 10) || 0,
                    })
                  }
                  className="w-full px-3 py-2 bg-stone-50 rounded-lg border border-stone-300 focus:outline-none focus:border-amber-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Minimum Order Amount (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.minOrderAmount ?? 99}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      minOrderAmount: parseInt(e.target.value, 10) || 0,
                    })
                  }
                  className="w-full px-3 py-2 bg-stone-50 rounded-lg border border-stone-300 focus:outline-none focus:border-amber-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Default Service Radius (km)
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.deliveryRadiusKm ?? 15}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      deliveryRadiusKm: parseInt(e.target.value, 10) || 1,
                    })
                  }
                  className="w-full px-3 py-2 bg-stone-50 rounded-lg border border-stone-300 focus:outline-none focus:border-amber-600"
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
                  formData.metaTitle ??
                  'PURE SUDH - 100% Pure Desi Cow Ghee & Authentic Dairy'
                }
                onChange={(e) => setFormData({ ...formData, metaTitle: e.target.value })}
                className="w-full px-3 py-2 bg-stone-50 rounded-lg border border-stone-300 focus:outline-none focus:border-amber-600"
              />
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">
                HTML Meta Description
              </label>
              <textarea
                rows={2}
                value={
                  formData.metaDescription ??
                  'Order pure Vedic A2 bilona cow ghee, fresh dairy, and traditional homemade sweets with fast express delivery.'
                }
                onChange={(e) => setFormData({ ...formData, metaDescription: e.target.value })}
                className="w-full px-3 py-2 bg-stone-50 rounded-lg border border-stone-300 focus:outline-none focus:border-amber-600"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Meta Keywords</label>
                <input
                  type="text"
                  value={
                    formData.metaKeywords ??
                    'desi ghee, pure cow milk, authentic thekua bihar, pure sudh dairy'
                  }
                  onChange={(e) => setFormData({ ...formData, metaKeywords: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-50 rounded-lg border border-stone-300 focus:outline-none focus:border-amber-600"
                />
              </div>

              <div>
                <MediaUploader
                  preset="banner"
                  currentImageUrl={formData.ogImageUrl}
                  onImageUploaded={(url) => setFormData({ ...formData, ogImageUrl: url })}
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
            className="inline-flex items-center gap-2 px-6 py-2.5 font-bold text-white bg-amber-700 hover:bg-amber-800 disabled:opacity-50 rounded-xl transition-colors shadow-xs cursor-pointer"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save All Configurations
          </button>
        </div>
      </form>
    </div>
  );
};
