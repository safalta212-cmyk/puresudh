import React, { useState, useEffect } from 'react';
import {
  User,
  Package,
  MapPin,
  Heart,
  Star,
  LogOut,
  Shield,
  Clock,
  CheckCircle2,
  AlertCircle,
  Truck,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useWishlist } from '../../context/WishlistContext';
import { useToast } from '../../context/ToastContext';
import { Order, Address, Product, Review } from '../../types';
import { AccountProfileTab } from './AccountProfileTab';
import { AccountAddressesTab } from './AccountAddressesTab';
import { AccountOrdersTab } from './AccountOrdersTab';
import { OrderDetailView } from './OrderDetailView';
import { AccountWishlistTab } from './AccountWishlistTab';
import { AccountReviewsTab } from './AccountReviewsTab';
import { fetchOrderById } from '../../firebase/services';

export type AccountTabType = 'profile' | 'orders' | 'addresses' | 'wishlist' | 'reviews';

interface MyAccountPageProps {
  orders: Order[];
  onTrackOrder: (orderId: string) => void;
  onOpenProductDetails: (product: any) => void;
  onNavigate: (view: string) => void;
  initialTab?: AccountTabType;
  selectedOrderId?: string | null;
  onOrderUpdated?: (order: Order) => void;
}

export const MyAccountPage: React.FC<MyAccountPageProps> = ({
  orders,
  onTrackOrder,
  onOpenProductDetails,
  onNavigate,
  initialTab = 'orders',
  selectedOrderId: propSelectedOrderId = null,
  onOrderUpdated,
}) => {
  const { user, role, switchRole, logout, updateUserProfileData } = useAuth();
  const { wishlist } = useWishlist();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<AccountTabType>(() => {
    const path = window.location.pathname;
    if (path.includes('/account/addresses')) return 'addresses';
    if (path.includes('/account/wishlist')) return 'wishlist';
    if (path.includes('/account/profile')) return 'profile';
    if (path.includes('/account/reviews')) return 'reviews';
    if (path.includes('/account/orders')) return 'orders';
    return initialTab;
  });

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [localOrders, setLocalOrders] = useState<Order[]>(orders);

  // Sync prop orders to local state
  useEffect(() => {
    setLocalOrders(orders);
  }, [orders]);

  // Handle URL parsing on mount or popstate for `/account/orders/:id`
  useEffect(() => {
    const parseUrlAndSetState = async () => {
      const path = window.location.pathname;
      const orderMatch = path.match(/\/account\/orders\/([a-zA-Z0-9_-]+)/);

      if (orderMatch && orderMatch[1]) {
        const orderIdParam = orderMatch[1];
        setActiveTab('orders');
        // Find in local orders
        const found = localOrders.find(
          (o) =>
            o.id.toLowerCase() === orderIdParam.toLowerCase() ||
            o.orderNumber.toLowerCase() === orderIdParam.toLowerCase()
        );
        if (found) {
          setSelectedOrder(found);
        } else {
          // Fetch from API
          try {
            const fetched = await fetchOrderById(orderIdParam);
            if (fetched) setSelectedOrder(fetched);
          } catch {
            // Ignore
          }
        }
      } else if (propSelectedOrderId) {
        const found = localOrders.find(
          (o) =>
            o.id.toLowerCase() === propSelectedOrderId.toLowerCase() ||
            o.orderNumber.toLowerCase() === propSelectedOrderId.toLowerCase()
        );
        if (found) setSelectedOrder(found);
      } else if (path.includes('/account/addresses')) {
        setActiveTab('addresses');
        setSelectedOrder(null);
      } else if (path.includes('/account/wishlist')) {
        setActiveTab('wishlist');
        setSelectedOrder(null);
      } else if (path.includes('/account/profile')) {
        setActiveTab('profile');
        setSelectedOrder(null);
      } else if (path.includes('/account/reviews')) {
        setActiveTab('reviews');
        setSelectedOrder(null);
      } else if (path.includes('/account/orders')) {
        setActiveTab('orders');
        setSelectedOrder(null);
      }
    };

    parseUrlAndSetState();

    const handlePopState = () => {
      parseUrlAndSetState();
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [propSelectedOrderId, localOrders]);

  // Helper to switch tab and update browser history
  const handleTabChange = (tab: AccountTabType) => {
    setActiveTab(tab);
    setSelectedOrder(null);
    const newPath = tab === 'profile' ? '/account/profile' : `/account/${tab}`;
    try {
      window.history.pushState(null, '', newPath);
    } catch {
      // Ignore if pushState blocked
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Select an order to view full details
  const handleSelectOrder = (order: Order) => {
    setSelectedOrder(order);
    const newPath = `/account/orders/${order.orderNumber}`;
    try {
      window.history.pushState(null, '', newPath);
    } catch {
      // Ignore
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Back from order detail to orders list
  const handleBackToOrdersList = () => {
    setSelectedOrder(null);
    try {
      window.history.pushState(null, '', '/account/orders');
    } catch {
      // Ignore
    }
  };

  // Order updated (e.g. cancelled)
  const handleOrderUpdated = (updatedOrder: Order) => {
    setLocalOrders((prev) =>
      prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o))
    );
    setSelectedOrder(updatedOrder);
    if (onOrderUpdated) {
      onOrderUpdated(updatedOrder);
    }
  };

  // Address updates
  const customerAddresses: Address[] =
    user?.addresses && user.addresses.length > 0
      ? user.addresses
      : [
          {
            id: 'addr-demo-1',
            name: user?.displayName || 'Aarav Sharma',
            phone: user?.phone || '9876543210',
            addressLine: 'Flat 402, Ganga Heights, Bailey Road',
            landmark: 'Near Paras Hospital',
            city: 'Patna',
            state: 'Bihar',
            pincode: '800014',
            isDefault: true,
            type: 'home',
          },
        ];

  const handleUpdateAddresses = async (newAddresses: Address[]) => {
    if (user) {
      user.addresses = newAddresses;
    }
    try {
      await updateUserProfileData({
        displayName: user?.displayName,
        phone: user?.phone,
      });
    } catch (e) {
      console.warn('Profile address update:', e);
    }
  };

  // Switch to reviews tab with specific item
  const handleWriteReviewForItem = (item: {
    productId: string;
    productName: string;
    productImage: string;
    orderId: string;
    orderNumber: string;
  }) => {
    handleTabChange('reviews');
  };

  const navTabs: {
    id: AccountTabType;
    label: string;
    icon: React.ElementType;
    badge?: number;
  }[] = [
    { id: 'profile', label: 'Profile & Security', icon: User },
    { id: 'orders', label: 'Order History & Tracking', icon: Package, badge: localOrders.length },
    { id: 'addresses', label: 'Delivery Addresses', icon: MapPin, badge: customerAddresses.length },
    { id: 'wishlist', label: 'Saved Wishlist', icon: Heart, badge: wishlist.length },
    { id: 'reviews', label: 'Verified Reviews', icon: Star },
  ];

  return (
    <div className="min-h-screen bg-[#FDFBF7] py-6 sm:py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Customer Account Welcome Banner */}
        <div className="bg-gradient-to-r from-amber-900 via-amber-950 to-stone-900 text-white rounded-3xl p-6 sm:p-8 shadow-md relative overflow-hidden">
          {/* Subtle decorative background pattern */}
          <div className="absolute -right-10 -bottom-10 w-60 h-60 rounded-full bg-amber-500/10 blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-amber-800/80 border-2 border-amber-500/30 flex items-center justify-center font-serif text-2xl sm:text-3xl font-bold shadow-inner shrink-0 text-amber-200">
                {user?.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Customer'}
                    className="w-full h-full rounded-2xl object-cover"
                  />
                ) : (
                  (user?.displayName || 'Aarav').charAt(0).toUpperCase()
                )}
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-bold font-serif text-amber-50">
                    Welcome, {user?.displayName || 'Aarav Sharma'}
                  </h1>
                  <span className="text-[10px] uppercase font-extrabold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {role.toUpperCase()}
                  </span>
                </div>
                <p className="text-xs text-amber-200/80 mt-1">
                  {user?.email || 'customer@email.com'} • {user?.phone || '+91 98765 43210'}
                </p>
                <p className="text-[11px] text-amber-300/60 mt-0.5">
                  Patna Express Customer • Guaranteed Pure Ghee & Dairy
                </p>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="flex items-center gap-2 sm:gap-4 bg-white/10 backdrop-blur-xs p-3 rounded-2xl border border-white/10 self-start md:self-auto">
              <div className="text-center px-2">
                <span className="block font-bold text-base sm:text-lg text-amber-300 font-mono">
                  {localOrders.length}
                </span>
                <span className="text-[10px] text-amber-100/70 uppercase">Orders</span>
              </div>
              <div className="w-px h-7 bg-white/15" />
              <div className="text-center px-2">
                <span className="block font-bold text-base sm:text-lg text-amber-300 font-mono">
                  {customerAddresses.length}
                </span>
                <span className="text-[10px] text-amber-100/70 uppercase">Addresses</span>
              </div>
              <div className="w-px h-7 bg-white/15" />
              <div className="text-center px-2">
                <span className="block font-bold text-base sm:text-lg text-amber-300 font-mono">
                  {wishlist.length}
                </span>
                <span className="text-[10px] text-amber-100/70 uppercase">Wishlist</span>
              </div>
            </div>
          </div>
        </div>

        {/* Account Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-stone-200 text-xs sm:text-sm font-bold scrollbar-none">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id && !selectedOrder;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 rounded-2xl transition cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-amber-800 text-white shadow-xs'
                    : 'bg-white text-stone-600 hover:text-stone-900 border border-stone-200 hover:bg-stone-50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-stone-500'}`} />
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                      isActive ? 'bg-amber-950 text-amber-200' : 'bg-stone-100 text-stone-700'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}

          {/* Logout Action */}
          <button
            type="button"
            onClick={async () => {
              await logout();
              showToast('Logged out of account.', 'info');
              onNavigate('home');
            }}
            className="flex items-center gap-1.5 px-3.5 py-3 rounded-2xl text-stone-500 hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition cursor-pointer shrink-0 ml-auto"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>

        {/* Tab Body Contents */}
        <div className="transition duration-200">
          {/* Order Details View (Route: /account/orders/:id) */}
          {selectedOrder ? (
            <OrderDetailView
              order={selectedOrder}
              onBack={handleBackToOrdersList}
              onTrackLive={(num) => onTrackOrder(num)}
              onOpenProductDetails={onOpenProductDetails}
              onWriteReview={handleWriteReviewForItem}
              onOrderUpdated={handleOrderUpdated}
            />
          ) : (
            <>
              {/* Route: /account/profile */}
              {activeTab === 'profile' && <AccountProfileTab />}

              {/* Route: /account/orders */}
              {activeTab === 'orders' && (
                <AccountOrdersTab
                  orders={localOrders}
                  onSelectOrder={handleSelectOrder}
                  onTrackLive={(num) => onTrackOrder(num)}
                  onNavigateToShop={() => onNavigate('shop')}
                  onWriteReview={handleWriteReviewForItem}
                />
              )}

              {/* Route: /account/addresses */}
              {activeTab === 'addresses' && (
                <AccountAddressesTab
                  addresses={customerAddresses}
                  onUpdateAddresses={handleUpdateAddresses}
                />
              )}

              {/* Route: /account/wishlist */}
              {activeTab === 'wishlist' && (
                <AccountWishlistTab
                  onNavigateToShop={() => onNavigate('shop')}
                  onOpenProductDetails={onOpenProductDetails}
                />
              )}

              {/* Route: /account/reviews (Reviews only for eligible delivered purchases) */}
              {activeTab === 'reviews' && (
                <AccountReviewsTab
                  orders={localOrders}
                  onNavigateToShop={() => onNavigate('shop')}
                  onOpenOrderDetails={(num) => {
                    const ord = localOrders.find((o) => o.orderNumber === num || o.id === num);
                    if (ord) handleSelectOrder(ord);
                  }}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
