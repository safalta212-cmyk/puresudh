import React, { useEffect, useState } from 'react';
import {
  Navigation,
  Truck,
  Clock,
  MapPin,
  Phone,
  LocateFixed,
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { LiveTrackingSession } from '../../../types';
import {
  formatLastUpdatedRelative,
  isGpsFixStale,
  isOrderTerminal,
  subscribeToActiveDeliveryTrackings,
} from '../../../services/gpsTrackingService';
import { AdminFleetMap } from '../../maps/AdminFleetMap';

export const AdminLiveTrackingTab: React.FC = () => {
  const [sessions, setSessions] = useState<LiveTrackingSession[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [listenerError, setListenerError] = useState<string | null>(null);
  const [nowTick, setNowTick] = useState<number>(() => Date.now());

  useEffect(() => {
    const tickId = setInterval(() => setNowTick(Date.now()), 5000);
    return () => clearInterval(tickId);
  }, []);

  useEffect(() => {
    setLoading(true);
    const unsub = subscribeToActiveDeliveryTrackings(
      (activeList) => {
        // Double-filter client-side: never expose completed, cancelled, or refunded orders
        const filtered = activeList.filter((s) => s.isActive && !isOrderTerminal(s.orderStatus));
        setSessions(filtered);
        setSelectedOrderId((prev) =>
          prev && filtered.some((f) => f.orderId === prev)
            ? prev
            : filtered[0]?.orderId || null
        );
        setListenerError(null);
        setLoading(false);
      },
      (err) => {
        setListenerError(err.message || 'Unable to subscribe to active fleet locations.');
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
            <Navigation className="w-5 h-5 text-emerald-600" />
            Live Delivery Tracking
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-semibold border border-emerald-200">
              {sessions.length} Active Trips
            </span>
          </h2>
          <p className="text-xs text-stone-500 mt-1 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            Privacy enforced: only active deliveries are shown. Completed or cancelled customer locations are hidden.
          </p>
        </div>
      </div>

      {listenerError && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{listenerError}</span>
        </div>
      )}

      {/* Multi-rider Fleet Map */}
      <AdminFleetMap
        sessions={sessions}
        selectedOrderId={selectedOrderId}
        onSelectSession={(s) => setSelectedOrderId(s.orderId)}
      />

      {/* Active Delivery Personnel Roster & Assigned Orders */}
      <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-stone-100 flex items-center justify-between">
          <h3 className="font-bold text-sm text-stone-900 flex items-center gap-2">
            <Truck className="w-4 h-4 text-amber-600" />
            Active Delivery Riders &amp; Assigned Orders
          </h3>
          {loading && <RefreshCw className="w-4 h-4 animate-spin text-amber-600" />}
        </div>

        {sessions.length === 0 ? (
          <div className="p-10 text-center text-xs text-stone-500 space-y-1.5">
            <Truck className="w-8 h-8 text-stone-300 mx-auto" />
            <p className="font-semibold text-stone-700">No active GPS deliveries at the moment.</p>
            <p>When a delivery partner starts an assigned order, live rider and active order pins appear here automatically.</p>
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {sessions.map((session) => {
              const stale = isGpsFixStale(session.lastUpdatedAt, 30000, nowTick);
              const isSelected = selectedOrderId === session.orderId;

              return (
                <div
                  key={session.orderId}
                  onClick={() => setSelectedOrderId(session.orderId)}
                  className={`p-4 cursor-pointer transition flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs ${
                    isSelected ? 'bg-amber-50/70' : 'hover:bg-stone-50'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-bold text-stone-900 bg-stone-100 px-2 py-0.5 rounded">
                        #{session.orderNumber}
                      </span>
                      <span className="font-bold text-stone-900">
                        {session.deliveryPersonName || 'Assigned Rider'}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          !stale && session.trackingStatus === 'active'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                            : 'bg-amber-100 text-amber-900 border-amber-200'
                        }`}
                      >
                        {!stale && session.trackingStatus === 'active'
                          ? 'GPS Live'
                          : session.trackingStatus === 'stale' || stale
                          ? 'Signal Stale (>30s)'
                          : session.trackingStatus}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-700">
                        {session.orderStatus}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-stone-600">
                      <span>Customer: <strong>{session.customerName || 'Customer'}</strong></span>
                      {session.deliveryPersonPhone && (
                        <span className="inline-flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {session.deliveryPersonPhone}
                        </span>
                      )}
                      {session.customerSharingEnabled && session.customerLocation && (
                        <span className="inline-flex items-center gap-1 text-sky-700 font-semibold">
                          <MapPin className="w-3 h-3" /> Customer Shared Pin Active
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-[11px] text-stone-600 shrink-0">
                    {session.riderLocation && (
                      <div className="font-mono bg-stone-100 px-2.5 py-1 rounded-lg">
                        <LocateFixed className="w-3 h-3 inline mr-1 text-amber-600" />
                        {session.riderLocation.lat.toFixed(4)}, {session.riderLocation.lng.toFixed(4)}
                        {session.riderLocation.accuracy ? ` (±${session.riderLocation.accuracy}m)` : ''}
                      </div>
                    )}
                    <div className="flex items-center gap-1 font-semibold text-stone-800">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      {formatLastUpdatedRelative(session.lastUpdatedAt, nowTick)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
