import React from 'react';

export type PolicyType = 'shipping' | 'returns' | 'cancellation' | 'privacy' | 'terms';

interface PolicyPageProps {
  currentPolicy: PolicyType;
  onSelectPolicy: (policy: PolicyType) => void;
}

export const PolicyPage: React.FC<PolicyPageProps> = ({ currentPolicy, onSelectPolicy }) => {
  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-6 sm:space-y-8 w-full max-w-full overflow-hidden">
      {/* Header Tabs */}
      <div className="flex border-b border-stone-200 overflow-x-auto gap-2 sm:gap-6 text-xs font-bold text-stone-500 no-scrollbar pb-1">
        <button
          onClick={() => onSelectPolicy('shipping')}
          className={`pb-2.5 sm:pb-3 px-2 border-b-2 whitespace-nowrap transition touch-manipulation min-h-[40px] ${
            currentPolicy === 'shipping'
              ? 'border-amber-700 text-amber-900'
              : 'border-transparent hover:text-stone-800'
          }`}
        >
          Shipping & Fast Delivery Policy
        </button>

        <button
          onClick={() => onSelectPolicy('returns')}
          className={`pb-2.5 sm:pb-3 px-2 border-b-2 whitespace-nowrap transition touch-manipulation min-h-[40px] ${
            currentPolicy === 'returns'
              ? 'border-amber-700 text-amber-900'
              : 'border-transparent hover:text-stone-800'
          }`}
        >
          Return & Refund Policy
        </button>

        <button
          onClick={() => onSelectPolicy('cancellation')}
          className={`pb-2.5 sm:pb-3 px-2 border-b-2 whitespace-nowrap transition touch-manipulation min-h-[40px] ${
            currentPolicy === 'cancellation'
              ? 'border-amber-700 text-amber-900'
              : 'border-transparent hover:text-stone-800'
          }`}
        >
          Cancellation Policy
        </button>

        <button
          onClick={() => onSelectPolicy('privacy')}
          className={`pb-2.5 sm:pb-3 px-2 border-b-2 whitespace-nowrap transition touch-manipulation min-h-[40px] ${
            currentPolicy === 'privacy'
              ? 'border-amber-700 text-amber-900'
              : 'border-transparent hover:text-stone-800'
          }`}
        >
          Privacy Policy
        </button>

        <button
          onClick={() => onSelectPolicy('terms')}
          className={`pb-2.5 sm:pb-3 px-2 border-b-2 whitespace-nowrap transition touch-manipulation min-h-[40px] ${
            currentPolicy === 'terms'
              ? 'border-amber-700 text-amber-900'
              : 'border-transparent hover:text-stone-800'
          }`}
        >
          Terms & Conditions
        </button>
      </div>

      {/* Policy Content Card */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-8 lg:p-10 border border-stone-200 shadow-xs space-y-6 text-xs sm:text-sm text-stone-600 leading-relaxed">
        {currentPolicy === 'shipping' && (
          <div className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-bold text-stone-900 font-serif">
              Shipping & Local Fast Delivery Policy
            </h2>
            <p>
              At PURE SUDH, our mission is delivering fresh food and dairy products at peak purity.
              Because our products contain no artificial preservatives, speedy delivery is central to
              our promise.
            </p>
            <h3 className="font-bold text-stone-900 text-base mt-4">1. Delivery Zones & Speed</h3>
            <p>
              We currently service designated pincodes within our local kitchen hubs. In serviceable
              zones, orders are dispatched quickly, targeting an estimated delivery time of
              approximately 25 to 35 minutes depending on traffic and weather conditions.
            </p>
            <h3 className="font-bold text-stone-900 text-base mt-4">2. Delivery Charges</h3>
            <p>
              Orders above ₹299 are eligible for FREE delivery. For orders below this threshold, a
              nominal delivery partner charge of ₹29 applies.
            </p>
            <h3 className="font-bold text-stone-900 text-base mt-4">3. Packaging & Temperature Control</h3>
            <p>
              Fresh dairy products (Milk, Paneer, Dahi) are dispatched in insulated food-grade
              packaging to preserve temperature integrity and freshness until doorstep delivery.
            </p>
          </div>
        )}

        {currentPolicy === 'returns' && (
          <div className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-bold text-stone-900 font-serif">
              Return & Refund Policy
            </h2>
            <p>
              Due to the perishable and culinary nature of fresh dairy, sweets, and snacks, products
              cannot be returned once accepted after delivery, except under specific defect conditions.
            </p>
            <h3 className="font-bold text-stone-900 text-base mt-4">1. Eligibility for Replacement / Refund</h3>
            <p>
              You are entitled to a full replacement or refund if:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>The package or container arrived damaged or unsealed.</li>
              <li>The item received differs from what was ordered.</li>
              <li>The dairy product was sour or spoiled upon arrival.</li>
            </ul>
            <h3 className="font-bold text-stone-900 text-base mt-4">2. Reporting Timeline</h3>
            <p>
              Perishable dairy defects must be reported within 2 hours of delivery. Packaged snacks
              (Thekua, Khasta, Nimki) must be reported within 24 hours via our WhatsApp support or
              email with photos of the package.
            </p>
            <h3 className="font-bold text-stone-900 text-base mt-4">3. Refund Processing</h3>
            <p>
              Approved refunds are credited back to the original payment method (UPI / Card / Net
              Banking) within 2 to 4 business hours.
            </p>
          </div>
        )}

        {currentPolicy === 'cancellation' && (
          <div className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-bold text-stone-900 font-serif">
              Order Cancellation Policy
            </h2>
            <p>
              We understand that plans can change. However, because our kitchen starts preparing hot
              puris, fresh snacks, and packing dairy immediately upon receiving your order, cancellations
              are subject to timing:
            </p>
            <h3 className="font-bold text-stone-900 text-base mt-4">1. Cancellation Window</h3>
            <p>
              You may cancel your order free of charge as long as the status is &quot;Order Placed&quot; or
              &quot;Confirmed&quot; (typically within 3 minutes of ordering).
            </p>
            <h3 className="font-bold text-stone-900 text-base mt-4">2. Non-Cancellable Stages</h3>
            <p>
              Once the kitchen status transitions to &quot;Preparing&quot;, &quot;Packed&quot;, or &quot;Out for Delivery&quot;,
              cancellations cannot be accepted as the perishable food items have already been prepared.
            </p>
          </div>
        )}

        {currentPolicy === 'privacy' && (
          <div className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-bold text-stone-900 font-serif">
              Privacy Policy
            </h2>
            <p>
              PURE SUDH is committed to protecting your personal information. We collect information
              such as your name, delivery address, phone number, and email strictly to fulfill orders,
              send delivery notifications, and ensure smooth customer support.
            </p>
            <h3 className="font-bold text-stone-900 text-base mt-4">1. Payment Security</h3>
            <p>
              We do not store your credit card numbers, CVVs, or bank net banking passwords on our
              servers. All transactions are securely routed through certified Indian payment gateways.
            </p>
            <h3 className="font-bold text-stone-900 text-base mt-4">2. No Third-Party Data Selling</h3>
            <p>
              We never sell or rent your personal contact details to external marketing agencies.
            </p>
          </div>
        )}

        {currentPolicy === 'terms' && (
          <div className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-bold text-stone-900 font-serif">
              Terms & Conditions of Service
            </h2>
            <p>
              Welcome to PURE SUDH. By using our web application and ordering our fresh food products,
              you agree to adhere to our standard terms:
            </p>
            <h3 className="font-bold text-stone-900 text-base mt-4">1. Food Consumption Advice</h3>
            <p>
              Our fresh dairy and hot cooked foods contain no synthetic preservatives. Consumers are
              strongly advised to adhere to recommended storage instructions (refrigeration for dairy,
              airtight containers for Thekua) and consume within the indicated shelf-life period.
            </p>
            <h3 className="font-bold text-stone-900 text-base mt-4">2. Platform Architecture</h3>
            <p>
              PURE SUDH is initially operated as a local food e-commerce platform and is architected
              to support multi-category and verified multi-vendor marketplace expansions in future
              releases under standard merchant compliance.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
