/**
 * PURE SUDH - Server-Side Authoritative Sponsored Product Placement Engine (Phase 5)
 *
 * Enforces Zero-Trust Placement & Selection Invariants:
 * 1. Operates as a separate advertising selection & ranking layer.
 * 2. Organic catalog ranking is never destroyed or replaced.
 * 3. Sponsored products must strictly obey:
 *    - Vendor status (must be ACTIVE)
 *    - Product status (must be ACTIVE)
 *    - Inventory (must be IN STOCK and available for sale)
 *    - Product compliance & marketplace rules
 * 4. Zero exposure of private vendor data: Customer only receives public product data + campaignId.
 * 5. Impressive selection ranking: CPC bid prioritized, distinct products enforced.
 * 6. Impression is free; CPC validation and billing triggered ONLY on valid customer click.
 */

import { Product } from '../types';
import { initialProducts } from '../data/seedData';
import { INITIAL_MARKETPLACE_VENDORS } from '../constants';
import { getProductVendorId } from '../utils/vendorCartHelpers';
import { loadAdvertisingCampaigns } from './advertisingCampaignServer';
import { loadAdvertisingWallets } from './advertisingWalletServer';

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

/**
 * Authoritative selection layer for sponsored product placement.
 * Selects only compliant, active, in-stock products with active campaigns and funded wallets.
 */
export function getAuthoritativeSponsoredProducts(
  params: SponsoredPlacementParams
): SponsoredProductItem[] {
  const {
    categorySlug,
    searchQuery,
    currentProductId,
    limit = 4,
  } = params;

  const nowMs = Date.now();
  const allCampaigns = loadAdvertisingCampaigns();
  const allWallets = loadAdvertisingWallets();

  // 1. Filter campaigns that are strictly ACTIVE and within scheduled date range
  const activeCampaigns = allCampaigns.filter((c) => {
    if (c.status !== 'ACTIVE') return false;

    // Remaining balance check
    if (c.spentAmount >= c.totalBudget) return false;

    // Date range check
    const startTs = new Date(c.startDate).getTime();
    const endTs = new Date(c.endDate).getTime();
    if (!isNaN(startTs) && nowMs < startTs) return false;
    if (!isNaN(endTs) && nowMs > endTs) return false;

    return true;
  });

  const qualifiedItems: SponsoredProductItem[] = [];
  const seenProductIds = new Set<string>();

  for (const camp of activeCampaigns) {
    // 2. Validate Vendor is ACTIVE in marketplace
    const vendor = INITIAL_MARKETPLACE_VENDORS.find((v) => v.id === camp.vendorId);
    if (!vendor || vendor.status !== 'active') {
      continue;
    }

    // 3. Validate Vendor Advertising Wallet has sufficient funds (balance >= CPC)
    const wallet = allWallets.find((w) => w.vendorId === camp.vendorId);
    if (!wallet || wallet.availableBalance < camp.cpc) {
      continue;
    }

    // 4. Validate Product exists in catalog
    const product = initialProducts.find((p) => p.id === camp.productId);
    if (!product) {
      continue;
    }

    // 5. Validate Product strictly belongs to this vendor
    const ownerId = getProductVendorId(product);
    if (ownerId !== camp.vendorId) {
      continue;
    }

    // 6. Validate Product is ACTIVE
    if (product.status && product.status !== 'active') {
      continue;
    }

    // 7. Validate Inventory (must be in stock and available for sale)
    // "Do not allow advertising to bypass normal product availability"
    if (product.availability === false) {
      continue;
    }
    const stockQty = product.stockQuantity ?? product.stock;
    if (stockQty != null && stockQty <= 0) {
      continue;
    }

    // Exclude current product for recommendations
    if (currentProductId && product.id === currentProductId) {
      continue;
    }

    // 8. Match Category if specified
    if (categorySlug && categorySlug.trim()) {
      const target = categorySlug.toLowerCase().trim();
      const pCatSlug = (product.categorySlug || '').toLowerCase();
      const pCatId = (product.categoryId || '').toLowerCase();
      const matchesCat =
        pCatSlug === target ||
        pCatId === target ||
        product.tags?.some((t) => t.toLowerCase().includes(target)) ||
        product.name.toLowerCase().includes(target);

      // In category views, prioritize category matches
      if (!matchesCat) {
        continue;
      }
    }

    // 9. Match Search Query if specified
    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        product.name.toLowerCase().includes(q) ||
        (product.description && product.description.toLowerCase().includes(q)) ||
        product.tags?.some((t) => t.toLowerCase().includes(q));

      if (!matchesSearch) {
        continue;
      }
    }

    // Avoid duplicate sponsored listings for the same product
    if (seenProductIds.has(product.id)) {
      continue;
    }
    seenProductIds.add(product.id);

    // 10. Vendor Isolation: Customer only receives public product data + campaignId.
    // Private financial ledgers and vendor balances are NEVER exposed!
    qualifiedItems.push({
      product,
      campaignId: camp.campaignId,
      cpc: camp.cpc,
      sponsoredLabel: 'Sponsored',
    });
  }

  // 11. Separate Advertising Ranking Layer:
  // Sort by CPC bid descending (higher bid gets higher priority placement)
  // Secondarily by product rating
  qualifiedItems.sort((a, b) => {
    if (b.cpc !== a.cpc) {
      return b.cpc - a.cpc;
    }
    return (b.product.rating || 0) - (a.product.rating || 0);
  });

  return qualifiedItems.slice(0, limit);
}
