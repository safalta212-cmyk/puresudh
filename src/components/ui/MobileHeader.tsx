import React from 'react';
import { Search, ShoppingCart, MapPin, ArrowLeft } from 'lucide-react';
import { BRAND } from '../../constants';

export interface MobileHeaderProps {
  onOpenSearch: () => void;
  onOpenCart: () => void;
  onOpenPincode: () => void;
  cartCount: number;
  pincode: string;
  onBack?: () => void;
  title?: string;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  onOpenSearch,
  onOpenCart,
  onOpenPincode,
  cartCount,
  pincode,
  onBack,
  title,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200/80 px-3 py-2.5 sm:hidden transition-colors">
      <div className="flex items-center justify-between gap-2 min-h-[44px]">
        {/* Left: Back or Brand Emblem */}
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-stone-700 hover:bg-stone-100 active:bg-stone-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-800 text-white flex items-center justify-center font-serif font-bold text-xs shadow-2xs">
              PS
            </div>
            <div className="leading-tight">
              <div className="font-serif font-bold text-stone-900 text-sm tracking-wide">
                {BRAND.NAME}
              </div>
              <div className="text-[10px] text-emerald-800 font-hindi">
                {BRAND.HINDI_TAGLINE}
              </div>
            </div>
          </div>
        )}

        {title && (
          <h2 className="font-serif font-bold text-stone-900 text-sm truncate flex-1 text-center">
            {title}
          </h2>
        )}

        {/* Right Controls */}
        <div className="flex items-center gap-1.5 ml-auto">
          {/* Pincode Pill */}
          <button
            type="button"
            onClick={onOpenPincode}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold transition-colors min-h-[36px] focus-visible:outline-none"
            aria-label="Select delivery pincode"
          >
            <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
            <span className="truncate max-w-[65px]">{pincode || 'Select'}</span>
          </button>

          {/* Search Button */}
          <button
            type="button"
            onClick={onOpenSearch}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-stone-700 hover:bg-stone-100 active:bg-stone-200 transition-colors focus-visible:outline-none"
            aria-label="Open search bar"
          >
            <Search className="w-5 h-5" />
          </button>

          {/* Cart Drawer Trigger */}
          <button
            type="button"
            onClick={onOpenCart}
            className="relative w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center shadow-2xs active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
            aria-label={`Open cart with ${cartCount} items`}
          >
            <ShoppingCart className="w-5 h-5" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-400 text-stone-950 text-[10px] font-extrabold flex items-center justify-center shadow-xs">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

export default MobileHeader;
