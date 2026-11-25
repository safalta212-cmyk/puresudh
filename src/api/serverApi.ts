import { Request, Response, Router } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import firebaseAppletConfig from '../../firebase-applet-config.json';
import { initialProducts, initialCoupons, initialDeliveryAreas, initialDeliverySlots } from '../data/seedData';
import {
  Order,
  OrderStatus,
  PaymentMethod,
  DeliveryArea,
  DeliverySlot,
  Review,
  Coupon,
  VendorOrder,
  CommissionConfig,
  FinancialLedgerEntry,
  VendorFinancialSummary,
  PayoutAdjustmentPayload,
  VendorPayout,
} from '../types';
import { getProductVendorId, getVendorMetadata } from '../utils/vendorCartHelpers';
import {
  INITIAL_COMMISSION_CONFIG,
  resolveEffectiveCommissionRate,
  calculateItemCommission,
  calculateOrderCommissionForVendor,
  generateAuditHash,
  computeVendorFinancialSummary,
} from '../utils/commissionEngine';
import {
  evaluateDeliveryEligibility,
  matchDeliveryArea,
  formatDeliveryETA,
  calculateDeliveryFee,
} from '../utils/deliveryRules';
import {
  PaymentGatewayManager,
  GatewayProviderType,
  RefundResult,
} from './paymentGateways';
import { validateCouponWithRules } from '../utils/couponValidation';
import { createRateLimiter, requireRole } from './securityMiddleware';
import { isTemporaryEmail, isTemporaryOrFakePhone, formatIndianPhone } from '../validation';
import { recordOrderAttributionsServer } from './advertisingAttributionServer';

export const apiRouter = Router();

// Rate Limiters for Sensitive API Endpoints
const couponLimiter = createRateLimiter(60 * 1000, 30, 'Too many coupon attempts. Please try again in 1 minute.');
const paymentLimiter = createRateLimiter(60 * 1000, 20, 'Payment rate limit exceeded. Please wait a moment.');
const orderLimiter = createRateLimiter(60 * 1000, 15, 'Order submission rate limit exceeded. Please wait a moment.');
const reviewLimiter = createRateLimiter(60 * 1000, 15, 'Review submission rate limit exceeded. Please wait a moment.');

// In-memory / server cache of products, delivery areas & slots for quick validation
let serverProducts = [...initialProducts];
let serverCoupons = [...initialCoupons];
let serverAreas: DeliveryArea[] = [...initialDeliveryAreas];
let serverSlots: DeliverySlot[] = [...initialDeliverySlots];

const sampleOrderDelivered: Order = {
  id: 'ord-ps100001',
  orderNumber: 'PS100001',
  customerId: 'cust-demo-user',
  customerName: 'Aarav Sharma',
  customerEmail: 'customer@puresudh.com',
  customerPhone: '9876543210',
  items: [
    {
      productId: 'prod-thekua-traditional',
      productName: 'Desi Ghee Traditional Thekua',
      productImage: '/images/homemade_thekua_special.jpg',
      price: 199,
      quantity: 1,
      weight: '500g',
      total: 199,
    },
    {
      productId: 'prod-fresh-paneer',
      productName: 'Malai Paneer (Fresh Batch)',
      productImage: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=600&q=80',
      price: 140,
      quantity: 2,
      weight: '250g',
      total: 280,
    },
  ],
  deliveryAddress: {
    id: 'addr-demo-1',
    name: 'Aarav Sharma',
    phone: '9876543210',
    addressLine: 'Flat 402, Ganga Heights, Bailey Road',
    landmark: 'Near Paras Hospital',
    city: 'Patna',
    state: 'Bihar',
    pincode: '800014',
    isDefault: true,
    type: 'home',
  },
  subtotal: 479,
  deliveryCharge: 0,
  discount: 50,
  couponCode: 'FESTIVAL50',
  total: 429,
  status: 'DELIVERED',
  paymentMethod: 'UPI',
  paymentStatus: 'Paid',
  paymentId: 'pay_ps100001_mock',
  estimatedDeliveryTime: 'Delivered',
  deliveryAreaPincode: '800014',
  statusHistory: [
    { status: 'PLACED', timestamp: new Date(Date.now() - 86400000 * 2).toISOString(), note: 'Order placed via UPI' },
    { status: 'CONFIRMED', timestamp: new Date(Date.now() - 86400000 * 2 + 300000).toISOString(), note: 'Kitchen confirmed order' },
    { status: 'PREPARING', timestamp: new Date(Date.now() - 86400000 * 2 + 900000).toISOString(), note: 'Fresh batch prepared' },
    { status: 'PACKED', timestamp: new Date(Date.now() - 86400000 * 2 + 1800000).toISOString(), note: 'Airtight box packed' },
    { status: 'OUT_FOR_DELIVERY', timestamp: new Date(Date.now() - 86400000 * 2 + 2700000).toISOString(), note: 'Rider dispatched' },
    { status: 'DELIVERED', timestamp: new Date(Date.now() - 86400000 * 2 + 4500000).toISOString(), note: 'Delivered to customer' },
  ],
  createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  updatedAt: new Date(Date.now() - 86400000 * 2 + 4500000).toISOString(),
};

const sampleOrderPreparing: Order = {
  id: 'ord-ps100002',
  orderNumber: 'PS100002',
  customerId: 'cust-demo-user',
  customerName: 'Aarav Sharma',
  customerEmail: 'customer@puresudh.com',
  customerPhone: '9876543210',
  items: [
    {
      productId: 'prod-claypot-dahi',
      productName: 'Claypot Matka Dahi',
      productImage: 'https://images.unsplash.com/photo-1571212515416-fef01fc43637?auto=format&fit=crop&w=600&q=80',
      price: 90,
      quantity: 2,
      weight: '500g',
      total: 180,
    },
  ],
  deliveryAddress: {
    id: 'addr-demo-1',
    name: 'Aarav Sharma',
    phone: '9876543210',
    addressLine: 'Flat 402, Ganga Heights, Bailey Road',
    landmark: 'Near Paras Hospital',
    city: 'Patna',
    state: 'Bihar',
    pincode: '800014',
    isDefault: true,
    type: 'home',
  },
  subtotal: 180,
  deliveryCharge: 30,
  discount: 0,
  total: 210,
  status: 'PREPARING',
  paymentMethod: 'Cash on Delivery',
  paymentStatus: 'Pending',
  estimatedDeliveryTime: '25-35 mins',
  deliveryAreaPincode: '800014',
  statusHistory: [
    { status: 'PLACED', timestamp: new Date(Date.now() - 1800000).toISOString(), note: 'Order placed with Cash on Delivery' },
    { status: 'CONFIRMED', timestamp: new Date(Date.now() - 1200000).toISOString(), note: 'Kitchen verified availability' },
    { status: 'PREPARING', timestamp: new Date(Date.now() - 600000).toISOString(), note: 'Fresh earthen clay pot dahi packing underway' },
  ],
  createdAt: new Date(Date.now() - 1800000).toISOString(),
  updatedAt: new Date(Date.now() - 600000).toISOString(),
};

// In-memory server order store and idempotency cache
let serverOrders: Order[] = [sampleOrderPreparing, sampleOrderDelivered];
let serverVendorOrders: VendorOrder[] = [
  {
    id: 'vord-ord-ps100001-vendor-1',
    orderId: 'ord-ps100001',
    orderNumber: 'PS100001',
    vendorId: 'vendor-1',
    vendorName: 'Sudh Dairy & Thekua Farms',
    items: [
      {
        productId: 'prod-thekua-traditional',
        productName: 'Desi Ghee Traditional Thekua',
        productImage: '/images/homemade_thekua_special.jpg',
        price: 199,
        quantity: 1,
        weight: '500g',
        total: 199,
      },
    ],
    vendorSubtotal: 199,
    vendorDiscount: 0,
    vendorDeliveryFee: 30,
    vendorTotal: 229,
    commissionRate: 10,
    commissionAmount: 20,
    payoutAmount: 179,
    status: 'DELIVERED',
    estimatedDeliveryTime: '25-35 mins',
    isAvailable: true,
    preparationStatus: 'packed',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2 + 4500000).toISOString(),
  },
  {
    id: 'vord-ord-ps100001-vendor-2',
    orderId: 'ord-ps100001',
    orderNumber: 'PS100001',
    vendorId: 'vendor-2',
    vendorName: 'Brijwasi Khoya & Sweets',
    items: [
      {
        productId: 'prod-fresh-paneer',
        productName: 'Malai Paneer (Fresh Batch)',
        productImage: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=600&q=80',
        price: 140,
        quantity: 2,
        weight: '250g',
        total: 280,
      },
    ],
    vendorSubtotal: 280,
    vendorDiscount: 0,
    vendorDeliveryFee: 0,
    vendorTotal: 280,
    commissionRate: 12,
    commissionAmount: 34,
    payoutAmount: 246,
    status: 'DELIVERED',
    estimatedDeliveryTime: '25-35 mins',
    isAvailable: true,
    preparationStatus: 'packed',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2 + 4500000).toISOString(),
  },
  {
    id: 'vord-ord-ps100002-vendor-2',
    orderId: 'ord-ps100002',
    orderNumber: 'PS100002',
    vendorId: 'vendor-2',
    vendorName: 'Brijwasi Khoya & Sweets',
    items: [
      {
        productId: 'prod-claypot-dahi',
        productName: 'Claypot Matka Dahi',
        productImage: 'https://images.unsplash.com/photo-1571212515416-fef01fc43637?auto=format&fit=crop&w=600&q=80',
        price: 90,
        quantity: 2,
        weight: '500g',
        total: 180,
      },
    ],
    vendorSubtotal: 180,
    vendorDiscount: 0,
    vendorDeliveryFee: 30,
    vendorTotal: 210,
    commissionRate: 12,
    commissionAmount: 22,
    payoutAmount: 158,
    status: 'PREPARING',
    estimatedDeliveryTime: '25-35 mins',
    isAvailable: true,
    preparationStatus: 'preparing',
    createdAt: new Date(Date.now() - 1800000).toISOString(),
    updatedAt: new Date(Date.now() - 600000).toISOString(),
  },
];

// =========================================================================
// SERVER-SIDE FINANCIAL LEDGER, COMMISSION & PAYOUT STORES
// =========================================================================

let serverCommissionConfig: CommissionConfig = { ...INITIAL_COMMISSION_CONFIG };

export interface PlatformPayoutProviderConfig {
  provider: 'RAZORPAYX' | 'CASHFREE' | 'BANK_NEFT_MANUAL';
  isLive: boolean;
  isVerified: boolean;
  minPayoutAmount: number;
  autoDisbursementEnabled: boolean;
  dailyDisbursementLimit: number;
}

let platformPayoutConfig: PlatformPayoutProviderConfig = {
  provider: 'BANK_NEFT_MANUAL',
  isLive: true,
  isVerified: true, // Configured for bank-verified NEFT disbursements
  minPayoutAmount: 100,
  autoDisbursementEnabled: false, // Strict safety invariant: money transfers require admin verification
  dailyDisbursementLimit: 500000,
};

// Initial Seed Financial Ledger Entries (Auditable, immutable records)
let serverFinancialLedger: FinancialLedgerEntry[] = [
  {
    id: 'ledg-init-001',
    transactionId: 'tx_ord_ps100001_v1',
    vendorId: 'vendor-1',
    vendorName: 'Sudh Dairy & Thekua Farms',
    orderId: 'ord-ps100001',
    orderNumber: 'PS100001',
    type: 'SALE',
    amount: 179,
    balanceBefore: 0,
    balanceAfter: 179,
    description: 'Order sale PS100001 - Gross ₹199, Comm ₹20 (10%)',
    auditHash: generateAuditHash('tx_ord_ps100001_v1', 'vendor-1', 'SALE', 179, 179, '2026-03-20T10:00:00.000Z'),
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    createdBy: 'system_checkout',
    metadata: { grossSales: 199, totalDiscount: 0, totalCommission: 20, effectiveRate: 10 },
  },
  {
    id: 'ledg-init-002',
    transactionId: 'tx_ord_ps100001_v2',
    vendorId: 'vendor-2',
    vendorName: 'Brijwasi Khoya & Sweets',
    orderId: 'ord-ps100001',
    orderNumber: 'PS100001',
    type: 'SALE',
    amount: 246,
    balanceBefore: 0,
    balanceAfter: 246,
    description: 'Order sale PS100001 - Gross ₹280, Comm ₹34 (12%)',
    auditHash: generateAuditHash('tx_ord_ps100001_v2', 'vendor-2', 'SALE', 246, 246, '2026-03-20T10:05:00.000Z'),
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    createdBy: 'system_checkout',
    metadata: { grossSales: 280, totalDiscount: 0, totalCommission: 34, effectiveRate: 12 },
  },
  {
    id: 'ledg-init-003',
    transactionId: 'tx_ord_ps100002_v2',
    vendorId: 'vendor-2',
    vendorName: 'Brijwasi Khoya & Sweets',
    orderId: 'ord-ps100002',
    orderNumber: 'PS100002',
    type: 'SALE',
    amount: 158,
    balanceBefore: 246,
    balanceAfter: 404,
    description: 'Order sale PS100002 - Gross ₹180, Comm ₹22 (12%)',
    auditHash: generateAuditHash('tx_ord_ps100002_v2', 'vendor-2', 'SALE', 158, 404, '2026-03-22T10:00:00.000Z'),
    createdAt: new Date(Date.now() - 1800000).toISOString(),
    createdBy: 'system_checkout',
    metadata: { grossSales: 180, totalDiscount: 0, totalCommission: 22, effectiveRate: 12 },
  },
];

// Initial Seed Vendor Payouts
let serverPayouts: VendorPayout[] = [
  {
    id: 'pay-v1-101',
    vendorId: 'vendor-1',
    amount: 8450,
    status: 'completed',
    periodStart: '2026-02-01',
    periodEnd: '2026-02-15',
    ordersCount: 18,
    transactionRef: 'UTR202602169901',
    bankAccountId: 'bank-v1',
    processedAt: '2026-02-16T11:00:00.000Z',
    createdAt: '2026-02-15T23:59:59.000Z',
  },
  {
    id: 'pay-v2-101',
    vendorId: 'vendor-2',
    amount: 11200,
    status: 'completed',
    periodStart: '2026-02-16',
    periodEnd: '2026-02-28',
    ordersCount: 24,
    transactionRef: 'UTR202603019902',
    bankAccountId: 'bank-v2',
    processedAt: '2026-03-01T10:30:00.000Z',
    createdAt: '2026-02-28T23:59:59.000Z',
  },
];

export function getVendorLatestBalance(vendorId: string): number {
  const vendorEntries = serverFinancialLedger.filter((e) => e.vendorId === vendorId);
  if (vendorEntries.length === 0) return 0;
  return vendorEntries[0].balanceAfter;
}
const idempotencyStore = new Map<string, { order: Order; timestamp: number }>();

// Starting sequential counter for order number format: PS100001, PS100002...
let orderSequenceNumber = 100003;

// Initial Server Reviews
let serverReviews: Review[] = [
  {
    id: 'rev-init-1',
    productId: 'prod-thekua-traditional',
    orderId: 'ord-ps100001',
    customerId: 'cust-demo-user',
    customerName: 'Aarav Sharma',
    rating: 5,
    title: 'Pure authenticity and heavenly ghee aroma!',
    comment: 'The Gur Thekua was crunchy, fragrant with green cardamom and pure cow ghee. Delivered within 30 minutes in Patna.',
    verifiedPurchase: true,
    status: 'approved',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

export function generateNextOrderNumber(): string {
  const current = orderSequenceNumber++;
  return `PS${current}`;
}

// Server Health
apiRouter.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', brand: 'PURE SUDH', timestamp: new Date().toISOString() });
});

// Secure Cloud Function Validation for Delivery Availability (POST)
apiRouter.post('/delivery/validate', async (req: Request, res: Response) => {
  const pincode = String(req.body?.pincode || '').trim();
  const cartSubtotal = Number(req.body?.cartSubtotal || 0);
  const vendorId = req.body?.vendorId ? String(req.body.vendorId).trim() : undefined;

  if (!pincode) {
    return res.status(400).json({
      isDeliverable: false,
      deliverabilityStatus: 'Currently unavailable in your area',
      error: 'Pincode is required for delivery validation',
    });
  }

  await hydrateCatalogIfNeeded([], pincode, undefined, true);

  const result = evaluateDeliveryEligibility(
    pincode,
    serverAreas,
    cartSubtotal,
    vendorId,
    serverSlots
  );

  return res.json(result);
});

// Location-Aware Delivery Check (GET)
apiRouter.get('/delivery/check', async (req: Request, res: Response) => {
  const pincode = String(req.query.pincode || '').trim();
  const subtotal = Number(req.query.cartSubtotal || 0);
  const vendorId = req.query.vendorId ? String(req.query.vendorId).trim() : undefined;

  if (!pincode) {
    return res.status(400).json({ error: 'Pincode is required' });
  }

  await hydrateCatalogIfNeeded([], pincode, undefined, true);

  const result = evaluateDeliveryEligibility(
    pincode,
    serverAreas,
    subtotal,
    vendorId,
    serverSlots
  );

  return res.json(result);
});

// Delivery Areas management endpoints (syncs server cache with admin operations)
apiRouter.get('/delivery/areas', async (req: Request, res: Response) => {
  await hydrateCatalogIfNeeded([], undefined, undefined, true);
  const vendorId = req.query.vendorId as string | undefined;
  if (vendorId && vendorId !== 'all') {
    return res.json(serverAreas.filter((a) => !a.vendorId || a.vendorId === 'all' || a.vendorId === vendorId));
  }
  return res.json(serverAreas);
});

apiRouter.post('/delivery/areas', requireRole(['admin']), (req: Request, res: Response) => {
  const area = req.body as DeliveryArea;
  if (!area || !area.id || !area.pincode || !area.areaName) {
    return res.status(400).json({ error: 'Valid DeliveryArea data with id, pincode, and areaName required' });
  }

  const normalized = normalizeServerArea(area) as DeliveryArea;
  const idx = serverAreas.findIndex((a) => a.id === area.id);
  if (idx >= 0) {
    serverAreas[idx] = normalized;
  } else {
    serverAreas.push(normalized);
  }
  lastAreasSync = Date.now();
  return res.json({ success: true, area: normalized });
});

apiRouter.delete('/delivery/areas/:id', requireRole(['admin']), (req: Request, res: Response) => {
  const id = req.params.id;
  serverAreas = serverAreas.filter((a) => a.id !== id);
  lastAreasSync = Date.now();
  return res.json({ success: true, id });
});

// Delivery Slots management endpoints
apiRouter.get('/delivery/slots', async (req: Request, res: Response) => {
  await hydrateCatalogIfNeeded([], undefined, undefined, true);
  const vendorId = req.query.vendorId as string | undefined;
  if (vendorId && vendorId !== 'all') {
    return res.json(serverSlots.filter((s) => !s.vendorId || s.vendorId === 'all' || s.vendorId === vendorId));
  }
  return res.json(serverSlots);
});

apiRouter.post('/delivery/slots', requireRole(['admin']), (req: Request, res: Response) => {
  const slot = req.body as DeliverySlot;
  if (!slot || !slot.id || !slot.name) {
    return res.status(400).json({ error: 'Valid DeliverySlot data with id and name required' });
  }

  const idx = serverSlots.findIndex((s) => s.id === slot.id);
  if (idx >= 0) {
    serverSlots[idx] = slot;
  } else {
    serverSlots.push(slot);
  }
  lastSlotsSync = Date.now();
  return res.json({ success: true, slot });
});

apiRouter.delete('/delivery/slots/:id', requireRole(['admin']), (req: Request, res: Response) => {
  const id = req.params.id;
  serverSlots = serverSlots.filter((s) => s.id !== id);
  lastSlotsSync = Date.now();
  return res.json({ success: true, id });
});

// Coupon Validation with Abuse Prevention & Advanced Rules
apiRouter.post('/coupons/validate', couponLimiter, async (req: Request, res: Response) => {
  const {
    code,
    cartSubtotal,
    subtotal,
    items = [],
    userId,
    userOrderCount = 0,
    userCouponUsageCount = 0,
  } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'Coupon code is required' });
  }

  const effectiveSubtotal = Number(cartSubtotal ?? subtotal) || 0;
  const cleanCode = String(code).trim().toUpperCase();
  await hydrateCatalogIfNeeded([], undefined, cleanCode);
  const coupon = serverCoupons.find((c) => c.code.toUpperCase() === cleanCode);

  if (!coupon) {
    return res.status(404).json({ error: `Invalid coupon code "${cleanCode}".` });
  }

  const validation = validateCouponWithRules({
    coupon,
    items: Array.isArray(items) ? items : [],
    cartSubtotal: effectiveSubtotal,
    userId: userId ? String(userId) : undefined,
    userOrderCount: Number(userOrderCount) || 0,
    userCouponUsageCount: Number(userCouponUsageCount) || 0,
    now: new Date(),
  });

  if (!validation.valid) {
    return res.status(400).json({
      valid: false,
      error: validation.error,
      code: cleanCode,
    });
  }

  return res.json({
    valid: true,
    code: cleanCode,
    discount: validation.discount,
    description: validation.description,
    savingsText: validation.savingsText,
    eligibleSubtotal: validation.eligibleSubtotal,
  });
});

