import React, { useState, useMemo } from 'react';
import {
  Star,
  CheckCircle2,
  XCircle,
  EyeOff,
  Search,
  Filter,
  Trash2,
  ThumbsUp,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';
import { Review, Product } from '../../../types';
import { updateReviewModerationStatus, deleteReview } from '../../../firebase/services';

interface AdminReviewsTabProps {
  products: Product[];
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const AdminReviewsTab: React.FC<AdminReviewsTabProps> = ({
  products,
  showToast,
}) => {
  // Seed sample reviews or load from state
  const [reviews, setReviews] = useState<Review[]>([
    {
      id: 'rev-1',
      productId: 'prod-1',
      userId: 'usr-1',
      userName: 'Aarav Sharma',
      rating: 5,
      title: 'Real Danedar Desi Ghee! Traditional aroma',
      comment:
        'Reminded me of village churned bilona ghee from my dadi in Gaya. The grain texture and golden color is 100% authentic.',
      verifiedPurchase: true,
      helpfulVotes: 14,
      status: 'approved',
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
    {
      id: 'rev-2',
      productId: 'prod-2',
      userId: 'usr-2',
      userName: 'Pooja Verma',
      rating: 5,
      title: 'Crispy and pure desi ghee thekua',
      comment:
        'Ordered for Chhath festival preparations. Perfectly sweet with fennel seeds and dry fruits. Fresh delivery in Boring road within 35 mins.',
      verifiedPurchase: true,
      helpfulVotes: 8,
      status: 'approved',
      createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    },
    {
      id: 'rev-3',
      productId: 'prod-3',
      userId: 'usr-3',
      userName: 'Sunil Kumar',
      rating: 4,
      title: 'Creamy buffalo milk, very thick malai',
      comment:
        'Milk arrived chilled in glass bottle. Boiling gives thick rich malai. Excellent service in Bailey Road.',
      verifiedPurchase: true,
      helpfulVotes: 5,
      status: 'pending',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: 'rev-4',
      productId: 'prod-4',
      userId: 'usr-4',
      userName: 'Spam Bot Profile',
      rating: 1,
      title: 'Spam advertising link',
      comment: 'Visit free gift voucher site xyz.com for discounts',
      verifiedPurchase: false,
      helpfulVotes: 0,
      status: 'rejected',
      createdAt: new Date(Date.now() - 86400000 * 6).toISOString(),
    },
  ]);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'hidden'>('all');
  const [ratingFilter, setRatingFilter] = useState<string>('all');

  const handleUpdateStatus = async (
    reviewId: string,
    status: 'approved' | 'rejected' | 'hidden'
  ) => {
    await updateReviewModerationStatus(reviewId, status);
    setReviews((prev) =>
      prev.map((r) => (r.id === reviewId ? { ...r, status } : r))
    );
    showToast(`Review marked as ${status}`, 'success');
  };

  const handleDelete = async (reviewId: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this review?')) return;
    await deleteReview(reviewId);
    setReviews((prev) => prev.filter((r) => r.id !== reviewId));
    showToast('Review removed from database', 'info');
  };

  const filteredReviews = useMemo(() => {
    return reviews.filter((r) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        r.userName.toLowerCase().includes(q) ||
        r.title?.toLowerCase().includes(q) ||
        r.comment.toLowerCase().includes(q);

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
          <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
            Customer Reviews Moderation
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
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-xl border border-stone-200/80 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-stone-400" />
            <input
              type="text"
              placeholder="Search reviewer, title, text..."
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
              <option value="all">All Moderation Statuses</option>
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
        {filteredReviews.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-stone-200 text-center text-stone-400 text-xs">
            <Star className="w-8 h-8 mx-auto mb-2 opacity-30 text-stone-400" />
            No reviews match the selected moderation filter.
          </div>
        ) : (
          filteredReviews.map((review) => {
            const product = products.find((p) => p.id === review.productId);

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
                      {new Date(review.createdAt).toLocaleDateString('en-IN')}
                    </span>
                  </div>

                  {/* Title & Comment */}
                  {review.title && (
                    <h4 className="font-bold text-stone-900 text-sm">{review.title}</h4>
                  )}
                  <p className="text-xs text-stone-700 leading-relaxed">{review.comment}</p>

                  {/* Reviewer & Product Info */}
                  <div className="pt-2 flex items-center gap-3 text-xs text-stone-500 flex-wrap">
                    <span className="font-semibold text-stone-800 flex items-center gap-1">
                      {review.userName}
                      {review.verifiedPurchase && (
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" title="Verified Buyer" />
                      )}
                    </span>
                    <span>•</span>
                    <span className="text-stone-600">
                      Product: <strong className="text-amber-900">{product?.name || review.productId}</strong>
                    </span>
                  </div>
                </div>

                {/* Moderation Actions */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 border-t sm:border-t-0 pt-3 sm:pt-0 border-stone-100 shrink-0">
                  <div className="flex items-center gap-1.5">
                    {review.status !== 'approved' && (
                      <button
                        onClick={() => handleUpdateStatus(review.id, 'approved')}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Approve
                      </button>
                    )}

                    {review.status !== 'rejected' && (
                      <button
                        onClick={() => handleUpdateStatus(review.id, 'rejected')}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Reject
                      </button>
                    )}

                    {review.status !== 'hidden' && (
                      <button
                        onClick={() => handleUpdateStatus(review.id, 'hidden')}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-stone-600 bg-stone-100 hover:bg-stone-200 border border-stone-200 rounded-lg transition-colors"
                      >
                        <EyeOff className="w-3.5 h-3.5" />
                        Hide
                      </button>
                    )}

                    <button
                      onClick={() => handleDelete(review.id)}
                      className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
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
    </div>
  );
};
