/**
 * PURE SUDH - Development Seed Tooling
 * Safe sandbox seeder designed to avoid polluting production environments.
 */

import {
  writeBatch,
  doc,
  collection,
  getDocs,
  getDoc,
} from 'firebase/firestore';
import { db } from './config';
import {
  SEED_CATEGORIES,
  SEED_PRODUCTS,
  SEED_PRODUCT_VARIANTS,
  SEED_INVENTORY,
  SEED_DELIVERY_AREAS,
  SEED_DELIVERY_SLOTS,
  SEED_COUPONS,
  SEED_BANNERS,
  SEED_OFFERS,
  SEED_SITE_SETTINGS,
  SEED_REVIEWS,
  SEED_ORDERS,
  SEED_MARKETPLACE_VENDORS,
} from './seedData';

export interface SeedOptions {
  dryRun?: boolean;
  clearExistingSeedFirst?: boolean;
  bypassSafetyGuard?: boolean;
  safetyConfirmationKey?: string;
  collectionsToSeed?: Array<
    | 'categories'
    | 'products'
    | 'productVariants'
    | 'inventory'
    | 'deliveryAreas'
    | 'deliverySlots'
    | 'coupons'
    | 'banners'
    | 'offers'
    | 'siteSettings'
    | 'reviews'
    | 'orders'
    | 'vendors'
  >;
}

export interface SeedResult {
  success: boolean;
  durationMs: number;
  isDryRun: boolean;
  counts: Record<string, number>;
  totalWrites: number;
  environment: string;
  message: string;
  error?: string;
}

/**
 * Checks if the runtime is classified as production to prevent unintended data pollution.
 */
export function isProductionEnvironment(): boolean {
  try {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      if (
        hostname.includes('puresudh.com') ||
        hostname.includes('prod') ||
        hostname.includes('production')
      ) {
        return true;
      }
    }
  } catch {
    // fallback
  }
  return false;
}

/**
 * Helper to split an array of write tasks into batches of <= 250 (Firestore limit is 500)
 */
async function commitBatchChunks(
  writes: { col: string; docId: string; data: any }[]
): Promise<number> {
  const CHUNK_SIZE = 250;
  let committed = 0;

  for (let i = 0; i < writes.length; i += CHUNK_SIZE) {
    const chunk = writes.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);

    for (const item of chunk) {
      const ref = doc(db, item.col, item.docId);
      batch.set(ref, item.data, { merge: true });
    }

    await batch.commit();
    committed += chunk.length;
  }

  return committed;
}

/**
 * Core Development Seeding Tool
 */
