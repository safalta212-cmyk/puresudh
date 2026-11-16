/**
 * PURE SUDH - Firestore Database Services
 * Modular, typed Firestore operations with local fallback
 */

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
import { db } from '../firebase/config';
import {
  Product,
  Category,
  Order,
  Vendor,
  Coupon,
  DeliveryArea,
  Banner,
  SiteSettings,
  Review,
  OrderStatus,
} from '../types';
import { COLLECTIONS, INITIAL_MARKETPLACE_VENDORS } from '../constants';
import { initialProducts, initialCategories, initialDeliveryAreas, initialCoupons, initialBanners, initialSiteSettings } from '../data/seedData';

const STORAGE_KEYS = {
  PRODUCTS: 'puresudh_products_cache',
  CATEGORIES: 'puresudh_categories_cache',
  ORDERS: 'puresudh_orders_cache',
  VENDORS: 'puresudh_vendors_cache',
  DELIVERY_AREAS: 'puresudh_delivery_areas_cache',
  COUPONS: 'puresudh_coupons_cache',
  BANNERS: 'puresudh_banners_cache',
  SETTINGS: 'puresudh_settings_cache',
};

function getLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (Array.isArray(fallback) && !Array.isArray(parsed)) return fallback;
    return parsed as T;
  } catch {
    return fallback;
  }
}

function setLocal<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.warn('LocalStorage write note:', err);
  }
}

/* ================= PRODUCTS ================= */

export async function getProducts(): Promise<Product[]> {
  try {
    const colRef = collection(db, COLLECTIONS.PRODUCTS);
    const snap = await getDocs(colRef);
    if (!snap.empty) {
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Product));
      setLocal(STORAGE_KEYS.PRODUCTS, items);
      return items;
    }
  } catch (err) {
    console.warn('Firestore products read fallback to local cache:', err);
  }
  return getLocal<Product[]>(STORAGE_KEYS.PRODUCTS, initialProducts);
}

export async function getProductById(id: string): Promise<Product | null> {
  try {
    const docRef = doc(db, COLLECTIONS.PRODUCTS, id);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as Product;
    }
  } catch (err) {
    console.warn('Firestore product fetch fallback:', err);
  }
  const all = getLocal<Product[]>(STORAGE_KEYS.PRODUCTS, initialProducts);
  return all.find((p) => p.id === id) || null;
}

export async function saveProduct(product: Product): Promise<void> {
  const all = getLocal<Product[]>(STORAGE_KEYS.PRODUCTS, initialProducts);
  const idx = all.findIndex((p) => p.id === product.id);
  if (idx >= 0) {
    all[idx] = product;
  } else {
    all.unshift(product);
  }
  setLocal(STORAGE_KEYS.PRODUCTS, all);

  try {
    await setDoc(doc(db, COLLECTIONS.PRODUCTS, product.id), product, { merge: true });
  } catch (err) {
    console.warn('Firestore saveProduct error:', err);
  }
}

export async function deleteProduct(id: string): Promise<void> {
  const all = getLocal<Product[]>(STORAGE_KEYS.PRODUCTS, initialProducts).filter((p) => p.id !== id);
  setLocal(STORAGE_KEYS.PRODUCTS, all);

  try {
    await deleteDoc(doc(db, COLLECTIONS.PRODUCTS, id));
  } catch (err) {
    console.warn('Firestore deleteProduct error:', err);
  }
}

/* ================= CATEGORIES ================= */

export async function getCategories(): Promise<Category[]> {
  try {
    const colRef = collection(db, COLLECTIONS.CATEGORIES);
    const snap = await getDocs(colRef);
    if (!snap.empty) {
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Category));
      setLocal(STORAGE_KEYS.CATEGORIES, items);
      return items.sort((a, b) => a.displayOrder - b.displayOrder);
    }
  } catch (err) {
    console.warn('Firestore categories fallback:', err);
  }
  return getLocal<Category[]>(STORAGE_KEYS.CATEGORIES, initialCategories);
}

/* ================= ORDERS ================= */

export async function createOrder(order: Order): Promise<Order> {
  // Update local cache immediately
  const localOrders = getLocal<Order[]>(STORAGE_KEYS.ORDERS, []);
  localOrders.unshift(order);
  setLocal(STORAGE_KEYS.ORDERS, localOrders);

  try {
    const docRef = doc(db, COLLECTIONS.ORDERS, order.id);
    await setDoc(docRef, order);
  } catch (err) {
    console.warn('Order persisted locally, firestore sync note:', err);
  }

  return order;
}

export async function getCustomerOrders(customerId: string): Promise<Order[]> {
  try {
    const colRef = collection(db, COLLECTIONS.ORDERS);
    const q = query(colRef, where('customerId', '==', customerId));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const orders = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Order));
      return orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
  } catch (err) {
    console.warn('Firestore getCustomerOrders fallback:', err);
  }

  const localOrders = getLocal<Order[]>(STORAGE_KEYS.ORDERS, []);
  return localOrders.filter((o) => o.customerId === customerId);
}

export async function getAllOrders(): Promise<Order[]> {
  try {
    const colRef = collection(db, COLLECTIONS.ORDERS);
    const snap = await getDocs(colRef);
    if (!snap.empty) {
      const orders = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Order));
      setLocal(STORAGE_KEYS.ORDERS, orders);
      return orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
  } catch (err) {
    console.warn('Firestore getAllOrders fallback:', err);
  }

  return getLocal<Order[]>(STORAGE_KEYS.ORDERS, []);
}

