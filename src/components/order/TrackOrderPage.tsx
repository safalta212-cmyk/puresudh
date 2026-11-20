import React, { useState, useEffect } from 'react';
import {
  Search,
  CheckCircle2,
  Clock,
  Package,
  Truck,
  MapPin,
  Phone,
  MessageCircle,
  AlertCircle,
  Copy,
  Check,
  Navigation,
  ShieldCheck,
  ArrowRight,
  RefreshCw,
  Store,
  Layers,
} from 'lucide-react';
import { LiveTrackingSession, Order, OrderStatus } from '../../types';
import { fetchOrderById, fetchAllOrders, fetchUserOrders } from '../../firebase/services';
import { useAuth } from '../../context/AuthContext';
import { OrderTrackingMap } from '../maps/OrderTrackingMap';
import { CancelOrderModal } from '../checkout/CancelOrderModal';
import { fetchServerOrder } from '../../services/paymentService';
import {
  isOrderTerminal,
  subscribeToOrderDocument,
  subscribeToOrderTracking,
} from '../../services/gpsTrackingService';

interface TrackOrderPageProps {
  initialOrderId?: string;
  onBackToShop: () => void;
}

const ORDER_STEPS: { status: OrderStatus; label: string; desc: string }[] = [
  { status: 'Order Placed', label: 'Order Placed', desc: 'Received & sent to kitchen' },
  { status: 'Confirmed', label: 'Confirmed', desc: 'Ingredients inspected & verified' },
  { status: 'Preparing', label: 'Preparing', desc: 'Fresh in pure desi ghee kadhai' },
  { status: 'Packed', label: 'Packed', desc: 'Sealed in food-grade packaging' },
  { status: 'Out for Delivery', label: 'Out for Delivery', desc: 'Rider on the way to your door' },
  { status: 'Delivered', label: 'Delivered', desc: 'Safely handed over to you' },
];

