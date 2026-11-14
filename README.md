# 🥛 PURE SUDH (शुद्ध स्वाद, आपके घर तक)
> **Pure Food • Pure Quality • Pure Trust**  
> Complete Multi-Vendor Hyperlocal Fresh Food, Traditional Sweets & Pure Dairy E-Commerce Platform with an Autonomous Server-Authoritative Vendor Advertising Suite.

---

## 📑 Table of Contents
1. [Executive Summary & Vision](#-executive-summary--vision)
2. [Core System Architecture](#-core-system-architecture)
3. [User Roles & Permissions (RBAC)](#-user-roles--permissions-rbac)
4. [Customer Marketplace Journey](#-customer-marketplace-journey)
5. [Vendor Portal & Management](#-vendor-portal--management)
6. [Super Admin Control Center](#-super-admin-control-center)
7. [Staff & Delivery Operations](#-staff--delivery-operations)
8. [Multi-Vendor Cart Split & Order Fulfillment Engine](#-multi-vendor-cart-split--order-fulfillment-engine)
9. [Authoritative Financial Engine & Cryptographic Ledger](#-authoritative-financial-engine--cryptographic-ledger)
10. [Autonomous Vendor Advertising Suite (Phases 1–8)](#-autonomous-vendor-advertising-suite-phases-18)
11. [Complete Database Schema (Firestore Collections)](#-complete-database-schema-firestore-collections)
12. [Security Architecture & Firestore Rules](#-security-architecture--firestore-rules)
13. [Complete Server REST API Reference](#-complete-server-rest-api-reference)
14. [Technology Stack & Directory Structure](#-technology-stack--directory-structure)
15. [Getting Started & Installation](#-getting-started--installation)
16. [Automated Test Suites (71/71 Tests Verified)](#-automated-test-suites-7171-tests-verified)
17. [Production Deployment & Environment Rules](#-production-deployment--environment-rules)

---

## 🌿 Executive Summary & Vision

**PURE SUDH** is designed to solve trust, purity, and freshness challenges in the Indian fresh dairy and authentic festive sweets market. The platform brings regional dairy farmers, local sweet artisans (*halwais*), and snack producers onto a unified digital marketplace while preserving strict quality assurance and authentic local sourcing.

### Core Business Pillars
- **100% Purity Guarantee**: Rigorous vendor onboarding, quality testing, and transparency.
- **Hyperlocal Same-Day & Scheduled Delivery**: Pincode-based delivery radius, daily milk subscriptions, and morning/evening delivery slots.
- **Fair Marketplace Economics**: Transparent commission tiers, instant ledger updates, and automated payout tracking.
- **Decoupled Vendor Growth**: An independent, pay-as-you-go **Vendor Advertising Suite** where sellers promote their products via Cost-Per-Click (CPC) ads without commingling ad spend with their store payouts.

---

## 🏗️ Core System Architecture

```text
                               +----------------------------------+
                               |     PURE SUDH Web Application    |
                               |  (React 19 + Tailwind + Vite)    |
                               +-----------------+----------------+
                                                 |
                   +-----------------------------+-----------------------------+
                   |                                                           |
+------------------v-------------------+                   +-------------------v------------------+
|      Client-Side Services & UI       |                   |      Express Backend API Server      |
|  - Auth Context & RBAC Guards        |                   |  - /api/verify-checkout-cart         |
|  - Multi-Vendor Cart & Checkout      |                   |  - /api/create-order-authoritative   |
|  - Customer Order Tracking           |                   |  - /api/verify-payment-signature     |
|  - Vendor Management Tabs            |                   |  - /api/advertising/* (Wallets,      |
|  - Admin Control Panels              |                   |    Campaigns, CPC, Attribution)      |
+------------------+-------------------+                   +-------------------+------------------+
                   |                                                           |
                   +-----------------------------+-----------------------------+
                                                 |
                               +-----------------v----------------+
                               |   Firebase Firestore & Auth      |
                               |  - Real-time Collections         |
                               |  - Enterprise Security Rules     |
                               |  - Cryptographic Audit Hashes    |
                               +----------------------------------+
```

---

## 👥 User Roles & Permissions (RBAC)

The system implements strict Role-Based Access Control verified both in Firestore Security Rules and Express server middleware:

| Role | Access Scope | Key Capabilities |
| :--- | :--- | :--- |
| **Customer** | Storefront & Account | Browse products, check pincodes, add to cart, split orders, pay online/COD, cancel orders within grace period, track live orders, leave reviews. |
| **Vendor** | Vendor Dashboard | Manage product catalog & inventory, accept/dispatch orders, view sales ledger & earnings, request payouts, run Advertising Suite campaigns. |
| **Staff / Rider** | Staff Portal | View assigned delivery runs, update order delivery statuses (`DISPATCHED`, `OUT_FOR_DELIVERY`, `DELIVERED`), verify OTPs. |
| **Super Admin** | Admin Dashboard | Full marketplace governance: approve vendors, moderate products, configure commissions, manage delivery zones, monitor ad fraud, trigger ad refunds, audit ledgers. |

---

## 🛒 Customer Marketplace Journey

1. **Discovery & Location Verification**:
   - Geolocation & pincode serviceability check.
   - Categorized browsing: *Fresh Farm Milk, A2 Desi Cow Ghee, Pure Paneer, Chhena Mithai, Traditional Thekua, Roasted Namkeen, Festival Hampers*.
   - Organic vs. **Sponsored Product Placements** clearly badged for consumer transparency.
2. **Dynamic Multi-Vendor Cart**:
   - Automatic vendor grouping inside the cart.
   - Real-time stock reservation and freshness batch validation.
   - Pincode-specific delivery fee calculation per vendor.
   - Promotional coupon code validation.
3. **Checkout & Payment Security**:
   - Server-side pre-order verification (`/api/verify-checkout-cart`) preventing client price manipulation.
   - Integrated Razorpay / UPI / Cash on Delivery (COD) simulation with HMAC signature verification and idempotency keys.
4. **Order Tracking & Post-Purchase**:
   - Multi-step timeline: `Order Placed` ➔ `Confirmed` ➔ `Prepared` ➔ `Out for Delivery` ➔ `Delivered`.
   - Self-service cancellation within 15 minutes before preparation starts.
   - Verified buyer product reviews and star ratings.

---

## 🏪 Vendor Portal & Management

Vendors access a dedicated dashboard with full tenant isolation:

- **Store Performance Overview**: Gross sales, net payouts, pending orders, and top-selling SKUs.
- **Product Catalog Management**: Add products with high-resolution imagery, shelf-life indicators, storage instructions, unit pricing (per liter, per 250g, per kg), and stock thresholds.
- **Fulfillment Pipeline**: Transition orders from `PENDING` to `ACCEPTED`, `PACKED`, and `HANDED_TO_DELIVERY`.
- **Financial Ledger & Commissions**: Real-time visibility into every order's commission deduction, gross earnings, net earnings, and payout status.
- **Advertising Suite**: Launch CPC ad campaigns using isolated prepaid ad credit.

---

## 🛡️ Super Admin Control Center

Comprehensive administrative panels accessible strictly to authorized administrators (`admin@puresudh.com`, `aanews70@gmail.com`):

- **Vendor Onboarding & KYC**: Review vendor applications, food safety licenses (FSSAI), bank details, and commission rates.
- **Commission Rule Engine**: Set global default commission (e.g. 10%), category overrides (e.g. 8% for Dairy, 15% for Sweets), or vendor-specific negotiated rates.
- **Marketplace Orders Supervision**: Monitor all customer transactions across all vendors with live override capabilities.
- **Delivery Zone Logistics**: Define operational pincodes, delivery charge rules, free delivery minimums, and timeslot capacities.
- **Advertising Operations**: Approve/reject vendor ad campaigns, top up vendor ad wallets, issue ad refunds, and inspect bot/invalid click reports.

---

## 🚚 Staff & Delivery Operations

- **Order Dispatch Board**: Filter orders scheduled for immediate morning or evening delivery slots.
- **Delivery Status Updates**: Mark orders as `OUT_FOR_DELIVERY` and complete deliveries with customer confirmation.
- **Route Consolidation**: Group orders by locality/pincode to minimize transit time for perishable milk and sweets.

---

## 📦 Multi-Vendor Cart Split & Order Fulfillment Engine

When a customer orders items belonging to multiple independent vendors:

```text
Customer Cart: [Vendor A: Milk (₹70), Vendor B: Paneer (₹150), Vendor B: Ghee (₹600)]
                                      |
                     [Master Order Created: ORD-10928 (₹820)]
                                      |
                 +--------------------+--------------------+
                 |                                         |
     [Sub-Order 1: ORD-10928-V1]               [Sub-Order 2: ORD-10928-V2]
     Vendor: Vendor A                          Vendor: Vendor B
     Items: Milk (₹70)                         Items: Paneer (₹150), Ghee (₹600)
     Vendor Earnings: ₹63                      Vendor Earnings: ₹675
     Commission (10%): ₹7                      Commission (10%): ₹75
```

- Each vendor receives their own independent sub-order.
- Fulfillment, packaging, and dispatch happen independently.
- If one vendor runs out of stock, only their sub-order is refunded or adjusted without impacting the remaining order.

---

## 💰 Authoritative Financial Engine & Cryptographic Ledger

Financial security is enforced strictly on the server:

1. **Zero Client Trust**: All commission, tax, discount, and payout calculations are performed server-side.
2. **Immutable Financial Ledger**:
   - Every financial event generates an append-only record in `/financialLedger`.
   - Update and delete operations are strictly denied at the database rule level.
3. **Tamper-Evident Cryptographic Hash**:
   - Each transaction includes an audit hash (e.g. `AUDIT-75B4F49E-9F33`) derived from the transaction ID, vendor ID, gross amount, commission, and timestamp.
4. **Independent Payout Settlements**:
   - Vendor payouts can be processed without altering the historical transaction ledger.

---

## 📢 Autonomous Vendor Advertising Suite (Phases 1–8)

The Advertising Suite enables vendors to promote their products while ensuring **Zero-Commingling** with marketplace funds:

### Phase 1: Planning & Data Architecture
- Dedicated models for Wallets, Campaigns, Clicks, Invalid Clicks, Attributions, and Audit Logs.

### Phase 2: Prepaid Advertising Wallets
- Separate ad wallet per vendor (`availableBalance`, `totalDeposited`, `totalSpent`, `totalRefunded`).
- Strict overdraft prevention: Campaigns cannot be launched unless wallet balance covers the budget.
- Admin credit additions require a mandatory audit reason.

### Phase 3: Campaign Lifecycle & Scoping
- **Scoped Products**: Vendors can only create campaigns for their own verified, active products.
- **Lifecycle Flow**: `DRAFT` ➔ `PENDING_APPROVAL` (Admin review) ➔ `ACTIVE` ➔ `PAUSED` ➔ `COMPLETED` / `REJECTED`.
- Vendors can pause and resume their active campaigns at any time.

### Phase 4: Server-Authoritative CPC Billing & Fraud Protection
- **CPC Deductions**: Balance is deducted only on genuine clicks; impressions cost ₹0.
- **Idempotency Protection**: Duplicate submissions with the same click key are rejected.
- **Rapid Click Debouncing**: Fast consecutive clicks are tagged `DUPLICATE_RAPID_CLICK` with zero vendor charge.
- **Bot Detection**: Automated crawler user-agents (`bot`, `crawl`, `spider`) are filtered and logged.
- **Auto-Pause on Exhaustion**: If a campaign spends its budget or the vendor wallet reaches ₹0, the campaign transitions to `PAUSED` automatically.

### Phase 5: Sponsored Placements & Non-Destructive Ranking
- **Placement Locations**: Homepage Highlights, Search Results, Category Grids, Product Detail Recommendations.
- **Integrity**: Organic products remain intact; sponsored items are inserted into designated high-visibility slots.
- **Product Compliance**: Out-of-stock or unlisted products are strictly excluded from ad rotation.

### Phase 6: Advertising Dashboard & Reports
- **10 Authoritative KPIs**: Ad Revenue, Active Campaigns, Total Ad Spend, Total Balance, Impressions, Clicks, Invalid Clicks, Conversions, Overall CTR, Average ROAS.
- **13-Column Campaign Table**: Real-time stats with inline pause/resume controls.
- **10-Column Ad Ledger**: Complete audit trail with Debit, Credit, and Running Balance.
- **Zero-Commingling Guarantee**: Platform Commission (e.g. ₹76) and Advertising Revenue (e.g. ₹350) are calculated independently and never mixed.

### Phase 7: Ad Attribution & Ad Refunds
- **7-Day Attribution Window**: Links ad clicks to subsequent completed orders for the advertised product.
- **Authoritative ROAS**: Calculated as $\text{Attributed Sales} / \text{Ad Spend}$.
- **Attribution Invariant**: Attribution is reporting metadata; it **never** changes the order total or vendor marketplace payout.
- **4 Ad Refund Flows Supported**:
  1. *Campaign Refund*: Unspent budget from cancelled campaigns returned to wallet.
  2. *Unused Balance Refund*: Vendor cash withdrawal with overdraft protection.
  3. *Admin Adjustment*: Courtesy credit adjustment for disputed clicks.
  4. *Expired Campaign Float Return*: Automatic return of remaining balance upon campaign expiration.
- **Ledger Immutability**: Original `AD_SPEND` transactions are **never** deleted or edited when a refund occurs.

### Phase 8: Final Security & Multi-Tenant Audit
- Full verification of cross-tenant isolation: Vendor A cannot access Vendor B's wallet, campaigns, clicks, or ledgers.

---

## 🗄️ Complete Database Schema (Firestore Collections)

```text
/users/{userId}
  ├── email: string
  ├── displayName: string
  ├── role: "customer" | "vendor" | "staff" | "admin"
  ├── phone: string
  └── addresses: Address[]

/vendors/{vendorId}
  ├── storeName: string
  ├── ownerUserId: string
  ├── fssaiLicense: string
  ├── commissionRate: number
  ├── status: "ACTIVE" | "PENDING_VERIFICATION" | "SUSPENDED"
  └── bankDetails: object

/products/{productId}
  ├── vendorId: string
  ├── title: string
  ├── category: string
  ├── price: number
  ├── stock: number
  ├── unit: "250g" | "500g" | "1kg" | "1L"
  ├── isAvailable: boolean
  └── isOrganic: boolean

/orders/{orderId}
  ├── orderNumber: string
  ├── customerId: string
  ├── items: CartItem[]
  ├── totalAmount: number
  ├── paymentStatus: "PAID" | "PENDING" | "FAILED"
  ├── orderStatus: "PLACED" | "CONFIRMED" | "DISPATCHED" | "DELIVERED" | "CANCELLED"
  ├── subOrderIds: string[]
  └── createdAt: timestamp

/financialLedger/{txId}
  ├── vendorId: string
  ├── orderId: string
  ├── type: "SALE" | "PAYOUT" | "REFUND"
  ├── grossAmount: number
  ├── platformCommission: number
  ├── vendorEarnings: number
  ├── auditHash: string
  └── timestamp: string

/advertisingWallets/{walletId}
  ├── vendorId: string
  ├── availableBalance: number
  ├── totalDeposited: number
  ├── totalSpent: number
  ├── totalRefunded: number
  └── lastUpdated: timestamp

/advertisingCampaigns/{campaignId}
  ├── vendorId: string
  ├── productId: string
  ├── campaignName: string
  ├── dailyBudget: number
  ├── totalBudget: number
  ├── cpc: number
  ├── status: "DRAFT" | "PENDING_APPROVAL" | "ACTIVE" | "PAUSED" | "COMPLETED" | "REJECTED"
  ├── spentAmount: number
  ├── impressions: number
  ├── clicks: number
  ├── startDate: string
  └── endDate: string

/advertisingTransactions/{txId}
  ├── vendorId: string
  ├── campaignId: string
  ├── type: "WALLET_TOPUP" | "AD_SPEND" | "REFUND" | "ADMIN_ADJUSTMENT"
  ├── amount: number
  ├── previousBalance: number
  ├── newBalance: number
  ├── description: string
  └── createdAt: string

/advertisingClicks/{clickId}
  ├── campaignId: string
  ├── vendorId: string
  ├── productId: string
  ├── cpcCharged: number
  ├── isCharged: boolean
  └── timestamp: string

/advertisingInvalidClicks/{invalidClickId}
  ├── campaignId: string
  ├── vendorId: string
  ├── reason: "DUPLICATE_RAPID_CLICK" | "BOT_ACTIVITY_DETECTED" | "CAMPAIGN_STATUS_PAUSED" | "INSUFFICIENT_FUNDS"
  └── timestamp: string

/advertisingAttributions/{attrId}
  ├── campaignId: string
  ├── vendorId: string
  ├── productId: string
  ├── orderId: string
  ├── attributedSales: number
  └── createdAt: string
```

---

## 🔒 Security Architecture & Firestore Rules

The root security configuration in `firestore.rules` enforces:
1. **Default Deny (`match /{document=**} { allow read, write: if false; }`)**: No open collections.
2. **Identity Verification**: Checks verified email domains and Firestore roles (`isAdmin()`, `isVendor()`, `isStaff()`).
3. **Client Financial Block**: Balances, ledger entries, and CPC deductions cannot be directly written by clients.
4. **Vendor Scoping**: A vendor can only read or create campaigns for `vendorId == request.auth.uid`.
5. **Ledger Immutability**: `allow update, delete: if false` on all transaction collections.

---

## 🌐 Complete Server REST API Reference

All backend endpoints are prefixed with `/api` and hosted via Express:

### Marketplace & Checkout Endpoints
- `POST /api/verify-checkout-cart`: Validates stock, delivery pincode, and recalculates totals authoritatively.
- `POST /api/create-order-authoritative`: Generates master order and vendor sub-orders with idempotency check.
- `POST /api/verify-payment-signature`: Verifies payment gateway HMAC signature and settles transactions.
- `POST /api/cancel-order`: Processes order cancellation within the grace period.

### Advertising Suite Endpoints
- `GET /api/advertising/wallet/:vendorId`: Retrieves isolated prepaid wallet balance.
- `GET /api/advertising/transactions/:vendorId`: Retrieves immutable advertising transaction history.
- `POST /api/advertising/wallet/admin-action`: Admin credit/debit adjustment (requires reason).
- `POST /api/advertising/refund`: Authoritatively executes one of the 4 ad refund flows.
- `GET /api/advertising/campaigns`: Admin view of all platform ad campaigns.
- `GET /api/advertising/campaigns/vendor/:vendorId`: Retrieves campaigns scoped strictly to the requesting vendor.
- `GET /api/advertising/vendor-products/:vendorId`: Lists active, compliant products available for promotion.
- `POST /api/advertising/campaign/create`: Creates a campaign with initial `PENDING_APPROVAL` status.
- `POST /api/advertising/campaign/admin-status`: Admin approves or rejects campaign.
- `POST /api/advertising/campaign/action`: Vendor pauses or resumes an active campaign.
- `POST /api/advertising/cpc/click`: Server processes click, checks fraud, and debits CPC from wallet.
- `GET /api/advertising/sponsored-products`: Retrieves public sponsored placements for the storefront.
- `GET /api/advertising/dashboard-kpis/:vendorId?`: Returns 10 authoritative advertising KPIs.
- `GET /api/advertising/reports`: Filterable advertising report data (gross, refunds, net spend, ROAS).
- `GET /api/advertising/attributions`: Lists attributed purchase records.

---

## 🛠️ Technology Stack & Directory Structure

```text
├── firestore.rules                     # Enterprise security rules for all 25 collections
├── server.ts                           # Express server with security headers & Vite middleware
├── vite.config.ts                      # Build configuration & bundle chunking
├── package.json                        # Project dependencies and operational scripts
├── src/
│   ├── api/                            # Backend API logic & Server-side engines
│   │   ├── serverApi.ts                # Main Express route handler
│   │   ├── advertisingWalletServer.ts  # Wallet balance and transaction engine
│   │   ├── advertisingCampaignServer.ts# Campaign state transitions & budget checks
│   │   ├── cpcBillingServer.ts         # CPC execution & bot filtering
│   │   ├── sponsoredPlacementServer.ts # Non-destructive sponsored product injection
│   │   ├── advertisingReportsServer.ts # Authoritative KPI & reporting calculations
│   │   ├── advertisingAttributionServer.ts # 7-day attribution & refund processing
│   │   └── securityMiddleware.ts       # Rate limiting, input sanitization & auth guards
│   ├── components/
│   │   ├── admin/                      # Super Admin portal & advertising management tabs
│   │   ├── vendor/                     # Vendor dashboard & Advertising Suite UI
│   │   ├── checkout/                   # Cart, split order view & payment simulator
│   │   ├── products/                   # Storefront catalog, badges & sponsored items
│   │   ├── account/                    # Order history, live tracking & cancellations
│   │   └── auth/                       # Multi-role authentication & registration modals
│   ├── context/
│   │   ├── AuthContext.tsx             # Multi-role authentication & profile state
│   │   └── CartContext.tsx             # Multi-vendor cart state & server verification
│   ├── services/                       # Browser-safe client-side API clients
│   ├── types/                          # TypeScript definitions (marketplace & advertising)
│   └── test/                           # Automated test suites (Phases 2 through 8)
└── public/                             # Public static assets, robots.txt, sitemap.xml
```

---

## 🚀 Getting Started & Installation

### Prerequisites
- Node.js (v20 or higher recommended)
- npm or yarn

### 1. Clone & Install Dependencies
```bash
git clone <repository-url>
cd pure-sudh
npm install
```

### 2. Environment Configuration
Create a `.env` file based on `.env.example`:
```env
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### 3. Run Development Server
```bash
npm run dev
```
The application will be live at `http://localhost:3000`.

### 4. Code Quality & Type Check
```bash
npm run lint
```

### 5. Production Build
```bash
npm run build
```

---

## 🧪 Automated Test Suites (71/71 Tests Verified)

Run any individual test suite or execute all suites in sequence:

```bash
# 1. Phase 2: Vendor Advertising Wallets (6 Tests)
npx tsx src/test/advertisingWalletPhase2.test.ts

# 2. Phase 3: Campaign Lifecycle & Product Scoping (8 Tests)
npx tsx src/test/advertisingCampaignPhase3.test.ts

# 3. Phase 4: CPC Billing & Ledger Immutability (7 Tests)
npx tsx src/test/advertisingCpcBillingPhase4.test.ts

# 4. Phase 5: Sponsored Placements & Ranking (8 Tests)
npx tsx src/test/advertisingSponsoredPlacementPhase5.test.ts

# 5. Phase 6: Advertising Dashboard & Reports (7 Tests)
npx tsx src/test/advertisingReportsPhase6.test.ts

# 6. Phase 7: Ad Attribution & Ad Refunds (15 Tests)
npx tsx src/test/advertisingAttributionRefundPhase7.test.ts

# 7. Phase 8: Final Security & Multi-Tenant Audit (22 Tests)
npx tsx src/test/securityAndProductionAuditPhase8.test.ts
```

### Run All 71 Tests in a Single Command:
```bash
npx tsx src/test/advertisingWalletPhase2.test.ts && \
npx tsx src/test/advertisingCampaignPhase3.test.ts && \
npx tsx src/test/advertisingCpcBillingPhase4.test.ts && \
npx tsx src/test/advertisingSponsoredPlacementPhase5.test.ts && \
npx tsx src/test/advertisingReportsPhase6.test.ts && \
npx tsx src/test/advertisingAttributionRefundPhase7.test.ts && \
npx tsx src/test/securityAndProductionAuditPhase8.test.ts
```
**Result**: 71 / 71 tests passing (100% success rate).

---

## 🌐 Production Deployment & Environment Rules

1. **Port & Process**: Dev and production servers bind to `0.0.0.0:3000`.
2. **SEO & Meta**: Complete OpenGraph, Twitter Cards, and Schema.org structured data are embedded in `index.html`.
3. **Production Start**: `"start": "node server.ts"` in `package.json`.
4. **Immutable Caching**: Static bundles in `/dist/assets` are served with `Cache-Control: public, max-age=31536000, immutable`, while `index.html` uses `no-cache` to ensure instant updates.

---

## 📜 Quality Pledge
> "शुद्धता ही हमारी पहचान है" — PURE SUDH is engineered to guarantee absolute data integrity, financial security, and customer trust at every stage of the transaction.
