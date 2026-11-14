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
import { db, auth, handleFirestoreError, OperationType } from './config';
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
          ...initialProducts.map((p) => setDoc(doc(db, 'products', p.id), p, { merge: true })),
          ...initialCategories.map((c) => setDoc(doc(db, 'categories', c.id), c, { merge: true })),
          ...initialDeliveryAreas.map((a) => setDoc(doc(db, 'deliveryAreas', a.id), a, { merge: true })),
          ...initialCoupons.map((cp) => setDoc(doc(db, 'coupons', cp.id), cp, { merge: true })),
          ...initialBanners.map((b) => setDoc(doc(db, 'banners', b.id), b, { merge: true })),
          ...initialOffers.map((o) => setDoc(doc(db, 'offers', o.id), o, { merge: true })),
          setDoc(doc(db, 'settings', initialSiteSettings.id), initialSiteSettings, { merge: true }),
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
  // Invalidate cache immediately on update
  serviceCache.products.timestamp = 0;

  // If product was previously marked deleted, restore it
  const deleted = getLocal<string[]>(STORAGE_KEYS.DELETED_PRODUCT_IDS, []);
  if (deleted.includes(product.id)) {
    setLocal(STORAGE_KEYS.DELETED_PRODUCT_IDS, deleted.filter((id) => id !== product.id));
  }

  const all = getLocal<Product[]>(STORAGE_KEYS.PRODUCTS, initialProducts);
  const index = all.findIndex((p) => p.id === product.id);
  if (index >= 0) {
    all[index] = product;
  } else {
    all.unshift(product);
  }
  setLocal(STORAGE_KEYS.PRODUCTS, all);

  try {
    await setDoc(doc(db, 'products', product.id), product, { merge: true });
  } catch (e) {
    console.warn('Firestore write failed, saved locally:', e);
  }
}

export async function deleteProduct(productId: string): Promise<void> {
  // Invalidate cache immediately
  serviceCache.products.timestamp = 0;

  // Track permanently deleted ID
  const deleted = getLocal<string[]>(STORAGE_KEYS.DELETED_PRODUCT_IDS, []);
  if (!deleted.includes(productId)) {
    deleted.push(productId);
    setLocal(STORAGE_KEYS.DELETED_PRODUCT_IDS, deleted);
  }

  const all = getLocal<Product[]>(STORAGE_KEYS.PRODUCTS, initialProducts).filter(
    (p) => p.id !== productId && !deleted.includes(p.id)
  );
  setLocal(STORAGE_KEYS.PRODUCTS, all);
  try {
    await deleteDoc(doc(db, 'products', productId));
  } catch (e) {
    console.warn('Firestore delete failed:', e);
  }
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
  const all = getLocal<Category[]>(STORAGE_KEYS.CATEGORIES, initialCategories);
  const idx = all.findIndex((c) => c.id === category.id);
  if (idx >= 0) {
    all[idx] = category;
  } else {
    all.push(category);
  }
  setLocal(STORAGE_KEYS.CATEGORIES, all);
  try {
    await setDoc(doc(db, 'categories', category.id), category, { merge: true });
  } catch (e) {
    console.warn('Firestore save category error:', e);
  }
}

export async function deleteCategory(categoryId: string): Promise<void> {
  serviceCache.categories.timestamp = 0;
  const all = getLocal<Category[]>(STORAGE_KEYS.CATEGORIES, initialCategories).filter((c) => c.id !== categoryId);
  setLocal(STORAGE_KEYS.CATEGORIES, all);
  try {
    await deleteDoc(doc(db, 'categories', categoryId));
  } catch (e) {
    console.warn('Firestore delete category error:', e);
  }
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
  const all = getLocal<DeliveryArea[]>(STORAGE_KEYS.DELIVERY_AREAS, initialDeliveryAreas);
  const idx = all.findIndex((a) => a.id === area.id);
  if (idx >= 0) {
    all[idx] = area;
  } else {
    all.push(area);
  }
  setLocal(STORAGE_KEYS.DELIVERY_AREAS, all);
  try {
    await setDoc(doc(db, 'deliveryAreas', area.id), area, { merge: true });
  } catch (e) {
    console.warn('Firestore save delivery area error:', e);
  }
}

export async function deleteDeliveryArea(id: string): Promise<void> {
  serviceCache.deliveryAreas.timestamp = 0;
  const all = getLocal<DeliveryArea[]>(STORAGE_KEYS.DELIVERY_AREAS, initialDeliveryAreas).filter((a) => a.id !== id);
  setLocal(STORAGE_KEYS.DELIVERY_AREAS, all);
  try {
    await deleteDoc(doc(db, 'deliveryAreas', id));
  } catch (e) {
    console.warn('Firestore delete delivery area error:', e);
  }
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
  const all = getLocal<DeliverySlot[]>(STORAGE_KEYS.DELIVERY_SLOTS, initialDeliverySlots);
  const idx = all.findIndex((s) => s.id === slot.id);
  if (idx >= 0) {
    all[idx] = slot;
  } else {
    all.push(slot);
  }
  setLocal(STORAGE_KEYS.DELIVERY_SLOTS, all);
  try {
    await setDoc(doc(db, 'deliverySlots', slot.id), slot, { merge: true });
  } catch (e) {
    console.warn('Firestore save delivery slot error:', e);
  }
}

