import React, { useState, useEffect } from 'react';
import {
  Bell,
  Send,
  Users,
  Sparkles,
  Info,
  Calendar,
  CheckCircle2,
  Clock,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Mail,
  MessageSquare,
  Smartphone,
  Flame,
  CreditCard,
  Truck,
  Package,
  XCircle,
  RotateCcw,
  Check,
} from 'lucide-react';
import { NotificationCategory, NotificationChannel, BroadcastNotification } from '../../../types';
import {
  fetchBroadcastNotifications,
  sendBroadcastNotification,
} from '../../../firebase/services';
import { notificationService } from '../../../services/notifications';

interface AdminNotificationsTabProps {
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

interface ProviderStatus {
  channel: NotificationChannel;
  name: string;
  configured: boolean;
  active: boolean;
  mode: string;
}

export const AdminNotificationsTab: React.FC<AdminNotificationsTabProps> = ({
  showToast,
}) => {
  const [notifications, setNotifications] = useState<BroadcastNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [providerStatuses, setProviderStatuses] = useState<ProviderStatus[]>([
    { channel: 'email', name: 'Email Provider (SendGrid / SMTP)', configured: true, active: true, mode: 'sandbox/live' },
    { channel: 'sms', name: 'SMS Provider (Fast2SMS / Twilio)', configured: true, active: true, mode: 'sandbox/live' },
    { channel: 'whatsapp', name: 'WhatsApp (Business Cloud API)', configured: true, active: true, mode: 'sandbox/live' },
    { channel: 'push', name: 'Push (Firebase Cloud Messaging)', configured: true, active: true, mode: 'sandbox/live' },
  ]);

  // Dispatcher Form State
  const [category, setCategory] = useState<NotificationCategory>('promotional');
  const [selectedChannels, setSelectedChannels] = useState<NotificationChannel[]>([
    'email',
    'sms',
    'whatsapp',
    'push',
  ]);
  const [recipientType, setRecipientType] = useState<'all' | 'specific'>('all');
  const [recipientTarget, setRecipientTarget] = useState('');
  const [orderNumber, setOrderNumber] = useState('PS100001');
  const [title, setTitle] = useState('Chhath Special: Fresh Bilona Ghee & Thekua Ready!');
  const [message, setMessage] = useState(
    'Celebrate with pure artisanal delicacies delivered fresh in 30 minutes across Patna. Use code PURE50 for ₹50 off.'
  );

  const loadData = async () => {
    setLoading(true);
    try {
      const [notifsRes, providersRes] = await Promise.allSettled([
        fetchBroadcastNotifications(),
        fetch('/api/notifications/providers').then(async (r) => {
          const ct = r.headers.get('content-type') || '';
          if (!r.ok || !ct.includes('application/json')) return {};
          return r.json();
        }),
      ]);

      if (notifsRes.status === 'fulfilled') {
        setNotifications(notifsRes.value);
      }
      if (providersRes.status === 'fulfilled' && providersRes.value.providers) {
        setProviderStatuses(providersRes.value.providers);
      }
    } catch (err) {
      console.warn('Could not load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const toggleChannel = (ch: NotificationChannel) => {
    setSelectedChannels((prev) =>
      prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]
    );
  };

  // Preset Template Loader
  const handleSelectCategory = (cat: NotificationCategory) => {
    setCategory(cat);
    switch (cat) {
      case 'order_confirmation':
        setTitle('Order #PS100001 Confirmed');
        setMessage('Your order for Fresh Malai Paneer and Desi Ghee Thekua has been confirmed by our kitchen.');
        break;
      case 'order_status':
        setTitle('Order #PS100001 Out for Delivery');
        setMessage('Your fresh batch is on the way! Rider dispatched with temperature-controlled packaging.');
        break;
      case 'payment_status':
        setTitle('Payment Received - ₹429');
        setMessage('Payment via UPI has been verified successfully. Your invoice is available in order tracking.');
        break;
      case 'cancellation':
        setTitle('Order #PS100001 Cancelled');
        setMessage('Your order has been cancelled per your request. If paid, your refund will be credited in 24-48 hrs.');
        break;
      case 'refund':
        setTitle('Refund Processed - ₹429');
        setMessage('Your refund for Order #PS100001 has been initiated to your original payment method.');
        break;
      case 'promotional':
      default:
        setTitle('Chhath Special: Fresh Bilona Ghee Ready!');
        setMessage('Use code PURE50 for flat ₹50 OFF on orders above ₹299. Farm fresh artisanal delicacies.');
        break;
    }
  };

  const handleDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      showToast('Title and message are required', 'error');
      return;
    }
    if (selectedChannels.length === 0) {
      showToast('Select at least one delivery channel', 'error');
      return;
    }

    setSending(true);
    try {
      // 1. Dispatch through provider abstraction
      await notificationService.dispatch({
        category,
        title: title.trim(),
        body: message.trim(),
        message: message.trim(),
        channels: selectedChannels,
        recipient: {
          userId: recipientType === 'specific' ? recipientTarget : undefined,
          email: recipientType === 'specific' && recipientTarget.includes('@') ? recipientTarget : undefined,
          phone: recipientType === 'specific' && !recipientTarget.includes('@') ? recipientTarget : undefined,
        },
        orderId: category !== 'promotional' ? orderNumber : undefined,
      });

      // 2. Also register in Broadcast History if sent to all
      if (recipientType === 'all') {
        const newNotif = await sendBroadcastNotification(
          title.trim(),
          message.trim(),
          category === 'promotional' ? 'promo' : 'system',
          'all',
          '/shop'
        );
        setNotifications((prev) => [newNotif, ...prev]);
      }

      showToast(
        `Dispatched via ${selectedChannels.join(', ').toUpperCase()} safely!`,
        'success'
      );
    } catch (err: any) {
      showToast(err.message || 'Failed to dispatch notification', 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
            Notification System & Multi-Channel Providers
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-semibold border border-emerald-200">
              4 Channels Active
            </span>
          </h2>
          <p className="text-sm text-stone-500 mt-0.5">
            Order confirmations, status updates, payment alerts, cancellations, refunds, and promotional broadcasts.
          </p>
        </div>
        <button
          type="button"
          onClick={loadData}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl transition cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Provider Abstraction & Credential Security Status */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-700" />
            <h3 className="font-bold text-stone-900 text-sm">
              Provider Abstraction Architecture
            </h3>
          </div>
          <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
            Credentials Secure (Server-Side Proxy)
          </span>
        </div>

        <p className="text-xs text-stone-600 mb-4 leading-relaxed">
          Notifications are routed through <code>INotificationProvider</code> abstractions and dispatched through the protected backend endpoint <code>/api/notifications/dispatch</code>. API keys and service tokens (SendGrid, Twilio, WhatsApp Cloud API, Firebase FCM) are kept strictly in server environment variables and never exposed to client browsers.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {providerStatuses.map((p) => {
            let Icon = Mail;
            if (p.channel === 'sms') Icon = Smartphone;
            if (p.channel === 'whatsapp') Icon = MessageSquare;
            if (p.channel === 'push') Icon = Bell;

            return (
              <div
                key={p.channel}
                className="p-3 rounded-xl border border-stone-200 bg-stone-50/70 flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-white border border-stone-200 flex items-center justify-center text-amber-800">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-stone-900 capitalize">
                      {p.channel}
                    </div>
                    <div className="text-[10px] text-stone-500">{p.name.split('(')[1]?.replace(')', '') || 'Provider'}</div>
                  </div>
                </div>
                <span className="w-2 h-2 rounded-full bg-emerald-500 ring-4 ring-emerald-100" />
              </div>
            );
          })}
        </div>
      </div>

      {/* Dispatcher Form */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs">
        <h3 className="font-bold text-stone-900 text-base mb-1">
          Dispatch Live or Test Notification
        </h3>
        <p className="text-xs text-stone-500 mb-5">
          Select notification event category, choose delivery channels, and trigger instant delivery.
        </p>

        <form onSubmit={handleDispatch} className="space-y-5">
          {/* Notification Category Selector */}
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-2">
              Event Category (Click to Load Template)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {[
                { id: 'order_confirmation', label: 'Order Confirmed', icon: Package },
                { id: 'order_status', label: 'Order Status', icon: Truck },
                { id: 'payment_status', label: 'Payment Status', icon: CreditCard },
                { id: 'cancellation', label: 'Cancellation', icon: XCircle },
                { id: 'refund', label: 'Refund', icon: RotateCcw },
                { id: 'promotional', label: 'Promotions', icon: Sparkles },
              ].map((c) => {
                const Icon = c.icon;
                const isSelected = category === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleSelectCategory(c.id as NotificationCategory)}
                    className={`flex items-center gap-1.5 p-2.5 rounded-xl text-xs font-bold text-left transition cursor-pointer ${
                      isSelected
                        ? 'bg-amber-800 text-white shadow-xs'
                        : 'bg-stone-50 text-stone-700 hover:bg-stone-100 border border-stone-200'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{c.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Channel Multi-Selection */}
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-2">
              Delivery Channels *
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'email', label: 'Email', icon: Mail },
                { id: 'sms', label: 'SMS', icon: Smartphone },
                { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
                { id: 'push', label: 'Push (FCM)', icon: Bell },
              ].map((ch) => {
                const Icon = ch.icon;
                const isSelected = selectedChannels.includes(ch.id as NotificationChannel);
                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => toggleChannel(ch.id as NotificationChannel)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                      isSelected
                        ? 'bg-stone-900 text-white shadow-xs'
                        : 'bg-white text-stone-600 border border-stone-300 hover:bg-stone-50'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{ch.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 ml-1 text-emerald-400" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Recipient Targeting */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Recipient Target
              </label>
              <select
                value={recipientType ?? 'all'}
                onChange={(e) => setRecipientType(e.target.value as any)}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
              >
                <option value="all">Broadcast to All Active Customers</option>
                <option value="specific">Specific Customer (Phone / Email / UID)</option>
              </select>
            </div>

            {recipientType === 'specific' ? (
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Customer Email or Phone
                </label>
                <input
                  key="recipient-specific-input"
                  type="text"
                  value={recipientTarget ?? ''}
                  onChange={(e) => setRecipientTarget(e.target.value)}
                  placeholder="e.g. 9876543210 or user@example.com"
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Associated Order # (Optional)
                </label>
                <input
                  key="recipient-order-input"
                  type="text"
                  value={orderNumber ?? ''}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  placeholder="e.g. PS100001"
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* Title and Message */}
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              Notification Title *
            </label>
            <input
              type="text"
              value={title ?? ''}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              Message Body *
            </label>
            <textarea
              rows={3}
              value={message ?? ''}
              onChange={(e) => setMessage(e.target.value)}
              required
              className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end pt-2">
            <button
              type="submit"
              disabled={sending}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-amber-800 hover:bg-amber-900 rounded-xl transition shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {sending ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span>{sending ? 'Dispatching...' : 'Dispatch Notification'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Broadcast & Dispatch History */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-stone-900 text-sm">
            Dispatched Broadcasts & Logs
          </h3>
          <span className="text-xs text-stone-500">
            {notifications.length} logged
          </span>
        </div>

        {loading ? (
          <div className="py-8 text-center text-stone-400 text-xs">
            Loading notifications...
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-8 text-center text-stone-400 text-xs">
            No broadcast history found.
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {notifications.map((n) => (
              <div key={n.id} className="py-3 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-stone-900">{n.title}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 uppercase">
                      {n.type}
                    </span>
                  </div>
                  <p className="text-xs text-stone-600 leading-relaxed mb-1">
                    {n.message}
                  </p>
                  <div className="text-[10px] text-stone-500 flex items-center gap-3">
                    <span>{new Date(n.createdAt).toLocaleString()}</span>
                    <span>Target: {n.target}</span>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Delivered</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
