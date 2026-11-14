/**
 * PURE SUDH - Firebase Storage Service
 * Modular Storage service for product images, vendor logos, and banner media
 */

import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase/config';

export interface UploadProgressCallback {
  (progress: number, snapshotState: string): void;
}

export async function uploadImage(
  file: File,
  folderPath: 'products' | 'vendors' | 'banners' | 'reviews' = 'products',
  onProgress?: UploadProgressCallback
): Promise<string> {
  const extension = file.name.split('.').pop() || 'jpg';
  const cleanName = file.name.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 20);
  const fileName = `${folderPath}/${Date.now()}_${cleanName}.${extension}`;

  try {
    const storageRef = ref(storage, fileName);
    const uploadTask = uploadBytesResumable(storageRef, file, {
      contentType: file.type || 'image/jpeg',
    });

    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          if (onProgress) {
            onProgress(Math.round(progress), snapshot.state);
          }
        },
        (error) => {
          console.warn('Firebase Storage upload error, creating local data URL:', error);
          // Fallback to local FileReader if bucket is unconfigured or blocked by storage rules
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(error);
          reader.readAsDataURL(file);
        },
        async () => {
          try {
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(downloadUrl);
          } catch (e) {
            console.warn('getDownloadURL error, fallback to data URL:', e);
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          }
        }
      );
    });
  } catch (err) {
    console.warn('Storage operation exception, fallback to data URL:', err);
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
  }
}
