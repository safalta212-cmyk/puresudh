import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  Unsubscribe,
} from 'firebase/firestore';
import {
  auth,
  db,
  assertFirestoreWriteSuccess,
  OperationType,
  stripUndefinedFields,
} from '../firebase/config';
import { COLLECTIONS } from '../constants';
import {
  GeoPointData,
  GpsTrackingStatus,
  LiveTrackingSession,
  Order,
  OrderStatus,
  RouteSummaryData,
} from '../types';

export const DEFAULT_HUB_COORDS: GeoPointData = {
  lat: 25.6093,
  lng: 85.1376,
  timestamp: '2026-01-01T00:00:00.000Z',
};

export interface DeliveryRiderOption {
  uid: string;
  name: string;
  email: string;
  phone?: string;
  source: 'users' | 'staff';
  role: string;
}

const PINCODE_COORDS_MAP: Record<string, { lat: number; lng: number }> = {
  '800001': { lat: 25.6127, lng: 85.1376 }, // Fraser Road / Dakbunglow
  '800003': { lat: 25.6144, lng: 85.0486 }, // Bailey Road / Danapur
  '800013': { lat: 25.6207, lng: 85.1147 }, // Patliputra / Boring Road
  '800014': { lat: 25.6178, lng: 85.1024 }, // Bailey Road / Sheikhpura
  '800016': { lat: 25.6188, lng: 85.1258 }, // Rajendra Nagar
  '800020': { lat: 25.5941, lng: 85.1554 }, // Kankarbagh
  '201301': { lat: 28.5706, lng: 77.3261 }, // Noida Sector 18
  '201309': { lat: 28.6279, lng: 77.3649 }, // Noida Sector 62
  '110001': { lat: 28.6315, lng: 77.2167 }, // Connaught Place
  '110092': { lat: 28.6328, lng: 77.2914 }, // Preet Vihar
  '122001': { lat: 28.4595, lng: 77.0266 }, // Gurugram
};

const LOCAL_TRACKING_PREFIX = 'pure_sudh_tracking_';

function saveLocalTracking(orderId: string, session: LiveTrackingSession): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(`${LOCAL_TRACKING_PREFIX}${orderId}`, JSON.stringify(session));
    }
  } catch {
    // Ignore storage quota warnings
  }
}

export function getLocalTracking(orderId: string): LiveTrackingSession | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(`${LOCAL_TRACKING_PREFIX}${orderId}`);
    return raw ? (JSON.parse(raw) as LiveTrackingSession) : null;
  } catch {
    return null;
  }
}

export function isOrderTerminal(status?: OrderStatus | string | null): boolean {
  const s = String(status || '').trim().toUpperCase();
  return s === 'DELIVERED' || s === 'CANCELLED' || s === 'REFUNDED';
}

export function isOrderTrackable(status?: OrderStatus | string | null): boolean {
  if (!status) return false;
  return !isOrderTerminal(status);
}

export function haversineDistanceMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h =
    sinDLat * sinDLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinDLng * sinDLng;
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function formatLastUpdatedRelative(isoString?: string | null, nowMs: number = Date.now()): string {
  if (!isoString) return 'Not updated yet';
  const ts = Date.parse(isoString);
  if (Number.isNaN(ts)) return 'Unknown';
  const diffSec = Math.max(0, Math.floor((nowMs - ts) / 1000));
  if (diffSec < 5) return 'Just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  return `${diffHr}h ago`;
}

export function isGpsFixStale(
  lastUpdatedAt?: string | null,
  thresholdMs: number = 30000,
  nowMs: number = Date.now()
): boolean {
  if (!lastUpdatedAt) return true;
  const ts = Date.parse(lastUpdatedAt);
  if (Number.isNaN(ts)) return true;
  return nowMs - ts > thresholdMs;
}

export function shouldPublishGpsUpdate(
  prev: GeoPointData | null | undefined,
  next: GeoPointData,
  force: boolean = false,
  nowMs: number = Date.now(),
  minIntervalMs: number = 8000,
  minDistanceMeters: number = 12
): boolean {
  if (force || !prev) return true;
  const prevMs = Date.parse(prev.timestamp);
  const elapsed = Number.isNaN(prevMs) ? minIntervalMs + 1 : nowMs - prevMs;
  if (elapsed < minIntervalMs) {
    return false;
  }
  const moved = haversineDistanceMeters(prev, next);
  // Publish if moved >= minDistanceMeters OR heartbeat interval (> 25s) reached
  return moved >= minDistanceMeters || elapsed >= 25000;
}

