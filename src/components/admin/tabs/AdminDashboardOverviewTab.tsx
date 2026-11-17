import React, { useState } from 'react';
import {
  ShoppingBag,
  TrendingUp,
  Users,
  Package,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  Plus,
  ArrowRight,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Eye,
  IndianRupee,
} from 'lucide-react';
import { Product, Order, OrderStatus } from '../../../types';

interface AdminDashboardOverviewTabProps {
  products: Product[];
  orders: Order[];
  onNavigateSection?: (sectionId: string) => void;
  onNavigate?: (sectionId: string) => void;
  onOpenProductModal?: () => void;
  onOpenOrderDetails?: (order: Order) => void;
  onRefreshData?: () => void | Promise<void>;
  customersCount?: number;
}

export const AdminDashboardOverviewTab: React.FC<AdminDashboardOverviewTabProps> = ({
  products,
  orders,
  onNavigateSection,
  onNavigate,
  onOpenProductModal,
  onOpenOrderDetails,
  onRefreshData,
  customersCount: propCustomersCount,
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleNav = (sectionId: string) => {
    if (typeof onNavigateSection === 'function') {
      onNavigateSection(sectionId);
    } else if (typeof onNavigate === 'function') {
      onNavigate(sectionId);
    }
  };

  const handleOpenProduct = () => {
    if (typeof onOpenProductModal === 'function') {
      onOpenProductModal();
    } else {
      handleNav('products');
    }
  };

  const handleOpenOrder = (order: Order) => {
    if (typeof onOpenOrderDetails === 'function') {
      onOpenOrderDetails(order);
    } else {
      handleNav('orders');
    }
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    if (typeof onRefreshData === 'function') {
      try {
        await onRefreshData();
      } catch (err) {
        console.error('Refresh error:', err);
      }
    }
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // Metrics
  const totalOrders = orders.length;

  const todayMidnight = new Date();
  todayMidnight.setHours(0, 0, 0, 0);

  const todaysOrders = orders.filter((o) => {
    try {
      const orderDate = new Date(o.createdAt);
      return orderDate >= todayMidnight;
    } catch {
      return false;
    }
  });

  const totalRevenue = orders.reduce((sum, o) => {
    const isCancelled = o.status === 'CANCELLED' || o.status === 'Cancelled' || o.status === 'REFUNDED';
    return isCancelled ? sum : sum + (o.total || 0);
  }, 0);

  const todayRevenue = todaysOrders.reduce((sum, o) => {
    const isCancelled = o.status === 'CANCELLED' || o.status === 'Cancelled' || o.status === 'REFUNDED';
    return isCancelled ? sum : sum + (o.total || 0);
  }, 0);

  const uniqueCustomerEmails = new Set(orders.map((o) => o.customerEmail || o.customerId)).size;
  const computedCustomersCount = uniqueCustomerEmails;
  const customersCount = propCustomersCount ?? computedCustomersCount;

  const productsCount = products.length;
  const lowStockProducts = products.filter((p) => (p.stockQuantity ?? 10) <= 10);
  const outOfStockProducts = products.filter((p) => (p.stockQuantity ?? 0) === 0);

  const pendingOrders = orders.filter((o) => {
    const s = o.status;
    return (
      s === 'PLACED' ||
      s === 'Order Placed' ||
      s === 'CONFIRMED' ||
      s === 'Confirmed' ||
      s === 'PREPARING' ||
      s === 'PACKED' ||
      s === 'OUT_FOR_DELIVERY' ||
      s === 'Out for Delivery'
    );
  });

  const deliveredOrders = orders.filter((o) => o.status === 'DELIVERED' || o.status === 'Delivered');
  const cancelledOrders = orders.filter((o) => o.status === 'CANCELLED' || o.status === 'Cancelled');
  const refundedOrders = orders.filter((o) => o.status === 'REFUNDED' || o.status === 'Refunded');

  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Top Header & Quick Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
            Operations & Performance Overview
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium border border-emerald-200">
              Live Database
            </span>
          </h2>
          <p className="text-sm text-stone-500 mt-0.5">
            Real-time analytics for PURE SUDH store, dispatch fleet, and inventory
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors border border-stone-300/70"
            title="Refresh database"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-amber-700' : ''}`} />
            Refresh
          </button>
          <button
            onClick={handleOpenProduct}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-amber-700 hover:bg-amber-800 rounded-lg transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Product
          </button>
        </div>
      </div>

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5 sm:gap-4">
        {/* Total Revenue */}
        <div className="bg-white p-4 rounded-xl border border-stone-200/90 shadow-2xs hover:border-amber-400 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500 uppercase tracking-wider">Total Revenue</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black text-stone-900">₹{totalRevenue.toLocaleString('en-IN')}</span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Today: <span className="font-semibold text-emerald-700">₹{todayRevenue.toLocaleString('en-IN')}</span>
          </p>
        </div>

        {/* Total Orders */}
        <div
          onClick={() => handleNav('orders')}
          className="bg-white p-4 rounded-xl border border-stone-200/90 shadow-2xs hover:border-amber-400 transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500 uppercase tracking-wider">Total Orders</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center group-hover:scale-105 transition-transform">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-stone-900">{totalOrders}</span>
            <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-amber-700 transition-colors" />
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Today: <span className="font-semibold text-stone-800">{todaysOrders.length} new</span>
          </p>
        </div>

        {/* Pending Orders */}
        <div
          onClick={() => handleNav('orders')}
          className="bg-white p-4 rounded-xl border border-amber-200/90 bg-amber-50/20 shadow-2xs hover:border-amber-400 transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-900 uppercase tracking-wider">Pending Orders</span>
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-amber-900">{pendingOrders.length}</span>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-200/70 text-amber-900">
              Needs Dispatch
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">Active fulfillment line</p>
        </div>

        {/* Delivered Orders */}
        <div className="bg-white p-4 rounded-xl border border-stone-200/90 shadow-2xs hover:border-stone-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500 uppercase tracking-wider">Delivered</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black text-stone-900">{deliveredOrders.length}</span>
          </div>
          <p className="text-xs text-emerald-700 font-medium mt-1">
            {totalOrders > 0 ? Math.round((deliveredOrders.length / totalOrders) * 100) : 0}% completion rate
          </p>
        </div>

        {/* Cancelled / Refunded */}
        <div className="bg-white p-4 rounded-xl border border-stone-200/90 shadow-2xs hover:border-stone-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500 uppercase tracking-wider">Cancelled / Refund</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-stone-900">{cancelledOrders.length}</span>
            {refundedOrders.length > 0 && (
              <span className="text-xs text-purple-700 font-medium">({refundedOrders.length} refunded)</span>
            )}
          </div>
          <p className="text-xs text-stone-500 mt-1">Cancelled order instances</p>
        </div>

        {/* Customers */}
        <div
          onClick={() => handleNav('customers')}
          className="bg-white p-4 rounded-xl border border-stone-200/90 shadow-2xs hover:border-amber-400 transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500 uppercase tracking-wider">Customers</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-stone-900">{customersCount}</span>
            <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-purple-700 transition-colors" />
          </div>
          <p className="text-xs text-stone-500 mt-1">Verified user profiles</p>
        </div>

        {/* Products in Catalog */}
        <div
          onClick={() => handleNav('products')}
          className="bg-white p-4 rounded-xl border border-stone-200/90 shadow-2xs hover:border-amber-400 transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500 uppercase tracking-wider">Products</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-800 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-stone-900">{productsCount}</span>
            <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-amber-800 transition-colors" />
          </div>
          <p className="text-xs text-stone-500 mt-1">Active items in catalog</p>
        </div>

        {/* Low Stock Warning */}
        <div
          onClick={() => handleNav('products')}
          className={`p-4 rounded-xl border shadow-2xs transition-colors cursor-pointer group ${
            lowStockProducts.length > 0
              ? 'bg-rose-50/40 border-rose-300 hover:border-rose-400'
              : 'bg-white border-stone-200/90 hover:border-stone-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-xs font-medium uppercase tracking-wider ${
                lowStockProducts.length > 0 ? 'text-rose-900' : 'text-stone-500'
              }`}
            >
              Low Stock Alert
            </span>
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                lowStockProducts.length > 0 ? 'bg-rose-100 text-rose-700' : 'bg-stone-100 text-stone-500'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span
              className={`text-2xl font-black ${
                lowStockProducts.length > 0 ? 'text-rose-900' : 'text-stone-900'
              }`}
            >
              {lowStockProducts.length}
            </span>
            <span
              className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                lowStockProducts.length > 0 ? 'bg-rose-200/80 text-rose-900' : 'bg-stone-100 text-stone-600'
              }`}
            >
              Threshold ≤ 10
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            {outOfStockProducts.length > 0
              ? `${outOfStockProducts.length} completely sold out`
              : 'Need dairy & pantry restock'}
          </p>
        </div>
      </div>

      {/* Quick Action Hub */}
      <div className="bg-stone-900 text-stone-100 p-5 rounded-2xl shadow-sm">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-amber-400">Operations Fast-Track</h3>
        <p className="text-xs text-stone-400 mt-0.5">Jump directly to frequent day-to-day administrative tasks</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5 mt-4">
          <button
            onClick={() => handleNav('orders')}
            className="flex flex-col items-start p-3 bg-stone-800/80 hover:bg-stone-800 rounded-xl border border-stone-700/60 transition-all text-left"
          >
            <ShoppingBag className="w-4 h-4 text-blue-400 mb-2" />
            <span className="text-xs font-semibold text-white">Process Orders</span>
            <span className="text-[11px] text-stone-400 mt-0.5">{pendingOrders.length} pending</span>
          </button>
          <button
            onClick={handleOpenProduct}
            className="flex flex-col items-start p-3 bg-stone-800/80 hover:bg-stone-800 rounded-xl border border-stone-700/60 transition-all text-left"
          >
            <Plus className="w-4 h-4 text-emerald-400 mb-2" />
            <span className="text-xs font-semibold text-white">New Product</span>
            <span className="text-[11px] text-stone-400 mt-0.5">Add to catalog</span>
          </button>
          <button
            onClick={() => handleNav('coupons')}
            className="flex flex-col items-start p-3 bg-stone-800/80 hover:bg-stone-800 rounded-xl border border-stone-700/60 transition-all text-left"
          >
            <IndianRupee className="w-4 h-4 text-amber-400 mb-2" />
            <span className="text-xs font-semibold text-white">New Coupon</span>
            <span className="text-[11px] text-stone-400 mt-0.5">Promo code</span>
          </button>
          <button
            onClick={() => handleNav('notifications')}
            className="flex flex-col items-start p-3 bg-stone-800/80 hover:bg-stone-800 rounded-xl border border-stone-700/60 transition-all text-left"
          >
            <TrendingUp className="w-4 h-4 text-pink-400 mb-2" />
            <span className="text-xs font-semibold text-white">Broadcast</span>
            <span className="text-[11px] text-stone-400 mt-0.5">Send alerts</span>
          </button>
          <button
            onClick={() => handleNav('homepage')}
            className="flex flex-col items-start p-3 bg-stone-800/80 hover:bg-stone-800 rounded-xl border border-stone-700/60 transition-all text-left"
          >
            <Package className="w-4 h-4 text-cyan-400 mb-2" />
            <span className="text-xs font-semibold text-white">Homepage</span>
            <span className="text-[11px] text-stone-400 mt-0.5">Hero & deals</span>
          </button>
          <button
            onClick={() => handleNav('reports')}
            className="flex flex-col items-start p-3 bg-stone-800/80 hover:bg-stone-800 rounded-xl border border-stone-700/60 transition-all text-left"
          >
            <RefreshCw className="w-4 h-4 text-purple-400 mb-2" />
            <span className="text-xs font-semibold text-white">Reports</span>
            <span className="text-[11px] text-stone-400 mt-0.5">CSV & charts</span>
          </button>
        </div>
      </div>

      {/* Dual Column: Recent Orders & Stock Watchlist */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders Table (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-stone-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-stone-900">Recent Customer Orders</h3>
              <p className="text-xs text-stone-500">Live order queue ready for status updates</p>
            </div>
            <button
              onClick={() => handleNav('orders')}
              className="text-xs font-semibold text-amber-700 hover:text-amber-800 inline-flex items-center gap-1 cursor-pointer"
            >
              View All ({orders.length})
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider bg-stone-50/80 border-b border-stone-200">
                <tr>
                  <th className="py-2.5 px-3">Order #</th>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3">Items</th>
                  <th className="py-2.5 px-3">Total</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-stone-400">
                      No orders placed yet.
                    </td>
                  </tr>
                ) : (
                  recentOrders.map((order) => {
                    const statusColors: Record<string, string> = {
                      PLACED: 'bg-blue-50 text-blue-700 border-blue-200',
                      'Order Placed': 'bg-blue-50 text-blue-700 border-blue-200',
                      CONFIRMED: 'bg-indigo-50 text-indigo-700 border-indigo-200',
                      Confirmed: 'bg-indigo-50 text-indigo-700 border-indigo-200',
                      PREPARING: 'bg-amber-50 text-amber-800 border-amber-200',
                      PACKED: 'bg-purple-50 text-purple-700 border-purple-200',
                      OUT_FOR_DELIVERY: 'bg-sky-50 text-sky-700 border-sky-200',
                      'Out for Delivery': 'bg-sky-50 text-sky-700 border-sky-200',
                      DELIVERED: 'bg-emerald-50 text-emerald-800 border-emerald-200',
                      Delivered: 'bg-emerald-50 text-emerald-800 border-emerald-200',
                      CANCELLED: 'bg-rose-50 text-rose-700 border-rose-200',
                      Cancelled: 'bg-rose-50 text-rose-700 border-rose-200',
                      REFUNDED: 'bg-purple-50 text-purple-800 border-purple-200',
                    };

                    return (
                      <tr key={order.id} className="hover:bg-amber-50/20 transition-colors">
                        <td className="py-3 px-3 font-bold text-stone-900">
                          #{order.orderNumber}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-semibold text-stone-900">{order.customerName}</div>
                          <div className="text-[11px] text-stone-500">{order.customerPhone}</div>
                        </td>
                        <td className="py-3 px-3 text-stone-600">
                          {order.items?.length || 0} items
                        </td>
                        <td className="py-3 px-3 font-bold text-stone-900">
                          ₹{order.total}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                              statusColors[order.status] || 'bg-stone-100 text-stone-700 border-stone-200'
                            }`}
                          >
                            {order.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => handleOpenOrder(order)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-md transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Manage
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Low Stock Watchlist (1 Col) */}
        <div className="bg-white rounded-2xl border border-stone-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-stone-900">Inventory Watchlist</h3>
              <p className="text-xs text-stone-500">Products requiring kitchen batching</p>
            </div>
            <button
              onClick={() => handleNav('products')}
              className="text-xs font-semibold text-amber-700 hover:text-amber-800 inline-flex items-center gap-1"
            >
              All Items
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {lowStockProducts.length === 0 ? (
              <div className="py-8 text-center text-stone-400 text-xs">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                All products have healthy stock levels (&gt;10 units).
              </div>
            ) : (
              lowStockProducts.slice(0, 5).map((prod) => (
                <div
                  key={prod.id}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-stone-200/70 hover:border-amber-300 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={prod.images?.[0] || 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=120&q=80'}
                      alt={prod.name}
                      className="w-10 h-10 object-cover rounded-lg border border-stone-200 shrink-0"
                    />
                    <div>
                      <h4 className="text-xs font-semibold text-stone-900 line-clamp-1">{prod.name}</h4>
                      <p className="text-[11px] text-stone-500">₹{prod.price} • {prod.weight || '500g'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold ${
                        (prod.stockQuantity ?? 0) === 0
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-900'
                      }`}
                    >
                      {prod.stockQuantity ?? 0} left
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
