import { CartItem, Product, DeliveryArea } from '../types';
import { INITIAL_MARKETPLACE_VENDORS } from '../constants';
import { matchDeliveryArea, formatDeliveryETA, calculateDeliveryFee } from './deliveryRules';

export interface VendorCartGroup {
  vendorId: string;
  vendorName: string;
  vendorSlug: string;
  vendorLogo?: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
  estimatedDeliveryTime: string;
  isDeliverable: boolean;
  deliverabilityStatus: string;
  isAvailable: boolean;
  minOrderAmount?: number;
  freeDeliveryThreshold?: number;
}

/**
 * Returns default vendor mapping for a given product
 */
export function getProductVendorId(product: Product): string {
  if (product.vendorId && product.vendorId.trim().length > 0) {
    return product.vendorId.trim();
  }

  const pid = (product.id || '').toLowerCase();
  const name = (product.name || '').toLowerCase();
  const cat = (product.categoryId || product.category || '').toLowerCase();

  // Vendor 1: Homemade Thekua & Khasta Specialty
  if (
    pid.includes('thekua') ||
    pid.includes('khasta') ||
    name.includes('thekua') ||
    name.includes('khasta') ||
    name.includes('nimki') ||
    name.includes('kachori')
  ) {
    return 'vendor-1';
  }

  // Vendor 2: Dairy & Fresh Milk Products
  if (
    pid.includes('paneer') ||
    pid.includes('milk') ||
    pid.includes('dahi') ||
    pid.includes('chhach') ||
    name.includes('paneer') ||
    name.includes('milk') ||
    name.includes('dahi') ||
    name.includes('curd') ||
    name.includes('chhach') ||
    cat.includes('dairy') ||
    cat.includes('paneer') ||
    cat.includes('dahi') ||
    cat.includes('doodh')
  ) {
    return 'vendor-2';
  }

  // Vendor 3: Pure Desi Sweets & Laddus
  if (
    pid.includes('laddu') ||
    pid.includes('padki') ||
    pid.includes('gujiya') ||
    pid.includes('gulab-jamun') ||
    pid.includes('katli') ||
    pid.includes('mithai') ||
    name.includes('laddu') ||
    name.includes('padki') ||
    name.includes('gujiya') ||
    name.includes('sweet') ||
    cat.includes('sweets') ||
    cat.includes('mithai')
  ) {
    return 'vendor-3';
  }

  // Vendor 4: Homemade Pantry, Namkeen, Spices & Dry Snacks
  if (
    pid.includes('mixture') ||
    pid.includes('achar') ||
    pid.includes('masale') ||
    name.includes('mixture') ||
    name.includes('achar') ||
    name.includes('snack') ||
    cat.includes('homemade')
  ) {
    return 'vendor-4';
  }

  return 'vendor-1';
}

/**
 * Resolves human-readable vendor metadata (Name, Logo, Slug)
 */
export function getVendorMetadata(vendorId: string): {
  name: string;
  logo?: string;
  slug: string;
} {
  const found = INITIAL_MARKETPLACE_VENDORS.find((v) => v.id === vendorId);
  if (found) {
    return {
      name: found.name,
      logo: found.logo,
      slug: found.slug,
    };
  }

  switch (vendorId) {
    case 'vendor-1':
      return {
        name: 'Sudh Dairy & Thekua Farms',
        slug: 'sudh-dairy-farms',
        logo: 'https://images.unsplash.com/photo-1527153857715-3908f2ae5e81?w=200&auto=format&fit=crop&q=80',
      };
    case 'vendor-2':
      return {
        name: 'Brijwasi Khoya & Sweets',
        slug: 'brijwasi-sweets',
        logo: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=200&auto=format&fit=crop&q=80',
      };
    case 'vendor-3':
      return {
        name: 'Gramin Cold-Pressed & Artisanal Sweets',
        slug: 'gramin-oils-flours',
        logo: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=200&auto=format&fit=crop&q=80',
      };
    case 'vendor-4':
      return {
        name: 'Shuddh Masale & Homemade Snacks',
        slug: 'shuddh-masale',
        logo: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=200&auto=format&fit=crop&q=80',
      };
    default:
      return {
        name: `Partner Vendor (${vendorId})`,
        slug: vendorId,
      };
  }
}