export function getFallbackDestinationCoords(order?: Partial<Order> | null): GeoPointData {
  if (
    order?.destinationCoordinates &&
    typeof order.destinationCoordinates.lat === 'number' &&
    typeof order.destinationCoordinates.lng === 'number'
  ) {
    return order.destinationCoordinates;
  }

  const pincode = String(order?.deliveryAddress?.pincode || order?.deliveryAreaPincode || '800001')
    .replace(/\D/g, '')
    .slice(0, 6);

  if (PINCODE_COORDS_MAP[pincode]) {
    return {
      ...PINCODE_COORDS_MAP[pincode],
      timestamp: new Date().toISOString(),
    };
  }

  // Deterministic offset near Patna Hub based on pincode digits
  const tail = Number(pincode.slice(-2) || '14') % 30;
  return {
    lat: Number((DEFAULT_HUB_COORDS.lat + (tail - 15) * 0.0012).toFixed(6)),
    lng: Number((DEFAULT_HUB_COORDS.lng + ((tail % 10) - 5) * 0.0015).toFixed(6)),
    timestamp: new Date().toISOString(),
  };
}

export async function resolveOrderDestinationCoords(order: Order): Promise<GeoPointData> {
  if (
    order.destinationCoordinates &&
    typeof order.destinationCoordinates.lat === 'number' &&
    typeof order.destinationCoordinates.lng === 'number'
  ) {
    return order.destinationCoordinates;
  }

  const addrParts = [
    order.deliveryAddress?.addressLine,
    order.deliveryAddress?.landmark,
    order.deliveryAddress?.city,
    order.deliveryAddress?.state,
    order.deliveryAddress?.pincode,
  ]
    .filter(Boolean)
    .join(', ');

  if (addrParts.length > 5 && typeof fetch !== 'undefined') {
    try {
      const res = await fetch(`/api/maps/geocode?address=${encodeURIComponent(addrParts)}`);
      const ct = res.headers.get('content-type') || '';
      if (res.ok && ct.includes('application/json')) {
        const data = await res.json();
        if (
          data?.success &&
          typeof data.lat === 'number' &&
          typeof data.lng === 'number'
        ) {
          return {
            lat: data.lat,
            lng: data.lng,
            timestamp: new Date().toISOString(),
          };
        }
      }
    } catch {
      // Fall back to deterministic pincode mapping
    }
  }

  return getFallbackDestinationCoords(order);
}

async function execTrackedWrite(
  fn: () => Promise<void>,
  op: OperationType,
  path: string
): Promise<void> {
  try {
    await fn();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const isPerm =
      msg.includes('permission-denied') ||
      msg.includes('Missing or insufficient permissions');
    if (isPerm && auth.currentUser) {
      try {
        await auth.currentUser.reload().catch(() => {});
        await auth.currentUser.getIdToken(true);
        await fn();
        return;
      } catch (retryErr) {
        assertFirestoreWriteSuccess(retryErr, op, path);
        return;
      }
    }
    assertFirestoreWriteSuccess(err, op, path);
  }
}

/**
 * Fetch assignable delivery personnel & fleet operators (from users and staff collections)
 */
