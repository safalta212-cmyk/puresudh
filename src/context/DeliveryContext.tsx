import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { DeliveryArea, DeliverySlot, DeliveryValidationResult } from '../types';
import {
  fetchDeliveryAreas,
  fetchDeliverySlots,
  validateDeliveryAvailability,
} from '../firebase/services';
import {
  matchDeliveryArea,
  formatDeliveryETA,
  calculateDeliveryFee,
  evaluateDeliveryEligibility,
} from '../utils/deliveryRules';

interface DeliveryContextType {
  pincode: string;
  isDeliverable: boolean;
  deliverabilityStatus: 'Delivery Available' | 'Currently unavailable in your area';
  fastDeliveryAvailable: boolean;
  fastDeliveryStatus: 'Fast Delivery Available' | null;
  is30MinDelivery: boolean;
  estimatedDeliveryTime: string; // Dynamic configured ETA
  deliveryArea: DeliveryArea | null;
  allAreas: DeliveryArea[];
  allSlots: DeliverySlot[];
  deliverySlots: DeliverySlot[];
  selectedSlot: DeliverySlot | null;
  setSelectedSlot: (slot: DeliverySlot | null) => void;
  isLoading: boolean;
  deliveryCharge: number;
  freeDeliveryThreshold: number;
  minimumOrder: number;
  isPincodeModalOpen: boolean;
  setPincodeModalOpen: (open: boolean) => void;
  setPincode: (pincode: string, vendorId?: string) => Promise<boolean>;
  validatePincode: (
    pincode: string,
    options?: { cartSubtotal?: number; vendorId?: string }
  ) => Promise<DeliveryValidationResult>;
  refreshAreas: () => Promise<void>;
  selectedVendorId?: string;
  setSelectedVendorId: (vendorId: string | undefined) => void;
}

const DeliveryContext = createContext<DeliveryContextType | undefined>(undefined);

