import React, { useState } from 'react';
import {
  ClipboardList,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  Truck,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

interface StaffLoginPageProps {
  onBackToStore: () => void;
  onNavigateDashboard?: (profile?: { role: string }) => void;
}

export const StaffLoginPage: React.FC<StaffLoginPageProps> = ({
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
  const [demoResetActive, setDemoResetActive] = useState(false);
  const [maskedPhoneHint, setMaskedPhoneHint] = useState('');
  const [verifyPhone, setVerifyPhone] = useState('');
  const [newResetPassword, setNewResetPassword] = useState('');
  const [confirmResetPassword, setConfirmResetPassword] = useState('');
  const [submittingReset, setSubmittingReset] = useState(false);

  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setResetMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setFormError('Please enter staff email and operational password.');
      return;
    }

    const result = await login(cleanEmail, password, 'staff');
    if (result.success) {
      showToast('Authenticated into Staff Fulfillment Desk.', 'success');
      if (onNavigateDashboard) {
        onNavigateDashboard(result.profile);
      } else {
        window.location.href = '/staff';
      }
    } else {
      setFormError(result.error || 'Invalid staff credentials. Access denied.');
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setResetMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setFormError('Please enter your staff email address.');
      return;
    }

    try {
      const res = await sendPasswordReset(cleanEmail, 'staff');
      setResetMessage(res.message);
      if (res.mode === 'demo_phone_reset') {
        setDemoResetActive(true);
        setMaskedPhoneHint(res.maskedPhone || 'registered phone');
        showToast('Verify your registered mobile number to set a new password.', 'info');
      } else {
        setDemoResetActive(false);
        showToast('Password reset link sent to your staff email!', 'success');
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
          targetPortal: 'staff',
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
      showToast('Staff password updated!', 'success');
    } catch (err: any) {
      setFormError(err?.message || 'Failed to complete password reset.');
    } finally {
      setSubmittingReset(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-900 flex flex-col justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8 text-stone-100">
      {/* Return to Store */}
      <div className="max-w-md w-full mx-auto mb-4 flex justify-between items-center">
        <button
          type="button"
          onClick={onBackToStore}
          className="inline-flex items-center gap-2 text-xs font-semibold text-stone-400 hover:text-white transition py-1 px-2.5 rounded-lg hover:bg-stone-800"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to Storefront</span>
        </button>

        <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
          <Truck className="w-3.5 h-3.5" />
          Operations Terminal
        </span>
      </div>

      <div className="max-w-md w-full mx-auto bg-stone-800/90 rounded-3xl shadow-2xl border border-stone-700 p-6 sm:p-8 relative overflow-hidden backdrop-blur-md">
        {/* Decorative Top Accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600" />

        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 bg-emerald-950 text-emerald-300 border border-emerald-600/40 px-3 py-1 rounded-full text-[11px] font-bold mb-3">
            <ClipboardList className="w-3.5 h-3.5 text-emerald-400" />
            <span>Operations Portal • Internal Staff Only</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold font-serif tracking-tight text-white flex items-center justify-center gap-1.5">
            <span className="text-amber-400">PURE</span>
            <span className="text-emerald-400">SUDH</span>
          </h1>

          <p className="text-sm font-semibold text-stone-200 mt-1">
            Fulfillment & Operations Desk
          </p>
          <p className="text-xs text-stone-400 mt-0.5">
            Staff Member Sign In
          </p>
        </div>

        {/* Error Feedback */}
        {formError && (
          <div className="mb-5 p-3 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-300 text-xs font-medium flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{formError}</span>
          </div>
        )}

        {/* Reset Success Message */}
        {resetMessage && (
          <div className="mb-5 p-3 rounded-xl bg-emerald-950/70 border border-emerald-800 text-emerald-300 text-xs font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{resetMessage}</span>
          </div>
        )}

        {!isForgotPassword ? (
          <form onSubmit={handleStaffLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1">
                Staff Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-stone-500 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  id="staff-login-email"
                  type="email"
                  value={email ?? ''}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="staff@email.com"
                  required
                  autoComplete="email"
                  className="w-full pl-10 pr-3 py-2.5 bg-stone-900 border border-stone-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-stone-500"
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
                  className="text-[11px] font-semibold text-emerald-400 hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-stone-500 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  id="staff-login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password ?? ''}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full pl-10 pr-10 py-2.5 bg-stone-900 border border-stone-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-stone-500"
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
              id="staff-signin-submit-btn"
              type="submit"
              disabled={isLoading}
              className="w-full mt-3 bg-emerald-600 hover:bg-emerald-500 text-stone-950 font-bold py-3 px-4 rounded-xl text-xs sm:text-sm transition shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <ClipboardList className="w-4 h-4" />
              <span>{isLoading ? 'Verifying Dispatch Role...' : 'Sign In to Operations Desk'}</span>
            </button>
          </form>
        ) : demoResetActive ? (
          <form onSubmit={handleCompleteDemoReset} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1">
                Registered Staff Mobile ({maskedPhoneHint})
              </label>
              <input
                type="tel"
                value={verifyPhone}
                onChange={(e) => {
                  setVerifyPhone(e.target.value);
                  setFormError(null);
                }}
                placeholder="Enter 10-digit registered mobile"
                required
                className="w-full px-3.5 py-2.5 bg-stone-900 border border-stone-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1">
                New Password
              </label>
              <input
                type="password"
                value={newResetPassword}
                onChange={(e) => setNewResetPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                required
                minLength={6}
                className="w-full px-3.5 py-2.5 bg-stone-900 border border-stone-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmResetPassword}
                onChange={(e) => setConfirmResetPassword(e.target.value)}
                placeholder="Re-enter new password"
                required
                minLength={6}
                className="w-full px-3.5 py-2.5 bg-stone-900 border border-stone-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <button
              type="submit"
              disabled={submittingReset}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-stone-950 font-bold py-3 px-4 rounded-xl text-xs sm:text-sm transition shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span>{submittingReset ? 'Updating Password...' : 'Verify & Update Password'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setDemoResetActive(false);
                  setIsForgotPassword(false);
                  setFormError(null);
                  setResetMessage(null);
                }}
                className="text-xs font-semibold text-stone-400 hover:text-white"
              >
                Back to Staff Sign In
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <p className="text-xs text-stone-400 leading-relaxed">
              Enter your registered staff email address to receive password reset instructions.
            </p>

            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1">
                Staff Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-stone-500 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  id="staff-forgot-email"
                  type="email"
                  value={email ?? ''}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setFormError(null);
                    setResetMessage(null);
                  }}
                  placeholder="staff@email.com"
                  required
                  className="w-full pl-10 pr-3 py-2.5 bg-stone-900 border border-stone-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-stone-950 font-bold py-3 px-4 rounded-xl text-xs sm:text-sm transition shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
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
                className="text-xs font-semibold text-stone-400 hover:text-white"
              >
                Back to Staff Sign In
              </button>
            </div>
          </form>
        )}

        <div className="mt-6 pt-4 border-t border-stone-700 text-center">
          <p className="text-[11px] text-stone-400">
            For morning batch updates, dispatch rider coordination, and kitchen packaging operations.
          </p>
        </div>
      </div>
    </div>
  );
};
