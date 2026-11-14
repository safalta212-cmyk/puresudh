import React from 'react';
import { Home, Store, Truck, Search, ShoppingCart } from 'lucide-react';
import { useCart } from '../../context/CartContext';

interface MobileBottomNavProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  onOpenCart: () => void;
  onOpenSearch?: () => void;
  isSearchOpen?: boolean;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentView,
  setCurrentView,
  onOpenCart,
  onOpenSearch,
  isSearchOpen = false,
}) => {
  const { itemCount, isCartOpen } = useCart();

  const getNavItemClass = (isActive: boolean) =>
    `flex-1 min-w-0 max-w-[76px] flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all duration-200 touch-manipulation cursor-pointer ${
      isActive
        ? 'text-amber-800 font-bold'
        : 'text-stone-500 hover:text-stone-800 active:scale-95'
    }`;

  return (
    <nav
      id="mobile-bottom-nav"
      aria-label="Mobile Bottom Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-stone-200/90 flex lg:hidden items-center justify-around px-1 sm:px-2 py-1 shadow-lg safe-area-bottom w-full select-none"
    >
      {/* Home */}
      <button
        id="bottom-nav-home"
        type="button"
        onClick={() => {
          setCurrentView('home');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        className={getNavItemClass(currentView === 'home')}
      >
        <Home className="w-5 h-5 mb-0.5 shrink-0" />
        <span className="text-[10px] leading-tight truncate w-full text-center">Home</span>
      </button>

      {/* Shop */}
      <button
        id="bottom-nav-shop"
        type="button"
        onClick={() => {
          setCurrentView('shop');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        className={getNavItemClass(currentView === 'shop' && !isSearchOpen)}
      >
        <Store className="w-5 h-5 mb-0.5 shrink-0" />
        <span className="text-[10px] leading-tight truncate w-full text-center">Shop</span>
      </button>

      {/* Track */}
      <button
        id="bottom-nav-track-order"
        type="button"
        onClick={() => {
          setCurrentView('track-order');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        className={getNavItemClass(currentView === 'track-order')}
      >
        <Truck className="w-5 h-5 mb-0.5 shrink-0" />
        <span className="text-[10px] leading-tight truncate w-full text-center">Track</span>
      </button>

      {/* Search */}
      <button
        id="bottom-nav-search"
        type="button"
        onClick={() => {
          if (onOpenSearch) {
            onOpenSearch();
          } else {
            setCurrentView('shop');
            window.scrollTo({ top: 0, behavior: 'smooth' });
            setTimeout(() => {
              const searchInput =
                (document.getElementById('shop-search-input') as HTMLInputElement) ||
                (document.querySelector('input[type="search"]') as HTMLInputElement);
              if (searchInput) {
                searchInput.focus();
              }
            }, 100);
          }
        }}
        className={getNavItemClass(isSearchOpen)}
      >
        <Search className="w-5 h-5 mb-0.5 shrink-0" />
        <span className="text-[10px] leading-tight truncate w-full text-center">Search</span>
      </button>

      {/* Cart */}
      <button
        id="bottom-nav-cart"
        type="button"
        onClick={onOpenCart}
        className={`${getNavItemClass(isCartOpen || currentView === 'checkout')} relative`}
      >
        <div className="relative">
          <ShoppingCart className="w-5 h-5 mb-0.5 shrink-0" />
          {itemCount > 0 && (
            <span
              id="bottom-nav-cart-badge"
              className="absolute -top-1 -right-2 w-3.5 h-3.5 rounded-full bg-amber-700 text-white text-[9px] font-bold flex items-center justify-center ring-1 ring-white"
            >
              {itemCount}
            </span>
          )}
        </div>
        <span className="text-[10px] leading-tight truncate w-full text-center">Cart</span>
      </button>
    </nav>
  );
};
