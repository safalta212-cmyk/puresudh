import React, { useState, useCallback, useMemo } from 'react';
import {
  Map,
  AdvancedMarker,
  Pin,
  InfoWindow,
  useMap,
} from '@vis.gl/react-google-maps';
import {
  MapPin,
  Navigation,
  Clock,
  ShieldCheck,
  Truck,
  Zap,
  CheckCircle2,
  AlertCircle,
  Phone,
  ExternalLink,
} from 'lucide-react';
import { useGoogleMaps } from './GoogleMapsProvider';
import { useDelivery } from '../../context/DeliveryContext';

export interface HubLocation {
  id: string;
  name: string;
  address: string;
  pincode: string;
  position: { lat: number; lng: number };
  radiusMeters: number;
  phone: string;
  eta: string;
  fastDelivery: boolean;
  active: boolean;
}

export const PURE_SUDH_HUBS: HubLocation[] = [
  {
    id: 'hub-1',
    name: 'PureSudh Central Kitchen & Dairy Depot',
    address: 'Frazer Road, Near Patna Junction',
    pincode: '800001',
    position: { lat: 25.6093, lng: 85.1376 },
    radiusMeters: 5500,
    phone: '+91 98765 43210',
    eta: '25-35 mins',
    fastDelivery: true,
    active: true,
  },
  {
    id: 'hub-2',
    name: 'Kankarbagh Express Fulfillment Hub',
    address: 'Main Road, Kankarbagh Colony',
    pincode: '800020',
    position: { lat: 25.5941, lng: 85.1554 },
    radiusMeters: 4500,
    phone: '+91 98765 43211',
    eta: '30-40 mins',
    fastDelivery: true,
    active: true,
  },
  {
    id: 'hub-3',
    name: 'Boring Road Sweets & Snacks Dispatch',
    address: 'Boring Road Crossing, Sri Krishna Puri',
    pincode: '800013',
    position: { lat: 25.6207, lng: 85.1147 },
    radiusMeters: 4000,
    phone: '+91 98765 43212',
    eta: '20-30 mins',
    fastDelivery: true,
    active: true,
  },
  {
    id: 'hub-4',
    name: 'Bailey Road West Patna Hub',
    address: 'Near Saguna More, Bailey Road',
    pincode: '801503',
    position: { lat: 25.6144, lng: 85.0486 },
    radiusMeters: 5000,
    phone: '+91 98765 43213',
    eta: '35-45 mins',
    fastDelivery: false,
    active: true,
  },
];

const DEFAULT_CENTER = { lat: 25.612, lng: 85.125 }; // Patna Center
const DEFAULT_ZOOM = 12;

