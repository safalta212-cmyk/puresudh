/**
 * PURE SUDH - Vendor Advertising Foundation Service (Phase 1)
 *
 * Implements typed Firestore operations for the 6 advertising collections:
 * 1. advertisingCampaigns
 * 2. advertisingWallets
 * 3. advertisingTransactions
 * 4. advertisingClicks
 * 5. advertisingInvalidClicks
 * 6. advertisingAuditLogs
 *
 * Adheres strictly to security rules:
 * - Vendor isolation: Vendor A never reads Vendor B's advertising data
 * - Immutable transactions: Historical financial records are never overwritten
 * - Separate wallet: Advertising wallets are decoupled from vendor earnings/payouts
 */

import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { COLLECTIONS } from '../constants';
import {
  AdvertisingCampaign,
  AdvertisingWallet,
  AdvertisingTransaction,
  AdvertisingClick,
  AdvertisingInvalidClick,
  AdvertisingAuditLog,
} from '../types/advertising';

const STORAGE_KEYS = {
  CAMPAIGNS: 'puresudh_adv_campaigns',
  WALLETS: 'puresudh_adv_wallets',
  TRANSACTIONS: 'puresudh_adv_transactions',
  CLICKS: 'puresudh_adv_clicks',
  INVALID_CLICKS: 'puresudh_adv_invalid_clicks',
  AUDIT_LOGS: 'puresudh_adv_audit_logs',
};

function getLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (Array.isArray(fallback) && !Array.isArray(parsed)) return fallback;
    return parsed as T;
  } catch {
    return fallback;
  }
}

function setLocal<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // Ignore storage quota errors in sandbox
  }
}

// ============================================================================
// 1. advertisingCampaigns
// ============================================================================

export async function getVendorAdvertisingCampaigns(vendorId: string): Promise<AdvertisingCampaign[]> {
  try {
    if (db) {
      const q = query(
        collection(db, COLLECTIONS.ADVERTISING_CAMPAIGNS),
        where('vendorId', '==', vendorId)
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        return snapshot.docs.map((d) => d.data() as AdvertisingCampaign);
      }
    }
  } catch (err) {
    console.warn('[AdvertisingService] Firestore fetch campaigns error, fallback to local:', err);
  }

  const all = getLocal<AdvertisingCampaign[]>(STORAGE_KEYS.CAMPAIGNS, []);
  return all.filter((c) => c.vendorId === vendorId);
}

export async function getAdvertisingCampaignById(campaignId: string): Promise<AdvertisingCampaign | null> {
  try {
    if (db) {
      const ref = doc(db, COLLECTIONS.ADVERTISING_CAMPAIGNS, campaignId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        return snap.data() as AdvertisingCampaign;
      }
    }
  } catch (err) {
    console.warn('[AdvertisingService] Firestore get campaign error, fallback to local:', err);
  }

  const all = getLocal<AdvertisingCampaign[]>(STORAGE_KEYS.CAMPAIGNS, []);
  return all.find((c) => c.campaignId === campaignId) || null;
}

export async function createAdvertisingCampaign(
  campaignData: Omit<AdvertisingCampaign, 'createdAt' | 'updatedAt'>
): Promise<AdvertisingCampaign> {
  const now = new Date().toISOString();
  const campaign: AdvertisingCampaign = {
    ...campaignData,
    createdAt: now,
    updatedAt: now,
  };

  try {
    if (db) {
      const ref = doc(db, COLLECTIONS.ADVERTISING_CAMPAIGNS, campaign.campaignId);
      await setDoc(ref, campaign);
    }
  } catch (err) {
    console.warn('[AdvertisingService] Firestore save campaign error, saved locally:', err);
  }

  const all = getLocal<AdvertisingCampaign[]>(STORAGE_KEYS.CAMPAIGNS, []);
  const existingIdx = all.findIndex((c) => c.campaignId === campaign.campaignId);
  if (existingIdx >= 0) {
    all[existingIdx] = campaign;
  } else {
    all.push(campaign);
  }
  setLocal(STORAGE_KEYS.CAMPAIGNS, all);

  return campaign;
}

