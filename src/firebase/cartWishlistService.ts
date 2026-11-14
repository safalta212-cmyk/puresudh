import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from './config';
import { Product, CartItem } from '../types';
import { initialProducts } from '../data/seedData';

export interface FirestoreCartData {
  id: string;
  userId: string;
  items: {
    productId: string;
    quantity: number;
    selectedWeight?: string;
    addedAt?: string;
    product: {
      id: string;
      name: string;
      price: number;
      salePrice?: number;
      images: string[];
      weight: string;
      stockQuantity: number;
      availability: boolean;
      categoryId?: string;
    };
  }[];
  couponCode?: string;
  updatedAt: string;
}

export interface FirestoreWishlistData {
  id: string;
  userId: string;
  productIds: string[];
  updatedAt: string;
}

const LOCAL_GUEST_CART_KEY = 'pure_sudh_cart';
const LOCAL_GUEST_WISHLIST_KEY = 'pure_sudh_wishlist';
const LOCAL_GUEST_COUPON_KEY = 'pure_sudh_coupon';

/* =========================================================================
   CART SERVICES
   ========================================================================= */

/**
 * Fetch persistent cart from Firestore for authenticated user
 */
export async function fetchUserCart(
  userId: string
): Promise<{ items: CartItem[]; couponCode: string } | null> {
  if (!userId) return null;

  // If the user is not actively signed in with this Firebase Auth UID, use local cache
  if (!auth.currentUser || auth.currentUser.uid !== userId) {
    try {
      const saved =
        localStorage.getItem(`pure_sudh_cart_${userId}`) ||
        localStorage.getItem(LOCAL_GUEST_CART_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.items)) {
          return { items: parsed.items, couponCode: parsed.couponCode || '' };
        }
        if (Array.isArray(parsed)) {
          return { items: parsed, couponCode: '' };
        }
      }
    } catch {
      // ignore
    }
    return null;
  }

  try {
    const docRef = doc(db, 'carts', userId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as FirestoreCartData;
      const items: CartItem[] = (data.items || []).map((item) => {
        const fallback = initialProducts.find(
          (p) => p.id === (item.product?.id || item.productId)
        );
        const prod: Product = {
          id: item.product.id || item.productId,
          name: item.product.name || fallback?.name || 'Product',
          slug: fallback?.slug || item.product.id || item.productId,
          description: fallback?.description || '',
          shortDescription: fallback?.shortDescription || '',
          price: Number(item.product.price) || fallback?.price || 0,
          salePrice: item.product.salePrice
            ? Number(item.product.salePrice)
            : fallback?.salePrice,
          images:
            Array.isArray(item.product.images) && item.product.images.length > 0
              ? item.product.images
              : fallback?.images || [],
          categoryId: item.product.categoryId || fallback?.categoryId || 'cat-thekua',
          weight: item.product.weight || item.selectedWeight || fallback?.weight || '1 unit',
          stockQuantity: Number(item.product.stockQuantity) ?? fallback?.stockQuantity ?? 10,
          availability: item.product.availability ?? fallback?.availability ?? true,
          unit: fallback?.unit || 'unit',
          rating: fallback?.rating || 4.8,
          reviewCount: fallback?.reviewCount || 12,
          createdAt: fallback?.createdAt || new Date().toISOString(),
          updatedAt: fallback?.updatedAt || new Date().toISOString(),
          tags: fallback?.tags || [],
          shelfLife: fallback?.shelfLife || '7 days',
        };
        return {
          product: prod,
          quantity: Math.max(1, Number(item.quantity) || 1),
          selectedWeight: item.selectedWeight || item.product.weight,
        };
      });

      return {
        items,
        couponCode: data.couponCode || '',
      };
    }
  } catch (err) {
    console.warn('Firestore cart read note (using local cache):', err);
  }
  return null;
}

/**
 * Save persistent cart to Firestore for authenticated user
 */
export async function saveUserCart(
  userId: string,
  items: CartItem[],
  couponCode: string = ''
): Promise<void> {
  if (!userId) return;

  // Always keep local storage updated so state survives offline & page refresh
  try {
    localStorage.setItem(
      `pure_sudh_cart_${userId}`,
      JSON.stringify({ items, couponCode })
    );
  } catch {
    // ignore
  }

  // Only sync to Firestore if user has an active Firebase Auth session matching userId
  if (!auth.currentUser || auth.currentUser.uid !== userId) {
    return;
  }

  const payload: FirestoreCartData = {
    id: userId,
    userId,
    items: items.map((i) => ({
      productId: i.product.id,
      quantity: i.quantity,
      selectedWeight: i.selectedWeight || i.product.weight,
      addedAt: new Date().toISOString(),
      product: {
        id: i.product.id,
        name: i.product.name,
        price: i.product.price,
        salePrice: i.product.salePrice,
        images: i.product.images || [],
        weight: i.product.weight,
        stockQuantity: i.product.stockQuantity ?? 10,
        availability: i.product.availability ?? true,
        categoryId: i.product.categoryId,
      },
    })),
    couponCode,
    updatedAt: new Date().toISOString(),
  };

  try {
    await setDoc(doc(db, 'carts', userId), payload);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `carts/${userId}`);
  }
}

/**
 * Clear cart in Firestore for authenticated user
 */
