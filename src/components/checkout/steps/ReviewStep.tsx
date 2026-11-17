import React from 'react';
import {
  FileCheck,
  MapPin,
  Truck,
  CreditCard,
  ShoppingBag,
  Tag,
  ShieldCheck,
  ChevronLeft,
  Lock,
  RotateCcw,
  Sparkles,
  Store,
  Clock,
  Layers,
} from 'lucide-react';
import { CartItem, PaymentMethod } from '../../../types';
import { groupCartByVendor } from '../../../utils/vendorCartHelpers';
import { useDelivery } from '../../../context/DeliveryContext';

interface ReviewStepProps {
  items: CartItem[];
  deliveryAddress: {
    name: string;
    phone: string;
    pincode: string;
    addressLine: string;
    landmark?: string;
    city: string;
    state: string;
    type?: string;
  };
  deliveryType: 'express' | 'scheduled';
  selectedSlotLabel?: string;
  estimatedDeliveryTime: string;
  couponCode?: string;
  discount: number;
  paymentMethod: PaymentMethod;
  subtotal: number;
  deliveryCharge: number;
  grandTotal: number;
  idempotencyKey: string;
  isPlacingOrder: boolean;
  onBackToPayment: () => void;
  onPlaceOrder: () => void;
}

export const ReviewStep: React.FC<ReviewStepProps> = ({
  items,
  deliveryAddress,
  deliveryType,
  selectedSlotLabel,
  estimatedDeliveryTime,
  couponCode,
  discount,
  paymentMethod,
  subtotal,
  deliveryCharge,
  grandTotal,
  idempotencyKey,
  isPlacingOrder,
  onBackToPayment,
  onPlaceOrder,
}) => {
  const { allAreas } = useDelivery();
  const vendorGroups = groupCartByVendor(items, deliveryAddress.pincode, allAreas, discount);
  const isMultiVendor = vendorGroups.length > 1;
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs">
        <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
          <FileCheck className="w-5 h-5 text-amber-700" />
          Review & Finalize Your Order
        </h3>
        <p className="text-xs text-stone-500 mt-0.5">
          Please check all order details carefully before placing your order.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Details (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          {/* 1. Delivery & Address Summary Card */}
          <div className="bg-white rounded-2xl border border-stone-200 p-4 sm:p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-amber-700" />
                Delivery Address & Contact
              </h4>
              <span className="text-[11px] font-semibold text-stone-500 capitalize bg-stone-100 px-2 py-0.5 rounded-md">
                {deliveryAddress.type || 'Home'}
              </span>
            </div>

            <div className="text-xs space-y-1">
              <p className="font-bold text-stone-900 text-sm">{deliveryAddress.name}</p>
              <p className="text-stone-700">{deliveryAddress.addressLine}</p>
              {deliveryAddress.landmark && (
                <p className="text-stone-500">Landmark: {deliveryAddress.landmark}</p>
              )}
              <p className="text-stone-700">
                {deliveryAddress.city}, {deliveryAddress.state} -{' '}
                <span className="font-mono font-bold text-stone-900">{deliveryAddress.pincode}</span>
              </p>
              <p className="text-stone-600 font-semibold pt-1">Phone: +91 {deliveryAddress.phone}</p>
            </div>

            <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3 text-xs text-amber-900 flex items-center gap-2">
              <Truck className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                Estimated Delivery:{' '}
                <strong className="text-stone-900">{estimatedDeliveryTime}</strong>
                {deliveryType === 'scheduled' && selectedSlotLabel && ` (${selectedSlotLabel})`}
              </span>
            </div>
          </div>

          {/* 2. Items in Order (Grouped by Vendor) */}
          <div className="space-y-4">
            {vendorGroups.map((group) => (
              <div
                key={group.vendorId}
                className="bg-white rounded-2xl border border-stone-200 p-4 sm:p-5 shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Store className="w-4 h-4 text-amber-700" />
                    <span className="text-xs font-bold uppercase tracking-wider text-stone-900">
                      {group.vendorName}
                    </span>
                    <span className="text-[10px] text-stone-400">
                      ({group.items.length} {group.items.length === 1 ? 'item' : 'items'})
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60 font-semibold">
                    <Clock className="w-3 h-3 text-amber-700" />
                    <span>ETA: {group.estimatedDeliveryTime}</span>
                  </div>
                </div>

                <div className="divide-y divide-stone-100">
                  {group.items.map((item, idx) => {
                    const price = item.product.salePrice || item.product.price;
                    const total = price * item.quantity;
                    const img = item.product.images?.[0] || item.product.imageUrls?.[0] || '';

                    return (
                      <div key={idx} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-stone-100 border border-stone-200 overflow-hidden shrink-0">
                            <img
                              src={img || 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=200&q=80'}
                              alt={item.product.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div>
                            <p className="font-bold text-stone-900">{item.product.name}</p>
                            <p className="text-[11px] text-stone-500">
                              {item.selectedWeight || item.product.weight} • Qty: {item.quantity}
                            </p>
                          </div>
                        </div>

                        <div className="text-right font-extrabold text-stone-900">
                          ₹{total}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="bg-stone-50/70 p-2.5 rounded-xl border border-stone-100 flex items-center justify-between text-[11px] text-stone-600">
                  <div className="flex items-center gap-2">
                    <span>Vendor Subtotal: <strong className="text-stone-900">₹{group.subtotal}</strong></span>
                    {group.discount > 0 && (
                      <span className="text-emerald-700 font-semibold">(-₹{group.discount})</span>
                    )}
                  </div>
                  <div>
                    <span>Delivery: </span>
                    <strong className={group.deliveryFee === 0 ? 'text-emerald-700' : 'text-stone-900'}>
                      {group.deliveryFee === 0 ? 'FREE' : `₹${group.deliveryFee}`}
                    </strong>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 3. Payment Method Review */}
          <div className="bg-white rounded-2xl border border-stone-200 p-4 sm:p-5 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                  Payment Method
                </p>
                <p className="text-xs font-bold text-stone-900">{paymentMethod}</p>
              </div>
            </div>

            <div className="text-xs text-stone-500 text-right">
              {paymentMethod === 'Cash on Delivery' ? (
                <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded font-bold">
                  Doorstep Pay
                </span>
              ) : (
                <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">
                  Online Gateway
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Authoritative Bill Breakdown & CTA (1 col) */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm space-y-4 sticky top-20">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700 border-b border-stone-100 pb-2">
              Authoritative Bill Breakdown
            </h4>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-stone-600">
                <span>Items Subtotal</span>
                <span className="font-semibold text-stone-900">₹{subtotal}</span>
              </div>

              <div className="flex justify-between text-stone-600">
                <span>Delivery Charge</span>
                <span>
                  {deliveryCharge === 0 ? (
                    <span className="text-emerald-700 font-bold">FREE</span>
                  ) : (
                    `₹${deliveryCharge}`
                  )}
                </span>
              </div>

              {discount > 0 && (
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span className="flex items-center gap-1">
                    <Tag className="w-3 h-3" />
                    Coupon Savings ({couponCode})
                  </span>
                  <span>-₹{discount}</span>
                </div>
              )}

              <div className="flex justify-between text-stone-500 text-[11px]">
                <span>Desi Ghee Safety Packing</span>
                <span className="text-emerald-700 font-bold">FREE</span>
              </div>

              <div className="border-t border-stone-200 pt-3 flex justify-between items-baseline font-extrabold text-stone-900">
                <span className="text-sm">Final Payable</span>
                <span className="text-xl text-amber-900">₹{grandTotal}</span>
              </div>
            </div>

            {/* Idempotency token security tag */}
            <div className="bg-stone-50 border border-stone-200/80 rounded-xl p-2.5 text-[10px] text-stone-500 space-y-0.5">
              <div className="flex items-center gap-1.5 font-bold text-stone-700">
                <Lock className="w-3 h-3 text-emerald-600" />
                <span>Idempotent Guard Active</span>
              </div>
              <p className="truncate font-mono">Token: {idempotencyKey.slice(0, 18)}...</p>
              <p>Guarantees no duplicate orders or double debits.</p>
            </div>

            {/* Primary Place Order CTA */}
            <button
              type="button"
              id="place-order-submit-btn"
              disabled={isPlacingOrder}
              onClick={onPlaceOrder}
              className="w-full py-3.5 px-4 rounded-xl bg-amber-700 hover:bg-amber-800 disabled:opacity-50 text-white font-extrabold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
            >
              {isPlacingOrder ? (
                <>
                  <RotateCcw className="w-4 h-4 animate-spin" />
                  <span>Processing Secure Order...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Place Order • ₹{grandTotal}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={onBackToPayment}
          disabled={isPlacingOrder}
          className="py-3 px-5 rounded-xl border border-stone-300 hover:bg-stone-100 text-stone-700 font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Payment</span>
        </button>
      </div>
    </div>
  );
};
