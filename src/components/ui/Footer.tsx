import React from 'react';
import {
  ShieldCheck,
  Truck,
  HeartHandshake,
  Award,
  Phone,
  Mail,
  MapPin,
  MessageSquare,
  Instagram,
  Youtube,
} from 'lucide-react';
import { BRAND } from '../../constants';

export interface FooterProps {
  onNavigate: (view: string) => void;
  onOpenPolicy?: (type: 'privacy' | 'terms' | 'shipping' | 'refund') => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate, onOpenPolicy }) => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-stone-900 text-stone-300 border-t border-stone-800 transition-colors">
      {/* Brand Value Pillars */}
      <div className="border-b border-stone-800 bg-stone-950/60 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-950/90 text-emerald-400 border border-emerald-800/60 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">100% Pure & Sudh</h4>
                <p className="text-xs text-stone-400 mt-0.5">
                  Zero adulteration, pure cow milk & authentic cow desi ghee.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-950/90 text-emerald-400 border border-emerald-800/60 flex items-center justify-center shrink-0">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">25-35 Min Delivery</h4>
                <p className="text-xs text-stone-400 mt-0.5">
                  Fresh products packed hygienically and rushed to your door.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-950/90 text-emerald-400 border border-emerald-800/60 flex items-center justify-center shrink-0">
                <HeartHandshake className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Traditional Craft</h4>
                <p className="text-xs text-stone-400 mt-0.5">
                  Handcrafted Thekua, artisanal khoya sweets and rural recipes.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-950/90 text-emerald-400 border border-emerald-800/60 flex items-center justify-center shrink-0">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">FSSAI Certified</h4>
                <p className="text-xs text-stone-400 mt-0.5">
                  Strict food hygiene standards & lab-tested milk batches.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Brand Col */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-800 text-amber-300 flex items-center justify-center font-serif font-bold text-base">
                PS
              </div>
              <span className="font-serif font-black text-xl text-white tracking-wide">
                {BRAND.NAME}
              </span>
            </div>

            <p className="text-sm text-stone-400 leading-relaxed max-w-sm">
              Authentic Indian fresh foods, farm cow dairy, traditional sweets, and homemade snacks prepared with pure desi ghee and wholesome natural ingredients.
            </p>

            <div className="p-3 rounded-xl bg-stone-800/60 border border-stone-700/60 text-xs space-y-1">
              <div className="text-emerald-400 font-semibold">{BRAND.TAGLINE}</div>
              <div className="text-stone-300 font-hindi">{BRAND.HINDI_TAGLINE}</div>
              <div className="text-amber-300 font-medium">⚡ {BRAND.USP}</div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Explore</h4>
            <ul className="space-y-2 text-xs text-stone-400">
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('shop')}
                  className="hover:text-emerald-400 transition-colors"
                >
                  All Products
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('track-order')}
                  className="hover:text-emerald-400 transition-colors"
                >
                  Track Order
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('faq')}
                  className="hover:text-emerald-400 transition-colors"
                >
                  Purity Standards & FAQ
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('vendor')}
                  className="hover:text-emerald-400 transition-colors"
                >
                  Marketplace Partner Hub
                </button>
              </li>
            </ul>
          </div>

          {/* Policies */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Customer Care</h4>
            <ul className="space-y-2 text-xs text-stone-400">
              <li>
                <button
                  type="button"
                  onClick={() => onOpenPolicy?.('shipping')}
                  className="hover:text-emerald-400 transition-colors"
                >
                  Shipping & Delivery
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenPolicy?.('refund')}
                  className="hover:text-emerald-400 transition-colors"
                >
                  Return & Refund Policy
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenPolicy?.('privacy')}
                  className="hover:text-emerald-400 transition-colors"
                >
                  Privacy Policy
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenPolicy?.('terms')}
                  className="hover:text-emerald-400 transition-colors"
                >
                  Terms & Conditions
                </button>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Get in Touch</h4>
            <div className="space-y-2 text-xs text-stone-400">
              <p className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>+91 98765 43210</span>
              </p>
              <p className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>contact@puresudh.com</span>
              </p>
              <p className="flex items-center gap-2">
                <MessageSquare className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>WhatsApp: +91 98765 43210</span>
              </p>
              <p className="flex items-center gap-2">
                <Instagram className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <a
                  href="https://www.instagram.com/pure.sudh"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-amber-400 transition-colors"
                >
                  Instagram: @pure.sudh
                </a>
              </p>
              <p className="flex items-center gap-2">
                <Youtube className="w-3.5 h-3.5 text-red-500 shrink-0" />
                <a
                  href="https://www.youtube.com/@puresudh"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-red-400 transition-colors"
                  aria-label="YouTube channel @puresudh"
                  title="YouTube: @puresudh"
                >
                  YouTube: @puresudh
                </a>
              </p>
              <p className="flex items-start gap-2 pt-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>Annapurna Mandir Marg, Dairy Circle, Patna, Bihar 800001</span>
              </p>
            </div>
          </div>
        </div>

        {/* FSSAI & Copyright Notice */}
        <div className="pt-8 mt-8 border-t border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-500">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-stone-300">FSSAI Lic. No: 10424000000123</span>
            <span>•</span>
            <span>100% Pure Vegetarian Certified</span>
          </div>

          <p>© {currentYear} {BRAND.NAME}. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
