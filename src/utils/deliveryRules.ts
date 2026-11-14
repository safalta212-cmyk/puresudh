import { DeliveryArea, DeliverySlot, DeliveryValidationResult } from '../types';

/**
 * Format delivery ETA strictly according to configured delivery rules.
 * CRITICAL RULE: "Do not hardcode 30-minute delivery.
 * 30-minute delivery must only be displayed when configured delivery rules confirm it.
 * Otherwise display configured ETA."
 */
export function formatDeliveryETA(
  area?: DeliveryArea | null,
  fallbackEta: string = '25-35 mins'
): {
  etaText: string;
  is30MinDelivery: boolean;
} {
  if (!area) {
    return {
      etaText: fallbackEta,
      is30MinDelivery: false,
    };
  }

  // Check if configured rule explicitly sets 30 mins
  const is30Min =
    area.estimatedTimeMinutes === 30 ||
    Boolean(area.estimatedDeliveryTime && /\b30\s*(?:min|minute|mins|minutes)\b/i.test(area.estimatedDeliveryTime));

  if (is30Min) {
    return {
      etaText: '30-minute delivery',
      is30MinDelivery: true,
    };
  }

  // Otherwise, strictly display configured ETA text or minutes
  if (area.estimatedDeliveryTime && area.estimatedDeliveryTime.trim().length > 0) {
    return {
      etaText: area.estimatedDeliveryTime.trim(),
      is30MinDelivery: false,
    };
  }

  if (area.estimatedTimeMinutes && area.estimatedTimeMinutes > 0) {
    return {
      etaText: `${area.estimatedTimeMinutes} mins`,
      is30MinDelivery: false,
    };
  }

  return {
    etaText: fallbackEta,
    is30MinDelivery: false,
  };
}

/**
 * Matches a 6-digit postal code against configured delivery areas.
 * Prepared for future vendor-specific delivery architecture:
 * If a vendorId is supplied, it prioritizes delivery areas assigned to that vendor,
 * falling back to platform-wide areas (vendorId === 'all' or undefined).
 */
export function matchDeliveryArea(
  pincode: string,
  areas: DeliveryArea[],
  vendorId?: string
): DeliveryArea | null {
  const cleanPin = pincode.replace(/\D/g, '').trim();
  if (!cleanPin) return null;

  // Filter only active and serviceable areas
  const activeAreas = areas.filter((a) => a.active !== false && a.isDeliverable !== false);

  const isMatch = (area: DeliveryArea) => {
    if (area.pincode === cleanPin) return true;
    if (Array.isArray(area.pincodes)) {
      return area.pincodes.some((p) => p.replace(/\D/g, '').trim() === cleanPin);
    }
    return false;
  };

  // 1. If vendor-specific check requested, check vendor-specific delivery area first
  if (vendorId && vendorId !== 'all') {
    const vendorArea = activeAreas.find((a) => a.vendorId === vendorId && isMatch(a));
    if (vendorArea) return vendorArea;
  }

  // 2. Fall back to platform-wide or default areas (vendorId === 'all' or undefined)
  const defaultArea = activeAreas.find((a) => (!a.vendorId || a.vendorId === 'all') && isMatch(a));
  if (defaultArea) return defaultArea;

  // 3. Fall back to any active matching area
  return activeAreas.find(isMatch) || null;
}

/**
 * Calculate effective delivery charges based on configured threshold
 */
export function calculateDeliveryFee(
  area: DeliveryArea | null,
  cartSubtotal: number
): {
  deliveryCharge: number;
  effectiveDeliveryCharge: number;
  freeDeliveryThreshold: number;
  isFreeDelivery: boolean;
} {
  const deliveryCharge = area ? Number(area.deliveryCharge ?? 30) : 30;
  const freeDeliveryThreshold = area
    ? Number(area.freeDeliveryAbove ?? area.freeDeliveryThreshold ?? 299)
    : 299;

  const isFreeDelivery = cartSubtotal >= freeDeliveryThreshold;
  const effectiveDeliveryCharge = isFreeDelivery ? 0 : deliveryCharge;

  return {
    deliveryCharge,
    effectiveDeliveryCharge,
    freeDeliveryThreshold,
    isFreeDelivery,
  };
}

/**
 * Validates delivery eligibility locally or as fallback
 */
export function evaluateDeliveryEligibility(
  pincode: string,
  areas: DeliveryArea[],
  cartSubtotal: number = 0,
  vendorId?: string,
  slots: DeliverySlot[] = []
): DeliveryValidationResult {
  const cleanPin = pincode.replace(/\D/g, '').trim();
  const area = matchDeliveryArea(cleanPin, areas, vendorId);

  if (!area) {
    return {
      isDeliverable: false,
      deliverabilityStatus: 'Currently unavailable in your area',
      fastDeliveryAvailable: false,
      fastDeliveryStatus: null,
      is30MinDelivery: false,
      estimatedDeliveryTime: '',
      pincode: cleanPin,
      deliveryCharge: 30,
      effectiveDeliveryCharge: 30,
      minimumOrder: 99,
      freeDeliveryThreshold: 299,
      availableSlots: [],
      vendorId: vendorId || 'all',
      message: 'Currently unavailable in your area',
    };
  }

  const { etaText, is30MinDelivery } = formatDeliveryETA(area);
  const { deliveryCharge, effectiveDeliveryCharge, freeDeliveryThreshold } = calculateDeliveryFee(
    area,
    cartSubtotal
  );

  // Filter available slots for this area or vendor
  const availableSlots = slots.filter((s) => {
    if (!s.active) return false;
    if (area.deliverySlotIds && area.deliverySlotIds.length > 0) {
      return area.deliverySlotIds.includes(s.id);
    }
    if (vendorId && s.vendorId && s.vendorId !== 'all' && s.vendorId !== vendorId) {
      return false;
    }
    return true;
  });

  return {
    isDeliverable: true,
    deliverabilityStatus: 'Delivery Available',
    fastDeliveryAvailable: Boolean(area.fastDeliveryAvailable),
    fastDeliveryStatus: area.fastDeliveryAvailable ? 'Fast Delivery Available' : null,
    is30MinDelivery,
    estimatedDeliveryTime: etaText,
    pincode: cleanPin,
    areaName: area.areaName,
    city: area.city,
    state: area.state,
    deliveryCharge,
    effectiveDeliveryCharge,
    minimumOrder: area.minimumOrder ?? 99,
    freeDeliveryThreshold,
    availableSlots,
    vendorId: area.vendorId || vendorId || 'all',
    message: 'Delivery Available',
  };
}

export const PATNA_PINCODES = [
  '800001',
  '800002',
  '800003',
  '800004',
  '800005',
  '800006',
  '800007',
  '800008',
  '800011',
  '800013',
  '800014',
  '800020',
  '800023',
  '800024',
  '800025',
  '800026',
];
