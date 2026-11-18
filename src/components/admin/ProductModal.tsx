import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Image as ImageIcon,
  Sparkles,
  Percent,
  Eye,
} from 'lucide-react';
import { Product, Category } from '../../types';
import { MediaUploader } from '../common/MediaUploader';
import { ProductDescriptionRenderer } from '../common/ProductDescriptionRenderer';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  categories: Category[];
  onSave: (product: Product) => Promise<void>;
  onDelete?: (productId: string, productName: string) => Promise<void>;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const ProductModal: React.FC<ProductModalProps> = ({
  isOpen,
  onClose,
  product,
  categories,
  onSave,
  onDelete,
  showToast,
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const getInitialFormData = () => ({
    name: product?.name || '',
    hindiName: product?.hindiName || '',
    slug: product?.slug || '',
    sku: product?.sku || `PS-${Date.now().toString(36).toUpperCase()}`,
    category: product?.category || categories[0]?.slug || 'ghee',
    price: product?.price ?? 499,
    discountPrice: (product?.discountPrice !== undefined && product?.discountPrice !== null) ? product.discountPrice : '',
    stockQuantity: product?.stockQuantity ?? 25,
    weight: product?.weight || '500g',
    unit: product?.unit || 'g',
    shortDescription: product?.shortDescription || '',
    description: product?.description || '',
    ingredients: product?.ingredients || '',
    packagingInformation: product?.packagingInformation || '',
    images: product?.images && product.images.length > 0 ? product.images : [],
    status: (product?.status || 'active') as 'active' | 'draft' | 'archived',
    isAvailable: product?.isAvailable !== false,
    isFeatured: Boolean(product?.isFeatured),
    isBestseller: Boolean(product?.isBestseller),
  });

  const [formData, setFormData] = useState(getInitialFormData);
  const [submitting, setSubmitting] = useState(false);
  const [uploaderKey, setUploaderKey] = useState(0);
  const [showDescPreview, setShowDescPreview] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData(getInitialFormData());
      setSubmitting(false);
      setUploaderKey((k) => k + 1);
    }
  }, [product, isOpen, categories]);

  if (!isOpen) return null;

  const handleNameChange = (val: string) => {
    const slug = val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    setFormData((prev) => ({
      ...prev,
      name: val,
      slug: product ? prev.slug : slug,
    }));
  };

  const handleRemoveImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('Product name is required', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const prodId = product?.id || `prod-${formData.slug || Date.now()}`;
      const qty = Number(formData.stockQuantity);
      const disc = formData.discountPrice !== '' ? Number(formData.discountPrice) : undefined;
      const imgs =
        formData.images.length > 0
          ? formData.images
          : [
              'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=600&q=80',
            ];
      const avail = Boolean(formData.isAvailable) && qty > 0 && formData.status === 'active';
      const productToSave: Product = {
        ...product,
        id: prodId,
        name: formData.name.trim(),
        hindiName: formData.hindiName.trim() || undefined,
        slug: formData.slug.trim() || prodId,
        sku: formData.sku.trim(),
        category: formData.category,
        categorySlug: formData.category,
        categoryId: categories.find((c) => c.slug === formData.category || c.id === formData.category)?.id,
        price: Number(formData.price),
        discountPrice: disc,
        salePrice: disc,
        stockQuantity: qty,
        stock: qty,
        weight: formData.weight.trim(),
        unit: formData.unit.trim(),
        shortDescription: formData.shortDescription.trim() || undefined,
        description: formData.description.trim(),
        ingredients: formData.ingredients?.trim() || undefined,
        packagingInformation: formData.packagingInformation?.trim() || undefined,
        images: imgs,
        imageUrls: imgs,
        status: formData.status,
        active: formData.status === 'active',
        isAvailable: avail,
        availability: avail,
        inStock: avail,
        isFeatured: formData.isFeatured,
        featured: formData.isFeatured,
        isBestseller: formData.isBestseller,
        bestseller: formData.isBestseller,
        rating: product?.rating ?? 0,
        reviewsCount: product?.reviewsCount ?? product?.reviewCount ?? 0,
        reviewCount: product?.reviewCount ?? product?.reviewsCount ?? 0,
        createdAt: product?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await onSave(productToSave);
      showToast(`Product "${productToSave.name}" saved!`, 'success');
      onClose();
    } catch (err) {
      showToast('Failed to save product', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-4 sm:p-6 border border-stone-200 shadow-2xl space-y-4 my-auto max-h-[92vh] overflow-y-auto text-xs">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <h3 className="text-sm sm:text-base font-bold text-stone-900 line-clamp-1 pr-2">
            {product ? `Edit Product: ${product.name}` : 'Add New Product to Catalog'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition min-w-[36px] min-h-[36px] flex items-center justify-center shrink-0 cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Row 1: Name & Hindi Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-stone-700 mb-1">Product Name (English) *</label>
              <input
                type="text"
                required
                placeholder="e.g. A2 Desi Cow Bilona Ghee"
                value={formData.name ?? ''}
                onChange={(e) => handleNameChange(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 rounded-lg border border-stone-300 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">Hindi Name / Label</label>
              <input
                type="text"
                placeholder="e.g. A2 देशी गाय का बिलोना घी"
                value={formData.hindiName ?? ''}
                onChange={(e) => setFormData({ ...formData, hindiName: e.target.value })}
                className="w-full px-3 py-2 bg-stone-50 rounded-lg border border-stone-300 focus:outline-none"
              />
            </div>
          </div>

          {/* Row 2: Slug, SKU & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-stone-700 mb-1">URL Slug</label>
              <input
                type="text"
                required
                value={formData.slug ?? ''}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                className="w-full px-3 py-2 bg-stone-50 rounded-lg border border-stone-300 font-mono text-[11px] focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">SKU Code</label>
              <input
                type="text"
                value={formData.sku ?? ''}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                className="w-full px-3 py-2 bg-stone-50 rounded-lg border border-stone-300 font-mono text-[11px] focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">Category *</label>
              <select
                value={formData.category ?? ''}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 bg-stone-50 rounded-lg border border-stone-300 focus:outline-none"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.slug || c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 3: Price, Discount Price, Stock & Weight */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block font-semibold text-stone-700 mb-1">Regular Price (₹) *</label>
              <input
                type="number"
                min="1"
                required
                value={formData.price ?? 0}
                onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-stone-50 rounded-lg border border-stone-300 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">Discount Price (₹)</label>
              <input
                type="number"
                min="0"
                placeholder="Optional sale price"
                value={formData.discountPrice ?? ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    discountPrice: e.target.value === '' ? '' : parseInt(e.target.value) || 0,
                  })
                }
                className="w-full px-3 py-2 bg-stone-50 rounded-lg border border-stone-300 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">Stock Units *</label>
              <input
                type="number"
                min="0"
                required
                value={formData.stockQuantity ?? 0}
                onChange={(e) =>
                  setFormData({ ...formData, stockQuantity: parseInt(e.target.value) || 0 })
                }
                className="w-full px-3 py-2 bg-stone-50 rounded-lg border border-stone-300 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">Weight / Volume</label>
              <input
                type="text"
                placeholder="500ml / 1kg"
                value={formData.weight ?? ''}
                onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                className="w-full px-3 py-2 bg-stone-50 rounded-lg border border-stone-300 focus:outline-none"
              />
            </div>
          </div>

          {/* Short Description & Description */}
          <div>
            <label className="block font-semibold text-stone-700 mb-1">Short Punchline / Tagline</label>
            <input
              type="text"
              placeholder="e.g. Traditional hand-churned in earthen pots, rich golden grains"
              value={formData.shortDescription ?? ''}
              onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
              className="w-full px-3 py-2 bg-stone-50 rounded-lg border border-stone-300 focus:outline-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block font-semibold text-stone-700">Full Description</label>
              {formData.description && (
                <button
                  type="button"
                  onClick={() => setShowDescPreview(!showDescPreview)}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100/80 px-2 py-0.5 rounded-md transition"
                >
                  <Eye className="w-3 h-3" />
                  <span>{showDescPreview ? 'Edit Text' : 'Live Preview'}</span>
                </button>
              )}
            </div>

            {showDescPreview ? (
              <div className="p-3 bg-stone-50 rounded-lg border border-amber-200 min-h-[120px] max-h-64 overflow-y-auto">
                <ProductDescriptionRenderer content={formData.description} />
              </div>
            ) : (
              <textarea
                rows={5}
                placeholder="Paste Hindi product description with headings, bold text, paragraphs, and bullet points..."
                value={formData.description ?? ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 bg-stone-50 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 font-sans text-xs sm:text-sm leading-relaxed"
              />
            )}
            <p className="text-[11px] text-stone-400 mt-1">
              Supports Hindi headings, paragraphs, bullet lists (•, -, 1.), and bold highlights (**शब्द** or शीर्षक:).
            </p>
          </div>

          {/* Ingredients & Packaging Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-stone-700 mb-1">सामग्री / Ingredients</label>
              <textarea
                rows={2}
                placeholder="e.g. Whole Wheat Flour, Pure Cow Desi Ghee, Organic Gur (Jaggery)..."
                value={formData.ingredients ?? ''}
                onChange={(e) => setFormData({ ...formData, ingredients: e.target.value })}
                className="w-full px-3 py-2 bg-stone-50 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 font-sans text-xs sm:text-sm"
              />
            </div>
            <div>
              <label className="block font-semibold text-stone-700 mb-1">पैकेजिंग जानकारी / Packaging Info</label>
              <textarea
                rows={2}
                placeholder="e.g. Food-grade airtight moisture-lock sealed box with tamper-evident seal..."
                value={formData.packagingInformation ?? ''}
                onChange={(e) => setFormData({ ...formData, packagingInformation: e.target.value })}
                className="w-full px-3 py-2 bg-stone-50 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 font-sans text-xs sm:text-sm"
              />
            </div>
          </div>

          {/* Image Upload & Gallery */}
          <div>
            <label className="block font-semibold text-stone-700 mb-1.5">Product Images</label>
            <div className="mb-3">
              <MediaUploader
                key={uploaderKey}
                preset="product"
                pathParams={{ productId: product?.id || formData.slug || 'new' }}
                onImageUploaded={(url) => {
                  if (url) {
                    setFormData((prev) => ({
                      ...prev,
                      images: [...(prev.images || []), url],
                    }));
                    setUploaderKey((k) => k + 1);
                  }
                }}
                label="Add Product Image (File or URL)"
                compact
              />
            </div>

            {formData.images.length > 0 && (
              <div>
                <p className="text-xs text-stone-500 font-medium mb-1.5">
                  Uploaded Gallery Images ({formData.images.length}):
                </p>
                <div className="flex flex-wrap gap-2">
                  {formData.images.map((img, idx) => (
                    <div key={idx} className="relative w-16 h-16 rounded-xl overflow-hidden border border-stone-200 shadow-2xs group">
                      <img src={img} alt={`Product preview ${idx + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
                        className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        title="Remove Image"
                      >
                        <Trash2 className="w-4 h-4 text-rose-300" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Flags, Status & Badges */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-stone-100">
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(formData.isAvailable)}
                  onChange={(e) => setFormData({ ...formData, isAvailable: e.target.checked })}
                  className="rounded text-amber-700 focus:ring-amber-500"
                />
                <span className="font-semibold text-stone-800">Available to Buy</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(formData.isFeatured)}
                  onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                  className="rounded text-amber-700 focus:ring-amber-500"
                />
                <span className="font-semibold text-stone-800">Featured Spotlight</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(formData.isBestseller)}
                  onChange={(e) => setFormData({ ...formData, isBestseller: e.target.checked })}
                  className="rounded text-amber-700 focus:ring-amber-500"
                />
                <span className="font-semibold text-stone-800">Best Seller Tag</span>
              </label>
            </div>

            <div className="flex items-center gap-2">
              <label className="font-semibold text-stone-700">Visibility:</label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    status: e.target.value as 'active' | 'draft' | 'archived',
                  })
                }
                className="px-2.5 py-1.5 bg-stone-50 rounded-lg border border-stone-300 font-semibold text-stone-800 focus:outline-none"
              >
                <option value="active">Active (Live on Store)</option>
                <option value="draft">Draft (Hidden)</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-stone-100">
            <div>
              {product && onDelete && !showDeleteConfirm && (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full sm:w-auto px-3 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer touch-manipulation min-h-[38px]"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete Product
                </button>
              )}

              {product && onDelete && showDeleteConfirm && (
                <div className="flex flex-wrap items-center gap-2 bg-rose-50 p-2 sm:px-3 sm:py-1.5 rounded-lg border border-rose-200">
                  <span className="text-xs font-semibold text-rose-800 w-full sm:w-auto">Permanently delete?</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={deleting}
                      onClick={async () => {
                        setDeleting(true);
                        try {
                          await onDelete(product.id, product.name);
                          onClose();
                        } catch (e) {
                          console.error('Delete error in modal:', e);
                          showToast('Failed to delete product', 'error');
                        } finally {
                          setDeleting(false);
                        }
                      }}
                      className="px-2.5 py-1 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-md transition-colors disabled:opacity-50 touch-manipulation min-h-[32px]"
                    >
                      {deleting ? 'Deleting...' : 'Yes, Delete'}
                    </button>
                    <button
                      type="button"
                      disabled={deleting}
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-2 py-1 text-xs font-medium text-stone-600 hover:text-stone-900 touch-manipulation min-h-[32px]"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 justify-end">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-none px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer touch-manipulation min-h-[38px]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 sm:flex-none px-5 py-2 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 disabled:opacity-50 rounded-lg shadow-xs transition-colors cursor-pointer touch-manipulation min-h-[38px]"
              >
                {product ? 'Update Product' : 'Create Product'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
