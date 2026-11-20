import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Package,
  FolderTree,
  ShoppingBag,
  Users,
  Tag,
  Gift,
  MapPin,
  Clock,
  Star,
  Home,
  Image as ImageIcon,
  Bell,
  ShieldCheck,
  Settings,
  BarChart2,
  HardDrive,
  Database,
  ArrowLeft,
  RefreshCw,
  LogOut,
  ChevronRight,
  Menu,
  X,
  Store,
  Coins,
  Megaphone,
  BarChart3,
} from 'lucide-react';
import {
  Product,
  Category,
  Order,
  DeliveryArea,
  DeliverySlot,
  Coupon,
  Offer,
  OfferBanner,
  SiteSettings,
  OrderStatus,
} from '../../types';
import { useToast } from '../../context/ToastContext';
import {
  saveProduct,
  deleteProduct,
  saveCategory,
  deleteCategory,
  updateOrderStatus,
  processOrderRefund,
  processOrderCancellation,
  fetchCustomers,
  saveDeliveryArea,
  deleteDeliveryArea,
  fetchDeliverySlots,
  saveDeliverySlot,
  deleteDeliverySlot,
  saveCoupon,
  deleteCoupon,
  toggleCouponStatus,
  fetchOffers,
  saveOffer,
  deleteOffer,
  toggleOfferStatus,
  fetchBanners,
  saveBanner,
  deleteBanner,
  saveSiteSettings,
} from '../../firebase/services';
import { formatFirestorePermissionMessage } from '../../firebase/config';
import { normalizeOrderStatus } from '../../types';

// Modular Tabs
import { AdminDashboardOverviewTab } from './tabs/AdminDashboardOverviewTab';
import { AdminProductsTab } from './tabs/AdminProductsTab';
import { AdminCategoriesTab } from './tabs/AdminCategoriesTab';
import { AdminOrdersTab } from './tabs/AdminOrdersTab';
import { AdminCustomersTab } from './tabs/AdminCustomersTab';
import { AdminVendorsTab } from './tabs/AdminVendorsTab';
import { AdminCouponsTab } from './tabs/AdminCouponsTab';
import { AdminOffersTab } from './tabs/AdminOffersTab';
import { AdminDeliveryAreasTab } from './tabs/AdminDeliveryAreasTab';
import { AdminDeliverySlotsTab } from './tabs/AdminDeliverySlotsTab';
import { AdminReviewsTab } from './tabs/AdminReviewsTab';
import { AdminHomepageTab } from './tabs/AdminHomepageTab';
import { AdminBannersTab } from './tabs/AdminBannersTab';
import { AdminNotificationsTab } from './tabs/AdminNotificationsTab';
import { AdminStaffTab } from './tabs/AdminStaffTab';
import { AdminSettingsTab } from './tabs/AdminSettingsTab';
import { AdminReportsTab } from './tabs/AdminReportsTab';
import { AdminAdvertisingWalletsTab } from './tabs/AdminAdvertisingWalletsTab';
import { AdminAdvertisingCampaignsTab } from './tabs/AdminAdvertisingCampaignsTab';
import { VendorAdvertisingSuite } from '../vendor/tabs/VendorAdvertisingSuite';
import { useAuth } from '../../context/AuthContext';

// Auxiliary Management Panels
import { MediaStorageManager } from './MediaStorageManager';
import { DatabaseArchitecturePanel } from './DatabaseArchitecturePanel';
import { ProductModal } from './ProductModal';

export type AdminTab =
  | 'dashboard'
  | 'vendors'
  | 'products'
  | 'categories'
  | 'orders'
  | 'customers'
  | 'coupons'
  | 'offers'
  | 'delivery_areas'
  | 'delivery_slots'
  | 'reviews'
  | 'homepage'
  | 'banners'
  | 'advertising_campaigns'
  | 'advertising_wallets'
  | 'advertising_reports'
  | 'notifications'
  | 'staff'
  | 'settings'
  | 'reports'
  | 'media'
  | 'database';

