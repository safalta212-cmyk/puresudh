import React from 'react';
import {
  ShoppingCart,
  Heart,
  User,
  MapPin,
  Sparkles,
  Store,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { BRAND } from '../../constants';
import { SearchBar } from './SearchBar';

export interface HeaderProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onOpenCart: () => void;
  cartCount: number;
  wishlistCount: number;
  selectedPincode?: string;
  onOpenPincodeModal?: () => void;
  onOpenAuthModal?: () => void;
  user?: { displayName?: string; email?: string } | null;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  setCurrentView,
  searchQuery,
  setSearchQuery,
  onOpenCart,
  cartCount,
  wishlistCount,
  selectedPincode = '800001',
  onOpenPincodeModal,
  onOpenAuthModal,
  user,
}) => {
  const navLinks = [
    { id: 'home', label: 'Home' },
    { id: 'shop', label: 'All Products' },
    { id: 'track-order', label: 'Track Order' },
    { id: 'faq', label: 'Purity FAQ' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200/90 shadow-2xs transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 py-3 sm:py-3.5">
          {/* Brand Logo & Tagline */}
          <div
            onClick={() => setCurrentView('home')}
            className="flex items-center gap-3 cursor-pointer select-none group"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setCurrentView('home')}
            aria-label="PURE SUDH Home"
          >
            <div className="w-10 h-10 rounded-2xl bg-emerald-800 group-hover:bg-emerald-900 transition-colors flex items-center justify-center text-amber-300 font-serif font-extrabold text-lg shadow-xs border border-emerald-700/50">
              PS
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif font-black text-xl sm:text-2xl text-stone-900 tracking-wide">
                  {BRAND.NAME}
                </span>
                <span className="veg-indicator" title="100% Pure Vegetarian">
                  <span className="veg-indicator-dot" />
                </span>
              </div>
              <p className="text-[11px] font-hindi text-emerald-800 font-medium tracking-wide">
                {BRAND.HINDI_TAGLINE}
              </p>
            </div>
          </div>

          {/* Delivery Location Selector */}
          <button
            type="button"
            onClick={onOpenPincodeModal}
            className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-stone-50 hover:bg-stone-100 border border-stone-200/80 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
            aria-label="Choose delivery location"
          >
            <MapPin className="w-4 h-4 text-emerald-700 shrink-0" />
            <div className="text-xs">
              <span className="text-stone-400 block text-[10px] uppercase font-bold">Deliver to</span>
              <span className="font-semibold text-stone-800 truncate max-w-[120px] block">
                {selectedPincode} (25-35m)
              </span>
            </div>
          </button>

          {/* Center Search Input */}
          <div className="flex-1 max-w-lg hidden sm:block">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              onSubmit={() => setCurrentView('shop')}
            />
          </div>

          {/* Right Action Icons */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Wishlist Button */}
            <button
              type="button"
              onClick={() => setCurrentView('wishlist')}
              className={`relative p-2.5 rounded-xl hover:bg-stone-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 ${
                currentView === 'wishlist' ? 'text-emerald-800 bg-emerald-50' : 'text-stone-600'
              }`}
              aria-label={`Wishlist with ${wishlistCount} items`}
            >
              <Heart className="w-5 h-5" />
              {wishlistCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center shadow-xs">
                  {wishlistCount}
                </span>
              )}
            </button>

            {/* Account Profile / Login Button */}
            <button
              type="button"
              onClick={() => (user ? setCurrentView('account') : onOpenAuthModal?.())}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold hover:bg-stone-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 ${
                currentView === 'account' ? 'text-emerald-800 bg-emerald-50' : 'text-stone-700'
              }`}
              aria-label={user ? 'My Account' : 'Sign in'}
            >
              <User className="w-4 h-4 text-emerald-800" />
              <span className="hidden lg:inline truncate max-w-[100px]">
                {user?.displayName ? user.displayName.split(' ')[0] : 'Sign In'}
              </span>
            </button>

            {/* Cart Trigger */}
            <button
              type="button"
              onClick={onOpenCart}
              className="flex items-center gap-2.5 bg-emerald-700 hover:bg-emerald-800 text-white px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold shadow-2xs hover:shadow-xs transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 min-h-[44px]"
              aria-label={`Cart with ${cartCount} items`}
            >
              <div className="relative">
                <ShoppingCart className="w-4 h-4" />
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-amber-400 text-stone-950 text-[10px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </div>
              <span className="hidden sm:inline">Cart</span>
            </button>
          </div>
        </div>

        {/* Secondary Category / Nav Bar */}
        <nav
          aria-label="Main category navigation"
          className="flex items-center justify-between border-t border-stone-100 py-2 overflow-x-auto no-scrollbar gap-4 text-xs font-medium text-stone-600"
        >
          <div className="flex items-center gap-5 shrink-0">
            {navLinks.map((link) => (
              <button
                key={link.id}
                type="button"
                onClick={() => setCurrentView(link.id)}
                className={`pb-0.5 transition-colors whitespace-nowrap focus-visible:outline-none ${
                  currentView === link.id
                    ? 'text-emerald-800 font-bold border-b-2 border-emerald-700'
                    : 'hover:text-emerald-800'
                }`}
              >
                {link.label}
              </button>
            ))}
          </div>

          <div className="hidden sm:flex items-center gap-3 text-stone-500 text-[11px] shrink-0">
            <span className="flex items-center gap-1 text-emerald-800 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" /> 100% Desi Ghee & Pure Dairy
            </span>
            <span className="opacity-40">•</span>
            <span className="flex items-center gap-1 text-amber-800 font-semibold">
              <Clock className="w-3.5 h-3.5" /> 25-35 Mins Fast Delivery
            </span>
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Header;
