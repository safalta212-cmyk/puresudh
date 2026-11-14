import { doc, setDoc, updateDoc, getDoc, collection, query, where, getDocs, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { Order, Notification as AppNotification } from '../../types';
import {
  INotificationProvider,
  NotificationChannel,
  NotificationCategory,
  NotificationPayload,
  NotificationDeliveryResult,
  ProviderStatus,
} from './types';
import { EmailProvider } from './EmailProvider';
import { SmsProvider } from './SmsProvider';
import { WhatsAppProvider } from './WhatsAppProvider';
import { PushProvider } from './PushProvider';

const LOCAL_NOTIFS_KEY = 'pure_sudh_user_notifications';

function getLocalNotifications(): AppNotification[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_NOTIFS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalNotifications(notifs: AppNotification[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_NOTIFS_KEY, JSON.stringify(notifs.slice(0, 100)));
  } catch (e) {
    console.warn('Could not save notifications locally:', e);
  }
}

class NotificationService {
  private providers: Map<NotificationChannel, INotificationProvider> = new Map();

  constructor() {
    this.registerProvider(new PushProvider());
    this.registerProvider(new WhatsAppProvider());
    this.registerProvider(new SmsProvider());
    this.registerProvider(new EmailProvider());
  }

  registerProvider(provider: INotificationProvider): void {
    this.providers.set(provider.channel, provider);
  }

  getProvider(channel: NotificationChannel): INotificationProvider | undefined {
    return this.providers.get(channel);
  }

  getProviderStatuses(): ProviderStatus[] {
    const statuses: ProviderStatus[] = [
      {
        channel: 'push',
        providerName: 'Firebase Cloud Messaging (FCM) & Web Push',
        configured: true,
        serviceReady: PushProvider.getPermissionStatus() === 'granted',
        description: 'Browser alerts and mobile push notifications for instant order and delivery updates.',
      },
      {
        channel: 'whatsapp',
        providerName: 'WhatsApp Business Cloud API',
        configured: true,
        serviceReady: true,
        description: 'Interactive order status notifications, live delivery location links and receipts.',
      },
      {
        channel: 'sms',
        providerName: 'SMS Gateway (Fast2SMS / Twilio)',
        configured: true,
        serviceReady: true,
        description: 'Instant transactional delivery alerts, OTP verification, and dispatch updates.',
      },
      {
        channel: 'email',
        providerName: 'Email Dispatcher (SMTP / SendGrid)',
        configured: true,
        serviceReady: true,
        description: 'Formatted itemized invoices, order confirmations, refund receipts, and seasonal catalogues.',
      },
    ];
    return statuses;
  }

  /**
   * Dispatches payload to selected communication channels
   */
  async dispatch(payload: NotificationPayload): Promise<NotificationDeliveryResult[]> {
    const results: NotificationDeliveryResult[] = [];
    const channels = payload.channels && payload.channels.length > 0
      ? payload.channels
      : (['push', 'whatsapp', 'sms', 'email'] as NotificationChannel[]);

    // 1. Create In-App Notification entry for user
    await this.persistInAppNotification(payload);

    // 2. Dispatch via individual providers
    for (const channel of channels) {
      const provider = this.providers.get(channel);
      if (provider) {
        try {
          const res = await provider.send(payload);
          results.push(res);
        } catch (err: any) {
          results.push({
            channel,
            provider: provider.providerName,
            success: false,
            error: err?.message || 'Unknown dispatch error',
            timestamp: new Date().toISOString(),
          });
        }
      }
    }

    return results;
  }

  /**
   * Store notification in Firestore & local cache for in-app viewing
   */
  private async persistInAppNotification(payload: NotificationPayload): Promise<void> {
    const notifId = payload.id || `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const userId = payload.recipient.userId || 'all';

    const inAppItem: AppNotification = {
      id: notifId,
      userId,
      title: payload.title,
      message: payload.body,
      type: payload.category === 'promotional' ? 'promo' : 'order',
      category: payload.category,
      channels: payload.channels,
      read: false,
      link: payload.actionUrl || (payload.orderId ? `/track-order?orderId=${payload.orderId}` : '/shop'),
      orderId: payload.orderId,
      metadata: payload.metadata,
      createdAt: new Date().toISOString(),
    };

    // Update local cache
    const current = getLocalNotifications();
    current.unshift(inAppItem);
    saveLocalNotifications(current);

    // Persist to Firestore
    try {
      await setDoc(doc(db, 'notifications', notifId), inAppItem, { merge: true });
    } catch (e) {
      console.warn('Firestore notification write fallback:', e);
    }
  }

  // ================= SPECIFIC BUSINESS NOTIFICATION TRIGGERS ================= //

  /**
   * 1. Order Confirmation Notification
   */
  async sendOrderConfirmation(order: Order, channels: NotificationChannel[] = ['push', 'whatsapp', 'sms', 'email']): Promise<NotificationDeliveryResult[]> {
    const totalItems = (order.items || []).reduce((acc, i) => acc + i.quantity, 0);
    const title = `Order Confirmed! #${order.id.slice(-6).toUpperCase()}`;
    const body = `Thank you for choosing PURE SUDH. Your order of ₹${order.total.toFixed(0)} for ${totalItems} fresh items is confirmed and is being packed.`;

    const payload: NotificationPayload = {
      recipient: {
        userId: (order as any).userId || order.customerId,
        name: order.deliveryAddress?.name || order.customerName || 'Valued Customer',
        email: order.customerEmail || (order.deliveryAddress as any)?.email,
        phone: order.customerPhone || order.deliveryAddress?.phone,
      },
      category: 'order_confirmation',
      title,
      body,
      channels,
      orderId: order.id,
      orderNumber: order.id.slice(-6).toUpperCase(),
      actionUrl: `/track-order?orderId=${order.id}`,
      metadata: {
        total: order.total,
        itemCount: totalItems,
        paymentMethod: order.paymentMethod,
        pincode: order.deliveryAddress?.pincode,
      },
    };

    return this.dispatch(payload);
  }

  /**
   * 2. Order Status Update Notification
   */
  async sendOrderStatusUpdate(
    order: Order,
    newStatus: string,
    note?: string,
    channels: NotificationChannel[] = ['push', 'whatsapp', 'sms']
  ): Promise<NotificationDeliveryResult[]> {
    const formattedStatus = newStatus.replace(/_/g, ' ').toUpperCase();
    const title = `Order Status: ${formattedStatus}`;
    const body = note
      ? `Order #${order.id.slice(-6).toUpperCase()} update: ${note}`
      : `Your order #${order.id.slice(-6).toUpperCase()} is now ${formattedStatus.toLowerCase()}.`;

    const payload: NotificationPayload = {
      recipient: {
        userId: (order as any).userId || order.customerId,
        name: order.deliveryAddress?.name || order.customerName || 'Customer',
        email: order.customerEmail || (order.deliveryAddress as any)?.email,
        phone: order.customerPhone || order.deliveryAddress?.phone,
      },
      category: 'order_status',
      title,
      body,
      channels,
      orderId: order.id,
      orderNumber: order.id.slice(-6).toUpperCase(),
      actionUrl: `/track-order?orderId=${order.id}`,
      metadata: { newStatus, previousStatus: order.status },
    };

    return this.dispatch(payload);
  }

  /**
   * 3. Payment Status Notification
   */
  async sendPaymentStatusUpdate(
    order: Order,
    paymentStatus: string,
    transactionId?: string,
    channels: NotificationChannel[] = ['push', 'whatsapp', 'sms', 'email']
  ): Promise<NotificationDeliveryResult[]> {
    const isSuccess = paymentStatus.toLowerCase() === 'paid' || paymentStatus.toLowerCase() === 'success';
    const title = isSuccess ? 'Payment Successful' : 'Payment Status Update';
    const body = isSuccess
      ? `Payment of ₹${order.total.toFixed(0)} for Order #${order.id.slice(-6).toUpperCase()} was received successfully.${transactionId ? ` Ref: ${transactionId}` : ''}`
      : `Payment status for Order #${order.id.slice(-6).toUpperCase()} updated to ${paymentStatus}.`;

    const payload: NotificationPayload = {
      recipient: {
        userId: (order as any).userId || order.customerId,
        name: order.deliveryAddress?.name || order.customerName,
        email: order.customerEmail || (order.deliveryAddress as any)?.email,
        phone: order.customerPhone || order.deliveryAddress?.phone,
      },
      category: 'payment_status',
      title,
      body,
      channels,
      orderId: order.id,
      orderNumber: order.id.slice(-6).toUpperCase(),
      actionUrl: `/track-order?orderId=${order.id}`,
      metadata: { paymentStatus, transactionId, amount: order.total },
    };

    return this.dispatch(payload);
  }

  /**
   * 4. Cancellation Notification
   */
  async sendOrderCancellation(
    order: Order,
    reason?: string,
    channels: NotificationChannel[] = ['push', 'whatsapp', 'sms', 'email']
  ): Promise<NotificationDeliveryResult[]> {
    const title = `Order Cancelled: #${order.id.slice(-6).toUpperCase()}`;
    const body = `Your order has been cancelled.${reason ? ` Reason: ${reason}.` : ''} If payment was completed, your refund is being initiated.`;

    const payload: NotificationPayload = {
      recipient: {
        userId: (order as any).userId || order.customerId,
        name: order.deliveryAddress?.name || order.customerName,
        email: order.customerEmail || (order.deliveryAddress as any)?.email,
        phone: order.customerPhone || order.deliveryAddress?.phone,
      },
      category: 'cancellation',
      title,
      body,
      channels,
      orderId: order.id,
      orderNumber: order.id.slice(-6).toUpperCase(),
      actionUrl: `/track-order?orderId=${order.id}`,
      metadata: { reason, total: order.total },
    };

    return this.dispatch(payload);
  }

  /**
   * 5. Refund Notification
   */
  async sendOrderRefund(
    order: Order,
    refundAmount: number,
    refundId?: string,
    channels: NotificationChannel[] = ['push', 'whatsapp', 'sms', 'email']
  ): Promise<NotificationDeliveryResult[]> {
    const title = `Refund Processed: ₹${refundAmount.toFixed(0)}`;
    const body = `A refund of ₹${refundAmount.toFixed(0)} for Order #${order.id.slice(-6).toUpperCase()} has been processed.${refundId ? ` Transaction ID: ${refundId}.` : ''} Funds will reflect within 2-4 business days.`;

    const payload: NotificationPayload = {
      recipient: {
        userId: (order as any).userId || order.customerId,
        name: order.deliveryAddress?.name || order.customerName,
        email: order.customerEmail || (order.deliveryAddress as any)?.email,
        phone: order.customerPhone || order.deliveryAddress?.phone,
      },
      category: 'refund',
      title,
      body,
      channels,
      orderId: order.id,
      orderNumber: order.id.slice(-6).toUpperCase(),
      actionUrl: `/account?tab=orders`,
      metadata: { refundAmount, refundId },
    };

    return this.dispatch(payload);
  }

  /**
   * 6. Promotional Message Notification
   */
  async sendPromotionalMessage(
    promo: {
      title: string;
      message: string;
      couponCode?: string;
      link?: string;
      targetUsers?: string; // 'all' | user ID
    },
    channels: NotificationChannel[] = ['push', 'whatsapp', 'sms']
  ): Promise<NotificationDeliveryResult[]> {
    const payload: NotificationPayload = {
      recipient: {
        userId: promo.targetUsers || 'all',
      },
      category: 'promotional',
      title: promo.title,
      body: promo.message,
      channels,
      actionUrl: promo.link || '/offers',
      metadata: { couponCode: promo.couponCode },
    };

    return this.dispatch(payload);
  }

  // ================= IN-APP USER NOTIFICATIONS RETRIEVAL ================= //

  async getUserNotifications(userId?: string): Promise<AppNotification[]> {
    const local = getLocalNotifications();
    try {
      const colRef = collection(db, 'notifications');
      let q = query(colRef, orderBy('createdAt', 'desc'), limit(50));
      if (userId) {
        // Query for this user or broadcast 'all'
        q = query(colRef, where('userId', 'in', [userId, 'all']), limit(50));
      }
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const fetched = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as AppNotification));
        saveLocalNotifications(fetched);
        return fetched;
      }
    } catch (e) {
      console.info('Firestore getUserNotifications note:', e);
    }
    return local;
  }

  async markAsRead(notificationId: string): Promise<void> {
    const list = getLocalNotifications();
    const item = list.find((n) => n.id === notificationId);
    if (item) {
      item.read = true;
      saveLocalNotifications(list);
    }
    try {
      await updateDoc(doc(db, 'notifications', notificationId), { read: true });
    } catch (e) {
      console.warn('Firestore markAsRead error:', e);
    }
  }

  async markAllAsRead(userId?: string): Promise<void> {
    const list = getLocalNotifications().map((n) => ({ ...n, read: true }));
    saveLocalNotifications(list);
    // Best-effort batch update or background sync
  }
}

export const notificationService = new NotificationService();
export const pushProvider = new PushProvider();

export async function fetchCustomerNotifications(userId?: string): Promise<AppNotification[]> {
  return notificationService.getUserNotifications(userId);
}

export async function markNotificationAsRead(id: string): Promise<void> {
  return notificationService.markAsRead(id);
}

export async function markAllNotificationsAsRead(userId?: string): Promise<void> {
  return notificationService.markAllAsRead(userId);
}

export function listenToCustomerNotifications(
  userId: string | undefined,
  callback: (notifs: AppNotification[]) => void
): () => void {
  // Initial load from fast cached storage
  notificationService.getUserNotifications(userId).then(callback);

  // Avoid unnecessary persistent listeners if user is not genuinely signed in
  if (!userId || userId === 'cust-demo-user') {
    return () => {};
  }

  try {
    const colRef = collection(db, 'notifications');
    const q = query(colRef, where('userId', 'in', [userId, 'all']), limit(20));
    return onSnapshot(
      q,
      (snap) => {
        const notifs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as AppNotification));
        if (notifs.length > 0) callback(notifs);
      },
      (err) => {
        console.warn('Notification listener note:', err);
      }
    );
  } catch {
    return () => {};
  }
}

