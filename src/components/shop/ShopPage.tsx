import React, { useState, useMemo } from 'react';
import {
  Search,
  SlidersHorizontal,
  X,
  Sparkles,
  Clock,
  ArrowUpDown,
  Check,
} from 'lucide-react';
import { Product, Category } from '../../types';
import { ProductCard } from '../product/ProductCard';
import { Breadcrumb, Pagination, EmptyState } from '../ui';
import {
  fetchSponsoredProducts,
  handleSponsoredProductClick,
  insertSponsoredProductsIntoGrid,
  SponsoredProductItem,
} from '../../services/sponsoredPlacementService';

interface ShopPageProps {
  products: Product[];
  categories: Category[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedCategorySlug: string;
  setSelectedCategorySlug: (slug: string) => void;
  onOpenProductDetails: (product: Product) => void;
}

export const ShopPage: React.FC<ShopPageProps> = ({
  products,
  categories,
  searchQuery,
  setSearchQuery,
  selectedCategorySlug,
  setSelectedCategorySlug,
  onOpenProductDetails,
}) => {
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc' | 'rating'>('featured');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [bestsellersOnly, setBestsellersOnly] = useState(false);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sponsoredItems, setSponsoredItems] = useState<SponsoredProductItem[]>([]);
  const ITEMS_PER_PAGE = 12;

  // Separate Advertising Selection Layer: Fetch eligible sponsored placements
  React.useEffect(() => {
    let isMounted = true;
    fetchSponsoredProducts({
      placement: searchQuery ? 'search' : selectedCategorySlug ? 'category' : 'search',
      categorySlug: selectedCategorySlug || undefined,
      searchQuery: searchQuery || undefined,
      limit: 2,
    }).then((items) => {
      if (isMounted) {
        setSponsoredItems(items);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [selectedCategorySlug, searchQuery]);

  // Filter & Sort computation
  const filteredProducts = useMemo(() => {
    return products
      .filter((product) => {
        // Category filter
        if (selectedCategorySlug) {
          const target = selectedCategorySlug.toLowerCase();
          const catObj = categories.find((c) => c.slug === selectedCategorySlug || c.id === selectedCategorySlug);
          const catName = catObj ? catObj.name.toLowerCase() : '';
          const matchId = product.categoryId === selectedCategorySlug || (catObj && product.categoryId === catObj.id);
          const matchSlug = product.categorySlug === selectedCategorySlug;
          const matchTag = product.tags?.some((t) => {
            const tl = t.toLowerCase();
            return tl === target || (catName && (tl.includes(catName) || catName.includes(tl)));
          });
          const matchTitle = catName ? product.name.toLowerCase().includes(catName) : false;
          const matchDirect = 
            (target === 'nashta' && (product.categoryId === 'cat-fresh-food' || product.categorySlug === 'fresh-food' || product.tags?.includes('Breakfast') || product.tags?.includes('Samosa') || product.tags?.includes('Kachori') || product.tags?.includes('Dhokla'))) ||
            (target === 'poori-padhki' && (product.tags?.includes('Puri') || product.tags?.includes('Padki') || product.tags?.includes('Gujiya') || product.name.toLowerCase().includes('puri') || product.name.toLowerCase().includes('padki'))) ||
            (target === 'thekua' && (product.tags?.includes('Thekua') || product.name.toLowerCase().includes('thekua'))) ||
            (target === 'khasta' && (product.tags?.includes('Khasta') || product.name.toLowerCase().includes('khasta') || product.tags?.includes('Nimki'))) ||
            (target === 'paneer' && (product.tags?.includes('Paneer') || product.name.toLowerCase().includes('paneer'))) ||
            (target === 'dahi' && (product.tags?.includes('Dahi') || product.tags?.includes('Curd') || product.name.toLowerCase().includes('dahi'))) ||
            (target === 'doodh' && (product.tags?.includes('Milk') || product.tags?.includes('Doodh') || product.name.toLowerCase().includes('milk'))) ||
            (target === 'mithai' && (product.categoryId === 'cat-sweets' || product.categorySlug === 'sweets' || product.tags?.includes('Sweets') || product.tags?.includes('Mithai') || product.tags?.includes('Laddu') || product.tags?.includes('Kaju Katli'))) ||
            (target === 'homemade' && (product.categoryId === 'cat-homemade' || product.categorySlug === 'homemade' || product.tags?.includes('Homemade') || product.tags?.includes('Namkeen') || product.tags?.includes('Mixture'))) ||
            (target === 'other-fresh-foods' && (product.tags?.includes('Chhach') || product.tags?.includes('Digestive') || product.tags?.includes('Drink') || product.categoryId === 'cat-other-fresh-foods'));

          if (!matchId && !matchSlug && !matchTag && !matchTitle && !matchDirect) {
            return false;
          }
        }

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = product.name?.toLowerCase().includes(q);
          const matchDesc = product.description?.toLowerCase().includes(q);
          const matchIngredients = product.ingredients?.toLowerCase().includes(q);
          const matchCategory = product.categorySlug?.toLowerCase().includes(q);
          if (!matchName && !matchDesc && !matchIngredients && !matchCategory) {
            return false;
          }
        }

        // Stock filter
        if (inStockOnly && (!product.availability || product.stockQuantity <= 0)) {
          return false;
        }

        // Bestseller filter
        if (bestsellersOnly && !product.bestseller) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        const priceA = a.salePrice && a.salePrice > 0 ? a.salePrice : a.price;
        const priceB = b.salePrice && b.salePrice > 0 ? b.salePrice : b.price;

        if (sortBy === 'price-asc') return priceA - priceB;
        if (sortBy === 'price-desc') return priceB - priceA;
        if (sortBy === 'rating') return b.rating - a.rating;
        return (b.bestseller ? 1 : 0) - (a.bestseller ? 1 : 0);
      });
  }, [products, selectedCategorySlug, searchQuery, inStockOnly, bestsellersOnly, sortBy]);

  const activeCategoryObj = categories.find((c) => c.slug === selectedCategorySlug);
  const activeFiltersCount = (selectedCategorySlug ? 1 : 0) + (inStockOnly ? 1 : 0) + (bestsellersOnly ? 1 : 0);

  // Automatically reset to page 1 on filter or search alterations
  React.useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategorySlug, searchQuery, inStockOnly, bestsellersOnly, sortBy]);

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredProducts.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredProducts, currentPage]);

