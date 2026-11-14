/**
 * PURE SUDH - Server-Side Authoritative Advertising Attribution Engine (Phase 7)
 *
 * Enforces Zero-Trust Attribution & Reporting Invariants:
 * 1. Advertising Attribution is strictly reporting metadata.
 * 2. When a customer clicks a sponsored product and purchases within the configured
 *    attribution window (default: 7 days), record:
 *    - campaignId
 *    - vendorId
 *    - productId
 *    - orderId
 *    - attributedSales
 * 3. CRITICAL INVARIANT - NEVER MODIFY:
 *    - order total
 *    - vendor commission
 *    - vendor payout
 *    - existing order status
 *    - existing marketplace financial ledger
 * 4. ROAS Calculation:
 *    ROAS = Attributed Sales / Advertising Spend
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  AdvertisingAttribution,
  AdvertisingAttributionWindowConfig,
  AdvertisingClick,
} from '../types/advertising';
import {
  loadAdvertisingCampaigns,
  saveAdvertisingCampaigns,
} from './advertisingCampaignServer';
import { loadAdvertisingClicks } from './cpcBillingServer';
import { logAdvertisingAudit } from '../services/advertisingService';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const ATTRIBUTIONS_FILE = path.join(DATA_DIR, 'advertising_attributions.json');
const ATTRIBUTION_CONFIG_FILE = path.join(DATA_DIR, 'advertising_attribution_config.json');

const DEFAULT_ATTRIBUTION_WINDOW_DAYS = 7;

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// ============================================================================
// Configuration
// ============================================================================

export function getAttributionConfig(): AdvertisingAttributionWindowConfig {
  try {
    ensureDataDir();
    if (fs.existsSync(ATTRIBUTION_CONFIG_FILE)) {
      const raw = fs.readFileSync(ATTRIBUTION_CONFIG_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (typeof parsed?.attributionWindowDays === 'number' && parsed.attributionWindowDays > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[AdvertisingAttributionServer] Failed to read config:', err);
  }
  return { attributionWindowDays: DEFAULT_ATTRIBUTION_WINDOW_DAYS };
}

export function setAttributionWindowDays(days: number): AdvertisingAttributionWindowConfig {
  const sanitizedDays = Math.max(1, Math.min(90, Math.round(days)));
  const config: AdvertisingAttributionWindowConfig = { attributionWindowDays: sanitizedDays };
  try {
    ensureDataDir();
    fs.writeFileSync(ATTRIBUTION_CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[AdvertisingAttributionServer] Failed to write config:', err);
  }
  return config;
}

// ============================================================================
// Attributions Persistence
// ============================================================================

export function loadAdvertisingAttributions(): AdvertisingAttribution[] {
  try {
    ensureDataDir();
    if (fs.existsSync(ATTRIBUTIONS_FILE)) {
      const raw = fs.readFileSync(ATTRIBUTIONS_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[AdvertisingAttributionServer] Failed to read attributions:', err);
  }
  return [];
}

export function saveAdvertisingAttributions(attributions: AdvertisingAttribution[]): void {
  try {
    ensureDataDir();
    fs.writeFileSync(ATTRIBUTIONS_FILE, JSON.stringify(attributions, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[AdvertisingAttributionServer] Failed to save attributions:', err);
  }
}

let inMemoryAttributions = loadAdvertisingAttributions();

// ============================================================================
// Core Attribution Evaluator
// ============================================================================

export interface OrderAttributionInput {
  orderId: string;
  orderNumber?: string;
  customerId?: string;
  orderTimestamp?: string;
  items: Array<{
    productId: string;
    productName?: string;
    price?: number;
    unitPrice?: number;
    quantity: number;
    total?: number;
    vendorId?: string;
  }>;
}

export interface OrderAttributionResult {
  orderId: string;
  attributionsRecorded: AdvertisingAttribution[];
  totalAttributedSales: number;
  unalteredIntegrityCheck: {
    orderTotalAltered: false;
    vendorCommissionAltered: false;
    vendorPayoutAltered: false;
    existingOrderStatusAltered: false;
  };
}

/**
 * Evaluates an order against valid advertising clicks and records attribution metadata.
 * Strictly leaves order total, commissions, and payouts untouched.
 */
