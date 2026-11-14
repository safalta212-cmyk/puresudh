export type NotificationChannel = 'email' | 'sms' | 'whatsapp' | 'push';

export type NotificationCategory =
  | 'order_confirmation'
  | 'order_status'
  | 'payment_status'
  | 'cancellation'
  | 'refund'
  | 'promotional';

export interface NotificationRecipient {
  userId?: string;
  name?: string;
  email?: string;
  phone?: string;
  fcmToken?: string;
}

export interface NotificationPayload {
  id?: string;
  recipient: NotificationRecipient;
  category: NotificationCategory;
  title: string;
  body: string;
  message?: string; // Optional alias for body
  channels: NotificationChannel[];
  orderId?: string;
  orderNumber?: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
  timestamp?: string;
}

export interface NotificationDeliveryResult {
  channel: NotificationChannel;
  provider: string;
  success: boolean;
  messageId?: string;
  error?: string;
  timestamp: string;
  simulated?: boolean;
}

export interface INotificationProvider {
  readonly channel: NotificationChannel;
  readonly providerName: string;
  isConfigured(): boolean;
  send(payload: NotificationPayload): Promise<NotificationDeliveryResult>;
}

export interface ProviderStatus {
  channel: NotificationChannel;
  providerName: string;
  configured: boolean;
  serviceReady: boolean;
  description: string;
}
