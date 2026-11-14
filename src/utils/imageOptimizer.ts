/**
 * Image Optimization, Validation & Sanitization Utility for Firebase Storage
 */

export interface ValidationRule {
  maxSizeBytes: number;
  allowedMimeTypes: string[];
  maxWidth?: number;
  maxHeight?: number;
  label: string;
}

export const MEDIA_PRESETS: Record<
  'product' | 'category' | 'banner' | 'vendorLogo' | 'vendorCover' | 'profile' | 'review',
  ValidationRule
> = {
  product: {
    maxSizeBytes: 5 * 1024 * 1024, // 5MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    maxWidth: 1600,
    maxHeight: 1600,
    label: 'Product Image',
  },
  category: {
    maxSizeBytes: 2 * 1024 * 1024, // 2MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'],
    maxWidth: 800,
    maxHeight: 800,
    label: 'Category Icon/Image',
  },
  banner: {
    maxSizeBytes: 8 * 1024 * 1024, // 8MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    maxWidth: 2400,
    maxHeight: 1200,
    label: 'Banner Image',
  },
  vendorLogo: {
    maxSizeBytes: 2 * 1024 * 1024, // 2MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'],
    maxWidth: 800,
    maxHeight: 800,
    label: 'Vendor Logo',
  },
  vendorCover: {
    maxSizeBytes: 5 * 1024 * 1024, // 5MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    maxWidth: 2000,
    maxHeight: 800,
    label: 'Vendor Cover Banner',
  },
  profile: {
    maxSizeBytes: 2 * 1024 * 1024, // 2MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    maxWidth: 600,
    maxHeight: 600,
    label: 'Profile Photo',
  },
  review: {
    maxSizeBytes: 3 * 1024 * 1024, // 3MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    maxWidth: 1200,
    maxHeight: 1200,
    label: 'Review Photo',
  },
};

export interface OptimizationResult {
  optimizedBlob: Blob;
  thumbnailBlob?: Blob;
  optimizedFile: File;
  originalSize: number;
  optimizedSize: number;
  savingsPercentage: number;
  width: number;
  height: number;
  format: string;
}

/**
 * Generates a clean, alphanumeric, collision-resistant filename
 */
export function generateSafeFilename(
  originalName: string,
  prefix = 'media',
  forcedExtension?: string
): string {
  // Extract base name without extension
  const lastDot = originalName.lastIndexOf('.');
  const rawBase = lastDot > 0 ? originalName.slice(0, lastDot) : originalName;
  const rawExt = lastDot > 0 ? originalName.slice(lastDot + 1).toLowerCase() : 'webp';

  // Sanitize base: lowercase, alphanumeric and dashes only
  const cleanBase = rawBase
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 32);

  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const ext = forcedExtension || (rawExt === 'jpeg' ? 'jpg' : rawExt);

  return `${prefix}_${cleanBase || 'img'}_${timestamp}_${randomSuffix}.${ext}`;
}

/**
 * Validates a file against predefined media constraints
 */
export function validateMediaFile(
  file: File,
  presetType?: keyof typeof MEDIA_PRESETS | string
): { isValid: boolean; error?: string } {
  const rule =
    (presetType && MEDIA_PRESETS[presetType as keyof typeof MEDIA_PRESETS]) ||
    MEDIA_PRESETS.product;

  if (!rule) {
    return { isValid: false, error: 'Unknown media preset rule.' };
  }

  // 1. Check MIME type (tolerant to generic image/ or missing mime type by checking extension)
  const fileExt = file.name.split('.').pop()?.toLowerCase();
  const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'bmp', 'jfif', 'ico', 'avif'];
  const isImageMime = file.type.startsWith('image/');
  const isAllowedExt = fileExt ? allowedExtensions.includes(fileExt) : false;

  if (Array.isArray(rule.allowedMimeTypes) && !rule.allowedMimeTypes.includes(file.type)) {
    // If mime type is not in strict list, allow if it's an image or has a valid image extension
    if (!isImageMime && !isAllowedExt) {
      return {
        isValid: false,
        error: `Invalid file format "${file.type || fileExt || 'unknown'}". Allowed formats: JPEG, PNG, WebP, GIF, SVG.`,
      };
    }
  }

  // 2. Check File Size
  const maxBytes = rule.maxSizeBytes || 5 * 1024 * 1024;
  if (file.size > maxBytes) {
    const maxMb = (maxBytes / (1024 * 1024)).toFixed(1);
    const actualMb = (file.size / (1024 * 1024)).toFixed(2);
    return {
      isValid: false,
      error: `File is too large (${actualMb} MB). Maximum allowed size is ${maxMb} MB for ${rule.label || 'image'}.`,
    };
  }

  if (file.size === 0) {
    return { isValid: false, error: 'File is empty (0 bytes).' };
  }

  return { isValid: true };
}

