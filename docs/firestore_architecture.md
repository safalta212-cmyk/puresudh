# PURE SUDH - Complete Firestore Database Architecture

## 1. Overview & Architectural Philosophy
The PURE SUDH database architecture is engineered for:
- **Low-latency, scalable reads**: Avoiding deep document nesting while establishing unambiguous foreign-key document relationships.
- **Strict Role-Based Access Control (RBAC)**: Governed by the Eight Pillars of Hardened Rules.
- **Zero Production Pollution**: Development seed tooling with environment safety checks and dry-run audit capabilities.
- **Multi-vendor Marketplace Readiness**: Dedicated vendor collections prepared for seller onboarding, commissions, inventory batching, and payout settlements.

---

## 2. Collections & Relationships Diagram

```
users (User)
  │ (1:N)
  ├────────► addresses (Address) [userId]
  ├────────► carts (Cart) [userId]
  ├────────► wishlists (Wishlist) [userId]
  ├────────► reviews (Review) [customerId]
  ├────────► notifications (Notification) [userId]
  └────────► orders (Order) [customerId]
               │ (1:N)
               ├────────► orderItems (OrderItem) [orderId]
               ├────────► orderStatusHistory (OrderStatusHistory) [orderId]
               └────────► payments (Payment) [orderId]

categories (Category)
  │ (1:N)
  └────────► products (Product) [categoryId]
               │ (1:N)
               ├────────► productVariants (ProductVariant) [productId]
               ├────────► inventory (Inventory) [productId]
               └────────► reviews (Review) [productId]

vendors (Vendor)
  │ (1:N)
  ├────────► vendorUsers (VendorUser) [vendorId]
  ├────────► vendorProfiles (VendorProfile) [vendorId]
  ├────────► vendorProducts (VendorProduct) [vendorId]
  ├────────► vendorInventory (VendorInventory) [vendorId]
  ├────────► vendorOrders (VendorOrder) [vendorId]
  ├────────► vendorCommissions (VendorCommission) [vendorId]
  ├────────► vendorPayouts (VendorPayout) [vendorId]
  ├────────► vendorBankAccounts (VendorBankAccount) [vendorId]
  └────────► vendorNotifications (VendorNotification) [vendorId]

deliveryAreas (DeliveryArea) [pincode]
deliverySlots (DeliverySlot)
coupons (Coupon)
couponUsage (CouponUsage) [couponId, userId, orderId]
banners (Banner)
offers (Offer)
siteSettings (SiteSettings)
```

---

## 3. Product Schema Specification

| Field Name | Type | Description |
| :--- | :--- | :--- |
| `id` | string | Unique Product Document ID (e.g. `prod-thekua-gur-500g`) |
| `name` | string | Product display name |
| `slug` | string | URL-friendly unique slug (e.g. `traditional-gur-desi-ghee-thekua`) |
| `description` | string | Detailed product description & traditional heritage notes |
| `shortDescription` | string | Quick summary for catalog cards |
| `price` | number | Standard MRP in INR |
| `discountPrice` | number | Discounted selling price |
| `sku` | string | Unique Stock Keeping Unit (e.g. `PS-THK-GUR-500`) |
| `weight` | string | Display weight (e.g. `500g`, `1L`) |
| `unit` | string | Base measurement unit (`g`, `kg`, `ml`, `L`, `pcs`) |
| `ingredients` | string | Traditional ingredients list (no preservatives) |
| `packagingInformation`| string | Food-grade airtight container / vacuum packaging info |
| `stock` | number | Available quantity in main store inventory |
| `availability` | boolean | Real-time purchase toggle |
| `deliveryTime` | string | Estimated delivery SLA (e.g. `25-35 mins`) |
| `categoryId` | string | Foreign Key reference to `categories/{categoryId}` |
| `imageUrls` | string[] | Array of high-resolution product photography URLs |
| `rating` | number | Aggregate customer rating (1.0 to 5.0) |
| `reviewCount` | number | Total number of approved customer reviews |
| `status` | string | Enum: `active`, `draft`, `archived`, `out_of_stock` |
| `createdAt` | string (ISO) | Document creation timestamp |
| `updatedAt` | string (ISO) | Document modification timestamp |

---

## 4. Standardized Order Lifecycle Statuses

All order tracking, fulfillment, and state machines adhere strictly to:
1. `PLACED`: Customer created order; payment initiated or COD selected.
2. `CONFIRMED`: Payment verified or COD order confirmed by merchant/system.
3. `PREPARING`: Store kitchen/fulfillment unit assembling fresh authentic items.
4. `PACKED`: Order sealed in food-grade tamper-evident packaging.
5. `OUT_FOR_DELIVERY`: Dispatched with express delivery partner.
6. `DELIVERED`: Handed over to customer with delivery confirmation.
7. `CANCELLED`: Order cancelled prior to dispatch with cancellation reason logged.
8. `REFUNDED`: Payment reversed to customer's source account.

---

## 5. Composite Query Indexes

The following composite indexes are configured in `firestore.indexes.json` to enable zero-overhead sorted filtering:

1. **Catalog Search & Filtering**:
   - `products`: `categoryId` ASC + `status` ASC + `createdAt` DESC
   - `products`: `categoryId` ASC + `status` ASC + `price` ASC
   - `products`: `categoryId` ASC + `status` ASC + `price` DESC
   - `products`: `categoryId` ASC + `status` ASC + `rating` DESC
   - `products`: `status` ASC + `price` ASC
   - `products`: `status` ASC + `price` DESC
   - `products`: `status` ASC + `rating` DESC
   - `products`: `status` ASC + `createdAt` DESC
   - `products`: `vendorId` ASC + `status` ASC + `createdAt` DESC
   - `products`: `vendorId` ASC + `status` ASC + `price` ASC

2. **Customer & Merchant Orders**:
   - `orders`: `customerId` ASC + `status` ASC + `createdAt` DESC
   - `orders`: `customerId` ASC + `createdAt` DESC
   - `orders`: `status` ASC + `createdAt` DESC
   - `orders`: `vendorId` ASC + `status` ASC + `createdAt` DESC
   - `orders`: `vendorId` ASC + `createdAt` DESC

3. **Relationships & Audit Trails**:
   - `orderItems`: `orderId` ASC + `createdAt` ASC
   - `orderStatusHistory`: `orderId` ASC + `timestamp` ASC
   - `reviews`: `productId` ASC + `status` ASC + `createdAt` DESC
   - `reviews`: `productId` ASC + `status` ASC + `rating` DESC
   - `addresses`: `userId` ASC + `isDefault` DESC + `createdAt` DESC
   - `inventory`: `productId` ASC + `status` ASC

---

## 6. Development Seed Tooling
Located in `src/firebase/seedTooling.ts`:
- **Production Guard**: Validates environment and blocks execution on production domains without the safety bypass key `CONFIRM_DEV_SEED_PROD_OVERRIDE`.
- **Dry Run Mode**: Audits entity counts and document operations without issuing writes.
- **Chunked Writes**: Submits updates in chunks of 250 using `writeBatch(db)`.
- **Data Integrity**: Seeds normalized orders with linked `orderItems`, `orderStatusHistory`, and `payments`.
