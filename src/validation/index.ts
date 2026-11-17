/**
 * PURE SUDH - Schema & Field Validation Utilities
 * Zero-Tolerance Protection against Temporary/Disposable Emails & Fake Numbers
 */

import { Address, Product, OrderItem } from '../types';

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

/**
 * Known temporary, disposable, 10-minute, burner email domains
 */
export const DISPOSABLE_EMAIL_DOMAINS = new Set([
  'tempmail.com',
  'temp-mail.org',
  'temp-mail.io',
  '10minutemail.com',
  '10minutemail.net',
  'guerrillamail.com',
  'guerrillamail.net',
  'guerrillamail.org',
  'guerrillamail.biz',
  'guerrillamailblock.com',
  'throwawaymail.com',
  'mailinator.com',
  'yopmail.com',
  'yopmail.net',
  'yopmail.fr',
  'sharklasers.com',
  'getnada.com',
  'dispostable.com',
  'fakeinbox.com',
  'trashmail.com',
  'trashmail.net',
  'trashmail.me',
  'trashmail.ws',
  'trash-mail.com',
  'inboxkitten.com',
  'crazymailing.com',
  'generator.email',
  'mohmal.com',
  'emailondeck.com',
  'grr.la',
  'maildrop.cc',
  'mytemp.email',
  'tempr.email',
  'nada.ltd',
  'dropmail.me',
  'fakemail.net',
  'temporary-mail.net',
  'tempinbox.com',
  'burnermail.io',
  'discard.email',
  'disposablemail.com',
  'tempail.com',
  'minutemail.com',
  'throwaway.email',
  'crazymail.com',
  'mailnesia.com',
  'armyspy.com',
  'cuvox.de',
  'dayrep.com',
  'fleckens.hu',
  'gustr.com',
  'jourrapide.com',
  'rhyta.com',
  'superrito.com',
  'teleworm.us',
  'tinemail.com',
  'trbvm.com',
  'tuamaea.com',
  'upgradedmail.com',
  'urhen.com',
  'vmani.com',
  'vomoto.com',
  'vpn-mail.com',
  'walkmail.net',
  'walkmail.ru',
  'wegwerfmail.de',
  'wegwerfmail.net',
  'wegwerfmail.org',
  'whyspam.me',
  'xagloo.com',
  'xemaps.com',
  'xmaily.com',
  'zeroe.ml',
  'zoaxe.com',
  'zoemail.org',
  'zooko.com',
  'boun.cr',
  'deadaddress.com',
  'emailproxsy.com',
  'fastacura.com',
  'getairmail.com',
  'incognitomail.org',
  'kasmail.com',
  'koszmail.pl',
  'meltmail.com',
  'mytempmail.com',
  'noclickemail.com',
  'no-spam.ws',
  'one-time.email',
  'owlpic.com',
  'pookmail.com',
  'safersignup.com',
  'safetymail.info',
  'sendspamhere.com',
  'spambox.us',
  'spamfree24.org',
  'spaml.de',
  'temp-mail.ru',
  'trash-mail.at',
  'tyldd.com',
  'uggsrock.com',
  'veryrealemail.com',
  'yapped.net',
  'cool.fr.nf',
  'jetable.fr.nf',
  'nospam.ze.tc',
  'nomail.xl.cx',
  'mega.zik.dj',
  'speed.1s.fr',
  'courriel.fr.nf',
  'moncourrier.fr.nf',
  'monemail.fr.nf',
  'monmail.fr.nf',
]);

export const ALLOWED_EMAIL_DOMAINS = new Set([
  'gmail.com',
  'googlemail.com',
  'email.com',
  'yahoo.com',
  'yahoo.co.in',
  'yahoo.co.uk',
  'outlook.com',
  'hotmail.com',
  'live.com',
  'msn.com',
  'icloud.com',
  'me.com',
  'mac.com',
  'aol.com',
  'zoho.com',
  'rediffmail.com',
  'proton.me',
  'protonmail.com',
  'puresudh.com',
]);
export const TRUSTED_EMAIL_DOMAINS = ALLOWED_EMAIL_DOMAINS;

/**
 * Placeholder, dummy, keyboard-mash, or fake domains frequently used to create junk accounts
 */
export const DUMMY_OR_FAKE_DOMAINS = new Set([
  'fdf.com',
  'fdf.in',
  'fdf.org',
  'fdf.net',
  'asdf.com',
  'asdf.in',
  'asdf.org',
  'asdfgh.com',
  'test.com',
  'test.in',
  'test.org',
  'testing.com',
  'fake.com',
  'fake.in',
  'fakemail.com',
  'dummy.com',
  'dummy.in',
  'sample.com',
  'example.com',
  'example.org',
  'example.net',
  'invalid.com',
  'none.com',
  'noemail.com',
  'nomail.com',
  'foo.com',
  'bar.com',
  'foobar.com',
  'abc.com',
  'xyz.com',
  'aaa.com',
  'bbb.com',
  'ccc.com',
  '123.com',
  'qwerty.com',
  'qwert.com',
  'asd.com',
  'zxc.com',
  'zxcv.com',
  'dfg.com',
  'hjkl.com',
  'ghjk.com',
  'sdd.com',
  'sdsd.com',
  'dfdf.com',
  'fdfd.com',
  'dsf.com',
  'dsfd.com',
  'sdf.com',
  'jkl.com',
  'klj.com',
  'iop.com',
  'random.com',
]);

