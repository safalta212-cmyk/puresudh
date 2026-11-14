/**
 * PURE SUDH - Scalable Firestore Query & Relationship Engine
 * Designed for low-latency indexed reads, pagination, and transactional relationships.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  writeBatch,
  DocumentSnapshot,
  QueryConstraint,
} from 'firebase/firestore';
import { db } from './config';
import {
  Product,
  ProductVariant,
  InventoryItem,
  Order,
  OrderItem,
  OrderStatusHistory,
  Payment,
  Review,
  OrderStatus,
} from '../types';

export interface ProductFilterOptions {
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  status?: string;
  vendorId?: string;
  sortBy?: 'price_asc' | 'price_desc' | 'rating_desc' | 'createdAt_desc';
  pageSize?: number;
  lastVisible?: DocumentSnapshot;
}

export interface PaginatedResult<T> {
  items: T[];
  lastVisible: DocumentSnapshot | null;
  hasMore: boolean;
}

/**
 * Scalable Product Catalog Query using Composite Indexes
 */
export async function queryProductsScalable(
  options: ProductFilterOptions = {}
): Promise<PaginatedResult<Product>> {
  const constraints: QueryConstraint[] = [];
  const colRef = collection(db, 'products');

  // Filter: Category
  if (options.categoryId) {
    constraints.push(where('categoryId', '==', options.categoryId));
  }

  // Filter: Vendor
  if (options.vendorId) {
    constraints.push(where('vendorId', '==', options.vendorId));
  }

  // Filter: Status (default to 'active' for storefront)
  const statusFilter = options.status || 'active';
  constraints.push(where('status', '==', statusFilter));

  // Sorting
  switch (options.sortBy) {
    case 'price_asc':
      constraints.push(orderBy('price', 'asc'));
      break;
    case 'price_desc':
      constraints.push(orderBy('price', 'desc'));
      break;
    case 'rating_desc':
      constraints.push(orderBy('rating', 'desc'));
      break;
    case 'createdAt_desc':
    default:
      constraints.push(orderBy('createdAt', 'desc'));
      break;
  }

  // Pagination limit
  const pageSize = options.pageSize || 12;
  constraints.push(limit(pageSize));

  // Cursor for infinite scroll / pagination
  if (options.lastVisible) {
    constraints.push(startAfter(options.lastVisible));
  }

  const q = query(colRef, ...constraints);
  const snap = await getDocs(q);

  const items: Product[] = snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as Product[];

  const lastDoc = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null;

  return {
    items,
    lastVisible: lastDoc,
    hasMore: snap.docs.length === pageSize,
  };
}

/**
 * Fetch a Product with all related normalized sub-documents:
 * - Variants (productVariants)
 * - Real-time Inventory (inventory)
 * - Approved Reviews (reviews)
 */
export async function fetchProductWithRelations(productId: string): Promise<{
  product: Product | null;
  variants: ProductVariant[];
  inventory: InventoryItem | null;
  reviews: Review[];
}> {
  const prodDocRef = doc(db, 'products', productId);
  const prodSnap = await getDoc(prodDocRef);

  if (!prodSnap.exists()) {
    return { product: null, variants: [], inventory: null, reviews: [] };
  }

  const product = { id: prodSnap.id, ...prodSnap.data() } as Product;

  // Run relation queries in parallel
  const [variantsSnap, inventorySnap, reviewsSnap] = await Promise.all([
    getDocs(query(collection(db, 'productVariants'), where('productId', '==', productId))),
    getDocs(query(collection(db, 'inventory'), where('productId', '==', productId), limit(1))),
    getDocs(
      query(
        collection(db, 'reviews'),
        where('productId', '==', productId),
        where('status', '==', 'approved'),
        orderBy('createdAt', 'desc'),
        limit(10)
      )
    ),
  ]);

  const variants = variantsSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as ProductVariant[];
  const inventory = inventorySnap.docs.length > 0
    ? ({ id: inventorySnap.docs[0].id, ...inventorySnap.docs[0].data() } as InventoryItem)
    : null;
  const reviews = reviewsSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Review[];

  return { product, variants, inventory, reviews };
}