export async function deleteDeliverySlot(id: string): Promise<void> {
  serviceCache.deliverySlots.timestamp = 0;
  const all = getLocal<DeliverySlot[]>(STORAGE_KEYS.DELIVERY_SLOTS, initialDeliverySlots).filter((s) => s.id !== id);
  setLocal(STORAGE_KEYS.DELIVERY_SLOTS, all);
  try {
    await deleteDoc(doc(db, 'deliverySlots', id));
  } catch (e) {
    console.warn('Firestore delete delivery slot error:', e);
  }
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
  const all = getLocal<Coupon[]>(STORAGE_KEYS.COUPONS, initialCoupons);
  const idx = all.findIndex((c) => c.id === coupon.id);
  if (idx >= 0) {
    all[idx] = coupon;
  } else {
    all.push(coupon);
  }
  setLocal(STORAGE_KEYS.COUPONS, all);
  try {
    await setDoc(doc(db, 'coupons', coupon.id), coupon, { merge: true });
  } catch (e) {
    console.warn('Firestore save coupon error:', e);
  }
}

export async function deleteCoupon(id: string): Promise<void> {
  serviceCache.coupons.timestamp = 0;
  const all = getLocal<Coupon[]>(STORAGE_KEYS.COUPONS, initialCoupons).filter((c) => c.id !== id);
  setLocal(STORAGE_KEYS.COUPONS, all);
  try {
    await deleteDoc(doc(db, 'coupons', id));
  } catch (e) {
    console.warn('Firestore delete coupon error:', e);
  }
}

