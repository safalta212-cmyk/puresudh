export type UserRole = 'customer' | 'admin' | 'staff' | 'vendor' | 'delivery';

export interface Address {
  id: string;
  name: string;
  phone: string;
  mobile?: string; // Customer address: Mobile (alias of phone)
  pincode: string;
  addressLine: string;
  address?: string; // Customer address: Address (alias of addressLine)
  landmark?: string;
  city: string;
  state: string;
  isDefault?: boolean;
  type: 'home' | 'work' | 'other';
}

export interface UserProfile {
  id: string;
  uid: string;
  email: string;
  displayName: string;
  phone?: string;
  role: UserRole;
  createdAt: string;
  addresses: Address[];
  photoURL?: string;
  avatarUrl?: string;
  vendorDetails?: {
    shopName?: string;
    fssaiLicense?: string;
    gstNumber?: string;
    status?: 'pending' | 'approved' | 'rejected';
  };
  staffDetails?: {
    department?: string;
    employeeId?: string;
    active?: boolean;
  };
  authMethod?: 'password' | 'google' | 'phone' | 'anonymous';
  emailVerified?: boolean;
  customClaims?: Record<string, any>;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  shortDescription?: string;
  price: number;
  discountPrice?: number;
  sku?: string;
  weight: string;
  unit?: string;
  ingredients?: string;
  packagingInformation?: string;
  stock?: number;
  availability?: boolean;
  deliveryTime?: string; // e.g. "25-35 mins"
  categoryId?: string;
  category?: string;
  imageUrls?: string[];
  rating?: number;
  reviewCount?: number;
  status?: 'active' | 'draft' | 'archived' | 'out_of_stock';
  createdAt: string;
  updatedAt: string;
  // Compatibility & extended fields
  images?: string[];
  salePrice?: number;
  stockQuantity?: number;
  categorySlug?: string;
  subCategory?: string;
  featured?: boolean;
  bestseller?: boolean;
  newArrival?: boolean;
  active?: boolean;
  vendorId?: string;
  tags?: string[];
  shelfLife?: string;
  isPureVeg?: boolean;
  hindiName?: string;
  isAvailable?: boolean;
  inStock?: boolean;
  isFeatured?: boolean;
  isBestseller?: boolean;
  reviewsCount?: number;
}

