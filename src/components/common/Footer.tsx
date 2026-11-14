import React from 'react';
import {
  ShieldCheck,
  Truck,
  Sparkles,
  Phone,
  Mail,
  MapPin,
  Instagram,
  Facebook,
  Youtube,
  MessageCircle,
  Lock,
} from 'lucide-react';
import { SiteSettings } from '../../types';
import { initialSiteSettings } from '../../data/seedData';
import { useAuth } from '../../context/AuthContext';

interface FooterProps {
  settings?: SiteSettings;
  setCurrentView: (view: string) => void;
  setSelectedCategorySlug?: (slug: string) => void;
}

export const Footer: React.FC<FooterProps> = ({
  settings,
  setCurrentView,
  setSelectedCategorySlug,
}) => {
  const { user } = useAuth();
  const s: SiteSettings = { ...initialSiteSettings, ...(settings || {}) };
  const handleCatClick = (slug: string) => {
    if (setSelectedCategorySlug) setSelectedCategorySlug(slug);
    setCurrentView('shop');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePageClick = (page: string) => {
    setCurrentView(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-stone-900 text-stone-300 pt-12 sm:pt-16 pb-12 border-t border-stone-800 overflow-hidden w-full max-w-full">
      {/* 4 Feature Badges */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pb-10 sm:pb-12 border-b border-stone-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="flex items-start gap-3.5 p-4 rounded-xl bg-stone-800/50 border border-stone-800">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-semibold text-white text-sm">100% Purity Guarantee</h4>
            <p className="text-xs text-stone-400 mt-0.5 leading-relaxed">
              No adulteration, no artificial palm oils or chemical preservatives.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3.5 p-4 rounded-xl bg-stone-800/50 border border-stone-800">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-semibold text-white text-sm">Local Fast Delivery</h4>
            <p className="text-xs text-stone-400 mt-0.5 leading-relaxed">
              Serving orders fresh in ~{s.defaultDeliveryETA} within local radius.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3.5 p-4 rounded-xl bg-stone-800/50 border border-stone-800">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-semibold text-white text-sm">Pure Desi Ghee & A2 Dairy</h4>
            <p className="text-xs text-stone-400 mt-0.5 leading-relaxed">
              Sourced from verified ethical local cow dairies and traditional artisans.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3.5 p-4 rounded-xl bg-stone-800/50 border border-stone-800">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
            <MessageCircle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-semibold text-white text-sm">Instant WhatsApp Support</h4>
            <p className="text-xs text-stone-400 mt-0.5 leading-relaxed">
              Direct communication for bulk, festival, and custom dairy orders.
            </p>
          </div>
        </div>
      </div>

      {/* Main Footer Links & Info */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-10 sm:py-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
        {/* Col 1: Brand & Tagline */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-2xl tracking-tight text-white font-serif">
              PURE
            </span>
            <span className="font-extrabold text-2xl tracking-tight text-emerald-400 font-serif">
              SUDH
            </span>
          </div>
          <p className="text-amber-400 font-serif text-sm font-medium">
            {s.hindiTagline || 'शुद्ध स्वाद, आपके घर तक'}
          </p>
          <p className="text-xs text-stone-400 leading-relaxed max-w-sm">
            PURE SUDH brings you authentic homemade Thekua, freshly made Khasta, stone-churned
            buttermilk, A2 cow milk, and pure desi ghee festival sweets directly to your doorstep.
            Every recipe is prepared with love and reverence for traditional purity.
          </p>
          <div className="pt-2 flex items-center gap-3">
            <a
              id="footer-social-instagram"
              href={s.instagramUrl || 'https://www.instagram.com/pure.sudh'}
              target="_blank"
              rel="noopener noreferrer"
              className="w-8 h-8 rounded-lg bg-stone-800 hover:bg-gradient-to-tr hover:from-amber-500 hover:via-rose-500 hover:to-purple-600 text-stone-300 hover:text-white flex items-center justify-center transition shadow-xs"
              aria-label="Follow Pure Sudh on Instagram (@pure.sudh)"
              title="Follow @pure.sudh on Instagram"
            >
              <Instagram className="w-4 h-4" />
            </a>
            <a
              id="footer-social-facebook"
              href={s.facebookUrl || 'https://facebook.com/puresudh'}
              target="_blank"
              rel="noopener noreferrer"
              className="w-8 h-8 rounded-lg bg-stone-800 hover:bg-blue-600 text-stone-300 hover:text-white flex items-center justify-center transition"
              aria-label="Facebook"
            >
              <Facebook className="w-4 h-4" />
            </a>
            <a
              id="footer-social-youtube"
              href={s.youtubeUrl || 'https://www.youtube.com/@puresudh'}
              target="_blank"
              rel="noopener noreferrer"
              className="w-8 h-8 rounded-lg bg-stone-800 hover:bg-rose-600 text-stone-300 hover:text-white flex items-center justify-center transition"
              aria-label="Subscribe to Pure Sudh on YouTube (@puresudh)"
              title="YouTube: @puresudh"
            >
              <Youtube className="w-4 h-4" />
            </a>
            <a
              id="footer-social-whatsapp"
              href={`https://wa.me/${(s.whatsappNumber || '+919431012801').replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-8 h-8 rounded-lg bg-stone-800 hover:bg-emerald-600 text-stone-300 hover:text-white flex items-center justify-center transition"
              aria-label="WhatsApp"
            >
              <MessageCircle className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Col 2: Categories */}
        <div className="space-y-3">
          <h5 className="text-white font-bold text-sm tracking-wide">Pure Food Categories</h5>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-stone-400">
            <button
              type="button"
              onClick={() => handleCatClick('thekua')}
              className="text-left hover:text-amber-400 transition"
            >
              ठेकुआ (Thekua)
            </button>
            <button
              type="button"
              onClick={() => handleCatClick('khasta')}
              className="text-left hover:text-amber-400 transition"
            >
              खस्ता (Khasta)
            </button>
            <button
              type="button"
              onClick={() => handleCatClick('poori-padhki')}
              className="text-left hover:text-amber-400 transition"
            >
              पूड़ी / पढ़की
            </button>
            <button
              type="button"
              onClick={() => handleCatClick('nashta')}
              className="text-left hover:text-amber-400 transition"
            >
              नाश्ता (Breakfast)
            </button>
            <button
              type="button"
              onClick={() => handleCatClick('paneer')}
              className="text-left hover:text-amber-400 transition"
            >
              पनीर (Paneer)
            </button>
            <button
              type="button"
              onClick={() => handleCatClick('dahi')}
              className="text-left hover:text-amber-400 transition"
            >
              दही (Dahi)
            </button>
            <button
              type="button"
              onClick={() => handleCatClick('doodh')}
              className="text-left hover:text-amber-400 transition"
            >
              दूध (A2 Cow Milk)
            </button>
            <button
              type="button"
              onClick={() => handleCatClick('mithai')}
              className="text-left hover:text-amber-400 transition"
            >
              मिठाई (Desi Sweets)
            </button>
            <button
              type="button"
              onClick={() => handleCatClick('homemade')}
              className="text-left hover:text-amber-400 transition"
            >
              Homemade
            </button>
            <button
              type="button"
              onClick={() => handleCatClick('other-fresh-foods')}
              className="text-left hover:text-amber-400 transition"
            >
              Other Fresh Foods
            </button>
          </div>
        </div>

        {/* Col 3: Customer Care & Navigation */}
        <div className="space-y-3">
          <h5 className="text-white font-bold text-sm tracking-wide">Customer Care</h5>
          <ul className="space-y-2 text-xs text-stone-400">
            <li>
              <button
                type="button"
                onClick={() => handlePageClick('track-order')}
                className="hover:text-amber-400 transition"
              >
                Track Live Order
              </button>
            </li>
            {user && (
              <>
                <li>
                  <button
                    type="button"
                    onClick={() => handlePageClick('account')}
                    className="hover:text-amber-400 transition"
                  >
                    My Account
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => handlePageClick('orders')}
                    className="hover:text-amber-400 transition"
                  >
                    Order History
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => handlePageClick('wishlist')}
                    className="hover:text-amber-400 transition"
                  >
                    Saved Wishlist
                  </button>
                </li>
              </>
            )}
            <li>
              <button
                type="button"
                onClick={() => handlePageClick('faq')}
                className="hover:text-amber-400 transition"
              >
                Help & FAQs
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => handlePageClick('contact')}
                className="hover:text-amber-400 transition"
              >
                Contact Support
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => handlePageClick('vendor')}
                className="text-amber-400 hover:text-amber-300 font-medium transition flex items-center gap-1"
              >
                Marketplace Partner Hub
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => handlePageClick('vendor-register')}
                className="text-emerald-400 hover:text-emerald-300 font-semibold transition flex items-center gap-1"
              >
                Sell on PURE SUDH (Apply)
              </button>
            </li>
          </ul>
        </div>

        {/* Col 4: Policies & Contact */}
        <div className="space-y-3">
          <h5 className="text-white font-bold text-sm tracking-wide">Legal & Support</h5>
          <ul className="space-y-2 text-xs text-stone-400">
            <li>
              <button
                type="button"
                onClick={() => handlePageClick('policy-shipping')}
                className="hover:text-amber-400 transition"
              >
                Shipping Policy
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => handlePageClick('policy-returns')}
                className="hover:text-amber-400 transition"
              >
                Return & Refund Policy
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => handlePageClick('policy-cancellation')}
                className="hover:text-amber-400 transition"
              >
                Cancellation Policy
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => handlePageClick('policy-privacy')}
                className="hover:text-amber-400 transition"
              >
                Privacy Policy
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => handlePageClick('policy-terms')}
                className="hover:text-amber-400 transition"
              >
                Terms & Conditions
              </button>
            </li>
          </ul>

          <div className="pt-2 text-xs space-y-1.5 text-stone-400">
            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-amber-500" />
              <span>{s.contactPhone}</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-amber-500" />
              <span>{s.contactEmail}</span>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
              <span className="text-[11px] leading-tight">{s.storeAddress}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Staff & Admin Internal Access Section */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-5 pb-1 border-t border-stone-800/80">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-stone-400">
            <Lock className="w-3.5 h-3.5 text-stone-500 shrink-0" />
            <span className="text-stone-400 font-semibold tracking-wide text-xs">Staff &amp; Admin</span>
            <span className="text-stone-600 hidden sm:inline">•</span>
            <span className="text-stone-500 text-[11px] hidden sm:inline">Authorized internal access</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <a
              id="footer-staff-login-link"
              href="/staff/login"
              onClick={(e) => {
                e.preventDefault();
                handlePageClick('/staff/login');
              }}
              className="py-1.5 px-3 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800/80 active:bg-stone-800 transition-colors text-xs font-medium inline-flex items-center gap-1.5 min-h-[36px]"
            >
              <span>Staff Login</span>
            </a>
            <span className="text-stone-700 select-none">•</span>
            <a
              id="footer-admin-login-link"
              href="/admin/login"
              onClick={(e) => {
                e.preventDefault();
                handlePageClick('/admin/login');
              }}
              className="py-1.5 px-3 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800/80 active:bg-stone-800 transition-colors text-xs font-medium inline-flex items-center gap-1.5 min-h-[36px]"
            >
              <span>Admin Login</span>
            </a>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-5 sm:pt-6 mt-3 border-t border-stone-800/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left text-xs text-stone-500">
        <p>© {new Date().getFullYear()} PURE SUDH. All rights reserved. {s.primaryTagline}.</p>
        <p className="flex flex-wrap items-center justify-center sm:justify-end gap-2">
          <span>Architected for Multi-Category & Multi-Vendor Growth</span>
          <span>•</span>
          <span className="text-emerald-400 font-semibold">100% Food Grade Pure</span>
        </p>
      </div>
    </footer>
  );
};
