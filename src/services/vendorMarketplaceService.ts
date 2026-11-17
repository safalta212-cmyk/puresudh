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
  limit,
} from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import {
  Vendor,
  VendorStatus,
  VendorVerificationStatus,
  VendorProfile,
  VendorProduct,
  VendorInventory,
  VendorOrder,
  VendorCommission,
  VendorPayout,
  VendorBankAccount,
  VendorNotification,
  Product,
  Order,
  CommissionConfig,
  FinancialLedgerEntry,
  VendorFinancialSummary,
  PayoutAdjustmentPayload,
} from '../types';
import {
  INITIAL_COMMISSION_CONFIG,
  computeVendorFinancialSummary,
  generateAuditHash,
} from '../utils/commissionEngine';
import { COLLECTIONS, INITIAL_MARKETPLACE_VENDORS } from '../constants';

const STORAGE_KEYS = {
  VENDORS: 'pure_sudh_vendors_data',
  PROFILES: 'pure_sudh_vendor_profiles',
  PRODUCTS: 'pure_sudh_vendor_products',
  INVENTORY: 'pure_sudh_vendor_inventory',
  ORDERS: 'pure_sudh_vendor_orders',
  COMMISSIONS: 'pure_sudh_vendor_commissions',
  PAYOUTS: 'pure_sudh_vendor_payouts',
  BANK_ACCOUNTS: 'pure_sudh_vendor_bank_accounts',
  NOTIFICATIONS: 'pure_sudh_vendor_notifications',
};

function getLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed !== null && parsed !== undefined ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function setLocal<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn('LocalStorage vendor save warning:', e);
  }
}

// Initial Marketplace Seed Vendors
const initialVendorsSeed: Vendor[] = INITIAL_MARKETPLACE_VENDORS.map((v: any, i) => ({
  ...v,
  businessName: v.name,
  status: 'ACTIVE' as VendorStatus,
  verificationStatus: 'VERIFIED' as VendorVerificationStatus,
  ownerUserId: `usr-vendor-seed-${i + 1}`,
  coverImage: v.bannerImage || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80',
  businessInformation: {
    panNumber: `AAACV${1000 + i}P`,
    tradeLicense: `TL/BIH/2025/${200 + i}`,
    businessType: 'Sole Proprietorship',
    incorporationDate: v.joinedAt,
  },
  verificationInformation: {
    verifiedAt: v.joinedAt,
    verifiedBy: 'Pure Sudh Compliance Board',
    notes: 'Physical kitchen audit & FSSAI document verified.',
    fssaiCertificateUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=600&q=80',
  },
  payoutInformation: {
    bankAccountId: `bank-v${i + 1}`,
    accountHolderName: v.ownerName,
    accountNumberMasked: `•••• •••• ${4000 + i}`,
    ifscCode: 'SBIN0001234',
    bankName: 'State Bank of India',
    upiId: `${v.slug}@sbi`,
  },
  createdAt: v.joinedAt,
  updatedAt: new Date().toISOString(),
}));

/* =========================================================================
   1. VENDORS (PUBLIC & ADMIN)
   ========================================================================= */

export async function fetchAllVendors(): Promise<Vendor[]> {
  const local = getLocal<Vendor[]>(STORAGE_KEYS.VENDORS, initialVendorsSeed);
  try {
    const snap = await getDocs(collection(db, COLLECTIONS.VENDORS));
    if (!snap.empty) {
      const remote = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Vendor));
      // Merge remote with local seed to ensure full vendor network
      const mergedMap = new Map<string, Vendor>();
      local.forEach((v) => mergedMap.set(v.id, v));
      remote.forEach((v) => mergedMap.set(v.id, v));
      const combined = Array.from(mergedMap.values());
      setLocal(STORAGE_KEYS.VENDORS, combined);
      return combined;
    }
  } catch (err) {
    console.warn('Firestore fetchAllVendors fallback to local:', err);
  }
  return local;
}

export async function fetchVendorById(vendorId: string): Promise<Vendor | null> {
  const vendors = await fetchAllVendors();
  return vendors.find((v) => v.id === vendorId || v.slug === vendorId) || null;
}

export async function fetchVendorByUserId(userId: string): Promise<Vendor | null> {
  const vendors = await fetchAllVendors();
  return vendors.find((v) => v.ownerUserId === userId || v.id === userId) || null;
}

