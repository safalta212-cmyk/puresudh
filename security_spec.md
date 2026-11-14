# Security Specification & Test-Driven Verification (TDD)
**Project:** PURE SUDH Firestore Security Rules  
**Date:** 2026-09-17  
**Status:** Hardened ABAC & Zero-Trust Architecture

---

## 1. Core Data Invariants

1. **Global Default-Deny:** Any unspecified path or unauthenticated operation is denied by default.
2. **Customer Isolation:**
   - Customers may read public catalogs (`products`, `categories`, `banners`, `offers`, `deliveryAreas`, `deliverySlots`, `siteSettings`, `reviews`).
   - Customer private records (`addresses`, `carts`, `wishlists`, `orders`, `notifications`, `users/{userId}`) can strictly be accessed and managed ONLY by the authenticated owner (`request.auth.uid == userId / customerId`).
   - Customer A can NEVER read or list Customer B's addresses, cart, orders, or profile.
3. **Vendor Isolation:**
   - Vendor A can NEVER read, list, create, update, or delete Vendor B's private data (`vendorOrders`, `vendorProducts`, `vendorInventory`, `vendorCommissions`, `vendorPayouts`, `vendorBankAccounts`, `vendorNotifications`).
   - In shared collections (`products`), a vendor can only create or update products where `vendorId == request.auth.uid`.
4. **Role Integrity & Anti-Spoofing:**
   - Clients CANNOT set or self-escalate `role` (e.g. to `'admin'`, `'staff'`, or `'vendor'`).
   - Admin access requires identity verification with `request.auth.token.email_verified == true` and explicit database document authorization (`/admins/{uid}` or trusted user document).
5. **Order Lifecycle & Financial Protection:**
   - Customers can only create orders with initial status `'PLACED'`, with `customerId == request.auth.uid`, and positive financial subtotals.
   - Customers CANNOT modify order amounts, mark orders as paid, or update status (except cancelling their own order while still in `'PLACED'` state).
   - Sensitive financial collections (`payments`, `vendorCommissions`, `vendorPayouts`) cannot be created or modified directly by client SDKs; they must be processed via Cloud Functions / Admin authorization.
6. **Review Authenticity:**
   - Reviews require an authenticated author where `incoming().customerId == request.auth.uid`, with valid ratings (1-5) and content bounds.

---

## 2. The "Dirty Dozen" Threat Payloads

| ID | Threat Vector | Target Path | Attacker Context | Payload / Operation | Expected Result |
|---|---|---|---|---|---|
| **D1** | Horizontal Privilege Escalation | `/orders/ord-alice` | `auth.uid = 'hacker_bob'` | `get /orders/ord-alice` (where `customerId == 'alice'`) | **PERMISSION_DENIED** |
| **D2** | Order State Shortcutting & Price Tampering | `/orders/ord-tamper` | `auth.uid = 'hacker_bob'` | `create` with `{ customerId: 'hacker_bob', status: 'DELIVERED', total: 0.01 }` | **PERMISSION_DENIED** |
| **D3** | Unauthenticated Order Scraping | `/orders/ord-123` | `auth = null` | `get /orders/ord-123` | **PERMISSION_DENIED** |
| **D4** | Cross-Customer PII Address Theft | `/addresses/addr-alice` | `auth.uid = 'hacker_bob'` | `get /addresses/addr-alice` | **PERMISSION_DENIED** |
| **D5** | Privilege Escalation (Self-Assign Admin Role) | `/users/hacker_bob` | `auth.uid = 'hacker_bob'` | `update` with `{ role: 'admin' }` | **PERMISSION_DENIED** |
| **D6** | Cross-Vendor Data Snooping | `/vendorOrders/vord-b` | `auth.uid = 'vendor_a'` | `get /vendorOrders/vord-b` (where `vendorId == 'vendor_b'`) | **PERMISSION_DENIED** |
| **D7** | Cross-Vendor Product Sabotage | `/products/prod-b` | `auth.uid = 'vendor_a'` | `update` on product owned by `vendor_b` | **PERMISSION_DENIED** |
| **D8** | Direct Financial Commission Payout Theft | `/vendorPayouts/pay-1` | `auth.uid = 'vendor_a'` | `create / update` with `{ amount: 100000, status: 'Completed' }` | **PERMISSION_DENIED** |
| **D9** | Fake Payment Confirmation Injection | `/payments/pay-bypass` | `auth.uid = 'hacker_bob'` | `create` with `{ status: 'Paid', amount: 5000 }` directly via client | **PERMISSION_DENIED** |
| **D10** | Forged Customer Review | `/reviews/rev-spoof` | `auth.uid = 'hacker_bob'` | `create` with `{ customerId: 'victim_alice', rating: 1 }` | **PERMISSION_DENIED** |
| **D11** | Staff Privilege Abuse on Financials | `/vendorCommissions/c1` | `auth.uid = 'staff_charlie'` | `update` with `{ commissionRate: 0 }` | **PERMISSION_DENIED** |
| **D12** | Unverified Email Admin Spoofing | `/categories/cat-1` | `auth = { email: 'aanews70@gmail.com', email_verified: false }` | `write` to root site configurations or categories | **PERMISSION_DENIED** |

---

## 3. Test Runner Implementation

The companion test suite `src/firebase/firestore.rules.test.ts` executes each of these threat vectors using automated rule validation routines to guarantee zero regressions.
