import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { db, auth, assertFirestoreWriteSuccess, OperationType, stripUndefinedFields } from './config';
import {
  Product,
  Category,
  Order,
  OrderStatus,
  DeliveryArea,
  DeliverySlot,
  DeliveryValidationResult,
  Coupon,
  Offer,
  Banner,
  SiteSettings,
  Review,
  UserProfile,
  StaffMember,
  CustomerSummary,
  HomepageConfig,
  BroadcastNotification,
} from '../types';
import {
  initialProducts,
  initialCategories,
  initialDeliveryAreas,
  initialDeliverySlots,
  initialCoupons,
  initialOffers,
  initialBanners,
  initialSiteSettings,
} from '../data/seedData';
import { evaluateDeliveryEligibility } from '../utils/deliveryRules';

// Local storage backup keys for offline resiliency and instant first-load responsiveness
const STORAGE_KEYS = {
  PRODUCTS: 'pure_sudh_products',
  DELETED_PRODUCT_IDS: 'pure_sudh_deleted_product_ids',
  CATEGORIES: 'pure_sudh_categories',
  DELIVERY_AREAS: 'pure_sudh_delivery_areas',
  DELIVERY_SLOTS: 'pure_sudh_delivery_slots',
  COUPONS: 'pure_sudh_coupons',
  OFFERS: 'pure_sudh_offers',
  BANNERS: 'pure_sudh_banners',
  SETTINGS: 'pure_sudh_settings',
  ORDERS: 'pure_sudh_orders',
  REVIEWS: 'pure_sudh_reviews',
  INITIALIZED: 'pure_sudh_db_initialized',
};

function getLocal<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    if (!item || item === 'undefined' || item === 'null') {
      return fallback;
    }
    const parsed = JSON.parse(item);
    if (parsed === null || parsed === undefined) {
      return fallback;
    }
    if (Array.isArray(fallback)) {
      return (Array.isArray(parsed) ? parsed : fallback) as unknown as T;
    }
    return parsed as T;
  } catch {
    return fallback;
  }
}

function setLocal<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn('LocalStorage quota or access warning:', e);
  }
}