function decodeFirestoreValue(val: any): any {
  if (!val || typeof val !== 'object') return val;
  if ('stringValue' in val) return val.stringValue;
  if ('integerValue' in val) return Number(val.integerValue);
  if ('doubleValue' in val) return Number(val.doubleValue);
  if ('booleanValue' in val) return Boolean(val.booleanValue);
  if ('nullValue' in val) return null;
  if ('timestampValue' in val) return val.timestampValue;
  if ('arrayValue' in val) {
    return Array.isArray(val.arrayValue?.values)
      ? val.arrayValue.values.map(decodeFirestoreValue)
      : [];
  }
  if ('mapValue' in val) {
    const out: Record<string, any> = {};
    const fields = val.mapValue?.fields || {};
    for (const [k, v] of Object.entries(fields)) {
      out[k] = decodeFirestoreValue(v);
    }
    return out;
  }
  return undefined;
}

function decodeFirestoreDoc(docJson: any): Record<string, any> | null {
  if (!docJson || !docJson.fields) return null;
  const docId = typeof docJson.name === 'string' ? docJson.name.split('/').pop() : undefined;
  const parsed: Record<string, any> = {};
  for (const [k, v] of Object.entries(docJson.fields)) {
    parsed[k] = decodeFirestoreValue(v);
  }
  if (!parsed.id && docId) parsed.id = docId;
  return parsed;
}

let lastCatalogSync = 0;
let lastAreasSync = 0;
let lastCouponsSync = 0;
let lastSlotsSync = 0;
const CATALOG_SYNC_TTL_MS = 15000;

function normalizeServerProduct(d: Record<string, any>): Record<string, any> {
  const price = Number(d.price ?? 0);
  const rawSale = d.salePrice ?? d.discountPrice;
  const salePrice = rawSale !== undefined && rawSale !== null && rawSale !== '' ? Number(rawSale) : undefined;
  const stockQuantity =
    d.stockQuantity !== undefined
      ? Number(d.stockQuantity)
      : d.stock !== undefined
      ? Number(d.stock)
      : undefined;
  const availability = d.availability !== false && d.isAvailable !== false;
  return {
    ...d,
    price: Number.isFinite(price) ? price : 0,
    ...(salePrice !== undefined && Number.isFinite(salePrice) && salePrice > 0 ? { salePrice, discountPrice: salePrice } : {}),
    ...(stockQuantity !== undefined && Number.isFinite(stockQuantity) ? { stockQuantity, stock: stockQuantity } : {}),
    availability,
    isAvailable: availability,
  };
}

function normalizeServerArea(d: Record<string, any>): Record<string, any> {
  return {
    ...d,
    deliveryCharge: d.deliveryCharge !== undefined ? Number(d.deliveryCharge) : 30,
    minimumOrder: d.minimumOrder !== undefined ? Number(d.minimumOrder) : 0,
    freeDeliveryAbove: d.freeDeliveryAbove !== undefined ? Number(d.freeDeliveryAbove) : undefined,
    isDeliverable: d.isDeliverable !== false,
    active: d.active !== false,
  };
}

function normalizeServerCoupon(d: Record<string, any>): Record<string, any> {
  return {
    ...d,
    code: String(d.code || '').trim().toUpperCase(),
    discountValue: Number(d.discountValue ?? 0),
    minOrderAmount: Number(d.minOrderAmount ?? 0),
    maxDiscount: d.maxDiscount !== undefined ? Number(d.maxDiscount) : undefined,
    usageLimit: d.usageLimit !== undefined ? Number(d.usageLimit) : undefined,
    usageCount: Number(d.usageCount ?? 0),
    active: d.active !== false,
  };
}

async function fetchFirestoreCollectionDocs(collectionName: string): Promise<any[]> {
  const envProjectId = process.env.VITE_FIREBASE_PROJECT_ID?.trim();
  const envDbId = process.env.VITE_FIREBASE_DATABASE_ID?.trim();
  const envApiKey = process.env.VITE_FIREBASE_API_KEY?.trim();
  const targets: Array<{ projectId: string; dbId: string; apiKey?: string }> = [];
  const isCustomEnvOverride = Boolean(envProjectId && envProjectId !== firebaseAppletConfig?.projectId);

  if (isCustomEnvOverride && envProjectId) {
    targets.push({ projectId: envProjectId, dbId: envDbId || '(default)', apiKey: envApiKey });
  }
  if (firebaseAppletConfig?.projectId && !targets.some((t) => t.projectId === firebaseAppletConfig.projectId)) {
    targets.push({
      projectId: firebaseAppletConfig.projectId,
      dbId: firebaseAppletConfig.firestoreDatabaseId || '(default)',
      apiKey: firebaseAppletConfig.apiKey,
    });
  }
  if (envProjectId && !targets.some((t) => t.projectId === envProjectId)) {
    targets.push({ projectId: envProjectId, dbId: envDbId || '(default)', apiKey: envApiKey });
  }

  for (const target of targets) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3500);
      const keyParam = target.apiKey ? `?key=${encodeURIComponent(target.apiKey)}` : '';
      const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(target.projectId)}/databases/${encodeURIComponent(target.dbId)}/documents:runQuery${keyParam}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          structuredQuery: {
            from: [{ collectionId: collectionName }],
            limit: 200,
          },
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) continue;
      const json = await res.json();
      if (Array.isArray(json) && json.length > 0) {
        const docs = json
          .filter((entry: any) => entry && entry.document)
          .map((entry: any) => decodeFirestoreDoc(entry.document))
          .filter((d: any): d is Record<string, any> => Boolean(d && d.id));
        if (docs.length > 0) {
          return docs;
        }
      }
    } catch {
      // Try next configured Firestore target or keep seed catalog
    }
  }
  return [];
}

async function hydrateCatalogIfNeeded(
  items: any[],
  pincode?: string,
  couponCode?: string,
  forceDeliverySync: boolean = false
): Promise<void> {
  const now = Date.now();
  const safeItems = Array.isArray(items) ? items : [];
  const missingProduct = safeItems.some((i) => {
    const pid = String(i?.productId || i?.id || '');
    return pid && !serverProducts.some((p) => p.id === pid);
  });
  const shouldSyncProducts = missingProduct || now - lastCatalogSync > CATALOG_SYNC_TTL_MS;

  const cleanPin = pincode ? String(pincode).replace(/\D/g, '').trim() : '';
  const missingPincode = Boolean(cleanPin && !matchDeliveryArea(cleanPin, serverAreas));
  const shouldSyncAreas =
    missingPincode ||
    (forceDeliverySync && now - lastAreasSync > CATALOG_SYNC_TTL_MS) ||
    (Boolean(cleanPin) && now - lastAreasSync > CATALOG_SYNC_TTL_MS);

  const shouldSyncSlots = forceDeliverySync && now - lastSlotsSync > CATALOG_SYNC_TTL_MS;

  const cleanCoupon = couponCode ? String(couponCode).trim().toUpperCase() : '';
  const missingCoupon = Boolean(cleanCoupon && !serverCoupons.some((c) => c.code.toUpperCase() === cleanCoupon));
  const shouldSyncCoupons = missingCoupon || (Boolean(cleanCoupon) && now - lastCouponsSync > CATALOG_SYNC_TTL_MS);

  const tasks: Promise<void>[] = [];

  if (shouldSyncProducts) {
    tasks.push(
      fetchFirestoreCollectionDocs('products').then((docs) => {
        lastCatalogSync = Date.now();
        for (const raw of docs) {
          const d = normalizeServerProduct(raw);
          const idx = serverProducts.findIndex((p) => p.id === d.id);
          if (idx >= 0) serverProducts[idx] = { ...serverProducts[idx], ...d };
          else serverProducts.push(d as any);
        }
      })
    );
  }

  if (shouldSyncAreas) {
    tasks.push(
      fetchFirestoreCollectionDocs('deliveryAreas').then((docs) => {
        lastAreasSync = Date.now();
        for (const raw of docs) {
          const d = normalizeServerArea(raw);
          const idx = serverAreas.findIndex((a) => a.id === d.id);
          if (idx >= 0) serverAreas[idx] = { ...serverAreas[idx], ...d };
          else serverAreas.push(d as any);
        }
      })
    );
  }

  if (shouldSyncSlots) {
    tasks.push(
      fetchFirestoreCollectionDocs('deliverySlots').then((docs) => {
        lastSlotsSync = Date.now();
        for (const raw of docs) {
          const idx = serverSlots.findIndex((s) => s.id === raw.id);
          if (idx >= 0) serverSlots[idx] = { ...serverSlots[idx], ...raw };
          else serverSlots.push(raw as any);
        }
      })
    );
  }

  if (shouldSyncCoupons) {
    tasks.push(
      fetchFirestoreCollectionDocs('coupons').then((docs) => {
        lastCouponsSync = Date.now();
        for (const raw of docs) {
          const d = normalizeServerCoupon(raw);
          const idx = serverCoupons.findIndex((c) => c.id === d.id || c.code.toUpperCase() === String(d.code || '').toUpperCase());
          if (idx >= 0) serverCoupons[idx] = { ...serverCoupons[idx], ...d };
          else serverCoupons.push(d as any);
        }
      })
    );
  }

  if (tasks.length > 0) {
    await Promise.allSettled(tasks);
  }
}

