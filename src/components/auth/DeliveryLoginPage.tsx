import React, { useState } from 'react';
import {
  Truck,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  Navigation,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

interface DeliveryLoginPageProps {
  onBackToStore: () => void;
  onNavigateDashboard?: (profile?: { role: string }) => void;
}

export const DeliveryLoginPage: React.FC<DeliveryLoginPageProps> = ({
  onBackToStore,
  onNavigateDashboard,
}) => {
  const { login, sendPasswordReset, isLoading } = useAuth();
  const { showToast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const handleDeliveryLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!email || !password) {
      setFormError('Please enter your delivery rider email and password.');
      return;
    }

    const result = await login(email, password, 'delivery');
    if (result.success) {
      showToast('Signed in to Delivery Rider GPS Hub.', 'success');
      if (onNavigateDashboard) {
        onNavigateDashboard(result.profile);
      } else {
        window.location.href = '/delivery';
      }
    } else {
      setFormError(result.error || 'Invalid delivery credentials. Access denied.');
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setResetMessage(null);

    if (!email) {
      setFormError('Please enter your registered rider email address.');
      return;
    }

    try {
      const res = await sendPasswordReset(email, 'delivery');
      setResetMessage(res.message);
      showToast('Password reset link sent!', 'success');
    } catch (err: any) {
      setFormError(err.message || 'Failed to dispatch password reset email.');
    }
  };

  return (
    <div className="min-h-screen bg-stone-900 flex flex-col justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8 text-stone-100">
      <div className="max-w-md w-full mx-auto mb-4 flex justify-between items-center">
        <button
          type="button"
          onClick={onBackToStore}
          className="inline-flex items-center gap-2 text-xs font-semibold text-stone-400 hover:text-white transition py-1.5 px-2.5 rounded-lg hover:bg-stone-800 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to Storefront</span>
        </button>

        <span className="text-[11px] font-mono text-amber-400 flex items-center gap-1">
          <Navigation className="w-3.5 h-3.5" />
          Fleet GPS App
        </span>
      </div>

      <div className="max-w-md w-full mx-auto bg-stone-800/90 rounded-3xl shadow-2xl border border-stone-700 p-6 sm:p-8 relative overflow-hidden backdrop-blur-md">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-emerald-500 to-amber-500" />

        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 bg-amber-950 text-amber-300 border border-amber-600/40 px-3 py-1 rounded-full text-[11px] font-bold mb-3">
            <Truck className="w-3.5 h-3.5 text-amber-400" />
            <span>Delivery Fleet Portal • Live GPS</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold font-serif tracking-tight text-white flex items-center justify-center gap-1.5">
            <span className="text-amber-400">PURE</span>
            <span className="text-emerald-400">SUDH</span>
          </h1>

          <p className="text-sm font-semibold text-stone-200 mt-1">
            Delivery Partner Sign In
          </p>
          <p className="text-xs text-stone-400 mt-0.5">
            Access assigned deliveries and real-time GPS route sharing
          </p>
        </div>

        {formError && (
          <div className="mb-5 p-3 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-300 text-xs font-medium flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{formError}</span>
          </div>
        )}

        {resetMessage && (
          <div className="mb-5 p-3 rounded-xl bg-emerald-950/70 border border-emerald-800 text-emerald-300 text-xs font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{resetMessage}</span>
          </div>
        )}

        {!isForgotPassword ? (
          <form onSubmit={handleDeliveryLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1">
                Rider Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-stone-500 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  id="delivery-login-email"
                  type="email"
                  value={email ?? ''}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="delivery@email.com"
                  required
                  autoComplete="email"
                  className="w-full pl-10 pr-3 py-2.5 bg-stone-900 border border-stone-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500 placeholder-stone-500"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-stone-300">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotPassword(true);
                    setFormError(null);
                  }}
                  className="text-[11px] font-semibold text-amber-400 hover:underline cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-stone-500 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  id="delivery-login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password ?? ''}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full pl-10 pr-10 py-2.5 bg-stone-900 border border-stone-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500 placeholder-stone-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-stone-500 hover:text-stone-300 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              id="delivery-signin-submit-btn"
              type="submit"
              disabled={isLoading}
              className="w-full mt-3 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold py-3 px-4 rounded-xl text-xs sm:text-sm transition shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Navigation className="w-4 h-4" />
              <span>{isLoading ? 'Verifying Rider Access...' : 'Sign In to Delivery Hub'}</span>
            </button>
          </form>
        ) : (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <p className="text-xs text-stone-400 leading-relaxed">
              Enter your registered delivery partner email to receive password reset instructions.
            </p>
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1">
                Rider Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-stone-500 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  type="email"
                  value={email ?? ''}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="delivery@email.com"
                  required
                  className="w-full pl-10 pr-3 py-2.5 bg-stone-900 border border-stone-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold py-3 px-4 rounded-xl text-xs sm:text-sm transition shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span>{isLoading ? 'Dispatching...' : 'Send Password Reset Link'}</span>
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
                className="text-xs font-semibold text-stone-400 hover:text-white cursor-pointer"
              >
                Back to Rider Sign In
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
