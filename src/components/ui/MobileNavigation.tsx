import React from 'react';
import { Home, Store, ShoppingCart, Heart, User } from 'lucide-react';

export interface MobileNavigationProps {
  currentView: string;
  onNavigate: (view: string) => void;
  onOpenCart: () => void;
  cartCount: number;
  wishlistCount: number;
}

export const MobileNavigation: React.FC<MobileNavigationProps> = ({
  currentView,
  onNavigate,
  onOpenCart,
  cartCount,
  wishlistCount,
}) => {
  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'shop', label: 'Shop', icon: Store },
    { id: 'cart', label: 'Cart', icon: ShoppingCart, isCart: true },
    { id: 'wishlist', label: 'Saved', icon: Heart },
    { id: 'account', label: 'Account', icon: User },
  ];

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-stone-200/80 px-2 py-1.5 sm:hidden transition-colors"
    >
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;

          const handleClick = () => {
            if (item.isCart) {
              onOpenCart();
            } else {
              onNavigate(item.id);
            }
          };

          return (
            <button
              key={item.id}
              type="button"
              onClick={handleClick}
              className={`relative flex flex-col items-center justify-center min-w-[56px] min-h-[44px] py-1 px-2 rounded-xl transition-all focus-visible:outline-none ${
                isActive
                  ? 'text-emerald-800 font-bold'
                  : 'text-stone-500 hover:text-stone-800 font-medium'
              }`}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-transform ${
                    isActive ? 'scale-110 text-emerald-800' : ''
                  }`}
                />
                {item.id === 'cart' && cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-emerald-700 text-white font-extrabold text-[9px] w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                    {cartCount}
                  </span>
                )}
                {item.id === 'wishlist' && wishlistCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-rose-600 text-white font-bold text-[9px] w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                    {wishlistCount}
                  </span>
                )}
              </div>

              <span className="text-[10px] tracking-tight mt-0.5">{item.label}</span>

              {isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-700 mt-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileNavigation;
