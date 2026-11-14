/**
 * PURE SUDH - Payment Gateway Abstraction Layer
 * All payment credentials, signature keys, and sensitive merchant secrets
 * are kept strictly server-side.
 */

export type GatewayProviderType =
  | 'UPI'
  | 'PhonePe'
  | 'Google Pay'
  | 'Paytm'
  | 'Cards'
  | 'Net Banking'
  | 'COD';

export interface PaymentOrderRequest {
  amount: number; // in Rupees
  currency: string; // 'INR'
  receiptId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  metadata?: Record<string, any>;
}

export interface PaymentOrderResponse {
  success: boolean;
  gatewayOrderId: string;
  provider: GatewayProviderType;
  amount: number;
  currency: string;
  transactionRef: string;
  qrPayload?: string;
  deepLink?: string;
  expiresAt: string;
  serverSignature: string;
  error?: string;
}

export interface PaymentVerificationRequest {
  gatewayOrderId: string;
  transactionRef: string;
  provider: GatewayProviderType;
  paymentDetails?: {
    upiVpa?: string;
    cardLast4?: string;
    bankName?: string;
    authCode?: string;
    otp?: string;
  };
  serverSignature: string;
  amount: number;
}

export interface PaymentVerificationResult {
  verified: boolean;
  paymentId: string;
  gatewayOrderId: string;
  status: 'PAID' | 'FAILED' | 'PENDING';
  failureReason?: string;
  transactionTime: string;
  refundReady: boolean;
}

export interface RefundRequest {
  paymentId: string;
  orderNumber: string;
  amount: number;
  reason: string;
}

export interface RefundResult {
  success: boolean;
  refundId: string;
  amount: number;
  status: 'REFUNDED' | 'PROCESSED' | 'FAILED';
  processedAt: string;
  estimatedSettlementDays: number;
  note: string;
}

/**
 * Server-Side Secrets (Mock / Sandbox Secrets strictly kept within backend)
 */
const SERVER_PAYMENT_SECRETS = {
  MERCHANT_ID: process.env.PAYMENT_MERCHANT_ID || 'PURE_SUDH_MERCHANT_01',
  SECRET_SALT: process.env.PAYMENT_SECRET_KEY || 'ps_sec_7a8b9c0d1e2f3g4h5i6j',
  UPI_MERCHANT_VPA: 'puresudh@icici',
  UPI_MERCHANT_NAME: 'PURE SUDH Organics',
};

// Generates an HMAC-like internal server signature to prevent client tampering
function generateServerSignature(gatewayOrderId: string, amount: number): string {
  const raw = `${gatewayOrderId}:${amount}:${SERVER_PAYMENT_SECRETS.SECRET_SALT}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `sig_${Math.abs(hash).toString(16)}`;
}

/**
 * Gateway Abstraction Base Class
 */
export abstract class BasePaymentGateway {
  abstract readonly provider: GatewayProviderType;

  abstract createOrder(request: PaymentOrderRequest): Promise<PaymentOrderResponse>;
  abstract verifyPayment(request: PaymentVerificationRequest): Promise<PaymentVerificationResult>;
  abstract processRefund(request: RefundRequest): Promise<RefundResult>;
}

/**
 * 1. UPI Gateway (Dynamic UPI QR & VPA Intent)
 */
export class UpiPaymentGateway extends BasePaymentGateway {
  readonly provider: GatewayProviderType = 'UPI';

  async createOrder(request: PaymentOrderRequest): Promise<PaymentOrderResponse> {
    const gatewayOrderId = `upi_ord_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
    const transactionRef = `UPI${Date.now().toString().slice(-8)}`;
    const signature = generateServerSignature(gatewayOrderId, request.amount);

    // Standard NPCI UPI URI Scheme
    const upiUri = `upi://pay?pa=${SERVER_PAYMENT_SECRETS.UPI_MERCHANT_VPA}&pn=${encodeURIComponent(
      SERVER_PAYMENT_SECRETS.UPI_MERCHANT_NAME
    )}&tr=${transactionRef}&am=${request.amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(
      `Order ${request.receiptId} PURE SUDH`
    )}`;

    return {
      success: true,
      gatewayOrderId,
      provider: this.provider,
      amount: request.amount,
      currency: request.currency || 'INR',
      transactionRef,
      qrPayload: upiUri,
      deepLink: upiUri,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      serverSignature: signature,
    };
  }

  async verifyPayment(request: PaymentVerificationRequest): Promise<PaymentVerificationResult> {
    const expectedSig = generateServerSignature(request.gatewayOrderId, request.amount);
    if (request.serverSignature !== expectedSig) {
      return {
        verified: false,
        paymentId: '',
        gatewayOrderId: request.gatewayOrderId,
        status: 'FAILED',
        failureReason: 'Security signature mismatch during UPI verification',
        transactionTime: new Date().toISOString(),
        refundReady: false,
      };
    }

    const vpa = request.paymentDetails?.upiVpa;
    if (vpa && vpa.toLowerCase().includes('fail')) {
      return {
        verified: false,
        paymentId: '',
        gatewayOrderId: request.gatewayOrderId,
        status: 'FAILED',
        failureReason: 'UPI payment declined by payer PSP bank (VPA authorization failed)',
        transactionTime: new Date().toISOString(),
        refundReady: false,
      };
    }

    const paymentId = `pay_upi_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    return {
      verified: true,
      paymentId,
      gatewayOrderId: request.gatewayOrderId,
      status: 'PAID',
      transactionTime: new Date().toISOString(),
      refundReady: true,
    };
  }

  async processRefund(request: RefundRequest): Promise<RefundResult> {
    const refundId = `RF-UPI-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
    return {
      success: true,
      refundId,
      amount: request.amount,
      status: 'REFUNDED',
      processedAt: new Date().toISOString(),
      estimatedSettlementDays: 1, // Fast UPI refund
      note: `UPI refund credited back to customer bank account. Reason: ${request.reason}`,
    };
  }
}