export async function toggleCouponStatus(id: string, active: boolean): Promise<void> {
  serviceCache.coupons.timestamp = 0;
  const all = getLocal<Coupon[]>(STORAGE_KEYS.COUPONS, initialCoupons);
  const coupon = all.find((c) => c.id === id);
  if (coupon) {
    coupon.active = active;
    setLocal(STORAGE_KEYS.COUPONS, all);
  }
  try {
    await updateDoc(doc(db, 'coupons', id), { active });
  } catch (e) {
    console.warn('Firestore toggle coupon error:', e);
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
  const all = getLocal<Banner[]>(STORAGE_KEYS.BANNERS, initialBanners);
  const idx = all.findIndex((b) => b.id === banner.id);
  if (idx >= 0) {
    all[idx] = banner;
  } else {
    all.push(banner);
  }
  setLocal(STORAGE_KEYS.BANNERS, all);
  try {
    await setDoc(doc(db, 'banners', banner.id), banner, { merge: true });
  } catch (e) {
    console.warn('Firestore save banner error:', e);
  }
}

export async function deleteBanner(id: string): Promise<void> {
  serviceCache.banners.timestamp = 0;
  const all = getLocal<Banner[]>(STORAGE_KEYS.BANNERS, initialBanners).filter((b) => b.id !== id);
  setLocal(STORAGE_KEYS.BANNERS, all);
  try {
    await deleteDoc(doc(db, 'banners', id));
  } catch (e) {
    console.warn('Firestore delete banner error:', e);
  }
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
  const all = getLocal<Offer[]>(STORAGE_KEYS.OFFERS, initialOffers);
  const idx = all.findIndex((o) => o.id === offer.id);
  if (idx >= 0) {
    all[idx] = offer;
  } else {
    all.push(offer);
  }
  setLocal(STORAGE_KEYS.OFFERS, all);
  try {
    await setDoc(doc(db, 'offers', offer.id), offer, { merge: true });
  } catch (e) {
    console.warn('Firestore save offer error:', e);
  }
}

export async function deleteOffer(id: string): Promise<void> {
  serviceCache.offers.timestamp = 0;
  const all = getLocal<Offer[]>(STORAGE_KEYS.OFFERS, initialOffers).filter((o) => o.id !== id);
  setLocal(STORAGE_KEYS.OFFERS, all);
  try {
    await deleteDoc(doc(db, 'offers', id));
  } catch (e) {
    console.warn('Firestore delete offer error:', e);
  }
}

export async function toggleOfferStatus(id: string, active: boolean): Promise<void> {
  serviceCache.offers.timestamp = 0;
  const all = getLocal<Offer[]>(STORAGE_KEYS.OFFERS, initialOffers);
  const offer = all.find((o) => o.id === id);
  if (offer) {
    offer.active = active;
    setLocal(STORAGE_KEYS.OFFERS, all);
  }
  try {
    await updateDoc(doc(db, 'offers', id), { active });
  } catch (e) {
    console.warn('Firestore toggle offer error:', e);
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
  setLocal(STORAGE_KEYS.SETTINGS, settings);
  try {
    await setDoc(doc(db, 'settings', 'site_settings'), settings, { merge: true });
  } catch (e) {
    console.warn('Firestore save settings error:', e);
  }
}

/* ================= ORDERS ================= */
export const initialSampleOrders: Order[] = [
  {
    id: 'ord-ps100002',
    orderNumber: 'PS100002',
    customerId: 'cust-demo-user',
    customerName: 'Aarav Sharma',
    customerEmail: 'customer@puresudh.com',
    customerPhone: '9876543210',
    items: [
      {
        productId: 'prod-claypot-dahi',
        productName: 'Claypot Matka Dahi',
        productImage: 'https://images.unsplash.com/photo-1571212515416-fef01fc43637?auto=format&fit=crop&w=600&q=80',
        price: 90,
        quantity: 2,
        weight: '500g',
        total: 180,
      },
    ],
    deliveryAddress: {
      id: 'addr-demo-1',
      name: 'Aarav Sharma',
      phone: '9876543210',
      addressLine: 'Flat 402, Ganga Heights, Bailey Road',
      landmark: 'Near Paras Hospital',
      city: 'Patna',
      state: 'Bihar',
      pincode: '800014',
      isDefault: true,
      type: 'home',
    },
    subtotal: 180,
    deliveryCharge: 30,
    discount: 0,
    total: 210,
    status: 'PREPARING',
    paymentMethod: 'Cash on Delivery',
    paymentStatus: 'Pending',
    estimatedDeliveryTime: '25-35 mins',
    deliveryAreaPincode: '800014',
    statusHistory: [
      { status: 'PLACED', timestamp: new Date(Date.now() - 1800000).toISOString(), note: 'Order placed with Cash on Delivery' },
      { status: 'CONFIRMED', timestamp: new Date(Date.now() - 1200000).toISOString(), note: 'Kitchen verified stock' },
      { status: 'PREPARING', timestamp: new Date(Date.now() - 600000).toISOString(), note: 'Packing fresh earthenware pot' },
    ],
    createdAt: new Date(Date.now() - 1800000).toISOString(),
    updatedAt: new Date(Date.now() - 600000).toISOString(),
  },
  {
    id: 'ord-ps100001',
    orderNumber: 'PS100001',
    customerId: 'cust-demo-user',
    customerName: 'Aarav Sharma',
    customerEmail: 'customer@puresudh.com',
    customerPhone: '9876543210',
    items: [
      {
        productId: 'prod-thekua-traditional',
        productName: 'Desi Ghee Traditional Thekua',
        productImage: '/images/homemade_thekua_special.jpg',
        price: 199,
        quantity: 1,
        weight: '500g',
        total: 199,
      },
      {
        productId: 'prod-fresh-paneer',
        productName: 'Malai Paneer (Fresh Batch)',
        productImage: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=600&q=80',
        price: 140,
        quantity: 2,
        weight: '250g',
        total: 280,
      },
    ],
    deliveryAddress: {
      id: 'addr-demo-1',
      name: 'Aarav Sharma',
      phone: '9876543210',
      addressLine: 'Flat 402, Ganga Heights, Bailey Road',
      landmark: 'Near Paras Hospital',
      city: 'Patna',
      state: 'Bihar',
      pincode: '800014',
      isDefault: true,
      type: 'home',
    },
    subtotal: 479,
    deliveryCharge: 0,
    discount: 50,
    couponCode: 'FESTIVAL50',
    total: 429,
    status: 'DELIVERED',
    paymentMethod: 'UPI',
    paymentStatus: 'Paid',
    paymentId: 'pay_ps100001_mock',
    estimatedDeliveryTime: 'Delivered',
    deliveryAreaPincode: '800014',
    statusHistory: [
      { status: 'PLACED', timestamp: new Date(Date.now() - 86400000 * 2).toISOString(), note: 'Order placed via UPI' },
      { status: 'CONFIRMED', timestamp: new Date(Date.now() - 86400000 * 2 + 300000).toISOString(), note: 'Kitchen confirmed order' },
      { status: 'PREPARING', timestamp: new Date(Date.now() - 86400000 * 2 + 900000).toISOString(), note: 'Fresh batch prepared' },
      { status: 'PACKED', timestamp: new Date(Date.now() - 86400000 * 2 + 1800000).toISOString(), note: 'Airtight box packed' },
      { status: 'OUT_FOR_DELIVERY', timestamp: new Date(Date.now() - 86400000 * 2 + 2700000).toISOString(), note: 'Rider dispatched' },
      { status: 'DELIVERED', timestamp: new Date(Date.now() - 86400000 * 2 + 4500000).toISOString(), note: 'Delivered to customer' },
    ],
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2 + 4500000).toISOString(),
  },
];

export async function fetchAllOrders(): Promise<Order[]> {
  try {
    const colRef = collection(db, 'orders');
    const q = query(colRef, orderBy('createdAt', 'desc'));
    const snapshot = await withTimeout(getDocs(q));
    if (!snapshot.empty) {
      const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Order));
      setLocal(STORAGE_KEYS.ORDERS, items);
      return items;
    }
  } catch (e) {
    console.warn('Firestore orders fallback:', e);
  }
  return getLocal<Order[]>(STORAGE_KEYS.ORDERS, initialSampleOrders);
}

