import React from 'react';
import { Star, Heart, Plus, Minus, Sparkles } from 'lucide-react';
import { Product } from '../../types';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { PriceDisplay } from './PriceDisplay';
import { Rating } from './Rating';
import { Badge } from './Badge';

export interface ProductCardProps {
  product: Product;
  onOpenDetails: (product: Product) => void;
  className?: string;
  isSponsored?: boolean;
  campaignId?: string;
  onSponsoredClick?: (campaignId: string, productId: string) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onOpenDetails,
  className = '',
  isSponsored = false,
  campaignId,
  onSponsoredClick,
}) => {
  const { items, addToCart, updateQuantity } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();

  const handleCardInteraction = () => {
    if (isSponsored && campaignId && typeof onSponsoredClick === 'function') {
      onSponsoredClick(campaignId, product.id);
    }
    onOpenDetails(product);
  };

  const handleAddInteraction = () => {
    if (isSponsored && campaignId && typeof onSponsoredClick === 'function') {
      onSponsoredClick(campaignId, product.id);
    }
    addToCart(product, 1);
  };

  const cartItem = items.find((i) => i.product.id === product.id);
  const isWishlisted = isInWishlist(product.id);

  const discountPercent =
    product.salePrice && product.salePrice < product.price
      ? Math.round(((product.price - product.salePrice) / product.price) * 100)
      : 0;

  const currentPrice =
    product.salePrice && product.salePrice > 0 ? product.salePrice : product.price;

  return (
    <div
      id={`product-card-${product.id}`}
      className={`group bg-white rounded-2xl border ${
        isSponsored ? 'border-amber-300 ring-1 ring-amber-200/50 shadow-sm' : 'border-stone-200/90 shadow-2xs'
      } hover:shadow-md hover:border-emerald-200/90 transition-all duration-200 flex flex-col overflow-hidden relative ${className}`}
    >
      {/* Top Media Area */}
      <div
        className="relative aspect-4/3 w-full bg-stone-100 overflow-hidden cursor-pointer"
        onClick={handleCardInteraction}
      >
        <img
          src={
            product.images?.[0] ||
            'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=800&q=80'
          }
          alt={`${product.name} - Pure Sudh Fresh Delicacy`}
          loading="lazy"
          decoding="async"
          width="400"
          height="300"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ease-out"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src =
              'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=800&q=80';
          }}
        />

        {/* Pure Veg Emblem */}
        <div
          className="absolute top-2.5 left-2.5 w-5 h-5 bg-white/95 rounded-md p-0.5 border border-emerald-600 flex items-center justify-center shadow-xs"
          title="100% Pure Vegetarian"
        >
          <div className="w-2 h-2 rounded-full bg-emerald-600" />
        </div>

        {/* Badges */}
        <div className="absolute bottom-2.5 left-2.5 flex flex-col gap-1 items-start">
          {isSponsored && (
            <span className="bg-amber-800 text-amber-50 text-[10px] font-bold px-2 py-0.5 rounded shadow-xs uppercase tracking-wider backdrop-blur-xs flex items-center gap-1 border border-amber-600/60">
              <Sparkles className="w-2.5 h-2.5 text-amber-300" />
              Sponsored
            </span>
          )}
          {product.bestseller && (
            <Badge variant="earthy" size="sm">
              Bestseller
            </Badge>
          )}
          {product.newArrival && !product.bestseller && (
            <Badge variant="fresh" size="sm">
              Fresh Daily
            </Badge>
          )}
          {discountPercent > 0 && (
            <span className="bg-rose-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-xs">
              {discountPercent}% OFF
            </span>
          )}
        </div>

        {/* Wishlist Heart Toggle */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleWishlist(product);
          }}
          className={`absolute top-2.5 right-2.5 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
            isWishlisted
              ? 'bg-rose-50 text-rose-600 shadow-xs'
              : 'bg-white/90 text-stone-400 hover:text-rose-600 hover:bg-white shadow-xs'
          } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700`}
          aria-label={isWishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
        >
          <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-rose-600' : ''}`} />
        </button>
      </div>

      {/* Details Body */}
      <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between gap-1 mb-1">
            <span className="text-[11px] font-medium text-stone-500 uppercase tracking-wider">
              {product.weight || 'Standard Pack'}
            </span>
            <Rating value={product.rating || 4.8} reviewCount={product.reviewCount} size="sm" />
          </div>

          <h3
            onClick={handleCardInteraction}
            className="font-semibold text-stone-900 text-sm sm:text-base leading-snug line-clamp-1 hover:text-emerald-800 cursor-pointer transition-colors"
          >
            {product.name}
          </h3>

          <p className="text-xs text-stone-500 mt-1 line-clamp-2 leading-relaxed">
            {product.shortDescription || product.description}
          </p>
        </div>

        {/* Pricing and Cart Controls */}
        <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
          <PriceDisplay
            price={currentPrice}
            originalPrice={discountPercent > 0 ? product.price : undefined}
            size="md"
            showSavings={false}
          />

          <div>
            {cartItem ? (
              <div
                className="flex items-center bg-emerald-50 rounded-xl border border-emerald-300 p-0.5 shadow-2xs touch-manipulation"
                role="group"
                aria-label={`Update ${product.name} quantity`}
              >
                <button
                  type="button"
                  onClick={() => updateQuantity(product.id, cartItem.quantity - 1)}
                  className="w-8 h-8 sm:w-7 sm:h-7 flex items-center justify-center rounded-lg bg-white text-emerald-800 hover:bg-emerald-100 transition-colors focus-visible:outline-none touch-manipulation cursor-pointer"
                  aria-label="Decrease quantity"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="min-w-6 text-center font-bold text-xs text-emerald-950 px-1 select-none">
                  {cartItem.quantity}
                </span>
                <button
                  type="button"
                  onClick={() => updateQuantity(product.id, cartItem.quantity + 1)}
                  className="w-8 h-8 sm:w-7 sm:h-7 flex items-center justify-center rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 transition-colors focus-visible:outline-none touch-manipulation cursor-pointer"
                  aria-label="Increase quantity"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleAddInteraction}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 sm:py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white text-xs font-semibold shadow-2xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 min-h-[40px] sm:min-h-[36px] touch-manipulation cursor-pointer"
                aria-label={`Add ${product.name} to cart`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
