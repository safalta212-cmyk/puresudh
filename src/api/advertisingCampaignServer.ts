/**
 * PURE SUDH - Server-Side Authoritative Advertising Campaign Engine (Phase 3)
 *
 * Enforces Zero-Trust Security Invariants:
 * 1. Vendor can only create campaigns for their own verified products.
 * 2. Product must exist, belong to vendor, be active, and available for sale.
 * 3. Total budget cannot exceed the vendor's available advertising wallet balance.
 * 4. Configured budget limits enforced (min daily, min total, min CPC, daily <= total).
 * 5. Initial status is strictly PENDING_APPROVAL.
 * 6. Admins can view, approve, reject, pause, resume, or stop campaigns.
 * 7. Multi-tenant isolation: Vendor A cannot view, edit, or select Vendor B's campaigns or products.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  AdvertisingCampaign,
  AdvertisingCampaignStatus,
} from '../types/advertising';
import { initialProducts } from '../data/seedData';
import { INITIAL_MARKETPLACE_VENDORS } from '../constants';
import { getProductVendorId } from '../utils/vendorCartHelpers';
import {
  getAuthoritativeWallet,
  canAccessVendorAdvertising,
  RequestingUser,
} from './advertisingWalletServer';
import { logAdvertisingAudit } from '../services/advertisingService';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const CAMPAIGNS_FILE = path.join(DATA_DIR, 'advertising_campaigns.json');

// Minimum budget limits configured for platform
export const BUDGET_LIMITS = {
  MIN_DAILY_BUDGET: 50,
  MIN_TOTAL_BUDGET: 100,
  MIN_CPC: 1.0,
  MAX_CPC: 50.0,
} as const;

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function loadAdvertisingCampaigns(): AdvertisingCampaign[] {
  try {
    ensureDataDir();
    if (fs.existsSync(CAMPAIGNS_FILE)) {
      const raw = fs.readFileSync(CAMPAIGNS_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[AdvertisingCampaignServer] Failed to read advertising_campaigns.json:', err);
  }
  return [];
}

export function saveAdvertisingCampaigns(campaigns: AdvertisingCampaign[]): void {
  try {
    ensureDataDir();
    fs.writeFileSync(CAMPAIGNS_FILE, JSON.stringify(campaigns, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[AdvertisingCampaignServer] Failed to save advertising_campaigns.json:', err);
  }
}

let inMemoryCampaigns = loadAdvertisingCampaigns();

// ============================================================================
// Vendor Product Discovery & Eligibility
// ============================================================================

/**
 * Returns products eligible for advertising belonging strictly to this vendor.
 */
export function getEligibleVendorProducts(vendorId: string) {
  return initialProducts.filter((p) => {
    const ownerId = getProductVendorId(p);
    const isOwner = ownerId === vendorId;
    const isActive = p.status === 'active' || p.status == null;
    const isAvailable = p.availability !== false && (p.stock == null || p.stock > 0);
    return isOwner && isActive && isAvailable;
  });
}

// ============================================================================
// Campaign Creation (Vendor Action)
// ============================================================================

export interface CreateCampaignPayload {
  vendorId: string;
  productId: string;
  campaignName: string;
  dailyBudget: number;
  totalBudget: number;
  cpc: number;
  startDate: string;
  endDate: string;
  createdBy: string;
}

export interface CampaignCreationResult {
  success: boolean;
  campaign?: AdvertisingCampaign;
  error?: string;
}

