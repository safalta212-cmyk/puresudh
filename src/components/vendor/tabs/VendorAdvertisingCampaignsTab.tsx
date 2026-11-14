import React, { useState, useEffect } from 'react';
import {
  Megaphone,
  PlusCircle,
  RefreshCw,
  Clock,
  CheckCircle2,
  PauseCircle,
  AlertCircle,
  Coins,
  Calendar,
  Package,
  X,
  Tag,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import { AdvertisingCampaign, AdvertisingWallet } from '../../../types/advertising';
import { Product } from '../../../types';

interface VendorAdvertisingCampaignsTabProps {
  vendorId: string;
  vendorName: string;
  onNavigateToWallet?: () => void;
}

export const VendorAdvertisingCampaignsTab: React.FC<VendorAdvertisingCampaignsTabProps> = ({
  vendorId,
  vendorName,
  onNavigateToWallet,
}) => {
  const [campaigns, setCampaigns] = useState<AdvertisingCampaign[]>([]);
  const [wallet, setWallet] = useState<AdvertisingWallet | null>(null);
  const [vendorProducts, setVendorProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Create Campaign Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formCampaignName, setFormCampaignName] = useState('');
  const [formProductId, setFormProductId] = useState('');
  const [formDailyBudget, setFormDailyBudget] = useState<number | ''>(100);
  const [formTotalBudget, setFormTotalBudget] = useState<number | ''>(500);
  const [formCpc, setFormCpc] = useState<number | ''>(2.5);
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchCampaignsAndData = async () => {
    try {
      setErrorMessage(null);
      // Fetch Vendor Campaigns
      const resCamp = await fetch(`/api/advertising/campaigns/vendor/${vendorId}`, {
        headers: {
          'x-user-role': 'vendor',
          'x-vendor-id': vendorId,
        },
      });
      const dataCamp = await resCamp.json();
      if (dataCamp.success) {
        setCampaigns(dataCamp.campaigns || []);
      }

      // Fetch Vendor Wallet to check available balance
      const resWallet = await fetch(`/api/advertising/wallet/${vendorId}`, {
        headers: {
          'x-user-role': 'vendor',
          'x-vendor-id': vendorId,
        },
      });
      const dataWallet = await resWallet.json();
      if (dataWallet.success) {
        setWallet(dataWallet.wallet);
      }

      // Fetch Vendor's Own Products
      const resProd = await fetch(`/api/advertising/vendor-products/${vendorId}`, {
        headers: {
          'x-user-role': 'vendor',
          'x-vendor-id': vendorId,
        },
      });
      const dataProd = await resProd.json();
      if (dataProd.success) {
        setVendorProducts(dataProd.products || []);
        if (dataProd.products.length > 0 && !formProductId) {
          setFormProductId(dataProd.products[0].id);
        }
      }
    } catch (err: any) {
      console.error('[VendorAdCampaigns] Error:', err);
      setErrorMessage(err.message || 'Failed to load advertising campaigns.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    // Set default dates
    const today = new Date().toISOString().split('T')[0];
    const twoWeeks = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];
    setFormStartDate(today);
    setFormEndDate(twoWeeks);

    fetchCampaignsAndData();
  }, [vendorId]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchCampaignsAndData();
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formCampaignName.trim()) {
      setErrorMessage('Please enter a campaign name.');
      return;
    }

    if (!formProductId) {
      setErrorMessage('Please select a product to advertise.');
      return;
    }

    const daily = Number(formDailyBudget);
    const total = Number(formTotalBudget);
    const cpc = Number(formCpc);

    if (isNaN(daily) || daily < 50) {
      setErrorMessage('Minimum daily budget is ₹50.');
      return;
    }

    if (isNaN(total) || total < 100) {
      setErrorMessage('Minimum total budget is ₹100.');
      return;
    }

    if (daily > total) {
      setErrorMessage('Daily budget cannot exceed total budget.');
      return;
    }

    const availableBal = wallet?.availableBalance ?? 0;
    if (total > availableBal) {
      setErrorMessage(`Total budget (₹${total}) exceeds available advertising wallet balance of ₹${availableBal}.`);
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const res = await fetch('/api/advertising/campaign/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'vendor',
          'x-vendor-id': vendorId,
        },
        body: JSON.stringify({
          vendorId,
          productId: formProductId,
          campaignName: formCampaignName.trim(),
          dailyBudget: daily,
          totalBudget: total,
          cpc,
          startDate: formStartDate,
          endDate: formEndDate,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create campaign');
      }

      setSuccessToast(`Campaign "${formCampaignName}" submitted successfully (Status: PENDING_APPROVAL).`);
      setIsCreateOpen(false);
      setFormCampaignName('');
      await fetchCampaignsAndData();
      setTimeout(() => setSuccessToast(null), 5000);
    } catch (err: any) {
      console.error('[VendorAdCampaigns] Create Error:', err);
      setErrorMessage(err.message || 'Failed to create campaign');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING_APPROVAL':
        return {
          label: 'Pending Approval',
          bg: 'bg-amber-50 text-amber-800 border-amber-200',
          icon: Clock,
        };
      case 'ACTIVE':
        return {
          label: 'Active',
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          icon: CheckCircle2,
        };
      case 'PAUSED':
        return {
          label: 'Paused',
          bg: 'bg-blue-50 text-blue-800 border-blue-200',
          icon: PauseCircle,
        };
      case 'REJECTED':
        return {
          label: 'Rejected',
          bg: 'bg-rose-50 text-rose-800 border-rose-200',
          icon: AlertCircle,
        };
      case 'COMPLETED':
      default:
        return {
          label: 'Completed',
          bg: 'bg-stone-100 text-stone-700 border-stone-200',
          icon: CheckCircle2,
        };
    }
  };

  const pendingCount = campaigns.filter((c) => c.status === 'PENDING_APPROVAL').length;
  const activeCount = campaigns.filter((c) => c.status === 'ACTIVE').length;
  const pausedCount = campaigns.filter((c) => c.status === 'PAUSED').length;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-3 bg-amber-100 text-amber-900 rounded-xl">
              <Megaphone className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-stone-900 font-serif">
                Sponsored Product Campaigns
              </h2>
              <p className="text-xs text-stone-500">
                Create and manage targeted sponsored ad campaigns for {vendorName} delicacies
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-700 transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            <button
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-amber-800 hover:bg-amber-900 text-white transition shadow-sm cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Campaign</span>
            </button>
          </div>
        </div>

        {/* Available Wallet Balance Highlight */}
        <div className="mt-4 p-3.5 bg-emerald-50/70 rounded-xl border border-emerald-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <Coins className="w-4 h-4 text-emerald-700 shrink-0" />
            <span className="text-stone-700">
              Advertising Wallet Available Balance:{' '}
              <strong className="text-emerald-900 font-serif text-sm">
                ₹{(wallet?.availableBalance ?? 0).toLocaleString('en-IN')}
              </strong>
            </span>
          </div>
          {onNavigateToWallet && (
            <button
              onClick={onNavigateToWallet}
              className="text-emerald-800 hover:text-emerald-950 font-semibold underline text-[11px] self-start sm:self-auto cursor-pointer"
            >
              Manage Ad Wallet & Top-ups →
            </button>
          )}
        </div>
      </div>

      {successToast && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3 text-xs text-emerald-900 shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="font-semibold">{successToast}</span>
        </div>
      )}

      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center justify-between text-xs text-rose-900 shadow-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-500 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
          <span className="text-[11px] text-stone-500 font-medium">Total Campaigns</span>
          <div className="text-xl sm:text-2xl font-bold text-stone-900 mt-1">{campaigns.length}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
          <span className="text-[11px] text-amber-700 font-medium">Pending Approval</span>
          <div className="text-xl sm:text-2xl font-bold text-amber-800 mt-1">{pendingCount}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
          <span className="text-[11px] text-emerald-700 font-medium">Active Campaigns</span>
          <div className="text-xl sm:text-2xl font-bold text-emerald-800 mt-1">{activeCount}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
          <span className="text-[11px] text-blue-700 font-medium">Paused</span>
          <div className="text-xl sm:text-2xl font-bold text-blue-800 mt-1">{pausedCount}</div>
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-stone-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-stone-800 flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-stone-600" />
            <span>Your Advertising Campaigns ({campaigns.length})</span>
          </h3>
          <span className="text-[11px] text-stone-400">Strict Tenant Isolation Enforced</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-stone-500">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto text-amber-700 mb-2" />
            Loading campaigns...
          </div>
        ) : campaigns.length === 0 ? (
          <div className="p-10 text-center text-xs text-stone-500 space-y-3">
            <Megaphone className="w-10 h-10 mx-auto text-stone-300" />
            <p className="font-bold text-stone-800 text-sm">No advertising campaigns launched yet.</p>
            <p className="text-stone-400 max-w-sm mx-auto">
              Boost visibility for your handcrafted treats! Launch a sponsored product campaign to gain priority placement across categories and search results.
            </p>
            <button
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-amber-800 hover:bg-amber-900 text-white transition shadow-sm cursor-pointer mt-2"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Your First Campaign</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-stone-50 text-stone-600 font-semibold border-b border-stone-200">
                  <th className="py-3 px-4">Campaign Name</th>
                  <th className="py-3 px-4">Promoted Product</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Daily Budget</th>
                  <th className="py-3 px-4 text-right">Total Budget</th>
                  <th className="py-3 px-4 text-right">Ad Spend & Balance</th>
                  <th className="py-3 px-4 text-right">CPC Bid</th>
                  <th className="py-3 px-4">Schedule</th>
                  <th className="py-3 px-4 text-right">Clicks (Valid / Invalid)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-stone-700">
                {campaigns.map((camp) => {
                  const badge = getStatusBadge(camp.status);
                  const Icon = badge.icon;
                  const matchedProduct = vendorProducts.find((p) => p.id === camp.productId);
                  return (
                    <tr key={camp.campaignId} className="hover:bg-stone-50/70 transition">
                      <td className="py-3.5 px-4 font-semibold text-stone-900">
                        <div>{camp.campaignName}</div>
                        <div className="font-mono text-[10px] text-stone-400">{camp.campaignId}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          {matchedProduct?.images?.[0] ? (
                            <img
                              src={matchedProduct.images[0]}
                              alt=""
                              className="w-8 h-8 rounded-lg object-cover border border-stone-200"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center text-stone-400">
                              <Package className="w-4 h-4" />
                            </div>
                          )}
                          <div>
                            <span className="font-medium text-stone-800 line-clamp-1">
                              {matchedProduct?.name || camp.productId}
                            </span>
                            <span className="text-[10px] text-stone-400 font-mono">
                              ₹{matchedProduct?.price ?? '-'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${badge.bg}`}>
                          <Icon className="w-3 h-3" />
                          <span>{badge.label}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-semibold text-stone-800">
                        ₹{camp.dailyBudget.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-stone-900">
                        ₹{camp.totalBudget.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="font-bold text-stone-800">Spent: ₹{(camp.spentAmount || 0).toFixed(2)}</div>
                        <div className="text-[10px] text-stone-500 font-medium">Rem: ₹{(camp.remainingBalance ?? (camp.totalBudget - (camp.spentAmount || 0))).toFixed(2)}</div>
                      </td>
                      <td className="py-3.5 px-4 text-right text-stone-600 font-mono">
                        ₹{camp.cpc.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-stone-500 text-[11px]">
                        <div>{camp.startDate}</div>
                        <div className="text-[10px] text-stone-400">to {camp.endDate}</div>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="font-semibold text-emerald-800">{camp.validClicks || 0} valid</div>
                        <div className="text-[10px] text-stone-400">{camp.invalidClicks || 0} uncharged</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE CAMPAIGN MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50 sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-amber-700" />
                <h3 className="text-sm font-bold text-stone-900 font-serif">
                  Launch Advertising Campaign
                </h3>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-stone-400 hover:text-stone-600 cursor-pointer p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-5 space-y-4 text-xs">
              {/* Wallet Safety Notice */}
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/80 flex items-start gap-2 text-amber-900">
                <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong>Initial Status: PENDING_APPROVAL.</strong> All campaigns are verified by platform administrators. Your total budget cannot exceed your advertising wallet balance (Available: <strong>₹{(wallet?.availableBalance ?? 0).toLocaleString('en-IN')}</strong>).
                </div>
              </div>

              {/* Campaign Name */}
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Campaign Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Diwali Sweets Morning Push"
                  value={formCampaignName}
                  onChange={(e) => setFormCampaignName(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl focus:outline-none focus:border-amber-600 text-xs"
                />
              </div>

              {/* Product Selection (Strictly vendor's own products) */}
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Select Product to Promote * (Only your items)
                </label>
                {vendorProducts.length === 0 ? (
                  <p className="text-rose-600 text-[11px]">No active products found for this vendor.</p>
                ) : (
                  <select
                    value={formProductId}
                    onChange={(e) => setFormProductId(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl focus:outline-none focus:border-amber-600 text-xs"
                  >
                    {vendorProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — ₹{p.price} (Stock: {p.stockQuantity ?? p.stock ?? 'Available'})
                      </option>
                    ))}
                  </select>
                )}
                <span className="text-[10px] text-stone-400 mt-1 block">
                  Server strictly verifies that the product belongs to {vendorName} and is active.
                </span>
              </div>

              {/* Budgets Row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    Daily Budget (₹) *
                  </label>
                  <input
                    type="number"
                    min="50"
                    step="10"
                    value={formDailyBudget}
                    onChange={(e) => setFormDailyBudget(e.target.value === '' ? '' : Number(e.target.value))}
                    required
                    className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl focus:outline-none focus:border-amber-600"
                  />
                  <span className="text-[10px] text-stone-400 mt-0.5 block">Min: ₹50/day</span>
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    Total Budget (₹) *
                  </label>
                  <input
                    type="number"
                    min="100"
                    step="50"
                    value={formTotalBudget}
                    onChange={(e) => setFormTotalBudget(e.target.value === '' ? '' : Number(e.target.value))}
                    required
                    className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl focus:outline-none focus:border-amber-600"
                  />
                  <span className="text-[10px] text-stone-400 mt-0.5 block">Max: ₹{(wallet?.availableBalance ?? 0).toLocaleString('en-IN')}</span>
                </div>
              </div>

              {Number(formTotalBudget) > (wallet?.availableBalance ?? 0) && (
                <div className="p-2 bg-rose-50 rounded-lg text-rose-700 text-[11px] font-medium border border-rose-200">
                  ⚠️ Total budget exceeds available balance (₹{(wallet?.availableBalance ?? 0).toLocaleString('en-IN')}).
                </div>
              )}

              {/* CPC Bid */}
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Cost Per Click (CPC Bid ₹) *
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  step="0.5"
                  value={formCpc}
                  onChange={(e) => setFormCpc(e.target.value === '' ? '' : Number(e.target.value))}
                  required
                  className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl focus:outline-none focus:border-amber-600"
                />
                <span className="text-[10px] text-stone-400 mt-0.5 block">
                  Recommended ₹2.00 - ₹5.00 for sweets and fresh dairy categories.
                </span>
              </div>

              {/* Schedule Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl focus:outline-none focus:border-amber-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    End Date *
                  </label>
                  <input
                    type="date"
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl focus:outline-none focus:border-amber-600"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 flex items-center gap-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="w-1/2 py-2.5 rounded-xl text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-700 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    isSubmitting ||
                    !formCampaignName.trim() ||
                    !formProductId ||
                    Number(formTotalBudget) > (wallet?.availableBalance ?? 0)
                  }
                  className="w-1/2 py-2.5 rounded-xl text-xs font-bold bg-amber-800 hover:bg-amber-900 text-white transition shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit for Approval'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
