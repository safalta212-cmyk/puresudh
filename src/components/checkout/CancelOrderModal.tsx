import React, { useState } from 'react';
import {
  AlertCircle,
  X,
  RotateCcw,
  CheckCircle2,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { Order } from '../../types';
import { cancelOrderOnServer } from '../../services/paymentService';
import { useToast } from '../../context/ToastContext';

interface CancelOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order;
  onOrderCancelled: (updatedOrder: Order) => void;
}

const CANCEL_REASONS = [
  'Placed order by mistake',
  'Need to change delivery address or contact info',
  'Want to add more items or change quantities',
  'Delivery time is too late for my requirement',
  'Found alternative or changed my mind',
  'Other reason',
];

export const CancelOrderModal: React.FC<CancelOrderModalProps> = ({
  isOpen,
  onClose,
  order,
  onOrderCancelled,
}) => {
  const { showToast } = useToast();
  const [selectedReason, setSelectedReason] = useState(CANCEL_REASONS[0]);
  const [customNote, setCustomNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refundData, setRefundData] = useState<any>(null);

  if (!isOpen) return null;

  const isPaid = order.paymentStatus === 'Paid';

  const handleConfirmCancel = async () => {
    setIsSubmitting(true);
    const reasonText = selectedReason === 'Other reason' && customNote ? customNote : selectedReason;

    try {
      const res = await cancelOrderOnServer(order.orderNumber || order.id, reasonText);
      if (res.success && res.order) {
        setRefundData(res.refundResult);
        showToast(
          isPaid
            ? `Order cancelled. Refund of ₹${order.total} initiated.`
            : 'Order cancelled successfully.',
          'info'
        );
        onOrderCancelled(res.order);
      } else {
        showToast(res.error || 'Unable to cancel order at this time', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error occurred while cancelling order', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="cancel-order-modal-overlay"
      className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div
        id="cancel-order-dialog"
        className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200 relative animate-in zoom-in-95 duration-200"
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 p-1 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {!refundData ? (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-stone-900">Cancel Order</h3>
                <p className="text-xs text-stone-500">
                  Order <span className="font-bold text-stone-800">{order.orderNumber}</span> • ₹{order.total}
                </p>
              </div>
            </div>

            {/* Refund info badge if online paid */}
            {isPaid ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 mb-4 text-xs text-emerald-900 flex items-start gap-2.5">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">100% Refund Guarantee</span>
                  Because you paid ₹{order.total} via {order.paymentMethod}, an automatic refund will be triggered back to your source account immediately.
                </div>
              </div>
            ) : (
              <div className="bg-stone-50 border border-stone-200 rounded-xl p-3.5 mb-4 text-xs text-stone-600">
                This is a Cash on Delivery order. No money has been deducted, and cancellation is completely free.
              </div>
            )}

            {/* Reason Selection */}
            <div className="mb-4">
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
                Please select a reason for cancellation
              </label>
              <div className="space-y-2">
                {CANCEL_REASONS.map((reason) => (
                  <label
                    key={reason}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                      selectedReason === reason
                        ? 'border-amber-600 bg-amber-50/70 text-amber-900 font-semibold'
                        : 'border-stone-200 hover:bg-stone-50 text-stone-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="cancel_reason"
                      value={reason ?? ''}
                      checked={selectedReason === reason}
                      onChange={() => setSelectedReason(reason)}
                      className="text-amber-700 focus:ring-amber-600"
                    />
                    <span>{reason}</span>
                  </label>
                ))}
              </div>
            </div>

            {selectedReason === 'Other reason' && (
              <div className="mb-4">
                <textarea
                  rows={2}
                  value={customNote ?? ''}
                  onChange={(e) => setCustomNote(e.target.value)}
                  placeholder="Help us understand how we can improve..."
                  className="w-full text-xs p-2.5 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-600 focus:outline-none"
                />
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 py-2.5 px-4 rounded-xl border border-stone-300 hover:bg-stone-100 text-stone-700 font-semibold text-xs transition-colors"
              >
                Keep My Order
              </button>
              <button
                type="button"
                id="confirm-cancel-order-btn"
                onClick={handleConfirmCancel}
                disabled={isSubmitting}
                className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition-colors flex items-center justify-center gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  'Confirm Cancel'
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Refund confirmed view */
          <div className="text-center py-2">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-extrabold text-stone-900 mb-1">
              Order Cancelled
            </h3>
            <p className="text-xs text-stone-500 mb-4">
              Order <span className="font-bold text-stone-800">{order.orderNumber}</span> has been cancelled and items returned to stock.
            </p>

            {isPaid && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-left text-xs mb-4 space-y-1">
                <div className="flex justify-between font-bold text-emerald-950">
                  <span>Refund Amount:</span>
                  <span>₹{order.total}</span>
                </div>
                <div className="flex justify-between text-emerald-800 text-[11px]">
                  <span>Refund Reference ID:</span>
                  <span className="font-mono font-bold">{refundData?.refundId || 'RF-PENDING'}</span>
                </div>
                <div className="flex justify-between text-emerald-800 text-[11px]">
                  <span>Estimated Settlement:</span>
                  <span>{refundData?.estimatedSettlementDays || 1} business day(s)</span>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs shadow-md transition-colors"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