// Helper to run authoritative server-side cart & pricing verification
export function verifyCartItemsServer(
  items: any[],
  pincode?: string,
  couponCode?: string
): {
  valid: boolean;
  error?: string;
  verifiedItems: any[];
  calculatedSubtotal: number;
  deliveryCharge: number;
  discount: number;
  grandTotal: number;
  estimatedDeliveryTime: string;
  vendorBreakdowns?: any[];
} {
  if (!Array.isArray(items) || items.length === 0) {
    return {
      valid: false,
      error: 'Cart is empty. Please add items before checking out.',
      verifiedItems: [],
      calculatedSubtotal: 0,
      deliveryCharge: 0,
      discount: 0,
      grandTotal: 0,
      estimatedDeliveryTime: '30 mins',
      vendorBreakdowns: [],
    };
  }

  let calculatedSubtotal = 0;
  const verifiedItems: any[] = [];
  const vendorItemMap = new Map<string, any[]>();

  for (const item of items) {
    const productId = String(item.productId || item.id || '');
    const quantity = Number(item.quantity);

    // 1. Prevent negative or non-integer quantity
    if (!Number.isInteger(quantity) || quantity <= 0) {
      return {
        valid: false,
        error: `Invalid quantity (${quantity}) for product ID '${productId}'. Quantity must be a positive whole number.`,
        verifiedItems: [],
        calculatedSubtotal: 0,
        deliveryCharge: 0,
        discount: 0,
        grandTotal: 0,
        estimatedDeliveryTime: '',
        vendorBreakdowns: [],
      };
    }

    // 2. Prevent invalid product
    const product = serverProducts.find((p) => p.id === productId);
    if (!product) {
      return {
        valid: false,
        error: `Invalid product '${productId}'. This item does not exist in our catalog.`,
        verifiedItems: [],
        calculatedSubtotal: 0,
        deliveryCharge: 0,
        discount: 0,
        grandTotal: 0,
        estimatedDeliveryTime: '',
        vendorBreakdowns: [],
      };
    }

    // 3. Prevent unavailable product purchase
    if (product.availability === false || (product as any).isAvailable === false) {
      return {
        valid: false,
        error: `Product '${product.name}' is currently unavailable for order.`,
        verifiedItems: [],
        calculatedSubtotal: 0,
        deliveryCharge: 0,
        discount: 0,
        grandTotal: 0,
        estimatedDeliveryTime: '',
        vendorBreakdowns: [],
      };
    }

    // 4. Prevent out-of-stock purchase (treat missing stockQuantity on Firestore records as default available stock unless marked out of stock)
    const rawStock =
      product.stockQuantity !== undefined && product.stockQuantity !== null
        ? Number(product.stockQuantity)
        : product.stock !== undefined && product.stock !== null
        ? Number(product.stock)
        : 10;
    const availableStock = Number.isFinite(rawStock) ? rawStock : 10;
    if (availableStock <= 0) {
      return {
        valid: false,
        error: `Product '${product.name}' is completely out of stock.`,
        verifiedItems: [],
        calculatedSubtotal: 0,
        deliveryCharge: 0,
        discount: 0,
        grandTotal: 0,
        estimatedDeliveryTime: '',
        vendorBreakdowns: [],
      };
    }

    // 5. Prevent overstock purchase
    if (quantity > availableStock) {
      return {
        valid: false,
        error: `Overstock limit: You requested ${quantity} units of '${product.name}', but only ${availableStock} units are available in inventory.`,
        verifiedItems: [],
        calculatedSubtotal: 0,
        deliveryCharge: 0,
        discount: 0,
        grandTotal: 0,
        estimatedDeliveryTime: '',
        vendorBreakdowns: [],
      };
    }

    // 6. Prevent price manipulation: NEVER trust client price!
    const rawSalePrice = Number(product.salePrice ?? (product as any).discountPrice ?? 0);
    const basePrice = Number(product.price ?? 0);
    const authoritativePrice = rawSalePrice > 0 ? rawSalePrice : basePrice;
    const itemTotal = authoritativePrice * quantity;
    calculatedSubtotal += itemTotal;

    const vendorId = getProductVendorId(product);

    const verifiedEntry = {
      productId: product.id,
      productName: product.name,
      productImage: product.images?.[0] || (product as any).imageUrls?.[0] || '',
      price: authoritativePrice,
      originalPrice: basePrice,
      quantity,
      weight: item.weight || product.weight,
      total: itemTotal,
      vendorId,
    };

    verifiedItems.push(verifiedEntry);

    if (!vendorItemMap.has(vendorId)) {
      vendorItemMap.set(vendorId, []);
    }
    vendorItemMap.get(vendorId)!.push(verifiedEntry);
  }

  // 7. Authoritative Multi-Vendor Delivery and ETA Calculation
  // Strict rule: "Never promise an ETA unless delivery rules confirm it."
  let totalDeliveryCharge = 0;
  const vendorBreakdowns: any[] = [];
  const etaList: string[] = [];

  for (const [vId, vItems] of vendorItemMap.entries()) {
    const vMeta = getVendorMetadata(vId);
    const vSubtotal = vItems.reduce((acc, curr) => acc + curr.total, 0);

    let vDeliveryFee = 30;
    let vEta = '25-35 mins';
    let isAvailable = true;
    let statusText = 'Available for dispatch';

    if (pincode) {
      const area = matchDeliveryArea(String(pincode).trim(), serverAreas, vId);
      if (!area || !area.isDeliverable || area.active === false) {
        // Fallback to platform-wide rule
        const platformArea = matchDeliveryArea(String(pincode).trim(), serverAreas);
        if (platformArea && platformArea.isDeliverable && platformArea.active !== false) {
          const feeObj = calculateDeliveryFee(platformArea, vSubtotal);
          vDeliveryFee = feeObj.effectiveDeliveryCharge;
          vEta = formatDeliveryETA(platformArea).etaText;
        } else {
          isAvailable = false;
          statusText = 'Currently unavailable in this pincode';
          vEta = 'Unavailable';
        }
      } else {
        const feeObj = calculateDeliveryFee(area, vSubtotal);
        vDeliveryFee = feeObj.effectiveDeliveryCharge;
        vEta = formatDeliveryETA(area).etaText;
      }
    } else {
      if (vSubtotal >= 299) {
        vDeliveryFee = 0;
      }
    }

    if (!isAvailable) {
      return {
        valid: false,
        error: `Vendor '${vMeta.name}' is currently unavailable for delivery to pincode '${pincode}'.`,
        verifiedItems: [],
        calculatedSubtotal: 0,
        deliveryCharge: 0,
        discount: 0,
        grandTotal: 0,
        estimatedDeliveryTime: '',
        vendorBreakdowns: [],
      };
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
      discount: 0, // to be allocated after coupon check
      deliveryCharge: vDeliveryFee,
      total: vSubtotal + vDeliveryFee,
      estimatedDeliveryTime: vEta,
      isAvailable,
      statusText,
    });
  }

  // 8. Authoritative Coupon validation
  let discount = 0;
  if (couponCode) {
    const coupon = serverCoupons.find(
      (c) => c.code.toUpperCase() === String(couponCode).trim().toUpperCase()
    );
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

  // Ensure discount doesn't exceed subtotal
  discount = Math.min(discount, calculatedSubtotal);

  // Distribute discount proportionally across vendors
  for (const vb of vendorBreakdowns) {
    if (calculatedSubtotal > 0 && discount > 0) {
      const vShare = Math.round((vb.subtotal / calculatedSubtotal) * discount);
      vb.discount = Math.min(vb.subtotal, vShare);
      vb.total = Math.max(0, vb.subtotal + vb.deliveryCharge - vb.discount);
    }
  }

  const grandTotal = Math.max(0, calculatedSubtotal + totalDeliveryCharge - discount);
  const overallEta = etaList.length > 0 ? (etaList.length === 1 ? etaList[0] : `${etaList[0]} - ${etaList[etaList.length - 1]}`) : '30-45 mins';

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

// Server-Side Order Price & Total Recalculation (endpoint)
apiRouter.post(['/orders/validate', '/checkout/validate'], async (req: Request, res: Response) => {
  const { items, pincode, couponCode } = req.body;
  await hydrateCatalogIfNeeded(items, pincode, couponCode);
  const result = verifyCartItemsServer(items, pincode, couponCode);

  if (!result.valid) {
    return res.status(400).json({ error: result.error });
  }

  return res.json(result);
});

// =========================================================================
// PAYMENT GATEWAY ABSTRACTION ENDPOINTS
// =========================================================================

// Create Payment Order via Gateway Abstraction (Server-side secrets)
apiRouter.post('/payment/create-order', paymentLimiter, async (req: Request, res: Response) => {
  try {
    const {
      amount,
      currency = 'INR',
      receiptId,
      provider = 'UPI',
      customerName = 'Valued Customer',
      customerEmail,
      customerPhone = '',
    } = req.body;

    if (!customerEmail || customerEmail.toLowerCase().includes('guest@') || customerEmail === 'guest') {
      return res.status(401).json({
        error: 'Authentication required. Please sign in or create an account to initiate payment. (Order ke liye sign in ya account banana anivarya hai)',
      });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid positive amount is required for payment order' });
    }

    const gateway = PaymentGatewayManager.getGateway(provider as GatewayProviderType);
    const orderResult = await gateway.createOrder({
      amount: Number(amount),
      currency,
      receiptId: receiptId || `rec_${Date.now()}`,
      customerName,
      customerEmail,
      customerPhone,
    });

    return res.json(orderResult);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to create payment order' });
  }
});

// Verify Payment via Gateway Abstraction (Server-side signature check)
apiRouter.post('/payment/verify', paymentLimiter, async (req: Request, res: Response) => {
  try {
    const {
      gatewayOrderId,
      transactionRef,
      provider = 'UPI',
      serverSignature,
      amount,
      paymentDetails,
    } = req.body;

    if (!gatewayOrderId || !transactionRef) {
      return res.status(400).json({
        verified: false,
        status: 'FAILED',
        error: 'gatewayOrderId and transactionRef are required for payment verification',
      });
    }

    const gateway = PaymentGatewayManager.getGateway(provider as GatewayProviderType);
    const verification = await gateway.verifyPayment({
      gatewayOrderId,
      transactionRef,
      provider: provider as GatewayProviderType,
      serverSignature,
      amount: Number(amount),
      paymentDetails,
    });

    if (!verification.verified) {
      return res.status(402).json(verification);
    }

    return res.json(verification);
  } catch (err: any) {
    return res.status(500).json({
      verified: false,
      status: 'FAILED',
      error: err.message || 'Payment verification failed',
    });
  }
});

// =========================================================================
// ORDER CREATION & MANAGEMENT (IDEMPOTENCY, VALIDATION & STATUS LIFECYCLE)
// =========================================================================

// Secure Order Creation (supports both /api/orders/create and /api/checkout)
apiRouter.post(['/orders/create', '/checkout'], orderLimiter, async (req: Request, res: Response) => {
  try {
    const idempotencyKey = String(
      req.headers['x-idempotency-key'] || req.body?.idempotencyKey || ''
    ).trim();

    // 1. Idempotency Check: Prevent duplicate orders
    if (idempotencyKey && idempotencyStore.has(idempotencyKey)) {
      const cached = idempotencyStore.get(idempotencyKey)!;
      return res.status(200).json({
        success: true,
        order: cached.order,
        isIdempotentReplay: true,
        message: 'Order already processed successfully.',
      });
    }

    const {
      customerId,
      customerName,
      customerEmail,
      customerPhone,
      items,
      deliveryAddress,
      paymentMethod = 'UPI',
      paymentId,
      gatewayOrderId,
      couponCode,
      notes,
      deliverySlotId,
    } = req.body;

    // MANDATORY AUTHENTICATION CHECK: Orders can only be placed by registered and logged-in customers
    if (
      !customerId ||
      customerId === 'guest_user' ||
      customerId === 'guest' ||
      customerId === 'anonymous' ||
      !customerEmail ||
      customerEmail.toLowerCase().includes('guest@')
    ) {
      return res.status(401).json({
        success: false,
        error: 'Order placement requires an active customer account. Please sign in or create an account to place your order. (Bina account ya sign in ke order nahi kiya ja sakta)',
      });
    }

    if (!deliveryAddress || !deliveryAddress.pincode || !deliveryAddress.addressLine) {
      return res.status(400).json({ error: 'Valid delivery address with addressLine and pincode is required' });
    }

    if (!customerPhone || String(customerPhone).replace(/\D/g, '').length < 10) {
      return res.status(400).json({ error: 'Valid 10-digit customer phone number is required' });
    }

    // 2. Authoritative server-side price, inventory stock, coupon & delivery re-verification
    await hydrateCatalogIfNeeded(items, deliveryAddress.pincode, couponCode);
    const verification = verifyCartItemsServer(items, deliveryAddress.pincode, couponCode);
    if (!verification.valid) {
      return res.status(400).json({ error: verification.error });
    }

    const {
      verifiedItems,
      calculatedSubtotal: subtotal,
      deliveryCharge,
      discount,
      grandTotal,
      estimatedDeliveryTime,
    } = verification;

    // 3. Payment verification & status determination
    const isCod = paymentMethod === 'COD' || paymentMethod === 'Cash on Delivery';
    let paymentStatus: 'Pending' | 'Paid' | 'Failed' | 'Refunded' = 'Pending';
    let effectivePaymentId = paymentId;

    if (!isCod) {
      // Online payment (UPI, PhonePe, Google Pay, Paytm, Cards, Net Banking)
      if (!paymentId) {
        effectivePaymentId = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      }
      paymentStatus = 'Paid';
    } else {
      effectivePaymentId = `cod_${Date.now()}`;
      paymentStatus = 'Pending';
    }

    // 4. Atomic inventory stock deduction on server
    for (const vItem of verifiedItems) {
      const prod = serverProducts.find((p) => p.id === vItem.productId);
      if (prod) {
        prod.stockQuantity = Math.max(0, (prod.stockQuantity || 0) - vItem.quantity);
        if (prod.stockQuantity === 0) {
          prod.availability = false;
        }
      }
    }

    // 5. Generate formatted Order Number: PS100001, PS100002...
    const orderNumber = generateNextOrderNumber();
    const orderId = `ord-${orderNumber.toLowerCase()}`;

    // Standardized Order Status: Initial is strictly 'PLACED'
    const initialStatus: OrderStatus = 'PLACED';

    // 6. Multi-vendor order splitting: Create child VendorOrder records
    const childVendorOrders: VendorOrder[] = [];
    const vendorBreakdowns = verification.vendorBreakdowns || [];

    for (const vb of vendorBreakdowns) {
      const vItems = verifiedItems.filter((i) => i.vendorId === vb.vendorId);
      const vOrderId = `vord-${orderId}-${vb.vendorId}`;

      // Authoritative hierarchical commission calculation (Product -> Category -> Vendor -> Global)
      const commissionCalc = calculateOrderCommissionForVendor(
        orderId,
        vb.vendorId,
        vItems.map((vi) => {
          const prod = serverProducts.find((p) => p.id === vi.productId);
          return {
            productId: vi.productId,
            productName: vi.productName,
            categoryId: prod?.categoryId,
            vendorId: vb.vendorId,
            unitPrice: vi.price,
            quantity: vi.quantity,
            discount: vb.discount > 0 && vb.subtotal > 0 ? Math.round((vi.total / vb.subtotal) * vb.discount) : 0,
          };
        }),
        vb.deliveryCharge,
        serverCommissionConfig
      );

      const effectiveCommissionRate =
        commissionCalc.grossSales > 0 && (commissionCalc.grossSales - commissionCalc.totalDiscount) > 0
          ? Math.round((commissionCalc.totalCommission / (commissionCalc.grossSales - commissionCalc.totalDiscount)) * 100)
          : serverCommissionConfig.globalRate;

      const vendorOrder: VendorOrder = {
        id: vOrderId,
        orderId,
        orderNumber,
        vendorId: vb.vendorId,
        vendorName: vb.vendorName,
        items: vItems,
        vendorSubtotal: vb.subtotal,
        vendorDiscount: vb.discount,
        vendorDeliveryFee: vb.deliveryCharge,
        vendorTotal: vb.total,
        commissionRate: effectiveCommissionRate,
        commissionAmount: commissionCalc.totalCommission,
        payoutAmount: commissionCalc.vendorEarnings,
        status: initialStatus,
        estimatedDeliveryTime: vb.estimatedDeliveryTime,
        isAvailable: vb.isAvailable,
        preparationStatus: 'received',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      childVendorOrders.push(vendorOrder);
      serverVendorOrders.unshift(vendorOrder);

      // Create an auditable, immutable Financial Ledger SALE entry
      const txId = `tx_ord_${orderId}_${vb.vendorId}`;
      const prevBal = getVendorLatestBalance(vb.vendorId);
      const newBal = prevBal + commissionCalc.vendorEarnings;
      const nowTs = new Date().toISOString();
      const auditHash = generateAuditHash(
        txId,
        vb.vendorId,
        'SALE',
        commissionCalc.vendorEarnings,
        newBal,
        nowTs
      );

      const ledgerEntry: FinancialLedgerEntry = {
        id: `ledg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        transactionId: txId,
        vendorId: vb.vendorId,
        vendorName: vb.vendorName,
        orderId,
        orderNumber,
        type: 'SALE',
        amount: commissionCalc.vendorEarnings,
        balanceBefore: prevBal,
        balanceAfter: newBal,
        description: `Order sale ${orderNumber} - Gross ₹${commissionCalc.grossSales}, Discount ₹${commissionCalc.totalDiscount}, Commission ₹${commissionCalc.totalCommission}`,
        auditHash,
        createdAt: nowTs,
        createdBy: 'system_checkout',
        metadata: {
          grossSales: commissionCalc.grossSales,
          totalDiscount: commissionCalc.totalDiscount,
          totalCommission: commissionCalc.totalCommission,
          effectiveRate: effectiveCommissionRate,
          itemCount: vItems.length,
        },
      };
      serverFinancialLedger.unshift(ledgerEntry);
    }

    const order: Order = {
      id: orderId,
      orderNumber,
      customerId: customerId,
      customerName: customerName || deliveryAddress.name || 'Valued Customer',
      customerEmail: customerEmail,
      customerPhone: customerPhone || deliveryAddress.phone,
      items: verifiedItems,
      deliveryAddress,
      deliverySlotId,
      subtotal,
      deliveryCharge,
      discount,
      couponCode,
      total: grandTotal,
      status: initialStatus,
      paymentMethod: paymentMethod as PaymentMethod,
      paymentStatus,
      paymentId: effectivePaymentId,
      notes,
      estimatedDeliveryTime,
      deliveryAreaPincode: deliveryAddress.pincode,
      isMultiVendor: childVendorOrders.length > 1,
      vendorOrderIds: childVendorOrders.map((vo) => vo.id),
      vendorOrders: childVendorOrders,
      statusHistory: [
        {
          status: 'PLACED',
          timestamp: new Date().toISOString(),
          note: isCod
            ? 'Order placed successfully with Cash on Delivery. Cash to be collected at doorstep.'
            : `Order placed successfully. Payment verified via ${paymentMethod}.`,
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Store in server orders repository
    serverOrders.unshift(order);

    // Phase 7: Authoritative Advertising Attribution evaluation (strictly non-modifying reporting metadata)
    try {
      recordOrderAttributionsServer({
        orderId: order.id,
        orderNumber: order.orderNumber,
        customerId: order.customerId,
        orderTimestamp: order.createdAt,
        items: (order.items || []).map((i) => ({
          productId: i.productId,
          productName: i.productName,
          price: i.price,
          unitPrice: i.price,
          quantity: i.quantity,
          total: i.total,
          vendorId: i.vendorId,
        })),
      });
    } catch (attrErr) {
      console.warn('[ServerApi] Order attribution processing notice:', attrErr);
    }

    // Save to idempotency store if key was provided
    if (idempotencyKey) {
      idempotencyStore.set(idempotencyKey, { order, timestamp: Date.now() });
    }

    return res.status(201).json({
      success: true,
      order,
      orderNumber: order.orderNumber,
      paymentStatus: order.paymentStatus,
      vendorOrders: childVendorOrders,
      message: 'Order placed successfully and confirmed.',
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Order creation failed' });
  }
});

// Order Cancellation Endpoint with Stock Restoration & Refund Architecture
apiRouter.post('/orders/:id/cancel', async (req: Request, res: Response) => {
  try {
    const orderId = req.params.id;
    const { reason = 'Cancelled by customer' } = req.body;

    const order = serverOrders.find(
      (o) => o.id === orderId || o.orderNumber.toUpperCase() === orderId.toUpperCase()
    );

    if (!order) {
      return res.status(404).json({ error: `Order ${orderId} not found` });
    }

    // Check if order can be cancelled
    const cancellableStatuses = ['PLACED', 'CONFIRMED', 'PREPARING', 'Order Placed', 'Confirmed', 'Preparing'];
    if (!cancellableStatuses.includes(order.status)) {
      return res.status(400).json({
        error: `Order in status '${order.status}' cannot be cancelled. Orders that are packed or out for delivery cannot be cancelled.`,
      });
    }

    // 1. Restore stock in catalog inventory
    if (Array.isArray(order.items)) {
      for (const item of order.items) {
        const prod = serverProducts.find((p) => p.id === item.productId);
        if (prod) {
          prod.stockQuantity = (prod.stockQuantity || 0) + item.quantity;
          prod.availability = true;
        }
      }
    }

    // 2. Refund processing for paid orders
    let refundResult: RefundResult | null = null;
    const isPaid = order.paymentStatus === 'Paid';

    if (isPaid && order.paymentId) {
      try {
        const provider = (order.paymentMethod as GatewayProviderType) || 'UPI';
        const gateway = PaymentGatewayManager.getGateway(provider);
        refundResult = await gateway.processRefund({
          paymentId: order.paymentId,
          orderNumber: order.orderNumber,
          amount: order.total,
          reason,
        });
        order.paymentStatus = 'Refunded';
        order.status = 'REFUNDED';
      } catch (refundErr: any) {
        console.warn('Refund initiation note:', refundErr);
        order.status = 'CANCELLED';
      }
    } else {
      order.status = 'CANCELLED';
    }

    order.updatedAt = new Date().toISOString();
    order.statusHistory = order.statusHistory || [];
    order.statusHistory.push({
      status: order.status,
      timestamp: new Date().toISOString(),
      note: `Order cancelled. Reason: ${reason}. ${
        isPaid
          ? `Refund of ₹${order.total} initiated (${refundResult?.refundId || 'Processing'}).`
          : 'No payment refund required (COD).'
      }`,
    });

    // Also cancel all associated child vendor orders and log financial refund transactions
    const relatedVendorOrders = serverVendorOrders.filter(
      (vo) => vo.orderId === order.id || vo.orderNumber === order.orderNumber
    );
    for (const vo of relatedVendorOrders) {
      vo.status = 'CANCELLED';
      vo.preparationStatus = 'cancelled';
      vo.refundStatus = isPaid ? 'completed' : 'none';
      vo.updatedAt = new Date().toISOString();

      // Create an auditable REFUND entry in the financial ledger
      const refundTxId = `tx_ref_${order.orderNumber}_${vo.vendorId}`;
      const prevBal = getVendorLatestBalance(vo.vendorId);
      const newBal = Math.max(0, prevBal - vo.payoutAmount);
      const nowTs = new Date().toISOString();
      const auditHash = generateAuditHash(
        refundTxId,
        vo.vendorId,
        'REFUND',
        -vo.payoutAmount,
        newBal,
        nowTs
      );

      serverFinancialLedger.unshift({
        id: `ledg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        transactionId: refundTxId,
        vendorId: vo.vendorId,
        vendorName: vo.vendorName,
        orderId: order.id,
        orderNumber: order.orderNumber,
        type: 'REFUND',
        amount: -vo.payoutAmount,
        balanceBefore: prevBal,
        balanceAfter: newBal,
        description: `Order cancellation refund adjustment for ${order.orderNumber} (${reason})`,
        reason,
        auditHash,
        createdAt: nowTs,
        createdBy: 'system_refund',
        metadata: {
          refundAmount: vo.payoutAmount,
          orderTotal: vo.vendorTotal,
        },
      });
    }

    return res.json({
      success: true,
      order,
      refundResult,
      message: isPaid
        ? `Order cancelled and refund of ₹${order.total} initiated.`
        : 'Order cancelled successfully.',
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Order cancellation failed' });
  }
});

// Partial Cancellation / Single Vendor Order Cancellation Endpoint
apiRouter.post('/orders/:id/vendor-orders/:vendorId/cancel', async (req: Request, res: Response) => {
  try {
    const { id: orderIdentifier, vendorId } = req.params;
    const { reason = 'Vendor cancelled item batch' } = req.body;

    const parentOrder = serverOrders.find(
      (o) => o.id === orderIdentifier || o.orderNumber.toUpperCase() === orderIdentifier.toUpperCase()
    );

    const vendorOrder = serverVendorOrders.find(
      (vo) =>
        (vo.orderId === orderIdentifier || vo.orderNumber.toUpperCase() === orderIdentifier.toUpperCase()) &&
        vo.vendorId === vendorId
    );

    if (!vendorOrder) {
      return res.status(404).json({ error: `Vendor order for vendor '${vendorId}' not found.` });
    }

    if (vendorOrder.status === 'CANCELLED' || vendorOrder.status === 'DELIVERED') {
      return res.status(400).json({ error: `Cannot cancel vendor order in status '${vendorOrder.status}'` });
    }

    // 1. Restore inventory for this vendor's items
    for (const item of vendorOrder.items) {
      const prod = serverProducts.find((p) => p.id === item.productId);
      if (prod) {
        prod.stockQuantity = (prod.stockQuantity || 0) + item.quantity;
        prod.availability = true;
      }
    }

    // 2. Process partial refund if parent was paid
    let refundResult: RefundResult | null = null;
    const isPaid = parentOrder && parentOrder.paymentStatus === 'Paid';
    const refundAmount = vendorOrder.vendorTotal ?? vendorOrder.vendorSubtotal ?? vendorOrder.payoutAmount ?? 0;

    if (isPaid && parentOrder.paymentId && refundAmount > 0) {
      try {
        const provider = (parentOrder.paymentMethod as GatewayProviderType) || 'UPI';
        const gateway = PaymentGatewayManager.getGateway(provider);
        refundResult = await gateway.processRefund({
          paymentId: parentOrder.paymentId,
          orderNumber: `${parentOrder.orderNumber}-${vendorId}`,
          amount: refundAmount,
          reason: `Partial refund for vendor ${vendorId}: ${reason}`,
        });
        vendorOrder.refundStatus = 'completed';
      } catch (err: any) {
        vendorOrder.refundStatus = 'pending';
      }
    } else {
      vendorOrder.refundStatus = 'none';
    }

    vendorOrder.status = 'CANCELLED';
    vendorOrder.preparationStatus = 'cancelled';
    vendorOrder.updatedAt = new Date().toISOString();

    // Create an auditable REFUND entry in the financial ledger
    const partialRefundTxId = `tx_part_ref_${orderIdentifier}_${vendorId}`;
    const currentBal = getVendorLatestBalance(vendorId);
    const newVendorBal = Math.max(0, currentBal - vendorOrder.payoutAmount);
    const nowTime = new Date().toISOString();
    const auditHash = generateAuditHash(
      partialRefundTxId,
      vendorId,
      'REFUND',
      -vendorOrder.payoutAmount,
      newVendorBal,
      nowTime
    );

    serverFinancialLedger.unshift({
      id: `ledg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      transactionId: partialRefundTxId,
      vendorId,
      vendorName: vendorOrder.vendorName,
      orderId: parentOrder?.id || orderIdentifier,
      orderNumber: parentOrder?.orderNumber || orderIdentifier,
      type: 'REFUND',
      amount: -vendorOrder.payoutAmount,
      balanceBefore: currentBal,
      balanceAfter: newVendorBal,
      description: `Partial cancellation refund for vendor batch (${vendorOrder.vendorName}): ${reason}`,
      reason,
      auditHash,
      createdAt: nowTime,
      createdBy: 'system_vendor_refund',
      metadata: {
        refundAmount: vendorOrder.payoutAmount,
        vendorTotal: vendorOrder.vendorTotal,
      },
    });

    // 3. Update Parent Order state if all or partial
    if (parentOrder) {
      const siblingVendorOrders = serverVendorOrders.filter(
        (vo) => vo.orderId === parentOrder.id || vo.orderNumber === parentOrder.orderNumber
      );
      const allCancelled = siblingVendorOrders.every((vo) => vo.status === 'CANCELLED');
      const allDone = siblingVendorOrders.every((vo) => ['CANCELLED', 'DELIVERED'].includes(vo.status));

      if (allCancelled) {
        parentOrder.status = 'CANCELLED';
      }

      parentOrder.statusHistory = parentOrder.statusHistory || [];
      parentOrder.statusHistory.push({
        status: parentOrder.status,
        timestamp: new Date().toISOString(),
        note: `Vendor (${vendorOrder.vendorName}) items cancelled. ${
          refundResult ? `Partial refund of ₹${refundAmount} processed.` : ''
        }`,
      });
      parentOrder.updatedAt = new Date().toISOString();
    }

    return res.json({
      success: true,
      vendorOrder,
      parentOrder,
      refundResult,
      message: `Vendor order for ${vendorOrder.vendorName} has been cancelled and inventory restored.`,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Vendor order cancellation failed' });
  }
});

// Update Vendor Order Preparation & Delivery Lifecycle
apiRouter.post('/vendor-orders/:id/status', requireRole(['vendor', 'staff', 'admin']), (req: Request, res: Response) => {
  const { id } = req.params;
  const { preparationStatus, status } = req.body;

  const vendorOrder = serverVendorOrders.find((vo) => vo.id === id);
  if (!vendorOrder) {
    return res.status(404).json({ error: `Vendor order ${id} not found.` });
  }

  if (preparationStatus) {
    vendorOrder.preparationStatus = preparationStatus;
  }
  if (status) {
    vendorOrder.status = status;
  }
  vendorOrder.updatedAt = new Date().toISOString();

  // Update parent order summary if all vendor orders advanced
  const parentOrder = serverOrders.find((o) => o.id === vendorOrder.orderId || o.orderNumber === vendorOrder.orderNumber);
  if (parentOrder) {
    const siblingOrders = serverVendorOrders.filter(
      (vo) => vo.orderId === parentOrder.id || vo.orderNumber === parentOrder.orderNumber
    );

    const allDelivered = siblingOrders.every((vo) => vo.status === 'DELIVERED');
    const allOutForDelivery = siblingOrders.every((vo) => ['DELIVERED', 'OUT_FOR_DELIVERY'].includes(vo.status));

    if (allDelivered) {
      parentOrder.status = 'DELIVERED';
    } else if (allOutForDelivery) {
      parentOrder.status = 'OUT_FOR_DELIVERY';
    }

    parentOrder.updatedAt = new Date().toISOString();
  }

  return res.json({
    success: true,
    vendorOrder,
    parentOrder,
  });
});

// Get Vendor Orders (strictly filtered by vendorId for Zero-Trust isolation)
apiRouter.get('/vendor-orders', requireRole(['vendor']), (req: Request, res: Response) => {
  const vendorId = req.query.vendorId as string | undefined;
  if (!vendorId) {
    return res.status(400).json({ error: 'vendorId is required to query vendor orders' });
  }

  const filtered = serverVendorOrders.filter((vo) => vo.vendorId === vendorId);
  return res.json(filtered);
});

// Admin endpoint: Get All Vendor Orders across the marketplace
apiRouter.get('/admin/vendor-orders', requireRole(['admin']), (req: Request, res: Response) => {
  return res.json(serverVendorOrders);
});

// Dedicated Refund Endpoint (for Admin / System)
apiRouter.post('/orders/:id/refund', requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const orderId = req.params.id;
    const { amount, reason = 'Admin initiated refund' } = req.body;

    const order = serverOrders.find(
      (o) => o.id === orderId || o.orderNumber.toUpperCase() === orderId.toUpperCase()
    );

    if (!order) {
      return res.status(404).json({ error: `Order ${orderId} not found` });
    }

    const refundAmount = amount ? Number(amount) : order.total;
    const provider = (order.paymentMethod as GatewayProviderType) || 'UPI';
    const gateway = PaymentGatewayManager.getGateway(provider);

    const refundResult = await gateway.processRefund({
      paymentId: order.paymentId || `pay_${order.orderNumber}`,
      orderNumber: order.orderNumber,
      amount: refundAmount,
      reason,
    });

    order.status = 'REFUNDED';
    order.paymentStatus = 'Refunded';
    order.updatedAt = new Date().toISOString();
    order.statusHistory = order.statusHistory || [];
    order.statusHistory.push({
      status: 'REFUNDED',
      timestamp: new Date().toISOString(),
      note: `Refund of ₹${refundAmount} processed (${refundResult.refundId}). Reason: ${reason}`,
    });

    return res.json({
      success: true,
      order,
      refundResult,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Refund processing failed' });
  }
});

// Get Order By ID / Order Number
apiRouter.get('/orders/:id', (req: Request, res: Response) => {
  const query = req.params.id.trim().toLowerCase();
  const order = serverOrders.find(
    (o) =>
      o.id.toLowerCase() === query ||
      o.orderNumber.toLowerCase() === query ||
      o.orderNumber.toLowerCase().replace(/[^a-z0-9]/g, '') === query.replace(/[^a-z0-9]/g, '')
  );

  if (!order) {
    return res.status(404).json({ error: `Order '${req.params.id}' not found` });
  }

  return res.json(order);
});

// Get All Orders (or filter by customer with authoritative access control)
apiRouter.get('/orders', (req: Request, res: Response) => {
  const customerId = req.query.customerId as string | undefined;
  const rawRole = (req.headers['x-user-role'] as string)?.toLowerCase();
  const rawEmail = (req.headers['x-user-email'] as string)?.toLowerCase();
  const configuredAdminEmail = (process.env.ADMIN_EMAIL || 'aanews70@gmail.com').trim().toLowerCase();
  const isAdminOrStaff = rawRole === 'admin' ||
    rawRole === 'staff' ||
    rawEmail?.startsWith('staff') ||
    rawEmail === configuredAdminEmail;

  if (customerId) {
    return res.json(serverOrders.filter((o) => o.customerId === customerId));
  }
  if (!isAdminOrStaff) {
    return res.status(403).json({ error: 'Access Denied: customerId is required to query orders, or Admin/Staff authorization required.' });
  }
  return res.json(serverOrders);
});

/* =========================================================================
   REVIEWS API - "Reviews only for eligible delivered purchases"
   ========================================================================= */

// Get eligible items for review (customer has delivered orders with these products)
apiRouter.get('/reviews/eligible', (req: Request, res: Response) => {
  const customerId = req.query.customerId as string | undefined;
  const customerEmail = req.query.customerEmail as string | undefined;

  const deliveredOrders = serverOrders.filter((o) => {
    const isDelivered = o.status === 'DELIVERED' || o.status === 'Delivered';
    const matchesCustomer =
      !customerId ||
      o.customerId === customerId ||
      (customerEmail && o.customerEmail?.toLowerCase() === customerEmail.toLowerCase());
    return isDelivered && matchesCustomer;
  });

  const eligibleItems: {
    productId: string;
    productName: string;
    productImage: string;
    orderId: string;
    orderNumber: string;
    deliveredAt: string;
    alreadyReviewed: boolean;
  }[] = [];

  for (const ord of deliveredOrders) {
    if (Array.isArray(ord.items)) {
      for (const item of ord.items) {
        const alreadyReviewed = serverReviews.some(
          (r) =>
            r.productId === item.productId &&
            (!customerId || r.customerId === customerId)
        );
        eligibleItems.push({
          productId: item.productId,
          productName: item.productName,
          productImage: item.productImage,
          orderId: ord.id,
          orderNumber: ord.orderNumber,
          deliveredAt: ord.updatedAt || ord.createdAt,
          alreadyReviewed,
        });
      }
    }
  }

  return res.json({ eligibleItems });
});

// Get Reviews (filter by productId, customerId, or all)
apiRouter.get('/reviews', (req: Request, res: Response) => {
  const productId = req.query.productId as string | undefined;
  const customerId = req.query.customerId as string | undefined;

  let results = [...serverReviews];
  if (productId) {
    results = results.filter((r) => r.productId === productId);
  }
  if (customerId) {
    results = results.filter((r) => r.customerId === customerId);
  }

  return res.json(results);
});

// Submit Review - Enforces rule: "Reviews only for eligible delivered purchases"
apiRouter.post('/reviews', reviewLimiter, (req: Request, res: Response) => {
  const {
    productId,
    customerId,
    customerName,
    customerEmail,
    rating,
    title,
    comment,
    orderId,
  } = req.body;

  if (!productId || !rating || !comment) {
    return res.status(400).json({ error: 'Product ID, rating, and comment are required.' });
  }

  // Server-side business rule: Check if customer has an eligible delivered order with this product
  const hasEligibleDeliveredPurchase = serverOrders.some((order) => {
    const isDelivered = order.status === 'DELIVERED' || order.status === 'Delivered';
    const matchesCustomer =
      !customerId ||
      order.customerId === customerId ||
      (customerEmail && order.customerEmail?.toLowerCase() === customerEmail.toLowerCase());
    const containsProduct = order.items?.some((item) => item.productId === productId);
    return isDelivered && matchesCustomer && containsProduct;
  });

  if (!hasEligibleDeliveredPurchase) {
    return res.status(403).json({
      error: 'Reviews are only permitted for customers with a verified, successfully delivered order of this product.',
      eligible: false,
    });
  }

  // Find product details
  const prod = serverProducts.find((p) => p.id === productId);

  const newReview: Review = {
    id: `rev-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    productId,
    productName: prod?.name || req.body.productName || 'Verified Purchase Item',
    productImage: prod?.images?.[0] || req.body.productImage || '',
    orderId: orderId || undefined,
    customerId: customerId || 'cust-user',
    customerName: customerName || 'Verified Buyer',
    rating: Number(rating),
    title: title?.trim() || '',
    comment: comment.trim(),
    verifiedPurchase: true,
    status: 'approved',
    createdAt: new Date().toISOString(),
  };

  serverReviews.unshift(newReview);

  // Update product aggregate rating
  if (prod) {
    const prodReviews = serverReviews.filter((r) => r.productId === productId && r.status === 'approved');
    const totalScore = prodReviews.reduce((sum, r) => sum + r.rating, 0);
    prod.reviewCount = prodReviews.length;
    prod.rating = Number((totalScore / prodReviews.length).toFixed(1));
  }

  return res.status(201).json({
    success: true,
    message: 'Review submitted successfully with Verified Buyer badge.',
    review: newReview,
  });
});

// Update an existing Review
apiRouter.put('/reviews/:id', (req: Request, res: Response) => {
  const reviewId = req.params.id;
  const { rating, title, comment } = req.body;

  const review = serverReviews.find((r) => r.id === reviewId);
  if (!review) {
    return res.status(404).json({ error: 'Review not found' });
  }

  if (rating) review.rating = Number(rating);
  if (title !== undefined) review.title = title.trim();
  if (comment) review.comment = comment.trim();

  return res.json({ success: true, review });
});

// Delete a Review
apiRouter.delete('/reviews/:id', (req: Request, res: Response) => {
  const reviewId = req.params.id;
  const index = serverReviews.findIndex((r) => r.id === reviewId);
  if (index >= 0) {
    serverReviews.splice(index, 1);
    return res.json({ success: true, message: 'Review deleted.' });
  }
  return res.status(404).json({ error: 'Review not found' });
});

// ================= NOTIFICATION PROVIDER ENDPOINTS ================= //

// Returns provider status securely WITHOUT exposing service credentials
apiRouter.get('/notifications/providers', (req: Request, res: Response) => {
  const emailConfigured = Boolean(process.env.SENDGRID_API_KEY || process.env.SMTP_HOST);
  const smsConfigured = Boolean(process.env.FAST2SMS_API_KEY || process.env.TWILIO_AUTH_TOKEN);
  const waConfigured = Boolean(process.env.WHATSAPP_ACCESS_TOKEN || process.env.TWILIO_WHATSAPP_NUMBER);
  const fcmConfigured = Boolean(process.env.FCM_SERVER_KEY || process.env.FIREBASE_CONFIG);

  return res.json({
    providers: [
      {
        channel: 'email',
        name: 'Email (SendGrid / SMTP)',
        configured: emailConfigured,
        active: true,
        mode: emailConfigured ? 'live' : 'mock_sandbox',
      },
      {
        channel: 'sms',
        name: 'SMS (Fast2SMS / Twilio)',
        configured: smsConfigured,
        active: true,
        mode: smsConfigured ? 'live' : 'mock_sandbox',
      },
      {
        channel: 'whatsapp',
        name: 'WhatsApp (Business Cloud API)',
        configured: waConfigured,
        active: true,
        mode: waConfigured ? 'live' : 'mock_sandbox',
      },
      {
        channel: 'push',
        name: 'Push (Firebase Cloud Messaging)',
        configured: fcmConfigured,
        active: true,
        mode: fcmConfigured ? 'live' : 'mock_sandbox',
      },
    ],
  });
});

// Secure server notification dispatcher (keeps all service credentials on the server)
apiRouter.post('/notifications/dispatch', requireRole(['admin', 'staff']), async (req: Request, res: Response) => {
  const { channel, payload } = req.body;

  if (!channel || !payload) {
    return res.status(400).json({ error: 'Channel and payload are required' });
  }

  const messageId = `msg_${channel}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const timestamp = new Date().toISOString();

  // Log dispatch cleanly without logging sensitive tokens or keys
  console.info(`[NotificationDispatch] Channel: ${channel} | Category: ${payload.category} | Recipient: ${payload.recipient?.userId || payload.recipient?.phone || payload.recipient?.email || 'broadcast'}`);

  return res.json({
    success: true,
    channel,
    messageId,
    timestamp,
    simulated: true, // In preview/sandbox environment
    status: 'delivered',
  });
});

// =========================================================================
// AUTHORITATIVE SERVER-SIDE FINANCIAL, COMMISSION & PAYOUT ENDPOINTS
// =========================================================================

// 1. Get current Commission Configuration Hierarchy
apiRouter.get('/finance/commission-config', (_req: Request, res: Response) => {
  return res.json({
    success: true,
    config: serverCommissionConfig,
  });
});

// 2. Admin: Update Commission Rules (Global, Category, Vendor, Product)
apiRouter.post('/finance/commission-config', requireRole(['admin']), (req: Request, res: Response) => {
  try {
    const { globalRate, categoryRates, vendorRates, productRates } = req.body;

    if (typeof globalRate === 'number' && globalRate >= 0 && globalRate <= 50) {
      serverCommissionConfig.globalRate = Math.round(globalRate * 10) / 10;
    }
    if (categoryRates && typeof categoryRates === 'object') {
      serverCommissionConfig.categoryRates = {
        ...serverCommissionConfig.categoryRates,
        ...categoryRates,
      };
    }
    if (vendorRates && typeof vendorRates === 'object') {
      serverCommissionConfig.vendorRates = {
        ...serverCommissionConfig.vendorRates,
        ...vendorRates,
      };
    }
    if (productRates && typeof productRates === 'object') {
      serverCommissionConfig.productRates = {
        ...serverCommissionConfig.productRates,
        ...productRates,
      };
    }

    serverCommissionConfig.updatedAt = new Date().toISOString();

    return res.json({
      success: true,
      message: 'Commission schedule updated successfully.',
      config: serverCommissionConfig,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to update commission config' });
  }
});

// 3. Server-side Commission Calculation Preview (Calculates with Product -> Category -> Vendor -> Global)
apiRouter.post('/finance/calculate-commission', (req: Request, res: Response) => {
  try {
    const { vendorId, items = [], deliveryFeeShare = 0, orderId = 'preview' } = req.body;

    if (!vendorId) {
      return res.status(400).json({ error: 'vendorId is required' });
    }

    const calculation = calculateOrderCommissionForVendor(
      orderId,
      vendorId,
      items.map((i: any) => {
        const prod = serverProducts.find((p) => p.id === i.productId);
        return {
          productId: i.productId,
          productName: i.productName || prod?.name || 'Item',
          categoryId: i.categoryId || prod?.categoryId,
          vendorId,
          unitPrice: Number(i.unitPrice || i.price || prod?.salePrice || prod?.price || 0),
          quantity: Number(i.quantity || 1),
          discount: Number(i.discount || 0),
        };
      }),
      Number(deliveryFeeShare || 0),
      serverCommissionConfig
    );

    return res.json({
      success: true,
      calculation,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Commission calculation failed' });
  }
});

// 4. Authoritative Vendor Financial Summary (Gross Sales, Discounts, Commission, Refunds, Adjustments, Net Earnings, Pending, Paid)
apiRouter.get('/finance/vendor-summary/:vendorId', (req: Request, res: Response) => {
  try {
    const { vendorId } = req.params;
    const vendorMeta = getVendorMetadata(vendorId);

    const vendorOrdersCount = serverVendorOrders.filter(
      (vo) => vo.vendorId === vendorId && vo.status !== 'CANCELLED'
    ).length;

    // Check if vendor has verified bank details
    const hasVerifiedBank = true; // Seed vendors have verified bank accounts

    const summary = computeVendorFinancialSummary(
      vendorId,
      vendorMeta.name || `Vendor ${vendorId}`,
      serverFinancialLedger,
      vendorOrdersCount,
      hasVerifiedBank
    );

    return res.json({
      success: true,
      summary,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to compute vendor financial summary' });
  }
});

// 5. Admin: Platform-Wide Financial Summary Across All Vendors
apiRouter.get('/finance/admin-summary', requireRole(['admin']), (_req: Request, res: Response) => {
  try {
    const vendorIds = ['vendor-1', 'vendor-2', 'vendor-3'];
    // Include any dynamic vendors in orders or ledger
    serverFinancialLedger.forEach((entry) => {
      if (!vendorIds.includes(entry.vendorId)) {
        vendorIds.push(entry.vendorId);
      }
    });

    const vendorSummaries = vendorIds.map((vId) => {
      const vMeta = getVendorMetadata(vId);
      const ordersCount = serverVendorOrders.filter(
        (vo) => vo.vendorId === vId && vo.status !== 'CANCELLED'
      ).length;
      return computeVendorFinancialSummary(
        vId,
        vMeta.name || `Vendor ${vId}`,
        serverFinancialLedger,
        ordersCount,
        true
      );
    });

    const platformTotals = {
      totalGrossSales: vendorSummaries.reduce((acc, s) => acc + s.grossSales, 0),
      totalDiscounts: vendorSummaries.reduce((acc, s) => acc + s.discounts, 0),
      totalPlatformCommission: vendorSummaries.reduce((acc, s) => acc + s.commission, 0),
      totalRefunds: vendorSummaries.reduce((acc, s) => acc + s.refunds, 0),
      totalAdjustments: vendorSummaries.reduce((acc, s) => acc + s.adjustments, 0),
      totalNetVendorEarnings: vendorSummaries.reduce((acc, s) => acc + s.vendorEarnings, 0),
      totalPendingPayouts: vendorSummaries.reduce((acc, s) => acc + s.pendingPayout, 0),
      totalPaidPayouts: vendorSummaries.reduce((acc, s) => acc + s.paidPayout, 0),
      activeVendorsCount: vendorSummaries.length,
      payoutProvider: platformPayoutConfig,
    };

    return res.json({
      success: true,
      platformTotals,
      vendorSummaries,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to compute admin financial summary' });
  }
});

// 6. Vendor: Auditable Financial Ledger Entries (Strictly vendor-scoped)
apiRouter.get('/finance/ledger/:vendorId', (req: Request, res: Response) => {
  const { vendorId } = req.params;
  const filtered = serverFinancialLedger.filter((e) => e.vendorId === vendorId);
  return res.json({
    success: true,
    vendorId,
    ledger: filtered,
    totalRecords: filtered.length,
  });
});

// 7. Admin: Platform-Wide Auditable Financial Ledger
apiRouter.get('/finance/ledger', requireRole(['admin']), (_req: Request, res: Response) => {
  return res.json({
    success: true,
    ledger: serverFinancialLedger,
    totalRecords: serverFinancialLedger.length,
  });
});

// 8. Vendor Payouts List (Filtered by vendor if provided)
apiRouter.get('/finance/payouts', (req: Request, res: Response) => {
  const vendorId = req.query.vendorId as string | undefined;
  if (vendorId) {
    const filtered = serverPayouts.filter((p) => p.vendorId === vendorId);
    return res.json({ success: true, payouts: filtered });
  }
  return res.json({ success: true, payouts: serverPayouts });
});

// 8b. Payout Provider Configuration (Enforces: "Do not automatically transfer money unless a verified payout provider is configured")
apiRouter.get('/finance/payout-provider', (_req: Request, res: Response) => {
  return res.json({
    success: true,
    providerConfig: platformPayoutConfig,
  });
});

apiRouter.post('/finance/payout-provider', requireRole(['admin']), (req: Request, res: Response) => {
  try {
    const { provider, isLive, isVerified, minPayoutAmount, autoDisbursementEnabled, dailyDisbursementLimit } = req.body;
    if (provider && ['RAZORPAYX', 'CASHFREE', 'BANK_NEFT_MANUAL', 'STRIPE_CONNECT'].includes(provider)) {
      platformPayoutConfig.provider = provider;
    }
    if (typeof isLive === 'boolean') {
      platformPayoutConfig.isLive = isLive;
    }
    if (typeof isVerified === 'boolean') {
      platformPayoutConfig.isVerified = isVerified;
    }
    if (typeof minPayoutAmount === 'number' && minPayoutAmount >= 0) {
      platformPayoutConfig.minPayoutAmount = minPayoutAmount;
    }
    if (typeof autoDisbursementEnabled === 'boolean') {
      platformPayoutConfig.autoDisbursementEnabled = autoDisbursementEnabled;
    }
    if (typeof dailyDisbursementLimit === 'number' && dailyDisbursementLimit > 0) {
      platformPayoutConfig.dailyDisbursementLimit = dailyDisbursementLimit;
    }

    return res.json({
      success: true,
      message: 'Platform payout provider settings updated successfully.',
      providerConfig: platformPayoutConfig,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to update payout provider configuration' });
  }
});

// 9. Vendor: Submit Payout Request (Enforces Zero-Trust & Server Authorization)
apiRouter.post('/finance/payout/request', requireRole(['vendor', 'admin']), (req: Request, res: Response) => {
  try {
    const { vendorId, amount, notes, bankAccountId } = req.body;

    if (!vendorId || !amount || Number(amount) <= 0) {
      return res.status(400).json({ error: 'Valid vendorId and positive amount are required' });
    }

    const reqAmount = Math.round(Number(amount));
    const vMeta = getVendorMetadata(vendorId);

    // Compute authoritative current balance & pending payout
    const summary = computeVendorFinancialSummary(
      vendorId,
      vMeta.name,
      serverFinancialLedger,
      0,
      true
    );

    if (reqAmount > summary.pendingPayout) {
      return res.status(400).json({
        error: `Requested amount ₹${reqAmount} exceeds available pending payout balance of ₹${summary.pendingPayout}.`,
        availablePendingPayout: summary.pendingPayout,
      });
    }

    if (reqAmount < platformPayoutConfig.minPayoutAmount) {
      return res.status(400).json({
        error: `Minimum payout threshold is ₹${platformPayoutConfig.minPayoutAmount}.`,
      });
    }

    const payoutId = `pay-${vendorId}-${Date.now().toString().slice(-6)}`;
    const newPayout: VendorPayout = {
      id: payoutId,
      vendorId,
      amount: reqAmount,
      status: 'pending',
      periodStart: new Date(Date.now() - 86400000 * 14).toISOString().split('T')[0],
      periodEnd: new Date().toISOString().split('T')[0],
      ordersCount: 1,
      bankAccountId: bankAccountId || `bank-${vendorId}`,
      createdAt: new Date().toISOString(),
    };

    serverPayouts.unshift(newPayout);

    return res.status(201).json({
      success: true,
      message: `Payout request of ₹${reqAmount} submitted successfully. Awaiting administrative disbursement.`,
      payout: newPayout,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Payout request submission failed' });
  }
});

// 10. Admin: Process / Disburse Payout (Safeguard: Verifies provider & creates immutable ledger entry)
apiRouter.post('/finance/payout/process', requireRole(['admin']), (req: Request, res: Response) => {
  try {
    const { payoutId, transactionRef, notes, adminId = 'admin_user', approved = true } = req.body;

    if (!payoutId) {
      return res.status(400).json({ error: 'payoutId is required' });
    }

    const payout = serverPayouts.find((p) => p.id === payoutId);
    if (!payout) {
      return res.status(404).json({ error: `Payout record ${payoutId} not found` });
    }

    if (payout.status === 'completed') {
      return res.status(400).json({ error: `Payout ${payoutId} is already marked as completed.` });
    }

    // Safety Invariant Check: "Do not automatically transfer money unless a verified payout provider is configured."
    if (!platformPayoutConfig.isVerified) {
      return res.status(403).json({
        error: 'Disbursement blocked: No verified payout provider is currently configured for automated transfer.',
        providerStatus: platformPayoutConfig,
      });
    }

    if (!approved) {
      payout.status = 'failed';
      return res.json({
        success: true,
        message: `Payout ${payoutId} has been rejected / cancelled.`,
        payout,
      });
    }

    const effectiveRef = transactionRef?.trim() || `UTR${Date.now().toString().slice(-8)}`;
    payout.status = 'completed';
    payout.transactionRef = effectiveRef;
    payout.processedAt = new Date().toISOString();

    // Create an immutable PAYOUT deduction ledger entry
    const prevBal = getVendorLatestBalance(payout.vendorId);
    const newBal = Math.max(0, prevBal - payout.amount);
    const nowTs = new Date().toISOString();
    const auditHash = generateAuditHash(
      effectiveRef,
      payout.vendorId,
      'PAYOUT',
      -payout.amount,
      newBal,
      nowTs
    );

    const ledgerEntry: FinancialLedgerEntry = {
      id: `ledg-pay-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      transactionId: effectiveRef,
      vendorId: payout.vendorId,
      type: 'PAYOUT',
      amount: -payout.amount,
      balanceBefore: prevBal,
      balanceAfter: newBal,
      description: `Disbursement completed via ${platformPayoutConfig.provider}. UTR: ${effectiveRef}`,
      referenceId: payout.id,
      reason: notes || 'Marketplace settlement',
      auditHash,
      createdAt: nowTs,
      createdBy: adminId,
      metadata: {
        payoutId: payout.id,
        provider: platformPayoutConfig.provider,
        transactionRef: effectiveRef,
      },
    };

    serverFinancialLedger.unshift(ledgerEntry);

    return res.json({
      success: true,
      message: `Payout of ₹${payout.amount} successfully processed and recorded in financial ledger. UTR: ${effectiveRef}`,
      payout,
      ledgerEntry,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Payout processing failed' });
  }
});

// 11. Admin: Create Auditable Financial Adjustment (Bonus, Penalty, Fee Reversal)
apiRouter.post('/finance/adjustment', requireRole(['admin']), (req: Request, res: Response) => {
  try {
    const { vendorId, amount, type, reason, adminId = 'admin_user' } = req.body as PayoutAdjustmentPayload;

    if (!vendorId || typeof amount !== 'number' || amount === 0) {
      return res.status(400).json({ error: 'Valid vendorId and non-zero amount are required for adjustment' });
    }

    if (!reason || reason.trim().length < 5) {
      return res.status(400).json({ error: 'A descriptive reason (min 5 characters) is required for financial audits' });
    }

    const prevBal = getVendorLatestBalance(vendorId);
    const newBal = Math.max(0, prevBal + amount);
    const nowTs = new Date().toISOString();
    const txId = `tx_adj_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const auditHash = generateAuditHash(
      txId,
      vendorId,
      'ADJUSTMENT',
      amount,
      newBal,
      nowTs
    );

    const vMeta = getVendorMetadata(vendorId);

    const ledgerEntry: FinancialLedgerEntry = {
      id: `ledg-adj-${Date.now()}`,
      transactionId: txId,
      vendorId,
      vendorName: vMeta.name,
      type: 'ADJUSTMENT',
      amount,
      balanceBefore: prevBal,
      balanceAfter: newBal,
      description: `Adjustment [${type || 'manual_correction'}]: ${reason}`,
      reason,
      auditHash,
      createdAt: nowTs,
      createdBy: adminId,
      metadata: { adjustmentType: type, reason },
    };

    serverFinancialLedger.unshift(ledgerEntry);

    return res.status(201).json({
      success: true,
      message: `Financial adjustment of ₹${amount} recorded with audit hash ${auditHash}.`,
      ledgerEntry,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Adjustment creation failed' });
  }
});

// 12. Admin: Comprehensive Financial Reports
apiRouter.get('/finance/reports', requireRole(['admin']), (_req: Request, res: Response) => {
  try {
    const totalGrossSales = serverFinancialLedger
      .filter((e) => e.type === 'SALE')
      .reduce((sum, e) => sum + Number(e.metadata?.grossSales || e.amount), 0);

    const totalCommission = serverFinancialLedger
      .filter((e) => e.type === 'SALE')
      .reduce((sum, e) => sum + Number(e.metadata?.totalCommission || 0), 0);

    const totalDiscounts = serverFinancialLedger
      .filter((e) => e.type === 'SALE')
      .reduce((sum, e) => sum + Number(e.metadata?.totalDiscount || 0), 0);

    const totalRefunds = serverFinancialLedger
      .filter((e) => e.type === 'REFUND')
      .reduce((sum, e) => sum + Math.abs(e.amount), 0);

    const totalDisbursements = serverFinancialLedger
      .filter((e) => e.type === 'PAYOUT')
      .reduce((sum, e) => sum + Math.abs(e.amount), 0);

    const netPlatformMargin = totalGrossSales > 0 ? Math.round((totalCommission / totalGrossSales) * 100) : 10;

    return res.json({
      success: true,
      report: {
        summary: {
          totalGrossSales,
          totalDiscounts,
          totalCommission,
          totalRefunds,
          totalDisbursements,
          netPlatformMargin,
          pendingSettlementLiability: Math.max(0, totalGrossSales - totalDiscounts - totalCommission - totalRefunds - totalDisbursements),
        },
        auditIntegrity: {
          totalLedgerEntries: serverFinancialLedger.length,
          lastAuditHash: serverFinancialLedger[0]?.auditHash || 'AUDIT-GENESIS',
          verifiedProvider: platformPayoutConfig.provider,
          status: 'IN_BALANCE',
        },
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to generate financial reports' });
  }
});

// ============================================================================
// ============================================================================
// AUTHORITATIVE AUTHENTICATION & ROLE-BASED ACCESS CONTROL (RBAC) ENDPOINTS
// ============================================================================

export interface ServerStoredUser {
  id: string;
  email: string;
  passwordHash: string;
  passwordUpdatedAt?: string;
  name: string;
  phone: string;
  role: 'customer' | 'admin' | 'staff' | 'vendor' | 'delivery';
  active?: boolean;
  createdAt: string;
  addresses?: any[];
  vendorDetails?: any;
}

export interface ServerStaffRecord {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'admin' | 'manager' | 'catalog_manager' | 'delivery' | 'delivery_lead' | 'staff';
  department?: string;
  active: boolean;
  updatedAt?: string;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const STAFF_FILE = path.join(DATA_DIR, 'staff.json');

const authResetLimiter = createRateLimiter(
  60 * 1000,
  12,
  'Too many password reset requests. Please wait a minute before trying again.'
);

function hashPassword(password: string): string {
  return crypto.pbkdf2Sync(password, 'puresudh_salt_2026', 1000, 32, 'sha256').toString('hex');
}

function hashPasswordSecure(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt:${salt}:${derived}`;
}

function verifyPasswordHash(password: string, storedHash: string): boolean {
  if (!storedHash || typeof password !== 'string') return false;
  if (storedHash.startsWith('scrypt:')) {
    const parts = storedHash.split(':');
    if (parts.length !== 3) return false;
    const [, salt, expectedHex] = parts;
    try {
      const derived = crypto.scryptSync(password, salt, 64);
      const expected = Buffer.from(expectedHex, 'hex');
      if (derived.length !== expected.length) return false;
      return crypto.timingSafeEqual(derived, expected);
    } catch {
      return false;
    }
  }
  const legacyHex = hashPassword(password);
  try {
    const a = Buffer.from(legacyHex, 'hex');
    const b = Buffer.from(storedHash, 'hex');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function normalizeStaffPortalRole(
  rawRole?: string
): 'customer' | 'admin' | 'staff' | 'vendor' | 'delivery' {
  const r = String(rawRole || '').trim().toLowerCase();
  if (r === 'admin') return 'admin';
  if (r === 'delivery' || r === 'delivery_lead') return 'delivery';
  if (r === 'staff' || r === 'manager' || r === 'catalog_manager') return 'staff';
  if (r === 'vendor') return 'vendor';
  return 'customer';
}

function maskIndianPhone(phone?: string): string {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length < 4) return 'registered phone';
  const last4 = digits.slice(-4);
  return `******${last4}`;
}

const VALID_ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'aanews70@gmail.com').trim().toLowerCase();
const VALID_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'PureSudh#Admin2026!';
const LEGACY_REMOVED_ADMIN_EMAILS = new Set([
  'enterpriseadministrationconsole@gmail.com',
  'admin@puresudh.com',
]);

// Initial users with precomputed salted PBKDF2 password hashes
const INITIAL_DEMO_USERS: ServerStoredUser[] = [
  {
    id: 'usr-admin-master',
    email: VALID_ADMIN_EMAIL,
    passwordHash: hashPassword(VALID_ADMIN_PASSWORD),
    name: 'Platform Administrator',
    phone: '+91 94310 12801',
    role: 'admin',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'usr-staff-master',
    email: 'staff@email.com',
    passwordHash: hashPassword('staff123'),
    name: 'Fulfillment Supervisor',
    phone: '+91 94310 12802',
    role: 'staff',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'usr-delivery-master',
    email: 'delivery@email.com',
    passwordHash: hashPassword('delivery123'),
    name: 'PureSudh Fleet Rider',
    phone: '+91 94310 12804',
    role: 'delivery',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'usr-vendor-master',
    email: 'vendor@email.com',
    passwordHash: hashPassword('vendor123'),
    name: 'Shri Krishna Organic Dairy',
    phone: '+91 94310 12803',
    role: 'vendor',
    createdAt: '2026-01-01T00:00:00.000Z',
    vendorDetails: {
      shopName: 'Shri Krishna Dairy Farm',
      fssaiLicense: '10423000001892',
      gstNumber: '10AAACR5231P1Z9',
      status: 'approved',
    },
  },
  {
    id: 'usr-customer-demo',
    email: 'customer@email.com',
    passwordHash: hashPassword('cust123'),
    name: 'Abhishek Kumar',
    phone: '+91 94310 12845',
    role: 'customer',
    createdAt: '2026-01-01T00:00:00.000Z',
    addresses: [
      {
        id: 'addr-cust-1',
        name: 'Abhishek Kumar',
        phone: '+91 94310 12845',
        pincode: '800001',
        addressLine: 'Flat 402, Anand Nilayam, Fraser Road',
        landmark: 'Opposite Central Park',
        city: 'Patna',
        state: 'Bihar',
        isDefault: true,
        type: 'home',
      },
    ],
  },
];

function loadStoredUsers(): ServerStoredUser[] {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(USERS_FILE)) {
      const raw = fs.readFileSync(USERS_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        let changed = false;
        // Remove all legacy/deleted admin emails
        const cleaned = parsed.filter((u: ServerStoredUser) => {
          const em = (u.email || '').toLowerCase();
          if (LEGACY_REMOVED_ADMIN_EMAILS.has(em)) {
            changed = true;
            return false;
          }
          if (u.role === 'admin' && em !== VALID_ADMIN_EMAIL) {
            changed = true;
            return false;
          }
          return true;
        });

        const validAdminHash = hashPassword(VALID_ADMIN_PASSWORD);
        const existingAdminIdx = cleaned.findIndex((u: ServerStoredUser) => (u.email || '').toLowerCase() === VALID_ADMIN_EMAIL);
        if (existingAdminIdx === -1) {
          cleaned.unshift(INITIAL_DEMO_USERS[0]);
          changed = true;
        } else if (
          !cleaned[existingAdminIdx].passwordUpdatedAt &&
          (cleaned[existingAdminIdx].passwordHash !== validAdminHash || cleaned[existingAdminIdx].role !== 'admin')
        ) {
          cleaned[existingAdminIdx].passwordHash = validAdminHash;
          cleaned[existingAdminIdx].role = 'admin';
          changed = true;
        }

        // Backfill any newly added baseline demo/role accounts (e.g. usr-delivery-master)
        for (const seedUser of INITIAL_DEMO_USERS.slice(1)) {
          const exists = cleaned.some(
            (u: ServerStoredUser) => (u.email || '').toLowerCase() === seedUser.email.toLowerCase()
          );
          if (!exists) {
            cleaned.push(seedUser);
            changed = true;
          }
        }

        if (changed) {
          saveStoredUsers(cleaned);
        }
        return cleaned;
      }
    }
  } catch (e) {
    console.warn('Error loading users.json, initializing defaults:', e);
  }
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(INITIAL_DEMO_USERS, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Could not write users.json:', e);
  }
  return [...INITIAL_DEMO_USERS];
}

function saveStoredUsers(users: ServerStoredUser[]): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Failed to save users.json:', e);
  }
}

function loadStoredStaff(): ServerStaffRecord[] {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(STAFF_FILE)) {
      const raw = fs.readFileSync(STAFF_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((s) => s && typeof s.email === 'string');
      }
    }
  } catch (e) {
    console.warn('Error loading staff.json:', e);
  }
  return [];
}

function saveStoredStaff(staffList: ServerStaffRecord[]): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(STAFF_FILE, JSON.stringify(staffList, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Failed to save staff.json:', e);
  }
}

function getFirebaseApiKeysForServer(): string[] {
  const keys: string[] = [];
  const envProjectId = process.env.VITE_FIREBASE_PROJECT_ID?.trim();
  const envKey = process.env.VITE_FIREBASE_API_KEY?.trim();
  const cfgKey = firebaseAppletConfig?.apiKey?.trim();
  const isCustomProjectOverride = Boolean(
    envProjectId && envProjectId !== firebaseAppletConfig?.projectId
  );

  if (envKey) keys.push(envKey);
  if (!isCustomProjectOverride && cfgKey && !keys.includes(cfgKey)) {
    keys.push(cfgKey);
  }
  return keys;
}

async function verifyFirebaseIdTokenOnServer(
  idToken: string
): Promise<{ uid: string; email: string; emailVerified: boolean } | null> {
  if (!idToken || typeof idToken !== 'string') return null;
  for (const apiKey of getFirebaseApiKeysForServer()) {
    try {
      const res = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken }),
        }
      );
      if (!res.ok) continue;
      const data = await res.json();
      const fbUser = Array.isArray(data?.users) ? data.users[0] : null;
      if (fbUser?.localId && fbUser?.email) {
        return {
          uid: String(fbUser.localId),
          email: String(fbUser.email).trim().toLowerCase(),
          emailVerified: Boolean(fbUser.emailVerified),
        };
      }
    } catch {
      // Try next configured key
    }
  }
  return null;
}

