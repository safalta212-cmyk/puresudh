import React from 'react';
import {
  Heart,
  ShoppingCart,
  Trash2,
  Package,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { Product } from '../../types';
import { useWishlist } from '../../context/WishlistContext';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';

interface AccountWishlistTabProps {
  onNavigateToShop: () => void;
  onOpenProductDetails?: (product: Product) => void;
}

export const AccountWishlistTab: React.FC<AccountWishlistTabProps> = ({
  onNavigateToShop,
  onOpenProductDetails,
}) => {
  const { wishlist, removeFromWishlist, clearWishlist } = useWishlist();
  const { addToCart } = useCart();
  const { showToast } = useToast();

  const handleAddToCart = async (product: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    await addToCart(product, 1);
    showToast(`Added ${product.name} to cart!`, 'success');
  };

  const handleMoveAllToCart = async () => {
    if (wishlist.length === 0) return;
    for (const item of wishlist) {
      await addToCart(item, 1);
    }
    showToast(`Moved all ${wishlist.length} items to your cart!`, 'success');
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-stone-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-stone-900 text-base sm:text-lg flex items-center gap-2">
            <Heart className="w-5 h-5 text-rose-500 fill-rose-500" />
            My Saved Delicacies ({wishlist.length})
          </h3>
          <p className="text-xs text-stone-500 mt-0.5">
            Your personal collection of artisanal sweets and pure A2 dairy products.
          </p>
        </div>

        {wishlist.length > 0 && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={handleMoveAllToCart}
              className="bg-amber-800 hover:bg-amber-900 text-white font-bold text-xs px-4 py-2 rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              Move All to Cart
            </button>
            <button
              type="button"
              onClick={clearWishlist}
              className="text-stone-400 hover:text-rose-600 p-2 rounded-xl transition cursor-pointer"
              title="Clear all saved items"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Grid of Wishlist Items */}
      {wishlist.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 sm:p-14 text-center border border-stone-200 space-y-3">
          <Heart className="w-12 h-12 text-stone-300 mx-auto" />
          <h4 className="font-bold text-stone-900 text-base">Your Wishlist is Empty</h4>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            Explore our heritage Mithai, Thekua, Malpua, and fresh A2 dairy to save your favorites!
          </p>
          <button
            type="button"
            onClick={onNavigateToShop}
            className="bg-amber-800 hover:bg-amber-900 text-white font-semibold text-xs px-5 py-2.5 rounded-xl transition cursor-pointer shadow-xs"
          >
            Explore Mithai & Dairy
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {wishlist.map((item) => (
            <div
              key={item.id}
              onClick={() => onOpenProductDetails && onOpenProductDetails(item)}
              className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-xs hover:border-amber-200 transition group flex flex-col justify-between cursor-pointer"
            >
              <div className="relative">
                <img
                  src={item.images?.[0] || '/images/homemade_thekua_special.jpg'}
                  alt={item.name}
                  className="w-full h-44 object-cover group-hover:scale-105 transition duration-300"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFromWishlist(item.id);
                    showToast(`Removed from wishlist`, 'info');
                  }}
                  className="absolute top-3 right-3 p-2 rounded-full bg-white/90 backdrop-blur-xs text-rose-600 hover:bg-rose-50 transition shadow-sm cursor-pointer"
                  title="Remove"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-stone-900 text-sm group-hover:text-amber-900 transition line-clamp-1">
                    {item.name}
                  </h4>
                  <p className="text-xs text-stone-500 line-clamp-2 mt-0.5">
                    {item.description || 'Authentic pure preparation with Desi Cow Ghee.'}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-stone-100">
                  <div>
                    <span className="font-extrabold text-stone-900 font-serif text-base">
                      ₹{item.price}
                    </span>
                    {item.weight && (
                      <span className="text-[11px] text-stone-400 block">{item.weight}</span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={(e) => handleAddToCart(item, e)}
                    className="bg-amber-800 hover:bg-amber-900 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    Add to Cart
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
