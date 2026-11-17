import React, { useState, useMemo, useEffect } from 'react';
import {
  Star,
  CheckCircle2,
  XCircle,
  EyeOff,
  Search,
  Trash2,
  AlertTriangle,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { Review, Product } from '../../../types';
import {
  fetchAllReviews,
  updateReviewModerationStatus,
  deleteReview,
} from '../../../firebase/services';

interface AdminReviewsTabProps {
  products: Product[];
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const AdminReviewsTab: React.FC<AdminReviewsTabProps> = ({
  products,
  showToast,
}) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'hidden'>('all');
  const [ratingFilter, setRatingFilter] = useState<string>('all');
  const [reviewToDelete, setReviewToDelete] = useState<Review | null>(null);

  const loadReviews = async () => {
    setLoading(true);
    try {
      const data = await fetchAllReviews();
      setReviews(data);
    } catch (err) {
      console.error('Error loading reviews:', err);
      showToast('Failed to load customer reviews', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, []);

  const handleUpdateStatus = async (
    reviewId: string,
    status: 'approved' | 'rejected' | 'hidden'
  ) => {
    try {
      await updateReviewModerationStatus(reviewId, status);
      setReviews((prev) =>
        prev.map((r) => (r.id === reviewId ? { ...r, status } : r))
      );
      showToast(`Review marked as ${status}`, 'success');
    } catch (err) {
      showToast('Failed to update review status', 'error');
    }
  };

  const confirmDeleteReview = async () => {
    if (!reviewToDelete) return;
    try {
      await deleteReview(reviewToDelete.id);
      setReviews((prev) => prev.filter((r) => r.id !== reviewToDelete.id));
      showToast('Review removed from database', 'info');
    } catch (err) {
      showToast('Failed to delete review', 'error');
    } finally {
      setReviewToDelete(null);
    }
  };

  const filteredReviews = useMemo(() => {
    return reviews.filter((r) => {
      const q = searchQuery.toLowerCase();
      const reviewerName = (r.customerName || r.userName || '').toLowerCase();
      const matchesSearch =
        !searchQuery ||
        reviewerName.includes(q) ||
        r.title?.toLowerCase().includes(q) ||
        r.comment?.toLowerCase().includes(q) ||
        r.productName?.toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === 'all' || r.status === statusFilter || (!r.status && statusFilter === 'approved');

      const matchesRating = ratingFilter === 'all' || r.rating.toString() === ratingFilter;

      return matchesSearch && matchesStatus && matchesRating;
    });
  }, [reviews, searchQuery, statusFilter, ratingFilter]);

  const pendingCount = reviews.filter((r) => r.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2 flex-wrap">
            Customer Reviews Moderation
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-800 font-semibold border border-stone-200">
              {reviews.length} total
            </span>
            {pendingCount > 0 && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-semibold border border-amber-200">
                {pendingCount} awaiting approval
              </span>
            )}
          </h2>
          <p className="text-sm text-stone-500 mt-0.5">
            Approve verified buyer feedback, reject unsolicited spam, and hide inappropriate comments
          </p>
        </div>

        <button
          type="button"
          onClick={loadReviews}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors border border-stone-300 cursor-pointer disabled:opacity-50 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Reviews
        </button>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-xl border border-stone-200/80 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-stone-400" />
            <input
              type="text"
              placeholder="Search reviewer, product, text..."
              value={searchQuery ?? ''}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-stone-50 rounded-lg border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
            />
          </div>

          <div>
            <select
              value={statusFilter ?? 'all'}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-3 py-2 text-xs bg-stone-50 rounded-lg border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 text-stone-700"
            >
              <option value="all">All Moderation Statuses ({reviews.length})</option>
              <option value="pending">Pending Approval ({pendingCount})</option>
              <option value="approved">Approved (Live)</option>
              <option value="rejected">Rejected</option>
              <option value="hidden">Hidden</option>
            </select>
          </div>

          <div>
            <select
              value={ratingFilter ?? 'all'}
              onChange={(e) => setRatingFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-stone-50 rounded-lg border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 text-stone-700"
            >
              <option value="all">All Star Ratings</option>
              <option value="5">5 Stars only</option>
              <option value="4">4 Stars</option>
              <option value="3">3 Stars</option>
              <option value="2">2 Stars</option>
              <option value="1">1 Star</option>
            </select>
          </div>
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-white p-12 rounded-2xl border border-stone-200 text-center text-stone-400 text-xs">
            <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin text-amber-600" />
            Loading customer reviews from Firebase...
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-stone-200 text-center text-stone-400 text-xs">
            <Star className="w-8 h-8 mx-auto mb-2 opacity-30 text-stone-400" />
            No reviews found matching the selected filter.
          </div>
        ) : (
          filteredReviews.map((review) => {
            const product = products.find((p) => p.id === review.productId);
            const reviewerName = review.customerName || review.userName || 'Verified Customer';

            return (
              <div
                key={review.id}
                className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs flex flex-col sm:flex-row gap-4 justify-between"
              >
                <div className="space-y-2 flex-1">
                  {/* Top line: stars, date, status */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-3.5 h-3.5 ${
                            s <= review.rating
                              ? 'text-amber-500 fill-amber-500'
                              : 'text-stone-300'
                          }`}
                        />
                      ))}
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        review.status === 'approved'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : review.status === 'pending'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : review.status === 'rejected'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-stone-100 text-stone-600 border-stone-200'
                      }`}
                    >
                      {review.status ? review.status.toUpperCase() : 'APPROVED'}
                    </span>

                    <span className="text-[11px] text-stone-400">
                      {review.createdAt ? new Date(review.createdAt).toLocaleDateString('en-IN') : 'Recent'}
                    </span>
                  </div>

                  {/* Title & Comment */}
                  {review.title && (
                    <h4 className="font-bold text-stone-900 text-sm">{review.title}</h4>
                  )}
                  <p className="text-xs text-stone-700 leading-relaxed">{review.comment}</p>

                  {/* Review Image preview if attached */}
                  {(review.imageUrl || (review.images && review.images.length > 0)) && (
                    <div className="flex items-center gap-2 pt-1">
                      {(review.images && review.images.length > 0 ? review.images : [review.imageUrl!]).map((img, i) => (
                        <img
                          key={i}
                          src={img}
                          alt="Review attachment"
                          className="w-12 h-12 rounded-lg object-cover border border-stone-200"
                        />
                      ))}
                    </div>
                  )}

                  {/* Reviewer & Product Info */}
                  <div className="pt-2 flex items-center gap-3 text-xs text-stone-500 flex-wrap">
                    <span className="font-semibold text-stone-800 flex items-center gap-1">
                      {reviewerName}
                      {review.verifiedPurchase && (
                        <span title="Verified Buyer" className="inline-flex">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        </span>
                      )}
                    </span>
                    <span>•</span>
                    <span className="text-stone-600">
                      Product:{' '}
                      <strong className="text-amber-900">
                        {product?.name || review.productName || review.productId}
                      </strong>
                    </span>
                  </div>
                </div>

                {/* Moderation Actions */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 border-t sm:border-t-0 pt-3 sm:pt-0 border-stone-100 shrink-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {review.status !== 'approved' && (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(review.id, 'approved')}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Approve
                      </button>
                    )}

                    {review.status !== 'rejected' && (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(review.id, 'rejected')}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Reject
                      </button>
                    )}

                    {review.status !== 'hidden' && (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(review.id, 'hidden')}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-stone-600 bg-stone-100 hover:bg-stone-200 border border-stone-200 rounded-lg transition-colors cursor-pointer"
                      >
                        <EyeOff className="w-3.5 h-3.5" />
                        Hide
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setReviewToDelete(review)}
                      className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                      title="Delete Review"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Delete Review Confirmation Modal */}
      {reviewToDelete && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 border border-stone-200 shadow-xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-rose-100 text-rose-700 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-stone-900">Delete Customer Review</h3>
                <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                  Are you sure you want to permanently delete this review by{' '}
                  <strong>{reviewToDelete.customerName || reviewToDelete.userName || 'this customer'}</strong>? This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setReviewToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteReview}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs cursor-pointer"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
