import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { Product } from '../types';
import { useAuth } from './AuthContext';
import { useCart } from './CartContext';
import { useToast } from './ToastContext';
import {
  fetchUserWishlist,
  saveUserWishlist,
  mergeGuestWishlistWithCustomerWishlist,
} from '../firebase/cartWishlistService';
import { initialProducts } from '../data/seedData';

interface WishlistContextType {
  wishlist: Product[];
  wishlistCount: number;
  isWishlistOpen: boolean;
  setIsWishlistOpen: (open: boolean) => void;
  addToWishlist: (product: Product) => Promise<void>;
  removeFromWishlist: (productId: string) => Promise<void>;
  toggleWishlist: (product: Product) => Promise<void>;
  isInWishlist: (productId: string) => boolean;
  moveToCart: (product: Product, quantity?: number) => Promise<boolean>;
  moveAllToCart: () => Promise<number>;
  clearWishlist: () => Promise<void>;
  isSyncing: boolean;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

const GUEST_WISHLIST_KEY = 'pure_sudh_wishlist';

export const WishlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { addToCart } = useCart();
  const { showToast } = useToast();

  const [wishlist, setWishlist] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem(GUEST_WISHLIST_KEY);
      if (!saved || saved === 'null' || saved === 'undefined') return [];
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const [isWishlistOpen, setIsWishlistOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const prevUserIdRef = useRef<string | null>(user?.uid || null);
  const isInitialMount = useRef(true);

  // Helper to persist wishlist to cloud (if authenticated) or localStorage (if guest)
  const persistWishlist = useCallback(
    async (items: Product[]) => {
      const productIds = items.map((p) => p.id);
      if (user?.uid) {
        try {
          await saveUserWishlist(user.uid, productIds);
        } catch (err) {
          console.warn('Could not save wishlist to Firestore:', err);
        }
      } else {
        try {
          localStorage.setItem(GUEST_WISHLIST_KEY, JSON.stringify(items));
        } catch (err) {
          console.warn('LocalStorage error:', err);
        }
      }
    },
    [user?.uid]
  );

  // Synchronize when authentication state transitions
  useEffect(() => {
    const handleAuthTransition = async () => {
      const currentUid = user?.uid || null;
      const prevUid = prevUserIdRef.current;

      if (currentUid && currentUid !== prevUid) {
        setIsSyncing(true);
        try {
          // Read guest product IDs from localStorage
          let guestIds: string[] = [];
          try {
            const raw = localStorage.getItem(GUEST_WISHLIST_KEY);
            if (raw) {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed)) {
                guestIds = parsed.map((item: any) => (typeof item === 'string' ? item : item.id));
              }
            }
          } catch {
            guestIds = [];
          }

          let mergedIds: string[] = [];
          if (guestIds.length > 0) {
            // Merge guest wishlist into customer wishlist without duplicates
            mergedIds = await mergeGuestWishlistWithCustomerWishlist(currentUid, guestIds);
            showToast('Guest wishlist merged with your account!', 'success');
          } else {
            mergedIds = await fetchUserWishlist(currentUid);
          }

          // Hydrate full Product objects from available catalog
          const localProducts = initialProducts;
          const hydrated = mergedIds
            .map((id) => localProducts.find((p) => p.id === id))
            .filter((p): p is Product => Boolean(p));

          setWishlist(hydrated);
        } catch (err) {
          console.warn('Error loading customer wishlist:', err);
        } finally {
          setIsSyncing(false);
        }
      } else if (!currentUid && prevUid) {
        // User logged out
        try {
          const raw = localStorage.getItem(GUEST_WISHLIST_KEY);
          const parsed = raw ? JSON.parse(raw) : [];
          setWishlist(Array.isArray(parsed) ? parsed : []);
        } catch {
          setWishlist([]);
        }
      }

      prevUserIdRef.current = currentUid;
    };

    if (isInitialMount.current) {
      isInitialMount.current = false;
      if (user?.uid) {
        handleAuthTransition();
      }
      return;
    }

    handleAuthTransition();
  }, [user?.uid]);

  const isInWishlist = (productId: string) => {
    return wishlist.some((p) => p.id === productId);
  };

  const addToWishlist = async (product: Product) => {
    if (isInWishlist(product.id)) return;
    const updated = [...wishlist, product];
    setWishlist(updated);
    await persistWishlist(updated);
    showToast(`Added ${product.name} to Wishlist`, 'success');
  };

  const removeFromWishlist = async (productId: string) => {
    const item = wishlist.find((p) => p.id === productId);
    const updated = wishlist.filter((p) => p.id !== productId);
    setWishlist(updated);
    await persistWishlist(updated);
    if (item) {
      showToast(`Removed ${item.name} from Wishlist`, 'info');
    }
  };

  const toggleWishlist = async (product: Product) => {
    if (isInWishlist(product.id)) {
      await removeFromWishlist(product.id);
    } else {
      await addToWishlist(product);
    }
  };

  const moveToCart = async (product: Product, quantity = 1): Promise<boolean> => {
    if (!product.availability || (product.stockQuantity ?? 10) <= 0) {
      showToast(`${product.name} is currently out of stock`, 'error');
      return false;
    }

    const added = await addToCart(product, quantity);
    if (added) {
      // Remove from wishlist
      const updated = wishlist.filter((p) => p.id !== product.id);
      setWishlist(updated);
      await persistWishlist(updated);
      showToast(`Moved ${product.name} to Cart`, 'success');
      return true;
    }
    return false;
  };

  const moveAllToCart = async (): Promise<number> => {
    const inStockItems = wishlist.filter(
      (p) => p.availability && (p.stockQuantity ?? 10) > 0
    );

    if (inStockItems.length === 0) {
      showToast('No available in-stock items to move', 'info');
      return 0;
    }

    let movedCount = 0;
    for (const prod of inStockItems) {
      const success = await addToCart(prod, 1);
      if (success) {
        movedCount++;
      }
    }

    // Keep out of stock items in wishlist, remove moved ones
    const inStockIds = new Set(inStockItems.map((p) => p.id));
    const remaining = wishlist.filter((p) => !inStockIds.has(p.id));
    setWishlist(remaining);
    await persistWishlist(remaining);

    showToast(`Moved ${movedCount} items to your fresh cart!`, 'success');
    return movedCount;
  };

  const clearWishlist = async () => {
    setWishlist([]);
    if (user?.uid) {
      await saveUserWishlist(user.uid, []);
    } else {
      localStorage.removeItem(GUEST_WISHLIST_KEY);
    }
    showToast('Wishlist cleared', 'info');
  };

  return (
    <WishlistContext.Provider
      value={{
        wishlist,
        wishlistCount: wishlist.length,
        isWishlistOpen,
        setIsWishlistOpen,
        addToWishlist,
        removeFromWishlist,
        toggleWishlist,
        isInWishlist,
        moveToCart,
        moveAllToCart,
        clearWishlist,
        isSyncing,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = (): WishlistContextType => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};