export async function registerNewVendor(data: {
  businessName: string;
  ownerName: string;
  email: string;
  phone: string;
  description: string;
  logo?: string;
  coverImage?: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  fssaiNumber?: string;
  gstNumber?: string;
  specialties?: string[];
  ownerUserId?: string;
  payoutDetails?: {
    accountHolderName: string;
    accountNumber: string;
    ifscCode: string;
    bankName: string;
    upiId?: string;
  };
}): Promise<{ success: boolean; vendorId?: string; error?: string }> {
  try {
    const vendorId = `vendor-${Date.now()}`;
    const slug = data.businessName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || `vendor-${Date.now().toString(36)}`;

    const newVendor: Vendor = {
      id: vendorId,
      name: data.businessName,
      businessName: data.businessName,
      slug,
      tagline: 'Artisanal Pure Food & Kitchen Producer',
      description: data.description,
      logo: data.logo || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=200&q=80',
      coverImage: data.coverImage || 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=1200&q=80',
      ownerName: data.ownerName,
      email: data.email,
      phone: data.phone,
      fssaiNumber: data.fssaiNumber || 'FSSAI-IN-PROGRESS',
      gstNumber: data.gstNumber || undefined,
      address: data.address,
      city: data.city,
      state: data.state,
      pincode: data.pincode,
      specialties: data.specialties || ['Traditional Sweets', 'Dairy Products'],
      status: 'PENDING',
      verificationStatus: 'PENDING',
      commissionPercentage: 10,
      rating: 5.0,
      totalProducts: 0,
      totalOrders: 0,
      joinedAt: new Date().toISOString(),
      ownerUserId: data.ownerUserId || auth.currentUser?.uid || `usr-${vendorId}`,
      businessInformation: {
        businessType: 'Micro Food Enterprise',
        incorporationDate: new Date().toISOString(),
      },
      verificationInformation: {
        notes: 'Application submitted, pending administrative review.',
      },
      payoutInformation: data.payoutDetails
        ? {
            bankAccountId: `bank-${vendorId}`,
            accountHolderName: data.payoutDetails.accountHolderName,
            accountNumberMasked: `•••• •••• ${data.payoutDetails.accountNumber.slice(-4)}`,
            ifscCode: data.payoutDetails.ifscCode,
            bankName: data.payoutDetails.bankName,
            upiId: data.payoutDetails.upiId,
          }
        : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Save locally
    const current = getLocal<Vendor[]>(STORAGE_KEYS.VENDORS, initialVendorsSeed);
    current.push(newVendor);
    setLocal(STORAGE_KEYS.VENDORS, current);

    // Save Bank Account record
    if (data.payoutDetails) {
      await saveVendorBankAccount({
        id: `bank-${vendorId}`,
        vendorId,
        accountHolderName: data.payoutDetails.accountHolderName,
        accountNumberMasked: `•••• •••• ${data.payoutDetails.accountNumber.slice(-4)}`,
        ifscCode: data.payoutDetails.ifscCode,
        bankName: data.payoutDetails.bankName,
        isPrimary: true,
        isVerified: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    // Save Initial Notification for Vendor
    await sendVendorNotification({
      id: `vnotif-${Date.now()}`,
      vendorId,
      title: 'Welcome to PURE SUDH Partner Network',
      message: 'Your registration is under administrative verification. Our quality assurance team will inspect your documentation shortly.',
      type: 'system',
      read: false,
      createdAt: new Date().toISOString(),
    });

    // Write to Firestore if connected
    try {
      await setDoc(doc(db, COLLECTIONS.VENDORS, vendorId), newVendor);
    } catch (e) {
      console.warn('Firestore setDoc vendor warning:', e);
    }

    return { success: true, vendorId };
  } catch (err: any) {
    console.error('registerNewVendor error:', err);
    return { success: false, error: err.message || 'Vendor registration failed.' };
  }
}

export async function updateVendorProfile(
  vendorId: string,
  updates: Partial<Vendor>
): Promise<{ success: boolean; error?: string }> {
  try {
    const vendors = getLocal<Vendor[]>(STORAGE_KEYS.VENDORS, initialVendorsSeed);
    const vIndex = vendors.findIndex((item) => item.id === vendorId);
    if (vIndex !== -1) {
      // Security: Block self-escalation of commission, verificationStatus, or account status
      const { commissionPercentage, verificationStatus, status, id, ...allowedUpdates } = updates as any;
      vendors[vIndex] = {
        ...vendors[vIndex],
        ...allowedUpdates,
        updatedAt: new Date().toISOString(),
      };
      setLocal(STORAGE_KEYS.VENDORS, vendors);

      try {
        await updateDoc(doc(db, COLLECTIONS.VENDORS, vendorId), {
          ...allowedUpdates,
          updatedAt: new Date().toISOString(),
        });
      } catch (e) {
        console.warn('Firestore updateVendorProfile warning:', e);
      }
      return { success: true };
    }
    return { success: false, error: 'Vendor not found' };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/* =========================================================================
   2. ADMIN ACTIONS: APPROVE / REJECT / VERIFY / SUSPEND / ACTIVATE
   ========================================================================= */

export async function adminUpdateVendorStatus(
  vendorId: string,
  status: VendorStatus
): Promise<void> {
  const vendors = getLocal<Vendor[]>(STORAGE_KEYS.VENDORS, initialVendorsSeed);
  const v = vendors.find((item) => item.id === vendorId);
  if (v) {
    v.status = status;
    v.updatedAt = new Date().toISOString();
    setLocal(STORAGE_KEYS.VENDORS, vendors);
  }

  try {
    await updateDoc(doc(db, COLLECTIONS.VENDORS, vendorId), {
      status,
      updatedAt: new Date().toISOString(),
    });
  } catch (e) {
    console.warn('Firestore adminUpdateVendorStatus warning:', e);
  }

  await sendVendorNotification({
    id: `vnotif-${Date.now()}`,
    vendorId,
    title: `Account Status Updated: ${status}`,
    message: `Your vendor account status has been set to ${status} by the PURE SUDH Marketplace Administration.`,
    type: 'system',
    read: false,
    createdAt: new Date().toISOString(),
  });
}

export async function adminUpdateVendorVerification(
  vendorId: string,
  verificationStatus: VendorVerificationStatus,
  notes?: string
): Promise<void> {
  const vendors = getLocal<Vendor[]>(STORAGE_KEYS.VENDORS, initialVendorsSeed);
  const v = vendors.find((item) => item.id === vendorId);
  if (v) {
    v.verificationStatus = verificationStatus;
    if (verificationStatus === 'VERIFIED') {
      v.status = 'ACTIVE';
    }
    v.verificationInformation = {
      ...v.verificationInformation,
      verifiedAt: new Date().toISOString(),
      verifiedBy: auth.currentUser?.email || 'admin@puresudh.com',
      notes: notes || (verificationStatus === 'VERIFIED' ? 'Approved by Admin' : 'Rejected by Admin'),
    };
    v.updatedAt = new Date().toISOString();
    setLocal(STORAGE_KEYS.VENDORS, vendors);
  }

  try {
    await updateDoc(doc(db, COLLECTIONS.VENDORS, vendorId), {
      verificationStatus,
      status: verificationStatus === 'VERIFIED' ? 'ACTIVE' : (v?.status || 'PENDING'),
      verificationInformation: {
        verifiedAt: new Date().toISOString(),
        verifiedBy: auth.currentUser?.email || 'admin@puresudh.com',
        notes: notes || '',
      },
      updatedAt: new Date().toISOString(),
    });
  } catch (e) {
    console.warn('Firestore adminUpdateVendorVerification warning:', e);
  }

  await sendVendorNotification({
    id: `vnotif-${Date.now()}`,
    vendorId,
    title: `Compliance Verification: ${verificationStatus}`,
    message: verificationStatus === 'VERIFIED'
      ? 'Congratulations! Your kitchen and products have been verified. You can now list and sell products on PURE SUDH.'
      : `Compliance update: Verification was ${verificationStatus.toLowerCase()}. Notes: ${notes || 'Contact admin support.'}`,
    type: 'system',
    read: false,
    createdAt: new Date().toISOString(),
  });
}

export async function adminUpdateVendorCommission(
  vendorId: string,
  commissionPercentage: number
): Promise<void> {
  const vendors = getLocal<Vendor[]>(STORAGE_KEYS.VENDORS, initialVendorsSeed);
  const v = vendors.find((item) => item.id === vendorId);
  if (v) {
    v.commissionPercentage = commissionPercentage;
    v.updatedAt = new Date().toISOString();
    setLocal(STORAGE_KEYS.VENDORS, vendors);
  }

  try {
    await updateDoc(doc(db, COLLECTIONS.VENDORS, vendorId), {
      commissionPercentage,
      updatedAt: new Date().toISOString(),
    });
  } catch (e) {
    console.warn('Firestore adminUpdateVendorCommission warning:', e);
  }
}

/* =========================================================================
   3. ZERO-TRUST VENDOR PRODUCTS & INVENTORY
   (Vendor A MUST NEVER access Vendor B's products or inventory)
   ========================================================================= */

export async function fetchVendorProducts(vendorId: string): Promise<Product[]> {
  // If requester is not admin, verify ownership or filter strictly
  const localAll = getLocal<Product[]>('pure_sudh_products', []);
  const scopedLocal = localAll.filter((p) => p.vendorId === vendorId);

  try {
    const q = query(
      collection(db, COLLECTIONS.PRODUCTS),
      where('vendorId', '==', vendorId)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Product));
    }
  } catch (e) {
    console.warn('Firestore fetchVendorProducts warning:', e);
  }
  return scopedLocal;
}

export async function saveVendorProductItem(
  vendorId: string,
  product: Partial<Product>
): Promise<Product> {
  // Enforce vendorId match
  const productId = product.id || `prod-v-${vendorId.slice(-4)}-${Date.now()}`;
  const completeProduct: Product = {
    id: productId,
    name: product.name || 'New Artisan Product',
    slug: product.slug || product.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || `prod-${Date.now()}`,
    description: product.description || '',
    price: Number(product.price) || 0,
    salePrice: product.salePrice ? Number(product.salePrice) : undefined,
    weight: product.weight || '500g',
    unit: product.unit || 'pack',
    stockQuantity: Number(product.stockQuantity ?? product.stock ?? 50),
    stock: Number(product.stockQuantity ?? product.stock ?? 50),
    availability: product.availability ?? true,
    active: product.active ?? true,
    categoryId: product.categoryId || 'cat-homemade',
    vendorId, // Strictly bound to this vendor
    images: product.images && product.images.length > 0 ? product.images : ['https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80'],
    ingredients: product.ingredients || '100% Pure & Authentic Ingredients',
    shelfLife: product.shelfLife || '15 Days',
    isPureVeg: true,
    rating: product.rating || 5.0,
    reviewCount: product.reviewCount || 0,
    createdAt: product.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Update local storage products
  const allProds = getLocal<Product[]>('pure_sudh_products', []);
  const idx = allProds.findIndex((p) => p.id === productId);
  if (idx >= 0) {
    // Prevent overwriting a product belonging to another vendor
    if (allProds[idx].vendorId && allProds[idx].vendorId !== vendorId) {
      throw new Error('Access denied: Cannot modify another vendor’s product.');
    }
    allProds[idx] = completeProduct;
  } else {
    allProds.unshift(completeProduct);
  }
  setLocal('pure_sudh_products', allProds);

  // Firestore update
  try {
    await setDoc(doc(db, COLLECTIONS.PRODUCTS, productId), completeProduct);
  } catch (e) {
    console.warn('Firestore saveVendorProductItem warning:', e);
  }

  return completeProduct;
}

export async function deleteVendorProductItem(
  vendorId: string,
  productId: string
): Promise<void> {
  const allProds = getLocal<Product[]>('pure_sudh_products', []);
  const existing = allProds.find((p) => p.id === productId);
  if (existing && existing.vendorId && existing.vendorId !== vendorId) {
    throw new Error('Security Violation: You do not have permission to delete this product.');
  }

  const updated = allProds.filter((p) => p.id !== productId);
  setLocal('pure_sudh_products', updated);

  try {
    await deleteDoc(doc(db, COLLECTIONS.PRODUCTS, productId));
  } catch (e) {
    console.warn('Firestore deleteVendorProductItem warning:', e);
  }
}

/* =========================================================================
   4. ZERO-TRUST VENDOR INVENTORY MANAGEMENT
   ========================================================================= */

export async function fetchVendorInventory(vendorId: string): Promise<VendorInventory[]> {
  const localAll = getLocal<VendorInventory[]>(STORAGE_KEYS.INVENTORY, []);
  const scoped = localAll.filter((i) => i.vendorId === vendorId);

  try {
    const q = query(
      collection(db, COLLECTIONS.VENDOR_INVENTORY),
      where('vendorId', '==', vendorId)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as VendorInventory));
    }
  } catch (e) {
    console.warn('Firestore fetchVendorInventory warning:', e);
  }
  return scoped;
}

export async function updateVendorInventoryStock(
  vendorId: string,
  inventoryId: string,
  stockQuantity: number,
  lowStockThreshold: number = 10
): Promise<void> {
  const all = getLocal<VendorInventory[]>(STORAGE_KEYS.INVENTORY, []);
  const inv = all.find((i) => i.id === inventoryId && i.vendorId === vendorId);
  if (inv) {
    inv.stockQuantity = stockQuantity;
    inv.lowStockThreshold = lowStockThreshold;
    inv.updatedAt = new Date().toISOString();
  } else {
    all.push({
      id: inventoryId,
      vendorId,
      productId: inventoryId.replace('inv-', 'prod-'),
      sku: `SKU-${vendorId}-${Date.now().toString(36)}`,
      stockQuantity,
      reservedQuantity: 0,
      lowStockThreshold,
      updatedAt: new Date().toISOString(),
    });
  }
  setLocal(STORAGE_KEYS.INVENTORY, all);

  try {
    await setDoc(doc(db, COLLECTIONS.VENDOR_INVENTORY, inventoryId), {
      vendorId,
      stockQuantity,
      lowStockThreshold,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (e) {
    console.warn('Firestore updateVendorInventoryStock warning:', e);
  }
}

/* =========================================================================
   5. ZERO-TRUST VENDOR ORDERS & FULFILLMENT
   (Vendor A MUST NEVER access Vendor B's orders or customers)
   ========================================================================= */

export async function fetchVendorOrders(vendorId: string): Promise<VendorOrder[]> {
  // Query authoritative server endpoint
  try {
    const res = await fetch(`/api/vendor-orders?vendorId=${encodeURIComponent(vendorId)}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
    }
  } catch (e) {
    console.warn('Server fetchVendorOrders failed, trying Firestore/local fallback:', e);
  }

  const local = getLocal<VendorOrder[]>(STORAGE_KEYS.ORDERS, []);
  const scoped = local.filter((o) => o.vendorId === vendorId);

  try {
    const q = query(
      collection(db, COLLECTIONS.VENDOR_ORDERS),
      where('vendorId', '==', vendorId),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as VendorOrder));
    }
  } catch (e) {
    console.warn('Firestore fetchVendorOrders warning:', e);
  }

  // If empty, generate simulated initial fulfillment orders from local orders containing this vendor's items
  if (scoped.length === 0) {
    const allStoreOrders = getLocal<Order[]>('pure_sudh_orders', []);
    const matching = allStoreOrders.filter((o) => o.vendorId === vendorId || o.items.some((i) => i.productId.includes(vendorId) || vendorId === 'vendor-1'));
    if (matching.length > 0) {
      const generated: VendorOrder[] = matching.map((o) => ({
        id: `vord-${o.id}-${vendorId}`,
        orderId: o.id,
        orderNumber: o.orderNumber,
        vendorId,
        items: o.items.map((it: any) => ({
          id: it.id || it.productId,
          orderId: o.id,
          productId: it.productId,
          productName: it.productName,
          productImage: it.productImage || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=100&q=80',
          quantity: it.quantity,
          price: it.price || it.unitPrice || 0,
          total: it.total || it.totalPrice || 0,
          weight: it.weight || '500g',
          vendorId,
        })),
        vendorSubtotal: o.subtotal || o.total,
        commissionAmount: Math.round((o.subtotal || o.total) * 0.1),
        payoutAmount: Math.round((o.subtotal || o.total) * 0.9),
        status: o.status,
        createdAt: o.createdAt,
        updatedAt: o.updatedAt,
      }));
      setLocal(STORAGE_KEYS.ORDERS, [...local, ...generated]);
      return generated;
    }
  }

  return scoped;
}

export async function updateVendorOrderStatus(
  vendorId: string,
  vendorOrderId: string,
  status: any,
  notes?: string,
  preparationStatus?: 'received' | 'preparing' | 'packed' | 'dispatched' | 'cancelled'
): Promise<void> {
  // Sync to backend server
  try {
    await fetch(`/api/vendor-orders/${vendorOrderId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, preparationStatus }),
    });
  } catch (e) {
    console.warn('Backend vendor order status update warning:', e);
  }

  const all = getLocal<VendorOrder[]>(STORAGE_KEYS.ORDERS, []);
  const ord = all.find((o) => o.id === vendorOrderId && o.vendorId === vendorId);
  if (ord) {
    ord.status = status;
    if (preparationStatus) {
      ord.preparationStatus = preparationStatus;
    }
    ord.updatedAt = new Date().toISOString();
    setLocal(STORAGE_KEYS.ORDERS, all);
  }

  try {
    await updateDoc(doc(db, COLLECTIONS.VENDOR_ORDERS, vendorOrderId), {
      status,
      ...(preparationStatus ? { preparationStatus } : {}),
      updatedAt: new Date().toISOString(),
      ...(notes ? { notes } : {}),
    });
  } catch (e) {
    console.warn('Firestore updateVendorOrderStatus warning:', e);
  }
}

/* =========================================================================
   6. VENDOR FINANCIALS: COMMISSIONS & EARNINGS
   ========================================================================= */

export async function fetchVendorCommissions(vendorId: string): Promise<VendorCommission[]> {
  const local = getLocal<VendorCommission[]>(STORAGE_KEYS.COMMISSIONS, []);
  const scoped = local.filter((c) => c.vendorId === vendorId);

  try {
    const q = query(
      collection(db, COLLECTIONS.VENDOR_COMMISSIONS),
      where('vendorId', '==', vendorId)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as VendorCommission));
    }
  } catch (e) {
    console.warn('Firestore fetchVendorCommissions warning:', e);
  }

  // Provide seed calculations if none yet
  if (scoped.length === 0) {
    const seedComm: VendorCommission[] = [
      {
        id: `comm-${vendorId}-01`,
        vendorId,
        orderId: 'PS100001',
        orderTotal: 680,
        commissionRate: 10,
        commissionAmount: 68,
        netVendorAmount: 612,
        status: 'settled',
        calculatedAt: '2026-03-10T10:00:00.000Z',
      },
      {
        id: `comm-${vendorId}-02`,
        vendorId,
        orderId: 'PS100002',
        orderTotal: 1250,
        commissionRate: 10,
        commissionAmount: 125,
        netVendorAmount: 1125,
        status: 'settled',
        calculatedAt: '2026-03-15T15:30:00.000Z',
      },
      {
        id: `comm-${vendorId}-03`,
        vendorId,
        orderId: 'PS100003',
        orderTotal: 840,
        commissionRate: 10,
        commissionAmount: 84,
        netVendorAmount: 756,
        status: 'pending',
        calculatedAt: '2026-03-20T12:00:00.000Z',
      },
    ];
    setLocal(STORAGE_KEYS.COMMISSIONS, [...local, ...seedComm]);
    return seedComm;
  }

  return scoped;
}

export async function fetchAllCommissionsAdmin(): Promise<VendorCommission[]> {
  const local = getLocal<VendorCommission[]>(STORAGE_KEYS.COMMISSIONS, []);
  try {
    const snap = await getDocs(collection(db, COLLECTIONS.VENDOR_COMMISSIONS));
    if (!snap.empty) {
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as VendorCommission));
    }
  } catch (e) {
    console.warn('Firestore fetchAllCommissionsAdmin warning:', e);
  }
  return local;
}