// Timeout helper to prevent network delays from hanging UI
async function withTimeout<T>(promise: Promise<T>, ms: number = 10000): Promise<T> {
  let timer: any;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Firestore request timed out after ${ms}ms`)), ms);
  });
  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timer);
    return result;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

// Executes a Firestore write with one automatic ID token refresh retry if a stale token causes permission-denied
async function executeFirestoreWrite(
  writeFn: () => Promise<void>,
  opType: OperationType,
  path: string
): Promise<void> {
  try {
    await writeFn();
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    const isPermissionDenied =
      errMsg.includes('permission-denied') ||
      errMsg.includes('Missing or insufficient permissions');

    if (isPermissionDenied && auth.currentUser) {
      try {
        await auth.currentUser.reload().catch(() => {});
        await auth.currentUser.getIdToken(true);
        await writeFn();
        return;
      } catch (retryErr) {
        assertFirestoreWriteSuccess(retryErr, opType, path);
        return;
      }
    }
    assertFirestoreWriteSuccess(err, opType, path);
  }
}

// Instant synchronous getters for UI initialization (eliminates empty/loading screen flicker)
export function getInitialProducts(): Product[] {
  const deleted = new Set(getLocal<string[]>(STORAGE_KEYS.DELETED_PRODUCT_IDS, []));
  const cached = getLocal<Product[]>(STORAGE_KEYS.PRODUCTS, []);
  if (Array.isArray(cached) && cached.length > 0) {
    const validCached = cached.filter((p) => !deleted.has(p.id));
    return validCached;
  }
  // If not cached, initialize from initialProducts excluding any deleted IDs
  const filtered = initialProducts.filter((p) => !deleted.has(p.id));
  setLocal(STORAGE_KEYS.PRODUCTS, filtered);
  return filtered;
}

export function getInitialCategories(): Category[] {
  setLocal(STORAGE_KEYS.CATEGORIES, initialCategories);
  return initialCategories;
}

export function getInitialDeliveryAreas(): DeliveryArea[] {
  return getLocal<DeliveryArea[]>(STORAGE_KEYS.DELIVERY_AREAS, initialDeliveryAreas);
}

export function getInitialCoupons(): Coupon[] {
  return getLocal<Coupon[]>(STORAGE_KEYS.COUPONS, initialCoupons);
}

export function getInitialBanners(): Banner[] {
  return getLocal<Banner[]>(STORAGE_KEYS.BANNERS, initialBanners);
}

export function getInitialSiteSettings(): SiteSettings {
  return getLocal<SiteSettings>(STORAGE_KEYS.SETTINGS, initialSiteSettings);
}

// Check and seed initial collections if needed (non-blocking)
export async function initializeDatabase(): Promise<void> {
  try {
    const alreadyInitialized = localStorage.getItem(STORAGE_KEYS.INITIALIZED);
    if (!alreadyInitialized) {
      // Seed local storage cache first for instant zero-latency UI
      setLocal(STORAGE_KEYS.PRODUCTS, initialProducts);
      setLocal(STORAGE_KEYS.CATEGORIES, initialCategories);
      setLocal(STORAGE_KEYS.DELIVERY_AREAS, initialDeliveryAreas);
      setLocal(STORAGE_KEYS.COUPONS, initialCoupons);
      setLocal(STORAGE_KEYS.BANNERS, initialBanners);
      setLocal(STORAGE_KEYS.OFFERS, initialOffers);
      setLocal(STORAGE_KEYS.SETTINGS, initialSiteSettings);
      localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');

      // If already authenticated with write rights, sync catalog
      if (auth.currentUser) {
        Promise.allSettled([
          ...initialProducts.map((p) => setDoc(doc(db, 'products', p.id), stripUndefinedFields(p), { merge: true })),
          ...initialCategories.map((c) => setDoc(doc(db, 'categories', c.id), stripUndefinedFields(c), { merge: true })),
          ...initialDeliveryAreas.map((a) => setDoc(doc(db, 'deliveryAreas', a.id), stripUndefinedFields(a), { merge: true })),
          ...initialCoupons.map((cp) => setDoc(doc(db, 'coupons', cp.id), stripUndefinedFields(cp), { merge: true })),
          ...initialBanners.map((b) => setDoc(doc(db, 'banners', b.id), stripUndefinedFields(b), { merge: true })),
          ...initialOffers.map((o) => setDoc(doc(db, 'offers', o.id), stripUndefinedFields(o), { merge: true })),
          setDoc(doc(db, 'settings', 'site_settings'), stripUndefinedFields(initialSiteSettings), { merge: true }),
        ]).catch(() => {});
      }
    }
  } catch (err) {
    console.warn('Firestore initial seeding note:', err);
  }
}

/* ================= IN-MEMORY CACHE TO OPTIMIZE FIRESTORE READS ================= */
const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes cache to prevent redundant reads

interface CacheSlot<T> {
  data: T | null;
  timestamp: number;
}

const serviceCache = {
  products: { data: null, timestamp: 0 } as CacheSlot<Product[]>,
  categories: { data: null, timestamp: 0 } as CacheSlot<Category[]>,
  deliveryAreas: { data: null, timestamp: 0 } as CacheSlot<DeliveryArea[]>,
  deliverySlots: { data: null, timestamp: 0 } as CacheSlot<DeliverySlot[]>,
  coupons: { data: null, timestamp: 0 } as CacheSlot<Coupon[]>,
  banners: { data: null, timestamp: 0 } as CacheSlot<Banner[]>,
  offers: { data: null, timestamp: 0 } as CacheSlot<Offer[]>,
  settings: { data: null, timestamp: 0 } as CacheSlot<SiteSettings>,
};

export function invalidateServiceCache(domain?: keyof typeof serviceCache) {
  if (domain && serviceCache[domain]) {
    serviceCache[domain].timestamp = 0;
  } else {
    Object.keys(serviceCache).forEach((k) => {
      (serviceCache as any)[k].timestamp = 0;
    });
  }
}

/* ================= PRODUCTS ================= */
export async function fetchProducts(forceRefresh: boolean = false): Promise<Product[]> {
  const now = Date.now();
  if (!forceRefresh && serviceCache.products.data && now - serviceCache.products.timestamp < CACHE_TTL_MS) {
    return serviceCache.products.data;
  }

  const deleted = new Set(getLocal<string[]>(STORAGE_KEYS.DELETED_PRODUCT_IDS, []));
  try {
    const colRef = collection(db, 'products');
    const snapshot = await withTimeout(getDocs(colRef));
    if (!snapshot.empty) {
      const items = snapshot.docs
        .map((d) => ({ id: d.id, ...d.data() } as Product))
        .filter((p) => !deleted.has(p.id));
      setLocal(STORAGE_KEYS.PRODUCTS, items);
      serviceCache.products = { data: items, timestamp: now };
      return items;
    }
  } catch (e) {
    console.warn('Firestore products fetch fallback to local:', e);
  }
  const localItems = getLocal<Product[]>(STORAGE_KEYS.PRODUCTS, initialProducts).filter((p) => !deleted.has(p.id));
  serviceCache.products = { data: localItems, timestamp: now };
  return localItems;
}

export async function saveProduct(product: Product): Promise<void> {
  serviceCache.products.timestamp = 0;
  const cleanProduct = stripUndefinedFields(product);

  await executeFirestoreWrite(
    () => setDoc(doc(db, 'products', product.id), cleanProduct, { merge: true }),
    OperationType.WRITE,
    `products/${product.id}`
  );

  const deleted = getLocal<string[]>(STORAGE_KEYS.DELETED_PRODUCT_IDS, []);
  if (deleted.includes(product.id)) {
    setLocal(STORAGE_KEYS.DELETED_PRODUCT_IDS, deleted.filter((id) => id !== product.id));
  }

  const all = getLocal<Product[]>(STORAGE_KEYS.PRODUCTS, initialProducts);
  const index = all.findIndex((p) => p.id === product.id);
  if (index >= 0) {
    all[index] = cleanProduct;
  } else {
    all.unshift(cleanProduct);
  }
  setLocal(STORAGE_KEYS.PRODUCTS, all);
}

export async function deleteProduct(productId: string): Promise<void> {
  serviceCache.products.timestamp = 0;

  await executeFirestoreWrite(
    () => deleteDoc(doc(db, 'products', productId)),
    OperationType.DELETE,
    `products/${productId}`
  );

  const deleted = getLocal<string[]>(STORAGE_KEYS.DELETED_PRODUCT_IDS, []);
  if (!deleted.includes(productId)) {
    deleted.push(productId);
    setLocal(STORAGE_KEYS.DELETED_PRODUCT_IDS, deleted);
  }

  const all = getLocal<Product[]>(STORAGE_KEYS.PRODUCTS, initialProducts).filter(
    (p) => p.id !== productId && !deleted.includes(p.id)
  );
  setLocal(STORAGE_KEYS.PRODUCTS, all);
}

/* ================= CATEGORIES ================= */
export async function fetchCategories(forceRefresh: boolean = false): Promise<Category[]> {
  const now = Date.now();
  if (!forceRefresh && serviceCache.categories.data && now - serviceCache.categories.timestamp < CACHE_TTL_MS) {
    return serviceCache.categories.data;
  }

  try {
    const colRef = collection(db, 'categories');
    const snapshot = await withTimeout(getDocs(colRef));
    if (!snapshot.empty) {
      const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Category));
      const sorted = items.sort((a, b) => a.displayOrder - b.displayOrder);
      setLocal(STORAGE_KEYS.CATEGORIES, sorted);
      serviceCache.categories = { data: sorted, timestamp: now };
      return sorted;
    }
  } catch (e) {
    console.warn('Firestore categories fallback:', e);
  }
  const local = getLocal<Category[]>(STORAGE_KEYS.CATEGORIES, initialCategories);
  serviceCache.categories = { data: local, timestamp: now };
  return local;
}

export async function saveCategory(category: Category): Promise<void> {
  serviceCache.categories.timestamp = 0;
  const cleanCategory = stripUndefinedFields(category);
  await executeFirestoreWrite(
    () => setDoc(doc(db, 'categories', category.id), cleanCategory, { merge: true }),
    OperationType.WRITE,
    `categories/${category.id}`
  );
  const all = getLocal<Category[]>(STORAGE_KEYS.CATEGORIES, initialCategories);
  const idx = all.findIndex((c) => c.id === category.id);
  if (idx >= 0) {
    all[idx] = cleanCategory;
  } else {
    all.push(cleanCategory);
  }
  setLocal(STORAGE_KEYS.CATEGORIES, all);
}

export async function deleteCategory(categoryId: string): Promise<void> {
  serviceCache.categories.timestamp = 0;
  await executeFirestoreWrite(
    () => deleteDoc(doc(db, 'categories', categoryId)),
    OperationType.DELETE,
    `categories/${categoryId}`
  );
  const all = getLocal<Category[]>(STORAGE_KEYS.CATEGORIES, initialCategories).filter((c) => c.id !== categoryId);
  setLocal(STORAGE_KEYS.CATEGORIES, all);
}

/* ================= DELIVERY AREAS ================= */
export async function fetchDeliveryAreas(forceRefresh: boolean = false): Promise<DeliveryArea[]> {
  const now = Date.now();
  if (!forceRefresh && serviceCache.deliveryAreas.data && now - serviceCache.deliveryAreas.timestamp < CACHE_TTL_MS) {
    return serviceCache.deliveryAreas.data;
  }

  try {
    const colRef = collection(db, 'deliveryAreas');
    const snapshot = await withTimeout(getDocs(colRef));
    if (!snapshot.empty) {
      const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as DeliveryArea));
      setLocal(STORAGE_KEYS.DELIVERY_AREAS, items);
      serviceCache.deliveryAreas = { data: items, timestamp: now };
      return items;
    }
  } catch (e) {
    console.warn('Firestore delivery areas fallback:', e);
  }
  const local = getLocal<DeliveryArea[]>(STORAGE_KEYS.DELIVERY_AREAS, initialDeliveryAreas);
  serviceCache.deliveryAreas = { data: local, timestamp: now };
  return local;
}

export async function saveDeliveryArea(area: DeliveryArea): Promise<void> {
  serviceCache.deliveryAreas.timestamp = 0;
  const cleanArea = stripUndefinedFields(area);
  await executeFirestoreWrite(
    () => setDoc(doc(db, 'deliveryAreas', area.id), cleanArea, { merge: true }),
    OperationType.WRITE,
    `deliveryAreas/${area.id}`
  );
  const all = getLocal<DeliveryArea[]>(STORAGE_KEYS.DELIVERY_AREAS, initialDeliveryAreas);
  const idx = all.findIndex((a) => a.id === area.id);
  if (idx >= 0) {
    all[idx] = cleanArea;
  } else {
    all.push(cleanArea);
  }
  setLocal(STORAGE_KEYS.DELIVERY_AREAS, all);
}

export async function deleteDeliveryArea(id: string): Promise<void> {
  serviceCache.deliveryAreas.timestamp = 0;
  await executeFirestoreWrite(
    () => deleteDoc(doc(db, 'deliveryAreas', id)),
    OperationType.DELETE,
    `deliveryAreas/${id}`
  );
  const all = getLocal<DeliveryArea[]>(STORAGE_KEYS.DELIVERY_AREAS, initialDeliveryAreas).filter((a) => a.id !== id);
  setLocal(STORAGE_KEYS.DELIVERY_AREAS, all);
}

/* ================= DELIVERY SLOTS ================= */
export async function fetchDeliverySlots(vendorId?: string, forceRefresh: boolean = false): Promise<DeliverySlot[]> {
  const now = Date.now();
  if (!forceRefresh && serviceCache.deliverySlots.data && now - serviceCache.deliverySlots.timestamp < CACHE_TTL_MS) {
    const cached = serviceCache.deliverySlots.data;
    if (vendorId && vendorId !== 'all') {
      return cached.filter((s) => !s.vendorId || s.vendorId === 'all' || s.vendorId === vendorId);
    }
    return cached;
  }

  try {
    const colRef = collection(db, 'deliverySlots');
    const snapshot = await withTimeout(getDocs(colRef));
    if (!snapshot.empty) {
      const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as DeliverySlot));
      setLocal(STORAGE_KEYS.DELIVERY_SLOTS, items);
      serviceCache.deliverySlots = { data: items, timestamp: now };
      if (vendorId && vendorId !== 'all') {
        return items.filter((s) => !s.vendorId || s.vendorId === 'all' || s.vendorId === vendorId);
      }
      return items;
    }
  } catch (e) {
    console.warn('Firestore delivery slots fallback:', e);
  }
  const localSlots = getLocal<DeliverySlot[]>(STORAGE_KEYS.DELIVERY_SLOTS, initialDeliverySlots);
  serviceCache.deliverySlots = { data: localSlots, timestamp: now };
  if (vendorId && vendorId !== 'all') {
    return localSlots.filter((s) => !s.vendorId || s.vendorId === 'all' || s.vendorId === vendorId);
  }
  return localSlots;
}

export async function saveDeliverySlot(slot: DeliverySlot): Promise<void> {
  serviceCache.deliverySlots.timestamp = 0;
  const cleanSlot = stripUndefinedFields(slot);
  await executeFirestoreWrite(
    () => setDoc(doc(db, 'deliverySlots', slot.id), cleanSlot, { merge: true }),
    OperationType.WRITE,
    `deliverySlots/${slot.id}`
  );
  const all = getLocal<DeliverySlot[]>(STORAGE_KEYS.DELIVERY_SLOTS, initialDeliverySlots);
  const idx = all.findIndex((s) => s.id === slot.id);
  if (idx >= 0) {
    all[idx] = cleanSlot;
  } else {
    all.push(cleanSlot);
  }
  setLocal(STORAGE_KEYS.DELIVERY_SLOTS, all);
}

export async function deleteDeliverySlot(id: string): Promise<void> {
  serviceCache.deliverySlots.timestamp = 0;
  await executeFirestoreWrite(
    () => deleteDoc(doc(db, 'deliverySlots', id)),
    OperationType.DELETE,
    `deliverySlots/${id}`
  );
  const all = getLocal<DeliverySlot[]>(STORAGE_KEYS.DELIVERY_SLOTS, initialDeliverySlots).filter((s) => s.id !== id);
  setLocal(STORAGE_KEYS.DELIVERY_SLOTS, all);
}

/**
 * Secure Cloud Function validation for delivery availability.
 * Calls backend API with complete delivery rules validation and falls back
 * to local evaluation if network is offline or backend is unreachable.
 */
export async function validateDeliveryAvailability(
  pincode: string,
  options?: { cartSubtotal?: number; vendorId?: string }
): Promise<DeliveryValidationResult> {
  const cleanPin = pincode.replace(/\D/g, '').trim();
  const subtotal = options?.cartSubtotal ?? 0;
  const vendorId = options?.vendorId;

  try {
    const res = await fetch('/api/delivery/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pincode: cleanPin,
        cartSubtotal: subtotal,
        vendorId,
      }),
    });

    const ct = res.headers.get('content-type') || '';
    if (res.ok && ct.includes('application/json')) {
      const data = await res.json();
      return data as DeliveryValidationResult;
    }
  } catch {
    // Fall back to client-side rule evaluation with local/cached Firestore delivery areas
  }

  // Fallback using cached delivery areas & slots
  const areas = await fetchDeliveryAreas();
  const slots = await fetchDeliverySlots(vendorId);
  return evaluateDeliveryEligibility(cleanPin, areas, subtotal, vendorId, slots);
}

/* ================= COUPONS ================= */
export async function fetchCoupons(forceRefresh: boolean = false): Promise<Coupon[]> {
  const now = Date.now();
  if (!forceRefresh && serviceCache.coupons.data && now - serviceCache.coupons.timestamp < CACHE_TTL_MS) {
    return serviceCache.coupons.data;
  }

  try {
    const colRef = collection(db, 'coupons');
    const snapshot = await withTimeout(getDocs(colRef));
    if (!snapshot.empty) {
      const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Coupon));
      setLocal(STORAGE_KEYS.COUPONS, items);
      serviceCache.coupons = { data: items, timestamp: now };
      return items;
    }
  } catch (e) {
    console.warn('Firestore coupons fallback:', e);
  }
  const local = getLocal<Coupon[]>(STORAGE_KEYS.COUPONS, initialCoupons);
  serviceCache.coupons = { data: local, timestamp: now };
  return local;
}

export async function saveCoupon(coupon: Coupon): Promise<void> {
  serviceCache.coupons.timestamp = 0;
  const cleanCoupon = stripUndefinedFields(coupon);
  await executeFirestoreWrite(
    () => setDoc(doc(db, 'coupons', coupon.id), cleanCoupon, { merge: true }),
    OperationType.WRITE,
    `coupons/${coupon.id}`
  );
  const all = getLocal<Coupon[]>(STORAGE_KEYS.COUPONS, initialCoupons);
  const idx = all.findIndex((c) => c.id === coupon.id);
  if (idx >= 0) {
    all[idx] = cleanCoupon;
  } else {
    all.push(cleanCoupon);
  }
  setLocal(STORAGE_KEYS.COUPONS, all);
}

export async function deleteCoupon(id: string): Promise<void> {
  serviceCache.coupons.timestamp = 0;
  await executeFirestoreWrite(
    () => deleteDoc(doc(db, 'coupons', id)),
    OperationType.DELETE,
    `coupons/${id}`
  );
  const all = getLocal<Coupon[]>(STORAGE_KEYS.COUPONS, initialCoupons).filter((c) => c.id !== id);
  setLocal(STORAGE_KEYS.COUPONS, all);
}

export async function toggleCouponStatus(id: string, active: boolean): Promise<void> {
  serviceCache.coupons.timestamp = 0;
  await executeFirestoreWrite(
    () => updateDoc(doc(db, 'coupons', id), { active, updatedAt: new Date().toISOString() }),
    OperationType.UPDATE,
    `coupons/${id}`
  );
  const all = getLocal<Coupon[]>(STORAGE_KEYS.COUPONS, initialCoupons);
  const coupon = all.find((c) => c.id === id);
  if (coupon) {
    coupon.active = active;
    setLocal(STORAGE_KEYS.COUPONS, all);
  }
}

/* ================= BANNERS ================= */
export async function fetchBanners(forceRefresh: boolean = false): Promise<Banner[]> {
  const now = Date.now();
  if (!forceRefresh && serviceCache.banners.data && now - serviceCache.banners.timestamp < CACHE_TTL_MS) {
    return serviceCache.banners.data;
  }

  try {
    const colRef = collection(db, 'banners');
    const snapshot = await withTimeout(getDocs(colRef));
    if (!snapshot.empty) {
      const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Banner));
      setLocal(STORAGE_KEYS.BANNERS, items);
      serviceCache.banners = { data: items, timestamp: now };
      return items;
    }
  } catch (e) {
    console.warn('Firestore banners fallback:', e);
  }
  const local = getLocal<Banner[]>(STORAGE_KEYS.BANNERS, initialBanners);
  serviceCache.banners = { data: local, timestamp: now };
  return local;
}

export const fetchOfferBanners = fetchBanners;

export async function saveBanner(banner: Banner): Promise<void> {
  serviceCache.banners.timestamp = 0;
  const cleanBanner = stripUndefinedFields(banner);
  await executeFirestoreWrite(
    () => setDoc(doc(db, 'banners', banner.id), cleanBanner, { merge: true }),
    OperationType.WRITE,
    `banners/${banner.id}`
  );
  const all = getLocal<Banner[]>(STORAGE_KEYS.BANNERS, initialBanners);
  const idx = all.findIndex((b) => b.id === banner.id);
  if (idx >= 0) {
    all[idx] = cleanBanner;
  } else {
    all.push(cleanBanner);
  }
  setLocal(STORAGE_KEYS.BANNERS, all);
}

export async function deleteBanner(id: string): Promise<void> {
  serviceCache.banners.timestamp = 0;
  await executeFirestoreWrite(
    () => deleteDoc(doc(db, 'banners', id)),
    OperationType.DELETE,
    `banners/${id}`
  );
  const all = getLocal<Banner[]>(STORAGE_KEYS.BANNERS, initialBanners).filter((b) => b.id !== id);
  setLocal(STORAGE_KEYS.BANNERS, all);
}

/* ================= OFFERS ================= */
export function getInitialOffers(): Offer[] {
  return getLocal<Offer[]>(STORAGE_KEYS.OFFERS, initialOffers);
}

export async function fetchOffers(forceRefresh: boolean = false): Promise<Offer[]> {
  const now = Date.now();
  if (!forceRefresh && serviceCache.offers.data && now - serviceCache.offers.timestamp < CACHE_TTL_MS) {
    return serviceCache.offers.data;
  }

  try {
    const colRef = collection(db, 'offers');
    const snapshot = await withTimeout(getDocs(colRef));
    if (!snapshot.empty) {
      const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Offer));
      setLocal(STORAGE_KEYS.OFFERS, items);
      serviceCache.offers = { data: items, timestamp: now };
      return items;
    }
  } catch (e) {
    console.warn('Firestore offers fallback:', e);
  }
  const local = getLocal<Offer[]>(STORAGE_KEYS.OFFERS, initialOffers);
  serviceCache.offers = { data: local, timestamp: now };
  return local;
}

export async function saveOffer(offer: Offer): Promise<void> {
  serviceCache.offers.timestamp = 0;
  const cleanOffer = stripUndefinedFields(offer);
  await executeFirestoreWrite(
    () => setDoc(doc(db, 'offers', offer.id), cleanOffer, { merge: true }),
    OperationType.WRITE,
    `offers/${offer.id}`
  );
  const all = getLocal<Offer[]>(STORAGE_KEYS.OFFERS, initialOffers);
  const idx = all.findIndex((o) => o.id === offer.id);
  if (idx >= 0) {
    all[idx] = cleanOffer;
  } else {
    all.push(cleanOffer);
  }
  setLocal(STORAGE_KEYS.OFFERS, all);
}

export async function deleteOffer(id: string): Promise<void> {
  serviceCache.offers.timestamp = 0;
  await executeFirestoreWrite(
    () => deleteDoc(doc(db, 'offers', id)),
    OperationType.DELETE,
    `offers/${id}`
  );
  const all = getLocal<Offer[]>(STORAGE_KEYS.OFFERS, initialOffers).filter((o) => o.id !== id);
  setLocal(STORAGE_KEYS.OFFERS, all);
}

export async function toggleOfferStatus(id: string, active: boolean): Promise<void> {
  serviceCache.offers.timestamp = 0;
  await executeFirestoreWrite(
    () => updateDoc(doc(db, 'offers', id), { active, updatedAt: new Date().toISOString() }),
    OperationType.UPDATE,
    `offers/${id}`
  );
  const all = getLocal<Offer[]>(STORAGE_KEYS.OFFERS, initialOffers);
  const offer = all.find((o) => o.id === id);
  if (offer) {
    offer.active = active;
    setLocal(STORAGE_KEYS.OFFERS, all);
  }
}

/* ================= SITE SETTINGS ================= */
export async function fetchSiteSettings(forceRefresh: boolean = false): Promise<SiteSettings> {
  const now = Date.now();
  if (!forceRefresh && serviceCache.settings.data && now - serviceCache.settings.timestamp < CACHE_TTL_MS) {
    return serviceCache.settings.data;
  }

  try {
    const docRef = doc(db, 'settings', 'site_settings');
    const docSnap = await withTimeout(getDoc(docRef));
    if (docSnap.exists()) {
      const data = { id: docSnap.id, ...docSnap.data() } as SiteSettings;
      setLocal(STORAGE_KEYS.SETTINGS, data);
      serviceCache.settings = { data: data, timestamp: now };
      return data;
    }
  } catch (e) {
    console.warn('Firestore settings fallback:', e);
  }
  const local = getLocal<SiteSettings>(STORAGE_KEYS.SETTINGS, initialSiteSettings);
  serviceCache.settings = { data: local, timestamp: now };
  return local;
}

export async function saveSiteSettings(settings: SiteSettings): Promise<void> {
  serviceCache.settings.timestamp = 0;
  const cleanSettings = stripUndefinedFields(settings);
  await executeFirestoreWrite(
    () => setDoc(doc(db, 'settings', 'site_settings'), cleanSettings, { merge: true }),
    OperationType.WRITE,
    'settings/site_settings'
  );
  setLocal(STORAGE_KEYS.SETTINGS, cleanSettings);
}

/* ================= ORDERS ================= */
export const initialSampleOrders: Order[] = [];

export async function fetchAllOrders(): Promise<Order[]> {
  try {
    const colRef = collection(db, 'orders');
    const q = query(colRef, orderBy('createdAt', 'desc'));
    const snapshot = await withTimeout(getDocs(q));
    const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Order));
    setLocal(STORAGE_KEYS.ORDERS, items);
    return items;
  } catch (e) {
    console.warn('Firestore orders fallback:', e);
  }
  return getLocal<Order[]>(STORAGE_KEYS.ORDERS, []);
}

export async function fetchUserOrders(customerId: string): Promise<Order[]> {
  if (!customerId) return [];
  try {
    const colRef = collection(db, 'orders');
    const q = query(colRef, where('customerId', '==', customerId), orderBy('createdAt', 'desc'));
    const snapshot = await withTimeout(getDocs(q));
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Order));
  } catch (e) {
    console.warn('Firestore user orders fallback:', e);
  }
  const all = getLocal<Order[]>(STORAGE_KEYS.ORDERS, []);
  return all.filter((o) => o.customerId === customerId);
}

export async function fetchOrderById(orderIdOrPhone: string): Promise<Order | null> {
  const rawQuery = (orderIdOrPhone || '').trim();
  if (!rawQuery) return null;
  const clean = rawQuery.toLowerCase();
  const digitsOnly = rawQuery.replace(/\D/g, '');

  try {
    const docRef = doc(db, 'orders', rawQuery);
    const docSnap = await withTimeout(getDoc(docRef));
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Order;
    }
    const orderNumSnap = await withTimeout(
      getDocs(query(collection(db, 'orders'), where('orderNumber', '==', rawQuery.toUpperCase())))
    );
    if (!orderNumSnap.empty) {
      const first = orderNumSnap.docs[0];
      return { id: first.id, ...first.data() } as Order;
    }
  } catch (e) {
    console.warn('Firestore order by ID error:', e);
  }

  const all = getLocal<Order[]>(STORAGE_KEYS.ORDERS, []);

  const byIdOrNum = all.find(
    (o) =>
      o.id.toLowerCase() === clean ||
      o.orderNumber.toLowerCase() === clean ||
      o.orderNumber.toLowerCase().replace(/[^a-z0-9]/g, '') === clean.replace(/[^a-z0-9]/g, '')
  );
  if (byIdOrNum) return byIdOrNum;

  if (digitsOnly.length >= 10) {
    const target10 = digitsOnly.slice(-10);
    const byPhone = all.find((o) => (o.customerPhone || '').replace(/\D/g, '').endsWith(target10));
    if (byPhone) return byPhone;
  }

  return null;
}

export async function createOrder(order: Order): Promise<Order> {
  const cleanOrder = stripUndefinedFields(order);
  await executeFirestoreWrite(
    () => setDoc(doc(db, 'orders', order.id), cleanOrder),
    OperationType.CREATE,
    `orders/${order.id}`
  );

  const all = getLocal<Order[]>(STORAGE_KEYS.ORDERS, []);
  all.unshift(order);
  setLocal(STORAGE_KEYS.ORDERS, all);

  // Deduct inventory stock for ordered items
  try {
    const products = getLocal<Product[]>(STORAGE_KEYS.PRODUCTS, initialProducts);
    for (const item of order.items || []) {
      const prod = products.find((p) => p.id === item.productId);
      if (prod) {
        prod.stockQuantity = Math.max(0, (prod.stockQuantity ?? 0) - item.quantity);
        if (prod.stockQuantity === 0) {
          prod.availability = false;
        }
        await saveProduct(prod);
      }
    }
  } catch (e) {
    console.warn('Inventory deduction error:', e);
  }

  return order;
}

export async function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
  note?: string
): Promise<void> {
  const now = new Date().toISOString();
  const historyEntry = {
    status: newStatus,
    timestamp: now,
    note: note || `Status updated to ${newStatus}`,
  };

  const all = getLocal<Order[]>(STORAGE_KEYS.ORDERS, []);
  const order = all.find((o) => o.id === orderId);
  let updatedHistory = order?.statusHistory ? [...order.statusHistory, historyEntry] : [historyEntry];

  await executeFirestoreWrite(async () => {
    const docRef = doc(db, 'orders', orderId);
    if (!order) {
      const snap = await withTimeout(getDoc(docRef));
      if (snap.exists()) {
        const remoteHistory = (snap.data() as Partial<Order>)?.statusHistory;
        if (Array.isArray(remoteHistory)) {
          updatedHistory = [...remoteHistory, historyEntry];
        }
      }
    }
    await updateDoc(docRef, {
      status: newStatus,
      updatedAt: now,
      statusHistory: updatedHistory,
    });
  }, OperationType.UPDATE, `orders/${orderId}`);

  if (order) {
    order.status = newStatus;
    order.updatedAt = now;
    order.statusHistory = updatedHistory;
    setLocal(STORAGE_KEYS.ORDERS, all);
  }
}

/* ================= REVIEWS ================= */
export async function fetchProductReviews(productId: string): Promise<Review[]> {
  try {
    const colRef = collection(db, 'reviews');
    const q = query(colRef, where('productId', '==', productId));
    const snapshot = await withTimeout(getDocs(q));
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Review));
  } catch (e) {
    console.warn('Firestore reviews fallback:', e);
  }
  const all = getLocal<Review[]>(STORAGE_KEYS.REVIEWS, []);
  return all.filter((r) => r.productId === productId && r.status === 'approved');
}

export async function fetchAllReviews(): Promise<Review[]> {
  try {
    const colRef = collection(db, 'reviews');
    const snapshot = await withTimeout(getDocs(colRef));
    const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Review));
    setLocal(STORAGE_KEYS.REVIEWS, items);
    return items;
  } catch (e) {
    console.warn('Firestore all reviews fallback:', e);
  }
  return getLocal<Review[]>(STORAGE_KEYS.REVIEWS, []);
}

export async function addProductReview(review: Review): Promise<void> {
  const cleanReview = stripUndefinedFields(review);
  await executeFirestoreWrite(
    () => setDoc(doc(db, 'reviews', review.id), cleanReview),
    OperationType.CREATE,
    `reviews/${review.id}`
  );
  const all = getLocal<Review[]>(STORAGE_KEYS.REVIEWS, []);
  all.unshift(cleanReview);
  setLocal(STORAGE_KEYS.REVIEWS, all);
}

export async function deleteProductReview(reviewId: string): Promise<void> {
  await executeFirestoreWrite(
    () => deleteDoc(doc(db, 'reviews', reviewId)),
    OperationType.DELETE,
    `reviews/${reviewId}`
  );
  const all = getLocal<Review[]>(STORAGE_KEYS.REVIEWS, []).filter((r) => r.id !== reviewId);
  setLocal(STORAGE_KEYS.REVIEWS, all);
}

export async function updateProductReview(review: Review): Promise<void> {
  const cleanReview = stripUndefinedFields(review);
  await executeFirestoreWrite(
    () => setDoc(doc(db, 'reviews', review.id), cleanReview, { merge: true }),
    OperationType.UPDATE,
    `reviews/${review.id}`
  );
  const all = getLocal<Review[]>(STORAGE_KEYS.REVIEWS, []);
  const idx = all.findIndex((r) => r.id === review.id);
  if (idx >= 0) {
    all[idx] = cleanReview;
  } else {
    all.unshift(cleanReview);
  }
  setLocal(STORAGE_KEYS.REVIEWS, all);
}

/* ================= USER PROFILES ================= */
export async function fetchUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const docRef = doc(db, 'users', uid);
    const snap = await withTimeout(getDoc(docRef));
    if (snap.exists()) {
      const data = snap.data() as Partial<UserProfile>;
      return {
        id: snap.id,
        uid: snap.id,
        email: data.email || '',
        displayName: data.displayName || 'Customer',
        role: data.role || 'customer',
        createdAt: data.createdAt || new Date().toISOString(),
        ...data,
        addresses: Array.isArray(data.addresses) ? data.addresses : [],
      } as UserProfile;
    }
  } catch (e) {
    console.warn('Firestore profile fetch fallback:', e);
  }
  const profiles = getLocal<Record<string, UserProfile>>('pure_sudh_user_profiles', {});
  const localProf = profiles[uid] || null;
  if (localProf) {
    return {
      ...localProf,
      addresses: Array.isArray(localProf.addresses) ? localProf.addresses : [],
    };
  }
  return null;
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  const cleanProfile = stripUndefinedFields(profile);
  await executeFirestoreWrite(
    () => setDoc(doc(db, 'users', profile.uid), cleanProfile, { merge: true }),
    OperationType.WRITE,
    `users/${profile.uid}`
  );
  const profiles = getLocal<Record<string, UserProfile>>('pure_sudh_user_profiles', {});
  profiles[profile.uid] = cleanProfile;
  setLocal('pure_sudh_user_profiles', profiles);
}

/* ================= CUSTOMERS MANAGEMENT ================= */
export const initialCustomers: CustomerSummary[] = [];

export async function fetchCustomers(): Promise<CustomerSummary[]> {
  try {
    const colRef = collection(db, 'users');
    const snap = await withTimeout(getDocs(colRef));
    const orders = await fetchAllOrders();
    const fetched: CustomerSummary[] = [];
    snap.docs.forEach((d) => {
      const data = d.data() as Partial<UserProfile>;
      if (data.role === 'customer' || !data.role) {
        const userOrders = orders.filter((o) => o.customerId === d.id || (data.email && o.customerEmail === data.email));
        const totalSpent = userOrders.reduce((s, o) => {
          const normStatus = String(o.status || '').toUpperCase();
          return normStatus === 'CANCELLED' || normStatus === 'REFUNDED' ? s : s + (o.total || 0);
        }, 0);
        fetched.push({
          id: d.id,
          uid: d.id,
          displayName: data.displayName || 'Customer',
          email: data.email || '',
          phone: data.phone || '',
          role: data.role || 'customer',
          status: (data as any).status || 'active',
          totalOrders: userOrders.length,
          totalSpent,
          lastOrderDate: userOrders[0]?.createdAt,
          createdAt: data.createdAt || new Date().toISOString(),
          addresses: data.addresses,
        });
      }
    });
    setLocal('pure_sudh_admin_customers', fetched);
    return fetched;
  } catch (e) {
    console.warn('Firestore fetchCustomers fallback:', e);
  }
  return getLocal<CustomerSummary[]>('pure_sudh_admin_customers', []);
}

export async function updateCustomerStatus(customerId: string, status: 'active' | 'suspended' | 'blocked'): Promise<void> {
  await executeFirestoreWrite(
    () => updateDoc(doc(db, 'users', customerId), { status, updatedAt: new Date().toISOString() }),
    OperationType.UPDATE,
    `users/${customerId}`
  );
  const all = getLocal<CustomerSummary[]>('pure_sudh_admin_customers', []);
  const idx = all.findIndex((c) => c.id === customerId || c.uid === customerId);
  if (idx >= 0) {
    all[idx].status = status;
    setLocal('pure_sudh_admin_customers', all);
  }
}

/* ================= STAFF MANAGEMENT ================= */
export const initialStaff: StaffMember[] = [];

export async function fetchStaffMembers(): Promise<StaffMember[]> {
  try {
    const colRef = collection(db, 'staff');
    const snap = await withTimeout(getDocs(colRef));
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as StaffMember));
    setLocal('pure_sudh_admin_staff', items);
    return items;
  } catch (e) {
    console.warn('Firestore fetchStaff fallback:', e);
  }
  return getLocal<StaffMember[]>('pure_sudh_admin_staff', []);
}

export async function saveStaffMember(staff: StaffMember): Promise<void> {
  const cleanStaff = stripUndefinedFields(staff);
  await executeFirestoreWrite(
    () => setDoc(doc(db, 'staff', staff.id), cleanStaff, { merge: true }),
    OperationType.WRITE,
    `staff/${staff.id}`
  );
  const all = getLocal<StaffMember[]>('pure_sudh_admin_staff', []);
  const idx = all.findIndex((s) => s.id === staff.id);
  if (idx >= 0) {
    all[idx] = cleanStaff;
  } else {
    all.unshift(cleanStaff);
  }
  setLocal('pure_sudh_admin_staff', all);
}

export async function deleteStaffMember(staffId: string): Promise<void> {
  await executeFirestoreWrite(
    () => deleteDoc(doc(db, 'staff', staffId)),
    OperationType.DELETE,
    `staff/${staffId}`
  );
  const all = getLocal<StaffMember[]>('pure_sudh_admin_staff', []).filter((s) => s.id !== staffId);
  setLocal('pure_sudh_admin_staff', all);
}

export async function toggleStaffStatus(staffId: string, active: boolean): Promise<void> {
  await executeFirestoreWrite(
    () => updateDoc(doc(db, 'staff', staffId), { active, updatedAt: new Date().toISOString() }),
    OperationType.UPDATE,
    `staff/${staffId}`
  );
  const all = getLocal<StaffMember[]>('pure_sudh_admin_staff', []);
  const idx = all.findIndex((s) => s.id === staffId);
  if (idx >= 0) {
    all[idx].active = active;
    setLocal('pure_sudh_admin_staff', all);
  }
}

/* ================= HOMEPAGE CONFIGURATION ================= */
export const initialHomepageConfig: HomepageConfig = {
  id: 'main',
  heroBannerIds: ['ban-1', 'ban-2'],
  featuredCategoryIds: ['cat-thekua', 'cat-paneer', 'cat-ghee', 'cat-dahi', 'cat-sweets', 'cat-khasta'],
  featuredProductIds: ['prod-thekua-traditional', 'prod-fresh-paneer', 'prod-pure-ghee', 'prod-claypot-dahi'],
  bestsellerProductIds: ['prod-pure-ghee', 'prod-thekua-traditional', 'prod-fresh-paneer', 'prod-peda-authentic'],
  activeOfferIds: ['ofr-1', 'ofr-2', 'ofr-3'],
  announcementText: '⚡ Pure Food • Pure Quality • Pure Trust - 30-Min Fast Delivery Across Patna!',
  updatedAt: new Date().toISOString(),
};

export async function fetchHomepageConfig(): Promise<HomepageConfig> {
  try {
    const docRef = doc(db, 'homepageConfig', 'main');
    const snap = await withTimeout(getDoc(docRef));
    if (snap.exists()) {
      const data = { id: snap.id, ...snap.data() } as HomepageConfig;
      setLocal('pure_sudh_homepage_config', data);
      return data;
    }
  } catch (e) {
    console.warn('Firestore homepage config fallback:', e);
  }
  return getLocal<HomepageConfig>('pure_sudh_homepage_config', initialHomepageConfig);
}

export async function saveHomepageConfig(config: HomepageConfig): Promise<void> {
  const updated = stripUndefinedFields({ ...config, updatedAt: new Date().toISOString() });
  await executeFirestoreWrite(
    () => setDoc(doc(db, 'homepageConfig', 'main'), updated, { merge: true }),
    OperationType.WRITE,
    'homepageConfig/main'
  );
  setLocal('pure_sudh_homepage_config', updated);
}

/* ================= NOTIFICATIONS ================= */
export const initialBroadcastNotifications: BroadcastNotification[] = [];

export async function fetchBroadcastNotifications(): Promise<BroadcastNotification[]> {
  try {
    const colRef = collection(db, 'broadcastNotifications');
    const snap = await withTimeout(getDocs(colRef));
    const items = snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as BroadcastNotification))
      .sort((a, b) => new Date(b.sentAt || 0).getTime() - new Date(a.sentAt || 0).getTime());
    setLocal('pure_sudh_broadcast_notifs', items);
    return items;
  } catch (e) {
    console.warn('Firestore fetchNotifications fallback:', e);
  }
  return getLocal<BroadcastNotification[]>('pure_sudh_broadcast_notifs', []);
}

export async function sendBroadcastNotification(
  notifOrTitle: string | Omit<BroadcastNotification, 'id' | 'sentAt'>,
  message?: string,
  type?: 'promo' | 'order' | 'system' | 'festival',
  targetRole?: 'all' | 'customer' | 'staff' | string,
  link?: string
): Promise<BroadcastNotification> {
  let newNotif: BroadcastNotification;
  if (typeof notifOrTitle === 'string') {
    newNotif = {
      id: `notif-${Date.now()}`,
      title: notifOrTitle,
      message: message || '',
      type: type || 'promo',
      targetRole: (targetRole as any) || 'all',
      link: link || '/shop',
      sentAt: new Date().toISOString(),
      recipientsCount: 0,
    };
  } else {
    newNotif = {
      ...notifOrTitle,
      id: `notif-${Date.now()}`,
      sentAt: new Date().toISOString(),
    };
  }
  const cleanNotif = stripUndefinedFields(newNotif);
  await executeFirestoreWrite(
    () => setDoc(doc(db, 'broadcastNotifications', newNotif.id), cleanNotif),
    OperationType.CREATE,
    `broadcastNotifications/${newNotif.id}`
  );
  const all = getLocal<BroadcastNotification[]>('pure_sudh_broadcast_notifs', []);
  all.unshift(cleanNotif);
  setLocal('pure_sudh_broadcast_notifs', all);
  return cleanNotif;
}

/* ================= REVIEWS MODERATION ================= */
export async function updateReviewModerationStatus(
  reviewId: string,
  status: 'approved' | 'rejected' | 'hidden'
): Promise<void> {
  await executeFirestoreWrite(
    () => updateDoc(doc(db, 'reviews', reviewId), { status, updatedAt: new Date().toISOString() }),
    OperationType.UPDATE,
    `reviews/${reviewId}`
  );
  const all = getLocal<Review[]>(STORAGE_KEYS.REVIEWS, []);
  const idx = all.findIndex((r) => r.id === reviewId);
  if (idx >= 0) {
    all[idx].status = status;
    setLocal(STORAGE_KEYS.REVIEWS, all);
  }
}

export async function deleteReview(reviewId: string): Promise<void> {
  await executeFirestoreWrite(
    () => deleteDoc(doc(db, 'reviews', reviewId)),
    OperationType.DELETE,
    `reviews/${reviewId}`
  );
  const all = getLocal<Review[]>(STORAGE_KEYS.REVIEWS, []).filter((r) => r.id !== reviewId);
  setLocal(STORAGE_KEYS.REVIEWS, all);
}

/* ================= ORDER REFUND & CANCELLATION ================= */
export async function processOrderRefund(
  orderId: string,
  refundRef: string,
  reason: string = 'Customer return / order cancelled'
): Promise<void> {
  const now = new Date().toISOString();
  const historyEntry = {
    status: 'REFUNDED' as OrderStatus,
    timestamp: now,
    note: `Refund processed. Reference ID: ${refundRef}. Reason: ${reason}`,
  };
  const all = getLocal<Order[]>(STORAGE_KEYS.ORDERS, []);
  const order = all.find((o) => o.id === orderId);
  let updatedHistory = order?.statusHistory ? [...order.statusHistory, historyEntry] : [historyEntry];
  await executeFirestoreWrite(async () => {
    const docRef = doc(db, 'orders', orderId);
    if (!order) {
      const snap = await withTimeout(getDoc(docRef));
      if (snap.exists()) {
        const remoteHistory = (snap.data() as Partial<Order>)?.statusHistory;
        if (Array.isArray(remoteHistory)) {
          updatedHistory = [...remoteHistory, historyEntry];
        }
      }
    }
    await updateDoc(docRef, {
      status: 'REFUNDED',
      paymentStatus: 'Refunded',
      updatedAt: now,
      statusHistory: updatedHistory,
    });
  }, OperationType.UPDATE, `orders/${orderId}`);
  if (order) {
    order.status = 'REFUNDED';
    order.paymentStatus = 'Refunded';
    order.updatedAt = now;
    order.statusHistory = updatedHistory;
    setLocal(STORAGE_KEYS.ORDERS, all);
  }
}

export async function processOrderCancellation(
  orderId: string,
  reason: string = 'Cancelled by administrator'
): Promise<void> {
  const now = new Date().toISOString();
  const historyEntry = {
    status: 'CANCELLED' as OrderStatus,
    timestamp: now,
    note: `Order cancelled: ${reason}`,
  };
  const all = getLocal<Order[]>(STORAGE_KEYS.ORDERS, []);
  const order = all.find((o) => o.id === orderId);
  let updatedHistory = order?.statusHistory ? [...order.statusHistory, historyEntry] : [historyEntry];
  await executeFirestoreWrite(async () => {
    const docRef = doc(db, 'orders', orderId);
    if (!order) {
      const snap = await withTimeout(getDoc(docRef));
      if (snap.exists()) {
        const remoteHistory = (snap.data() as Partial<Order>)?.statusHistory;
        if (Array.isArray(remoteHistory)) {
          updatedHistory = [...remoteHistory, historyEntry];
        }
      }
    }
    await updateDoc(docRef, {
      status: 'CANCELLED',
      updatedAt: now,
      statusHistory: updatedHistory,
    });
  }, OperationType.UPDATE, `orders/${orderId}`);
  if (order) {
    order.status = 'CANCELLED';
    order.updatedAt = now;
    order.statusHistory = updatedHistory;
    setLocal(STORAGE_KEYS.ORDERS, all);
  }
}