export const TrackOrderPage: React.FC<TrackOrderPageProps> = ({
  initialOrderId,
  onBackToShop,
}) => {
  const { user, role } = useAuth();
  const [searchInput, setSearchInput] = useState(initialOrderId || '');
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [trackingSession, setTrackingSession] = useState<LiveTrackingSession | null>(null);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [matchingOrders, setMatchingOrders] = useState<Order[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);

  useEffect(() => {
    loadRecentOrders();
    if (initialOrderId) {
      loadOrder(initialOrderId);
    }
  }, [initialOrderId, user?.uid, role]);

  // Real-time Firestore onSnapshot listeners for selected order & live GPS tracking
  useEffect(() => {
    if (!currentOrder?.id) {
      setTrackingSession(null);
      return;
    }

    const unsubOrder = subscribeToOrderDocument(
      currentOrder.id,
      (updatedOrder) => {
        if (updatedOrder) {
          setCurrentOrder((prev) =>
            prev && prev.id === updatedOrder.id ? { ...prev, ...updatedOrder } : updatedOrder
          );
        }
      },
      () => {}
    );

    const terminal = isOrderTerminal(currentOrder.status);
    let unsubTracking = () => {};
    if (!terminal) {
      unsubTracking = subscribeToOrderTracking(
        currentOrder.id,
        (session) => setTrackingSession(session),
        () => {}
      );
    } else {
      setTrackingSession(null);
    }

    return () => {
      unsubOrder();
      unsubTracking();
    };
  }, [currentOrder?.id, currentOrder?.status]);

  const loadRecentOrders = async () => {
    try {
      let loaded: Order[] = [];
      if (role === 'admin' || role === 'staff') {
        loaded = await fetchAllOrders();
      } else if (user?.uid) {
        loaded = await fetchUserOrders(user.uid);
      }
      setAllOrders(loaded);
      if (!initialOrderId && loaded.length > 0) {
        setCurrentOrder(loaded[0]);
      }
    } catch (e) {
      console.warn('Orders load error:', e);
    }
  };

  const loadOrder = async (idOrPhone: string) => {
    const term = idOrPhone.trim();
    if (!term) return;

    setIsSearching(true);
    setNotFound(false);
    setMatchingOrders([]);

    try {
      // Check if it's a phone search with multiple matching orders
      const digits = term.replace(/\D/g, '');
      if (digits.length >= 10 && allOrders.length > 0) {
        const byPhone = allOrders.filter((o) =>
          (o.customerPhone || '').replace(/\D/g, '').endsWith(digits.slice(-10))
        );
        if (byPhone.length > 1) {
          setMatchingOrders(byPhone);
          setCurrentOrder(byPhone[0]);
          setIsSearching(false);
          return;
        }
      }

      let ord = await fetchOrderById(term);
      if (!ord) {
        // Query backend server /api/orders/:id fallback
        ord = await fetchServerOrder(term);
      }

      if (ord) {
        setCurrentOrder(ord);
        setSearchInput(ord.orderNumber);
      } else {
        setNotFound(true);
      }
    } catch {
      setNotFound(true);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      loadOrder(searchInput.trim());
    }
  };

  const handleCopyOrderNumber = (num: string) => {
    navigator.clipboard?.writeText(num);
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 2000);
  };

  const getStepIndex = (status: OrderStatus): number => {
    const s = String(status).toUpperCase();
    if (s === 'PLACED' || s === 'ORDER PLACED') return 0;
    if (s === 'CONFIRMED') return 1;
    if (s === 'PREPARING') return 2;
    if (s === 'PACKED') return 3;
    if (s === 'OUT_FOR_DELIVERY' || s === 'OUT FOR DELIVERY') return 4;
    if (s === 'DELIVERED') return 5;
    return 0;
  };

  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  const currentStepIdx = currentOrder ? getStepIndex(currentOrder.status) : 0;
  const isCancelled =
    currentOrder?.status === 'Cancelled' ||
    currentOrder?.status === 'CANCELLED' ||
    currentOrder?.status === 'Refunded' ||
    currentOrder?.status === 'REFUNDED';

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-6 sm:space-y-8 w-full max-w-full overflow-hidden">
      {/* Header Banner */}
      <div className="text-center space-y-2.5">
        <div className="inline-flex items-center gap-2 text-xs uppercase font-bold tracking-widest text-emerald-800 bg-emerald-50 px-3.5 py-1.5 rounded-full border border-emerald-200">
          <Truck className="w-3.5 h-3.5 text-emerald-600 animate-bounce" />
          <span>Real-time Kitchen Prep & Delivery Fleet</span>
        </div>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-stone-900 font-serif tracking-tight">
          Track Your Order
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 max-w-lg mx-auto leading-relaxed">
          Monitor your pure dairy, traditional Thekua, and festival sweets from our kitchen kadhai straight to your door.
        </p>
      </div>

      {/* Search Input Bar */}
      <div className="max-w-lg mx-auto space-y-2.5">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5 pointer-events-none" />
            <input
              id="track-order-search-input"
              type="text"
              value={searchInput ?? ''}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Enter Order # (e.g. PS-...) or 10-digit Phone"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs sm:text-sm font-mono tracking-wider min-h-[44px] bg-white shadow-xs"
            />
          </div>
          <button
            id="track-order-submit-btn"
            type="submit"
            disabled={isSearching}
            className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-6 py-2.5 rounded-xl text-xs sm:text-sm transition touch-manipulation min-h-[44px] flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
          >
            {isSearching ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Truck className="w-4 h-4" />
            )}
            <span>{isSearching ? 'Locating...' : 'Track'}</span>
          </button>
        </form>

        {/* Quick Demo Order Chips */}
        {allOrders.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-1.5 text-[11px] text-stone-500">
            <span>Recent orders:</span>
            {allOrders.slice(0, 3).map((ord) => (
              <button
                key={ord.id}
                type="button"
                onClick={() => {
                  setSearchInput(ord.orderNumber);
                  loadOrder(ord.orderNumber);
                }}
                className={`font-mono px-2 py-0.5 rounded-md border transition ${
                  currentOrder?.id === ord.id
                    ? 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold'
                    : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border-stone-200'
                }`}
              >
                #{ord.orderNumber}
              </button>
            ))}
          </div>
        )}
      </div>

      {notFound && (
        <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-center text-xs text-amber-900 space-y-1">
          <AlertCircle className="w-5 h-5 text-amber-600 mx-auto" />
          <p className="font-bold">No order found matching &quot;{searchInput}&quot;</p>
          <p className="text-stone-600">
            Please double-check your Order Number or 10-digit mobile number, or select from your recent orders below.
          </p>
        </div>
      )}

      {/* Multiple Orders Picker for Phone Search */}
      {matchingOrders.length > 1 && (
        <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-2">
          <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
            Multiple orders found for this phone ({matchingOrders.length}):
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {matchingOrders.map((ord) => (
              <button
                key={ord.id}
                type="button"
                onClick={() => setCurrentOrder(ord)}
                className={`p-3 rounded-xl text-left border transition text-xs flex items-center justify-between ${
                  currentOrder?.id === ord.id
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                    : 'bg-white border-stone-200 hover:bg-stone-100 text-stone-800'
                }`}
              >
                <div>
                  <div className="font-mono font-bold">#{ord.orderNumber}</div>
                  <div className="text-[11px] text-stone-500">
                    {new Date(ord.createdAt).toLocaleDateString()} • ₹{ord.total}
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100">
                  {ord.status}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Active Order Card */}
      {currentOrder ? (
        <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-4 sm:p-8 space-y-6">
          {/* Order Header Meta */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-extrabold text-lg sm:text-xl text-stone-900">
                  #{currentOrder.orderNumber}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyOrderNumber(currentOrder.orderNumber)}
                  className="p-1 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition"
                  title="Copy Order ID"
                  aria-label="Copy Order Number"
                >
                  {hasCopied ? (
                    <Check className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
                {hasCopied && (
                  <span className="text-[11px] text-emerald-700 font-bold animate-in fade-in">
                    Copied!
                  </span>
                )}
                <span
                  className={`text-xs font-bold px-3 py-0.5 rounded-full ${
                    currentOrder.status === 'Delivered'
                      ? 'bg-emerald-100 text-emerald-800'
                      : isCancelled
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-amber-100 text-amber-900'
                  }`}
                >
                  {currentOrder.status}
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-1">
                Placed on {new Date(currentOrder.createdAt).toLocaleDateString()} at{' '}
                {new Date(currentOrder.createdAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <a
                href={`https://wa.me/919876543210?text=${encodeURIComponent(
                  `Namaste! Checking status for my PURE SUDH Order #${currentOrder.orderNumber}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold transition"
              >
                <MessageCircle className="w-4 h-4 text-emerald-600" />
                <span>WhatsApp Kitchen</span>
              </a>

              {!isCancelled && currentStepIdx < 3 && (
                <button
                  type="button"
                  onClick={() => setIsCancelModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition cursor-pointer"
                >
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                  <span>Cancel Order</span>
                </button>
              )}
            </div>
          </div>

          {/* Stepper Progress Bar */}
          {!isCancelled ? (
            <div className="py-2 space-y-6">
              {/* ETA Bar */}
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 bg-emerald-50/70 p-3.5 rounded-2xl border border-emerald-200/80">
                <div className="flex items-center gap-2.5 text-xs text-emerald-950">
                  <Clock className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>
                    Estimated Delivery Arrival:{' '}
                    <strong className="text-emerald-900 font-bold text-sm">
                      {currentOrder.estimatedDeliveryTime || '25-35 mins'}
                    </strong>
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-emerald-800 font-semibold flex items-center gap-1">
                    <Truck className="w-3.5 h-3.5 text-emerald-600" /> Hyper-Local Dispatch
                  </span>
                </div>
              </div>

              {/* Desktop Stepper */}
              <div className="hidden sm:block relative pt-4 pb-4">
                <div className="absolute top-8 left-6 right-6 h-1.5 bg-stone-200 rounded-full">
                  <div
                    className="h-full bg-emerald-600 rounded-full transition-all duration-700 ease-out"
                    style={{
                      width: `${Math.max(0, (currentStepIdx / (ORDER_STEPS.length - 1)) * 100)}%`,
                    }}
                  />
                </div>

                <div className="relative z-10 flex justify-between">
                  {ORDER_STEPS.map((step, idx) => {
                    const isDone = idx <= currentStepIdx;
                    const isCurrent = idx === currentStepIdx;

                    return (
                      <div key={step.status} className="flex flex-col items-center text-center max-w-[100px]">
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                            isDone
                              ? 'bg-emerald-700 text-white shadow-xs'
                              : 'bg-white text-stone-400 border-2 border-stone-300'
                          } ${isCurrent ? 'ring-4 ring-emerald-100 scale-110' : ''}`}
                        >
                          {isDone ? <CheckCircle2 className="w-5 h-5" /> : idx + 1}
                        </div>
                        <span
                          className={`text-xs mt-2.5 font-bold leading-tight ${
                            isCurrent
                              ? 'text-emerald-900'
                              : isDone
                              ? 'text-stone-800'
                              : 'text-stone-400 font-normal'
                          }`}
                        >
                          {step.label}
                        </span>
                        <span className="text-[10px] text-stone-500 mt-0.5 leading-snug">
                          {step.desc}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Mobile Stepper */}
              <div className="sm:hidden border-l-2 border-emerald-500/40 ml-3 pl-4 space-y-4 py-1">
                {ORDER_STEPS.map((step, idx) => {
                  const isDone = idx <= currentStepIdx;
                  const isCurrent = idx === currentStepIdx;

                  return (
                    <div key={step.status} className="relative">
                      <div className="flex items-start gap-2.5">
                        <div
                          className={`w-5 h-5 -ml-[23px] rounded-full flex items-center justify-center font-bold text-[10px] transition-all shrink-0 mt-0.5 ${
                            isDone
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-stone-100 text-stone-400 border border-stone-300'
                          } ${isCurrent ? 'ring-2 ring-emerald-200 scale-110' : ''}`}
                        >
                          {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : idx + 1}
                        </div>
                        <div>
                          <p
                            className={`text-xs ${
                              isCurrent
                                ? 'font-bold text-emerald-950'
                                : isDone
                                ? 'font-semibold text-stone-800'
                                : 'text-stone-400'
                            }`}
                          >
                            {step.label}
                          </p>
                          <p className="text-[11px] text-stone-500">{step.desc}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200 text-xs text-rose-800 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <div>
                <p className="font-bold">This order has been {currentOrder.status}</p>
                <p className="mt-0.5">
                  If this was a prepaid transaction, your refund has been processed back to your original payment method within 2-4 business hours.
                </p>
              </div>
            </div>
          )}

          {/* Interactive Google Maps Live Delivery Tracking */}
          {!isCancelled && (
            <div className="space-y-2">
              <OrderTrackingMap order={currentOrder} trackingSession={trackingSession} />
            </div>
          )}

          {/* Delivery Details & Payment Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Delivery Address */}
            <div className="p-4 rounded-2xl bg-stone-50/70 border border-stone-200/70 space-y-2 text-xs">
              <h4 className="font-bold text-stone-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-amber-700" />
                Delivery Address
              </h4>
              <p className="font-bold text-stone-800">{currentOrder.deliveryAddress.name}</p>
              <p className="text-stone-600 leading-relaxed">
                {currentOrder.deliveryAddress.addressLine}
                {currentOrder.deliveryAddress.landmark && (
                  <span>, Near {currentOrder.deliveryAddress.landmark}</span>
                )}
              </p>
              <p className="text-stone-600">
                {currentOrder.deliveryAddress.city}, {currentOrder.deliveryAddress.state} -{' '}
                <strong className="font-mono font-bold text-stone-900">
                  {currentOrder.deliveryAddress.pincode}
                </strong>
              </p>
              <p className="text-stone-600 pt-1 flex items-center gap-1">
                <Phone className="w-3 h-3 text-stone-400" />
                <span>+91 {currentOrder.customerPhone}</span>
              </p>
            </div>

            {/* Bill Summary */}
            <div className="p-4 rounded-2xl bg-stone-50/70 border border-stone-200/70 space-y-2 text-xs">
              <h4 className="font-bold text-stone-900 text-xs uppercase tracking-wider">
                Payment & Invoice
              </h4>
              <div className="flex justify-between text-stone-600">
                <span>Payment Method:</span>
                <span className="font-semibold text-stone-900">{currentOrder.paymentMethod}</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Payment Status:</span>
                <span
                  className={`font-semibold ${
                    currentOrder.paymentStatus === 'Paid' ? 'text-emerald-700' : 'text-amber-800'
                  }`}
                >
                  {currentOrder.paymentStatus}
                </span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Items Subtotal:</span>
                <span>₹{currentOrder.subtotal}</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Delivery Charge:</span>
                <span>
                  {currentOrder.deliveryCharge === 0 ? (
                    <strong className="text-emerald-700">FREE</strong>
                  ) : (
                    `₹${currentOrder.deliveryCharge}`
                  )}
                </span>
              </div>
              {currentOrder.discount > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Discount ({currentOrder.couponCode}):</span>
                  <span>-₹{currentOrder.discount}</span>
                </div>
              )}
              <div className="pt-2 border-t border-stone-200 flex justify-between font-bold text-stone-900 text-sm">
                <span>Grand Total:</span>
                <span className="font-serif">₹{currentOrder.total}</span>
              </div>
            </div>
          </div>

          {/* Multi-Vendor Packages Breakdown */}
          {currentOrder.vendorOrders && currentOrder.vendorOrders.length > 0 && (
            <div className="pt-4 border-t border-stone-100">
              <h4 className="font-bold text-xs uppercase tracking-wider text-amber-900 mb-3 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-amber-700" />
                Vendor Packages & Kitchen Dispatches ({currentOrder.vendorOrders.length})
              </h4>
              <div className="space-y-3">
                {currentOrder.vendorOrders.map((vo) => (
                  <div
                    key={vo.id}
                    className="p-3.5 rounded-2xl bg-amber-50/40 border border-amber-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Store className="w-3.5 h-3.5 text-stone-600" />
                        <span className="font-bold text-stone-900">{vo.vendorName}</span>
                        <span className="text-[10px] font-mono text-stone-400">({vo.orderNumber || vo.id})</span>
                      </div>
                      <p className="text-[11px] text-stone-500">
                        {vo.items?.length || 0} items • Subtotal: ₹{vo.vendorSubtotal} • Delivery: {vo.vendorDeliveryFee === 0 ? 'FREE' : `₹${vo.vendorDeliveryFee}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-stone-600 bg-white px-2 py-0.5 rounded-md border border-stone-200">
                        <Clock className="w-3 h-3 text-stone-400" />
                        ETA: {vo.estimatedDeliveryTime || '30 mins'}
                      </span>
                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-md ${
                          vo.status === 'Cancelled' || vo.status === 'CANCELLED'
                            ? 'bg-rose-100 text-rose-800'
                            : vo.status === 'Delivered' || vo.status === 'DELIVERED'
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

          {/* Ordered Items Breakdown */}
          <div className="pt-4 border-t border-stone-100">
            <h4 className="font-bold text-xs uppercase tracking-wider text-stone-700 mb-3">
              Items in this shipment ({(currentOrder.items || []).length})
            </h4>
            <div className="divide-y divide-stone-100">
              {(currentOrder.items || []).map((item, i) => (
                <div key={i} className="py-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={item.productImage}
                      alt={item.productName}
                      className="w-12 h-12 rounded-xl object-cover border border-stone-200 shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="font-bold text-stone-900 truncate">{item.productName}</p>
                      <p className="text-stone-500 text-[11px]">
                        Qty: {item.quantity} • Weight: {item.weight}
                      </p>
                    </div>
                  </div>
                  <span className="font-bold text-stone-900 shrink-0">₹{item.total}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-3xl border border-stone-200 p-8 space-y-4">
          <Truck className="w-12 h-12 text-stone-300 mx-auto" />
          <h3 className="font-bold text-base text-stone-800">No active order selected</h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            Please enter your order number or phone number above to track your fresh food delivery.
          </p>
          <button
            type="button"
            onClick={onBackToShop}
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition shadow-xs"
          >
            Explore Fresh Store
          </button>
        </div>
      )}

      {/* Return to Shop Action */}
      <div className="text-center pt-2">
        <button
          type="button"
          onClick={onBackToShop}
          className="bg-stone-900 hover:bg-stone-800 text-white font-semibold text-xs px-6 py-3 rounded-xl transition shadow-xs flex items-center justify-center gap-2 mx-auto touch-manipulation cursor-pointer"
        >
          <span>Continue Shopping</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Cancel Order Modal */}
      {currentOrder && (
        <CancelOrderModal
          isOpen={isCancelModalOpen}
          onClose={() => setIsCancelModalOpen(false)}
          order={currentOrder}
          onOrderCancelled={(updated) => {
            setCurrentOrder(updated);
          }}
        />
      )}
    </div>
  );
};
