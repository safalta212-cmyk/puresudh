import React, { useState, useEffect } from 'react';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  ShieldCheck,
  Info,
  Clock,
  Coins,
  History,
  AlertCircle,
} from 'lucide-react';
import { AdvertisingWallet, AdvertisingTransaction } from '../../../types/advertising';

interface VendorAdvertisingWalletTabProps {
  vendorId: string;
  vendorName: string;
}

export const VendorAdvertisingWalletTab: React.FC<VendorAdvertisingWalletTabProps> = ({
  vendorId,
  vendorName,
}) => {
  const [wallet, setWallet] = useState<AdvertisingWallet | null>(null);
  const [transactions, setTransactions] = useState<AdvertisingTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchWalletData = async () => {
    try {
      setError(null);
      const res = await fetch(`/api/advertising/wallet/${vendorId}`, {
        headers: {
          'x-user-role': 'vendor',
          'x-vendor-id': vendorId,
        },
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || `Failed to fetch wallet (${res.status})`);
      }

      const data = await res.json();
      if (data.success) {
        setWallet(data.wallet);
        setTransactions(data.transactions || []);
      }
    } catch (err: any) {
      console.error('[VendorAdWallet] Error:', err);
      setError(err.message || 'Unable to load advertising wallet');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchWalletData();
  }, [vendorId]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchWalletData();
  };

  const getTxTypeBadge = (type: string) => {
    switch (type) {
      case 'WALLET_TOPUP':
      case 'CAMPAIGN_CREDIT':
        return {
          label: 'Credit Top-up',
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          icon: ArrowUpRight,
          color: 'text-emerald-700 font-bold',
        };
      case 'REFUND':
        return {
          label: 'Refund',
          bg: 'bg-blue-50 text-blue-800 border-blue-200',
          icon: ArrowDownLeft,
          color: 'text-blue-700 font-bold',
        };
      case 'AD_SPEND':
        return {
          label: 'Ad Spend',
          bg: 'bg-purple-50 text-purple-800 border-purple-200',
          icon: ArrowDownLeft,
          color: 'text-purple-700 font-bold',
        };
      case 'MANUAL_ADJUSTMENT':
      default:
        return {
          label: 'Adjustment',
          bg: 'bg-amber-50 text-amber-800 border-amber-200',
          icon: RefreshCw,
          color: 'text-amber-800 font-bold',
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-100 text-amber-900 rounded-xl">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-stone-900 font-serif">
                Vendor Advertising Wallet
              </h2>
              <p className="text-xs text-stone-500">
                Prepaid advertising budget for {vendorName} • Completely isolated from store sales earnings & bank payouts
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-700 transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Refresh Balance</span>
            </button>
          </div>
        </div>

        {/* Security & Isolation Disclaimer */}
        <div className="mt-4 p-3.5 bg-amber-50/80 rounded-xl border border-amber-200/70 flex items-start gap-2.5 text-xs text-amber-900">
          <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong>Financial Isolation Guarantee:</strong> Your Advertising Wallet balance is strictly used for sponsored placements and advertising campaigns. Funds in this wallet are maintained separately from your vendor sales revenue and cannot be commingled with periodic bank payouts.
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center gap-3 text-xs text-rose-800">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 4 Core Financial Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Available Balance */}
        <div className="bg-white rounded-2xl border-2 border-emerald-500/60 p-5 shadow-xs relative overflow-hidden bg-gradient-to-br from-white to-emerald-50/30">
          <div className="flex items-center justify-between text-xs text-emerald-800 font-semibold mb-2">
            <span>Available Balance</span>
            <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
              <Coins className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-stone-900 font-serif">
            ₹{loading ? '...' : (wallet?.availableBalance ?? 0).toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-emerald-700 mt-1 font-medium">
            Ready for active ad campaigns
          </p>
        </div>

        {/* Metric 2: Total Deposited */}
        <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-stone-500 font-medium mb-2">
            <span>Total Deposited</span>
            <span className="p-1.5 rounded-lg bg-amber-50 text-amber-800">
              <ArrowUpRight className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-stone-800 font-serif">
            ₹{loading ? '...' : (wallet?.totalDeposited ?? 0).toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-stone-400 mt-1">
            Lifetime top-ups & credits
          </p>
        </div>

        {/* Metric 3: Total Spent */}
        <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-stone-500 font-medium mb-2">
            <span>Total Spent</span>
            <span className="p-1.5 rounded-lg bg-purple-50 text-purple-800">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-stone-800 font-serif">
            ₹{loading ? '...' : (wallet?.totalSpent ?? 0).toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-stone-400 mt-1">
            Attributed click & ad costs
          </p>
        </div>

        {/* Metric 4: Total Refunded */}
        <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-stone-500 font-medium mb-2">
            <span>Total Refunded</span>
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-800">
              <ArrowDownLeft className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-stone-800 font-serif">
            ₹{loading ? '...' : (wallet?.totalRefunded ?? 0).toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-stone-400 mt-1">
            Returned to payment source
          </p>
        </div>
      </div>

      {/* Immutable Transaction History */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-stone-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-stone-600" />
            <h3 className="text-sm font-bold text-stone-800">
              Advertising Transaction Ledger ({transactions.length})
            </h3>
          </div>
          <span className="text-[11px] text-stone-400 font-mono">
            Immutable Audit Trail
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-stone-500">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto text-amber-700 mb-2" />
            Loading advertising transactions...
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-8 text-center text-xs text-stone-500 space-y-2">
            <Coins className="w-8 h-8 mx-auto text-stone-300" />
            <p className="font-semibold text-stone-700">No advertising transactions recorded yet.</p>
            <p className="text-[11px] text-stone-400 max-w-sm mx-auto">
              When administrator credits promotional ad funds or adjustments are made, they will appear in this immutable financial ledger.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-stone-50 text-stone-600 font-semibold border-b border-stone-200">
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Transaction ID</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-right">Balance Change</th>
                  <th className="py-3 px-4">Description / Reason</th>
                  <th className="py-3 px-4">Authorized By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-stone-700">
                {transactions.map((tx) => {
                  const badge = getTxTypeBadge(tx.type);
                  const isPositive = tx.amount > 0;
                  return (
                    <tr key={tx.transactionId} className="hover:bg-stone-50/60 transition">
                      <td className="py-3 px-4 whitespace-nowrap text-stone-500">
                        {new Date(tx.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}{' '}
                        <span className="text-[10px] text-stone-400">
                          {new Date(tx.createdAt).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-stone-500">
                        {tx.transactionId}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${badge.bg}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className={`py-3 px-4 text-right whitespace-nowrap font-semibold ${isPositive ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {isPositive ? `+₹${tx.amount.toLocaleString('en-IN')}` : `-₹${Math.abs(tx.amount).toLocaleString('en-IN')}`}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap font-mono text-[11px] text-stone-500">
                        ₹{tx.previousBalance.toLocaleString('en-IN')} → <strong className="text-stone-800">₹{tx.newBalance.toLocaleString('en-IN')}</strong>
                      </td>
                      <td className="py-3 px-4 text-stone-600 max-w-xs truncate" title={tx.description}>
                        {tx.description}
                      </td>
                      <td className="py-3 px-4 font-mono text-[10px] text-stone-500">
                        {tx.createdBy}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
