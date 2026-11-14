/**
 * Firebase App Check security initialization
 * Protects backend API and Firestore from abuse, unauthorized bots, and replay attacks.
 */

import { initializeAppCheck, ReCaptchaV3Provider, CustomProvider, AppCheck } from 'firebase/app-check';
import { app } from './config';
import firebaseConfig from '../../firebase-applet-config.json';

let appCheckInstance: AppCheck | null = null;

export function initAppCheck(): AppCheck | null {
  if (typeof window === 'undefined') return null;
  if (appCheckInstance) return appCheckInstance;

  try {
    const siteKey = (firebaseConfig as any).recaptchaSiteKey || '';

    // Only initialize App Check if a valid reCAPTCHA siteKey is provided.
    // Unregistered/fake debug tokens cause Firestore to reject or time out backend connection.
    if (!siteKey || typeof siteKey !== 'string' || siteKey.trim() === '') {
      return null;
    }

    appCheckInstance = initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(siteKey.trim()),
      isTokenAutoRefreshEnabled: true,
    });
    console.info('Firebase App Check initialized with reCAPTCHA v3.');
    return appCheckInstance;
  } catch (err) {
    console.warn('App Check initialization note (graceful fallback active):', err);
  }

  return null;
}
