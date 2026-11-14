import React, { useMemo } from 'react';
import {
  Map,
  AdvancedMarker,
  Pin,
  Polyline,
} from '@vis.gl/react-google-maps';
import {
  Truck,
  MapPin,
  Clock,
  ShieldCheck,
  Navigation,
  Phone,
  CheckCircle2,
} from 'lucide-react';
import { useGoogleMaps } from './GoogleMapsProvider';
import { Order, OrderStatus } from '../../types';

interface OrderTrackingMapProps {
  order: Order;
  className?: string;
}

// Default central hub coordinates (Patna Central Depot)
const HUB_COORDS = { lat: 25.6093, lng: 85.1376 };

// Approximate delivery destination coordinates based on pincode or random offset for demo
const getDestinationCoords = (pincode: string) => {
  const code = pincode.replace(/\D/g, '');
  if (code.endsWith('20')) return { lat: 25.5941, lng: 85.1554 }; // Kankarbagh
  if (code.endsWith('13')) return { lat: 25.6207, lng: 85.1147 }; // Boring Road
  if (code.endsWith('03')) return { lat: 25.6144, lng: 85.0486 }; // Bailey Road
  if (code.endsWith('14')) return { lat: 25.6178, lng: 85.1278 }; // Rajendra Nagar
  // Default nearby variation
  return { lat: 25.615, lng: 85.142 };
};