export interface ProductVariant {
  id: string;
  productId: string;
  name: string;
  sku: string;
  price: number;
  discountPrice?: number;
  weight: string;
  unit: string;
  stock: number;
  availability: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryItem {
  id: string;
  productId: string;
  variantId?: string;
  sku: string;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  lowStockThreshold: number;
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
  warehouseLocation?: string;
  lastRestockedAt?: string;
  updatedAt: string;
}

export interface Cart {
  id: string;
  userId: string;
  items: {
    productId: string;
    variantId?: string;
    productName: string;
    productImage: string;
    price: number;
    quantity: number;
    weight?: string;
    total: number;
  }[];
  subtotal: number;
  itemCount: number;
  updatedAt: string;
}

export interface Wishlist {
  id: string;
  userId: string;
  productIds: string[];
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  parentId?: string;
  displayOrder: number;
  active: boolean;
  itemCount?: number;
  subCategories?: string[];
  hindiName?: string;
  order?: number;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedWeight?: string;
}

export type OrderStatus =
  | 'PLACED'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'PACKED'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'Order Placed'
  | 'Confirmed'
  | 'Preparing'
  | 'Packed'
  | 'Out for Delivery'
  | 'Delivered'
  | 'Cancelled'
  | 'Refunded';

export const ORDER_STATUS_ENUM = {
  PLACED: 'PLACED',
  CONFIRMED: 'CONFIRMED',
  PREPARING: 'PREPARING',
  PACKED: 'PACKED',
  OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
  REFUNDED: 'REFUNDED',
} as const;

export function normalizeOrderStatus(status: OrderStatus): string {
  switch (status) {
    case 'Order Placed':
    case 'PLACED':
      return 'PLACED';
    case 'Confirmed':
    case 'CONFIRMED':
      return 'CONFIRMED';
    case 'Preparing':
    case 'PREPARING':
      return 'PREPARING';
    case 'Packed':
    case 'PACKED':
      return 'PACKED';
    case 'Out for Delivery':
    case 'OUT_FOR_DELIVERY':
      return 'OUT_FOR_DELIVERY';
    case 'Delivered':
    case 'DELIVERED':
      return 'DELIVERED';
    case 'Cancelled':
    case 'CANCELLED':
      return 'CANCELLED';
    case 'Refunded':
    case 'REFUNDED':
      return 'REFUNDED';
    default:
      return String(status);
  }
}

export function formatOrderStatusDisplay(status: OrderStatus): string {
  const norm = normalizeOrderStatus(status);
  switch (norm) {
    case 'PLACED':
      return 'Order Placed';
    case 'CONFIRMED':
      return 'Confirmed';
    case 'PREPARING':
      return 'Preparing';
    case 'PACKED':
      return 'Packed';
    case 'OUT_FOR_DELIVERY':
      return 'Out for Delivery';
    case 'DELIVERED':
      return 'Delivered';
    case 'CANCELLED':
      return 'Cancelled';
    case 'REFUNDED':
      return 'Refunded';
    default:
      return String(status);
  }
}

export type PaymentMethod =
  | 'UPI'
  | 'PhonePe'
  | 'Google Pay'
  | 'Paytm'
  | 'Cards'
  | 'Credit/Debit Card'
  | 'Debit Card'
  | 'Credit Card'
  | 'Net Banking'
  | 'COD'
  | 'Cash on Delivery';

export interface OrderItem {
  id?: string;
  orderId?: string;
  productId: string;
  variantId?: string;
  productName: string;
  productImage: string;
  sku?: string;
  price: number;
  quantity: number;
  weight: string;
  unit?: string;
  total: number;
  vendorId?: string;
  createdAt?: string;
}

export interface OrderStatusHistory {
  id: string;
  orderId: string;
  status: OrderStatus;
  previousStatus?: OrderStatus;
  note?: string;
  updatedBy: string;
  updatedByRole: 'customer' | 'admin' | 'staff' | 'vendor' | 'delivery' | 'system';
  timestamp: string;
}

export interface Payment {
  id: string;
  orderId: string;
  customerId: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  gateway: 'razorpay' | 'cashfree' | 'stripe' | 'cod';
  gatewayPaymentId?: string;
  gatewayOrderId?: string;
  status: 'INITIATED' | 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';
  createdAt: string;
  updatedAt: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  items?: OrderItem[];
  deliveryAddress: Address;
  deliveryAddressId?: string;
  deliverySlotId?: string;
  subtotal: number;
  deliveryCharge: number;
  discount: number;
  couponCode?: string;
  total: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: 'Pending' | 'Paid' | 'Failed' | 'Refunded';
  paymentId?: string;
  notes?: string;
  estimatedDeliveryTime: string;
  deliveryAreaPincode: string;
  vendorId?: string;
  vendorOrderIds?: string[];
  vendorOrders?: VendorOrder[];
  isMultiVendor?: boolean;
  statusHistory?: {
    status: OrderStatus;
    timestamp: string;
    note?: string;
  }[];
  assignedDeliveryId?: string;
  assignedDeliveryName?: string;
  assignedDeliveryPhone?: string;
  assignedAt?: string;
  trackingActive?: boolean;
  destinationCoordinates?: GeoPointData;
  createdAt: string;
  updatedAt: string;
}

export interface GeoPointData {
  lat: number;
  lng: number;
  accuracy?: number;
  heading?: number | null;
  speed?: number | null;
  timestamp: string;
}

export type GpsTrackingStatus =
  | 'idle'
  | 'requesting_permission'
  | 'active'
  | 'stale'
  | 'stopped'
  | 'permission_denied'
  | 'gps_disabled'
  | 'network_error'
  | 'completed';

export interface RouteSummaryData {
  distanceMeters?: number;
  distanceText?: string;
  durationSeconds?: number;
  durationText?: string;
  computedAt?: string;
}

export interface LiveTrackingSession {
  id: string;
  orderId: string;
  orderNumber: string;
  customerId: string;
  customerName?: string;
  deliveryPersonId: string;
  deliveryPersonName?: string;
  deliveryPersonPhone?: string;
  orderStatus: OrderStatus;
  isActive: boolean;
  trackingStatus: GpsTrackingStatus;
  riderLocation?: GeoPointData | null;
  customerLocation?: GeoPointData | null;
  customerSharingEnabled?: boolean;
  destinationLocation?: GeoPointData | null;
  hubLocation?: GeoPointData | null;
  routeSummary?: RouteSummaryData | null;
  startedAt?: string;
  lastUpdatedAt: string;
  stoppedAt?: string;
  updatedAt: string;
}

export interface DeliveryArea {
  id: string;
  pincode?: string; // Primary pincode
  pincodes?: string[]; // Multiple serviceable pincodes for this hub/zone
  areaName?: string;
  city: string;
  state?: string;
  isDeliverable?: boolean;
  estimatedTimeMinutes?: number;
  estimatedDeliveryTime?: string; // Configured ETA (e.g. "30 mins", "25-35 mins", "45 mins", "Same Day")
  minimumOrder?: number;
  deliveryCharge: number;
  freeDeliveryAbove?: number;
  freeDeliveryThreshold?: number; // Alias for freeDeliveryAbove
  fastDeliveryAvailable?: boolean;
  deliverySlotIds?: string[]; // Associated delivery slot IDs
  radiusKm?: number;
  active: boolean;
  vendorId?: string; // Architecture for future vendor-specific delivery: 'all' | specific vendor ID
  vendorName?: string;
  name?: string; // Alias for areaName
  estimatedTime?: string; // Alias for estimatedDeliveryTime
  isFastDelivery?: boolean; // Alias for fastDeliveryAvailable
  createdAt?: string;
  updatedAt?: string;
}

export interface DeliveryValidationResult {
  isDeliverable: boolean;
  deliverabilityStatus: 'Delivery Available' | 'Currently unavailable in your area';
  fastDeliveryAvailable: boolean;
  fastDeliveryStatus: 'Fast Delivery Available' | null;
  is30MinDelivery: boolean;
  estimatedDeliveryTime: string; // Dynamic configured ETA
  pincode: string;
  areaName?: string;
  city?: string;
  state?: string;
  deliveryCharge: number;
  effectiveDeliveryCharge: number;
  minimumOrder: number;
  freeDeliveryThreshold: number;
  availableSlots?: DeliverySlot[];
  vendorId?: string;
  message?: string;
}

export type DiscountType = 'percentage' | 'fixed' | 'flat';

export interface Coupon {
  id: string;
  code: string;
  discountType: DiscountType;
  discountValue: number;
  minOrderAmount: number;
  maxDiscount?: number;
  startDate?: string; // YYYY-MM-DD or ISO
  validFrom?: string; // Alias for startDate
  expiryDate?: string; // YYYY-MM-DD or ISO
  validTill?: string; // Alias for expiryDate
  validUntil?: string; // Alias for validTill
  usageLimit?: number; // Total redemptions allowed across platform
  usageCount: number; // Current total redemptions
  perCustomerLimit?: number; // Max redemptions per user (abuse prevention)
  perUserLimit?: number; // Alias for perCustomerLimit
  productRestrictions?: string[]; // Allowed product IDs
  restrictedProductIds?: string[]; // Alias for productRestrictions
  categoryRestrictions?: string[]; // Allowed category IDs
  restrictedCategoryIds?: string[]; // Alias for categoryRestrictions
  firstOrderOnly?: boolean; // New customer / first order restriction
  minimumOrder?: number; // Alias for minOrderAmount
  active: boolean;
  description: string;
  createdAt?: string;
  updatedAt?: string;
}

export type OfferType =
  | 'todays_offers'
  | 'special_deals'
  | 'festival_offers'
  | 'new_customer'
  | 'product_offers'
  | 'category_offers';

export interface Offer {
  id: string;
  title: string;
  subtitle?: string;
  code?: string;
  badge?: string;
  bannerImage?: string;
  discountText?: string;
  targetUrl?: string;
  active: boolean;
  offerType?: OfferType;
  startDate?: string;
  endDate?: string;
  targetType?: 'all' | 'category' | 'product';
  targetCategoryIds?: string[];
  targetCategoryId?: string;
  targetProductIds?: string[];
  termsAndConditions?: string[];
  imageUrl?: string; // Alias for bannerImage
  link?: string; // Alias for targetUrl
  createdAt?: string;
  updatedAt?: string;
}

export interface Banner {
  id: string;
  title: string;
  subtitle?: string;
  link: string;
  imageUrl: string;
  buttonText: string;
  active: boolean;
  order?: number;
  displayOrder?: number; // Alias for order
  tag?: string;
}

export type OfferBanner = Banner;

export interface Review {
  id: string;
  productId: string;
  productName?: string;
  productImage?: string;
  orderId?: string;
  customerId: string;
  customerName: string;
  userId?: string;
  userName?: string;
  helpfulVotes?: number;
  rating: number;
  title?: string;
  comment: string;
  images?: string[];
  imageUrl?: string;
  thumbnailUrl?: string;
  verifiedPurchase: boolean;
  status: 'approved' | 'pending' | 'rejected' | 'hidden';
  createdAt: string;
}

export interface SiteSettings {
  id?: string;
  siteName?: string;
  storeName: string;
  primaryTagline: string;
  hindiTagline: string;
  secondaryTagline: string;
  contactPhone: string;
  contactEmail: string;
  whatsappNumber: string;
  whatsappChatEnabled?: boolean;
  whatsappPrefillMessage?: string;
  instagramUrl?: string;
  facebookUrl?: string;
  youtubeUrl?: string;
  twitterUrl?: string;
  storeAddress: string;
  fssaiLicense?: string;
  logoUrl?: string;
  faviconUrl?: string;
  // Delivery Settings
  defaultDeliveryETA: string;
  allowCod?: boolean;
  minOrderAmount?: number;
  deliveryRadiusKm?: number;
  standardDeliveryCharge?: number;
  defaultDeliveryCharge?: number;
  freeDeliveryThreshold: number;
  expressDeliveryCharge?: number;
  announcementText?: string;
  // Payment Settings
  allowUpi?: boolean;
  allowCards?: boolean;
  allowNetBanking?: boolean;
  razorpayKeyId?: string;
  upiId?: string;
  // SEO Settings
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  ogImageUrl?: string;
}

export interface DeliverySlot {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  cutoffHours?: number;
  cutoffTime?: string;
  days?: string[];
  maxOrders: number;
  active?: boolean;
  isActive?: boolean; // Alias for active
  daysOfWeek?: number[];
  vendorId?: string; // Architecture for future vendor-specific delivery: 'all' | specific vendor ID
  vendorName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CouponUsage {
  id: string;
  couponId: string;
  couponCode: string;
  userId: string;
  orderId: string;
  discountAmount: number;
  usedAt: string;
}

export type NotificationCategory =
  | 'order_confirmation'
  | 'order_status'
  | 'payment_status'
  | 'cancellation'
  | 'refund'
  | 'promotional';

export type NotificationChannel = 'email' | 'sms' | 'whatsapp' | 'push';

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'order' | 'promo' | 'account' | 'system';
  category?: NotificationCategory;
  channels?: NotificationChannel[];
  read: boolean;
  link?: string;
  orderId?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export type VendorStatus = 'PENDING' | 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'active' | 'pending' | 'suspended';
export type VendorVerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';

export interface Vendor {
  id: string;
  name: string;
  businessName?: string;
  slug: string;
  tagline: string;
  description: string;
  logo: string;
  bannerImage?: string;
  coverImage?: string;
  ownerName: string;
  email: string;
  phone: string;
  fssaiNumber: string;
  gstNumber?: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  specialties: string[];
  status: VendorStatus;
  verificationStatus?: VendorVerificationStatus;
  commissionPercentage: number;
  rating: number;
  totalProducts: number;
  totalOrders: number;
  joinedAt: string;
  ownerUserId?: string;
  businessInformation?: {
    panNumber?: string;
    tradeLicense?: string;
    businessType?: string;
    incorporationDate?: string;
  };
  verificationInformation?: {
    verifiedAt?: string;
    verifiedBy?: string;
    notes?: string;
    idProofUrl?: string;
    fssaiCertificateUrl?: string;
  };
  payoutInformation?: {
    bankAccountId?: string;
    accountHolderName?: string;
    accountNumberMasked?: string;
    ifscCode?: string;
    bankName?: string;
    upiId?: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface VendorUser {
  id: string;
  vendorId: string;
  userId: string;
  role: 'owner' | 'manager' | 'staff';
  permissions: string[];
  active: boolean;
  createdAt: string;
}

export interface VendorProfile {
  id: string;
  vendorId: string;
  bio: string;
  businessHours?: string;
  establishedYear?: number;
  certifications?: string[];
  bankDetailsConfigured?: boolean;
  storeBanner?: string;
  returnPolicy?: string;
  supportEmail?: string;
  supportPhone?: string;
  updatedAt: string;
}

export interface VendorProduct {
  id: string;
  vendorId: string;
  productId: string;
  sku: string;
  vendorPrice: number;
  markupPercentage: number;
  retailPrice: number;
  stock: number;
  status: 'pending_approval' | 'approved' | 'rejected';
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VendorInventory {
  id: string;
  vendorId: string;
  productId: string;
  variantId?: string;
  sku: string;
  stockQuantity: number;
  reservedQuantity: number;
  batchNumber?: string;
  expiryDate?: string;
  lowStockThreshold: number;
  updatedAt: string;
}

export interface VendorOrder {
  id: string;
  orderId: string;
  orderNumber: string;
  vendorId: string;
  vendorName?: string;
  items: OrderItem[];
  vendorSubtotal: number;
  vendorDiscount?: number;
  vendorDeliveryFee?: number;
  vendorTotal?: number;
  commissionRate?: number;
  commissionAmount: number;
  payoutAmount: number;
  status: OrderStatus;
  estimatedDeliveryTime?: string;
  isAvailable?: boolean;
  preparationStatus?: 'pending' | 'received' | 'preparing' | 'ready_for_packing' | 'packed' | 'dispatched' | 'cancelled';
  cancellationReason?: string;
  refundStatus?: 'none' | 'pending' | 'partially_refunded' | 'refunded' | 'completed';
  refundAmount?: number;
  deliveryPartner?: string;
  trackingNumber?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VendorCommission {
  id: string;
  vendorId: string;
  orderId: string;
  orderTotal: number;
  commissionRate: number;
  commissionAmount: number;
  netVendorAmount: number;
  status: 'pending' | 'settled' | 'disputed';
  calculatedAt: string;
}

export interface VendorPayout {
  id: string;
  vendorId: string;
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  periodStart: string;
  periodEnd: string;
  ordersCount: number;
  transactionRef?: string;
  bankAccountId: string;
  processedAt?: string;
  createdAt: string;
}

export interface VendorBankAccount {
  id: string;
  vendorId: string;
  accountHolderName: string;
  accountNumberMasked: string;
  ifscCode: string;
  bankName: string;
  branch?: string;
  isPrimary: boolean;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VendorNotification {
  id: string;
  vendorId: string;
  title: string;
  message: string;
  type: 'order' | 'payout' | 'inventory' | 'system';
  read: boolean;
  link?: string;
  createdAt: string;
}

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'admin' | 'manager' | 'staff' | 'delivery' | 'delivery_lead' | 'catalog_manager';
  department: string;
  permissions: string[];
  active: boolean;
  createdAt: string;
  updatedAt?: string;
  lastLogin?: string;
}

export interface CustomerSummary {
  id: string;
  uid: string;
  displayName: string;
  email: string;
  phone?: string;
  role: string;
  status: 'active' | 'suspended' | 'blocked';
  totalOrders: number;
  totalSpent: number;
  lastOrderDate?: string;
  createdAt: string;
  addresses?: Address[];
}

export interface HomepageConfig {
  id?: string;
  heroBannerIds: string[];
  featuredCategoryIds: string[];
  featuredCategorySlugs?: string[];
  featuredProductIds: string[];
  bestsellerProductIds: string[];
  bestSellerProductIds?: string[];
  activeOfferIds: string[];
  announcementText?: string;
  showAnnouncement?: boolean;
  updatedAt?: string;
}

export interface BroadcastNotification {
  id: string;
  title: string;
  message: string;
  type: 'promo' | 'order' | 'system' | 'festival';
  targetRole: 'all' | 'customer' | 'staff';
  target?: string;
  link?: string;
  actionUrl?: string;
  sentAt: string;
  recipientsCount: number;
}

/* =========================================================================
   10. SECURE COMMISSION, FINANCIAL LEDGER & PAYOUT TYPES
   ========================================================================= */

export type CommissionPrecedenceLevel = 'product' | 'category' | 'vendor' | 'global';

export interface CommissionRule {
  id: string;
  level: CommissionPrecedenceLevel;
  targetId: string; // productId, categoryId, vendorId, or 'global'
  targetName: string;
  rate: number; // Percentage (e.g. 10 for 10%)
  description?: string;
  active: boolean;
  updatedAt: string;
}

export interface CommissionConfig {
  globalRate: number; // Default platform rate (e.g. 10%)
  categoryRates: Record<string, number>; // categoryId -> percentage
  vendorRates: Record<string, number>; // vendorId -> percentage
  productRates: Record<string, number>; // productId -> percentage
  updatedAt: string;
}

export interface ItemCommissionBreakdown {
  productId: string;
  productName: string;
  categoryId?: string;
  vendorId: string;
  unitPrice: number;
  quantity: number;
  itemTotal: number;
  itemDiscount: number;
  netItemTotal: number;
  effectiveRate: number;
  precedenceLevel: CommissionPrecedenceLevel;
  platformCommission: number;
  vendorEarning: number;
}

export interface OrderCommissionCalculation {
  orderId: string;
  vendorId: string;
  grossSales: number;
  totalDiscount: number;
  deliveryFeeShare: number;
  netSales: number;
  totalCommission: number;
  vendorEarnings: number;
  items: ItemCommissionBreakdown[];
  calculatedAt: string;
}

export type LedgerTransactionType = 'SALE' | 'COMMISSION' | 'REFUND' | 'ADJUSTMENT' | 'PAYOUT';

export interface FinancialLedgerEntry {
  id: string;
  transactionId: string;
  vendorId: string;
  vendorName?: string;
  orderId?: string;
  orderNumber?: string;
  type: LedgerTransactionType;
  amount: number; // positive = credit to vendor, negative = debit
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  reason?: string;
  referenceId?: string;
  auditHash: string;
  createdAt: string;
  createdBy: string;
  metadata?: Record<string, any>;
}

export interface VendorFinancialSummary {
  vendorId: string;
  vendorName: string;
  grossSales: number;
  discounts: number;
  commission: number;
  refunds: number;
  adjustments: number;
  vendorEarnings: number; // Net earnings = grossSales - discounts - commission - refunds + adjustments
  pendingPayout: number; // vendorEarnings - paidPayout
  paidPayout: number;
  totalOrdersCount: number;
  lastPayoutDate?: string;
  payoutStatus: 'READY' | 'ON_HOLD' | 'REQUIRES_BANK_VERIFICATION';
  updatedAt: string;
}

export interface PayoutAdjustmentPayload {
  vendorId: string;
  amount: number; // positive or negative
  type: 'bonus' | 'penalty' | 'fee_reversal' | 'manual_correction';
  reason: string;
  adminId: string;
}

// Vendor Advertising Foundation (Phase 1)
export * from './advertising';


