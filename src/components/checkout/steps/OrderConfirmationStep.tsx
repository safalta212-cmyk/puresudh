import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  MapPin,
  CreditCard,
  Printer,
  ShoppingBag,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  Phone,
  Truck,
  FileText,
  AlertCircle,
  Store,
  Layers,
} from 'lucide-react';
import { Order, OrderStatus } from '../../../types';
import { CancelOrderModal } from '../CancelOrderModal';

interface OrderConfirmationStepProps {
  order: Order;
  onTrackOrder: (orderId: string) => void;
  onBackToShopping: () => void;
  onOrderUpdated?: (order: Order) => void;
}

export const OrderConfirmationStep: React.FC<OrderConfirmationStepProps> = ({
  order: initialOrder,
  onTrackOrder,
  onBackToShopping,
  onOrderUpdated,
}) => {
  const [order, setOrder] = useState<Order>(initialOrder);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  const isPaid = order.paymentStatus === 'Paid';
  const isCod = order.paymentMethod === 'Cash on Delivery' || order.paymentMethod === 'COD';
  const isCancelled = order.status === 'CANCELLED' || order.status === 'REFUNDED';

  const handlePrint = () => {
    window.print();
  };

  const handleOrderCancelled = (updatedOrder: Order) => {
    setOrder(updatedOrder);
    onOrderUpdated?.(updatedOrder);
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6">
      {/* Success Hero Header */}
      <div className="text-center mb-8 animate-in fade-in zoom-in-95 duration-300">
        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner ring-8 ring-emerald-50">
          <CheckCircle2 className="w-10 h-10 sm:w-12 sm:h-12" />
        </div>
        <div className="inline-flex items-center gap-1.5 bg-amber-100/70 text-amber-900 px-3 py-1 rounded-full text-xs font-bold mb-2">
          <Sparkles className="w-3.5 h-3.5 text-amber-700" />
          <span>Pure Food • Pure Quality • Pure Trust</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
          {isCancelled ? 'Order Updated' : 'Thank You! Order Confirmed'}
        </h1>
        <p className="text-sm text-stone-600 mt-1 max-w-md mx-auto">
          We have received your order and our chefs are handcrafting your sweets and snacks with fresh desi ghee.
        </p>

        {/* Order Number & Status Pills */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <div className="bg-stone-900 text-amber-400 font-mono text-base sm:text-lg font-bold px-4 py-1.5 rounded-xl shadow-xs">
            Order #{order.orderNumber}
          </div>

          <div
            className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-2xs ${
              isCancelled
                ? 'bg-rose-100 text-rose-800'
                : 'bg-emerald-100 text-emerald-800'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
            Status: {order.status}
          </div>

          <div
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 ${
              isPaid
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-amber-50 text-amber-800 border border-amber-200'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            Payment: {order.paymentStatus} ({order.paymentMethod})
          </div>
        </div>
      </div>

      {/* Primary Order Information Card */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden mb-6">
        {/* Banner with ETA & Pincode */}
        <div className="bg-gradient-to-r from-amber-50 via-orange-50/50 to-stone-50 p-4 sm:p-5 border-b border-amber-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-700 text-white flex items-center justify-center shadow-sm">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-amber-900 uppercase tracking-wider">
                Estimated Doorstep Delivery
              </p>
              <h4 className="text-base font-extrabold text-stone-900 flex items-center gap-2">
                {order.estimatedDeliveryTime || '25-35 mins'}
                <span className="text-xs font-normal text-stone-500">
                  • Pincode {order.deliveryAreaPincode}
                </span>
              </h4>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              type="button"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-700 bg-white border border-stone-200 hover:bg-stone-50 px-3 py-2 rounded-xl shadow-2xs transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-stone-500" />
              <span>Print Invoice</span>
            </button>
            <button
              onClick={() => onTrackOrder(order.orderNumber)}
              type="button"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 px-4 py-2 rounded-xl shadow-sm transition-colors cursor-pointer"
            >
              <span>Live Tracking</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Vendor Orders Breakdown (if multi-vendor) */}
        {order.vendorOrders && order.vendorOrders.length > 0 && (
          <div className="p-4 sm:p-6 border-b border-stone-100 bg-amber-50/30">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900 mb-3 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-amber-700" />
              Vendor Packages & Preparation ({order.vendorOrders.length} Vendors)
            </h3>
            <div className="space-y-3">
              {order.vendorOrders.map((vo) => (
                <div
                  key={vo.id || vo.vendorOrderId}
                  className="bg-white rounded-xl border border-stone-200 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Store className="w-3.5 h-3.5 text-stone-500" />
                      <span className="font-bold text-xs text-stone-900">{vo.vendorName}</span>
                      <span className="text-[10px] font-mono text-stone-400">
                        ({vo.vendorOrderNumber || vo.id})
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-500">
                      {vo.items?.length || 0} items • Subtotal: ₹{vo.subtotal} • Delivery: ₹{vo.deliveryFee}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-stone-600 bg-stone-100 px-2 py-0.5 rounded-md">
                      <Clock className="w-3 h-3 text-stone-500" />
                      ETA: {vo.estimatedDeliveryTime || '25-35 mins'}
                    </span>
                    <span
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded-md ${
                        vo.status === 'CANCELLED'
                          ? 'bg-rose-100 text-rose-800'
                          : vo.status === 'DELIVERED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {vo.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Order Items List */}
        <div className="p-4 sm:p-6 border-b border-stone-100">
          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-3 flex items-center gap-1.5">
            <ShoppingBag className="w-3.5 h-3.5" />
            Ordered Items ({order.items?.length || 0})
          </h3>

          <div className="divide-y divide-stone-100">
            {order.items?.map((item, idx) => (
              <div key={idx} className="py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-stone-100 border border-stone-200 overflow-hidden shrink-0">
                    <img
                      src={item.productImage || 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=200&q=80'}
                      alt={item.productName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-stone-900 leading-snug">
                      {item.productName}
                    </h4>
                    <p className="text-xs text-stone-500">
                      {item.vendorName ? `${item.vendorName} • ` : ''}
                      {item.weight} • Qty: <span className="font-semibold text-stone-800">{item.quantity}</span>
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-extrabold text-stone-900">
                    ₹{item.total || item.price * item.quantity}
                  </p>
                  <p className="text-[11px] text-stone-400">
                    ₹{item.price} each
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Delivery & Payment Grid */}
        <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-stone-50/50 border-b border-stone-100">
          {/* Delivery Address */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-stone-600" />
              Delivery Doorstep Address
            </h4>
            <div className="bg-white p-3.5 rounded-xl border border-stone-200 text-xs space-y-1">
              <p className="font-bold text-stone-900">{order.customerName}</p>
              <p className="text-stone-700">{order.deliveryAddress?.addressLine}</p>
              {order.deliveryAddress?.landmark && (
                <p className="text-stone-500 text-[11px]">Landmark: {order.deliveryAddress.landmark}</p>
              )}
              <p className="text-stone-700">
                {order.deliveryAddress?.city}, {order.deliveryAddress?.state} - {order.deliveryAddress?.pincode}
              </p>
              <p className="text-stone-500 pt-1 flex items-center gap-1">
                <Phone className="w-3 h-3" />
                {order.customerPhone}
              </p>
            </div>
          </div>

          {/* Payment & Bill Summary */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-stone-600" />
              Payment & Bill Breakdown
            </h4>
            <div className="bg-white p-3.5 rounded-xl border border-stone-200 text-xs space-y-2">
              <div className="flex justify-between text-stone-600">
                <span>Items Subtotal:</span>
                <span className="font-semibold text-stone-900">₹{order.subtotal}</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Delivery Charge:</span>
                <span>
                  {order.deliveryCharge === 0 ? (
                    <span className="text-emerald-700 font-bold">FREE</span>
                  ) : (
                    `₹${order.deliveryCharge}`
                  )}
                </span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Coupon Discount ({order.couponCode}):</span>
                  <span>-₹{order.discount}</span>
                </div>
              )}
              <div className="border-t border-stone-200 pt-2 flex justify-between font-extrabold text-stone-900 text-sm">
                <span>Total Amount:</span>
                <span className="text-amber-900">₹{order.total}</span>
              </div>
              <div className="text-[11px] text-stone-500 border-t border-dashed border-stone-200 pt-1.5 flex justify-between items-center">
                <span>Payment Method:</span>
                <span className="font-semibold text-stone-800">{order.paymentMethod}</span>
              </div>
              {order.paymentId && (
                <div className="text-[10px] text-stone-400 font-mono flex justify-between">
                  <span>Txn Ref:</span>
                  <span>{order.paymentId}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* COD Note or Security Badge */}
        <div className="p-4 bg-stone-50 flex items-center justify-between text-xs text-stone-500">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              {isCod
                ? 'Please keep exact cash ready (₹' + order.total + ') for our delivery partner upon arrival.'
                : '100% Encrypted & Authenticated Payment. Ghee safety seal guaranteed.'}
            </span>
          </div>

          {!isCancelled && (
            <button
              onClick={() => setIsCancelModalOpen(true)}
              type="button"
              className="text-xs text-rose-600 hover:text-rose-700 hover:underline font-semibold cursor-pointer"
            >
              Need to cancel?
            </button>
          )}
        </div>
      </div>

      {/* Action Choice Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => onTrackOrder(order.orderNumber)}
          className="w-full sm:w-auto py-3 px-6 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <Truck className="w-4 h-4 text-amber-400" />
          Track Live Delivery Status
        </button>
        <button
          type="button"
          onClick={onBackToShopping}
          className="w-full sm:w-auto py-3 px-6 rounded-xl border border-stone-300 hover:bg-stone-100 text-stone-800 font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <ShoppingBag className="w-4 h-4 text-stone-600" />
          Continue Shopping
        </button>
      </div>

      {/* Cancel Order Modal */}
      <CancelOrderModal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        order={order}
        onOrderCancelled={handleOrderCancelled}
      />
    </div>
  );
};
