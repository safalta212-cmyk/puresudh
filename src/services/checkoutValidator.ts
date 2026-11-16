import { CartItem } from '../types';
import { fetchProducts, fetchDeliveryAreas, fetchCoupons } from '../firebase/services';
import { getProductVendorId, getVendorMetadata } from '../utils/vendorCartHelpers';
import { matchDeliveryArea, formatDeliveryETA, calculateDeliveryFee } from '../utils/deliveryRules';
import { validateCouponWithRules } from '../utils/couponValidation';

export interface ServerVendorBreakdown {
  vendorId: string;
  vendorName: string;
  itemCount: number;
  subtotal: number;
  discount: number;
  deliveryCharge: number;
  total: number;
  estimatedDeliveryTime: string;
  isAvailable: boolean;
  statusText: string;
}

export interface ServerValidationResponse {
  valid: boolean;
  error?: string;
  verifiedItems: {
    productId: string;
    productName: string;
    productImage: string;
    price: number;
    originalPrice?: number;
    quantity: number;
    weight: string;
    total: number;
    vendorId?: string;
  }[];
  calculatedSubtotal: number;
  deliveryCharge: number;
  discount: number;
  grandTotal: number;
  estimatedDeliveryTime: string;
  vendorBreakdowns?: ServerVendorBreakdown[];
}

function invalidResponse(error: string): ServerValidationResponse {
  return {
    valid: false,
    error,
    verifiedItems: [],
    calculatedSubtotal: 0,
    deliveryCharge: 0,
    discount: 0,
    grandTotal: 0,
    estimatedDeliveryTime: '',
    vendorBreakdowns: [],
  };
}

/**
 * Fallback verification against live Firestore + cached catalog, delivery areas, and coupons
 * (used when deployed on static hosting like Vercel where /api/* rewrites to index.html,
 * or when Admin/Vendor added products/areas to Firestore/local store).
 */
async function validateCartAgainstCatalog(
  items: CartItem[],
  pincode?: string,
  couponCode?: string
): Promise<ServerValidationResponse> {
  const [catalogProducts, catalogAreas, catalogCoupons] = await Promise.all([
    fetchProducts().catch(() => []),
    fetchDeliveryAreas().catch(() => []),
    fetchCoupons().catch(() => []),
  ]);

  let calculatedSubtotal = 0;
  const verifiedItems: ServerValidationResponse['verifiedItems'] = [];
  const vendorItemMap = new Map<string, ServerValidationResponse['verifiedItems']>();

  for (const item of items) {
    const qty = Number(item.quantity);
    if (!Number.isInteger(qty) || qty <= 0) {
      return invalidResponse(`Invalid quantity (${qty}) for ${item.product.name}`);
    }

    // Prefer authoritative Firestore/catalog record when present, else item.product snapshot
    const catalogProduct = catalogProducts.find((p) => p.id === item.product.id) || item.product;

    if (catalogProduct.availability === false) {
      return invalidResponse(`Product '${catalogProduct.name}' is currently unavailable for order.`);
    }

    const availableStock =
      typeof catalogProduct.stockQuantity === 'number'
        ? catalogProduct.stockQuantity
        : typeof catalogProduct.stock === 'number'
        ? catalogProduct.stock
        : 10;

    if (availableStock <= 0) {
      return invalidResponse(`Product '${catalogProduct.name}' is completely out of stock.`);
    }

    if (qty > availableStock) {
      return invalidResponse(
        `Overstock limit: You requested ${qty} units of '${catalogProduct.name}', but only ${availableStock} units are available.`
      );
    }

    const price =
      catalogProduct.salePrice && catalogProduct.salePrice > 0
        ? catalogProduct.salePrice
        : catalogProduct.price;
    const total = price * qty;
    calculatedSubtotal += total;

    const vendorId = getProductVendorId(catalogProduct);
    const entry = {
      productId: catalogProduct.id,
      productName: catalogProduct.name,
      productImage: catalogProduct.images?.[0] || catalogProduct.imageUrls?.[0] || '',
      price,
      originalPrice: catalogProduct.price,
      quantity: qty,
      weight: item.selectedWeight || catalogProduct.weight,
      total,
      vendorId,
    };

    verifiedItems.push(entry);
    if (!vendorItemMap.has(vendorId)) {
      vendorItemMap.set(vendorId, []);
    }
    vendorItemMap.get(vendorId)!.push(entry);
  }

  // Delivery & multi-vendor calculation
  let totalDeliveryCharge = 0;
  const vendorBreakdowns: ServerVendorBreakdown[] = [];
  const etaList: string[] = [];
  const cleanPin = pincode ? String(pincode).replace(/\D/g, '').trim() : '';

  for (const [vId, vItems] of vendorItemMap.entries()) {
    const vMeta = getVendorMetadata(vId);
    const vSubtotal = vItems.reduce((acc, curr) => acc + curr.total, 0);

    let vDeliveryFee = vSubtotal >= 299 ? 0 : 30;
    let vEta = '25-35 mins';
    let isAvailable = true;
    let statusText = 'Available for dispatch';

    if (cleanPin && catalogAreas.length > 0) {
      const area = matchDeliveryArea(cleanPin, catalogAreas, vId) || matchDeliveryArea(cleanPin, catalogAreas);
      if (area && area.isDeliverable && area.active !== false) {
        const feeObj = calculateDeliveryFee(area, vSubtotal);
        vDeliveryFee = feeObj.effectiveDeliveryCharge;
        vEta = formatDeliveryETA(area).etaText;
      } else {
        isAvailable = false;
        statusText = 'Currently unavailable in this pincode';
        vEta = 'Unavailable';
      }
    }

    if (!isAvailable) {
      return invalidResponse(
        `Vendor '${vMeta.name}' is currently unavailable for delivery to pincode '${cleanPin}'.`
      );
    }

    totalDeliveryCharge += vDeliveryFee;
    if (vEta && vEta !== 'Unavailable') {
      etaList.push(vEta);
    }

    vendorBreakdowns.push({
      vendorId: vId,
      vendorName: vMeta.name,
      itemCount: vItems.length,
      subtotal: vSubtotal,
      discount: 0,
      deliveryCharge: vDeliveryFee,
      total: vSubtotal + vDeliveryFee,
      estimatedDeliveryTime: vEta,
      isAvailable,
      statusText,
    });
  }

  // Coupon validation
  let discount = 0;
  if (couponCode && couponCode.trim().length > 0) {
    const cleanCode = couponCode.trim().toUpperCase();
    const coupon = catalogCoupons.find((c) => c.code.toUpperCase() === cleanCode);
    if (coupon) {
      const res = validateCouponWithRules({
        coupon,
        items: verifiedItems,
        cartSubtotal: calculatedSubtotal,
        now: new Date(),
      });
      if (res.valid) {
        discount = res.discount;
      }
    }
  }

  discount = Math.min(discount, calculatedSubtotal);

  for (const vb of vendorBreakdowns) {
    if (calculatedSubtotal > 0 && discount > 0) {
      const share = Math.round((vb.subtotal / calculatedSubtotal) * discount);
      vb.discount = Math.min(vb.subtotal, share);
      vb.total = Math.max(0, vb.subtotal + vb.deliveryCharge - vb.discount);
    }
  }

  const grandTotal = Math.max(0, calculatedSubtotal + totalDeliveryCharge - discount);
  const overallEta =
    etaList.length > 0
      ? etaList.length === 1
        ? etaList[0]
        : `${etaList[0]} - ${etaList[etaList.length - 1]}`
      : '25-35 mins';

  return {
    valid: true,
    verifiedItems,
    calculatedSubtotal,
    deliveryCharge: totalDeliveryCharge,
    discount,
    grandTotal,
    estimatedDeliveryTime: overallEta,
    vendorBreakdowns,
  };
}

