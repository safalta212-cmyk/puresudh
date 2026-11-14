import React, { useState } from 'react';
import {
  X,
  Plus,
  Minus,
  Trash2,
  Tag,
  ArrowRight,
  ShoppingBag,
  Sparkles,
  Truck,
  Check,
  Store,
  Clock,
  AlertTriangle,
  Lock,
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useDelivery } from '../../context/DeliveryContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

interface CartDrawerProps {
  onProceedToCheckout: () => void;
  onContinueShopping: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  onProceedToCheckout,
  onContinueShopping,
}) => {
  const { user, openAuthModal } = useAuth();
  const { showToast } = useToast();
  const {
    items,
    vendorGroups,
    isMultiVendor,
    itemCount,
    subtotal,
    deliveryFee,
    discount,
    couponCode,
    total,
    isCartOpen,
    setIsCartOpen,
    updateQuantity,
    increase,
    decrease,
    clearCart,
    removeFromCart,
    applyCoupon,
    removeCoupon,
    syncStatus,
  } = useCart();

  const { freeDeliveryThreshold, pincode, estimatedDeliveryTime } = useDelivery();
  const [promoInput, setPromoInput] = useState('');
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

  if (!isCartOpen) return null;

  const freeDeliveryRemaining = Math.max(0, freeDeliveryThreshold - subtotal);
  const freeDeliveryProgress = Math.min(100, Math.round((subtotal / freeDeliveryThreshold) * 100));

  const handleApplyPromo = async (codeToApply?: string) => {
    const code = codeToApply || promoInput;
    if (!code) return;
    setIsApplyingCoupon(true);
    await applyCoupon(code);
    setIsApplyingCoupon(false);
    setPromoInput('');
  };

  return (
    <div
      id="cart-drawer-overlay"
      className="fixed inset-0 z-50 overflow-hidden bg-stone-900/60 backdrop-blur-xs transition-opacity"
    >
      <div className="absolute inset-0" onClick={() => setIsCartOpen(false)} />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-0 sm:pl-10">
        <div
          id="cart-drawer-panel"
          className="w-full sm:w-screen max-w-full sm:max-w-md bg-white shadow-2xl border-l border-stone-200 flex flex-col justify-between animate-in slide-in-from-right duration-300"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50/70">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-amber-700" />
              <h3 className="font-bold text-stone-900 text-base">Your Fresh Cart</h3>
              <span
                id="cart-drawer-count"
                className="bg-amber-100 text-amber-900 text-xs font-extrabold px-2 py-0.5 rounded-full"
              >
                {itemCount} {itemCount === 1 ? 'item' : 'items'}
              </span>
              {syncStatus === 'synced' ? (
                <span
                  title="Synced with your Firebase account"
                  className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full"
                >
                  <Check className="w-3 h-3" />
                  Cloud Synced
                </span>
              ) : (
                <span
                  title="Local guest cart. Sign in to save across devices"
                  className="hidden sm:inline-flex text-[10px] font-medium text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full"
                >
                  Guest Cart
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {items.length > 0 && (
                <button
                  id="cart-drawer-clear-btn"
                  type="button"
                  onClick={clearCart}
                  className="text-stone-400 hover:text-rose-600 text-xs font-medium px-2 py-1 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                  title="Clear entire cart"
                >
                  Clear All
                </button>
              )}
              <button
                id="close-cart-drawer-btn"
                onClick={() => setIsCartOpen(false)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-200 transition cursor-pointer"
                aria-label="Close cart"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Delivery Progress Bar */}
          <div className="bg-amber-50/70 px-4 py-2.5 border-b border-amber-100 text-xs text-amber-900">
            {freeDeliveryRemaining > 0 ? (
              <div className="space-y-1.5">
                <div className="flex justify-between font-semibold">
                  <span className="flex items-center gap-1">
                    <Truck className="w-3.5 h-3.5 text-amber-700" />
                    Add ₹{freeDeliveryRemaining} more for FREE delivery
                  </span>
                  <span>{freeDeliveryProgress}%</span>
                </div>
                <div className="w-full bg-amber-200/70 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-amber-600 h-full rounded-full transition-all duration-300"
                    style={{ width: `${freeDeliveryProgress}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>You unlocked FREE local delivery to {pincode}!</span>
              </div>
            )}
          </div>

          {/* Items List - Grouped by Vendor */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {items.length === 0 ? (
              <div className="py-16 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-stone-100 text-stone-400 flex items-center justify-center mx-auto">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="font-bold text-stone-800 text-base">Your cart is empty</h4>
                  <p className="text-xs text-stone-500 mt-1 max-w-xs mx-auto">
                    Explore our authentic Bihari Thekua, freshly made Khasta, and farm-fresh dairy!
                  </p>
                </div>
                <button
                  id="empty-cart-shop-btn"
                  type="button"
                  onClick={() => {
                    setIsCartOpen(false);
                    onContinueShopping();
                  }}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs px-5 py-2.5 rounded-xl transition shadow-xs"
                >
                  Explore Products
                </button>
              </div>
            ) : (
              vendorGroups.map((group) => (
                <div
                  key={group.vendorId}
                  className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden"
                >
                  {/* Vendor Header */}
                  <div className="bg-stone-50/80 px-3.5 py-2.5 border-b border-stone-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                        <Store className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <h5 className="font-bold text-xs text-stone-900 leading-tight">
                          {group.vendorName}
                        </h5>
                        <p className="text-[10px] text-stone-500">
                          {group.items.length} {group.items.length === 1 ? 'item' : 'items'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-right">
                      {group.isDeliverable ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
                          <Clock className="w-3 h-3 text-amber-700" />
                          {group.estimatedDeliveryTime}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                          <AlertTriangle className="w-3 h-3" />
                          Unavailable
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Vendor Items */}
                  <div className="p-3 divide-y divide-stone-100">
                    {group.items.map((item) => {
                      const price =
                        item.product.salePrice && item.product.salePrice > 0
                          ? item.product.salePrice
                          : item.product.price;
                      const itemTotal = price * item.quantity;

                      return (
                        <div key={item.product.id} className="py-2.5 first:pt-0 last:pb-0 flex gap-3">
                          <img
                            src={
                              item.product.images?.[0] ||
                              'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=800&q=80'
                            }
                            alt={item.product.name}
                            className="w-14 h-14 rounded-xl object-cover border border-stone-200 shrink-0"
                          />
                          <div className="flex-1 min-w-0 flex flex-col justify-between">
                            <div>
                              <div className="flex items-start justify-between gap-2">
                                <h5 className="font-bold text-xs text-stone-900 line-clamp-1">
                                  {item.product.name}
                                </h5>
                                <button
                                  type="button"
                                  onClick={() => removeFromCart(item.product.id)}
                                  className="text-stone-300 hover:text-rose-600 transition"
                                  aria-label="Remove item"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              <span className="text-[11px] text-stone-500 font-medium">
                                {item.selectedWeight || item.product.weight}
                              </span>
                            </div>

                            <div className="flex items-center justify-between pt-1">
                              <div className="flex items-center bg-stone-100 rounded-lg overflow-hidden border border-stone-200">
                                <button
                                  id={`cart-decrease-${item.product.id}`}
                                  type="button"
                                  onClick={() => decrease(item.product.id)}
                                  className="p-1 hover:bg-stone-200 transition text-stone-600 cursor-pointer"
                                  aria-label="Decrease quantity"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="px-2 font-bold text-xs text-stone-800">
                                  {item.quantity}
                                </span>
                                <button
                                  id={`cart-increase-${item.product.id}`}
                                  type="button"
                                  onClick={() => increase(item.product.id)}
                                  disabled={item.quantity >= (item.product.stockQuantity ?? 10)}
                                  className="p-1 hover:bg-stone-200 disabled:opacity-40 disabled:cursor-not-allowed transition text-stone-600 cursor-pointer"
                                  aria-label="Increase quantity"
                                  title={
                                    item.quantity >= (item.product.stockQuantity ?? 10)
                                      ? 'Maximum available stock reached'
                                      : 'Increase quantity'
                                  }
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                              <div className="text-right">
                                <span className="font-bold text-xs text-stone-900">₹{itemTotal}</span>
                                {item.quantity >= (item.product.stockQuantity ?? 10) && (
                                  <p className="text-[10px] text-amber-700 font-semibold">Max in stock</p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Vendor Footer Breakdown */}
                  <div className="bg-stone-50/50 px-3.5 py-2 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-600">
                    <div className="flex items-center gap-2">
                      <span>Subtotal: <strong className="text-stone-800">₹{group.subtotal}</strong></span>
                      {group.discount > 0 && (
                        <span className="text-emerald-700 font-medium">(-₹{group.discount})</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span>Delivery:</span>
                      <strong className={group.deliveryFee === 0 ? 'text-emerald-700' : 'text-stone-800'}>
                        {group.deliveryFee === 0 ? 'FREE' : `₹${group.deliveryFee}`}
                      </strong>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer with Coupon & Checkout */}
          {items.length > 0 && (
            <div className="p-4 border-t border-stone-200 bg-stone-50/50 space-y-3">
              {/* Coupon input */}
              <div className="space-y-1.5">
                {couponCode ? (
                  <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-xs">
                    <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span>Coupon: {couponCode} applied</span>
                    </div>
                    <button
                      type="button"
                      onClick={removeCoupon}
                      className="text-stone-400 hover:text-rose-600 text-xs font-semibold"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Tag className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          value={promoInput ?? ''}
                          onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                          placeholder="Coupon code (e.g. WELCOMEPURE)"
                          className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-stone-300 text-xs uppercase font-mono tracking-wider focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleApplyPromo()}
                        disabled={isApplyingCoupon || !promoInput.trim()}
                        className="bg-stone-900 hover:bg-stone-800 text-white px-3 py-1.5 rounded-xl text-xs font-semibold transition disabled:opacity-50"
                      >
                        {isApplyingCoupon ? 'Applying...' : 'Apply'}
                      </button>
                    </div>

                    {/* Quick coupon suggestions */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <button
                        type="button"
                        onClick={() => handleApplyPromo('WELCOMEPURE')}
                        className="text-[10px] bg-amber-100 hover:bg-amber-200 text-amber-900 px-2 py-1 rounded-md font-semibold font-mono touch-manipulation"
                      >
                        WELCOMEPURE (15% OFF)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyPromo('FESTIVAL50')}
                        className="text-[10px] bg-amber-100 hover:bg-amber-200 text-amber-900 px-2 py-1 rounded-md font-semibold font-mono touch-manipulation"
                      >
                        FESTIVAL50 (₹50 OFF)
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Bill Details */}
              <div className="p-3 rounded-xl bg-white border border-stone-200 text-xs space-y-1.5">
                <div className="flex justify-between text-stone-600">
                  <span>Items Subtotal</span>
                  <span className="font-semibold text-stone-900">₹{subtotal.toFixed(0)}</span>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span className="flex items-center gap-1">
                    Delivery Partner Fee
                    {deliveryFee === 0 && (
                      <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 rounded">
                        FREE
                      </span>
                    )}
                  </span>
                  <span className="font-semibold text-stone-900">
                    {deliveryFee === 0 ? '₹0' : `₹${deliveryFee}`}
                  </span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-medium">
                    <span>Promotional Discount</span>
                    <span>-₹{discount}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-stone-100 flex justify-between font-bold text-sm text-stone-900">
                  <span>Total Amount</span>
                  <span className="text-base font-serif">₹{total.toFixed(0)}</span>
                </div>
              </div>

              {/* Delivery ETA info */}
              <div className="flex items-center gap-1 text-[11px] text-stone-500">
                <Truck className="w-3.5 h-3.5 text-emerald-600" />
                <span>
                  Delivering to <strong className="font-mono">{pincode}</strong> in ~{estimatedDeliveryTime}
                </span>
              </div>

              {/* Authentication Requirement Reminder for Guests */}
              {!user && (
                <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-950 text-xs shadow-2xs">
                  <Lock className="w-4 h-4 text-amber-700 shrink-0" />
                  <div className="leading-tight">
                    <p className="font-bold">Sign In / Create Account Zaroori Hai</p>
                    <p className="text-[11px] text-amber-800">
                      Order karne ke liye please account create karein ya sign in karein.
                    </p>
                  </div>
                </div>
              )}

              {/* Proceed to Checkout button */}
              <button
                id="proceed-to-checkout-btn"
                type="button"
                onClick={() => {
                  if (!user) {
                    showToast('Order karne ke liye please account create karein ya sign in karein.', 'info');
                    setIsCartOpen(false);
                    openAuthModal('login');
                    return;
                  }
                  setIsCartOpen(false);
                  onProceedToCheckout();
                }}
                className="w-full bg-amber-800 hover:bg-amber-900 text-white font-bold py-3.5 px-5 rounded-xl text-sm transition shadow-xs flex items-center justify-between cursor-pointer active:scale-[0.98] min-h-[46px]"
              >
                <span className="flex items-center gap-1.5 font-semibold">
                  {!user && <Lock className="w-4 h-4 text-amber-300" />}
                  <span>{user ? 'Proceed to Checkout' : 'Sign In to Place Order'}</span>
                </span>
                <span className="flex items-center gap-1 font-serif text-base font-bold">
                  ₹{total.toFixed(0)} <ArrowRight className="w-4 h-4" />
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