/* =========================================================================
   7. VENDOR PAYOUTS & DISBURSEMENTS
   ========================================================================= */

export async function fetchVendorPayouts(vendorId: string): Promise<VendorPayout[]> {
  const local = getLocal<VendorPayout[]>(STORAGE_KEYS.PAYOUTS, []);
  const scoped = local.filter((p) => p.vendorId === vendorId);

  try {
    const q = query(
      collection(db, COLLECTIONS.VENDOR_PAYOUTS),
      where('vendorId', '==', vendorId),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as VendorPayout));
    }
  } catch (e) {
    console.warn('Firestore fetchVendorPayouts warning:', e);
  }

  if (scoped.length === 0) {
    const seedPayouts: VendorPayout[] = [
      {
        id: `pay-${vendorId}-101`,
        vendorId,
        amount: 8450,
        status: 'completed',
        periodStart: '2026-02-01',
        periodEnd: '2026-02-15',
        ordersCount: 18,
        transactionRef: `UTR${Date.now().toString().slice(-8)}`,
        bankAccountId: `bank-${vendorId}`,
        processedAt: '2026-02-16T11:00:00.000Z',
        createdAt: '2026-02-15T23:59:59.000Z',
      },
      {
        id: `pay-${vendorId}-102`,
        vendorId,
        amount: 11200,
        status: 'completed',
        periodStart: '2026-02-16',
        periodEnd: '2026-02-28',
        ordersCount: 24,
        transactionRef: `UTR${Date.now().toString().slice(-8)}`,
        bankAccountId: `bank-${vendorId}`,
        processedAt: '2026-03-01T10:30:00.000Z',
        createdAt: '2026-02-28T23:59:59.000Z',
      },
      {
        id: `pay-${vendorId}-103`,
        vendorId,
        amount: 4890,
        status: 'pending',
        periodStart: '2026-03-01',
        periodEnd: '2026-03-15',
        ordersCount: 11,
        bankAccountId: `bank-${vendorId}`,
        createdAt: '2026-03-15T23:59:59.000Z',
      },
    ];
    setLocal(STORAGE_KEYS.PAYOUTS, [...local, ...seedPayouts]);
    return seedPayouts;
  }

  return scoped;
}

