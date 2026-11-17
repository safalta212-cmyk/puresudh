import React, { useState, useEffect } from 'react';
import {
  HardDrive,
  Upload,
  Trash2,
  Copy,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Filter,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  Image as ImageIcon,
  Tag,
  Layers,
  FileText,
  Search,
} from 'lucide-react';
import {
  fetchMediaRegistry,
  deleteMedia,
  MediaRecord,
  MediaPresetType,
  UploadResult,
} from '../../firebase/storageService';
import { MediaUploader } from '../common/MediaUploader';
import { useToast } from '../../context/ToastContext';

export const MediaStorageManager: React.FC = () => {
  const { showToast } = useToast();
  const [mediaList, setMediaList] = useState<MediaRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<MediaPresetType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<MediaRecord | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<MediaRecord | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  // Admin Direct Upload State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadPreset, setUploadPreset] = useState<MediaPresetType>('product');
  const [uploadEntityId, setUploadEntityId] = useState('');

  const loadMedia = async () => {
    setIsLoading(true);
    try {
      const filter = activeFilter === 'all' ? undefined : activeFilter;
      const records = await fetchMediaRegistry(filter);
      setMediaList(records);
    } catch (err) {
      console.error('Failed to load media registry:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMedia();
  }, [activeFilter]);

  const confirmDeleteMedia = async () => {
    if (!recordToDelete) return;
    const target = recordToDelete;
    setRecordToDelete(null);
    setIsDeletingId(target.id);
    try {
      await deleteMedia(target.storagePath, target.thumbnailStoragePath);
      setMediaList((prev) => prev.filter((m) => m.id !== target.id));
      if (selectedRecord?.id === target.id) {
        setSelectedRecord(null);
      }
      showToast('Media deleted successfully from storage.', 'success');
    } catch (err) {
      showToast(`Delete failed: ${err instanceof Error ? err.message : String(err)}`, 'error');
    } finally {
      setIsDeletingId(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast('Direct download URL copied to clipboard!', 'info');
  };

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const filteredMedia = mediaList.filter((m) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      m.fileName.toLowerCase().includes(q) ||
      m.storagePath.toLowerCase().includes(q) ||
      (m.entityId && m.entityId.toLowerCase().includes(q))
    );
  });

  const totalBytes = mediaList.reduce((acc, m) => acc + (m.size || 0), 0);
  const totalOriginalBytes = mediaList.reduce((acc, m) => acc + (m.originalSize || m.size || 0), 0);
  const totalSavedBytes = Math.max(0, totalOriginalBytes - totalBytes);
  const overallSavingsPercent =
    totalOriginalBytes > 0 ? Math.round((totalSavedBytes / totalOriginalBytes) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
            <HardDrive className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Total Managed Media</p>
            <h3 className="text-2xl font-bold text-stone-900">{mediaList.length} Files</h3>
            <p className="text-[11px] text-stone-400 mt-0.5">{formatBytes(totalBytes)} storage consumed</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">WebP & Downscale Savings</p>
            <h3 className="text-2xl font-bold text-emerald-700">-{overallSavingsPercent}% Bandwidth</h3>
            <p className="text-[11px] text-emerald-600 mt-0.5">{formatBytes(totalSavedBytes)} bandwidth preserved</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-stone-900 text-amber-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Storage Security Rules</p>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-sm font-bold text-stone-900">Enforced & Active</span>
            </div>
            <p className="text-[11px] text-stone-400 mt-0.5">Role & Ownership Restricted</p>
          </div>
        </div>
      </div>

      {/* Main Control Panel */}
      <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-stone-900">Firebase Storage Media Library</h3>
            <p className="text-xs text-stone-500">
              Manage product images, category icons, marketing banners, and user uploads with strict validation
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadMedia}
              className="p-2 rounded-xl border border-stone-300 hover:bg-stone-50 text-stone-600 transition text-xs flex items-center gap-1.5"
              title="Refresh Media"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={() => setShowUploadModal(true)}
              className="bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition flex items-center gap-2 shadow-xs cursor-pointer active:scale-[0.98]"
            >
              <Upload className="w-4 h-4" />
              <span>Upload New Media</span>
            </button>
          </div>
        </div>

        {/* Filter Pills & Search */}
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between pt-2 border-t border-stone-100">
          <div className="flex items-center gap-1.5 flex-wrap w-full md:w-auto">
            {(
              [
                { key: 'all', label: 'All Media' },
                { key: 'product', label: 'Products' },
                { key: 'category', label: 'Categories' },
                { key: 'banner', label: 'Banners' },
                { key: 'vendorLogo', label: 'Vendor Logos' },
                { key: 'vendorCover', label: 'Vendor Covers' },
                { key: 'profile', label: 'Profiles' },
                { key: 'review', label: 'Reviews' },
              ] as const
            ).map((filter) => (
              <button
                key={filter.key}
                onClick={() => setActiveFilter(filter.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  activeFilter === filter.key
                    ? 'bg-amber-700 text-white shadow-xs'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search filename or ID..."
              value={searchQuery ?? ''}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-stone-300 text-xs focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        {/* Media Grid */}
        {isLoading ? (
          <div className="py-16 text-center text-stone-400 flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-8 h-8 animate-spin text-amber-600" />
            <span className="text-xs">Connecting to Firebase Storage...</span>
          </div>
        ) : filteredMedia.length === 0 ? (
          <div className="py-16 text-center border-2 border-dashed border-stone-200 rounded-2xl space-y-3">
            <ImageIcon className="w-12 h-12 text-stone-300 mx-auto" />
            <p className="text-sm font-semibold text-stone-700">No media uploaded yet for this filter</p>
            <p className="text-xs text-stone-400 max-w-sm mx-auto">
              Files uploaded in the product modal, category form, banner settings, vendor portal, or customer reviews will appear here.
            </p>
            <button
              onClick={() => setShowUploadModal(true)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 hover:text-amber-800 bg-amber-50 px-4 py-2 rounded-xl transition"
            >
              <Upload className="w-4 h-4" />
              Upload First Media File
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {filteredMedia.map((record) => (
              <div
                key={record.id}
                onClick={() => setSelectedRecord(record)}
                className={`group relative bg-stone-50 rounded-2xl border transition-all cursor-pointer overflow-hidden flex flex-col ${
                  selectedRecord?.id === record.id
                    ? 'border-amber-600 ring-2 ring-amber-100 shadow-sm'
                    : 'border-stone-200 hover:border-amber-400'
                }`}
              >
                <div className="aspect-square w-full bg-stone-100 overflow-hidden relative">
                  <img
                    src={record.thumbnailUrl || record.downloadUrl}
                    alt={record.fileName}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-1.5 left-1.5 bg-stone-900/70 text-white font-bold text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider backdrop-blur-xs">
                    {record.preset}
                  </div>
                </div>

                <div className="p-2 text-[11px] flex-1 flex flex-col justify-between">
                  <p className="font-semibold text-stone-800 truncate" title={record.fileName}>
                    {record.fileName}
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-stone-400 mt-1">
                    <span>{formatBytes(record.size)}</span>
                    {record.savingsPercentage > 0 && (
                      <span className="text-emerald-700 font-bold">-{record.savingsPercentage}%</span>
                    )}
                  </div>
                </div>

                {/* Quick actions on hover */}
                <div className="absolute inset-0 bg-stone-900/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      copyToClipboard(record.downloadUrl);
                    }}
                    className="p-1.5 bg-white text-stone-800 rounded-lg hover:bg-stone-100 transition shadow-xs"
                    title="Copy URL"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <a
                    href={record.downloadUrl}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="p-1.5 bg-white text-stone-800 rounded-lg hover:bg-stone-100 transition shadow-xs"
                    title="Open Full File"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setRecordToDelete(record);
                    }}
                    disabled={isDeletingId === record.id}
                    className="p-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition shadow-xs cursor-pointer"
                    title="Delete Media"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Media Detail & Inspection Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-900">
                  {selectedRecord.preset}
                </span>
                <h4 className="font-bold text-stone-900 text-sm truncate max-w-[260px]">
                  {selectedRecord.fileName}
                </h4>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="p-1 text-stone-400 hover:text-stone-700 rounded-full"
              >
                ✕
              </button>
            </div>

            <div className="w-full max-h-60 rounded-2xl overflow-hidden bg-stone-100 flex items-center justify-center border border-stone-200">
              <img
                src={selectedRecord.downloadUrl}
                alt={selectedRecord.fileName}
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>

            <div className="space-y-2 text-xs divide-y divide-stone-100">
              <div className="flex justify-between py-1.5">
                <span className="text-stone-500">Storage Path:</span>
                <span className="font-mono text-stone-800 text-[11px] truncate max-w-[280px]">
                  {selectedRecord.storagePath}
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-stone-500">MIME Content-Type:</span>
                <span className="font-semibold text-stone-800">{selectedRecord.contentType || 'image/webp'}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-stone-500">File Size:</span>
                <span className="font-semibold text-stone-800">
                  {formatBytes(selectedRecord.size)}{' '}
                  {selectedRecord.savingsPercentage > 0 && (
                    <span className="text-emerald-700">(-{selectedRecord.savingsPercentage}% vs {formatBytes(selectedRecord.originalSize)})</span>
                  )}
                </span>
              </div>
              {selectedRecord.width > 0 && (
                <div className="flex justify-between py-1.5">
                  <span className="text-stone-500">Dimensions:</span>
                  <span className="font-semibold text-stone-800">
                    {selectedRecord.width} × {selectedRecord.height} px
                  </span>
                </div>
              )}
              {selectedRecord.entityId && (
                <div className="flex justify-between py-1.5">
                  <span className="text-stone-500">Associated Entity ID:</span>
                  <span className="font-mono text-stone-800">{selectedRecord.entityId}</span>
                </div>
              )}
              <div className="flex justify-between py-1.5">
                <span className="text-stone-500">Uploaded Date:</span>
                <span className="text-stone-700">
                  {new Date(selectedRecord.createdAt).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="pt-3 border-t flex items-center justify-between gap-2">
              <button
                onClick={() => copyToClipboard(selectedRecord.downloadUrl)}
                className="flex-1 bg-stone-100 hover:bg-stone-200 text-stone-800 font-semibold py-2 px-3 rounded-xl text-xs transition flex items-center justify-center gap-1.5"
              >
                <Copy className="w-3.5 h-3.5" />
                Copy URL
              </button>
              <button
                onClick={() => setRecordToDelete(selectedRecord)}
                disabled={isDeletingId === selectedRecord.id}
                className="bg-red-50 hover:bg-red-100 text-red-700 font-semibold py-2 px-4 rounded-xl text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Image
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Direct Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h4 className="font-bold text-stone-900 text-base">Direct Media Upload (Admin)</h4>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-1 text-stone-400 hover:text-stone-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Target Media Category</label>
                <select
                  value={uploadPreset ?? 'product'}
                  onChange={(e) => setUploadPreset(e.target.value as MediaPresetType)}
                  className="w-full p-2.5 rounded-xl border border-stone-300 bg-white"
                >
                  <option value="product">Product Image</option>
                  <option value="category">Category Image / Icon</option>
                  <option value="banner">Homepage / Promotional Banner</option>
                  <option value="vendorLogo">Vendor Logo</option>
                  <option value="vendorCover">Vendor Cover Banner</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Entity Identifier (e.g. prod-123 or promo-winter)</label>
                <input
                  type="text"
                  placeholder="Optional identifier"
                  value={uploadEntityId ?? ''}
                  onChange={(e) => setUploadEntityId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-stone-300"
                />
              </div>

              <div className="pt-2">
                <MediaUploader
                  preset={uploadPreset}
                  pathParams={{
                    productId: uploadPreset === 'product' ? uploadEntityId || 'custom-prod' : undefined,
                    categoryId: uploadPreset === 'category' ? uploadEntityId || 'custom-cat' : undefined,
                    bannerId: uploadPreset === 'banner' ? uploadEntityId || 'custom-banner' : undefined,
                  }}
                  onUploadSuccess={(res: UploadResult) => {
                    loadMedia();
                    setShowUploadModal(false);
                  }}
                  label="Select or Drop File"
                  helpText="Automatic WebP optimization and thumbnail generation applied."
                />
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Delete Media Confirmation Modal */}
      {recordToDelete && (
        <div className="fixed inset-0 z-60 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 border border-stone-200 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-stone-900">Delete Storage Media</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Permanently delete <strong>{recordToDelete.fileName}</strong> from Firebase Storage? Any product or banner referencing this URL will lose its image.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setRecordToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteMedia}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-xs cursor-pointer"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
