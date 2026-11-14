import React from 'react';
import { Loader2 } from 'lucide-react';
import { BRAND } from '../../constants';

interface LoadingStateProps {
  message?: string;
  subMessage?: string;
  fullScreen?: boolean;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading fresh items...',
  subMessage = `${BRAND.TAGLINE} • शुद्ध स्वाद, आपके घर तक`,
  fullScreen = false,
}) => {
  const content = (
    <div className="flex flex-col items-center justify-center p-8 text-center" id="puresudh-loading-state">
      <div className="relative mb-4 flex items-center justify-center">
        <div className="w-14 h-14 rounded-full border-4 border-amber-200 border-t-amber-700 animate-spin" />
        <div className="absolute w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-amber-800 font-bold text-xs">
          PS
        </div>
      </div>
      <h3 className="text-lg font-serif font-bold text-stone-900 tracking-wide">{message}</h3>
      {subMessage && (
        <p className="mt-1 text-xs text-stone-500 max-w-sm">{subMessage}</p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-[#FAF8F5]/90 backdrop-blur-xs flex items-center justify-center z-50">
        {content}
      </div>
    );
  }

  return <div className="w-full py-16 flex items-center justify-center">{content}</div>;
};

export default LoadingState;