export async function fetchDeliveryPersonnel(): Promise<DeliveryRiderOption[]> {
  const riderMap = new Map<string, DeliveryRiderOption>();

  try {
    const staffSnap = await getDocs(collection(db, COLLECTIONS.STAFF));
    staffSnap.docs.forEach((d) => {
      const data = d.data() as any;
      if (data?.active === false) return;
      const uid = data.uid || d.id;
      const roleStr = String(data.role || 'staff').toLowerCase();
      if (['delivery', 'delivery_lead', 'staff', 'manager', 'admin'].includes(roleStr)) {
        riderMap.set(uid, {
          uid,
          name: data.name || data.displayName || 'Delivery Partner',
          email: data.email || '',
          phone: data.phone || '',
          source: 'staff',
          role: roleStr,
        });
      }
    });
  } catch (e) {
    console.warn('Staff fetch skipped:', e);
  }

  try {
    const usersSnap = await getDocs(
      query(collection(db, COLLECTIONS.USERS), where('role', 'in', ['delivery', 'staff']))
    );
    usersSnap.docs.forEach((d) => {
      const data = d.data() as any;
      const uid = data.uid || d.id;
      if (!riderMap.has(uid)) {
        riderMap.set(uid, {
          uid,
          name: data.displayName || data.name || 'Delivery Rider',
          email: data.email || '',
          phone: data.phone || '',
          source: 'users',
          role: data.role || 'delivery',
        });
      }
    });
  } catch (e) {
    console.warn('Delivery users query skipped:', e);
  }

  // Include standard demo rider profile when no dedicated rider is registered yet
  if (!Array.from(riderMap.values()).some((r) => r.email.toLowerCase() === 'delivery@email.com')) {
    riderMap.set('usr-delivery-master', {
      uid: 'usr-delivery-master',
      name: 'PureSudh Fleet Rider',
      email: 'delivery@email.com',
      phone: '+91 94310 12804',
      source: 'users',
      role: 'delivery',
    });
  }

  return Array.from(riderMap.values());
}

/**
 * Admin/Staff: Assign a verified delivery partner (UID) to an order
 */
export async function assignDeliveryRiderToOrder(
  order: Order,
  rider: DeliveryRiderOption
): Promise<Order> {
  const now = new Date().toISOString();
  const destCoords = await resolveOrderDestinationCoords(order);
  const updatePayload = stripUndefinedFields({
    assignedDeliveryId: rider.uid,
    assignedDeliveryName: rider.name,
    assignedDeliveryPhone: rider.phone || '',
    assignedAt: now,
    destinationCoordinates: destCoords,
    updatedAt: now,
  });

  await execTrackedWrite(
    () => updateDoc(doc(db, COLLECTIONS.ORDERS, order.id), updatePayload),
    OperationType.UPDATE,
    `${COLLECTIONS.ORDERS}/${order.id}`
  );

  // Sync existing tracking session metadata if one already exists
  try {
    const trackRef = doc(db, COLLECTIONS.DELIVERY_TRACKING, order.id);
    const snap = await getDoc(trackRef);
    if (snap.exists()) {
      await updateDoc(
        trackRef,
        stripUndefinedFields({
          deliveryPersonId: rider.uid,
          deliveryPersonName: rider.name,
          deliveryPersonPhone: rider.phone || '',
          destinationLocation: destCoords,
          updatedAt: now,
        })
      );
    }
  } catch {
    // Non-blocking if tracking doc hasn't been created yet
  }

  return {
    ...order,
    ...updatePayload,
  };
}

/**
 * Rider: Authorize & start delivery session for an assigned order
 */
export async function startDeliveryTrackingSession(
  order: Order,
  rider: { uid: string; name: string; phone?: string },
  initialFix?: GeoPointData | null
): Promise<LiveTrackingSession> {
  if (isOrderTerminal(order.status)) {
    throw new Error(`Cannot start GPS tracking for a ${order.status} order.`);
  }

  const now = new Date().toISOString();
  const destCoords = await resolveOrderDestinationCoords(order);

  const historyEntry = {
    status: 'Out for Delivery' as OrderStatus,
    timestamp: now,
    note: `Delivery started by ${rider.name} with live GPS sharing`,
  };
  const updatedHistory = Array.isArray(order.statusHistory)
    ? [...order.statusHistory, historyEntry]
    : [historyEntry];

  await execTrackedWrite(
    () =>
      updateDoc(
        doc(db, COLLECTIONS.ORDERS, order.id),
        stripUndefinedFields({
          status: 'Out for Delivery',
          trackingActive: true,
          updatedAt: now,
          statusHistory: updatedHistory,
        })
      ),
    OperationType.UPDATE,
    `${COLLECTIONS.ORDERS}/${order.id}`
  );

  const trackingDoc: LiveTrackingSession = {
    id: order.id,
    orderId: order.id,
    orderNumber: order.orderNumber || order.id,
    customerId: order.customerId,
    customerName: order.customerName,
    deliveryPersonId: rider.uid,
    deliveryPersonName: rider.name,
    deliveryPersonPhone: rider.phone || '',
    orderStatus: 'Out for Delivery',
    isActive: true,
    trackingStatus: initialFix ? 'active' : 'requesting_permission',
    riderLocation: initialFix || null,
    customerLocation: null,
    customerSharingEnabled: false,
    destinationLocation: destCoords,
    hubLocation: DEFAULT_HUB_COORDS,
    startedAt: now,
    lastUpdatedAt: now,
    updatedAt: now,
  };

  await execTrackedWrite(
    () =>
      setDoc(
        doc(db, COLLECTIONS.DELIVERY_TRACKING, order.id),
        stripUndefinedFields(trackingDoc),
        { merge: true }
      ),
    OperationType.CREATE,
    `${COLLECTIONS.DELIVERY_TRACKING}/${order.id}`
  );

  saveLocalTracking(order.id, trackingDoc);
  return trackingDoc;
}

