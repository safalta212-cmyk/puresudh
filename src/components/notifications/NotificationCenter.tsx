import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  CheckCircle2,
  Truck,
  Package,
  XCircle,
  RotateCcw,
  CreditCard,
  Tag,
  Check,
  Trash2,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  X,
} from 'lucide-react';
import type { Notification as UserNotification, NotificationCategory } from '../../types';
import {
  fetchCustomerNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  listenToCustomerNotifications,
  pushProvider,
} from '../../services/notifications';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

interface NotificationCenterProps {
  onNavigateToTrackOrder?: (orderId: string) => void;
  onNavigateToOffers?: () => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  onNavigateToTrackOrder,
  onNavigateToOffers,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'orders' | 'promotions' | 'payments'>('all');
  const [pushStatus, setPushStatus] = useState<'default' | 'granted' | 'denied'>('default');

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Load and listen to notifications
  useEffect(() => {
    const userId = user?.uid || 'cust-demo-user';
    
    // Initial fetch
    fetchCustomerNotifications(userId).then(setNotifications);

    // Real-time Firestore or memory listener
    const unsubscribe = listenToCustomerNotifications(userId, (updated) => {
      setNotifications(updated);
    });

    // Check Push notification status
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPushStatus(window.Notification.permission as any);
    }

    return () => unsubscribe();
  }, [user]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAsRead = async (id: string) => {
    await markNotificationAsRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const handleMarkAllRead = async () => {
    const userId = user?.uid || 'cust-demo-user';
    await markAllNotificationsAsRead(userId);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    showToast('All notifications marked as read', 'info');
  };

  const handleEnablePush = async () => {
    const perm = await pushProvider.requestPermission();
    if (perm === 'granted') {
      setPushStatus('granted');
      showToast('Push notifications enabled for order & deal alerts!', 'success');
    } else {
      setPushStatus(perm === 'denied' ? 'denied' : 'default');
      showToast('Push notifications were blocked or dismissed in browser settings', 'info');
    }
  };

  const handleNotificationClick = (item: UserNotification) => {
    handleMarkAsRead(item.id);

    if (item.category === 'promotional') {
      if (onNavigateToOffers) {
        onNavigateToOffers();
        setIsOpen(false);
      }
    } else if (item.orderId && onNavigateToTrackOrder) {
      onNavigateToTrackOrder(item.orderId);
      setIsOpen(false);
    }
  };

  // Filter items
  const filteredList = notifications.filter((item) => {
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'orders') {
      return (
        item.category === 'order_confirmation' ||
        item.category === 'order_status' ||
        item.category === 'cancellation'
      );
    }
    if (selectedFilter === 'promotions') {
      return item.category === 'promotional';
    }
    if (selectedFilter === 'payments') {
      return (
        item.category === 'payment_status' ||
        item.category === 'refund'
      );
    }
    return true;
  });

  const getCategoryIcon = (category?: NotificationCategory) => {
    switch (category) {
      case 'order_confirmation':
        return <Package className="w-4 h-4 text-emerald-600" />;
      case 'order_status':
        return <Truck className="w-4 h-4 text-blue-600" />;
      case 'payment_status':
        return <CreditCard className="w-4 h-4 text-amber-600" />;
      case 'cancellation':
        return <XCircle className="w-4 h-4 text-rose-600" />;
      case 'refund':
        return <RotateCcw className="w-4 h-4 text-purple-600" />;
      case 'promotional':
      default:
        return <Tag className="w-4 h-4 text-amber-600" />;
    }
  };

  const getCategoryBg = (category?: NotificationCategory) => {
    switch (category) {
      case 'order_confirmation':
        return 'bg-emerald-50 border-emerald-100';
      case 'order_status':
        return 'bg-blue-50 border-blue-100';
      case 'payment_status':
        return 'bg-amber-50 border-amber-100';
      case 'cancellation':
        return 'bg-rose-50 border-rose-100';
      case 'refund':
        return 'bg-purple-50 border-purple-100';
      case 'promotional':
      default:
        return 'bg-stone-50 border-stone-200';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="View notifications"
        className="relative p-2 text-stone-700 hover:text-amber-800 hover:bg-stone-100 rounded-full transition cursor-pointer"
        title="Notifications & Alerts"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-rose-600 rounded-full border-2 border-white animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-stone-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="p-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/70">
            <div className="flex items-center gap-2">
              <span className="font-bold text-stone-900 text-sm">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                  {unreadCount} unread
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="text-[11px] font-semibold text-amber-800 hover:text-amber-900 cursor-pointer"
                >
                  Mark all read
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 text-stone-400 hover:text-stone-600 rounded-lg hover:bg-stone-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Push Notification Banner Prompt */}
          {pushStatus !== 'granted' && (
            <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-3.5 h-3.5 text-amber-700" />
                <span className="text-xs text-amber-900 font-medium">Enable real-time push alerts</span>
              </div>
              <button
                type="button"
                onClick={handleEnablePush}
                className="px-2.5 py-1 text-[11px] font-bold bg-amber-800 text-white rounded-lg hover:bg-amber-900 transition cursor-pointer"
              >
                Turn On
              </button>
            </div>
          )}

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 p-2 px-3 border-b border-stone-100 bg-white overflow-x-auto scrollbar-none">
            {[
              { id: 'all', label: 'All' },
              { id: 'orders', label: 'Orders' },
              { id: 'promotions', label: 'Promotions' },
              { id: 'payments', label: 'Refunds & Pay' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setSelectedFilter(f.id as any)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  selectedFilter === f.id
                    ? 'bg-stone-900 text-white'
                    : 'text-stone-600 hover:bg-stone-100'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* List of Notifications */}
          <div className="max-h-96 overflow-y-auto divide-y divide-stone-100">
            {filteredList.length === 0 ? (
              <div className="py-12 text-center text-stone-400">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs font-medium">No notifications in this tab</p>
              </div>
            ) : (
              filteredList.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleNotificationClick(item)}
                  className={`p-3.5 flex items-start gap-3 hover:bg-stone-50 transition cursor-pointer ${
                    !item.read ? 'bg-amber-50/30' : ''
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${getCategoryBg(
                      item.category
                    )}`}
                  >
                    {getCategoryIcon(item.category)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <h4
                        className={`text-xs truncate ${
                          !item.read ? 'font-bold text-stone-900' : 'font-semibold text-stone-700'
                        }`}
                      >
                        {item.title}
                      </h4>
                      {!item.read && (
                        <span className="w-2 h-2 rounded-full bg-amber-600 shrink-0" />
                      )}
                    </div>

                    <p className="text-stone-600 text-[11px] leading-relaxed mb-1.5 line-clamp-2">
                      {item.message}
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-stone-600">
                      <span>
                        {new Date(item.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>

                      {item.orderId && (
                        <span className="font-mono font-medium text-amber-900">
                          #{item.orderId}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 bg-stone-50 border-t border-stone-100 text-center">
            <span className="text-[10px] text-stone-600 font-medium">
              Multi-channel delivery: Email • SMS • WhatsApp • Push
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
