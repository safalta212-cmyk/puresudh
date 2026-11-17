import React, { useEffect, useState } from 'react';
import { ShieldAlert, Lock, ArrowLeft, LogIn, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';

interface ProtectedRouteProps {
  allowedRoles: UserRole[];
  portalName: string;
  targetPortal: 'admin' | 'staff' | 'vendor' | 'customer';
  children: React.ReactNode;
  onBackToStore?: () => void;
  onNavigate?: (view: string) => void;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  allowedRoles,
  portalName,
  targetPortal,
  children,
  onBackToStore,
  onNavigate,
}) => {
  const { user, role, isLoading } = useAuth();
  const [isVerifyingServerRole, setIsVerifyingServerRole] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null);
  const [authoritativeRedirectUrl, setAuthoritativeRedirectUrl] = useState<string>('/account');

  // Server-side Role Authorization Verification
  useEffect(() => {
    if (!user || isLoading) return;

    let isMounted = true;
    const verifyServerAuthorization = async () => {
      setIsVerifyingServerRole(true);
      try {
        const response = await fetch('/api/auth/verify-role', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: user.email,
            role,
            requestedPortal: targetPortal,
          }),
        });

        const data = await response.json();
        if (isMounted) {
          if (!data.authorized) {
            const redirectUrl = data.redirectUrl || (role === 'vendor' ? '/vendor' : role === 'staff' ? '/staff' : '/account');
            setAuthoritativeRedirectUrl(redirectUrl);
            setRedirectCountdown(3); // 3 second countdown before automatic redirect
          }
        }
      } catch (err) {
        console.warn('Server role verification notice:', err);
      } finally {
        if (isMounted) setIsVerifyingServerRole(false);
      }
    };

    verifyServerAuthorization();

    return () => {
      isMounted = false;
    };
  }, [user, role, targetPortal, isLoading]);

  // Handle countdown redirection
  useEffect(() => {
    if (redirectCountdown === null) return;
    if (redirectCountdown <= 0) {
      if (onNavigate) {
        onNavigate(authoritativeRedirectUrl.replace(/^\//, ''));
      } else {
        window.location.href = authoritativeRedirectUrl;
      }
      return;
    }

    const timer = setTimeout(() => {
      setRedirectCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearTimeout(timer);
  }, [redirectCountdown, authoritativeRedirectUrl, onNavigate]);

  if (isLoading || isVerifyingServerRole) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold text-stone-700">Verifying authoritative security clearance...</p>
        <p className="text-xs text-stone-400 mt-1">Enforcing server-side Role-Based Access Control (RBAC)</p>
      </div>
    );
  }

  // 1. Not Authenticated: Prompt redirect to specific role login page
  if (!user) {
    const loginUrl =
      targetPortal === 'admin'
        ? '/admin/login'
        : targetPortal === 'staff'
        ? '/staff/login'
        : targetPortal === 'vendor'
        ? '/vendor/login'
        : '/customer/login';

    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4 bg-[#FDFBF7]">
        <div className="max-w-md w-full bg-white rounded-3xl border border-stone-200 shadow-xl p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <Lock className="w-8 h-8" />
          </div>

          <div>
            <span className="text-[11px] font-bold tracking-widest uppercase text-amber-800 bg-amber-100 px-3 py-1 rounded-full">
              Authentication Required
            </span>
            <h2 className="text-xl font-bold text-stone-900 mt-3">{portalName}</h2>
            <p className="text-xs text-stone-600 mt-2 leading-relaxed">
              Please sign in with authorized {portalName} credentials to access this protected area.
            </p>
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <button
              onClick={() => {
                if (onNavigate) {
                  onNavigate(`${targetPortal}-login`);
                } else {
                  window.location.href = loginUrl;
                }
              }}
              className="w-full flex items-center justify-center gap-2 bg-stone-900 hover:bg-stone-800 text-white font-semibold py-3 rounded-xl text-xs transition shadow-xs cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              Sign In to {portalName}
            </button>

            {onBackToStore && (
              <button
                onClick={onBackToStore}
                className="w-full flex items-center justify-center gap-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold py-2.5 rounded-xl text-xs transition cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                Return to Storefront
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 2. Authenticated but Unauthorized Role (403 Forbidden with automatic dashboard redirection)
  const isAuthorized = allowedRoles.includes(role);
  if (!isAuthorized) {
    const dashboardLabel =
      role === 'customer'
        ? 'Customer Dashboard'
        : role === 'vendor'
        ? 'Vendor Partner Hub'
        : role === 'staff'
        ? 'Staff Operations Desk'
        : 'Admin Dashboard';

    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4 bg-[#FDFBF7]">
        <div className="max-w-md w-full bg-white rounded-3xl border border-rose-200 shadow-xl p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-rose-50 border border-rose-200 text-rose-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div>
            <span className="text-[11px] font-bold tracking-widest uppercase text-rose-800 bg-rose-100 px-3 py-1 rounded-full">
              403 Forbidden · Role Restricted
            </span>
            <h2 className="text-xl font-bold text-stone-900 mt-3">Unauthorized Portal Access</h2>
            <p className="text-xs text-stone-600 mt-2 leading-relaxed">
              Your account (<span className="font-mono text-stone-800 font-semibold">{user.email}</span>) holds the role{' '}
              <span className="font-bold text-rose-700 uppercase bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                {role}
              </span>
              , which is not authorized to access <strong className="text-stone-900">{portalName}</strong>.
            </p>

            {redirectCountdown !== null && (
              <div className="mt-3 py-2 px-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs font-semibold">
                Redirecting to your {dashboardLabel} in {redirectCountdown}s...
              </div>
            )}
          </div>

          <div className="space-y-2 pt-1">
            <button
              onClick={() => {
                if (onNavigate) {
                  onNavigate(authoritativeRedirectUrl.replace(/^\//, ''));
                } else {
                  window.location.href = authoritativeRedirectUrl;
                }
              }}
              className="w-full flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold py-3 rounded-xl text-xs transition shadow-xs cursor-pointer"
            >
              <LayoutDashboard className="w-4 h-4" />
              Go to My {dashboardLabel}
            </button>

            {onBackToStore && (
              <button
                onClick={onBackToStore}
                className="w-full flex items-center justify-center gap-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold py-2.5 rounded-xl text-xs transition cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                Return to Storefront
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 3. Fully Authorized
  return <>{children}</>;
};
