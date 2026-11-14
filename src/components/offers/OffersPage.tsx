import React, { useState, useEffect } from 'react';
import {
  Tag,
  Gift,
  Clock,
  Check,
  Copy,
  ArrowRight,
  Sparkles,
  ShoppingBag,
  Flame,
  Percent,
  Calendar,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import { Offer, OfferType, Coupon } from '../../types';
import { fetchOffers, fetchCoupons } from '../../firebase/services';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';

interface OffersPageProps {
  onNavigateToShop: (categorySlug?: string) => void;
  onOpenProductDetails?: (productId: string) => void;
}

const OFFER_TABS: { id: string; label: string; type?: OfferType; icon: React.FC<{ className?: string }> }[] = [
  { id: 'all', label: 'All Offers', icon: Sparkles },
  { id: 'todays_offers', label: "Today's Offers", type: 'todays_offers', icon: Flame },
  { id: 'special_deals', label: 'Special Deals', type: 'special_deals', icon: Gift },
  { id: 'festival_offers', label: 'Festival Offers', type: 'festival_offers', icon: Calendar },
  { id: 'new_customer', label: 'New Customer Offers', type: 'new_customer', icon: ShieldCheck },
  { id: 'product_offers', label: 'Product Offers', type: 'product_offers', icon: ShoppingBag },
  { id: 'category_offers', label: 'Category Offers', type: 'category_offers', icon: Percent },
];

export const OffersPage: React.FC<OffersPageProps> = ({ onNavigateToShop }) => {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [selectedTab, setSelectedTab] = useState<string>('all');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const { applyCoupon, couponCode: activeCouponCode, setIsCartOpen } = useCart();
  const { showToast } = useToast();

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [loadedOffers, loadedCoupons] = await Promise.all([fetchOffers(), fetchCoupons()]);
        setOffers(loadedOffers);
        setCoupons(loadedCoupons);
      } catch (err) {
        console.warn('Could not load offers:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    showToast(`Code "${code}" copied to clipboard!`, 'info');
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleApplyToCart = async (code: string) => {
    const success = await applyCoupon(code);
    if (success) {
      setIsCartOpen(true);
    }
  };

  // Filter offers based on active tab
  const filteredOffers = offers.filter((offer) => {
    if (!offer.active) return false;
    if (selectedTab === 'all') return true;
    return offer.offerType === selectedTab;
  });

  // Get active coupons for the Coupons showcase
  const activeCoupons = coupons.filter((c) => c.active);

  return (
    <div className="min-h-screen bg-stone-50 pb-20 pt-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-900 via-amber-800 to-stone-900 text-white p-6 sm:p-10 mb-8 shadow-sm">
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-semibold mb-3 border border-amber-500/30">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Special Pure Savings</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight mb-2">
              Exclusive Deals & Offers
            </h1>
            <p className="text-stone-300 text-xs sm:text-base leading-relaxed">
              Experience the purest artisanal ghee, traditional whole-wheat thekua, and morning churned dairy with authentic festival savings.
            </p>
          </div>
          <div className="absolute right-0 bottom-0 top-0 w-1/3 opacity-20 pointer-events-none hidden md:flex items-center justify-center">
            <Tag className="w-64 h-64 text-amber-200 transform rotate-12" />
          </div>
        </div>

        {/* Category Pills Filter */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8 scrollbar-none">
          {OFFER_TABS.map((tab) => {
            const Icon = tab.icon;
            const isSelected = selectedTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition cursor-pointer ${
                  isSelected
                    ? 'bg-amber-800 text-white shadow-xs'
                    : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="py-20 text-center text-stone-500">
            <div className="w-8 h-8 border-3 border-amber-700 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm">Loading offers and authentic savings...</p>
          </div>
        )}

        {/* Offers Grid */}
        {!loading && filteredOffers.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {filteredOffers.map((offer) => {
              const hasApplied = offer.code && activeCouponCode.toUpperCase() === offer.code.toUpperCase();
              return (
                <div
                  key={offer.id}
                  className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs hover:shadow-md transition flex flex-col justify-between"
                >
                  <div>
                    {/* Visual Banner */}
                    <div className="relative h-44 w-full bg-stone-100 overflow-hidden">
                      <img
                        src={offer.bannerImage || offer.imageUrl || 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=800&q=80'}
                        alt={offer.title}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      
                      {offer.badge && (
                        <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-amber-600 text-white text-[11px] font-bold shadow-xs">
                          {offer.badge}
                        </div>
                      )}

                      {offer.discountText && (
                        <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg bg-white/95 backdrop-blur-xs text-amber-900 text-xs font-black shadow-xs">
                          {offer.discountText}
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-5">
                      <h3 className="font-bold text-stone-900 text-base mb-1 line-clamp-1">
                        {offer.title}
                      </h3>
                      {offer.subtitle && (
                        <p className="text-stone-600 text-xs mb-3 line-clamp-2 leading-relaxed">
                          {offer.subtitle}
                        </p>
                      )}

                      {/* Terms & Conditions */}
                      {offer.termsAndConditions && offer.termsAndConditions.length > 0 && (
                        <div className="text-[11px] text-stone-600 bg-stone-50 p-2.5 rounded-lg border border-stone-100 mb-4 space-y-1">
                          {offer.termsAndConditions.map((term, i) => (
                            <div key={i} className="flex items-center gap-1.5">
                              <span className="w-1 h-1 rounded-full bg-stone-400" />
                              <span>{term}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="p-5 pt-0 border-t border-stone-100">
                    <div className="pt-4 flex items-center justify-between gap-2">
                      {offer.code ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleCopy(offer.code!)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-dashed border-amber-600 bg-amber-50 text-amber-900 text-xs font-mono font-bold hover:bg-amber-100 transition cursor-pointer"
                            title="Click to copy coupon code"
                          >
                            <span>{offer.code}</span>
                            {copiedCode === offer.code ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5 text-amber-700" />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleApplyToCart(offer.code!)}
                            disabled={hasApplied}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                              hasApplied
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-800 hover:bg-amber-900 text-white'
                            }`}
                          >
                            {hasApplied ? 'Applied ✓' : 'Apply to Cart'}
                          </button>
                        </div>
                      ) : (
                        <div className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Direct discount applied</span>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          const catSlug = offer.targetCategoryId
                            ? offer.targetCategoryId.replace('cat-', '')
                            : undefined;
                          onNavigateToShop(catSlug);
                        }}
                        className="text-amber-800 hover:text-amber-900 text-xs font-bold flex items-center gap-1 transition"
                      >
                        <span>Shop Now</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredOffers.length === 0 && (
          <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center my-8">
            <Gift className="w-12 h-12 text-stone-300 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-stone-800 mb-1">No offers found in this category</h3>
            <p className="text-stone-500 text-xs sm:text-sm max-w-md mx-auto mb-6">
              Check back soon for new special festival discounts and fresh dairy deals!
            </p>
            <button
              type="button"
              onClick={() => setSelectedTab('all')}
              className="px-4 py-2 bg-amber-800 text-white rounded-xl text-xs font-semibold hover:bg-amber-900 transition"
            >
              View All Offers
            </button>
          </div>
        )}

        {/* Verified Promo Coupons Showcase Section */}
        {activeCoupons.length > 0 && (
          <div className="mt-12 bg-white rounded-2xl border border-stone-200 p-6 sm:p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-stone-900">
                  Active Promo Codes
                </h2>
                <p className="text-stone-500 text-xs">
                  Apply these verified codes at checkout or click to apply directly to your bag.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
                {activeCoupons.length} Active
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeCoupons.map((coupon) => {
                const isApplied = activeCouponCode.toUpperCase() === coupon.code.toUpperCase();
                return (
                  <div
                    key={coupon.id}
                    className="p-4 rounded-xl border border-stone-200 bg-stone-50/50 hover:bg-stone-50 transition flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 font-mono font-extrabold text-sm border border-amber-200">
                          {coupon.code}
                        </span>
                        <span className="text-xs font-bold text-emerald-700">
                          {coupon.discountType === 'percentage'
                            ? `${coupon.discountValue}% OFF`
                            : `Flat ₹${coupon.discountValue} OFF`}
                        </span>
                      </div>
                      <p className="text-xs text-stone-600 mb-3 leading-relaxed">
                        {coupon.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-stone-200 text-xs">
                      <span className="text-stone-600 font-medium">
                        Min. Order: ₹{coupon.minOrderAmount}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleCopy(coupon.code)}
                          className="p-1.5 text-stone-500 hover:text-stone-800 rounded-lg hover:bg-stone-200 transition"
                          title="Copy Code"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApplyToCart(coupon.code)}
                          disabled={isApplied}
                          className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
                            isApplied
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-800 hover:bg-amber-900 text-white'
                          }`}
                        >
                          {isApplied ? 'Applied ✓' : 'Apply'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