export const StoreDeliveryCoverageMap: React.FC<{
  onSelectPincode?: (pincode: string) => void;
  className?: string;
}> = ({ onSelectPincode, className = '' }) => {
  const { hasKey } = useGoogleMaps();
  const { setPincode, pincode: activePincode } = useDelivery();
  const [selectedHub, setSelectedHub] = useState<HubLocation | null>(PURE_SUDH_HUBS[0]);
  const [userMarker, setUserMarker] = useState<{ lat: number; lng: number } | null>(null);
  const [locatingUser, setLocatingUser] = useState(false);
  const [userLocationStatus, setUserLocationStatus] = useState<string | null>(null);

  // Approximate distance calculation in km
  const getDistanceKm = (
    pos1: { lat: number; lng: number },
    pos2: { lat: number; lng: number }
  ) => {
    const R = 6371; // Earth's radius in km
    const dLat = ((pos2.lat - pos1.lat) * Math.PI) / 180;
    const dLng = ((pos2.lng - pos1.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((pos1.lat * Math.PI) / 180) *
        Math.cos((pos2.lat * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Number((R * c).toFixed(1));
  };

  const closestHub = useMemo(() => {
    if (!userMarker) return null;
    let minDistance = Infinity;
    let nearest: HubLocation | null = null;

    PURE_SUDH_HUBS.forEach((hub) => {
      const dist = getDistanceKm(userMarker, hub.position);
      if (dist < minDistance) {
        minDistance = dist;
        nearest = hub;
      }
    });

    return { hub: nearest, distanceKm: minDistance };
  }, [userMarker]);

  const isUserWithinDeliveryRadius = useMemo(() => {
    if (!closestHub || !closestHub.hub) return false;
    return closestHub.distanceKm <= closestHub.hub.radiusMeters / 1000;
  }, [closestHub]);

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setUserLocationStatus('Geolocation is not supported by your browser');
      return;
    }

    setLocatingUser(true);
    setUserLocationStatus('Detecting your GPS location...');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserMarker(coords);
        setLocatingUser(false);
        setUserLocationStatus('Location detected! See your nearest PureSudh hub.');
      },
      (err) => {
        console.warn('Geolocation failed:', err);
        setLocatingUser(false);
        setUserLocationStatus('Unable to retrieve location. You can click on the map to place a pin.');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleMapClick = (e: any) => {
    if (e.detail?.latLng) {
      const coords = {
        lat: e.detail.latLng.lat,
        lng: e.detail.latLng.lng,
      };
      setUserMarker(coords);
      setUserLocationStatus('Destination pin placed.');
    }
  };

  return (
    <div className={`flex flex-col rounded-2xl overflow-hidden border border-stone-200 bg-white shadow-sm ${className}`}>
      {/* Header Bar */}
      <div className="p-3 sm:p-4 bg-stone-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <Truck className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-sm sm:text-base text-stone-100 flex items-center gap-2">
              Google Maps Live Delivery Coverage
              <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                Live Coverage
              </span>
            </h4>
            <p className="text-xs text-stone-400">
              Interactive store hubs, express dispatch radii, and doorstep deliverability
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDetectLocation}
          disabled={locatingUser}
          className="self-start sm:self-auto flex items-center gap-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition disabled:opacity-50 touch-manipulation cursor-pointer"
        >
          <Navigation className={`w-3.5 h-3.5 ${locatingUser ? 'animate-spin' : ''}`} />
          <span>{locatingUser ? 'Detecting...' : 'Detect My Location'}</span>
        </button>
      </div>

      {/* Map Area */}
      <div className="relative w-full h-[320px] sm:h-[400px] bg-stone-100">
        {hasKey ? (
          <Map
            defaultCenter={DEFAULT_CENTER}
            defaultZoom={DEFAULT_ZOOM}
            mapId="DEMO_MAP_ID"
            onClick={handleMapClick}
            className="w-full h-full"
            style={{ width: '100%', height: '100%' }}
            gestureHandling="greedy"
            disableDefaultUI={false}
            {...({ internalUsageAttributionIds: ['gmp_mcp_codeassist_v1_aistudio'] } as any)}
          >
            {/* PureSudh Hub Markers */}
            {PURE_SUDH_HUBS.map((hub) => (
              <AdvancedMarker
                key={hub.id}
                position={hub.position}
                title={hub.name}
                onClick={() => setSelectedHub(hub)}
              >
                <Pin
                  background="#b45309"
                  glyphColor="#ffffff"
                  borderColor="#78350f"
                  scale={1.1}
                />
              </AdvancedMarker>
            ))}

            {/* User Selected Pin */}
            {userMarker && (
              <AdvancedMarker position={userMarker} title="Your Selected Delivery Location">
                <Pin
                  background="#059669"
                  glyphColor="#ffffff"
                  borderColor="#047857"
                  scale={1.2}
                />
              </AdvancedMarker>
            )}

            {/* Info Window for Selected Hub */}
            {selectedHub && (
              <InfoWindow
                position={selectedHub.position}
                onCloseClick={() => setSelectedHub(null)}
              >
                <div className="p-1 max-w-xs text-stone-800">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 mb-1">
                    <Truck className="w-3.5 h-3.5" />
                    <span>{selectedHub.name}</span>
                  </div>
                  <p className="text-xs text-stone-600 mb-2">{selectedHub.address}</p>
                  <div className="flex items-center gap-2 text-[11px] mb-2 font-semibold">
                    <span className="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                      PIN {selectedHub.pincode}
                    </span>
                    <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {selectedHub.eta}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setPincode(selectedHub.pincode);
                      if (onSelectPincode) onSelectPincode(selectedHub.pincode);
                    }}
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold py-1 px-2 rounded-lg transition"
                  >
                    Select PIN {selectedHub.pincode}
                  </button>
                </div>
              </InfoWindow>
            )}
          </Map>
        ) : (
          /* High-fidelity Fallback when API Key is pending */
          <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-radial from-stone-50 to-stone-100 text-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#d97706_1px,transparent_1px)] [background-size:16px_16px]" />
            
            <div className="relative z-10 max-w-md mx-auto space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto shadow-sm">
                <MapPin className="w-6 h-6" />
              </div>
              <h5 className="font-bold text-stone-800 text-base">Google Maps Coverage Preview</h5>
              <p className="text-xs text-stone-600 leading-relaxed">
                Connect your Google Maps Platform API key in the environment or settings to activate live street tiles, interactive geocoding, and real-time transit directions.
              </p>
              
              <div className="bg-white/80 backdrop-blur-xs p-3 rounded-xl border border-stone-200 text-xs text-stone-700 text-left space-y-1.5 shadow-2xs">
                <div className="font-semibold text-stone-800 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Active PureSudh Hubs in Patna:
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  {PURE_SUDH_HUBS.map((h) => (
                    <div
                      key={h.id}
                      onClick={() => {
                        setPincode(h.pincode);
                        if (onSelectPincode) onSelectPincode(h.pincode);
                      }}
                      className="p-1.5 rounded-lg bg-stone-50 hover:bg-amber-50 hover:border-amber-200 border border-stone-200 cursor-pointer transition"
                    >
                      <strong className="block text-stone-900 truncate">{h.name.split(' ')[0]} Hub</strong>
                      <span className="text-stone-500">PIN {h.pincode} • {h.eta}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Floating Controls Overlay */}
        <div className="absolute top-3 left-3 z-10 flex flex-col gap-2 max-w-[220px]">
          <div className="bg-white/95 backdrop-blur-md p-2.5 rounded-xl border border-stone-200 shadow-md text-xs">
            <div className="font-bold text-stone-800 mb-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-amber-600" /> Service Hubs
            </div>
            <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
              {PURE_SUDH_HUBS.map((hub) => (
                <button
                  key={hub.id}
                  type="button"
                  onClick={() => setSelectedHub(hub)}
                  className={`w-full text-left px-2 py-1 rounded-md text-[11px] font-medium transition flex items-center justify-between ${
                    selectedHub?.id === hub.id
                      ? 'bg-amber-100 text-amber-900 font-bold'
                      : 'text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  <span className="truncate">{hub.name.split(' ')[0]}</span>
                  <span className="text-[10px] text-stone-400 font-mono ml-1">{hub.pincode}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* User Marker Deliverability Card */}
        {userMarker && closestHub?.hub && (
          <div className="absolute bottom-3 left-3 right-3 sm:left-auto sm:right-3 sm:max-w-xs z-10 bg-white/95 backdrop-blur-md p-3 rounded-xl border border-stone-200 shadow-lg text-xs animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-start gap-2">
              {isUserWithinDeliveryRadius ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              )}
              <div>
                <strong className={isUserWithinDeliveryRadius ? 'text-emerald-900 font-bold' : 'text-amber-900 font-bold'}>
                  {isUserWithinDeliveryRadius
                    ? 'Within Express Delivery Zone!'
                    : 'Near Coverage Boundary'}
                </strong>
                <p className="text-[11px] text-stone-600 mt-0.5">
                  Approx. <strong>{closestHub.distanceKm} km</strong> from {closestHub.hub.name.split(' ')[0]} Hub.
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (closestHub?.hub) {
                        setPincode(closestHub.hub.pincode);
                        if (onSelectPincode) onSelectPincode(closestHub.hub.pincode);
                      }
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] px-2.5 py-1 rounded-lg transition"
                  >
                    Use Nearest PIN ({closestHub.hub.pincode})
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Info Strip */}
      <div className="p-3 bg-stone-50 border-t border-stone-200 text-xs text-stone-600 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-emerald-700 font-semibold">
            <Zap className="w-3.5 h-3.5 fill-emerald-600" /> 30-Min Express Hubs
          </span>
          <span className="text-stone-300">•</span>
          <span className="text-stone-500">Insulated Temperature-Controlled Vans & Bikes</span>
        </div>
        {userLocationStatus && (
          <span className="text-amber-800 font-medium text-[11px]">{userLocationStatus}</span>
        )}
      </div>
    </div>
  );
};