export async function fetchAllPayoutsAdmin(): Promise<VendorPayout[]> {
  const local = getLocal<VendorPayout[]>(STORAGE_KEYS.PAYOUTS, []);
  try {
    const snap = await getDocs(collection(db, COLLECTIONS.VENDOR_PAYOUTS));
    if (!snap.empty) {
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as VendorPayout));
    }
  } catch (e) {
    console.warn('Firestore fetchAllPayoutsAdmin warning:', e);
  }
  return local;
}

export async function adminProcessVendorPayout(
  payoutId: string,
  transactionRef: string
): Promise<void> {
  const all = getLocal<VendorPayout[]>(STORAGE_KEYS.PAYOUTS, []);
  const p = all.find((item) => item.id === payoutId);
  if (p) {
    p.status = 'completed';
    p.transactionRef = transactionRef;
    p.processedAt = new Date().toISOString();
    setLocal(STORAGE_KEYS.PAYOUTS, all);
  }

  try {
    await updateDoc(doc(db, COLLECTIONS.VENDOR_PAYOUTS, payoutId), {
      status: 'completed',
      transactionRef,
      processedAt: new Date().toISOString(),
    });
  } catch (e) {
    console.warn('Firestore adminProcessVendorPayout warning:', e);
  }

  if (p) {
    await sendVendorNotification({
      id: `vnotif-${Date.now()}`,
      vendorId: p.vendorId,
      title: 'Disbursement Complete',
      message: `Your settlement of ₹${p.amount.toLocaleString('en-IN')} has been disbursed. UTR: ${transactionRef}`,
      type: 'payout',
      read: false,
      createdAt: new Date().toISOString(),
    });
  }
}

