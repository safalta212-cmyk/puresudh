/**
 * PURE SUDH - Secure Authentication Service
 * Firebase Authentication, Role-Based Access Control, and Zero-Trust Profiles
 * 
 * Supports:
 * - CUSTOMER: Register, Login, Logout, Forgot Password, Password Reset, Profile Management
 * - ADMIN: Secure Admin Login with privilege validation
 * - STAFF: Staff Login with operational fulfillment access
 * - VENDOR: Vendor Login & Registration architecture
 * - Email/Password and Google Sign-In architecture
 * - Session Persistence & Custom Claims integration
 */

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  signInAnonymously as fbSignInAnonymously,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updatePassword as fbUpdatePassword,
  updateProfile,
  User as FirebaseUser,
  setPersistence,
  browserLocalPersistence,
  IdTokenResult,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { UserProfile, UserRole, Address } from '../types';
import { COLLECTIONS } from '../constants';

// Guarantee persistent session storage across reloads and tabs
try {
  setPersistence(auth, browserLocalPersistence).catch((err) => {
    console.warn('Session persistence configuration note:', err);
  });
} catch {
  // Persistence already set or running in constrained environment
}

/**
 * Map Firebase Authentication error codes into clear, actionable user messages.
 */
export function formatFirebaseAuthError(error: any): string {
  const code = String(error?.code || '');
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
      return 'Invalid email or password in Firebase Authentication (auth/invalid-credential). Please check your password or verify the account exists in Firebase Console.';
    case 'auth/wrong-password':
      return 'Incorrect password (auth/wrong-password). Please verify your password or click "Forgot password?".';
    case 'auth/user-not-found':
      return 'No account found in Firebase Authentication for this email (auth/user-not-found).';
    case 'auth/invalid-email':
      return 'Invalid email address format (auth/invalid-email).';
    case 'auth/user-disabled':
      return 'This account has been disabled in Firebase Authentication (auth/user-disabled).';
    case 'auth/too-many-requests':
      return 'Too many failed login attempts (auth/too-many-requests). Please wait a few minutes or reset your password.';
    case 'auth/operation-not-allowed':
      return 'Email/Password sign-in is disabled in Firebase Console (auth/operation-not-allowed). Enable Email/Password provider under Authentication → Sign-in method.';
    case 'auth/unauthorized-domain':
      return 'This domain is not authorized in Firebase Authentication (auth/unauthorized-domain). Add your Vercel domain under Firebase Console → Authentication → Settings → Authorized domains.';
    case 'auth/network-request-failed':
      return 'Network error while connecting to Firebase Authentication (auth/network-request-failed). Please check your connection and try again.';
    case 'auth/invalid-api-key':
    case 'auth/configuration-not-found':
      return 'Firebase configuration error. Please check your VITE_FIREBASE_* environment variables and Firebase Console settings.';
    case 'auth/requires-recent-login':
      return 'Security check: Please sign out and sign in again to complete this action.';
    default:
      return error?.message || 'Authentication failed. Please check your credentials and try again.';
  }
}

/**
 * Extract Custom Claims from Firebase Auth ID Token
 */
export async function getCustomClaims(user: FirebaseUser): Promise<Record<string, any>> {
  try {
    const tokenResult: IdTokenResult = await user.getIdTokenResult(true);
    return tokenResult.claims || {};
  } catch (err) {
    console.warn('Failed to fetch ID token claims:', err);
    return {};
  }
}

/**
 * Determine effective role using Custom Claims + admins/{uid} + owner email + Firestore profile.
 * Custom claims & verified admin doc take precedence over client/profile defaults.
 */
export function resolveEffectiveRole(
  claims: Record<string, any>,
  firestoreRole?: UserRole,
  email?: string | null,
  hasAdminDoc?: boolean
): UserRole {
  // 1. Custom Claims check
  if (claims.role && ['admin', 'staff', 'vendor', 'customer', 'delivery'].includes(claims.role)) {
    return claims.role as UserRole;
  }
  if (claims.admin === true) return 'admin';
  if (claims.staff === true) return 'staff';
  if (claims.vendor === true) return 'vendor';

  // 2. Firestore admins/{uid} document check
  if (hasAdminDoc === true) {
    return 'admin';
  }

  // 3. Project Owner / Admin email rule check
  if (email && email.trim().toLowerCase() === 'aanews70@gmail.com') {
    return 'admin';
  }

  // 4. Fallback to Firestore users/{uid}.role
  if (firestoreRole) {
    return firestoreRole;
  }

  return 'customer';
}

/**
 * Check if current Firebase Auth UID has a document in /admins/{uid}
 */
export async function checkFirestoreAdminDoc(uid: string): Promise<boolean> {
  if (!uid) return false;
  try {
    const adminSnap = await getDoc(doc(db, 'admins', uid));
    return adminSnap.exists();
  } catch {
    return false;
  }
}

/**
 * Fetch or Initialize User Profile in Firestore
 * Never writes or stores passwords in Firestore.
 */
