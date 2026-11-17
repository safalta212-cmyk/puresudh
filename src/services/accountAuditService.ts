/**
 * PURE SUDH - Account Audit & Security Purge Service
 * Detects and permanently removes accounts created with temporary/disposable emails or fake phone numbers.
 */

import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { COLLECTIONS } from '../constants';
import { isTemporaryEmail, isTemporaryOrFakePhone } from '../validation';
import { signOut } from 'firebase/auth';

export interface PurgedAccountRecord {
  id: string;
  collectionName: string;
  email: string;
  phone?: string;
  role?: string;
  reason: string;
  timestamp: string;
}

export interface AuditReport {
  totalAudited: number;
  totalPurged: number;
  purgedAccounts: PurgedAccountRecord[];
  cleanedAt: string;
  status: 'clean' | 'purged_issues_found';
}

/**
 * Scan Firestore and in-app users to identify and permanently remove temporary/fake accounts
 */
export async function auditAndPurgeTemporaryAccounts(): Promise<AuditReport> {
  const purged: PurgedAccountRecord[] = [];
  let totalAudited = 0;

  // 0. Server-side in-memory and registered accounts purge
  try {
    const srvRes = await fetch('/api/admin/purge-temporary-accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const contentType = srvRes.headers.get('content-type') || '';
    if (srvRes.ok && contentType.includes('application/json')) {
      const data = await srvRes.json();
      if (Array.isArray(data.purgedAccounts)) {
        purged.push(...data.purgedAccounts);
      }
      if (typeof data.totalAudited === 'number') {
        totalAudited += data.totalAudited;
      }
    }
  } catch (srvErr) {
    // Non-blocking server audit notice
  }

  // 1. Audit USERS collection (guarded)
  try {
    const usersSnap = await getDocs(collection(db, COLLECTIONS.USERS));
    for (const d of usersSnap.docs) {
      totalAudited++;
      const data = d.data();
      const email = data.email || '';
      const phone = data.phone || '';

      const emailCheck = isTemporaryEmail(email);
      const phoneCheck = phone ? isTemporaryOrFakePhone(phone) : { isFake: false };

      if (emailCheck.isTemporary || phoneCheck.isFake) {
        const reason = [
          emailCheck.isTemporary ? `Temporary Email: ${emailCheck.reason}` : '',
          phoneCheck.isFake ? `Fake/Temporary Phone: ${phoneCheck.reason}` : '',
        ]
          .filter(Boolean)
          .join(' | ');

        try {
          await deleteDoc(doc(db, COLLECTIONS.USERS, d.id));
          purged.push({
            id: d.id,
            collectionName: COLLECTIONS.USERS,
            email,
            phone,
            role: data.role || 'customer',
            reason,
            timestamp: new Date().toISOString(),
          });
        } catch (delErr) {
          console.warn(`Could not delete flagged user doc ${d.id}:`, delErr);
        }
      }
    }
  } catch (err) {
    console.warn('Firestore users audit notice:', err);
  }

  // 2. Audit VENDORS collection
  try {
    const vendorsSnap = await getDocs(collection(db, COLLECTIONS.VENDORS));
    for (const d of vendorsSnap.docs) {
      totalAudited++;
      const data = d.data();
      const email = data.email || '';
      const phone = data.phone || '';

      const emailCheck = isTemporaryEmail(email);
      const phoneCheck = phone ? isTemporaryOrFakePhone(phone) : { isFake: false };

      if (emailCheck.isTemporary || phoneCheck.isFake) {
        const reason = [
          emailCheck.isTemporary ? `Temporary Email (${email})` : '',
          phoneCheck.isFake ? `Fake/Temporary Phone (${phone})` : '',
        ]
          .filter(Boolean)
          .join(' | ');

        try {
          await deleteDoc(doc(db, COLLECTIONS.VENDORS, d.id));
          purged.push({
            id: d.id,
            collectionName: COLLECTIONS.VENDORS,
            email,
            phone,
            role: 'vendor',
            reason,
            timestamp: new Date().toISOString(),
          });
        } catch (delErr) {
          console.warn(`Could not delete flagged vendor doc ${d.id}:`, delErr);
        }
      }
    }
  } catch (err) {
    console.warn('Firestore vendors audit notice:', err);
  }

  // 3. Audit currently authenticated session
  try {
    const currentFbUser = auth.currentUser;
    if (currentFbUser && currentFbUser.email) {
      const emailCheck = isTemporaryEmail(currentFbUser.email);
      if (emailCheck.isTemporary) {
        await signOut(auth);
        localStorage.removeItem('pure_sudh_active_user');
      }
    }

    const localSaved = localStorage.getItem('pure_sudh_active_user');
    if (localSaved) {
      try {
        const parsed = JSON.parse(localSaved);
        if (parsed.email && isTemporaryEmail(parsed.email).isTemporary) {
          localStorage.removeItem('pure_sudh_active_user');
        }
      } catch {
        localStorage.removeItem('pure_sudh_active_user');
      }
    }
  } catch (e) {
    console.warn('Session security cleanup notice:', e);
  }

  // Save audit log to local storage for admin inspection
  try {
    const existingLog = localStorage.getItem('pure_sudh_purge_audit_log');
    const logs = existingLog ? JSON.parse(existingLog) : [];
    logs.unshift({
      runAt: new Date().toISOString(),
      purgedCount: purged.length,
      purgedAccounts: purged,
    });
    localStorage.setItem('pure_sudh_purge_audit_log', JSON.stringify(logs.slice(0, 50)));
  } catch {
    // ignore
  }

  return {
    totalAudited,
    totalPurged: purged.length,
    purgedAccounts: purged,
    cleanedAt: new Date().toISOString(),
    status: purged.length > 0 ? 'purged_issues_found' : 'clean',
  };
}

/**
 * Validates a user profile object to verify it doesn't violate anti-temporary rules
 */
export function isAccountAllowed(email: string, phone?: string): { allowed: boolean; reason?: string } {
  const emailCheck = isTemporaryEmail(email);
  if (emailCheck.isTemporary) {
    return {
      allowed: false,
      reason: emailCheck.reason || 'Temporary/disposable emails are not permitted.',
    };
  }

  if (phone) {
    const phoneCheck = isTemporaryOrFakePhone(phone);
    if (phoneCheck.isFake) {
      return {
        allowed: false,
        reason: phoneCheck.reason || 'Invalid or temporary mobile numbers are not permitted.',
      };
    }
  }

  return { allowed: true };
}