export const DeliveryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [pincode, setPincodeState] = useState<string>(() => {
    return localStorage.getItem('pure_sudh_pincode') || '800001';
  });

  const [selectedVendorId, setSelectedVendorId] = useState<string | undefined>(undefined);
  const [allAreas, setAllAreas] = useState<DeliveryArea[]>([]);
  const [allSlots, setAllSlots] = useState<DeliverySlot[]>([]);
  const [deliveryArea, setDeliveryArea] = useState<DeliveryArea | null>(null);
  const [isDeliverable, setIsDeliverable] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isPincodeModalOpen, setPincodeModalOpen] = useState<boolean>(false);
  const [selectedSlot, setSelectedSlot] = useState<DeliverySlot | null>(null);

  const applyDeliveryAreaMatch = useCallback(
    (code: string, areas: DeliveryArea[], vendorId?: string) => {
      const cleanPin = code.replace(/\D/g, '').trim();
      const matched = matchDeliveryArea(cleanPin, areas, vendorId);

      if (matched && matched.isDeliverable && matched.active !== false) {
        setDeliveryArea(matched);
        setIsDeliverable(true);
      } else {
        setDeliveryArea(null);
        setIsDeliverable(false);
      }
    },
    []
  );

  const refreshAreas = useCallback(async () => {
    try {
      const [areas, slots] = await Promise.all([
        fetchDeliveryAreas(),
        fetchDeliverySlots(selectedVendorId),
      ]);
      setAllAreas(areas);
      setAllSlots(slots);
      applyDeliveryAreaMatch(pincode, areas, selectedVendorId);
    } catch (e) {
      console.warn('Refresh areas error:', e);
    }
  }, [applyDeliveryAreaMatch, pincode, selectedVendorId]);

  useEffect(() => {
    refreshAreas();
  }, [refreshAreas]);

  const validatePincode = async (
    code: string,
    options?: { cartSubtotal?: number; vendorId?: string }
  ): Promise<DeliveryValidationResult> => {
    const cleanPin = code.replace(/\D/g, '').trim();
    return validateDeliveryAvailability(cleanPin, {
      cartSubtotal: options?.cartSubtotal ?? 0,
      vendorId: options?.vendorId ?? selectedVendorId,
    });
  };

  const setPincode = async (newCode: string, vendorId?: string): Promise<boolean> => {
    const cleanPin = newCode.replace(/\D/g, '').trim();
    if (!cleanPin) return false;

    setIsLoading(true);
    setPincodeState(cleanPin);
    localStorage.setItem('pure_sudh_pincode', cleanPin);

    let deliverable = false;

    try {
      // Execute authoritative Cloud Function / API validation
      const result = await validateDeliveryAvailability(cleanPin, {
        vendorId: vendorId ?? selectedVendorId,
      });
      deliverable = result.isDeliverable;
      setIsDeliverable(result.isDeliverable);

      if (result.isDeliverable && allAreas.length > 0) {
        applyDeliveryAreaMatch(cleanPin, allAreas, vendorId ?? selectedVendorId);
      } else {
        setDeliveryArea(null);
      }
    } catch {
      // Local fallback
      applyDeliveryAreaMatch(cleanPin, allAreas, vendorId ?? selectedVendorId);
      const matched = matchDeliveryArea(cleanPin, allAreas, vendorId ?? selectedVendorId);
      deliverable = Boolean(matched && matched.isDeliverable && matched.active !== false);
      setIsDeliverable(deliverable);
    } finally {
      setIsLoading(false);
    }

    return deliverable;
  };

  // Compute status strings strictly matching customer requirements:
  // "Customer should see: 'Delivery Available' or 'Currently unavailable in your area'. If eligible: 'Fast Delivery Available'.
  // Do not hardcode 30-minute delivery. 30-minute delivery must only be displayed when configured delivery rules confirm it. Otherwise display configured ETA."
  const deliverabilityStatus: 'Delivery Available' | 'Currently unavailable in your area' =
    isDeliverable && deliveryArea
      ? 'Delivery Available'
      : 'Currently unavailable in your area';

  const fastDeliveryAvailable = Boolean(deliveryArea && deliveryArea.fastDeliveryAvailable);
  const fastDeliveryStatus: 'Fast Delivery Available' | null =
    isDeliverable && fastDeliveryAvailable ? 'Fast Delivery Available' : null;

  const { etaText, is30MinDelivery } = formatDeliveryETA(deliveryArea);
  const estimatedDeliveryTime = etaText;

  const deliveryCharge = deliveryArea ? Number(deliveryArea.deliveryCharge ?? 30) : 30;
  const freeDeliveryThreshold = deliveryArea
    ? Number(deliveryArea.freeDeliveryAbove ?? deliveryArea.freeDeliveryThreshold ?? 299)
    : 299;
  const minimumOrder = deliveryArea ? Number(deliveryArea.minimumOrder ?? 99) : 99;

  // Compute active delivery slots applicable to this delivery area
  const deliverySlots = allSlots.filter((slot) => {
    if (!slot.active) return false;
    if (deliveryArea?.deliverySlotIds && deliveryArea.deliverySlotIds.length > 0) {
      return deliveryArea.deliverySlotIds.includes(slot.id);
    }
    if (selectedVendorId && slot.vendorId && slot.vendorId !== 'all' && slot.vendorId !== selectedVendorId) {
      return false;
    }
    return true;
  });

  return (
    <DeliveryContext.Provider
      value={{
        pincode,
        isDeliverable,
        deliverabilityStatus,
        fastDeliveryAvailable,
        fastDeliveryStatus,
        is30MinDelivery,
        estimatedDeliveryTime,
        deliveryArea,
        allAreas,
        allSlots,
        deliverySlots,
        selectedSlot,
        setSelectedSlot,
        isLoading,
        deliveryCharge,
        freeDeliveryThreshold,
        minimumOrder,
        isPincodeModalOpen,
        setPincodeModalOpen,
        setPincode,
        validatePincode,
        refreshAreas,
        selectedVendorId,
        setSelectedVendorId,
      }}
    >
      {children}
    </DeliveryContext.Provider>
  );
};

export const useDelivery = (): DeliveryContextType => {
  const context = useContext(DeliveryContext);
  if (!context) {
    throw new Error('useDelivery must be used within a DeliveryProvider');
  }
  return context;
};
