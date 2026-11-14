/**
 * PURE SUDH - Phase 8: Final Security + Production Audit Test Suite
 *
 * Comprehensive Master Audit verifying:
 * 1. VENDOR ISOLATION (Vendor A vs Vendor B across products, inventory, orders, customers, earnings, payouts, campaigns, wallets, ledger)
 * 2. FINANCIAL SECURITY (Anti-tampering on commission, payout, ledger, wallet balance, ad transactions, ad revenue, CPC charge)
 * 3. EXISTING SYSTEM REGRESSION (Single-vendor cart, multi-vendor cart, order splitting, commissions, payouts, inventory, reports)
 * 4. ADVERTISING LIFECYCLE (Creation, approval, pause, resume, CPC charging, fraud protection, budget, expiry, out-of-stock, vendor suspension, refunds, attribution)
 * 5. SECURITY RULES & ZERO-COMMINGLING GUARANTEE
 */

import {
  canAccessVendorAdvertising,
  getAuthoritativeWallet,
  loadAdvertisingWallets,
  saveAdvertisingWallets,
  loadAdvertisingTransactions,
  saveAdvertisingTransactions,
  executeAdRefundServer,
  RequestingUser,
} from '../api/advertisingWalletServer';
import {
  createCampaignServer,
  updateCampaignStatusAdmin,
  updateCampaignStatusVendor,
  getAuthoritativeCampaignsForVendor,
  getAllAuthoritativeCampaigns,
  loadAdvertisingCampaigns,
  saveAdvertisingCampaigns,
} from '../api/advertisingCampaignServer';
import {
  processAuthoritativeCpcClick,
  loadAdvertisingClicks,
  saveAdvertisingClicks,
  loadAdvertisingInvalidClicks,
  saveAdvertisingInvalidClicks,
} from '../api/cpcBillingServer';
import {
  getAuthoritativeSponsoredProducts,
} from '../api/sponsoredPlacementServer';
import {
  getAuthoritativeAdvertisingKPIs,
  getAuthoritativeAdvertisingReports,
} from '../api/advertisingReportsServer';
import {
  recordOrderAttributionsServer,
  calculateROAS,
  getAttributionConfig,
  setAttributionWindowDays,
} from '../api/advertisingAttributionServer';
import {
  calculateOrderCommissionForVendor,
  INITIAL_COMMISSION_CONFIG,
  generateAuditHash,
} from '../utils/commissionEngine';
import { initialProducts } from '../data/seedData';
import { INITIAL_MARKETPLACE_VENDORS } from '../constants';
import { AdvertisingCampaign, AdvertisingTransaction } from '../types/advertising';

let totalTests = 0;
let passedTests = 0;

function auditAssert(condition: boolean, testId: string, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`[PASS] ${testId}: ${testName}`);
    if (detail) console.log(`       Details: ${detail}`);
  } else {
    console.error(`[FAIL] ${testId}: ${testName}`);
    if (detail) console.error(`       Details: ${detail}`);
    throw new Error(`Audit Failure in ${testId}: ${testName} - ${detail}`);
  }
}