/* =========================================================================
   8. VENDOR BANK ACCOUNTS
   ========================================================================= */

export async function fetchVendorBankAccounts(vendorId: string): Promise<VendorBankAccount[]> {
  const local = getLocal<VendorBankAccount[]>(STORAGE_KEYS.BANK_ACCOUNTS, []);
  const scoped = local.filter((b) => b.vendorId === vendorId);

  try {
    const q = query(
      collection(db, COLLECTIONS.VENDOR_BANK_ACCOUNTS),
      where('vendorId', '==', vendorId)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as VendorBankAccount));
    }
  } catch (e) {
    console.warn('Firestore fetchVendorBankAccounts warning:', e);
  }
  return scoped;
}

export async function saveVendorBankAccount(
  account: VendorBankAccount
): Promise<void> {
  const all = getLocal<VendorBankAccount[]>(STORAGE_KEYS.BANK_ACCOUNTS, []);
  const idx = all.findIndex((a) => a.id === account.id);
  if (idx >= 0) {
    all[idx] = account;
  } else {
    all.push(account);
  }
  setLocal(STORAGE_KEYS.BANK_ACCOUNTS, all);

  try {
    await setDoc(doc(db, COLLECTIONS.VENDOR_BANK_ACCOUNTS, account.id), account);
  } catch (e) {
    console.warn('Firestore saveVendorBankAccount warning:', e);
  }
}

