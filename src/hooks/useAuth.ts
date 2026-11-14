/**
 * PURE SUDH - useAuth Hook
 */

import { useAuth as useAuthContext } from '../context/AuthContext';

export function useAuth() {
  const authContext = useAuthContext();
  return {
    ...authContext,
    isAdmin: authContext.role === 'admin',
    isVendor: authContext.role === 'vendor',
    isCustomer: authContext.role === 'customer',
  };
}

export default useAuth;
