import React, { useState } from 'react';
import {
  Search,
  ShoppingCart,
  Heart,
  User,
  MapPin,
  Menu,
  X,
  ChevronDown,
  Shield,
  Truck,
  Store,
  LogOut,
  Package,
  ClipboardList,
  Star,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { useDelivery } from '../../context/DeliveryContext';
import { UserRole } from '../../types';
import { NotificationCenter } from '../notifications/NotificationCenter';

interface HeaderProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCategorySlug?: string;
  setSelectedCategorySlug?: (slug: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  setCurrentView,
  searchQuery = '',
  setSearchQuery,
  selectedCategorySlug = '',
  setSelectedCategorySlug,
}) => {
  const { user, role, logout, openAuthModal } = useAuth();
  const { itemCount, subtotal, setIsCartOpen } = useCart();
  const { wishlist, setIsWishlistOpen } = useWishlist();
  const {
    pincode,
    isDeliverable,
    fastDeliveryAvailable,
    is30MinDelivery,
    deliveryArea,
    estimatedDeliveryTime,
    setPincodeModalOpen,
  } = useDelivery();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileSearchExpanded, setIsMobileSearchExpanded] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setCurrentView('shop');
      setIsMobileMenuOpen(false);
      setIsMobileSearchExpanded(false);
    }
  };

  const handleCategoryNav = (slug: string) => {
    if (setSelectedCategorySlug) {
      setSelectedCategorySlug(slug);
    }
    setCurrentView('shop');
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200 shadow-xs w-full max-w-full">
      {/* Top Announcement & Quick Links Bar */}
      <div className="bg-stone-900 text-stone-200 text-xs py-1.5 px-3 sm:px-6 lg:px-8 border-b border-stone-800">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4 min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2 truncate font-medium text-[11px] sm:text-xs">
            <span className="text-amber-400 font-serif truncate">शुद्ध स्वाद, आपके घर तक</span>
            <span className="hidden md:inline text-stone-500">•</span>
            <span className="hidden md:inline text-stone-300 truncate">
              Pure Food • Pure Quality • Pure Trust
            </span>
            <span className="hidden sm:inline text-stone-500">•</span>
            <button
              type="button"
              id="topbar-track-order-link"
              onClick={() => setCurrentView('track-order')}
              className="text-emerald-400 hover:text-emerald-300 font-semibold truncate hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Truck className="w-3 h-3 text-emerald-400 shrink-0" />
              <span>Track Live Order</span>
            </button>
          </div>

          {/* Right Status / Authenticated Portal Shortcut */}
          {user && (
            <div className="shrink-0 flex items-center gap-2">
              <div className="flex items-center gap-2">
                {role === 'admin' && (
                  <button
                    type="button"
                    onClick={() => setCurrentView('admin')}
                    className="flex items-center gap-1 bg-amber-950/80 hover:bg-amber-900 text-amber-300 px-2 py-0.5 sm:px-2.5 sm:py-0.5 rounded-full text-[11px] font-semibold border border-amber-600/40 transition cursor-pointer"
                  >
                    <Shield className="w-3 h-3 text-amber-400 shrink-0" />
                    <span>Admin Console</span>
                  </button>
                )}
                {role === 'staff' && (
                  <button
                    type="button"
                    onClick={() => setCurrentView('staff')}
                    className="flex items-center gap-1 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 px-2 py-0.5 sm:px-2.5 sm:py-0.5 rounded-full text-[11px] font-semibold border border-emerald-600/40 transition cursor-pointer"
                  >
                    <ClipboardList className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span>Staff Desk</span>
                  </button>
                )}
                {role === 'vendor' && (
                  <button
                    type="button"
                    onClick={() => setCurrentView('vendor')}
                    className="flex items-center gap-1 bg-amber-950/80 hover:bg-amber-900 text-amber-300 px-2 py-0.5 sm:px-2.5 sm:py-0.5 rounded-full text-[11px] font-semibold border border-amber-600/40 transition cursor-pointer"
                  >
                    <Store className="w-3 h-3 text-amber-400 shrink-0" />
                    <span>Vendor Hub</span>
                  </button>
                )}
                {role === 'customer' && (
                  <span className="text-[11px] text-stone-300 hidden sm:inline">
                    Namaste, <strong className="text-white font-medium">{user.displayName?.split(' ')[0] || 'Customer'}</strong>
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3.5 flex items-center justify-between gap-2 sm:gap-4 lg:gap-8">
        {/* Mobile Left: Hamburger + Brand Logo */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            id="mobile-menu-toggle-btn"
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 -ml-1 text-stone-700 hover:text-stone-900 rounded-xl hover:bg-stone-100 lg:hidden shrink-0 touch-manipulation min-w-[40px] min-h-[40px] flex items-center justify-center"
            aria-label="Toggle navigation menu"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

          <button
            id="logo-brand-btn"
            onClick={() => setCurrentView('home')}
            className="text-left group flex flex-col items-start min-w-0 cursor-pointer"
          >
            <div className="flex items-center gap-1">
              <span className="font-extrabold text-xl sm:text-2xl lg:text-3xl tracking-tight text-amber-900 font-serif leading-none">
                PURE
              </span>
              <span className="font-extrabold text-xl sm:text-2xl lg:text-3xl tracking-tight text-emerald-800 font-serif leading-none">
                SUDH
              </span>
            </div>
            <span className="text-[9px] sm:text-[11px] font-semibold tracking-wider text-stone-500 group-hover:text-amber-800 transition truncate max-w-[150px] sm:max-w-none mt-0.5">
              शुद्ध स्वाद, आपके घर तक
            </span>
          </button>
        </div>

        {/* Location Delivery Selector Pill (Desktop / Tablet) */}
        <button
          id="header-pincode-selector-btn"
          type="button"
          onClick={() => setPincodeModalOpen(true)}
          className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-stone-200 bg-stone-50/70 hover:bg-stone-100/90 text-stone-800 text-xs transition shrink-0"
          aria-label="Change delivery location"
        >
          <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
            <MapPin className="w-3.5 h-3.5" />
          </div>
          <div className="text-left leading-tight">
            <div className="font-bold text-stone-900 flex items-center gap-1">
              <span>{pincode}</span>
              {deliveryArea && (
                <span className="text-stone-500 font-normal truncate max-w-[90px]">
                  • {deliveryArea.city}
                </span>
              )}
            </div>
            {isDeliverable ? (
              <div className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                <span>{fastDeliveryAvailable ? '⚡ Fast Delivery Available' : '⚡ Delivery Available'}</span>
                <span>• {is30MinDelivery ? '30-min' : estimatedDeliveryTime}</span>
              </div>
            ) : (
              <div className="text-[10px] text-rose-600 font-semibold">
                Currently unavailable in your area
              </div>
            )}
          </div>
        </button>

        {/* Search Bar with live submit (Desktop/Tablet) */}
        <form
          onSubmit={handleSearchSubmit}
          className="flex-1 max-w-md hidden sm:flex items-center relative"
        >
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 pointer-events-none" />
          <input
            id="global-search-input"
            type="search"
            value={searchQuery ?? ''}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Thekua, Fresh Paneer, A2 Milk, Sweets..."
            className="w-full pl-10 pr-12 py-2 rounded-xl border border-stone-200 bg-stone-50/80 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-xs sm:text-sm placeholder-stone-400 transition"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 text-stone-400 hover:text-stone-600 text-xs"
            >
              Clear
            </button>
          )}
        </form>

        {/* Action Controls: Mobile Search, Wishlist, Cart, Profile */}
        <div className="flex items-center gap-1 sm:gap-2.5 lg:gap-4 shrink-0">
          {/* Mobile Search Toggle Button */}
          <button
            id="mobile-search-toggle-btn"
            type="button"
            onClick={() => setIsMobileSearchExpanded(!isMobileSearchExpanded)}
            className={`sm:hidden relative w-9 h-9 rounded-xl flex items-center justify-center transition-colors touch-manipulation cursor-pointer ${
              isMobileSearchExpanded
                ? 'bg-stone-200/90 text-stone-900'
                : 'text-stone-700 hover:text-amber-900 hover:bg-stone-100 active:bg-stone-200'
            }`}
            aria-label={isMobileSearchExpanded ? 'Close search bar' : 'Open search bar'}
            aria-expanded={isMobileSearchExpanded}
            title={isMobileSearchExpanded ? 'Close search' : 'Search products'}
          >
            {isMobileSearchExpanded ? (
              <X className="w-4 h-4 text-stone-800" />
            ) : (
              <Search className="w-4 h-4 text-stone-700" />
            )}
          </button>

          {/* Marketplace Portal Shortcut */}
          <button
            id="nav-marketplace-portal-btn"
            type="button"
            onClick={() => setCurrentView('vendor')}
            className={`hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              currentView === 'vendor'
                ? 'bg-amber-900 text-white shadow-xs'
                : 'bg-stone-100 text-stone-800 hover:bg-stone-200 border border-stone-200/80'
            }`}
            title="Explore Pure Sudh Marketplace Vendors"
          >
            <Store className="w-3.5 h-3.5 text-amber-700" />
            Marketplace
          </button>

          {/* Admin shortcut if admin role */}
          {role === 'admin' && (
            <button
              id="nav-admin-dashboard-btn"
              type="button"
              onClick={() => setCurrentView('admin')}
              className={`hidden md:flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                currentView === 'admin'
                  ? 'bg-amber-800 text-white'
                  : 'bg-amber-100 text-amber-900 hover:bg-amber-200'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              Admin Panel
            </button>
          )}

          {/* Notifications Center */}
          <NotificationCenter
            onNavigateToTrackOrder={(orderId) => {
              setCurrentView('track-order');
            }}
            onNavigateToOffers={() => {
              setCurrentView('offers');
            }}
          />

          {/* Wishlist Icon */}
          <button
            id="header-wishlist-btn"
            type="button"
            onClick={() => setIsWishlistOpen(true)}
            className="relative p-2 text-stone-600 hover:text-amber-800 rounded-xl hover:bg-stone-100 transition touch-manipulation min-w-[40px] min-h-[40px] flex items-center justify-center cursor-pointer"
            aria-label="Wishlist"
            title="Open your wishlist"
          >
            <Heart className="w-5 h-5" />
            {wishlist.length > 0 && (
              <span
                id="wishlist-badge"
                className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center animate-pulse"
              >
                {wishlist.length}
              </span>
            )}
          </button>

          {/* Cart Button */}
          <button
            id="header-cart-btn"
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="flex items-center gap-1.5 sm:gap-2 bg-amber-700 hover:bg-amber-800 text-white px-2.5 sm:px-4 py-2 rounded-xl transition shadow-xs touch-manipulation min-w-[40px] min-h-[40px] justify-center"
            aria-label="Shopping Cart"
          >
            <div className="relative">
              <ShoppingCart className="w-5 h-5" />
              {itemCount > 0 && (
                <span
                  id="cart-badge-count"
                  className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-white text-amber-900 text-[10px] font-extrabold flex items-center justify-center shadow-xs"
                >
                  {itemCount}
                </span>
              )}
            </div>
            <span className="hidden sm:inline font-bold text-xs sm:text-sm">
              ₹{subtotal.toFixed(0)}
            </span>
          </button>

          {/* Account Dropdown */}
          <div className="relative">
            {user ? (
              <div>
                <button
                  id="user-profile-menu-btn"
                  type="button"
                  onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                  className="flex items-center gap-1.5 p-1.5 sm:px-3 sm:py-2 rounded-xl border border-stone-200 hover:border-stone-300 bg-stone-50 hover:bg-stone-100 transition text-xs font-semibold text-stone-800 touch-manipulation min-w-[40px] min-h-[40px] justify-center"
                  aria-label="User Account Menu"
                >
                  <div className="w-6 h-6 rounded-full bg-amber-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                    {user.displayName ? user.displayName[0].toUpperCase() : 'U'}
                  </div>
                  <span className="hidden md:inline truncate max-w-[100px]">
                    {user.displayName?.split(' ')[0] || 'Account'}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-stone-400 hidden sm:inline shrink-0" />
                </button>

                {isUserDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40 cursor-default"
                      onClick={() => setIsUserDropdownOpen(false)}
                      aria-hidden="true"
                    />
                    <div
                      id="user-dropdown-popup"
                      className="absolute right-0 top-full mt-2 w-60 sm:w-64 bg-white rounded-2xl shadow-2xl border border-stone-200 py-2 z-50 animate-in fade-in max-h-[calc(100vh-4.5rem)] overflow-y-auto overscroll-contain"
                    >
                      <div className="px-4 py-2.5 border-b border-stone-100 bg-stone-50/60 rounded-t-2xl">
                        <p className="font-bold text-sm text-stone-900 truncate">{user.displayName || 'Customer'}</p>
                        <p className="text-xs text-stone-500 truncate">{user.email || ''}</p>
                      </div>
                      <div className="py-1">
                        <button
                          id="menu-my-account"
                          type="button"
                          onClick={() => {
                            setCurrentView('/account/profile');
                            setIsUserDropdownOpen(false);
                          }}
                          className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-stone-700 hover:bg-amber-50 transition font-medium text-left cursor-pointer"
                        >
                          <User className="w-4 h-4 text-stone-500 shrink-0" />
                          <span>My Profile</span>
                        </button>
                        <button
                          id="menu-my-orders"
                          type="button"
                          onClick={() => {
                            setCurrentView('/account/orders');
                            setIsUserDropdownOpen(false);
                          }}
                          className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-stone-700 hover:bg-amber-50 transition font-medium text-left cursor-pointer"
                        >
                          <Package className="w-4 h-4 text-stone-500 shrink-0" />
                          <span>My Orders & Tracking</span>
                        </button>
                        <button
                          id="menu-addresses"
                          type="button"
                          onClick={() => {
                            setCurrentView('/account/addresses');
                            setIsUserDropdownOpen(false);
                          }}
                          className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-stone-700 hover:bg-amber-50 transition font-medium text-left cursor-pointer"
                        >
                          <MapPin className="w-4 h-4 text-stone-500 shrink-0" />
                          <span>Saved Addresses</span>
                        </button>
                        <button
                          id="menu-wishlist"
                          type="button"
                          onClick={() => {
                            setCurrentView('/account/wishlist');
                            setIsUserDropdownOpen(false);
                          }}
                          className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-stone-700 hover:bg-amber-50 transition font-medium text-left cursor-pointer"
                        >
                          <Heart className="w-4 h-4 text-rose-500 shrink-0" />
                          <span>Saved Wishlist</span>
                        </button>
                        <button
                          id="menu-reviews"
                          type="button"
                          onClick={() => {
                            setCurrentView('/account/reviews');
                            setIsUserDropdownOpen(false);
                          }}
                          className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-stone-700 hover:bg-amber-50 transition font-medium text-left cursor-pointer"
                        >
                          <Star className="w-4 h-4 text-amber-500 shrink-0" />
                          <span>Verified Reviews</span>
                        </button>
                        <button
                          id="menu-track-order"
                          type="button"
                          onClick={() => {
                            setCurrentView('track-order');
                            setIsUserDropdownOpen(false);
                          }}
                          className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-stone-700 hover:bg-amber-50 transition font-medium text-left cursor-pointer"
                        >
                          <Truck className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>Track Live Order</span>
                        </button>
                      </div>

                      <div className="pt-1 border-t border-stone-100">
                        {role === 'admin' && (
                          <button
                            id="menu-admin-panel"
                            type="button"
                            onClick={() => {
                              setCurrentView('admin');
                              setIsUserDropdownOpen(false);
                            }}
                            className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-amber-900 bg-amber-50/70 hover:bg-amber-100 transition font-semibold text-left cursor-pointer"
                          >
                            <Shield className="w-4 h-4 text-amber-700 shrink-0" />
                            <span>Admin Dashboard</span>
                          </button>
                        )}
                        {(role === 'staff' || role === 'admin') && (
                          <button
                            id="menu-staff-desk"
                            type="button"
                            onClick={() => {
                              setCurrentView('staff');
                              setIsUserDropdownOpen(false);
                            }}
                            className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-stone-800 hover:bg-amber-50 transition font-medium text-left cursor-pointer"
                          >
                            <ClipboardList className="w-4 h-4 text-amber-600 shrink-0" />
                            <span>Staff Operations Desk</span>
                          </button>
                        )}
                        {(role === 'vendor' || role === 'admin') && (
                          <button
                            id="menu-marketplace-hub"
                            type="button"
                            onClick={() => {
                              setCurrentView('vendor');
                              setIsUserDropdownOpen(false);
                            }}
                            className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-stone-700 hover:bg-amber-50 transition font-medium text-left cursor-pointer"
                          >
                            <Store className="w-4 h-4 text-amber-700 shrink-0" />
                            <span>Marketplace Vendors</span>
                          </button>
                        )}
                      </div>

                      <div className="pt-1.5 mt-1 border-t border-stone-100 pb-1">
                        <button
                          id="menu-logout-btn"
                          type="button"
                          onClick={() => {
                            logout();
                            setIsUserDropdownOpen(false);
                          }}
                          className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 transition font-medium text-left cursor-pointer"
                        >
                          <LogOut className="w-4 h-4 shrink-0" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <button
                id="header-login-btn"
                type="button"
                onClick={() => setCurrentView('customer-login')}
                className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold transition touch-manipulation min-w-[40px] min-h-[40px] justify-center"
              >
                <User className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden xs:inline sm:inline">Sign In</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Expandable Mobile Search Input */}
      {isMobileSearchExpanded && (
        <div className="sm:hidden px-3 pb-3 pt-1 border-t border-stone-100 bg-stone-50 animate-in slide-in-from-top-1">
          <form onSubmit={handleSearchSubmit} className="relative flex items-center">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 pointer-events-none" />
            <input
              type="search"
              autoFocus
              value={searchQuery ?? ''}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Thekua, Paneer, Milk, Sweets..."
              className="w-full pl-9 pr-20 py-2.5 rounded-xl border border-stone-300 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-inner"
            />
            {Boolean(searchQuery) && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-12 text-stone-400 hover:text-stone-700 text-xs px-1.5 py-1"
                aria-label="Clear search"
              >
                Clear
              </button>
            )}
            <button
              type="submit"
              className="absolute right-1.5 bg-amber-700 hover:bg-amber-800 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg transition active:scale-95"
            >
              Go
            </button>
          </form>
        </div>
      )}

      {/* Sub Navigation Bar for Desktop Categories & Pages */}
      <div className="hidden lg:block border-t border-stone-100 bg-stone-50/60 py-2 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs font-semibold text-stone-600">
          <div className="flex items-center gap-5 xl:gap-6">
            <button
              id="subnav-home"
              type="button"
              onClick={() => setCurrentView('home')}
              className={`hover:text-amber-800 transition ${
                currentView === 'home' ? 'text-amber-800 font-bold' : ''
              }`}
            >
              Home
            </button>
            <button
              id="subnav-shop-all"
              type="button"
              onClick={() => {
                if (setSelectedCategorySlug) setSelectedCategorySlug('');
                setCurrentView('shop');
              }}
              className={`hover:text-amber-800 transition ${
                currentView === 'shop' && !selectedCategorySlug ? 'text-amber-800 font-bold' : ''
              }`}
            >
              Shop
            </button>
            <button
              id="subnav-cat-homemade"
              type="button"
              onClick={() => handleCategoryNav('homemade')}
              className={`hover:text-amber-800 transition ${
                selectedCategorySlug === 'homemade' ? 'text-amber-800 font-bold' : ''
              }`}
            >
              Categories
            </button>
            <button
              id="subnav-offers"
              type="button"
              onClick={() => {
                if (setSelectedCategorySlug) setSelectedCategorySlug('');
                setCurrentView('offers');
              }}
              className={`hover:text-amber-800 transition font-bold flex items-center gap-1 ${
                currentView === 'offers' ? 'text-amber-800 underline underline-offset-4' : 'text-amber-700'
              }`}
            >
              <span>Offers</span>
              <span className="bg-rose-600 text-white text-[9px] font-extrabold px-1.5 py-0.2 rounded-full uppercase">
                Hot
              </span>
            </button>
            <button
              id="subnav-cat-dairy"
              type="button"
              onClick={() => handleCategoryNav('dairy-products')}
              className="hover:text-amber-800 transition"
            >
              Fresh A2 Dairy & Paneer
            </button>
            <button
              id="subnav-cat-sweets"
              type="button"
              onClick={() => handleCategoryNav('sweets')}
              className="hover:text-amber-800 transition"
            >
              Pure Desi Ghee Sweets
            </button>
            <button
              id="subnav-cat-fresh"
              type="button"
              onClick={() => handleCategoryNav('fresh-food')}
              className="hover:text-amber-800 transition"
            >
              Fresh Meals
            </button>
          </div>

          <div className="flex items-center gap-5 xl:gap-6 text-stone-500">
            <button
              id="subnav-track-order"
              type="button"
              onClick={() => setCurrentView('track-order')}
              className={`hover:text-emerald-700 transition flex items-center gap-1 font-medium ${
                currentView === 'track-order' ? 'text-emerald-700 font-bold' : ''
              }`}
            >
              <Truck className="w-3.5 h-3.5 text-emerald-600" />
              Track Order
            </button>
            <button
              id="subnav-about"
              type="button"
              onClick={() => setCurrentView('about')}
              className={`hover:text-amber-800 transition ${
                currentView === 'about' ? 'text-amber-800 font-bold' : ''
              }`}
            >
              About
            </button>
            <button
              id="subnav-contact"
              type="button"
              onClick={() => setCurrentView('contact')}
              className={`hover:text-amber-800 transition ${
                currentView === 'contact' ? 'text-amber-800 font-bold' : ''
              }`}
            >
              Contact
            </button>
            <button
              id="subnav-faq"
              type="button"
              onClick={() => setCurrentView('faq')}
              className={`hover:text-amber-800 transition ${
                currentView === 'faq' ? 'text-amber-800 font-bold' : ''
              }`}
            >
              FAQs
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {isMobileMenuOpen && (
        <div
          id="mobile-drawer"
          className="lg:hidden bg-white border-t border-stone-200 px-3 sm:px-4 py-3 space-y-3 shadow-xl max-h-[85vh] overflow-y-auto overscroll-contain animate-in slide-in-from-top-2"
        >
          {/* Mobile Search inside drawer */}
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3 pointer-events-none" />
            <input
              id="mobile-drawer-search-input"
              type="search"
              value={searchQuery ?? ''}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Thekua, Dairy, Sweets..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-stone-300 text-xs sm:text-sm bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </form>

          {/* Location checker in mobile */}
          <button
            id="mobile-pincode-btn"
            type="button"
            onClick={() => {
              setPincodeModalOpen(true);
              setIsMobileMenuOpen(false);
            }}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-900 text-xs font-semibold touch-manipulation"
          >
            <span className="flex items-center gap-2 truncate">
              <MapPin className="w-4 h-4 text-amber-700 shrink-0" />
              <span className="truncate">
                {isDeliverable ? `Deliver to ${pincode}` : `Pincode ${pincode}`}
              </span>
            </span>
            <span className={`font-bold shrink-0 text-[11px] ${isDeliverable ? 'text-emerald-700' : 'text-rose-600'}`}>
              {isDeliverable
                ? `${fastDeliveryAvailable ? '⚡ Fast • ' : ''}${is30MinDelivery ? '30-min' : estimatedDeliveryTime}`
                : 'Unavailable'}
            </span>
          </button>

          {/* Quick Primary Nav Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-stone-800">
            <button
              type="button"
              onClick={() => {
                setCurrentView('home');
                setIsMobileMenuOpen(false);
              }}
              className="p-3 rounded-xl text-left bg-stone-50 hover:bg-amber-50 transition flex items-center gap-2 touch-manipulation"
            >
              <span className="text-base">🏠</span>
              <span>Home</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (setSelectedCategorySlug) setSelectedCategorySlug('');
                setCurrentView('shop');
                setIsMobileMenuOpen(false);
              }}
              className="p-3 rounded-xl text-left bg-stone-50 hover:bg-amber-50 transition flex items-center gap-2 touch-manipulation"
            >
              <span className="text-base">🛍️</span>
              <span>Shop All</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (setSelectedCategorySlug) setSelectedCategorySlug('');
                setCurrentView('offers');
                setIsMobileMenuOpen(false);
              }}
              className="p-3 rounded-xl text-left bg-amber-50/70 text-amber-900 font-bold hover:bg-amber-100 transition flex items-center gap-2 touch-manipulation"
            >
              <span className="text-base">🔥</span>
              <span>Today&apos;s Offers</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setCurrentView('track-order');
                setIsMobileMenuOpen(false);
              }}
              className="p-3 rounded-xl text-left bg-emerald-50 text-emerald-900 font-bold hover:bg-emerald-100 transition flex items-center gap-2 touch-manipulation"
            >
              <span className="text-base">🚚</span>
              <span>Track Order</span>
            </button>
          </div>

          {/* Categories Section in Mobile */}
          <div className="pt-2 border-t border-stone-100">
            <div className="text-[11px] font-bold uppercase tracking-wider text-stone-400 mb-2 px-1">
              Food Categories
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-xs text-stone-700">
              <button
                type="button"
                onClick={() => handleCategoryNav('homemade')}
                className="p-2.5 rounded-lg text-left hover:bg-amber-50 transition flex items-center gap-1.5"
              >
                <span>🍪</span>
                <span className="truncate">Thekua & Snacks</span>
              </button>
              <button
                type="button"
                onClick={() => handleCategoryNav('dairy-products')}
                className="p-2.5 rounded-lg text-left hover:bg-amber-50 transition flex items-center gap-1.5"
              >
                <span>🥛</span>
                <span className="truncate">Dairy & Paneer</span>
              </button>
              <button
                type="button"
                onClick={() => handleCategoryNav('sweets')}
                className="p-2.5 rounded-lg text-left hover:bg-amber-50 transition flex items-center gap-1.5"
              >
                <span>🍯</span>
                <span className="truncate">Desi Sweets</span>
              </button>
              <button
                type="button"
                onClick={() => handleCategoryNav('fresh-food')}
                className="p-2.5 rounded-lg text-left hover:bg-amber-50 transition flex items-center gap-1.5"
              >
                <span>🍲</span>
                <span className="truncate">Fresh Meals</span>
              </button>
            </div>
          </div>

          {/* Customer Support & Information */}
          <div className="pt-2 border-t border-stone-100">
            <div className="text-[11px] font-bold uppercase tracking-wider text-stone-400 mb-2 px-1">
              Support & Company
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-xs text-stone-700">
              <button
                type="button"
                onClick={() => {
                  setCurrentView('about');
                  setIsMobileMenuOpen(false);
                }}
                className="p-2.5 rounded-lg text-left hover:bg-stone-100 transition"
              >
                ✨ About Pure Sudh
              </button>
              <button
                type="button"
                onClick={() => {
                  setCurrentView('contact');
                  setIsMobileMenuOpen(false);
                }}
                className="p-2.5 rounded-lg text-left hover:bg-stone-100 transition"
              >
                📞 Contact Us
              </button>
              <button
                type="button"
                onClick={() => {
                  setCurrentView('faq');
                  setIsMobileMenuOpen(false);
                }}
                className="p-2.5 rounded-lg text-left hover:bg-stone-100 transition"
              >
                ❓ FAQs
              </button>
              <button
                type="button"
                onClick={() => {
                  setCurrentView('orders');
                  setIsMobileMenuOpen(false);
                }}
                className="p-2.5 rounded-lg text-left hover:bg-stone-100 transition"
              >
                📦 My Orders
              </button>
              <button
                type="button"
                onClick={() => {
                  setCurrentView('vendor');
                  setIsMobileMenuOpen(false);
                }}
                className="p-2.5 rounded-lg text-left hover:bg-amber-50 text-amber-900 font-medium transition"
              >
                🏪 Marketplace Vendors
              </button>
              <a
                href="https://www.instagram.com/pure.sudh"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 rounded-lg text-left hover:bg-stone-100 text-stone-700 hover:text-pink-600 transition flex items-center gap-1.5"
              >
                <span>📸</span>
                <span className="truncate">Instagram (@pure.sudh)</span>
              </a>
              <a
                href="https://www.youtube.com/@puresudh"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 rounded-lg text-left hover:bg-stone-100 text-stone-700 hover:text-red-600 transition flex items-center gap-1.5"
                aria-label="Subscribe to Pure Sudh on YouTube (@puresudh)"
                title="YouTube: @puresudh"
              >
                <span>📺</span>
                <span className="truncate">YouTube (@puresudh)</span>
              </a>
            </div>
          </div>

          {/* User Sign In / Account status in drawer */}
          <div className="pt-2 border-t border-stone-100">
            {user ? (
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-amber-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                    {user.displayName ? user.displayName[0].toUpperCase() : 'U'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-stone-900 truncate">{user.displayName}</p>
                    <p className="text-[10px] text-stone-500 truncate">{user.email}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCurrentView('account');
                    setIsMobileMenuOpen(false);
                  }}
                  className="text-xs font-bold text-amber-800 bg-amber-100 px-3 py-1.5 rounded-lg shrink-0"
                >
                  Manage
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setCurrentView('customer-login');
                  setIsMobileMenuOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-stone-900 text-white text-xs font-bold hover:bg-stone-800 transition touch-manipulation"
              >
                <User className="w-4 h-4" />
                <span>Customer Sign In</span>
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
