import React from 'react';
import { Store, ArrowLeft, ShieldCheck } from 'lucide-react';
import { BRAND } from '../constants';

interface VendorLayoutProps {
  children: React.ReactNode;
  onBackToStore: () => void;
}

export const VendorLayout: React.FC<VendorLayoutProps> = ({
  children,
  onBackToStore,
}) => {
  return (
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col font-sans" id="pure-sudh-vendor-layout">
      {/* Vendor Top Bar */}
      <header className="bg-stone-900 text-stone-100 border-b border-stone-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-amber-700 text-white font-bold flex items-center justify-center text-sm shadow-xs">
              PS
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif font-bold text-base text-white tracking-wide">{BRAND.NAME}</span>
                <span className="bg-amber-400/20 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-400/30 uppercase tracking-wider">
                  Marketplace Hub
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onBackToStore}
            id="vendor-layout-back-btn"
            className="flex items-center gap-1.5 text-xs text-stone-300 hover:text-white bg-stone-800 hover:bg-stone-700 px-3 py-1.5 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Pure Sudh Store
          </button>
        </div>
      </header>

      {/* Main Vendor Area */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
};

export default VendorLayout;