export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  const currentUser = auth.currentUser;
  if (!currentUser) return null;

  const [claims, hasAdminDoc] = await Promise.all([
    getCustomClaims(currentUser),
    checkFirestoreAdminDoc(currentUser.uid),
  ]);

  try {
    const userDocRef = doc(db, COLLECTIONS.USERS, currentUser.uid);
    const snap = await getDoc(userDocRef);

    if (snap.exists()) {
      const data = snap.data() as Partial<UserProfile>;
      const effectiveRole = resolveEffectiveRole(claims, data.role, currentUser.email, hasAdminDoc);

      const profile: UserProfile = {
        id: snap.id,
        uid: snap.id,
        email: currentUser.email || data.email || '',
        displayName: data.displayName || currentUser.displayName || 'Customer',
        phone: data.phone || '',
        role: effectiveRole,
        createdAt: data.createdAt || new Date().toISOString(),
        addresses: Array.isArray(data.addresses) ? data.addresses : [],
        vendorDetails: data.vendorDetails,
        staffDetails: data.staffDetails,
        authMethod: currentUser.providerData[0]?.providerId === 'google.com' ? 'google' : 'password',
        emailVerified: currentUser.emailVerified,
        customClaims: claims,
      };
      return profile;
    }

    // Default Profile document for new Firebase Auth user
    const assignedRole = resolveEffectiveRole(claims, undefined, currentUser.email, hasAdminDoc);
    const newProfile: UserProfile = {
      id: currentUser.uid,
      uid: currentUser.uid,
      email: currentUser.email || '',
      displayName: currentUser.displayName || (currentUser.isAnonymous ? 'Guest Customer' : 'User'),
      phone: '',
      role: assignedRole,
      createdAt: new Date().toISOString(),
      addresses: [],
      authMethod: currentUser.providerData[0]?.providerId === 'google.com' ? 'google' : 'password',
      emailVerified: currentUser.emailVerified,
      customClaims: claims,
    };

    try {
      await setDoc(userDocRef, newProfile, { merge: true });
    } catch (writeErr) {
      console.warn('Could not initialize user profile in Firestore:', writeErr);
    }
    return newProfile;
  } catch (err) {
    console.warn('Could not read user profile from Firestore, using Firebase Auth claims fallback:', err);
    return {
      id: currentUser.uid,
      uid: currentUser.uid,
      email: currentUser.email || '',
      displayName: currentUser.displayName || 'User',
      phone: '',
      role: resolveEffectiveRole(claims, undefined, currentUser.email, hasAdminDoc),
      createdAt: new Date().toISOString(),
      addresses: [],
      customClaims: claims,
    };
  }
}

/**
 * Register a New Customer Account with Email/Password
 */
export async function registerCustomer(
  email: string,
  pass: string,
  displayName: string,
  phone: string
): Promise<UserProfile> {
  const cred = await createUserWithEmailAndPassword(auth, email, pass);
  await updateProfile(cred.user, { displayName });

  const profile: UserProfile = {
    id: cred.user.uid,
    uid: cred.user.uid,
    email,
    displayName,
    phone,
    role: 'customer',
    createdAt: new Date().toISOString(),
    addresses: [],
    authMethod: 'password',
    emailVerified: cred.user.emailVerified,
  };

  try {
    await setDoc(doc(db, COLLECTIONS.USERS, cred.user.uid), profile);
  } catch (err) {
    console.warn('Failed saving customer profile document in Firestore:', err);
  }

  return profile;
}

/**
 * Register a Vendor Account (Vendor Architecture)
 */