export async function fetchUserOrders(customerId: string): Promise<Order[]> {
  try {
    const colRef = collection(db, 'orders');
    const q = query(colRef, where('customerId', '==', customerId), orderBy('createdAt', 'desc'));
    const snapshot = await withTimeout(getDocs(q));
    if (!snapshot.empty) {
      return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Order));
    }
  } catch (e) {
    console.warn('Firestore user orders fallback:', e);
  }
  const all = getLocal<Order[]>(STORAGE_KEYS.ORDERS, initialSampleOrders);
  const userOrders = all.filter((o) => o.customerId === customerId);
  return userOrders.length > 0 ? userOrders : all;
}

export async function fetchOrderById(orderIdOrPhone: string): Promise<Order | null> {
  const query = (orderIdOrPhone || '').trim();
  if (!query) return null;
  const clean = query.toLowerCase();
  const digitsOnly = query.replace(/\D/g, '');

  try {
    const docRef = doc(db, 'orders', query);
    const docSnap = await withTimeout(getDoc(docRef));
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Order;
    }
  } catch (e) {
    console.warn('Firestore order by ID error:', e);
  }

  const all = getLocal<Order[]>(STORAGE_KEYS.ORDERS, initialSampleOrders);
  
  // 1. Direct match by id or orderNumber (case-insensitive)
  const byIdOrNum = all.find(
    (o) =>
      o.id.toLowerCase() === clean ||
      o.orderNumber.toLowerCase() === clean ||
      o.orderNumber.toLowerCase().replace(/[^a-z0-9]/g, '') === clean.replace(/[^a-z0-9]/g, '')
  );
  if (byIdOrNum) return byIdOrNum;

  // 2. Match by phone number if query contains 10 digits
  if (digitsOnly.length >= 10) {
    const target10 = digitsOnly.slice(-10);
    const byPhone = all.find((o) => (o.customerPhone || '').replace(/\D/g, '').endsWith(target10));
    if (byPhone) return byPhone;
  }

  return null;
}