export async function getOrderById(orderId: string): Promise<Order | null> {
  try {
    const docRef = doc(db, COLLECTIONS.ORDERS, orderId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as Order;
    }
  } catch (err) {
    console.warn('Firestore getOrderById fallback:', err);
  }

  const all = getLocal<Order[]>(STORAGE_KEYS.ORDERS, []);
  return all.find((o) => o.id === orderId || o.orderNumber === orderId) || null;
}

export async function updateOrderStatus(orderId: string, status: OrderStatus, note?: string): Promise<void> {
  const localOrders = getLocal<Order[]>(STORAGE_KEYS.ORDERS, []);
  const target = localOrders.find((o) => o.id === orderId);
  if (target) {
    target.status = status;
    target.updatedAt = new Date().toISOString();
    target.statusHistory = target.statusHistory || [];
    target.statusHistory.push({
      status,
      timestamp: new Date().toISOString(),
      note: note || `Status changed to ${status}`,
    });
    setLocal(STORAGE_KEYS.ORDERS, localOrders);
  }

  try {
    const docRef = doc(db, COLLECTIONS.ORDERS, orderId);
    await updateDoc(docRef, {
      status,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Firestore updateOrderStatus note:', err);
  }
}

/* ================= VENDORS & MARKETPLACE ================= */

export async function getVendors(): Promise<Vendor[]> {
  try {
    const colRef = collection(db, COLLECTIONS.VENDORS);
    const snap = await getDocs(colRef);
    if (!snap.empty) {
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Vendor));
      setLocal(STORAGE_KEYS.VENDORS, items);
      return items;
    }
  } catch (err) {
    console.warn('Firestore vendors fallback:', err);
  }

  return getLocal<Vendor[]>(STORAGE_KEYS.VENDORS, INITIAL_MARKETPLACE_VENDORS);
}

export async function getVendorById(id: string): Promise<Vendor | null> {
  const vendors = await getVendors();
  return vendors.find((v) => v.id === id || v.slug === id) || null;
}

export async function saveVendor(vendor: Vendor): Promise<void> {
  const all = getLocal<Vendor[]>(STORAGE_KEYS.VENDORS, INITIAL_MARKETPLACE_VENDORS);
  const idx = all.findIndex((v) => v.id === vendor.id);
  if (idx >= 0) {
    all[idx] = vendor;
  } else {
    all.push(vendor);
  }
  setLocal(STORAGE_KEYS.VENDORS, all);

  try {
    await setDoc(doc(db, COLLECTIONS.VENDORS, vendor.id), vendor, { merge: true });
  } catch (err) {
    console.warn('Firestore saveVendor error:', err);
  }
}

/* ================= DELIVERY AREAS & PINCODES ================= */

export async function getDeliveryAreas(): Promise<DeliveryArea[]> {
  try {
    const colRef = collection(db, COLLECTIONS.DELIVERY_AREAS);
    const snap = await getDocs(colRef);
    if (!snap.empty) {
      const areas = snap.docs.map((d) => ({ id: d.id, ...d.data() } as DeliveryArea));
      setLocal(STORAGE_KEYS.DELIVERY_AREAS, areas);
      return areas;
    }
  } catch (err) {
    console.warn('Firestore deliveryAreas fallback:', err);
  }
  return getLocal<DeliveryArea[]>(STORAGE_KEYS.DELIVERY_AREAS, initialDeliveryAreas);
}

/* ================= COUPONS ================= */

export async function getCoupons(): Promise<Coupon[]> {
  try {
    const colRef = collection(db, COLLECTIONS.COUPONS);
    const snap = await getDocs(colRef);
    if (!snap.empty) {
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Coupon));
      setLocal(STORAGE_KEYS.COUPONS, items);
      return items;
    }
  } catch (err) {
    console.warn('Firestore coupons fallback:', err);
  }
  return getLocal<Coupon[]>(STORAGE_KEYS.COUPONS, initialCoupons);
}

/* ================= BANNERS ================= */

export async function getBanners(): Promise<Banner[]> {
  try {
    const colRef = collection(db, COLLECTIONS.BANNERS);
    const snap = await getDocs(colRef);
    if (!snap.empty) {
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Banner));
      setLocal(STORAGE_KEYS.BANNERS, items);
      return items;
    }
  } catch (err) {
    console.warn('Firestore banners fallback:', err);
  }
  return getLocal<Banner[]>(STORAGE_KEYS.BANNERS, initialBanners);
}

/* ================= SETTINGS ================= */

export async function getSiteSettings(): Promise<SiteSettings> {
  try {
    const docRef = doc(db, COLLECTIONS.SETTINGS, 'general');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as SiteSettings;
      setLocal(STORAGE_KEYS.SETTINGS, data);
      return data;
    }
  } catch (err) {
    console.warn('Firestore settings fallback:', err);
  }
  return getLocal<SiteSettings>(STORAGE_KEYS.SETTINGS, initialSiteSettings);
}

export async function updateSiteSettings(settings: Partial<SiteSettings>): Promise<void> {
  const current = getLocal<SiteSettings>(STORAGE_KEYS.SETTINGS, initialSiteSettings);
  const updated = { ...current, ...settings };
  setLocal(STORAGE_KEYS.SETTINGS, updated);

  try {
    await setDoc(doc(db, COLLECTIONS.SETTINGS, 'general'), updated, { merge: true });
  } catch (err) {
    console.warn('Firestore updateSiteSettings error:', err);
  }
}