export async function registerVendor(
  email: string,
  pass: string,
  displayName: string,
  phone: string,
  shopName: string,
  fssaiLicense?: string,
  gstNumber?: string
): Promise<UserProfile> {
  const cred = await createUserWithEmailAndPassword(auth, email, pass);
  await updateProfile(cred.user, { displayName });

  const profile: UserProfile = {
    id: cred.user.uid,
    uid: cred.user.uid,
    email,
    displayName,
    phone,
    role: 'vendor',
    createdAt: new Date().toISOString(),
    addresses: [],
    vendorDetails: {
      shopName,
      fssaiLicense: fssaiLicense || '',
      gstNumber: gstNumber || '',
      status: 'pending',
    },
    authMethod: 'password',
    emailVerified: cred.user.emailVerified,
  };

  try {
    await setDoc(doc(db, COLLECTIONS.USERS, cred.user.uid), profile);
    // Also record vendor application for admin auditing
    await setDoc(doc(db, 'vendorApplications', cred.user.uid), {
      userId: cred.user.uid,
      shopName,
      contactName: displayName,
      phone,
      email,
      fssaiLicense: fssaiLicense || '',
      gstNumber: gstNumber || '',
      status: 'pending',
      submittedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Failed saving vendor application document:', err);
  }

  return profile;
}

/**
 * Login with Email and Password & Verify Role Access
 */
export async function loginWithEmail(
  email: string,
  pass: string,
  targetPortal?: 'customer' | 'admin' | 'staff' | 'vendor'
): Promise<{ profile: UserProfile; authorized: boolean; reason?: string }> {
  let cred;
  try {
    cred = await signInWithEmailAndPassword(auth, email, pass);
  } catch (err: any) {
    throw new Error(formatFirebaseAuthError(err));
  }

  const profile = (await getCurrentUserProfile()) || {
    id: cred.user.uid,
    uid: cred.user.uid,
    email: cred.user.email || email,
    displayName: cred.user.displayName || 'User',
    phone: '',
    role: resolveEffectiveRole(await getCustomClaims(cred.user), undefined, cred.user.email),
    createdAt: new Date().toISOString(),
    addresses: [],
  };

  // Role verification check against targeted portal
  if (targetPortal) {
    const isAuthorized = verifyRoleAccess(profile.role, targetPortal);
    if (!isAuthorized) {
      await fbSignOut(auth).catch(() => {});
      return {
        profile,
        authorized: false,
        reason: `Access Denied: This account (${profile.email}) has role '${profile.role}', which is not authorized for the ${targetPortal.toUpperCase()} portal.`,
      };
    }
  }

  return { profile, authorized: true };
}

/**
 * Role-Based Authorization Verifier
 */
export function verifyRoleAccess(
  userRole: UserRole,
  targetPortal: 'customer' | 'admin' | 'staff' | 'vendor'
): boolean {
  if (userRole === 'admin') return true; // Admins have full access to all portals
  if (targetPortal === 'customer') return true; // Any authenticated user can access customer views
  if (targetPortal === 'staff') return userRole === 'staff' || userRole === 'delivery';
  if (targetPortal === 'vendor') return userRole === 'vendor';
  return false;
}

/**
 * Trigger Password Reset Email
 */
export async function sendPasswordReset(
  email: string,
  targetPortal: 'customer' | 'admin' | 'staff' | 'vendor' = 'customer'
): Promise<{ success: boolean; message: string }> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) {
    throw new Error('Please provide an email address.');
  }
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(cleanEmail)) {
    throw new Error('Please enter a valid email address.');
  }

  try {
    const valRes = await fetch('/api/auth/forgot-password-validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, targetPortal }),
    });
    const contentType = valRes.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const valData = await valRes.json().catch(() => null);
      if (!valRes.ok || !valData?.success) {
        throw new Error(valData?.error || 'No registered account found with this email address.');
      }
    }
  } catch (err: any) {
    if (err?.message && !err.message.includes('Failed to fetch') && !err.message.includes('NetworkError')) {
      throw err;
    }
  }

  try {
    await sendPasswordResetEmail(auth, cleanEmail);
    return {
      success: true,
      message: `Password reset instructions have been sent to ${cleanEmail}. Please check your inbox and spam folder.`,
    };
  } catch (err: any) {
    throw new Error(formatFirebaseAuthError(err));
  }
}

/**
 * Update Current User's Password (Signed-In)
 */
export async function changePassword(newPassword: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('You must be signed in to update your password.');
  }
  if (newPassword.length < 6) {
    throw new Error('New password must be at least 6 characters long.');
  }
  await fbUpdatePassword(user, newPassword);
}

/**
 * Sign In with Google Provider (Prepared Architecture)
 */
export async function loginWithGoogle(): Promise<UserProfile> {
  const provider = new GoogleAuthProvider();
  provider.addScope('profile');
  provider.addScope('email');
  provider.setCustomParameters({ prompt: 'select_account' });

  const cred = await signInWithPopup(auth, provider);
  const profile = await getCurrentUserProfile();

  return (
    profile || {
      id: cred.user.uid,
      uid: cred.user.uid,
      email: cred.user.email || '',
      displayName: cred.user.displayName || 'Google User',
      role: 'customer',
      createdAt: new Date().toISOString(),
      addresses: [],
      authMethod: 'google',
    }
  );
}

/**
 * Sign Out
 */
export async function logout(): Promise<void> {
  await fbSignOut(auth);
}

/**
 * Update User Address Book
 */
export async function updateUserAddresses(addresses: Address[]): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');

  try {
    const userRef = doc(db, COLLECTIONS.USERS, user.uid);
    await updateDoc(userRef, { addresses });
  } catch (e) {
    console.warn('Update addresses in Firestore failed:', e);
  }
}

/**
 * Update Personal Details (Name, Phone)
 * Ensures user CANNOT overwrite or escalate their role.
 */
export async function updateUserDetails(updates: { displayName?: string; phone?: string }): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');

  if (updates.displayName && updates.displayName !== user.displayName) {
    await updateProfile(user, { displayName: updates.displayName });
  }

  try {
    const userRef = doc(db, COLLECTIONS.USERS, user.uid);
    // Explicitly omit role to prevent privilege escalation
    const safeUpdates: Record<string, any> = {};
    if (updates.displayName !== undefined) safeUpdates.displayName = updates.displayName;
    if (updates.phone !== undefined) safeUpdates.phone = updates.phone;
    safeUpdates.updatedAt = new Date().toISOString();

    await updateDoc(userRef, safeUpdates);
  } catch (e) {
    console.warn('Update user details in Firestore failed:', e);
  }
}

/**
 * Observer for Firebase Auth State Changes
 */
export function subscribeToAuthChanges(callback: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(auth, callback);
}