export async function deleteUserCart(userId: string): Promise<void> {
  if (!userId) return;

  try {
    localStorage.removeItem(`pure_sudh_cart_${userId}`);
    localStorage.removeItem(LOCAL_GUEST_CART_KEY);
  } catch {
    // ignore
  }

  if (!auth.currentUser || auth.currentUser.uid !== userId) {
    return;
  }

  try {
    await deleteDoc(doc(db, 'carts', userId));
  } catch (err) {
    console.warn('Could not delete user cart doc:', err);
  }
}

/**
 * Safely merge guest cart into Firebase customer cart on login:
 * - Prevents negative quantities
 * - Merges duplicate items by combining quantity
 * - Caps quantities at product stockQuantity to prevent overstock
 * - Persists result to Firestore
 * - Cleans up local guest cart buffer
 */
export async function mergeGuestCartWithCustomerCart(
  userId: string,
  guestItems: CartItem[],
  knownCatalogProducts?: Product[]
): Promise<CartItem[]> {
  if (!userId) return guestItems;

  // 1. Fetch user's existing cloud cart
  const cloudData = await fetchUserCart(userId);
  const cloudItems = cloudData?.items || [];

  if (!guestItems.length) {
    return cloudItems;
  }

  // 2. Merge map by productId
  const mergedMap = new Map<string, CartItem>();

  // Add existing cloud items
  for (const item of cloudItems) {
    if (item.quantity > 0) {
      mergedMap.set(item.product.id, { ...item });
    }
  }

  // Merge guest items
  for (const gItem of guestItems) {
    if (!gItem.product || !gItem.product.id || gItem.quantity <= 0) continue;

    const catalogProd = knownCatalogProducts?.find((p) => p.id === gItem.product.id) || gItem.product;
    const maxStock = Math.max(1, catalogProd.stockQuantity || 1);

    if (mergedMap.has(gItem.product.id)) {
      const existing = mergedMap.get(gItem.product.id)!;
      const combinedQty = existing.quantity + gItem.quantity;
      // Cap at available stock to prevent overstock
      existing.quantity = Math.min(combinedQty, maxStock);
      // Update with fresh product metadata
      existing.product = catalogProd;
    } else {
      mergedMap.set(gItem.product.id, {
        product: catalogProd,
        quantity: Math.min(gItem.quantity, maxStock),
        selectedWeight: gItem.selectedWeight || catalogProd.weight,
      });
    }
  }

  const mergedItems = Array.from(mergedMap.values());

  // 3. Persist to Firestore
  try {
    await saveUserCart(userId, mergedItems, cloudData?.couponCode || '');
  } catch (err) {
    console.warn('Failed to sync merged cart to Firestore:', err);
  }

  // 4. Clear guest cart from localStorage
  try {
    localStorage.removeItem(LOCAL_GUEST_CART_KEY);
  } catch {
    // ignore
  }

  return mergedItems;
}

/* =========================================================================
   WISHLIST SERVICES
   ========================================================================= */

/**
 * Fetch persistent wishlist product IDs from Firestore for authenticated user
 */
export async function fetchUserWishlist(userId: string): Promise<string[]> {
  if (!userId) return [];

  // If the user is not actively signed in with this Firebase Auth UID, use local cache
  if (!auth.currentUser || auth.currentUser.uid !== userId) {
    try {
      const saved =
        localStorage.getItem(`pure_sudh_wishlist_${userId}`) ||
        localStorage.getItem(LOCAL_GUEST_WISHLIST_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map((item: any) =>
            typeof item === 'string' ? item : item.id
          );
        }
      }
    } catch {
      // ignore
    }
    return [];
  }

  try {
    const docRef = doc(db, 'wishlists', userId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as FirestoreWishlistData;
      return Array.isArray(data.productIds) ? data.productIds : [];
    }
  } catch (err) {
    console.warn('Firestore wishlist read note:', err);
  }
  return [];
}

/**
 * Save persistent wishlist to Firestore for authenticated user
 */
export async function saveUserWishlist(userId: string, productIds: string[]): Promise<void> {
  if (!userId) return;

  const uniqueIds = Array.from(new Set(productIds));

  // Always keep local storage cache updated so state survives offline & page refresh
  try {
    localStorage.setItem(
      `pure_sudh_wishlist_${userId}`,
      JSON.stringify(uniqueIds)
    );
  } catch {
    // ignore
  }

  // Only sync to Firestore if user has an active Firebase Auth session matching userId
  if (!auth.currentUser || auth.currentUser.uid !== userId) {
    return;
  }

  const payload: FirestoreWishlistData = {
    id: userId,
    userId,
    productIds: uniqueIds,
    updatedAt: new Date().toISOString(),
  };

  try {
    await setDoc(doc(db, 'wishlists', userId), payload);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `wishlists/${userId}`);
  }
}

/**
 * Safely merge guest wishlist product IDs into customer wishlist upon login
 */
export async function mergeGuestWishlistWithCustomerWishlist(
  userId: string,
  guestProductIds: string[]
): Promise<string[]> {
  if (!userId) return guestProductIds;

  const cloudIds = await fetchUserWishlist(userId);
  const combined = Array.from(new Set([...cloudIds, ...guestProductIds]));

  try {
    await saveUserWishlist(userId, combined);
    localStorage.removeItem(LOCAL_GUEST_WISHLIST_KEY);
  } catch (err) {
    console.warn('Failed to save merged wishlist:', err);
  }

  return combined;
}
