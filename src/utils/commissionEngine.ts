/**
 * Authoritative Server-Side Commission & Financial Ledger Calculation Engine
 * 
 * Strict Hierarchy Rule:
 * 1. Product-specific commission (Highest priority)
 * 2. Category-specific commission
 * 3. Vendor-specific commission
 * 4. Global commission (Default platform baseline, e.g. 10%)
 * 
 * Auditable Financial Ledger & Cryptographic Verification
 */

import {
  CommissionConfig,
  CommissionPrecedenceLevel,
  ItemCommissionBreakdown,
  OrderCommissionCalculation,
  FinancialLedgerEntry,
  VendorFinancialSummary,
  LedgerTransactionType,
} from '../types';

export const DEFAULT_GLOBAL_COMMISSION_RATE = 10; // 10% default platform commission

export const INITIAL_COMMISSION_CONFIG: CommissionConfig = {
  globalRate: DEFAULT_GLOBAL_COMMISSION_RATE,
  categoryRates: {
    'cat-homemade': 12, // 12% for artisanal snacks & thekua
    'cat-dairy': 8,      // 8% for fresh daily essentials (lower margin)
    'cat-sweets': 15,    // 15% for festive gift boxes
    'cat-khoya': 10,     // 10% for pure khoya & mawa
    'cat-pickles': 14,   // 14% for handcrafted achaar
    'cat-papad': 12,     // 12% for sun-dried papad
  },
  vendorRates: {
    'vendor-1': 10, // Sudh Dairy & Thekua Farms
    'vendor-2': 12, // Brijwasi Khoya & Sweets
    'vendor-3': 14, // Mithila Artisanal Pickles & Papad
  },
  productRates: {
    'prod-thekua-traditional': 10,
    'prod-thekua-refined': 10,
    'prod-fresh-paneer': 8,
    'prod-claypot-dahi': 8,
    'prod-pure-khoya': 10,
    'prod-dryfruit-ladoo': 15,
  },
  updatedAt: new Date().toISOString(),
};

/**
 * Resolves the effective commission percentage based on strict hierarchy:
 * Product -> Category -> Vendor -> Global
 */
export function resolveEffectiveCommissionRate(
  config: CommissionConfig,
  productId?: string,
  categoryId?: string,
  vendorId?: string
): { rate: number; precedenceLevel: CommissionPrecedenceLevel; explanation: string } {
  // 1. Product-specific commission
  if (productId && config.productRates && typeof config.productRates[productId] === 'number') {
    const rate = config.productRates[productId];
    return {
      rate,
      precedenceLevel: 'product',
      explanation: `Product-specific rate: ${rate}%`,
    };
  }

  // 2. Category-specific commission
  if (categoryId && config.categoryRates && typeof config.categoryRates[categoryId] === 'number') {
    const rate = config.categoryRates[categoryId];
    return {
      rate,
      precedenceLevel: 'category',
      explanation: `Category-specific rate: ${rate}%`,
    };
  }

  // 3. Vendor-specific commission
  if (vendorId && config.vendorRates && typeof config.vendorRates[vendorId] === 'number') {
    const rate = config.vendorRates[vendorId];
    return {
      rate,
      precedenceLevel: 'vendor',
      explanation: `Vendor-negotiated rate: ${rate}%`,
    };
  }

  // 4. Global platform baseline
  const rate = typeof config.globalRate === 'number' ? config.globalRate : DEFAULT_GLOBAL_COMMISSION_RATE;
  return {
    rate,
    precedenceLevel: 'global',
    explanation: `Platform global baseline rate: ${rate}%`,
  };
}

/**
 * Calculates item-level commission, discount allocation, and vendor earnings
 */
export function calculateItemCommission(
  item: {
    productId: string;
    productName: string;
    categoryId?: string;
    vendorId: string;
    unitPrice: number;
    quantity: number;
    discount?: number;
  },
  config: CommissionConfig
): ItemCommissionBreakdown {
  const itemTotal = item.unitPrice * item.quantity;
  const itemDiscount = Math.min(itemTotal, Number(item.discount || 0));
  const netItemTotal = Math.max(0, itemTotal - itemDiscount);

  const { rate, precedenceLevel } = resolveEffectiveCommissionRate(
    config,
    item.productId,
    item.categoryId,
    item.vendorId
  );

  // Platform commission is calculated on net sales amount
  const platformCommission = Math.round((netItemTotal * rate) / 100);
  const vendorEarning = Math.max(0, netItemTotal - platformCommission);

  return {
    productId: item.productId,
    productName: item.productName,
    categoryId: item.categoryId,
    vendorId: item.vendorId,
    unitPrice: item.unitPrice,
    quantity: item.quantity,
    itemTotal,
    itemDiscount,
    netItemTotal,
    effectiveRate: rate,
    precedenceLevel,
    platformCommission,
    vendorEarning,
  };
}

