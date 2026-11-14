import React, { useState } from 'react';
import { Phone, Mail, MapPin, Clock, MessageCircle, Send, CheckCircle2, Instagram, Youtube } from 'lucide-react';
import { SiteSettings } from '../../types';
import { initialSiteSettings } from '../../data/seedData';
import { useToast } from '../../context/ToastContext';

interface ContactPageProps {
  settings?: SiteSettings;
}

export const ContactPage: React.FC<ContactPageProps> = ({ settings }) => {
  const s: SiteSettings = { ...initialSiteSettings, ...(settings || {}) };
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [inquiryType, setInquiryType] = useState('Festival Pre-Order / Bulk');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || !message) {
      showToast('Please fill all required fields', 'error');
      return;
    }
    setSubmitted(true);
    showToast('Your message has been sent to the PURE SUDH team!', 'success');
  };

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 sm:space-y-12 w-full max-w-full overflow-hidden">
      <div className="text-center space-y-2 max-w-2xl mx-auto">
        <span className="text-xs uppercase font-bold tracking-widest text-amber-800 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
          We Are Here To Help
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 font-serif">Contact PURE SUDH</h1>
        <p className="text-xs sm:text-sm text-stone-500">
          Have questions about our milk sourcing, festival sweet pre-orders, or bulk party orders?
          Reach out directly to our kitchen team.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8">
        {/* Contact Info (5 Cols) */}
        <div className="md:col-span-5 space-y-4">
          <div className="bg-stone-900 text-white p-5 sm:p-8 rounded-2xl sm:rounded-3xl space-y-5 sm:space-y-6">
            <h3 className="font-bold text-base sm:text-lg font-serif">Kitchen & Store Details</h3>

            <div className="space-y-4 text-xs">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-stone-200">Main Kitchen & Hub</p>
                  <p className="text-stone-400 leading-relaxed mt-0.5">{s.storeAddress}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-stone-200">Call Us</p>
                  <p className="text-stone-400 mt-0.5">{s.contactPhone}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-stone-200">Email Inquiries</p>
                  <p className="text-stone-400 mt-0.5">{s.contactEmail}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-stone-200">Kitchen & Dispatch Hours</p>
                  <p className="text-stone-400 mt-0.5">6:00 AM – 10:00 PM (Everyday)</p>
                  <p className="text-[11px] text-emerald-400 mt-0.5">Morning dairy dispatches begin at 6:30 AM</p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-stone-800 space-y-2.5">
              <a
                href={`https://wa.me/${(s.whatsappNumber || '+919431012801').replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-4 rounded-xl text-xs transition shadow-md touch-manipulation min-h-[44px]"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Chat on WhatsApp Directly</span>
              </a>

              <a
                href={s.instagramUrl || 'https://www.instagram.com/pure.sudh'}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-600 via-rose-600 to-purple-600 hover:opacity-95 text-white font-semibold py-3 px-4 rounded-xl text-xs transition shadow-md touch-manipulation min-h-[44px]"
              >
                <Instagram className="w-4 h-4" />
                <span>Follow @pure.sudh on Instagram</span>
              </a>

              <a
                href={s.youtubeUrl || 'https://www.youtube.com/@puresudh'}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-xl text-xs transition shadow-md touch-manipulation min-h-[44px]"
                aria-label="Subscribe to Pure Sudh on YouTube (@puresudh)"
                title="YouTube: @puresudh"
              >
                <Youtube className="w-4 h-4" />
                <span>Subscribe on YouTube (@puresudh)</span>
              </a>
            </div>
          </div>
        </div>

        {/* Message Form (7 Cols) */}
        <div className="md:col-span-7 bg-white p-5 sm:p-8 rounded-2xl sm:rounded-3xl border border-stone-200 shadow-xs">
          {submitted ? (
            <div className="py-10 sm:py-12 text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
              <h3 className="text-xl font-bold text-stone-900">Message Received!</h3>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                Thank you, {name}. Our kitchen supervisor will connect with you on +91 {phone} shortly.
              </p>
              <button
                onClick={() => setSubmitted(false)}
                className="bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold px-5 py-2.5 rounded-xl touch-manipulation min-h-[40px]"
              >
                Send Another Message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <h3 className="font-bold text-stone-900 text-base">Send Us a Message</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Your Name *</label>
                  <input
                    type="text"
                    value={name ?? ''}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="e.g. Ramesh Kumar"
                    className="w-full p-2.5 sm:p-3 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Mobile Number *</label>
                  <input
                    type="tel"
                    value={phone ?? ''}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    required
                    maxLength={10}
                    placeholder="10-digit number"
                    className="w-full p-2.5 sm:p-3 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[44px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={email ?? ''}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@gmail.com or name@email.com"
                    className="w-full p-2.5 sm:p-3 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Inquiry Type</label>
                  <select
                    value={inquiryType ?? 'Festival Pre-Order / Bulk'}
                    onChange={(e) => setInquiryType(e.target.value)}
                    className="w-full p-2.5 sm:p-3 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white min-h-[44px]"
                  >
                    <option>Festival Pre-Order / Bulk</option>
                    <option>Daily Milk & Dairy Subscription</option>
                    <option>Corporate Gifting</option>
                    <option>Delivery Location Inquiry</option>
                    <option>General Feedback</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Your Message *</label>
                <textarea
                  value={message ?? ''}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  rows={4}
                  placeholder="How can we assist you with our pure foods?"
                  className="w-full p-2.5 sm:p-3 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs"
                />
              </div>

              <button
                type="submit"
                className="w-full sm:w-auto bg-amber-700 hover:bg-amber-800 text-white font-bold py-3 px-6 rounded-xl text-xs sm:text-sm transition shadow-md hover:shadow-lg flex items-center justify-center gap-2 touch-manipulation min-h-[44px]"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit Inquiry</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