/**
 * Helper to identify random keyboard mash (e.g. dsfd, fdf, asdf, zxcv, no vowels in 3+ letters)
 */
export function isKeyboardMashOrGibberish(str: string): boolean {
  if (!str) return true;
  // Clean dots, hyphens, numbers
  const clean = str.toLowerCase().replace(/[._-]/g, '');
  if (clean.length < 2) return true;

  // Identical repeating characters (e.g. 'aaa', 'dddd')
  if (/^(.)\1+$/.test(clean)) return true;

  const lettersOnly = clean.replace(/[^a-z]/g, '');
  // If word has 3+ letters and contains zero vowels (e.g. 'fdf', 'dsfd', 'zxcv', 'bcdf')
  if (lettersOnly.length >= 3 && !/[aeiouy]/.test(lettersOnly)) {
    return true;
  }

  // Keyboard row mashes and common spam clusters
  const keyboardMashes = [
    'asdf', 'dsfd', 'sdfg', 'dfgh', 'fghj', 'ghjk', 'hjkl',
    'qwer', 'wert', 'erty', 'rtyu', 'tyui', 'yuio', 'uiop',
    'zxcv', 'xcvb', 'cvbn', 'vbnm',
    'fdf', 'dfd', 'sds', 'dsd', 'fgf', 'gfg',
  ];
  for (const mash of keyboardMashes) {
    if (lettersOnly === mash || (lettersOnly.length <= 6 && lettersOnly.includes(mash))) {
      return true;
    }
  }

  return false;
}

/**
 * Validate that an email is not from a temporary, disposable, fake, or dummy provider
 */
export function isTemporaryEmail(email: string): { isTemporary: boolean; reason?: string } {
  if (!email || typeof email !== 'string') {
    return { isTemporary: true, reason: 'Email address is required.' };
  }

  // Strip any accidental trailing punctuation (e.g. from copy-pasting a sentence ending in a period)
  const clean = email.trim().toLowerCase().replace(/[.,;:\s]+$/, '');
  const parts = clean.split('@');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return { isTemporary: true, reason: 'Invalid email address format.' };
  }

  const userPart = parts[0];
  const domain = parts[1].replace(/\.+$/, '');

  // 1. Check disposable and burner email domains
  if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) {
    return {
      isTemporary: true,
      reason: 'Temporary and disposable email addresses are not permitted on PURE SUDH.',
    };
  }

  // 2. Check dummy / placeholder domains
  if (DUMMY_OR_FAKE_DOMAINS.has(domain)) {
    return {
      isTemporary: true,
      reason: 'Please enter a genuine, active email address.',
    };
  }

  // 3. Domain structure validation: must have valid format with TLD of at least 2 letters
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/i.test(domain)) {
    return {
      isTemporary: true,
      reason: 'Invalid email domain format. Please enter a valid email address.',
    };
  }

  // 4. Validate username is not pure gibberish, single character, or repetitive dummy letters
  if (userPart.length < 2 || /^(.)\1+$/.test(userPart) || isKeyboardMashOrGibberish(userPart)) {
    return {
      isTemporary: true,
      reason: 'Please enter a valid and active email address.',
    };
  }

  return { isTemporary: false };
}

/**
 * Validate that a phone number is not a fake, dummy, sequential, or temporary virtual number
 */
export function isTemporaryOrFakePhone(phone: string): { isFake: boolean; reason?: string } {
  if (!phone || typeof phone !== 'string') {
    return { isFake: true, reason: 'Mobile number is required.' };
  }

  // Normalize: remove country code (+91) and all non-digit characters
  let clean = phone.replace(/\D/g, '');
  if (clean.startsWith('91') && clean.length === 12) {
    clean = clean.slice(2);
  } else if (clean.startsWith('0') && clean.length === 11) {
    clean = clean.slice(1);
  }

  // 1. Length & Indian mobile starting digit requirement (starts with 6, 7, 8, or 9)
  if (clean.length !== 10) {
    return {
      isFake: true,
      reason: 'Please enter a genuine 10-digit Indian mobile number.',
    };
  }

  if (!/^[6-9]/.test(clean)) {
    return {
      isFake: true,
      reason: 'Mobile numbers in India must start with 6, 7, 8, or 9.',
    };
  }

  // 2. All identical digits (e.g. 9999999999, 8888888888, 7777777777, 0000000000)
  const isAllSame = /^(\d)\1{9}$/.test(clean);
  if (isAllSame) {
    return {
      isFake: true,
      reason: 'Repeated dummy numbers (e.g. 9999999999) are not allowed. Please enter your real mobile number.',
    };
  }

  // 3. Sequential numbers
  const sequentialPatterns = [
    '1234567890',
    '0123456789',
    '9876543210',
    '0987654321',
    '1122334455',
    '9988776655',
    '1212121212',
    '9898989898',
    '9000000000',
    '8000000000',
    '7000000000',
    '6000000000',
  ];

  if (sequentialPatterns.includes(clean)) {
    return {
      isFake: true,
      reason: 'Sequential or placeholder numbers are not allowed. Please enter your active mobile number.',
    };
  }

  // 4. Low entropy check: a legitimate 10-digit mobile number must contain at least 4 unique digits
  const uniqueDigits = new Set(clean.split(''));
  if (uniqueDigits.size < 4) {
    return {
      isFake: true,
      reason: 'The phone number entered appears to be a virtual or test number. Please enter a valid personal number.',
    };
  }

  return { isFake: false };
}

