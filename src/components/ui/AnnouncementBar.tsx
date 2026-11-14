import React, { useState } from 'react';
import { Copy, Check, Sparkles, X } from 'lucide-react';
import { BRAND } from '../../constants';

export interface AnnouncementBarProps {
  couponCode?: string;
  couponText?: string;
  allowDismiss?: boolean;
}

export const AnnouncementBar: React.FC<AnnouncementBarProps> = ({
  couponCode = 'PURE50',
  couponText = 'Use code PURE50 for ₹50 OFF on first order',
  allowDismiss = false,
}) => {
  const [isDismissed, setIsDismissed] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  if (isDismissed) return null;

  const handleCopy = () => {
    if (!couponCode) return;
    navigator.clipboard?.writeText(couponCode);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <aside
      aria-label="Promotional announcement"
      className="bg-emerald-950 text-emerald-100 text-xs border-b border-emerald-900/60 py-1.5 px-3 sm:px-6 relative z-30 transition-all"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
        {/* Left: Brand Values */}
        <div className="hidden md:flex items-center gap-2 text-emerald-200">
          <span className="font-semibold text-emerald-300">{BRAND.TAGLINE}</span>
          <span className="opacity-40">•</span>
          <span className="font-hindi text-emerald-200">{BRAND.HINDI_TAGLINE}</span>
        </div>

        {/* Center: Offer with quick copy */}
        <div className="flex-1 flex items-center justify-center gap-2 text-center text-[11px] sm:text-xs">
          <span className="flex items-center gap-1 font-medium text-emerald-100">
            <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
            <span>{couponText}</span>
          </span>

          {couponCode && (
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1 bg-emerald-900/80 hover:bg-emerald-800 text-amber-300 font-mono font-bold px-2 py-0.5 rounded border border-emerald-700 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-400"
              title="Click to copy coupon code"
            >
              <span>{couponCode}</span>
              {isCopied ? (
                <Check className="w-3 h-3 text-emerald-300" />
              ) : (
                <Copy className="w-2.5 h-2.5 text-amber-300/80" />
              )}
            </button>
          )}
        </div>

        {/* Right: Fast Delivery USP badge */}
        <div className="hidden lg:flex items-center gap-1 text-[11px] font-semibold text-amber-300 bg-emerald-900/60 px-2.5 py-0.5 rounded-full border border-emerald-800">
          ⚡ {BRAND.USP}
        </div>

        {allowDismiss && (
          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            className="text-emerald-400 hover:text-white p-0.5 rounded hover:bg-emerald-900 transition-colors focus-visible:outline-none"
            aria-label="Dismiss banner"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </aside>
  );
};

export default AnnouncementBar;