export async function executeDevelopmentSeed(
  options: SeedOptions = {}
): Promise<SeedResult> {
  const startTime = Date.now();
  const isProd = isProductionEnvironment();

  // Safety Gate: Block execution in production unless explicit key provided
  if (isProd && !options.bypassSafetyGuard) {
    if (options.safetyConfirmationKey !== 'CONFIRM_DEV_SEED_PROD_OVERRIDE') {
      return {
        success: false,
        durationMs: Date.now() - startTime,
        isDryRun: !!options.dryRun,
        counts: {},
        totalWrites: 0,
        environment: 'PRODUCTION (BLOCKED)',
        message: 'Safety Guard: Seeding was blocked because the environment is recognized as Production. To execute in a sandbox, verify your environment or supply explicit bypass key.',
        error: 'PRODUCTION_SAFETY_GUARD_ACTIVE',
      };
    }
  }

  const counts: Record<string, number> = {};
  const writes: { col: string; docId: string; data: any }[] = [];

  const cols = options.collectionsToSeed || [
    'categories',
    'products',
    'productVariants',
    'inventory',
    'deliveryAreas',
    'deliverySlots',
    'coupons',
    'banners',
    'offers',
    'siteSettings',
    'reviews',
    'orders',
    'vendors',
  ];

  // 1. Categories
  if (cols.includes('categories')) {
    counts.categories = SEED_CATEGORIES.length;
    for (const cat of SEED_CATEGORIES) {
      writes.push({ col: 'categories', docId: cat.id, data: cat });
    }
  }

  // 2. Products
  if (cols.includes('products')) {
    counts.products = SEED_PRODUCTS.length;
    for (const prod of SEED_PRODUCTS) {
      writes.push({ col: 'products', docId: prod.id, data: prod });
    }
  }

  // 3. Product Variants
  if (cols.includes('productVariants')) {
    counts.productVariants = SEED_PRODUCT_VARIANTS.length;
    for (const variant of SEED_PRODUCT_VARIANTS) {
      writes.push({ col: 'productVariants', docId: variant.id, data: variant });
    }
  }

  // 4. Inventory
  if (cols.includes('inventory')) {
    counts.inventory = SEED_INVENTORY.length;
    for (const inv of SEED_INVENTORY) {
      writes.push({ col: 'inventory', docId: inv.id, data: inv });
    }
  }

  // 5. Delivery Areas
  if (cols.includes('deliveryAreas')) {
    counts.deliveryAreas = SEED_DELIVERY_AREAS.length;
    for (const area of SEED_DELIVERY_AREAS) {
      writes.push({ col: 'deliveryAreas', docId: area.id, data: area });
    }
  }

  // 6. Delivery Slots
  if (cols.includes('deliverySlots')) {
    counts.deliverySlots = SEED_DELIVERY_SLOTS.length;
    for (const slot of SEED_DELIVERY_SLOTS) {
      writes.push({ col: 'deliverySlots', docId: slot.id, data: slot });
    }
  }

  // 7. Coupons
  if (cols.includes('coupons')) {
    counts.coupons = SEED_COUPONS.length;
    for (const coup of SEED_COUPONS) {
      writes.push({ col: 'coupons', docId: coup.id, data: coup });
    }
  }

  // 8. Banners
  if (cols.includes('banners')) {
    counts.banners = SEED_BANNERS.length;
    for (const banner of SEED_BANNERS) {
      writes.push({ col: 'banners', docId: banner.id, data: banner });
    }
  }

  // 9. Offers
  if (cols.includes('offers')) {
    counts.offers = SEED_OFFERS.length;
    for (const offer of SEED_OFFERS) {
      writes.push({ col: 'offers', docId: offer.id, data: offer });
    }
  }

  // 10. Site Settings
  if (cols.includes('siteSettings')) {
    counts.siteSettings = 1;
    writes.push({ col: 'siteSettings', docId: SEED_SITE_SETTINGS.id || 'general', data: SEED_SITE_SETTINGS });
  }

  // 11. Reviews
  if (cols.includes('reviews')) {
    counts.reviews = SEED_REVIEWS.length;
    for (const rev of SEED_REVIEWS) {
      writes.push({ col: 'reviews', docId: rev.id, data: rev });
    }
  }

  // 12. Orders with normalized orderItems, orderStatusHistory, and payments
  if (cols.includes('orders')) {
    counts.orders = SEED_ORDERS.length;
    let orderItemsCount = 0;
    let historyCount = 0;
    let paymentCount = 0;

    for (const seedOrder of SEED_ORDERS) {
      // Order header
      writes.push({ col: 'orders', docId: seedOrder.order.id, data: seedOrder.order });

      // Normalized orderItems
      for (const item of seedOrder.items) {
        writes.push({ col: 'orderItems', docId: item.id || `item-${seedOrder.order.id}-${item.productId}`, data: item });
        orderItemsCount++;
      }

      // Normalized orderStatusHistory
      for (const hist of seedOrder.history) {
        writes.push({ col: 'orderStatusHistory', docId: hist.id, data: hist });
        historyCount++;
      }

      // Normalized payment
      writes.push({ col: 'payments', docId: seedOrder.payment.id, data: seedOrder.payment });
      paymentCount++;
    }

    counts.orderItems = orderItemsCount;
    counts.orderStatusHistory = historyCount;
    counts.payments = paymentCount;
  }

  // 13. Marketplace Vendors & Associated Sub-Collections
  if (cols.includes('vendors')) {
    counts.vendors = SEED_MARKETPLACE_VENDORS.length;
    let vProdCount = 0;
    let vInvCount = 0;
    let vBankCount = 0;

    for (const vData of SEED_MARKETPLACE_VENDORS) {
      writes.push({ col: 'vendors', docId: vData.vendor.id, data: vData.vendor });
      writes.push({ col: 'vendorProfiles', docId: vData.profile.id, data: vData.profile });

      for (const vp of vData.products) {
        writes.push({ col: 'vendorProducts', docId: vp.id, data: vp });
        vProdCount++;
      }
      for (const vi of vData.inventory) {
        writes.push({ col: 'vendorInventory', docId: vi.id, data: vi });
        vInvCount++;
      }
      writes.push({ col: 'vendorBankAccounts', docId: vData.bankAccount.id, data: vData.bankAccount });
      vBankCount++;
    }

    counts.vendorProfiles = SEED_MARKETPLACE_VENDORS.length;
    counts.vendorProducts = vProdCount;
    counts.vendorInventory = vInvCount;
    counts.vendorBankAccounts = vBankCount;
  }

  // If Dry Run: do not execute writes, just return calculation
  if (options.dryRun) {
    return {
      success: true,
      durationMs: Date.now() - startTime,
      isDryRun: true,
      counts,
      totalWrites: writes.length,
      environment: isProd ? 'PRODUCTION (DRY RUN)' : 'DEVELOPMENT (DRY RUN)',
      message: `Dry Run completed successfully. Calculated ${writes.length} document write operations across ${Object.keys(counts).length} collections without altering database.`,
    };
  }

  // Execute chunked batched commits
  try {
    const committed = await commitBatchChunks(writes);
    return {
      success: true,
      durationMs: Date.now() - startTime,
      isDryRun: false,
      counts,
      totalWrites: committed,
      environment: isProd ? 'PRODUCTION (OVERRIDE)' : 'DEVELOPMENT',
      message: `Successfully seeded ${committed} documents across ${Object.keys(counts).length} collections.`,
    };
  } catch (err: any) {
    console.error('Seed execution error:', err);
    return {
      success: false,
      durationMs: Date.now() - startTime,
      isDryRun: false,
      counts,
      totalWrites: 0,
      environment: isProd ? 'PRODUCTION' : 'DEVELOPMENT',
      message: `Firestore seeding failed: ${err.message || 'Unknown error'}`,
      error: err.toString(),
    };
  }
}

/**
 * Diagnostic tool to inspect collection counts
 */
export async function getCollectionDiagnostics(): Promise<Record<string, number>> {
  const collectionNames = [
    'categories',
    'products',
    'productVariants',
    'inventory',
    'orders',
    'orderItems',
    'orderStatusHistory',
    'payments',
    'coupons',
    'reviews',
    'deliveryAreas',
    'deliverySlots',
    'banners',
    'offers',
    'siteSettings',
    'vendors',
  ];

  const results: Record<string, number> = {};

  await Promise.all(
    collectionNames.map(async (name) => {
      try {
        const colRef = collection(db, name);
        const snap = await getDocs(colRef);
        results[name] = snap.size;
      } catch {
        results[name] = -1; // -1 indicates collection doesn't exist or permission denied
      }
    })
  );

  return results;
}