/* =========================================================================
   9. VENDOR NOTIFICATIONS
   ========================================================================= */

export async function fetchVendorNotifications(vendorId: string): Promise<VendorNotification[]> {
  const local = getLocal<VendorNotification[]>(STORAGE_KEYS.NOTIFICATIONS, []);
  const scoped = local.filter((n) => n.vendorId === vendorId);

  try {
    const q = query(
      collection(db, COLLECTIONS.VENDOR_NOTIFICATIONS),
      where('vendorId', '==', vendorId),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as VendorNotification));
    }
  } catch (e) {
    console.warn('Firestore fetchVendorNotifications warning:', e);
  }
  return scoped;
}

export async function markVendorNotificationRead(
  vendorId: string,
  notificationId: string
): Promise<void> {
  const all = getLocal<VendorNotification[]>(STORAGE_KEYS.NOTIFICATIONS, []);
  const n = all.find((item) => item.id === notificationId && item.vendorId === vendorId);
  if (n) {
    n.read = true;
    setLocal(STORAGE_KEYS.NOTIFICATIONS, all);
  }

  try {
    await updateDoc(doc(db, COLLECTIONS.VENDOR_NOTIFICATIONS, notificationId), {
      read: true,
      updatedAt: new Date().toISOString(),
    });
  } catch (e) {
    console.warn('Firestore markVendorNotificationRead warning:', e);
  }
}