/**
 * Rider: Publish throttled GPS fix to Firestore (single doc updated in place — no infinite history)
 */
export async function publishRiderGpsLocation(
  orderId: string,
  loc: GeoPointData,
  routeSummary?: RouteSummaryData | null
): Promise<void> {
  const now = new Date().toISOString();
  const payload = stripUndefinedFields({
    riderLocation: loc,
    trackingStatus: 'active' as GpsTrackingStatus,
    isActive: true,
    routeSummary: routeSummary || undefined,
    lastUpdatedAt: now,
    updatedAt: now,
  });

  await execTrackedWrite(
    () => updateDoc(doc(db, COLLECTIONS.DELIVERY_TRACKING, orderId), payload),
    OperationType.UPDATE,
    `${COLLECTIONS.DELIVERY_TRACKING}/${orderId}`
  );
}

/**
 * Rider: Update signal error/paused state honestly in Firestore
 */
export async function updateTrackingSignalStatus(
  orderId: string,
  trackingStatus: GpsTrackingStatus
): Promise<void> {
  const now = new Date().toISOString();
  try {
    const trackRef = doc(db, COLLECTIONS.DELIVERY_TRACKING, orderId);
    await updateDoc(
      trackRef,
      stripUndefinedFields({
        trackingStatus,
        stoppedAt: trackingStatus === 'stopped' ? now : undefined,
        updatedAt: now,
      })
    );
  } catch {
    // Non-fatal if doc doesn't exist or offline
  }
}

/**
 * Stop tracking cleanly & scrub sensitive customer coordinates on completion/cancellation
 */
export async function stopDeliveryTrackingSession(
  orderId: string,
  reasonStatus?: OrderStatus
): Promise<void> {
  if (!orderId) return;
  const now = new Date().toISOString();
  const terminal = reasonStatus ? isOrderTerminal(reasonStatus) : false;

  try {
    const trackRef = doc(db, COLLECTIONS.DELIVERY_TRACKING, orderId);
    const snap = await getDoc(trackRef);
    if (snap.exists()) {
      const updateFields: Record<string, any> = {
        trackingStatus: terminal ? 'completed' : 'stopped',
        stoppedAt: now,
        updatedAt: now,
      };
      if (terminal) {
        updateFields.isActive = false;
        updateFields.orderStatus = reasonStatus;
        updateFields.customerLocation = null;
        updateFields.customerSharingEnabled = false;
      }
      await updateDoc(trackRef, updateFields);
    }
  } catch (e) {
    console.warn('Stop deliveryTracking notice:', e);
  }

  try {
    await updateDoc(doc(db, COLLECTIONS.ORDERS, orderId), {
      trackingActive: false,
      updatedAt: now,
    });
  } catch {
    // Non-blocking if caller lacks order update permission during read cleanup
  }
}

/**
 * Rider: Mark assigned order delivered & immediately terminate tracking + clear customer GPS
 */
export async function completeDeliveryByRider(
  order: Order,
  riderName: string
): Promise<void> {
  const now = new Date().toISOString();
  const historyEntry = {
    status: 'Delivered' as OrderStatus,
    timestamp: now,
    note: `Order delivered and GPS tracking ended by ${riderName}`,
  };
  const updatedHistory = Array.isArray(order.statusHistory)
    ? [...order.statusHistory, historyEntry]
    : [historyEntry];

  await execTrackedWrite(
    () =>
      updateDoc(doc(db, COLLECTIONS.ORDERS, order.id), {
        status: 'Delivered',
        trackingActive: false,
        updatedAt: now,
        statusHistory: updatedHistory,
      }),
    OperationType.UPDATE,
    `${COLLECTIONS.ORDERS}/${order.id}`
  );

  await stopDeliveryTrackingSession(order.id, 'Delivered');
}

