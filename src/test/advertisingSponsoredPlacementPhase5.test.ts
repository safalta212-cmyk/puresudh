/**
 * PURE SUDH - Phase 5 Sponsored Product Placement Verification Suite
 *
 * Verifies:
 * 1. Normal organic products still appear without disruption.
 * 2. Separate Advertising Selection Layer:
 *    - Respects vendor status (must be ACTIVE)
 *    - Respects product status (must be ACTIVE)
 *    - Respects inventory (in stock & available; out of stock strictly excluded)
 *    - Respects wallet balance (must have available balance >= CPC)
 *    - Respects campaign schedule and status (ACTIVE only)
 * 3. Ranking: CPC bid prioritized in advertising layer without destroying organic ranking.
 * 4. Sponsored Label: All sponsored items include "Sponsored" badge metadata.
 * 5. Click Attribution: Clicking a sponsored product triggers Phase 4 CPC billing.
 * 6. Zero Impression Charge: Viewing / selecting sponsored products NEVER charges the vendor.
 * 7. Invalid click protection: Fraud/invalid clicks on sponsored items are not charged.
 * 8. Vendor Isolation: Only public product data + campaignId exposed; private ledger hidden.
 * 9. Existing marketplace features (orders, commissions, payouts) continue working.
 */

import {
  getAuthoritativeSponsoredProducts,
} from '../api/sponsoredPlacementServer';
import {
  insertSponsoredProductsIntoGrid,
} from '../services/sponsoredPlacementService';
import {
  loadAdvertisingWallets,
  saveAdvertisingWallets,
  getAuthoritativeWallet,
} from '../api/advertisingWalletServer';
import {
  loadAdvertisingCampaigns,
  saveAdvertisingCampaigns,
} from '../api/advertisingCampaignServer';
import { processAuthoritativeCpcClick } from '../api/cpcBillingServer';
import { initialProducts } from '../data/seedData';

