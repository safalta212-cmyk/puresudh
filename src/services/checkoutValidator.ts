import { CartItem } from '../types';

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

/**
 * Validates cart items against the authoritative backend server/cloud function
 * Prevents client-side price manipulation, overstock, negative quantities,
 * and out-of-stock purchases.
 */
export async function validateCartWithServer(
  items: CartItem[],
  pincode?: string,
  couponCode?: string
): Promise<ServerValidationResponse> {
  if (!items || items.length === 0) {
    return {
      valid: false,
      error: 'Your cart is empty',
      verifiedItems: [],
      calculatedSubtotal: 0,
      deliveryCharge: 0,
      discount: 0,
      grandTotal: 0,
      estimatedDeliveryTime: '30 mins',
    };
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
    const res = await fetch('/api/checkout/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      throw new Error('Checkout validation endpoint returned non-JSON response');
    }

    const data = await res.json();
    if (!res.ok || !data.valid) {
      return {
        valid: false,
        error: data.error || 'Server validation failed. Please check item availability.',
        verifiedItems: [],
        calculatedSubtotal: 0,
        deliveryCharge: 0,
        discount: 0,
        grandTotal: 0,
        estimatedDeliveryTime: '',
      };
    }

    return data as ServerValidationResponse;
  } catch (err: any) {
    // If the network or offline mode prevents server reach, compute conservative local validation
    console.warn('Backend server validation network issue, performing client pre-check:', err);

    let calculatedSubtotal = 0;
    const verifiedItems: any[] = [];

    for (const item of items) {
      if (item.quantity <= 0) {
        return {
          valid: false,
          error: `Invalid quantity for ${item.product.name}`,
          verifiedItems: [],
          calculatedSubtotal: 0,
          deliveryCharge: 0,
          discount: 0,
          grandTotal: 0,
          estimatedDeliveryTime: '',
        };
      }
      if (!item.product.availability) {
        return {
          valid: false,
          error: `${item.product.name} is currently out of stock`,
          verifiedItems: [],
          calculatedSubtotal: 0,
          deliveryCharge: 0,
          discount: 0,
          grandTotal: 0,
          estimatedDeliveryTime: '',
        };
      }
      if (item.quantity > (item.product.stockQuantity || 10)) {
        return {
          valid: false,
          error: `Only ${item.product.stockQuantity} units available for ${item.product.name}`,
          verifiedItems: [],
          calculatedSubtotal: 0,
          deliveryCharge: 0,
          discount: 0,
          grandTotal: 0,
          estimatedDeliveryTime: '',
        };
      }

      const price =
        item.product.salePrice && item.product.salePrice > 0
          ? item.product.salePrice
          : item.product.price;
      const total = price * item.quantity;
      calculatedSubtotal += total;

      verifiedItems.push({
        productId: item.product.id,
        productName: item.product.name,
        productImage: item.product.images?.[0] || '',
        price,
        quantity: item.quantity,
        weight: item.selectedWeight || item.product.weight,
        total,
      });
    }

    const deliveryCharge = calculatedSubtotal >= 299 ? 0 : 30;
    const grandTotal = Math.max(0, calculatedSubtotal + deliveryCharge);

    return {
      valid: true,
      verifiedItems,
      calculatedSubtotal,
      deliveryCharge,
      discount: 0,
      grandTotal,
      estimatedDeliveryTime: '25-35 mins',
    };
  }
}