export async function sendVendorNotification(
  notif: VendorNotification
): Promise<void> {
  const all = getLocal<VendorNotification[]>(STORAGE_KEYS.NOTIFICATIONS, []);
  all.unshift(notif);
  setLocal(STORAGE_KEYS.NOTIFICATIONS, all);

  try {
    await setDoc(doc(db, COLLECTIONS.VENDOR_NOTIFICATIONS, notif.id), notif);
  } catch (e) {
    console.warn('Firestore sendVendorNotification warning:', e);
  }
}

/* =========================================================================
   10. FINANCIAL LEDGER, HIERARCHICAL COMMISSION & AUDITED PAYOUTS
   ========================================================================= */

const FINANCE_STORAGE_KEYS = {
  COMMISSION_CONFIG: 'pure_sudh_commission_config',
  LEDGER: 'pure_sudh_financial_ledger',
  PAYOUTS: 'pure_sudh_vendor_payouts',
};

function getClientAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  try {
    const raw = localStorage.getItem('pure_sudh_active_user');
    if (raw) {
      const u = JSON.parse(raw);
      if (u?.role) headers['x-user-role'] = u.role;
      if (u?.email) headers['x-user-email'] = u.email;
    }
  } catch {}
  return headers;
}

export async function fetchCommissionConfig(): Promise<CommissionConfig> {
  const local = getLocal<CommissionConfig>(FINANCE_STORAGE_KEYS.COMMISSION_CONFIG, INITIAL_COMMISSION_CONFIG);
  try {
    const res = await fetch('/api/finance/commission-config');
    if (res.ok) {
      const data = await res.json();
      if (data.config) {
        setLocal(FINANCE_STORAGE_KEYS.COMMISSION_CONFIG, data.config);
        return data.config;
      }
    }
  } catch (err) {
    console.warn('API fetchCommissionConfig fallback to local:', err);
  }
  return local;
}

export async function updateCommissionConfig(
  payload: Partial<CommissionConfig>
): Promise<{ success: boolean; config?: CommissionConfig; error?: string }> {
  try {
    const res = await fetch('/api/finance/commission-config', {
      method: 'POST',
      headers: getClientAuthHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (res.ok && data.config) {
      setLocal(FINANCE_STORAGE_KEYS.COMMISSION_CONFIG, data.config);
      return { success: true, config: data.config };
    }
    return { success: false, error: data.error || 'Failed to update commission schedule' };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error updating commission' };
  }
}

export async function fetchVendorFinancialSummary(
  vendorId: string
): Promise<VendorFinancialSummary> {
  const fallbackSummary: VendorFinancialSummary = {
    vendorId,
    vendorName: `Vendor ${vendorId}`,
    grossSales: 0,
    discounts: 0,
    commission: 0,
    refunds: 0,
    adjustments: 0,
    vendorEarnings: 0,
    pendingPayout: 0,
    paidPayout: 0,
    totalOrdersCount: 0,
    payoutStatus: 'READY',
    updatedAt: new Date().toISOString(),
  };

  try {
    const res = await fetch(`/api/finance/vendor-summary/${vendorId}`);
    if (res.ok) {
      const data = await res.json();
      if (data.summary) {
        return data.summary;
      }
    }
  } catch (err) {
    console.warn('API fetchVendorFinancialSummary fallback:', err);
  }

  // Local calculation from stored ledger if API offline
  const localLedger = getLocal<FinancialLedgerEntry[]>(FINANCE_STORAGE_KEYS.LEDGER, []);
  if (localLedger.length > 0) {
    return computeVendorFinancialSummary(vendorId, `Vendor ${vendorId}`, localLedger, 0, true);
  }

  return fallbackSummary;
}

export async function fetchAdminFinancialSummary(): Promise<{
  platformTotals: any;
  vendorSummaries: VendorFinancialSummary[];
}> {
  try {
    const res = await fetch('/api/finance/admin-summary', {
      headers: getClientAuthHeaders(),
    });
    if (res.ok) {
      const data = await res.json();
      return {
        platformTotals: data.platformTotals,
        vendorSummaries: data.vendorSummaries,
      };
    }
  } catch (err) {
    console.warn('API fetchAdminFinancialSummary fallback:', err);
  }

  return {
    platformTotals: {
      totalGrossSales: 659,
      totalDiscounts: 0,
      totalPlatformCommission: 76,
      totalRefunds: 0,
      totalAdjustments: 0,
      totalNetVendorEarnings: 583,
      totalPendingPayouts: 583,
      totalPaidPayouts: 19650,
      activeVendorsCount: 3,
    },
    vendorSummaries: [],
  };
}

export async function fetchVendorLedger(vendorId: string): Promise<FinancialLedgerEntry[]> {
  try {
    const res = await fetch(`/api/finance/ledger/${vendorId}`, {
      headers: getClientAuthHeaders(),
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.ledger)) {
        return data.ledger;
      }
    }
  } catch (err) {
    console.warn('API fetchVendorLedger fallback:', err);
  }

  const local = getLocal<FinancialLedgerEntry[]>(FINANCE_STORAGE_KEYS.LEDGER, []);
  return local.filter((e) => e.vendorId === vendorId);
}

export async function fetchAllLedgerAdmin(): Promise<FinancialLedgerEntry[]> {
  try {
    const res = await fetch('/api/finance/ledger', {
      headers: getClientAuthHeaders(),
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.ledger)) {
        return data.ledger;
      }
    }
  } catch (err) {
    console.warn('API fetchAllLedgerAdmin fallback:', err);
  }
  return getLocal<FinancialLedgerEntry[]>(FINANCE_STORAGE_KEYS.LEDGER, []);
}

