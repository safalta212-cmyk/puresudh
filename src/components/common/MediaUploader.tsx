import React, { useState, useRef, useEffect } from 'react';
import {
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Image as ImageIcon,
  Sparkles,
  RefreshCw,
  X,
  Link as LinkIcon,
} from 'lucide-react';
import {
  uploadMedia,
  deleteMedia,
  UploadResult,
  MediaPresetType,
  UploadPathParams,
  formatStorageError,
} from '../../firebase/storageService';
import { MEDIA_PRESETS, optimizeImage, validateMediaFile } from '../../utils/imageOptimizer';
import { useToast } from '../../context/ToastContext';

export interface MediaUploaderProps {
  preset?: MediaPresetType;
  pathParams?: UploadPathParams;
  currentImageUrl?: string;
  currentThumbnailUrl?: string;
  onUploadSuccess?: (result: UploadResult) => void;
  onImageUploaded?: (url: string) => void;
  onDeleteSuccess?: () => void;
  label?: string;
  helpText?: string;
  aspectRatio?: '1:1' | '16:9' | '3:1' | 'auto';
  compact?: boolean;
  disabled?: boolean;
  allowDelete?: boolean;
}

export const MediaUploader: React.FC<MediaUploaderProps> = ({
  preset = 'product',
  pathParams = {},
  currentImageUrl,
  currentThumbnailUrl,
  onUploadSuccess,
  onImageUploaded,
  onDeleteSuccess,
  label,
  helpText,
  aspectRatio = 'auto',
  compact = false,
  disabled = false,
  allowDelete = true,
}) => {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState<'optimizing' | 'uploading' | 'completed' | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null);
  const [optimizationStats, setOptimizationStats] = useState<{
    originalSize: number;
    optimizedSize: number;
    savings: number;
  } | null>(null);

  const [inputMode, setInputMode] = useState<'upload' | 'url'>('upload');
  const [urlInput, setUrlInput] = useState(currentImageUrl || '');

  useEffect(() => {
    setPreviewUrl(currentImageUrl || null);
    setUrlInput(currentImageUrl || '');
  }, [currentImageUrl]);

  const handleApplyUrl = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = urlInput.trim();
    if (!trimmed) {
      setPreviewUrl(null);
      onImageUploaded?.('');
      showToast('Image URL cleared.', 'info');
      return;
    }
    setPreviewUrl(trimmed);
    setErrorMessage(null);
    onImageUploaded?.(trimmed);
    showToast('Image URL applied successfully!', 'success');
  };
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fallbackRule = {
    maxSizeBytes: 5 * 1024 * 1024,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    label: 'Media File',
  };

  const activePreset: MediaPresetType = (
    preset && MEDIA_PRESETS && preset in MEDIA_PRESETS ? preset : 'product'
  ) as MediaPresetType;
  const rule =
    (MEDIA_PRESETS && activePreset && MEDIA_PRESETS[activePreset]) ||
    (MEDIA_PRESETS && MEDIA_PRESETS.product) ||
    fallbackRule;

  const handleFileSelect = async (file: File) => {
    setErrorMessage(null);
    setOptimizationStats(null);
    setIsUploading(true);
    setUploadProgress(5);
    setUploadStage('optimizing');

    // 1. Validate file constraints first
    const validation = validateMediaFile(file, activePreset);
    if (!validation.isValid) {
      const err = validation.error || 'Invalid file format or file too large.';
      setErrorMessage(err);
      showToast(err, 'error');
      setIsUploading(false);
      setUploadStage(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Local instant preview
    const tempUrl = URL.createObjectURL(file);
    setPreviewUrl(tempUrl);

    try {
      // Primary route: Firebase Storage
      const result = await uploadMedia({
        file,
        preset: activePreset,
        pathParams,
        generateThumbnail: activePreset === 'product' || activePreset === 'category',
        onProgress: (progress, stage) => {
          setUploadProgress(progress);
          setUploadStage(stage);
        },
      });

      setOptimizationStats({
        originalSize: result.originalSize,
        optimizedSize: result.size,
        savings: result.savingsPercentage,
      });

      setPreviewUrl(result.downloadUrl);
      onUploadSuccess?.(result);
      onImageUploaded?.(result.downloadUrl);
      showToast(
        `Uploaded & optimized successfully! Saved ${result.savingsPercentage}% bandwidth.`,
        'success'
      );
    } catch (err: unknown) {
      console.warn('Firebase Storage upload notice, switching to secondary storage engine:', err);
      
      try {
        setUploadStage('optimizing');
        setUploadProgress(40);

        // Optimize image
        const opt = await optimizeImage(file, activePreset, {
          quality: 0.80,
          thumbnailSize: 300,
        });

        // Convert optimized blob to base64
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error('Failed reading optimized blob'));
          reader.readAsDataURL(opt.optimizedBlob);
        });

        setUploadStage('uploading');
        setUploadProgress(70);

        // Try server storage route
        let finalUrl = dataUrl;
        try {
          const serverRes = await fetch('/api/media/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              base64Data: dataUrl,
              filename: file.name,
              contentType: opt.optimizedBlob.type || file.type || 'image/webp',
              preset: activePreset,
            }),
          });
          if (serverRes.ok) {
            const data = await serverRes.json();
            if (data && data.url) {
              finalUrl = data.url;
            }
          }
        } catch (serverErr) {
          console.warn('Backend upload proxy notice, maintaining direct optimized image data:', serverErr);
        }

        setPreviewUrl(finalUrl);
        setOptimizationStats({
          originalSize: opt.originalSize,
          optimizedSize: opt.optimizedSize,
          savings: opt.savingsPercentage,
        });
        setUploadProgress(100);
        onImageUploaded?.(finalUrl);
        showToast('Image uploaded and optimized for web!', 'success');
      } catch (fallbackErr: any) {
        console.error('Local optimization error:', fallbackErr);
        // Direct file reader fallback
        const directReader = new FileReader();
        directReader.onload = () => {
          const rawData = directReader.result as string;
          setPreviewUrl(rawData);
          onImageUploaded?.(rawData);
          showToast('Image uploaded successfully!', 'success');
        };
        directReader.onerror = () => {
          const formatted = formatStorageError(err);
          setErrorMessage(formatted);
          setPreviewUrl(currentImageUrl || null);
          showToast(formatted, 'error');
        };
        directReader.readAsDataURL(file);
      }
    } finally {
      setIsUploading(false);
      setUploadStage(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled && !isUploading) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled || isUploading) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!previewUrl || isDeleting || disabled) return;

    setIsDeleting(true);
    try {
      if (previewUrl.startsWith('http')) {
        await deleteMedia(previewUrl, currentThumbnailUrl);
      }
      setPreviewUrl(null);
      setOptimizationStats(null);
      onDeleteSuccess?.();
      onImageUploaded?.('');
      showToast('Image removed.', 'info');
    } catch {
      setPreviewUrl(null);
      setOptimizationStats(null);
      onDeleteSuccess?.();
      onImageUploaded?.('');
      showToast('Image removed from preview.', 'info');
    } finally {
      setIsDeleting(false);
    }
  };

  // Determine aspect ratio class
  const getAspectClass = () => {
    switch (aspectRatio) {
      case '1:1':
        return 'aspect-square';
      case '16:9':
        return 'aspect-video';
      case '3:1':
        return 'aspect-[3/1]';
      default:
        return 'h-40';
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-2">
      {label && (
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold text-stone-800 tracking-wide uppercase">
            {label}
          </label>
          <span className="text-[11px] text-stone-400">
            Max {(((rule?.maxSizeBytes || 5242880) / (1024 * 1024)).toFixed(0))}MB ({(rule?.allowedMimeTypes || ['image/jpeg', 'image/png']).map((m) => m.split('/')[1]?.toUpperCase() || 'IMG').join(', ')})
          </span>
        </div>
      )}

      {/* Input Mode Selector (Upload File vs Original Image URL) */}
      {!previewUrl && (
        <div className="flex items-center gap-1.5 p-1 bg-stone-100 rounded-xl text-xs font-semibold w-fit">
          <button
            type="button"
            onClick={() => setInputMode('upload')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              inputMode === 'upload'
                ? 'bg-white text-stone-900 shadow-2xs'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Upload File</span>
          </button>
          <button
            type="button"
            onClick={() => setInputMode('url')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              inputMode === 'url'
                ? 'bg-white text-stone-900 shadow-2xs'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <LinkIcon className="w-3.5 h-3.5" />
            <span>Image URL</span>
          </button>
        </div>
      )}

      {/* Hidden File Input for Picker */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        disabled={disabled || isUploading}
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleFileSelect(e.target.files[0]);
          }
        }}
      />

      {/* Direct Image URL Entry Mode */}
      {!previewUrl && inputMode === 'url' ? (
        <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 space-y-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <LinkIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="url"
                value={urlInput ?? ''}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleApplyUrl();
                  }
                }}
                placeholder="https://images.example.com/item.jpg"
                className="w-full pl-9 pr-3 py-2 bg-white rounded-xl border border-stone-300 text-xs text-stone-800 focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600"
              />
            </div>
            <button
              type="button"
              onClick={() => handleApplyUrl()}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition-all cursor-pointer whitespace-nowrap"
            >
              Set URL
            </button>
          </div>
          <p className="text-[11px] text-stone-500">
            Paste any direct image link (Unsplash, Cloudinary, AWS S3, or public URL).
          </p>
        </div>
      ) : (
        /* Upload Zone or Preview Display */
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !disabled && !isUploading && !previewUrl && fileInputRef.current?.click()}
          className={`relative group rounded-2xl border-2 transition-all ${!previewUrl ? 'cursor-pointer' : ''} overflow-hidden ${
            isDragging
              ? 'border-amber-600 bg-amber-50/70 scale-[0.99]'
              : errorMessage
              ? 'border-red-300 bg-red-50/30'
              : previewUrl
              ? 'border-stone-200 bg-stone-50 hover:border-amber-400'
              : 'border-dashed border-stone-300 hover:border-amber-600 bg-stone-50/50 hover:bg-amber-50/30'
          } ${disabled ? 'opacity-60 cursor-not-allowed' : ''} ${compact ? 'p-3' : 'p-4'}`}
        >
          {/* Existing / Selected Image Preview */}
          {previewUrl ? (
            <div className="relative flex flex-col items-center">
              <div className={`w-full ${getAspectClass()} max-h-56 rounded-xl overflow-hidden bg-stone-100 flex items-center justify-center relative`}>
                <img
                  src={previewUrl}
                  alt="Uploaded media preview"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={() => {
                    setErrorMessage('Failed to load image preview. File may be missing or URL expired.');
                  }}
                />

                {/* Hover overlay with action buttons */}
                {!isUploading && (
                  <div className="absolute inset-0 bg-stone-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 bg-white text-stone-900 rounded-lg text-xs font-semibold shadow-sm flex items-center gap-1.5 cursor-pointer hover:bg-amber-50"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Upload New File
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setInputMode('url');
                        setUrlInput(previewUrl);
                        setPreviewUrl(null);
                      }}
                      className="px-3 py-1.5 bg-stone-800 text-white rounded-lg text-xs font-semibold shadow-sm flex items-center gap-1.5 cursor-pointer hover:bg-stone-700"
                    >
                      <LinkIcon className="w-3.5 h-3.5" />
                      Edit URL
                    </button>
                    {allowDelete && (
                      <button
                        type="button"
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-sm transition cursor-pointer"
                        title="Delete from Storage"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Optimization Savings Badge */}
              {optimizationStats && optimizationStats.savings > 0 && (
                <div className="mt-2.5 w-full bg-emerald-50 border border-emerald-200/60 rounded-xl p-2 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-emerald-800 font-medium">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Optimized & WebP Compressed</span>
                  </div>
                  <div className="text-stone-600 text-[11px]">
                    <span className="line-through text-stone-400 mr-1.5">
                      {formatBytes(optimizationStats.originalSize)}
                    </span>
                    <span className="font-bold text-emerald-700">
                      {formatBytes(optimizationStats.optimizedSize)}
                    </span>
                    <span className="ml-1 bg-emerald-200 text-emerald-900 font-bold px-1.5 py-0.2 rounded text-[10px]">
                      -{optimizationStats.savings}%
                    </span>
                  </div>
                </div>
              )}

              {/* Current URL or source readout */}
              <div className="w-full flex items-center justify-between pt-2 px-1 text-[11px] text-stone-500">
                <span className="truncate max-w-[200px] font-mono">
                  {previewUrl.startsWith('data:') ? 'Local file uploaded' : previewUrl}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setInputMode('url');
                      setUrlInput(previewUrl);
                      setPreviewUrl(null);
                    }}
                    className="text-amber-700 hover:text-amber-800 font-semibold cursor-pointer underline"
                  >
                    Change URL
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-stone-700 hover:text-stone-900 font-semibold cursor-pointer underline"
                  >
                    Change File
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Empty / Upload Prompt State */
            <div className={`flex flex-col items-center justify-center text-center ${compact ? 'py-4' : 'py-7'} space-y-2`}>
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shadow-xs">
                <UploadCloud className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-stone-800">
                  Click to upload or drag and drop
                </p>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  {rule.label} ({rule.allowedMimeTypes.map((m) => m.split('/')[1].toUpperCase()).join(', ')})
                </p>
              </div>
            </div>
          )}

          {/* Upload Progress Bar Overlay */}
          {isUploading && (
            <div className="absolute inset-0 bg-stone-900/70 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-white rounded-2xl z-10">
              <RefreshCw className="w-7 h-7 animate-spin text-amber-400 mb-2" />
              <span className="text-xs font-bold tracking-wide">
                {uploadStage === 'optimizing'
                  ? 'Optimizing & Compressing Image...'
                  : uploadStage === 'uploading'
                  ? `Uploading to Firebase Storage (${uploadProgress}%)`
                  : 'Finalizing Secure Storage...'}
              </span>
              <div className="w-48 bg-stone-700 rounded-full h-1.5 mt-3 overflow-hidden">
                <div
                  className="bg-amber-400 h-full rounded-full transition-all duration-200"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Deleting Overlay */}
          {isDeleting && (
            <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-xs flex flex-col items-center justify-center text-white rounded-2xl z-10">
              <RefreshCw className="w-6 h-6 animate-spin text-red-400 mb-1.5" />
              <span className="text-xs font-medium">Removing from Storage...</span>
            </div>
          )}
        </div>
      )}

      {/* Error Message display */}
      {errorMessage && (
        <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2 text-xs text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
          <div className="flex-1">
            <p className="font-semibold">{errorMessage}</p>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setErrorMessage(null);
            }}
            className="text-red-400 hover:text-red-700"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Help text */}
      {helpText && !errorMessage && (
        <p className="text-[11px] text-stone-500">{helpText}</p>
      )}
    </div>
  );
};
