/**
 * PURE SUDH - useVendor Hook
 * Marketplace vendors foundation
 */

import { useState, useEffect, useCallback } from 'react';
import { Vendor } from '../types';
import { getVendors, saveVendor } from '../services/firestore.service';

export function useVendor() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadVendors = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getVendors();
      setVendors(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch vendors');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVendors();
  }, [loadVendors]);

  const registerNewVendor = async (vendorData: Omit<Vendor, 'id' | 'status' | 'rating' | 'totalProducts' | 'totalOrders' | 'joinedAt'>): Promise<Vendor> => {
    const newVendor: Vendor = {
      ...vendorData,
      id: `vendor-${Date.now()}`,
      status: 'pending',
      rating: 5.0,
      totalProducts: 0,
      totalOrders: 0,
      joinedAt: new Date().toISOString(),
    };
    await saveVendor(newVendor);
    setVendors((prev) => [...prev, newVendor]);
    return newVendor;
  };

  return {
    vendors,
    activeVendors: vendors.filter((v) => v.status === 'active'),
    isLoading,
    error,
    reload: loadVendors,
    registerNewVendor,
  };
}

export default useVendor;
