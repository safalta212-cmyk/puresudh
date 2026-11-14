import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastProps {
  id: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  message: string;
  onDismiss: (id: string) => void;
  durationMs?: number;
}

export const Toast: React.FC<ToastProps> = ({
  id,
  type = 'info',
  message,
  onDismiss,
  durationMs = 4000,
}) => {
  useEffect(() => {
    if (durationMs <= 0) return;
    const timer = setTimeout(() => {
      onDismiss(id);
    }, durationMs);
    return () => clearTimeout(timer);
  }, [id, durationMs, onDismiss]);

  const typeStyles = {
    success: 'bg-emerald-900 text-white border-emerald-700/60 shadow-lg',
    error: 'bg-rose-900 text-white border-rose-700/60 shadow-lg',
    warning: 'bg-amber-900 text-white border-amber-700/60 shadow-lg',
    info: 'bg-stone-900 text-white border-stone-700/60 shadow-lg',
  };

  const icons = {
    success: <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />,
    error: <AlertCircle className="w-4 h-4 text-rose-300 shrink-0" />,
    warning: <AlertCircle className="w-4 h-4 text-amber-300 shrink-0" />,
    info: <Info className="w-4 h-4 text-sky-300 shrink-0" />,
  };

  return (
    <div
      role="alert"
      className={`flex items-center gap-3 px-4 py-3 rounded-2xl border text-xs sm:text-sm font-medium transition-all transform duration-200 pointer-events-auto max-w-md ${typeStyles[type]}`}
    >
      {icons[type]}
      <p className="flex-1 leading-snug">{message}</p>
      <button
        type="button"
        onClick={() => onDismiss(id)}
        className="p-1 rounded-lg text-stone-300 hover:text-white hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white"
        aria-label="Dismiss notification"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

export default Toast;
