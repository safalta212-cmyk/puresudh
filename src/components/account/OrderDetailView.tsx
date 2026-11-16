import React, { useState } from 'react';
import {
  ArrowLeft,
  Package,
  CheckCircle2,
  Clock,
  Truck,
  MapPin,
  CreditCard,
  AlertCircle,
  Copy,
  Check,
  Star,
  RotateCcw,
  Printer,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { Order, OrderStatus, Product } from '../../types';
import { useToast } from '../../context/ToastContext';
import { useCart } from '../../context/CartContext';
import { notificationService } from '../../services/notifications/notificationService';
import { updateOrderStatus } from '../../firebase/services';

interface OrderDetailViewProps {
  order: Order;
  onBack: () => void;
  onTrackLive: (orderNumber: string) => void;
  onOpenProductDetails?: (product: Product) => void;
  onWriteReview?: (item: {
    productId: string;
    productName: string;
    productImage: string;
    orderId: string;
    orderNumber: string;
  }) => void;
  onOrderUpdated?: (updatedOrder: Order) => void;
}

// Exactly the 6 tracking stages requested:
// Order Placed -> Confirmed -> Preparing -> Packed -> Out for Delivery -> Delivered
const TRACKING_STAGES: {
  key: string;
  label: string;
  description: string;
  matchStatuses: string[];
}[] = [
  {
    key: 'placed',
    label: 'Order Placed',
    description: 'Received & authenticated in kitchen system',
    matchStatuses: ['PLACED', 'Order Placed', 'CONFIRMED', 'Confirmed', 'PREPARING', 'Preparing', 'PACKED', 'Packed', 'OUT_FOR_DELIVERY', 'Out for Delivery', 'DELIVERED', 'Delivered'],
  },
  {
    key: 'confirmed',
    label: 'Confirmed',
    description: 'Kitchen accepted & stock allocated',
    matchStatuses: ['CONFIRMED', 'Confirmed', 'PREPARING', 'Preparing', 'PACKED', 'Packed', 'OUT_FOR_DELIVERY', 'Out for Delivery', 'DELIVERED', 'Delivered'],
  },
  {
    key: 'preparing',
    label: 'Preparing',
    description: 'Fresh batch preparation underway',
    matchStatuses: ['PREPARING', 'Preparing', 'PACKED', 'Packed', 'OUT_FOR_DELIVERY', 'Out for Delivery', 'DELIVERED', 'Delivered'],
  },
  {
    key: 'packed',
    label: 'Packed',
    description: 'Quality tested & sealed in airtight container',
    matchStatuses: ['PACKED', 'Packed', 'OUT_FOR_DELIVERY', 'Out for Delivery', 'DELIVERED', 'Delivered'],
  },
  {
    key: 'out_for_delivery',
    label: 'Out for Delivery',
    description: 'Assigned to fast delivery partner',
    matchStatuses: ['OUT_FOR_DELIVERY', 'Out for Delivery', 'DELIVERED', 'Delivered'],
  },
  {
    key: 'delivered',
    label: 'Delivered',
    description: 'Safely handed over to you',
    matchStatuses: ['DELIVERED', 'Delivered'],
  },
];

export const OrderDetailView: React.FC<OrderDetailViewProps> = ({
  order,
  onBack,
  onTrackLive,
  onOpenProductDetails,
  onWriteReview,
  onOrderUpdated,
}) => {
  const { showToast } = useToast();
  const { addToCart } = useCart();

  const [copied, setCopied] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('Changed my mind');
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const copyOrderNumber = () => {
    navigator.clipboard.writeText(order.orderNumber);
    setCopied(true);
    showToast(`Order #${order.orderNumber} copied to clipboard!`, 'info');
    setTimeout(() => setCopied(false), 2000);
  };

  // Check cancellation eligibility following server-side business rules
  const normStatus = (order.status || '').toUpperCase();
  const isCancelled = normStatus === 'CANCELLED' || normStatus === 'REFUNDED';
  const isDelivered = normStatus === 'DELIVERED';
  const isPackedOrBeyond = ['PACKED', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(normStatus);
  const isCancellable = ['PLACED', 'ORDER PLACED', 'CONFIRMED', 'PREPARING'].includes(normStatus);

  // Determine stage progress
  const getStageStatus = (stageIndex: number) => {
    if (isCancelled) return 'cancelled';
    const stage = TRACKING_STAGES[stageIndex];
    const isCompleted = stage.matchStatuses.includes(order.status) || stage.matchStatuses.includes(normStatus);
    
    // Find current active stage index
    let currentActiveIdx = 0;
    for (let i = TRACKING_STAGES.length - 1; i >= 0; i--) {
      if (
        TRACKING_STAGES[i].matchStatuses.includes(order.status) ||
        TRACKING_STAGES[i].matchStatuses.includes(normStatus)
      ) {
        currentActiveIdx = i;
        break;
      }
    }

    if (stageIndex === currentActiveIdx) return 'current';
    if (stageIndex < currentActiveIdx) return 'completed';
    return 'upcoming';
  };

  // Handle Server-Side Order Cancellation
  const handleCancelOrder = async () => {
    setIsCancelling(true);
    setCancelError(null);

    try {
      let updatedOrder: Order | null = null;
      let usedServer = false;

      try {
        const res = await fetch(`/api/orders/${order.id}/cancel`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: cancelReason }),
        });

        const ct = res.headers.get('content-type') || '';
        if (ct.includes('application/json')) {
          usedServer = true;
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error || 'Server rejected cancellation.');
          }
          updatedOrder = data.order || null;
        }
      } catch (apiErr: any) {
        if (usedServer) {
          throw apiErr;
        }
      }

      if (!usedServer) {
        const normalized = (order.status || '').toUpperCase();
        if (!['PLACED', 'ORDER PLACED', 'CONFIRMED'].includes(normalized)) {
          throw new Error('Only recently placed orders can be cancelled.');
        }
        await updateOrderStatus(order.id, 'CANCELLED', cancelReason || 'Cancelled by customer');
        updatedOrder = {
          ...order,
          status: 'CANCELLED',
          updatedAt: new Date().toISOString(),
          statusHistory: [
            ...(order.statusHistory || []),
            {
              status: 'CANCELLED',
              timestamp: new Date().toISOString(),
              note: cancelReason || 'Cancelled by customer',
            },
          ],
        };
      }

      // Dispatch order cancellation notification
      notificationService.sendOrderCancellation(order, cancelReason).catch((e) => {
        console.warn('Cancellation notification error:', e);
      });

      if (order.paymentStatus === 'Paid') {
        notificationService.sendOrderRefund(order, order.total, `CANCEL-${order.id.slice(-6)}`).catch((e) => {
          console.warn('Refund notification error:', e);
        });
      }

      showToast(
        order.paymentStatus === 'Paid'
          ? `Order cancelled. Refund of ₹${order.total} initiated.`
          : 'Order successfully cancelled.',
        'success'
      );

      setIsCancelModalOpen(false);

      if (onOrderUpdated && updatedOrder) {
        onOrderUpdated(updatedOrder);
      }
    } catch (err: any) {
      setCancelError(err.message || 'Unable to cancel order.');
      showToast(err.message || 'Unable to cancel order.', 'error');
    } finally {
      setIsCancelling(false);
    }
  };

  // Re-order items
  const handleReorder = async () => {
    if (!order.items || order.items.length === 0) return;
    for (const item of order.items) {
      await addToCart(
        {
          id: item.productId,
          name: item.productName,
          slug: item.productId,
          shortDescription: item.productName || 'Authentic Pure Delicacy',
          description: '',
          price: item.price,
          weight: item.weight || '500g',
          categoryId: 'all',
          images: [item.productImage],
          stockQuantity: 50,
          availability: true,
          rating: 5,
          createdAt: '',
          updatedAt: '',
        },
        item.quantity
      );
    }
    showToast(`Added ${order.items.length} items to your cart!`, 'success');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Bar Navigation & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-3xl border border-stone-200 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 transition cursor-pointer"
            aria-label="Back to orders list"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-extrabold text-stone-900 text-base sm:text-lg">
                #{order.orderNumber}
              </span>
              <button
                type="button"
                onClick={copyOrderNumber}
                className="p-1 text-stone-400 hover:text-stone-600 transition"
                title="Copy order number"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <p className="text-xs text-stone-500">
              Placed on {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Badge */}
          <span
            className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
              isDelivered
                ? 'bg-emerald-100 text-emerald-800'
                : isCancelled
                ? 'bg-rose-100 text-rose-800'
                : 'bg-amber-100 text-amber-900'
            }`}
          >
            {order.status}
          </span>

          <button
            type="button"
            onClick={() => onTrackLive(order.orderNumber)}
            className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Truck className="w-3.5 h-3.5" />
            Track Live
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold text-xs px-3 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer hidden sm:flex"
          >
            <Printer className="w-3.5 h-3.5" />
            Invoice
          </button>
        </div>
      </div>

      {/* Tracking Stepper: Order Placed -> Confirmed -> Preparing -> Packed -> Out for Delivery -> Delivered */}
      <div className="bg-white p-5 sm:p-7 rounded-3xl border border-stone-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-stone-100 pb-3">
          <div>
            <h3 className="font-bold text-stone-900 text-sm sm:text-base flex items-center gap-2">
              <Truck className="w-4 h-4 text-amber-700" />
              Order Tracking Timeline
            </h3>
            <p className="text-xs text-stone-500">Live milestone updates from the PURE SUDH kitchen</p>
          </div>
          {order.estimatedDeliveryTime && (
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 bg-amber-50 text-amber-900 rounded-lg border border-amber-200">
              <Clock className="w-3.5 h-3.5 text-amber-700" />
              <span>ETA: {order.estimatedDeliveryTime}</span>
            </div>
          )}
        </div>

        {/* Responsive Stepper */}
        {isCancelled ? (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3">
            <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-rose-900 text-xs sm:text-sm">
                Order {normStatus === 'REFUNDED' ? 'Refunded' : 'Cancelled'}
              </p>
              <p className="text-xs text-rose-700 mt-0.5">
                This order was cancelled in accordance with kitchen server-side rules.
                {order.paymentStatus === 'Refunded' && ' Full payment has been credited back to your original payment method.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="py-2">
            {/* Desktop horizontal / Mobile vertical tracking timeline */}
            <div className="hidden md:grid md:grid-cols-6 gap-2 relative">
              {TRACKING_STAGES.map((stage, idx) => {
                const stageStatus = getStageStatus(idx);
                const isCompleted = stageStatus === 'completed';
                const isCurrent = stageStatus === 'current';

                return (
                  <div key={stage.key} className="flex flex-col items-center text-center relative group">
                    {/* Connecting line between stages */}
                    {idx < TRACKING_STAGES.length - 1 && (
                      <div
                        className={`absolute top-4 left-1/2 w-full h-1 -z-0 transition-colors ${
                          isCompleted ? 'bg-emerald-600' : 'bg-stone-200'
                        }`}
                      />
                    )}

                    {/* Step Icon Badge */}
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs z-10 transition shadow-xs ${
                        isCompleted
                          ? 'bg-emerald-600 text-white'
                          : isCurrent
                          ? 'bg-amber-600 text-white ring-4 ring-amber-100 animate-pulse'
                          : 'bg-stone-100 text-stone-400 border border-stone-300'
                      }`}
                    >
                      {isCompleted ? <Check className="w-4 h-4" /> : <span>{idx + 1}</span>}
                    </div>

                    <p
                      className={`text-xs font-bold mt-2.5 ${
                        isCurrent
                          ? 'text-amber-900 font-extrabold'
                          : isCompleted
                          ? 'text-emerald-900'
                          : 'text-stone-400'
                      }`}
                    >
                      {stage.label}
                    </p>
                    <p className="text-[10px] text-stone-500 mt-0.5 leading-tight max-w-[110px]">
                      {stage.description}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Mobile Vertical View */}
            <div className="md:hidden space-y-4 pl-2">
              {TRACKING_STAGES.map((stage, idx) => {
                const stageStatus = getStageStatus(idx);
                const isCompleted = stageStatus === 'completed';
                const isCurrent = stageStatus === 'current';

                return (
                  <div key={stage.key} className="flex items-start gap-3 relative">
                    {idx < TRACKING_STAGES.length - 1 && (
                      <div
                        className={`absolute left-3.5 top-7 w-0.5 h-full -z-0 ${
                          isCompleted ? 'bg-emerald-600' : 'bg-stone-200'
                        }`}
                      />
                    )}
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 z-10 ${
                        isCompleted
                          ? 'bg-emerald-600 text-white'
                          : isCurrent
                          ? 'bg-amber-600 text-white ring-4 ring-amber-100 animate-pulse'
                          : 'bg-stone-100 text-stone-400 border border-stone-300'
                      }`}
                    >
                      {isCompleted ? <Check className="w-3.5 h-3.5" /> : <span>{idx + 1}</span>}
                    </div>
                    <div>
                      <p
                        className={`text-xs font-bold ${
                          isCurrent ? 'text-amber-900' : isCompleted ? 'text-emerald-900' : 'text-stone-400'
                        }`}
                      >
                        {stage.label}
                      </p>
                      <p className="text-[11px] text-stone-500 leading-tight mt-0.5">{stage.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Milestone history notes if present */}
        {order.statusHistory && order.statusHistory.length > 0 && (
          <div className="mt-3 pt-3 border-t border-stone-100 text-[11px] text-stone-500 space-y-1">
            <span className="font-semibold text-stone-700">Recent Milestones:</span>
            {order.statusHistory.slice(-2).map((hist, i) => (
              <div key={i} className="flex items-center gap-2 text-stone-600">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                <span>
                  {new Date(hist.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}: {hist.note || hist.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Products & Quantity Grid */}
      <div className="bg-white p-5 sm:p-7 rounded-3xl border border-stone-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <h3 className="font-bold text-stone-900 text-sm sm:text-base flex items-center gap-2">
            <Package className="w-4 h-4 text-amber-700" />
            Ordered Products ({order.items?.length || 0})
          </h3>
          <button
            type="button"
            onClick={handleReorder}
            className="text-xs font-bold text-amber-800 hover:text-amber-900 flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reorder All
          </button>
        </div>

        <div className="divide-y divide-stone-100">
          {(order.items || []).map((item, idx) => (
            <div key={idx} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={item.productImage || '/images/homemade_thekua_special.jpg'}
                  alt={item.productName}
                  className="w-14 h-14 rounded-2xl object-cover border border-stone-200 shrink-0"
                />
                <div className="min-w-0">
                  <p className="font-bold text-stone-900 text-xs sm:text-sm truncate">{item.productName}</p>
                  <p className="text-[11px] text-stone-500">
                    Weight: {item.weight || 'Standard'} • Unit Price: ₹{item.price}
                  </p>
                  <p className="text-xs font-semibold text-stone-700 mt-0.5">
                    Qty: <span className="font-bold text-stone-900">{item.quantity}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                <span className="font-extrabold text-stone-900 text-sm sm:text-base font-serif">
                  ₹{item.total || item.price * item.quantity}
                </span>

                {/* Reviews only for eligible delivered purchases */}
                {isDelivered && onWriteReview && (
                  <button
                    type="button"
                    onClick={() =>
                      onWriteReview({
                        productId: item.productId,
                        productName: item.productName,
                        productImage: item.productImage,
                        orderId: order.id,
                        orderNumber: order.orderNumber,
                      })
                    }
                    className="bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs px-3 py-1.5 rounded-xl transition flex items-center gap-1 cursor-pointer"
                  >
                    <Star className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
                    Review Item
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Two Column Layout: Delivery Address & Payment Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Delivery Address Card */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-stone-200 shadow-xs space-y-3">
          <h3 className="font-bold text-stone-900 text-sm flex items-center gap-2">
            <MapPin className="w-4 h-4 text-amber-700" />
            Delivery Destination
          </h3>
          <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-100 text-xs space-y-1">
            <div className="flex items-center gap-2 font-bold text-stone-900">
              <span>{order.deliveryAddress?.name || order.customerName}</span>
              <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-900">
                {order.deliveryAddress?.type || 'Home'}
              </span>
            </div>
            <p className="text-stone-600 leading-relaxed">
              {order.deliveryAddress?.addressLine || order.deliveryAddress?.address}
              {order.deliveryAddress?.landmark && `, Near ${order.deliveryAddress.landmark}`}
            </p>
            <p className="text-stone-600 font-mono">
              {order.deliveryAddress?.city || 'Patna'}, {order.deliveryAddress?.state || 'Bihar'} - {order.deliveryAddress?.pincode || order.deliveryAreaPincode}
            </p>
            <p className="text-stone-500 pt-1">📞 Contact: +91 {order.deliveryAddress?.phone || order.customerPhone}</p>
          </div>
        </div>

        {/* Payment & Bill Summary */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-stone-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-stone-900 text-sm flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-amber-700" />
              Payment & Price Breakdown
            </h3>
            <span
              className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md ${
                order.paymentStatus === 'Paid'
                  ? 'bg-emerald-100 text-emerald-800'
                  : order.paymentStatus === 'Refunded'
                  ? 'bg-purple-100 text-purple-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {order.paymentStatus}
            </span>
          </div>

          <div className="text-xs space-y-2 border-b border-stone-100 pb-3">
            <div className="flex justify-between text-stone-600">
              <span>Payment Method</span>
              <span className="font-semibold text-stone-800">{order.paymentMethod}</span>
            </div>
            {order.paymentId && (
              <div className="flex justify-between text-stone-500 font-mono text-[11px]">
                <span>Transaction Ref</span>
                <span className="truncate max-w-[180px]">{order.paymentId}</span>
              </div>
            )}
            <div className="flex justify-between text-stone-600">
              <span>Item Subtotal</span>
              <span>₹{order.subtotal}</span>
            </div>
            <div className="flex justify-between text-stone-600">
              <span>Delivery Charge</span>
              <span>{order.deliveryCharge === 0 ? <strong className="text-emerald-700">FREE</strong> : `₹${order.deliveryCharge}`}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>Discount ({order.couponCode || 'Promo'})</span>
                <span>-₹{order.discount}</span>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center pt-1 font-bold text-stone-900 text-sm">
            <span>Grand Total</span>
            <span className="font-extrabold text-base font-serif text-amber-950">₹{order.total}</span>
          </div>
        </div>
      </div>

      {/* Cancellation Section following server-side business rules */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-stone-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h4 className="font-bold text-xs sm:text-sm text-stone-900 flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-stone-500" />
            Order Cancellation Policy
          </h4>
          <p className="text-[11px] text-stone-500 mt-0.5 max-w-xl leading-relaxed">
            {isCancellable
              ? 'This order is in preparation. Cancellation is permitted under server business rules with full automated stock restoration.'
              : isPackedOrBeyond
              ? 'Cancellation is disabled because this order is packed or out for delivery. Fresh culinary batches cannot be recalled once dispatched.'
              : 'This order is concluded.'}
          </p>
        </div>

        {isCancellable && (
          <button
            type="button"
            onClick={() => setIsCancelModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs transition border border-rose-200 shrink-0 cursor-pointer"
          >
            Cancel Order
          </button>
        )}
      </div>

      {/* Cancellation Confirmation Modal */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-stone-200 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-rose-700">
              <AlertCircle className="w-5 h-5" />
              <h3 className="font-bold text-base text-stone-900">Cancel Order #{order.orderNumber}</h3>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              Are you sure you want to cancel this order? Kitchen inventory will be restored to store availability.
              {order.paymentStatus === 'Paid' && (
                <strong className="block text-emerald-800 mt-1 font-semibold">
                  A refund of ₹{order.total} will be processed immediately.
                </strong>
              )}
            </p>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Reason for cancellation</label>
              <select
                value={cancelReason ?? 'Changed my mind'}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-stone-300 text-xs focus:ring-2 focus:ring-amber-500"
              >
                <option value="Changed my mind">Changed my mind</option>
                <option value="Ordered wrong items">Ordered wrong items</option>
                <option value="Delivery time delay">Need delivery at a different time</option>
                <option value="Found alternative">Found alternative</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {cancelError && (
              <p className="text-xs text-rose-600 bg-rose-50 p-2 rounded-lg border border-rose-200 font-medium">
                {cancelError}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(false)}
                disabled={isCancelling}
                className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold text-xs transition cursor-pointer"
              >
                Keep Order
              </button>
              <button
                type="button"
                onClick={handleCancelOrder}
                disabled={isCancelling}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition cursor-pointer flex items-center gap-1.5"
              >
                {isCancelling ? 'Processing...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
