import { Coupon, CartItem, Order } from '../types';

export interface CouponValidationContext {
  coupon: Coupon;
  items: CartItem[] | { productId: string; quantity: number; price: number; categoryId?: string }[];
  cartSubtotal: number;
  userId?: string;
  userOrderCount?: number;
  userCouponUsageCount?: number;
  now?: Date;
}

export interface CouponValidationResult {
  valid: boolean;
  error?: string;
  discount: number;
  couponCode: string;
  description?: string;
  eligibleItemsCount: number;
  eligibleSubtotal: number;
  savingsText?: string;
}

/**
 * Authoritative Coupon Validation and Abuse Prevention Engine
 * Enforces:
 * - Active state
 * - Start & Expiry dates
 * - Global usage limits
 * - Per-customer redemption limits
 * - First-order / New customer restrictions
 * - Product & Category restrictions
 * - Minimum order thresholds
 * - Max discount caps
 */
export function validateCouponWithRules(ctx: CouponValidationContext): CouponValidationResult {
  const {
    coupon,
    items,
    cartSubtotal,
    userOrderCount = 0,
    userCouponUsageCount = 0,
    now = new Date(),
  } = ctx;

  const code = coupon.code.toUpperCase().trim();

  // 1. Check Active Status
  if (!coupon.active) {
    return {
      valid: false,
      error: `Coupon "${code}" is currently inactive.`,
      discount: 0,
      couponCode: code,
      eligibleItemsCount: 0,
      eligibleSubtotal: 0,
    };
  }

  // 2. Check Start Date
  const startDateStr = coupon.startDate || coupon.validFrom;
  if (startDateStr) {
    const startDate = new Date(startDateStr);
    if (!isNaN(startDate.getTime()) && now < startDate) {
      return {
        valid: false,
        error: `Coupon "${code}" is not active yet. It begins on ${startDate.toLocaleDateString('en-IN')}.`,
        discount: 0,
        couponCode: code,
        eligibleItemsCount: 0,
        eligibleSubtotal: 0,
      };
    }
  }

  // 3. Check Expiry Date
  const expiryDateStr = coupon.expiryDate || coupon.validTill || coupon.validUntil;
  if (expiryDateStr) {
    const expiryDate = new Date(expiryDateStr);
    // If only YYYY-MM-DD was provided, set to end of that day (23:59:59)
    if (expiryDateStr.length === 10) {
      expiryDate.setHours(23, 59, 59, 999);
    }
    if (!isNaN(expiryDate.getTime()) && now > expiryDate) {
      return {
        valid: false,
        error: `Coupon "${code}" has expired on ${expiryDate.toLocaleDateString('en-IN')}.`,
        discount: 0,
        couponCode: code,
        eligibleItemsCount: 0,
        eligibleSubtotal: 0,
      };
    }
  }

  // 4. Check Global Usage Limit (abuse prevention)
  if (typeof coupon.usageLimit === 'number' && coupon.usageLimit > 0) {
    if ((coupon.usageCount || 0) >= coupon.usageLimit) {
      return {
        valid: false,
        error: `Coupon "${code}" has reached its maximum total redemption limit.`,
        discount: 0,
        couponCode: code,
        eligibleItemsCount: 0,
        eligibleSubtotal: 0,
      };
    }
  }

  // 5. Check Per-Customer Usage Limit (abuse prevention)
  const perCustomerLimit = coupon.perCustomerLimit || coupon.perUserLimit || (code === 'FIRSTORDER' ? 1 : undefined);
  if (typeof perCustomerLimit === 'number' && perCustomerLimit > 0) {
    if (userCouponUsageCount >= perCustomerLimit) {
      return {
        valid: false,
        error: `You have already redeemed coupon "${code}" the maximum allowed ${perCustomerLimit} time(s).`,
        discount: 0,
        couponCode: code,
        eligibleItemsCount: 0,
        eligibleSubtotal: 0,
      };
    }
  }

  // 6. Check First-Order Only Restriction (abuse prevention)
  const isFirstOrderOnly = coupon.firstOrderOnly || code === 'FIRSTORDER';
  if (isFirstOrderOnly && userOrderCount > 0) {
    return {
      valid: false,
      error: `Coupon "${code}" is exclusively reserved for first-time customers on their first order.`,
      discount: 0,
      couponCode: code,
      eligibleItemsCount: 0,
      eligibleSubtotal: 0,
    };
  }

  // 7. Check Product Restrictions
  const prodRestrictions = coupon.productRestrictions || [];
  const catRestrictions = coupon.categoryRestrictions || [];

  let eligibleItems = [...items];

  if (prodRestrictions.length > 0) {
    eligibleItems = eligibleItems.filter((i) => {
      const pid = 'product' in i ? i.product.id : i.productId;
      return prodRestrictions.includes(pid);
    });

    if (eligibleItems.length === 0) {
      return {
        valid: false,
        error: `Coupon "${code}" is only valid for specific promotional products not currently in your cart.`,
        discount: 0,
        couponCode: code,
        eligibleItemsCount: 0,
        eligibleSubtotal: 0,
      };
    }
  }

  // 8. Check Category Restrictions
  if (catRestrictions.length > 0) {
    eligibleItems = eligibleItems.filter((i) => {
      const cid = 'product' in i ? i.product.categoryId : i.categoryId;
      return cid && catRestrictions.includes(cid);
    });

    if (eligibleItems.length === 0) {
      return {
        valid: false,
        error: `Coupon "${code}" is only applicable to products within selected categories.`,
        discount: 0,
        couponCode: code,
        eligibleItemsCount: 0,
        eligibleSubtotal: 0,
      };
    }
  }

  // Compute eligible subtotal
  const eligibleSubtotal = eligibleItems.reduce((acc, i) => {
    if ('product' in i) {
      const price = i.product.salePrice && i.product.salePrice > 0 ? i.product.salePrice : i.product.price;
      return acc + price * i.quantity;
    }
    return acc + i.price * i.quantity;
  }, 0);

  // 9. Check Minimum Order Amount
  const minOrder = coupon.minOrderAmount || coupon.minimumOrder || 0;
  if (minOrder > 0 && cartSubtotal < minOrder) {
    const diff = minOrder - cartSubtotal;
    return {
      valid: false,
      error: `Coupon "${code}" requires a minimum order of ₹${minOrder}. Add ₹${diff} more to apply.`,
      discount: 0,
      couponCode: code,
      eligibleItemsCount: eligibleItems.length,
      eligibleSubtotal,
    };
  }

  // 10. Calculate Discount
  let discount = 0;
  const discountBase = (prodRestrictions.length > 0 || catRestrictions.length > 0) ? eligibleSubtotal : cartSubtotal;

  if (coupon.discountType === 'percentage') {
    discount = Math.round((discountBase * coupon.discountValue) / 100);
    if (coupon.maxDiscount && coupon.maxDiscount > 0) {
      discount = Math.min(discount, coupon.maxDiscount);
    }
  } else {
    // Flat / fixed discount
    discount = coupon.discountValue;
  }

  // Ensure discount does not exceed the eligible base or cart subtotal
  discount = Math.max(0, Math.min(discount, discountBase));

  return {
    valid: true,
    discount,
    couponCode: code,
    description: coupon.description,
    eligibleItemsCount: eligibleItems.length,
    eligibleSubtotal,
    savingsText: `You saved ₹${discount} with ${code}!`,
  };
}