/**
 * Groups cart items strictly by vendor and computes vendor-level
 * subtotals, discounts, delivery fees, and delivery ETAs.
 * CRITICAL RULE: "Never promise an ETA unless delivery rules confirm it."
 */
export function groupCartByVendor(
  items: CartItem[],
  pincode: string = '800001',
  deliveryAreas: DeliveryArea[] = [],
  totalDiscount: number = 0
): VendorCartGroup[] {
  if (!items || items.length === 0) return [];

  const map = new Map<string, CartItem[]>();

  for (const item of items) {
    const vId = getProductVendorId(item.product);
    if (!map.has(vId)) {
      map.set(vId, []);
    }
    map.get(vId)!.push(item);
  }

  const overallSubtotal = items.reduce((sum, item) => {
    const price =
      item.product.salePrice && item.product.salePrice > 0
        ? item.product.salePrice
        : item.product.price;
    return sum + price * item.quantity;
  }, 0);

  const groups: VendorCartGroup[] = [];

  for (const [vendorId, vendorItems] of map.entries()) {
    const meta = getVendorMetadata(vendorId);

    const vendorSubtotal = vendorItems.reduce((sum, item) => {
      const price =
        item.product.salePrice && item.product.salePrice > 0
          ? item.product.salePrice
          : item.product.price;
      return sum + price * item.quantity;
    }, 0);

    // Proportionate share of overall coupon discount
    const vendorDiscount =
      overallSubtotal > 0
        ? Math.round((vendorSubtotal / overallSubtotal) * totalDiscount)
        : 0;

    // Check delivery eligibility strictly against configured delivery rules
    const area = matchDeliveryArea(pincode, deliveryAreas, vendorId);

    let isDeliverable = true;
    let deliverabilityStatus = 'Delivery Available';
    let estimatedDeliveryTime = '25-35 mins';
    let deliveryFee = 30;
    let freeDeliveryThreshold = 299;
    let minOrderAmount = 99;

    if (area) {
      if (area.active === false || area.isDeliverable === false) {
        isDeliverable = false;
        deliverabilityStatus = 'Vendor currently unavailable in your area';
        estimatedDeliveryTime = 'Unavailable';
      } else {
        const etaObj = formatDeliveryETA(area, '25-35 mins');
        estimatedDeliveryTime = etaObj.etaText;
        const feeObj = calculateDeliveryFee(area, vendorSubtotal);
        deliveryFee = feeObj.effectiveDeliveryCharge;
        freeDeliveryThreshold = feeObj.freeDeliveryThreshold;
        minOrderAmount = area.minimumOrder || 99;
      }
    } else {
      // If pincode is provided but area does not service this vendor
      if (pincode && pincode.length === 6) {
        // Check if there is platform area
        const platformArea = matchDeliveryArea(pincode, deliveryAreas);
        if (platformArea && platformArea.isDeliverable && platformArea.active !== false) {
          const etaObj = formatDeliveryETA(platformArea, '25-35 mins');
          estimatedDeliveryTime = etaObj.etaText;
          const feeObj = calculateDeliveryFee(platformArea, vendorSubtotal);
          deliveryFee = feeObj.effectiveDeliveryCharge;
          freeDeliveryThreshold = feeObj.freeDeliveryThreshold;
          minOrderAmount = platformArea.minimumOrder || 99;
        } else {
          isDeliverable = false;
          deliverabilityStatus = 'Currently unavailable in this pincode';
          estimatedDeliveryTime = 'Unavailable';
        }
      }
    }

    // Check if any product is out of stock or vendor unavailable
    const hasUnavailableItem = vendorItems.some(
      (i) => i.product.availability === false || (i.product.stockQuantity ?? 10) <= 0
    );

    const isAvailable = isDeliverable && !hasUnavailableItem;

    const vendorTotal = Math.max(0, vendorSubtotal + (isDeliverable ? deliveryFee : 0) - vendorDiscount);

    groups.push({
      vendorId,
      vendorName: meta.name,
      vendorSlug: meta.slug,
      vendorLogo: meta.logo,
      items: vendorItems,
      subtotal: vendorSubtotal,
      discount: vendorDiscount,
      deliveryFee: isDeliverable ? deliveryFee : 0,
      total: vendorTotal,
      estimatedDeliveryTime,
      isDeliverable,
      deliverabilityStatus,
      isAvailable,
      minOrderAmount,
      freeDeliveryThreshold,
    });
  }

  return groups;
}
