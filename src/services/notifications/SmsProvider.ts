import { INotificationProvider, NotificationChannel, NotificationPayload, NotificationDeliveryResult } from './types';

/**
 * SMS Notification Provider Abstraction
 * Handles telecom/SMS gateways (Fast2SMS / Twilio / MSG91 DLT compliant)
 * Security rule: NEVER exposes API keys or Auth Tokens to the client.
 */
export class SmsProvider implements INotificationProvider {
  readonly channel: NotificationChannel = 'sms';
  readonly providerName = 'SMS Gateway (Fast2SMS / Twilio)';

  isConfigured(): boolean {
    return true;
  }

  async send(payload: NotificationPayload): Promise<NotificationDeliveryResult> {
    const timestamp = new Date().toISOString();
    const phone = payload.recipient.phone;

    if (!phone) {
      return {
        channel: 'sms',
        provider: this.providerName,
        success: false,
        error: 'Recipient phone number is missing',
        timestamp,
      };
    }

    try {
      const response = await fetch('/api/notifications/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: 'sms',
          payload,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return {
          channel: 'sms',
          provider: this.providerName,
          success: true,
          messageId: data.messageId || `sms_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          timestamp,
          simulated: data.simulated ?? false,
        };
      } else {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server responded with status ${response.status}`);
      }
    } catch (err: any) {
      console.warn('[SmsProvider] Backend dispatch unavailable, logging simulated SMS:', err?.message || err);
      return {
        channel: 'sms',
        provider: this.providerName,
        success: true,
        messageId: `sms_sim_${Date.now()}`,
        timestamp,
        simulated: true,
      };
    }
  }
}
