/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ToastProvider, useToast } from './context/ToastContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DeliveryProvider } from './context/DeliveryContext';
import { CartProvider, useCart } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';
import { GoogleMapsProvider } from './components/maps/GoogleMapsProvider';

// Components
import { Header } from './components/common/Header';
import { Footer } from './components/common/Footer';
import { FloatingWhatsApp } from './components/common/FloatingWhatsApp';
import { PincodeModal } from './components/common/PincodeModal';
import { AuthModal } from './components/common/AuthModal';
import { MobileBottomNav } from './components/common/MobileBottomNav';

import { ProductDetailsModal } from './components/product/ProductDetailsModal';
import { CartDrawer } from './components/cart/CartDrawer';
import { WishlistDrawer } from './components/wishlist/WishlistDrawer';

import { HomePage } from './components/home/HomePage';
import { ShopPage } from './components/shop/ShopPage';
import { CheckoutPage } from './components/checkout/CheckoutPage';
import { TrackOrderPage } from './components/order/TrackOrderPage';
import { OffersPage } from './components/offers/OffersPage';
import { MyAccountPage } from './components/account/MyAccountPage';
import { AboutPage } from './components/pages/AboutPage';
import { ContactPage } from './components/pages/ContactPage';
import { FAQPage } from './components/pages/FAQPage';
import { PolicyPage, PolicyType } from './components/pages/PolicyPage';
import { AdminDashboard, AdminTab } from './components/admin/AdminDashboard';
import { VendorDashboard } from './components/vendor/VendorDashboard';
import { VendorRegisterPage } from './components/vendor/VendorRegisterPage';
import { StaffDashboard } from './components/staff/StaffDashboard';
import { CustomerLoginPage } from './components/auth/CustomerLoginPage';
import { AdminLoginPage } from './components/auth/AdminLoginPage';
import { StaffLoginPage } from './components/auth/StaffLoginPage';
import { VendorLoginPage } from './components/auth/VendorLoginPage';
import { AnnouncementBar } from './components/ui';
import { BRAND } from './constants';

// Types and Services
import {
  Product,
  Category,
  Order,
  DeliveryArea,
  Coupon,
  SiteSettings,
  OfferBanner,
} from './types';
import {
  fetchProducts,
  deleteProduct,
  fetchCategories,
  fetchAllOrders,
  fetchUserOrders,
  fetchDeliveryAreas,
  fetchSiteSettings,
  fetchCoupons,
  fetchOfferBanners,
  fetchOffers,
  getInitialProducts,
  getInitialCategories,
  getInitialDeliveryAreas,
  getInitialCoupons,
  getInitialBanners,
  getInitialOffers,
  getInitialSiteSettings,
} from './firebase/services';
import { Offer } from './types';
import { updateSEO } from './utils/seo';
import { initAppCheck } from './firebase/appCheck';

