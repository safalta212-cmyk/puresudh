import React, { useState } from 'react';
import {
  ClipboardList,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  ArrowLeft,
  UserCheck,
  ShieldCheck,
  AlertCircle,
  MapPin,
  Phone,
  RefreshCw,
} from 'lucide-react';
import { Order, OrderStatus } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { updateOrderStatus } from '../../firebase/services';
import { formatCurrency, formatDate } from '../../utilities';

interface StaffDashboardProps {
  orders: Order[];
  onRefreshData?: () => void;
  onBackToStore: () => void;
}

export const StaffDashboard: React.FC<StaffDashboardProps> = ({
  orders,
  onRefreshData,
  onBackToStore,
}) => {
  const { user, role, logout } = useAuth();
  const { showToast } = useToast();

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  const filteredOrders = orders.filter((o) => {
    const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
    const pincode = o.deliveryAddress?.pincode || '';
    const matchesQuery =
      searchQuery === '' ||
      o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.orderNumber && o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (o.customerName && o.customerName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      pincode.includes(searchQuery);
    return matchesStatus && matchesQuery;
  });

  const handleAdvanceStatus = async (orderId: string, currentStatus: OrderStatus) => {
    let nextStatus: OrderStatus = 'Confirmed';
    if (currentStatus === 'Order Placed') nextStatus = 'Confirmed';
    else if (currentStatus === 'Confirmed') nextStatus = 'Preparing';
    else if (currentStatus === 'Preparing') nextStatus = 'Packed';
    else if (currentStatus === 'Packed') nextStatus = 'Out for Delivery';
    else if (currentStatus === 'Out for Delivery') nextStatus = 'Delivered';
    else return;

    setUpdatingOrderId(orderId);
    try {
      await updateOrderStatus(orderId, nextStatus);
      showToast(`Order #${orderId.slice(-6).toUpperCase()} updated to ${nextStatus}`, 'success');
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      showToast('Failed to update order status: ' + err.message, 'error');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const getNextActionLabel = (status: OrderStatus): string | null => {
    switch (status) {
      case 'Order Placed':
        return 'Confirm Order';
      case 'Confirmed':
        return 'Start Preparation';
      case 'Preparing':
        return 'Mark Packed';
      case 'Packed':
        return 'Dispatch (Out for Delivery)';
      case 'Out for Delivery':
        return 'Mark Delivered';
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-stone-900 font-sans pb-16" id="staff-operations-portal">
      {/* Top Bar */}
      <header className="bg-stone-900 text-white border-b border-stone-800 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToStore}
              className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition"
              title="Return to Storefront"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-600 flex items-center justify-center text-white font-bold shadow-xs">
                PS
              </div>
              <div>
                <h1 className="font-bold text-sm tracking-wide flex items-center gap-2">
                  PURE SUDH Operations Desk
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-900 text-emerald-300 border border-emerald-700">
                    Staff Portal
                  </span>
                </h1>
                <p className="text-[11px] text-stone-400">
                  Kitchen Packing, Dispatch & Order Fulfillment Center
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-stone-800 border border-stone-700 text-xs">
              <UserCheck className="w-4 h-4 text-emerald-400" />
              <div className="text-left">
                <span className="block font-medium text-stone-200">{user?.displayName || 'Staff Operator'}</span>
                <span className="block text-[10px] text-stone-400 uppercase font-mono">{role}</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/80 border border-emerald-800/80 text-[11px] text-emerald-300 font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>RBAC Verified</span>
            </div>

            <button
              onClick={logout}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-rose-900/60 hover:text-rose-200 text-stone-300 transition"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
            <div className="flex items-center justify-between text-stone-500 text-xs mb-1">
              <span>Total Orders</span>
              <ClipboardList className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-2xl font-bold text-stone-900">{orders.length}</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
            <div className="flex items-center justify-between text-stone-500 text-xs mb-1">
              <span>Pending / Preparing</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-2xl font-bold text-amber-600">
              {orders.filter((o) => ['Order Placed', 'Confirmed', 'Preparing'].includes(o.status)).length}
            </p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
            <div className="flex items-center justify-between text-stone-500 text-xs mb-1">
              <span>Packed & Dispatching</span>
              <Package className="w-4 h-4 text-sky-600" />
            </div>
            <p className="text-2xl font-bold text-sky-700">
              {orders.filter((o) => ['Packed', 'Out for Delivery'].includes(o.status)).length}
            </p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
            <div className="flex items-center justify-between text-stone-500 text-xs mb-1">
              <span>Delivered Today</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-bold text-emerald-700">
              {orders.filter((o) => o.status === 'Delivered').length}
            </p>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-1 min-w-[240px]">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by Order ID, Customer Name, Pincode..."
                value={searchQuery ?? ''}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-stone-200 text-xs focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-stone-400" />
            {(['all', 'Order Placed', 'Confirmed', 'Preparing', 'Packed', 'Out for Delivery', 'Delivered'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`text-xs px-3 py-1.5 rounded-xl font-medium transition ${
                  statusFilter === st
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {st === 'all' ? 'All Orders' : st}
              </button>
            ))}

            {onRefreshData && (
              <button
                onClick={onRefreshData}
                className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 transition"
                title="Refresh Orders"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Orders Queue Table */}
        <div className="bg-white rounded-3xl border border-stone-200 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
            <h2 className="font-bold text-sm text-stone-900 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-amber-600" />
              Fulfillment Work Queue ({filteredOrders.length})
            </h2>
            <span className="text-xs text-stone-500">
              Staff permissions enabled: Status Progression & Packing Slips
            </span>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="p-12 text-center text-stone-500 text-xs">
              No orders found matching the current criteria.
            </div>
          ) : (
            <div className="divide-y divide-stone-100">
              {filteredOrders.map((order) => {
                const nextAction = getNextActionLabel(order.status);
                return (
                  <div key={order.id} className="p-5 hover:bg-stone-50/60 transition space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-xs bg-stone-100 px-2.5 py-1 rounded-lg text-stone-800">
                          #{order.id.slice(-6).toUpperCase()}
                        </span>
                        <div>
                          <p className="font-bold text-xs text-stone-900">{order.customerName}</p>
                          <p className="text-[11px] text-stone-500 flex items-center gap-1.5 mt-0.5">
                            <Clock className="w-3 h-3" />
                            {formatDate(order.createdAt)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span
                          className={`text-[11px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider ${
                            order.status === 'Delivered'
                              ? 'bg-emerald-100 text-emerald-800'
                              : order.status === 'Out for Delivery'
                              ? 'bg-sky-100 text-sky-800'
                              : order.status === 'Packed'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-stone-100 text-stone-700'
                          }`}
                        >
                          {order.status}
                        </span>

                        {nextAction && (
                          <button
                            disabled={updatingOrderId === order.id}
                            onClick={() => handleAdvanceStatus(order.id, order.status)}
                            className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-semibold px-3 py-1.5 rounded-xl text-xs transition shadow-xs"
                          >
                            {updatingOrderId === order.id ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Truck className="w-3.5 h-3.5" />
                            )}
                            {nextAction}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Order Items & Address */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-xs">
                      <div className="bg-stone-50/80 p-3 rounded-xl border border-stone-200/80 space-y-1">
                        <p className="font-semibold text-stone-700 text-[11px] uppercase tracking-wider">
                          Order Items ({order.items.length})
                        </p>
                        <div className="space-y-1">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-stone-700 text-xs">
                              <span>
                                {item.quantity}x {item.productName}
                              </span>
                              <span className="font-mono font-medium">{formatCurrency(item.total)}</span>
                            </div>
                          ))}
                        </div>
                        <div className="border-t border-stone-200 pt-1 flex justify-between font-bold text-stone-900 mt-1">
                          <span>Total Amount</span>
                          <span>{formatCurrency(order.total)}</span>
                        </div>
                      </div>

                      <div className="bg-stone-50/80 p-3 rounded-xl border border-stone-200/80 space-y-1 text-stone-700">
                        <p className="font-semibold text-stone-700 text-[11px] uppercase tracking-wider flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-amber-600" />
                          Delivery Address
                        </p>
                        <p className="leading-snug">
                          {order.deliveryAddress?.addressLine}
                          {order.deliveryAddress?.landmark && `, near ${order.deliveryAddress.landmark}`}
                        </p>
                        <p className="font-mono text-stone-600">
                          {order.deliveryAddress?.city} - {order.deliveryAddress?.pincode}
                        </p>
                        <p className="flex items-center gap-1 text-stone-600 pt-0.5">
                          <Phone className="w-3 h-3" />
                          +91 {order.customerPhone}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