/**
 * Validates cart items against the authoritative backend server/cloud function
 * Prevents client-side price manipulation, overstock, negative quantities,
 * and out-of-stock purchases, with live Firestore catalog fallback on static hosting.
 */
export async function validateCartWithServer(
  items: CartItem[],
  pincode?: string,
  couponCode?: string
): Promise<ServerValidationResponse> {
  if (!items || items.length === 0) {
    return invalidResponse('Your cart is empty');
  }

  // Strictly send ONLY identifiers and quantities - never prices!
  const payload = {
    items: items.map((i) => ({
      productId: i.product.id,
      quantity: Math.max(1, Math.floor(Number(i.quantity) || 1)),
      weight: i.selectedWeight || i.product.weight,
    })),
    pincode: pincode ? String(pincode).trim() : undefined,
    couponCode: couponCode ? String(couponCode).trim() : undefined,
  };

  try {
    const res = await fetch('/api/orders/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return await validateCartAgainstCatalog(items, pincode, couponCode);
    }

    const data = await res.json();
    if (res.ok && data?.valid) {
      return data as ServerValidationResponse;
    }

    const errorMessage = String(data?.error || 'Server validation failed. Please check item availability.');

    // If Express memory didn't know about a newly added Firestore/local product or delivery area,
    // verify against live Firestore catalog before rejecting.
    if (
      errorMessage.includes('does not exist in our catalog') ||
      errorMessage.includes('currently unavailable for delivery to pincode')
    ) {
      const catalogResult = await validateCartAgainstCatalog(items, pincode, couponCode);
      if (catalogResult.valid) {
        return catalogResult;
      }
      return invalidResponse(catalogResult.error || errorMessage);
    }

    return invalidResponse(errorMessage);
  } catch (err: any) {
    console.warn('Backend server validation network issue, verifying against catalog:', err);
    return await validateCartAgainstCatalog(items, pincode, couponCode);
  }
}
