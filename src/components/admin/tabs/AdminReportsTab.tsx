import React, { useState, useMemo, useEffect } from 'react';
import {
  TrendingUp,
  Download,
  Calendar,
  IndianRupee,
  ShoppingBag,
  CreditCard,
  CheckCircle2,
  PieChart as PieIcon,
  BarChart2,
  BarChart3,
  Filter,
  ShieldCheck,
  Megaphone,
} from 'lucide-react';
import { Order, Product, normalizeOrderStatus } from '../../../types';
import { VendorAdvertisingSuite } from '../../vendor/tabs/VendorAdvertisingSuite';
import { fetchAdminFinancialSummary } from '../../../services/vendorMarketplaceService';

interface AdminReportsTabProps {
  orders: Order[];
  products: Product[];
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const AdminReportsTab: React.FC<AdminReportsTabProps> = ({
  orders,
  products,
  showToast,
}) => {
  const [reportType, setReportType] = useState<'financial' | 'advertising'>('financial');
  const [dateRange, setDateRange] = useState<'today' | '7days' | '30days' | 'all'>('30days');
  const [platformCommissionTotal, setPlatformCommissionTotal] = useState<number>(0);
  const [advertisingRevenueTotal, setAdvertisingRevenueTotal] = useState<number>(0);

  useEffect(() => {
    let mounted = true;
    const loadSeparationMetrics = async () => {
      try {
        const finSummary = await fetchAdminFinancialSummary();
        if (mounted && finSummary?.platformTotals) {
          setPlatformCommissionTotal(finSummary.platformTotals.totalPlatformCommission || 0);
        }
      } catch {
        // Default stays 0
      }

      try {
        const res = await fetch('/api/advertising/wallets', {
          headers: { 'x-user-role': 'admin' },
        });
        const ct = res.headers.get('content-type') || '';
        if (res.ok && ct.includes('application/json')) {
          const data = await res.json();
          if (mounted && data?.summary) {
            setAdvertisingRevenueTotal(Number(data.summary.totalSpent || 0));
          }
        }
      } catch {
        // Static preview fallback: stays 0
      }
    };
    loadSeparationMetrics();
    return () => {
      mounted = false;
    };
  }, []);

  // Filter orders by date range
  const filteredOrders = useMemo(() => {
    const now = new Date();
    return orders.filter((o) => {
      try {
        const orderDate = new Date(o.createdAt);
        if (dateRange === 'today') {
          const midnight = new Date();
          midnight.setHours(0, 0, 0, 0);
          return orderDate >= midnight;
        } else if (dateRange === '7days') {
          const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
          return orderDate >= sevenDaysAgo;
        } else if (dateRange === '30days') {
          const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
          return orderDate >= thirtyDaysAgo;
        }
        return true;
      } catch {
        return true;
      }
    });
  }, [orders, dateRange]);

  // Valid non-cancelled orders for revenue
  const validOrders = useMemo(() => {
    return filteredOrders.filter((o) => {
      const norm = normalizeOrderStatus(o.status);
      return norm !== 'CANCELLED' && norm !== 'REFUNDED';
    });
  }, [filteredOrders]);

  const totalRevenue = useMemo(() => {
    return validOrders.reduce((acc, o) => acc + (o.total || 0), 0);
  }, [validOrders]);

  const aov = useMemo(() => {
    return validOrders.length > 0 ? Math.round(totalRevenue / validOrders.length) : 0;
  }, [totalRevenue, validOrders]);

  // Payment breakdown
  const paymentBreakdown = useMemo(() => {
    const counts: Record<string, { count: number; total: number }> = {
      UPI: { count: 0, total: 0 },
      COD: { count: 0, total: 0 },
      Card: { count: 0, total: 0 },
    };

    validOrders.forEach((o) => {
      const method = o.paymentMethod || 'UPI';
      if (method.toLowerCase().includes('cash')) {
        counts.COD.count += 1;
        counts.COD.total += o.total || 0;
      } else if (method.toLowerCase().includes('card')) {
        counts.Card.count += 1;
        counts.Card.total += o.total || 0;
      } else {
        counts.UPI.count += 1;
        counts.UPI.total += o.total || 0;
      }
    });

    return counts;
  }, [validOrders]);

  // Top products
  const topProducts = useMemo(() => {
    const map = new Map<string, { name: string; units: number; revenue: number }>();

    validOrders.forEach((o) => {
      o.items?.forEach((item) => {
        const existing = map.get(item.productId) || {
          name: item.productName,
          units: 0,
          revenue: 0,
        };
        existing.units += item.quantity || 1;
        existing.revenue += item.total || (item.price || 0) * (item.quantity || 1);
        map.set(item.productId, existing);
      });
    });

    return Array.from(map.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [validOrders]);

  // Export to CSV
  const handleExportCSV = () => {
    if (validOrders.length === 0) {
      showToast('No orders to export in this date range', 'info');
      return;
    }

    const csvEscape = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const headers = ['OrderNumber', 'Date', 'CustomerName', 'Phone', 'Total', 'PaymentMethod', 'Status'];
    const rows = validOrders.map((o) => [
      csvEscape(o.orderNumber),
      csvEscape(new Date(o.createdAt).toISOString()),
      csvEscape(o.customerName),
      csvEscape(o.customerPhone),
      o.total,
      csvEscape(o.paymentMethod),
      csvEscape(o.status),
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `puresudh_sales_report_${dateRange}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Sales report CSV exported successfully!', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Financial Separation Guarantee Banner */}
      <div className="p-4 bg-amber-50 rounded-2xl border-2 border-amber-300 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-amber-800 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wide">
              Strict Financial Separation (Zero Commingling)
            </h4>
            <p className="text-[11px] text-amber-900 leading-relaxed mt-0.5">
              Marketplace Platform Commission and Advertising Revenue are maintained in separate ledger accounts and never combined automatically.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="px-3 py-1.5 rounded-xl bg-white border border-amber-200 text-right shadow-2xs">
            <span className="text-[10px] text-stone-500 block uppercase font-medium">Platform Commission</span>
            <span className="text-sm font-black text-stone-900 font-serif">
              ₹{platformCommissionTotal.toLocaleString('en-IN')}
            </span>
          </div>
          <div className="text-stone-300 font-bold">•</div>
          <div className="px-3 py-1.5 rounded-xl bg-amber-900 text-white shadow-2xs text-right">
            <span className="text-[10px] text-amber-200 block uppercase font-medium">Advertising Revenue</span>
            <span className="text-sm font-black text-amber-100 font-serif">
              ₹{advertisingRevenueTotal.toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>

      {/* Report Switcher Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 pb-2 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setReportType('financial')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition cursor-pointer ${
            reportType === 'financial'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'bg-stone-100 hover:bg-stone-200 text-stone-600'
          }`}
        >
          <BarChart2 className="w-3.5 h-3.5" />
          <span>Standard Marketplace Financials</span>
        </button>
        <button
          onClick={() => setReportType('advertising')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition cursor-pointer ${
            reportType === 'advertising'
              ? 'bg-amber-800 text-white shadow-xs'
              : 'bg-stone-100 hover:bg-stone-200 text-stone-600'
          }`}
        >
          <Megaphone className="w-3.5 h-3.5" />
          <span>Vendor Advertising Report (Phase 6)</span>
        </button>
      </div>

      {reportType === 'advertising' ? (
        <VendorAdvertisingSuite
          vendorId="vendor-1"
          vendorName="Platform Administration"
          isAdminMode={true}
        />
      ) : (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs">
            <div>
              <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
                Sales & Analytics Reports
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-semibold border border-emerald-200">
                  Live Audited
                </span>
              </h2>
              <p className="text-sm text-stone-500 mt-0.5">
                Revenue trends, average order ticket value, payment split, and CSV ledger downloads
              </p>
            </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Date Range Selector */}
          <div className="flex items-center bg-stone-100 p-1 rounded-xl border border-stone-200 text-xs font-semibold overflow-x-auto no-scrollbar max-w-full">
            <button
              onClick={() => setDateRange('today')}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
                dateRange === 'today' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-600'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setDateRange('7days')}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
                dateRange === '7days' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-600'
              }`}
            >
              7 Days
            </button>
            <button
              onClick={() => setDateRange('30days')}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
                dateRange === '30days' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-600'
              }`}
            >
              30 Days
            </button>
            <button
              onClick={() => setDateRange('all')}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
                dateRange === 'all' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-600'
              }`}
            >
              All Time
            </button>
          </div>

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-stone-700 bg-white hover:bg-stone-50 border border-stone-300 rounded-xl transition-colors shadow-2xs whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5 text-stone-600" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Primary KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs">
          <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider block">
            Net Sales Revenue
          </span>
          <div className="text-3xl font-black text-stone-900 mt-2">
            ₹{totalRevenue.toLocaleString('en-IN')}
          </div>
          <p className="text-xs text-stone-500 mt-1">Excludes cancelled & refunded transactions</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs">
          <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider block">
            Average Order Value (AOV)
          </span>
          <div className="text-3xl font-black text-amber-900 mt-2">
            ₹{aov.toLocaleString('en-IN')}
          </div>
          <p className="text-xs text-stone-500 mt-1">Basket size per fulfilled order</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs">
          <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider block">
            Order Count
          </span>
          <div className="text-3xl font-black text-stone-900 mt-2">{validOrders.length}</div>
          <p className="text-xs text-stone-500 mt-1">Total fulfilled requests</p>
        </div>
      </div>

      {/* Dual Analytics Panels: Payment Channels & Top Selling Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Methods */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs space-y-4">
          <h3 className="font-bold text-stone-900 text-sm flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-amber-700" />
            Payment Channel Breakdown
          </h3>

          <div className="space-y-3">
            {Object.entries(paymentBreakdown).map(([name, data]: [string, { count: number; total: number }]) => {
              const pct = totalRevenue > 0 ? Math.round((data.total / totalRevenue) * 100) : 0;
              return (
                <div key={name} className="space-y-1 text-xs">
                  <div className="flex justify-between font-semibold">
                    <span className="text-stone-800">{name} ({data.count} orders)</span>
                    <span className="text-stone-900">
                      ₹{data.total.toLocaleString('en-IN')}{' '}
                      <span className="text-stone-400 font-normal">({pct}%)</span>
                    </span>
                  </div>
                  <progress
                    value={pct}
                    max={100}
                    className={`w-full h-2 rounded-full overflow-hidden appearance-none [&::-webkit-progress-bar]:bg-stone-100 [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-value]:rounded-full ${
                      name === 'UPI'
                        ? '[&::-webkit-progress-value]:bg-amber-600 [&::-moz-progress-bar]:bg-amber-600'
                        : name === 'COD'
                        ? '[&::-webkit-progress-value]:bg-emerald-600 [&::-moz-progress-bar]:bg-emerald-600'
                        : '[&::-webkit-progress-value]:bg-blue-600 [&::-moz-progress-bar]:bg-blue-600'
                    }`}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs space-y-4">
          <h3 className="font-bold text-stone-900 text-sm flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-amber-700" />
            Top Grossing Products
          </h3>

          <div className="space-y-2.5">
            {topProducts.length === 0 ? (
              <p className="text-stone-400 text-xs italic py-4">No order items in this date range.</p>
            ) : (
              topProducts.map((p, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-stone-100 bg-stone-50/50 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-900 font-bold flex items-center justify-center text-[10px]">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="font-semibold text-stone-900">{p.name}</div>
                      <div className="text-[10px] text-stone-400">{p.units} units sold</div>
                    </div>
                  </div>
                  <span className="font-bold text-stone-900">
                    ₹{p.revenue.toLocaleString('en-IN')}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      </div>
      )}
    </div>
  );
};
