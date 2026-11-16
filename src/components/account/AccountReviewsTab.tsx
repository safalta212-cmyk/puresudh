import React, { useState, useEffect } from 'react';
import {
  Star,
  CheckCircle2,
  Package,
  MessageSquare,
  AlertCircle,
  Plus,
  Trash2,
  Edit3,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { Order, Review } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { fetchAllReviews, addProductReview, deleteProductReview, updateProductReview } from '../../firebase/services';

interface AccountReviewsTabProps {
  orders: Order[];
  onNavigateToShop: () => void;
  onOpenOrderDetails?: (orderNumber: string) => void;
}

export const AccountReviewsTab: React.FC<AccountReviewsTabProps> = ({
  orders,
  onNavigateToShop,
  onOpenOrderDetails,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [activeSubTab, setActiveSubTab] = useState<'pending' | 'submitted'>('pending');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Review Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<{
    productId: string;
    productName: string;
    productImage: string;
    orderId: string;
    orderNumber: string;
  } | null>(null);

  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Load reviews on mount
  const loadReviews = async () => {
    setIsLoading(true);
    try {
      // First try server API
      const res = await fetch('/api/reviews');
      const ct = res.headers.get('content-type') || '';
      if (res.ok && ct.includes('application/json')) {
        const data = await res.json();
        setReviews(data);
      } else {
        const local = await fetchAllReviews();
        setReviews(local);
      }
    } catch {
      const local = await fetchAllReviews();
      setReviews(local);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, [user]);

  // STRICT REQUIREMENT: "Reviews only for eligible delivered purchases"
  // Scan all orders with status 'DELIVERED' or 'Delivered'
  const deliveredOrders = orders.filter(
    (o) => (o.status || '').toUpperCase() === 'DELIVERED'
  );

  // Find all unique products purchased in delivered orders
  const deliveredItems: {
    productId: string;
    productName: string;
    productImage: string;
    orderId: string;
    orderNumber: string;
    deliveredAt: string;
  }[] = [];

  const seenProductIds = new Set<string>();

  for (const ord of deliveredOrders) {
    if (Array.isArray(ord.items)) {
      for (const item of ord.items) {
        if (!seenProductIds.has(item.productId)) {
          seenProductIds.add(item.productId);
          deliveredItems.push({
            productId: item.productId,
            productName: item.productName,
            productImage: item.productImage,
            orderId: ord.id,
            orderNumber: ord.orderNumber,
            deliveredAt: ord.updatedAt || ord.createdAt,
          });
        }
      }
    }
  }

  // Filter reviews written by this user
  const userReviews = reviews.filter((r) => {
    if (user?.uid && r.customerId === user.uid) return true;
    if (user?.email && (r.customerId === user.email || r.customerName === user.displayName)) return true;
    // In demo environment or fallback
    return r.customerId === 'cust-demo-user' || r.verifiedPurchase;
  });

  // Determine items pending review (eligible delivered items that user hasn't reviewed yet)
  const pendingReviewItems = deliveredItems.filter((item) => {
    return !userReviews.some((r) => r.productId === item.productId);
  });

  const openWriteModal = (item: {
    productId: string;
    productName: string;
    productImage: string;
    orderId: string;
    orderNumber: string;
  }) => {
    setSelectedProduct(item);
    setIsEditing(false);
    setEditingReviewId(null);
    setRating(5);
    setReviewTitle('');
    setReviewComment('');
    setSubmitError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (rev: Review) => {
    setSelectedProduct({
      productId: rev.productId,
      productName: rev.productName || 'Handmade Kitchen Item',
      productImage: rev.productImage || '/images/homemade_thekua_special.jpg',
      orderId: rev.orderId || '',
      orderNumber: '',
    });
    setIsEditing(true);
    setEditingReviewId(rev.id);
    setRating(rev.rating);
    setReviewTitle(rev.title || '');
    setReviewComment(rev.comment);
    setSubmitError(null);
    setIsModalOpen(true);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    if (!reviewComment.trim()) {
      setSubmitError('Please enter your review feedback.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      if (isEditing && editingReviewId) {
        // Edit existing review
        let editedViaServer = false;
        try {
          const res = await fetch(`/api/reviews/${editingReviewId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              rating,
              title: reviewTitle,
              comment: reviewComment,
            }),
          });
          const ct = res.headers.get('content-type') || '';
          if (res.ok && ct.includes('application/json')) {
            await res.json().catch(() => null);
            editedViaServer = true;
          }
        } catch {
          // Fall back to Firestore/local update when Express API is unavailable
        }

        if (!editedViaServer) {
          await updateProductReview({
            id: editingReviewId,
            productId: selectedProduct.productId,
            customerId: user?.uid || 'cust-demo-user',
            customerName: user?.displayName || 'Verified Buyer',
            rating,
            title: reviewTitle,
            comment: reviewComment,
            verifiedPurchase: true,
            status: 'approved',
            createdAt: new Date().toISOString(),
          });
        }

        setReviews((prev) =>
          prev.map((r) => (r.id === editingReviewId ? { ...r, rating, title: reviewTitle, comment: reviewComment } : r))
        );

        showToast('Review updated successfully!', 'success');
      } else {
        // Submit new review - enforce server-side verified purchase check when Express API is running
        let serverReview: Review | null = null;
        let usedServerApi = false;
        try {
          const res = await fetch('/api/reviews', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              productId: selectedProduct.productId,
              productName: selectedProduct.productName,
              productImage: selectedProduct.productImage,
              orderId: selectedProduct.orderId,
              customerId: user?.uid || 'cust-demo-user',
              customerName: user?.displayName || 'Verified Buyer',
              customerEmail: user?.email || 'customer@email.com',
              rating,
              title: reviewTitle,
              comment: reviewComment,
            }),
          });

          const ct = res.headers.get('content-type') || '';
          if (ct.includes('application/json')) {
            usedServerApi = true;
            const data = await res.json();
            if (!res.ok) {
              throw new Error(data.error || 'Review submission rejected.');
            }
            serverReview = data.review || null;
          }
        } catch (apiErr: any) {
          if (usedServerApi) {
            throw apiErr;
          }
        }

        const newRev: Review = serverReview || {
          id: `rev-${Date.now()}`,
          productId: selectedProduct.productId,
          productName: selectedProduct.productName,
          productImage: selectedProduct.productImage,
          orderId: selectedProduct.orderId,
          customerId: user?.uid || 'cust-demo-user',
          customerName: user?.displayName || 'Verified Buyer',
          rating,
          title: reviewTitle,
          comment: reviewComment,
          verifiedPurchase: true,
          status: 'approved',
          createdAt: new Date().toISOString(),
        };

        await addProductReview(newRev);
        setReviews((prev) => [newRev, ...prev]);
        showToast('Review submitted with Verified Purchase badge!', 'success');
      }

      setIsModalOpen(false);
      setActiveSubTab('submitted');
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to submit review.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!window.confirm('Are you sure you want to delete this review?')) return;
    try {
      await fetch(`/api/reviews/${reviewId}`, { method: 'DELETE' });
      await deleteProductReview(reviewId);
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
      showToast('Review deleted.', 'info');
    } catch {
      await deleteProductReview(reviewId);
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
      showToast('Review deleted.', 'info');
    }
  };

  const ratingLabels = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Overview Banner */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-stone-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-stone-900 text-base sm:text-lg flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
            Verified Purchase Customer Reviews
          </h3>
          <p className="text-xs text-stone-500 mt-1">
            To preserve authentic trust, reviews can strictly only be submitted for delivered orders.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 px-3.5 py-1.5 rounded-2xl text-xs text-amber-900 font-semibold self-start sm:self-auto">
          <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>100% Genuine Verified Buyers Only</span>
        </div>
      </div>

      {/* Sub Tab Switcher */}
      <div className="flex gap-2 border-b border-stone-200 pb-2 text-xs font-bold">
        <button
          type="button"
          onClick={() => setActiveSubTab('pending')}
          className={`pb-2 px-3 flex items-center gap-2 border-b-2 transition ${
            activeSubTab === 'pending'
              ? 'border-amber-700 text-amber-900'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Eligible to Review ({pendingReviewItems.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('submitted')}
          className={`pb-2 px-3 flex items-center gap-2 border-b-2 transition ${
            activeSubTab === 'submitted'
              ? 'border-amber-700 text-amber-900'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>My Reviews ({userReviews.length})</span>
        </button>
      </div>

      {/* Subtab 1: Eligible Items Pending Review */}
      {activeSubTab === 'pending' && (
        <div className="space-y-4">
          {pendingReviewItems.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 sm:p-14 text-center border border-stone-200 space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
              <h4 className="font-bold text-stone-900 text-base">All Caught Up!</h4>
              <p className="text-xs text-stone-500 max-w-md mx-auto leading-relaxed">
                {deliveredOrders.length === 0
                  ? 'Reviews are only enabled after your order has been safely delivered to your doorstep.'
                  : 'You have reviewed all your delivered purchases. Thank you for sharing your feedback with the community!'}
              </p>
              <button
                type="button"
                onClick={onNavigateToShop}
                className="bg-amber-800 hover:bg-amber-900 text-white font-semibold text-xs px-5 py-2.5 rounded-xl transition cursor-pointer shadow-xs"
              >
                Browse Fresh Sweets & Dairy
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingReviewItems.map((item) => (
                <div
                  key={item.productId}
                  className="bg-white p-4 sm:p-5 rounded-3xl border border-stone-200 shadow-xs flex gap-4 items-center justify-between"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={item.productImage || '/images/homemade_thekua_special.jpg'}
                      alt={item.productName}
                      className="w-16 h-16 rounded-2xl object-cover border border-stone-200 shrink-0"
                    />
                    <div className="min-w-0">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md mb-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Delivered Order #{item.orderNumber}
                      </span>
                      <h5 className="font-bold text-stone-900 text-xs sm:text-sm truncate">
                        {item.productName}
                      </h5>
                      <p className="text-[11px] text-stone-500 mt-0.5">
                        Delivered on {new Date(item.deliveredAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => openWriteModal(item)}
                    className="bg-amber-800 hover:bg-amber-900 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition shrink-0 flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Star className="w-3.5 h-3.5 fill-white" />
                    Write Review
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Subtab 2: Submitted Reviews */}
      {activeSubTab === 'submitted' && (
        <div className="space-y-4">
          {userReviews.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 sm:p-14 text-center border border-stone-200 space-y-3">
              <MessageSquare className="w-12 h-12 text-stone-300 mx-auto" />
              <h4 className="font-bold text-stone-900 text-base">No Reviews Submitted Yet</h4>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                Items you receive from delivered orders can be rated and reviewed here.
              </p>
              {pendingReviewItems.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveSubTab('pending')}
                  className="bg-amber-800 hover:bg-amber-900 text-white font-semibold text-xs px-5 py-2.5 rounded-xl transition cursor-pointer"
                >
                  Review {pendingReviewItems.length} Delivered Items
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {userReviews.map((rev) => (
                <div
                  key={rev.id}
                  className="bg-white p-5 sm:p-6 rounded-3xl border border-stone-200 shadow-xs space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 border-b border-stone-100 pb-3">
                    <div className="flex items-center gap-3">
                      {rev.productImage && (
                        <img
                          src={rev.productImage}
                          alt={rev.productName || 'Product'}
                          className="w-12 h-12 rounded-xl object-cover border border-stone-200 shrink-0"
                        />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <h5 className="font-bold text-stone-900 text-sm">
                            {rev.productName || 'Verified Delicacy'}
                          </h5>
                          {rev.verifiedPurchase && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                              <ShieldCheck className="w-3 h-3 text-emerald-600" />
                              Verified Buyer
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-3.5 h-3.5 ${
                                  star <= rev.rating
                                    ? 'text-amber-500 fill-amber-500'
                                    : 'text-stone-300'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-[11px] text-stone-400">
                            {new Date(rev.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={() => openEditModal(rev)}
                        className="p-1.5 text-stone-400 hover:text-amber-700 transition rounded-lg hover:bg-amber-50"
                        title="Edit Review"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteReview(rev.id)}
                        className="p-1.5 text-stone-400 hover:text-rose-600 transition rounded-lg hover:bg-rose-50"
                        title="Delete Review"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {rev.title && (
                    <h6 className="font-bold text-stone-900 text-xs sm:text-sm">
                      {rev.title}
                    </h6>
                  )}

                  <p className="text-xs text-stone-600 leading-relaxed">
                    {rev.comment}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Review Submission / Edit Modal */}
      {isModalOpen && selectedProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full border border-stone-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h4 className="font-bold text-stone-900 text-base">
                  {isEditing ? 'Edit Your Review' : 'Review Delivered Delicacy'}
                </h4>
                <p className="text-xs text-stone-500">
                  Certified genuine review for delivered order
                </p>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 uppercase">
                Verified
              </span>
            </div>

            {/* Product Card */}
            <div className="flex items-center gap-3 p-3 bg-stone-50 rounded-2xl border border-stone-100">
              <img
                src={selectedProduct.productImage || '/images/homemade_thekua_special.jpg'}
                alt={selectedProduct.productName}
                className="w-12 h-12 rounded-xl object-cover border border-stone-200 shrink-0"
              />
              <div className="min-w-0">
                <p className="font-bold text-stone-900 text-xs truncate">
                  {selectedProduct.productName}
                </p>
                {selectedProduct.orderNumber && (
                  <p className="text-[11px] text-stone-500">
                    Order #{selectedProduct.orderNumber}
                  </p>
                )}
              </div>
            </div>

            <form onSubmit={handleSubmitReview} className="space-y-3.5 text-xs">
              {/* Star Rating Picker */}
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Overall Rating *
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="p-1 cursor-pointer transition transform hover:scale-110"
                      >
                        <Star
                          className={`w-6 h-6 ${
                            star <= (hoverRating || rating)
                              ? 'text-amber-500 fill-amber-500'
                              : 'text-stone-300'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                  <span className="font-bold text-stone-700 text-xs">
                    {ratingLabels[hoverRating || rating]}
                  </span>
                </div>
              </div>

              {/* Review Title */}
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Review Headline (Optional)
                </label>
                <input
                  type="text"
                  value={reviewTitle ?? ''}
                  onChange={(e) => setReviewTitle(e.target.value)}
                  placeholder="e.g. Authentic Bihari taste, extremely fresh!"
                  className="w-full p-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-amber-500 text-xs"
                />
              </div>

              {/* Review Comment */}
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Detailed Feedback *
                </label>
                <textarea
                  value={reviewComment ?? ''}
                  onChange={(e) => setReviewComment(e.target.value)}
                  required
                  rows={4}
                  placeholder="Tell us about the texture, ghee aroma, freshness, packaging, and delivery experience..."
                  className="w-full p-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-amber-500 text-xs"
                />
              </div>

              {submitError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-amber-800 hover:bg-amber-900 text-white font-bold text-xs transition cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {isEditing ? 'Save Changes' : 'Submit Verified Review'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