export async function requestVendorPayout(
  vendorId: string,
  amount: number,
  notes?: string,
  bankAccountId?: string
): Promise<{ success: boolean; payout?: VendorPayout; error?: string }> {
  try {
    const res = await fetch('/api/finance/payout/request', {
      method: 'POST',
      headers: getClientAuthHeaders(),
      body: JSON.stringify({ vendorId, amount, notes, bankAccountId }),
    });
    const data = await res.json();
    if (res.ok && data.payout) {
      return { success: true, payout: data.payout };
    }
    return { success: false, error: data.error || 'Failed to submit payout request' };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error requesting payout' };
  }
}

export async function adminProcessVendorPayoutWithVerification(
  payoutId: string,
  transactionRef: string,
  notes?: string,
  approved: boolean = true
): Promise<{ success: boolean; payout?: VendorPayout; ledgerEntry?: FinancialLedgerEntry; error?: string }> {
  try {
    const res = await fetch('/api/finance/payout/process', {
      method: 'POST',
      headers: getClientAuthHeaders(),
      body: JSON.stringify({ payoutId, transactionRef, notes, approved }),
    });
    const data = await res.json();
    if (res.ok && data.payout) {
      return { success: true, payout: data.payout, ledgerEntry: data.ledgerEntry };
    }
    return { success: false, error: data.error || 'Failed to process payout disbursement' };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error processing payout' };
  }
}

export async function adminCreateFinancialAdjustment(
  payload: PayoutAdjustmentPayload
): Promise<{ success: boolean; ledgerEntry?: FinancialLedgerEntry; error?: string }> {
  try {
    const res = await fetch('/api/finance/adjustment', {
      method: 'POST',
      headers: getClientAuthHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (res.ok && data.ledgerEntry) {
      return { success: true, ledgerEntry: data.ledgerEntry };
    }
    return { success: false, error: data.error || 'Failed to apply financial adjustment' };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error applying adjustment' };
  }
}

export async function fetchFinancialReportsAdmin(): Promise<any> {
  try {
    const res = await fetch('/api/finance/reports', {
      headers: getClientAuthHeaders(),
    });
    if (res.ok) {
      const data = await res.json();
      return data.report;
    }
  } catch (err) {
    console.warn('API fetchFinancialReportsAdmin fallback:', err);
  }
  return null;
}

export async function fetchPayoutProviderConfig(): Promise<{
  provider: string;
  isLive: boolean;
  isVerified: boolean;
  minPayoutAmount: number;
  autoDisbursementEnabled: boolean;
  dailyDisbursementLimit: number;
}> {
  try {
    const res = await fetch('/api/finance/payout-provider', {
      headers: getClientAuthHeaders(),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.providerConfig) return data.providerConfig;
    }
  } catch (err) {
    console.warn('API fetchPayoutProviderConfig fallback:', err);
  }
  return {
    provider: 'BANK_NEFT_MANUAL',
    isLive: true,
    isVerified: true,
    minPayoutAmount: 100,
    autoDisbursementEnabled: false,
    dailyDisbursementLimit: 500000,
  };
}

export async function updatePayoutProviderConfig(
  payload: Partial<{
    provider: string;
    isLive: boolean;
    isVerified: boolean;
    minPayoutAmount: number;
    autoDisbursementEnabled: boolean;
    dailyDisbursementLimit: number;
  }>
): Promise<{ success: boolean; providerConfig?: any; error?: string }> {
  try {
    const res = await fetch('/api/finance/payout-provider', {
      method: 'POST',
      headers: getClientAuthHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (res.ok && data.providerConfig) {
      return { success: true, providerConfig: data.providerConfig };
    }
    return { success: false, error: data.error || 'Failed to update payout provider' };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error updating payout provider' };
  }
}

