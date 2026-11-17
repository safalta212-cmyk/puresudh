import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, setLogLevel, Firestore, doc, getDocFromServer } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getFunctions, Functions } from 'firebase/functions';
import firebaseConfig from '../../firebase-applet-config.json';

// Silence internal Firestore transport connection warnings so offline mode works cleanly
try {
  setLogLevel('silent');
} catch {
  // Ignore if already initialized or unavailable
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

// Initialize Firestore using the provisioned database ID as mandated by Firebase Integration Skill
const db: Firestore = getFirestore(app, firebaseConfig.firestoreDatabaseId); /* CRITICAL: The app will break without this line */

// Validate connection to Firestore as required by Firebase Integration Skill (non-blocking, tolerant of offline mode)
export async function testConnection(): Promise<boolean> {
  try {
    // Only attempt if browser is online
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return false;
    }
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    // Graceful offline degradation without uncaught exceptions
    return false;
  }
}
// Defer test connection check so it does not block immediate script initialization
if (typeof window !== 'undefined') {
  setTimeout(() => {
    testConnection().catch(() => {});
  }, 3000);
}

// Storage instance
let storage: FirebaseStorage;
try {
  storage = getStorage(app, firebaseConfig.storageBucket || undefined);
} catch (e) {
  console.warn('Storage initialization note:', e);
  storage = getStorage(app);
}

// Functions instance
let functions: Functions;
try {
  functions = getFunctions(app);
} catch (e) {
  console.warn('Functions initialization note:', e);
  functions = getFunctions(app);
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errMessage = error instanceof Error ? error.message : String(error);
  const isPermissionDenied =
    errMessage.includes('permission-denied') ||
    errMessage.includes('Missing or insufficient permissions');

  const errInfo: FirestoreErrorInfo = {
    error: errMessage,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };

  if (isPermissionDenied) {
    console.error('Firestore Error: ', JSON.stringify(errInfo));
    throw new Error(JSON.stringify(errInfo));
  }
}

export { app, auth, db, storage, functions };

