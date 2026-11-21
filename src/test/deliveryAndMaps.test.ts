import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import http from 'node:http';
import { initialDeliveryAreas, initialDeliverySlots } from '../data/seedData';
import {
  evaluateDeliveryEligibility,
  formatDeliveryETA,
  PATNA_PINCODES,
} from '../utils/deliveryRules';
import { apiRouter } from '../api/serverApi';

async function withServer(fn: (baseUrl: string) => Promise<void>) {
  const app = express();
  app.use(express.json());
  app.use('/api', apiRouter);
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const addr = server.address() as any;
  const baseUrl = `http://127.0.0.1:${addr.port}`;
  try {
    await fn(baseUrl);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

test('Delivery hub pincodes including 801503 are serviceable with accurate dynamic ETAs', () => {
  assert.ok(PATNA_PINCODES.includes('801503'), 'PATNA_PINCODES should include 801503');

  const res801503 = evaluateDeliveryEligibility(
    '801503',
    initialDeliveryAreas,
    250,
    undefined,
    initialDeliverySlots
  );
  assert.equal(res801503.isDeliverable, true);
  assert.equal(res801503.deliverabilityStatus, 'Delivery Available');
  assert.equal(res801503.is30MinDelivery, false);
  assert.equal(res801503.estimatedDeliveryTime, '35-45 mins');

  const res800020 = evaluateDeliveryEligibility(
    '800020',
    initialDeliveryAreas,
    250,
    undefined,
    initialDeliverySlots
  );
  assert.equal(res800020.isDeliverable, true);
  assert.equal(res800020.is30MinDelivery, true);
  assert.equal(res800020.estimatedDeliveryTime, '30-minute delivery');

  const resUnserviceable = evaluateDeliveryEligibility(
    '845438',
    initialDeliveryAreas,
    250,
    undefined,
    initialDeliverySlots
  );
  assert.equal(resUnserviceable.isDeliverable, false);
  assert.equal(resUnserviceable.deliverabilityStatus, 'Currently unavailable in your area');
});

test('formatDeliveryETA never hardcodes 30-minute delivery unless configured', () => {
  const non30 = formatDeliveryETA({
    id: 'test-1',
    pincode: '800001',
    areaName: 'Test Area',
    city: 'Patna',
    active: true,
    estimatedTimeMinutes: 45,
    estimatedDeliveryTime: '40-50 mins',
    isDeliverable: true,
    deliveryCharge: 30,
  });
  assert.equal(non30.is30MinDelivery, false);
  assert.equal(non30.etaText, '40-50 mins');
});

test('API delivery check and server-side geocode/reverse-geocode endpoints work end-to-end', async () => {
  await withServer(async (baseUrl) => {
    const check801503 = await fetch(`${baseUrl}/api/delivery/check?pincode=801503`);
    assert.equal(check801503.status, 200);
    const data801503: any = await check801503.json();
    assert.equal(data801503.isDeliverable, true);
    assert.equal(data801503.estimatedDeliveryTime, '35-45 mins');

    const check845438 = await fetch(`${baseUrl}/api/delivery/check?pincode=845438`);
    assert.equal(check845438.status, 200);
    const data845438: any = await check845438.json();
    assert.equal(data845438.isDeliverable, false);
    assert.equal(data845438.deliverabilityStatus, 'Currently unavailable in your area');

    const geocodeRes = await fetch(`${baseUrl}/api/maps/geocode?address=${encodeURIComponent('Patna 800001')}`);
    assert.equal(geocodeRes.status, 200);
    const geocodeData: any = await geocodeRes.json();
    assert.equal(geocodeData.success, true);
    assert.equal(typeof geocodeData.lat, 'number');
    assert.equal(typeof geocodeData.lng, 'number');
    assert.equal(geocodeData.pincode, '800001');

    const revRes = await fetch(`${baseUrl}/api/maps/reverse-geocode?lat=25.6144&lng=85.0486`);
    assert.equal(revRes.status, 200);
    const revData: any = await revRes.json();
    assert.equal(revData.success, true);
    assert.equal(revData.pincode, '801503');
  });
});
