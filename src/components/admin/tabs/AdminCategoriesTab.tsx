import React, { useState } from 'react';
import {
  Layers,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Package,
  ArrowUpDown,
  Image as ImageIcon,
} from 'lucide-react';
import { Category, Product } from '../../../types';
import { MediaUploader } from '../../common/MediaUploader';

interface AdminCategoriesTabProps {
  categories: Category[];
  products: Product[];
  onSaveCategory: (category: Category) => Promise<void>;
  onDeleteCategory: (categoryId: string, categoryName: string) => Promise<void>;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const AdminCategoriesTab: React.FC<AdminCategoriesTabProps> = ({
  categories,
  products,
  onSaveCategory,
  onDeleteCategory,
  showToast,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    hindiName: '',
    slug: '',
    description: '',
    imageUrl: '',
    displayOrder: 1,
    active: true,
  });

  const handleOpenAdd = () => {
    setEditingCategory(null);
    setFormData({
      name: '',
      hindiName: '',
      slug: '',
      description: '',
      imageUrl: '',
      displayOrder: categories.length + 1,
      active: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cat: Category) => {
    setEditingCategory(cat);
    setFormData({
      name: cat.name,
      hindiName: cat.hindiName || '',
      slug: cat.slug || '',
      description: cat.description || '',
      imageUrl: cat.image || '',
      displayOrder: cat.displayOrder ?? cat.order ?? 1,
      active: cat.active !== false,
    });
    setIsModalOpen(true);
  };

  const handleNameChange = (val: string) => {
    const slug = val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    setFormData((prev) => ({
      ...prev,
      name: val,
      slug: editingCategory ? prev.slug : slug,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('Category name is required', 'error');
      return;
    }

    const catId = editingCategory?.id || `cat-${formData.slug || Date.now()}`;
    const orderNum = Number(formData.displayOrder) || 1;
    const categoryToSave: Category = {
      id: catId,
      name: formData.name.trim(),
      hindiName: formData.hindiName.trim() || undefined,
      slug: formData.slug.trim() || catId,
      description: formData.description.trim() || undefined,
      image: formData.imageUrl.trim() || undefined,
      displayOrder: orderNum,
      order: orderNum,
      active: formData.active,
      createdAt: editingCategory?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setSubmitting(true);
    try {
      await onSaveCategory(categoryToSave);
      showToast(`Category "${categoryToSave.name}" saved successfully!`, 'success');
      setIsModalOpen(false);
    } catch (err: any) {
      showToast(err?.message || 'Failed to save category', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (cat: Category) => {
    setTogglingId(cat.id);
    try {
      const updated: Category = {
        ...cat,
        active: cat.active === false,
        updatedAt: new Date().toISOString(),
      };
      await onSaveCategory(updated);
      showToast(`Category "${cat.name}" is now ${updated.active ? 'Active' : 'Hidden'}`, 'info');
    } catch (err: any) {
      showToast(err?.message || 'Failed to update category status', 'error');
    } finally {
      setTogglingId(null);
    }
  };

  const sortedCategories = [...categories].sort(
    (a, b) => (a.displayOrder ?? a.order ?? 99) - (b.displayOrder ?? b.order ?? 99)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
            Catalog Categories
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-semibold border border-amber-200">
              {categories.length} categories
            </span>
          </h2>
          <p className="text-sm text-stone-500 mt-0.5">
            Organize taxonomy, slug hierarchy, Hindi subheadings, and homepage navigation order
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 rounded-xl transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" />
          Add Category
        </button>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {sortedCategories.map((cat) => {
          const associatedProducts = products.filter(
            (p) => p.category === cat.slug || p.categoryId === cat.id || p.category === cat.name
          );

          return (
            <div
              key={cat.id}
              className="bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden flex flex-col hover:border-amber-300 transition-colors"
            >
              <div className="relative h-32 bg-stone-100">
                <img
                  src={
                    cat.image ||
                    'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=400&q=80'
                  }
                  alt={cat.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 left-2 bg-stone-900/80 text-white text-[10px] font-bold px-2 py-0.5 rounded-md backdrop-blur-xs">
                  Order #{cat.displayOrder ?? cat.order ?? 1}
                </div>
                <div className="absolute top-2 right-2">
                  <button
                    type="button"
                    disabled={togglingId === cat.id}
                    onClick={() => handleToggleStatus(cat)}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md border shadow-xs transition-colors cursor-pointer disabled:opacity-50 ${
                      cat.active !== false
                        ? 'bg-emerald-500 text-white border-emerald-600'
                        : 'bg-stone-600 text-white border-stone-700'
                    }`}
                  >
                    {togglingId === cat.id ? 'Updating...' : cat.active !== false ? 'Active' : 'Inactive'}
                  </button>
                </div>
              </div>

              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-stone-900 text-base">{cat.name}</h3>
                  {cat.hindiName && (
                    <p className="text-xs font-semibold text-amber-800">{cat.hindiName}</p>
                  )}
                  <p className="text-xs text-stone-500 mt-1 line-clamp-2">
                    {cat.description || 'Pure sudh traditional dairy and sweets collection.'}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
                  <span className="inline-flex items-center gap-1 font-semibold text-stone-600">
                    <Package className="w-3.5 h-3.5 text-amber-700" />
                    {associatedProducts.length} Products
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(cat)}
                      className="p-1.5 rounded-lg text-stone-600 hover:text-amber-800 hover:bg-amber-50 transition-colors"
                      title="Edit Category"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteCategory(cat.id, cat.name)}
                      className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Delete Category"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Category Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 border border-stone-200 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-stone-900">
                {editingCategory ? 'Edit Category' : 'Create New Category'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 text-lg leading-none"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    Category Name (English) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Pure Desi Ghee"
                    value={formData.name ?? ''}
                    onChange={(e) => handleNameChange(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    Hindi Name / Label
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. शुद्ध देशी गाय का घी"
                    value={formData.hindiName ?? ''}
                    onChange={(e) => setFormData({ ...formData, hindiName: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">URL Slug</label>
                  <input
                    type="text"
                    required
                    placeholder="pure-desi-ghee"
                    value={formData.slug ?? ''}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Display Order</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.displayOrder ?? 1}
                    onChange={(e) =>
                      setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 1 })
                    }
                    className="w-full px-3 py-2 bg-stone-50 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Short description for collection cards and SEO..."
                  value={formData.description ?? ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-50 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
                />
              </div>

              <div>
                <MediaUploader
                  preset="category"
                  pathParams={{ categoryId: editingCategory?.id || formData.slug || 'new' }}
                  currentImageUrl={formData.imageUrl}
                  onImageUploaded={(url) => setFormData({ ...formData, imageUrl: url })}
                  label="Upload Category Image"
                  compact
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="cat-active-check"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="rounded text-amber-700 focus:ring-amber-500"
                />
                <label htmlFor="cat-active-check" className="font-semibold text-stone-800">
                  Visible & Active in navigation bar
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 disabled:opacity-50 rounded-lg shadow-xs"
                >
                  {submitting ? 'Saving...' : editingCategory ? 'Update Category' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