export const OrderTrackingMap: React.FC<OrderTrackingMapProps> = ({
  order,
  className = '',
}) => {
  const { hasKey } = useGoogleMaps();
  const destCoords = useMemo(
    () => getDestinationCoords(order.deliveryAddress?.pincode || '800001'),
    [order.deliveryAddress?.pincode]
  );

  // Compute rider position based on current order status
  const riderPosition = useMemo(() => {
    const status = order.status;
    if (status === 'Delivered') return destCoords;
    if (status === 'Out for Delivery') {
      // 75% of the way towards destination
      return {
        lat: HUB_COORDS.lat + (destCoords.lat - HUB_COORDS.lat) * 0.75,
        lng: HUB_COORDS.lng + (destCoords.lng - HUB_COORDS.lng) * 0.75,
      };
    }
    if (status === 'Packed') {
      // 25% of the way (leaving hub)
      return {
        lat: HUB_COORDS.lat + (destCoords.lat - HUB_COORDS.lat) * 0.25,
        lng: HUB_COORDS.lng + (destCoords.lng - HUB_COORDS.lng) * 0.25,
      };
    }
    // At hub (Order Placed, Confirmed, Preparing)
    return HUB_COORDS;
  }, [order.status, destCoords]);

  // Map center halfway between hub and destination
  const mapCenter = useMemo(
    () => ({
      lat: (HUB_COORDS.lat + destCoords.lat) / 2,
      lng: (HUB_COORDS.lng + destCoords.lng) / 2,
    }),
    [destCoords]
  );

  const routePath = useMemo(
    () => [
      HUB_COORDS,
      {
        lat: (HUB_COORDS.lat + destCoords.lat) / 2 + 0.003,
        lng: (HUB_COORDS.lng + destCoords.lng) / 2 - 0.002,
      },
      destCoords,
    ],
    [destCoords]
  );

  return (
    <div className={`rounded-2xl overflow-hidden border border-stone-200 bg-white shadow-sm flex flex-col ${className}`}>
      {/* Status Bar */}
      <div className="p-3.5 bg-stone-900 text-white flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <Navigation className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-stone-100 flex items-center gap-2">
              Live Google Maps Route
              <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">
                {order.status}
              </span>
            </h4>
            <p className="text-xs text-stone-400">
              Kitchen Dispatch Hub ➔ {order.deliveryAddress?.addressLine || 'Customer Doorstep'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs bg-stone-800/80 px-3 py-1.5 rounded-xl border border-stone-700">
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-stone-300">ETA:</span>
          <strong className="text-white font-semibold">
            {order.estimatedDeliveryTime || '25-35 mins'}
          </strong>
        </div>
      </div>

      {/* Map View */}
      <div className="relative w-full h-[280px] sm:h-[340px] bg-stone-100">
        {hasKey ? (
          <Map
            defaultCenter={mapCenter}
            defaultZoom={13}
            mapId="DEMO_MAP_ID"
            className="w-full h-full"
            style={{ width: '100%', height: '100%' }}
            gestureHandling="greedy"
            disableDefaultUI={false}
            {...({ internalUsageAttributionIds: ['gmp_mcp_codeassist_v1_aistudio'] } as any)}
          >
            {/* Hub Pin */}
            <AdvancedMarker position={HUB_COORDS} title="PureSudh Central Kitchen">
              <Pin
                background="#b45309"
                glyphColor="#ffffff"
                borderColor="#78350f"
                scale={1.1}
              />
            </AdvancedMarker>

            {/* Destination Pin */}
            <AdvancedMarker position={destCoords} title="Your Delivery Address">
              <Pin
                background="#059669"
                glyphColor="#ffffff"
                borderColor="#047857"
                scale={1.2}
              />
            </AdvancedMarker>

            {/* Rider Marker */}
            {order.status !== 'Delivered' && (
              <AdvancedMarker position={riderPosition} title="PureSudh Express Rider">
                <div className="w-8 h-8 rounded-full bg-amber-500 text-stone-900 border-2 border-white shadow-lg flex items-center justify-center animate-bounce">
                  <Truck className="w-4 h-4 text-stone-950 font-bold" />
                </div>
              </AdvancedMarker>
            )}

            {/* Polyline Route */}
            <Polyline
              path={routePath}
              strokeColor="#d97706"
              strokeOpacity={0.8}
              strokeWeight={4}
            />
          </Map>
        ) : (
          /* High-Fidelity Interactive Map Preview */
          <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-radial from-stone-50 to-stone-100 text-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#059669_1px,transparent_1px)] [background-size:16px_16px]" />
            
            <div className="relative z-10 max-w-sm mx-auto space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto shadow-sm">
                <Truck className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h5 className="font-bold text-stone-800 text-sm sm:text-base">
                  Transit Map: Hub to Delivery Doorstep
                </h5>
                <p className="text-xs text-stone-500 mt-0.5">
                  Route to {order.deliveryAddress?.city || 'Patna'} ({order.deliveryAddress?.pincode})
                </p>
              </div>

              {/* Waypoints Visualizer */}
              <div className="bg-white/90 backdrop-blur-xs p-3 rounded-xl border border-stone-200 text-xs text-left shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-600" />
                    <span className="font-medium text-stone-700">Central Kitchen Hub</span>
                  </div>
                  <span className="text-[11px] text-stone-400 font-mono">Dispatched</span>
                </div>
                <div className="border-l-2 border-dashed border-amber-300 ml-1 pl-3.5 py-1 text-[11px] text-amber-800 font-semibold flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5" />
                  <span>Rider in transit • 3.8 km remaining</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                    <span className="font-medium text-stone-700 truncate max-w-[170px]">
                      {order.deliveryAddress?.addressLine || 'Your Address'}
                    </span>
                  </div>
                  <span className="text-[11px] text-emerald-700 font-bold">
                    {order.estimatedDeliveryTime || '25-35m'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Floating Rider Contact Card */}
        <div className="absolute bottom-3 left-3 right-3 sm:left-auto sm:right-3 sm:max-w-xs z-10 bg-white/95 backdrop-blur-md p-3 rounded-xl border border-stone-200 shadow-md text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs">
                🏍️
              </div>
              <div>
                <p className="font-bold text-stone-900 leading-tight">PureSudh Express Fleet</p>
                <p className="text-[10px] text-stone-500">Insulated Box #4 • Sanitized</p>
              </div>
            </div>
            <a
              href="tel:+919876543210"
              className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold px-2.5 py-1 rounded-lg transition"
            >
              <Phone className="w-3 h-3" /> Call
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
