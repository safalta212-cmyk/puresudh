import React, { useEffect, useMemo, useRef } from 'react';
import { Map as GoogleMap, AdvancedMarker, Pin, useMap } from '@vis.gl/react-google-maps';
import { Truck, MapPin, Navigation } from 'lucide-react';
import { useGoogleMaps } from './GoogleMapsProvider';
import { LiveTrackingSession } from '../../types';
import { DEFAULT_HUB_COORDS, isGpsFixStale, isOrderTerminal } from '../../services/gpsTrackingService';

interface AdminFleetMapProps {
  sessions: LiveTrackingSession[];
  selectedOrderId?: string | null;
  onSelectSession?: (session: LiveTrackingSession) => void;
}

const MapViewportController: React.FC<{
  target: { lat: number; lng: number };
  selectedOrderId?: string | null;
}> = ({ target, selectedOrderId }) => {
  const map = useMap();
  const lastSelectedRef = useRef<string | null | undefined>(selectedOrderId);

  useEffect(() => {
    if (!map) return;
    if (lastSelectedRef.current !== selectedOrderId) {
      lastSelectedRef.current = selectedOrderId;
      map.panTo(target);
    }
  }, [map, selectedOrderId, target]);

  return null;
};

export const AdminFleetMap: React.FC<AdminFleetMapProps> = ({
  sessions,
  selectedOrderId,
  onSelectSession,
}) => {
  const { hasKey } = useGoogleMaps();

  const activeSessions = useMemo(
    () => sessions.filter((s) => s.isActive && !isOrderTerminal(s.orderStatus)),
    [sessions]
  );

  const selectedSession = useMemo(
    () => activeSessions.find((s) => s.orderId === selectedOrderId) || activeSessions[0] || null,
    [activeSessions, selectedOrderId]
  );

  const center = useMemo(() => {
    if (selectedSession?.riderLocation) {
      return {
        lat: selectedSession.riderLocation.lat,
        lng: selectedSession.riderLocation.lng,
      };
    }
    if (selectedSession?.destinationLocation) {
      return {
        lat: selectedSession.destinationLocation.lat,
        lng: selectedSession.destinationLocation.lng,
      };
    }
    return { lat: DEFAULT_HUB_COORDS.lat, lng: DEFAULT_HUB_COORDS.lng };
  }, [selectedSession]);

  if (!hasKey) {
    return (
      <div className="w-full h-[360px] rounded-2xl border border-stone-200 bg-stone-50 flex flex-col items-center justify-center p-6 text-center space-y-2">
        <Navigation className="w-8 h-8 text-amber-600" />
        <p className="text-sm font-bold text-stone-800">Google Maps Live Fleet Overview</p>
        <p className="text-xs text-stone-500 max-w-md">
          {activeSessions.length} active delivery session(s) streaming GPS coordinates. Configure Google Maps API key to view interactive satellite/road tiles.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl overflow-hidden border border-stone-200 bg-white shadow-xs">
      <div className="px-4 py-2.5 bg-stone-900 text-white flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 font-bold">
          <Navigation className="w-4 h-4 text-emerald-400" />
          <span>Active Fleet GPS Map ({activeSessions.length} active deliveries)</span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-stone-300">
          <span className="inline-flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Rider
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Customer Destination
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500" /> Shared Customer Pin
          </span>
        </div>
      </div>

      <div className="w-full h-[380px] sm:h-[440px]">
        <GoogleMap
          defaultCenter={center}
          defaultZoom={12}
          mapId="DEMO_MAP_ID"
          className="w-full h-full"
          style={{ width: '100%', height: '100%' }}
          gestureHandling="greedy"
          {...({ internalUsageAttributionIds: ['gmp_mcp_codeassist_v1_aistudio'] } as any)}
        >
          <MapViewportController target={center} selectedOrderId={selectedSession?.orderId} />
          {/* Dispatch Hub */}
          <AdvancedMarker
            position={{ lat: DEFAULT_HUB_COORDS.lat, lng: DEFAULT_HUB_COORDS.lng }}
            title="PureSudh Central Dispatch Hub"
          >
            <Pin background="#78350f" glyphColor="#ffffff" borderColor="#451a03" scale={0.95} />
          </AdvancedMarker>

          {activeSessions.map((session) => {
            const isSelected = session.orderId === selectedSession?.orderId;
            const stale = isGpsFixStale(session.lastUpdatedAt, 30000);
            return (
              <React.Fragment key={session.orderId}>
                {/* Rider Location */}
                {session.riderLocation && (
                  <AdvancedMarker
                    position={{ lat: session.riderLocation.lat, lng: session.riderLocation.lng }}
                    title={`${session.deliveryPersonName || 'Rider'} • Order #${session.orderNumber}`}
                    onClick={() => onSelectSession?.(session)}
                  >
                    <div
                      className={`px-2 py-1 rounded-full border-2 border-white shadow-md flex items-center gap-1 text-[10px] font-bold cursor-pointer transition-transform ${
                        isSelected ? 'scale-110 ring-2 ring-amber-300' : ''
                      } ${
                        stale || session.trackingStatus !== 'active'
                          ? 'bg-stone-700 text-stone-100'
                          : 'bg-amber-500 text-stone-950'
                      }`}
                    >
                      <Truck className="w-3 h-3" />
                      <span>#{session.orderNumber.slice(-5)}</span>
                    </div>
                  </AdvancedMarker>
                )}

                {/* Active Delivery Destination */}
                {session.destinationLocation && (
                  <AdvancedMarker
                    position={{
                      lat: session.destinationLocation.lat,
                      lng: session.destinationLocation.lng,
                    }}
                    title={`Destination • #${session.orderNumber} (${session.customerName || 'Customer'})`}
                    onClick={() => onSelectSession?.(session)}
                  >
                    <Pin
                      background={isSelected ? '#047857' : '#10b981'}
                      glyphColor="#ffffff"
                      borderColor="#065f46"
                      scale={isSelected ? 1.15 : 0.95}
                    />
                  </AdvancedMarker>
                )}

                {/* Voluntary Shared Customer Location ONLY during active delivery */}
                {session.customerSharingEnabled && session.customerLocation && (
                  <AdvancedMarker
                    position={{
                      lat: session.customerLocation.lat,
                      lng: session.customerLocation.lng,
                    }}
                    title={`Customer Shared Pin • #${session.orderNumber}`}
                    onClick={() => onSelectSession?.(session)}
                  >
                    <div className="w-6 h-6 rounded-full bg-sky-600 text-white border-2 border-white shadow-md flex items-center justify-center">
                      <MapPin className="w-3 h-3" />
                    </div>
                  </AdvancedMarker>
                )}
              </React.Fragment>
            );
          })}
        </GoogleMap>
      </div>
    </div>
  );
};