  const breadcrumbItems = [
    { label: 'Home', onClick: () => setSelectedCategorySlug('') },
    { label: 'Shop', onClick: () => { setSelectedCategorySlug(''); setSearchQuery(''); } },
    ...(activeCategoryObj ? [{ label: activeCategoryObj.name }] : []),
  ];

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6 w-full max-w-full overflow-hidden">
      {/* Breadcrumb navigation */}
      <Breadcrumb items={breadcrumbItems} />

      {/* Category banner / heading */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-b border-stone-200 pb-4 sm:pb-6">
        <div>
          <span className="text-[10px] sm:text-xs uppercase font-bold tracking-widest text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
            {activeCategoryObj ? activeCategoryObj.name : 'Complete Menu'}
          </span>
          <h1 className="text-xl sm:text-3xl font-bold text-stone-900 font-serif mt-1">
            {activeCategoryObj ? activeCategoryObj.name : 'All Pure Sudh Products'}
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            {activeCategoryObj
              ? activeCategoryObj.description
              : 'Handmade fresh snacks, 100% pure cow dairy, and authentic desi sweets.'}
          </p>
        </div>

        {/* Desktop Sort selector */}
        <div className="hidden sm:flex items-center gap-2">
          <ArrowUpDown className="w-4 h-4 text-stone-400 shrink-0" />
          <span className="text-xs text-stone-500 font-medium whitespace-nowrap">Sort by:</span>
          <select
            value={sortBy ?? 'featured'}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="text-xs font-semibold text-stone-800 bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-amber-500 cursor-pointer"
          >
            <option value="featured">Featured / Bestsellers</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="rating">Highest Rated</option>
          </select>
        </div>
      </div>

      {/* In-page Mobile Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3 pointer-events-none" />
        <input
          type="search"
          value={searchQuery ?? ''}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter by product name, ingredient, or type..."
          className="w-full pl-10 pr-10 py-2 sm:py-2.5 rounded-xl border border-stone-200 bg-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-600 text-xs font-semibold"
          >
            Clear
          </button>
        )}
      </div>

      {/* Mobile Filter & Sort Trigger Row */}
      <div className="flex sm:hidden items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setIsMobileFilterOpen(!isMobileFilterOpen)}
          className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-stone-100 text-stone-800 text-xs font-bold border border-stone-200"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-amber-700" />
          <span>Filters {activeFiltersCount > 0 && `(${activeFiltersCount})`}</span>
        </button>

        <div className="flex-1 flex items-center">
          <select
            value={sortBy ?? 'featured'}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="w-full text-xs font-bold text-stone-800 bg-stone-100 border border-stone-200 rounded-xl px-2.5 py-2"
          >
            <option value="featured">Featured</option>
            <option value="price-asc">Price: Low</option>
            <option value="price-desc">Price: High</option>
            <option value="rating">Rating</option>
          </select>
        </div>
      </div>

      {/* Categories Horizontally Scrollable Pills */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 -mx-3 px-3 sm:mx-0 sm:px-0 sm:flex-wrap">
        <button
          onClick={() => setSelectedCategorySlug('')}
          className={`px-3 py-1.5 rounded-xl font-semibold text-xs transition whitespace-nowrap shrink-0 touch-manipulation ${
            !selectedCategorySlug
              ? 'bg-amber-800 text-white shadow-xs'
              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
          }`}
        >
          All ({(products || []).length})
        </button>
        {(categories || []).map((c) => (
          <button
            key={c.id}
            onClick={() => setSelectedCategorySlug(c.slug)}
            className={`px-3 py-1.5 rounded-xl font-semibold text-xs transition whitespace-nowrap shrink-0 touch-manipulation ${
              selectedCategorySlug === c.slug
                ? 'bg-amber-800 text-white shadow-xs'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* Desktop Quick Toggles */}
      <div className="hidden sm:flex items-center gap-4 text-xs">
        <label className="flex items-center gap-1.5 cursor-pointer text-stone-700 font-medium">
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={(e) => setInStockOnly(e.target.checked)}
            className="rounded text-amber-600 focus:ring-amber-500"
          />
          <span>In Stock Only</span>
        </label>

        <label className="flex items-center gap-1.5 cursor-pointer text-stone-700 font-medium">
          <input
            type="checkbox"
            checked={bestsellersOnly}
            onChange={(e) => setBestsellersOnly(e.target.checked)}
            className="rounded text-amber-600 focus:ring-amber-500"
          />
          <span>Bestsellers Only</span>
        </label>
      </div>

      {/* Active Filter Badges */}
      {(selectedCategorySlug || inStockOnly || bestsellersOnly) && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-stone-600">
          <span className="font-semibold text-stone-400 text-[11px]">Active:</span>
          {selectedCategorySlug && (
            <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-md text-[11px] font-medium">
              Category: {activeCategoryObj?.name || selectedCategorySlug}
              <button onClick={() => setSelectedCategorySlug('')}>
                <X className="w-3 h-3 text-amber-700" />
              </button>
            </span>
          )}
          {inStockOnly && (
            <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-md text-[11px] font-medium">
              In Stock Only
              <button onClick={() => setInStockOnly(false)}>
                <X className="w-3 h-3 text-amber-700" />
              </button>
            </span>
          )}
          {bestsellersOnly && (
            <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-md text-[11px] font-medium">
              Bestsellers Only
              <button onClick={() => setBestsellersOnly(false)}>
                <X className="w-3 h-3 text-amber-700" />
              </button>
            </span>
          )}
          <button
            onClick={() => {
              setSelectedCategorySlug('');
              setInStockOnly(false);
              setBestsellersOnly(false);
            }}
            className="text-[11px] text-amber-800 font-bold hover:underline ml-1"
          >
            Clear All
          </button>
        </div>
      )}

      {/* Active Search Notification */}
      {searchQuery && (
        <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-between text-xs text-amber-900">
          <span className="truncate pr-2">
            Matches for &quot;<strong>{searchQuery}</strong>&quot; ({filteredProducts.length} items found)
          </span>
          <button
            onClick={() => setSearchQuery('')}
            className="text-amber-700 font-bold hover:underline flex items-center gap-1 shrink-0"
          >
            <X className="w-3.5 h-3.5" />
            Clear
          </button>
        </div>
      )}

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <EmptyState
          icon={<Search className="w-8 h-8 text-stone-400" />}
          title="No matching products found"
          description="Try adjusting your search query or clearing your category filters to explore our full fresh kitchen catalog."
          actionText="Reset All Filters"
          onAction={() => {
            setSearchQuery('');
            setSelectedCategorySlug('');
            setInStockOnly(false);
            setBestsellersOnly(false);
            setCurrentPage(1);
          }}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
            {insertSponsoredProductsIntoGrid(
              paginatedProducts,
              currentPage === 1 ? sponsoredItems : []
            ).map(({ product, isSponsored, campaignId }) => (
              <ProductCard
                key={`${product.id}-${isSponsored ? 'sponsored' : 'organic'}`}
                product={product}
                isSponsored={isSponsored}
                campaignId={campaignId}
                onSponsoredClick={(cId, pId) => handleSponsoredProductClick(cId, pId)}
                onOpenDetails={onOpenProductDetails}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="pt-6">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={(page) => {
                  setCurrentPage(page);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};
