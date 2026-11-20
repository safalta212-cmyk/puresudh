import React, { createContext, useContext, useEffect, useState } from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';

interface GoogleMapsContextType {
  apiKey: string;
  hasKey: boolean;
  isQuotaExceeded: boolean;
  dismissQuotaNotice: () => void;
}

const GoogleMapsContext = createContext<GoogleMapsContextType>({
  apiKey: '',
  hasKey: false,
  isQuotaExceeded: false,
  dismissQuotaNotice: () => {},
});

export const useGoogleMaps = () => useContext(GoogleMapsContext);

export const GoogleMapsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const apiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '').trim();
  const hasKey = Boolean(apiKey && apiKey !== 'MY_GOOGLE_MAPS_API_KEY' && apiKey.length > 5);
  const [isQuotaExceeded, setIsQuotaExceeded] = useState(false);
  const [isNoticeDismissed, setIsNoticeDismissed] = useState(false);

  useEffect(() => {
    const handleQuotaExceeded = () => {
      setIsQuotaExceeded(true);
      setIsNoticeDismissed(false);
    };

    window.addEventListener('gmp-quota-exceeded', handleQuotaExceeded);
    return () => {
      window.removeEventListener('gmp-quota-exceeded', handleQuotaExceeded);
    };
  }, []);

  const dismissQuotaNotice = () => {
    setIsNoticeDismissed(true);
  };

  const content = (
    <GoogleMapsContext.Provider
      value={{
        apiKey,
        hasKey,
        isQuotaExceeded,
        dismissQuotaNotice,
      }}
    >
      {isQuotaExceeded && !isNoticeDismissed && (
        <div
          id="gmp-quota-banner"
          className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm flex items-center justify-between"
        >
          <span className="mx-auto">
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
          <button
            type="button"
            onClick={dismissQuotaNotice}
            className="text-amber-900 hover:text-amber-950 text-xs px-2 py-1 rounded-md ml-2"
          >
            ✕
          </button>
        </div>
      )}
      {children}
    </GoogleMapsContext.Provider>
  );

  if (!hasKey) {
    return content;
  }

  return (
    <APIProvider
      apiKey={apiKey}
      libraries={['places', 'marker', 'geometry', 'routes']}
    >
      {content}
    </APIProvider>
  );
};