export async function updateAdvertisingCampaign(
  campaignId: string,
  updates: Partial<Omit<AdvertisingCampaign, 'campaignId' | 'vendorId' | 'createdAt'>>
): Promise<void> {
  const now = new Date().toISOString();
  const payload = {
    ...updates,
    updatedAt: now,
  };

  try {
    if (db) {
      const ref = doc(db, COLLECTIONS.ADVERTISING_CAMPAIGNS, campaignId);
      await updateDoc(ref, payload);
    }
  } catch (err) {
    console.warn('[AdvertisingService] Firestore update campaign error, updating locally:', err);
  }

  const all = getLocal<AdvertisingCampaign[]>(STORAGE_KEYS.CAMPAIGNS, []);
  const idx = all.findIndex((c) => c.campaignId === campaignId);
  if (idx >= 0) {
    all[idx] = { ...all[idx], ...payload };
    setLocal(STORAGE_KEYS.CAMPAIGNS, all);
  }
}

// ============================================================================
// 2. advertisingWallets
// ============================================================================

export async function getVendorAdvertisingWallet(vendorId: string): Promise<AdvertisingWallet | null> {
  try {
    if (db) {
      const q = query(
        collection(db, COLLECTIONS.ADVERTISING_WALLETS),
        where('vendorId', '==', vendorId)
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        return snapshot.docs[0].data() as AdvertisingWallet;
      }
    }
  } catch (err) {
    console.warn('[AdvertisingService] Firestore fetch wallet error, fallback to local:', err);
  }

  const all = getLocal<AdvertisingWallet[]>(STORAGE_KEYS.WALLETS, []);
  return all.find((w) => w.vendorId === vendorId) || null;
}

export async function createAdvertisingWallet(vendorId: string): Promise<AdvertisingWallet> {
  const now = new Date().toISOString();
  const walletId = `adv-wal-${vendorId}-${Date.now().toString(36)}`;
  const wallet: AdvertisingWallet = {
    walletId,
    vendorId,
    availableBalance: 0,
    totalDeposited: 0,
    totalSpent: 0,
    totalRefunded: 0,
    createdAt: now,
    updatedAt: now,
  };

  try {
    if (db) {
      const ref = doc(db, COLLECTIONS.ADVERTISING_WALLETS, walletId);
      await setDoc(ref, wallet);
    }
  } catch (err) {
    console.warn('[AdvertisingService] Firestore create wallet error, saved locally:', err);
  }

  const all = getLocal<AdvertisingWallet[]>(STORAGE_KEYS.WALLETS, []);
  const existingIdx = all.findIndex((w) => w.vendorId === vendorId);
  if (existingIdx >= 0) {
    all[existingIdx] = wallet;
  } else {
    all.push(wallet);
  }
  setLocal(STORAGE_KEYS.WALLETS, all);

  return wallet;
}

// ============================================================================
// 3. advertisingTransactions (IMMUTABLE)
// ============================================================================

