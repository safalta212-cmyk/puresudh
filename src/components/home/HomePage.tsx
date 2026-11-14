import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowRight,
  ShieldCheck,
  Clock,
  Sparkles,
  MapPin,
  ChevronRight,
  ChevronDown,
  CheckCircle,
  Truck,
  Heart,
  Star,
  Tag,
  Percent,
  Award,
  Flame,
  Search,
  MessageCircle,
  PhoneCall,
  Share2,
  ExternalLink,
  ShoppingBag,
  Check,
  Copy,
  Utensils,
  Leaf,
  Layers,
  HeartHandshake,
} from 'lucide-react';
import { Product, Category, OfferBanner, Offer, Coupon, SiteSettings } from '../../types';
import { ProductCard } from '../product/ProductCard';
import { CategoryCard, OfferCard, Toast } from '../ui';
import { useDelivery } from '../../context/DeliveryContext';
import {
  fetchSponsoredProducts,
  handleSponsoredProductClick,
  SponsoredProductItem,
} from '../../services/sponsoredPlacementService';

const HOMEMADE_THEKUA_IMG = '/images/homemade_thekua_special.jpg';

export interface HomePageProps {
  products: Product[];
  categories: Category[];
  banners: OfferBanner[];
  offers?: Offer[];
  coupons?: Coupon[];
  settings?: SiteSettings;
  onOpenProductDetails: (product: Product) => void;
  onNavigateCategory: (slug: string) => void;
  onNavigateShop: () => void;
  onNavigateAbout: () => void;
  onNavigateContact?: () => void;
  onNavigateOffers?: () => void;
  onTrackOrder?: (orderId?: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  products,
  categories,
  banners,
  offers = [],
  coupons = [],
  settings,
  onOpenProductDetails,
  onNavigateCategory,
  onNavigateShop,
  onNavigateAbout,
  onNavigateContact,
  onNavigateOffers,
  onTrackOrder,
}) => {
  const {
    pincode,
    deliveryArea,
    isDeliverable,
    fastDeliveryAvailable,
    is30MinDelivery,
    estimatedDeliveryTime,
    setPincodeModalOpen,
  } = useDelivery();
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [trackInput, setTrackInput] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [sponsoredHomeItems, setSponsoredHomeItems] = useState<SponsoredProductItem[]>([]);

  // Separate Advertising Selection Layer: Fetch eligible sponsored placements for homepage
  useEffect(() => {
    let isMounted = true;
    fetchSponsoredProducts({
      placement: 'homepage',
      limit: 4,
    }).then((items) => {
      if (isMounted) setSponsoredHomeItems(items);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleQuickTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (onTrackOrder) {
      onTrackOrder(trackInput.trim());
    }
  };

  const handleScrollToCategories = () => {
    const el = document.getElementById('categories-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      onNavigateShop();
    }
  };

  const heroBanner = banners[0] || {
    id: 'b-1',
    title: 'शुद्ध स्वाद, आपके घर तक',
    subtitle: 'Fresh & Quality Products Delivered Fast',
    imageUrl: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=1200&q=80',
    link: '/shop',
    buttonText: 'Shop Now',
    active: true,
    tag: 'Authentic Indian Taste',
  };

  const activeBanners = useMemo(() => {
    const list = Array.isArray(banners) ? banners.filter((b) => b && b.active !== false) : [];
    return list.length > 0 ? list : [heroBanner];
  }, [banners, heroBanner]);

  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);

  // Auto-advance banner carousel every 6 seconds if multiple banners configured
  useEffect(() => {
    if (activeBanners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentBannerIndex((prev) => (prev + 1) % activeBanners.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [activeBanners.length]);

  const currentBanner = activeBanners[currentBannerIndex] || heroBanner;

  // Product splits
  const bestsellers = products.filter((p) => p.bestseller).slice(0, 4);
  const newArrivals = products.filter((p) => p.newArrival).slice(0, 4);
  const freshProducts = products
    .filter(
      (p) =>
        p.categorySlug === 'fresh-food' ||
        p.categorySlug === 'nashta' ||
        p.categorySlug === 'paneer' ||
        p.categorySlug === 'dahi' ||
        p.tags?.includes('Fresh') ||
        p.tags?.includes('Breakfast')
    )
    .slice(0, 4);

  // Fallbacks if filtered arrays are small
  const finalBestsellers = bestsellers.length > 0 ? bestsellers : products.slice(0, 4);
  const finalNewArrivals = newArrivals.length > 0 ? newArrivals : products.slice(4, 8);
  const finalFreshProducts = freshProducts.length > 0 ? freshProducts : products.slice(2, 6);

  // Default active coupons for Offers section
  const displayCoupons: Coupon[] =
    coupons.length > 0
      ? coupons
      : [
          {
            id: 'c-1',
            code: 'PURE50',
            discountType: 'flat',
            discountValue: 50,
            minOrderAmount: 299,
            description: 'Flat ₹50 OFF on your first pure food order',
            active: true,
          },
          {
            id: 'c-2',
            code: 'FESTIVAL20',
            discountType: 'percentage',
            discountValue: 20,
            minOrderAmount: 499,
            description: '20% OFF on Desi Ghee Thekua, Sweets & Combos',
            active: true,
          },
          {
            id: 'c-3',
            code: 'FREEDEL',
            discountType: 'flat',
            discountValue: 40,
            minOrderAmount: 349,
            description: 'Free Express Local Delivery in 25-35 minutes',
            active: true,
          },
        ];

  const whatsappPhone = settings?.whatsappNumber || '+91 98765 43210';
  const cleanPhone = whatsappPhone.replace(/\D/g, '');
  const whatsappUrl = `https://wa.me/${cleanPhone || '919876543210'}?text=${encodeURIComponent(
    'Namaste PURE SUDH! I would like to order fresh products and check daily batch availability.'
  )}`;

  const testimonials = [
    {
      id: 't-1',
      name: 'Sunita Mishra',
      location: 'Kankarbagh, Patna',
      comment:
        'The Gur Thekua is exactly like what my mother used to prepare during Chhath festival! Crunchy, sweet, and pure desi ghee aroma.',
      rating: 5,
      product: 'Traditional Gur Thekua',
    },
    {
      id: 't-2',
      name: 'Rajesh Ranjan',
      location: 'Boring Road, Patna',
      comment:
        'The Malai Paneer melts directly in the mouth with no rubbery feel. Their 30-minute morning delivery is a lifesaver for breakfast.',
      rating: 5,
      product: 'Farm-Fresh Malai Paneer',
    },
    {
      id: 't-3',
      name: 'Pooja Agarwal',
      location: 'Bailey Road, Patna',
      comment:
        'Finally a brand that does not cut corners with palm oils. Authentic Bihari khasta and pure cow milk delivery every single morning.',
      rating: 5,
      product: 'A2 Gir Cow Milk & Sweets',
    },
    {
      id: 't-4',
      name: 'Amitabh Kumar',
      location: 'Rajendra Nagar, Patna',
      comment:
        'Pure nostalgia! The aroma of ajwain and kalonji in their Khasta reminds me of morning chai. Crisp, fresh, and zero palm oil taste.',
      rating: 5,
      product: 'Crispy Khasta Nimki',
    },
  ];

  const faqs = [
    {
      q: 'How are fresh dairy and Thekua items packaged for delivery?',
      a: 'All dairy products (Paneer, Makhan, Milk) are dispatched in insulated thermal bags with cold-gel packs. Thekua and dry snacks are vacuum-sealed in food-grade kraft boxes to retain maximum crunch and aroma.',
    },
    {
      q: 'Do you use any palm oil, artificial colors, or preservatives?',
      a: 'Zero. Under our Pure Sudh Promise, every single item is prepared strictly in 100% pure cow desi ghee or stone-pressed mustard oil. We never use palm oil or artificial preservatives.',
    },
    {
      q: 'How fast will my order reach my location in Patna?',
      a: 'Within supported postal zones in Patna, our hyper-local express fleet delivers hot meals and refrigerated items in approximately 25-35 minutes. You can track your rider in real time on our Track Order page.',
    },
    {
      q: 'What is your refund or freshness guarantee?',
      a: 'If any product does not meet your quality expectations upon arrival, simply contact our WhatsApp support or raise a request within 2 hours of delivery for an instant replacement or full refund.',
    },
  ];

  return (
    <div className="space-y-12 sm:space-y-16 lg:space-y-20 pb-16 w-full max-w-full overflow-hidden">
      {/* Quick Toast feedback */}
      {toastMessage && (
        <div className="fixed bottom-20 right-4 z-50">
          <Toast
            id="home-toast"
            type="success"
            message={toastMessage}
            onDismiss={() => setToastMessage(null)}
          />
        </div>
      )}

      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden bg-stone-900 text-white border-b border-stone-800">
        {/* Background Atmosphere */}
        <div className="absolute inset-0 z-0 opacity-20 mix-blend-overlay pointer-events-none">
          <img
            src={currentBanner.imageUrl || heroBanner.imageUrl}
            alt="Pure Sudh Fresh Kitchen"
            className="w-full h-full object-cover transition-opacity duration-700"
          />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 lg:py-20 grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 lg:gap-12 items-center">
          <div className="lg:col-span-7 space-y-4 sm:space-y-6 text-left">
            {/* Top Brand Pill */}
            <div className="inline-flex items-center gap-2 bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 px-3.5 py-1.5 rounded-full text-xs font-semibold backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Pure Food • Pure Quality • Pure Trust</span>
            </div>

            {/* Headline */}
            <h1 className="text-3xl xs:text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight font-serif text-white leading-[1.15]">
              शुद्ध स्वाद, आपके घर तक
            </h1>

            {/* Subheadline */}
            <p className="text-sm sm:text-lg text-stone-200 font-medium leading-relaxed max-w-xl">
              Fresh & Quality Products Delivered Fast
            </p>

            <p className="text-xs sm:text-sm text-stone-300 max-w-xl leading-relaxed">
              Handcrafted festive Thekua, freshly made Khasta, stone-churned curd, velvety morning
              cow milk paneer, and authentic desi ghee sweets delivered straight from our morning kitchen.
            </p>

            {/* Primary Action Buttons: Shop Now & Explore Categories */}
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5">
              <button
                id="hero-shop-now-btn"
                type="button"
                onClick={onNavigateShop}
                className="bg-emerald-700 hover:bg-emerald-600 text-white font-bold px-6 py-3.5 rounded-2xl text-xs sm:text-sm transition shadow-lg hover:shadow-xl flex items-center justify-center gap-2 group cursor-pointer active:scale-[0.98] min-h-[48px]"
              >
                <span>Shop Now</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform shrink-0" />
              </button>

              <button
                id="hero-explore-categories-btn"
                type="button"
                onClick={handleScrollToCategories}
                className="bg-stone-800/90 hover:bg-stone-700 text-stone-100 border border-stone-600/80 font-bold px-6 py-3.5 rounded-2xl text-xs sm:text-sm transition flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] min-h-[48px]"
              >
                <Layers className="w-4 h-4 text-amber-400" />
                <span>Explore Categories</span>
              </button>

              <button
                id="hero-pincode-btn"
                type="button"
                onClick={() => setPincodeModalOpen(true)}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-stone-800/80 hover:bg-stone-800 text-stone-200 border border-stone-700 text-xs backdrop-blur-md transition cursor-pointer min-h-[48px]"
                title="Change delivery area"
              >
                <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="truncate">
                  PIN: <strong className="text-white font-mono">{pincode}</strong>{' '}
                  {isDeliverable ? (
                    <span>
                      ({fastDeliveryAvailable ? '⚡ Fast Delivery • ' : ''}
                      {is30MinDelivery ? '30-minute delivery' : `${estimatedDeliveryTime} ETA`})
                    </span>
                  ) : (
                    <span className="text-rose-400 font-semibold">(Currently unavailable in your area)</span>
                  )}
                </span>
              </button>
            </div>

            {/* Trust highlights */}
            <div className="pt-3 flex flex-wrap items-center gap-3 sm:gap-6 text-[11px] sm:text-xs text-stone-300">
              <span className="flex items-center gap-1.5 font-medium">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                100% Pure Cow Desi Ghee
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                Zero Chemical Preservatives
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                Fresh Morning Chulha Batches
              </span>
            </div>
          </div>

          {/* Right Hero Visual Card Banner - Visible on ALL screen sizes */}
          <div className="w-full lg:col-span-5 relative block mt-4 sm:mt-6 lg:mt-0">
            <div className="aspect-16/9 sm:aspect-4/3 rounded-2xl sm:rounded-3xl overflow-hidden border-2 border-stone-700/90 shadow-2xl relative bg-stone-800 group">
              <img
                src={currentBanner.imageUrl || HOMEMADE_THEKUA_IMG}
                alt={currentBanner.title || 'Pure Sudh Specials'}
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = HOMEMADE_THEKUA_IMG;
                }}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-stone-950/95 via-stone-950/40 to-transparent flex flex-col justify-end p-4 sm:p-6 text-left">
                {currentBanner.tag && (
                  <span className="bg-amber-600 text-white text-[10px] sm:text-xs font-bold px-2.5 py-0.5 rounded-full uppercase w-fit mb-1.5 sm:mb-2 tracking-wider shadow-xs">
                    {currentBanner.tag}
                  </span>
                )}
                <h3 className="font-serif font-bold text-lg sm:text-xl text-white leading-snug">
                  {currentBanner.title}
                </h3>
                {currentBanner.subtitle && (
                  <p className="text-xs text-stone-300 mt-1 line-clamp-2 leading-relaxed">
                    {currentBanner.subtitle}
                  </p>
                )}
                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="text-amber-400 font-bold text-xs sm:text-sm">
                    {currentBanner.tag?.includes('Festive') || currentBanner.title?.includes('Thekua') ? '₹199 / 500g' : '100% Pure & Fresh'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (currentBanner.link && currentBanner.link !== '/shop') {
                        const matched = products.find(
                          (p) => currentBanner.link?.includes(p.id) || currentBanner.title?.toLowerCase().includes(p.name?.toLowerCase())
                        );
                        if (matched) {
                          onOpenProductDetails(matched);
                          return;
                        }
                      }
                      const thekua = products.find((p) => p.id === 'prod-thekua-traditional');
                      if (thekua && (currentBanner.title?.includes('Thekua') || !currentBanner.link)) {
                        onOpenProductDetails(thekua);
                      } else {
                        onNavigateShop();
                      }
                    }}
                    className="text-[11px] sm:text-xs font-bold text-white bg-white/20 hover:bg-white/30 px-3.5 py-1.5 rounded-xl backdrop-blur-xs transition cursor-pointer touch-manipulation active:scale-95"
                  >
                    {currentBanner.buttonText || 'Quick View'}
                  </button>
                </div>

                {/* Multi-banner navigation indicator dots */}
                {activeBanners.length > 1 && (
                  <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-white/10">
                    {activeBanners.map((_, dotIdx) => (
                      <button
                        key={dotIdx}
                        type="button"
                        onClick={() => setCurrentBannerIndex(dotIdx)}
                        aria-label={`Go to banner slide ${dotIdx + 1}`}
                        className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                          currentBannerIndex === dotIdx ? 'w-6 bg-amber-400' : 'w-2 bg-white/40 hover:bg-white/70'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. USP (4 PILLARS) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Pillar 1: Fresh Products */}
          <div className="p-5 rounded-2xl bg-white border border-stone-200/90 shadow-2xs hover:shadow-xs transition text-left space-y-2.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5 text-emerald-600" />
            </div>
            <h3 className="font-bold text-base text-stone-900 font-serif">Fresh Products</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Daily morning fresh batches prepared at 5:00 AM. Zero cold-storage leftovers or artificial colors.
            </p>
          </div>

          {/* Pillar 2: Quality Checked */}
          <div className="p-5 rounded-2xl bg-white border border-stone-200/90 shadow-2xs hover:shadow-xs transition text-left space-y-2.5">
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5 text-amber-700" />
            </div>
            <h3 className="font-bold text-base text-stone-900 font-serif">Quality Checked</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              100% pure cow desi ghee, stone-pressed mustard oil, and lab-tested A2 milk. FSSAI certified.
            </p>
          </div>

          {/* Pillar 3: Fast Local Delivery */}
          <div className="p-5 rounded-2xl bg-white border border-stone-200/90 shadow-2xs hover:shadow-xs transition text-left space-y-2.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              <Truck className="w-5 h-5 text-emerald-600" />
            </div>
            <h3 className="font-bold text-base text-stone-900 font-serif">Fast Local Delivery</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Insulated thermal packaging delivers hot breakfast warm and raw dairy chilled in ~25-35 mins.
            </p>
          </div>

          {/* Pillar 4: Secure Payments */}
          <div className="p-5 rounded-2xl bg-white border border-stone-200/90 shadow-2xs hover:shadow-xs transition text-left space-y-2.5">
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center font-bold">
              <Award className="w-5 h-5 text-amber-700" />
            </div>
            <h3 className="font-bold text-base text-stone-900 font-serif">Secure Payments</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Seamless UPI (GPay, PhonePe, Paytm), credit/debit cards, net banking, or Cash on Delivery.
            </p>
          </div>
        </div>
      </section>

      {/* QUICK DELIVERY STRIP */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-3.5 sm:p-5 rounded-2xl bg-amber-50/90 border border-amber-200/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h4 className="font-bold text-stone-900 text-xs sm:text-sm truncate">
                Hyper-Local Fresh Food & Dairy Express
              </h4>
              <p className="text-[11px] sm:text-xs text-stone-600 truncate">
                {isDeliverable
                  ? `Serving ${deliveryArea ? deliveryArea.city : 'your city'} (${is30MinDelivery ? '30-minute delivery' : `ETA ~${estimatedDeliveryTime}`})`
                  : `Currently unavailable in your area (${pincode}). Tap to select a delivery zone.`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setPincodeModalOpen(true)}
            className="text-xs font-bold text-amber-900 hover:text-amber-700 bg-white px-3.5 py-2 rounded-xl border border-amber-300 shadow-xs transition shrink-0 text-center touch-manipulation cursor-pointer"
          >
            Change Area (PIN: {pincode})
          </button>
        </div>
      </div>

      {/* 3. CATEGORIES SECTION (ALL 10 CATEGORIES) */}
      <section id="categories-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4 sm:space-y-6 scroll-mt-24">
        <div className="flex items-end justify-between">
          <div>
            <span className="text-xs uppercase font-bold tracking-widest text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              Handcrafted Menu
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 font-serif mt-1">
              Explore Categories
            </h2>
            <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
              Traditional snacks, fresh morning milk, and artisan desi ghee sweets
            </p>
          </div>
          <button
            type="button"
            onClick={onNavigateShop}
            className="text-xs font-bold text-emerald-800 hover:text-emerald-900 flex items-center gap-1 group touch-manipulation cursor-pointer"
          >
            <span>View All</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        {/* 10 Category Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          {(categories || []).map((category) => (
            <CategoryCard
              key={category.id}
              category={category}
              onClick={(c) => onNavigateCategory(c.slug)}
            />
          ))}
        </div>
      </section>

      {/* 4. TODAY'S OFFERS / PROMOTIONS */}
      <section id="offers-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider mb-1">
              <Flame className="w-3.5 h-3.5 text-rose-600" />
              <span>Limited Time Savings</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 font-serif">
              Today&apos;s Offers & Coupons
            </h2>
            <p className="text-xs sm:text-sm text-stone-500">
              Apply coupon codes during checkout to unlock special discounts on fresh food.
            </p>
          </div>

          <button
            type="button"
            onClick={onNavigateShop}
            className="text-xs font-bold text-amber-800 hover:text-amber-900 flex items-center gap-1 self-start sm:self-auto cursor-pointer"
          >
            <span>Shop All Deals</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Dynamic Offer Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayCoupons.map((coupon) => (
            <OfferCard
              key={coupon.id}
              coupon={coupon}
              onApply={(code) => setToastMessage(`Coupon "${code}" copied to clipboard!`)}
            />
          ))}
        </div>
      </section>

      {/* 5. BEST SELLERS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4 sm:space-y-6">
        <div className="flex items-end justify-between">
          <div>
            <span className="text-xs uppercase font-bold tracking-widest text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
              Top Rated Favorites
            </span>
            <h2 className="text-xl sm:text-3xl font-bold text-stone-900 font-serif mt-1">
              Best Sellers
            </h2>
          </div>
          <button
            type="button"
            onClick={onNavigateShop}
            className="text-xs font-bold text-amber-800 hover:text-amber-900 flex items-center gap-1 group touch-manipulation cursor-pointer"
          >
            <span>View All</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          {finalBestsellers.map((prod) => (
            <ProductCard
              key={prod.id}
              product={prod}
              onOpenDetails={onOpenProductDetails}
            />
          ))}
        </div>
      </section>

      {/* SPONSORED PRODUCT PLACEMENT (PHASE 5) */}
      {sponsoredHomeItems.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4 sm:space-y-6">
          <div className="flex items-end justify-between border-b border-amber-200/60 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-bold tracking-widest text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                  Featured Partner Kitchens
                </span>
                <span className="bg-amber-800 text-amber-50 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-600/50 flex items-center gap-1 uppercase tracking-wider">
                  <Sparkles className="w-2.5 h-2.5 text-amber-300" />
                  Sponsored
                </span>
              </div>
              <h2 className="text-xl sm:text-3xl font-bold text-stone-900 font-serif mt-1">
                Sponsored Highlights
              </h2>
            </div>
            <p className="text-xs text-stone-500 hidden sm:block">
              Direct from verified artisanal kitchens
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
            {sponsoredHomeItems.map((s) => (
              <ProductCard
                key={`sp-home-${s.campaignId}`}
                product={s.product}
                isSponsored={true}
                campaignId={s.campaignId}
                onSponsoredClick={(cId, pId) => handleSponsoredProductClick(cId, pId)}
                onOpenDetails={onOpenProductDetails}
              />
            ))}
          </div>
        </section>
      )}

      {/* 6. NEW ARRIVALS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4 sm:space-y-6">
        <div className="flex items-end justify-between">
          <div>
            <span className="text-xs uppercase font-bold tracking-widest text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
              Fresh From The Chulha
            </span>
            <h2 className="text-xl sm:text-3xl font-bold text-stone-900 font-serif mt-1">
              New Arrivals
            </h2>
          </div>
          <button
            type="button"
            onClick={onNavigateShop}
            className="text-xs font-bold text-indigo-800 hover:text-indigo-900 flex items-center gap-1 touch-manipulation cursor-pointer"
          >
            <span>Browse New</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          {finalNewArrivals.map((prod) => (
            <ProductCard
              key={prod.id}
              product={prod}
              onOpenDetails={onOpenProductDetails}
            />
          ))}
        </div>
      </section>

      {/* 7. FRESH PRODUCTS (Hot Meals & Daily Dairy) */}
      <section className="bg-stone-50/90 py-10 sm:py-14 border-y border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div>
              <span className="text-xs uppercase font-bold tracking-widest text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-md border border-emerald-300">
                Morning Batch Purity
              </span>
              <h2 className="text-xl sm:text-3xl font-bold text-stone-900 font-serif mt-1">
                Fresh Products & Hot Meals
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Cooked fresh at 5:00 AM • Zero chemical preservatives • Dispatched in insulated containers
              </p>
            </div>
            <button
              type="button"
              onClick={onNavigateShop}
              className="text-xs font-bold text-emerald-800 hover:underline flex items-center gap-1 shrink-0 touch-manipulation cursor-pointer"
            >
              <span>Explore Menu</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
            {finalFreshProducts.map((prod) => (
              <ProductCard
                key={prod.id}
                product={prod}
                onOpenDetails={onOpenProductDetails}
              />
            ))}
          </div>
        </div>
      </section>

      {/* 8. HOW IT WORKS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <span className="text-xs uppercase font-bold tracking-widest text-amber-800">
            Simple 4-Step Process
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 font-serif">
            How It Works
          </h2>
          <p className="text-xs sm:text-sm text-stone-500">
            From our morning traditional kitchen straight to your dining table in minutes.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          {/* Step 1 */}
          <div className="p-6 rounded-2xl bg-white border border-stone-200/90 shadow-2xs relative text-left space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold text-sm">
                01
              </div>
              <ShoppingBag className="w-5 h-5 text-amber-700" />
            </div>
            <h3 className="font-bold text-base text-stone-900 font-serif">Choose Products</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Select your favorite handcrafted Thekua, A2 milk, clay-pot dahi, hot samosas, or desi sweets.
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-6 rounded-2xl bg-white border border-stone-200/90 shadow-2xs relative text-left space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-900 flex items-center justify-center font-bold text-sm">
                02
              </div>
              <MapPin className="w-5 h-5 text-emerald-700" />
            </div>
            <h3 className="font-bold text-base text-stone-900 font-serif">Enter Location</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Verify your postal pincode and delivery address for lightning express dispatch.
            </p>
          </div>

          {/* Step 3 */}
          <div className="p-6 rounded-2xl bg-white border border-stone-200/90 shadow-2xs relative text-left space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold text-sm">
                03
              </div>
              <CheckCircle className="w-5 h-5 text-amber-700" />
            </div>
            <h3 className="font-bold text-base text-stone-900 font-serif">Place Order</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Pay securely using UPI, Cards, Net Banking, or choose Cash on Delivery at your convenience.
            </p>
          </div>

          {/* Step 4 */}
          <div className="p-6 rounded-2xl bg-white border border-stone-200/90 shadow-2xs relative text-left space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-900 flex items-center justify-center font-bold text-sm">
                04
              </div>
              <Truck className="w-5 h-5 text-emerald-700" />
            </div>
            <h3 className="font-bold text-base text-stone-900 font-serif">Get Fresh Delivery</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Receive your order within ~25-35 minutes packed in pristine food-grade thermal containers.
            </p>
          </div>
        </div>
      </section>

      {/* 9. WHY PURE SUDH */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-stone-900 text-white rounded-2xl sm:rounded-3xl p-6 sm:p-10 lg:p-12 space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs uppercase font-bold tracking-widest text-amber-400">
              Our Uncompromising Promise
            </span>
            <h2 className="text-2xl sm:text-4xl font-bold font-serif">
              Why PURE SUDH?
            </h2>
            <p className="text-xs sm:text-sm text-stone-300">
              We pledge to preserve the sanctity of traditional Indian foods with zero compromises on ingredients.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="p-5 rounded-2xl bg-stone-800/80 border border-stone-700/80 space-y-2.5 text-left">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm sm:text-base text-white">100% Pure Desi Ghee</h3>
              <p className="text-xs text-stone-300 leading-relaxed">
                Zero palm oil or adulterated vanaspati. We prepare all snacks and sweets strictly in authentic cow desi ghee.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-stone-800/80 border border-stone-700/80 space-y-2.5 text-left">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm sm:text-base text-white">Fresh Daily Batches</h3>
              <p className="text-xs text-stone-300 leading-relaxed">
                Fresh batches prepared at 5:00 AM every single morning. No cold-storage preservatives or chemical enhancers.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-stone-800/80 border border-stone-700/80 space-y-2.5 text-left">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                <Truck className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm sm:text-base text-white">Thermal Insulated Care</h3>
              <p className="text-xs text-stone-300 leading-relaxed">
                Food-grade insulated bags ensure hot puries stay steaming hot and raw milk stays chilled below 4°C.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-stone-800/80 border border-stone-700/80 space-y-2.5 text-left">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                <Award className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm sm:text-base text-white">Ancestral Wooden Sancha</h3>
              <p className="text-xs text-stone-300 leading-relaxed">
                Authentic formulation molded with traditional wooden sancha dies, whole wheat, and organic jaggery.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 10. REVIEWS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="text-center max-w-xl mx-auto space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-900 border border-amber-200 text-xs font-semibold mb-1">
            <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
            <span>4.9 / 5.0 Rating from 1,200+ Families</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 font-serif">
            Loved By Families Across Bihar
          </h2>
          <p className="text-xs sm:text-sm text-stone-500">
            Read real feedback from verified customers who order their daily meals and festival sweets from PURE SUDH.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {(testimonials || []).map((t) => (
            <div
              key={t.id}
              className="p-5 rounded-2xl bg-white border border-stone-200 shadow-2xs flex flex-col justify-between space-y-4 text-left"
            >
              <div className="space-y-3">
                <div className="flex items-center gap-1">
                  {[...Array(t.rating || 5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-500 text-amber-500" />
                  ))}
                </div>
                <p className="text-xs sm:text-sm text-stone-700 leading-relaxed italic">
                  &ldquo;{t.comment}&rdquo;
                </p>
              </div>

              <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-stone-900">{t.name}</h4>
                  <p className="text-[11px] text-stone-400">{t.location}</p>
                </div>
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                  Verified Order
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 11. WHATSAPP SUPPORT */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl sm:rounded-3xl bg-gradient-to-br from-emerald-900 via-emerald-950 to-stone-900 text-white p-6 sm:p-10 border border-emerald-800 shadow-lg">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="space-y-3 max-w-xl text-left">
              <div className="inline-flex items-center gap-1.5 bg-emerald-800/80 text-emerald-200 border border-emerald-600/50 px-3 py-1 rounded-full text-xs font-semibold">
                <MessageCircle className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                <span>Instant Human Support</span>
              </div>

              <h3 className="text-2xl sm:text-3xl font-extrabold font-serif text-white">
                Order or Inquire on WhatsApp
              </h3>

              <p className="text-xs sm:text-sm text-emerald-100 leading-relaxed">
                Need customized festival orders, bulk Thekua boxes, or morning milk subscriptions? Our team is live to assist you on WhatsApp every single day.
              </p>

              <div className="flex flex-wrap items-center gap-4 text-xs text-emerald-200">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-emerald-400" />
                  7:00 AM – 10:00 PM Daily
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-400" />
                  Average reply in under 2 minutes
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto shrink-0">
              <a
                id="whatsapp-chat-cta"
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold px-6 py-3.5 rounded-2xl text-xs sm:text-sm transition flex items-center justify-center gap-2.5 shadow-md active:scale-95 touch-manipulation text-center"
              >
                <MessageCircle className="w-4 h-4 text-stone-950 fill-stone-950" />
                <span>Chat on WhatsApp ({whatsappPhone})</span>
              </a>

              {onNavigateContact && (
                <button
                  type="button"
                  onClick={onNavigateContact}
                  className="bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-200 border border-emerald-700/60 font-semibold px-5 py-3.5 rounded-2xl text-xs sm:text-sm transition flex items-center justify-center gap-2 active:scale-95 touch-manipulation cursor-pointer"
                >
                  <PhoneCall className="w-4 h-4" />
                  <span>Contact Page</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 12. SOCIAL MEDIA & COMMUNITY */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="p-6 sm:p-8 rounded-2xl sm:rounded-3xl bg-amber-50/70 border border-amber-200/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 text-left max-w-lg">
            <span className="text-xs uppercase font-bold tracking-widest text-amber-800">
              Community & Kitchen Stories
            </span>
            <h3 className="text-xl sm:text-2xl font-bold font-serif text-stone-900">
              Join the PURE SUDH Family
            </h3>
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
              Watch behind-the-scenes Thekua shaping with traditional wooden molds, morning chulha cooking videos, and daily menu drops.
            </p>
          </div>

          {/* Social Links */}
          <div className="flex flex-wrap items-center gap-3">
            <a
              href={settings?.instagramUrl || "https://www.instagram.com/pure.sudh"}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-stone-200 hover:border-pink-300 text-stone-700 hover:text-pink-600 text-xs font-bold transition shadow-2xs cursor-pointer"
              title="Follow @pure.sudh on Instagram"
            >
              <span>📸 Instagram (@pure.sudh)</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-60" />
            </a>

            <a
              href="https://facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-stone-200 hover:border-blue-300 text-stone-700 hover:text-blue-600 text-xs font-bold transition shadow-2xs cursor-pointer"
            >
              <span>📘 Facebook</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-60" />
            </a>

            <a
              href={settings?.youtubeUrl || "https://www.youtube.com/@puresudh"}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-stone-200 hover:border-red-300 text-stone-700 hover:text-red-600 text-xs font-bold transition shadow-2xs cursor-pointer"
              aria-label="Subscribe to Pure Sudh on YouTube (@puresudh)"
              title="YouTube: @puresudh"
            >
              <span>📺 YouTube (@puresudh)</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-60" />
            </a>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition shadow-2xs cursor-pointer"
            >
              <span>💬 WhatsApp Channel</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </section>

      {/* TRACK LIVE ORDER CARD */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-5 sm:p-7 rounded-3xl bg-stone-900 text-white border border-stone-800 shadow-md">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-300 text-[11px] font-bold tracking-wider uppercase border border-emerald-500/25">
                <Truck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Real-Time Kitchen & Dispatch Tracking</span>
              </div>
              <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold font-serif text-white tracking-tight">
                Track Your PURE SUDH Order
              </h3>
              <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
                Check whether your fresh Thekua is in the kadhai, packed in food-grade boxes, or out for delivery with our local express fleet.
              </p>
            </div>

            {/* Quick Track Search Input */}
            <form
              onSubmit={handleQuickTrack}
              className="flex flex-col sm:flex-row items-stretch gap-2.5 w-full lg:max-w-md shrink-0"
            >
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5 pointer-events-none" />
                <input
                  id="home-quick-track-input"
                  type="text"
                  value={trackInput ?? ''}
                  onChange={(e) => setTrackInput(e.target.value)}
                  placeholder="Enter Order # (PS-...) or Phone"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-stone-800 border border-stone-700 text-white placeholder-stone-400 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[46px]"
                />
              </div>
              <button
                id="home-quick-track-btn"
                type="submit"
                className="bg-emerald-700 hover:bg-emerald-600 text-white font-bold px-6 py-3 rounded-xl text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-xs touch-manipulation min-h-[46px] shrink-0 cursor-pointer active:scale-[0.98]"
              >
                <Truck className="w-4 h-4" />
                <span>Track Now</span>
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* FAQ (RESPONSIVE ACCORDION) */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="text-center space-y-1">
          <span className="text-xs uppercase font-bold tracking-widest text-amber-800">
            Common Questions
          </span>
          <h2 className="text-xl sm:text-3xl font-bold text-stone-900 font-serif">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-3">
          {(faqs || []).map((faq, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-stone-200 bg-white overflow-hidden shadow-2xs transition"
            >
              <button
                type="button"
                onClick={() => setOpenFaqIndex(openFaqIndex === idx ? null : idx)}
                className="w-full flex items-center justify-between p-4 sm:p-5 text-left text-xs sm:text-sm font-bold text-stone-900 hover:bg-stone-50 transition touch-manipulation cursor-pointer"
              >
                <span className="pr-4">{faq.q}</span>
                <ChevronDown
                  className={`w-4 h-4 text-stone-500 shrink-0 transition-transform duration-200 ${
                    openFaqIndex === idx ? 'rotate-180 text-amber-700' : ''
                  }`}
                />
              </button>
              {openFaqIndex === idx && (
                <div className="px-4 pb-4 sm:px-5 sm:pb-5 text-xs sm:text-sm text-stone-600 leading-relaxed border-t border-stone-100 pt-3">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