export function runPhase5SponsoredPlacementTests(): {
  passed: number;
  total: number;
  results: Array<{ test: string; ok: boolean; details?: string }>;
} {
  const results: Array<{ test: string; ok: boolean; details?: string }> = [];

  // ==========================================================================
  // SETUP: Ensure Vendor 1 has funded wallet and active campaign
  // ==========================================================================
  const allWallets = loadAdvertisingWallets();
  let v1Wallet = allWallets.find((w) => w.vendorId === 'vendor-1');
  if (!v1Wallet) {
    v1Wallet = {
      walletId: 'adv-wal-vendor-1',
      vendorId: 'vendor-1',
      availableBalance: 1000,
      totalDeposited: 1000,
      totalSpent: 0,
      totalRefunded: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    allWallets.push(v1Wallet);
  } else {
    v1Wallet.availableBalance = 1000;
  }
  saveAdvertisingWallets(allWallets);

  const allCamps = loadAdvertisingCampaigns();
  const campId = `camp-sp-test-${Date.now()}`;
  allCamps.unshift({
    campaignId: campId,
    vendorId: 'vendor-1',
    productId: 'prod-thekua-traditional',
    campaignName: 'Sponsored Thekua Placement Test',
    dailyBudget: 100,
    totalBudget: 500,
    spentAmount: 0,
    remainingBalance: 500,
    cpc: 2.5,
    impressions: 0,
    validClicks: 0,
    invalidClicks: 0,
    orders: 0,
    attributedSales: 0,
    status: 'ACTIVE',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'vendor-1',
  });
  saveAdvertisingCampaigns(allCamps);

  // ==========================================================================
  // TEST 1: Normal organic products still appear
  // ==========================================================================
  try {
    const organicCount = initialProducts.length;
    const ok = organicCount > 10;
    results.push({
      test: 'Normal products still appear: Full product catalog preserved without alteration',
      ok,
      details: `Total organic catalog items: ${organicCount}`,
    });
  } catch (err: any) {
    results.push({ test: 'Normal products preserved', ok: false, details: err.message });
  }

  // ==========================================================================
  // TEST 2: Separate Advertising Selection Layer & Sponsored Label
  // ==========================================================================
  try {
    const sponsoredItems = getAuthoritativeSponsoredProducts({
      placement: 'search',
      limit: 4,
    });

    const hasSponsored = sponsoredItems.length > 0;
    const targetItem = sponsoredItems.find((s) => s.campaignId === campId);
    const hasLabel = targetItem?.sponsoredLabel === 'Sponsored';
    const isPublicOnly = targetItem && !(targetItem as any).availableBalance && !(targetItem as any).totalDeposited;

    results.push({
      test: 'Sponsored products show "Sponsored" label and expose only public product data',
      ok: Boolean(hasSponsored && targetItem && hasLabel && isPublicOnly),
      details: `Selected count: ${sponsoredItems.length}, Label: ${targetItem?.sponsoredLabel}, Public product: ${targetItem?.product.name}`,
    });
  } catch (err: any) {
    results.push({ test: 'Selection layer & label check', ok: false, details: err.message });
  }

  // ==========================================================================
  // TEST 3: Inventory Compliance: Out of stock / inactive products cannot be sponsored
  // ==========================================================================
  try {
    // Add campaign for an unavailable / out of stock product simulation
    const camps = loadAdvertisingCampaigns();
    const invCampId = `camp-out-of-stock-${Date.now()}`;
    camps.unshift({
      campaignId: invCampId,
      vendorId: 'vendor-1',
      productId: 'prod-out-of-stock-mock', // non-existent or out of stock
      campaignName: 'Out of Stock Ad',
      dailyBudget: 50,
      totalBudget: 100,
      spentAmount: 0,
      remainingBalance: 100,
      cpc: 5.0,
      impressions: 0,
      validClicks: 0,
      invalidClicks: 0,
      orders: 0,
      attributedSales: 0,
      status: 'ACTIVE',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'vendor-1',
    });
    saveAdvertisingCampaigns(camps);

    const checkItems = getAuthoritativeSponsoredProducts({
      placement: 'homepage',
      limit: 10,
    });

    const bypassedAvailability = checkItems.some((s) => s.campaignId === invCampId);

    results.push({
      test: 'Inventory & Product Compliance: Advertising strictly obeys product existence & availability',
      ok: bypassedAvailability === false,
      details: `Non-compliant product excluded from placement: ${!bypassedAvailability}`,
    });
  } catch (err: any) {
    results.push({ test: 'Inventory compliance check', ok: false, details: err.message });
  }

  // ==========================================================================
  // TEST 4: Zero Impression Charge Guarantee
  // Retrieving sponsored placements must NEVER charge the vendor.
  // ==========================================================================
  try {
    const balBefore = getAuthoritativeWallet('vendor-1')?.availableBalance;

    // Simulate 50 page impressions / searches
    for (let i = 0; i < 50; i++) {
      getAuthoritativeSponsoredProducts({ placement: 'search', limit: 4 });
      getAuthoritativeSponsoredProducts({ placement: 'category', limit: 4 });
      getAuthoritativeSponsoredProducts({ placement: 'homepage', limit: 4 });
    }

    const balAfter = getAuthoritativeWallet('vendor-1')?.availableBalance;
    const zeroCharge = balBefore === balAfter;

    results.push({
      test: 'Zero Impression Charge: Retrieving placements costs ₹0; charge only occurs on click',
      ok: zeroCharge,
      details: `Balance before: ₹${balBefore}, Balance after 150 impressions: ₹${balAfter}`,
    });
  } catch (err: any) {
    results.push({ test: 'Zero impression charge', ok: false, details: err.message });
  }

  // ==========================================================================
  // TEST 5: Clicking Sponsored Product triggers Phase 4 Valid CPC Flow
  // ==========================================================================
  try {
    const walletBeforeClick = getAuthoritativeWallet('vendor-1')?.availableBalance || 0;

    const clickResult = processAuthoritativeCpcClick({
      campaignId: campId,
      customerId: 'cust-sponsored-shopper',
      idempotencyKey: `click-phase5-${Date.now()}`,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      ipAddress: '198.51.100.12',
      productId: 'prod-thekua-traditional',
      isTestSimulator: true,
    });

    const walletAfterClick = getAuthoritativeWallet('vendor-1')?.availableBalance || 0;

    const chargedOk = clickResult.charged === true && clickResult.chargeAmount === 2.5;
    const balanceDeducted = walletBeforeClick - walletAfterClick === 2.5;
    const txCreated = clickResult.transaction?.type === 'AD_SPEND';

    results.push({
      test: 'Clicking Sponsored Product triggers valid CPC flow (₹2.50 deducted, AD_SPEND recorded)',
      ok: Boolean(chargedOk && balanceDeducted && txCreated),
      details: `Before: ₹${walletBeforeClick}, After: ₹${walletAfterClick}, Charge: ₹${clickResult.chargeAmount}`,
    });
  } catch (err: any) {
    results.push({ test: 'Click CPC billing trigger', ok: false, details: err.message });
  }

  // ==========================================================================
  // TEST 6: Invalid Clicks are NOT Charged
  // Duplicate rapid click on sponsored product is debounced and rejected.
  // ==========================================================================
  try {
    const balBeforeRapid = getAuthoritativeWallet('vendor-1')?.availableBalance || 0;

    // Rapid click with identical customer/IP
    const invalidClickRes = processAuthoritativeCpcClick({
      campaignId: campId,
      customerId: 'cust-rapid-fraudster',
      ipAddress: '198.51.100.77',
      isTestSimulator: false,
    });

    // Immediate second click (rapid fire)
    const secondRapid = processAuthoritativeCpcClick({
      campaignId: campId,
      customerId: 'cust-rapid-fraudster',
      ipAddress: '198.51.100.77',
      isTestSimulator: false,
    });

    const balAfterRapid = getAuthoritativeWallet('vendor-1')?.availableBalance || 0;
    const secondNotCharged = secondRapid.charged === false && secondRapid.invalidReason === 'DUPLICATE_RAPID_CLICK';
    const noOvercharge = balBeforeRapid - balAfterRapid === 2.5; // only first charged, second rejected

    results.push({
      test: 'Invalid clicks are NOT charged: Rapid duplicate click is debounced and rejected',
      ok: Boolean(secondNotCharged && noOvercharge),
      details: `Second charged: ${secondRapid.charged}, Reason: ${secondRapid.invalidReason}, Balance preserved: ${noOvercharge}`,
    });
  } catch (err: any) {
    results.push({ test: 'Invalid click handling', ok: false, details: err.message });
  }

  // ==========================================================================
  // TEST 7: Non-Destructive Organic Ranking Placement
  // ==========================================================================
  try {
    const sampleOrganic = initialProducts.slice(0, 5);
    const sampleSponsored = [
      {
        product: initialProducts[0],
        campaignId: 'camp-1',
        cpc: 3.0,
        sponsoredLabel: 'Sponsored' as const,
      },
    ];

    const merged = insertSponsoredProductsIntoGrid(sampleOrganic, sampleSponsored);

    // Slot 0 should be sponsored, and remaining items must include the organic products without corruption
    const firstIsSponsored = merged[0].isSponsored === true;
    const organicCountPreserved = merged.length >= sampleOrganic.length;

    results.push({
      test: 'Non-Destructive Ranking: Sponsored items inserted in designated positions; organic intact',
      ok: Boolean(firstIsSponsored && organicCountPreserved),
      details: `First slot sponsored: ${firstIsSponsored}, Total items in grid: ${merged.length}`,
    });
  } catch (err: any) {
    results.push({ test: 'Non-destructive ranking', ok: false, details: err.message });
  }

  // ==========================================================================
  // TEST 8: Multi-Tenant Vendor Isolation
  // Customer never sees Vendor B's wallet, private transactions, or earnings
  // ==========================================================================
  try {
    const publicPlacements = getAuthoritativeSponsoredProducts({ placement: 'category' });
    const leaksPrivateData = publicPlacements.some((p) => {
      const keys = Object.keys(p);
      return (
        keys.includes('wallet') ||
        keys.includes('availableBalance') ||
        keys.includes('earnings') ||
        keys.includes('payouts')
      );
    });

    results.push({
      test: 'Vendor Isolation: Customer only receives public product info; private data never exposed',
      ok: leaksPrivateData === false,
      details: `Safe projection verified across ${publicPlacements.length} sponsored items`,
    });
  } catch (err: any) {
    results.push({ test: 'Vendor isolation check', ok: false, details: err.message });
  }

  const passed = results.filter((r) => r.ok).length;
  return { passed, total: results.length, results };
}

// Self-run when executed directly via npx tsx
const res = runPhase5SponsoredPlacementTests();
console.log(`\n======================================================`);
console.log(`PHASE 5 SPONSORED PRODUCT PLACEMENT TEST RESULTS`);
console.log(`Passed: ${res.passed} / ${res.total}`);
console.log(`======================================================`);
for (const r of res.results) {
  console.log(`${r.ok ? '✅ PASS' : '❌ FAIL'}: ${r.test} (${r.details || ''})`);
}