/**
 * Client-side image optimization & downscaling via HTML5 Canvas
 * Converts heavy images to efficient WebP/JPEG, creates thumbnail if requested
 */
export async function optimizeImage(
  file: File,
  presetType?: keyof typeof MEDIA_PRESETS | string,
  options: {
    quality?: number;
    generateThumbnail?: boolean;
    thumbnailSize?: number;
  } = {}
): Promise<OptimizationResult> {
  const rule =
    (presetType && MEDIA_PRESETS[presetType as keyof typeof MEDIA_PRESETS]) ||
    MEDIA_PRESETS.product;
  const quality = options.quality ?? 0.84;
  const generateThumbnail = options.generateThumbnail ?? true;
  const thumbSize = options.thumbnailSize ?? 240;

  // If SVG or GIF (animated), don't process via canvas to preserve animation/vector
  if (file.type === 'image/svg+xml' || file.type === 'image/gif') {
    return {
      optimizedBlob: file,
      optimizedFile: file,
      originalSize: file.size,
      optimizedSize: file.size,
      savingsPercentage: 0,
      width: 0,
      height: 0,
      format: file.type.split('/')[1],
    };
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to decode image data.'));
      img.onload = async () => {
        try {
          const originalWidth = img.naturalWidth || img.width;
          const originalHeight = img.naturalHeight || img.height;

          // Calculate scaled dimensions within preset bounds
          const maxWidth = rule.maxWidth || 1600;
          const maxHeight = rule.maxHeight || 1600;

          let targetWidth = originalWidth;
          let targetHeight = originalHeight;

          if (targetWidth > maxWidth || targetHeight > maxHeight) {
            const ratio = Math.min(maxWidth / targetWidth, maxHeight / targetHeight);
            targetWidth = Math.round(targetWidth * ratio);
            targetHeight = Math.round(targetHeight * ratio);
          }

          // Render optimized display image
          const canvas = document.createElement('canvas');
          canvas.width = targetWidth;
          canvas.height = targetHeight;
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            throw new Error('Canvas 2D context unavailable.');
          }

          // Use high quality image smoothing
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

          // Test WebP support with fallback to JPEG
          const outputMime = 'image/webp';

          const optimizedBlob = await new Promise<Blob>((resBlob, rejBlob) => {
            canvas.toBlob(
              (blob) => {
                if (blob) {
                  resBlob(blob);
                } else {
                  // Fallback to JPEG if WebP fails
                  canvas.toBlob(
                    (jpegBlob) => (jpegBlob ? resBlob(jpegBlob) : rejBlob(new Error('Canvas blob generation failed'))),
                    'image/jpeg',
                    quality
                  );
                }
              },
              outputMime,
              quality
            );
          });

          // Optional Thumbnail generation
          let thumbnailBlob: Blob | undefined;
          if (generateThumbnail) {
            const thumbCanvas = document.createElement('canvas');
            const thumbRatio = Math.min(thumbSize / originalWidth, thumbSize / originalHeight);
            thumbCanvas.width = Math.round(originalWidth * thumbRatio);
            thumbCanvas.height = Math.round(originalHeight * thumbRatio);
            const thumbCtx = thumbCanvas.getContext('2d');
            if (thumbCtx) {
              thumbCtx.imageSmoothingEnabled = true;
              thumbCtx.imageSmoothingQuality = 'high';
              thumbCtx.drawImage(img, 0, 0, thumbCanvas.width, thumbCanvas.height);
              thumbnailBlob = await new Promise<Blob>((resThumb) => {
                thumbCanvas.toBlob((b) => resThumb(b || optimizedBlob), outputMime, 0.8);
              });
            }
          }

          const originalSize = file.size;
          const optimizedSize = optimizedBlob.size;
          const savings = Math.max(0, Math.round(((originalSize - optimizedSize) / originalSize) * 100));

          const safeFilename = generateSafeFilename(file.name, presetType, 'webp');
          const optimizedFile = new File([optimizedBlob], safeFilename, { type: outputMime });

          resolve({
            optimizedBlob,
            thumbnailBlob,
            optimizedFile,
            originalSize,
            optimizedSize,
            savingsPercentage: savings,
            width: targetWidth,
            height: targetHeight,
            format: 'webp',
          });
        } catch (err) {
          reject(err);
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