export async function createOrder(order: Order): Promise<Order> {
  const all = getLocal<Order[]>(STORAGE_KEYS.ORDERS, []);
  all.unshift(order);
  setLocal(STORAGE_KEYS.ORDERS, all);

  try {
    await setDoc(doc(db, 'orders', order.id), order);
  } catch (e) {
    console.warn('Firestore create order fallback to local store:', e);
  }

  // Deduct inventory stock for ordered items
  try {
    const products = getLocal<Product[]>(STORAGE_KEYS.PRODUCTS, initialProducts);
    for (const item of order.items) {
      const prod = products.find((p) => p.id === item.productId);
      if (prod) {
        prod.stockQuantity = Math.max(0, prod.stockQuantity - item.quantity);
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
  const all = getLocal<Order[]>(STORAGE_KEYS.ORDERS, []);
  const order = all.find((o) => o.id === orderId);
  if (order) {
    order.status = newStatus;
    order.updatedAt = new Date().toISOString();
    order.statusHistory = order.statusHistory || [];
    order.statusHistory.push({
      status: newStatus,
      timestamp: new Date().toISOString(),
      note: note || `Status updated to ${newStatus}`,
    });
    setLocal(STORAGE_KEYS.ORDERS, all);
  }

  try {
    const docRef = doc(db, 'orders', orderId);
    await updateDoc(docRef, {
      status: newStatus,
      updatedAt: new Date().toISOString(),
    });
  } catch (e) {
    console.warn('Firestore status update error:', e);
  }
}

/* ================= REVIEWS ================= */
export async function fetchProductReviews(productId: string): Promise<Review[]> {
  try {
    const colRef = collection(db, 'reviews');
    const q = query(colRef, where('productId', '==', productId));
    const snapshot = await withTimeout(getDocs(q));
    if (!snapshot.empty) {
      return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Review));
    }
  } catch (e) {
    console.warn('Firestore reviews fallback:', e);
  }
  const all = getLocal<Review[]>(STORAGE_KEYS.REVIEWS, [
    {
      id: 'rev-1',
      productId: 'prod-thekua-traditional',
      customerId: 'cust-1',
      customerName: 'Ananya Sharma',
      rating: 5,
      comment: 'Authentic Chhath Pooja taste! The aroma of pure desi cow ghee and fennel is incredible. Truly pure and crunchy.',
      verifiedPurchase: true,
      status: 'approved',
      createdAt: '2025-02-14T10:00:00Z',
    },
    {
      id: 'rev-2',
      productId: 'prod-fresh-paneer',
      customerId: 'cust-2',
      customerName: 'Rameshwar Verma',
      rating: 5,
      comment: 'Super soft paneer! You can feel it melts in the mouth. Delivered cold in 25 minutes as promised.',
      verifiedPurchase: true,
      status: 'approved',
      createdAt: '2025-02-18T14:30:00Z',
    },
    {
      id: 'rev-3',
      productId: 'prod-claypot-dahi',
      customerId: 'cust-3',
      customerName: 'Pooja Jha',
      rating: 5,
      comment: 'The thick malai layer on the earthen pot took me back to village days. Pure Sudh has won our family trust.',
      verifiedPurchase: true,
      status: 'approved',
      createdAt: '2025-02-20T08:15:00Z',
    },
  ]);
  return all.filter((r) => r.productId === productId && r.status === 'approved');
}

export async function fetchAllReviews(): Promise<Review[]> {
  try {
    const colRef = collection(db, 'reviews');
    const snapshot = await withTimeout(getDocs(colRef));
    if (!snapshot.empty) {
      const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Review));
      setLocal(STORAGE_KEYS.REVIEWS, items);
      return items;
    }
  } catch (e) {
    console.warn('Firestore all reviews fallback:', e);
  }
  return getLocal<Review[]>(STORAGE_KEYS.REVIEWS, [
    {
      id: 'rev-1',
      productId: 'prod-thekua-traditional',
      customerId: 'cust-1',
      customerName: 'Sunita Mishra',
      rating: 5,
      comment: 'The Gur Thekua is exactly like what my mother used to prepare during Chhath! Crunchy, sweet, and pure desi ghee aroma.',
      verifiedPurchase: true,
      status: 'approved',
      createdAt: '2025-02-15T10:00:00Z',
    },
    {
      id: 'rev-2',
      productId: 'prod-fresh-paneer',
      customerId: 'cust-2',
      customerName: 'Rajesh Ranjan',
      rating: 5,
      comment: 'The Malai Paneer melts directly in the mouth with no rubbery feel. Their 30-minute morning delivery is a lifesaver for breakfast.',
      verifiedPurchase: true,
      status: 'approved',
      createdAt: '2025-02-18T14:30:00Z',
    },
    {
      id: 'rev-3',
      productId: 'prod-claypot-dahi',
      customerId: 'cust-3',
      customerName: 'Pooja Agarwal',
      rating: 5,
      comment: 'Finally a brand that does not cut corners with palm oils. Authentic Bihari khasta and pure cow milk delivery every single morning.',
      verifiedPurchase: true,
      status: 'approved',
      createdAt: '2025-02-20T08:15:00Z',
    },
    {
      id: 'rev-4',
      productId: 'prod-khasta-kachori',
      customerId: 'cust-4',
      customerName: 'Amitabh Kumar',
      rating: 5,
      comment: 'Pure nostalgia! The aroma of ajwain and kalonji in their Khasta reminds me of Patna railway station chai mornings. Top notch!',
      verifiedPurchase: true,
      status: 'approved',
      createdAt: '2025-02-24T09:12:00Z',
    },
  ]);
}

export async function addProductReview(review: Review): Promise<void> {
  const all = getLocal<Review[]>(STORAGE_KEYS.REVIEWS, []);
  all.unshift(review);
  setLocal(STORAGE_KEYS.REVIEWS, all);
  try {
    await setDoc(doc(db, 'reviews', review.id), review);
  } catch (e) {
    console.warn('Firestore review write error:', e);
  }
}

export async function deleteProductReview(reviewId: string): Promise<void> {
  const all = getLocal<Review[]>(STORAGE_KEYS.REVIEWS, []).filter((r) => r.id !== reviewId);
  setLocal(STORAGE_KEYS.REVIEWS, all);
  try {
    await deleteDoc(doc(db, 'reviews', reviewId));
  } catch (e) {
    console.warn('Firestore review delete error:', e);
  }
}