/**
 * 2. PhonePe Gateway
 */
export class PhonePePaymentGateway extends BasePaymentGateway {
  readonly provider: GatewayProviderType = 'PhonePe';

  async createOrder(request: PaymentOrderRequest): Promise<PaymentOrderResponse> {
    const gatewayOrderId = `ppe_ord_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
    const transactionRef = `PPE${Date.now().toString().slice(-8)}`;
    const signature = generateServerSignature(gatewayOrderId, request.amount);

    const deepLink = `phonepe://pay?pa=${SERVER_PAYMENT_SECRETS.UPI_MERCHANT_VPA}&pn=PURE%20SUDH&am=${request.amount}&tr=${transactionRef}`;

    return {
      success: true,
      gatewayOrderId,
      provider: this.provider,
      amount: request.amount,
      currency: 'INR',
      transactionRef,
      deepLink,
      qrPayload: deepLink,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      serverSignature: signature,
    };
  }

  async verifyPayment(request: PaymentVerificationRequest): Promise<PaymentVerificationResult> {
    const expectedSig = generateServerSignature(request.gatewayOrderId, request.amount);
    if (request.serverSignature !== expectedSig) {
      return {
        verified: false,
        paymentId: '',
        gatewayOrderId: request.gatewayOrderId,
        status: 'FAILED',
        failureReason: 'Invalid PhonePe verification signature',
        transactionTime: new Date().toISOString(),
        refundReady: false,
      };
    }

    return {
      verified: true,
      paymentId: `pay_ppe_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      gatewayOrderId: request.gatewayOrderId,
      status: 'PAID',
      transactionTime: new Date().toISOString(),
      refundReady: true,
    };
  }

  async processRefund(request: RefundRequest): Promise<RefundResult> {
    return {
      success: true,
      refundId: `RF-PPE-${Date.now().toString().slice(-6)}`,
      amount: request.amount,
      status: 'REFUNDED',
      processedAt: new Date().toISOString(),
      estimatedSettlementDays: 1,
      note: `PhonePe instant refund initiated. Reason: ${request.reason}`,
    };
  }
}

/**
 * 3. Google Pay Gateway
 */
export class GooglePayPaymentGateway extends BasePaymentGateway {
  readonly provider: GatewayProviderType = 'Google Pay';

  async createOrder(request: PaymentOrderRequest): Promise<PaymentOrderResponse> {
    const gatewayOrderId = `gpay_ord_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
    const transactionRef = `GPAY${Date.now().toString().slice(-8)}`;
    const signature = generateServerSignature(gatewayOrderId, request.amount);

    const deepLink = `gpay://upi/pay?pa=${SERVER_PAYMENT_SECRETS.UPI_MERCHANT_VPA}&pn=PURE%20SUDH&mc=5411&tr=${transactionRef}&am=${request.amount}&cu=INR`;

    return {
      success: true,
      gatewayOrderId,
      provider: this.provider,
      amount: request.amount,
      currency: 'INR',
      transactionRef,
      deepLink,
      qrPayload: deepLink,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      serverSignature: signature,
    };
  }

  async verifyPayment(request: PaymentVerificationRequest): Promise<PaymentVerificationResult> {
    return {
      verified: true,
      paymentId: `pay_gpay_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      gatewayOrderId: request.gatewayOrderId,
      status: 'PAID',
      transactionTime: new Date().toISOString(),
      refundReady: true,
    };
  }

  async processRefund(request: RefundRequest): Promise<RefundResult> {
    return {
      success: true,
      refundId: `RF-GPAY-${Date.now().toString().slice(-6)}`,
      amount: request.amount,
      status: 'REFUNDED',
      processedAt: new Date().toISOString(),
      estimatedSettlementDays: 1,
      note: `Google Pay refund initiated to originating UPI bank account.`,
    };
  }
}

/**
 * 4. Paytm Gateway
 */
export class PaytmPaymentGateway extends BasePaymentGateway {
  readonly provider: GatewayProviderType = 'Paytm';

  async createOrder(request: PaymentOrderRequest): Promise<PaymentOrderResponse> {
    const gatewayOrderId = `ptm_ord_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
    const transactionRef = `PTM${Date.now().toString().slice(-8)}`;
    const signature = generateServerSignature(gatewayOrderId, request.amount);

    const deepLink = `paytmmp://pay?pa=${SERVER_PAYMENT_SECRETS.UPI_MERCHANT_VPA}&pn=PURE%20SUDH&am=${request.amount}&tr=${transactionRef}`;

    return {
      success: true,
      gatewayOrderId,
      provider: this.provider,
      amount: request.amount,
      currency: 'INR',
      transactionRef,
      deepLink,
      qrPayload: deepLink,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      serverSignature: signature,
    };
  }

  async verifyPayment(request: PaymentVerificationRequest): Promise<PaymentVerificationResult> {
    return {
      verified: true,
      paymentId: `pay_ptm_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      gatewayOrderId: request.gatewayOrderId,
      status: 'PAID',
      transactionTime: new Date().toISOString(),
      refundReady: true,
    };
  }

  async processRefund(request: RefundRequest): Promise<RefundResult> {
    return {
      success: true,
      refundId: `RF-PTM-${Date.now().toString().slice(-6)}`,
      amount: request.amount,
      status: 'REFUNDED',
      processedAt: new Date().toISOString(),
      estimatedSettlementDays: 1,
      note: `Paytm Wallet / UPI refund successful.`,
    };
  }
}

/**
 * 5. Cards Gateway (Debit & Credit Card 3D Secure Verification)
 */
export class CardsPaymentGateway extends BasePaymentGateway {
  readonly provider: GatewayProviderType = 'Cards';

  async createOrder(request: PaymentOrderRequest): Promise<PaymentOrderResponse> {
    const gatewayOrderId = `card_ord_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
    const transactionRef = `CARD${Date.now().toString().slice(-8)}`;
    const signature = generateServerSignature(gatewayOrderId, request.amount);

    return {
      success: true,
      gatewayOrderId,
      provider: this.provider,
      amount: request.amount,
      currency: 'INR',
      transactionRef,
      expiresAt: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
      serverSignature: signature,
    };
  }

  async verifyPayment(request: PaymentVerificationRequest): Promise<PaymentVerificationResult> {
    // If testing failure scenario with invalid card
    const last4 = request.paymentDetails?.cardLast4;
    if (last4 === '0000') {
      return {
        verified: false,
        paymentId: '',
        gatewayOrderId: request.gatewayOrderId,
        status: 'FAILED',
        failureReason: 'Transaction declined: Insufficient funds or card expired',
        transactionTime: new Date().toISOString(),
        refundReady: false,
      };
    }

    return {
      verified: true,
      paymentId: `pay_card_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      gatewayOrderId: request.gatewayOrderId,
      status: 'PAID',
      transactionTime: new Date().toISOString(),
      refundReady: true,
    };
  }

  async processRefund(request: RefundRequest): Promise<RefundResult> {
    return {
      success: true,
      refundId: `RF-CARD-${Date.now().toString().slice(-6)}`,
      amount: request.amount,
      status: 'REFUNDED',
      processedAt: new Date().toISOString(),
      estimatedSettlementDays: 5,
      note: `Card refund of ₹${request.amount} initiated to issuing bank. Takes 5-7 business days to reflect.`,
    };
  }
}

/**
 * 6. Net Banking Gateway
 */
export class NetBankingPaymentGateway extends BasePaymentGateway {
  readonly provider: GatewayProviderType = 'Net Banking';

  async createOrder(request: PaymentOrderRequest): Promise<PaymentOrderResponse> {
    const gatewayOrderId = `nb_ord_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
    const transactionRef = `NB${Date.now().toString().slice(-8)}`;
    const signature = generateServerSignature(gatewayOrderId, request.amount);

    return {
      success: true,
      gatewayOrderId,
      provider: this.provider,
      amount: request.amount,
      currency: 'INR',
      transactionRef,
      expiresAt: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
      serverSignature: signature,
    };
  }

  async verifyPayment(request: PaymentVerificationRequest): Promise<PaymentVerificationResult> {
    return {
      verified: true,
      paymentId: `pay_nb_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      gatewayOrderId: request.gatewayOrderId,
      status: 'PAID',
      transactionTime: new Date().toISOString(),
      refundReady: true,
    };
  }

  async processRefund(request: RefundRequest): Promise<RefundResult> {
    return {
      success: true,
      refundId: `RF-NB-${Date.now().toString().slice(-6)}`,
      amount: request.amount,
      status: 'REFUNDED',
      processedAt: new Date().toISOString(),
      estimatedSettlementDays: 4,
      note: `Net banking refund credited back to customer account via NEFT/IMPS.`,
    };
  }
}

/**
 * 7. Cash on Delivery (COD) Provider
 */
export class CodPaymentGateway extends BasePaymentGateway {
  readonly provider: GatewayProviderType = 'COD';

  async createOrder(request: PaymentOrderRequest): Promise<PaymentOrderResponse> {
    const gatewayOrderId = `cod_ord_${Date.now()}`;
    const transactionRef = `COD${Date.now().toString().slice(-8)}`;
    const signature = generateServerSignature(gatewayOrderId, request.amount);

    return {
      success: true,
      gatewayOrderId,
      provider: this.provider,
      amount: request.amount,
      currency: 'INR',
      transactionRef,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      serverSignature: signature,
    };
  }

  async verifyPayment(request: PaymentVerificationRequest): Promise<PaymentVerificationResult> {
    // For COD, payment is verified as 'PENDING' until delivered at doorstep
    return {
      verified: true,
      paymentId: `pay_cod_${Date.now()}`,
      gatewayOrderId: request.gatewayOrderId,
      status: 'PENDING',
      transactionTime: new Date().toISOString(),
      refundReady: false, // Not paid yet, no money to refund
    };
  }

  async processRefund(request: RefundRequest): Promise<RefundResult> {
    return {
      success: true,
      refundId: `RF-COD-NA`,
      amount: 0,
      status: 'REFUNDED',
      processedAt: new Date().toISOString(),
      estimatedSettlementDays: 0,
      note: 'COD order cancelled prior to delivery. No payment deduction occurred.',
    };
  }
}

/**
 * Gateway Registry / Factory
 */
export class PaymentGatewayManager {
  private static gateways: Map<GatewayProviderType, BasePaymentGateway> = new Map([
    ['UPI', new UpiPaymentGateway()],
    ['PhonePe', new PhonePePaymentGateway()],
    ['Google Pay', new GooglePayPaymentGateway()],
    ['Paytm', new PaytmPaymentGateway()],
    ['Cards', new CardsPaymentGateway()],
    ['Net Banking', new NetBankingPaymentGateway()],
    ['COD', new CodPaymentGateway()],
  ]);

  static getGateway(provider: GatewayProviderType): BasePaymentGateway {
    const gateway = this.gateways.get(provider);
    if (!gateway) {
      // Fallback to UPI
      return this.gateways.get('UPI')!;
    }
    return gateway;
  }
}
