import React, { useState, useEffect } from 'react';
import {
  Megaphone,
  RefreshCw,
  CheckCircle,
  XCircle,
  PauseCircle,
  PlayCircle,
  StopCircle,
  Clock,
  Search,
  Filter,
  AlertCircle,
  CheckCircle2,
  X,
  Package,
} from 'lucide-react';
import { AdvertisingCampaign, AdvertisingCampaignStatus } from '../../../types/advertising';
import { INITIAL_MARKETPLACE_VENDORS } from '../../../constants';
import { initialProducts } from '../../../data/seedData';

interface AdminAdvertisingCampaignsTabProps {
  adminEmail?: string;
}

export const AdminAdvertisingCampaignsTab: React.FC<AdminAdvertisingCampaignsTabProps> = ({
  adminEmail = 'aanews70@gmail.com',
}) => {
  const [campaigns, setCampaigns] = useState<AdvertisingCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Status Action Modal State
  const [selectedCampaign, setSelectedCampaign] = useState<AdvertisingCampaign | null>(null);
  const [actionType, setActionType] = useState<'APPROVE' | 'REJECT' | 'PAUSE' | 'RESUME' | 'STOP'>('APPROVE');
  const [actionReason, setActionReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchCampaigns = async () => {
    try {
      setErrorMessage(null);
      const res = await fetch('/api/advertising/campaigns', {
        headers: {
          'x-user-role': 'admin',
          'x-user-email': adminEmail,
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to load campaigns (${res.status})`);
      }

      const data = await res.json();
      if (data.success) {
        setCampaigns(data.campaigns || []);
      }
    } catch (err: any) {
      console.error('[AdminAdCampaigns] Error:', err);
      setErrorMessage(err.message || 'Failed to fetch campaigns');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchCampaigns();
  };

  const openActionModal = (
    camp: AdvertisingCampaign,
    action: 'APPROVE' | 'REJECT' | 'PAUSE' | 'RESUME' | 'STOP'
  ) => {
    setSelectedCampaign(camp);
    setActionType(action);
    setActionReason(
      action === 'APPROVE'
        ? 'Creative and product verified compliant.'
        : action === 'REJECT'
        ? 'Campaign creative or pricing does not meet guidelines.'
        : action === 'PAUSE'
        ? 'Administrative pause for merchant review.'
        : action === 'RESUME'
        ? 'Review cleared, campaign resumed.'
        : 'Campaign concluded.'
    );
  };

  const closeActionModal = () => {
    setSelectedCampaign(null);
    setActionReason('');
    setIsSubmitting(false);
  };

  const handleExecuteStatusChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCampaign) return;

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const res = await fetch('/api/advertising/campaign/admin-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'admin',
          'x-user-email': adminEmail,
        },
        body: JSON.stringify({
          campaignId: selectedCampaign.campaignId,
          action: actionType,
          reason: actionReason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update campaign status');
      }

      setSuccessToast(`Campaign "${selectedCampaign.campaignName}" successfully updated via action '${actionType}'.`);
      closeActionModal();
      await fetchCampaigns();
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err: any) {
      console.error('[AdminAdCampaigns] Status Action Error:', err);
      setErrorMessage(err.message || 'Failed to update campaign status');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getVendorName = (vendorId: string): string => {
    const match = INITIAL_MARKETPLACE_VENDORS.find((v) => v.id === vendorId);
    return match ? match.name : vendorId;
  };

  const getProductName = (productId: string): string => {
    const match = initialProducts.find((p) => p.id === productId);
    return match ? match.name : productId;
  };

  const filteredCampaigns = campaigns.filter((c) => {
    const matchesStatus = filterStatus === 'ALL' || c.status === filterStatus;
    const vName = getVendorName(c.vendorId).toLowerCase();
    const cName = c.campaignName.toLowerCase();
    const pName = getProductName(c.productId).toLowerCase();
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || vName.includes(q) || cName.includes(q) || pName.includes(q) || c.campaignId.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status: AdvertisingCampaignStatus) => {
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
          icon: CheckCircle,
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
          icon: XCircle,
        };
      case 'COMPLETED':
      default:
        return {
          label: 'Completed',
          bg: 'bg-stone-100 text-stone-700 border-stone-200',
          icon: StopCircle,
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
                Vendor Advertising Campaigns (Phase 3)
              </h2>
              <p className="text-xs text-stone-500">
                Review, approve, pause, and supervise sponsored product placement campaigns across all vendors
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-700 transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
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

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs">
          <span className="text-xs text-stone-500 font-semibold">Total Campaigns</span>
          <div className="text-2xl font-extrabold text-stone-900 font-serif mt-1">{campaigns.length}</div>
          <p className="text-[11px] text-stone-400 mt-0.5">Across all merchants</p>
        </div>

        <div className="bg-white rounded-2xl border-2 border-amber-400/80 p-4 shadow-xs bg-amber-50/20">
          <span className="text-xs text-amber-800 font-semibold flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-700" />
            <span>Pending Approval</span>
          </span>
          <div className="text-2xl font-extrabold text-amber-900 font-serif mt-1">{pendingCount}</div>
          <p className="text-[11px] text-amber-700 mt-0.5">Requires admin review</p>
        </div>

        <div className="bg-white rounded-2xl border border-emerald-500/40 p-4 shadow-xs bg-emerald-50/20">
          <span className="text-xs text-emerald-800 font-semibold flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-700" />
            <span>Active Live</span>
          </span>
          <div className="text-2xl font-extrabold text-emerald-900 font-serif mt-1">{activeCount}</div>
          <p className="text-[11px] text-emerald-700 mt-0.5">Approved & running</p>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs">
          <span className="text-xs text-blue-800 font-semibold flex items-center gap-1.5">
            <PauseCircle className="w-3.5 h-3.5 text-blue-700" />
            <span>Paused</span>
          </span>
          <div className="text-2xl font-bold text-stone-800 font-serif mt-1">{pausedCount}</div>
          <p className="text-[11px] text-stone-400 mt-0.5">Temporarily on hold</p>
        </div>
      </div>

      {/* Main Campaign Directory */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        {/* Controls Bar: Filter tabs + Search */}
        <div className="p-4 sm:p-5 border-b border-stone-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs font-semibold">
            {[
              { id: 'ALL', label: `All (${campaigns.length})` },
              { id: 'PENDING_APPROVAL', label: `Pending (${pendingCount})` },
              { id: 'ACTIVE', label: `Active (${activeCount})` },
              { id: 'PAUSED', label: `Paused (${pausedCount})` },
              { id: 'REJECTED', label: 'Rejected' },
              { id: 'COMPLETED', label: 'Completed' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterStatus(tab.id)}
                className={`px-3 py-1.5 rounded-xl transition whitespace-nowrap cursor-pointer ${
                  filterStatus === tab.id
                    ? 'bg-amber-800 text-white font-bold shadow-xs'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-stone-400" />
            <input
              type="text"
              placeholder="Search vendor, campaign, product..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-amber-600"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-stone-500">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto text-amber-700 mb-2" />
            Loading campaigns...
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="p-8 text-center text-xs text-stone-500">
            No advertising campaigns found matching the current criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-stone-50 text-stone-600 font-semibold border-b border-stone-200">
                  <th className="py-3 px-4">Vendor</th>
                  <th className="py-3 px-4">Campaign & Product</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Daily / Total Budget</th>
                  <th className="py-3 px-4 text-right">Ad Spend & Balance</th>
                  <th className="py-3 px-4 text-right">CPC Bid</th>
                  <th className="py-3 px-4 text-center">Clicks (Valid / Inv)</th>
                  <th className="py-3 px-4">Schedule</th>
                  <th className="py-3 px-4 text-center">Admin Moderation Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-stone-700">
                {filteredCampaigns.map((camp) => {
                  const badge = getStatusBadge(camp.status);
                  const Icon = badge.icon;
                  const vendorName = getVendorName(camp.vendorId);
                  const productName = getProductName(camp.productId);

                  return (
                    <tr key={camp.campaignId} className="hover:bg-stone-50/70 transition">
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-bold text-stone-900">{vendorName}</div>
                        <div className="font-mono text-[10px] text-stone-400">{camp.vendorId}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-stone-800">{camp.campaignName}</div>
                        <div className="text-[11px] text-stone-500 flex items-center gap-1.5 mt-0.5">
                          <Package className="w-3 h-3 text-amber-700 shrink-0" />
                          <span className="line-clamp-1">{productName}</span>
                        </div>
                        <div className="font-mono text-[10px] text-stone-400">{camp.campaignId}</div>
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${badge.bg}`}>
                          <Icon className="w-3 h-3" />
                          <span>{badge.label}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="font-bold text-stone-900 font-serif">₹{camp.totalBudget.toLocaleString('en-IN')}</div>
                        <div className="text-[10px] text-stone-400">₹{camp.dailyBudget}/day</div>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="font-bold text-stone-800">Spent: ₹{(camp.spentAmount || 0).toFixed(2)}</div>
                        <div className="text-[10px] text-stone-500 font-medium">Rem: ₹{(camp.remainingBalance ?? (camp.totalBudget - (camp.spentAmount || 0))).toFixed(2)}</div>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap font-mono text-stone-700">
                        ₹{camp.cpc.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className="font-bold text-emerald-800">{camp.validClicks || 0}</span>
                        <span className="text-stone-400 text-[10px]"> / {camp.invalidClicks || 0}</span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-[11px] text-stone-500">
                        <div>{camp.startDate}</div>
                        <div className="text-[10px] text-stone-400">to {camp.endDate}</div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          {/* Pending Approval: Approve / Reject */}
                          {camp.status === 'PENDING_APPROVAL' && (
                            <>
                              <button
                                onClick={() => openActionModal(camp, 'APPROVE')}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300 transition cursor-pointer"
                                title="Approve Campaign"
                              >
                                <CheckCircle className="w-3 h-3" />
                                <span>Approve</span>
                              </button>
                              <button
                                onClick={() => openActionModal(camp, 'REJECT')}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-300 transition cursor-pointer"
                                title="Reject Campaign"
                              >
                                <XCircle className="w-3 h-3" />
                                <span>Reject</span>
                              </button>
                            </>
                          )}

                          {/* Active: Pause / Stop */}
                          {camp.status === 'ACTIVE' && (
                            <>
                              <button
                                onClick={() => openActionModal(camp, 'PAUSE')}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-300 transition cursor-pointer"
                                title="Pause Campaign"
                              >
                                <PauseCircle className="w-3 h-3" />
                                <span>Pause</span>
                              </button>
                              <button
                                onClick={() => openActionModal(camp, 'STOP')}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-stone-100 text-stone-700 hover:bg-stone-200 border border-stone-300 transition cursor-pointer"
                                title="Stop Campaign"
                              >
                                <StopCircle className="w-3 h-3" />
                                <span>Stop</span>
                              </button>
                            </>
                          )}

                          {/* Paused: Resume / Stop */}
                          {camp.status === 'PAUSED' && (
                            <>
                              <button
                                onClick={() => openActionModal(camp, 'RESUME')}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300 transition cursor-pointer"
                                title="Resume Campaign"
                              >
                                <PlayCircle className="w-3 h-3" />
                                <span>Resume</span>
                              </button>
                              <button
                                onClick={() => openActionModal(camp, 'STOP')}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-stone-100 text-stone-700 hover:bg-stone-200 border border-stone-300 transition cursor-pointer"
                                title="Stop Campaign"
                              >
                                <StopCircle className="w-3 h-3" />
                                <span>Stop</span>
                              </button>
                            </>
                          )}

                          {/* Completed / Rejected: Read-only info */}
                          {(camp.status === 'COMPLETED' || camp.status === 'REJECTED') && (
                            <span className="text-[10px] text-stone-400 italic">No further actions</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CONFIRMATION / REASON MODAL */}
      {selectedCampaign && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50">
              <div className="flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-amber-700" />
                <h3 className="text-sm font-bold text-stone-900 font-serif">
                  Confirm Admin Action: {actionType}
                </h3>
              </div>
              <button
                onClick={closeActionModal}
                className="text-stone-400 hover:text-stone-600 cursor-pointer p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleExecuteStatusChange} className="p-5 space-y-4 text-xs">
              {/* Campaign summary */}
              <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200 space-y-1">
                <div>
                  <span className="text-stone-400 text-[10px] block">Campaign:</span>
                  <span className="font-bold text-stone-900">{selectedCampaign.campaignName}</span>
                </div>
                <div className="flex justify-between text-[11px] pt-1">
                  <span>Vendor: <strong>{getVendorName(selectedCampaign.vendorId)}</strong></span>
                  <span>Total Budget: <strong>₹{selectedCampaign.totalBudget}</strong></span>
                </div>
                <div className="text-[11px] text-stone-500">
                  Current Status: <strong className="font-mono text-stone-800">{selectedCampaign.status}</strong>
                </div>
              </div>

              {/* Action notice */}
              <div className={`p-3 rounded-xl border text-xs ${
                actionType === 'APPROVE' || actionType === 'RESUME'
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                  : actionType === 'REJECT'
                  ? 'bg-rose-50 text-rose-900 border-rose-200'
                  : 'bg-amber-50 text-amber-900 border-amber-200'
              }`}>
                This will update the campaign status to{' '}
                <strong>
                  {actionType === 'APPROVE' && 'ACTIVE'}
                  {actionType === 'REJECT' && 'REJECTED'}
                  {actionType === 'PAUSE' && 'PAUSED'}
                  {actionType === 'RESUME' && 'ACTIVE'}
                  {actionType === 'STOP' && 'COMPLETED'}
                </strong>
                .
              </div>

              {/* Reason / Auditor Notes */}
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Administrative Reason / Audit Note
                </label>
                <textarea
                  rows={2}
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-xl focus:outline-none focus:border-amber-600"
                />
              </div>

              {/* Action buttons */}
              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={closeActionModal}
                  className="w-1/2 py-2.5 rounded-xl text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-700 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-1/2 py-2.5 rounded-xl text-xs font-bold text-white transition shadow-sm cursor-pointer disabled:opacity-50 ${
                    actionType === 'APPROVE' || actionType === 'RESUME'
                      ? 'bg-emerald-700 hover:bg-emerald-800'
                      : actionType === 'REJECT'
                      ? 'bg-rose-700 hover:bg-rose-800'
                      : 'bg-amber-800 hover:bg-amber-900'
                  }`}
                >
                  {isSubmitting ? 'Updating...' : `Confirm ${actionType}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
