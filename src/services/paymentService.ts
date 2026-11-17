/**
 * PURE SUDH - Client-Side Payment & Order Gateway Service
 * Connects directly to authoritative server-side APIs.
 * Sensitive merchant secrets and validation algorithms remain on the server.
 */

import { Order, OrderStatus, PaymentMethod } from '../types';

export interface CreatePaymentOrderParams {
  amount: number;
  currency?: string;
  receiptId?: string;
  provider: PaymentMethod;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
}

export interface PaymentOrderGatewayData {
  success: boolean;
  gatewayOrderId: string;
  provider: string;
  amount: number;
  currency: string;
  transactionRef: string;
  qrPayload?: string;
  deepLink?: string;
  expiresAt: string;
  serverSignature: string;
  error?: string;
}

export interface VerifyPaymentParams {
  gatewayOrderId: string;
  transactionRef: string;
  provider: PaymentMethod;
  serverSignature: string;
  amount: number;
  paymentDetails?: {
    upiVpa?: string;
    cardLast4?: string;
    bankName?: string;
    authCode?: string;
    otp?: string;
  };
}

export interface VerifyPaymentResult {
  verified: boolean;
  paymentId: string;
  gatewayOrderId: string;
  status: 'PAID' | 'FAILED' | 'PENDING';
  failureReason?: string;
  transactionTime: string;
  refundReady: boolean;
}

export interface CreateOrderPayload {
  idempotencyKey: string;
  customerId?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  items: {
    productId: string;
    quantity: number;
    weight?: string;
  }[];
  deliveryAddress: any;
  deliverySlotId?: string;
  paymentMethod: PaymentMethod;
  paymentId?: string;
  gatewayOrderId?: string;
  couponCode?: string;
  notes?: string;
}

/**
 * 1. Initialize gateway order on server
 */
export async function initializePaymentOrder(
  params: CreatePaymentOrderParams
): Promise<PaymentOrderGatewayData> {
  const res = await fetch('/api/payment/create-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to initialize payment gateway order');
  }

  return data as PaymentOrderGatewayData;
}

/**
 * 2. Verify payment on server using HMAC signature and gateway verification
 */
export async function verifyPaymentOnServer(
  params: VerifyPaymentParams
): Promise<VerifyPaymentResult> {
  const res = await fetch('/api/payment/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  const data = await res.json();
  return data as VerifyPaymentResult;
}

/**
 * 3. Place Authoritative Order on Server with Idempotency Guard
 */
export async function submitOrderWithIdempotency(
  payload: CreateOrderPayload
): Promise<{ success: boolean; order: Order; isIdempotentReplay?: boolean; error?: string }> {
  if (
    !payload.customerId ||
    payload.customerId === 'guest_user' ||
    payload.customerId === 'guest' ||
    payload.customerId === 'anonymous' ||
    !payload.customerEmail ||
    payload.customerEmail.includes('guest@')
  ) {
    return {
      success: false,
      order: null as any,
      error: 'Order placement requires an active account. Please sign in or create an account to place your order.',
    };
  }

  const res = await fetch('/api/orders/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Idempotency-Key': payload.idempotencyKey,
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    return {
      success: false,
      order: null as any,
      error: data.error || 'Order creation failed on backend',
    };
  }

  return {
    success: true,
    order: data.order as Order,
    isIdempotentReplay: data.isIdempotentReplay,
  };
}

/**
 * 4. Cancel Order with Automatic Stock Restoration & Refund Architecture
 */
export async function cancelOrderOnServer(
  orderIdOrNumber: string,
  reason: string = 'Cancelled by customer'
): Promise<{ success: boolean; order?: Order; refundResult?: any; error?: string }> {
  try {
    const res = await fetch(`/api/orders/${encodeURIComponent(orderIdOrNumber)}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      return {
        success: false,
        error: data.error || 'Order cancellation failed',
      };
    }

    return {
      success: true,
      order: data.order as Order,
      refundResult: data.refundResult,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Network error while attempting order cancellation',
    };
  }
}

/**
 * 5. Fetch Order By ID or Order Number (e.g. PS100001)
 */
export async function fetchServerOrder(orderIdOrNumber: string): Promise<Order | null> {
  try {
    const res = await fetch(`/api/orders/${encodeURIComponent(orderIdOrNumber)}`);
    if (res.ok) {
      const data = await res.json();
      return data as Order;
    }
  } catch (err) {
    console.warn('Fetch server order error:', err);
  }
  return null;
}