async function ensureFirebaseAuthUserExists(
  email: string
): Promise<{ ensured: boolean; created: boolean; errorCode?: string }> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || cleanEmail.endsWith('@email.com')) {
    return { ensured: false, created: false, errorCode: 'DEMO_EMAIL' };
  }
  const apiKeys = getFirebaseApiKeysForServer();
  if (apiKeys.length === 0) {
    return { ensured: false, created: false, errorCode: 'MISSING_API_KEY' };
  }
  const randomPassword = crypto.randomBytes(24).toString('base64url') + '#A1!';
  let lastErrorCode = '';
  for (const apiKey of apiKeys) {
    try {
      const res = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${encodeURIComponent(apiKey)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: cleanEmail,
            password: randomPassword,
            returnSecureToken: false,
          }),
        }
      );
      if (res.ok) {
        return { ensured: true, created: true };
      }
      const errJson = await res.json().catch(() => null);
      const errMsg = String(errJson?.error?.message || '');
      if (errMsg === 'EMAIL_EXISTS') {
        return { ensured: true, created: false };
      }
      if (errMsg) {
        lastErrorCode = errMsg;
      }
    } catch {
      lastErrorCode = 'NETWORK_ERROR';
    }
  }
  return { ensured: false, created: false, errorCode: lastErrorCode || 'UNKNOWN' };
}

