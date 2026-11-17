import React, { useState, useMemo, useEffect } from 'react';
import {
  ShoppingBag,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  Clock,
  Truck,
  Package,
  XCircle,
  AlertCircle,
  RefreshCw,
  Printer,
  ChevronLeft,
  ChevronRight,
  User,
  MapPin,
  CreditCard,
  RotateCcw,
  X,
} from 'lucide-react';
import { Order, OrderStatus, normalizeOrderStatus } from '../../../types';
import { notificationService } from '../../../services/notifications/notificationService';

interface AdminOrdersTabProps {
  orders: Order[];
  onUpdateOrderStatus: (orderId: string, status: OrderStatus, note?: string) => Promise<void>;
  onProcessRefund: (orderId: string, refundRef: string, reason: string) => Promise<void>;
  onProcessCancel?: (orderId: string, reason: string) => Promise<void>;
  initialSelectedOrder?: Order | null;
  initialSearchQuery?: string;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const AdminOrdersTab: React.FC<AdminOrdersTabProps> = ({
  orders,
  onUpdateOrderStatus,
  onProcessRefund,
  onProcessCancel,
  initialSelectedOrder,
  initialSearchQuery,
  showToast,
}) => {
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery || '');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Selected Order for drawer/modal
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(initialSelectedOrder || null);

  useEffect(() => {
    if (initialSelectedOrder) {
      setSelectedOrder(initialSelectedOrder);
    }
  }, [initialSelectedOrder]);

  useEffect(() => {
    if (initialSearchQuery !== undefined && initialSearchQuery !== '') {
      setSearchQuery(initialSearchQuery);
      setCurrentPage(1);
    }
  }, [initialSearchQuery]);

  // Keep selectedOrder synchronized if orders list updates
  useEffect(() => {
    if (selectedOrder) {
      const updated = orders.find((o) => o.id === selectedOrder.id);
      if (updated && updated !== selectedOrder) {
        setSelectedOrder(updated);
      }
    }
  }, [orders, selectedOrder]);

  // Status progression action state
  const [selectedNewStatus, setSelectedNewStatus] = useState<OrderStatus | ''>('');
  const [statusNote, setStatusNote] = useState('');

  // Cancellation prompt
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('Customer requested order cancellation');

  // Refund prompt
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [refundRefId, setRefundRefId] = useState('');
  const [refundReason, setRefundReason] = useState('Order cancelled / return processed');

  const allStatuses: OrderStatus[] = [
    'PLACED',
    'CONFIRMED',
    'PREPARING',
    'PACKED',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
    'CANCELLED',
    'REFUNDED',
  ];

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

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        o.orderNumber?.toLowerCase().includes(q) ||
        o.customerName?.toLowerCase().includes(q) ||
        o.customerPhone?.includes(q) ||
        o.customerEmail?.toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === 'all' ||
        normalizeOrderStatus(o.status) === normalizeOrderStatus(statusFilter as OrderStatus);

      const pm = (o.paymentMethod || '').toLowerCase();
      const ps = (o.paymentStatus || '').toLowerCase();
      const matchesPayment =
        paymentFilter === 'all' ||
        (paymentFilter === 'UPI' && (pm.includes('upi') || pm.includes('phonepe') || pm.includes('gpay') || pm.includes('paytm'))) ||
        (paymentFilter === 'COD' && (pm.includes('cash') || pm === 'cod')) ||
        (paymentFilter === 'Paid' && (ps === 'paid' || ps === 'success')) ||
        (paymentFilter === 'Pending' && ps === 'pending') ||
        (paymentFilter === 'Refunded' && ps === 'refunded');

