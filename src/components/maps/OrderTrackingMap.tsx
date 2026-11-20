import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Map as GoogleMap,
  AdvancedMarker,
  Pin,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import {
  Truck,
  MapPin,
  Clock,
  Navigation,
  Phone,
  AlertTriangle,
  WifiOff,
  LocateFixed,
  ShieldCheck,
  UserCheck,
  XCircle,
} from 'lucide-react';
import { useGoogleMaps } from './GoogleMapsProvider';
import { useAuth } from '../../context/AuthContext';
import { GeoPointData, GpsTrackingStatus, LiveTrackingSession, Order } from '../../types';
import {
  DEFAULT_HUB_COORDS,
  formatLastUpdatedRelative,
  getFallbackDestinationCoords,
  haversineDistanceMeters,
  isGpsFixStale,
  isOrderTerminal,
  subscribeToOrderTracking,
  toggleCustomerLocationSharing,
} from '../../services/gpsTrackingService';

interface OrderTrackingMapProps {
  order: Order;
  trackingSession?: LiveTrackingSession | null;
  className?: string;
}

interface ComputedRouteMetrics {
  distanceText: string;
  durationText: string;
}

interface LiveRouteOverlayProps {
  origin: { lat: number; lng: number } | null;
  destination: { lat: number; lng: number };
  onRouteMetrics?: (metrics: ComputedRouteMetrics | null) => void;
}

const LiveDrivingRouteOverlay: React.FC<LiveRouteOverlayProps> = ({
  origin,
  destination,
  onRouteMetrics,
}) => {
  const map = useMap();
  const routesLib = useMapsLibrary('routes') as any;
  const activePolylinesRef = useRef<any[]>([]);
  const lastOriginRef = useRef<{ lat: number; lng: number } | null>(null);
  const lastDestRef = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!map || !routesLib?.Route?.computeRoutes || !origin) {
      activePolylinesRef.current.forEach((p) => {
        try {
          p.setMap(null);
        } catch {}
      });
      activePolylinesRef.current = [];
      return;
    }

    // Throttle route re-computation until rider moves >= 80m or destination changes
    const prevOrigin = lastOriginRef.current;
    const prevDest = lastDestRef.current;
    const originMoved = prevOrigin ? haversineDistanceMeters(prevOrigin, origin) : Infinity;
    const destMoved = prevDest ? haversineDistanceMeters(prevDest, destination) : Infinity;

    if (prevOrigin && prevDest && originMoved < 80 && destMoved < 30 && activePolylinesRef.current.length > 0) {
      return;
    }

    let isCancelled = false;

    const computeDrivingRoute = async () => {
      try {
        const result = await routesLib.Route.computeRoutes({
          origin,
          destination,
          travelMode: 'DRIVING',
          fields: ['path', 'distanceMeters', 'durationMillis', 'viewport'],
        });

        if (isCancelled) return;

        // Clear previous polylines cleanly
        activePolylinesRef.current.forEach((p) => {
          try {
            p.setMap(null);
          } catch {}
        });
        activePolylinesRef.current = [];

        const primaryRoute = result?.routes?.[0];
        if (!primaryRoute) {
          onRouteMetrics?.(null);
          return;
        }

        if (typeof primaryRoute.createPolylines === 'function') {
          const lines = primaryRoute.createPolylines();
          lines.forEach((line: any) => {
            if (typeof line.setOptions === 'function') {
              line.setOptions({
                strokeColor: '#059669',
                strokeOpacity: 0.9,
                strokeWeight: 5,
              });
            }
            if (typeof line.setMap === 'function') {
              line.setMap(map);
            }
          });
          activePolylinesRef.current = lines;
        }

        if (primaryRoute.viewport) {
          map.fitBounds(primaryRoute.viewport, 48);
        }

        lastOriginRef.current = origin;
        lastDestRef.current = destination;

        const distKm =
          typeof primaryRoute.distanceMeters === 'number'
            ? `${(primaryRoute.distanceMeters / 1000).toFixed(1)} km`
            : '';
        const durMins =
          typeof primaryRoute.durationMillis === 'number'
            ? `${Math.max(1, Math.round(primaryRoute.durationMillis / 60000))} mins`
            : '';

        if (distKm || durMins) {
          onRouteMetrics?.({
            distanceText: distKm,
            durationText: durMins,
          });
        }
      } catch (err: any) {
        const msg = String(err?.message || err || '');
        if (
          msg.includes('RESOURCE_EXHAUSTED') ||
          msg.includes('OVER_QUERY_LIMIT') ||
          msg.includes('429')
        ) {
          window.dispatchEvent(new Event('gmp-quota-exceeded'));
        }
        onRouteMetrics?.(null);
      }
    };

    computeDrivingRoute();

    return () => {
      isCancelled = true;
    };
  }, [map, routesLib, origin?.lat, origin?.lng, destination.lat, destination.lng]);

  // Clean up polylines on unmount
  useEffect(() => {
    return () => {
      activePolylinesRef.current.forEach((p) => {
        try {
          p.setMap(null);
        } catch {}
      });
      activePolylinesRef.current = [];
    };
  }, []);

  return null;
};