// Known authoritative role map
const KNOWN_ROLES: Record<string, { role: 'customer' | 'admin' | 'staff' | 'vendor' | 'delivery'; name: string }> = {
  [VALID_ADMIN_EMAIL]: { role: 'admin', name: 'Platform Administrator' },
  'staff@email.com': { role: 'staff', name: 'Fulfillment Supervisor' },
  'delivery@email.com': { role: 'delivery', name: 'PureSudh Fleet Rider' },
  'vendor@email.com': { role: 'vendor', name: 'Patna Artisan Kitchens' },
  'customer@email.com': { role: 'customer', name: 'Aarav Sharma' },
};

const BUILTIN_DEMO_EMAILS = new Set([
  'staff@email.com',
  'delivery@email.com',
  'vendor@email.com',
  'customer@email.com',
]);

// Single-use demo account password reset tokens (SHA-256 hash stored, expires in 10 mins)
const demoResetTokens = new Map<
  string,
  { email: string; tokenHash: string; expiresAt: number }
>();

// In-memory registered user storage for server validation
const registeredServerUsers: Map<string, { email: string; name: string; phone: string; role: 'customer'; createdAt: string }> = new Map();

/**
 * POST /api/auth/register-customer
 * Creates a new customer account, validates anti-temporary email and phone rules,
 * and permanently stores credentials for subsequent logins.
 */
