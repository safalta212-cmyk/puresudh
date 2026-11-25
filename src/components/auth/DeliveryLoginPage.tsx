import React, { useEffect, useState } from 'react';
import {
  Truck,
  Lock,
  Mail,
  Phone,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  Navigation,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Copy,
  Check,
} from 'lucide-react';
import { verifyPasswordResetCode, confirmPasswordReset } from 'firebase/auth';
import { auth, resolvedFirebaseConfig } from '../../firebase/config';
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

  // Demo-account mobile verification reset step
  const [demoResetActive, setDemoResetActive] = useState(false);
  const [maskedPhoneHint, setMaskedPhoneHint] = useState<string>('');
  const [verifyPhone, setVerifyPhone] = useState('');
  const [newResetPassword, setNewResetPassword] = useState('');
  const [confirmResetPassword, setConfirmResetPassword] = useState('');
  const [submittingReset, setSubmittingReset] = useState(false);

  // Firebase OOB action link handler (?mode=resetPassword&oobCode=...)
  const [oobCode, setOobCode] = useState<string | null>(null);
  const [oobEmail, setOobEmail] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    const code = params.get('oobCode');
    if (mode === 'resetPassword' && code) {
      verifyPasswordResetCode(auth, code)
        .then((verifiedEmail) => {
          setOobCode(code);
          setOobEmail(verifiedEmail);
          setEmail(verifiedEmail);
          setIsForgotPassword(true);
          setResetMessage(`Reset link verified for ${verifiedEmail}. Set your new password below.`);
        })
        .catch(() => {
          setFormError('This password reset link is invalid or has expired. Please request a new reset link.');
          setIsForgotPassword(true);
        });
    }
  }, []);

  const handleDeliveryLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setResetMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setFormError('Please enter your delivery rider email and password.');
      return;
    }

    const result = await login(cleanEmail, password, 'delivery');
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

  const handleGoogleDeliveryLogin = async () => {
    setFormError(null);
    setResetMessage(null);
    const result = await loginWithGoogle('delivery');
    if (result.success) {
      showToast('Signed in to Delivery Rider GPS Hub with Google.', 'success');
      if (onNavigateDashboard) {
        onNavigateDashboard(result.profile);
      } else {
        window.location.href = '/delivery';
      }
    } else {
      setFormError(result.error || 'Google Delivery Partner sign-in failed.');
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setResetMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setFormError('Please enter your registered rider email address.');
      return;
    }

    try {
      const res = await sendPasswordReset(cleanEmail, 'delivery');
      setResetMessage(res.message);
      if (res.mode === 'demo_phone_reset') {
        setDemoResetActive(true);
        setMaskedPhoneHint(res.maskedPhone || 'registered phone');
        showToast('Verify your registered mobile number to set a new password.', 'info');
      } else {
        setDemoResetActive(false);
        showToast('Password reset instructions processed!', 'success');
      }
    } catch (err: any) {
      setDemoResetActive(false);
      setFormError(err?.message || 'Failed to dispatch password reset email.');
    }
  };

  const handleCompleteDemoReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (newResetPassword.length < 6) {
      setFormError('New password must be at least 6 characters long.');
      return;
    }
    if (newResetPassword !== confirmResetPassword) {
      setFormError('Passwords do not match.');
      return;
    }

    setSubmittingReset(true);
    try {
      const reqRes = await fetch('/api/auth/request-demo-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          phone: verifyPhone.trim(),
          targetPortal: 'delivery',
        }),
      });
      const reqData = await reqRes.json().catch(() => null);
      if (!reqRes.ok || !reqData?.success || !reqData?.resetToken) {
        throw new Error(reqData?.error || 'Could not verify registered mobile number.');
      }

      const compRes = await fetch('/api/auth/complete-demo-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          resetToken: reqData.resetToken,
          newPassword: newResetPassword,
        }),
      });
      const compData = await compRes.json().catch(() => null);
      if (!compRes.ok || !compData?.success) {
        throw new Error(compData?.error || 'Failed to update password.');
      }

      setDemoResetActive(false);
      setIsForgotPassword(false);
      setVerifyPhone('');
      setNewResetPassword('');
      setConfirmResetPassword('');
      setPassword('');
      setResetMessage(compData.message || 'Password updated! Sign in with your new password.');
      showToast('Delivery rider password updated!', 'success');
    } catch (err: any) {
      setFormError(err?.message || 'Failed to complete password reset.');
    } finally {
      setSubmittingReset(false);
    }
  };

  const handleCompleteFirebaseOobReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oobCode) return;
    setFormError(null);

    if (newResetPassword.length < 6) {
      setFormError('New password must be at least 6 characters long.');
      return;
    }
    if (newResetPassword !== confirmResetPassword) {
      setFormError('Passwords do not match.');
      return;
    }

    setSubmittingReset(true);
    try {
      await confirmPasswordReset(auth, oobCode, newResetPassword);
      const updatedMsg = `Password reset completed for ${oobEmail || email}. You can now sign in.`;
      setOobCode(null);
      setOobEmail(null);
      setIsForgotPassword(false);
      setNewResetPassword('');
      setConfirmResetPassword('');
      setPassword('');
      setResetMessage(updatedMsg);
      showToast('Password updated! Please sign in.', 'success');
      try {
        window.history.replaceState(null, '', '/delivery/login');
      } catch {}
    } catch (err: any) {
      setFormError(err?.message || 'Failed to confirm new password. The reset link may have expired.');
    } finally {
      setSubmittingReset(false);
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
          <div className="mb-5 p-3.5 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-200 text-xs font-medium space-y-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
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

        {resetMessage && (
          <div className="mb-5 p-3 rounded-xl bg-emerald-950/70 border border-emerald-800 text-emerald-300 text-xs font-medium flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
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
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setFormError(null);
                  }}
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
                    setDemoResetActive(false);
                    setFormError(null);
                    setResetMessage(null);
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

            <div className="relative my-3">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-stone-700" />
              </div>
              <div className="relative flex justify-center text-[11px]">
                <span className="bg-stone-800 px-2 text-stone-400 font-medium">Or</span>
              </div>
            </div>

            <button
              id="delivery-google-signin-btn"
              type="button"
              onClick={handleGoogleDeliveryLogin}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 bg-stone-900 hover:bg-stone-700 border border-stone-600 rounded-xl text-xs sm:text-sm font-semibold text-stone-100 transition disabled:opacity-50 cursor-pointer"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Sign In with Authorized Google Account</span>
            </button>
          </form>
        ) : oobCode ? (
          <form onSubmit={handleCompleteFirebaseOobReset} className="space-y-4">
            <p className="text-xs text-stone-300 leading-relaxed">
              Set a new password for <span className="font-semibold text-amber-300">{oobEmail || email}</span>.
            </p>
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1">
                New Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-stone-500 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  id="delivery-oob-new-password"
                  type="password"
                  value={newResetPassword}
                  onChange={(e) => setNewResetPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  required
                  minLength={6}
                  className="w-full pl-10 pr-3 py-2.5 bg-stone-900 border border-stone-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-stone-500 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  id="delivery-oob-confirm-password"
                  type="password"
                  value={confirmResetPassword}
                  onChange={(e) => setConfirmResetPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  required
                  minLength={6}
                  className="w-full pl-10 pr-3 py-2.5 bg-stone-900 border border-stone-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={submittingReset}
              className="w-full bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold py-3 px-4 rounded-xl text-xs sm:text-sm transition shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <KeyRound className="w-4 h-4" />
              <span>{submittingReset ? 'Updating Password...' : 'Save New Password'}</span>
            </button>
          </form>
        ) : demoResetActive ? (
          <form onSubmit={handleCompleteDemoReset} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1">
                Registered Rider Mobile ({maskedPhoneHint})
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-stone-500 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  id="delivery-demo-verify-phone"
                  type="tel"
                  value={verifyPhone}
                  onChange={(e) => {
                    setVerifyPhone(e.target.value);
                    setFormError(null);
                  }}
                  placeholder="Enter 10-digit registered mobile"
                  required
                  className="w-full pl-10 pr-3 py-2.5 bg-stone-900 border border-stone-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1">
                New Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-stone-500 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  id="delivery-demo-new-password"
                  type="password"
                  value={newResetPassword}
                  onChange={(e) => setNewResetPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  required
                  minLength={6}
                  className="w-full pl-10 pr-3 py-2.5 bg-stone-900 border border-stone-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-stone-500 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  id="delivery-demo-confirm-password"
                  type="password"
                  value={confirmResetPassword}
                  onChange={(e) => setConfirmResetPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  required
                  minLength={6}
                  className="w-full pl-10 pr-3 py-2.5 bg-stone-900 border border-stone-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
            <button
              id="delivery-demo-reset-submit-btn"
              type="submit"
              disabled={submittingReset}
              className="w-full bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold py-3 px-4 rounded-xl text-xs sm:text-sm transition shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <KeyRound className="w-4 h-4" />
              <span>{submittingReset ? 'Updating Password...' : 'Verify & Update Password'}</span>
            </button>
            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => {
                  setDemoResetActive(false);
                  setFormError(null);
                  setResetMessage(null);
                }}
                className="text-xs font-semibold text-stone-400 hover:text-white cursor-pointer mr-4"
              >
                Try Different Email
              </button>
              <button
                type="button"
                onClick={() => {
                  setDemoResetActive(false);
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
                  id="delivery-forgot-email"
                  type="email"
                  value={email ?? ''}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setFormError(null);
                    setResetMessage(null);
                  }}
                  placeholder="delivery@email.com"
                  required
                  autoComplete="email"
                  className="w-full pl-10 pr-3 py-2.5 bg-stone-900 border border-stone-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
            <button
              id="delivery-forgot-submit-btn"
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
                  setDemoResetActive(false);
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