/**
 * Fetch Order with complete normalized relationships:
 * - Order Line Items (orderItems)
 * - Order Status History audit trail (orderStatusHistory)
 * - Payment Records (payments)
 */
export async function fetchOrderDetailsWithRelations(orderId: string): Promise<{
  order: Order | null;
  items: OrderItem[];
  history: OrderStatusHistory[];
  payment: Payment | null;
}> {
  const orderDocRef = doc(db, 'orders', orderId);
  const orderSnap = await getDoc(orderDocRef);

  if (!orderSnap.exists()) {
    return { order: null, items: [], history: [], payment: null };
  }

  const order = { id: orderSnap.id, ...orderSnap.data() } as Order;

  const [itemsSnap, historySnap, paymentSnap] = await Promise.all([
    getDocs(query(collection(db, 'orderItems'), where('orderId', '==', orderId))),
    getDocs(
      query(
        collection(db, 'orderStatusHistory'),
        where('orderId', '==', orderId),
        orderBy('timestamp', 'asc')
      )
    ),
    getDocs(query(collection(db, 'payments'), where('orderId', '==', orderId), limit(1))),
  ]);

  const items = itemsSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as OrderItem[];
  const history = historySnap.docs.map((d) => ({ id: d.id, ...d.data() })) as OrderStatusHistory[];
  const payment = paymentSnap.docs.length > 0
    ? ({ id: paymentSnap.docs[0].id, ...paymentSnap.docs[0].data() } as Payment)
    : null;

  return { order, items, history, payment };
}

/**
 * Atomic Order Creation:
 * Executes order document creation, normalized line items, initial status history,
 * and payment placeholder in a single atomic WriteBatch.
 */
export async function createOrderAtomic(
  order: Order,
  items: OrderItem[],
  paymentDetails: Omit<Payment, 'id'>
): Promise<{ orderId: string; paymentId: string }> {
  const batch = writeBatch(db);

  // 1. Order document
  const orderRef = doc(db, 'orders', order.id);
  batch.set(orderRef, order);

  // 2. Normalized Line items
  items.forEach((item) => {
    const itemId = item.id || `item-${order.id}-${item.productId}`;
    const itemRef = doc(db, 'orderItems', itemId);
    batch.set(itemRef, { ...item, orderId: order.id });
  });

  // 3. Initial Status History audit document
  const historyId = `hist-${order.id}-1`;
  const historyRef = doc(db, 'orderStatusHistory', historyId);
  const initialHistory: OrderStatusHistory = {
    id: historyId,
    orderId: order.id,
    status: 'PLACED',
    note: 'Order placed by customer',
    updatedBy: order.customerId,
    updatedByRole: 'customer',
    timestamp: new Date().toISOString(),
  };
  batch.set(historyRef, initialHistory);

  // 4. Payment record
  const paymentId = `pay-${order.id}`;
  const paymentRef = doc(db, 'payments', paymentId);
  const paymentDoc: Payment = {
    ...paymentDetails,
    id: paymentId,
    orderId: order.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  batch.set(paymentRef, paymentDoc);

  // Commit all atomically
  await batch.commit();

  return { orderId: order.id, paymentId };
}

/**
 * Transition Order Status with audit logging
 */
export async function transitionOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
  updatedBy: string,
  updatedByRole: 'customer' | 'admin' | 'staff' | 'vendor' | 'system',
  note?: string
): Promise<void> {
  const batch = writeBatch(db);

  const orderRef = doc(db, 'orders', orderId);
  batch.update(orderRef, {
    status: newStatus,
    updatedAt: new Date().toISOString(),
  });

  const historyId = `hist-${orderId}-${Date.now()}`;
  const historyRef = doc(db, 'orderStatusHistory', historyId);
  const historyEntry: OrderStatusHistory = {
    id: historyId,
    orderId,
    status: newStatus,
    note: note || `Status progressed to ${newStatus}`,
    updatedBy,
    updatedByRole,
    timestamp: new Date().toISOString(),
  };
  batch.set(historyRef, historyEntry);

  await batch.commit();
}