const AppContent: React.FC = () => {
  const { user, role, openAuthModal } = useAuth();
  const { showToast } = useToast();
  const { setIsCartOpen } = useCart();

  // Navigation / View state
  const [currentView, setCurrentView] = useState<string>('home');
  const [activePolicy, setActivePolicy] = useState<PolicyType>('shipping');

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategorySlug, setSelectedCategorySlug] = useState('');

  // Selected Order for Tracking
  const [trackedOrderId, setTrackedOrderId] = useState<string>('');

  // Account Subroute State
  const [accountInitialTab, setAccountInitialTab] = useState<'profile' | 'orders' | 'addresses' | 'wishlist' | 'reviews'>('orders');
  const [accountSelectedOrderId, setAccountSelectedOrderId] = useState<string | null>(null);

  // Admin Initial Tab State
  const [adminInitialTab, setAdminInitialTab] = useState<AdminTab>('dashboard');

  // Selected Product for Details Modal
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Application Data States - initialized with instant offline/seed data
  const [products, setProducts] = useState<Product[]>(() => getInitialProducts());
  const [categories, setCategories] = useState<Category[]>(() => getInitialCategories());
  const [orders, setOrders] = useState<Order[]>([]);
  const [deliveryAreas, setDeliveryAreas] = useState<DeliveryArea[]>(() => getInitialDeliveryAreas());
  const [coupons, setCoupons] = useState<Coupon[]>(() => getInitialCoupons());
  const [banners, setBanners] = useState<OfferBanner[]>(() => getInitialBanners());
  const [offers, setOffers] = useState<Offer[]>(() => getInitialOffers());
  const [settings, setSettings] = useState<SiteSettings>(() => getInitialSiteSettings());

  // Load Initial Data
  const loadData = async () => {
    try {
      const [prods, cats, areas, cpons, bans, ofrs, stt] = await Promise.all([
        fetchProducts(),
        fetchCategories(),
        fetchDeliveryAreas(),
        fetchCoupons(),
        fetchOfferBanners(),
        fetchOffers(),
        fetchSiteSettings(),
      ]);

      if (Array.isArray(prods)) setProducts(prods);
      if (Array.isArray(cats)) setCategories(cats);
      if (Array.isArray(areas)) setDeliveryAreas(areas);
      if (Array.isArray(cpons)) setCoupons(cpons);
      if (Array.isArray(bans)) setBanners(bans);
      if (Array.isArray(ofrs)) setOffers(ofrs);
      if (stt) setSettings(stt);

      // Orders are fetched based on permissions
      if (role === 'admin' && user?.uid) {
        const allOrds = await fetchAllOrders();
        if (Array.isArray(allOrds)) setOrders(allOrds);
      } else if (user?.uid) {
        const userOrds = await fetchUserOrders(user.uid);
        if (Array.isArray(userOrds)) setOrders(userOrds);
      } else {
        setOrders([]);
      }
    } catch (err) {
      console.warn('Data load error:', err);
    }
  };

  const handleAdminDeleteProduct = async (productId: string, productName: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== productId));
    try {
      await deleteProduct(productId);
    } catch (err) {
      console.error('Failed to delete product from storage:', err);
    }
    loadData();
  };

  useEffect(() => {
    loadData();
  }, [role, user?.uid]);

  // Immediately redirect to Home Page and purge protected state when user signs out
  useEffect(() => {
    const protectedViews = new Set([
      'account',
      'orders',
      'wishlist',
      'addresses',
      'profile',
      'reviews',
      'admin',
      'staff',
      'vendor',
    ]);

    if (!user && protectedViews.has(currentView)) {
      setOrders([]);
      setCurrentView('home');
      try {
        window.history.replaceState(null, '', '/');
      } catch {}
    }
  }, [user, currentView]);

  useEffect(() => {
    const handleAuthSignOutEvent = () => {
      setOrders([]);
      const protectedViews = new Set([
        'account',
        'orders',
        'wishlist',
        'addresses',
        'profile',
        'reviews',
        'admin',
        'staff',
        'vendor',
      ]);
      const path = window.location.pathname;
      const isProtectedPath =
        path.startsWith('/account') ||
        path.startsWith('/orders') ||
        path.startsWith('/wishlist') ||
        path.startsWith('/admin') ||
        path.startsWith('/staff') ||
        (path.startsWith('/vendor') && !path.startsWith('/vendor-register'));

      if (protectedViews.has(currentView) || isProtectedPath) {
        setCurrentView('home');
        try {
          window.history.replaceState(null, '', '/');
        } catch {}
      }
    };

    window.addEventListener('pure_sudh_auth_change', handleAuthSignOutEvent);
    return () => window.removeEventListener('pure_sudh_auth_change', handleAuthSignOutEvent);
  }, [currentView]);

  // URL Route Synchronization and Authoritative Role-Based Gatekeeping
  useEffect(() => {
    let isCancelled = false;

    const handleUrlRoute = async () => {
      const path = window.location.pathname;

      // 1. Separate Authentication Routes
      if (path === '/customer/login' || path === '/customer-login' || path === '/login') {
        if (user) {
          const redirectMap: Record<string, string> = {
            admin: '/admin',
            staff: '/staff',
            vendor: '/vendor',
            customer: '/account',
          };
          const dest = redirectMap[user.role] || '/account';
          handleNavigateView(dest);
          return;
        }
        setCurrentView('customer-login');
        return;
      }

      if (path === '/customer/register' || path === '/customer-register' || path === '/register' || path === '/signup') {
        if (user) {
          const redirectMap: Record<string, string> = {
            admin: '/admin',
            staff: '/staff',
            vendor: '/vendor',
            customer: '/account',
          };
          const dest = redirectMap[user.role] || '/account';
          handleNavigateView(dest);
          return;
        }
        setCurrentView('customer-register');
        return;
      }

      if (path === '/admin/login' || path === '/admin-login') {
        if (user && user.role === 'admin') {
          handleNavigateView('/admin');
          return;
        } else if (user) {
          try {
            const res = await fetch('/api/auth/verify-role', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: user.email, role: user.role, requestedPortal: 'admin' }),
            });
            const contentType = res.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
              const data = await res.json();
              if (!data.authorized) {
                showToast(data.message || 'Access Denied: You are not authorized for Administrator login. Redirected to your dashboard.', 'error');
                handleNavigateView(data.redirectUrl || '/account');
                return;
              }
            } else {
              showToast('Access Denied: You are not authorized for Administrator login. Redirected to your dashboard.', 'error');
              handleNavigateView('/account');
              return;
            }
          } catch {
            handleNavigateView('/account');
            return;
          }
        }
        setCurrentView('admin-login');
        return;
      }

      if (path === '/staff/login' || path === '/staff-login') {
        if (user && (user.role === 'staff' || user.role === 'admin')) {
          handleNavigateView('/staff');
          return;
        } else if (user) {
          try {
            const res = await fetch('/api/auth/verify-role', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: user.email, role: user.role, requestedPortal: 'staff' }),
            });
            const contentType = res.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
              const data = await res.json();
              if (!data.authorized) {
                showToast(data.message || 'Access Denied: Not authorized for Staff operations. Redirected to your dashboard.', 'error');
                handleNavigateView(data.redirectUrl || '/account');
                return;
              }
            } else {
              showToast('Access Denied: Not authorized for Staff operations. Redirected to your dashboard.', 'error');
              handleNavigateView('/account');
              return;
            }
          } catch {
            handleNavigateView('/account');
            return;
          }
        }
        setCurrentView('staff-login');
        return;
      }

      if (path === '/vendor/login' || path === '/vendor-login') {
        if (user && (user.role === 'vendor' || user.role === 'admin')) {
          handleNavigateView('/vendor');
          return;
        } else if (user) {
          try {
            const res = await fetch('/api/auth/verify-role', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: user.email, role: user.role, requestedPortal: 'vendor' }),
            });
            const contentType = res.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
              const data = await res.json();
              if (!data.authorized) {
                showToast(data.message || 'Access Denied: Not authorized for Vendor Partner Hub. Redirected to your dashboard.', 'error');
                handleNavigateView(data.redirectUrl || '/account');
                return;
              }
            } else {
              showToast('Access Denied: Not authorized for Vendor Partner Hub. Redirected to your dashboard.', 'error');
              handleNavigateView('/account');
              return;
            }
          } catch {
            handleNavigateView('/account');
            return;
          }
        }
        setCurrentView('vendor-login');
        return;
      }

      // 2. Role-Protected Portals: Verify role server-side
      if (path.startsWith('/admin')) {
        if (!user) {
          setCurrentView('home');
          try { window.history.replaceState(null, '', '/'); } catch {}
          return;
        }
        try {
          const res = await fetch('/api/auth/verify-role', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: user.email, role: user.role, requestedPortal: 'admin' }),
          });
          const contentType = res.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const data = await res.json();
            if (!data.authorized) {
              showToast(data.message || 'Access Denied: Administrator role required. Redirected to your dashboard.', 'error');
              handleNavigateView(data.redirectUrl || '/account');
              return;
            }
          } else if (user.role !== 'admin') {
            showToast('Access Denied: Administrator role required. Redirected to your dashboard.', 'error');
            handleNavigateView('/account');
            return;
          }
        } catch {
          if (user.role !== 'admin') {
            showToast('Access Denied: Administrator role required. Redirected to your dashboard.', 'error');
            handleNavigateView('/account');
            return;
          }
        }

        if (isCancelled) return;
        setCurrentView('admin');
        const subTab = path.replace('/admin', '').replace(/^\//, '').toLowerCase();
        const tabMap: Record<string, AdminTab> = {
          '': 'dashboard',
          dashboard: 'dashboard',
          vendors: 'vendors',
          vendor: 'vendors',
          commission: 'vendors',
          commissions: 'vendors',
          payout: 'vendors',
          payouts: 'vendors',
          products: 'products',
          categories: 'categories',
          orders: 'orders',
          customers: 'customers',
          coupons: 'coupons',
          offers: 'offers',
          delivery: 'delivery_areas',
          'delivery-areas': 'delivery_areas',
          delivery_areas: 'delivery_areas',
          'delivery-slots': 'delivery_slots',
          delivery_slots: 'delivery_slots',
          reviews: 'reviews',
          homepage: 'homepage',
          banners: 'banners',
          notifications: 'notifications',
          staff: 'staff',
          settings: 'settings',
          reports: 'reports',
          media: 'media',
          database: 'database',
        };
        if (tabMap[subTab]) {
          setAdminInitialTab(tabMap[subTab]);
        } else {
          setAdminInitialTab('dashboard');
        }
      } else if (path.startsWith('/staff')) {
        if (!user) {
          setCurrentView('home');
          try { window.history.replaceState(null, '', '/'); } catch {}
          return;
        }
        try {
          const res = await fetch('/api/auth/verify-role', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: user.email, role: user.role, requestedPortal: 'staff' }),
          });
          const contentType = res.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const data = await res.json();
            if (!data.authorized) {
              showToast(data.message || 'Access Denied: Staff fulfillment access required. Redirected to your dashboard.', 'error');
              handleNavigateView(data.redirectUrl || '/account');
              return;
            }
          } else if (user.role !== 'staff' && user.role !== 'admin') {
            showToast('Access Denied: Staff fulfillment access required. Redirected to your dashboard.', 'error');
            handleNavigateView('/account');
            return;
          }
        } catch {
          if (user.role !== 'staff' && user.role !== 'admin') {
            showToast('Access Denied: Staff fulfillment access required. Redirected to your dashboard.', 'error');
            handleNavigateView('/account');
            return;
          }
        }

        if (isCancelled) return;
        setCurrentView('staff');
      } else if (path.startsWith('/vendor') && !path.startsWith('/vendor-register')) {
        if (!user) {
          setCurrentView('home');
          try { window.history.replaceState(null, '', '/'); } catch {}
          return;
        }
        try {
          const res = await fetch('/api/auth/verify-role', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: user.email, role: user.role, requestedPortal: 'vendor' }),
          });
          const contentType = res.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const data = await res.json();
            if (!data.authorized) {
              showToast(data.message || 'Access Denied: Vendor Partner authorization required. Redirected to your dashboard.', 'error');
              handleNavigateView(data.redirectUrl || '/account');
              return;
            }
          } else if (user.role !== 'vendor' && user.role !== 'admin') {
            showToast('Access Denied: Vendor Partner authorization required. Redirected to your dashboard.', 'error');
            handleNavigateView('/account');
            return;
          }
        } catch {
          if (user.role !== 'vendor' && user.role !== 'admin') {
            showToast('Access Denied: Vendor Partner authorization required. Redirected to your dashboard.', 'error');
            handleNavigateView('/account');
            return;
          }
        }

        if (isCancelled) return;
        setCurrentView('vendor');
      } else if (path.startsWith('/account') || path === '/orders' || path === '/wishlist') {
        if (!user) {
          setCurrentView('home');
          try { window.history.replaceState(null, '', '/'); } catch {}
          return;
        }
        setCurrentView('account');
        if (path.startsWith('/account/orders/')) {
          setAccountInitialTab('orders');
          setAccountSelectedOrderId(path.replace('/account/orders/', ''));
        } else if (path.includes('/account/orders') || path === '/orders') {
          setAccountInitialTab('orders');
          setAccountSelectedOrderId(null);
        } else if (path.includes('/account/addresses')) {
          setAccountInitialTab('addresses');
          setAccountSelectedOrderId(null);
        } else if (path.includes('/account/wishlist') || path === '/wishlist') {
          setAccountInitialTab('wishlist');
          setAccountSelectedOrderId(null);
        } else if (path.includes('/account/reviews')) {
          setAccountInitialTab('reviews');
          setAccountSelectedOrderId(null);
        } else if (path.includes('/account/profile')) {
          setAccountInitialTab('profile');
          setAccountSelectedOrderId(null);
        } else {
          setAccountInitialTab('profile');
          setAccountSelectedOrderId(null);
        }
      } else if (path === '/vendor-register' || path.startsWith('/vendor-register')) {
        setCurrentView('vendor-register');
      } else if (path === '/checkout') {
        if (!user) {
          showToast('Order karne ke liye please account create karein ya sign in karein.', 'info');
          openAuthModal('login');
        }
        setCurrentView('checkout');
      } else if (path === '/shop') {
        setCurrentView('shop');
        const params = new URLSearchParams(window.location.search);
        const cat = params.get('category');
        if (cat) setSelectedCategorySlug(cat);
      } else if (path === '/track-order') {
        setCurrentView('track-order');
      } else if (path === '/offers') {
        setCurrentView('offers');
      } else if (path === '/about') {
        setCurrentView('about');
      } else if (path === '/contact') {
        setCurrentView('contact');
      } else if (path === '/faq') {
        setCurrentView('faq');
      } else if (path.startsWith('/policy-')) {
        const pol = path.replace('/policy-', '') as PolicyType;
        setActivePolicy(pol);
        setCurrentView(`policy-${pol}`);
      }
    };

    handleUrlRoute();
    window.addEventListener('popstate', handleUrlRoute);
    return () => {
      isCancelled = true;
      window.removeEventListener('popstate', handleUrlRoute);
    };
  }, [user, role]);

  // Initialize Firebase App Check on mount
  useEffect(() => {
    initAppCheck();
  }, []);

  // Synchronize SEO tags, Canonical link, and Schema.org JSON-LD whenever view or active product changes
  useEffect(() => {
    if (selectedProduct) {
      updateSEO({
        title: selectedProduct.name,
        description: selectedProduct.description,
        canonicalUrl: `/shop?product=${selectedProduct.id}`,
        ogType: 'product',
        ogImage: selectedProduct.images?.[0],
        productSchema: {
          id: selectedProduct.id,
          name: selectedProduct.name,
          description: selectedProduct.description,
          image: selectedProduct.images?.[0] || '',
          price: selectedProduct.salePrice || selectedProduct.price,
          originalPrice: selectedProduct.price,
          category: selectedProduct.category,
          inStock: selectedProduct.inStock,
          rating: selectedProduct.rating,
          reviewCount: selectedProduct.reviewCount,
          sku: selectedProduct.id,
        },
        breadcrumbs: [
          { name: 'Home', path: '/' },
          { name: 'Shop', path: '/shop' },
          { name: selectedProduct.name, path: `/shop?product=${selectedProduct.id}` },
        ],
      });
      return;
    }

    if (currentView === 'home') {
      updateSEO({
        title: 'PURE SUDH - Pure Food • Pure Quality • Pure Trust | Fresh Indian Delicacies',
        description:
          'Authentic homemade snacks, festival sweets, pure desi ghee delicacies, fresh claypot dahi, and artisan paneer delivered fresh in Patna & Bihar.',
        canonicalUrl: '/',
        ogType: 'website',
        breadcrumbs: [{ name: 'Home', path: '/' }],
      });
    } else if (currentView === 'shop') {
      const activeCat = categories.find((c) => c.slug === selectedCategorySlug);
      const title = activeCat
        ? `${activeCat.name} - Buy Pure Sweets & Snacks Online`
        : 'Shop Pure Homemade Indian Sweets, Namkeen & Dairy';
      updateSEO({
        title,
        description: activeCat
          ? `Explore authentic, preservative-free ${activeCat.name} prepared fresh in Patna.`
          : 'Browse our complete catalog of traditional Indian delicacies, pure desi ghee preparations, and fresh dairy.',
        canonicalUrl: selectedCategorySlug ? `/shop?category=${selectedCategorySlug}` : '/shop',
        breadcrumbs: [
          { name: 'Home', path: '/' },
          { name: 'Shop', path: '/shop' },
          ...(activeCat ? [{ name: activeCat.name, path: `/shop?category=${activeCat.slug}` }] : []),
        ],
      });
    } else if (currentView === 'offers') {
      updateSEO({
        title: 'Special Offers, Coupons & Deals | PURE SUDH',
        description:
          'Save on authentic Indian snacks and festival sweets with exclusive PURE SUDH coupon codes and festival bundles.',
        canonicalUrl: '/offers',
        breadcrumbs: [
          { name: 'Home', path: '/' },
          { name: 'Offers', path: '/offers' },
        ],
      });
    } else if (currentView === 'checkout') {
      updateSEO({
        title: 'Secure Checkout | PURE SUDH',
        description: 'Complete your order securely with Cash on Delivery or UPI fast payment.',
        canonicalUrl: '/checkout',
      });
    } else if (currentView === 'track-order') {
      updateSEO({
        title: 'Track Live Order Status | PURE SUDH',
        description: 'Check real-time order packing, dispatch, and delivery status for your PURE SUDH order.',
        canonicalUrl: '/track-order',
      });
    } else if (currentView === 'about') {
      updateSEO({
        title: 'About Our Pure Food Mission | PURE SUDH',
        description:
          'Discover how PURE SUDH handcrafts traditional Indian delicacies with zero palm oil, zero artificial colors, and 100% natural ingredients.',
        canonicalUrl: '/about',
      });
    } else if (currentView === 'contact') {
      updateSEO({
        title: 'Contact Us & Patna Support | PURE SUDH',
        description: 'Connect with our customer care team via WhatsApp, phone, or email in Patna.',
        canonicalUrl: '/contact',
      });
    } else if (currentView === 'faq') {
      updateSEO({
        title: 'Frequently Asked Questions (FAQ) | PURE SUDH',
        description: 'Common questions regarding ingredients, packaging, delivery radius in Patna, and shelf life.',
        canonicalUrl: '/faq',
      });
    } else if (currentView === 'customer-login') {
      updateSEO({
        title: 'Customer Sign In & Account Access | PURE SUDH',
        description: 'Sign in to your PURE SUDH customer account to track orders, manage addresses, and order pure farm food.',
        canonicalUrl: '/customer/login',
      });
    } else if (currentView === 'admin-login') {
      updateSEO({
        title: 'Administrator Secure Sign In | PURE SUDH',
        description: 'Restricted administrative security console for authorized Pure Sudh managers.',
        canonicalUrl: '/admin/login',
      });
    } else if (currentView === 'staff-login') {
      updateSEO({
        title: 'Staff Fulfillment Operations Sign In | PURE SUDH',
        description: 'Authorized operational desk sign in for packing and delivery staff.',
        canonicalUrl: '/staff/login',
      });
    } else if (currentView === 'vendor-login') {
      updateSEO({
        title: 'Vendor Partner Hub Sign In | PURE SUDH',
        description: 'Sign in to the Pure Sudh Vendor Partner Hub to manage products, orders, and payouts.',
        canonicalUrl: '/vendor/login',
      });
    } else if (currentView.startsWith('policy-')) {
      const polName = currentView.replace('policy-', '');
      updateSEO({
        title: `${polName.charAt(0).toUpperCase() + polName.slice(1)} Policy | PURE SUDH`,
        description: `Read the official PURE SUDH ${polName} policy and terms of service.`,
        canonicalUrl: `/${currentView}`,
      });
    }
  }, [currentView, selectedCategorySlug, selectedProduct, categories]);

  const handleNavigateView = (view: string, authenticatedProfile?: { role: string } | null) => {
    const activeUser = authenticatedProfile || user;

    // 1. Separate Authentication Routes
    if (view === 'customer-login' || view === '/customer/login' || view === 'login') {
      if (activeUser) {
        const redirectMap: Record<string, string> = {
          admin: '/admin',
          staff: '/staff',
          vendor: '/vendor',
          customer: '/account',
        };
        const dest = redirectMap[activeUser.role] || '/account';
        handleNavigateView(dest, activeUser);
        return;
      }
      setCurrentView('customer-login');
      try { window.history.pushState(null, '', '/customer/login'); } catch {}
    } else if (view === 'customer-register' || view === '/customer/register' || view === 'register' || view === 'signup') {
      if (activeUser) {
        const redirectMap: Record<string, string> = {
          admin: '/admin',
          staff: '/staff',
          vendor: '/vendor',
          customer: '/account',
        };
        const dest = redirectMap[activeUser.role] || '/account';
        handleNavigateView(dest, activeUser);
        return;
      }
      setCurrentView('customer-register');
      try { window.history.pushState(null, '', '/customer/register'); } catch {}
    } else if (view === 'admin-login' || view === '/admin/login') {
      if (activeUser && activeUser.role === 'admin') {
        handleNavigateView('/admin', activeUser);
        return;
      } else if (activeUser) {
        showToast('Access Denied: You are not authorized for Administrator login. Redirected to your dashboard.', 'error');
        handleNavigateView(activeUser.role === 'customer' ? '/account' : `/${activeUser.role}`, activeUser);
        return;
      }
      setCurrentView('admin-login');
      try { window.history.pushState(null, '', '/admin/login'); } catch {}
    } else if (view === 'staff-login' || view === '/staff/login') {
      if (activeUser && (activeUser.role === 'staff' || activeUser.role === 'admin')) {
        handleNavigateView('/staff', activeUser);
        return;
      } else if (activeUser) {
        showToast('Access Denied: Not authorized for Staff operations. Redirected to your dashboard.', 'error');
        handleNavigateView(activeUser.role === 'customer' ? '/account' : `/${activeUser.role}`, activeUser);
        return;
      }
      setCurrentView('staff-login');
      try { window.history.pushState(null, '', '/staff/login'); } catch {}
    } else if (view === 'vendor-login' || view === '/vendor/login') {
      if (activeUser && (activeUser.role === 'vendor' || activeUser.role === 'admin')) {
        handleNavigateView('/vendor', activeUser);
        return;
      } else if (activeUser) {
        showToast('Access Denied: Not authorized for Vendor Partner Hub. Redirected to your dashboard.', 'error');
        handleNavigateView(activeUser.role === 'customer' ? '/account' : `/${activeUser.role}`, activeUser);
        return;
      }
      setCurrentView('vendor-login');
      try { window.history.pushState(null, '', '/vendor/login'); } catch {}
    } else if (view === 'admin' || view.startsWith('/admin')) {
      if (!activeUser) {
        handleNavigateView('/admin/login');
        return;
      }
      if (activeUser.role !== 'admin') {
        showToast('Access Denied: Administrator role required. Redirected to your dashboard.', 'error');
        handleNavigateView('/account', activeUser);
        return;
      }
      setCurrentView('admin');
      const subTab = view.replace('/admin', '').replace(/^\//, '').toLowerCase();
      const tabMap: Record<string, AdminTab> = {
        '': 'dashboard',
        dashboard: 'dashboard',
        vendors: 'vendors',
        vendor: 'vendors',
        commission: 'vendors',
        commissions: 'vendors',
        payout: 'vendors',
        payouts: 'vendors',
        products: 'products',
        categories: 'categories',
        orders: 'orders',
        customers: 'customers',
        coupons: 'coupons',
        offers: 'offers',
        delivery: 'delivery_areas',
        'delivery-areas': 'delivery_areas',
        delivery_areas: 'delivery_areas',
        'delivery-slots': 'delivery_slots',
        delivery_slots: 'delivery_slots',
        reviews: 'reviews',
        homepage: 'homepage',
        banners: 'banners',
        notifications: 'notifications',
        staff: 'staff',
        settings: 'settings',
        reports: 'reports',
        media: 'media',
        database: 'database',
      };
      if (tabMap[subTab]) {
        setAdminInitialTab(tabMap[subTab]);
      } else {
        setAdminInitialTab('dashboard');
      }
      try { window.history.pushState(null, '', view.startsWith('/') ? view : `/${view}`); } catch {}
    } else if (view === 'staff' || view.startsWith('/staff')) {
      if (!activeUser) {
        handleNavigateView('/staff/login');
        return;
      }
      if (activeUser.role !== 'staff' && activeUser.role !== 'admin') {
        showToast('Access Denied: Staff fulfillment access required. Redirected to your dashboard.', 'error');
        handleNavigateView('/account', activeUser);
        return;
      }
      setCurrentView('staff');
      try { window.history.pushState(null, '', '/staff'); } catch {}
    } else if (view === 'vendor' || view.startsWith('/vendor')) {
      if (view === 'vendor-register' || view.startsWith('/vendor-register')) {
        setCurrentView('vendor-register');
        try { window.history.pushState(null, '', '/vendor-register'); } catch {}
      } else {
        if (!activeUser) {
          handleNavigateView('/vendor/login');
          return;
        }
        if (activeUser.role !== 'vendor' && activeUser.role !== 'admin') {
          showToast('Access Denied: Vendor Partner authorization required. Redirected to your dashboard.', 'error');
          handleNavigateView('/account', activeUser);
          return;
        }
        setCurrentView('vendor');
        try { window.history.pushState(null, '', '/vendor'); } catch {}
      }
    } else if (view === 'account' || view === '/account') {
      if (!activeUser) {
        showToast('Please sign in to access your account.', 'info');
        setCurrentView('customer-login');
        try { window.history.pushState(null, '', '/customer/login'); } catch {}
        return;
      }
      setCurrentView('account');
      setAccountInitialTab('profile');
      setAccountSelectedOrderId(null);
      try { window.history.pushState(null, '', '/account'); } catch {}
    } else if (view === 'orders' || view === '/account/orders') {
      if (!user) {
        showToast('Please sign in to view your orders.', 'info');
        setCurrentView('customer-login');
        try { window.history.pushState(null, '', '/customer/login'); } catch {}
        return;
      }
      setCurrentView('account');
      setAccountInitialTab('orders');
      setAccountSelectedOrderId(null);
      try { window.history.pushState(null, '', '/account/orders'); } catch {}
    } else if (view.startsWith('/account/orders/')) {
      if (!user) {
        showToast('Please sign in to view your order details.', 'info');
        setCurrentView('customer-login');
        try { window.history.pushState(null, '', '/customer/login'); } catch {}
        return;
      }
      const ordId = view.replace('/account/orders/', '');
      setCurrentView('account');
      setAccountInitialTab('orders');
      setAccountSelectedOrderId(ordId);
      try { window.history.pushState(null, '', view); } catch {}
    } else if (view === 'addresses' || view === '/account/addresses') {
      if (!user) {
        showToast('Please sign in to manage your saved addresses.', 'info');
        setCurrentView('customer-login');
        try { window.history.pushState(null, '', '/customer/login'); } catch {}
        return;
      }
      setCurrentView('account');
      setAccountInitialTab('addresses');
      setAccountSelectedOrderId(null);
      try { window.history.pushState(null, '', '/account/addresses'); } catch {}
    } else if (view === 'wishlist' || view === '/account/wishlist') {
      if (!user) {
        showToast('Please sign in to view your saved wishlist.', 'info');
        setCurrentView('customer-login');
        try { window.history.pushState(null, '', '/customer/login'); } catch {}
        return;
      }
      setCurrentView('account');
      setAccountInitialTab('wishlist');
      setAccountSelectedOrderId(null);
      try { window.history.pushState(null, '', '/account/wishlist'); } catch {}
    } else if (view === 'profile' || view === '/account/profile') {
      if (!user) {
        showToast('Please sign in to view your profile.', 'info');
        setCurrentView('customer-login');
        try { window.history.pushState(null, '', '/customer/login'); } catch {}
        return;
      }
      setCurrentView('account');
      setAccountInitialTab('profile');
      setAccountSelectedOrderId(null);
      try { window.history.pushState(null, '', '/account/profile'); } catch {}
    } else if (view === 'reviews' || view === '/account/reviews') {
      if (!user) {
        showToast('Please sign in to view your reviews.', 'info');
        setCurrentView('customer-login');
        try { window.history.pushState(null, '', '/customer/login'); } catch {}
        return;
      }
      setCurrentView('account');
      setAccountInitialTab('reviews');
      setAccountSelectedOrderId(null);
      try { window.history.pushState(null, '', '/account/reviews'); } catch {}
    } else if (view === 'checkout' || view === '/checkout') {
      if (!user) {
        showToast('Order karne ke liye please account create karein ya sign in karein. (Please sign in or create an account to place an order.)', 'info');
        openAuthModal('login');
        return;
      }
      setCurrentView('checkout');
      try { window.history.pushState(null, '', '/checkout'); } catch {}
    } else {
      setCurrentView(view);
      const pushPath = view === 'home' ? '/' : `/${view}`;
      try { window.history.pushState(null, '', pushPath); } catch {}
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenCategory = (slug: string) => {
    setSelectedCategorySlug(slug);
    setCurrentView('shop');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleTrackSpecificOrder = (orderId: string) => {
    setTrackedOrderId(orderId);
    setCurrentView('track-order');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOrderPlaced = (order: Order) => {
    setOrders((prev) => [order, ...prev]);
    setTrackedOrderId(order.orderNumber);
    setCurrentView('track-order');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Dedicated Separate Authentication Pages
  if (currentView === 'customer-login' || currentView === 'customer-register') {
    return (
      <CustomerLoginPage
        initialMode={currentView === 'customer-register' ? 'register' : 'login'}
        onBackToStore={() => handleNavigateView('home')}
        onNavigate={(dest, profile) => handleNavigateView(dest, profile)}
        onNavigateDashboard={(profile) => handleNavigateView('account', profile)}
      />
    );
  }

  if (currentView === 'admin-login') {
    return (
      <AdminLoginPage
        onBackToStore={() => handleNavigateView('home')}
        onNavigateDashboard={(profile) => handleNavigateView('admin', profile)}
      />
    );
  }

  if (currentView === 'staff-login') {
    return (
      <StaffLoginPage
        onBackToStore={() => handleNavigateView('home')}
        onNavigateDashboard={(profile) => handleNavigateView('staff', profile)}
      />
    );
  }

  if (currentView === 'vendor-login') {
    return (
      <VendorLoginPage
        onBackToStore={() => handleNavigateView('home')}
        onNavigateDashboard={(profile) => handleNavigateView('vendor', profile)}
        onNavigateRegister={() => handleNavigateView('vendor-register')}
      />
    );
  }

  // If Admin View is selected, show Admin Panel (strictly gated on authenticated admin)
  if (currentView === 'admin' && user && role === 'admin') {
    return (
      <AdminDashboard
        products={products}
        categories={categories}
        orders={orders}
        deliveryAreas={deliveryAreas}
        coupons={coupons}
        siteSettings={settings}
        initialTab={adminInitialTab}
        onRefreshData={loadData}
        onDeleteProduct={handleAdminDeleteProduct}
        onBackToStore={() => handleNavigateView('home')}
      />
    );
  }

  // If Vendor Marketplace View is selected, show Vendor Hub (strictly gated on authenticated vendor/admin)
  if (currentView === 'vendor' && user && (role === 'vendor' || role === 'admin')) {
    return (
      <VendorDashboard
        products={products}
        orders={orders}
        onBackToStore={() => handleNavigateView('home')}
        onOpenProductDetails={(p) => setSelectedProduct(p)}
        onOpenRegisterNewVendor={() => handleNavigateView('vendor-register')}
      />
    );
  }

  // If Vendor Registration View is selected, show Vendor Onboarding Page
  if (currentView === 'vendor-register') {
    return (
      <VendorRegisterPage
        onBackToStore={() => handleNavigateView('home')}
        onRegisteredSuccess={(vendorId) => {
          handleNavigateView('vendor');
        }}
      />
    );
  }

  // If Staff Operations Desk View is selected, show Staff Portal (strictly gated on authenticated staff/admin)
  if (currentView === 'staff' && user && (role === 'staff' || role === 'admin')) {
    return (
      <StaffDashboard
        orders={orders}
        onRefreshData={loadData}
        onBackToStore={() => handleNavigateView('home')}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FDFBF7] text-stone-900 selection:bg-amber-100 selection:text-amber-900 font-sans antialiased pb-16 lg:pb-0">
      {/* Brand Value & Promo Announcement Bar */}
      <AnnouncementBar
        couponCode="PURE50"
        couponText="Use code PURE50 for ₹50 OFF on first order"
      />

      {/* Global Header */}
      <Header
        currentView={currentView}
        setCurrentView={handleNavigateView}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedCategorySlug={selectedCategorySlug}
        setSelectedCategorySlug={setSelectedCategorySlug}
      />

      {/* Main View Router */}
      <main className="flex-1">
        {currentView === 'home' && (
          <HomePage
            products={products}
            categories={categories}
            banners={banners}
            offers={offers}
            coupons={coupons}
            settings={settings}
            onOpenProductDetails={(p) => setSelectedProduct(p)}
            onNavigateCategory={handleOpenCategory}
            onNavigateShop={() => handleNavigateView('shop')}
            onNavigateAbout={() => handleNavigateView('about')}
            onNavigateContact={() => handleNavigateView('contact')}
            onNavigateOffers={() => handleNavigateView('shop')}
            onTrackOrder={handleTrackSpecificOrder}
          />
        )}

        {currentView === 'shop' && (
          <ShopPage
            products={products}
            categories={categories}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            selectedCategorySlug={selectedCategorySlug}
            setSelectedCategorySlug={setSelectedCategorySlug}
            onOpenProductDetails={(p) => setSelectedProduct(p)}
          />
        )}

        {currentView === 'checkout' && (
          <CheckoutPage
            onOrderPlaced={handleOrderPlaced}
            onBackToShopping={() => handleNavigateView('shop')}
            onTrackOrder={handleTrackSpecificOrder}
          />
        )}

        {currentView === 'track-order' && (
          <TrackOrderPage
            initialOrderId={trackedOrderId}
            onBackToShop={() => handleNavigateView('shop')}
          />
        )}

        {currentView === 'offers' && (
          <OffersPage
            onNavigateToShop={(catSlug) => {
              if (catSlug) setSelectedCategorySlug(catSlug);
              handleNavigateView('shop');
            }}
            onOpenProductDetails={(pId) => {
              const p = products.find((prod) => prod.id === pId);
              if (p) setSelectedProduct(p);
            }}
          />
        )}

        {(currentView === 'account' || currentView === 'orders' || currentView === 'wishlist') && user && (
          <MyAccountPage
            orders={orders}
            onTrackOrder={handleTrackSpecificOrder}
            onOpenProductDetails={(p) => setSelectedProduct(p)}
            onNavigate={handleNavigateView}
            initialTab={
              currentView === 'wishlist'
                ? 'wishlist'
                : currentView === 'orders'
                ? 'orders'
                : accountInitialTab
            }
            selectedOrderId={accountSelectedOrderId}
            onOrderUpdated={(updated) => {
              setOrders((prev) =>
                prev.map((o) => (o.id === updated.id ? updated : o))
              );
            }}
          />
        )}

        {currentView === 'about' && (
          <AboutPage
            settings={settings}
            onExploreProducts={() => handleNavigateView('shop')}
          />
        )}

        {currentView === 'contact' && <ContactPage settings={settings} />}

        {currentView === 'faq' && <FAQPage settings={settings} />}

        {currentView.startsWith('policy-') && (
          <PolicyPage
            currentPolicy={
              currentView.replace('policy-', '') as PolicyType
            }
            onSelectPolicy={(p) => handleNavigateView(`policy-${p}`)}
          />
        )}
      </main>

      {/* Global Footer */}
      <Footer
        settings={settings}
        setCurrentView={handleNavigateView}
        setSelectedCategorySlug={setSelectedCategorySlug}
      />

      {/* Floating WhatsApp Support Button */}
      <FloatingWhatsApp phoneNumber={settings?.whatsappNumber} />

      {/* Persistent Mobile Bottom Navigation Bar */}
      <MobileBottomNav
        currentView={currentView}
        setCurrentView={handleNavigateView}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenSearch={() => {
          handleNavigateView('shop');
          setTimeout(() => {
            const searchInput =
              (document.getElementById('shop-search-input') as HTMLInputElement) ||
              (document.getElementById('global-search-input') as HTMLInputElement) ||
              (document.querySelector('input[type="search"]') as HTMLInputElement);
            if (searchInput) {
              searchInput.focus();
            }
          }, 150);
        }}
      />

      {/* Global Modals & Drawers */}
      <PincodeModal />
      <AuthModal />
      <CartDrawer
        onProceedToCheckout={() => handleNavigateView('checkout')}
        onContinueShopping={() => handleNavigateView('shop')}
      />
      <WishlistDrawer
        onOpenProductDetails={(p) => setSelectedProduct(p)}
        onExploreProducts={() => handleNavigateView('shop')}
      />
      {selectedProduct && (
        <ProductDetailsModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  );
};

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <DeliveryProvider>
          <CartProvider>
            <WishlistProvider>
              <GoogleMapsProvider>
                <AppContent />
              </GoogleMapsProvider>
            </WishlistProvider>
          </CartProvider>
        </DeliveryProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