export async function updateProductReview(review: Review): Promise<void> {
  const all = getLocal<Review[]>(STORAGE_KEYS.REVIEWS, []);
  const idx = all.findIndex((r) => r.id === review.id);
  if (idx >= 0) {
    all[idx] = review;
  } else {
    all.unshift(review);
  }
  setLocal(STORAGE_KEYS.REVIEWS, all);
  try {
    await setDoc(doc(db, 'reviews', review.id), review, { merge: true });
  } catch (e) {
    console.warn('Firestore review update error:', e);
  }
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
  const profiles = getLocal<Record<string, UserProfile>>('pure_sudh_user_profiles', {});
  profiles[profile.uid] = profile;
  setLocal('pure_sudh_user_profiles', profiles);

  try {
    await setDoc(doc(db, 'users', profile.uid), profile, { merge: true });
  } catch (e) {
    console.warn('Firestore profile write error:', e);
  }
}

/* ================= CUSTOMERS MANAGEMENT ================= */
export const initialCustomers: CustomerSummary[] = [
  {
    id: 'cust-demo-user',
    uid: 'cust-demo-user',
    displayName: 'Aarav Sharma',
    email: 'customer@puresudh.com',
    phone: '9876543210',
    role: 'customer',
    status: 'active',
    totalOrders: 2,
    totalSpent: 639,
    lastOrderDate: new Date(Date.now() - 3600000 * 2).toISOString(),
    createdAt: '2025-01-15T10:00:00Z',
    addresses: [
      {
        id: 'addr-demo-1',
        name: 'Aarav Sharma',
        phone: '9876543210',
        addressLine: 'Flat 402, Ganga Heights, Bailey Road',
        landmark: 'Near Paras Hospital',
        city: 'Patna',
        state: 'Bihar',
        pincode: '800014',
        isDefault: true,
        type: 'home',
      },
    ],
  },
  {
    id: 'cust-2',
    uid: 'cust-2',
    displayName: 'Priya Kumari',
    email: 'priya.k@gmail.com',
    phone: '9835012345',
    role: 'customer',
    status: 'active',
    totalOrders: 5,
    totalSpent: 2840,
    lastOrderDate: new Date(Date.now() - 86400000 * 3).toISOString(),
    createdAt: '2025-01-10T12:00:00Z',
  },
  {
    id: 'cust-3',
    uid: 'cust-3',
    displayName: 'Vikramaditya Roy',
    email: 'vikram.roy@patnamail.com',
    phone: '9431098765',
    role: 'customer',
    status: 'active',
    totalOrders: 3,
    totalSpent: 1450,
    lastOrderDate: new Date(Date.now() - 86400000 * 5).toISOString(),
    createdAt: '2025-02-01T09:30:00Z',
  },
  {
    id: 'cust-4',
    uid: 'cust-4',
    displayName: 'Sunita Mishra',
    email: 'sunita.mishra@bihar.org',
    phone: '9934112233',
    role: 'customer',
    status: 'active',
    totalOrders: 1,
    totalSpent: 499,
    lastOrderDate: new Date(Date.now() - 86400000 * 10).toISOString(),
    createdAt: '2025-02-10T15:20:00Z',
  },
];