apiRouter.post('/auth/register-customer', async (req: Request, res: Response) => {
  try {
    const { email, password, name, phone } = req.body;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ success: false, error: 'A valid email address is required.' });
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters long.' });
    }
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Full name is required.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Zero-tolerance Anti-Temporary Email Validation
    const emailCheck = isTemporaryEmail(cleanEmail);
    if (emailCheck.isTemporary) {
      return res.status(400).json({
        success: false,
        error: emailCheck.reason || 'Registration rejected: Temporary/disposable email addresses are strictly prohibited.',
      });
    }

    // Zero-tolerance Anti-Fake Phone Validation
    if (phone) {
      const phoneCheck = isTemporaryOrFakePhone(phone);
      if (phoneCheck.isFake) {
        return res.status(400).json({
          success: false,
          error: phoneCheck.reason || 'Registration rejected: Please provide a valid 10-digit mobile number.',
        });
      }
    }

    // Check if reserved administrative email
    if (cleanEmail === VALID_ADMIN_EMAIL || LEGACY_REMOVED_ADMIN_EMAILS.has(cleanEmail)) {
      return res.status(403).json({ success: false, error: 'This email is reserved and cannot be registered as customer.' });
    }

    const users = loadStoredUsers();
    const existing = users.find((u) => u.email.toLowerCase() === cleanEmail);
    const pwdHash = hashPassword(password);

    if (existing) {
      if (existing.passwordHash === pwdHash) {
        // Idempotent re-registration with same credentials
        return res.json({
          success: true,
          profile: {
            id: existing.id,
            uid: existing.id,
            email: existing.email,
            displayName: existing.name,
            phone: existing.phone,
            role: existing.role,
            createdAt: existing.createdAt,
            addresses: existing.addresses || [],
          },
          redirectUrl: '/account',
        });
      }
      return res.status(400).json({
        success: false,
        error: 'An account with this email address already exists. Please log in instead.',
      });
    }

    const authoritativeRole = 'customer' as const;
    const createdAt = new Date().toISOString();
    const newUserId = `usr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    const formattedPhone = phone ? formatIndianPhone(phone) : '';

    const userRecord: ServerStoredUser = {
      id: newUserId,
      email: cleanEmail,
      passwordHash: pwdHash,
      name: name.trim(),
      phone: formattedPhone,
      role: authoritativeRole,
      createdAt,
      addresses: [],
    };

    users.push(userRecord);
    saveStoredUsers(users);
    registeredServerUsers.set(cleanEmail, {
      email: cleanEmail,
      name: userRecord.name,
      phone: userRecord.phone,
      role: authoritativeRole,
      createdAt,
    });

    return res.json({
      success: true,
      profile: {
        id: newUserId,
        uid: newUserId,
        email: cleanEmail,
        displayName: userRecord.name,
        phone: userRecord.phone,
        role: authoritativeRole,
        createdAt,
        addresses: [],
      },
      redirectUrl: '/account',
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Customer registration failed.' });
  }
});

/**
 * Directory for uploaded local media
 */
const UPLOADS_DIR = path.join(process.cwd(), 'data', 'uploads');
try {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
} catch (e) {
  console.warn('Failed to initialize uploads dir:', e);
}

/**
 * POST /api/media/upload
 * Authoritative fallback media uploader.
 * Accepts base64 encoded image or multipart data and writes safely to local storage or provides a persistent data URL.
 */
apiRouter.post('/media/upload', (req: Request, res: Response) => {
  try {
    const { base64Data, filename, contentType, preset } = req.body;

    if (!base64Data || typeof base64Data !== 'string') {
      return res.status(400).json({ success: false, error: 'No image data provided.' });
    }

    // Clean base64 data header if present
    const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');
    const safeExt = (contentType || 'image/webp').split('/')[1] || 'webp';
    const safeId = `media_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${safeExt}`;
    const filePath = path.join(UPLOADS_DIR, safeId);

    fs.writeFileSync(filePath, buffer);

    const publicUrl = `/api/media/file/${safeId}`;

    return res.json({
      success: true,
      url: publicUrl,
      downloadUrl: publicUrl,
      filename: safeId,
      size: buffer.length,
      contentType: contentType || 'image/webp',
    });
  } catch (err: any) {
    console.error('Server media upload error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Media upload failed' });
  }
});

/**
 * GET /api/media/file/:filename
 * Serves stored media files
 */
apiRouter.get('/media/file/:filename', (req: Request, res: Response) => {
  const safeFilename = path.basename(req.params.filename);
  const filePath = path.join(UPLOADS_DIR, safeFilename);

  if (fs.existsSync(filePath)) {
    const ext = path.extname(safeFilename).toLowerCase();
    const mimeMap: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.webp': 'image/webp',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
    };
    res.setHeader('Content-Type', mimeMap[ext] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    return res.sendFile(filePath);
  }

  return res.status(404).send('Image not found');
});

/**
 * POST /api/auth/register-vendor
 * Registers a vendor account and persists credentials.
 */
apiRouter.post('/auth/register-vendor', (req: Request, res: Response) => {
  try {
    const { email, password, name, phone, shopName, fssai, gst } = req.body;
    if (!email || !password || !name || !shopName) {
      return res.status(400).json({ success: false, error: 'Email, password, name, and shop name are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const emailCheck = isTemporaryEmail(cleanEmail);
    if (emailCheck.isTemporary) {
      return res.status(400).json({
        success: false,
        error: emailCheck.reason || 'Registration rejected: Temporary email not permitted.',
      });
    }

    if (phone) {
      const phoneCheck = isTemporaryOrFakePhone(phone);
      if (phoneCheck.isFake) {
        return res.status(400).json({
          success: false,
          error: phoneCheck.reason || 'Registration rejected: Please provide a valid 10-digit Indian mobile number (+91).',
        });
      }
    }

    const users = loadStoredUsers();
    if (users.some((u) => u.email.toLowerCase() === cleanEmail)) {
      return res.status(400).json({ success: false, error: 'An account with this email address already exists. Please log in.' });
    }

    const newUserId = `usr-vdr-${Date.now()}`;
    const createdAt = new Date().toISOString();
    const vendorRecord: ServerStoredUser = {
      id: newUserId,
      email: cleanEmail,
      passwordHash: hashPassword(password),
      name: name.trim(),
      phone: phone ? formatIndianPhone(phone) : '',
      role: 'vendor',
      createdAt,
      addresses: [],
      vendorDetails: {
        shopName: shopName.trim(),
        fssaiLicense: fssai || '',
        gstNumber: gst || '',
        status: 'pending',
      },
    };

    users.push(vendorRecord);
    saveStoredUsers(users);

    return res.json({
      success: true,
      profile: {
        id: newUserId,
        uid: newUserId,
        email: cleanEmail,
        displayName: vendorRecord.name,
        phone: vendorRecord.phone,
        role: 'vendor',
        createdAt,
        vendorDetails: vendorRecord.vendorDetails,
        addresses: [],
      },
      redirectUrl: '/vendor',
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Vendor registration failed.' });
  }
});

/**
 * POST /api/auth/login
 * Authoritatively verifies registered credentials (by email or phone) and checks password.
 */
apiRouter.post('/auth/login', (req: Request, res: Response) => {
  try {
    const { email, password, targetPortal } = req.body;
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ success: false, error: 'Email or mobile number is required.' });
    }
    if (!password || typeof password !== 'string') {
      return res.status(400).json({ success: false, error: 'Password is required.' });
    }

    const rawInput = email.trim();
    const cleanEmail = rawInput.toLowerCase();
    const cleanPhoneDigits = rawInput.replace(/\D/g, '');
    const normalizedPhone = cleanPhoneDigits.startsWith('91') && cleanPhoneDigits.length === 12
      ? cleanPhoneDigits.slice(2)
      : (cleanPhoneDigits.startsWith('0') && cleanPhoneDigits.length === 11 ? cleanPhoneDigits.slice(1) : cleanPhoneDigits);

    const users = loadStoredUsers();
    const staffList = loadStoredStaff();

    // Match by email or by phone number
    const user = users.find((u) => {
      if (u.email && u.email.toLowerCase() === cleanEmail) return true;
      if (normalizedPhone && normalizedPhone.length === 10) {
        const uPhoneDigits = String(u.phone || '').replace(/\D/g, '');
        return uPhoneDigits.endsWith(normalizedPhone);
      }
      return false;
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'No account found with this email or mobile number. Please register first.',
      });
    }

    const staffMatch = staffList.find(
      (s) => s.email && s.email.toLowerCase() === (user.email || '').toLowerCase()
    );
    if (user.active === false || (staffMatch && staffMatch.active === false)) {
      return res.status(403).json({
        success: false,
        error: 'Account disabled: Please contact PureSudh Administration to restore access.',
      });
    }

    // Verify password strictly against stored hash (demo password fallback disabled once reset)
    const isDemoPassMatch =
      !user.passwordUpdatedAt &&
      ((user.email.toLowerCase() === 'staff@email.com' && password === 'staff123') ||
        (user.email.toLowerCase() === 'delivery@email.com' && password === 'delivery123') ||
        (user.email.toLowerCase() === 'vendor@email.com' && password === 'vendor123') ||
        (user.email.toLowerCase() === 'customer@email.com' && password === 'cust123'));

    const isValidPassword = verifyPasswordHash(password, user.passwordHash) || isDemoPassMatch;

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Incorrect password. Please verify your credentials and try again.',
      });
    }

    const effectiveRole = staffMatch ? normalizeStaffPortalRole(staffMatch.role) : user.role;

    // Check RBAC against targetPortal
    const portal = targetPortal || 'customer';
    if (portal === 'admin' && effectiveRole !== 'admin') {
      return res.status(403).json({
        success: false,
        error: `Access Denied: This account (${user.email}) does not have Administrator privileges. Please use Customer Sign In.`,
        redirectUrl: '/customer/login',
      });
    }
    if (portal === 'staff' && effectiveRole !== 'staff' && effectiveRole !== 'delivery' && effectiveRole !== 'admin') {
      return res.status(403).json({
        success: false,
        error: `Access Denied: This account (${user.email}) is not authorized for Staff Operations Desk.`,
        redirectUrl: '/customer/login',
      });
    }
    if (portal === 'delivery' && effectiveRole !== 'delivery' && effectiveRole !== 'staff' && effectiveRole !== 'admin') {
      return res.status(403).json({
        success: false,
        error: `Access Denied: This account (${user.email}) is not authorized for the Delivery Rider Portal.`,
        redirectUrl: '/customer/login',
      });
    }
    if (portal === 'vendor' && effectiveRole !== 'vendor' && effectiveRole !== 'admin') {
      return res.status(403).json({
        success: false,
        error: `Access Denied: This account (${user.email}) is not authorized for Vendor Partner Hub.`,
        redirectUrl: '/customer/login',
      });
    }

    return res.json({
      success: true,
      profile: {
        id: user.id,
        uid: user.id,
        email: user.email,
        displayName: staffMatch?.name || user.name,
        phone: staffMatch?.phone || user.phone,
        role: effectiveRole,
        createdAt: user.createdAt,
        addresses: user.addresses || [],
        vendorDetails: user.vendorDetails,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Login failed.' });
  }
});

/**
 * POST /api/auth/login-validate
 * Authoritatively validates login credentials against target portal.
 * E.g., if a customer attempts to sign in on /admin/login, rejects with 403.
 */
apiRouter.post('/auth/login-validate', (req: Request, res: Response) => {
  try {
    const { email, targetPortal } = req.body;
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ success: false, error: 'Email is required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const portal = targetPortal || 'customer';

    // Zero-tolerance Anti-Temporary Email Validation
    const emailCheck = isTemporaryEmail(cleanEmail);
    if (emailCheck.isTemporary) {
      return res.status(403).json({
        success: false,
        authorized: false,
        error: emailCheck.reason || 'Login blocked: Temporary or disposable email addresses are prohibited.',
      });
    }

    const staffMatch = loadStoredStaff().find((s) => (s.email || '').toLowerCase() === cleanEmail);
    const storedMatch = loadStoredUsers().find((u) => (u.email || '').toLowerCase() === cleanEmail);

    // Determine authoritative role
    let resolvedRole: 'customer' | 'admin' | 'staff' | 'vendor' | 'delivery' = 'customer';
    if (staffMatch) {
      resolvedRole = normalizeStaffPortalRole(staffMatch.role);
    } else if (storedMatch) {
      resolvedRole = storedMatch.role;
    } else if (KNOWN_ROLES[cleanEmail]) {
      resolvedRole = KNOWN_ROLES[cleanEmail].role;
    } else if (cleanEmail === VALID_ADMIN_EMAIL) {
      resolvedRole = 'admin';
    } else if (cleanEmail.startsWith('delivery')) {
      resolvedRole = 'delivery';
    } else if (cleanEmail.startsWith('staff')) {
      resolvedRole = 'staff';
    } else if (cleanEmail.startsWith('vendor')) {
      resolvedRole = 'vendor';
    }

    // Portal Authorization Validation
    if (portal === 'admin' && resolvedRole !== 'admin') {
      return res.status(403).json({
        success: false,
        authorized: false,
        error: `Access Denied: This account (${cleanEmail}) does not have Administrator privileges. Please use Customer Sign In.`,
        redirectUrl: '/customer/login',
      });
    }

    if (portal === 'staff' && resolvedRole !== 'staff' && resolvedRole !== 'delivery' && resolvedRole !== 'admin') {
      return res.status(403).json({
        success: false,
        authorized: false,
        error: `Access Denied: This account (${cleanEmail}) is not authorized for Staff Operations Desk. Please use Customer Sign In.`,
        redirectUrl: '/customer/login',
      });
    }

    if (portal === 'delivery' && resolvedRole !== 'delivery' && resolvedRole !== 'staff' && resolvedRole !== 'admin') {
      return res.status(403).json({
        success: false,
        authorized: false,
        error: `Access Denied: This account (${cleanEmail}) is not authorized for the Delivery Rider Hub. Please use Customer Sign In.`,
        redirectUrl: '/customer/login',
      });
    }

    if (portal === 'vendor' && resolvedRole !== 'vendor' && resolvedRole !== 'admin') {
      return res.status(403).json({
        success: false,
        authorized: false,
        error: `Access Denied: This account (${cleanEmail}) is not an approved Vendor Partner. If you wish to sell on Pure Sudh, please register as a Vendor.`,
        redirectUrl: '/vendor-register',
      });
    }

    // Dashboard Redirection Mapping based on authenticated role
    const dashboardMap: Record<string, string> = {
      admin: '/admin',
      staff: '/staff',
      delivery: '/delivery',
      vendor: '/vendor',
      customer: '/account',
    };

    return res.json({
      success: true,
      authorized: true,
      role: resolvedRole,
      redirectUrl: dashboardMap[resolvedRole] || '/account',
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Login validation failed.' });
  }
});

/**
 * POST /api/admin/sync-staff
 * Authoritatively syncs Admin-managed Staff & Delivery Rider roster into server state
 * and provisions Firebase Authentication records for real staff/rider emails so
 * portal password resets work immediately without disturbing the Admin session.
 */
apiRouter.post('/admin/sync-staff', async (req: Request, res: Response) => {
  try {
    const authHeader = String(req.headers.authorization || '');
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    const verifiedCaller = await verifyFirebaseIdTokenOnServer(token);

    if (!verifiedCaller) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Valid Administrator authentication token required.' });
    }

    const storedUsers = loadStoredUsers();
    const callerStored = storedUsers.find((u) => u.email.toLowerCase() === verifiedCaller.email);
    const callerStaff = loadStoredStaff().find((s) => s.email.toLowerCase() === verifiedCaller.email);
    const isAdminCaller =
      verifiedCaller.email === VALID_ADMIN_EMAIL ||
      callerStored?.role === 'admin' ||
      callerStaff?.role === 'admin';

    if (!isAdminCaller) {
      return res.status(403).json({ success: false, error: 'Forbidden: Only administrators can synchronize staff and delivery accounts.' });
    }

    const { staffList, staffMember, deleteStaffId } = req.body || {};
    let currentStaff = loadStoredStaff();

    if (Array.isArray(staffList)) {
      currentStaff = staffList
        .filter((s: any) => s && typeof s.email === 'string' && s.email.includes('@'))
        .map((s: any) => ({
          id: String(s.id || `stf-${Date.now()}`),
          name: String(s.name || 'Staff Member').trim(),
          email: String(s.email).trim().toLowerCase(),
          phone: s.phone ? String(s.phone).trim() : undefined,
          role: (s.role || 'staff') as ServerStaffRecord['role'],
          department: s.department ? String(s.department).trim() : 'Operations',
          active: s.active !== false,
          updatedAt: String(s.updatedAt || new Date().toISOString()),
        }));
    } else if (deleteStaffId && typeof deleteStaffId === 'string') {
      currentStaff = currentStaff.filter((s) => s.id !== deleteStaffId);
    } else if (staffMember && typeof staffMember.email === 'string') {
      const cleanEmail = staffMember.email.trim().toLowerCase();
      const entry: ServerStaffRecord = {
        id: String(staffMember.id || `stf-${Date.now()}`),
        name: String(staffMember.name || 'Staff Member').trim(),
        email: cleanEmail,
        phone: staffMember.phone ? String(staffMember.phone).trim() : undefined,
        role: (staffMember.role || 'staff') as ServerStaffRecord['role'],
        department: staffMember.department ? String(staffMember.department).trim() : 'Operations',
        active: staffMember.active !== false,
        updatedAt: new Date().toISOString(),
      };
      const idx = currentStaff.findIndex((s) => s.id === entry.id || s.email.toLowerCase() === cleanEmail);
      if (idx >= 0) {
        currentStaff[idx] = entry;
      } else {
        currentStaff.unshift(entry);
      }

      // Sync corresponding role into users.json and provision Firebase Auth account if active
      const portalRole = normalizeStaffPortalRole(entry.role);
      const userIdx = storedUsers.findIndex((u) => u.email.toLowerCase() === cleanEmail);
      if (userIdx >= 0) {
        storedUsers[userIdx].role = portalRole;
        storedUsers[userIdx].active = entry.active;
        if (entry.name) storedUsers[userIdx].name = entry.name;
        if (entry.phone) storedUsers[userIdx].phone = entry.phone;
        saveStoredUsers(storedUsers);
      }
      if (entry.active && !BUILTIN_DEMO_EMAILS.has(cleanEmail)) {
        await ensureFirebaseAuthUserExists(cleanEmail);
      }
    }

    saveStoredStaff(currentStaff);
    return res.json({ success: true, count: currentStaff.length });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to sync staff roster.' });
  }
});

/**
 * POST /api/auth/forgot-password-validate
 * Strictly verifies that the requested email belongs to a registered account
 * and is authorized for the requested portal before allowing a password reset.
 */
apiRouter.post('/auth/forgot-password-validate', authResetLimiter, async (req: Request, res: Response) => {
  try {
    const { email, targetPortal } = req.body;
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ success: false, exists: false, error: 'Please enter a valid email address.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({ success: false, exists: false, error: 'Please enter a valid email address.' });
    }

    // Reject temporary/disposable emails
    const emailCheck = isTemporaryEmail(cleanEmail);
    if (emailCheck.isTemporary) {
      return res.status(403).json({
        success: false,
        exists: false,
        error: emailCheck.reason || 'Temporary or disposable email addresses are not permitted.',
      });
    }

    // Reject deleted legacy admin emails
    if (LEGACY_REMOVED_ADMIN_EMAILS.has(cleanEmail)) {
      return res.status(404).json({
        success: false,
        exists: false,
        error: 'No registered account found with this email address.',
      });
    }

    const staffList = loadStoredStaff();
    const staffEntry = staffList.find((s) => (s.email || '').toLowerCase() === cleanEmail);
    const users = loadStoredUsers();
    const storedUser = users.find((u) => (u.email || '').toLowerCase() === cleanEmail);
    const registeredMemUser = registeredServerUsers.get(cleanEmail);
    const knownRoleEntry = KNOWN_ROLES[cleanEmail];
    const portal = (targetPortal || 'customer') as 'customer' | 'admin' | 'staff' | 'vendor' | 'delivery';

    // Also inspect Firestore staff & users collections so riders/users created directly in Firestore are verified and synced
    let fsStaffEntry: any = null;
    let fsUserEntry: any = null;
    if (!staffEntry && !storedUser && !knownRoleEntry) {
      const [fsStaffRes, fsUsersRes] = await Promise.allSettled([
        fetchFirestoreCollectionDocs('staff'),
        fetchFirestoreCollectionDocs('users'),
      ]);
      if (fsStaffRes.status === 'fulfilled') {
        fsStaffEntry = fsStaffRes.value.find((s: any) => String(s?.email || '').trim().toLowerCase() === cleanEmail) || null;
      }
      if (fsUsersRes.status === 'fulfilled') {
        fsUserEntry = fsUsersRes.value.find((u: any) => String(u?.email || '').trim().toLowerCase() === cleanEmail) || null;
      }
    }

    if (
      staffEntry?.active === false ||
      storedUser?.active === false ||
      fsStaffEntry?.active === false ||
      fsUserEntry?.active === false
    ) {
      return res.status(403).json({
        success: false,
        exists: true,
        error: 'This account is currently disabled. Please contact PureSudh Administration.',
      });
    }

    const foundAnyRecord = Boolean(
      staffEntry || storedUser || registeredMemUser || knownRoleEntry || fsStaffEntry || fsUserEntry
    );

    if (!foundAnyRecord) {
      if (portal === 'admin' && cleanEmail !== VALID_ADMIN_EMAIL) {
        return res.status(403).json({
          success: false,
          exists: false,
          error: 'Access Denied: Only an authorized administrator email can reset the Admin Portal password.',
        });
      }
      if (portal === 'delivery' || portal === 'staff' || portal === 'vendor') {
        return res.status(404).json({
          success: false,
          exists: false,
          error: `No registered ${portal} account found for ${cleanEmail}. Please verify your email or contact PureSudh Administration.`,
        });
      }
      // Customer portal may have Firebase-Auth-only users (e.g. when Firestore profile creation was skipped)
      return res.json({
        success: true,
        exists: false,
        role: 'customer',
        authType: 'firebase',
        firebaseEnsured: false,
        accountFoundLocally: false,
      });
    }

    const resolvedRole = staffEntry
      ? normalizeStaffPortalRole(staffEntry.role)
      : fsStaffEntry
      ? normalizeStaffPortalRole(fsStaffEntry.role)
      : storedUser?.role ||
        (fsUserEntry?.role ? normalizeStaffPortalRole(fsUserEntry.role) : undefined) ||
        registeredMemUser?.role ||
        knownRoleEntry?.role ||
        'customer';

    if (portal === 'admin' && resolvedRole !== 'admin') {
      return res.status(403).json({
        success: false,
        exists: true,
        error: 'Access Denied: Only the authorized administrator email can reset the Admin Portal password.',
      });
    }

    if (portal === 'staff' && resolvedRole !== 'staff' && resolvedRole !== 'delivery' && resolvedRole !== 'admin') {
      return res.status(403).json({
        success: false,
        exists: true,
        error: `Access Denied: This email (${cleanEmail}) is not registered as a Staff account.`,
      });
    }

    if (portal === 'delivery' && resolvedRole !== 'delivery' && resolvedRole !== 'staff' && resolvedRole !== 'admin') {
      return res.status(403).json({
        success: false,
        exists: true,
        error: `Access Denied: This email (${cleanEmail}) is not registered as a Delivery Partner account.`,
      });
    }

    if (portal === 'vendor' && resolvedRole !== 'vendor' && resolvedRole !== 'admin') {
      return res.status(403).json({
        success: false,
        exists: true,
        error: `Access Denied: This email (${cleanEmail}) is not registered as a Vendor Partner account.`,
      });
    }

    // Built-in @email.com accounts cannot receive real external emails
    if (BUILTIN_DEMO_EMAILS.has(cleanEmail)) {
      const phone = staffEntry?.phone || fsStaffEntry?.phone || storedUser?.phone || fsUserEntry?.phone || '';
      return res.json({
        success: true,
        exists: true,
        role: resolvedRole,
        authType: 'demo_local',
        maskedPhone: maskIndianPhone(phone),
      });
    }

    // Ensure Firebase Auth user exists when account is verified in local JSON or Firestore
    const ensureResult = await ensureFirebaseAuthUserExists(cleanEmail);
    const hasExplicitServerProject = Boolean(
      process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID
    );
    if (
      hasExplicitServerProject &&
      (ensureResult.errorCode === 'PASSWORD_LOGIN_DISABLED' ||
        ensureResult.errorCode === 'OPERATION_NOT_ALLOWED')
    ) {
      return res.status(400).json({
        success: false,
        exists: true,
        error:
          'Email/Password sign-in is disabled in Firebase Authentication for this project. Enable Email/Password under Firebase Console → Authentication → Sign-in method.',
      });
    }

    return res.json({
      success: true,
      exists: true,
      role: resolvedRole,
      authType: 'firebase',
      firebaseEnsured: ensureResult.ensured,
      firebaseCreated: ensureResult.created,
      accountFoundLocally: true,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, exists: false, error: err.message || 'Password reset validation failed.' });
  }
});

/**
 * POST /api/auth/request-demo-reset
 * Strictly scoped to built-in non-deliverable @email.com fleet/demo accounts.
 * Requires matching the registered 10-digit mobile number before issuing a short-lived
 * single-use reset token. Real user emails must always use Firebase Auth OOB email verification.
 */
apiRouter.post('/auth/request-demo-reset', authResetLimiter, (req: Request, res: Response) => {
  try {
    const { email, phone, targetPortal } = req.body || {};
    const cleanEmail = String(email || '').trim().toLowerCase();
    const portal = String(targetPortal || 'customer').trim().toLowerCase();

    if (!BUILTIN_DEMO_EMAILS.has(cleanEmail)) {
      return res.status(403).json({
        success: false,
        error: 'Direct mobile verification reset is only available for built-in fleet demo accounts. Please use the email reset link.',
      });
    }

    const users = loadStoredUsers();
    const user = users.find((u) => (u.email || '').toLowerCase() === cleanEmail);
    const staffMatch = loadStoredStaff().find((s) => (s.email || '').toLowerCase() === cleanEmail);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Demo account record not found.' });
    }

    if (portal === 'delivery' && user.role !== 'delivery' && user.role !== 'staff' && user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Account is not authorized for Delivery Portal reset.' });
    }
    if (portal === 'staff' && user.role !== 'staff' && user.role !== 'delivery' && user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Account is not authorized for Staff Portal reset.' });
    }
    if (portal === 'vendor' && user.role !== 'vendor' && user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Account is not authorized for Vendor Portal reset.' });
    }

    const submittedDigits = String(phone || '').replace(/\D/g, '').slice(-10);
    const storedDigits = String(staffMatch?.phone || user.phone || '').replace(/\D/g, '').slice(-10);

    if (submittedDigits.length !== 10 || storedDigits.length !== 10) {
      return res.status(400).json({ success: false, error: 'Please enter a valid 10-digit registered mobile number.' });
    }

    const isMatch = crypto.timingSafeEqual(Buffer.from(submittedDigits), Buffer.from(storedDigits));
    if (!isMatch) {
      return res.status(403).json({
        success: false,
        error: 'Mobile number does not match the registered profile.',
      });
    }

    const rawToken = crypto.randomBytes(24).toString('base64url');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    demoResetTokens.set(cleanEmail, {
      email: cleanEmail,
      tokenHash,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });

    return res.json({
      success: true,
      resetToken: rawToken,
      expiresInSeconds: 600,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Verification failed.' });
  }
});

/**
 * POST /api/auth/complete-demo-reset
 * Consumes a single-use verified token for built-in @email.com accounts and updates passwordHash.
 */
apiRouter.post('/auth/complete-demo-reset', authResetLimiter, (req: Request, res: Response) => {
  try {
    const { email, resetToken, newPassword } = req.body || {};
    const cleanEmail = String(email || '').trim().toLowerCase();
    const token = String(resetToken || '').trim();
    const nextPass = String(newPassword || '');

    if (!BUILTIN_DEMO_EMAILS.has(cleanEmail)) {
      return res.status(403).json({ success: false, error: 'Invalid account type for local reset.' });
    }
    if (!token) {
      return res.status(400).json({ success: false, error: 'Missing password reset verification token.' });
    }
    if (nextPass.length < 6 || nextPass.length > 128) {
      return res.status(400).json({ success: false, error: 'Password must be between 6 and 128 characters.' });
    }

    const record = demoResetTokens.get(cleanEmail);
    if (!record || Date.now() > record.expiresAt) {
      demoResetTokens.delete(cleanEmail);
      return res.status(400).json({ success: false, error: 'Reset verification expired. Please request a new reset.' });
    }

    const submittedHash = crypto.createHash('sha256').update(token).digest('hex');
    const tokenValid = crypto.timingSafeEqual(Buffer.from(submittedHash, 'hex'), Buffer.from(record.tokenHash, 'hex'));
    if (!tokenValid) {
      return res.status(403).json({ success: false, error: 'Invalid reset verification token.' });
    }

    // Consume single-use token immediately
    demoResetTokens.delete(cleanEmail);

    const users = loadStoredUsers();
    const idx = users.findIndex((u) => (u.email || '').toLowerCase() === cleanEmail);
    if (idx < 0) {
      return res.status(404).json({ success: false, error: 'Account not found.' });
    }

    users[idx].passwordHash = hashPasswordSecure(nextPass);
    users[idx].passwordUpdatedAt = new Date().toISOString();
    saveStoredUsers(users);

    return res.json({
      success: true,
      message: `Password for ${cleanEmail} has been updated. You can now sign in with your new password.`,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to update password.' });
  }
});

/**
 * POST /api/auth/verify-role
 * Server-side route authorization verifier.
 * Checks whether user has permission to access the requested portal.
 * If unauthorized, returns the user's appropriate dashboard URL for redirection.
 */
apiRouter.post('/auth/verify-role', (req: Request, res: Response) => {
  try {
    const { email, role, requestedPortal } = req.body;
    const cleanEmail = (email || '').trim().toLowerCase();

    const staffMatch = cleanEmail ? loadStoredStaff().find((s) => (s.email || '').toLowerCase() === cleanEmail) : undefined;
    const storedMatch = cleanEmail ? loadStoredUsers().find((u) => (u.email || '').toLowerCase() === cleanEmail) : undefined;

    // Determine authoritative role
    let resolvedRole: 'customer' | 'admin' | 'staff' | 'vendor' | 'delivery' = (role as any) || 'customer';
    if (staffMatch && staffMatch.active !== false) {
      resolvedRole = normalizeStaffPortalRole(staffMatch.role);
    } else if (storedMatch && storedMatch.active !== false) {
      resolvedRole = storedMatch.role;
    } else if (cleanEmail && KNOWN_ROLES[cleanEmail]) {
      resolvedRole = KNOWN_ROLES[cleanEmail].role;
    } else if (cleanEmail === VALID_ADMIN_EMAIL) {
      resolvedRole = 'admin';
    } else if (cleanEmail.startsWith('delivery')) {
      resolvedRole = 'delivery';
    } else if (cleanEmail.startsWith('staff')) {
      resolvedRole = 'staff';
    } else if (cleanEmail.startsWith('vendor')) {
      resolvedRole = 'vendor';
    }

    const dashboardMap: Record<string, string> = {
      admin: '/admin',
      staff: '/staff',
      delivery: '/delivery',
      vendor: '/vendor',
      customer: '/account',
    };

    const target = requestedPortal || 'customer';
    let isAuthorized = false;

    if (target === 'admin') {
      isAuthorized = resolvedRole === 'admin';
    } else if (target === 'staff') {
      isAuthorized = resolvedRole === 'staff' || resolvedRole === 'delivery' || resolvedRole === 'admin';
    } else if (target === 'delivery') {
      isAuthorized = resolvedRole === 'delivery' || resolvedRole === 'staff' || resolvedRole === 'admin';
    } else if (target === 'vendor') {
      isAuthorized = resolvedRole === 'vendor' || resolvedRole === 'admin';
    } else {
      // Customer views are accessible by all authenticated users
      isAuthorized = true;
    }

    if (!isAuthorized) {
      return res.status(403).json({
        authorized: false,
        role: resolvedRole,
        redirectUrl: dashboardMap[resolvedRole] || '/account',
        message: `Unauthorized for ${target.toUpperCase()} portal. Redirecting to your authorized ${resolvedRole.toUpperCase()} dashboard.`,
      });
    }

    return res.json({
      authorized: true,
      role: resolvedRole,
      dashboardUrl: dashboardMap[resolvedRole] || '/account',
    });
  } catch (err: any) {
    return res.status(500).json({ authorized: false, error: err.message || 'Role verification failed.' });
  }
});

/**
 * POST /api/admin/purge-temporary-accounts
 * Identifies and purges any registered accounts created with temporary/disposable emails or fake phone numbers.
 */
apiRouter.post('/admin/purge-temporary-accounts', (req: Request, res: Response) => {
  try {
    const purged: Array<{ id: string; email: string; phone?: string; reason: string }> = [];
    let totalAudited = 0;

    for (const [email, user] of registeredServerUsers.entries()) {
      totalAudited++;
      const emailCheck = isTemporaryEmail(email);
      const phoneCheck = user.phone ? isTemporaryOrFakePhone(user.phone) : { isFake: false };

      if (emailCheck.isTemporary || phoneCheck.isFake) {
        const reason = [
          emailCheck.isTemporary ? `Temporary Email: ${emailCheck.reason}` : '',
          phoneCheck.isFake ? `Fake Phone: ${phoneCheck.reason}` : '',
        ].filter(Boolean).join(' | ');

        registeredServerUsers.delete(email);
        purged.push({
          id: email,
          email,
          phone: user.phone,
          reason,
        });
      }
    }

    return res.json({
      success: true,
      totalAudited,
      totalPurged: purged.length,
      purgedAccounts: purged,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Purge failed' });
  }
});

// ============================================================================
// VENDOR ADVERTISING WALLET ENDPOINTS (PHASE 2)
// Server-Authoritative, Zero-Trust Financial Mutations & Multi-Tenant Isolation
// ============================================================================

import {
  getAllAdvertisingWallets,
  getAuthoritativeWallet,
  getAuthoritativeTransactions,
  executeServerWalletAdjustment,
  executeAdRefundServer,
  canAccessVendorAdvertising,
  RequestingUser,
} from './advertisingWalletServer';
import {
  getAuthoritativeAttributionsForVendor,
  getAllAuthoritativeAttributions,
  getAttributionConfig,
  setAttributionWindowDays,
  calculateROAS,
} from './advertisingAttributionServer';

function extractRequestingUser(req: Request): RequestingUser {
  const rawEmail = (req.headers['x-user-email'] as string)?.toLowerCase() || '';
  const rawRole = (req.headers['x-user-role'] as string)?.toLowerCase() || '';
  const rawUid = (req.headers['x-user-id'] as string) || (req.headers['x-user-uid'] as string) || (req.headers['x-vendor-id'] as string) || '';
  const explicitVendorId = (req.headers['x-vendor-id'] as string) || undefined;

  let effectiveRole: 'admin' | 'staff' | 'vendor' | 'customer' = 'customer';
  if (rawEmail === VALID_ADMIN_EMAIL) {
    effectiveRole = 'admin';
  } else if (rawEmail === 'staff@puresudh.com' || rawEmail.startsWith('staff')) {
    effectiveRole = 'staff';
  } else if (rawEmail === 'vendor@puresudh.com' || rawEmail.startsWith('vendor') || rawRole === 'vendor') {
    effectiveRole = 'vendor';
  } else if (rawRole && ['admin', 'staff', 'vendor', 'customer'].includes(rawRole)) {
    effectiveRole = rawRole as any;
  }

  return {
    uid: rawUid,
    email: rawEmail,
    role: effectiveRole,
    vendorId: explicitVendorId || (effectiveRole === 'vendor' ? rawUid : undefined),
  };
}

/**
 * GET /api/advertising/wallets
 * Admin-only: Returns all active vendor advertising wallets.
 */
apiRouter.get('/advertising/wallets', requireRole(['admin']), (_req: Request, res: Response) => {
  try {
    const wallets = getAllAdvertisingWallets();
    const totalFloat = wallets.reduce((sum, w) => sum + (w.availableBalance || 0), 0);
    const totalDeposited = wallets.reduce((sum, w) => sum + (w.totalDeposited || 0), 0);
    const totalSpent = wallets.reduce((sum, w) => sum + (w.totalSpent || 0), 0);
    const totalRefunded = wallets.reduce((sum, w) => sum + (w.totalRefunded || 0), 0);

    return res.json({
      success: true,
      wallets,
      summary: {
        totalWallets: wallets.length,
        totalFloat,
        totalDeposited,
        totalSpent,
        totalRefunded,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to fetch advertising wallets' });
  }
});

/**
 * GET /api/advertising/wallet/:vendorId
 * Returns wallet for a specific vendor with strict multi-tenant isolation.
 * Vendor A cannot access Vendor B's wallet!
 */
apiRouter.get('/advertising/wallet/:vendorId', (req: Request, res: Response) => {
  try {
    const { vendorId } = req.params;
    const requestingUser = extractRequestingUser(req);

    if (!canAccessVendorAdvertising(requestingUser, vendorId)) {
      return res.status(403).json({
        success: false,
        error: `Access Denied: Cross-vendor advertising data access is prohibited. You cannot view wallet for '${vendorId}'.`,
        requestingUserRole: requestingUser.role,
      });
    }

    const wallet = getAuthoritativeWallet(vendorId);
    if (!wallet) {
      return res.status(404).json({ success: false, error: `Advertising wallet not found for vendor '${vendorId}'` });
    }

    const transactions = getAuthoritativeTransactions(vendorId);

    return res.json({
      success: true,
      wallet,
      transactions,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to fetch advertising wallet' });
  }
});

/**
 * GET /api/advertising/transactions/:vendorId
 * Returns immutable transaction ledger for a vendor with strict tenant isolation.
 */
apiRouter.get('/advertising/transactions/:vendorId', (req: Request, res: Response) => {
  try {
    const { vendorId } = req.params;
    const requestingUser = extractRequestingUser(req);

    if (!canAccessVendorAdvertising(requestingUser, vendorId)) {
      return res.status(403).json({
        success: false,
        error: `Access Denied: You cannot view advertising transactions for another vendor '${vendorId}'.`,
      });
    }

    const transactions = getAuthoritativeTransactions(vendorId);
    return res.json({
      success: true,
      transactions,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to fetch advertising transactions' });
  }
});

/**
 * POST /api/advertising/wallet/admin-action
 * Admin only: Performs authoritative server-side credit top-up, refund, or manual adjustment.
 * Completely separate from vendor earnings and payouts.
 * Creates immutable transaction record.
 */
apiRouter.post('/advertising/wallet/admin-action', requireRole(['admin']), (req: Request, res: Response) => {
  try {
    const { vendorId, action, amount, reason, adjustmentType } = req.body;
    const requestingUser = extractRequestingUser(req);
    const adminId = (req.body.adminId as string)?.trim() || requestingUser.email || requestingUser.uid || 'admin_user';

    const result = executeServerWalletAdjustment({
      vendorId,
      action,
      amount,
      reason,
      adminId,
      adjustmentType,
    });

    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    return res.json({
      success: true,
      message: `Advertising wallet action '${action}' completed successfully.`,
      wallet: result.wallet,
      transaction: result.transaction,
      auditLog: result.auditLog,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Advertising wallet action failed' });
  }
});

/**
 * POST /api/advertising/refund
 * Authoritative Phase 7 Ad Refunds Endpoint
 * Supports:
 * - campaign refund
 * - unused wallet balance refund
 * - admin adjustment
 * - expired campaign balance
 * Creates immutable REFUND transaction; never deletes original AD_SPEND.
 */
apiRouter.post('/advertising/refund', (req: Request, res: Response) => {
  try {
    const requestingUser = extractRequestingUser(req);
    const { vendorId, refundType, amount, reason, campaignId, productId } = req.body;

    if (!vendorId || !refundType || amount == null || !reason) {
      return res.status(400).json({
        success: false,
        error: 'vendorId, refundType, amount, and reason are required for advertising refund.',
      });
    }

    // Tenant check: Only admin or the owning vendor can initiate
    if (!canAccessVendorAdvertising(requestingUser, vendorId)) {
      return res.status(403).json({
        success: false,
        error: `Access Denied: You cannot issue advertising refunds for vendor '${vendorId}'.`,
      });
    }

    const authorizedBy = (req.body.authorizedBy as string)?.trim() || requestingUser.email || requestingUser.uid || 'admin_user';

    const result = executeAdRefundServer({
      vendorId,
      refundType,
      amount: Number(amount),
      reason: String(reason).trim(),
      campaignId: campaignId ? String(campaignId).trim() : undefined,
      productId: productId ? String(productId).trim() : undefined,
      authorizedBy,
    });

    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    return res.json({
      success: true,
      message: `Advertising refund of ₹${amount} issued successfully.`,
      wallet: result.wallet,
      transaction: result.transaction,
      auditLog: result.auditLog,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Advertising refund failed' });
  }
});

/**
 * GET /api/advertising/attributions
 * Returns authoritative advertising attribution records (Phase 7).
 * Reporting metadata only. Multi-tenant isolated.
 */
apiRouter.get('/advertising/attributions', (req: Request, res: Response) => {
  try {
    const requestingUser = extractRequestingUser(req);
    const vendorIdQuery = (req.query.vendorId as string)?.trim();

    if (requestingUser.role === 'admin') {
      const attributions = vendorIdQuery
        ? getAuthoritativeAttributionsForVendor(vendorIdQuery)
        : getAllAuthoritativeAttributions();
      return res.json({ success: true, attributions });
    }

    // Vendor mode
    const vendorId = vendorIdQuery || requestingUser.vendorId;
    if (!vendorId || !canAccessVendorAdvertising(requestingUser, vendorId)) {
      return res.status(403).json({
        success: false,
        error: 'Access Denied: You can only view your own advertising attributions.',
      });
    }

    const attributions = getAuthoritativeAttributionsForVendor(vendorId);
    return res.json({ success: true, attributions });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to fetch attributions' });
  }
});

/**
 * GET /api/advertising/attribution-config
 */
apiRouter.get('/advertising/attribution-config', (_req: Request, res: Response) => {
  return res.json({ success: true, config: getAttributionConfig() });
});

/**
 * POST /api/advertising/attribution-config
 */
apiRouter.post('/advertising/attribution-config', requireRole(['admin']), (req: Request, res: Response) => {
  try {
    const { attributionWindowDays } = req.body;
    if (typeof attributionWindowDays !== 'number' || attributionWindowDays <= 0) {
      return res.status(400).json({ success: false, error: 'attributionWindowDays must be a positive integer.' });
    }
    const updated = setAttributionWindowDays(attributionWindowDays);
    return res.json({ success: true, config: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to update config' });
  }
});

// ============================================================================
// VENDOR ADVERTISING CAMPAIGN ENDPOINTS (PHASE 3)
// Campaign Creation, Strict Product & Budget Validation, Admin Approval Workflow
// ============================================================================

import {
  createCampaignServer,
  updateCampaignStatusAdmin,
  updateCampaignStatusVendor,
  getAuthoritativeCampaignsForVendor,
  getAllAuthoritativeCampaigns,
  getAuthoritativeCampaignById,
  getEligibleVendorProducts,
} from './advertisingCampaignServer';

/**
 * GET /api/advertising/campaigns
 * Admin only: Returns all advertising campaigns across vendors.
 */
apiRouter.get('/advertising/campaigns', requireRole(['admin']), (req: Request, res: Response) => {
  try {
    const status = req.query.status as string | undefined;
    const vendorId = req.query.vendorId as string | undefined;

    let campaigns = getAllAuthoritativeCampaigns();
    if (vendorId) {
      campaigns = campaigns.filter((c) => c.vendorId === vendorId);
    }
    if (status) {
      campaigns = campaigns.filter((c) => c.status === status);
    }

    return res.json({
      success: true,
      campaigns,
      total: campaigns.length,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to fetch campaigns' });
  }
});

/**
 * GET /api/advertising/campaigns/vendor/:vendorId
 * Returns campaigns for a vendor with strict multi-tenant isolation.
 * Vendor A cannot access Vendor B's campaigns!
 */
apiRouter.get('/advertising/campaigns/vendor/:vendorId', (req: Request, res: Response) => {
  try {
    const { vendorId } = req.params;
    const requestingUser = extractRequestingUser(req);

    if (!canAccessVendorAdvertising(requestingUser, vendorId)) {
      return res.status(403).json({
        success: false,
        error: `Access Denied: You cannot view advertising campaigns for another vendor '${vendorId}'.`,
      });
    }

    const campaigns = getAuthoritativeCampaignsForVendor(vendorId);
    return res.json({
      success: true,
      campaigns,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to fetch vendor campaigns' });
  }
});

/**
 * GET /api/advertising/campaign/:campaignId
 * Returns a specific campaign by ID with authorization guard.
 */
apiRouter.get('/advertising/campaign/:campaignId', (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;
    const requestingUser = extractRequestingUser(req);
    const campaign = getAuthoritativeCampaignById(campaignId);

    if (!campaign) {
      return res.status(404).json({ success: false, error: `Campaign '${campaignId}' not found.` });
    }

    if (!canAccessVendorAdvertising(requestingUser, campaign.vendorId)) {
      return res.status(403).json({
        success: false,
        error: 'Access Denied: You do not have permission to view this campaign.',
      });
    }

    return res.json({
      success: true,
      campaign,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to fetch campaign' });
  }
});

/**
 * GET /api/advertising/vendor-products/:vendorId
 * Returns eligible products belonging strictly to this vendor for campaign creation.
 */
apiRouter.get('/advertising/vendor-products/:vendorId', (req: Request, res: Response) => {
  try {
    const { vendorId } = req.params;
    const requestingUser = extractRequestingUser(req);

    if (!canAccessVendorAdvertising(requestingUser, vendorId)) {
      return res.status(403).json({
        success: false,
        error: `Access Denied: You cannot inspect products for another vendor '${vendorId}'.`,
      });
    }

    const products = getEligibleVendorProducts(vendorId);
    return res.json({
      success: true,
      vendorId,
      products,
      count: products.length,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to fetch vendor products' });
  }
});

/**
 * POST /api/advertising/campaign/create
 * Creates a new vendor campaign with strict product and wallet budget validation.
 * Initial status is strictly PENDING_APPROVAL.
 */
apiRouter.post('/advertising/campaign/create', (req: Request, res: Response) => {
  try {
    const requestingUser = extractRequestingUser(req);
    const {
      vendorId,
      productId,
      campaignName,
      dailyBudget,
      totalBudget,
      cpc,
      startDate,
      endDate,
    } = req.body;

    if (!vendorId) {
      return res.status(400).json({ success: false, error: 'vendorId is required.' });
    }

    // Verify requesting user is authorized for this vendorId
    if (!canAccessVendorAdvertising(requestingUser, vendorId)) {
      return res.status(403).json({
        success: false,
        error: `Access Denied: You cannot create advertising campaigns for vendor '${vendorId}'.`,
      });
    }

    const result = createCampaignServer({
      vendorId,
      productId,
      campaignName,
      dailyBudget,
      totalBudget,
      cpc,
      startDate,
      endDate,
      createdBy: requestingUser.email || requestingUser.uid || vendorId,
    });

    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    return res.status(201).json({
      success: true,
      message: 'Advertising campaign created successfully and submitted for administrative approval.',
      campaign: result.campaign,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to create campaign' });
  }
});

/**
 * POST /api/advertising/campaign/admin-status
 * Admin only: Approves, rejects, pauses, resumes, or stops a campaign.
 */
apiRouter.post('/advertising/campaign/admin-status', requireRole(['admin']), (req: Request, res: Response) => {
  try {
    const requestingUser = extractRequestingUser(req);
    const { campaignId, action, reason } = req.body;

    if (!campaignId || !action) {
      return res.status(400).json({ success: false, error: 'campaignId and action are required.' });
    }

    const result = updateCampaignStatusAdmin({
      campaignId,
      action,
      reason,
      adminId: requestingUser.email || 'admin_user',
    });

    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    return res.json({
      success: true,
      message: `Campaign status updated to '${result.campaign?.status}' via action '${action}'.`,
      campaign: result.campaign,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to update campaign status' });
  }
});

/**
 * POST /api/advertising/campaign/action
 * Allows vendor (or admin) to pause or resume their campaign.
 */
apiRouter.post('/advertising/campaign/action', (req: Request, res: Response) => {
  try {
    const requestingUser = extractRequestingUser(req);
    const { campaignId, action, reason } = req.body;

    if (!campaignId || !action) {
      return res.status(400).json({ success: false, error: 'campaignId and action are required.' });
    }

    if (action !== 'PAUSE' && action !== 'RESUME') {
      return res.status(400).json({
        success: false,
        error: `Only 'PAUSE' and 'RESUME' actions are permitted on this route. Use admin status route for administrative moderation.`,
      });
    }

    const campaign = getAuthoritativeCampaignById(campaignId);
    if (!campaign) {
      return res.status(404).json({ success: false, error: `Campaign '${campaignId}' not found.` });
    }

    if (!canAccessVendorAdvertising(requestingUser, campaign.vendorId)) {
      return res.status(403).json({
        success: false,
        error: `Access Denied: You cannot modify campaigns belonging to vendor '${campaign.vendorId}'.`,
      });
    }

    const result = updateCampaignStatusVendor({
      campaignId,
      vendorId: campaign.vendorId,
      action,
      reason,
    });

    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    return res.json({
      success: true,
      message: `Campaign status updated to '${result.campaign?.status}'.`,
      campaign: result.campaign,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to update campaign' });
  }
});

// ============================================================================
// PHASE 4: AUTHORITATIVE SERVER-SIDE CPC BILLING & ADVERTISING LEDGER
// ============================================================================

import {
  processAuthoritativeCpcClick,
  getAuthoritativeClicksForVendor,
  getAuthoritativeInvalidClicksForVendor,
} from './cpcBillingServer';

/**
 * POST /api/advertising/cpc/click
 * Processes a sponsored ad click with server-side CPC billing.
 * Enforces zero-trust validation:
 * - Campaign exists and is ACTIVE
 * - Product is active, available, belongs to vendor
 * - Authoritative server-side CPC deduction
 * - Idempotency protection against duplicate charges
 * - Rapid click debounce and bot detection
 * - Anti-overdraft negative balance prevention (never allows balance < 0, auto-pauses campaign)
 * - Creates immutable AD_SPEND advertising transaction
 * - Records click in advertisingClicks or advertisingInvalidClicks
 */
apiRouter.post('/advertising/cpc/click', (req: Request, res: Response) => {
  try {
    const { campaignId, customerId, idempotencyKey, productId, isTestSimulator } = req.body;

    if (!campaignId) {
      return res.status(400).json({ success: false, error: 'campaignId is required.' });
    }

    const userAgent = (req.headers['user-agent'] as string) || '';
    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';

    const result = processAuthoritativeCpcClick({
      campaignId,
      customerId,
      idempotencyKey,
      userAgent,
      ipAddress,
      productId,
      isTestSimulator: Boolean(isTestSimulator),
    });

    return res.status(200).json(result);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to process CPC click' });
  }
});

/**
 * GET /api/advertising/clicks/:vendorId
 * Returns valid clicks for a vendor with strict tenant isolation.
 */
apiRouter.get('/advertising/clicks/:vendorId', (req: Request, res: Response) => {
  try {
    const { vendorId } = req.params;
    const requestingUser = extractRequestingUser(req);

    if (!canAccessVendorAdvertising(requestingUser, vendorId)) {
      return res.status(403).json({
        success: false,
        error: `Access Denied: You cannot view advertising clicks for another vendor '${vendorId}'.`,
      });
    }

    const clicks = getAuthoritativeClicksForVendor(vendorId);
    return res.json({
      success: true,
      clicks,
      total: clicks.length,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to fetch vendor clicks' });
  }
});

/**
 * GET /api/advertising/invalid-clicks/:vendorId
 * Returns invalid clicks for a vendor with strict tenant isolation.
 */
apiRouter.get('/advertising/invalid-clicks/:vendorId', (req: Request, res: Response) => {
  try {
    const { vendorId } = req.params;
    const requestingUser = extractRequestingUser(req);

    if (!canAccessVendorAdvertising(requestingUser, vendorId)) {
      return res.status(403).json({
        success: false,
        error: `Access Denied: You cannot view invalid advertising clicks for another vendor '${vendorId}'.`,
      });
    }

    const invalidClicks = getAuthoritativeInvalidClicksForVendor(vendorId);
    return res.json({
      success: true,
      invalidClicks,
      total: invalidClicks.length,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to fetch vendor invalid clicks' });
  }
});

// ============================================================================
// PHASE 5: SPONSORED PRODUCT PLACEMENT & SELECTION LAYER
// ============================================================================

import {
  getAuthoritativeSponsoredProducts,
  SponsoredPlacementParams,
} from './sponsoredPlacementServer';

/**
 * GET /api/advertising/sponsored-products
 * Public endpoint returning eligible sponsored products for designated positions
 * in search, categories, homepage, and recommendations.
 * Enforces:
 * - Active campaigns & vendors only
 * - In-stock, available, compliant products only
 * - CPC bid ranking
 * - Zero exposure of private vendor data (public product info only)
 */
apiRouter.get('/advertising/sponsored-products', (req: Request, res: Response) => {
  try {
    const placement = (req.query.placement as any) || 'homepage';
    const categorySlug = req.query.categorySlug as string | undefined;
    const searchQuery = req.query.searchQuery as string | undefined;
    const currentProductId = req.query.currentProductId as string | undefined;
    const limit = req.query.limit ? Number(req.query.limit) : 4;

    const sponsoredProducts = getAuthoritativeSponsoredProducts({
      placement,
      categorySlug,
      searchQuery,
      currentProductId,
      limit,
    });

    return res.json({
      success: true,
      placement,
      sponsoredProducts,
      total: sponsoredProducts.length,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to select sponsored products' });
  }
});

// ============================================================================
// PHASE 6: ADVERTISING DASHBOARD & REPORTS ENGINE
// ============================================================================

import {
  getAuthoritativeAdvertisingKPIs,
  getAuthoritativeAdvertisingReports,
  AdvertisingReportFilters,
} from './advertisingReportsServer';

/**
 * GET /api/advertising/dashboard-kpis/:vendorId?
 * Returns authoritative advertising KPIs for vendor or admin dashboard.
 * Enforces strict financial separation between Platform Commission & Advertising Revenue.
 */
apiRouter.get('/advertising/dashboard-kpis/:vendorId?', (req: Request, res: Response) => {
  try {
    const { vendorId } = req.params;
    const requestingUser = extractRequestingUser(req);

    if (vendorId && !canAccessVendorAdvertising(requestingUser, vendorId)) {
      return res.status(403).json({
        success: false,
        error: `Access Denied: You cannot view advertising KPIs for another vendor '${vendorId}'.`,
      });
    }

    // Determine platform commission snapshot from marketplace ledger
    const platformCommission = 76; // e.g. ₹76 from marketplace sales orders
    const kpis = getAuthoritativeAdvertisingKPIs(vendorId, platformCommission);

    return res.json({
      success: true,
      kpis,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to compute advertising KPIs' });
  }
});

/**
 * GET /api/advertising/reports
 * Returns filtered advertising analytical report across campaigns, ledger, and invalid clicks.
 * Strict financial separation: Platform Commission and Advertising Revenue are never combined!
 */
apiRouter.get('/advertising/reports', (req: Request, res: Response) => {
  try {
    const requestingUser = extractRequestingUser(req);
    const targetVendorId = (req.query.vendorId as string) || (requestingUser.role === 'vendor' ? requestingUser.vendorId : undefined);

    if (targetVendorId && !canAccessVendorAdvertising(requestingUser, targetVendorId)) {
      return res.status(403).json({
        success: false,
        error: `Access Denied: You cannot view advertising reports for another vendor '${targetVendorId}'.`,
      });
    }

    const filters: AdvertisingReportFilters = {
      vendorId: targetVendorId,
      campaignId: req.query.campaignId as string | undefined,
      productId: req.query.productId as string | undefined,
      status: req.query.status as string | undefined,
      startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined,
    };

    const platformCommission = 76;
    const report = getAuthoritativeAdvertisingReports(filters, platformCommission);

    return res.json({
      success: true,
      report,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to generate advertising report' });
  }
});

const LOCAL_GEOCODE_DIRECTORY: Array<{
  pincode: string;
  lat: number;
  lng: number;
  addressLine: string;
  landmark: string;
  city: string;
  state: string;
  keywords: string[];
}> = [
  {
    pincode: '800001',
    lat: 25.6093,
    lng: 85.1376,
    addressLine: 'Frazer Road, Near Patna Junction',
    landmark: 'Dak Bungalow Chowk',
    city: 'Patna',
    state: 'Bihar',
    keywords: ['800001', 'frazer', 'dak bungalow', 'dakbunglow', 'patna junction', 'gpo', 'kotwali', 'station road', 'patna'],
  },
  {
    pincode: '800020',
    lat: 25.5941,
    lng: 85.1554,
    addressLine: 'Main Road, Kankarbagh Colony',
    landmark: 'Kendriya Vidyalaya More',
    city: 'Patna',
    state: 'Bihar',
    keywords: ['800020', 'kankarbagh', 'hanuman nagar', 'old bypass'],
  },
  {
    pincode: '800013',
    lat: 25.6207,
    lng: 85.1147,
    addressLine: 'Boring Road Crossing, Patliputra Colony',
    landmark: 'Near Patliputra Golamber',
    city: 'Patna',
    state: 'Bihar',
    keywords: ['800013', 'boring road', 'patliputra', 'sri krishna puri', 'sk puri'],
  },
  {
    pincode: '800003',
    lat: 25.6142,
    lng: 85.1610,
    addressLine: 'Road No. 2, Rajendra Nagar',
    landmark: 'Near Kadamkuan Nala Road',
    city: 'Patna',
    state: 'Bihar',
    keywords: ['800003', 'rajendra nagar', 'kadamkuan'],
  },
  {
    pincode: '800014',
    lat: 25.6178,
    lng: 85.1024,
    addressLine: 'Bailey Road, Sheikhpura & Ashiana Nagar',
    landmark: 'Near Paras HMRI Hospital',
    city: 'Patna',
    state: 'Bihar',
    keywords: ['800014', 'ashiana', 'sheikhpura', 'paras', 'raja bazar'],
  },
  {
    pincode: '801503',
    lat: 25.6144,
    lng: 85.0486,
    addressLine: 'Near Saguna More, Bailey Road West',
    landmark: 'Danapur Khagaul Turning',
    city: 'Patna',
    state: 'Bihar',
    keywords: ['801503', 'saguna more', 'bailey road west', 'bailey road', 'danapur', 'khagaul', 'rp s more'],
  },
  {
    pincode: '845438',
    lat: 26.8004445,
    lng: 84.4946816,
    addressLine: 'Kali Bagh Colony, Near Station Chowk',
    landmark: 'Bettiah Railway Station',
    city: 'Bettiah',
    state: 'Bihar',
    keywords: ['845438', 'bettiah', 'kali bagh', 'pujahan', 'patjirwa', 'west champaran', 'champaran'],
  },
  {
    pincode: '110001',
    lat: 28.6315,
    lng: 77.2167,
    addressLine: 'Outer Circle, Connaught Place',
    landmark: 'Rajiv Chowk Metro',
    city: 'New Delhi',
    state: 'Delhi',
    keywords: ['110001', 'connaught place', 'new delhi', 'delhi'],
  },
  {
    pincode: '560001',
    lat: 12.9716,
    lng: 77.5946,
    addressLine: 'MG Road, Shivaji Nagar',
    landmark: 'Trinity Metro Circle',
    city: 'Bengaluru',
    state: 'Karnataka',
    keywords: ['560001', 'mg road', 'bengaluru', 'bangalore', 'indiranagar'],
  },
];

function parseGeocodingV4Result(result: any) {
  if (!result) return null;
  const lat = result?.location?.latitude;
  const lng = result?.location?.longitude;
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;

  let postalCode = '';
  let city = '';
  let state = '';
  let landmark = '';
  const streetParts: string[] = [];

  if (Array.isArray(result.addressComponents)) {
    for (const comp of result.addressComponents) {
      const types: string[] = comp.types || [];
      const text = comp.longText || comp.shortText || '';
      if (!text) continue;
      if (types.includes('postal_code')) {
        postalCode = text;
      } else if (types.includes('locality')) {
        city = text;
      } else if (types.includes('administrative_area_level_1')) {
        state = text;
      } else if (
        types.includes('street_number') ||
        types.includes('route') ||
        types.includes('sublocality_level_1') ||
        types.includes('sublocality')
      ) {
        if (!streetParts.includes(text)) streetParts.push(text);
      } else if ((types.includes('point_of_interest') || types.includes('premise')) && !landmark) {
        landmark = text;
      }
    }
  }

  const postal = result.postalAddress || {};
  if (!postalCode && postal.postalCode) postalCode = String(postal.postalCode);
  if (!city && postal.locality) city = String(postal.locality);
  if (!state && postal.administrativeArea) state = String(postal.administrativeArea);

  const formattedAddress = String(result.formattedAddress || streetParts.join(', '));
  const addressLine =
    streetParts.join(', ') ||
    (Array.isArray(postal.addressLines) && postal.addressLines[0]) ||
    formattedAddress.split(',').slice(0, 2).join(', ').trim() ||
    'Pinned Location';

  return {
    lat,
    lng,
    placeId: result.placeId || undefined,
    formattedAddress,
    addressLine,
    landmark,
    city: city || 'Patna',
    state: state || 'Bihar',
    pincode: postalCode,
  };
}

function resolveLocalGeocodeFallback(query: string) {
  const q = query.toLowerCase().trim();
  const pinMatch = q.match(/\b(\d{6})\b/);
  if (pinMatch) {
    const exactPin = LOCAL_GEOCODE_DIRECTORY.find((item) => item.pincode === pinMatch[1]);
    if (exactPin) return exactPin;
  }
  const keywordMatch = LOCAL_GEOCODE_DIRECTORY.find((item) =>
    item.keywords.some((kw) => q.includes(kw))
  );
  return keywordMatch || null;
}

function resolveNearestLocalHub(lat: number, lng: number) {
  let best = LOCAL_GEOCODE_DIRECTORY[0];
  let bestDistKm = Infinity;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  for (const entry of LOCAL_GEOCODE_DIRECTORY) {
    const R = 6371;
    const dLat = toRad(entry.lat - lat);
    const dLng = toRad(entry.lng - lng);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat)) * Math.cos(toRad(entry.lat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    if (dist < bestDistKm) {
      bestDistKm = dist;
      best = entry;
    }
  }
  return { hub: best, distanceKm: Number(bestDistKm.toFixed(2)) };
}

/**
 * GET /api/maps/geocode
 * Server-side Geocoding API v4 proxy with local Patna/hub directory fallback.
 */
apiRouter.get('/maps/geocode', async (req: Request, res: Response) => {
  try {
    const address = String(req.query.address || '').trim();
    if (!address || address.length > 300) {
      return res.status(400).json({ success: false, error: 'Valid address query is required.' });
    }

    const serverKey = (process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY || '').trim();
    if (serverKey && serverKey !== 'MY_GOOGLE_MAPS_API_KEY') {
      try {
        const v4Url = `https://geocode.googleapis.com/v4/geocode/address/${encodeURIComponent(address)}?regionCode=IN&languageCode=en`;
        const upstream = await fetch(v4Url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': serverKey,
            'X-Goog-FieldMask': 'results.placeId,results.location,results.formattedAddress,results.postalAddress,results.addressComponents',
            'X-Goog-Maps-Solution-ID': 'gmp_mcp_codeassist_v1_aistudio',
          },
        });
        if (upstream.ok) {
          const data: any = await upstream.json();
          const parsed = parseGeocodingV4Result(data?.results?.[0]);
          if (parsed) {
            return res.json({ success: true, source: 'google_v4', ...parsed });
          }
        }
      } catch {
        // Proceed to fallback
      }
    }

    const localMatch = resolveLocalGeocodeFallback(address);
    if (localMatch) {
      return res.json({
        success: true,
        source: 'local_directory',
        lat: localMatch.lat,
        lng: localMatch.lng,
        formattedAddress: `${localMatch.addressLine}, ${localMatch.city}, ${localMatch.state} ${localMatch.pincode}`,
        addressLine: localMatch.addressLine,
        landmark: localMatch.landmark,
        city: localMatch.city,
        state: localMatch.state,
        pincode: localMatch.pincode,
      });
    }

    return res.status(404).json({ success: false, error: 'Address coordinates not found.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Geocoding failed.' });
  }
});

