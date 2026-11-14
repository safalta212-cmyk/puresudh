import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { Product, CartItem } from '../types';
import { useAuth } from './AuthContext';
import { useDelivery } from './DeliveryContext';
import { useToast } from './ToastContext';
import { fetchCoupons } from '../firebase/services';
import { validateCouponWithRules } from '../utils/couponValidation';
import {
  fetchUserCart,
  saveUserCart,
  deleteUserCart,
  mergeGuestCartWithCustomerCart,
} from '../firebase/cartWishlistService';
import {
  validateCartWithServer,
  ServerValidationResponse,
} from '../services/checkoutValidator';
import { groupCartByVendor, VendorCartGroup } from '../utils/vendorCartHelpers';

interface CartContextType {
  items: CartItem[];
  vendorGroups: VendorCartGroup[];
  isMultiVendor: boolean;
  itemCount: number;
  subtotal: number;
  deliveryFee: number;
  discount: number;
  couponCode: string;
  total: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  addToCart: (product: Product, quantity?: number, selectedWeight?: string) => Promise<boolean>;
  removeFromCart: (productId: string) => Promise<void>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  increase: (productId: string) => Promise<void>;
  decrease: (productId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  applyCoupon: (code: string) => Promise<boolean>;
  removeCoupon: () => void;
  isSyncing: boolean;
  syncStatus: 'synced' | 'syncing' | 'guest';
  validateServerCart: (pincode?: string) => Promise<ServerValidationResponse>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const GUEST_CART_STORAGE_KEY = 'pure_sudh_cart';
const GUEST_COUPON_STORAGE_KEY = 'pure_sudh_coupon';

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { deliveryCharge, freeDeliveryThreshold, pincode, allAreas } = useDelivery();
  const { showToast } = useToast();

  // Active items in cart
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(GUEST_CART_STORAGE_KEY);
      if (!saved || saved === 'null' || saved === 'undefined') return [];
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const [couponCode, setCouponCode] = useState<string>(() => {
    return localStorage.getItem(GUEST_COUPON_STORAGE_KEY) || '';
  });
  const [discount, setDiscount] = useState<number>(0);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'guest'>(
    user ? 'synced' : 'guest'
  );

  // Track the previous user ID to identify login / logout transitions
  const prevUserIdRef = useRef<string | null>(user?.uid || null);
  const isInitialMount = useRef(true);

  // Helper to persist current cart to cloud (if authenticated) or localStorage (if guest)
  const persistCart = useCallback(
    async (currentItems: CartItem[], currentCoupon: string = couponCode) => {
      if (user?.uid) {
        setSyncStatus('syncing');
        try {
          await saveUserCart(user.uid, currentItems, currentCoupon);
          setSyncStatus('synced');
        } catch (err) {
          console.warn('Could not sync cart to Firestore:', err);
          setSyncStatus('synced');
        }
      } else {
        try {
          localStorage.setItem(GUEST_CART_STORAGE_KEY, JSON.stringify(currentItems));
          setSyncStatus('guest');
        } catch (e) {
          console.warn('LocalStorage error:', e);
        }
      }
    },
    [user?.uid, couponCode]
  );

  // Synchronize when authentication state transitions (Guest -> Logged In -> Logged Out)
  useEffect(() => {
    const handleAuthTransition = async () => {
      const currentUid = user?.uid || null;
      const prevUid = prevUserIdRef.current;

      // 1. User just logged in (from guest or different account)
      if (currentUid && currentUid !== prevUid) {
        setIsSyncing(true);
        setSyncStatus('syncing');

        try {
          // Check for any guest items in localStorage
          let guestCart: CartItem[] = [];
          try {
            const raw = localStorage.getItem(GUEST_CART_STORAGE_KEY);
            if (raw && raw !== 'null') {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed) && parsed.length > 0) {
                guestCart = parsed;
              }
            }
          } catch {
            guestCart = [];
          }

          if (guestCart.length > 0) {
            // Safely merge guest cart into Firebase customer cart
            const merged = await mergeGuestCartWithCustomerCart(currentUid, guestCart);
            setItems(merged);
            showToast('Guest cart merged with your Pure Sudh account!', 'success');
          } else {
            // Load existing user cart from Firestore
            const cloudCart = await fetchUserCart(currentUid);
            if (cloudCart) {
              setItems(cloudCart.items);
              if (cloudCart.couponCode) {
                setCouponCode(cloudCart.couponCode);
              }
            }
          }
        } catch (err) {
          console.warn('Error synchronizing customer cart:', err);
        } finally {
          setIsSyncing(false);
          setSyncStatus('synced');
        }
      } else if (!currentUid && prevUid) {
        // 2. User logged out: clear memory cart so next guest starts with fresh or cached guest cart
        try {
          const raw = localStorage.getItem(GUEST_CART_STORAGE_KEY);
          const parsed = raw ? JSON.parse(raw) : [];
          setItems(Array.isArray(parsed) ? parsed : []);
        } catch {
          setItems([]);
        }
        setSyncStatus('guest');
      }

      prevUserIdRef.current = currentUid;
    };

    if (isInitialMount.current) {
      isInitialMount.current = false;
      if (user?.uid) {
        handleAuthTransition();
      }
      return;
    }

    handleAuthTransition();
  }, [user?.uid]);

  // Synchronize coupon to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(GUEST_COUPON_STORAGE_KEY, couponCode);
    } catch {
      // ignore
    }
  }, [couponCode]);

  // Recalculate subtotal
  const subtotal = items.reduce((sum, item) => {
    const price =
      item.product.salePrice && item.product.salePrice > 0
        ? item.product.salePrice
        : item.product.price;
    return sum + price * item.quantity;
  }, 0);

  // Group cart items by vendor with server-authoritative delivery rules
  const vendorGroups = groupCartByVendor(items, pincode, allAreas, discount);
  const isMultiVendor = vendorGroups.length > 1;

  // Calculate delivery fee (sum of vendor delivery fees if multi-vendor, or platform rule)
  const deliveryFee =
    items.length === 0
      ? 0
      : isMultiVendor
      ? vendorGroups.reduce((acc, g) => acc + (g.isDeliverable ? g.deliveryFee : 0), 0)
      : subtotal >= freeDeliveryThreshold
      ? 0
      : deliveryCharge;

  // Re-evaluate discount whenever subtotal or couponCode changes
  useEffect(() => {
    if (!couponCode) {
      setDiscount(0);
      return;
    }
    const checkCoupon = async () => {
      try {
        const coupons = await fetchCoupons();
        const found = coupons.find(
          (c) => c.code.toUpperCase() === couponCode.trim().toUpperCase() && c.active
        );
        if (found && subtotal >= found.minOrderAmount) {
          if (found.discountType === 'percentage') {
            const calculated = Math.round((subtotal * found.discountValue) / 100);
            setDiscount(found.maxDiscount ? Math.min(found.maxDiscount, calculated) : calculated);
          } else {
            setDiscount(found.discountValue);
          }
        } else {
          setDiscount(0);
        }
      } catch {
        setDiscount(0);
      }
    };
    checkCoupon();
  }, [couponCode, subtotal]);

  const total = Math.max(0, subtotal + deliveryFee - discount);
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  // Cart operations
  const addToCart = async (
    product: Product,
    quantity = 1,
    selectedWeight?: string
  ): Promise<boolean> => {
    // 1. Prevent negative or zero quantity
    if (quantity <= 0) {
      showToast('Quantity must be at least 1', 'error');
      return false;
    }

    // 2. Prevent adding unavailable product
    if (product.availability === false) {
      showToast(`${product.name} is currently out of stock`, 'error');
      return false;
    }

    const availableStock = Math.max(0, product.stockQuantity ?? 10);
    if (availableStock <= 0) {
      showToast(`${product.name} is currently out of stock`, 'error');
      return false;
    }

    let updatedList: CartItem[] = [];
    const existing = items.find((i) => i.product.id === product.id);

    if (existing) {
      const newQty = existing.quantity + quantity;
      // 3. Prevent overstock
      if (newQty > availableStock) {
        showToast(
          `Only ${availableStock} units available for ${product.name}. Adjusted to maximum stock.`,
          'info'
        );
        updatedList = items.map((i) =>
          i.product.id === product.id ? { ...i, quantity: availableStock } : i
        );
      } else {
        updatedList = items.map((i) =>
          i.product.id === product.id ? { ...i, quantity: newQty } : i
        );
        showToast(`Added ${quantity} more ${product.name} to cart`, 'success');
      }
    } else {
      const initialQty = Math.min(quantity, availableStock);
      if (quantity > availableStock) {
        showToast(`Only ${availableStock} units available for ${product.name}`, 'info');
      } else {
        showToast(`Added ${product.name} to cart`, 'success');
      }
      updatedList = [
        ...items,
        {
          product,
          quantity: initialQty,
          selectedWeight: selectedWeight || product.weight,
        },
      ];
    }

    setItems(updatedList);
    await persistCart(updatedList);
    return true;
  };

  const removeFromCart = async (productId: string): Promise<void> => {
    const updated = items.filter((i) => i.product.id !== productId);
    setItems(updated);
    await persistCart(updated);
    showToast('Item removed from cart', 'info');
  };

  const updateQuantity = async (productId: string, requestedQuantity: number): Promise<void> => {
    // If quantity is zero or negative, remove the item
    if (requestedQuantity <= 0) {
      await removeFromCart(productId);
      return;
    }

    const targetItem = items.find((i) => i.product.id === productId);
    if (!targetItem) return;

    const maxStock = Math.max(1, targetItem.product.stockQuantity ?? 10);
    let finalQty = requestedQuantity;

    // Prevent overstock
    if (requestedQuantity > maxStock) {
      finalQty = maxStock;
      showToast(`Maximum ${maxStock} units available for ${targetItem.product.name}`, 'info');
    }

    const updated = items.map((i) => (i.product.id === productId ? { ...i, quantity: finalQty } : i));
    setItems(updated);
    await persistCart(updated);
  };

  const increase = async (productId: string): Promise<void> => {
    const item = items.find((i) => i.product.id === productId);
    if (!item) return;
    await updateQuantity(productId, item.quantity + 1);
  };

  const decrease = async (productId: string): Promise<void> => {
    const item = items.find((i) => i.product.id === productId);
    if (!item) return;
    await updateQuantity(productId, item.quantity - 1);
  };

  const clearCart = async (): Promise<void> => {
    setItems([]);
    setCouponCode('');
    setDiscount(0);

    if (user?.uid) {
      await deleteUserCart(user.uid);
    } else {
      localStorage.removeItem(GUEST_CART_STORAGE_KEY);
      localStorage.removeItem(GUEST_COUPON_STORAGE_KEY);
    }
    showToast('Cart cleared', 'info');
  };

  const applyCoupon = async (code: string): Promise<boolean> => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return false;

    try {
      const coupons = await fetchCoupons();
      const match = coupons.find((c) => c.code.toUpperCase() === trimmed);

      if (!match) {
        showToast(`Invalid coupon code "${trimmed}"`, 'error');
        return false;
      }

      const validation = validateCouponWithRules({
        coupon: match,
        items,
        cartSubtotal: subtotal,
        userId: user?.uid,
        userOrderCount: (user as any)?.orderCount || 0,
        now: new Date(),
      });

      if (!validation.valid) {
        showToast(validation.error || 'Coupon cannot be applied', 'error');
        return false;
      }

      setCouponCode(match.code);
      setDiscount(validation.discount);
      showToast(validation.savingsText || `Coupon applied! You saved ₹${validation.discount}`, 'success');

      if (user?.uid) {
        await saveUserCart(user.uid, items, match.code);
      }
      return true;
    } catch {
      showToast('Could not validate coupon', 'error');
      return false;
    }
  };

  const removeCoupon = () => {
    setCouponCode('');
    setDiscount(0);
    showToast('Coupon removed', 'info');
    if (user?.uid) {
      saveUserCart(user.uid, items, '');
    }
  };

  const validateServerCart = async (targetPincode?: string): Promise<ServerValidationResponse> => {
    return await validateCartWithServer(items, targetPincode || pincode, couponCode);
  };

  return (
    <CartContext.Provider
      value={{
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
        addToCart,
        removeFromCart,
        updateQuantity,
        increase,
        decrease,
        clearCart,
        applyCoupon,
        removeCoupon,
        isSyncing,
        syncStatus,
        validateServerCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
