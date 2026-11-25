import React, { useEffect, useState } from 'react';
import { Lock, Eye, EyeOff, KeyRound, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { verifyPasswordResetCode, confirmPasswordReset } from 'firebase/auth';
import { auth } from '../../firebase/config';
import { useToast } from '../../context/ToastContext';

interface PasswordResetActionModalProps {
  disabled?: boolean;
  onResetCompleted?: (email: string) => void;
}

function stripResetQueryParams() {
  if (typeof window === 'undefined') return;
  try {
    const url = new URL(window.location.href);
    url.searchParams.delete('mode');
    url.searchParams.delete('oobCode');
    url.searchParams.delete('apiKey');
    url.searchParams.delete('lang');
    const cleanSearch = url.searchParams.toString();
    const nextUrl = `${url.pathname}${cleanSearch ? `?${cleanSearch}` : ''}${url.hash || ''}`;
    window.history.replaceState(null, '', nextUrl);
  } catch {
    // Ignore history restrictions
  }
}

export const PasswordResetActionModal: React.FC<PasswordResetActionModalProps> = ({
  disabled = false,
  onResetCompleted,
}) => {
  const { showToast } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [oobCode, setOobCode] = useState<string | null>(null);
  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completedEmail, setCompletedEmail] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (disabled || typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    const code = params.get('oobCode');

    if (mode !== 'resetPassword' || !code) return;

    let cancelled = false;
    setIsOpen(true);
    setIsVerifying(true);
    setError(null);
    setCompletedEmail(null);

    verifyPasswordResetCode(auth, code)
      .then((email) => {
        if (cancelled) return;
        setOobCode(code);
        setVerifiedEmail(email);
      })
      .catch(() => {
        if (cancelled) return;
        setOobCode(null);
        setError('This password reset link is invalid or has expired. Please request a new password reset link.');
      })
      .finally(() => {
        if (!cancelled) setIsVerifying(false);
      });

    return () => {
      cancelled = true;
    };
  }, [disabled]);

  if (!isOpen || disabled) return null;

  const handleClose = () => {
    setIsOpen(false);
    setError(null);
    setNewPassword('');
    setConfirmPassword('');
    stripResetQueryParams();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oobCode) return;
    setError(null);

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
      const emailDone = verifiedEmail || '';
      setCompletedEmail(emailDone);
      setOobCode(null);
      setNewPassword('');
      setConfirmPassword('');
      stripResetQueryParams();
      showToast('Password updated! You can now sign in with your new password.', 'success');
      if (onResetCompleted && emailDone) {
        onResetCompleted(emailDone);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to update password. The reset link may have expired.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="password-reset-action-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/70 backdrop-blur-xs p-4"
    >
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-stone-200 relative">
        <button
          type="button"
          onClick={handleClose}
          aria-label="Close password reset dialog"
          className="absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-100 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-5">
          <div className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-amber-100 text-amber-800 mb-3">
            <KeyRound className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-bold text-stone-900">Set New Password</h2>
          {verifiedEmail && !completedEmail && (
            <p className="text-xs text-stone-500 mt-1">
              Resetting password for <strong className="text-stone-800">{verifiedEmail}</strong>
            </p>
          )}
        </div>

        {isVerifying ? (
          <div className="py-6 text-center text-xs text-stone-500">
            Verifying your password reset link...
          </div>
        ) : completedEmail !== null ? (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                Your password {completedEmail ? `for ${completedEmail} ` : ''}has been updated. You can now sign in with your new password.
              </span>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-3 px-4 rounded-xl text-xs sm:text-sm transition cursor-pointer"
            >
              Continue to Sign In
            </button>
          </div>
        ) : error && !oobCode ? (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="w-full bg-stone-800 hover:bg-stone-900 text-white font-bold py-3 px-4 rounded-xl text-xs sm:text-sm transition cursor-pointer"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                New Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  id="global-oob-new-password"
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setError(null);
                  }}
                  placeholder="Minimum 6 characters"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className="w-full pl-10 pr-10 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  id="global-oob-confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setError(null);
                  }}
                  placeholder="Re-enter new password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className="w-full pl-10 pr-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <button
              id="global-oob-submit-btn"
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-3 px-4 rounded-xl text-xs sm:text-sm transition shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <KeyRound className="w-4 h-4" />
              <span>{isSubmitting ? 'Updating Password...' : 'Save New Password'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
