import React, { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Phone,
  Lock,
  ShieldCheck,
  Camera,
  CheckCircle2,
  AlertCircle,
  Key,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { MediaUploader } from '../common/MediaUploader';
import {
  isTemporaryOrFakePhone,
  normalizeIndianPhone10,
  sanitizePhoneInput10,
  formatIndianPhone,
} from '../../validation';

interface AccountProfileTabProps {
  onProfileUpdated?: () => void;
}

export const AccountProfileTab: React.FC<AccountProfileTabProps> = ({ onProfileUpdated }) => {
  const { user, updateUserProfileData, updateUserPassword, sendPasswordReset } = useAuth();
  const { showToast } = useToast();

  // Profile Edit State
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [phoneNumber, setPhoneNumber] = useState(() => normalizeIndianPhone10(user?.phone || ''));
  const [avatarUrl, setAvatarUrl] = useState(user?.photoURL || '');
  const [showAvatarUploader, setShowAvatarUploader] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      if (user.displayName) setDisplayName(user.displayName);
      if (user.phone) setPhoneNumber(normalizeIndianPhone10(user.phone));
      if (user.photoURL) setAvatarUrl(user.photoURL);
    }
  }, [user]);

  // Password Change State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [resetNotice, setResetNotice] = useState<string | null>(null);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setProfileError('Name cannot be empty.');
      return;
    }

    if (phoneNumber.trim()) {
      const phoneCheck = isTemporaryOrFakePhone(phoneNumber);
      if (phoneCheck.isFake) {
        setProfileError(phoneCheck.reason || 'Please enter a valid 10-digit Indian mobile number (+91).');
        return;
      }
    }

    setIsSavingProfile(true);
    setProfileError(null);
    setProfileSuccess(false);

    try {
      const res = await updateUserProfileData({
        displayName: displayName.trim(),
        phone: phoneNumber.trim() ? formatIndianPhone(phoneNumber) : '',
        photoURL: avatarUrl,
      });

      if (res.error) {
        throw new Error(res.error);
      }

      setProfileSuccess(true);
      showToast('Profile updated successfully!', 'success');
      if (onProfileUpdated) onProfileUpdated();
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err: any) {
      setProfileError(err.message || 'Failed to update profile.');
      showToast(err.message || 'Failed to update profile.', 'error');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    setIsChangingPassword(true);
    setPasswordError(null);
    setPasswordSuccess(false);

    try {
      const res = await updateUserPassword(newPassword);
      if (res.error) {
        throw new Error(res.error);
      }
      setPasswordSuccess(true);
      setNewPassword('');
      setConfirmPassword('');
      showToast('Password changed successfully!', 'success');
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to change password. You may need to re-login.');
      showToast(err.message || 'Password update failed.', 'error');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSendResetEmail = async () => {
    if (!user?.email) {
      showToast('No email associated with this account.', 'error');
      return;
    }

    setIsSendingReset(true);
    setPasswordError(null);
    setResetNotice(null);
    try {
      const portal =
        user.role === 'admin' ||
        user.role === 'staff' ||
        user.role === 'vendor' ||
        user.role === 'delivery'
          ? user.role
          : 'customer';
      const res = await sendPasswordReset(user.email, portal);
      if (res.mode === 'demo_phone_reset') {
        const msg =
          'Built-in @email.com accounts do not receive external emails. Enter your new password in the "Update Password" form above.';
        setResetNotice(msg);
        showToast(msg, 'info');
      } else {
        const msg = res.message || `Password reset link sent to ${user.email}`;
        setResetNotice(msg);
        showToast(msg, 'success');
      }
    } catch (err: any) {
      setPasswordError(err?.message || 'Failed to send reset email.');
      showToast(err?.message || 'Failed to send reset email.', 'error');
    } finally {
      setIsSendingReset(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Profile Overview Card */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-stone-200 shadow-xs flex flex-col sm:flex-row sm:items-center gap-5">
        {/* Avatar with Upload Trigger */}
        <div className="relative group shrink-0 self-center sm:self-auto">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName}
              className="w-20 h-20 rounded-full object-cover border-2 border-amber-600 shadow-sm"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-amber-100 text-amber-900 border-2 border-amber-300 flex items-center justify-center font-bold text-2xl font-serif">
              {displayName ? displayName.charAt(0).toUpperCase() : 'U'}
            </div>
          )}
          <button
            type="button"
            onClick={() => setShowAvatarUploader(true)}
            className="absolute bottom-0 right-0 p-1.5 rounded-full bg-amber-800 hover:bg-amber-900 text-white shadow-md transition cursor-pointer"
            title="Change Avatar"
          >
            <Camera className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* User Quick Info */}
        <div className="flex-1 text-center sm:text-left space-y-1">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <h3 className="font-bold text-stone-900 text-lg sm:text-xl font-serif">
              {displayName || 'Pure Sudh Customer'}
            </h3>
            <span className="text-[10px] uppercase font-extrabold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 self-center sm:self-auto">
              {user?.role || 'Customer'}
            </span>
          </div>

          <p className="text-xs text-stone-500 flex items-center justify-center sm:justify-start gap-1.5">
            <Mail className="w-3.5 h-3.5 text-stone-400" />
            <span>{user?.email || 'customer@email.com'}</span>
          </p>

          <p className="text-xs text-stone-500 flex items-center justify-center sm:justify-start gap-1.5">
            <Phone className="w-3.5 h-3.5 text-stone-400" />
            <span>{phoneNumber ? formatIndianPhone(phoneNumber) : 'Not added'}</span>
          </p>
        </div>

        <div className="bg-amber-50/70 border border-amber-100 p-3 rounded-2xl text-center shrink-0 self-center sm:self-auto">
          <p className="text-[10px] uppercase font-bold tracking-wider text-amber-800">Account Status</p>
          <p className="text-xs font-extrabold text-emerald-800 flex items-center justify-center gap-1 mt-0.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Verified & Active
          </p>
        </div>
      </div>

      {/* Avatar Uploader Modal */}
      {showAvatarUploader && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-stone-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-2">
              <h4 className="font-bold text-stone-900 text-base">Update Profile Photo</h4>
              <button
                type="button"
                onClick={() => setShowAvatarUploader(false)}
                className="text-stone-400 hover:text-stone-600 font-bold"
              >
                ✕
              </button>
            </div>

            <MediaUploader
              preset="profile"
              pathParams={{ userId: user?.id || 'guest-profile' }}
              currentImageUrl={avatarUrl}
              aspectRatio="1:1"
              onUploadSuccess={(res) => {
                setAvatarUrl(res.downloadUrl);
                setShowAvatarUploader(false);
                showToast('Avatar uploaded! Click Save Changes to apply.', 'success');
              }}
              label="Select or upload your profile picture"
              helpText="Square photo recommended. Max 2MB (JPG, PNG, WebP)."
            />
          </div>
        </div>
      )}

      {/* Two Column Grid: Edit Profile Form & Password/Security Form */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Edit Profile Form */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-stone-200 shadow-xs space-y-4">
          <div className="border-b border-stone-100 pb-2.5">
            <h4 className="font-bold text-stone-900 text-sm sm:text-base flex items-center gap-2">
              <User className="w-4 h-4 text-amber-700" />
              Edit Personal Profile
            </h4>
            <p className="text-xs text-stone-500">Update your recipient name and communication mobile</p>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-3.5 text-xs">
            <div>
              <label className="block font-semibold text-stone-700 mb-1">Full Name *</label>
              <input
                type="text"
                value={displayName ?? ''}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                placeholder="Aarav Sharma"
                className="w-full p-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">Email Address</label>
              <input
                type="email"
                value={user?.email ?? ''}
                disabled
                className="w-full p-2.5 rounded-xl border border-stone-200 bg-stone-100 text-stone-500 cursor-not-allowed"
              />
              <span className="text-[10px] text-stone-400 mt-0.5 block">Email address cannot be changed directly</span>
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">Phone Number (India +91) *</label>
              <div className="flex items-stretch">
                <span className="inline-flex items-center px-2.5 bg-stone-100 border border-r-0 border-stone-300 rounded-l-xl text-xs font-bold text-stone-700 select-none">
                  +91
                </span>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={phoneNumber ?? ''}
                  onChange={(e) => setPhoneNumber(sanitizePhoneInput10(e.target.value))}
                  placeholder="10-digit mobile number"
                  className="w-full p-2.5 rounded-r-xl border border-stone-300 focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            {profileError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{profileError}</span>
              </div>
            )}

            {profileSuccess && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>Personal details successfully updated!</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSavingProfile}
              className="w-full py-2.5 rounded-xl bg-amber-800 hover:bg-amber-900 text-white font-bold text-xs transition cursor-pointer shadow-xs flex items-center justify-center gap-2"
            >
              {isSavingProfile ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </form>
        </div>

        {/* Password & Security Form */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-stone-200 shadow-xs space-y-4">
          <div className="border-b border-stone-100 pb-2.5">
            <h4 className="font-bold text-stone-900 text-sm sm:text-base flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-700" />
              Password & Security
            </h4>
            <p className="text-xs text-stone-500">Update your account authentication credentials</p>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-3.5 text-xs">
            <div>
              <label className="block font-semibold text-stone-700 mb-1">New Password *</label>
              <input
                type="password"
                value={newPassword ?? ''}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                placeholder="At least 6 characters"
                className="w-full p-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">Confirm New Password *</label>
              <input
                type="password"
                value={confirmPassword ?? ''}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                placeholder="Re-enter password"
                className="w-full p-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {passwordError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            {passwordSuccess && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>Password changed successfully!</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isChangingPassword}
              className="w-full py-2.5 rounded-xl bg-stone-800 hover:bg-stone-900 text-white font-bold text-xs transition cursor-pointer shadow-xs flex items-center justify-center gap-2"
            >
              {isChangingPassword ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Updating Password...
                </>
              ) : (
                'Update Password'
              )}
            </button>

            <div className="pt-2 border-t border-stone-100 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-stone-500">Need to reset via email?</span>
                <button
                  type="button"
                  onClick={handleSendResetEmail}
                  disabled={isSendingReset}
                  className="text-[11px] font-bold text-amber-800 hover:text-amber-900 transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <Key className="w-3 h-3" />
                  {isSendingReset ? 'Sending...' : 'Send Reset Email'}
                </button>
              </div>
              {resetNotice && (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px] leading-snug">
                  {resetNotice}
                </div>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
