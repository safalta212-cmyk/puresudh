import React, { useState, useEffect } from 'react';
import {
  Wallet,
  Coins,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  PlusCircle,
  RotateCcw,
  SlidersHorizontal,
  History,
  AlertCircle,
  CheckCircle2,
  X,
  Search,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { AdvertisingWallet, AdvertisingTransaction } from '../../../types/advertising';
import { INITIAL_MARKETPLACE_VENDORS } from '../../../constants';

interface AdminAdvertisingWalletsTabProps {
  adminEmail?: string;
}

export const AdminAdvertisingWalletsTab: React.FC<AdminAdvertisingWalletsTabProps> = ({
  adminEmail = 'aanews70@gmail.com',
}) => {
  const [wallets, setWallets] = useState<AdvertisingWallet[]>([]);
  const [summary, setSummary] = useState<{
    totalWallets: number;
    totalFloat: number;
    totalDeposited: number;
    totalSpent: number;
    totalRefunded: number;
  }>({
    totalWallets: 0,
    totalFloat: 0,
    totalDeposited: 0,
    totalSpent: 0,
    totalRefunded: 0,
  });

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Modal State for Admin Action (Add Credit / Refund / Adjustment)
  const [selectedWallet, setSelectedWallet] = useState<AdvertisingWallet | null>(null);
  const [actionType, setActionType] = useState<'ADD_CREDIT' | 'REFUND_BALANCE' | 'MANUAL_ADJUSTMENT'>('ADD_CREDIT');
  const [adjustmentSubtype, setAdjustmentSubtype] = useState<'CREDIT' | 'DEBIT'>('CREDIT');
  const [refundSubtype, setRefundSubtype] = useState<
    'campaign refund' | 'unused wallet balance refund' | 'admin adjustment' | 'expired campaign balance'
  >('unused wallet balance refund');
  const [actionAmount, setActionAmount] = useState<number | ''>('');
  const [actionReason, setActionReason] = useState<string>('');
  const [actionAdminId, setActionAdminId] = useState<string>(adminEmail);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Transactions View Modal
  const [inspectingVendorId, setInspectingVendorId] = useState<string | null>(null);
  const [vendorTransactions, setVendorTransactions] = useState<AdvertisingTransaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);

  const fetchWallets = async () => {
    try {
      setErrorMessage(null);
      const res = await fetch('/api/advertising/wallets', {
        headers: {
          'x-user-role': 'admin',
          'x-user-email': adminEmail,
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to load advertising wallets (${res.status})`);
      }

      const data = await res.json();
      if (data.success) {
        setWallets(data.wallets || []);
        if (data.summary) {
          setSummary(data.summary);
        }
      }
    } catch (err: any) {
      console.error('[AdminAdWallets] Error:', err);
      setErrorMessage(err.message || 'Error fetching advertising wallets');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchWallets();
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchWallets();
  };

  const openActionModal = (
    wallet: AdvertisingWallet,
    type: 'ADD_CREDIT' | 'REFUND_BALANCE' | 'MANUAL_ADJUSTMENT'
  ) => {
    setSelectedWallet(wallet);
    setActionType(type);
    setAdjustmentSubtype('CREDIT');
    setActionAmount('');
    setActionReason('');
    setActionAdminId(adminEmail);
  };

  const closeActionModal = () => {
    setSelectedWallet(null);
    setActionAmount('');
    setActionReason('');
    setIsSubmitting(false);
  };

  const handleSubmitAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWallet) return;

    if (!actionAmount || Number(actionAmount) <= 0) {
      setErrorMessage('Please enter a valid positive amount.');
      return;
    }

    if (!actionReason.trim()) {
      setErrorMessage('Reason is mandatory for all advertising adjustments.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      let res: Response;
      if (actionType === 'REFUND_BALANCE') {
        res = await fetch('/api/advertising/refund', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-role': 'admin',
            'x-user-email': adminEmail,
          },
          body: JSON.stringify({
            vendorId: selectedWallet.vendorId,
            refundType: refundSubtype,
            amount: Number(actionAmount),
            reason: actionReason.trim(),
            authorizedBy: actionAdminId.trim() || adminEmail,
          }),
        });
      } else {
        res = await fetch('/api/advertising/wallet/admin-action', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-role': 'admin',
            'x-user-email': adminEmail,
          },
          body: JSON.stringify({
            vendorId: selectedWallet.vendorId,
            action: actionType,
            amount: Number(actionAmount),
            reason: actionReason.trim(),
            adminId: actionAdminId.trim() || adminEmail,
            adjustmentType: actionType === 'MANUAL_ADJUSTMENT' ? adjustmentSubtype : undefined,
          }),
        });
      }

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Advertising action failed');
      }

      setSuccessToast(
        actionType === 'REFUND_BALANCE'
          ? `Successfully issued ${refundSubtype} (₹${actionAmount}) for vendor ${selectedWallet.vendorId}.`
          : `Successfully executed ${actionType} for vendor ${selectedWallet.vendorId}.`
      );
      closeActionModal();
      await fetchWallets();
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err: any) {
      console.error('[AdminAdWallets] Action Error:', err);
      setErrorMessage(err.message || 'Failed to submit wallet action');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openTransactionsModal = async (vendorId: string) => {
    setInspectingVendorId(vendorId);
    setLoadingTransactions(true);
    try {
      const res = await fetch(`/api/advertising/transactions/${vendorId}`, {
        headers: {
          'x-user-role': 'admin',
          'x-user-email': adminEmail,
        },
      });
      const data = await res.json();
      if (data.success) {
        setVendorTransactions(data.transactions || []);
      }
    } catch (err: any) {
      console.error('[AdminAdWallets] Tx error:', err);
    } finally {
      setLoadingTransactions(false);
    }
  };

  const getVendorName = (vendorId: string): string => {
    const match = INITIAL_MARKETPLACE_VENDORS.find((v) => v.id === vendorId);
    return match ? match.name : vendorId;
  };

  const filteredWallets = wallets.filter((w) => {
    const vName = getVendorName(w.vendorId).toLowerCase();
    const q = searchQuery.toLowerCase().trim();
    return vName.includes(q) || w.vendorId.toLowerCase().includes(q);
  });

  // Calculate prospective new balance for live modal preview
  const calculatePreviewBalance = (): number => {
    if (!selectedWallet || !actionAmount || Number(actionAmount) <= 0) {
      return selectedWallet?.availableBalance ?? 0;
    }
    const current = selectedWallet.availableBalance;
    const amt = Number(actionAmount);
    if (actionType === 'ADD_CREDIT') return current + amt;
    if (actionType === 'REFUND_BALANCE') return Math.max(0, current - amt);
    if (actionType === 'MANUAL_ADJUSTMENT') {
      return adjustmentSubtype === 'CREDIT' ? current + amt : Math.max(0, current - amt);
    }
    return current;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-3 bg-amber-100 text-amber-900 rounded-xl">
              <Coins className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-stone-900 font-serif">
                Vendor Advertising Wallets (Phase 2)
              </h2>
              <p className="text-xs text-stone-500">
                Server-authoritative prepaid balances for vendor sponsored campaigns • Decoupled from store earnings & payouts
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

      {/* Success Notification */}
      {successToast && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3 text-xs text-emerald-900 shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="font-semibold">{successToast}</span>
        </div>
      )}

      {/* Error Notification */}
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

      {/* 4 Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs">
          <div className="text-xs text-stone-500 font-semibold mb-1">Total Active Wallets</div>
          <div className="text-2xl font-extrabold text-stone-900 font-serif">
            {loading ? '...' : summary.totalWallets}
          </div>
          <p className="text-[11px] text-stone-400 mt-1">1:1 dedicated vendor mapping</p>
        </div>

        <div className="bg-white rounded-2xl border border-emerald-500/40 p-5 shadow-xs bg-emerald-50/20">
          <div className="text-xs text-emerald-800 font-semibold mb-1">Available Float (Total Balance)</div>
          <div className="text-2xl font-extrabold text-emerald-900 font-serif">
            ₹{loading ? '...' : summary.totalFloat.toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-emerald-700 mt-1">Ready for ad impressions</p>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs">
          <div className="text-xs text-stone-500 font-semibold mb-1">Total Deposited</div>
          <div className="text-2xl font-bold text-stone-800 font-serif">
            ₹{loading ? '...' : summary.totalDeposited.toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-stone-400 mt-1">All-time promotional credits</p>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs">
          <div className="text-xs text-stone-500 font-semibold mb-1">Total Refunded</div>
          <div className="text-2xl font-bold text-stone-800 font-serif">
            ₹{loading ? '...' : summary.totalRefunded.toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-stone-400 mt-1">Returned to merchants</p>
        </div>
      </div>

      {/* Wallets Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-stone-600" />
            <h3 className="text-sm font-bold text-stone-800">
              Active Vendor Advertising Wallets ({filteredWallets.length})
            </h3>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-stone-400" />
            <input
              type="text"
              placeholder="Search vendor or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-amber-600"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-stone-500">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto text-amber-700 mb-2" />
            Loading advertising wallets...
          </div>
        ) : filteredWallets.length === 0 ? (
          <div className="p-8 text-center text-xs text-stone-500">
            No advertising wallets found matching your filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-stone-50 text-stone-600 font-semibold border-b border-stone-200">
                  <th className="py-3 px-4">Vendor</th>
                  <th className="py-3 px-4 text-right">Available Balance</th>
                  <th className="py-3 px-4 text-right">Total Deposited</th>
                  <th className="py-3 px-4 text-right">Total Spent</th>
                  <th className="py-3 px-4 text-right">Total Refunded</th>
                  <th className="py-3 px-4 text-center">Admin Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-stone-700">
                {filteredWallets.map((w) => {
                  const vendorName = getVendorName(w.vendorId);
                  return (
                    <tr key={w.walletId} className="hover:bg-stone-50/70 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-stone-900">{vendorName}</div>
                        <div className="font-mono text-[10px] text-stone-400">{w.vendorId}</div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-emerald-800 font-serif text-sm">
                        ₹{(w.availableBalance ?? 0).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 text-right text-stone-600">
                        ₹{(w.totalDeposited ?? 0).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 text-right text-stone-600">
                        ₹{(w.totalSpent ?? 0).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 text-right text-stone-600">
                        ₹{(w.totalRefunded ?? 0).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          <button
                            onClick={() => openActionModal(w, 'ADD_CREDIT')}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 transition cursor-pointer"
                            title="Add promotional ad credit"
                          >
                            <PlusCircle className="w-3 h-3" />
                            <span>Add Credit</span>
                          </button>

                          <button
                            onClick={() => openActionModal(w, 'REFUND_BALANCE')}
                            disabled={w.availableBalance <= 0}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                            title="Refund unspent balance"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Refund</span>
                          </button>

                          <button
                            onClick={() => openActionModal(w, 'MANUAL_ADJUSTMENT')}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 transition cursor-pointer"
                            title="Manual balance adjustment"
                          >
                            <SlidersHorizontal className="w-3 h-3" />
                            <span>Adjust</span>
                          </button>

                          <button
                            onClick={() => openTransactionsModal(w.vendorId)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-stone-100 text-stone-700 hover:bg-stone-200 transition cursor-pointer"
                            title="View immutable transactions"
                          >
                            <History className="w-3 h-3" />
                            <span>Ledger</span>
                          </button>
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

      {/* MODAL: Admin Action (Add Credit / Refund / Manual Adjustment) */}
      {selectedWallet && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50">
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-amber-700" />
                <h3 className="text-sm font-bold text-stone-900 font-serif">
                  {actionType === 'ADD_CREDIT' && 'Add Advertising Credit'}
                  {actionType === 'REFUND_BALANCE' && 'Refund Advertising Balance'}
                  {actionType === 'MANUAL_ADJUSTMENT' && 'Manual Advertising Adjustment'}
                </h3>
              </div>
              <button
                onClick={closeActionModal}
                className="text-stone-400 hover:text-stone-600 cursor-pointer p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitAction} className="p-5 space-y-4">
              {/* Vendor & Current Balance Banner */}
              <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200 flex items-center justify-between text-xs">
                <div>
                  <span className="text-stone-400 block text-[10px]">Vendor:</span>
                  <span className="font-bold text-stone-800">{getVendorName(selectedWallet.vendorId)}</span>
                </div>
                <div className="text-right">
                  <span className="text-stone-400 block text-[10px]">Current Available:</span>
                  <span className="font-extrabold text-emerald-800 font-serif text-sm">
                    ₹{selectedWallet.availableBalance.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Action Type Selector */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Action Type
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setActionType('ADD_CREDIT')}
                    className={`py-2 px-2 text-center rounded-xl text-xs font-semibold border transition cursor-pointer ${
                      actionType === 'ADD_CREDIT'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold shadow-xs'
                        : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                    }`}
                  >
                    Add Credit
                  </button>
                  <button
                    type="button"
                    onClick={() => setActionType('REFUND_BALANCE')}
                    className={`py-2 px-2 text-center rounded-xl text-xs font-semibold border transition cursor-pointer ${
                      actionType === 'REFUND_BALANCE'
                        ? 'bg-blue-50 text-blue-800 border-blue-300 font-bold shadow-xs'
                        : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                    }`}
                  >
                    Refund
                  </button>
                  <button
                    type="button"
                    onClick={() => setActionType('MANUAL_ADJUSTMENT')}
                    className={`py-2 px-2 text-center rounded-xl text-xs font-semibold border transition cursor-pointer ${
                      actionType === 'MANUAL_ADJUSTMENT'
                        ? 'bg-amber-50 text-amber-800 border-amber-300 font-bold shadow-xs'
                        : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                    }`}
                  >
                    Adjust
                  </button>
                </div>
              </div>

              {/* Adjustment direction if manual adjustment */}
              {actionType === 'MANUAL_ADJUSTMENT' && (
                <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200/80">
                  <label className="block text-[11px] font-semibold text-amber-900 mb-1.5">
                    Adjustment Direction
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setAdjustmentSubtype('CREDIT')}
                      className={`py-1.5 text-xs font-semibold rounded-lg border transition cursor-pointer ${
                        adjustmentSubtype === 'CREDIT'
                          ? 'bg-white text-emerald-800 border-emerald-400 shadow-xs'
                          : 'bg-transparent text-stone-600 border-transparent hover:bg-white/50'
                      }`}
                    >
                      + Credit (Increase)
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdjustmentSubtype('DEBIT')}
                      className={`py-1.5 text-xs font-semibold rounded-lg border transition cursor-pointer ${
                        adjustmentSubtype === 'DEBIT'
                          ? 'bg-white text-rose-800 border-rose-400 shadow-xs'
                          : 'bg-transparent text-stone-600 border-transparent hover:bg-white/50'
                      }`}
                    >
                      - Debit (Decrease)
                    </button>
                  </div>
                </div>
              )}

              {/* Phase 7: Ad Refund Subtype Selection */}
              {actionType === 'REFUND_BALANCE' && (
                <div className="bg-blue-50/70 p-3 rounded-xl border border-blue-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-semibold text-blue-900">
                      Refund Category (Phase 7)
                    </label>
                    <span className="text-[10px] text-blue-700 font-mono">Immutable REFUND</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { id: 'unused wallet balance refund', label: 'Unused Wallet Balance' },
                      { id: 'campaign refund', label: 'Campaign Refund' },
                      { id: 'admin adjustment', label: 'Admin Adjustment' },
                      { id: 'expired campaign balance', label: 'Expired Campaign Balance' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setRefundSubtype(opt.id as any)}
                        className={`py-1.5 px-2 text-left rounded-lg text-[11px] font-medium border transition cursor-pointer ${
                          refundSubtype === opt.id
                            ? 'bg-white text-blue-900 border-blue-400 font-bold shadow-xs'
                            : 'bg-white/40 text-stone-600 border-transparent hover:bg-white'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-blue-800 leading-tight">
                    Every refund creates an immutable REFUND transaction. The original AD_SPEND transaction is never deleted.
                  </p>
                </div>
              )}

              {/* Amount Input */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Amount (₹) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-stone-500">₹</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    placeholder="e.g. 500"
                    value={actionAmount}
                    onChange={(e) => {
                      const val = e.target.value === '' ? '' : Math.max(0, Number(e.target.value));
                      setActionAmount(val);
                    }}
                    required
                    className="w-full pl-8 pr-3 py-2 text-sm bg-white border border-stone-300 rounded-xl focus:outline-none focus:border-amber-600 font-semibold"
                  />
                </div>
                {actionType === 'REFUND_BALANCE' && Number(actionAmount) > selectedWallet.availableBalance && (
                  <p className="text-[11px] text-rose-600 mt-1 font-medium">
                    ⚠️ Cannot refund more than available balance of ₹{selectedWallet.availableBalance}.
                  </p>
                )}
              </div>

              {/* Live Preview of Balance Change */}
              <div className="p-3 bg-stone-100 rounded-xl border border-stone-200 text-xs flex items-center justify-between">
                <span className="text-stone-500">Resulting Balance:</span>
                <span className="font-mono font-bold text-stone-900">
                  ₹{selectedWallet.availableBalance.toLocaleString('en-IN')} →{' '}
                  <span className="text-emerald-800 text-sm font-extrabold">
                    ₹{calculatePreviewBalance().toLocaleString('en-IN')}
                  </span>
                </span>
              </div>

              {/* Reason Input (MANDATORY) */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Reason for Adjustment * (Mandatory for audit trail)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Promotional campaign bonus, merchant refund request, dispute adjustment"
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-xl focus:outline-none focus:border-amber-600"
                />
              </div>

              {/* Admin ID / Auditor */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Authorized Admin ID / Email
                </label>
                <input
                  type="text"
                  value={actionAdminId}
                  onChange={(e) => setActionAdminId(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-xl font-mono text-stone-600"
                />
              </div>

              {/* Action Buttons */}
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
                  disabled={
                    isSubmitting ||
                    !actionAmount ||
                    Number(actionAmount) <= 0 ||
                    !actionReason.trim() ||
                    (actionType === 'REFUND_BALANCE' && Number(actionAmount) > selectedWallet.availableBalance)
                  }
                  className="w-1/2 py-2.5 rounded-xl text-xs font-bold bg-amber-800 hover:bg-amber-900 text-white transition shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Recording...' : 'Confirm Mutation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Inspect Vendor Transactions */}
      {inspectingVendorId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-stone-700" />
                <div>
                  <h3 className="text-sm font-bold text-stone-900 font-serif">
                    Immutable Advertising Transactions: {getVendorName(inspectingVendorId)}
                  </h3>
                  <span className="text-[10px] font-mono text-stone-400">{inspectingVendorId}</span>
                </div>
              </div>
              <button
                onClick={() => setInspectingVendorId(null)}
                className="text-stone-400 hover:text-stone-600 cursor-pointer p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1">
              {loadingTransactions ? (
                <div className="py-12 text-center text-xs text-stone-500">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto text-amber-700 mb-2" />
                  Loading transactions...
                </div>
              ) : vendorTransactions.length === 0 ? (
                <div className="py-12 text-center text-xs text-stone-500">
                  No advertising transactions found for this vendor.
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-stone-50 text-stone-600 font-semibold border-b border-stone-200">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Tx ID</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3 text-right">Amount</th>
                      <th className="py-2.5 px-3 text-right">Balance</th>
                      <th className="py-2.5 px-3">Reason</th>
                      <th className="py-2.5 px-3">Admin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 text-stone-700">
                    {vendorTransactions.map((tx) => {
                      const isPositive = tx.amount > 0;
                      return (
                        <tr key={tx.transactionId} className="hover:bg-stone-50">
                          <td className="py-2.5 px-3 whitespace-nowrap text-stone-500">
                            {new Date(tx.createdAt).toLocaleDateString('en-IN')}{' '}
                            <span className="text-[10px] text-stone-400">
                              {new Date(tx.createdAt).toLocaleTimeString('en-IN', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[10px] text-stone-400">
                            {tx.transactionId.slice(-10)}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-stone-100 text-stone-700 border border-stone-200">
                              {tx.type}
                            </span>
                          </td>
                          <td className={`py-2.5 px-3 text-right font-semibold ${isPositive ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {isPositive ? `+₹${tx.amount.toLocaleString('en-IN')}` : `-₹${Math.abs(tx.amount).toLocaleString('en-IN')}`}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-[11px] text-stone-500">
                            ₹{tx.previousBalance} → <strong>₹{tx.newBalance}</strong>
                          </td>
                          <td className="py-2.5 px-3 max-w-xs truncate" title={tx.description}>
                            {tx.description}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[10px] text-stone-500">
                            {tx.createdBy}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
