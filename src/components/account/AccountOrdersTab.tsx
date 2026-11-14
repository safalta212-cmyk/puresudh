import React, { useState } from 'react';
import {
  Package,
  Search,
  Filter,
  Truck,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Star,
  ExternalLink,
} from 'lucide-react';
import { Order, Product } from '../../types';

interface AccountOrdersTabProps {
  orders: Order[];
  onSelectOrder: (order: Order) => void;
  onTrackLive: (orderNumber: string) => void;
  onNavigateToShop: () => void;
  onWriteReview?: (item: {
    productId: string;
    productName: string;
    productImage: string;
    orderId: string;
    orderNumber: string;
  }) => void;
}

export const AccountOrdersTab: React.FC<AccountOrdersTabProps> = ({
  orders,
  onSelectOrder,
  onTrackLive,
  onNavigateToShop,
  onWriteReview,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'delivered' | 'cancelled'>('all');

  // Filter orders based on search and status
  const filteredOrders = orders.filter((order) => {
    const normStatus = (order.status || '').toUpperCase();

    // Status filter
    if (statusFilter === 'active') {
      if (['DELIVERED', 'CANCELLED', 'REFUNDED'].includes(normStatus)) return false;
    } else if (statusFilter === 'delivered') {
      if (normStatus !== 'DELIVERED') return false;
    } else if (statusFilter === 'cancelled') {
      if (!['CANCELLED', 'REFUNDED'].includes(normStatus)) return false;
    }

    // Search filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      const matchNum = order.orderNumber.toLowerCase().includes(q);
      const matchItem = order.items?.some((it) => it.productName.toLowerCase().includes(q));
      return matchNum || matchItem;
    }

    return true;
  });

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Header & Controls */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-stone-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-stone-900 text-base sm:text-lg flex items-center gap-2">
            <Package className="w-5 h-5 text-amber-700" />
            Order History & Tracking
          </h3>
          <p className="text-xs text-stone-500 mt-0.5">
            Track orders live, inspect timelines, download invoices, and review delivered items.
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm ?? ''}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by order # or product..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-200 text-xs focus:ring-2 focus:ring-amber-500 bg-stone-50/50"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 text-xs font-semibold">
        {[
          { id: 'all', label: `All Orders (${orders.length})` },
          {
            id: 'active',
            label: `In Progress (${
              orders.filter((o) => !['DELIVERED', 'CANCELLED', 'REFUNDED'].includes((o.status || '').toUpperCase())).length
            })`,
          },
          {
            id: 'delivered',
            label: `Delivered (${
              orders.filter((o) => (o.status || '').toUpperCase() === 'DELIVERED').length
            })`,
          },
          {
            id: 'cancelled',
            label: `Cancelled (${
              orders.filter((o) => ['CANCELLED', 'REFUNDED'].includes((o.status || '').toUpperCase())).length
            })`,
          },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setStatusFilter(tab.id as any)}
            className={`px-3.5 py-1.5 rounded-xl transition cursor-pointer shrink-0 ${
              statusFilter === tab.id
                ? 'bg-amber-800 text-white shadow-xs'
                : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 sm:p-14 text-center border border-stone-200 space-y-3">
          <Package className="w-12 h-12 text-stone-300 mx-auto" />
          <h4 className="font-bold text-stone-900 text-base">No Orders Found</h4>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            {searchTerm
              ? `No orders matching "${searchTerm}". Try a different search term.`
              : 'You have not placed any orders matching this filter.'}
          </p>
          <button
            type="button"
            onClick={onNavigateToShop}
            className="bg-amber-800 hover:bg-amber-900 text-white font-semibold text-xs px-5 py-2.5 rounded-xl transition cursor-pointer shadow-xs"
          >
            Explore Sweets & Dairy Store
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const normStatus = (order.status || '').toUpperCase();
            const isDelivered = normStatus === 'DELIVERED';
            const isCancelled = normStatus === 'CANCELLED' || normStatus === 'REFUNDED';
            const isPreparing = normStatus === 'PREPARING';

            return (
              <div
                key={order.id}
                className="bg-white rounded-3xl border border-stone-200 p-5 sm:p-6 shadow-xs hover:border-amber-200 transition space-y-4"
              >
                {/* Order Top Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-extrabold text-stone-900 text-sm sm:text-base">
                      #{order.orderNumber}
                    </span>
                    <span
                      className={`text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full ${
                        isDelivered
                          ? 'bg-emerald-100 text-emerald-800'
                          : isCancelled
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-900'
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-stone-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(order.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                    <span>•</span>
                    <span className="font-bold text-stone-900 font-serif text-sm">
                      ₹{order.total}
                    </span>
                  </div>
                </div>

                {/* Items Preview */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {(order.items || []).slice(0, 4).map((item, i) => (
                      <div key={i} className="flex items-center gap-2 shrink-0 bg-stone-50 p-1.5 rounded-xl border border-stone-100">
                        <img
                          src={item.productImage || '/images/homemade_thekua_special.jpg'}
                          alt={item.productName}
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                        <div className="text-[11px] pr-2">
                          <p className="font-semibold text-stone-800 truncate max-w-[130px]">{item.productName}</p>
                          <p className="text-stone-500">Qty: {item.quantity}</p>
                        </div>
                      </div>
                    ))}
                    {(order.items?.length || 0) > 4 && (
                      <span className="text-xs font-semibold text-stone-500 bg-stone-100 px-2.5 py-1.5 rounded-xl shrink-0">
                        +{order.items!.length - 4} more
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => onSelectOrder(order)}
                      className="bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1 cursor-pointer"
                    >
                      <span>View Details</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onTrackLive(order.orderNumber)}
                      className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1 shadow-xs cursor-pointer"
                    >
                      <Truck className="w-3.5 h-3.5" />
                      Track Live
                    </button>

                    {isDelivered && onWriteReview && order.items && order.items.length > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          onWriteReview({
                            productId: order.items[0].productId,
                            productName: order.items[0].productName,
                            productImage: order.items[0].productImage,
                            orderId: order.id,
                            orderNumber: order.orderNumber,
                          })
                        }
                        className="bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs px-3 py-2 rounded-xl transition flex items-center gap-1 cursor-pointer"
                      >
                        <Star className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
                        Review
                      </button>
                    )}
                  </div>
                </div>

                {/* Delivery preview destination */}
                <div className="pt-2 text-[11px] text-stone-500 flex items-center justify-between border-t border-stone-50">
                  <span className="truncate max-w-sm">
                    📍 Deliver to: {order.deliveryAddress?.addressLine || order.deliveryAddress?.address || 'Patna'} ({order.deliveryAddress?.city || 'Patna'} - {order.deliveryAreaPincode || order.deliveryAddress?.pincode})
                  </span>
                  <span className="font-semibold text-stone-600 shrink-0">
                    Payment: {order.paymentMethod} ({order.paymentStatus})
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