export function createCampaignServer(payload: CreateCampaignPayload): CampaignCreationResult {
  const {
    vendorId,
    productId,
    campaignName,
    dailyBudget,
    totalBudget,
    cpc,
    startDate,
    endDate,
    createdBy,
  } = payload;

  // 1. Verify Vendor exists & is ACTIVE
  const vendor = INITIAL_MARKETPLACE_VENDORS.find((v) => v.id === vendorId);
  if (!vendor || vendor.status !== 'active') {
    return {
      success: false,
      error: `Vendor '${vendorId}' is not an active marketplace vendor. Only active vendors can advertise.`,
    };
  }

  // 2. Validate Product exists in catalog
  const product = initialProducts.find((p) => p.id === productId);
  if (!product) {
    return {
      success: false,
      error: `Product with ID '${productId}' was not found in catalog.`,
    };
  }

  // 3. Verify Product belongs to this vendor (Vendor A cannot advertise Vendor B's product)
  const productVendorId = getProductVendorId(product);
  if (productVendorId !== vendorId) {
    return {
      success: false,
      error: `Access Denied: Product '${product.name}' (${productId}) belongs to vendor '${productVendorId}', not '${vendorId}'. Vendors can only advertise their own products.`,
    };
  }

  // 4. Verify Product is active & available for sale
  if (product.status && product.status !== 'active') {
    return {
      success: false,
      error: `Product '${product.name}' is inactive (status: ${product.status}) and cannot be promoted.`,
    };
  }

  if (product.availability === false || (product.stock != null && product.stock <= 0)) {
    return {
      success: false,
      error: `Product '${product.name}' is out of stock / unavailable for sale and cannot be promoted.`,
    };
  }

  // 5. Validate Campaign Name
  if (!campaignName || campaignName.trim().length < 3) {
    return {
      success: false,
      error: 'Campaign name must be at least 3 characters long.',
    };
  }

  // 6. Validate Budgets against platform configured limits
  const numDaily = Math.round(Number(dailyBudget) * 100) / 100;
  const numTotal = Math.round(Number(totalBudget) * 100) / 100;
  const numCpc = Math.round(Number(cpc) * 100) / 100;

  if (isNaN(numDaily) || numDaily < BUDGET_LIMITS.MIN_DAILY_BUDGET) {
    return {
      success: false,
      error: `Daily budget must be at least ₹${BUDGET_LIMITS.MIN_DAILY_BUDGET}.`,
    };
  }

  if (isNaN(numTotal) || numTotal < BUDGET_LIMITS.MIN_TOTAL_BUDGET) {
    return {
      success: false,
      error: `Total budget must be at least ₹${BUDGET_LIMITS.MIN_TOTAL_BUDGET}.`,
    };
  }

  if (numDaily > numTotal) {
    return {
      success: false,
      error: `Daily budget (₹${numDaily}) cannot exceed total budget (₹${numTotal}).`,
    };
  }

  if (isNaN(numCpc) || numCpc < BUDGET_LIMITS.MIN_CPC || numCpc > BUDGET_LIMITS.MAX_CPC) {
    return {
      success: false,
      error: `CPC bid must be between ₹${BUDGET_LIMITS.MIN_CPC} and ₹${BUDGET_LIMITS.MAX_CPC}.`,
    };
  }

  // 7. Validate against Available Advertising Wallet Balance
  // "Campaign cannot exceed: available wallet balance"
  const wallet = getAuthoritativeWallet(vendorId);
  const availableBalance = wallet ? wallet.availableBalance : 0;
  if (numTotal > availableBalance) {
    return {
      success: false,
      error: `Total budget (₹${numTotal.toLocaleString('en-IN')}) exceeds your available advertising wallet balance of ₹${availableBalance.toLocaleString('en-IN')}. Please top up your advertising wallet before launching this campaign.`,
    };
  }

  // 8. Validate Schedule Dates
  if (!startDate || !endDate) {
    return {
      success: false,
      error: 'Start date and end date are required.',
    };
  }

  const startTs = new Date(startDate).getTime();
  const endTs = new Date(endDate).getTime();
  if (isNaN(startTs) || isNaN(endTs)) {
    return {
      success: false,
      error: 'Invalid start or end date format.',
    };
  }

  if (startTs > endTs) {
    return {
      success: false,
      error: 'Campaign start date cannot be after the end date.',
    };
  }

  // Reload campaigns from disk
  inMemoryCampaigns = loadAdvertisingCampaigns();

  const now = new Date().toISOString();
  const campaignId = `camp-${vendorId}-${Date.now().toString(36)}-${crypto.randomBytes(2).toString('hex')}`;

  const campaign: AdvertisingCampaign = {
    campaignId,
    vendorId,
    productId,
    campaignName: campaignName.trim(),
    dailyBudget: numDaily,
    totalBudget: numTotal,
    spentAmount: 0,
    remainingBalance: numTotal,
    cpc: numCpc,
    impressions: 0,
    validClicks: 0,
    invalidClicks: 0,
    orders: 0,
    attributedSales: 0,
    status: 'PENDING_APPROVAL', // Initial status is strictly PENDING_APPROVAL
    startDate,
    endDate,
    createdAt: now,
    updatedAt: now,
    createdBy: createdBy || vendorId,
  };

  inMemoryCampaigns.unshift(campaign);
  saveAdvertisingCampaigns(inMemoryCampaigns);

  // Log audit record
  try {
    logAdvertisingAudit({
      auditId: `audit-camp-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      actorId: createdBy || vendorId,
      actorType: 'VENDOR',
      action: 'ADVERTISING_CAMPAIGN_CREATE',
      entityType: 'advertisingCampaigns',
      entityId: campaignId,
      previousValue: null,
      newValue: {
        campaignName: campaign.campaignName,
        productId,
        totalBudget: numTotal,
        status: 'PENDING_APPROVAL',
      },
      reason: 'New campaign submission awaiting administrative approval',
    });
  } catch (err) {
    console.warn('[AdvertisingCampaignServer] Audit log warning:', err);
  }

  return {
    success: true,
    campaign,
  };
}

// ============================================================================
// Admin Campaign Status Management
// ============================================================================

export type AdminCampaignAction = 'APPROVE' | 'REJECT' | 'PAUSE' | 'RESUME' | 'STOP';

export interface AdminCampaignStatusPayload {
  campaignId: string;
  action: AdminCampaignAction;
  reason?: string;
  adminId: string;
}

export function updateCampaignStatusAdmin(
  payload: AdminCampaignStatusPayload
): { success: boolean; campaign?: AdvertisingCampaign; error?: string } {
  const { campaignId, action, reason, adminId } = payload;

  inMemoryCampaigns = loadAdvertisingCampaigns();
  const campaign = inMemoryCampaigns.find((c) => c.campaignId === campaignId);

  if (!campaign) {
    return { success: false, error: `Campaign '${campaignId}' not found.` };
  }

  const previousStatus = campaign.status;
  let newStatus: AdvertisingCampaignStatus = campaign.status;

  switch (action) {
    case 'APPROVE':
      if (previousStatus !== 'PENDING_APPROVAL') {
        return {
          success: false,
          error: `Cannot approve campaign in status '${previousStatus}'. Only PENDING_APPROVAL campaigns can be approved.`,
        };
      }
      newStatus = 'ACTIVE';
      break;

    case 'REJECT':
      if (previousStatus !== 'PENDING_APPROVAL') {
        return {
          success: false,
          error: `Cannot reject campaign in status '${previousStatus}'. Only PENDING_APPROVAL campaigns can be rejected.`,
        };
      }
      newStatus = 'REJECTED';
      break;

    case 'PAUSE':
      if (previousStatus !== 'ACTIVE') {
        return {
          success: false,
          error: `Cannot pause campaign in status '${previousStatus}'. Only ACTIVE campaigns can be paused.`,
        };
      }
      newStatus = 'PAUSED';
      break;

    case 'RESUME':
      if (previousStatus !== 'PAUSED') {
        return {
          success: false,
          error: `Cannot resume campaign in status '${previousStatus}'. Only PAUSED campaigns can be resumed.`,
        };
      }
      newStatus = 'ACTIVE';
      break;

    case 'STOP':
      if (previousStatus === 'COMPLETED' || previousStatus === 'REJECTED') {
        return {
          success: false,
          error: `Campaign is already ${previousStatus}.`,
        };
      }
      newStatus = 'COMPLETED';
      break;

    default:
      return { success: false, error: `Unsupported campaign action: ${action}` };
  }

  const now = new Date().toISOString();
  campaign.status = newStatus;
  campaign.updatedAt = now;

  saveAdvertisingCampaigns(inMemoryCampaigns);

  // Log audit record
  try {
    logAdvertisingAudit({
      auditId: `audit-camp-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      actorId: adminId || 'admin_user',
      actorType: 'ADMIN',
      action: `ADVERTISING_CAMPAIGN_${action}`,
      entityType: 'advertisingCampaigns',
      entityId: campaignId,
      previousValue: { status: previousStatus },
      newValue: { status: newStatus },
      reason: reason || `Admin action '${action}' applied to campaign.`,
    });
  } catch (err) {
    console.warn('[AdvertisingCampaignServer] Audit log error:', err);
  }

  return {
    success: true,
    campaign,
  };
}