export async function fetchCustomers(): Promise<CustomerSummary[]> {
  const localCustomers = getLocal<CustomerSummary[]>('pure_sudh_admin_customers', initialCustomers);
  try {
    const colRef = collection(db, 'users');
    const snap = await withTimeout(getDocs(colRef));
    if (!snap.empty) {
      const fetched: CustomerSummary[] = [];
      const orders = await fetchAllOrders();
      snap.docs.forEach((d) => {
        const data = d.data() as Partial<UserProfile>;
        if (data.role === 'customer' || !data.role) {
          const userOrders = orders.filter((o) => o.customerId === d.id || o.customerEmail === data.email);
          const totalSpent = userOrders.reduce((s, o) => (o.status !== 'CANCELLED' && o.status !== 'Cancelled' ? s + o.total : s), 0);
          fetched.push({
            id: d.id,
            uid: d.id,
            displayName: data.displayName || 'Customer',
            email: data.email || 'customer@puresudh.com',
            phone: data.phone || '9876543210',
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
      if (fetched.length > 0) {
        setLocal('pure_sudh_admin_customers', fetched);
        return fetched;
      }
    }
  } catch (e) {
    console.warn('Firestore fetchCustomers fallback:', e);
  }
  return localCustomers;
}

export async function updateCustomerStatus(customerId: string, status: 'active' | 'suspended' | 'blocked'): Promise<void> {
  const all = getLocal<CustomerSummary[]>('pure_sudh_admin_customers', initialCustomers);
  const idx = all.findIndex((c) => c.id === customerId || c.uid === customerId);
  if (idx >= 0) {
    all[idx].status = status;
    setLocal('pure_sudh_admin_customers', all);
  }
  try {
    const docRef = doc(db, 'users', customerId);
    await updateDoc(docRef, { status, updatedAt: new Date().toISOString() });
  } catch (e) {
    console.warn('Firestore updateCustomerStatus error:', e);
  }
}

/* ================= STAFF MANAGEMENT ================= */
export const initialStaff: StaffMember[] = [
  {
    id: 'staff-1',
    name: 'Santosh Kumar',
    email: 'santosh.operations@puresudh.com',
    phone: '9835001122',
    role: 'manager',
    department: 'Patna Central Hub Logistics',
    permissions: [
      'manage_products',
      'manage_orders',
      'manage_customers',
      'manage_delivery',
      'view_reports',
    ],
    active: true,
    createdAt: '2025-01-01T08:00:00Z',
    lastLogin: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'staff-2',
    name: 'Meera Devi',
    email: 'meera.dairy@puresudh.com',
    phone: '9431223344',
    role: 'catalog_manager',
    department: 'Fresh Dairy & Sweet Quality Desk',
    permissions: ['manage_products', 'manage_coupons', 'manage_reviews'],
    active: true,
    createdAt: '2025-01-10T09:30:00Z',
    lastLogin: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'staff-3',
    name: 'Rajeev Ranjan',
    email: 'rajeev.dispatch@puresudh.com',
    phone: '9122334455',
    role: 'delivery_lead',
    department: 'Express Fleet Dispatch (Bailey Road)',
    permissions: ['manage_orders', 'manage_delivery'],
    active: true,
    createdAt: '2025-01-15T11:00:00Z',
    lastLogin: new Date(Date.now() - 7200000).toISOString(),
  },
];

export async function fetchStaffMembers(): Promise<StaffMember[]> {
  try {
    const colRef = collection(db, 'staff');
    const snap = await withTimeout(getDocs(colRef));
    if (!snap.empty) {
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as StaffMember));
      setLocal('pure_sudh_admin_staff', items);
      return items;
    }
  } catch (e) {
    console.warn('Firestore fetchStaff fallback:', e);
  }
  return getLocal<StaffMember[]>('pure_sudh_admin_staff', initialStaff);
}

export async function saveStaffMember(staff: StaffMember): Promise<void> {
  const all = getLocal<StaffMember[]>('pure_sudh_admin_staff', initialStaff);
  const idx = all.findIndex((s) => s.id === staff.id);
  if (idx >= 0) {
    all[idx] = staff;
  } else {
    all.unshift(staff);
  }
  setLocal('pure_sudh_admin_staff', all);
  try {
    await setDoc(doc(db, 'staff', staff.id), staff, { merge: true });
  } catch (e) {
    console.warn('Firestore saveStaff error:', e);
  }
}

export async function deleteStaffMember(staffId: string): Promise<void> {
  const all = getLocal<StaffMember[]>('pure_sudh_admin_staff', initialStaff).filter((s) => s.id !== staffId);
  setLocal('pure_sudh_admin_staff', all);
  try {
    await deleteDoc(doc(db, 'staff', staffId));
  } catch (e) {
    console.warn('Firestore deleteStaff error:', e);
  }
}

export async function toggleStaffStatus(staffId: string, active: boolean): Promise<void> {
  const all = getLocal<StaffMember[]>('pure_sudh_admin_staff', initialStaff);
  const idx = all.findIndex((s) => s.id === staffId);
  if (idx >= 0) {
    all[idx].active = active;
    setLocal('pure_sudh_admin_staff', all);
  }
  try {
    await updateDoc(doc(db, 'staff', staffId), { active });
  } catch (e) {
    console.warn('Firestore toggleStaffStatus error:', e);
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
  const updated = { ...config, updatedAt: new Date().toISOString() };
  setLocal('pure_sudh_homepage_config', updated);
  try {
    await setDoc(doc(db, 'homepageConfig', 'main'), updated, { merge: true });
  } catch (e) {
    console.warn('Firestore saveHomepageConfig error:', e);
  }
}

/* ================= NOTIFICATIONS ================= */
export const initialBroadcastNotifications: BroadcastNotification[] = [
  {
    id: 'notif-1',
    title: 'Festival Delight: Flat 20% OFF on Pure Cow Ghee!',
    message: 'Celebrate upcoming festivities with authentic Danedaar Cow Ghee. Use code PUREFESTIVE at checkout.',
    type: 'promo',
    targetRole: 'all',
    link: '/shop?category=pure-ghee',
    sentAt: new Date(Date.now() - 86400000).toISOString(),
    recipientsCount: 1420,
  },
  {
    id: 'notif-2',
    title: 'Fresh Morning Batch of Malai Paneer Ready',
    message: 'Today morning batch has been freshly prepared and chilled. Order before 10 AM for 25-minute breakfast delivery.',
    type: 'order',
    targetRole: 'customer',
    link: '/shop?category=malai-paneer',
    sentAt: new Date(Date.now() - 14400000).toISOString(),
    recipientsCount: 980,
  },
  {
    id: 'notif-3',
    title: 'New Service Area Added: Kankarbagh & Rajendra Nagar',
    message: 'We are thrilled to announce 30-min guaranteed delivery expansion to Pincode 800020 & 800016.',
    type: 'system',
    targetRole: 'all',
    link: '/shop',
    sentAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    recipientsCount: 2350,
  },
];

export async function fetchBroadcastNotifications(): Promise<BroadcastNotification[]> {
  try {
    const colRef = collection(db, 'broadcastNotifications');
    const snap = await withTimeout(getDocs(colRef));
    if (!snap.empty) {
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as BroadcastNotification));
      setLocal('pure_sudh_broadcast_notifs', items);
      return items;
    }
  } catch (e) {
    console.warn('Firestore fetchNotifications fallback:', e);
  }
  return getLocal<BroadcastNotification[]>('pure_sudh_broadcast_notifs', initialBroadcastNotifications);
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
      recipientsCount: 2450,
    };
  } else {
    newNotif = {
      ...notifOrTitle,
      id: `notif-${Date.now()}`,
      sentAt: new Date().toISOString(),
    };
  }
  const all = getLocal<BroadcastNotification[]>('pure_sudh_broadcast_notifs', initialBroadcastNotifications);
  all.unshift(newNotif);
  setLocal('pure_sudh_broadcast_notifs', all);
  try {
    await setDoc(doc(db, 'broadcastNotifications', newNotif.id), newNotif);
  } catch (e) {
    console.warn('Firestore sendBroadcastNotification error:', e);
  }
  return newNotif;
}

