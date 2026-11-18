import React, { useState } from 'react';
import {
  Shield,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  KeyRound,
  AlertTriangle,
  Copy,
  Check,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { resolvedFirebaseConfig } from '../../firebase/config';

interface AdminLoginPageProps {
  onBackToStore: () => void;
  onNavigateDashboard?: (profile?: { role: string }) => void;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({
  onBackToStore,
  onNavigateDashboard,
}) => {
  const { login, loginWithGoogle, sendPasswordReset, isLoading } = useAuth();
  const { showToast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [copiedHost, setCopiedHost] = useState(false);

  const currentHostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const isUnauthorizedDomainError = Boolean(
    formError &&
      (formError.includes('auth/unauthorized-domain') ||
        formError.toLowerCase().includes('not authorized in firebase authentication'))
  );

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!email || !password) {
      setFormError('Please enter administrative email and password.');
      return;
    }

    const result = await login(email, password, 'admin');
    if (result.success) {
      showToast('Authenticated as Administrator. Access granted to Admin Console.', 'success');
      if (onNavigateDashboard) {
        onNavigateDashboard(result.profile);
      } else {
        window.location.href = '/admin';
      }
    } else {
      setFormError(result.error || 'Invalid administrator credentials. Access denied.');
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setResetMessage(null);

    if (!email) {
      setFormError('Please enter your administrative email address.');
      return;
    }

    try {
      const res = await sendPasswordReset(email, 'admin');
      setResetMessage(res.message);
      showToast('Administrator password reset email sent!', 'success');
    } catch (err: any) {
      setFormError(err.message || 'Failed to dispatch password reset email.');
    }
  };

  const handleGoogleAdminLogin = async () => {
    setFormError(null);
    const result = await loginWithGoogle('admin');
    if (result.success) {
      showToast('Authenticated as Administrator with Google.', 'success');
      if (onNavigateDashboard) {
        onNavigateDashboard(result.profile);
      } else {
        window.location.href = '/admin';
      }
    } else {
      setFormError(result.error || 'Google Administrator sign-in failed.');
    }
  };

  return (
    <div className="min-h-screen bg-stone-950 flex flex-col justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8 text-stone-100">
      {/* Return to Store */}
      <div className="max-w-md w-full mx-auto mb-4 flex justify-between items-center">
        <button
          type="button"
          onClick={onBackToStore}
          className="inline-flex items-center gap-2 text-xs font-semibold text-stone-400 hover:text-white transition py-1 px-2.5 rounded-lg hover:bg-stone-900"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to Storefront</span>
        </button>

        <span className="text-[11px] font-mono text-stone-500">Security Clearance: LEVEL 1</span>
      </div>

      <div className="max-w-md w-full mx-auto bg-stone-900 rounded-3xl shadow-2xl border border-stone-800 p-6 sm:p-8 relative overflow-hidden">
        {/* Decorative Top Accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700" />

        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 bg-amber-950/80 text-amber-300 border border-amber-500/40 px-3 py-1 rounded-full text-[11px] font-bold mb-3">
            <Shield className="w-3.5 h-3.5 text-amber-400" />
            <span>Admin Portal • Restricted Access</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold font-serif tracking-tight text-white flex items-center justify-center gap-1.5">
            <span className="text-amber-400">PURE</span>
            <span className="text-emerald-400">SUDH</span>
          </h1>

          <p className="text-sm font-semibold text-stone-200 mt-1">
            Enterprise Administration Console
          </p>
          <p className="text-xs text-stone-400 mt-0.5">
            Administrator Secure Sign In
          </p>
        </div>

        {/* Error Feedback */}
        {formError && (
          <div className="mb-5 p-3.5 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-200 text-xs font-medium space-y-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{formError}</span>
            </div>
            {isUnauthorizedDomainError && currentHostname && (
              <div className="mt-2 pt-2 border-t border-rose-800/70 space-y-1.5 text-[11px] text-rose-100">
                <div className="flex items-center justify-between gap-2 bg-stone-950/70 px-2.5 py-1.5 rounded-lg border border-rose-900/60">
                  <span className="font-mono break-all text-amber-300">{currentHostname}</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(currentHostname).catch(() => {});
                      setCopiedHost(true);
                      setTimeout(() => setCopiedHost(false), 2000);
                    }}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-stone-800 hover:bg-stone-700 text-stone-200 text-[10px] font-semibold shrink-0 cursor-pointer"
                  >
                    {copiedHost ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    {copiedHost ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <p className="text-stone-300">
                  Active Project: <strong className="font-mono text-white">{resolvedFirebaseConfig.projectId}</strong> • authDomain: <strong className="font-mono text-white">{resolvedFirebaseConfig.authDomain}</strong>
                </p>
                <p className="text-stone-400">
                  Fix: Add <span className="font-mono text-amber-300">{currentHostname}</span> in Firebase Console → Authentication → Settings → Authorized domains.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Reset Success Message */}
        {resetMessage && (
          <div className="mb-5 p-3 rounded-xl bg-emerald-950/70 border border-emerald-800 text-emerald-300 text-xs font-medium">
            {resetMessage}
          </div>
        )}

        {!isForgotPassword ? (
          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1">
                Admin Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-stone-500 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  id="admin-login-email"
                  type="email"
                  value={email ?? ''}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter admin email address"
                  required
                  autoComplete="email"
                  className="w-full pl-10 pr-3 py-2.5 bg-stone-800/90 border border-stone-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500 placeholder-stone-500"
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
                  className="text-[11px] font-semibold text-amber-400 hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-stone-500 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  id="admin-login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password ?? ''}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full pl-10 pr-10 py-2.5 bg-stone-800/90 border border-stone-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500 placeholder-stone-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-stone-500 hover:text-stone-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              id="admin-signin-submit-btn"
              type="submit"
              disabled={isLoading}
              className="w-full mt-3 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold py-3 px-4 rounded-xl text-xs sm:text-sm transition shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <KeyRound className="w-4 h-4" />
              <span>{isLoading ? 'Authorizing Access...' : 'Sign In as Administrator'}</span>
            </button>

            <div className="relative my-3">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-stone-800" />
              </div>
              <div className="relative flex justify-center text-[11px]">
                <span className="bg-stone-900 px-2 text-stone-500 font-medium">Or</span>
              </div>
            </div>

            <button
              id="admin-google-signin-btn"
              type="button"
              onClick={handleGoogleAdminLogin}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 bg-stone-800 hover:bg-stone-700 border border-stone-700 rounded-xl text-xs sm:text-sm font-semibold text-stone-100 transition disabled:opacity-50 cursor-pointer"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Sign In with Authorized Google Account</span>
            </button>
          </form>
        ) : (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <p className="text-xs text-stone-400 leading-relaxed">
              Enter your registered administrator email address to receive password reset authorization.
            </p>

            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1">
                Admin Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-stone-500 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  id="admin-forgot-email"
                  type="email"
                  value={email ?? ''}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter admin email address"
                  required
                  className="w-full pl-10 pr-3 py-2.5 bg-stone-800/90 border border-stone-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold py-3 px-4 rounded-xl text-xs sm:text-sm transition shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span>{isLoading ? 'Dispatching...' : 'Send Administrator Reset Link'}</span>
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
                className="text-xs font-semibold text-stone-400 hover:text-white"
              >
                Back to Admin Sign In
              </button>
            </div>
          </form>
        )}

        <div className="mt-6 pt-4 border-t border-stone-800 text-center">
          <p className="text-[11px] text-stone-500">
            All administrative access sessions are monitored and cryptographically audited.
          </p>
        </div>
      </div>
    </div>
  );
};
