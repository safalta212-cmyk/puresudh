import React from 'react';
import {
  X,
  Heart,
  ShoppingCart,
  Trash2,
  ArrowRight,
  Sparkles,
  Check,
  AlertCircle,
} from 'lucide-react';
import { useWishlist } from '../../context/WishlistContext';
import { useCart } from '../../context/CartContext';
import { Product } from '../../types';

interface WishlistDrawerProps {
  onOpenProductDetails?: (product: Product) => void;
  onExploreProducts?: () => void;
}

export const WishlistDrawer: React.FC<WishlistDrawerProps> = ({
  onOpenProductDetails,
  onExploreProducts,
}) => {
  const {
    wishlist,
    wishlistCount,
    isWishlistOpen,
    setIsWishlistOpen,
    removeFromWishlist,
    moveToCart,
    moveAllToCart,
    clearWishlist,
  } = useWishlist();

  const { setIsCartOpen } = useCart();

  if (!isWishlistOpen) return null;

  const handleMoveItemToCart = async (product: Product) => {
    const success = await moveToCart(product, 1);
    if (success) {
      // Optional: open cart or let them continue
    }
  };

  const handleMoveAll = async () => {
    const count = await moveAllToCart();
    if (count > 0) {
      setIsWishlistOpen(false);
      setIsCartOpen(true);
    }
  };

  return (
    <div
      id="wishlist-drawer-overlay"
      className="fixed inset-0 z-50 overflow-hidden bg-stone-900/60 backdrop-blur-xs transition-opacity"
    >
      <div className="absolute inset-0" onClick={() => setIsWishlistOpen(false)} />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-0 sm:pl-10">
        <div
          id="wishlist-drawer-panel"
          className="w-full sm:w-screen max-w-full sm:max-w-md bg-white shadow-2xl border-l border-stone-200 flex flex-col justify-between animate-in slide-in-from-right duration-300"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50/70">
            <div className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-rose-600 fill-rose-600" />
              <h3 className="font-bold text-stone-900 text-base">Your Wishlist</h3>
              <span
                id="wishlist-drawer-count"
                className="bg-rose-100 text-rose-900 text-xs font-extrabold px-2 py-0.5 rounded-full"
              >
                {wishlistCount} {wishlistCount === 1 ? 'item' : 'items'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {wishlist.length > 0 && (
                <button
                  id="wishlist-clear-btn"
                  type="button"
                  onClick={clearWishlist}
                  className="text-stone-400 hover:text-rose-600 text-xs font-medium px-2 py-1 rounded-lg hover:bg-rose-50 transition"
                  title="Clear entire wishlist"
                >
                  Clear All
                </button>
              )}
              <button
                id="close-wishlist-drawer-btn"
                onClick={() => setIsWishlistOpen(false)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-200 transition"
                aria-label="Close wishlist"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Value proposition note */}
          <div className="bg-amber-50/60 px-4 py-2 border-b border-amber-100 text-[11px] text-amber-900 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>Items saved here stay safe in your Firebase account across visits!</span>
          </div>

          {/* Wishlist Items List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 divide-y divide-stone-100">
            {wishlist.length === 0 ? (
              <div className="py-16 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-stone-100 text-stone-400 flex items-center justify-center mx-auto">
                  <Heart className="w-8 h-8 text-stone-300" />
                </div>
                <div>
                  <h4 className="font-bold text-stone-800 text-base">Your wishlist is empty</h4>
                  <p className="text-xs text-stone-500 mt-1 max-w-xs mx-auto">
                    Save your favorite items here so you can quickly add them to cart anytime!
                  </p>
                </div>
                {onExploreProducts && (
                  <button
                    id="wishlist-explore-btn"
                    type="button"
                    onClick={() => {
                      setIsWishlistOpen(false);
                      onExploreProducts();
                    }}
                    className="bg-amber-800 hover:bg-amber-900 text-white font-semibold text-xs px-5 py-2.5 rounded-xl transition shadow-xs cursor-pointer"
                  >
                    Browse Fresh Catalog
                  </button>
                )}
              </div>
            ) : (
              wishlist.map((prod) => {
                const price =
                  prod.salePrice && prod.salePrice > 0 ? prod.salePrice : prod.price;
                const isOutOfStock =
                  prod.availability === false || (prod.stockQuantity ?? 10) <= 0;

                return (
                  <div
                    key={prod.id}
                    id={`wishlist-item-${prod.id}`}
                    className="pt-3 flex gap-3 group"
                  >
                    <img
                      src={
                        prod.images?.[0] ||
                        'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=800&q=80'
                      }
                      alt={prod.name}
                      onClick={() => {
                        if (onOpenProductDetails) {
                          setIsWishlistOpen(false);
                          onOpenProductDetails(prod);
                        }
                      }}
                      className="w-18 h-18 rounded-xl object-cover border border-stone-200 shrink-0 cursor-pointer group-hover:opacity-90 transition"
                    />

                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h5
                            onClick={() => {
                              if (onOpenProductDetails) {
                                setIsWishlistOpen(false);
                                onOpenProductDetails(prod);
                              }
                            }}
                            className="font-bold text-xs text-stone-900 line-clamp-1 cursor-pointer hover:text-amber-800"
                          >
                            {prod.name}
                          </h5>
                          <button
                            type="button"
                            onClick={() => removeFromWishlist(prod.id)}
                            className="text-stone-300 hover:text-rose-600 transition p-1"
                            aria-label="Remove from wishlist"
                            title="Remove from wishlist"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] text-stone-500 font-medium">
                            {prod.weight}
                          </span>
                          {isOutOfStock ? (
                            <span className="text-[10px] bg-rose-100 text-rose-800 font-bold px-1.5 py-0.2 rounded">
                              Out of Stock
                            </span>
                          ) : (
                            <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.2 rounded">
                              In Stock
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <div className="flex items-baseline gap-1.5">
                          <span className="font-bold text-sm text-stone-900">₹{price}</span>
                          {prod.salePrice && prod.salePrice < prod.price && (
                            <span className="text-[11px] text-stone-400 line-through">
                              ₹{prod.price}
                            </span>
                          )}
                        </div>

                        {/* Move to Cart Button */}
                        <button
                          type="button"
                          id={`wishlist-move-to-cart-${prod.id}`}
                          onClick={() => handleMoveItemToCart(prod)}
                          disabled={isOutOfStock}
                          className="flex items-center gap-1.5 bg-amber-800 hover:bg-amber-900 disabled:bg-stone-200 disabled:text-stone-400 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition shadow-xs cursor-pointer disabled:cursor-not-allowed"
                        >
                          <ShoppingCart className="w-3.5 h-3.5" />
                          <span>Move to Cart</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Action Bar */}
          {wishlist.length > 0 && (
            <div className="p-4 border-t border-stone-200 bg-stone-50/70 space-y-2">
              <button
                type="button"
                id="wishlist-move-all-btn"
                onClick={handleMoveAll}
                className="w-full bg-stone-900 hover:bg-stone-800 text-white font-bold py-3 px-4 rounded-xl text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-xs cursor-pointer active:scale-[0.99]"
              >
                <ShoppingCart className="w-4 h-4 text-amber-400" />
                <span>Move All In-Stock to Cart</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
