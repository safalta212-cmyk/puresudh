import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Filter,
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Package,
  Layers,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Percent,
} from 'lucide-react';
import { Product, Category } from '../../../types';
import { formatFirestorePermissionMessage } from '../../../firebase/config';

interface AdminProductsTabProps {
  products: Product[];
  categories: Category[];
  onSaveProduct?: (product: Product) => Promise<void>;
  onDeleteProduct: (productId: string, productName: string) => Promise<void>;
  onOpenProductModal?: (product?: Product) => void;
  onOpenAddProduct?: () => void;
  onOpenEditProduct?: (product: Product) => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const AdminProductsTab: React.FC<AdminProductsTabProps> = ({
  products,
  categories,
  onSaveProduct,
  onDeleteProduct,
  onOpenProductModal,
  onOpenAddProduct,
  onOpenEditProduct,
  showToast,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'draft' | 'archived'>('all');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Inline stock edit modal / popup
  const [quickStockProduct, setQuickStockProduct] = useState<Product | null>(null);
  const [quickStockValue, setQuickStockValue] = useState<number>(0);
  const [savingStock, setSavingStock] = useState(false);

  // In-app Delete Confirmation Modal state (prevents iframe sandbox window.confirm failure)
  const [productToDelete, setProductToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirmDelete = async () => {
    if (!productToDelete) return;
    setIsDeleting(true);
    try {
      if (typeof onDeleteProduct === 'function') {
        await onDeleteProduct(productToDelete.id, productToDelete.name);
      }
      setProductToDelete(null);
    } catch (err) {
      console.error('Delete error:', err);
      showToast(formatFirestorePermissionMessage(err, 'Failed to delete product'), 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenModal = (product?: Product) => {
    if (typeof onOpenProductModal === 'function') {
      onOpenProductModal(product);
    } else if (product && typeof onOpenEditProduct === 'function') {
      onOpenEditProduct(product);
    } else if (!product && typeof onOpenAddProduct === 'function') {
      onOpenAddProduct();
    }
  };

  const handleSave = async (product: Product) => {
    if (typeof onSaveProduct === 'function') {
      await onSaveProduct(product);
    }
  };

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Search
      const matchesSearch =
        !searchQuery ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.hindiName && p.hindiName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()));

      // Category
      const matchesCategory =
        selectedCategory === 'all' ||
        p.category === selectedCategory ||
        p.categoryId === selectedCategory;

      // Stock
      let matchesStock = true;
      const stock = p.stockQuantity ?? 10;
      if (stockFilter === 'out_of_stock') {
        matchesStock = stock === 0;
      } else if (stockFilter === 'low_stock') {
        matchesStock = stock > 0 && stock <= 10;
      } else if (stockFilter === 'in_stock') {
        matchesStock = stock > 10;
      }

      // Status
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && p.status === 'active') ||
        (statusFilter === 'draft' && p.status === 'draft') ||
        (statusFilter === 'archived' && p.status === 'archived');

      return matchesSearch && matchesCategory && matchesStock && matchesStatus;
    });
  }, [products, searchQuery, selectedCategory, stockFilter, statusFilter]);

  // Pagination slice
  const totalPages = Math.ceil(filteredProducts.length / pageSize) || 1;
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, currentPage]);

  const handleToggleActive = async (product: Product) => {
    const isCurrentlyActive = product.status === 'active' || (product.status === undefined && product.active !== false);
    const newStatus = isCurrentlyActive ? 'draft' : 'active';
    const isNowActive = newStatus === 'active';
    const updated: Product = {
      ...product,
      status: newStatus,
      active: isNowActive,
      isAvailable: isNowActive && (product.stockQuantity ?? product.stock ?? 0) > 0,
      availability: isNowActive && (product.stockQuantity ?? product.stock ?? 0) > 0,
      updatedAt: new Date().toISOString(),
    };
    try {
      await handleSave(updated);
      showToast(`Product "${product.name}" is now ${newStatus}`, 'info');
    } catch (err: any) {
      showToast(formatFirestorePermissionMessage(err, 'Failed to update product status'), 'error');
    }
  };

  const handleSaveQuickStock = async () => {
    if (!quickStockProduct) return;
    setSavingStock(true);
    try {
      const qty = Number(quickStockValue);
      const updated: Product = {
        ...quickStockProduct,
        stockQuantity: qty,
        stock: qty,
        isAvailable: qty > 0,
        availability: qty > 0,
        inStock: qty > 0,
        updatedAt: new Date().toISOString(),
      };
      await handleSave(updated);
      showToast(`Stock updated to ${quickStockValue} for "${quickStockProduct.name}"`, 'success');
      setQuickStockProduct(null);
    } catch (err: any) {
      showToast(formatFirestorePermissionMessage(err, 'Failed to update product stock'), 'error');
    } finally {
      setSavingStock(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
            Products Catalog
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-semibold border border-amber-200">
              {filteredProducts.length} items
            </span>
          </h2>
          <p className="text-sm text-stone-500 mt-0.5">
            Manage sweets, dairy, khasta bakery, pricing, images, and live inventory
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 rounded-xl transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" />
          Add New Product
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-stone-200/80 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-stone-400" />
            <input
              type="text"
              placeholder="Search by name, SKU..."
              value={searchQuery ?? ''}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 text-xs bg-stone-50 rounded-lg border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
            />
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={selectedCategory ?? 'all'}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs bg-stone-50 rounded-lg border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 text-stone-700"
            >
              <option value="all">All Categories ({categories.length})</option>
              {categories.map((c) => (
                <option key={c.id} value={c.slug || c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Stock Filter */}
          <div>
            <select
              value={stockFilter ?? 'all'}
              onChange={(e) => {
                setStockFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs bg-stone-50 rounded-lg border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 text-stone-700"
            >
              <option value="all">All Stock Levels</option>
              <option value="in_stock">In Stock (&gt;10 units)</option>
              <option value="low_stock">Low Stock (≤ 10 units)</option>
              <option value="out_of_stock">Out of Stock (0 units)</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter ?? 'all'}
              onChange={(e) => {
                setStatusFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs bg-stone-50 rounded-lg border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 text-stone-700"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active (Visible on Store)</option>
              <option value="draft">Draft (Hidden)</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>
      </div>

      {/* Products Table & Mobile Cards */}
      <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden">
        {/* Mobile View: Product Cards (< md) */}
        <div className="block md:hidden divide-y divide-stone-100">
          {paginatedProducts.length === 0 ? (
            <div className="py-12 text-center text-stone-400 p-4">
              <Package className="w-8 h-8 mx-auto mb-2 opacity-40 text-stone-400" />
              No products matched your search or filter.
            </div>
          ) : (
            paginatedProducts.map((product) => {
              const regularPrice = product.price;
              const discountPrice = product.discountPrice;
              const hasDiscount = discountPrice && discountPrice < regularPrice;
              const stock = product.stockQuantity ?? 10;
              const isOutOfStock = stock === 0;
              const isLowStock = stock > 0 && stock <= 10;

              return (
                <div key={product.id} className="p-3.5 space-y-3">
                  <div className="flex items-start gap-3">
                    <img
                      src={
                        product.images?.[0] ||
                        'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=120&q=80'
                      }
                      alt={product.name}
                      className="w-14 h-14 rounded-xl object-cover border border-stone-200 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-stone-900 text-sm truncate">{product.name}</div>
                      {product.hindiName && (
                        <div className="text-[11px] text-amber-800 font-medium truncate">{product.hindiName}</div>
                      )}
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-xs font-bold text-stone-900">
                          ₹{hasDiscount ? discountPrice : regularPrice}
                        </span>
                        {hasDiscount && (
                          <span className="text-[11px] text-stone-400 line-through">₹{regularPrice}</span>
                        )}
                        <span className="text-[10px] text-stone-400">• {product.weight || '500g'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 text-xs pt-2 border-t border-stone-100">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-stone-100 text-stone-700 border border-stone-200">
                        {product.category || 'General'}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setQuickStockProduct(product);
                          setQuickStockValue(stock);
                        }}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border cursor-pointer touch-manipulation ${
                          isOutOfStock
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : isLowStock
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        }`}
                        title="Tap to edit stock"
                      >
                        {isOutOfStock ? '0 stock (edit)' : `${stock} in stock`}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleActive(product)}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border cursor-pointer touch-manipulation ${
                          product.status === 'active' || (product.status === undefined && product.active !== false)
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-stone-100 text-stone-600 border-stone-200'
                        }`}
                      >
                        {product.status === 'active' || (product.status === undefined && product.active !== false)
                          ? 'Active'
                          : 'Draft'}
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenModal(product)}
                        className="p-1.5 text-stone-600 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition-colors border border-stone-200 touch-manipulation min-h-[34px] min-w-[34px] flex items-center justify-center cursor-pointer"
                        title="Edit product"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setProductToDelete({ id: product.id, name: product.name })}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-rose-200 touch-manipulation min-h-[34px] min-w-[34px] flex items-center justify-center cursor-pointer"
                        title="Delete product"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop View: Table (>= md) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider bg-stone-50/80 border-b border-stone-200">
              <tr>
                <th className="py-3 px-4">Product</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Price & Discount</th>
                <th className="py-3 px-3">Stock Units</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {paginatedProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-stone-400">
                    <Package className="w-8 h-8 mx-auto mb-2 opacity-40 text-stone-400" />
                    No products matched your search or filter.
                  </td>
                </tr>
              ) : (
                paginatedProducts.map((product) => {
                  const regularPrice = product.price;
                  const discountPrice = product.discountPrice;
                  const hasDiscount = discountPrice && discountPrice < regularPrice;
                  const discountPct = hasDiscount
                    ? Math.round(((regularPrice - discountPrice) / regularPrice) * 100)
                    : 0;

                  const stock = product.stockQuantity ?? 10;
                  const isOutOfStock = stock === 0;
                  const isLowStock = stock > 0 && stock <= 10;

                  return (
                    <tr key={product.id} className="hover:bg-amber-50/20 transition-colors">
                      {/* Product Thumbnail & Names */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={
                              product.images?.[0] ||
                              'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=120&q=80'
                            }
                            alt={product.name}
                            className="w-12 h-12 rounded-lg object-cover border border-stone-200 shrink-0"
                          />
                          <div>
                            <div className="font-bold text-stone-900 line-clamp-1">{product.name}</div>
                            {product.hindiName && (
                              <div className="text-[11px] text-amber-800 font-medium">{product.hindiName}</div>
                            )}
                            <div className="text-[10px] text-stone-400">
                              SKU: {product.sku || 'PS-PROD'} • {product.weight || '500g'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-3">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-stone-100 text-stone-700 border border-stone-200">
                          {product.category || 'General'}
                        </span>
                      </td>

                      {/* Price & Discount */}
                      <td className="py-3 px-3">
                        <div className="flex items-baseline gap-1.5">
                          <span className="font-bold text-stone-900 text-sm">
                            ₹{hasDiscount ? discountPrice : regularPrice}
                          </span>
                          {hasDiscount && (
                            <span className="text-[11px] line-through text-stone-400">₹{regularPrice}</span>
                          )}
                        </div>
                        {hasDiscount && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                            <Percent className="w-2.5 h-2.5" />
                            {discountPct}% OFF
                          </span>
                        )}
                      </td>

                      {/* Stock Level */}
                      <td className="py-3 px-3">
                        <button
                          onClick={() => {
                            setQuickStockProduct(product);
                            setQuickStockValue(stock);
                          }}
                          className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-stone-200 hover:border-amber-400 bg-stone-50 hover:bg-white transition-colors"
                          title="Click to quickly update stock"
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isOutOfStock
                                ? 'bg-rose-500'
                                : isLowStock
                                ? 'bg-amber-500 animate-pulse'
                                : 'bg-emerald-500'
                            }`}
                          />
                          <span className="font-bold text-stone-900">{stock}</span>
                          <span className="text-[10px] text-stone-400 group-hover:text-amber-700">edit</span>
                        </button>
                      </td>

                      {/* Status / Visibility */}
                      <td className="py-3 px-3">
                        <button
                          onClick={() => handleToggleActive(product)}
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border transition-colors ${
                            product.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-stone-100 text-stone-600 border-stone-200 hover:bg-stone-200'
                          }`}
                        >
                          {product.status === 'active' ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Active
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3 text-stone-400" />
                              Draft
                            </>
                          )}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenModal(product)}
                            className="p-1.5 rounded-lg text-stone-600 hover:text-amber-800 hover:bg-amber-50 transition-colors"
                            title="Edit full product details"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setProductToDelete({ id: product.id, name: product.name })}
                            className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Delete product"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-stone-50/80 border-t border-stone-200 text-xs text-stone-500">
          <div>
            Showing{' '}
            <span className="font-semibold text-stone-800">
              {filteredProducts.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
            </span>{' '}
            to{' '}
            <span className="font-semibold text-stone-800">
              {Math.min(currentPage * pageSize, filteredProducts.length)}
            </span>{' '}
            of <span className="font-semibold text-stone-800">{filteredProducts.length}</span> products
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="p-1.5 rounded-lg border border-stone-200 bg-white text-stone-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-stone-100"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2.5 py-1 text-xs font-semibold text-stone-800">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="p-1.5 rounded-lg border border-stone-200 bg-white text-stone-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-stone-100"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Quick Stock Updater Modal */}
      {quickStockProduct && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 border border-stone-200 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-stone-900">Update Stock Quantity</h3>
              <button
                onClick={() => setQuickStockProduct(null)}
                className="text-stone-400 hover:text-stone-700 text-lg leading-none"
              >
                ×
              </button>
            </div>
            <p className="text-xs text-stone-600 font-medium">
              Adjust current available warehouse units for{' '}
              <span className="font-bold text-amber-900">{quickStockProduct.name}</span>.
            </p>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Stock Units</label>
              <input
                type="number"
                min="0"
                value={quickStockValue ?? 0}
                onChange={(e) => setQuickStockValue(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setQuickStockProduct(null)}
                disabled={savingStock}
                className="px-3.5 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-lg disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveQuickStock}
                disabled={savingStock}
                className="px-4 py-2 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 disabled:opacity-50 rounded-lg shadow-xs"
              >
                {savingStock ? 'Saving...' : 'Save Stock'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-App Delete Confirmation Modal */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 border border-stone-200 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-rose-100 text-rose-700 rounded-xl shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-stone-900">Delete Product?</h3>
                <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                  Are you sure you want to permanently delete{' '}
                  <span className="font-bold text-stone-900">"{productToDelete.name}"</span>?
                  This product will be removed from your active catalog and customer store.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setProductToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete Product
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