export const OrderTrackingMap: React.FC<OrderTrackingMapProps> = ({
  order,
  trackingSession: externalSession,
  className = '',
}) => {
  const { hasKey } = useGoogleMaps();
  const { user } = useAuth();
  const [internalSession, setInternalSession] = useState<LiveTrackingSession | null>(null);
  const [routeMetrics, setRouteMetrics] = useState<ComputedRouteMetrics | null>(null);
  const [nowTick, setNowTick] = useState<number>(() => Date.now());

  // Voluntary customer location sharing state
  const [isCustomerSharingBusy, setIsCustomerSharingBusy] = useState(false);
  const [customerShareError, setCustomerShareError] = useState<string | null>(null);
  const [customerGpsStatus, setCustomerGpsStatus] = useState<GpsTrackingStatus>('idle');
  const customerWatchRef = useRef<number | null>(null);

  const session = externalSession !== undefined ? externalSession : internalSession;
  const terminal = isOrderTerminal(order.status);

  // Subscribe internally only if parent did not already supply a session
  useEffect(() => {
    if (externalSession !== undefined || !order.id || terminal) {
      if (terminal) setInternalSession(null);
      return;
    }
    const unsub = subscribeToOrderTracking(
      order.id,
      (data) => setInternalSession(data),
      () => {}
    );
    return () => unsub();
  }, [order.id, externalSession, terminal]);

  // Tick every 5s so relative update age and staleness stay strictly accurate
  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 5000);
    return () => clearInterval(id);
  }, []);

  // Stop voluntary customer geolocation watch when terminal or unmounting
  useEffect(() => {
    if (terminal && customerWatchRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(customerWatchRef.current);
      customerWatchRef.current = null;
    }
    return () => {
      if (customerWatchRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.clearWatch(customerWatchRef.current);
        customerWatchRef.current = null;
      }
    };
  }, [terminal]);

  const destCoords: GeoPointData = useMemo(
    () =>
      session?.destinationLocation ||
      order.destinationCoordinates ||
      getFallbackDestinationCoords(order),
    [session?.destinationLocation, order]
  );

  const hubCoords: GeoPointData = session?.hubLocation || DEFAULT_HUB_COORDS;
  const riderCoords: GeoPointData | null =
    !terminal && session?.riderLocation ? session.riderLocation : null;
  const customerSharedCoords: GeoPointData | null =
    !terminal && session?.isActive && session?.customerSharingEnabled && session?.customerLocation
      ? session.customerLocation
      : null;

  const isSignalStale = useMemo(() => {
    if (!session?.isActive || !riderCoords) return false;
    return isGpsFixStale(session.lastUpdatedAt || riderCoords.timestamp, 30000, nowTick);
  }, [session?.isActive, session?.lastUpdatedAt, riderCoords, nowTick]);

  const effectiveSignalState: GpsTrackingStatus = useMemo(() => {
    if (terminal) return 'completed';
    if (!session || !session.isActive) return 'idle';
    if (
      session.trackingStatus === 'permission_denied' ||
      session.trackingStatus === 'gps_disabled' ||
      session.trackingStatus === 'network_error' ||
      session.trackingStatus === 'stopped'
    ) {
      return session.trackingStatus;
    }
    if (!riderCoords) return 'requesting_permission';
    if (isSignalStale || session.trackingStatus === 'stale') return 'stale';
    return 'active';
  }, [terminal, session, riderCoords, isSignalStale]);

  const routeOrigin = useMemo(() => {
    if (riderCoords) return { lat: riderCoords.lat, lng: riderCoords.lng };
    return { lat: hubCoords.lat, lng: hubCoords.lng };
  }, [riderCoords, hubCoords]);

  const mapCenter = useMemo(() => {
    const focus = riderCoords || hubCoords;
    return {
      lat: (focus.lat + destCoords.lat) / 2,
      lng: (focus.lng + destCoords.lng) / 2,
    };
  }, [riderCoords, hubCoords, destCoords]);

  const haversineRemainingKm = useMemo(() => {
    if (!riderCoords) return null;
    return (haversineDistanceMeters(riderCoords, destCoords) / 1000).toFixed(1);
  }, [riderCoords, destCoords]);

  const canShareCustomerLocation =
    Boolean(user?.uid) &&
    user?.uid === order.customerId &&
    !terminal &&
    Boolean(session?.isActive);

  const isSharingEnabled = Boolean(session?.customerSharingEnabled && customerSharedCoords);

  const handleToggleCustomerSharing = async () => {
    if (!user?.uid || user.uid !== order.customerId) return;
    setCustomerShareError(null);

    if (isSharingEnabled) {
      setIsCustomerSharingBusy(true);
      try {
        if (customerWatchRef.current !== null && navigator.geolocation) {
          navigator.geolocation.clearWatch(customerWatchRef.current);
          customerWatchRef.current = null;
        }
        await toggleCustomerLocationSharing(order, user.uid, false, null);
        setCustomerGpsStatus('stopped');
      } catch (err: any) {
        setCustomerShareError(err?.message || 'Could not stop location sharing.');
      } finally {
        setIsCustomerSharingBusy(false);
      }
      return;
    }

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setCustomerShareError('Geolocation is not supported on this browser.');
      setCustomerGpsStatus('gps_disabled');
      return;
    }

    setIsCustomerSharingBusy(true);
    setCustomerGpsStatus('requesting_permission');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const loc: GeoPointData = {
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
          accuracy: Math.round(pos.coords.accuracy || 0),
          timestamp: new Date().toISOString(),
        };
        try {
          await toggleCustomerLocationSharing(order, user.uid, true, loc);
          setCustomerGpsStatus('active');
        } catch (err: any) {
          setCustomerShareError(err?.message || 'Failed to update location sharing.');
        } finally {
          setIsCustomerSharingBusy(false);
        }
      },
      (err) => {
        setIsCustomerSharingBusy(false);
        if (err.code === 1) {
          setCustomerGpsStatus('permission_denied');
          setCustomerShareError(
            'Location permission denied. In Android Chrome tap the lock icon in the address bar → Permissions → Allow Location.'
          );
        } else if (err.code === 2) {
          setCustomerGpsStatus('gps_disabled');
          setCustomerShareError('Device GPS / Location is turned off. Please enable High Accuracy location.');
        } else {
          setCustomerGpsStatus('network_error');
          setCustomerShareError('Timed out acquiring your GPS pin. Please try again outdoors.');
        }
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 12000 }
    );
  };

  const assignedRiderName = session?.deliveryPersonName || order.assignedDeliveryName || '';
  const assignedRiderPhone = session?.deliveryPersonPhone || order.assignedDeliveryPhone || '';

  return (
    <div className={`rounded-2xl overflow-hidden border border-stone-200 bg-white shadow-sm flex flex-col ${className}`}>
      {/* Header Status Bar */}
      <div className="p-3.5 bg-stone-900 text-white flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              effectiveSignalState === 'active'
                ? 'bg-emerald-500/20 text-emerald-400'
                : effectiveSignalState === 'stale'
                ? 'bg-amber-500/20 text-amber-300'
                : 'bg-stone-700 text-stone-300'
            }`}
          >
            <Navigation className={`w-4 h-4 ${effectiveSignalState === 'active' ? 'animate-pulse' : ''}`} />
          </div>
          <div className="min-w-0">
            <h4 className="font-bold text-sm text-stone-100 flex flex-wrap items-center gap-2">
              Live GPS Delivery Map
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  effectiveSignalState === 'active'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : effectiveSignalState === 'stale'
                    ? 'bg-amber-500/20 text-amber-200 border-amber-500/40'
                    : effectiveSignalState === 'permission_denied' ||
                      effectiveSignalState === 'gps_disabled' ||
                      effectiveSignalState === 'network_error' ||
                      effectiveSignalState === 'stopped'
                    ? 'bg-rose-500/20 text-rose-200 border-rose-500/40'
                    : 'bg-stone-700/80 text-stone-300 border-stone-600'
                }`}
              >
                {effectiveSignalState === 'active'
                  ? 'Live GPS Active'
                  : effectiveSignalState === 'stale'
                  ? 'Signal Stale (>30s)'
                  : effectiveSignalState === 'stopped'
                  ? 'GPS Sharing Stopped'
                  : effectiveSignalState === 'permission_denied'
                  ? 'Rider Location Blocked'
                  : effectiveSignalState === 'gps_disabled'
                  ? 'Rider GPS Off'
                  : effectiveSignalState === 'network_error'
                  ? 'Rider Offline'
                  : effectiveSignalState === 'completed'
                  ? order.status
                  : 'Awaiting Rider Dispatch'}
              </span>
            </h4>
            <p className="text-xs text-stone-400 truncate">
              {order.deliveryAddress?.addressLine || 'Delivery Destination'} • {order.deliveryAddress?.pincode}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {riderCoords?.accuracy ? (
            <span className="bg-stone-800 px-2.5 py-1 rounded-lg border border-stone-700 text-stone-300 font-mono text-[11px]">
              ±{riderCoords.accuracy}m
            </span>
          ) : null}
          <div className="flex items-center gap-1.5 bg-stone-800/80 px-3 py-1.5 rounded-xl border border-stone-700">
            <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="text-stone-300">ETA:</span>
            <strong className="text-white font-semibold">
              {routeMetrics?.durationText || order.estimatedDeliveryTime || '25-35 mins'}
            </strong>
          </div>
        </div>
      </div>

      {/* Live Telemetry Metadata Strip */}
      <div className="px-3.5 py-2 bg-stone-50 border-b border-stone-200 flex flex-wrap items-center justify-between gap-2 text-[11px] text-stone-600">
        <div className="flex flex-wrap items-center gap-3">
          <span>
            Last GPS update:{' '}
            <strong className="text-stone-900">
              {riderCoords ? formatLastUpdatedRelative(session?.lastUpdatedAt || riderCoords.timestamp, nowTick) : 'Waiting for rider GPS'}
            </strong>
          </span>
          {(routeMetrics?.distanceText || haversineRemainingKm) && (
            <span>
              Distance to destination:{' '}
              <strong className="text-emerald-800">
                {routeMetrics?.distanceText || `${haversineRemainingKm} km`}
              </strong>
            </span>
          )}
        </div>

        {canShareCustomerLocation && (
          <button
            type="button"
            disabled={isCustomerSharingBusy}
            onClick={handleToggleCustomerSharing}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold transition cursor-pointer disabled:opacity-60 ${
              isSharingEnabled
                ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                : 'bg-sky-600 hover:bg-sky-700 text-white shadow-2xs'
            }`}
          >
            <LocateFixed className="w-3.5 h-3.5" />
            {isCustomerSharingBusy
              ? 'Locating...'
              : isSharingEnabled
              ? 'Stop Sharing My Pin'
              : 'Share My Current Location'}
          </button>
        )}
      </div>

      {customerShareError && (
        <div className="px-3.5 py-2 bg-rose-50 border-b border-rose-200 text-rose-800 text-xs flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
          <span>{customerShareError}</span>
        </div>
      )}

      {customerGpsStatus === 'active' && isSharingEnabled && (
        <div className="px-3.5 py-1.5 bg-sky-50 border-b border-sky-200 text-sky-900 text-[11px] flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-sky-700 shrink-0" />
          <span>Your voluntary pin is visible only to your assigned rider &amp; admin during this active delivery.</span>
        </div>
      )}

      {/* Map Viewport */}
      <div className="relative w-full h-[300px] sm:h-[360px] bg-stone-100">
        {hasKey ? (
          <GoogleMap
            defaultCenter={mapCenter}
            defaultZoom={13}
            mapId="DEMO_MAP_ID"
            className="w-full h-full"
            style={{ width: '100%', height: '100%' }}
            gestureHandling="greedy"
            disableDefaultUI={false}
            {...({ internalUsageAttributionIds: ['gmp_mcp_codeassist_v1_aistudio'] } as any)}
          >
            {/* Kitchen / Dispatch Hub Marker */}
            <AdvancedMarker position={{ lat: hubCoords.lat, lng: hubCoords.lng }} title="PureSudh Dispatch Hub">
              <Pin
                background="#b45309"
                glyphColor="#ffffff"
                borderColor="#78350f"
                scale={1.0}
              />
            </AdvancedMarker>

            {/* Delivery Destination Marker */}
            <AdvancedMarker position={{ lat: destCoords.lat, lng: destCoords.lng }} title="Delivery Destination">
              <Pin
                background="#059669"
                glyphColor="#ffffff"
                borderColor="#047857"
                scale={1.15}
              />
            </AdvancedMarker>

            {/* Live Rider GPS Marker (only rendered from real GPS updates) */}
            {riderCoords && !terminal && (
              <AdvancedMarker
                position={{ lat: riderCoords.lat, lng: riderCoords.lng }}
                title={assignedRiderName ? `Rider: ${assignedRiderName}` : 'Assigned Delivery Rider'}
              >
                <div
                  className={`w-9 h-9 rounded-full border-2 border-white shadow-lg flex items-center justify-center ${
                    effectiveSignalState === 'active'
                      ? 'bg-amber-500 text-stone-950'
                      : 'bg-stone-500 text-white'
                  }`}
                >
                  <Truck className="w-4 h-4" />
                </div>
              </AdvancedMarker>
            )}

            {/* Voluntary Customer Location Pin */}
            {customerSharedCoords && (
              <AdvancedMarker
                position={{ lat: customerSharedCoords.lat, lng: customerSharedCoords.lng }}
                title="Customer Shared Current Location"
              >
                <Pin
                  background="#0284c7"
                  glyphColor="#ffffff"
                  borderColor="#0369a1"
                  scale={1.05}
                />
              </AdvancedMarker>
            )}

            {/* Google Maps Routes API Polyline Overlay */}
            <LiveDrivingRouteOverlay
              origin={routeOrigin}
              destination={{ lat: destCoords.lat, lng: destCoords.lng }}
              onRouteMetrics={setRouteMetrics}
            />
          </GoogleMap>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-stone-50 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shadow-xs">
              <MapPin className="w-6 h-6" />
            </div>
            <div className="max-w-sm space-y-1">
              <h5 className="font-bold text-stone-800 text-sm">
                Live GPS Telemetry Preview
              </h5>
              <p className="text-xs text-stone-500">
                {riderCoords
                  ? `Rider GPS fix received at ${riderCoords.lat.toFixed(4)}, ${riderCoords.lng.toFixed(4)} (±${riderCoords.accuracy || 0}m)`
                  : 'Waiting for assigned delivery rider to begin live GPS broadcast.'}
              </p>
            </div>
            <div className="bg-white p-3 rounded-xl border border-stone-200 text-xs text-left w-full max-w-sm space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-stone-500">Destination:</span>
                <span className="font-semibold text-stone-800 truncate max-w-[200px]">
                  {order.deliveryAddress?.addressLine}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-500">Signal State:</span>
                <span className="font-bold text-emerald-700">{effectiveSignalState}</span>
              </div>
            </div>
          </div>
        )}

        {/* Legend & Rider Contact Card Overlay */}
        <div className="absolute bottom-3 left-3 right-3 sm:left-auto sm:right-3 sm:max-w-xs z-10 bg-white/95 backdrop-blur-md p-3 rounded-xl border border-stone-200 shadow-md text-xs space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-[10px] text-stone-600 border-b border-stone-100 pb-1.5">
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-600" /> Hub / Rider
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-600" /> Destination
            </span>
            {customerSharedCoords && (
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-sky-600" /> Your Pin
              </span>
            )}
          </div>

          {assignedRiderName ? (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                  <UserCheck className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-stone-900 leading-tight truncate">{assignedRiderName}</p>
                  <p className="text-[10px] text-stone-500">
                    {terminal ? 'Delivery Completed' : session?.isActive ? 'Assigned Rider • Live Dispatch' : 'Assigned Delivery Partner'}
                  </p>
                </div>
              </div>
              {assignedRiderPhone && (
                <a
                  href={`tel:${assignedRiderPhone.replace(/\s+/g, '')}`}
                  className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold px-2.5 py-1 rounded-lg transition shrink-0"
                >
                  <Phone className="w-3 h-3" /> Call
                </a>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-stone-600">
              {effectiveSignalState === 'permission_denied' || effectiveSignalState === 'gps_disabled' ? (
                <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
              ) : effectiveSignalState === 'network_error' ? (
                <WifiOff className="w-4 h-4 text-amber-600 shrink-0" />
              ) : (
                <Truck className="w-4 h-4 text-stone-400 shrink-0" />
              )}
              <span className="text-[11px] font-medium">
                {terminal
                  ? `Order status: ${order.status}`
                  : 'Delivery rider awaiting assignment'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Android Chrome / Background Tracking Transparency Note */}
      {!terminal && (
        <div className="px-3.5 py-2 bg-stone-50 border-t border-stone-200 text-[11px] text-stone-500 flex items-center justify-between gap-2">
          <span>
            Note: Mobile browser GPS updates may pause automatically if the screen is locked or browser is minimized.
          </span>
        </div>
      )}
    </div>
  );
};
