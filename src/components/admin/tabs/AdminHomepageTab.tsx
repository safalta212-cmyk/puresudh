import React, { useState, useEffect } from 'react';
import {
  Layout,
  Save,
  Check,
  Star,
  Flame,
  Tag,
  Layers,
  Sparkles,
  RefreshCw,
  Eye,
} from 'lucide-react';
import { Product, Category, OfferBanner, Offer, HomepageConfig } from '../../../types';
import { fetchHomepageConfig, saveHomepageConfig } from '../../../firebase/services';

interface AdminHomepageTabProps {
  products: Product[];
  categories: Category[];
  banners: OfferBanner[];
  offers: Offer[];
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const AdminHomepageTab: React.FC<AdminHomepageTabProps> = ({
  products,
  categories,
  banners,
  offers,
  showToast,
}) => {
  const [config, setConfig] = useState<HomepageConfig>({
    heroBannerIds: banners.map((b) => b.id),
    featuredCategorySlugs: categories.map((c) => c.slug || c.id),
    featuredProductIds: products.slice(0, 4).map((p) => p.id),
    bestSellerProductIds: products.slice(0, 4).map((p) => p.id),
    activeOfferIds: offers.map((o) => o.id),
    announcementText: '⚡ Express Delivery in 30 Mins across Patna • Free shipping on orders above ₹499 • 100% Pure Sudh Guarantee',
    showAnnouncement: true,
  });

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadConfig = async () => {
      setLoading(true);
      try {
        const loaded = await fetchHomepageConfig();
        if (loaded) {
          setConfig(loaded);
        }
      } catch (err) {
        console.error('Error fetching homepage config:', err);
      } finally {
        setLoading(false);
      }
    };
    loadConfig();
  }, []);

  const handleToggleProduct = (field: 'featuredProductIds' | 'bestSellerProductIds', id: string) => {
    setConfig((prev) => {
      const currentList = prev[field] || [];
      const updated = currentList.includes(id)
        ? currentList.filter((x) => x !== id)
        : [...currentList, id];
      return { ...prev, [field]: updated };
    });
  };

  const handleToggleCategory = (slug: string) => {
    setConfig((prev) => {
      const currentList = prev.featuredCategorySlugs || [];
      const updated = currentList.includes(slug)
        ? currentList.filter((x) => x !== slug)
        : [...currentList, slug];
      return { ...prev, featuredCategorySlugs: updated };
    });
  };

  const handleToggleOffer = (id: string) => {
    setConfig((prev) => {
      const currentList = prev.activeOfferIds || [];
      const updated = currentList.includes(id)
        ? currentList.filter((x) => x !== id)
        : [...currentList, id];
      return { ...prev, activeOfferIds: updated };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveHomepageConfig(config);
      showToast('Homepage layout configuration saved successfully!', 'success');
    } catch (err) {
      showToast('Failed to save homepage settings', 'error');
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
            Storefront Homepage Arrangement
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-semibold border border-emerald-200">
              Live Customizer
            </span>
          </h2>
          <p className="text-sm text-stone-500 mt-0.5">
            Curate hero banners, featured collection grids, festival deals, and bestsellers
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 disabled:opacity-50 rounded-xl transition-colors shadow-xs"
        >
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Homepage Config
        </button>
      </div>

      {/* Announcement Bar Settings */}
      <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-600" />
            Top Announcement Ticker
          </h3>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="show-announce"
              checked={Boolean(config?.showAnnouncement)}
              onChange={(e) => setConfig({ ...config, showAnnouncement: e.target.checked })}
              className="rounded text-amber-700 focus:ring-amber-500"
            />
            <label htmlFor="show-announce" className="text-xs font-semibold text-stone-700">
              Show ticker bar
            </label>
          </div>
        </div>

        <input
          type="text"
          value={config?.announcementText ?? ''}
          onChange={(e) => setConfig({ ...config, announcementText: e.target.value })}
          placeholder="Announcement message..."
          className="w-full px-3 py-2 text-xs bg-stone-50 rounded-lg border border-stone-300 focus:outline-none"
        />
      </div>

      {/* Featured Categories Selector */}
      <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-700" />
              Featured Categories on Storefront
            </h3>
            <p className="text-xs text-stone-500">
              Select which categories appear on the homepage circular/card carousel
            </p>
          </div>
          <span className="text-xs font-bold text-amber-800">
            {config.featuredCategorySlugs?.length || 0} selected
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {categories.map((cat) => {
            const isSelected = config.featuredCategorySlugs?.includes(cat.slug || cat.id);
            return (
              <div
                key={cat.id}
                onClick={() => handleToggleCategory(cat.slug || cat.id)}
                className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-amber-50/60 border-amber-400 text-stone-900 font-bold'
                    : 'bg-stone-50/50 border-stone-200 text-stone-600 hover:bg-stone-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg overflow-hidden bg-stone-200 shrink-0">
                    <img src={cat.image} alt={cat.name} className="w-full h-full object-cover" />
                  </div>
                  <span className="text-xs line-clamp-1">{cat.name}</span>
                </div>
                <div
                  className={`w-4 h-4 rounded flex items-center justify-center text-[10px] ${
                    isSelected ? 'bg-amber-700 text-white' : 'border border-stone-300'
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Featured Products & Bestsellers Selectors */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Featured Products */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
                Featured Products Spotlight
              </h3>
              <p className="text-xs text-stone-500">Highlighted on top shelf of store</p>
            </div>
            <span className="text-xs font-bold text-amber-800">
              {config.featuredProductIds?.length || 0} selected
            </span>
          </div>

          <div className="max-h-80 overflow-y-auto space-y-2 pr-1 border border-stone-100 rounded-xl p-2">
            {products.map((prod) => {
              const isSelected = config.featuredProductIds?.includes(prod.id);
              return (
                <div
                  key={prod.id}
                  onClick={() => handleToggleProduct('featuredProductIds', prod.id)}
                  className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-colors text-xs ${
                    isSelected
                      ? 'bg-amber-50/60 border-amber-300 text-stone-900 font-bold'
                      : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <img
                      src={prod.images?.[0]}
                      alt={prod.name}
                      className="w-9 h-9 rounded-lg object-cover border border-stone-200"
                    />
                    <div>
                      <div className="line-clamp-1">{prod.name}</div>
                      <div className="text-[10px] text-stone-400 font-normal">
                        ₹{prod.price} • {prod.category}
                      </div>
                    </div>
                  </div>
                  <div
                    className={`w-4 h-4 rounded flex items-center justify-center text-[10px] ${
                      isSelected ? 'bg-amber-700 text-white' : 'border border-stone-300'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Best Sellers */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                <Flame className="w-4 h-4 text-rose-500 fill-rose-400" />
                Best Sellers Section
              </h3>
              <p className="text-xs text-stone-500">Popular items customers order repeatedly</p>
            </div>
            <span className="text-xs font-bold text-rose-800">
              {config.bestSellerProductIds?.length || 0} selected
            </span>
          </div>

          <div className="max-h-80 overflow-y-auto space-y-2 pr-1 border border-stone-100 rounded-xl p-2">
            {products.map((prod) => {
              const isSelected = config.bestSellerProductIds?.includes(prod.id);
              return (
                <div
                  key={prod.id}
                  onClick={() => handleToggleProduct('bestSellerProductIds', prod.id)}
                  className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-colors text-xs ${
                    isSelected
                      ? 'bg-rose-50/60 border-rose-300 text-stone-900 font-bold'
                      : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <img
                      src={prod.images?.[0]}
                      alt={prod.name}
                      className="w-9 h-9 rounded-lg object-cover border border-stone-200"
                    />
                    <div>
                      <div className="line-clamp-1">{prod.name}</div>
                      <div className="text-[10px] text-stone-400 font-normal">
                        ₹{prod.price} • {prod.category}
                      </div>
                    </div>
                  </div>
                  <div
                    className={`w-4 h-4 rounded flex items-center justify-center text-[10px] ${
                      isSelected ? 'bg-rose-600 text-white' : 'border border-stone-300'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Active Seasonal Offers */}
      <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
              <Tag className="w-4 h-4 text-amber-700" />
              Homepage Deal Showcases
            </h3>
            <p className="text-xs text-stone-500">Select which promo offers to display on the storefront</p>
          </div>
          <span className="text-xs font-bold text-amber-800">
            {config.activeOfferIds?.length || 0} enabled
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {offers.map((offer) => {
            const isSelected = config.activeOfferIds?.includes(offer.id);
            return (
              <div
                key={offer.id}
                onClick={() => handleToggleOffer(offer.id)}
                className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-colors text-xs ${
                  isSelected
                    ? 'bg-amber-50/60 border-amber-400 font-bold'
                    : 'bg-stone-50/50 border-stone-200 text-stone-600'
                }`}
              >
                <div>
                  <div className="text-stone-900">{offer.title}</div>
                  <div className="text-[11px] text-emerald-700 font-semibold">{offer.discountText}</div>
                </div>
                <div
                  className={`w-4 h-4 rounded flex items-center justify-center text-[10px] ${
                    isSelected ? 'bg-amber-700 text-white' : 'border border-stone-300'
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