export function recordOrderAttributionsServer(
  input: OrderAttributionInput
): OrderAttributionResult {
  const { orderId, orderNumber, customerId, items } = input;
  const now = new Date().toISOString();
  const orderTimeMs = input.orderTimestamp
    ? new Date(input.orderTimestamp).getTime()
    : Date.now();

  const config = getAttributionConfig();
  const windowDays = config.attributionWindowDays;
  const windowMs = windowDays * 24 * 60 * 60 * 1000;

  inMemoryAttributions = loadAdvertisingAttributions();
  const allClicks = loadAdvertisingClicks();
  const allCampaigns = loadAdvertisingCampaigns();

  const newAttributions: AdvertisingAttribution[] = [];
  let totalAttributed = 0;

  for (const item of items) {
    const prodId = item.productId;
    const itemTotal =
      typeof item.total === 'number' && item.total > 0
        ? item.total
        : Math.round(((item.price || item.unitPrice || 0) * (item.quantity || 1)) * 100) / 100;

    // Filter clicks matching this product that occurred within the attribution window
    const eligibleClicks = allClicks.filter((c: AdvertisingClick) => {
      if (c.productId !== prodId) return false;
      if (c.validationStatus !== 'VALID') return false;

      const clickTimeMs = new Date(c.timestamp).getTime();
      if (isNaN(clickTimeMs)) return false;

      // Click must precede or match order time, and be within window
      const diffMs = orderTimeMs - clickTimeMs;
      if (diffMs < 0 || diffMs > windowMs) return false;

      return true;
    });

    if (eligibleClicks.length === 0) {
      continue;
    }

    // Sort: if customerId matches, prioritize that; otherwise select latest click
    eligibleClicks.sort((a, b) => {
      const aCustMatch = customerId && a.customerId === customerId ? 1 : 0;
      const bCustMatch = customerId && b.customerId === customerId ? 1 : 0;
      if (aCustMatch !== bCustMatch) return bCustMatch - aCustMatch;

      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    const matchedClick = eligibleClicks[0];

    // Check if an attribution was already recorded for this click & order & product
    const alreadyAttributed = inMemoryAttributions.some(
      (attr) => attr.orderId === orderId && attr.productId === prodId && attr.clickId === matchedClick.clickId
    );

    if (alreadyAttributed) {
      continue;
    }

    const attributionId = `attr-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const attribution: AdvertisingAttribution = {
      attributionId,
      campaignId: matchedClick.campaignId,
      vendorId: matchedClick.vendorId,
      productId: prodId,
      orderId,
      orderNumber,
      attributedSales: itemTotal,
      clickId: matchedClick.clickId,
      clickTimestamp: matchedClick.timestamp,
      orderTimestamp: input.orderTimestamp || now,
      attributionWindowDays: windowDays,
      createdAt: now,
    };

    newAttributions.push(attribution);
    inMemoryAttributions.unshift(attribution);
    totalAttributed += itemTotal;

    // Update campaign reporting counters (metadata only)
    const camp = allCampaigns.find((c) => c.campaignId === matchedClick.campaignId);
    if (camp) {
      camp.orders = (camp.orders || 0) + 1;
      camp.attributedSales = Math.round(((camp.attributedSales || 0) + itemTotal) * 100) / 100;
      camp.updatedAt = now;
    }

    try {
      logAdvertisingAudit({
        auditId: `audit-attr-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
        actorId: customerId || 'customer_checkout',
        actorType: 'CUSTOMER',
        action: 'ADVERTISING_ORDER_ATTRIBUTED',
        entityType: 'advertisingAttributions',
        entityId: attributionId,
        previousValue: null,
        newValue: {
          campaignId: matchedClick.campaignId,
          orderId,
          attributedSales: itemTotal,
        },
        reason: `Order ${orderId} attributed to Campaign ${matchedClick.campaignId} (Product: ${prodId}) within ${windowDays}-day window.`,
      });
    } catch (e) {
      console.warn('[AdvertisingAttributionServer] Audit log warning:', e);
    }
  }

  if (newAttributions.length > 0) {
    saveAdvertisingAttributions(inMemoryAttributions);
    saveAdvertisingCampaigns(allCampaigns);
  }

  return {
    orderId,
    attributionsRecorded: newAttributions,
    totalAttributedSales: Math.round(totalAttributed * 100) / 100,
    unalteredIntegrityCheck: {
      orderTotalAltered: false,
      vendorCommissionAltered: false,
      vendorPayoutAltered: false,
      existingOrderStatusAltered: false,
    },
  };
}

// ============================================================================
// ROAS Calculator
// ============================================================================

/**
 * Calculates Return on Ad Spend (ROAS).
 * ROAS = Attributed Sales / Advertising Spend
 */
export function calculateROAS(attributedSales: number, advertisingSpend: number): number {
  if (advertisingSpend <= 0) return 0;
  return Math.round((attributedSales / advertisingSpend) * 100) / 100;
}

// ============================================================================
// Queries
// ============================================================================

export function getAuthoritativeAttributionsForVendor(vendorId: string): AdvertisingAttribution[] {
  inMemoryAttributions = loadAdvertisingAttributions();
  return inMemoryAttributions.filter((a) => a.vendorId === vendorId);
}

export function getAllAuthoritativeAttributions(): AdvertisingAttribution[] {
  inMemoryAttributions = loadAdvertisingAttributions();
  return inMemoryAttributions;
}
