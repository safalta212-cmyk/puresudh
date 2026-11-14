import React from 'react';
import { Header } from '../components/common/Header';
import { Footer } from '../components/common/Footer';
import { FloatingWhatsApp } from '../components/common/FloatingWhatsApp';
import { MobileBottomNav } from '../components/common/MobileBottomNav';
import { SiteSettings } from '../types';
import { initialSiteSettings } from '../data/seedData';
import { BRAND } from '../constants';

interface CustomerLayoutProps {
  children: React.ReactNode;
  currentView: string;
  setCurrentView: (view: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedCategorySlug: string;
  setSelectedCategorySlug: (slug: string) => void;
  settings?: SiteSettings;
  onOpenCart: () => void;
}

export const CustomerLayout: React.FC<CustomerLayoutProps> = ({
  children,
  currentView,
  setCurrentView,
  searchQuery,
  setSearchQuery,
  selectedCategorySlug,
  setSelectedCategorySlug,
  settings,
  onOpenCart,
}) => {
  const s: SiteSettings = { ...initialSiteSettings, ...(settings || {}) };
  return (
    <div className="min-h-screen flex flex-col bg-[#FDFBF7] text-stone-900 selection:bg-amber-100 selection:text-amber-900 font-sans antialiased pb-16 lg:pb-0">
      {/* Top Value Banner */}
      <div className="bg-amber-950 text-amber-100 py-1.5 px-4 text-center text-xs tracking-wide border-b border-amber-900/50">
        <span className="font-semibold text-amber-300 mr-2">{BRAND.TAGLINE}</span>
        <span className="opacity-70 mx-1.5">•</span>
        <span className="font-hindi text-amber-200">{BRAND.HINDI_TAGLINE}</span>
        <span className="opacity-70 mx-1.5">•</span>
        <span className="text-amber-100 font-medium">{BRAND.USP}</span>
      </div>

      {/* Global Header */}
      <Header
        currentView={currentView}
        setCurrentView={setCurrentView}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedCategorySlug={selectedCategorySlug}
        setSelectedCategorySlug={setSelectedCategorySlug}
      />

      {/* Main Content */}
      <main className="flex-1">{children}</main>

      {/* Global Footer */}
      <Footer
        settings={s}
        setCurrentView={setCurrentView}
        setSelectedCategorySlug={setSelectedCategorySlug}
      />

      {/* Floating WhatsApp Support */}
      <FloatingWhatsApp phoneNumber={s.whatsappNumber} />

      {/* Persistent Mobile Bottom Navigation */}
      <MobileBottomNav
        currentView={currentView}
        setCurrentView={setCurrentView}
        onOpenCart={onOpenCart}
      />
    </div>
  );
};

export default CustomerLayout;