interface AdminDashboardProps {
  products: Product[];
  categories: Category[];
  orders: Order[];
  deliveryAreas: DeliveryArea[];
  coupons: Coupon[];
  siteSettings: SiteSettings;
  initialTab?: AdminTab;
  onRefreshData: () => void;
  onDeleteProduct?: (productId: string, productName: string) => Promise<void>;
  onBackToStore: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  products,
  categories,
  orders,
  deliveryAreas,
  coupons,
  siteSettings,
  initialTab = 'dashboard',
  onRefreshData,
  onDeleteProduct: onDeleteProductProp,
  onBackToStore,
}) => {
  const { showToast } = useToast();
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>(initialTab);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Sync activeTab if initialTab prop changes from URL/parent routing
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Cross-tab drill-down state
  const [orderInitialSearch, setOrderInitialSearch] = useState('');
  const [preselectedOrder, setPreselectedOrder] = useState<Order | null>(null);
  const [customersCount, setCustomersCount] = useState<number>(() => {
    const uniq = new Set(orders.map((o) => o.customerEmail || o.customerId).filter(Boolean));
    return uniq.size;
  });

  // Shared in-app Delete Confirmation Modal (replaces window.confirm across all tabs)
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    confirmLabel?: string;
    onConfirm: () => Promise<void>;
  } | null>(null);
  const [isConfirmLoading, setIsConfirmLoading] = useState(false);

  // Dynamic async state for offers, banners, slots
  const [offersList, setOffersList] = useState<Offer[]>([]);
  const [bannersList, setBannersList] = useState<OfferBanner[]>([]);
  const [deliverySlotsList, setDeliverySlotsList] = useState<DeliverySlot[]>([]);

  // Product Add/Edit Modal
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Load secondary lists (offers, banners, delivery slots, customers)
  const loadSupplementaryData = async (isActiveCheck = () => true) => {
    try {
      const [offers, banners, slots, customersRes] = await Promise.all([
        fetchOffers(true).catch(() => []),
        fetchBanners(true).catch(() => []),
        fetchDeliverySlots(undefined, true).catch(() => []),
        fetchCustomers()
          .then((data) => ({ ok: true as const, data }))
          .catch(() => ({ ok: false as const, data: [] })),
      ]);

      if (!isActiveCheck()) return;
      setOffersList(offers);
      setBannersList(banners);
      setDeliverySlotsList(slots);
      if (customersRes.ok) {
        setCustomersCount(customersRes.data.length);
      } else {
        const uniq = new Set(orders.map((o) => o.customerEmail || o.customerId).filter(Boolean));
        setCustomersCount(uniq.size);
      }
    } catch (err) {
      console.error('Failed to load admin supplementary data:', err);
    }
  };

  useEffect(() => {
    let active = true;
    loadSupplementaryData(() => active);
    return () => {
      active = false;
    };
  }, [orders.length]);

  // Handlers for Products
  const handleOpenAddProduct = () => {
    setEditingProduct(null);
    setIsProductModalOpen(true);
  };

  const handleOpenEditProduct = (prod: Product) => {
    setEditingProduct(prod);
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = async (product: Product) => {
    await saveProduct(product);
    onRefreshData();
  };

  const handleDeleteProduct = async (productId: string, productName: string) => {
    try {
      if (typeof onDeleteProductProp === 'function') {
        await onDeleteProductProp(productId, productName);
      } else {
        await deleteProduct(productId);
        onRefreshData();
      }
      showToast(`Product "${productName}" removed successfully`, 'info');
    } catch (err: any) {
      console.error('Failed to delete product:', err);
      showToast(formatFirestorePermissionMessage(err, 'Failed to delete product'), 'error');
    }
  };

  // Handlers for Categories
  const handleSaveCategory = async (cat: Category) => {
    await saveCategory(cat);
    onRefreshData();
  };

  const handleDeleteCategory = async (catId: string, catName: string) => {
    setConfirmDialog({
      title: 'Delete Category?',
      message: `Are you sure you want to delete category "${catName}"? Products using it will remain in the catalog.`,
      confirmLabel: 'Delete Category',
      onConfirm: async () => {
        await deleteCategory(catId);
        showToast(`Category "${catName}" deleted`, 'info');
        onRefreshData();
      },
    });
  };

  // Handlers for Orders
  const handleUpdateOrderStatus = async (
    orderId: string,
    status: OrderStatus,
    note?: string
  ) => {
    await updateOrderStatus(orderId, status, note);
    showToast(`Order updated to: ${status}`, 'success');
    onRefreshData();
  };

  const handleProcessRefund = async (orderId: string, refundRef: string, reason?: string) => {
    await processOrderRefund(orderId, refundRef, reason || 'Admin initiated refund');
    showToast(`Refund processed (Ref: ${refundRef})`, 'info');
    onRefreshData();
  };

  const handleProcessCancel = async (orderId: string, reason: string) => {
    await processOrderCancellation(orderId, reason);
    showToast(`Order cancelled: ${reason}`, 'info');
    onRefreshData();
  };

  // Handlers for Coupons
  const handleSaveCoupon = async (coupon: Coupon) => {
    await saveCoupon(coupon);
    onRefreshData();
  };

  const handleDeleteCoupon = async (couponId: string, code: string) => {
    setConfirmDialog({
      title: 'Delete Coupon?',
      message: `Delete promo coupon code "${code}" permanently?`,
      confirmLabel: 'Delete Coupon',
      onConfirm: async () => {
        await deleteCoupon(couponId);
        showToast(`Coupon "${code}" deleted`, 'info');
        onRefreshData();
      },
    });
  };

  const handleToggleCouponStatus = async (couponId: string, active: boolean) => {
    try {
      await toggleCouponStatus(couponId, active);
      onRefreshData();
      showToast(`Coupon is now ${active ? 'Active' : 'Inactive'}`, 'info');
    } catch (err: any) {
      showToast(formatFirestorePermissionMessage(err, 'Failed to update coupon status'), 'error');
      throw err;
    }
  };

  // Handlers for Offers
  const handleSaveOffer = async (offer: Offer) => {
    await saveOffer(offer);
    const refreshed = await fetchOffers(true);
    setOffersList(refreshed);
  };

  const handleDeleteOffer = async (offerId: string, title: string) => {
    setConfirmDialog({
      title: 'Delete Offer Campaign?',
      message: `Remove marketing campaign "${title}" from the store?`,
      confirmLabel: 'Delete Offer',
      onConfirm: async () => {
        await deleteOffer(offerId);
        showToast(`Campaign "${title}" deleted`, 'info');
        const refreshed = await fetchOffers(true);
        setOffersList(refreshed);
      },
    });
  };

  const handleToggleOfferStatus = async (offerId: string, active: boolean) => {
    await toggleOfferStatus(offerId, active);
    const refreshed = await fetchOffers(true);
    setOffersList(refreshed);
    showToast(`Campaign is now ${active ? 'Active' : 'Paused'}`, 'info');
  };

  // Handlers for Delivery Areas
  const handleSaveArea = async (area: DeliveryArea) => {
    await saveDeliveryArea(area);
    onRefreshData();
  };

  const handleDeleteArea = async (areaId: string, areaName: string) => {
    setConfirmDialog({
      title: 'Delete Delivery Area?',
      message: `Remove serviceable delivery zone "${areaName}"?`,
      confirmLabel: 'Delete Zone',
      onConfirm: async () => {
        await deleteDeliveryArea(areaId);
        showToast(`Delivery area "${areaName}" removed`, 'info');
        onRefreshData();
      },
    });
  };

  const handleToggleAreaStatus = async (area: DeliveryArea) => {
    const currentlyActive = area.active !== false && area.isDeliverable !== false;
    const nextActive = !currentlyActive;
    const updated: DeliveryArea = {
      ...area,
      isDeliverable: nextActive,
      active: nextActive,
    };
    await saveDeliveryArea(updated);
    showToast(
      `Delivery area "${area.areaName || area.name || area.pincode}" is now ${nextActive ? 'Active' : 'Suspended'}`,
      'info'
    );
    onRefreshData();
  };

  // Handlers for Delivery Slots
  const handleSaveSlot = async (slot: DeliverySlot) => {
    await saveDeliverySlot(slot);
    const refreshed = await fetchDeliverySlots(undefined, true);
    setDeliverySlotsList(refreshed);
  };

  const handleDeleteSlot = async (slotId: string, slotName: string) => {
    setConfirmDialog({
      title: 'Delete Delivery Slot?',
      message: `Delete time slot "${slotName}"?`,
      confirmLabel: 'Delete Slot',
      onConfirm: async () => {
        await deleteDeliverySlot(slotId);
        showToast(`Slot "${slotName}" deleted`, 'info');
        const refreshed = await fetchDeliverySlots(undefined, true);
        setDeliverySlotsList(refreshed);
      },
    });
  };

  // Handlers for Banners
  const handleSaveBanner = async (banner: OfferBanner) => {
    await saveBanner(banner);
    const refreshed = await fetchBanners(true);
    setBannersList(refreshed);
  };

  const handleDeleteBanner = async (bannerId: string, title: string) => {
    setConfirmDialog({
      title: 'Delete Hero Banner?',
      message: `Remove homepage hero banner "${title}"?`,
      confirmLabel: 'Delete Banner',
      onConfirm: async () => {
        await deleteBanner(bannerId);
        showToast(`Banner "${title}" deleted`, 'info');
        const refreshed = await fetchBanners(true);
        setBannersList(refreshed);
      },
    });
  };

  // Handlers for Site Settings
  const handleSaveSettings = async (settings: SiteSettings) => {
    await saveSiteSettings(settings);
    onRefreshData();
  };

  // Navigation Items Config
  const navSections = [
    {
      group: 'Core Operations',
      items: [
        { id: 'dashboard' as AdminTab, label: 'Dashboard', icon: LayoutDashboard, badge: null },
        { id: 'vendors' as AdminTab, label: 'Vendors & Marketplace', icon: Store, badge: null },
        {
          id: 'orders' as AdminTab,
          label: 'Orders',
          icon: ShoppingBag,
          badge:
            orders.filter((o) => {
              const norm = normalizeOrderStatus(o.status);
              return norm !== 'DELIVERED' && norm !== 'CANCELLED' && norm !== 'REFUNDED';
            }).length || null,
        },
        { id: 'customers' as AdminTab, label: 'Customers', icon: Users, badge: null },
      ],
    },
    {
      group: 'Catalog & Inventory',
      items: [
        { id: 'products' as AdminTab, label: 'Products', icon: Package, badge: products.length },
        { id: 'categories' as AdminTab, label: 'Categories', icon: FolderTree, badge: categories.length },
        { id: 'reviews' as AdminTab, label: 'Reviews', icon: Star, badge: null },
      ],
    },
    {
      group: 'Marketing & Promos',
      items: [
        { id: 'coupons' as AdminTab, label: 'Coupons', icon: Tag, badge: coupons.length },
        { id: 'offers' as AdminTab, label: 'Offers', icon: Gift, badge: offersList.length || null },
        { id: 'banners' as AdminTab, label: 'Hero Banners', icon: ImageIcon, badge: bannersList.length || null },
        { id: 'advertising_campaigns' as AdminTab, label: 'Ad Campaigns', icon: Megaphone, badge: null },
        { id: 'advertising_wallets' as AdminTab, label: 'Ad Wallets', icon: Coins, badge: null },
        { id: 'advertising_reports' as AdminTab, label: 'Ad Reports & Suite', icon: BarChart3, badge: null },
        { id: 'homepage' as AdminTab, label: 'Homepage Curation', icon: Home, badge: null },
        { id: 'notifications' as AdminTab, label: 'Push Notifications', icon: Bell, badge: null },
      ],
    },
    {
      group: 'Fulfillment & Logistics',
      items: [
        {
          id: 'delivery_areas' as AdminTab,
          label: 'Delivery Areas',
          icon: MapPin,
          badge: deliveryAreas.length,
        },
        {
          id: 'delivery_slots' as AdminTab,
          label: 'Delivery Slots',
          icon: Clock,
          badge: deliverySlotsList.length,
        },
      ],
    },
    {
      group: 'Administration & Reports',
      items: [
        { id: 'staff' as AdminTab, label: 'Staff Roster', icon: ShieldCheck, badge: null },
        { id: 'reports' as AdminTab, label: 'Analytics Reports', icon: BarChart2, badge: null },
        { id: 'settings' as AdminTab, label: 'Store Settings', icon: Settings, badge: null },
        { id: 'media' as AdminTab, label: 'Media Storage', icon: HardDrive, badge: null },
        { id: 'database' as AdminTab, label: 'Database Architect', icon: Database, badge: null },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col antialiased">
      {/* Top Navbar */}
      <header className="bg-stone-900 text-white border-b border-stone-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500 text-stone-950 font-black flex items-center justify-center text-sm shadow-xs">
                PS
              </div>
              <div>
                <span className="font-black text-sm tracking-wide text-amber-400 block leading-tight">
                  PURE SUDH
                </span>
                <span className="text-[10px] text-stone-400 font-medium">
                  Enterprise Admin Console
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3">
            <button
              onClick={async () => {
                onRefreshData();
                await loadSupplementaryData();
                showToast('Data refreshed from Firestore', 'info');
              }}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-stone-300 hover:text-white bg-stone-800 hover:bg-stone-700 rounded-lg transition-colors border border-stone-700 cursor-pointer"
              title="Refresh all collections from Firebase"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Refresh Data</span>
            </button>

            <button
              onClick={onBackToStore}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 text-xs font-bold text-stone-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors shadow-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="sm:hidden">Store</span>
              <span className="hidden sm:inline">Back to Store</span>
            </button>

            <button
              id="admin-logout-btn"
              type="button"
              onClick={async () => {
                await logout();
                onBackToStore();
              }}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-stone-300 hover:text-rose-200 bg-stone-800 hover:bg-rose-900/60 rounded-lg transition-colors border border-stone-700 cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Admin Workspace */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex gap-6">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-64 shrink-0 space-y-6">
          <nav className="bg-white rounded-2xl border border-stone-200/80 p-3 shadow-xs space-y-5 sticky top-24 max-h-[82vh] overflow-y-auto">
            {navSections.map((section, sIdx) => (
              <div key={sIdx} className="space-y-1">
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider px-2.5 block mb-1">
                  {section.group}
                </span>
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                        isActive
                          ? 'bg-amber-700 text-white shadow-xs'
                          : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-stone-500'}`} />
                        <span>{item.label}</span>
                      </div>
                      {item.badge !== null && item.badge > 0 && (
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                            isActive
                              ? 'bg-white text-amber-900'
                              : 'bg-stone-100 text-stone-600 border border-stone-200'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>
        </aside>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <div className="relative w-72 bg-white h-full shadow-2xl p-4 overflow-y-auto z-10 flex flex-col justify-between">
              <div className="space-y-5">
                <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                  <div className="font-black text-sm text-amber-800">Admin Sections</div>
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-1 rounded-lg hover:bg-stone-100 text-stone-500"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {navSections.map((section, sIdx) => (
                  <div key={sIdx} className="space-y-1">
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider px-2 block mb-1">
                      {section.group}
                    </span>
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            setActiveTab(item.id);
                            setIsMobileMenuOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                            isActive
                              ? 'bg-amber-700 text-white'
                              : 'text-stone-600 hover:bg-stone-100'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <Icon className="w-4 h-4" />
                            <span>{item.label}</span>
                          </div>
                          {item.badge !== null && item.badge > 0 && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-stone-100 text-stone-600">
                              {item.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-stone-100">
                <button
                  onClick={onBackToStore}
                  className="w-full py-2 px-3 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-xl transition-colors text-center block"
                >
                  Return to Storefront
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content Display Area */}
        <main className="flex-1 min-w-0">
          {/* Mobile Quick Tab Navigation */}
          <div className="lg:hidden flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-3 mb-4 -mx-1 px-1">
            {navSections.flatMap((s) => s.items).map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all touch-manipulation shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-amber-700 text-white shadow-xs'
                      : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                  {item.badge !== null && item.badge > 0 && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                        isActive ? 'bg-amber-900 text-amber-100' : 'bg-stone-100 text-stone-600'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {/* Section 1: Dashboard Overview */}
          {activeTab === 'dashboard' && (
            <AdminDashboardOverviewTab
              orders={orders}
              products={products}
              customersCount={customersCount}
              onNavigate={(tab) => setActiveTab(tab as AdminTab)}
              onNavigateSection={(tab) => setActiveTab(tab as AdminTab)}
              onOpenProductModal={() => handleOpenAddProduct()}
              onOpenOrderDetails={(order) => {
                setPreselectedOrder(order);
                setOrderInitialSearch(order.orderNumber || '');
                setActiveTab('orders');
              }}
              onRefreshData={async () => {
                onRefreshData();
                await loadSupplementaryData();
              }}
            />
          )}

          {/* Section: Vendors & Marketplace Administration */}
          {activeTab === 'vendors' && (
            <AdminVendorsTab
              products={products}
              orders={orders}
              categories={categories}
            />
          )}

          {/* Section 2: Products Management */}
          {activeTab === 'products' && (
            <AdminProductsTab
              products={products}
              categories={categories}
              onSaveProduct={handleSaveProduct}
              onOpenAddProduct={handleOpenAddProduct}
              onOpenEditProduct={handleOpenEditProduct}
              onDeleteProduct={handleDeleteProduct}
              showToast={showToast}
            />
          )}

          {/* Section 3: Categories Management */}
          {activeTab === 'categories' && (
            <AdminCategoriesTab
              categories={categories}
              products={products}
              onSaveCategory={handleSaveCategory}
              onDeleteCategory={handleDeleteCategory}
              showToast={showToast}
            />
          )}

          {/* Section 4: Orders Operations */}
          {activeTab === 'orders' && (
            <AdminOrdersTab
              orders={orders}
              onUpdateOrderStatus={handleUpdateOrderStatus}
              onProcessRefund={handleProcessRefund}
              onProcessCancel={handleProcessCancel}
              initialSearchQuery={orderInitialSearch}
              initialSelectedOrder={preselectedOrder}
              showToast={showToast}
            />
          )}

          {/* Section 5: Customers Directory */}
          {activeTab === 'customers' && (
            <AdminCustomersTab
              orders={orders}
              onViewCustomerOrders={(searchKey) => {
                setPreselectedOrder(null);
                setOrderInitialSearch(searchKey);
                setActiveTab('orders');
              }}
              showToast={showToast}
            />
          )}

          {/* Section 6: Coupons Management */}
          {activeTab === 'coupons' && (
            <AdminCouponsTab
              coupons={coupons}
              categories={categories}
              products={products}
              onSaveCoupon={handleSaveCoupon}
              onDeleteCoupon={handleDeleteCoupon}
              onToggleCouponStatus={handleToggleCouponStatus}
              showToast={showToast}
            />
          )}

          {/* Section 7: Offers & Campaigns */}
          {activeTab === 'offers' && (
            <AdminOffersTab
              offers={offersList}
              categories={categories}
              products={products}
              onSaveOffer={handleSaveOffer}
              onDeleteOffer={handleDeleteOffer}
              onToggleOfferStatus={handleToggleOfferStatus}
              showToast={showToast}
            />
          )}

          {/* Section 8: Delivery Areas */}
          {activeTab === 'delivery_areas' && (
            <AdminDeliveryAreasTab
              deliveryAreas={deliveryAreas}
              onSaveArea={handleSaveArea}
              onDeleteArea={handleDeleteArea}
              onToggleStatus={handleToggleAreaStatus}
              showToast={showToast}
            />
          )}

          {/* Section 9: Delivery Slots */}
          {activeTab === 'delivery_slots' && (
            <AdminDeliverySlotsTab
              deliverySlots={deliverySlotsList}
              onSaveSlot={handleSaveSlot}
              onDeleteSlot={handleDeleteSlot}
              showToast={showToast}
            />
          )}

          {/* Section 10: Reviews Moderation */}
          {activeTab === 'reviews' && (
            <AdminReviewsTab products={products} showToast={showToast} />
          )}

          {/* Section 11: Homepage Curation */}
          {activeTab === 'homepage' && (
            <AdminHomepageTab
              products={products}
              categories={categories}
              banners={bannersList}
              offers={offersList}
              showToast={showToast}
            />
          )}

          {/* Section 12: Hero Banners */}
          {activeTab === 'banners' && (
            <AdminBannersTab
              banners={bannersList}
              onSaveBanner={handleSaveBanner}
              onDeleteBanner={handleDeleteBanner}
              showToast={showToast}
            />
          )}

          {/* Section 12b: Vendor Advertising Campaigns (Phase 3) */}
          {activeTab === 'advertising_campaigns' && (
            <AdminAdvertisingCampaignsTab adminEmail={user?.email || 'aanews70@gmail.com'} />
          )}

          {/* Section 12c: Vendor Advertising Wallets (Phase 2) */}
          {activeTab === 'advertising_wallets' && (
            <AdminAdvertisingWalletsTab adminEmail={user?.email || 'aanews70@gmail.com'} />
          )}

          {/* Section 12d: Platform Advertising Reports & Suite (Phase 6) */}
          {activeTab === 'advertising_reports' && (
            <VendorAdvertisingSuite
              vendorId="vendor-1"
              vendorName="Platform Administration Master View"
              isAdminMode={true}
            />
          )}

          {/* Section 13: Push Notifications */}
          {activeTab === 'notifications' && (
            <AdminNotificationsTab showToast={showToast} />
          )}

          {/* Section 14: Staff Roster */}
          {activeTab === 'staff' && <AdminStaffTab showToast={showToast} />}

          {/* Section 15: Store Settings */}
          {activeTab === 'settings' && (
            <AdminSettingsTab
              settings={siteSettings}
              onSaveSettings={handleSaveSettings}
              showToast={showToast}
            />
          )}

          {/* Section 16: Sales & Analytics Reports */}
          {activeTab === 'reports' && (
            <AdminReportsTab
              orders={orders}
              products={products}
              showToast={showToast}
            />
          )}

          {/* Auxiliary Section 17: Media Storage Manager */}
          {activeTab === 'media' && <MediaStorageManager />}

          {/* Auxiliary Section 18: Database Architecture Panel */}
          {activeTab === 'database' && (
            <DatabaseArchitecturePanel
              onDataRefreshed={async () => {
                onRefreshData();
                await loadSupplementaryData();
              }}
            />
          )}
        </main>
      </div>

      {/* Global Product Add / Edit Modal */}
      <ProductModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        product={editingProduct}
        categories={categories}
        onSave={handleSaveProduct}
        onDelete={handleDeleteProduct}
        showToast={showToast}
      />

      {/* Shared In-App Confirmation Modal */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 border border-stone-200 shadow-2xl space-y-4">
            <div>
              <h3 className="text-base font-bold text-stone-900">{confirmDialog.title}</h3>
              <p className="text-xs text-stone-600 mt-1.5 leading-relaxed">{confirmDialog.message}</p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                disabled={isConfirmLoading}
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isConfirmLoading}
                onClick={async () => {
                  setIsConfirmLoading(true);
                  try {
                    await confirmDialog.onConfirm();
                    setConfirmDialog(null);
                  } catch (err: any) {
                    showToast(formatFirestorePermissionMessage(err, 'Action failed. Please try again.'), 'error');
                  } finally {
                    setIsConfirmLoading(false);
                  }
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isConfirmLoading ? 'Processing...' : (confirmDialog.confirmLabel || 'Confirm Delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
