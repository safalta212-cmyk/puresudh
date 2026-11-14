/**
 * PURE SUDH - Vendor Advertising Foundation Types (Phase 1)
 * 
 * Strict type definitions for vendor advertising campaigns, wallets,
 * immutable transactions, click tracking, and audit logging.
 */

import { Product } from './index';

export type AdvertisingCampaignStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'ACTIVE'
  | 'PAUSED'
  | 'COMPLETED'
  | 'REJECTED';

export interface AdvertisingCampaign {
  campaignId: string;
  vendorId: string;
  productId: string;
  campaignName: string;
  dailyBudget: number;
  totalBudget: number;
  spentAmount: number;
  remainingBalance: number;
  cpc: number;
  impressions: number;
  validClicks: number;
  invalidClicks: number;
  orders: number;
  attributedSales: number;
  status: AdvertisingCampaignStatus;
  startDate: string;
  endDate: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface AdvertisingWallet {
  walletId: string;
  vendorId: string;
  availableBalance: number;
  totalDeposited: number;
  totalSpent: number;
  totalRefunded: number;
  createdAt: string;
  updatedAt: string;
}

export type AdvertisingTransactionType =
  | 'WALLET_TOPUP'
  | 'AD_SPEND'
  | 'REFUND'
  | 'CAMPAIGN_CREDIT'
  | 'MANUAL_ADJUSTMENT'
  | 'EXPIRED_BALANCE';

export type AdRefundReasonType =
  | 'CAMPAIGN_REFUND'
  | 'UNUSED_WALLET_BALANCE_REFUND'
  | 'ADMIN_ADJUSTMENT'
  | 'EXPIRED_CAMPAIGN_BALANCE';

export interface AdvertisingTransaction {
  transactionId: string;
  vendorId: string;
  campaignId: string;
  productId: string;
  type: AdvertisingTransactionType;
  amount: number;
  previousBalance: number;
  newBalance: number;
  description: string;
  status: string;
  refundReasonType?: AdRefundReasonType;
  orderId?: string;
  createdAt: string;
  createdBy: string;
}

export interface AdvertisingAttribution {
  attributionId: string;
  campaignId: string;
  vendorId: string;
  productId: string;
  orderId: string;
  orderNumber?: string;
  attributedSales: number;
  clickId?: string;
  clickTimestamp?: string;
  orderTimestamp: string;
  attributionWindowDays: number;
  createdAt: string;
}

export interface AdvertisingAttributionWindowConfig {
  attributionWindowDays: number;
}

export interface AdvertisingClick {
  clickId: string;
  campaignId: string;
  vendorId: string;
  productId: string;
  customerId: string;
  timestamp: string;
  validationStatus: string;
  chargeable: boolean;
  createdAt: string;
}

export interface AdvertisingInvalidClick {
  clickId: string;
  campaignId: string;
  vendorId: string;
  productId: string;
  reason: string;
  timestamp: string;
  createdAt: string;
}

export interface AdvertisingAuditLog {
  auditId: string;
  actorId: string;
  actorType: string;
  action: string;
  entityType: string;
  entityId: string;
  previousValue: any;
  newValue: any;
  reason: string;
  timestamp: string;
}

export interface SponsoredPlacementParams {
  placement: 'search' | 'category' | 'homepage' | 'recommendations';
  categorySlug?: string;
  searchQuery?: string;
  currentProductId?: string;
  limit?: number;
}

export interface SponsoredProductItem {
  product: Product;
  campaignId: string;
  cpc: number;
  sponsoredLabel: 'Sponsored';
}

export interface AdvertisingReportFilters {
  vendorId?: string;
  campaignId?: string;
  productId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}

export interface AdvertisingDashboardKPIs {
  advertisingRevenue: number;
  activeCampaigns: number;
  totalAdSpend: number;
  vendorAdBalance: number;
  impressions: number;
  validClicks: number;
  invalidClicks: number;
  ordersFromAds: number;
  ctr: number; // percentage
  roas: number; // multiplier
  attributedSales: number;
  platformCommission: number;
  isSeparated: true;
}

export interface CampaignReportRow {
  campaignId: string;
  campaignName: string;
  vendorId: string;
  vendorName: string;
  productId: string;
  productName: string;
  productImage: string;
  dailyBudget: number;
  totalBudget: number;
  spent: number;
  remaining: number;
  cpc: number;
  impressions: number;
  clicks: number;
  invalidClicks: number;
  ctr: number;
  orders: number;
  attributedSales: number;
  status: string;
}

export interface LedgerReportRow {
  transactionId: string;
  date: string;
  vendorId: string;
  vendorName: string;
  campaignId: string;
  campaignName: string;
  productId: string;
  productName: string;
  type: string;
  debit: number;
  credit: number;
  previousBalance: number;
  newBalance: number;
  status: string;
  description: string;
  authorizedBy: string;
}

export interface InvalidClickReportRow {
  clickId: string;
  timestamp: string;
  vendorId: string;
  vendorName: string;
  campaignId: string;
  productId: string;
  productName: string;
  reason: string;
  status: 'BLOCKED_UNCHANGED';
}

export interface AdvertisingReportResult {
  filters: AdvertisingReportFilters;
  summary: {
    grossAdRevenue: number;
    refunds: number;
    netAdRevenue: number;
    adSpend: number;
    impressions: number;
    clicks: number;
    invalidClicks: number;
    orders: number;
    attributedSales: number;
    roas: number;
    ctr: number;
    financialSeparation: {
      platformCommission: number;
      advertisingRevenue: number;
      note: string;
    };
  };
  campaigns: CampaignReportRow[];
  ledger: LedgerReportRow[];
  invalidClicks: InvalidClickReportRow[];
}

