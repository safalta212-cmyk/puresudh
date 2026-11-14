/**
 * Firebase Storage Service for PURE SUDH
 * Provides resilient, progress-tracked media uploads, optimizations, and role-guarded deletions.
 */

import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  UploadTask,
} from 'firebase/storage';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import { storage, db, auth } from './config';
import {
  MEDIA_PRESETS,
  validateMediaFile,
  optimizeImage,
  generateSafeFilename,
  OptimizationResult,
} from '../utils/imageOptimizer';

export type MediaPresetType =
  | 'product'
  | 'category'
  | 'banner'
  | 'vendorLogo'
  | 'vendorCover'
  | 'profile'
  | 'review';

export interface UploadPathParams {
  productId?: string;
  categoryId?: string;
  bannerId?: string;
  vendorId?: string;
  userId?: string;
  reviewId?: string;
}

export interface UploadMediaOptions {
  file: File;
  preset: MediaPresetType;
  pathParams: UploadPathParams;
  onProgress?: (progress: number, stage: 'optimizing' | 'uploading' | 'completed') => void;
  metadata?: Record<string, string>;
  generateThumbnail?: boolean;
}

export interface UploadResult {
  downloadUrl: string;
  thumbnailUrl?: string;
  storagePath: string;
  thumbnailStoragePath?: string;
  fileName: string;
  size: number;
  originalSize: number;
  savingsPercentage: number;
  width: number;
  height: number;
  contentType: string;
  uploadedAt: string;
}

export interface MediaRecord {
  id: string;
  downloadUrl: string;
  thumbnailUrl?: string;
  storagePath: string;
  thumbnailStoragePath?: string;
  fileName: string;
  preset: MediaPresetType;
  entityId?: string;
  uploadedBy: string;
  uploadedByEmail?: string;
  size: number;
  originalSize: number;
  savingsPercentage: number;
  width: number;
  height: number;
  contentType: string;
  createdAt: string;
  status: 'active' | 'orphaned' | 'deleted';
}

/**
 * Maps raw storage error codes to human-readable guidance
 */
export function formatStorageError(error: unknown): string {
  if (!error) return 'An unknown error occurred during upload.';
  const errStr = error instanceof Error ? error.message : String(error);

  if (errStr.includes('storage/unauthorized') || errStr.includes('Permission denied')) {
    return 'Permission Denied: Your account role is not authorized to upload or modify this file.';
  }
  if (errStr.includes('storage/canceled')) {
    return 'Upload was canceled.';
  }
  if (errStr.includes('storage/quota-exceeded')) {
    return 'Storage quota exceeded. Please contact system administrator.';
  }
  if (errStr.includes('storage/retry-limit-exceeded')) {
    return 'Network timeout. The upload failed after multiple retries. Please check your internet connection.';
  }
  if (errStr.includes('storage/invalid-argument')) {
    return 'Invalid upload arguments provided.';
  }

  return errStr;
}

/**
 * Builds the canonical storage path adhering strictly to security rules
 */
export function buildStoragePath(
  preset: MediaPresetType,
  params: UploadPathParams,
  fileName: string,
  isThumbnail = false
): string {
  const currentUid = auth.currentUser?.uid || 'anonymous';

  switch (preset) {
    case 'product': {
      const prodId = params.productId || 'new';
      return isThumbnail
        ? `products/${prodId}/thumbnails/${fileName}`
        : `products/${prodId}/${fileName}`;
    }
    case 'category': {
      const catId = params.categoryId || 'general';
      return `categories/${catId}/${fileName}`;
    }
    case 'banner': {
      const banId = params.bannerId || 'promo';
      return `banners/${banId}/${fileName}`;
    }
    case 'vendorLogo': {
      const vId = params.vendorId || currentUid;
      return `vendors/${vId}/logo/${fileName}`;
    }
    case 'vendorCover': {
      const vId = params.vendorId || currentUid;
      return `vendors/${vId}/cover/${fileName}`;
    }
    case 'profile': {
      const uId = params.userId || currentUid;
      return `users/${uId}/${fileName}`;
    }
    case 'review': {
      const uId = params.userId || currentUid;
      const pId = params.productId || 'general';
      return `reviews/${uId}/${pId}/${fileName}`;
    }
    default:
      throw new Error(`Unsupported media preset: ${preset}`);
  }
}

/**
 * Resilient upload function with client-side canvas optimization, progress tracking & thumbnailing
 */
