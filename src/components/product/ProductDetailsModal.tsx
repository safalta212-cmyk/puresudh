import React, { useState, useEffect } from 'react';
import {
  X,
  Star,
  ShieldCheck,
  Clock,
  Heart,
  Plus,
  Minus,
  CheckCircle2,
  Package,
  MapPin,
  Sparkles,
} from 'lucide-react';
import { Product, Review } from '../../types';
import { MediaUploader } from '../common/MediaUploader';
import { ProductDescriptionRenderer } from '../common/ProductDescriptionRenderer';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { useDelivery } from '../../context/DeliveryContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { fetchProductReviews, addProductReview } from '../../firebase/services';
import {
  fetchSponsoredProducts,
  handleSponsoredProductClick,
  SponsoredProductItem,
} from '../../services/sponsoredPlacementService';

interface ProductDetailsModalProps {
  product: Product | null;
  onClose: () => void;
  onSelectProduct?: (product: Product) => void;
}

export const ProductDetailsModal: React.FC<ProductDetailsModalProps> = ({
  product,
  onClose,
  onSelectProduct,
}) => {
  const { items, addToCart, updateQuantity } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { pincode, estimatedDeliveryTime, isDeliverable, setPincodeModalOpen } = useDelivery();
  const { user, openAuthModal } = useAuth();
  const { showToast } = useToast();

  const [selectedImage, setSelectedImage] = useState<string>(product?.images?.[0] || '');
  const [selectedTab, setSelectedTab] = useState<'details' | 'ingredients' | 'reviews'>('details');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [reviewImages, setReviewImages] = useState<string[]>([]);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [sponsoredRecommendations, setSponsoredRecommendations] = useState<SponsoredProductItem[]>([]);

  useEffect(() => {
    if (product) {
      setSelectedImage(product.images?.[0] || '');
      loadReviews(product.id);

      // Separate Advertising Selection Layer: Fetch eligible sponsored recommendations
      fetchSponsoredProducts({
        placement: 'recommendations',
        currentProductId: product.id,
        categorySlug: product.categorySlug || undefined,
        limit: 2,
      }).then((items) => {
        setSponsoredRecommendations(items);
      });
    }
  }, [product]);

  const loadReviews = async (productId: string) => {
    try {
      const revs = await fetchProductReviews(productId);
      setReviews(revs);
    } catch (e) {
      console.warn('Error fetching reviews:', e);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;
    if (!user) {
      openAuthModal('login');
      return;
    }
    if (!newComment.trim()) {
      showToast('Please enter your review feedback', 'error');
      return;
    }
    setIsSubmittingReview(true);
    const newRev: Review = {
      id: `rev-${Date.now()}`,
      productId: product.id,
      customerId: user.uid,
      customerName: user.displayName || 'Customer',
      rating: newRating,
      comment: newComment.trim(),
      images: reviewImages,
      verifiedPurchase: true,
      status: 'approved',
      createdAt: new Date().toISOString(),
    };
    await addProductReview(newRev);
    setReviews((prev) => [newRev, ...prev]);
    setNewComment('');
    setReviewImages([]);
    setIsSubmittingReview(false);
    showToast('Thank you! Your review has been published.', 'success');
  };

  if (!product) return null;

  const cartItem = items.find((i) => i.product.id === product.id);
  const isWishlisted = isInWishlist(product.id);

  const currentPrice = product.salePrice && product.salePrice > 0 ? product.salePrice : product.price;
  const discountPercent =
    product.salePrice && product.salePrice < product.price
      ? Math.round(((product.price - product.salePrice) / product.price) * 100)
      : 0;

  return (
    <div
      id="product-details-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/65 backdrop-blur-xs p-2 sm:p-4 md:p-6 overflow-y-auto no-scrollbar"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="product-details-modal"
        className="bg-white rounded-2xl sm:rounded-3xl max-w-4xl w-full my-auto shadow-2xl border border-stone-200/80 overflow-hidden relative animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col md:grid md:grid-cols-2 md:max-h-[88vh] no-scrollbar"
      >
        {/* Close Button */}
        <button
          id="close-product-modal"
          onClick={onClose}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 z-30 p-2 text-stone-500 hover:text-stone-900 rounded-full bg-white/95 hover:bg-stone-100 transition shadow-sm border border-stone-200/60 touch-manipulation"
          aria-label="Close details"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="contents md:contents">
          {/* Left Column: Image Gallery */}
          <div className="p-4 sm:p-6 bg-stone-50/70 border-b md:border-b-0 md:border-r border-stone-200/70 flex flex-col justify-between shrink-0 md:shrink md:overflow-y-auto no-scrollbar">
            <div className="aspect-square w-full rounded-2xl overflow-hidden bg-white shadow-xs border border-stone-200/60 relative max-h-[260px] sm:max-h-[300px] md:max-h-none mx-auto">
              <img
                src={selectedImage}
                alt={`${product.name} - Pure Sudh Handcrafted Indian Delicacy`}
                width="600"
                height="600"
                loading="eager"
                decoding="async"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src =
                    'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=800&q=80';
                }}
              />
              <div
                className="absolute top-3 left-3 w-6 h-6 bg-white rounded-md p-0.5 border border-emerald-600 flex items-center justify-center shadow-xs"
                title="Pure Vegetarian"
              >
                <div className="w-3 h-3 rounded-full bg-emerald-600" />
              </div>
            </div>

            {/* Thumbnails */}
            {(product.images || []).length > 1 && (
              <div className="flex gap-2 sm:gap-3 mt-3 sm:mt-4 overflow-x-auto pb-1 no-scrollbar">
                {(product.images || []).map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedImage(img)}
                    className={`w-12 h-12 sm:w-16 sm:h-16 rounded-xl overflow-hidden border-2 transition shrink-0 touch-manipulation ${
                      selectedImage === img
                        ? 'border-amber-600 shadow-xs'
                        : 'border-stone-200 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={img}
                      alt={`${product.name} thumbnail ${idx + 1}`}
                      width="64"
                      height="64"
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Purity Highlights */}
            <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-stone-200 grid grid-cols-3 gap-1.5 sm:gap-2 text-center text-stone-600">
              <div className="p-1.5 sm:p-2 rounded-xl bg-white border border-stone-200/70">
                <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600 mx-auto mb-1" />
                <span className="text-[10px] font-bold block">100% Pure</span>
                <span className="text-[9px] text-stone-400">Zero Chemicals</span>
              </div>
              <div className="p-1.5 sm:p-2 rounded-xl bg-white border border-stone-200/70">
                <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 mx-auto mb-1" />
                <span className="text-[10px] font-bold block">Desi Kitchen</span>
                <span className="text-[9px] text-stone-400">Handcrafted</span>
              </div>
              <div className="p-1.5 sm:p-2 rounded-xl bg-white border border-stone-200/70">
                <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-700 mx-auto mb-1" />
                <span className="text-[10px] font-bold block">Local Fresh</span>
                <span className="text-[9px] text-stone-400">Fast Delivery</span>
              </div>
            </div>
          </div>

          {/* Right Column: Information & Actions */}
          <div className="flex flex-col flex-1 min-h-0 md:max-h-[88vh] md:overflow-hidden bg-white">
            {/* Product Details Content */}
            <div className="p-4 sm:p-6 lg:p-7 pr-10 sm:pr-14 overflow-y-auto no-scrollbar flex-1 space-y-4 min-h-0">
              {/* Category & Tags */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs uppercase font-bold tracking-wider text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200/60">
                  {product.subCategory || 'Authentic Pure Sudh'}
                </span>
                {product.bestseller && (
                  <span className="text-xs uppercase font-bold tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200/60">
                    Bestseller
                  </span>
                )}
              </div>

              {/* Title */}
              <h2 className="text-xl sm:text-2xl font-bold text-stone-900 font-serif leading-tight">
                {product.name}
              </h2>

              {/* Rating & Review count */}
              <div className="flex items-center gap-3 mt-2.5">
                <div className="flex items-center gap-1 bg-amber-50 text-amber-900 px-2 py-0.5 rounded-md border border-amber-200 font-bold text-xs">
                  <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                  <span>{product.rating.toFixed(1)}</span>
                </div>
                <span className="text-xs text-stone-500">
                  Based on {product.reviewCount + reviews.length} customer ratings
                </span>
              </div>

              {/* Pricing */}
              <div className="mt-4 flex items-baseline gap-3">
                <span className="text-2xl sm:text-3xl font-extrabold text-stone-900 font-serif">
                  ₹{currentPrice}
                </span>
                {product.salePrice && product.salePrice < product.price && (
                  <>
                    <span className="text-base text-stone-400 line-through">
                      ₹{product.price}
                    </span>
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                      Save ₹{product.price - product.salePrice} ({discountPercent}% off)
                    </span>
                  </>
                )}
              </div>
              <p className="text-xs text-stone-400 mt-0.5">Inclusive of all local taxes</p>

              {/* Net Weight / Quantity selection */}
              <div className="mt-4 pt-4 border-t border-stone-100">
                <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-2">
                  Standard Pack Size / Net Weight
                </label>
                <div className="flex gap-2">
                  <span className="px-3 py-1.5 rounded-xl border-2 border-amber-600 bg-amber-50 text-amber-900 text-xs font-bold">
                    {product.weight} ({product.unit})
                  </span>
                </div>
              </div>

              {/* Delivery ETA banner */}
              <div className="mt-4 p-3 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-amber-600" />
                  <span>
                    Deliver to <strong className="font-mono">{pincode}</strong>:{' '}
                    {isDeliverable ? (
                      <span className="text-emerald-700 font-semibold">
                        ⚡ ~{estimatedDeliveryTime} ETA
                      </span>
                    ) : (
                      <span className="text-rose-600 font-medium">Currently Unavailable</span>
                    )}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setPincodeModalOpen(true)}
                  className="text-amber-700 font-bold hover:underline"
                >
                  Change
                </button>
              </div>

              {/* Tabs: Description / Ingredients / Reviews */}
              <div className="mt-6 border-b border-stone-200 flex gap-4 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setSelectedTab('details')}
                  className={`pb-2 transition border-b-2 ${
                    selectedTab === 'details'
                      ? 'border-amber-700 text-amber-900'
                      : 'border-transparent text-stone-400 hover:text-stone-700'
                  }`}
                >
                  Product Details
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTab('ingredients')}
                  className={`pb-2 transition border-b-2 ${
                    selectedTab === 'ingredients'
                      ? 'border-amber-700 text-amber-900'
                      : 'border-transparent text-stone-400 hover:text-stone-700'
                  }`}
                >
                  Ingredients & Packaging
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTab('reviews')}
                  className={`pb-2 transition border-b-2 ${
                    selectedTab === 'reviews'
                      ? 'border-amber-700 text-amber-900'
                      : 'border-transparent text-stone-400 hover:text-stone-700'
                  }`}
                >
                  Reviews ({reviews.length})
                </button>
              </div>

              {/* Tab Content */}
              <div className="py-4 text-xs leading-relaxed text-stone-600">
                {selectedTab === 'details' && (
                  <div className="space-y-3">
                    <ProductDescriptionRenderer content={product.description} />
                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-100">
                        <span className="text-stone-400 block text-[11px]">Shelf Life</span>
                        <span className="font-semibold text-stone-800">
                          {product.shelfLife || '15-30 Days'}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-100">
                        <span className="text-stone-400 block text-[11px]">Dietary</span>
                        <span className="font-semibold text-emerald-700">100% Pure Vegetarian</span>
                      </div>
                    </div>
                  </div>
                )}

                {selectedTab === 'ingredients' && (
                  <div className="space-y-4">
                    <div className="p-3 rounded-xl bg-stone-50 border border-stone-200/80">
                      <strong className="block text-stone-900 font-bold mb-1.5 flex items-center gap-1.5 text-xs">
                        <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block"></span>
                        सामग्री / Ingredients:
                      </strong>
                      {product.ingredients ? (
                        <ProductDescriptionRenderer content={product.ingredients} />
                      ) : (
                        <p className="text-stone-500 italic text-xs">
                          100% शुद्ध और प्राकृतिक सामग्री से निर्मित। कोई कृत्रिम रंग या संरक्षक (preservatives) नहीं।
                        </p>
                      )}
                    </div>
                    <div className="p-3 rounded-xl bg-stone-50 border border-stone-200/80">
                      <strong className="block text-stone-900 font-bold mb-1.5 flex items-center gap-1.5 text-xs">
                        <span className="w-2 h-2 rounded-full bg-amber-600 inline-block"></span>
                        पैकेजिंग जानकारी / Packaging Information:
                      </strong>
                      {product.packagingInformation ? (
                        <ProductDescriptionRenderer content={product.packagingInformation} />
                      ) : (
                        <p className="text-stone-500 italic text-xs">
                          स्वच्छता और ताजगी बनाए रखने के लिए खाद्य-ग्रेड, वायुरोधी (food-grade, airtight) सुरक्षात्मक पैकेजिंग।
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {selectedTab === 'reviews' && (
                  <div className="space-y-4">
                    {/* Write a review */}
                    <form onSubmit={handleReviewSubmit} className="p-3 bg-amber-50/50 rounded-xl border border-amber-200/70 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-stone-800 text-xs">Share Your Experience</span>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => setNewRating(s)}
                              className="p-0.5"
                            >
                              <Star
                                className={`w-4 h-4 ${
                                  s <= newRating
                                    ? 'fill-amber-500 text-amber-500'
                                    : 'text-stone-300'
                                }`}
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                      <textarea
                        value={newComment ?? ''}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Tell us about the freshness, taste, and packaging..."
                        rows={2}
                        className="w-full p-2.5 rounded-lg border border-stone-300 bg-white text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />

                      {/* Review Photo Upload (Firebase Storage) */}
                      <div className="pt-1">
                        <MediaUploader
                          preset="review"
                          pathParams={{ productId: product.id }}
                          compact={true}
                          onUploadSuccess={(res) => {
                            setReviewImages((prev) => [...prev, res.downloadUrl]);
                            showToast('Photo attached to review!', 'success');
                          }}
                          label="Attach unboxing or product photo"
                          helpText="Max 3MB (JPG, PNG, WebP). Optimized before upload."
                        />
                        {reviewImages.length > 0 && (
                          <div className="flex gap-2 mt-2">
                            {reviewImages.map((img, i) => (
                              <div key={i} className="relative w-12 h-12 rounded-lg overflow-hidden border border-stone-300 group">
                                <img src={img} alt="review attachment" className="w-full h-full object-cover" />
                                <button
                                  type="button"
                                  onClick={() => setReviewImages((prev) => prev.filter((_, idx) => idx !== i))}
                                  className="absolute top-0 right-0 bg-stone-900/80 text-white rounded-bl p-0.5 text-[10px]"
                                  title="Remove photo"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={isSubmittingReview}
                          className="bg-amber-700 hover:bg-amber-800 text-white font-semibold px-4 py-1.5 rounded-lg text-xs transition"
                        >
                          {isSubmittingReview ? 'Submitting...' : 'Post Review'}
                        </button>
                      </div>
                    </form>

                    {/* Reviews List */}
                    <div className="space-y-3 max-h-48 overflow-y-auto no-scrollbar pr-1">
                      {(reviews || []).length === 0 ? (
                        <p className="text-stone-400 italic">No reviews yet. Be the first to review!</p>
                      ) : (
                        (reviews || []).map((r) => (
                          <div key={r.id} className="p-2.5 rounded-lg bg-stone-50 border border-stone-100">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-semibold text-stone-800">{r.customerName}</span>
                              <div className="flex items-center gap-0.5">
                                {[...Array(Math.max(1, Math.min(5, Math.floor(r.rating || 5))))].map((_, i) => (
                                  <Star key={i} className="w-3 h-3 fill-amber-500 text-amber-500" />
                                ))}
                              </div>
                            </div>
                            <p className="text-stone-600 text-[11px]">{r.comment}</p>
                            {r.images && r.images.length > 0 && (
                              <div className="flex gap-2 mt-2">
                                {r.images.map((imgUrl, i) => (
                                  <a
                                    key={i}
                                    href={imgUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-14 h-14 rounded-lg overflow-hidden border border-stone-200 block hover:opacity-90 transition"
                                  >
                                    <img src={imgUrl} alt="Review attachment" className="w-full h-full object-cover" />
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* Sponsored Product Recommendations (Phase 5) */}
                {sponsoredRecommendations.length > 0 && (
                  <div className="mt-6 pt-5 border-t border-stone-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-amber-700" />
                        <h4 className="text-xs font-bold text-stone-900 font-serif uppercase tracking-wider">
                          Sponsored Recommendations
                        </h4>
                      </div>
                      <span className="bg-amber-800 text-amber-50 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-600/50 flex items-center gap-1 uppercase tracking-wider">
                        <Sparkles className="w-2.5 h-2.5 text-amber-300" />
                        Sponsored
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {sponsoredRecommendations.map((s) => (
                        <div
                          key={s.campaignId}
                          onClick={() => {
                            handleSponsoredProductClick(s.campaignId, s.product.id);
                            if (typeof onSelectProduct === 'function') {
                              onSelectProduct(s.product);
                            } else {
                              setSelectedImage(s.product.images?.[0] || '');
                              loadReviews(s.product.id);
                            }
                          }}
                          className="p-2.5 rounded-xl bg-stone-50 hover:bg-stone-100 border border-stone-200/90 cursor-pointer transition flex items-center gap-3 group relative overflow-hidden"
                        >
                          <img
                            src={s.product.images?.[0] || 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=400&q=80'}
                            alt={s.product.name}
                            className="w-14 h-14 rounded-lg object-cover border border-stone-200 shrink-0 group-hover:scale-105 transition-transform"
                          />
                          <div className="flex-1 min-w-0">
                            <span className="text-[9px] font-bold text-amber-800 uppercase tracking-widest block">
                              Sponsored
                            </span>
                            <p className="font-semibold text-xs text-stone-900 truncate group-hover:text-emerald-800">
                              {s.product.name}
                            </p>
                            <p className="text-[11px] font-bold text-stone-800 mt-0.5">
                              ₹{s.product.salePrice && s.product.salePrice > 0 ? s.product.salePrice : s.product.price}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Sticky Bottom Actions Bar */}
            <div className="p-3 sm:p-4 bg-white/95 backdrop-blur-xs border-t border-stone-200/90 shadow-md flex items-center gap-2 sm:gap-3 z-10 shrink-0 sticky bottom-0">
              <button
                type="button"
                onClick={() => toggleWishlist(product)}
                className={`p-3 rounded-xl border transition touch-manipulation min-h-[46px] min-w-[46px] flex items-center justify-center shrink-0 cursor-pointer ${
                  isWishlisted
                    ? 'border-rose-300 bg-rose-50 text-rose-600'
                    : 'border-stone-300 hover:bg-stone-50 text-stone-500'
                }`}
                title="Wishlist"
              >
                <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-current' : ''}`} />
              </button>

              {cartItem ? (
                <div className="flex-1 flex items-center justify-between bg-amber-800 text-white p-2 sm:p-2.5 rounded-xl min-h-[46px] shadow-xs">
                  <span className="font-semibold text-xs px-1 sm:px-2">In Cart:</span>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <button
                      type="button"
                      onClick={() => updateQuantity(product.id, cartItem.quantity - 1)}
                      className="p-1.5 rounded-lg hover:bg-amber-900 transition touch-manipulation min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="font-extrabold text-sm px-1.5 select-none">
                      {cartItem.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(product.id, cartItem.quantity + 1)}
                      className="p-1.5 rounded-lg hover:bg-amber-900 transition touch-manipulation min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => addToCart(product, 1)}
                  disabled={!product.availability || product.stockQuantity <= 0}
                  className="flex-1 bg-amber-800 hover:bg-amber-900 text-white font-bold py-3.5 px-4 sm:px-6 rounded-xl transition shadow-xs disabled:opacity-50 text-xs sm:text-sm flex items-center justify-center gap-2 min-h-[46px] touch-manipulation cursor-pointer active:scale-[0.98]"
                >
                  <Plus className="w-4 h-4 shrink-0" />
                  <span>
                    {product.stockQuantity <= 0 ? 'Out of Stock' : `Add to Cart • ₹${currentPrice}`}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
