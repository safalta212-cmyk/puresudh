import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updatePassword as fbUpdatePassword,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  User as FirebaseUser,
  setPersistence,
  browserLocalPersistence,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { UserProfile, UserRole, Address } from '../types';
import { COLLECTIONS } from '../constants';
import {
  resolveEffectiveRole,
  getCustomClaims,
  verifyRoleAccess,
  checkFirestoreAdminDoc,
  formatFirebaseAuthError,
} from '../services/auth.service';
import { isTemporaryEmail, isTemporaryOrFakePhone, formatIndianPhone } from '../validation';
import { auditAndPurgeTemporaryAccounts } from '../services/accountAuditService';

export type AuthModalMode =
  | 'login'
  | 'register'
  | 'forgot-password'
  | 'admin'
  | 'staff'
  | 'vendor-login'
  | 'vendor-register';

interface AuthContextType {
  user: UserProfile | null;
  role: UserRole;
  isLoading: boolean;
  isAuthModalOpen: boolean;
  authModalMode: AuthModalMode;
  targetPortal?: 'customer' | 'admin' | 'staff' | 'vendor';
  openAuthModal: (mode?: AuthModalMode, targetPortal?: 'customer' | 'admin' | 'staff' | 'vendor') => void;
  closeAuthModal: () => void;
  login: (
    email: string,
    pass: string,
    targetPortal?: 'customer' | 'admin' | 'staff' | 'vendor'
  ) => Promise<{ success: boolean; error?: string; profile?: UserProfile }>;
  register: (
    email: string,
    pass: string,
    name: string,
    phone: string
  ) => Promise<{ success: boolean; error?: string }>;
  registerVendor: (
    email: string,
    pass: string,
    name: string,
    phone: string,
    shopName: string,
    fssai?: string,
    gst?: string
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  sendPasswordReset: (
    email: string,
    portalOverride?: 'customer' | 'admin' | 'staff' | 'vendor'
  ) => Promise<{ success: boolean; message: string }>;
  updateUserPassword: (newPass: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  loginWithGoogle: (
    targetPortal?: 'customer' | 'admin' | 'staff' | 'vendor'
  ) => Promise<{ success: boolean; error?: string; profile?: UserProfile }>;
  updateUserProfileData: (updates: {
    displayName?: string;
    phone?: string;
    photoURL?: string;
    avatarUrl?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  addAddress: (address: Omit<Address, 'id'>) => Promise<void>;
  deleteAddress: (id: string) => Promise<void>;
  setDefaultAddress: (id: string) => Promise<void>;
  switchRole: (newRole: UserRole) => void;
  hasRole: (allowedRoles: UserRole[]) => boolean;
  refreshSession: () => Promise<void>;
  testRoleAccounts: {
    admin: { email: string; role: UserRole; name: string };
    staff: { email: string; role: UserRole; name: string };
    vendor: { email: string; role: UserRole; name: string };
    customer: { email: string; role: UserRole; name: string };
  };
}

const defaultAdminUser: UserProfile = {
  id: 'usr-admin-master',
  uid: 'usr-admin-master',
  email: 'aanews70@gmail.com',
  displayName: 'Platform Administrator',
  phone: '+91 94310 12801',
  role: 'admin',
  createdAt: '2026-01-01T00:00:00.000Z',
  addresses: [
    {
      id: 'addr-admin-1',
      name: 'Pure Sudh Central Facility',
      phone: '+91 94310 12801',
      pincode: '800001',
      addressLine: 'Shop #12, Annapurna Mandir Marg',
      landmark: 'Near Dairy Circle',
      city: 'Patna',
      state: 'Bihar',
      isDefault: true,
      type: 'work',
    },
  ],
  customClaims: { role: 'admin', admin: true },
};

const defaultStaffUser: UserProfile = {
  id: 'usr-staff-master',
  uid: 'usr-staff-master',
  email: 'staff@email.com',
  displayName: 'Ravi Kumar (Operations Staff)',
  phone: '+91 94310 12802',
  role: 'staff',
  createdAt: '2026-01-15T00:00:00.000Z',
  staffDetails: {
    department: 'Packaging & Quality Control',
    employeeId: 'EMP-PS-042',
    active: true,
  },
  addresses: [],
  customClaims: { role: 'staff', staff: true },
};

const defaultVendorUser: UserProfile = {
  id: 'usr-vendor-master',
  uid: 'usr-vendor-master',
  email: 'vendor@email.com',
  displayName: 'Shri Krishna Organic Dairy',
  phone: '+91 94310 12803',
  role: 'vendor',
  createdAt: '2026-02-01T00:00:00.000Z',
  vendorDetails: {
    shopName: 'Shri Krishna Dairy Farm',
    fssaiLicense: '10423000001892',
    gstNumber: '10AAACR5231P1Z9',
    status: 'approved',
  },
  addresses: [],
  customClaims: { role: 'vendor', vendor: true },
};

const defaultCustomerUser: UserProfile = {
  id: 'usr-customer-demo',
  uid: 'usr-customer-demo',
  email: 'customer@email.com',
  displayName: 'Abhishek Kumar',
  phone: '+91 94310 12845',
  role: 'customer',
  createdAt: '2026-03-01T00:00:00.000Z',
  addresses: [
    {
      id: 'addr-cust-1',
      name: 'Abhishek Kumar',
      phone: '+91 94310 12845',
      pincode: '800001',
      addressLine: 'Flat 402, Anand Nilayam, Fraser Road',
      landmark: 'Opposite Central Park',
      city: 'Patna',
      state: 'Bihar',
      isDefault: true,
      type: 'home',
    },
  ],
  customClaims: { role: 'customer' },
};

export const TEST_ROLE_ACCOUNTS = {
  admin: { email: 'aanews70@gmail.com', role: 'admin' as UserRole, name: 'Platform Administrator' },
  staff: { email: 'staff@email.com', role: 'staff' as UserRole, name: 'Operations Staff' },
  vendor: { email: 'vendor@email.com', role: 'vendor' as UserRole, name: 'Verified Dairy Vendor' },
  customer: { email: 'customer@email.com', role: 'customer' as UserRole, name: 'Abhishek Kumar' },
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem('pure_sudh_active_user');
      if (!saved || saved === 'null' || saved === 'undefined') return null;
      const parsed = JSON.parse(saved);
      if (parsed && (parsed.email || parsed.id)) {
        const parsedEmail = String(parsed.email || '').trim().toLowerCase();
        if (
          parsedEmail === 'enterpriseadministrationconsole@gmail.com' ||
          parsedEmail === 'admin@puresudh.com'
        ) {
          localStorage.removeItem('pure_sudh_active_user');
          return null;
        }
        // Auto-migrate legacy dummy demo phone number if present
        if (parsed.email === 'customer@puresudh.com' && parsed.phone === '9876543210') {
          parsed.phone = '+91 94310 12845';
        }
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  });

  const [role, setRole] = useState<UserRole>(() => user?.role || 'customer');
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<AuthModalMode>('login');
  const [targetPortal, setTargetPortal] = useState<'customer' | 'admin' | 'staff' | 'vendor'>('customer');
  const isLoggingOutRef = useRef(false);
  const hadFirebaseUserRef = useRef(false);
  const isVerifyingLoginRef = useRef(false);

  // Sync to session storage and keep state aligned with strict anti-temporary account enforcement
  useEffect(() => {
    if (user) {
      const emailCheck = isTemporaryEmail(user.email);
      const isKnownDemo = user.email.endsWith('@email.com') ||
        user.email.toLowerCase() === 'aanews70@gmail.com';
      const phoneCheck = (!isKnownDemo && user.phone) ? isTemporaryOrFakePhone(user.phone) : { isFake: false };

      if (emailCheck.isTemporary || phoneCheck.isFake) {
        console.warn('Flagged temporary/fake account detected in active session. Purging session:', user.email);
        localStorage.removeItem('pure_sudh_active_user');
        setUser(null);
        setRole('customer');
        signOut(auth).catch(() => {});
        return;
      }
      localStorage.setItem('pure_sudh_active_user', JSON.stringify(user));
      setRole(user.role);
    } else {
      localStorage.removeItem('pure_sudh_active_user');
      setRole('customer');
    }
  }, [user]);

  // Run audit and purge background scan ONLY when an admin is active
  useEffect(() => {
    if (user && user.role === 'admin') {
      const timer = setTimeout(() => {
        auditAndPurgeTemporaryAccounts().catch((e) => {
          console.warn('Admin temporary account audit notice:', e);
        });
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [user?.role]);

  // Load user profile from Firestore when Firebase Auth state changes
  const syncFirebaseUser = useCallback(async (fbUser: FirebaseUser | null): Promise<UserProfile | null> => {
    if (!fbUser) return null;
    try {
      const [claims, hasAdminDoc] = await Promise.all([
        getCustomClaims(fbUser),
        checkFirestoreAdminDoc(fbUser.uid),
      ]);

      let snapExists = false;
      let firestoreData: Partial<UserProfile> = {};
      try {
        const userRef = doc(db, COLLECTIONS.USERS, fbUser.uid);
        const snap = await Promise.race([
          getDoc(userRef),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000)),
        ]);
        if (snap && snap.exists()) {
          snapExists = true;
          firestoreData = snap.data() as Partial<UserProfile>;
        }
      } catch (readErr) {
        console.warn('Firestore user profile read notice:', readErr);
      }

      // Safe fallback to locally cached active user details to never wipe out registered name or phone
      let localCached: Partial<UserProfile> = {};
      try {
        const raw = localStorage.getItem('pure_sudh_active_user');
        if (raw) localCached = JSON.parse(raw);
      } catch {}

      if (snapExists) {
        const effRole = resolveEffectiveRole(claims, firestoreData.role, fbUser.email, hasAdminDoc);
        const fullProfile: UserProfile = {
          id: fbUser.uid,
          uid: fbUser.uid,
          email: fbUser.email || firestoreData.email || localCached.email || '',
          displayName: firestoreData.displayName || fbUser.displayName || localCached.displayName || 'Customer',
          phone: firestoreData.phone || localCached.phone || '',
          role: effRole,
          createdAt: firestoreData.createdAt || localCached.createdAt || new Date().toISOString(),
          addresses: Array.isArray(firestoreData.addresses) && firestoreData.addresses.length > 0
            ? firestoreData.addresses
            : (Array.isArray(localCached.addresses) ? localCached.addresses : []),
          vendorDetails: firestoreData.vendorDetails || localCached.vendorDetails,
          staffDetails: firestoreData.staffDetails || localCached.staffDetails,
          customClaims: claims,
          authMethod: fbUser.providerData[0]?.providerId === 'google.com' ? 'google' : 'password',
          emailVerified: fbUser.emailVerified,
        };
        setUser(fullProfile);
        setRole(fullProfile.role);
        localStorage.setItem('pure_sudh_active_user', JSON.stringify(fullProfile));
        return fullProfile;
      } else {
        // First-time profile creation in Firestore
        const effRole = resolveEffectiveRole(claims, undefined, fbUser.email, hasAdminDoc);
        const newProfile: UserProfile = {
          id: fbUser.uid,
          uid: fbUser.uid,
          email: fbUser.email || localCached.email || '',
          displayName: fbUser.displayName || localCached.displayName || (effRole === 'admin' ? 'Platform Administrator' : 'Customer'),
          phone: localCached.phone || '',
          role: effRole,
          createdAt: localCached.createdAt || new Date().toISOString(),
          addresses: Array.isArray(localCached.addresses) ? localCached.addresses : [],
          customClaims: claims,
          authMethod: fbUser.providerData[0]?.providerId === 'google.com' ? 'google' : 'password',
          emailVerified: fbUser.emailVerified,
        };
        try {
          const userRef = doc(db, COLLECTIONS.USERS, fbUser.uid);
          await setDoc(userRef, newProfile, { merge: true });
        } catch (err) {
          console.warn('Firestore initial user write fallback:', err);
        }
        setUser(newProfile);
        setRole(effRole);
        localStorage.setItem('pure_sudh_active_user', JSON.stringify(newProfile));
        return newProfile;
      }
    } catch (err) {
      console.warn('Sync Firebase Auth user fallback:', err);
      return null;
    }
  }, []);

  // Listen to Firebase Auth state changes & cross-tab storage sign-out
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        if (isLoggingOutRef.current || isVerifyingLoginRef.current) return;
        hadFirebaseUserRef.current = true;
        await syncFirebaseUser(fbUser);
      } else if (hadFirebaseUserRef.current) {
        // Firebase Auth explicitly transitioned from signed-in to signed-out
        hadFirebaseUserRef.current = false;
        setUser(null);
        setRole('customer');
        try {
          localStorage.removeItem('pure_sudh_active_user');
          sessionStorage.removeItem('pure_sudh_active_user');
        } catch {}
      }
    });

    const handleStorageSync = (e: StorageEvent) => {
      if (e.key === 'pure_sudh_active_user' && !e.newValue) {
        setUser(null);
        setRole('customer');
      }
    };
    window.addEventListener('storage', handleStorageSync);

    return () => {
      unsubscribe();
      window.removeEventListener('storage', handleStorageSync);
    };
  }, [syncFirebaseUser]);