/**
 * Customer: Voluntarily share or revoke their current GPS pin during an active delivery
 */
export async function toggleCustomerLocationSharing(
  order: Order,
  customerId: string,
  enabled: boolean,
  loc?: GeoPointData | null
): Promise<void> {
  if (isOrderTerminal(order.status)) {
    throw new Error('Location sharing is unavailable once an order is completed or cancelled.');
  }
  if (!order.customerId || order.customerId !== customerId) {
    throw new Error('Only the verified order customer can share their location.');
  }

  const now = new Date().toISOString();
  const trackRef = doc(db, COLLECTIONS.DELIVERY_TRACKING, order.id);
  const snap = await getDoc(trackRef);
  if (!snap.exists()) {
    throw new Error('Live location sharing activates once a delivery rider starts your trip.');
  }

  await execTrackedWrite(
    () =>
      updateDoc(trackRef, {
        customerLocation: enabled && loc ? loc : null,
        customerSharingEnabled: enabled,
        updatedAt: now,
      }),
    OperationType.UPDATE,
    `${COLLECTIONS.DELIVERY_TRACKING}/${order.id}`
  );
}

/* ================= REAL-TIME FIRESTORE ONSNAPSHOT LISTENERS ================= */

export function subscribeToOrderTracking(
  orderId: string,
  onChange: (session: LiveTrackingSession | null) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  if (!orderId) {
    onChange(null);
    return () => {};
  }
  const ref = doc(db, COLLECTIONS.DELIVERY_TRACKING, orderId);
  return onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) {
        onChange(null);
        return;
      }
      const data = { id: snap.id, ...snap.data() } as LiveTrackingSession;
      saveLocalTracking(orderId, data);
      onChange(data);
    },
    (err) => {
      console.warn('Order tracking listener notice:', err);
      const local = getLocalTracking(orderId);
      if (local) onChange(local);
      if (onError) onError(err);
    }
  );
}

export function subscribeToOrderDocument(
  orderId: string,
  onChange: (order: Order | null) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  if (!orderId) {
    onChange(null);
    return () => {};
  }
  return onSnapshot(
    doc(db, COLLECTIONS.ORDERS, orderId),
    (snap) => {
      if (!snap.exists()) {
        onChange(null);
        return;
      }
      onChange({ id: snap.id, ...snap.data() } as Order);
    },
    (err) => {
      console.warn('Order doc listener notice:', err);
      if (onError) onError(err);
    }
  );
}

export function subscribeToActiveDeliveryTrackings(
  onChange: (sessions: LiveTrackingSession[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const q = query(
    collection(db, COLLECTIONS.DELIVERY_TRACKING),
    where('isActive', '==', true)
  );
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as LiveTrackingSession))
        .filter((s) => s.isActive && !isOrderTerminal(s.orderStatus))
        .sort((a, b) => Date.parse(b.lastUpdatedAt || '') - Date.parse(a.lastUpdatedAt || ''));
      onChange(items);
    },
    (err) => {
      console.warn('Admin active fleet listener error:', err);
      if (onError) onError(err);
    }
  );
}

export function subscribeToAssignedDeliveryOrders(
  riderUid: string,
  onChange: (orders: Order[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  if (!riderUid) {
    onChange([]);
    return () => {};
  }
  const q = query(
    collection(db, COLLECTIONS.ORDERS),
    where('assignedDeliveryId', '==', riderUid)
  );
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as Order))
        .sort((a, b) => Date.parse(b.createdAt || '') - Date.parse(a.createdAt || ''));
      onChange(items);
    },
    (err) => {
      console.warn('Rider assigned orders listener error:', err);
      if (onError) onError(err);
    }
  );
}

/* ================= GEOLOCATION WATCHER CONTROLLER (MOBILE & ANDROID CHROME SAFE) ================= */

export interface GpsWatcherCallbacks {
  onFix: (fix: GeoPointData) => void;
  onStatusChange: (status: GpsTrackingStatus, message?: string) => void;
}

