import assert from 'node:assert/strict';
import {
  formatLastUpdatedRelative,
  getFallbackDestinationCoords,
  haversineDistanceMeters,
  isGpsFixStale,
  isOrderTerminal,
  isOrderTrackable,
  shouldPublishGpsUpdate,
} from '../services/gpsTrackingService';
import { GeoPointData, LiveTrackingSession } from '../types';
import { runDirtyDozenSecuritySuite } from '../firebase/firestore.rules.test';

console.log('Running Live GPS Delivery Tracking Test Suite...');

// 1. Order status lifecycle tracking gates
assert.equal(isOrderTrackable('Order Placed'), true);
assert.equal(isOrderTrackable('Packed'), true);
assert.equal(isOrderTrackable('Out for Delivery'), true);
assert.equal(isOrderTerminal('Delivered'), true);
assert.equal(isOrderTerminal('DELIVERED'), true);
assert.equal(isOrderTerminal('Cancelled'), true);
assert.equal(isOrderTerminal('CANCELLED'), true);
assert.equal(isOrderTerminal('REFUNDED'), true);
assert.equal(isOrderTrackable('Delivered'), false);
assert.equal(isOrderTrackable('Cancelled'), false);

// 2. GPS write throttling & minimum distance delta (cost & battery optimization)
const baseTime = Date.parse('2026-11-20T08:00:00.000Z');
const fix1: GeoPointData = { lat: 25.6093, lng: 85.1376, accuracy: 10, timestamp: new Date(baseTime).toISOString() };
const fixSameSpotFast: GeoPointData = { lat: 25.60931, lng: 85.13761, accuracy: 10, timestamp: new Date(baseTime + 3000).toISOString() };
const fixSameSpotLater: GeoPointData = { lat: 25.60931, lng: 85.13761, accuracy: 10, timestamp: new Date(baseTime + 10000).toISOString() };
const fixMovedAfterInterval: GeoPointData = { lat: 25.6102, lng: 85.1382, accuracy: 8, timestamp: new Date(baseTime + 9000).toISOString() };
const fixHeartbeat: GeoPointData = { lat: 25.60931, lng: 85.13761, accuracy: 9, timestamp: new Date(baseTime + 26000).toISOString() };

assert.equal(shouldPublishGpsUpdate(null, fix1, false, baseTime), true, 'First GPS fix must publish');
assert.equal(shouldPublishGpsUpdate(fix1, fixSameSpotFast, false, baseTime + 3000), false, 'Should throttle updates within 8s');
assert.equal(shouldPublishGpsUpdate(fix1, fixSameSpotLater, false, baseTime + 10000), false, 'Should skip redundant stationary write under 12m');
assert.equal(shouldPublishGpsUpdate(fix1, fixMovedAfterInterval, false, baseTime + 9000), true, 'Should publish when moved >= 12m after interval');
assert.equal(shouldPublishGpsUpdate(fix1, fixHeartbeat, false, baseTime + 26000), true, 'Should publish heartbeat after >= 25s');

// 3. Truthful staleness detection (>30s threshold) & relative formatting
assert.equal(isGpsFixStale(new Date(baseTime).toISOString(), 30000, baseTime + 15000), false);
assert.equal(isGpsFixStale(new Date(baseTime).toISOString(), 30000, baseTime + 31000), true);
assert.equal(formatLastUpdatedRelative(new Date(baseTime).toISOString(), baseTime + 3000), 'Just now');
assert.equal(formatLastUpdatedRelative(new Date(baseTime).toISOString(), baseTime + 45000), '45s ago');
assert.equal(formatLastUpdatedRelative(new Date(baseTime).toISOString(), baseTime + 125000), '2m ago');

// 4. Haversine distance calculation & pincode fallback coordinates
const dist = haversineDistanceMeters({ lat: 25.6093, lng: 85.1376 }, { lat: 25.6127, lng: 85.1376 });
assert.ok(dist > 300 && dist < 450, `Expected ~378m distance, got ${dist}`);
const kankarbaghCoords = getFallbackDestinationCoords({ deliveryAreaPincode: '800020' });
assert.equal(kankarbaghCoords.lat, 25.5941);
assert.equal(kankarbaghCoords.lng, 85.1554);

// 5. Admin active fleet isolation: completed/cancelled sessions MUST never appear in active view
const mockSessions: LiveTrackingSession[] = [
  {
    id: 'ord-active',
    orderId: 'ord-active',
    orderNumber: 'PS-1001',
    customerId: 'cust-A',
    customerName: 'Customer A',
    deliveryPersonId: 'rider-1',
    deliveryPersonName: 'Fleet Rider',
    orderStatus: 'Out for Delivery',
    isActive: true,
    trackingStatus: 'active',
    lastUpdatedAt: new Date(baseTime).toISOString(),
    updatedAt: new Date(baseTime).toISOString(),
  },
  {
    id: 'ord-done',
    orderId: 'ord-done',
    orderNumber: 'PS-1002',
    customerId: 'cust-B',
    customerName: 'Customer B',
    deliveryPersonId: 'rider-1',
    deliveryPersonName: 'Fleet Rider',
    orderStatus: 'Delivered',
    isActive: false,
    trackingStatus: 'completed',
    customerLocation: null,
    customerSharingEnabled: false,
    lastUpdatedAt: new Date(baseTime).toISOString(),
    updatedAt: new Date(baseTime).toISOString(),
  },
];

const visibleToAdmin = mockSessions.filter((s) => s.isActive && !isOrderTerminal(s.orderStatus));
assert.equal(visibleToAdmin.length, 1);
assert.equal(visibleToAdmin[0].customerId, 'cust-A');

// 6. Firestore RBAC & Customer A vs Customer B isolation suite (D1..D22)
const secResults = runDirtyDozenSecuritySuite();
assert.equal(secResults.failed, 0, `Security suite had failures: ${JSON.stringify(secResults.results.filter((r) => !r.passed))}`);
assert.ok(secResults.total >= 22, `Expected >= 22 security test cases, ran ${secResults.total}`);

console.log(`Live GPS Tracking & Security Tests PASSED (${secResults.passed}/${secResults.total} security vectors verified).`);
