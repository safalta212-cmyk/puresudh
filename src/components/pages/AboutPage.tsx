import React from 'react';
import { ShieldCheck, Heart, Sparkles, Truck, Award, CheckCircle } from 'lucide-react';
import { SiteSettings } from '../../types';
import { initialSiteSettings } from '../../data/seedData';

interface AboutPageProps {
  settings?: SiteSettings;
  onExploreProducts: () => void;
}

export const AboutPage: React.FC<AboutPageProps> = ({ settings, onExploreProducts }) => {
  const s: SiteSettings = { ...initialSiteSettings, ...(settings || {}) };
  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10 sm:space-y-16 w-full max-w-full overflow-hidden">
      {/* Hero Section */}
      <div className="text-center space-y-3 sm:space-y-4 max-w-3xl mx-auto">
        <span className="text-xs uppercase font-bold tracking-widest text-amber-800 bg-amber-50 px-4 py-1.5 rounded-full border border-amber-200">
          शुद्ध स्वाद, आपके घर तक
        </span>
        <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-stone-900 font-serif tracking-tight leading-tight">
          Rooted in Authentic Tradition, Handcrafted for Pure Health
        </h1>
        <p className="text-stone-600 text-xs sm:text-base leading-relaxed">
          {s.primaryTagline} — PURE SUDH was born out of a deep reverence for traditional Indian
          kitchens, where milk is pure, ghee is slow-churned in clay pots, and snacks like Thekua &
          Khasta are prepared with unadulterated devotion.
        </p>
      </div>

      {/* Story Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        <div className="space-y-4 text-xs sm:text-sm text-stone-600 leading-relaxed">
          <h2 className="text-2xl font-bold text-stone-900 font-serif">
            Why PURE SUDH Was Founded
          </h2>
          <p>
            In modern bustling towns, finding genuine homemade taste has become nearly impossible.
            Store-bought sweets are laden with industrial palm oils and synthetic coloring; packet
            dairy is heavily processed; and traditional festival delicacies like Chhath Puja Thekua
            or Holi Gujiya are reduced to factory-produced mass commodities.
          </p>
          <p>
            We set out to restore that sacred trust. Our kitchens use only 100% pure desi cow ghee,
            raw cane jaggery (Gur), whole wheat flours, and fresh A2 cow milk sourced from local
            ethical dairy partners.
          </p>
          <div className="pt-2 space-y-2">
            {[
              'Zero Palm Oil, Hydrogenated Vanaspati, or Refined Chemical Preservatives',
              'Traditional Bilona-method Desi Ghee for Sweets & Thekua',
              'Morning-Fresh Unadulterated Milk, Malai Paneer, & Matka Dahi',
              'Prepared by Experienced Culinary Artisans steeped in Regional Heritage',
            ].map((item, idx) => (
              <div key={idx} className="flex items-start gap-2 font-medium text-stone-800">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl overflow-hidden shadow-xl border border-stone-200 bg-stone-100 relative aspect-4/3">
          <img
            src="https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=1000&q=80"
            alt="Traditional Indian kitchen cooking"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950/70 via-transparent to-transparent flex items-end p-6">
            <p className="text-white font-serif text-sm italic">
              &quot;Purity is not merely a label for us; it is a sacred culinary discipline.&quot;
            </p>
          </div>
        </div>
      </div>

      {/* 4 Pillars of Purity */}
      <div className="bg-stone-50 rounded-2xl sm:rounded-3xl p-4 sm:p-8 lg:p-10 border border-stone-200 space-y-6 sm:space-y-8">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <h3 className="text-xl sm:text-2xl font-bold text-stone-900 font-serif">Our Pillars of Purity</h3>
          <p className="text-xs text-stone-500">Every single batch is crafted following these non-negotiables</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-stone-200 shadow-xs space-y-2">
            <ShieldCheck className="w-7 h-7 sm:w-8 sm:h-8 text-amber-700" />
            <h4 className="font-bold text-stone-900 text-sm">100% Chemical-Free</h4>
            <p className="text-xs text-stone-500 leading-relaxed">
              No artificial stabilizing powders, chemical softeners, or shelf-extending sprays.
            </p>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-stone-200 shadow-xs space-y-2">
            <Sparkles className="w-7 h-7 sm:w-8 sm:h-8 text-amber-700" />
            <h4 className="font-bold text-stone-900 text-sm">Pure Desi Cow Ghee</h4>
            <p className="text-xs text-stone-500 leading-relaxed">
              Authentic aroma, easy digestibility, and traditional richness in every sweet bite.
            </p>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-stone-200 shadow-xs space-y-2">
            <Truck className="w-7 h-7 sm:w-8 sm:h-8 text-emerald-700" />
            <h4 className="font-bold text-stone-900 text-sm">Hyper-Local Fast Delivery</h4>
            <p className="text-xs text-stone-500 leading-relaxed">
              Dispatching from our community kitchen within ~30 minutes directly to your table.
            </p>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-stone-200 shadow-xs space-y-2">
            <Award className="w-7 h-7 sm:w-8 sm:h-8 text-amber-700" />
            <h4 className="font-bold text-stone-900 text-sm">Artisan Empowerment</h4>
            <p className="text-xs text-stone-500 leading-relaxed">
              Supporting rural women confectioners and ethical dairy farmers with fair compensation.
            </p>
          </div>
        </div>
      </div>

      {/* Vision & Call to Action */}
      <div className="text-center space-y-4 max-w-xl mx-auto">
        <h3 className="text-xl font-bold text-stone-900 font-serif">
          Experience the Difference of Real Purity
        </h3>
        <p className="text-xs text-stone-500">
          Order freshly churned butter, steaming hot morning puris, or authentic Bihari Gur Thekua today.
        </p>
        <button
          onClick={onExploreProducts}
          className="bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs sm:text-sm px-6 py-3 rounded-xl transition shadow-md hover:shadow-lg touch-manipulation min-h-[44px]"
        >
          Explore Fresh Store
        </button>
      </div>
    </div>
  );
};
