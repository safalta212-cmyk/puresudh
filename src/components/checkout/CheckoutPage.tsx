import React, { useState, useEffect, useRef } from 'react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useDelivery } from '../../context/DeliveryContext';
import { useToast } from '../../context/ToastContext';
import { Address, PaymentMethod, Order } from '../../types';
import { AddressLocationPickerModal } from '../maps/AddressLocationPickerModal';
import { CheckoutStepsBar, CheckoutStepType } from './CheckoutStepsBar';
import { CartStep } from './steps/CartStep';
import { AddressStep } from './steps/AddressStep';
import { DeliveryStep } from './steps/DeliveryStep';
import { CouponStep } from './steps/CouponStep';
import { PaymentStep } from './steps/PaymentStep';
import { ReviewStep } from './steps/ReviewStep';
import { OrderConfirmationStep } from './steps/OrderConfirmationStep';
import { PaymentFailureModal } from './PaymentFailureModal';
import {
  initializePaymentOrder,
  verifyPaymentOnServer,
  submitOrderWithIdempotency,
} from '../../services/paymentService';
import { validateCartWithServer, ServerValidationResponse } from '../../services/checkoutValidator';
import { notificationService } from '../../services/notifications/notificationService';
import {
  isTemporaryEmail,
  isTemporaryOrFakePhone,
  normalizeIndianPhone10,
  sanitizePhoneInput10,
  formatIndianPhone,
} from '../../validation';
import {
  Lock,
  User,
  Mail,
  Phone,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ShoppingBag,
  Eye,
  EyeOff,
  Truck,
} from 'lucide-react';

interface CheckoutPageProps {
  onOrderPlaced: (order: Order) => void;
  onBackToShopping: () => void;
  onTrackOrder?: (orderId: string) => void;
}