export async function getVendorAdvertisingTransactions(vendorId: string): Promise<AdvertisingTransaction[]> {
  try {
    if (db) {
      const q = query(
        collection(db, COLLECTIONS.ADVERTISING_TRANSACTIONS),
        where('vendorId', '==', vendorId),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        return snapshot.docs.map((d) => d.data() as AdvertisingTransaction);
      }
    }
  } catch (err) {
    console.warn('[AdvertisingService] Firestore fetch transactions error, fallback to local:', err);
  }

  const all = getLocal<AdvertisingTransaction[]>(STORAGE_KEYS.TRANSACTIONS, []);
  return all
    .filter((t) => t.vendorId === vendorId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function recordAdvertisingTransaction(
  transactionData: Omit<AdvertisingTransaction, 'createdAt'>
): Promise<AdvertisingTransaction> {
  const transaction: AdvertisingTransaction = {
    ...transactionData,
    createdAt: new Date().toISOString(),
  };

  try {
    if (db) {
      const ref = doc(db, COLLECTIONS.ADVERTISING_TRANSACTIONS, transaction.transactionId);
      await setDoc(ref, transaction);
    }
  } catch (err) {
    console.warn('[AdvertisingService] Firestore record transaction error, saved locally:', err);
  }

  const all = getLocal<AdvertisingTransaction[]>(STORAGE_KEYS.TRANSACTIONS, []);
  all.push(transaction);
  setLocal(STORAGE_KEYS.TRANSACTIONS, all);

  return transaction;
}

// ============================================================================
// 4. advertisingClicks
// ============================================================================

export async function recordAdvertisingClick(
  clickData: Omit<AdvertisingClick, 'createdAt'>
): Promise<AdvertisingClick> {
  const click: AdvertisingClick = {
    ...clickData,
    createdAt: new Date().toISOString(),
  };

  try {
    if (db) {
      const ref = doc(db, COLLECTIONS.ADVERTISING_CLICKS, click.clickId);
      await setDoc(ref, click);
    }
  } catch (err) {
    console.warn('[AdvertisingService] Firestore record click error, saved locally:', err);
  }

  const all = getLocal<AdvertisingClick[]>(STORAGE_KEYS.CLICKS, []);
  all.push(click);
  setLocal(STORAGE_KEYS.CLICKS, all);

  return click;
}

// ============================================================================
// 5. advertisingInvalidClicks
// ============================================================================

export async function recordAdvertisingInvalidClick(
  invalidClickData: Omit<AdvertisingInvalidClick, 'createdAt'>
): Promise<AdvertisingInvalidClick> {
  const invalidClick: AdvertisingInvalidClick = {
    ...invalidClickData,
    createdAt: new Date().toISOString(),
  };

  try {
    if (db) {
      const ref = doc(db, COLLECTIONS.ADVERTISING_INVALID_CLICKS, invalidClick.clickId);
      await setDoc(ref, invalidClick);
    }
  } catch (err) {
    console.warn('[AdvertisingService] Firestore record invalid click error, saved locally:', err);
  }

  const all = getLocal<AdvertisingInvalidClick[]>(STORAGE_KEYS.INVALID_CLICKS, []);
  all.push(invalidClick);
  setLocal(STORAGE_KEYS.INVALID_CLICKS, all);

  return invalidClick;
}

// ============================================================================
// 6. advertisingAuditLogs
// ============================================================================

export async function logAdvertisingAudit(
  auditData: Omit<AdvertisingAuditLog, 'timestamp'>
): Promise<AdvertisingAuditLog> {
  const auditLog: AdvertisingAuditLog = {
    ...auditData,
    timestamp: new Date().toISOString(),
  };

  try {
    if (db) {
      const ref = doc(db, COLLECTIONS.ADVERTISING_AUDIT_LOGS, auditLog.auditId);
      await setDoc(ref, auditLog);
    }
  } catch (err) {
    console.warn('[AdvertisingService] Firestore log audit error, saved locally:', err);
  }

  const all = getLocal<AdvertisingAuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, []);
  all.push(auditLog);
  setLocal(STORAGE_KEYS.AUDIT_LOGS, all);

  return auditLog;
}

// ============================================================================
// 7. Authoritative CPC Billing Click Dispatcher (Phase 4)
// ============================================================================

export interface ClientCpcClickPayload {
  campaignId: string;
  customerId?: string;
  idempotencyKey?: string;
  productId?: string;
}

export async function recordCpcClick(payload: ClientCpcClickPayload): Promise<any> {
  try {
    const res = await fetch('/api/advertising/cpc/click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('application/json')) {
      return { success: false, error: 'CPC endpoint unavailable in static preview' };
    }
    return await res.json();
  } catch (err) {
    console.warn('[AdvertisingService] Failed to record CPC click:', err);
    return { success: false, error: 'Network error recording CPC click' };
  }
}