/* ================= REVIEWS MODERATION ================= */
export async function updateReviewModerationStatus(
  reviewId: string,
  status: 'approved' | 'rejected' | 'hidden'
): Promise<void> {
  const all = getLocal<Review[]>(STORAGE_KEYS.REVIEWS, []);
  const idx = all.findIndex((r) => r.id === reviewId);
  if (idx >= 0) {
    all[idx].status = status;
    setLocal(STORAGE_KEYS.REVIEWS, all);
  }
  try {
    await updateDoc(doc(db, 'reviews', reviewId), { status });
  } catch (e) {
    console.warn('Firestore review moderation update error:', e);
  }
}

export async function deleteReview(reviewId: string): Promise<void> {
  const all = getLocal<Review[]>(STORAGE_KEYS.REVIEWS, []).filter((r) => r.id !== reviewId);
  setLocal(STORAGE_KEYS.REVIEWS, all);
  try {
    await deleteDoc(doc(db, 'reviews', reviewId));
  } catch (e) {
    console.warn('Firestore delete review error:', e);
  }
}

/* ================= ORDER REFUND & CANCELLATION ================= */
export async function processOrderRefund(
  orderId: string,
  refundRef: string,
  reason: string = 'Customer return / order cancelled'
): Promise<void> {
  const all = getLocal<Order[]>(STORAGE_KEYS.ORDERS, initialSampleOrders);
  const order = all.find((o) => o.id === orderId);
  if (order) {
    order.status = 'REFUNDED';
    order.paymentStatus = 'Refunded';
    order.updatedAt = new Date().toISOString();
    order.statusHistory = order.statusHistory || [];
    order.statusHistory.push({
      status: 'REFUNDED',
      timestamp: new Date().toISOString(),
      note: `Refund processed. Reference ID: ${refundRef}. Reason: ${reason}`,
    });
    setLocal(STORAGE_KEYS.ORDERS, all);
  }
  try {
    await updateDoc(doc(db, 'orders', orderId), {
      status: 'REFUNDED',
      paymentStatus: 'Refunded',
      updatedAt: new Date().toISOString(),
    });
  } catch (e) {
    console.warn('Firestore refund error:', e);
  }
}

export async function processOrderCancellation(
  orderId: string,
  reason: string = 'Cancelled by administrator'
): Promise<void> {
  const all = getLocal<Order[]>(STORAGE_KEYS.ORDERS, initialSampleOrders);
  const order = all.find((o) => o.id === orderId);
  if (order) {
    order.status = 'CANCELLED';
    order.updatedAt = new Date().toISOString();
    order.statusHistory = order.statusHistory || [];
    order.statusHistory.push({
      status: 'CANCELLED',
      timestamp: new Date().toISOString(),
      note: `Order cancelled: ${reason}`,
    });
    setLocal(STORAGE_KEYS.ORDERS, all);
  }
  try {
    await updateDoc(doc(db, 'orders', orderId), {
      status: 'CANCELLED',
      updatedAt: new Date().toISOString(),
    });
  } catch (e) {
    console.warn('Firestore cancel order error:', e);
  }
}

