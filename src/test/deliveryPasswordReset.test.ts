import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
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

test('Delivery forgot-password validation enforces RBAC, disposable-email rejection, and portal isolation', async () => {
  await withServer(async (baseUrl) => {
    // 1. Disposable emails blocked
    const tempRes = await fetch(`${baseUrl}/api/auth/forgot-password-validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'rider@mailinator.com', targetPortal: 'delivery' }),
    });
    assert.equal(tempRes.status, 403);

    // 2. Customer email rejected on delivery portal
    const custRes = await fetch(`${baseUrl}/api/auth/forgot-password-validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'customer@email.com', targetPortal: 'delivery' }),
    });
    assert.equal(custRes.status, 403);
    const custJson = await custRes.json();
    assert.equal(custJson.success, false);

    // 3. Registered built-in fleet rider allowed and returns demo_local mode
    const delRes = await fetch(`${baseUrl}/api/auth/forgot-password-validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'delivery@email.com', targetPortal: 'delivery' }),
    });
    assert.equal(delRes.status, 200);
    const delJson = await delRes.json();
    assert.equal(delJson.success, true);
    assert.equal(delJson.role, 'delivery');
    assert.equal(delJson.authType, 'demo_local');
    assert.equal(delJson.maskedPhone, '******2804');

    // 4. Real-domain Firebase delivery candidate returns firebase authType
    const fbRes = await fetch(`${baseUrl}/api/auth/forgot-password-validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'rider.patna@gmail.com', targetPortal: 'delivery' }),
    });
    assert.equal(fbRes.status, 200);
    const fbJson = await fbRes.json();
    assert.equal(fbJson.success, true);
    assert.equal(fbJson.authType, 'firebase');
  });
});

test('Admin staff sync rejects unauthenticated calls', async () => {
  await withServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/admin/sync-staff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        staffMember: { id: 'stf-test', name: 'Test Rider', email: 'test.rider@gmail.com', role: 'delivery', active: true },
      }),
    });
    assert.equal(res.status, 401);
  });
});

test('Verified delivery demo reset verifies mobile, rotates hash, invalidates old password, and restores cleanly', async () => {
  const usersFile = path.resolve(process.cwd(), 'data', 'users.json');
  const backup = fs.existsSync(usersFile) ? fs.readFileSync(usersFile, 'utf-8') : null;

  try {
    await withServer(async (baseUrl) => {
      // 1. Reject non-demo emails from local reset endpoint
      const realReject = await fetch(`${baseUrl}/api/auth/request-demo-reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'rider.patna@gmail.com', phone: '9431012804', targetPortal: 'delivery' }),
      });
      assert.equal(realReject.status, 403);

      // 2. Reject wrong phone number
      const badPhone = await fetch(`${baseUrl}/api/auth/request-demo-reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'delivery@email.com', phone: '9999999999', targetPortal: 'delivery' }),
      });
      assert.equal(badPhone.status, 403);

      // 3. Accept valid registered rider phone
      const reqReset = await fetch(`${baseUrl}/api/auth/request-demo-reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'delivery@email.com', phone: '9431012804', targetPortal: 'delivery' }),
      });
      assert.equal(reqReset.status, 200);
      const reqData = await reqReset.json();
      assert.equal(reqData.success, true);
      assert.ok(typeof reqData.resetToken === 'string' && reqData.resetToken.length > 16);

      // 4. Complete password reset
      const newPassword = 'RiderUpdated#2026';
      const completeRes = await fetch(`${baseUrl}/api/auth/complete-demo-reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'delivery@email.com',
          resetToken: reqData.resetToken,
          newPassword,
        }),
      });
      assert.equal(completeRes.status, 200);
      const completeJson = await completeRes.json();
      assert.equal(completeJson.success, true);

      // 5. Token is single-use: replaying fails
      const replayRes = await fetch(`${baseUrl}/api/auth/complete-demo-reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'delivery@email.com',
          resetToken: reqData.resetToken,
          newPassword: 'AnotherPassword123',
        }),
      });
      assert.equal(replayRes.status, 400);

      // 6. Old default password is rejected after reset
      const oldLogin = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'delivery@email.com', password: 'delivery123', targetPortal: 'delivery' }),
      });
      assert.equal(oldLogin.status, 401);

      // 7. New password signs in cleanly
      const newLogin = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'delivery@email.com', password: newPassword, targetPortal: 'delivery' }),
      });
      assert.equal(newLogin.status, 200);
      const loginJson = await newLogin.json();
      assert.equal(loginJson.success, true);
      assert.equal(loginJson.profile.role, 'delivery');
    });
  } finally {
    if (backup !== null) {
      fs.writeFileSync(usersFile, backup, 'utf-8');
    }
  }
});
