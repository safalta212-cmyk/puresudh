import React from 'react';
import { MessageCircle } from 'lucide-react';

interface FloatingWhatsAppProps {
  phoneNumber?: string;
  defaultMessage?: string;
}

export const FloatingWhatsApp: React.FC<FloatingWhatsAppProps> = ({
  phoneNumber = '+919876543210',
  defaultMessage = 'Namaste! I want to order fresh sweets and dairy products from PURE SUDH.',
}) => {
  const cleanNumber = (phoneNumber || '+919876543210').replace(/[^0-9]/g, '');
  const encodedText = encodeURIComponent(defaultMessage);
  const whatsappUrl = `https://wa.me/${cleanNumber}?text=${encodedText}`;

  return (
    <div className="fixed bottom-[calc(6rem+15px+env(safe-area-inset-bottom,0px))] md:bottom-[47px] left-4 md:left-6 z-[45] group">
      <a
        id="floating-whatsapp-btn"
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with PURE SUDH on WhatsApp"
        className="flex items-center gap-2.5 bg-emerald-600 hover:bg-emerald-700 text-white p-3 sm:px-4 sm:py-3 rounded-full shadow-2xl hover:shadow-[0_10px_25px_rgba(5,150,105,0.4)] border border-emerald-400/30 transition-all duration-300 hover:scale-105 active:scale-95 touch-manipulation ring-2 ring-white/90"
      >
        <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white fill-current animate-pulse shrink-0" />
        <span className="font-semibold text-xs sm:text-sm hidden sm:inline-block tracking-wide">
          WhatsApp Support
        </span>
      </a>
      <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block bg-stone-900/95 backdrop-blur-xs text-white text-xs py-1.5 px-3 rounded-lg shadow-lg whitespace-nowrap pointer-events-none z-50">
        शुद्ध स्वाद सहायता • Chat directly with us
      </div>
    </div>
  );
};