      return matchesSearch && matchesStatus && matchesPayment;
    });
  }, [orders, searchQuery, statusFilter, paymentFilter]);

  const totalPages = Math.ceil(filteredOrders.length / pageSize) || 1;
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, currentPage]);

  const handleApplyStatusChange = async () => {
    if (!selectedOrder || !selectedNewStatus) return;
    await onUpdateOrderStatus(selectedOrder.id, selectedNewStatus, statusNote);

    // Dispatch order status update notification via configured channels
    notificationService.sendOrderStatusUpdate(selectedOrder, selectedNewStatus, statusNote).catch((e) => {
      console.warn('Status update notification failed:', e);
    });

    showToast(`Order #${selectedOrder.orderNumber} status changed to ${selectedNewStatus}`, 'success');

    // Update locally selected order
    setSelectedOrder({
      ...selectedOrder,
      status: selectedNewStatus,
      statusHistory: [
        ...(selectedOrder.statusHistory || []),
        {
          status: selectedNewStatus,
          timestamp: new Date().toISOString(),
          note: statusNote || `Status changed to ${selectedNewStatus}`,
        },
      ],
    });
    setSelectedNewStatus('');
    setStatusNote('');
  };

  const handleConfirmCancel = async () => {
    if (!selectedOrder) return;
    if (typeof onProcessCancel === 'function') {
      await onProcessCancel(selectedOrder.id, cancelReason);
    } else {
      await onUpdateOrderStatus(selectedOrder.id, 'CANCELLED', `Cancelled: ${cancelReason}`);
    }

    // Dispatch order cancellation notification
    notificationService.sendOrderCancellation(selectedOrder, cancelReason).catch((e) => {
      console.warn('Order cancellation notification failed:', e);
    });

    showToast(`Order #${selectedOrder.orderNumber} cancelled`, 'info');
    setIsCancelModalOpen(false);
    setSelectedOrder({
      ...selectedOrder,
      status: 'CANCELLED',
      statusHistory: [
        ...(selectedOrder.statusHistory || []),
        {
          status: 'CANCELLED',
          timestamp: new Date().toISOString(),
          note: `Cancelled: ${cancelReason}`,
        },
      ],
    });
  };

  const handleConfirmRefund = async () => {
    if (!selectedOrder) return;
    const ref = refundRefId.trim() || `REF-${Date.now().toString(36).toUpperCase()}`;
    await onProcessRefund(selectedOrder.id, ref, refundReason);

    // Dispatch order refund notification
    notificationService.sendOrderRefund(selectedOrder, selectedOrder.total, ref).catch((e) => {
      console.warn('Order refund notification failed:', e);
    });

    showToast(`Refund processed for Order #${selectedOrder.orderNumber}`, 'success');
    setIsRefundModalOpen(false);
    setSelectedOrder({
      ...selectedOrder,
      status: 'REFUNDED',
      paymentStatus: 'Refunded',
      statusHistory: [
        ...(selectedOrder.statusHistory || []),
        {
          status: 'REFUNDED',
          timestamp: new Date().toISOString(),
          note: `Refund Processed (Ref: ${ref}) - ${refundReason}`,
        },
      ],
    });
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
            Orders Lifecycle Desk
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-semibold border border-amber-200">
              {filteredOrders.length} orders
            </span>
          </h2>
          <p className="text-sm text-stone-500 mt-0.5">
            Real-time queue: Kitchen dispatch, delivery status tracking, cancellations, and refunds
          </p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-stone-200/80 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-stone-400" />
            <input
              type="text"
              placeholder="Search #PS100001, customer, phone..."
              value={searchQuery ?? ''}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 text-xs bg-stone-50 rounded-lg border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter ?? 'all'}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs bg-stone-50 rounded-lg border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 text-stone-700"
            >
              <option value="all">All Statuses ({orders.length})</option>
              <option value="PLACED">Placed</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="PREPARING">Preparing</option>
              <option value="PACKED">Packed</option>
              <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
              <option value="DELIVERED">Delivered</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="REFUNDED">Refunded</option>
            </select>
          </div>

          {/* Payment Method Filter */}
          <div>
            <select
              value={paymentFilter ?? 'all'}
              onChange={(e) => {
                setPaymentFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs bg-stone-50 rounded-lg border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 text-stone-700"
            >
              <option value="all">All Payment Methods & Statuses</option>
              <option value="UPI">UPI / PhonePe</option>
              <option value="COD">Cash on Delivery</option>
              <option value="Paid">Payment Status: Paid</option>
              <option value="Pending">Payment Status: Pending</option>
              <option value="Refunded">Payment Status: Refunded</option>
            </select>
          </div>
        </div>
      </div>

      {/* Orders Table & Mobile Cards */}
      <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden">
        {/* Mobile View: Cards (< md) */}
        <div className="block md:hidden divide-y divide-stone-100">
          {paginatedOrders.length === 0 ? (
            <div className="py-10 text-center text-stone-400 p-4">
              <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-40 text-stone-400" />
              No orders found matching your criteria.
            </div>
          ) : (
            paginatedOrders.map((order) => (
              <div key={order.id} className="p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-stone-900 text-sm">#{order.orderNumber}</span>
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      statusColors[order.status] || 'bg-stone-100 text-stone-700 border-stone-200'
                    }`}
                  >
                    {order.status}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-stone-600">
                  <div className="font-medium text-stone-800">{order.customerName}</div>
                  <div className="text-stone-400 text-[11px]">
                    {new Date(order.createdAt).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs pt-1 border-t border-stone-100">
                  <div>
                    <span className="text-stone-500 font-medium">{order.items?.length || 0} items</span>
                    <span className="mx-1 text-stone-300">•</span>
                    <span className="font-bold text-stone-900 text-sm">₹{order.total}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedOrder(order);
                      setSelectedNewStatus('');
                      setStatusNote('');
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors border border-amber-200 touch-manipulation min-h-[36px]"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Manage
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop View: Table (>= md) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider bg-stone-50/80 border-b border-stone-200">
              <tr>
                <th className="py-3 px-4">Order #</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Customer</th>
                <th className="py-3 px-3">Items</th>
                <th className="py-3 px-3">Total</th>
                <th className="py-3 px-3">Payment</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {paginatedOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-stone-400">
                    <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-40 text-stone-400" />
                    No orders found matching your criteria.
                  </td>
                </tr>
              ) : (
                paginatedOrders.map((order) => {
                  return (
                    <tr key={order.id} className="hover:bg-amber-50/20 transition-colors">
                      {/* Order # */}
                      <td className="py-3 px-4">
                        <span className="font-bold text-stone-900">#{order.orderNumber}</span>
                      </td>

                      {/* Date */}
                      <td className="py-3 px-3 text-stone-500">
                        {new Date(order.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>

                      {/* Customer */}
                      <td className="py-3 px-3">
                        <div className="font-bold text-stone-900">{order.customerName}</div>
                        <div className="text-[11px] text-stone-500">{order.customerPhone}</div>
                      </td>

                      {/* Items */}
                      <td className="py-3 px-3">
                        <span className="font-semibold text-stone-800">
                          {order.items?.length || 0} items
                        </span>
                        <div className="text-[11px] text-stone-400 line-clamp-1">
                          {order.items?.[0]?.productName}
                        </div>
                      </td>

                      {/* Total */}
                      <td className="py-3 px-3 font-bold text-stone-900 text-sm">
                        ₹{order.total}
                      </td>

                      {/* Payment */}
                      <td className="py-3 px-3">
                        <div className="font-semibold text-stone-800">{order.paymentMethod || 'UPI'}</div>
                        <span
                          className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-bold ${
                            order.paymentStatus === 'Paid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : order.paymentStatus === 'Refunded'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {order.paymentStatus || 'Pending'}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                            statusColors[order.status] || 'bg-stone-100 text-stone-700 border-stone-200'
                          }`}
                        >
                          {order.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedOrder(order);
                            setSelectedNewStatus('');
                            setStatusNote('');
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors border border-amber-200"
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

        {/* Pagination Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-stone-50/80 border-t border-stone-200 text-xs text-stone-500">
          <div>
            Showing{' '}
            <span className="font-semibold text-stone-800">
              {filteredOrders.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
            </span>{' '}
            to{' '}
            <span className="font-semibold text-stone-800">
              {Math.min(currentPage * pageSize, filteredOrders.length)}
            </span>{' '}
            of <span className="font-semibold text-stone-800">{filteredOrders.length}</span> orders
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="p-1.5 rounded-lg border border-stone-200 bg-white text-stone-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-stone-100"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2.5 py-1 text-xs font-semibold text-stone-800">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="p-1.5 rounded-lg border border-stone-200 bg-white text-stone-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-stone-100"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Order Details Drawer / Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-4 sm:p-6 border border-stone-200 shadow-2xl space-y-5 my-auto max-h-[92vh] overflow-y-auto text-xs">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-stone-100 pb-3 gap-2">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base sm:text-lg font-bold text-stone-900">
                    Order #{selectedOrder.orderNumber}
                  </h3>
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                      statusColors[selectedOrder.status] || 'bg-stone-100 text-stone-700'
                    }`}
                  >
                    {selectedOrder.status}
                  </span>
                </div>
                <p className="text-xs text-stone-500 mt-0.5">
                  Placed on {new Date(selectedOrder.createdAt).toLocaleString('en-IN')}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={handlePrintReceipt}
                  className="p-2 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg border border-stone-200 touch-manipulation min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
                  title="Print invoice receipt"
                >
                  <Printer className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg border border-stone-200 touch-manipulation min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
                  aria-label="Close details"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick Status Updater */}
            <div className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-200/80 space-y-2.5">
              <span className="text-xs font-bold text-amber-900 block">
                Update Order Lifecycle Status:
              </span>
              <div className="flex flex-col sm:flex-row gap-2">
                <select
                  value={selectedNewStatus ?? ''}
                  onChange={(e) => setSelectedNewStatus(e.target.value as OrderStatus)}
                  className="flex-1 px-3 py-1.5 text-xs bg-white rounded-lg border border-amber-300 font-semibold text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                >
                  <option value="">-- Choose New Status --</option>
                  {allStatuses.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Optional audit log note..."
                  value={statusNote ?? ''}
                  onChange={(e) => setStatusNote(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs bg-white rounded-lg border border-amber-300 focus:outline-none"
                />
                <button
                  onClick={handleApplyStatusChange}
                  disabled={!selectedNewStatus}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-xs"
                >
                  Update
                </button>
              </div>
            </div>

            {/* Customer & Address Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200/80 space-y-1">
                <div className="font-bold text-stone-900 flex items-center gap-1.5 mb-1.5">
                  <User className="w-3.5 h-3.5 text-amber-700" />
                  Customer Information
                </div>
                <div className="text-stone-800 font-semibold">{selectedOrder.customerName}</div>
                <div className="text-stone-600">{selectedOrder.customerPhone}</div>
                {selectedOrder.customerEmail && (
                  <div className="text-stone-500">{selectedOrder.customerEmail}</div>
                )}
              </div>

              <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200/80 space-y-1">
                <div className="font-bold text-stone-900 flex items-center gap-1.5 mb-1.5">
                  <MapPin className="w-3.5 h-3.5 text-amber-700" />
                  Delivery Destination
                </div>
                <div className="text-stone-800 font-semibold">
                  {selectedOrder.deliveryAddress?.name} ({selectedOrder.deliveryAddress?.phone})
                </div>
                <div className="text-stone-600">{selectedOrder.deliveryAddress?.addressLine}</div>
                {selectedOrder.deliveryAddress?.landmark && (
                  <div className="text-stone-500">
                    Landmark: {selectedOrder.deliveryAddress.landmark}
                  </div>
                )}
                <div className="text-amber-900 font-bold">
                  {selectedOrder.deliveryAddress?.city}, {selectedOrder.deliveryAddress?.pincode}
                </div>
                <div className="text-[11px] text-stone-500">
                  ETA: {selectedOrder.estimatedDeliveryTime || '30-40 mins'}
                </div>
              </div>
            </div>

            {/* Products List */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                Order Items ({selectedOrder.items?.length || 0})
              </h4>
              <div className="border border-stone-200 rounded-xl divide-y divide-stone-100 overflow-hidden">
                {selectedOrder.items?.map((item, idx) => (
                  <div key={idx} className="p-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <img
                        src={
                          item.productImage ||
                          'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=120&q=80'
                        }
                        alt={item.productName}
                        className="w-10 h-10 rounded-lg object-cover border border-stone-200"
                      />
                      <div>
                        <div className="font-bold text-stone-900">{item.productName}</div>
                        <div className="text-stone-500 text-[11px]">
                          ₹{item.price} × {item.quantity} ({item.weight || '500g'})
                        </div>
                      </div>
                    </div>
                    <div className="font-bold text-stone-900">₹{item.total}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial Summary */}
            <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 text-xs space-y-1.5">
              <div className="flex justify-between text-stone-600">
                <span>Subtotal</span>
                <span>₹{selectedOrder.subtotal}</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Delivery Charge</span>
                <span>
                  {selectedOrder.deliveryCharge === 0 ? 'FREE' : `₹${selectedOrder.deliveryCharge}`}
                </span>
              </div>
              {selectedOrder.discount ? (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Discount ({selectedOrder.couponCode || 'PROMO'})</span>
                  <span>-₹{selectedOrder.discount}</span>
                </div>
              ) : null}
              <div className="flex justify-between text-sm font-black text-stone-900 pt-2 border-t border-stone-200">
                <span>Grand Total</span>
                <span>₹{selectedOrder.total}</span>
              </div>
              <div className="flex justify-between text-[11px] text-stone-500 pt-1">
                <span>Payment Method</span>
                <span className="font-semibold text-stone-800">
                  {selectedOrder.paymentMethod} • {selectedOrder.paymentStatus}
                </span>
              </div>
            </div>

            {/* Status History Timeline */}
            {selectedOrder.statusHistory && selectedOrder.statusHistory.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-700" />
                  Audit Timeline ({selectedOrder.statusHistory.length})
                </h4>
                <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 space-y-2 max-h-40 overflow-y-auto">
                  {selectedOrder.statusHistory.map((entry, idx) => (
                    <div key={idx} className="flex items-start justify-between gap-3 text-[11px] border-b border-stone-200/70 last:border-b-0 pb-1.5 last:pb-0">
                      <div>
                        <span className="font-bold text-stone-900">{entry.status}</span>
                        {entry.note && <p className="text-stone-600 mt-0.5">{entry.note}</p>}
                      </div>
                      <span className="text-stone-400 shrink-0 font-mono">
                        {new Date(entry.timestamp).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Special Actions: Cancellation & Refund */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-stone-100">
              <div className="flex items-center gap-2">
                {normalizeOrderStatus(selectedOrder.status) !== 'CANCELLED' &&
                  normalizeOrderStatus(selectedOrder.status) !== 'REFUNDED' && (
                  <button
                    onClick={() => setIsCancelModalOpen(true)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Cancel Order
                  </button>
                )}

                {selectedOrder.paymentStatus !== 'Refunded' &&
                  normalizeOrderStatus(selectedOrder.status) !== 'REFUNDED' && (
                  <button
                    onClick={() => {
                      setRefundRefId(`REF-${selectedOrder.orderNumber}`);
                      setIsRefundModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Process Refund
                  </button>
                )}
              </div>

              <button
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-1.5 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancellation Modal */}
      {isCancelModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 border border-stone-200 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-stone-900 flex items-center gap-2 text-rose-700">
              <AlertCircle className="w-5 h-5" />
              Cancel Order #{selectedOrder.orderNumber}
            </h3>
            <p className="text-xs text-stone-600">
              Are you sure you want to mark this order as cancelled? This will stop kitchen batching
              and dispatching.
            </p>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Cancellation Reason:
              </label>
              <textarea
                rows={2}
                value={cancelReason ?? ''}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsCancelModalOpen(false)}
                className="px-3.5 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-lg"
              >
                Abort
              </button>
              <button
                onClick={handleConfirmCancel}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Refund-Ready Workflow Modal */}
      {isRefundModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 border border-stone-200 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-purple-900 flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-purple-700" />
              Process Refund: ₹{selectedOrder.total}
            </h3>
            <p className="text-xs text-stone-600">
              Record refund reference for customer{' '}
              <span className="font-bold text-stone-900">{selectedOrder.customerName}</span>.
            </p>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Bank / Gateway Refund Reference ID:
              </label>
              <input
                type="text"
                placeholder="e.g. rfnd_1029384729"
                value={refundRefId ?? ''}
                onChange={(e) => setRefundRefId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg font-mono focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Refund Reason / Audit Note:
              </label>
              <input
                type="text"
                value={refundReason ?? ''}
                onChange={(e) => setRefundReason(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsRefundModalOpen(false)}
                className="px-3.5 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRefund}
                className="px-4 py-2 text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 rounded-lg shadow-xs"
              >
                Mark as Refunded
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
