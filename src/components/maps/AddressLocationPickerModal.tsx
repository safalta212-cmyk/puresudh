import React, { useState, useCallback } from 'react';
import {
  Map,
  AdvancedMarker,
  Pin,
} from '@vis.gl/react-google-maps';
import {
  MapPin,
  X,
  Check,
  Navigation,
  Search,
  CheckCircle2,
  AlertCircle,
  Building,
} from 'lucide-react';
import { useGoogleMaps } from './GoogleMapsProvider';

export interface AddressPickerResult {
  addressLine: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
  lat?: number;
  lng?: number;
  formattedAddress?: string;
}

export interface AddressLocationPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAddress?: (data: AddressPickerResult) => void;
  onSelectLocation?: (data: AddressPickerResult) => void;
  onLocationSelect?: (data: AddressPickerResult) => void;
  initialCoords?: { lat: number; lng: number };
  initialPincode?: string;
}

const DEFAULT_CENTER = { lat: 25.6093, lng: 85.1376 }; // Central Patna

export const AddressLocationPickerModal: React.FC<AddressLocationPickerModalProps> = ({
  isOpen,
  onClose,
  onSelectAddress,
  onSelectLocation,
  onLocationSelect,
  initialCoords,
  initialPincode,
}) => {
  const { hasKey } = useGoogleMaps();
  const [markerPos, setMarkerPos] = useState<{ lat: number; lng: number }>(
    initialCoords || DEFAULT_CENTER
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [resolvedAddress, setResolvedAddress] = useState<{
    addressLine: string;
    city: string;
    state: string;
    pincode: string;
    landmark?: string;
  }>({
    addressLine: 'Near Central Station, Frazer Road',
    city: 'Patna',
    state: 'Bihar',
    pincode: initialPincode || '800001',
    landmark: 'Opposite Junction Gate',
  });
  const [isLocating, setIsLocating] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);

  if (!isOpen) return null;

  // Reverse geocode when marker position changes
  const reverseGeocode = (pos: { lat: number; lng: number }) => {
    if (typeof window !== 'undefined' && (window as any).google?.maps?.Geocoder) {
      setIsGeocoding(true);
      const geocoder = new (window as any).google.maps.Geocoder();
      geocoder.geocode({ location: pos }, (results: any[], status: string) => {
        setIsGeocoding(false);
        if (status === 'OK' && results?.[0]) {
          const result = results[0];
          let street = '';
          let city = 'Patna';
          let state = 'Bihar';
          let pin = '800001';
          let landmark = '';

          result.address_components?.forEach((comp: any) => {
            const types = comp.types || [];
            if (types.includes('postal_code')) {
              pin = comp.long_name;
            } else if (types.includes('locality')) {
              city = comp.long_name;
            } else if (types.includes('administrative_area_level_1')) {
              state = comp.long_name;
            } else if (types.includes('route') || types.includes('street_number') || types.includes('sublocality')) {
              street += (street ? ', ' : '') + comp.long_name;
            } else if (types.includes('point_of_interest') || types.includes('premise')) {
              landmark = comp.long_name;
            }
          });

          setResolvedAddress({
            addressLine: street || result.formatted_address.split(',')[0],
            city,
            state,
            pincode: pin,
            landmark,
          });
        }
      });
    }
  };

  const handleMapClick = (e: any) => {
    if (e.detail?.latLng) {
      const newPos = {
        lat: e.detail.latLng.lat,
        lng: e.detail.latLng.lng,
      };
      setMarkerPos(newPos);
      reverseGeocode(newPos);
    }
  };

  const handleDetectCurrentLocation = () => {
    if (!navigator.geolocation) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setMarkerPos(coords);
        setIsLocating(false);
        reverseGeocode(coords);
      },
      (err) => {
        console.warn('Geolocation error:', err);
        setIsLocating(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleConfirm = () => {
    const payload: AddressPickerResult = {
      ...resolvedAddress,
      formattedAddress: resolvedAddress.addressLine,
      lat: markerPos.lat,
      lng: markerPos.lng,
    };

    if (typeof onSelectAddress === 'function') {
      onSelectAddress(payload);
    }
    if (typeof onSelectLocation === 'function') {
      onSelectLocation(payload);
    }
    if (typeof onLocationSelect === 'function') {
      onLocationSelect(payload);
    }
    onClose();
  };

  return (
    <div
      id="maps-address-picker-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/70 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto"
    >
      <div
        id="maps-address-picker-modal"
        className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-stone-200 overflow-hidden relative animate-in fade-in zoom-in-95 duration-200 my-auto flex flex-col max-h-[92vh]"
      >
        {/* Modal Header */}
        <div className="p-4 bg-stone-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-stone-100">Pin Delivery Doorstep on Google Maps</h3>
              <p className="text-xs text-stone-400">Click anywhere on the map or detect your current GPS location</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Map Canvas */}
        <div className="relative w-full h-[320px] sm:h-[380px] bg-stone-100">
          {hasKey ? (
            <Map
              defaultCenter={markerPos}
              defaultZoom={15}
              mapId="DEMO_MAP_ID"
              onClick={handleMapClick}
              className="w-full h-full"
              style={{ width: '100%', height: '100%' }}
              gestureHandling="greedy"
              disableDefaultUI={false}
              {...({ internalUsageAttributionIds: ['gmp_mcp_codeassist_v1_aistudio'] } as any)}
            >
              <AdvancedMarker position={markerPos} title="Delivery Location">
                <Pin
                  background="#059669"
                  glyphColor="#ffffff"
                  borderColor="#047857"
                  scale={1.2}
                />
              </AdvancedMarker>
            </Map>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-radial from-stone-50 to-stone-100">
              <MapPin className="w-10 h-10 text-amber-600 mb-2" />
              <h5 className="font-bold text-stone-800 text-sm">Interactive Delivery Location Selector</h5>
              <p className="text-xs text-stone-500 max-w-sm mt-1">
                Select your delivery address coordinates using the interactive pin placement or quick preset buttons below.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                {[
                  { name: 'Kankarbagh, Patna', pin: '800020' },
                  { name: 'Boring Road, Patna', pin: '800013' },
                  { name: 'Bailey Road, Patna', pin: '801503' },
                  { name: 'Frazer Road, Patna', pin: '800001' },
                ].map((p) => (
                  <button
                    key={p.pin}
                    type="button"
                    onClick={() => {
                      setResolvedAddress({
                        addressLine: p.name,
                        city: 'Patna',
                        state: 'Bihar',
                        pincode: p.pin,
                        landmark: 'Main Road',
                      });
                    }}
                    className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-white border border-stone-300 hover:border-amber-500 hover:bg-amber-50 text-stone-700 transition"
                  >
                    📍 {p.name} ({p.pin})
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Floating GPS Button */}
          <button
            type="button"
            onClick={handleDetectCurrentLocation}
            disabled={isLocating}
            className="absolute top-3 right-3 z-10 bg-white hover:bg-stone-50 text-stone-800 text-xs font-bold px-3 py-2 rounded-xl shadow-lg border border-stone-200 flex items-center gap-1.5 transition touch-manipulation cursor-pointer"
          >
            <Navigation className={`w-3.5 h-3.5 text-amber-600 ${isLocating ? 'animate-spin' : ''}`} />
            <span>{isLocating ? 'Locating...' : 'Use My GPS'}</span>
          </button>
        </div>

        {/* Selected Address Details Card */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 space-y-3">
          <div className="bg-white p-3 rounded-xl border border-stone-200 shadow-2xs">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                Confirmed Location
              </span>
              {isGeocoding && (
                <span className="text-[10px] text-amber-700 animate-pulse">Resolving address...</span>
              )}
            </div>
            <p className="font-bold text-stone-800 text-sm">{resolvedAddress.addressLine}</p>
            <p className="text-xs text-stone-600">
              {resolvedAddress.landmark ? `Near ${resolvedAddress.landmark}, ` : ''}
              {resolvedAddress.city}, {resolvedAddress.state} -{' '}
              <strong className="text-amber-800 font-mono font-bold">{resolvedAddress.pincode}</strong>
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-100 text-xs font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Use This Delivery Address</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
