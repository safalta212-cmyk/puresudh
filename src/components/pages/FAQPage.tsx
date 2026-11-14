import React, { useState } from 'react';
import { ChevronDown, HelpCircle, MessageCircle } from 'lucide-react';
import { SiteSettings } from '../../types';
import { initialSiteSettings } from '../../data/seedData';

interface FAQPageProps {
  settings?: SiteSettings;
}

interface FAQItem {
  question: string;
  answer: string;
  category: 'Delivery' | 'Purity & Ingredients' | 'Dairy & Freshness' | 'Payments';
}

const FAQS: FAQItem[] = [
  {
    category: 'Delivery',
    question: 'How fast can PURE SUDH deliver my order?',
    answer:
      'We operate local community dark-kitchen hubs. In active serviceable pincodes (like Patna central zones 800001, 800020, etc.), fresh dairy and hot snacks are delivered within approximately 25 to 35 minutes of confirmation.',
  },
  {
    category: 'Delivery',
    question: 'What is the delivery charge and free delivery limit?',
    answer:
      'Standard local delivery fee is ₹29. However, any order above ₹299 automatically qualifies for 100% FREE local delivery!',
  },
  {
    category: 'Delivery',
    question: 'What happens if my PIN code is not deliverable?',
    answer:
      'If your 6-digit pincode is currently outside our 30-minute hyper-local delivery radius, you will be notified at checkout. We are rapidly expanding new hubs across Tier-1 and Tier-2 neighborhoods.',
  },
  {
    category: 'Purity & Ingredients',
    question: 'Are your Thekua and sweets prepared in pure desi ghee?',
    answer:
      'Yes, 100%! We never use palm oil, refined vegetable oils, or hydrogenated vanaspati. All our Thekua, Khasta, and festival sweets are fried slowly in pure cow desi ghee and sweetened with authentic Desi Gur (cane jaggery) or refined pure cane sugar.',
  },
  {
    category: 'Purity & Ingredients',
    question: 'Are all your products 100% vegetarian?',
    answer:
      'Every single product on PURE SUDH is 100% vegetarian, free from animal-derived gelatin or chemical emulsifiers.',
  },
  {
    category: 'Dairy & Freshness',
    question: 'How fresh is the milk, paneer, and dahi?',
    answer:
      'Our A2 milk and malai paneer are prepared and pasteurized fresh every morning and evening. We do not use chemical stabilizers or starch powders. Paneer remains soft and spongy naturally.',
  },
  {
    category: 'Dairy & Freshness',
    question: 'What is the shelf life of fresh dairy products?',
    answer:
      'Because we do not add chemical preservatives: fresh A2 milk should be boiled within 24 hours or kept chilled; fresh Malai Paneer has a refrigerated shelf life of 3 to 4 days; and earthen pot Matka Dahi is best consumed within 3 days.',
  },
  {
    category: 'Payments',
    question: 'Which payment methods do you accept?',
    answer:
      'We accept UPI (Google Pay, PhonePe, Paytm, BHIM), Debit & Credit Cards (Visa, MasterCard, RuPay), Net Banking for all major banks, as well as Cash on Delivery (COD).',
  },
  {
    category: 'Payments',
    question: 'How do festival sweet pre-orders work?',
    answer:
      'During festivals like Chhath Puja, Diwali, Holi, and Raksha Bandhan, we accept advance pre-orders for large Thekua tins and Besan Ladoo gift boxes. Contact our kitchen via WhatsApp to reserve bulk batches.',
  },
];

export const FAQPage: React.FC<FAQPageProps> = ({ settings }) => {
  const s: SiteSettings = { ...initialSiteSettings, ...(settings || {}) };
  const [openIdx, setOpenIdx] = useState<number | null>(0);
  const [activeCategory, setActiveCategory] = useState<string>('All');

  const categories = ['All', 'Delivery', 'Purity & Ingredients', 'Dairy & Freshness', 'Payments'];

  const filteredFaqs =
    activeCategory === 'All'
      ? FAQS
      : FAQS.filter((f) => f.category === activeCategory);

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 sm:space-y-10 w-full max-w-full overflow-hidden">
      <div className="text-center space-y-2 max-w-xl mx-auto">
        <span className="text-xs uppercase font-bold tracking-widest text-amber-800 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
          Got Questions?
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 font-serif">Frequently Asked Questions</h1>
        <p className="text-xs sm:text-sm text-stone-500">
          Everything you need to know about our sourcing, delivery speed, and traditional preparation.
        </p>
      </div>

      {/* Category Filter Pills */}
      <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 sm:px-3.5 py-1.5 rounded-full text-xs font-semibold transition touch-manipulation min-h-[36px] ${
              activeCategory === cat
                ? 'bg-amber-800 text-white shadow-xs'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Accordion */}
      <div className="space-y-2.5 sm:space-y-3">
        {filteredFaqs.map((faq, idx) => {
          const isOpen = openIdx === idx;
          return (
            <div
              key={idx}
              className="bg-white rounded-2xl border border-stone-200 overflow-hidden transition shadow-xs"
            >
              <button
                type="button"
                onClick={() => setOpenIdx(isOpen ? null : idx)}
                className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-3 sm:gap-4 touch-manipulation min-h-[44px]"
              >
                <span className="font-bold text-stone-900 text-xs sm:text-sm">{faq.question}</span>
                <ChevronDown
                  className={`w-4 h-4 text-stone-400 shrink-0 transition-transform duration-200 ${
                    isOpen ? 'rotate-180 text-amber-700' : ''
                  }`}
                />
              </button>

              {isOpen && (
                <div className="px-4 sm:px-5 pb-4 sm:pb-5 text-xs text-stone-600 leading-relaxed border-t border-stone-100 pt-3 animate-in fade-in duration-150">
                  {faq.answer}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* WhatsApp Help Box */}
      <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-200 text-amber-800 flex items-center justify-center shrink-0">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-stone-900 text-sm">Still have questions?</h4>
            <p className="text-xs text-stone-600">Our customer support is active 7 days a week.</p>
          </div>
        </div>

        <a
          href={`https://wa.me/${(s.whatsappNumber || '+919431012801').replace(/\D/g, '')}?text=${encodeURIComponent(
            'Namaste! I have a question about PURE SUDH products.'
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2.5 rounded-xl text-xs transition shadow-xs whitespace-nowrap touch-manipulation min-h-[44px]"
        >
          <MessageCircle className="w-4 h-4" />
          <span>Chat on WhatsApp</span>
        </a>
      </div>
    </div>
  );
};