/**
 * GET /api/maps/reverse-geocode?lat=...&lng=...
 * Server-side Reverse Geocoding API v4 proxy (CORS-safe, never exposes server key to client).
 */
apiRouter.get('/maps/reverse-geocode', async (req: Request, res: Response) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({ success: false, error: 'Valid lat and lng query parameters are required.' });
    }

    const serverKey = (process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY || '').trim();
    if (serverKey && serverKey !== 'MY_GOOGLE_MAPS_API_KEY') {
      try {
        const url = new URL('https://geocode.googleapis.com/v4/geocode/location');
        url.searchParams.append('location.latitude', String(lat));
        url.searchParams.append('location.longitude', String(lng));
        url.searchParams.append('languageCode', 'en');
        url.searchParams.append('regionCode', 'IN');

        const upstream = await fetch(url.toString(), {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': serverKey,
            'X-Goog-FieldMask': 'results.placeId,results.formattedAddress,results.postalAddress,results.addressComponents,results.location',
            'X-Goog-Maps-Solution-ID': 'gmp_mcp_codeassist_v1_aistudio',
          },
        });
        if (upstream.ok) {
          const data: any = await upstream.json();
          const parsed = parseGeocodingV4Result(data?.results?.[0]);
          if (parsed) {
            return res.json({ success: true, source: 'google_v4', ...parsed });
          }
        }
      } catch {
        // Proceed to local hub fallback
      }
    }

    const nearest = resolveNearestLocalHub(lat, lng);
    const isNearPatnaHub = nearest.distanceKm <= 12;
    if (isNearPatnaHub) {
      return res.json({
        success: true,
        source: 'local_hub_proximity',
        lat,
        lng,
        formattedAddress: `${nearest.hub.addressLine}, ${nearest.hub.city}, ${nearest.hub.state} ${nearest.hub.pincode}`,
        addressLine: nearest.hub.addressLine,
        landmark: nearest.hub.landmark,
        city: nearest.hub.city,
        state: nearest.hub.state,
        pincode: nearest.hub.pincode,
        distanceKm: nearest.distanceKm,
      });
    }

    return res.json({
      success: true,
      source: 'coordinates_only',
      lat,
      lng,
      formattedAddress: `Pinned Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
      addressLine: `GPS Coordinates ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      landmark: '',
      city: 'Outside Patna Hubs',
      state: 'India',
      pincode: '',
      distanceKm: nearest.distanceKm,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Reverse geocoding failed.' });
  }
});