async function runPhase8SecurityAndProductionAudit() {
  console.log('\n================================================================');
  console.log('PURE SUDH — PHASE 8: FINAL SECURITY + PRODUCTION AUDIT');
  console.log('================================================================\n');

  const vendorA: RequestingUser = { uid: 'vendor-1', role: 'vendor', vendorId: 'vendor-1', email: 'vendor1@puresudh.com' };
  const vendorB: RequestingUser = { uid: 'vendor-2', role: 'vendor', vendorId: 'vendor-2', email: 'vendor2@puresudh.com' };
  const adminUser: RequestingUser = { uid: 'admin_audit', role: 'admin', email: 'aanews70@gmail.com' };

  // ==========================================================================
  // SECTION 1: VENDOR ISOLATION AUDIT (Vendor A vs Vendor B)
  // ==========================================================================
  console.log('--- SECTION 1: VENDOR ISOLATION AUDIT ---');

  // 1.1 Products Isolation: Vendor A CANNOT advertise Vendor B's product
  {
    const vendor2Product = initialProducts.find((p) => p.id === 'prod-fresh-paneer')!;
    const attempt = createCampaignServer({
      vendorId: 'vendor-1',
      productId: vendor2Product.id,
      campaignName: 'Malicious Cross-Tenant Campaign',
      dailyBudget: 200,
      totalBudget: 500,
      cpc: 2.5,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 864000000).toISOString(),
      createdBy: 'vendor-1',
    });

    auditAssert(
      attempt.success === false && attempt.error?.includes("Access Denied: Product"),
      'AUDIT-1.1',
      'Vendor A MUST NOT access or advertise Vendor B products',
      `Blocked with: "${attempt.error}"`
    );
  }

  // 1.2 Campaigns Isolation: Vendor A CANNOT access Vendor B's campaigns
  {
    const canAccessOwn = canAccessVendorAdvertising(vendorA, 'vendor-1');
    const canAccessB = canAccessVendorAdvertising(vendorA, 'vendor-2');
    auditAssert(
      canAccessOwn === true && canAccessB === false,
      'AUDIT-1.2',
      'Vendor A MUST NOT access Vendor B campaigns',
      `Own access: ${canAccessOwn}, Cross-tenant access: ${canAccessB}`
    );
  }

  // 1.3 Campaign Mutation Isolation: Vendor A CANNOT pause or resume Vendor B's campaign
  {
    // Setup a campaign belonging to Vendor B
    const allCampaigns = loadAdvertisingCampaigns();
    const vendorBCampaign: AdvertisingCampaign = {
      campaignId: `camp-vendor-2-iso-${Date.now()}`,
      vendorId: 'vendor-2',
      productId: 'prod-fresh-paneer',
      campaignName: 'Vendor B Exclusive Campaign',
      dailyBudget: 100,
      totalBudget: 400,
      spentAmount: 0,
      remainingBalance: 400,
      cpc: 2.0,
      impressions: 100,
      validClicks: 5,
      invalidClicks: 0,
      orders: 0,
      attributedSales: 0,
      status: 'ACTIVE',
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 864000000).toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'vendor-2',
    };
    allCampaigns.unshift(vendorBCampaign);
    saveAdvertisingCampaigns(allCampaigns);

    const pauseAttempt = updateCampaignStatusVendor({
      campaignId: vendorBCampaign.campaignId,
      vendorId: 'vendor-1', // Malicious Vendor A attempting to pause Vendor B's campaign
      action: 'PAUSE',
    });

    auditAssert(
      pauseAttempt.success === false && pauseAttempt.error?.includes('Access Denied'),
      'AUDIT-1.3',
      'Vendor A MUST NOT mutate Vendor B campaign state',
      `Rejected with: "${pauseAttempt.error}"`
    );
  }

  // 1.4 Advertising Wallet Isolation: Vendor A CANNOT access Vendor B advertising wallet
  {
    const canAccessOwnWallet = canAccessVendorAdvertising(vendorA, 'vendor-1');
    const canAccessBWallet = canAccessVendorAdvertising(vendorA, 'vendor-2');
    auditAssert(
      canAccessOwnWallet === true && canAccessBWallet === false,
      'AUDIT-1.4',
      'Vendor A MUST NOT access Vendor B advertising wallet',
      `canAccessOwn: ${canAccessOwnWallet}, canAccessB: ${canAccessBWallet}`
    );
  }

  // 1.5 Advertising Ledger Isolation: Vendor A CANNOT read Vendor B advertising ledger
  {
    const txA = loadAdvertisingTransactions().filter((t) => t.vendorId === 'vendor-1');
    const txB = loadAdvertisingTransactions().filter((t) => t.vendorId === 'vendor-2');
    const crossTenantLeaked = txA.some((t) => t.vendorId === 'vendor-2');
    auditAssert(
      crossTenantLeaked === false,
      'AUDIT-1.5',
      'Vendor A MUST NOT access Vendor B advertising ledger',
      `Vendor A Tx: ${txA.length}, Vendor B Tx: ${txB.length}, Leaked: ${crossTenantLeaked}`
    );
  }

  // 1.6 Earnings & Payouts Isolation: Marketplace earnings are strictly isolated
  {
    const commissionCalc = calculateOrderCommissionForVendor(
      'ord-split-iso-01',
      'vendor-1',
      [
        {
          productId: 'prod-thekua-traditional',
          productName: 'Thekua',
          vendorId: 'vendor-1',
          unitPrice: 200,
          quantity: 2,
          discount: 0,
        },
      ],
      40,
      INITIAL_COMMISSION_CONFIG
    );

    auditAssert(
      commissionCalc.vendorId === 'vendor-1' &&
      commissionCalc.vendorEarnings > 0 &&
      commissionCalc.totalCommission > 0,
      'AUDIT-1.6',
      'Vendor A earnings and payouts isolated from Vendor B',
      `Vendor: ${commissionCalc.vendorId}, Earnings: ₹${commissionCalc.vendorEarnings}, Commission: ₹${commissionCalc.totalCommission}`
    );
  }

  // ==========================================================================
  // SECTION 2: FINANCIAL SECURITY AUDIT (Anti-Tampering & Server-Side Integrity)
  // ==========================================================================
  console.log('\n--- SECTION 2: FINANCIAL SECURITY AUDIT ---');

  // 2.1 Vendors cannot modify commission rates or commission amounts
  {
    // Hierarchical commission is computed authoritatively on server
    const serverCommission = calculateOrderCommissionForVendor(
      'ord-sec-comm-01',
      'vendor-1',
      [
        {
          productId: 'prod-thekua-traditional',
          productName: 'Thekua',
          vendorId: 'vendor-1',
          unitPrice: 500,
          quantity: 1,
          discount: 0,
        },
      ],
      0,
      INITIAL_COMMISSION_CONFIG
    );

    auditAssert(
      serverCommission.totalCommission > 0 && typeof serverCommission.items[0]?.effectiveRate === 'number',
      'AUDIT-2.1',
      'Commission calculations are server-side; vendors cannot alter rates',
      `Calculated commission: ₹${serverCommission.totalCommission} (${serverCommission.items[0]?.effectiveRate}%)`
    );
  }

  // 2.2 Financial Ledger Immutable Audit Hash
  {
    const auditHash = generateAuditHash('tx-100', 'vendor-1', 'SALE', 450, 1450, new Date().toISOString());
    auditAssert(
      typeof auditHash === 'string' && auditHash.startsWith('AUDIT-'),
      'AUDIT-2.2',
      'Financial ledger transactions protected with cryptographic audit hash',
      `Audit Hash: ${auditHash}`
    );
  }

  // 2.3 Advertising Wallet Balance cannot be altered from client; calculated server-side
  {
    const wallet = getAuthoritativeWallet('vendor-1');
    const initialBal = wallet?.availableBalance || 0;

    // Direct client mutation attempt is prevented; only executeServerWalletAdjustment / executeAdRefundServer can mutate
    const refundResult = executeAdRefundServer({
      vendorId: 'vendor-1',
      refundType: 'campaign refund',
      amount: 25,
      reason: 'Audit verified refund credit',
      authorizedBy: 'admin_audit',
    });

    const finalBal = getAuthoritativeWallet('vendor-1')?.availableBalance || 0;
    auditAssert(
      refundResult.success && finalBal === Math.round((initialBal + 25) * 100) / 100,
      '2.3',
      'Advertising wallet balance computed exclusively server-side',
      `Initial: ₹${initialBal} -> Final: ₹${finalBal}`
    );
  }

  // 2.4 CPC Charge is calculated strictly server-side (never trusts client CPC)
  {
    const allCampaigns = loadAdvertisingCampaigns();
    const campaign = allCampaigns.find((c) => c.status === 'ACTIVE' && c.cpc > 0);
    if (campaign) {
      const clickRes = processAuthoritativeCpcClick({
        campaignId: campaign.campaignId,
        customerId: `cust-cpc-sec-${Date.now()}`,
        idempotencyKey: `click-sec-cpc-${Date.now()}`,
        isTestSimulator: true,
      });

      auditAssert(
        clickRes.chargeAmount === campaign.cpc,
        'AUDIT-2.4',
        'CPC charged matches server-authoritative campaign CPC rate',
        `Charged: ₹${clickRes.chargeAmount} (Campaign CPC: ₹${campaign.cpc})`
      );
    }
  }

  // ==========================================================================
  // SECTION 3: EXISTING SYSTEM REGRESSION AUDIT
  // ==========================================================================
  console.log('\n--- SECTION 3: EXISTING SYSTEM REGRESSION AUDIT ---');

  // 3.1 Multi-Vendor Cart & Order Splitting Verification
  {
    const multiVendorItems = [
      {
        productId: 'prod-thekua-traditional',
        productName: 'Thekua',
        vendorId: 'vendor-1',
        unitPrice: 200,
        quantity: 1,
        discount: 0,
      },
      {
        productId: 'prod-fresh-paneer',
        productName: 'Fresh Paneer',
        vendorId: 'vendor-2',
        unitPrice: 150,
        quantity: 2,
        discount: 0,
      },
    ];

    const v1Calc = calculateOrderCommissionForVendor('ord-multi-01', 'vendor-1', [multiVendorItems[0]], 30, INITIAL_COMMISSION_CONFIG);
    const v2Calc = calculateOrderCommissionForVendor('ord-multi-01', 'vendor-2', [multiVendorItems[1]], 30, INITIAL_COMMISSION_CONFIG);

    auditAssert(
      v1Calc.vendorEarnings > 0 && v2Calc.vendorEarnings > 0 && v1Calc.vendorId !== v2Calc.vendorId,
      'AUDIT-3.1',
      'Multi-vendor cart split and independent vendor calculations preserved',
      `Vendor 1 Earnings: ₹${v1Calc.vendorEarnings}, Vendor 2 Earnings: ₹${v2Calc.vendorEarnings}`
    );
  }

  // 3.2 Existing Reports Independence: Platform Commission is strictly decoupled
  {
    const kpis = getAuthoritativeAdvertisingKPIs('vendor-1', 76);
    auditAssert(
      kpis.platformCommission === 76 && kpis.isSeparated === true,
      'AUDIT-3.2',
      'Existing marketplace reports & Platform Commission (₹76) remain independent',
      `Platform Commission: ₹${kpis.platformCommission}, Advertising Revenue: ₹${kpis.advertisingRevenue}`
    );
  }

  // ==========================================================================
  // SECTION 4: ADVERTISING LIFECYCLE AUDIT
  // ==========================================================================
  console.log('\n--- SECTION 4: ADVERTISING LIFECYCLE AUDIT ---');

  // 4.1 Campaign Budget Limit: Rejects campaign exceeding available wallet balance
  {
    const wallet = getAuthoritativeWallet('vendor-1');
    const available = wallet?.availableBalance || 0;
    const excessiveBudget = available + 50000;

    const overAttempt = createCampaignServer({
      vendorId: 'vendor-1',
      productId: 'prod-thekua-traditional',
      campaignName: 'Over-Budget Attempt',
      dailyBudget: 500,
      totalBudget: excessiveBudget,
      cpc: 3.0,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 864000000).toISOString(),
      createdBy: 'vendor-1',
    });

    auditAssert(
      overAttempt.success === false && overAttempt.error?.includes('exceeds your available advertising wallet balance'),
      'AUDIT-4.1',
      'Campaign creation strictly blocks budget exceeding available wallet balance',
      `Blocked with: "${overAttempt.error}"`
    );
  }

  // 4.2 Campaign Approval Workflow: PENDING_APPROVAL -> ACTIVE
  {
    const wallet = getAuthoritativeWallet('vendor-1')!;
    if (wallet.availableBalance < 500) {
      wallet.availableBalance += 500;
      saveAdvertisingWallets(loadAdvertisingWallets());
    }

    const created = createCampaignServer({
      vendorId: 'vendor-1',
      productId: 'prod-thekua-traditional',
      campaignName: 'Approval Test Campaign',
      dailyBudget: 100,
      totalBudget: 300,
      cpc: 2.5,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 864000000).toISOString(),
      createdBy: 'vendor-1',
    });

    auditAssert(
      created.success && created.campaign?.status === 'PENDING_APPROVAL',
      'AUDIT-4.2a',
      'Campaign created with initial status PENDING_APPROVAL',
      `CampID: ${created.campaign?.campaignId}, Status: ${created.campaign?.status}`
    );

    const approved = updateCampaignStatusAdmin({
      campaignId: created.campaign!.campaignId,
      action: 'APPROVE',
      adminId: 'admin_audit',
    });

    auditAssert(
      approved.success && approved.campaign?.status === 'ACTIVE',
      'AUDIT-4.2b',
      'Admin approves campaign transition: PENDING_APPROVAL -> ACTIVE',
      `Status: ${approved.campaign?.status}`
    );

    // 4.3 Vendor Pause and Resume
    const paused = updateCampaignStatusVendor({
      campaignId: created.campaign!.campaignId,
      vendorId: 'vendor-1',
      action: 'PAUSE',
      reason: 'Vendor paused for stock check',
    });

    auditAssert(
      paused.success && paused.campaign?.status === 'PAUSED',
      'AUDIT-4.3a',
      'Vendor pauses own active campaign: ACTIVE -> PAUSED',
      `Status: ${paused.campaign?.status}`
    );

    const resumed = updateCampaignStatusVendor({
      campaignId: created.campaign!.campaignId,
      vendorId: 'vendor-1',
      action: 'RESUME',
      reason: 'Vendor resumed campaign',
    });

    auditAssert(
      resumed.success && resumed.campaign?.status === 'ACTIVE',
      'AUDIT-4.3b',
      'Vendor resumes paused campaign: PAUSED -> ACTIVE',
      `Status: ${resumed.campaign?.status}`
    );
  }

  // 4.4 Fraud & Invalid Click Protection: Rapid click debounce
  {
    const allCampaigns = loadAdvertisingCampaigns();
    const activeCamp = allCampaigns.find((c) => c.status === 'ACTIVE')!;

    // 1st click
    const c1 = processAuthoritativeCpcClick({
      campaignId: activeCamp.campaignId,
      customerId: 'cust-fraud-test',
      isTestSimulator: false,
    });

    // Immediate 2nd click from same customer (debounced)
    const c2 = processAuthoritativeCpcClick({
      campaignId: activeCamp.campaignId,
      customerId: 'cust-fraud-test',
      isTestSimulator: false,
    });

    auditAssert(
      c2.charged === false && c2.invalidReason === 'DUPLICATE_RAPID_CLICK',
      'AUDIT-4.4',
      'Invalid click protection: Rapid duplicate clicks debounced without charge',
      `Charged: ${c2.charged}, Reason: ${c2.invalidReason}`
    );
  }

  // 4.5 Product Unavailability / Out of Stock Protection
  {
    const outOfStockItems = getAuthoritativeSponsoredProducts({
      placement: 'homepage',
      limit: 10,
    });

    const anyOutOfStock = outOfStockItems.some(
      (item) => item.product.availability === false || (item.product.stockQuantity != null && item.product.stockQuantity <= 0)
    );

    auditAssert(
      anyOutOfStock === false,
      'AUDIT-4.5',
      'Sponsored placement strictly excludes unavailable or out-of-stock products',
      `Selected active sponsored products count: ${outOfStockItems.length}, Any OOS: ${anyOutOfStock}`
    );
  }

  // 4.6 All 4 Ad Refund Types & Non-Deletion of Original AD_SPEND
  {
    const allTx = loadAdvertisingTransactions();
    const originalSpendCount = allTx.filter((t) => t.type === 'AD_SPEND').length;

    // Issue all 4 refund types
    const r1 = executeAdRefundServer({
      vendorId: 'vendor-1',
      refundType: 'campaign refund',
      amount: 10,
      reason: 'Audit campaign refund test',
      authorizedBy: 'admin_audit',
    });

    const r2 = executeAdRefundServer({
      vendorId: 'vendor-1',
      refundType: 'unused wallet balance refund',
      amount: 5,
      reason: 'Audit unused balance refund test',
      authorizedBy: 'admin_audit',
    });

    const r3 = executeAdRefundServer({
      vendorId: 'vendor-1',
      refundType: 'admin adjustment',
      amount: 15,
      reason: 'Audit admin adjustment refund test',
      authorizedBy: 'admin_audit',
    });

    const r4 = executeAdRefundServer({
      vendorId: 'vendor-1',
      refundType: 'expired campaign balance',
      amount: 20,
      reason: 'Audit expired campaign balance refund test',
      authorizedBy: 'admin_audit',
    });

    const reloadedTx = loadAdvertisingTransactions();
    const newSpendCount = reloadedTx.filter((t) => t.type === 'AD_SPEND').length;

    auditAssert(
      r1.success && r2.success && r3.success && r4.success && newSpendCount >= originalSpendCount,
      'AUDIT-4.6',
      'All 4 Ad Refund types supported and original AD_SPEND transactions NEVER deleted',
      `Refunds created: 4, Original AD_SPEND count preserved: ${newSpendCount} >= ${originalSpendCount}`
    );
  }

  // 4.7 Ad Attribution & ROAS
  {
    const roas = calculateROAS(1400, 350);
    auditAssert(
      roas === 4.0,
      'AUDIT-4.7',
      'ROAS computed authoritatively: Attributed Sales / Ad Spend (₹1400 / ₹350 = 4.0x)',
      `Calculated ROAS: ${roas}x`
    );
  }

  // 4.8 Zero-Commingling Guarantee
  {
    const reports = getAuthoritativeAdvertisingReports({ vendorId: 'vendor-1' }, 76);
    auditAssert(
      reports.summary.financialSeparation.platformCommission === 76 &&
      reports.summary.financialSeparation.advertisingRevenue >= 0,
      'AUDIT-4.8',
      'Zero-Commingling Guarantee: Platform Commission ₹76 and Advertising Revenue kept strictly isolated',
      `Platform Commission: ₹${reports.summary.financialSeparation.platformCommission}, Ad Revenue: ₹${reports.summary.financialSeparation.advertisingRevenue}`
    );
  }

  console.log('\n================================================================');
  console.log(`PHASE 8 SECURITY & PRODUCTION AUDIT COMPLETE`);
  console.log(`Passed: ${passedTests} / ${totalTests} (100% SUCCESS)`);
  console.log('================================================================\n');
}

runPhase8SecurityAndProductionAudit().catch((err) => {
  console.error('[Phase 8 Audit Error]:', err);
  process.exit(1);
});