export function createGpsWatcherController(callbacks: GpsWatcherCallbacks) {
  let watchId: number | null = null;
  let staleTimer: ReturnType<typeof setInterval> | null = null;
  let lastFixTime = 0;
  let stoppedManually = false;

  const cleanupListeners = () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('pagehide', handlePageHide);
    }
  };

  const stop = (status: GpsTrackingStatus = 'stopped', reason?: string) => {
    stoppedManually = true;
    if (watchId !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
    }
    if (staleTimer !== null) {
      clearInterval(staleTimer);
      staleTimer = null;
    }
    cleanupListeners();
    callbacks.onStatusChange(status, reason);
  };

  const handleOffline = () => {
    if (!stoppedManually) {
      callbacks.onStatusChange(
        'network_error',
        'Mobile data or Wi-Fi connection lost. GPS updates paused until network reconnects.'
      );
    }
  };

  const handleOnline = () => {
    if (!stoppedManually && lastFixTime > 0 && !isGpsFixStale(new Date(lastFixTime).toISOString())) {
      callbacks.onStatusChange('active');
    }
  };

  const handlePageHide = () => {
    // Release GPS watch on page close/navigation to preserve battery and avoid orphaned watchers
    if (watchId !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
    }
  };

  const start = async (): Promise<boolean> => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      callbacks.onStatusChange(
        'gps_disabled',
        'Your browser does not support GPS geolocation. Please use Android Chrome or a modern mobile browser.'
      );
      return false;
    }

    stoppedManually = false;
    callbacks.onStatusChange('requesting_permission');

    // Check browser permission status upfront where supported
    try {
      if (navigator.permissions?.query) {
        const perm = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        if (perm.state === 'denied') {
          callbacks.onStatusChange(
            'permission_denied',
            'Location permission is blocked in your browser. Open Chrome Site Settings → Location → Allow for this site, then tap Start Delivery again.'
          );
          return false;
        }
      }
    } catch {
      // Safari / older browsers may not support permissions.query('geolocation'); fall through to watchPosition
    }

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      handleOffline();
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('offline', handleOffline);
      window.addEventListener('online', handleOnline);
      window.addEventListener('pagehide', handlePageHide);
    }

    return new Promise<boolean>((resolve) => {
      let resolved = false;
      const resolveOnce = (val: boolean) => {
        if (!resolved) {
          resolved = true;
          resolve(val);
        }
      };

      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          if (stoppedManually) return;
          lastFixTime = Date.now();
          const fix: GeoPointData = {
            lat: Number(pos.coords.latitude.toFixed(6)),
            lng: Number(pos.coords.longitude.toFixed(6)),
            accuracy: Math.round(pos.coords.accuracy || 0),
            heading: pos.coords.heading ?? null,
            speed: pos.coords.speed ?? null,
            timestamp: new Date().toISOString(),
          };
          callbacks.onFix(fix);
          if (typeof navigator !== 'undefined' && navigator.onLine === false) {
            handleOffline();
          } else {
            callbacks.onStatusChange('active');
          }
          resolveOnce(true);
        },
        (err) => {
          if (err.code === 1) {
            // PERMISSION_DENIED
            stop(
              'permission_denied',
              'Location permission denied. In Android Chrome tap the lock icon in the address bar → Permissions → Allow Location.'
            );
            resolveOnce(false);
          } else if (err.code === 2) {
            // POSITION_UNAVAILABLE (GPS hardware disabled / no fix)
            callbacks.onStatusChange(
              'gps_disabled',
              'Device GPS signal unavailable. Please turn on Location / High Accuracy mode on your phone.'
            );
            resolveOnce(false);
          } else if (err.code === 3) {
            // TIMEOUT
            callbacks.onStatusChange(
              'stale',
              'GPS fix timed out. Waiting for satellite/network signal...'
            );
            resolveOnce(false);
          }
        },
        {
          enableHighAccuracy: true,
          maximumAge: 5000,
          timeout: 15000,
        }
      );

      // Watchdog ticker so we NEVER falsely report active tracking if GPS updates stop
      if (staleTimer) clearInterval(staleTimer);
      staleTimer = setInterval(() => {
        if (stoppedManually) return;
        if (lastFixTime > 0 && Date.now() - lastFixTime > 30000) {
          callbacks.onStatusChange(
            'stale',
            'No GPS update received for over 30s. Signal may be paused while screen is locked or app is in background.'
          );
        }
      }, 5000);
    });
  };

  return {
    start,
    stop,
    isRunning: () => watchId !== null && !stoppedManually,
  };
}