/**
 * Validate customer/vendor registration input strictly
 */
export function validateRegistrationInput(data: {
  email: string;
  phone: string;
  name?: string;
  password?: string;
}): ValidationResult {
  const errors: Record<string, string> = {};

  if (data.name !== undefined && data.name.trim().length < 2) {
    errors.name = 'Full name must be at least 2 characters.';
  }

  if (data.password !== undefined && data.password.length < 6) {
    errors.password = 'Password must be at least 6 characters.';
  }

  const emailCheck = isTemporaryEmail(data.email);
  if (emailCheck.isTemporary) {
    errors.email = emailCheck.reason || 'Temporary email addresses are not permitted.';
  }

  const phoneCheck = isTemporaryOrFakePhone(data.phone);
  if (phoneCheck.isFake) {
    errors.phone = phoneCheck.reason || 'Invalid or temporary mobile number.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateAddress(address: Partial<Address>): ValidationResult {
  const errors: Record<string, string> = {};

  if (!address.name || address.name.trim().length < 2) {
    errors.name = 'Full name must be at least 2 characters';
  }

  const phoneCheck = isTemporaryOrFakePhone(address.phone || '');
  if (phoneCheck.isFake) {
    errors.phone = phoneCheck.reason || 'Please enter a valid 10-digit mobile number';
  }

  const pincodeRegex = /^[1-9][0-9]{5}$/;
  if (!address.pincode || !pincodeRegex.test(address.pincode.trim())) {
    errors.pincode = 'Please enter a valid 6-digit PIN code';
  }

  if (!address.addressLine || address.addressLine.trim().length < 5) {
    errors.addressLine = 'Street address must be at least 5 characters';
  }

  if (!address.city || address.city.trim().length < 2) {
    errors.city = 'City is required';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateOrderInput(data: {
  customerId?: string;
  items: OrderItem[];
  address: Partial<Address>;
  paymentMethod?: string;
}): ValidationResult {
  const errors: Record<string, string> = {};

  if (!data.items || data.items.length === 0) {
    errors.items = 'Your cart is empty. Add fresh items to proceed.';
  }

  const addressValidation = validateAddress(data.address);
  if (!addressValidation.isValid) {
    Object.assign(errors, addressValidation.errors);
  }

  if (!data.paymentMethod) {
    errors.paymentMethod = 'Please select a payment method.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateProduct(product: Partial<Product>): ValidationResult {
  const errors: Record<string, string> = {};

  if (!product.name || product.name.trim().length < 3) {
    errors.name = 'Product name is required (min 3 chars)';
  }
  if (!product.categoryId) {
    errors.categoryId = 'Please select a category';
  }
  if (product.price === undefined || product.price <= 0) {
    errors.price = 'Price must be greater than 0';
  }
  if (product.stockQuantity === undefined || product.stockQuantity < 0) {
    errors.stockQuantity = 'Stock quantity cannot be negative';
  }
  if (!product.weight || product.weight.trim().length === 0) {
    errors.weight = 'Weight/Unit information is required (e.g. 500g, 1L)';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateVendorRegistration(data: {
  name: string;
  ownerName: string;
  email: string;
  phone: string;
  fssaiNumber: string;
  pincode: string;
}): ValidationResult {
  const errors: Record<string, string> = {};

  if (!data.name || data.name.trim().length < 3) {
    errors.name = 'Business / Farm name must be at least 3 characters';
  }
  if (!data.ownerName || data.ownerName.trim().length < 3) {
    errors.ownerName = 'Owner name is required';
  }

  const emailCheck = isTemporaryEmail(data.email);
  if (emailCheck.isTemporary) {
    errors.email = emailCheck.reason || 'Temporary email addresses are not permitted.';
  }

  const phoneCheck = isTemporaryOrFakePhone(data.phone);
  if (phoneCheck.isFake) {
    errors.phone = phoneCheck.reason || 'Valid 10-digit mobile number required';
  }

  if (!data.fssaiNumber || data.fssaiNumber.trim().length < 10) {
    errors.fssaiNumber = 'Valid FSSAI license or registration number required';
  }
  if (!data.pincode || !/^[1-9][0-9]{5}$/.test(data.pincode.trim())) {
    errors.pincode = 'Valid 6-digit PIN code required';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
