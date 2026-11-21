import React, { useState, useEffect, useRef } from 'react';
import {
  Map as GoogleMap,
  AdvancedMarker,
  Pin,
  useMap,
} from '@vis.gl/react-google-maps';
import {
  MapPin,
  X,
  Check,
  Navigation,
  Search,
  AlertCircle,
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

const PickerCameraController: React.FC<{ target: { lat: number; lng: number } }> = ({ target }) => {
  const map = useMap();
  const lastKeyRef = useRef<string>('');

  useEffect(() => {
    if (!map || !target) return;
    const key = `${target.lat.toFixed(5)},${target.lng.toFixed(5)}`;
    if (lastKeyRef.current === key) return;
    lastKeyRef.current = key;
    map.panTo(target);
  }, [map, target]);

  return null;
};

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
  const [pickerError, setPickerError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setPickerError(null);
    if (initialCoords) {
      setMarkerPos(initialCoords);
    } else if (initialPincode) {
      // Optionally center on initial pincode via server geocode
      fetch(`/api/maps/geocode?address=${encodeURIComponent(`Patna ${initialPincode}`)}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.success && typeof data.lat === 'number' && typeof data.lng === 'number') {
            setMarkerPos({ lat: data.lat, lng: data.lng });
            setResolvedAddress((prev) => ({
              addressLine: data.addressLine || prev.addressLine,
              city: data.city || prev.city,
              state: data.state || prev.state,
              pincode: data.pincode || initialPincode || prev.pincode,
              landmark: data.landmark || prev.landmark,
            }));
          }
        })
        .catch(() => {});
    }
  }, [isOpen, initialCoords, initialPincode]);

  if (!isOpen) return null;

  // CORS-safe server-side reverse geocoding proxy (replaces legacy google.maps.Geocoder)
  const reverseGeocode = async (pos: { lat: number; lng: number }) => {
    setIsGeocoding(true);
    setPickerError(null);
    try {
      const res = await fetch(
        `/api/maps/reverse-geocode?lat=${encodeURIComponent(pos.lat)}&lng=${encodeURIComponent(pos.lng)}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data?.success) {
          setResolvedAddress((prev) => ({
            addressLine: data.addressLine || data.formattedAddress || prev.addressLine,
            city: data.city || 'Patna',
            state: data.state || 'Bihar',
            pincode: data.pincode || prev.pincode || '',
            landmark: data.landmark || '',
          }));
          setIsGeocoding(false);
          return;
        }
      }
      setPickerError('Could not automatically resolve street address. Please confirm coordinates or use presets.');
    } catch {
      setPickerError('Network error while resolving pinned location.');
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleSearchAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = searchQuery.trim();
    if (!clean) return;

    setIsGeocoding(true);
    setPickerError(null);
    try {
      const res = await fetch(`/api/maps/geocode?address=${encodeURIComponent(clean)}`);
      const data = await res.json();
      if (res.ok && data?.success && typeof data.lat === 'number' && typeof data.lng === 'number') {
        setMarkerPos({ lat: data.lat, lng: data.lng });
        setResolvedAddress({
          addressLine: data.addressLine || clean,
          city: data.city || 'Patna',
          state: data.state || 'Bihar',
          pincode: data.pincode || initialPincode || '800001',
          landmark: data.landmark || '',
        });
      } else {
        setPickerError(data?.error || 'Location not found. Try searching a Patna neighborhood or 6-digit pincode.');
      }
    } catch {
      setPickerError('Unable to reach address search service right now.');
    } finally {
      setIsGeocoding(false);
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
    if (!navigator.geolocation) {
      setPickerError('Browser geolocation is not supported on this device.');
      return;
    }
    setIsLocating(true);
    setPickerError(null);
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
        setIsLocating(false);
        if (err.code === 1) {
          setPickerError('Location permission denied. Enable browser location or click anywhere on the map.');
        } else {
          setPickerError('Unable to detect GPS coordinates. Please search or click on the map.');
        }
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
              <p className="text-xs text-stone-400">Search your area, click on the map, or detect your current GPS location</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearchAddress} className="p-3 bg-stone-50 border-b border-stone-200 flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search neighborhood or 6-digit PIN (e.g. Boring Road, 801503, Kankarbagh)"
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <button
            type="submit"
            disabled={isGeocoding}
            className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold transition disabled:opacity-50 cursor-pointer shrink-0"
          >
            Search
          </button>
        </form>

        {/* Map Canvas */}
        <div className="relative w-full h-[300px] sm:h-[360px] bg-stone-100">
          {hasKey ? (
            <GoogleMap
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
              <PickerCameraController target={markerPos} />
              <AdvancedMarker position={markerPos} title="Delivery Location">
                <Pin
                  background="#059669"
                  glyphColor="#ffffff"
                  borderColor="#047857"
                  scale={1.2}
                />
              </AdvancedMarker>
            </GoogleMap>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-radial from-stone-50 to-stone-100">
              <MapPin className="w-10 h-10 text-amber-600 mb-2" />
              <h5 className="font-bold text-stone-800 text-sm">Interactive Delivery Location Selector</h5>
              <p className="text-xs text-stone-500 max-w-sm mt-1">
                Select your delivery address coordinates using the search bar above or quick preset buttons below.
              </p>
              <div className="flex flex-wrap justify-center gap-2 mt-3">
                {[
                  { name: 'Frazer Road, Patna', pin: '800001', lat: 25.6093, lng: 85.1376 },
                  { name: 'Kankarbagh, Patna', pin: '800020', lat: 25.5941, lng: 85.1554 },
                  { name: 'Boring Road, Patna', pin: '800013', lat: 25.6207, lng: 85.1147 },
                  { name: 'Bailey Road West, Patna', pin: '801503', lat: 25.6144, lng: 85.0486 },
                ].map((p) => (
                  <button
                    key={p.pin}
                    type="button"
                    onClick={() => {
                      setMarkerPos({ lat: p.lat, lng: p.lng });
                      setResolvedAddress({
                        addressLine: p.name,
                        city: 'Patna',
                        state: 'Bihar',
                        pincode: p.pin,
                        landmark: 'Main Road',
                      });
                    }}
                    className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-white border border-stone-300 hover:border-amber-500 hover:bg-amber-50 text-stone-700 transition cursor-pointer"
                  >
                    {p.name} ({p.pin})
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
          {pickerError && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{pickerError}</span>
            </div>
          )}

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
              {resolvedAddress.city}, {resolvedAddress.state}
              {resolvedAddress.pincode ? (
                <>
                  {' '}
                  - <strong className="text-amber-800 font-mono font-bold">{resolvedAddress.pincode}</strong>
                </>
              ) : null}
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-100 text-xs font-semibold transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
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
