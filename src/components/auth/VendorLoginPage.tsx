import React, { useState } from 'react';
import {
  Store,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  Building2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

interface VendorLoginPageProps {
  onBackToStore: () => void;
  onNavigateDashboard?: () => void;
  onNavigateRegister?: () => void;
}

export const VendorLoginPage: React.FC<VendorLoginPageProps> = ({
  onBackToStore,
  onNavigateDashboard,
  onNavigateRegister,
}) => {
  const { login, sendPasswordReset, isLoading } = useAuth();
  const { showToast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const handleVendorLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!email || !password) {
      setFormError('Please enter vendor email and partner password.');
      return;
    }

    // Call server-side login validate first to enforce RBAC
    try {
      const serverRes = await fetch('/api/auth/login-validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), targetPortal: 'vendor' }),
      });
      const data = await serverRes.json();
      if (!serverRes.ok || !data.authorized) {
        setFormError(data.error || 'Access Denied: Vendor Partner credentials required.');
        return;
      }
    } catch (apiErr: any) {
      console.warn('Server login validation note:', apiErr.message);
    }

    const result = await login(email, password, 'vendor');
    if (result.success) {
      showToast('Welcome to your Vendor Partner Hub!', 'success');
      if (onNavigateDashboard) {
        onNavigateDashboard();
      } else {
        window.location.href = '/vendor';
      }
    } else {
      setFormError(result.error || 'Invalid vendor credentials. Access denied.');
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setResetMessage(null);

    if (!email) {
      setFormError('Please enter your vendor partner email address.');
      return;
    }

    try {
      const res = await sendPasswordReset(email);
      setResetMessage(res.message);
      showToast('Password reset link sent to your vendor email!', 'success');
    } catch (err: any) {
      setFormError(err.message || 'Failed to dispatch password reset email.');
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] flex flex-col justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8 text-stone-900">
      {/* Return to Store */}
      <div className="max-w-md w-full mx-auto mb-4 flex justify-between items-center">
        <button
          type="button"
          onClick={onBackToStore}
          className="inline-flex items-center gap-2 text-xs font-semibold text-stone-600 hover:text-amber-800 transition py-1 px-2.5 rounded-lg hover:bg-stone-200/60"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to Storefront</span>
        </button>

        <span className="text-[11px] font-semibold text-amber-800 flex items-center gap-1">
          <Store className="w-3.5 h-3.5" />
          Partner Marketplace
        </span>
      </div>

      <div className="max-w-md w-full mx-auto bg-white rounded-3xl shadow-xl border border-stone-200 p-6 sm:p-8 relative overflow-hidden">
        {/* Decorative Top Accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-600 via-amber-700 to-emerald-700" />

        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-900 border border-amber-200 px-3 py-1 rounded-full text-[11px] font-bold mb-3">
            <Building2 className="w-3.5 h-3.5 text-amber-700" />
            <span>Vendor Portal • Partner Access</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold font-serif tracking-tight text-stone-900 flex items-center justify-center gap-1.5">
            <span className="text-amber-900">PURE</span>
            <span className="text-emerald-800">SUDH</span>
          </h1>

          <p className="text-sm font-semibold text-stone-800 mt-1">
            Artisan Kitchens & Dairy Partner Hub
          </p>
          <p className="text-xs text-stone-500 mt-0.5">
            Vendor Partner Sign In
          </p>
        </div>

        {/* Error Feedback */}
        {formError && (
          <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{formError}</span>
          </div>
        )}

        {/* Reset Success Message */}
        {resetMessage && (
          <div className="mb-5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{resetMessage}</span>
          </div>
        )}

        {!isForgotPassword ? (
          <form onSubmit={handleVendorLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Vendor Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  id="vendor-login-email"
                  type="email"
                  value={email ?? ''}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vendor@email.com"
                  required
                  autoComplete="email"
                  className="w-full pl-10 pr-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500 placeholder-stone-400"
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
                    setIsForgotPassword(true);
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
                  id="vendor-login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password ?? ''}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full pl-10 pr-10 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500 placeholder-stone-400"
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
              id="vendor-signin-submit-btn"
              type="submit"
              disabled={isLoading}
              className="w-full mt-3 bg-amber-800 hover:bg-amber-900 text-white font-bold py-3 px-4 rounded-xl text-xs sm:text-sm transition shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Store className="w-4 h-4" />
              <span>{isLoading ? 'Verifying Vendor Partner...' : 'Sign In to Vendor Hub'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* Link to Vendor Registration */}
            <div className="pt-3 border-t border-stone-100 text-center space-y-2">
              <p className="text-xs text-stone-600">
                Want to sell your homemade sweets or dairy products?
              </p>
              <button
                type="button"
                onClick={() => {
                  if (onNavigateRegister) {
                    onNavigateRegister();
                  } else {
                    window.location.href = '/vendor-register';
                  }
                }}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 hover:text-amber-900 bg-amber-50 hover:bg-amber-100/80 px-3.5 py-1.5 rounded-xl border border-amber-200 transition"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                <span>Apply as a Vendor Partner</span>
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <p className="text-xs text-stone-600 leading-relaxed">
              Enter your registered vendor partner email address to receive password reset instructions.
            </p>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Vendor Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  id="vendor-forgot-email"
                  type="email"
                  value={email ?? ''}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vendor@email.com"
                  required
                  className="w-full pl-10 pr-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-amber-800 hover:bg-amber-900 text-white font-bold py-3 px-4 rounded-xl text-xs sm:text-sm transition shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span>{isLoading ? 'Dispatching...' : 'Send Vendor Reset Link'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsForgotPassword(false);
                  setFormError(null);
                  setResetMessage(null);
                }}
                className="text-xs font-semibold text-stone-500 hover:text-stone-800"
              >
                Back to Vendor Sign In
              </button>
            </div>
          </form>
        )}

        <div className="mt-6 pt-4 border-t border-stone-100 text-center">
          <p className="text-[11px] text-stone-400">
            For registered home chefs, confectioners, and dairy farm partners across Bihar.
          </p>
        </div>
      </div>
    </div>
  );
};