// ============================================================================
// Query Helpers with Multi-Tenant Isolation
// ============================================================================

export function getAuthoritativeCampaignsForVendor(vendorId: string): AdvertisingCampaign[] {
  inMemoryCampaigns = loadAdvertisingCampaigns();
  return inMemoryCampaigns.filter((c) => c.vendorId === vendorId);
}

export function getAllAuthoritativeCampaigns(): AdvertisingCampaign[] {
  inMemoryCampaigns = loadAdvertisingCampaigns();
  return inMemoryCampaigns;
}

export function getAuthoritativeCampaignById(campaignId: string): AdvertisingCampaign | null {
  inMemoryCampaigns = loadAdvertisingCampaigns();
  return inMemoryCampaigns.find((c) => c.campaignId === campaignId) || null;
}

/**
 * Allows vendors to manage their own campaigns (PAUSE / RESUME) authoritatively.
 */
export function updateCampaignStatusVendor(payload: {
  campaignId: string;
  vendorId: string;
  action: 'PAUSE' | 'RESUME';
  reason?: string;
}): { success: boolean; campaign?: AdvertisingCampaign; error?: string } {
  const { campaignId, vendorId, action, reason } = payload;
  inMemoryCampaigns = loadAdvertisingCampaigns();
  const campaign = inMemoryCampaigns.find((c) => c.campaignId === campaignId);

  if (!campaign) {
    return { success: false, error: `Campaign '${campaignId}' not found.` };
  }

  if (campaign.vendorId !== vendorId) {
    return {
      success: false,
      error: `Access Denied: You cannot modify campaigns belonging to another vendor '${campaign.vendorId}'.`,
    };
  }

  const previousStatus = campaign.status;
  let newStatus: AdvertisingCampaignStatus = campaign.status;

  if (action === 'PAUSE') {
    if (previousStatus !== 'ACTIVE') {
      return { success: false, error: `Cannot pause campaign with status '${previousStatus}'. Only ACTIVE campaigns can be paused.` };
    }
    newStatus = 'PAUSED';
  } else if (action === 'RESUME') {
    if (previousStatus !== 'PAUSED') {
      return { success: false, error: `Cannot resume campaign with status '${previousStatus}'. Only PAUSED campaigns can be resumed.` };
    }
    const wallet = getAuthoritativeWallet(vendorId);
    if (!wallet || wallet.availableBalance <= 0) {
      return {
        success: false,
        error: `Cannot resume campaign: Available advertising wallet balance is insufficient (₹${wallet?.availableBalance || 0}).`,
      };
    }
    newStatus = 'ACTIVE';
  } else {
    return { success: false, error: `Unsupported vendor campaign action: ${action}` };
  }

  const now = new Date().toISOString();
  campaign.status = newStatus;
  campaign.updatedAt = now;
  saveAdvertisingCampaigns(inMemoryCampaigns);

  try {
    logAdvertisingAudit({
      auditId: `audit-camp-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      actorId: vendorId,
      actorType: 'VENDOR',
      action: `ADVERTISING_CAMPAIGN_VENDOR_${action}`,
      entityType: 'advertisingCampaigns',
      entityId: campaignId,
      previousValue: { status: previousStatus },
      newValue: { status: newStatus },
      reason: reason || `Vendor action '${action}' applied to campaign.`,
    });
  } catch (err) {
    console.warn('[AdvertisingCampaignServer] Audit log error:', err);
  }

  return { success: true, campaign };
}

