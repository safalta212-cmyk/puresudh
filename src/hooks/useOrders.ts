/**
 * PURE SUDH - useOrders Hook
 */

import { useState, useEffect, useCallback } from 'react';
import { Order } from '../types';
import { getCustomerOrders, getAllOrders, createOrder } from '../services/firestore.service';
import { useAuth } from '../context/AuthContext';

export function useOrders() {
  const { user, role } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    if (!user) {
      setOrders([]);
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      setError(null);
      if (role === 'admin') {
        const data = await getAllOrders();
        setOrders(data);
      } else {
        const data = await getCustomerOrders(user.uid);
        setOrders(data);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch orders');
    } finally {
      setIsLoading(false);
    }
  }, [user, role]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const placeOrder = async (orderData: Order): Promise<Order> => {
    const placed = await createOrder(orderData);
    setOrders((prev) => [placed, ...prev]);
    return placed;
  };

  return {
    orders,
    isLoading,
    error,
    reload: loadOrders,
    placeOrder,
  };
}

export default useOrders;
