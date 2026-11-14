import React from 'react';
import {
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Truck,
  Store,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { CartItem } from '../../../types';
import { groupCartByVendor } from '../../../utils/vendorCartHelpers';
import { useDelivery } from '../../../context/DeliveryContext';

interface CartStepProps {
  items: CartItem[];
  subtotal: number;
  onUpdateQuantity: (productId: string, quantity: number, weight?: string) => void;
  onRemoveItem: (productId: string, weight?: string) => void;
  onProceedToAddress: () => void;
  onContinueShopping: () => void;
  freeDeliveryThreshold: number;
}

export const CartStep: React.FC<CartStepProps> = ({
  items,
  subtotal,
  onUpdateQuantity,
  onRemoveItem,
  onProceedToAddress,
  onContinueShopping,
  freeDeliveryThreshold,
}) => {
  const { pincode, allAreas } = useDelivery();
  const vendorGroups = groupCartByVendor(items, pincode, allAreas);

  if (!items || items.length === 0) {
    return (
      <div className="py-16 px-4 text-center max-w-md mx-auto">
        <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center mx-auto mb-4">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-stone-900 mb-2">Your Cart is Empty</h3>
        <p className="text-sm text-stone-500 mb-6">
          Add some delicious fresh sweets, snacks, or pure ghee to proceed with checkout.
        </p>
        <button
          onClick={onContinueShopping}
          className="py-3 px-6 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-bold text-sm shadow-md transition-colors"
        >
          Explore Fresh Products
        </button>
      </div>
    );
  }

  const freeDeliveryRemaining = Math.max(0, freeDeliveryThreshold - subtotal);
  const freeDeliveryProgress = Math.min(100, Math.round((subtotal / freeDeliveryThreshold) * 100));

  return (
    <div className="space-y-6">
      {/* Free Delivery Bar */}
      <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-4">
        <div className="flex items-center justify-between text-xs font-bold text-amber-900 mb-2">
          <span className="flex items-center gap-1.5">
            <Truck className="w-4 h-4 text-amber-700" />
            {freeDeliveryRemaining > 0 ? (
              <>Add ₹{freeDeliveryRemaining} more for FREE doorstep delivery</>
            ) : (
              <>Congratulations! You have unlocked FREE doorstep delivery!</>
            )}
          </span>
          <span>{freeDeliveryProgress}%</span>
        </div>
        <div className="w-full bg-amber-200/60 h-2 rounded-full overflow-hidden">
          <div
            className="bg-amber-700 h-full rounded-full transition-all duration-300"
            style={{ width: `${freeDeliveryProgress}%` }}
          />
        </div>
      </div>

      {/* Cart Items List Grouped by Vendor */}
      <div className="space-y-4">
        {vendorGroups.map((group) => (
          <div
            key={group.vendorId}
            className="bg-white rounded-2xl border border-stone-200 shadow-xs divide-y divide-stone-100 overflow-hidden"
          >
            {/* Vendor Header with ETA & Deliverability */}
            <div className="p-4 bg-stone-50/90 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                  <Store className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-stone-900 leading-tight">
                    {group.vendorName}
                  </h4>
                  <p className="text-[11px] text-stone-500">
                    Vendor Partner • {group.items.length} {group.items.length === 1 ? 'item' : 'items'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {group.isDeliverable ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                    <Clock className="w-3.5 h-3.5 text-emerald-600" />
                    ETA: {group.estimatedDeliveryTime}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Unavailable in {pincode}
                  </span>
                )}
              </div>
            </div>

            {/* Vendor Items */}
            {group.items.map((item, idx) => {
              const effectivePrice = item.product.salePrice || item.product.price;
              const itemTotal = effectivePrice * item.quantity;
              const imageSrc = item.product.images?.[0] || item.product.imageUrls?.[0] || '';

              return (
                <div
                  key={`${item.product.id}-${item.selectedWeight || ''}-${idx}`}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-16 h-16 rounded-xl bg-stone-100 border border-stone-200 overflow-hidden shrink-0">
                      <img
                        src={
                          imageSrc ||
                          'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=200&q=80'
                        }
                        alt={item.product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-stone-900 leading-snug">
                        {item.product.name}
                      </h4>
                      <p className="text-xs text-stone-500 mt-0.5">
                        Weight/Pack:{' '}
                        <span className="font-semibold text-stone-700">
                          {item.selectedWeight || item.product.weight}
                        </span>
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm font-extrabold text-stone-900">
                          ₹{effectivePrice}
                        </span>
                        {item.product.salePrice && item.product.salePrice < item.product.price && (
                          <span className="text-xs text-stone-400 line-through">
                            ₹{item.product.price}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Quantity Controls & Total */}
                  <div className="flex items-center justify-between sm:justify-end gap-6 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-100">
                    <div className="flex items-center border border-stone-200 rounded-xl bg-stone-50/70 p-1">
                      <button
                        type="button"
                        onClick={() => {
                          if (item.quantity > 1) {
                            onUpdateQuantity(item.product.id, item.quantity - 1, item.selectedWeight);
                          } else {
                            onRemoveItem(item.product.id, item.selectedWeight);
                          }
                        }}
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white text-stone-700 transition-colors cursor-pointer"
                      >
                        {item.quantity === 1 ? (
                          <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                        ) : (
                          <Minus className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <span className="w-8 text-center text-xs font-bold text-stone-900">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateQuantity(item.product.id, item.quantity + 1, item.selectedWeight)
                        }
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white text-stone-700 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="text-right min-w-[70px]">
                      <p className="text-sm font-extrabold text-stone-900">₹{itemTotal}</p>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Vendor Subtotal & Delivery Breakdown Footer */}
            <div className="p-3.5 bg-stone-50/70 border-t border-stone-200 flex flex-wrap items-center justify-between text-xs text-stone-600 gap-2">
              <div className="flex items-center gap-3">
                <span>Vendor Subtotal: <strong className="text-stone-900">₹{group.subtotal}</strong></span>
                {group.discount > 0 && (
                  <span className="text-emerald-700 font-semibold">Saved ₹{group.discount}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span>Vendor Delivery:</span>
                <span className="font-bold text-stone-900">
                  {group.deliveryFee === 0 ? (
                    <span className="text-emerald-700">FREE</span>
                  ) : (
                    `₹${group.deliveryFee}`
                  )}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Subtotal summary & Continue CTA */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <p className="text-xs text-stone-500 font-medium">Total Cart Subtotal</p>
          <h3 className="text-xl font-extrabold text-stone-900">₹{subtotal}</h3>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={onContinueShopping}
            className="flex-1 sm:flex-initial py-3 px-5 rounded-xl border border-stone-300 hover:bg-stone-50 text-stone-700 font-semibold text-xs transition-colors cursor-pointer text-center"
          >
            Add More Items
          </button>
          <button
            type="button"
            id="proceed-to-address-btn"
            onClick={onProceedToAddress}
            className="flex-1 sm:flex-initial py-3 px-6 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Proceed to Address</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
