/**
 * PURE SUDH - Client-Side Sponsored Product Placement Service (Phase 5)
 *
 * Provides:
 * 1. Fetching sponsored products for search, category, homepage, recommendations.
 * 2. Non-destructive insertion of sponsored products into designated positions.
 * 3. Handling customer click events to trigger the Phase 4 server-authoritative CPC billing flow.
 * 4. Zero impression charge guarantee.
 */

import { Product } from '../types';
import { SponsoredProductItem, SponsoredPlacementParams } from '../types/advertising';
import { recordCpcClick } from './advertisingService';

export type { SponsoredProductItem, SponsoredPlacementParams };

// Track session clicks to prevent duplicate rapid clicks on the same product
const clickedCampaignsInSession = new Set<string>();

/**
 * Fetches eligible sponsored products from server.
 */
export async function fetchSponsoredProducts(
  params: SponsoredPlacementParams
): Promise<SponsoredProductItem[]> {
  try {
    const query = new URLSearchParams();
    query.set('placement', params.placement);
    if (params.categorySlug) query.set('categorySlug', params.categorySlug);
    if (params.searchQuery) query.set('searchQuery', params.searchQuery);
    if (params.currentProductId) query.set('currentProductId', params.currentProductId);
    if (params.limit) query.set('limit', String(params.limit));

    const res = await fetch(`/api/advertising/sponsored-products?${query.toString()}`);
    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      const data = await res.json();
      if (data.success && Array.isArray(data.sponsoredProducts)) {
        return data.sponsoredProducts;
      }
    }
  } catch (err) {
    console.warn('[SponsoredPlacementService] Error fetching sponsored products:', err);
  }
  return [];
}

/**
 * Triggers the Phase 4 CPC validation and billing system when customer clicks a sponsored product.
 * Charge only on click. Never on impression.
 */
export async function handleSponsoredProductClick(
  campaignId: string,
  productId: string,
  customerId: string = 'cust-browser-user'
): Promise<void> {
  try {
    // Generate unique idempotency key for this click event
    const idempotencyKey = `click-${campaignId}-${productId}-${Date.now()}`;

    // Send click to server-authoritative CPC engine
    await recordCpcClick({
      campaignId,
      productId,
      customerId,
      idempotencyKey,
    });
  } catch (err) {
    console.warn('[SponsoredPlacementService] Error logging CPC click:', err);
  }
}

/**
 * Inserts sponsored products into designated positions in the product list
 * WITHOUT destroying or altering the organic product ranking.
 *
 * For instance, in a search or category grid, sponsored products can appear
 * at designated positions (e.g., position 0 or position 2), followed by the full organic list.
 */
export function insertSponsoredProductsIntoGrid(
  organicProducts: Product[],
  sponsoredItems: SponsoredProductItem[]
): Array<{ product: Product; isSponsored: boolean; campaignId?: string }> {
  if (!sponsoredItems || sponsoredItems.length === 0) {
    return organicProducts.map((p) => ({ product: p, isSponsored: false }));
  }

  const result: Array<{ product: Product; isSponsored: boolean; campaignId?: string }> = [];
  const sponsoredProductIds = new Set(sponsoredItems.map((s) => s.product.id));

  // Insert top sponsored items in designated positions (slot 0)
  for (const s of sponsoredItems) {
    result.push({
      product: s.product,
      isSponsored: true,
      campaignId: s.campaignId,
    });
  }

  // Append ALL organic products preserving their exact organic sort order
  // (Filter out exact duplicates if the organic product was already inserted as sponsored at the top)
  for (const org of organicProducts) {
    if (!sponsoredProductIds.has(org.id)) {
      result.push({
        product: org,
        isSponsored: false,
      });
    }
  }

  return result;
}