  const openAuthModal = (
    mode: AuthModalMode = 'login',
    portal: 'customer' | 'admin' | 'staff' | 'vendor' = 'customer'
  ) => {
    setAuthModalMode(mode);
    setTargetPortal(portal);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  /**
   * Secure Login supporting Customer, Admin, Staff, and Vendor portals
   */
  const login = async (
    emailOrPhone: string,
    pass: string,
    target: 'customer' | 'admin' | 'staff' | 'vendor' = 'customer'
  ): Promise<{ success: boolean; error?: string; profile?: UserProfile }> => {
    setIsLoading(true);
    const rawInput = (emailOrPhone || '').trim();

    if (!rawInput) {
      setIsLoading(false);
      return { success: false, error: 'Please enter your email address or mobile number.' };
    }

    const isPhoneNumber = !rawInput.includes('@') && /^[0-9+() -]{7,16}$/.test(rawInput);
    let cleanEmail = '';
    let normalizedPhone = '';

    if (isPhoneNumber) {
      // Validate phone number strictly against temporary/fake checks
      const phoneCheck = isTemporaryOrFakePhone(rawInput);
      if (phoneCheck.isFake) {
        setIsLoading(false);
        return {
          success: false,
          error: phoneCheck.reason || 'Login blocked: Temporary, virtual, or dummy phone numbers are strictly prohibited. Please use your genuine mobile number.',
        };
      }

      const digits = rawInput.replace(/\D/g, '');
      normalizedPhone = digits.startsWith('91') && digits.length === 12
        ? digits.slice(2)
        : (digits.startsWith('0') && digits.length === 11 ? digits.slice(1) : digits);

      cleanEmail = `${normalizedPhone}@phone.puresudh.com`;
    } else {
      cleanEmail = rawInput.trim().toLowerCase();
      // Zero-tolerance validation against temporary/disposable email addresses
      const emailCheck = isTemporaryEmail(cleanEmail);
      if (emailCheck.isTemporary) {
        setIsLoading(false);
        return {
          success: false,
          error: emailCheck.reason || 'Login blocked: Temporary or disposable email addresses are not permitted.',
        };
      }
    }

    try {
      // 0. ADMIN PORTAL: Authenticate directly via Firebase Authentication first,
      // then verify Administrator role via Custom Claims / Firestore admins/{uid} / users/{uid} / owner email.
      if (target === 'admin') {
        if (isPhoneNumber) {
          return {
            success: false,
            error: 'Administrator Sign In requires a valid admin email address and password.',
          };
        }

        isVerifyingLoginRef.current = true;
        let firebaseErrorMsg: string | null = null;
        let firebaseErrorCode = '';

        try {
          const cred = await signInWithEmailAndPassword(auth, cleanEmail, pass);
          const [claims, hasAdminDoc] = await Promise.all([
            getCustomClaims(cred.user),
            checkFirestoreAdminDoc(cred.user.uid),
          ]);

          let firestoreData: Partial<UserProfile> = {};
          try {
            const snap = await Promise.race([
              getDoc(doc(db, COLLECTIONS.USERS, cred.user.uid)),
              new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000)),
            ]);
            if (snap && snap.exists()) {
              firestoreData = snap.data() as Partial<UserProfile>;
            }
          } catch (fsReadErr) {
            console.warn('Admin Firestore profile lookup notice:', fsReadErr);
          }

          const effectiveRole = resolveEffectiveRole(
            claims,
            firestoreData.role,
            cred.user.email || cleanEmail,
            hasAdminDoc
          );

          if (effectiveRole !== 'admin') {
            await signOut(auth).catch(() => {});
            return {
              success: false,
              error: `Access Denied: Firebase account (${cred.user.email || cleanEmail}) does not have Administrator privileges.`,
            };
          }

          const adminProfile: UserProfile = {
            id: cred.user.uid,
            uid: cred.user.uid,
            email: cred.user.email || cleanEmail,
            displayName: firestoreData.displayName || cred.user.displayName || 'Platform Administrator',
            phone: firestoreData.phone || '',
            role: 'admin',
            createdAt: firestoreData.createdAt || new Date().toISOString(),
            addresses: Array.isArray(firestoreData.addresses) ? firestoreData.addresses : [],
            customClaims: claims,
            authMethod: 'password',
            emailVerified: cred.user.emailVerified,
          };

          // Ensure Firestore user document exists with role 'admin' (non-blocking)
          try {
            await setDoc(
              doc(db, COLLECTIONS.USERS, cred.user.uid),
              {
                id: adminProfile.id,
                uid: adminProfile.uid,
                email: adminProfile.email,
                displayName: adminProfile.displayName,
                role: 'admin',
                createdAt: adminProfile.createdAt,
                updatedAt: new Date().toISOString(),
              },
              { merge: true }
            );
          } catch {}

          hadFirebaseUserRef.current = true;
          setUser(adminProfile);
          setRole('admin');
          localStorage.setItem('pure_sudh_active_user', JSON.stringify(adminProfile));
          closeAuthModal();
          return { success: true, profile: adminProfile };
        } catch (fbErr: any) {
          firebaseErrorCode = String(fbErr?.code || '');
          firebaseErrorMsg = formatFirebaseAuthError(fbErr);
        } finally {
          isVerifyingLoginRef.current = false;
        }

        // Optional local Express server fallback ONLY when running against local/Express API (not static Vercel SPA)
        const allowServerAdminFallback =
          !firebaseErrorCode ||
          firebaseErrorCode === 'auth/user-not-found' ||
          firebaseErrorCode === 'auth/invalid-credential' ||
          firebaseErrorCode === 'auth/wrong-password' ||
          firebaseErrorCode === 'auth/operation-not-allowed' ||
          firebaseErrorCode === 'auth/configuration-not-found';

        if (allowServerAdminFallback) {
          try {
            const serverRes = await fetch('/api/auth/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: rawInput.trim(),
                password: pass,
                targetPortal: 'admin',
              }),
            });
            const contentType = serverRes.headers.get('content-type') || '';
            if (serverRes.ok && contentType.includes('application/json')) {
              const data = await serverRes.json();
              if (data?.success && data?.profile?.role === 'admin') {
                const loadedProfile: UserProfile = {
                  id: data.profile.id,
                  uid: data.profile.uid || data.profile.id,
                  email: data.profile.email,
                  displayName: data.profile.displayName || 'Platform Administrator',
                  phone: data.profile.phone || '',
                  role: 'admin',
                  createdAt: data.profile.createdAt || new Date().toISOString(),
                  addresses: Array.isArray(data.profile.addresses) ? data.profile.addresses : [],
                };
                setUser(loadedProfile);
                setRole('admin');
                localStorage.setItem('pure_sudh_active_user', JSON.stringify(loadedProfile));
                closeAuthModal();
                return { success: true, profile: loadedProfile };
              }
            }
          } catch {
            // Static Vercel deployment has no /api/auth/login Express route; fall through to Firebase Auth error
          }
        }

        return {
          success: false,
          error: firebaseErrorMsg || 'Firebase authentication failed. Please check your email and password.',
        };
      }

      // 1. Check quick non-admin test accounts ONLY with exact valid password verification
      const isStaffMatch = cleanEmail === 'staff@email.com' || (normalizedPhone && normalizedPhone === '9431012802');
      if (isStaffMatch && pass === 'staff123') {
        setUser(defaultStaffUser);
        setRole('staff');
        localStorage.setItem('pure_sudh_active_user', JSON.stringify(defaultStaffUser));
        closeAuthModal();
        setIsLoading(false);
        return { success: true, profile: defaultStaffUser };
      }

      const isVendorMatch = cleanEmail === 'vendor@email.com' || (normalizedPhone && normalizedPhone === '9431012803');
      if (isVendorMatch && pass === 'vendor123') {
        if (target === 'staff') {
          setIsLoading(false);
          return { success: false, error: `Unauthorized: Vendor credentials cannot access ${target.toUpperCase()} portal.` };
        }
        setUser(defaultVendorUser);
        setRole('vendor');
        localStorage.setItem('pure_sudh_active_user', JSON.stringify(defaultVendorUser));
        closeAuthModal();
        setIsLoading(false);
        return { success: true, profile: defaultVendorUser };
      }

      const isCustMatch = cleanEmail === 'customer@email.com' || (normalizedPhone && normalizedPhone === '9431012845');
      if (isCustMatch && pass === 'cust123') {
        if (target !== 'customer') {
          setIsLoading(false);
          return {
            success: false,
            error: `Access Denied: Customer account is not authorized to access ${target.toUpperCase()} portal. Privileged role required.`,
          };
        }
        setUser(defaultCustomerUser);
        setRole('customer');
        localStorage.setItem('pure_sudh_active_user', JSON.stringify(defaultCustomerUser));
        closeAuthModal();
        setIsLoading(false);
        return { success: true, profile: defaultCustomerUser };
      }

      // 2. Authoritative Server Login API verification (when Express backend is available)
      let serverErrorMessage: string | null = null;
      let serverStatus = 0;
      try {
        const serverRes = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: rawInput.trim(),
            password: pass,
            targetPortal: target,
          }),
        });
        const contentType = serverRes.headers.get('content-type') || '';

        if (serverRes.ok && contentType.includes('application/json')) {
          const data = await serverRes.json();
          if (data && data.success && data.profile) {
            const loadedProfile: UserProfile = {
              id: data.profile.id,
              uid: data.profile.uid || data.profile.id,
              email: data.profile.email,
              displayName: data.profile.displayName || 'Customer',
              phone: data.profile.phone || (isPhoneNumber ? normalizedPhone : ''),
              role: data.profile.role || 'customer',
              createdAt: data.profile.createdAt || new Date().toISOString(),
              addresses: Array.isArray(data.profile.addresses) ? data.profile.addresses : [],
              vendorDetails: data.profile.vendorDetails,
            };

            setUser(loadedProfile);
            setRole(loadedProfile.role);
            localStorage.setItem('pure_sudh_active_user', JSON.stringify(loadedProfile));
            try {
              const localUsers: any[] = JSON.parse(localStorage.getItem('pure_sudh_registered_users') || '[]');
              const filtered = localUsers.filter((u: any) => u.email?.toLowerCase() !== loadedProfile.email.toLowerCase());
              filtered.push({ ...loadedProfile, password: pass });
              localStorage.setItem('pure_sudh_registered_users', JSON.stringify(filtered));
            } catch {}

            closeAuthModal();

            // Background sync to Firebase if available
            signInWithEmailAndPassword(auth, loadedProfile.email, pass).catch(() => {});

            return { success: true, profile: loadedProfile };
          }
        } else if (contentType.includes('application/json')) {
          serverStatus = serverRes.status;
          const errData = await serverRes.json().catch(() => null);
          if (errData?.error) {
            serverErrorMessage = errData.error;
          }
          if (serverRes.status === 403) {
            setIsLoading(false);
            return {
              success: false,
              error: errData?.error || 'Access Denied: You do not have permissions for this portal.',
            };
          }
          if (serverRes.status === 400) {
            setIsLoading(false);
            return {
              success: false,
              error: errData?.error || 'Invalid credentials. Please verify your details.',
            };
          }
          // On 401/404, still allow Firebase Auth verification in Step 4 (e.g. if password was reset via Firebase)
        }
      } catch (serverErr: any) {
        console.warn('Server auth endpoint notice (evaluating Firebase Auth):', serverErr.message);
      }

      // 3. Local offline registered accounts fallback (only if server didn't return 401)
      if (serverStatus !== 401) {
        try {
          const localUsers = JSON.parse(localStorage.getItem('pure_sudh_registered_users') || '[]');
          const found = localUsers.find((u: any) => {
            if (u.email && u.email.toLowerCase() === cleanEmail) return true;
            if (normalizedPhone && u.phone && String(u.phone).replace(/\D/g, '').endsWith(normalizedPhone)) return true;
            return false;
          });

          if (found && (!found.password || found.password === pass)) {
            const localProfile: UserProfile = {
              id: found.id || `usr-${Date.now()}`,
              uid: found.uid || found.id || `usr-${Date.now()}`,
              email: found.email,
              displayName: found.displayName || 'Customer',
              phone: found.phone || '',
              role: found.role || 'customer',
              createdAt: found.createdAt || new Date().toISOString(),
              addresses: found.addresses || [],
              vendorDetails: found.vendorDetails,
            };

            fetch('/api/auth/register-customer', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: localProfile.email,
                password: pass,
                name: localProfile.displayName,
                phone: localProfile.phone,
              }),
            }).catch(() => {});

            setUser(localProfile);
            setRole(localProfile.role);
            localStorage.setItem('pure_sudh_active_user', JSON.stringify(localProfile));
            closeAuthModal();
            return { success: true, profile: localProfile };
          }
        } catch (localErr) {
          console.warn('Local storage user search notice:', localErr);
        }
      }

      // 4. Firebase Authentication verification (authoritative on Vercel & when Firebase password changed)
      let firebaseErrorMsg: string | null = null;
      if (!isPhoneNumber) {
        isVerifyingLoginRef.current = true;
        try {
          const cred = await signInWithEmailAndPassword(auth, cleanEmail, pass);
          const [claims, hasAdminDoc] = await Promise.all([
            getCustomClaims(cred.user),
            checkFirestoreAdminDoc(cred.user.uid),
          ]);

          let firestoreData: Partial<UserProfile> = {};
          try {
            const snap = await Promise.race([
              getDoc(doc(db, COLLECTIONS.USERS, cred.user.uid)),
              new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000)),
            ]);
            if (snap && snap.exists()) {
              firestoreData = snap.data() as Partial<UserProfile>;
            }
          } catch (fsErr) {
            console.warn('Firestore user profile read notice:', fsErr);
          }

          const effectiveRole = resolveEffectiveRole(
            claims,
            firestoreData.role,
            cred.user.email || cleanEmail,
            hasAdminDoc
          );

          if (!verifyRoleAccess(effectiveRole, target)) {
            await signOut(auth).catch(() => {});
            return {
              success: false,
              error: `Access Denied: This account (${cred.user.email || cleanEmail}) has role '${effectiveRole}' and is not authorized for the ${target.toUpperCase()} portal.`,
            };
          }

          const loadedProfile: UserProfile = {
            id: cred.user.uid,
            uid: cred.user.uid,
            email: cred.user.email || cleanEmail,
            displayName: firestoreData.displayName || cred.user.displayName || 'User',
            phone: firestoreData.phone || '',
            role: effectiveRole,
            createdAt: firestoreData.createdAt || new Date().toISOString(),
            addresses: Array.isArray(firestoreData.addresses) ? firestoreData.addresses : [],
            vendorDetails: firestoreData.vendorDetails,
            staffDetails: firestoreData.staffDetails,
            customClaims: claims,
            authMethod: 'password',
            emailVerified: cred.user.emailVerified,
          };

          hadFirebaseUserRef.current = true;
          setUser(loadedProfile);
          setRole(loadedProfile.role);
          localStorage.setItem('pure_sudh_active_user', JSON.stringify(loadedProfile));
          closeAuthModal();
          return { success: true, profile: loadedProfile };
        } catch (fbErr: any) {
          firebaseErrorMsg = formatFirebaseAuthError(fbErr);
        } finally {
          isVerifyingLoginRef.current = false;
        }
      }

      return {
        success: false,
        error: firebaseErrorMsg || serverErrorMessage || 'Invalid credentials. Please verify your email/phone and password, or create an account.',
      };
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Customer Registration
   */
  const register = async (
    email: string,
    pass: string,
    name: string,
    phone: string
  ): Promise<{ success: boolean; error?: string; profile?: UserProfile }> => {
    setIsLoading(true);
    const cleanEmail = email.trim().toLowerCase();

    // Strict Anti-Temporary Email Validation
    const emailCheck = isTemporaryEmail(cleanEmail);
    if (emailCheck.isTemporary) {
      setIsLoading(false);
      return {
        success: false,
        error: emailCheck.reason || 'Registration blocked: Temporary/disposable email addresses are not permitted.',
      };
    }

    // Strict Anti-Fake Phone Validation
    const phoneCheck = isTemporaryOrFakePhone(phone);
    if (phoneCheck.isFake) {
      setIsLoading(false);
      return {
        success: false,
        error: phoneCheck.reason || 'Registration blocked: Please enter a genuine 10-digit mobile number.',
      };
    }

    try {
      const formattedPhone = formatIndianPhone(phone);

      // 1. Optional Express Server Registration Call (when Express backend is available)
      let serverRegistered = false;
      let serverProfile: any = null;
      try {
        const serverRes = await fetch('/api/auth/register-customer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: cleanEmail,
            password: pass,
            name: name.trim(),
            phone: formattedPhone,
          }),
        });
        const contentType = serverRes.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const serverData = await serverRes.json().catch(() => null);
          if (!serverRes.ok || !serverData?.success) {
            setIsLoading(false);
            return {
              success: false,
              error: serverData?.error || 'Registration failed. Please verify your details.',
            };
          }
          serverRegistered = true;
          serverProfile = serverData.profile;
        }
      } catch (apiErr: any) {
        console.warn('Express registration endpoint unavailable, continuing with Firebase Auth:', apiErr?.message);
      }

      // 2. Authoritative Firebase Authentication + Firestore registration
      let firebaseUid = serverProfile?.uid || serverProfile?.id || '';
      let emailVerified = false;
      try {
        const cred = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
        firebaseUid = cred.user.uid;
        emailVerified = cred.user.emailVerified;
        await updateProfile(cred.user, { displayName: name.trim() }).catch(() => {});
      } catch (fbErr: any) {
        if (!serverRegistered) {
          return {
            success: false,
            error: formatFirebaseAuthError(fbErr),
          };
        }
        console.warn('Firebase registration sync note (handled server-side):', fbErr?.message);
      }

      const registeredProfile: UserProfile = {
        id: firebaseUid || `usr-${Date.now()}`,
        uid: firebaseUid || `usr-${Date.now()}`,
        email: cleanEmail,
        displayName: name.trim(),
        phone: formattedPhone,
        role: 'customer',
        createdAt: serverProfile?.createdAt || new Date().toISOString(),
        addresses: [],
        authMethod: 'password',
        emailVerified,
      };

      if (auth.currentUser) {
        try {
          await setDoc(doc(db, COLLECTIONS.USERS, auth.currentUser.uid), registeredProfile, { merge: true });
        } catch (fsErr) {
          console.warn('Failed saving customer profile document in Firestore:', fsErr);
        }
        hadFirebaseUserRef.current = true;
      }

      // 3. Cache in client-side store for quick sync
      try {
        const localList = JSON.parse(localStorage.getItem('pure_sudh_registered_users') || '[]');
        const filtered = localList.filter((u: any) => u.email?.toLowerCase() !== cleanEmail);
        filtered.push({
          ...registeredProfile,
          password: pass,
        });
        localStorage.setItem('pure_sudh_registered_users', JSON.stringify(filtered));
      } catch (cacheErr) {
        console.warn('Local register cache note:', cacheErr);
      }

      setUser(registeredProfile);
      setRole('customer');
      localStorage.setItem('pure_sudh_active_user', JSON.stringify(registeredProfile));
      closeAuthModal();
      return { success: true, profile: registeredProfile };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Registration failed. Please check your details and try again.',
      };
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Vendor Registration Architecture
   */
  const registerVendorAccount = async (
    email: string,
    pass: string,
    name: string,
    phone: string,
    shopName: string,
    fssai?: string,
    gst?: string
  ): Promise<{ success: boolean; error?: string; profile?: UserProfile }> => {
    setIsLoading(true);
    const cleanEmail = email.trim().toLowerCase();

    // Strict Anti-Temporary Email Validation
    const emailCheck = isTemporaryEmail(cleanEmail);
    if (emailCheck.isTemporary) {
      setIsLoading(false);
      return {
        success: false,
        error: emailCheck.reason || 'Vendor registration rejected: Temporary/disposable email addresses are prohibited.',
      };
    }

    // Strict Anti-Fake Phone Validation
    const phoneCheck = isTemporaryOrFakePhone(phone);
    if (phoneCheck.isFake) {
      setIsLoading(false);
      return {
        success: false,
        error: phoneCheck.reason || 'Vendor registration rejected: Please enter a genuine 10-digit mobile number.',
      };
    }

    try {
      const formattedVendorPhone = formatIndianPhone(phone);

      // 1. Optional Express Server Vendor Registration Endpoint
      let serverRegistered = false;
      let serverProfile: any = null;
      try {
        const serverRes = await fetch('/api/auth/register-vendor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: cleanEmail,
            password: pass,
            name: name.trim(),
            phone: formattedVendorPhone,
            shopName: shopName.trim(),
            fssai: fssai || '',
            gst: gst || '',
          }),
        });
        const contentType = serverRes.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const serverData = await serverRes.json().catch(() => null);
          if (!serverRes.ok || !serverData?.success) {
            setIsLoading(false);
            return {
              success: false,
              error: serverData?.error || 'Vendor registration failed.',
            };
          }
          serverRegistered = true;
          serverProfile = serverData.profile;
        }
      } catch (apiErr: any) {
        console.warn('Express vendor registration endpoint unavailable, continuing with Firebase Auth:', apiErr?.message);
      }

      // 2. Authoritative Firebase Authentication + Firestore vendor creation
      let firebaseUid = serverProfile?.uid || serverProfile?.id || '';
      let emailVerified = false;
      try {
        const cred = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
        firebaseUid = cred.user.uid;
        emailVerified = cred.user.emailVerified;
        await updateProfile(cred.user, { displayName: name.trim() }).catch(() => {});
      } catch (fbErr: any) {
        if (!serverRegistered) {
          return {
            success: false,
            error: formatFirebaseAuthError(fbErr),
          };
        }
        console.warn('Firebase vendor registration sync note (handled server-side):', fbErr?.message);
      }

      const vendorProfile: UserProfile = {
        id: firebaseUid || `usr-vdr-${Date.now()}`,
        uid: firebaseUid || `usr-vdr-${Date.now()}`,
        email: cleanEmail,
        displayName: name.trim(),
        phone: formattedVendorPhone,
        role: 'vendor',
        createdAt: serverProfile?.createdAt || new Date().toISOString(),
        vendorDetails: {
          shopName: shopName.trim(),
          fssaiLicense: fssai || '',
          gstNumber: gst || '',
          status: 'pending',
        },
        addresses: [],
        authMethod: 'password',
        emailVerified,
      };

      if (auth.currentUser) {
        try {
          await setDoc(doc(db, COLLECTIONS.USERS, auth.currentUser.uid), vendorProfile, { merge: true });
          await setDoc(doc(db, 'vendorApplications', auth.currentUser.uid), {
            userId: auth.currentUser.uid,
            shopName: shopName.trim(),
            contactName: name.trim(),
            phone: formattedVendorPhone,
            email: cleanEmail,
            fssaiLicense: fssai || '',
            gstNumber: gst || '',
            status: 'pending',
            submittedAt: new Date().toISOString(),
          }, { merge: true }).catch(() => {});
        } catch (fsErr) {
          console.warn('Failed saving vendor profile document in Firestore:', fsErr);
        }
        hadFirebaseUserRef.current = true;
      }

      // 3. Cache in local store
      try {
        const localList = JSON.parse(localStorage.getItem('pure_sudh_registered_users') || '[]');
        const filtered = localList.filter((u: any) => u.email?.toLowerCase() !== cleanEmail);
        filtered.push({ ...vendorProfile, password: pass });
        localStorage.setItem('pure_sudh_registered_users', JSON.stringify(filtered));
      } catch (cacheErr) {
        console.warn('Vendor local cache note:', cacheErr);
      }

      setUser(vendorProfile);
      setRole('vendor');
      localStorage.setItem('pure_sudh_active_user', JSON.stringify(vendorProfile));
      closeAuthModal();
      return { success: true, profile: vendorProfile };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Vendor registration failed. Please check your details and try again.',
      };
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Forgot Password Email Dispatch
   * Strictly validates email syntax, disposable domain blocking, server account registration,
   * and portal RBAC before triggering password reset.
   */
  const sendPasswordReset = async (
    email: string,
    portalOverride?: 'customer' | 'admin' | 'staff' | 'vendor'
  ): Promise<{ success: boolean; message: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      throw new Error('Please provide an email address.');
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(cleanEmail)) {
      throw new Error('Please enter a valid email address.');
    }

    const emailCheck = isTemporaryEmail(cleanEmail);
    if (emailCheck.isTemporary) {
      throw new Error(emailCheck.reason || 'Temporary or disposable email addresses are not permitted.');
    }

    if (
      cleanEmail === 'enterpriseadministrationconsole@gmail.com' ||
      cleanEmail === 'admin@puresudh.com'
    ) {
      throw new Error('No registered account found with this email address.');
    }

    const portal = portalOverride || 'customer';

    // Authoritative server verification when Express backend is running
    try {
      const valRes = await fetch('/api/auth/forgot-password-validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, targetPortal: portal }),
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
        message: `Password reset link sent to ${cleanEmail}. Check your inbox and spam folder to complete reset.`,
      };
    } catch (err: any) {
      throw new Error(formatFirebaseAuthError(err));
    }
  };

  /**
   * In-App Password Update for Signed-In User
   */
  const updateUserPassword = async (
    newPass: string
  ): Promise<{ success: boolean; message?: string; error?: string }> => {
    if (newPass.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters long.' };
    }
    const currentFbUser = auth.currentUser;
    if (!currentFbUser) {
      // Demo mode password update
      return { success: true, message: 'Password updated successfully!' };
    }
    try {
      await fbUpdatePassword(currentFbUser, newPass);
      return { success: true, message: 'Password has been securely updated in Firebase Authentication.' };
    } catch (err: any) {
      if (err.code === 'auth/requires-recent-login') {
        return {
          success: false,
          error: 'Security checkpoint: Please log out and sign in again before changing your password.',
        };
      }
      return { success: false, error: err.message || 'Failed to update password.' };
    }
  };

  /**
   * Google Sign-In Architecture
   */
  const loginWithGoogle = async (
    target?: 'customer' | 'admin' | 'staff' | 'vendor'
  ): Promise<{ success: boolean; error?: string; profile?: UserProfile }> => {
    setIsLoading(true);
    isVerifyingLoginRef.current = true;
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');
      provider.setCustomParameters({ prompt: 'select_account' });
      const cred = await signInWithPopup(auth, provider);

      if (cred.user.email) {
        const check = isTemporaryEmail(cred.user.email);
        if (check.isTemporary) {
          await signOut(auth).catch(() => {});
          return { success: false, error: 'Temporary or disposable email addresses are not permitted.' };
        }
      }

      const [claims, hasAdminDoc] = await Promise.all([
        getCustomClaims(cred.user),
        checkFirestoreAdminDoc(cred.user.uid),
      ]);

      let firestoreData: Partial<UserProfile> = {};
      try {
        const snap = await Promise.race([
          getDoc(doc(db, COLLECTIONS.USERS, cred.user.uid)),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000)),
        ]);
        if (snap && snap.exists()) {
          firestoreData = snap.data() as Partial<UserProfile>;
        }
      } catch {}

      const effectiveRole = resolveEffectiveRole(
        claims,
        firestoreData.role,
        cred.user.email,
        hasAdminDoc
      );

      if (target && !verifyRoleAccess(effectiveRole, target)) {
        await signOut(auth).catch(() => {});
        return {
          success: false,
          error: `Access Denied: Google account (${cred.user.email}) has role '${effectiveRole}' and does not have ${target.toUpperCase()} privileges.`,
        };
      }

      hadFirebaseUserRef.current = true;
      const syncedProfile = await syncFirebaseUser(cred.user);
      closeAuthModal();
      return { success: true, profile: syncedProfile || undefined };
    } catch (err: any) {
      console.warn('Google sign-in attempt notice:', err.message);
      if (err.code === 'auth/popup-blocked') {
        return {
          success: false,
          error: 'Google sign-in popup was blocked by your browser. Please allow popups for this site and try again.',
        };
      }
      if (err.code === 'auth/unauthorized-domain') {
        return {
          success: false,
          error: formatFirebaseAuthError(err),
        };
      }
      if (err.code === 'auth/operation-not-allowed') {
        return {
          success: false,
          error: 'Google sign-in is disabled in Firebase Console (auth/operation-not-allowed). Enable Google provider under Authentication → Sign-in method.',
        };
      }
      let errorMsg = formatFirebaseAuthError(err);
      if (err.code === 'auth/popup-closed-by-user') {
        errorMsg = 'Sign in cancelled by closing popup.';
      }
      return { success: false, error: errorMsg };
    } finally {
      isVerifyingLoginRef.current = false;
      setIsLoading(false);
    }
  };

  /**
   * Logout - Immediately terminates session, purges storage tokens, resets user state
   */
  const logout = async () => {
    isLoggingOutRef.current = true;
    hadFirebaseUserRef.current = false;

    // 1. Immediately terminate active user state so UI updates synchronously
    setUser(null);
    setRole('customer');
    setIsAuthModalOpen(false);

    // 2. Clear user session and authentication tokens from LocalStorage and SessionStorage
    try {
      localStorage.removeItem('pure_sudh_active_user');
      sessionStorage.removeItem('pure_sudh_active_user');

      // Purge Firebase auth tokens and temporary user session tokens
      const localKeysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (
          k &&
          (k.startsWith('firebase:authUser') ||
            k.startsWith('pure_sudh_active') ||
            k.startsWith('pure_sudh_session') ||
            k.startsWith('pure_sudh_token'))
        ) {
          localKeysToRemove.push(k);
        }
      }
      localKeysToRemove.forEach((k) => localStorage.removeItem(k));

      const sessionKeysToRemove: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i);
        if (
          k &&
          (k.startsWith('firebase:authUser') ||
            k.startsWith('pure_sudh_'))
        ) {
          sessionKeysToRemove.push(k);
        }
      }
      sessionKeysToRemove.forEach((k) => sessionStorage.removeItem(k));
    } catch (e) {
      console.warn('Storage cleanup notice on logout:', e);
    }

    // 3. Dispatch an authoritative event so all components and listeners synchronize immediately
    try {
      window.dispatchEvent(new CustomEvent('pure_sudh_auth_change', { detail: { user: null } }));
    } catch {}

    // 4. Terminate Firebase Authentication session
    try {
      await signOut(auth);
    } catch (e) {
      console.warn('Firebase signout note:', e);
    } finally {
      isLoggingOutRef.current = false;
    }
  };

  /**
   * Role Switcher (strictly restricted to already-authenticated admins; never elevates unauthenticated/non-admin users)
   */
  const switchRole = (newRole: UserRole) => {
    if (!user || user.role !== 'admin') {
      console.warn('Unauthorized role switch attempt blocked.');
      return;
    }
    setRole(newRole);
    if (newRole === 'admin') {
      setUser(defaultAdminUser);
    } else if (newRole === 'staff') {
      setUser(defaultStaffUser);
    } else if (newRole === 'vendor') {
      setUser(defaultVendorUser);
    } else {
      setUser(defaultCustomerUser);
    }
  };

  /**
   * Authorization check helper
   */
  const hasRole = (allowedRoles: UserRole[]): boolean => {
    return allowedRoles.includes(role);
  };

  /**
   * Refresh Current Session Profile
   */
  const refreshSession = async () => {
    if (auth.currentUser) {
      await syncFirebaseUser(auth.currentUser);
    }
  };

  /**
   * Update Profile Personal Details
   */
  const updateUserProfileData = async (updates: {
    displayName?: string;
    phone?: string;
    photoURL?: string;
    avatarUrl?: string;
  }): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'Not authenticated' };

    let normalizedPhoneUpdate = updates.phone;
    if (updates.phone) {
      const phoneCheck = isTemporaryOrFakePhone(updates.phone);
      if (phoneCheck.isFake) {
        return { success: false, error: phoneCheck.reason || 'Invalid or temporary mobile number.' };
      }
      normalizedPhoneUpdate = formatIndianPhone(updates.phone);
    }

    const photo = updates.photoURL || updates.avatarUrl;
    const updatedUser: UserProfile = {
      ...user,
      displayName: updates.displayName !== undefined ? updates.displayName : user.displayName,
      phone: normalizedPhoneUpdate !== undefined ? normalizedPhoneUpdate : user.phone,
      photoURL: photo !== undefined ? photo : user.photoURL,
      avatarUrl: photo !== undefined ? photo : user.avatarUrl,
    };
    setUser(updatedUser);

    try {
      if (auth.currentUser) {
        if (updates.displayName || photo) {
          await updateProfile(auth.currentUser, {
            ...(updates.displayName ? { displayName: updates.displayName } : {}),
            ...(photo ? { photoURL: photo } : {}),
          });
        }
        const userRef = doc(db, COLLECTIONS.USERS, auth.currentUser.uid);
        await updateDoc(userRef, {
          ...(updates.displayName ? { displayName: updates.displayName } : {}),
          ...(normalizedPhoneUpdate ? { phone: normalizedPhoneUpdate } : {}),
          ...(photo ? { photoURL: photo, avatarUrl: photo } : {}),
          updatedAt: new Date().toISOString(),
        });
      }
      return { success: true };
    } catch (err: any) {
      console.warn('Firestore profile update fallback:', err);
      return { success: true };
    }
  };

  /**
   * Address Book Methods
   */
  const addAddress = async (addrData: Omit<Address, 'id'>) => {
    if (!user) return;
    const currentAddresses = user.addresses || [];
    const newAddress: Address = {
      ...addrData,
      phone: addrData.phone ? formatIndianPhone(addrData.phone) : '',
      id: `addr-${Date.now()}`,
      isDefault: currentAddresses.length === 0 ? true : !!addrData.isDefault,
    };
    const updated = {
      ...user,
      addresses: [...currentAddresses, newAddress],
    };
    setUser(updated);

    try {
      if (auth.currentUser) {
        await updateDoc(doc(db, COLLECTIONS.USERS, auth.currentUser.uid), {
          addresses: updated.addresses,
        });
      }
    } catch (e) {
      console.warn('Firestore address update fallback:', e);
    }
  };

  const deleteAddress = async (id: string) => {
    if (!user) return;
    const currentAddresses = user.addresses || [];
    const updated = {
      ...user,
      addresses: currentAddresses.filter((a) => a.id !== id),
    };
    setUser(updated);

    try {
      if (auth.currentUser) {
        await updateDoc(doc(db, COLLECTIONS.USERS, auth.currentUser.uid), {
          addresses: updated.addresses,
        });
      }
    } catch (e) {
      console.warn('Firestore delete address fallback:', e);
    }
  };

  const setDefaultAddress = async (id: string) => {
    if (!user) return;
    const currentAddresses = user.addresses || [];
    const updated = {
      ...user,
      addresses: currentAddresses.map((a) => ({
        ...a,
        isDefault: a.id === id,
      })),
    };
    setUser(updated);

    try {
      if (auth.currentUser) {
        await updateDoc(doc(db, COLLECTIONS.USERS, auth.currentUser.uid), {
          addresses: updated.addresses,
        });
      }
    } catch (e) {
      console.warn('Firestore set default address fallback:', e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isLoading,
        isAuthModalOpen,
        authModalMode,
        targetPortal,
        openAuthModal,
        closeAuthModal,
        login,
        register,
        registerVendor: registerVendorAccount,
        logout,
        sendPasswordReset,
        updateUserPassword,
        loginWithGoogle,
        updateUserProfileData,
        addAddress,
        deleteAddress,
        setDefaultAddress,
        switchRole,
        hasRole,
        refreshSession,
        testRoleAccounts: TEST_ROLE_ACCOUNTS,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
