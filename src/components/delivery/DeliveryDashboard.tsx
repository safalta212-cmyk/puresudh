import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Truck,
  Navigation,
  MapPin,
  Phone,
  Clock,
  CheckCircle2,
  AlertTriangle,
  WifiOff,
  StopCircle,
  PlayCircle,
  ArrowLeft,
  ShieldCheck,
  LocateFixed,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { GeoPointData, GpsTrackingStatus, LiveTrackingSession, Order } from '../../types';
import {
  completeDeliveryByRider,
  createGpsWatcherController,
  formatLastUpdatedRelative,
  isGpsFixStale,
  isOrderTerminal,
  publishRiderGpsLocation,
  shouldPublishGpsUpdate,
  startDeliveryTrackingSession,
  stopDeliveryTrackingSession,
  subscribeToAssignedDeliveryOrders,
  subscribeToOrderTracking,
  updateTrackingSignalStatus,
} from '../../services/gpsTrackingService';
import { OrderTrackingMap } from '../maps/OrderTrackingMap';

interface DeliveryDashboardProps {
  onBackToStore: () => void;
}

export const DeliveryDashboard: React.FC<DeliveryDashboardProps> = ({ onBackToStore }) => {
  const { user, role, logout } = useAuth();
  const { showToast } = useToast();

  const [assignedOrders, setAssignedOrders] = useState<Order[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [activeTrackingOrderId, setActiveTrackingOrderId] = useState<string | null>(null);
  const [trackingSession, setTrackingSession] = useState<LiveTrackingSession | null>(null);

  const [gpsStatus, setGpsStatus] = useState<GpsTrackingStatus>('idle');
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [latestFix, setLatestFix] = useState<GeoPointData | null>(null);
  const [isActionBusy, setIsActionBusy] = useState(false);
  const [nowTick, setNowTick] = useState<number>(() => Date.now());

  const watcherRef = useRef<ReturnType<typeof createGpsWatcherController> | null>(null);
  const lastPublishedFixRef = useRef<GeoPointData | null>(null);
  const activeOrderIdRef = useRef<string | null>(null);

  useEffect(() => {
    activeOrderIdRef.current = activeTrackingOrderId;
  }, [activeTrackingOrderId]);

  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 5000);
    return () => clearInterval(id);
  }, []);

  // Subscribe in real time to assigned delivery orders for this rider UID
  useEffect(() => {
    if (!user?.uid) {
      setAssignedOrders([]);
      return;
    }
    const unsub = subscribeToAssignedDeliveryOrders(
      user.uid,
      (orders) => {
        setAssignedOrders(orders);
        setSelectedOrderId((prev) => {
          if (prev && orders.some((o) => o.id === prev)) return prev;
          const active = orders.find((o) => !isOrderTerminal(o.status));
          return active?.id || orders[0]?.id || null;
        });
      },
      (err) => {
        console.warn('Assigned orders subscription error:', err);
      }
    );
    return () => unsub();
  }, [user?.uid]);

  const selectedOrder = useMemo(
    () => assignedOrders.find((o) => o.id === selectedOrderId) || assignedOrders[0] || null,
    [assignedOrders, selectedOrderId]
  );

  // Subscribe to tracking document for the selected order
  useEffect(() => {
    if (!selectedOrder?.id) {
      setTrackingSession(null);
      return;
    }
    const unsub = subscribeToOrderTracking(
      selectedOrder.id,
      (session) => setTrackingSession(session),
      () => {}
    );
    return () => unsub();
  }, [selectedOrder?.id]);

  // Automatically stop active GPS watch if the active order transitions to terminal state remotely
  useEffect(() => {
    if (!activeTrackingOrderId) return;
    const trackedOrder = assignedOrders.find((o) => o.id === activeTrackingOrderId);
    if (trackedOrder && isOrderTerminal(trackedOrder.status)) {
      watcherRef.current?.stop('completed');
      watcherRef.current = null;
      setActiveTrackingOrderId(null);
      lastPublishedFixRef.current = null;
      showToast(`GPS sharing automatically stopped — Order #${trackedOrder.orderNumber} is ${trackedOrder.status}.`, 'info');
    }
  }, [assignedOrders, activeTrackingOrderId, showToast]);

  // Clean up GPS watcher when leaving dashboard
  useEffect(() => {
    return () => {
      watcherRef.current?.stop('stopped');
      watcherRef.current = null;
    };
  }, []);

  const handleStartDelivery = async (order: Order) => {
    if (!user?.uid) return;
    if (isOrderTerminal(order.status)) {
      showToast(`Order #${order.orderNumber} is already ${order.status}.`, 'error');
      return;
    }
    if (order.assignedDeliveryId && order.assignedDeliveryId !== user.uid && role !== 'admin' && role !== 'staff') {
      showToast('You are not the assigned delivery partner for this order.', 'error');
      return;
    }

    setIsActionBusy(true);
    setGpsError(null);
    setGpsStatus('requesting_permission');

    // Stop any previous watcher before starting a new one
    if (watcherRef.current) {
      watcherRef.current.stop('stopped');
      watcherRef.current = null;
    }

    let firstFixForSession: GeoPointData | null = null;
    let firstFixConsumed = false;

    const controller = createGpsWatcherController({
      onFix: async (fix) => {
        setLatestFix(fix);
        setGpsError(null);
        if (!firstFixForSession) {
          firstFixForSession = fix;
        }
        const targetId = activeOrderIdRef.current || order.id;
        if (!firstFixConsumed) return; // Initial fix gets written directly on startDeliveryTrackingSession

        if (shouldPublishGpsUpdate(lastPublishedFixRef.current, fix, false)) {
          lastPublishedFixRef.current = fix;
          try {
            await publishRiderGpsLocation(targetId, fix);
          } catch (err: any) {
            setGpsError(err?.message || 'Failed to sync GPS update to server.');
          }
        }
      },
      onStatusChange: (status, message) => {
        setGpsStatus(status);
        if (message) setGpsError(message);
        if (
          activeOrderIdRef.current &&
          ['permission_denied', 'gps_disabled', 'network_error', 'stale', 'stopped'].includes(status)
        ) {
          updateTrackingSignalStatus(activeOrderIdRef.current, status).catch(() => {});
        }
      },
    });

    watcherRef.current = controller;
    const ok = await controller.start();

    if (!ok) {
      setIsActionBusy(false);
      // Permission denied or GPS off: do NOT start tracking or falsely report active
      return;
    }

    try {
      await startDeliveryTrackingSession(
        order,
        {
          uid: user.uid,
          name: user.displayName || 'Delivery Partner',
          phone: user.phone,
        },
        firstFixForSession
      );
      firstFixConsumed = true;
      lastPublishedFixRef.current = firstFixForSession;
      setActiveTrackingOrderId(order.id);
      setSelectedOrderId(order.id);
      showToast(`Live GPS sharing started for #${order.orderNumber}`, 'success');
    } catch (err: any) {
      controller.stop('stopped', err?.message || 'Failed to start delivery session');
      watcherRef.current = null;
      setGpsError(err?.message || 'Failed to start delivery tracking session.');
      showToast(err?.message || 'Failed to start delivery', 'error');
    } finally {
      setIsActionBusy(false);
    }
  };

  const handleStopSharing = async () => {
    const targetId = activeTrackingOrderId || selectedOrder?.id;
    watcherRef.current?.stop('stopped');
    watcherRef.current = null;
    setActiveTrackingOrderId(null);
    lastPublishedFixRef.current = null;

    if (targetId) {
      await stopDeliveryTrackingSession(targetId);
    }
    showToast('GPS location sharing stopped.', 'info');
  };

  const handleMarkDelivered = async (order: Order) => {
    setIsActionBusy(true);
    try {
      watcherRef.current?.stop('completed');
      watcherRef.current = null;
      setActiveTrackingOrderId(null);
      lastPublishedFixRef.current = null;

      await completeDeliveryByRider(order, user?.displayName || 'Delivery Partner');
      showToast(`Order #${order.orderNumber} marked Delivered and tracking closed.`, 'success');
    } catch (err: any) {
      showToast(err?.message || 'Failed to mark order delivered.', 'error');
    } finally {
      setIsActionBusy(false);
    }
  };

  const activeCount = assignedOrders.filter((o) => !isOrderTerminal(o.status)).length;
  const completedCount = assignedOrders.filter(
    (o) => String(o.status).toUpperCase() === 'DELIVERED'
  ).length;

  const isSelectedCurrentlyTracking =
    Boolean(selectedOrder) &&
    activeTrackingOrderId === selectedOrder?.id &&
    watcherRef.current?.isRunning() === true;

  const displayStale =
    isSelectedCurrentlyTracking &&
    latestFix &&
    isGpsFixStale(latestFix.timestamp, 30000, nowTick);

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-stone-900 pb-16">
      {/* Mobile-First Header */}
      <header className="bg-stone-900 text-white sticky top-0 z-30 border-b border-stone-800 shadow-md">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onBackToStore}
              className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition cursor-pointer"
              title="Back to Storefront"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="font-bold text-sm sm:text-base flex items-center gap-2">
                <Truck className="w-4 h-4 text-amber-400" />
                Delivery Partner GPS Hub
              </h1>
              <p className="text-[11px] text-stone-400">
                {user?.displayName || 'Delivery Rider'} • {role.toUpperCase()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                gpsStatus === 'active' && !displayStale && isSelectedCurrentlyTracking
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                  : gpsStatus === 'stale' || displayStale
                  ? 'bg-amber-950 text-amber-300 border-amber-700'
                  : gpsStatus === 'permission_denied' || gpsStatus === 'gps_disabled' || gpsStatus === 'network_error'
                  ? 'bg-rose-950 text-rose-300 border-rose-700'
                  : 'bg-stone-800 text-stone-300 border-stone-700'
              }`}
            >
              <LocateFixed className="w-3 h-3" />
              {gpsStatus === 'active' && !displayStale && isSelectedCurrentlyTracking
                ? 'GPS Active'
                : gpsStatus === 'stale' || displayStale
                ? 'GPS Signal Stale'
                : gpsStatus === 'permission_denied'
                ? 'Permission Denied'
                : gpsStatus === 'gps_disabled'
                ? 'GPS Disabled'
                : gpsStatus === 'network_error'
                ? 'Offline'
                : 'GPS Standby'}
            </span>

            <button
              type="button"
              onClick={async () => {
                await handleStopSharing();
                await logout();
                onBackToStore();
              }}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-rose-900/70 text-stone-200 transition cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-3 sm:px-6 py-5 space-y-5">
        {/* Android Chrome & Battery Disclosure + Errors */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 text-xs text-amber-950 flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-bold">Android Chrome &amp; Mobile Browser GPS Notice</p>
            <p className="text-amber-900/90 leading-relaxed">
              Live GPS sharing updates automatically while this page remains open in the foreground. Background tracking may pause when your browser is minimized or your phone screen is locked.
            </p>
          </div>
        </div>

        {gpsError && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3.5 text-xs text-rose-900 flex items-start gap-2.5">
            {gpsStatus === 'network_error' ? (
              <WifiOff className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div className="space-y-1">
              <p className="font-bold">
                {gpsStatus === 'permission_denied'
                  ? 'Location Permission Required'
                  : gpsStatus === 'gps_disabled'
                  ? 'Device GPS Turned Off'
                  : gpsStatus === 'network_error'
                  ? 'Network Connection Issue'
                  : 'GPS Tracking Alert'}
              </p>
              <p>{gpsError}</p>
            </div>
          </div>
        )}

        {/* Quick Fleet Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-2xs">
            <p className="text-[11px] text-stone-500">Assigned Queue</p>
            <p className="text-xl font-bold text-stone-900">{assignedOrders.length}</p>
          </div>
          <div className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-2xs">
            <p className="text-[11px] text-stone-500">Active Deliveries</p>
            <p className="text-xl font-bold text-amber-700">{activeCount}</p>
          </div>
          <div className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-2xs">
            <p className="text-[11px] text-stone-500">Completed</p>
            <p className="text-xl font-bold text-emerald-700">{completedCount}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Assigned Deliveries List */}
          <div className="lg:col-span-5 space-y-3">
            <h2 className="font-bold text-sm text-stone-900 flex items-center gap-2">
              <Navigation className="w-4 h-4 text-amber-600" />
              My Assigned Orders ({assignedOrders.length})
            </h2>

            {assignedOrders.length === 0 ? (
              <div className="bg-white rounded-2xl border border-stone-200 p-6 text-center text-xs text-stone-500 space-y-2">
                <Truck className="w-8 h-8 text-stone-300 mx-auto" />
                <p className="font-semibold text-stone-700">No orders assigned to your account yet.</p>
                <p>Ask Store Admin to assign an order to your account in Admin → Orders.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {assignedOrders.map((order) => {
                  const terminal = isOrderTerminal(order.status);
                  const isSelected = selectedOrder?.id === order.id;
                  const isLiveNow = activeTrackingOrderId === order.id && watcherRef.current?.isRunning();

                  return (
                    <div
                      key={order.id}
                      onClick={() => setSelectedOrderId(order.id)}
                      className={`p-4 rounded-2xl border transition cursor-pointer space-y-3 ${
                        isSelected
                          ? 'bg-white border-amber-500 ring-2 ring-amber-200/70 shadow-sm'
                          : 'bg-white border-stone-200 hover:border-stone-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-stone-900">
                              #{order.orderNumber}
                            </span>
                            {isLiveNow && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                                Live Broadcasting
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-semibold text-stone-800 mt-1">
                            {order.customerName}
                          </p>
                        </div>

                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            String(order.status).toUpperCase() === 'DELIVERED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : terminal
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-900'
                          }`}
                        >
                          {order.status}
                        </span>
                      </div>

                      <div className="text-xs text-stone-600 space-y-1">
                        <p className="flex items-start gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                          <span>
                            {order.deliveryAddress?.addressLine}, {order.deliveryAddress?.city} -{' '}
                            {order.deliveryAddress?.pincode}
                          </span>
                        </p>
                        {order.customerPhone && (
                          <p className="flex items-center gap-1.5 text-[11px]">
                            <Phone className="w-3 h-3 text-stone-400" />
                            <span>{order.customerPhone}</span>
                          </p>
                        )}
                      </div>

                      {!terminal && (
                        <div className="flex flex-wrap gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                          {!isLiveNow ? (
                            <button
                              type="button"
                              disabled={isActionBusy}
                              onClick={() => handleStartDelivery(order)}
                              className="flex-1 min-h-[40px] inline-flex items-center justify-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold text-xs px-3 py-2 rounded-xl transition cursor-pointer"
                            >
                              {isActionBusy ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <PlayCircle className="w-3.5 h-3.5" />
                              )}
                              Start Delivery
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={handleStopSharing}
                              className="flex-1 min-h-[40px] inline-flex items-center justify-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-3 py-2 rounded-xl transition cursor-pointer"
                            >
                              <StopCircle className="w-3.5 h-3.5" />
                              Stop Sharing
                            </button>
                          )}

                          <button
                            type="button"
                            disabled={isActionBusy}
                            onClick={() => handleMarkDelivered(order)}
                            className="min-h-[40px] inline-flex items-center justify-center gap-1.5 bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white font-bold text-xs px-3 py-2 rounded-xl transition cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            Mark Delivered
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Live GPS Telemetry & Route Map */}
          <div className="lg:col-span-7 space-y-4">
            {selectedOrder ? (
              <>
                <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-[11px] text-stone-500 block">Signal Status</span>
                    <strong className="text-stone-900 capitalize">
                      {(displayStale ? 'stale' : gpsStatus).replace('_', ' ')}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[11px] text-stone-500 block">GPS Accuracy</span>
                    <strong className="font-mono text-stone-900">
                      {latestFix?.accuracy
                        ? `±${latestFix.accuracy} m`
                        : trackingSession?.riderLocation?.accuracy
                        ? `±${trackingSession.riderLocation.accuracy} m`
                        : 'N/A'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[11px] text-stone-500 block">Last Updated</span>
                    <strong className="text-stone-900 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-600" />
                      {formatLastUpdatedRelative(
                        latestFix?.timestamp || trackingSession?.lastUpdatedAt,
                        nowTick
                      )}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[11px] text-stone-500 block">Coordinates</span>
                    <strong className="font-mono text-[11px] text-stone-800">
                      {latestFix
                        ? `${latestFix.lat.toFixed(4)}, ${latestFix.lng.toFixed(4)}`
                        : trackingSession?.riderLocation
                        ? `${trackingSession.riderLocation.lat.toFixed(4)}, ${trackingSession.riderLocation.lng.toFixed(4)}`
                        : 'Pending'}
                    </strong>
                  </div>
                </div>

                <OrderTrackingMap order={selectedOrder} trackingSession={trackingSession} />
              </>
            ) : (
              <div className="bg-white p-10 rounded-2xl border border-stone-200 text-center text-xs text-stone-500">
                Select an assigned order to view navigation route and start live GPS sharing.
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