export async function uploadMedia(options: UploadMediaOptions): Promise<UploadResult> {
  const { file, preset, pathParams, onProgress, metadata = {}, generateThumbnail = true } = options;

  // 1. Validate file constraints
  const validation = validateMediaFile(file, preset);
  if (!validation.isValid) {
    throw new Error(validation.error || 'File validation failed.');
  }

  // 2. Client-side Image Optimization Stage
  onProgress?.(10, 'optimizing');

  let optResult: OptimizationResult;
  try {
    optResult = await optimizeImage(file, preset, {
      generateThumbnail,
      quality: 0.85,
    });
  } catch (optErr) {
    console.warn('Canvas optimization warning, falling back to raw file:', optErr);
    optResult = {
      optimizedBlob: file,
      optimizedFile: file,
      originalSize: file.size,
      optimizedSize: file.size,
      savingsPercentage: 0,
      width: 0,
      height: 0,
      format: file.type.split('/')[1] || 'jpeg',
    };
  }

  onProgress?.(30, 'uploading');

  // 3. Build Safe Filename & Storage Paths
  const safeName = generateSafeFilename(file.name, preset, optResult.format);
  const mainStoragePath = buildStoragePath(preset, pathParams, safeName, false);
  const mainStorageRef = ref(storage, mainStoragePath);

  // 4. Resumable Upload with Progress Callback
  const customMetadata = {
    originalName: file.name,
    preset,
    uploadedBy: auth.currentUser?.uid || 'anon',
    uploadedAt: new Date().toISOString(),
    ...metadata,
  };

  const uploadTask: UploadTask = uploadBytesResumable(mainStorageRef, optResult.optimizedBlob, {
    contentType: optResult.optimizedFile.type || 'image/webp',
    customMetadata,
  });

  await new Promise<void>((resolve, reject) => {
    // 5-second timeout for Firebase Storage: if bucket is blocked or unconfigured, fail fast to fallback
    const timeoutTimer = setTimeout(() => {
      try {
        uploadTask.cancel();
      } catch (cancelErr) {
        // ignore cancel error
      }
      reject(new Error('Firebase Storage timeout: Bucket is unconfigured or blocked by storage network rules.'));
    }, 5000);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const percent = Math.round((snapshot.bytesTransferred / (snapshot.totalBytes || 1)) * 60) + 30;
        onProgress?.(Math.min(percent, 95), 'uploading');
      },
      (error) => {
        clearTimeout(timeoutTimer);
        reject(new Error(formatStorageError(error)));
      },
      () => {
        clearTimeout(timeoutTimer);
        resolve();
      }
    );
  });

  // 5. Get main download URL
  const downloadUrl = await getDownloadURL(mainStorageRef);

  // 6. Upload thumbnail if available
  let thumbnailUrl: string | undefined;
  let thumbStoragePath: string | undefined;

  if (optResult.thumbnailBlob && generateThumbnail) {
    try {
      const thumbName = `thumb_${safeName}`;
      thumbStoragePath = buildStoragePath(preset, pathParams, thumbName, true);
      const thumbRef = ref(storage, thumbStoragePath);
      await uploadBytesResumable(thumbRef, optResult.thumbnailBlob, {
        contentType: 'image/webp',
        customMetadata: { ...customMetadata, isThumbnail: 'true' },
      });
      thumbnailUrl = await getDownloadURL(thumbRef);
    } catch (thumbErr) {
      console.warn('Thumbnail upload non-fatal warning:', thumbErr);
    }
  }

  onProgress?.(100, 'completed');

  const nowIso = new Date().toISOString();
  const entityId =
    pathParams.productId ||
    pathParams.categoryId ||
    pathParams.bannerId ||
    pathParams.vendorId ||
    pathParams.userId ||
    '';

  const result: UploadResult = {
    downloadUrl,
    thumbnailUrl,
    storagePath: mainStoragePath,
    thumbnailStoragePath: thumbStoragePath,
    fileName: safeName,
    size: optResult.optimizedSize,
    originalSize: optResult.originalSize,
    savingsPercentage: optResult.savingsPercentage,
    width: optResult.width,
    height: optResult.height,
    contentType: optResult.optimizedFile.type || 'image/webp',
    uploadedAt: nowIso,
  };

  // 7. Track in Firestore Media Registry for audit & unused image garbage collection
  try {
    const registryDocId = safeName.replace(/[^a-zA-Z0-9_-]/g, '_');
    await setDoc(doc(db, 'mediaRegistry', registryDocId), {
      id: registryDocId,
      ...result,
      preset,
      entityId,
      uploadedBy: auth.currentUser?.uid || 'anon',
      uploadedByEmail: auth.currentUser?.email || '',
      status: 'active',
      createdAt: nowIso,
      updatedAt: serverTimestamp(),
    });
  } catch (registryErr) {
    console.warn('Media registry logging non-fatal note:', registryErr);
  }

  return result;
}

/**
 * Safely deletes a file and its thumbnail from Firebase Storage
 */
export async function deleteMedia(storagePathOrUrl: string, thumbnailPath?: string): Promise<boolean> {
  try {
    let cleanPath = storagePathOrUrl;
    // If a full Firebase download URL was passed, parse out the storage path
    if (storagePathOrUrl.startsWith('http')) {
      const url = new URL(storagePathOrUrl);
      const match = url.pathname.match(/\/o\/(.+)/);
      if (match && match[1]) {
        cleanPath = decodeURIComponent(match[1]);
      }
    }

    const fileRef = ref(storage, cleanPath);
    await deleteObject(fileRef);

    // Delete thumbnail if known
    if (thumbnailPath) {
      try {
        const thumbRef = ref(storage, thumbnailPath);
        await deleteObject(thumbRef);
      } catch (tErr) {
        // Thumbnail deletion failure shouldn't throw
        console.warn('Thumbnail deletion note:', tErr);
      }
    }

    // Update media registry
    try {
      const fileName = cleanPath.split('/').pop() || '';
      const registryDocId = fileName.replace(/[^a-zA-Z0-9_-]/g, '_');
      await deleteDoc(doc(db, 'mediaRegistry', registryDocId));
    } catch {
      // Non-critical
    }

    return true;
  } catch (error) {
    console.error('Delete media error:', error);
    throw new Error(formatStorageError(error));
  }
}

/**
 * Fetches media registry records for auditing and media management
 */
export async function fetchMediaRegistry(presetFilter?: MediaPresetType): Promise<MediaRecord[]> {
  try {
    const colRef = collection(db, 'mediaRegistry');
    const q = presetFilter
      ? query(colRef, where('preset', '==', presetFilter), limit(100))
      : query(colRef, limit(100));

    const snap = await getDocs(q);
    const records: MediaRecord[] = [];
    snap.forEach((d) => {
      records.push(d.data() as MediaRecord);
    });

    return records.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch (e) {
    console.warn('fetchMediaRegistry error or offline mode:', e);
    return [];
  }
}
