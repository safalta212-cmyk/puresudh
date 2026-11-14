import React, { useState, useEffect } from 'react';
import {
  Lock,
  Mail,
  User,
  Phone,
  Eye,
  EyeOff,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  ArrowLeft,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { isTemporaryEmail, isTemporaryOrFakePhone, sanitizePhoneInput10, formatIndianPhone } from '../../validation';

interface CustomerLoginPageProps {
  onBackToStore: () => void;
  onNavigate?: (dest: string, profile?: { role: string }) => void;
  onNavigateDashboard?: (profile?: { role: string }) => void;
  initialMode?: 'login' | 'register' | 'forgot-password';
}

export const CustomerLoginPage: React.FC<CustomerLoginPageProps> = ({
  onBackToStore,
  onNavigate,
  onNavigateDashboard,
  initialMode = 'login',
}) => {
  const { login, register, loginWithGoogle, sendPasswordReset, isLoading } = useAuth();
  const { showToast } = useToast();

  const [mode, setMode] = useState<'login' | 'register' | 'forgot-password'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  useEffect(() => {
    setMode(initialMode);
    setFormError(null);
    setResetMessage(null);
  }, [initialMode]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!email || !password) {
      setFormError('Please enter your email address or mobile number, and password.');
      return;
    }

    const isPhoneInput = !email.includes('@') && /^[0-9+() -]+$/.test(email.trim());
    if (isPhoneInput) {
      const phoneCheck = isTemporaryOrFakePhone(email);
      if (phoneCheck.isFake) {
        setFormError(phoneCheck.reason || 'Login blocked: Temporary, virtual, or dummy phone numbers are not permitted.');
        return;
      }
    } else {
      const emailCheck = isTemporaryEmail(email);
      if (emailCheck.isTemporary) {
        setFormError(emailCheck.reason || 'Temporary/disposable email addresses are strictly prohibited.');
        return;
      }
    }

    const result = await login(email, password, 'customer');
    if (result.success) {
      const userRole = result.profile?.role || 'customer';
      const redirectMap: Record<string, string> = {
        admin: '/admin',
        staff: '/staff',
        vendor: '/vendor',
        customer: '/account',
      };
      const dest = redirectMap[userRole] || '/account';
      showToast('Welcome back to PURE SUDH! Signed in successfully.', 'success');
      if (onNavigate) {
        onNavigate(dest, result.profile);
      } else if (onNavigateDashboard && userRole === 'customer') {
        onNavigateDashboard(result.profile);
      } else {
        window.location.href = dest;
      }
    } else {
      setFormError(result.error || 'Invalid credentials. Please verify and try again.');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name || !email || !phone || !password) {
      setFormError('Please fill in all registration fields.');
      return;
    }

    const emailCheck = isTemporaryEmail(email);
    if (emailCheck.isTemporary) {
      setFormError(emailCheck.reason || 'Temporary/disposable emails are not permitted on PURE SUDH.');
      return;
    }

    const phoneCheck = isTemporaryOrFakePhone(phone);
    if (phoneCheck.isFake) {
      setFormError(phoneCheck.reason || 'Please enter a genuine 10-digit mobile number.');
      return;
    }

    if (password.length < 6) {
      setFormError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setFormError('Passwords do not match. Please re-enter.');
      return;
    }

    // Register customer account via AuthContext with server persistence (+91 formatted)
    const result = await register(email, password, name, formatIndianPhone(phone));
    if (result.success) {
      showToast('Customer account created successfully! Welcome to PURE SUDH.', 'success');
      if (onNavigate) {
        onNavigate('account');
      } else if (onNavigateDashboard) {
        onNavigateDashboard();
      } else {
        window.location.href = '/account';
      }
    } else {
      setFormError(result.error || 'Registration failed. Please check your information.');
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setResetMessage(null);

    if (!email) {
      setFormError('Please enter your registered email address.');
      return;
    }

    try {
      const res = await sendPasswordReset(email, 'customer');
      setResetMessage(res.message);
      showToast('Password reset link sent to your email!', 'success');
    } catch (err: any) {
      setFormError(err.message || 'Failed to send password reset email.');
    }
  };

  const handleGoogleLogin = async () => {
    setFormError(null);
    const result = await loginWithGoogle();
    if (result.success) {
      const userRole = result.profile?.role || 'customer';
      const redirectMap: Record<string, string> = {
        admin: '/admin',
        staff: '/staff',
        vendor: '/vendor',
        customer: '/account',
      };
      const dest = redirectMap[userRole] || '/account';
      showToast('Welcome to PURE SUDH! Signed in with Google.', 'success');
      if (onNavigate) {
        onNavigate(dest, result.profile);
      } else if (onNavigateDashboard && userRole === 'customer') {
        onNavigateDashboard(result.profile);
      } else {
        window.location.href = dest;
      }
    } else {
      setFormError(result.error || 'Google sign-in could not be completed.');
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      {/* Return to Store */}
      <div className="max-w-md w-full mx-auto mb-4">
        <button
          type="button"
          onClick={onBackToStore}
          className="inline-flex items-center gap-2 text-xs font-semibold text-stone-600 hover:text-amber-800 transition py-1 px-2.5 rounded-lg hover:bg-stone-100"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Store</span>
        </button>
      </div>

      <div className="max-w-md w-full mx-auto bg-white rounded-3xl shadow-xl border border-stone-200/90 p-6 sm:p-8">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-extrabold font-serif tracking-tight text-stone-900 flex items-center justify-center gap-1.5">
            <span className="text-amber-900">PURE</span>
            <span className="text-emerald-800">SUDH</span>
          </h1>

          <p className="text-xs text-stone-500 font-medium mt-1">
            Pure Food • Zero Preservatives • Direct Farm Delivery
          </p>
        </div>

        {/* Mode Title & Toggle */}
        <div className="border-b border-stone-100 pb-4 mb-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-stone-900">
              {mode === 'login'
                ? 'Customer Sign In'
                : mode === 'register'
                ? 'Create Customer Account'
                : 'Reset Password'}
            </h2>

            {mode !== 'forgot-password' && (
              <div className="flex gap-1 bg-stone-100 p-0.5 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setFormError(null);
                  }}
                  className={`px-3 py-1 rounded-lg transition ${
                    mode === 'login'
                      ? 'bg-white text-stone-900 shadow-xs font-bold'
                      : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setFormError(null);
                  }}
                  className={`px-3 py-1 rounded-lg transition ${
                    mode === 'register'
                      ? 'bg-white text-stone-900 shadow-xs font-bold'
                      : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  Create Account
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Error Feedback */}
        {formError && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-start gap-2 shadow-2xs">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span className="leading-snug">{formError}</span>
          </div>
        )}

        {/* Success Reset Message */}
        {resetMessage && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{resetMessage}</span>
          </div>
        )}

        {/* 1. SIGN IN FORM */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Email Address or Mobile Number
              </label>
              <div className="relative">
                {!email.includes('@') && /^[0-9+()]/.test(email.trim()) ? (
                  <Phone className="w-4 h-4 text-stone-400 absolute left-3.5 top-3 pointer-events-none" />
                ) : (
                  <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-3 pointer-events-none" />
                )}
                <input
                  id="customer-login-email"
                  type="text"
                  value={email ?? ''}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter email or 10-digit mobile number"
                  required
                  autoComplete="username"
                  className="w-full pl-10 pr-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-stone-700">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setMode('forgot-password');
                    setFormError(null);
                  }}
                  className="text-[11px] font-semibold text-amber-800 hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  id="customer-login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password ?? ''}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full pl-10 pr-10 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              id="customer-signin-submit-btn"
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-3 px-4 rounded-xl text-xs sm:text-sm transition shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span>{isLoading ? 'Signing In...' : 'Sign In'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="relative my-3">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-stone-200" />
              </div>
              <div className="relative flex justify-center text-[11px]">
                <span className="bg-white px-2 text-stone-500 font-medium">Or continue with</span>
              </div>
            </div>

            <button
              id="customer-google-signin-btn"
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 bg-white hover:bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm font-semibold text-stone-700 shadow-xs transition hover:border-stone-300 disabled:opacity-50 cursor-pointer"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Continue with Google</span>
            </button>

            <div className="pt-2 text-center">
              <p className="text-xs text-stone-500">
                Don&apos;t have an account yet?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setFormError(null);
                  }}
                  className="font-bold text-amber-800 hover:underline"
                >
                  Create Account
                </button>
              </p>
            </div>
          </form>
        )}

        {/* 2. CREATE ACCOUNT FORM (CUSTOMER ONLY) */}
        {mode === 'register' && (
          <form onSubmit={handleRegister} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-stone-400 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  id="customer-reg-name"
                  type="text"
                  value={name ?? ''}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Sunita Mishra"
                  required
                  className="w-full pl-10 pr-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Mobile Number (India +91)
              </label>
              <div className="flex items-stretch">
                <span className="inline-flex items-center px-3 bg-stone-100 border border-r-0 border-stone-200 rounded-l-xl text-xs sm:text-sm font-bold text-stone-700 select-none">
                  +91
                </span>
                <div className="relative flex-1">
                  <Phone className="w-4 h-4 text-stone-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    id="customer-reg-phone"
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    value={phone ?? ''}
                    onChange={(e) => setPhone(sanitizePhoneInput10(e.target.value))}
                    placeholder="10-digit mobile number"
                    required
                    className="w-full pl-9 pr-3 py-2.5 bg-stone-50 border border-stone-200 rounded-r-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  id="customer-reg-email"
                  type="email"
                  value={email ?? ''}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@gmail.com or name@email.com"
                  required
                  autoComplete="email"
                  className="w-full pl-10 pr-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Create Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  id="customer-reg-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password ?? ''}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                  autoComplete="new-password"
                  className="w-full pl-10 pr-10 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  id="customer-reg-confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword ?? ''}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  required
                  autoComplete="new-password"
                  className="w-full pl-10 pr-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            {/* Zero-Tolerance Security Policy */}
            <div className="p-2.5 bg-amber-50/90 rounded-xl border border-amber-200/70 flex items-start gap-2 text-[11px] text-amber-900">
              <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <span>
                <strong>Verified Account Policy:</strong> Temporary/disposable email addresses and fake numbers are strictly prohibited. Genuine credentials ensure order confirmation and safe delivery.
              </span>
            </div>

            <button
              id="customer-create-account-submit-btn"
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-3 px-4 rounded-xl text-xs sm:text-sm transition shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span>{isLoading ? 'Creating Account...' : 'Create Account'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="pt-2 text-center">
              <p className="text-xs text-stone-500">
                Already registered?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setFormError(null);
                  }}
                  className="font-bold text-amber-800 hover:underline"
                >
                  Sign In here
                </button>
              </p>
            </div>
          </form>
        )}

        {/* 3. FORGOT PASSWORD FORM */}
        {mode === 'forgot-password' && (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <p className="text-xs text-stone-600 leading-relaxed">
              Enter your registered email address. We will send password reset instructions to your inbox.
            </p>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  id="customer-forgot-email"
                  type="email"
                  value={email ?? ''}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@gmail.com or name@email.com"
                  required
                  className="w-full pl-10 pr-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-3 px-4 rounded-xl text-xs sm:text-sm transition shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span>{isLoading ? 'Sending...' : 'Send Password Reset Email'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setFormError(null);
                  setResetMessage(null);
                }}
                className="text-xs font-semibold text-amber-800 hover:underline"
              >
                Back to Sign In
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
