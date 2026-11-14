import React from 'react';
import { Shield, ArrowLeft, Package, ShoppingBag, Store, Settings, Users } from 'lucide-react';
import { BRAND } from '../constants';

interface AdminLayoutProps {
  children: React.ReactNode;
  activeSection: string;
  setActiveSection: (sec: string) => void;
  onBackToStore: () => void;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  children,
  activeSection,
  setActiveSection,
  onBackToStore,
}) => {
  return (
    <div className="min-h-screen bg-stone-100 flex flex-col font-sans" id="pure-sudh-admin-layout">
      {/* Admin Top Header */}
      <header className="bg-stone-900 text-stone-100 border-b border-stone-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-amber-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
              PS
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif font-bold text-base text-white tracking-wide">{BRAND.NAME}</span>
                <span className="bg-amber-500/20 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-500/30 uppercase tracking-wider">
                  Admin Console
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onBackToStore}
            id="admin-layout-back-btn"
            className="flex items-center gap-1.5 text-xs text-stone-300 hover:text-white bg-stone-800 hover:bg-stone-700 px-3 py-1.5 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Pure Sudh Store
          </button>
        </div>
      </header>

      {/* Main Admin Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
};

export default AdminLayout;