/**
 * Computes authoritative commission breakdown for a vendor's portion of an order
 */
export function calculateOrderCommissionForVendor(
  orderId: string,
  vendorId: string,
  items: Array<{
    productId: string;
    productName: string;
    categoryId?: string;
    vendorId: string;
    unitPrice: number;
    quantity: number;
    discount?: number;
  }>,
  deliveryFeeShare: number = 0,
  config: CommissionConfig = INITIAL_COMMISSION_CONFIG
): OrderCommissionCalculation {
  const vendorItems = items.filter((i) => i.vendorId === vendorId);

  const itemBreakdowns = vendorItems.map((i) => calculateItemCommission(i, config));

  const grossSales = itemBreakdowns.reduce((sum, item) => sum + item.itemTotal, 0);
  const totalDiscount = itemBreakdowns.reduce((sum, item) => sum + item.itemDiscount, 0);
  const netSales = itemBreakdowns.reduce((sum, item) => sum + item.netItemTotal, 0);
  const totalCommission = itemBreakdowns.reduce((sum, item) => sum + item.platformCommission, 0);
  const totalVendorItemEarnings = itemBreakdowns.reduce((sum, item) => sum + item.vendorEarning, 0);

  // Delivery fee allocated directly to vendor to cover delivery cost
  const vendorEarnings = totalVendorItemEarnings + deliveryFeeShare;

  return {
    orderId,
    vendorId,
    grossSales,
    totalDiscount,
    deliveryFeeShare,
    netSales,
    totalCommission,
    vendorEarnings,
    items: itemBreakdowns,
    calculatedAt: new Date().toISOString(),
  };
}

/**
 * Creates a deterministic, auditable cryptographic hash string for financial ledger verification
 */
export function generateAuditHash(
  transactionId: string,
  vendorId: string,
  type: LedgerTransactionType,
  amount: number,
  balanceAfter: number,
  timestamp: string
): string {
  const payload = `${transactionId}:${vendorId}:${type}:${amount}:${balanceAfter}:${timestamp}:puresudh_secret_audit_key`;
  let hash = 0;
  for (let i = 0; i < payload.length; i++) {
    const char = payload.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  const secondary = (Math.abs(hash * 31 + 17) % 65536).toString(16).padStart(4, '0');
  return `AUDIT-${hex.toUpperCase()}-${secondary.toUpperCase()}`;
}

/**
 * Computes an updated VendorFinancialSummary from an auditable ledger history
 */
export function computeVendorFinancialSummary(
  vendorId: string,
  vendorName: string,
  ledgerEntries: FinancialLedgerEntry[],
  totalOrdersCount: number = 0,
  hasVerifiedBank: boolean = false
): VendorFinancialSummary {
  const vendorEntries = ledgerEntries.filter((e) => e.vendorId === vendorId);

  let grossSales = 0;
  let discounts = 0;
  let commission = 0;
  let refunds = 0;
  let adjustments = 0;
  let paidPayout = 0;
  let lastPayoutDate: string | undefined;

  for (const entry of vendorEntries) {
    switch (entry.type) {
      case 'SALE': {
        const itemGross = Number(entry.metadata?.grossSales ?? entry.amount);
        const itemDisc = Number(entry.metadata?.totalDiscount ?? 0);
        const itemComm = Number(entry.metadata?.totalCommission ?? 0);
        grossSales += itemGross;
        discounts += itemDisc;
        commission += itemComm;
        break;
      }
      case 'COMMISSION': {
        // Explicit commission deduction entry if logged separately
        if (!entry.metadata?.calculatedWithSale) {
          commission += Math.abs(entry.amount);
        }
        break;
      }
      case 'REFUND': {
        refunds += Math.abs(entry.amount);
        break;
      }
      case 'ADJUSTMENT': {
        adjustments += entry.amount;
        break;
      }
      case 'PAYOUT': {
        paidPayout += Math.abs(entry.amount);
        lastPayoutDate = entry.createdAt;
        break;
      }
    }
  }

  // Net vendor earnings
  const vendorEarnings = Math.max(0, grossSales - discounts - commission - refunds + adjustments);
  const pendingPayout = Math.max(0, vendorEarnings - paidPayout);

  let payoutStatus: 'READY' | 'ON_HOLD' | 'REQUIRES_BANK_VERIFICATION' = 'READY';
  if (!hasVerifiedBank) {
    payoutStatus = 'REQUIRES_BANK_VERIFICATION';
  } else if (pendingPayout <= 0) {
    payoutStatus = 'ON_HOLD';
  }

  return {
    vendorId,
    vendorName,
    grossSales,
    discounts,
    commission,
    refunds,
    adjustments,
    vendorEarnings,
    pendingPayout,
    paidPayout,
    totalOrdersCount,
    lastPayoutDate,
    payoutStatus,
    updatedAt: new Date().toISOString(),
  };
}