export const CheckoutPage: React.FC<CheckoutPageProps> = ({
  onOrderPlaced,
  onBackToShopping,
  onTrackOrder,
}) => {
  const {
    items,
    subtotal: clientSubtotal,
    couponCode: cartCouponCode,
    discount: clientDiscount,
    applyCoupon,
    removeCoupon,
    updateQuantity,
    removeFromCart,
    clearCart,
  } = useCart();

  const { user, login, register, openAuthModal } = useAuth();
  const {
    pincode: deliveryPincode,
    deliveryArea,
    isDeliverable,
    deliverabilityStatus,
    estimatedDeliveryTime,
    deliveryCharge: baseDeliveryCharge,
    freeDeliveryThreshold,
    setPincode,
  } = useDelivery();
  const { showToast } = useToast();

  // Current Step in the 8-step flow:
  // Cart -> Address -> Delivery -> Coupon -> Payment -> Review -> Place Order -> Confirmation
  const [currentStep, setCurrentStep] = useState<CheckoutStepType>('cart');
  const [allowedStepIndex, setAllowedStepIndex] = useState<number>(0);

  // Form State: Address & Customer Details
  const [name, setName] = useState(user?.displayName || '');
  const [phone, setPhone] = useState(() => normalizeIndianPhone10(user?.phone || ''));
  const [pincode, setAddressPincode] = useState(deliveryPincode || '800001');
  const [addressLine, setAddressLine] = useState('');
  const [landmark, setLandmark] = useState('');
  const [city, setCity] = useState(deliveryArea?.city || 'Patna');
  const [state, setState] = useState(deliveryArea?.state || 'Bihar');
  const [addressType, setAddressType] = useState<'home' | 'work' | 'other'>('home');
  const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);

  // Form State: Delivery & Notes
  const [deliveryType, setDeliveryType] = useState<'express' | 'scheduled'>('express');
  const [selectedSlotId, setSelectedSlotId] = useState<string>('slot-morning-express');
  const [deliveryInstruction, setDeliveryInstruction] = useState<string>('');
  const [specialNotes, setSpecialNotes] = useState<string>('');

  // Form State: Coupon
  const [couponCode, setCouponCode] = useState<string>(cartCouponCode || '');

  // Form State: Payment
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('UPI');
  const [paymentDetails, setPaymentDetails] = useState({
    upiVpa: '',
    cardNumber: '',
    cardExpiry: '',
    cardCvv: '',
    cardName: '',
    selectedBank: 'State Bank of India (SBI)',
  });

  // Authoritative Server-side Verification State (NEVER trust client totals)
  const [serverVerification, setServerVerification] = useState<{
    valid: boolean;
    verifiedItems: any[];
    calculatedSubtotal: number;
    deliveryCharge: number;
    discount: number;
    grandTotal: number;
    estimatedDeliveryTime?: string;
    error?: string;
  } | null>(null);

  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState<boolean>(false);

  // Placed Order State (for Confirmation step)
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);

  // Payment Failure Modal State
  const [paymentFailureModalOpen, setPaymentFailureModalOpen] = useState<boolean>(false);
  const [paymentFailureReason, setPaymentFailureReason] = useState<string>('');

  // Idempotency Key Ref: Generated once per checkout session to prevent duplicate orders
  const idempotencyKeyRef = useRef<string>(
    `ps_idem_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`
  );

  // Inline Authentication State for Guest Visitors
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authConfirmPassword, setAuthConfirmPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authPhone, setAuthPhone] = useState('');
  const [showAuthPassword, setShowAuthPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);

  // Sync profile details when user is authenticated
  useEffect(() => {
    if (user) {
      if (user.displayName && !name) setName(user.displayName);
      if (user.phone && !phone) setPhone(normalizeIndianPhone10(user.phone));
    }
  }, [user]);

  const handleInlineLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (!authEmail || !authPassword) {
      setAuthError('Please enter both email and password.');
      return;
    }
    const emailCheck = isTemporaryEmail(authEmail);
    if (emailCheck.isTemporary) {
      setAuthError(emailCheck.reason || 'Temporary/disposable email addresses are prohibited.');
      return;
    }
    setIsSubmittingAuth(true);
    try {
      const res = await login(authEmail, authPassword, 'customer');
      if (res.success) {
        showToast('Welcome back! Signed in successfully. You can now complete your order.', 'success');
      } else {
        setAuthError(res.error || 'Invalid credentials. Please verify your email and password.');
      }
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const handleInlineRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (!authName.trim() || !authEmail.trim() || !authPhone.trim() || !authPassword) {
      setAuthError('Please fill in all registration fields.');
      return;
    }
    const regEmailCheck = isTemporaryEmail(authEmail);
    if (regEmailCheck.isTemporary) {
      setAuthError(regEmailCheck.reason || 'Temporary/disposable email addresses are prohibited.');
      return;
    }
    const phoneCheck = isTemporaryOrFakePhone(authPhone);
    if (phoneCheck.isFake) {
      setAuthError(phoneCheck.reason || 'Please enter a genuine 10-digit mobile number.');
      return;
    }
    const cleanPhone = formatIndianPhone(authPhone);
    if (authPassword.length < 6) {
      setAuthError('Password must be at least 6 characters long.');
      return;
    }
    if (authPassword !== authConfirmPassword) {
      setAuthError('Passwords do not match.');
      return;
    }
    setIsSubmittingAuth(true);
    try {
      const res = await register(authEmail.trim().toLowerCase(), authPassword, authName.trim(), cleanPhone);
      if (res.success) {
        showToast('Account created successfully! Welcome to PURE SUDH.', 'success');
      } else {
        setAuthError(res.error || 'Registration failed. Please check your details.');
      }
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  // Sync delivery pincode with context
  useEffect(() => {
    if (pincode && pincode.length === 6) {
      setPincode(pincode);
    }
  }, [pincode, setPincode]);

  // Server Price, Inventory & Delivery Verification Function
  const runAuthoritativeServerVerification = async (
    customPincode?: string,
    customCoupon?: string
  ): Promise<ServerValidationResponse | null> => {
    if (!items || items.length === 0) {
      setServerVerification(null);
      return null;
    }

    setIsValidating(true);
    try {
      const targetPincode = customPincode !== undefined ? customPincode : pincode;
      const targetCoupon = customCoupon !== undefined ? customCoupon : couponCode;
      const result = await validateCartWithServer(items, targetPincode, targetCoupon);
      setServerVerification(result);
      return result;
    } catch (err: any) {
      console.warn('Server verification error:', err);
      const fallbackErr: ServerValidationResponse = {
        valid: false,
        error: err?.message || 'Unable to verify cart and delivery details.',
        verifiedItems: [],
        calculatedSubtotal: 0,
        deliveryCharge: 0,
        discount: 0,
        grandTotal: 0,
        estimatedDeliveryTime: '',
      };
      setServerVerification(fallbackErr);
      return fallbackErr;
    } finally {
      setIsValidating(false);
    }
  };

  // Re-verify on items, coupon, or valid 6-digit pincode changes
  useEffect(() => {
    if (pincode && pincode.length > 0 && pincode.length < 6) {
      return;
    }
    runAuthoritativeServerVerification();
  }, [items, couponCode, pincode]);

  // Derived totals strictly preferring authoritative server calculations when valid
  const isVerifiedValid = Boolean(serverVerification?.valid);
  const authoritativeSubtotal = isVerifiedValid
    ? serverVerification!.calculatedSubtotal
    : clientSubtotal;
  const authoritativeDeliveryCharge = isVerifiedValid
    ? serverVerification!.deliveryCharge
    : baseDeliveryCharge;
  const authoritativeDiscount = isVerifiedValid
    ? serverVerification!.discount
    : clientDiscount;
  const authoritativeGrandTotal = isVerifiedValid
    ? serverVerification!.grandTotal
    : Math.max(0, authoritativeSubtotal + authoritativeDeliveryCharge - authoritativeDiscount);
  const authoritativeETA =
    (isVerifiedValid ? serverVerification?.estimatedDeliveryTime : '') ||
    estimatedDeliveryTime ||
    '25-35 mins';

  // Step progression helper
  const goToStep = (step: CheckoutStepType) => {
    const stepOrder: CheckoutStepType[] = [
      'cart',
      'address',
      'delivery',
      'coupon',
      'payment',
      'review',
      'confirmation',
    ];
    const newIdx = stepOrder.indexOf(step);
    setAllowedStepIndex((prev) => Math.max(prev, newIdx));
    setCurrentStep(step);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle Coupon Application
  const handleApplyCoupon = async (code: string): Promise<boolean> => {
    setCouponCode(code);
    const result = await runAuthoritativeServerVerification(undefined, code);
    if (result && result.discount > 0) {
      await applyCoupon(code);
      return true;
    } else {
      setCouponCode('');
      removeCoupon();
      return false;
    }
  };

  const handleRemoveCoupon = () => {
    setCouponCode('');
    removeCoupon();
    runAuthoritativeServerVerification(undefined, '');
  };

  // Place Order Execution (Server-Authoritative with Idempotency)
  const handleExecutePlaceOrder = async () => {
    if (isPlacingOrder) return;
    setIsPlacingOrder(true);

    // MANDATORY AUTHENTICATION CHECK: Order placement is strictly prohibited without an account
    if (!user || !user.uid || user.uid === 'guest_user') {
      showToast('Order place karne ke liye please sign in karein ya naya account banayein.', 'error');
      openAuthModal('login');
      setIsPlacingOrder(false);
      return;
    }

    try {
      // 1. Mandatory Re-verification on server before any transaction is executed
      const verified = await runAuthoritativeServerVerification();
      if (!verified || !verified.valid) {
        showToast(
          verified?.error || 'Cart or pricing verification failed. Please review your order.',
          'error'
        );
        setIsPlacingOrder(false);
        return;
      }

      const isCod = selectedPaymentMethod === 'Cash on Delivery' || selectedPaymentMethod === 'COD';
      let paymentId: string | undefined = undefined;
      let gatewayOrderId: string | undefined = undefined;

      // 2. Online Payment Gateway Authorization
      if (!isCod) {
        try {
          // A. Create Gateway Order on Server
          const gatewayOrder = await initializePaymentOrder({
            amount: verified.grandTotal,
            currency: 'INR',
            receiptId: `rec_${Date.now()}`,
            provider: selectedPaymentMethod,
            customerName: name || user.displayName || 'Customer',
            customerEmail: user.email,
            customerPhone: formatIndianPhone(phone || user.phone || ''),
          });

          gatewayOrderId = gatewayOrder.gatewayOrderId;

          // B. Verify Payment on Server via HMAC Signature & PSP verification
          const verification = await verifyPaymentOnServer({
            gatewayOrderId: gatewayOrder.gatewayOrderId,
            transactionRef: gatewayOrder.transactionRef,
            provider: selectedPaymentMethod,
            serverSignature: gatewayOrder.serverSignature,
            amount: verified.grandTotal,
            paymentDetails: {
              upiVpa: paymentDetails.upiVpa,
              cardLast4: paymentDetails.cardNumber.slice(-4),
              bankName: paymentDetails.selectedBank,
            },
          });

          if (!verification.verified || verification.status !== 'PAID') {
            setPaymentFailureReason(
              verification.failureReason || 'Transaction was declined by bank or PSP.'
            );
            setPaymentFailureModalOpen(true);
            setIsPlacingOrder(false);
            return;
          }

          paymentId = verification.paymentId;
        } catch (gatewayErr: any) {
          setPaymentFailureReason(
            gatewayErr.message || 'Payment gateway connection interrupted. Please try again.'
          );
          setPaymentFailureModalOpen(true);
          setIsPlacingOrder(false);
          return;
        }
      }

      // 3. Submit Authoritative Order with Idempotency Key
      const orderPayload = {
        idempotencyKey: idempotencyKeyRef.current,
        customerId: user.uid,
        customerName: name || user.displayName || 'Customer',
        customerEmail: user.email,
        customerPhone: formatIndianPhone(phone || user.phone || ''),
        items: items.map((i) => ({
          productId: i.product.id,
          quantity: i.quantity,
          weight: i.selectedWeight || i.product.weight,
        })),
        deliveryAddress: {
          name,
          phone: formatIndianPhone(phone || user.phone || ''),
          pincode,
          addressLine,
          landmark,
          city,
          state,
          type: addressType,
        },
        deliverySlotId: deliveryType === 'scheduled' ? selectedSlotId : undefined,
        paymentMethod: selectedPaymentMethod,
        paymentId,
        gatewayOrderId,
        couponCode: couponCode || undefined,
        notes: [deliveryInstruction, specialNotes].filter(Boolean).join(' • '),
        verifiedSummary: verified,
      };

      const result = await submitOrderWithIdempotency(orderPayload);

      if (result.success && result.order) {
        setConfirmedOrder(result.order);
        clearCart();
        onOrderPlaced(result.order);
        goToStep('confirmation');

        // Dispatch notifications via all configured provider channels
        notificationService.sendOrderConfirmation(result.order).catch((e) => {
          console.warn('Order confirmation notification dispatch error:', e);
        });

        if (result.order.paymentStatus === 'Paid') {
          notificationService.sendPaymentStatusUpdate(
            result.order,
            'Paid',
            result.order.paymentId
          ).catch((e) => {
            console.warn('Payment status notification dispatch error:', e);
          });
        }

        showToast(
          `Order #${result.order.orderNumber} placed successfully!`,
          'success'
        );
      } else {
        showToast(result.error || 'Failed to finalize order on server', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'An unexpected error occurred during checkout', 'error');
    } finally {
      setIsPlacingOrder(false);
    }
  };

  // Payment Failure Modal Handlers
  const handleRetryPayment = () => {
    setPaymentFailureModalOpen(false);
    handleExecutePlaceOrder();
  };

  const handleSwitchToCod = () => {
    setSelectedPaymentMethod('Cash on Delivery');
    setPaymentFailureModalOpen(false);
    showToast('Switched to Cash on Delivery. Ready to place order!', 'info');
    goToStep('review');
  };

  const handleChangePaymentMethod = () => {
    setPaymentFailureModalOpen(false);
    goToStep('payment');
  };

  return (
    <div className="min-h-screen bg-stone-50 pb-16">
      {/* 8-Step Visual Stepper Bar */}
      <CheckoutStepsBar
        currentStep={currentStep}
        onStepClick={(s) => goToStep(s)}
        allowedStepIndex={allowedStepIndex}
      />

      <div className="max-w-5xl mx-auto px-3 sm:px-6 pt-6 sm:pt-8">
        {/* If user is not logged in, enforce Account Creation or Sign In */}
        {!user ? (
          <div className="max-w-xl mx-auto my-4 bg-white rounded-3xl border border-amber-200 shadow-xl overflow-hidden animate-in fade-in">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-amber-900 via-amber-800 to-stone-900 text-white p-6 sm:p-7 text-center relative">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-700/60 border border-amber-400/40 flex items-center justify-center mb-3 shadow-md">
                <Lock className="w-7 h-7 text-amber-200" />
              </div>
              <h2 className="text-xl sm:text-2xl font-serif font-bold text-amber-100">
                Sign In or Create Account to Place Order
              </h2>
              <p className="text-xs sm:text-sm text-amber-200/90 mt-1 font-medium">
                सुरक्षित डिलीवरी और लाइव ऑर्डर ट्रैकिंग के लिए अकाउंट आवश्यक है।
              </p>
              <div className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-950/80 border border-amber-500/30 text-amber-300 text-xs font-semibold">
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>{items.length} {items.length === 1 ? 'item' : 'items'} saved in cart • Total: ₹{authoritativeGrandTotal.toFixed(0)}</span>
              </div>
            </div>

            {/* Auth Mode Toggle */}
            <div className="flex border-b border-stone-200 bg-stone-50">
              <button
                type="button"
                id="checkout-auth-login-tab"
                onClick={() => { setAuthTab('login'); setAuthError(null); }}
                className={`flex-1 py-3 text-xs sm:text-sm font-bold transition-all border-b-2 cursor-pointer ${
                  authTab === 'login'
                    ? 'border-amber-800 text-amber-900 bg-white shadow-2xs'
                    : 'border-transparent text-stone-500 hover:text-stone-800'
                }`}
              >
                Sign In (लॉग इन)
              </button>
              <button
                type="button"
                id="checkout-auth-register-tab"
                onClick={() => { setAuthTab('register'); setAuthError(null); }}
                className={`flex-1 py-3 text-xs sm:text-sm font-bold transition-all border-b-2 cursor-pointer ${
                  authTab === 'register'
                    ? 'border-amber-800 text-amber-900 bg-white shadow-2xs'
                    : 'border-transparent text-stone-500 hover:text-stone-800'
                }`}
              >
                Create Account (नया अकाउंट बनाएं)
              </button>
            </div>

            {/* Form Area */}
            <div className="p-6 sm:p-7">
              {authError && (
                <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{authError}</span>
                </div>
              )}

              {authTab === 'login' ? (
                <form onSubmit={handleInlineLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-3 pointer-events-none" />
                      <input
                        id="checkout-auth-email"
                        type="email"
                        required
                        value={authEmail ?? ''}
                        onChange={(e) => setAuthEmail(e.target.value)}
                        placeholder="name@gmail.com or name@email.com"
                        className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-stone-200 bg-stone-50/80 focus:bg-white text-xs sm:text-sm focus:ring-2 focus:ring-amber-600 focus:outline-none transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-3 pointer-events-none" />
                      <input
                        id="checkout-auth-password"
                        type={showAuthPassword ? 'text' : 'password'}
                        required
                        value={authPassword ?? ''}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-stone-200 bg-stone-50/80 focus:bg-white text-xs sm:text-sm focus:ring-2 focus:ring-amber-600 focus:outline-none transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowAuthPassword(!showAuthPassword)}
                        className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-600 cursor-pointer"
                        aria-label="Toggle password visibility"
                      >
                        {showAuthPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    id="checkout-auth-submit-login-btn"
                    type="submit"
                    disabled={isSubmittingAuth}
                    className="w-full py-3.5 px-4 rounded-xl bg-amber-800 hover:bg-amber-900 disabled:opacity-50 text-white font-bold text-xs sm:text-sm transition shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
                  >
                    <span>{isSubmittingAuth ? 'Signing In...' : 'Sign In & Proceed to Order'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                <form onSubmit={handleInlineRegister} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-stone-400 absolute left-3.5 top-3 pointer-events-none" />
                      <input
                        id="checkout-auth-reg-name"
                        type="text"
                        required
                        value={authName ?? ''}
                        onChange={(e) => setAuthName(e.target.value)}
                        placeholder="Aapka Poora Naam"
                        className="w-full pl-10 pr-3 py-2 rounded-xl border border-stone-200 bg-stone-50/80 focus:bg-white text-xs sm:text-sm focus:ring-2 focus:ring-amber-600 focus:outline-none transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                      Mobile Number (India +91)
                    </label>
                    <div className="flex items-stretch">
                      <span className="inline-flex items-center px-3 bg-stone-100 border border-r-0 border-stone-200 rounded-l-xl text-xs sm:text-sm font-bold text-stone-700 select-none">
                        +91
                      </span>
                      <div className="relative flex-1">
                        <Phone className="w-4 h-4 text-stone-400 absolute left-3 top-2.5 pointer-events-none" />
                        <input
                          id="checkout-auth-reg-phone"
                          type="tel"
                          inputMode="numeric"
                          maxLength={10}
                          required
                          value={authPhone ?? ''}
                          onChange={(e) => setAuthPhone(sanitizePhoneInput10(e.target.value))}
                          placeholder="10-digit mobile number"
                          className="w-full pl-9 pr-3 py-2 rounded-r-xl border border-stone-200 bg-stone-50/80 focus:bg-white text-xs sm:text-sm focus:ring-2 focus:ring-amber-600 focus:outline-none transition"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-3 pointer-events-none" />
                      <input
                        id="checkout-auth-reg-email"
                        type="email"
                        required
                        value={authEmail ?? ''}
                        onChange={(e) => setAuthEmail(e.target.value)}
                        placeholder="name@gmail.com or name@email.com"
                        className="w-full pl-10 pr-3 py-2 rounded-xl border border-stone-200 bg-stone-50/80 focus:bg-white text-xs sm:text-sm focus:ring-2 focus:ring-amber-600 focus:outline-none transition"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                        Password (min 6)
                      </label>
                      <input
                        id="checkout-auth-reg-password"
                        type={showAuthPassword ? 'text' : 'password'}
                        required
                        value={authPassword ?? ''}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        placeholder="••••••"
                        className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-50/80 focus:bg-white text-xs sm:text-sm focus:ring-2 focus:ring-amber-600 focus:outline-none transition"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                        Confirm Password
                      </label>
                      <input
                        id="checkout-auth-reg-confirm"
                        type={showAuthPassword ? 'text' : 'password'}
                        required
                        value={authConfirmPassword ?? ''}
                        onChange={(e) => setAuthConfirmPassword(e.target.value)}
                        placeholder="••••••"
                        className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-50/80 focus:bg-white text-xs sm:text-sm focus:ring-2 focus:ring-amber-600 focus:outline-none transition"
                      />
                    </div>
                  </div>

                  <button
                    id="checkout-auth-submit-reg-btn"
                    type="submit"
                    disabled={isSubmittingAuth}
                    className="w-full py-3.5 px-4 mt-2 rounded-xl bg-amber-800 hover:bg-amber-900 disabled:opacity-50 text-white font-bold text-xs sm:text-sm transition shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
                  >
                    <span>{isSubmittingAuth ? 'Creating Account...' : 'Create Account & Place Order'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              )}

              <div className="mt-5 pt-4 border-t border-stone-100 flex items-center justify-center gap-4 text-[11px] text-stone-500">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> 100% Secure
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Truck className="w-3.5 h-3.5 text-emerald-600" /> Live Tracking
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Pure Quality
                </span>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Step 1: Cart */}
            {currentStep === 'cart' && (
              <CartStep
                items={items}
                subtotal={authoritativeSubtotal}
                onUpdateQuantity={updateQuantity}
                onRemoveItem={removeFromCart}
                onProceedToAddress={() => goToStep('address')}
                onContinueShopping={onBackToShopping}
                freeDeliveryThreshold={freeDeliveryThreshold}
              />
            )}

        {/* Step 2: Address */}
        {currentStep === 'address' && (
          <AddressStep
            name={name}
            setName={setName}
            phone={phone}
            setPhone={setPhone}
            pincode={pincode}
            setPincode={setAddressPincode}
            addressLine={addressLine}
            setAddressLine={setAddressLine}
            landmark={landmark}
            setLandmark={setLandmark}
            city={city}
            setCity={setCity}
            state={state}
            setState={setState}
            addressType={addressType}
            setAddressType={setAddressType}
            isDeliverable={isDeliverable}
            deliverabilityStatus={deliverabilityStatus}
            estimatedDeliveryTime={authoritativeETA}
            onOpenMapPicker={() => setIsMapPickerOpen(true)}
            onBackToCart={() => goToStep('cart')}
            onProceedToDelivery={() => goToStep('delivery')}
          />
        )}

        {/* Step 3: Delivery */}
        {currentStep === 'delivery' && (
          <DeliveryStep
            deliveryType={deliveryType}
            setDeliveryType={setDeliveryType}
            selectedSlotId={selectedSlotId}
            setSelectedSlotId={setSelectedSlotId}
            deliveryInstruction={deliveryInstruction}
            setDeliveryInstruction={setDeliveryInstruction}
            specialNotes={specialNotes}
            setSpecialNotes={setSpecialNotes}
            estimatedDeliveryTime={authoritativeETA}
            onBackToAddress={() => goToStep('address')}
            onProceedToCoupon={() => goToStep('coupon')}
          />
        )}

        {/* Step 4: Coupon */}
        {currentStep === 'coupon' && (
          <CouponStep
            couponCode={couponCode}
            onApplyCoupon={handleApplyCoupon}
            onRemoveCoupon={handleRemoveCoupon}
            appliedDiscount={authoritativeDiscount}
            subtotal={authoritativeSubtotal}
            onBackToDelivery={() => goToStep('delivery')}
            onProceedToPayment={() => goToStep('payment')}
          />
        )}

        {/* Step 5: Payment */}
        {currentStep === 'payment' && (
          <PaymentStep
            selectedPaymentMethod={selectedPaymentMethod}
            setSelectedPaymentMethod={setSelectedPaymentMethod}
            grandTotal={authoritativeGrandTotal}
            paymentDetails={paymentDetails}
            setPaymentDetails={setPaymentDetails}
            onBackToCoupon={() => goToStep('coupon')}
            onProceedToReview={() => goToStep('review')}
          />
        )}

        {/* Step 6: Review & Place Order */}
        {currentStep === 'review' && (
          <ReviewStep
            items={items}
            deliveryAddress={{
              name,
              phone,
              pincode,
              addressLine,
              landmark,
              city,
              state,
              type: addressType,
            }}
            deliveryType={deliveryType}
            selectedSlotLabel={deliveryType === 'scheduled' ? 'Scheduled Shift' : undefined}
            estimatedDeliveryTime={authoritativeETA}
            couponCode={couponCode}
            discount={authoritativeDiscount}
            paymentMethod={selectedPaymentMethod}
            subtotal={authoritativeSubtotal}
            deliveryCharge={authoritativeDeliveryCharge}
            grandTotal={authoritativeGrandTotal}
            idempotencyKey={idempotencyKeyRef.current}
            isPlacingOrder={isPlacingOrder}
            onBackToPayment={() => goToStep('payment')}
            onPlaceOrder={handleExecutePlaceOrder}
          />
        )}

        {/* Step 7: Order Confirmation */}
        {currentStep === 'confirmation' && confirmedOrder && (
          <OrderConfirmationStep
            order={confirmedOrder}
            onTrackOrder={(orderNumber) => {
              if (onTrackOrder) {
                onTrackOrder(orderNumber);
              } else {
                onBackToShopping();
              }
            }}
            onBackToShopping={onBackToShopping}
            onOrderUpdated={(updated) => setConfirmedOrder(updated)}
          />
        )}
          </>
        )}
      </div>

      {/* Google Maps Location Pin Modal */}
      <AddressLocationPickerModal
        isOpen={isMapPickerOpen}
        onClose={() => setIsMapPickerOpen(false)}
        initialPincode={pincode}
        onSelectAddress={(picked) => {
          if (picked.pincode) setAddressPincode(picked.pincode);
          if (picked.addressLine) setAddressLine(picked.addressLine);
          if (picked.city) setCity(picked.city);
          if (picked.state) setState(picked.state);
          setIsMapPickerOpen(false);
          showToast('Doorstep location synced with Google Maps', 'success');
        }}
        onSelectLocation={(picked) => {
          if (picked.pincode) setAddressPincode(picked.pincode);
          if (picked.addressLine) setAddressLine(picked.addressLine);
          if (picked.city) setCity(picked.city);
          if (picked.state) setState(picked.state);
          setIsMapPickerOpen(false);
          showToast('Doorstep location synced with Google Maps', 'success');
        }}
      />

      {/* Payment Failure Modal */}
      <PaymentFailureModal
        isOpen={paymentFailureModalOpen}
        onClose={() => setPaymentFailureModalOpen(false)}
        failureReason={paymentFailureReason}
        selectedPaymentMethod={selectedPaymentMethod}
        onRetryPayment={handleRetryPayment}
        onSwitchToCod={handleSwitchToCod}
        onChangePaymentMethod={handleChangePaymentMethod}
        orderTotal={authoritativeGrandTotal}
      />
    </div>
  );
};
