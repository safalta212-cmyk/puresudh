import React, { useState, useEffect } from 'react';
import {
  Building2,
  User,
  Mail,
  Phone,
  MapPin,
  FileText,
  CreditCard,
  ShieldCheck,
  CheckCircle,
  ArrowLeft,
  Sparkles,
  Store,
  Upload,
} from 'lucide-react';
import { BRAND } from '../../constants';
import { registerNewVendor } from '../../services/vendorMarketplaceService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { MediaUploader } from '../common/MediaUploader';
import { isTemporaryEmail, isTemporaryOrFakePhone } from '../../validation';

interface VendorRegisterPageProps {
  onBackToStore: () => void;
  onRegisteredSuccess?: (vendorId: string) => void;
}

export const VendorRegisterPage: React.FC<VendorRegisterPageProps> = ({
  onBackToStore,
  onRegisteredSuccess,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedVendorId, setSubmittedVendorId] = useState<string | null>(null);

  // Form Fields as specified in user requirements:
  // Business name, Owner name, Email, Phone, Description, Logo, Cover image, Address, City, State, Pincode
  // Business information, Verification information, Payout information
  const [businessName, setBusinessName] = useState('');
  const [ownerName, setOwnerName] = useState(user?.displayName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [description, setDescription] = useState('');
  const [logo, setLogo] = useState('https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=200&q=80');
  const [coverImage, setCoverImage] = useState('https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=1200&q=80');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Patna');
  const [state, setState] = useState('Bihar');
  const [pincode, setPincode] = useState('800001');

  useEffect(() => {
    if (user) {
      if (user.displayName && !ownerName) setOwnerName(user.displayName);
      if (user.email && !email) setEmail(user.email);
      if (user.phone && !phone) setPhone(user.phone);
    }
  }, [user]);

  // Business Information
  const [fssaiNumber, setFssaiNumber] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [specialtyType, setSpecialtyType] = useState('Homemade Thekua/Khasta');

  // Payout Information
  const [accountHolderName, setAccountHolderName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [bankName, setBankName] = useState('State Bank of India');
  const [upiId, setUpiId] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName || !ownerName || !email || !phone || !address || !pincode) {
      showToast('Please complete all required fields', 'error');
      return;
    }

    const emailCheck = isTemporaryEmail(email);
    if (emailCheck.isTemporary) {
      showToast(emailCheck.reason || 'Temporary/disposable email addresses are prohibited.', 'error');
      return;
    }

    const phoneCheck = isTemporaryOrFakePhone(phone);
    if (phoneCheck.isFake) {
      showToast(phoneCheck.reason || 'Please enter a genuine 10-digit mobile number.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await registerNewVendor({
        businessName,
        ownerName,
        email,
        phone,
        description: description || `${businessName} creates fresh traditional recipes with pure desi ingredients.`,
        logo,
        coverImage,
        address,
        city,
        state,
        pincode,
        fssaiNumber: fssaiNumber || 'FSSAI-APPLIED',
        gstNumber,
        specialties: [specialtyType, 'Pure Desi Sweets & Dairy'],
        ownerUserId: user?.uid,
        payoutDetails: accountNumber
          ? {
              accountHolderName: accountHolderName || ownerName,
              accountNumber,
              ifscCode: ifscCode || 'SBIN0001234',
              bankName,
              upiId,
            }
          : undefined,
      });

      if (res.success && res.vendorId) {
        setSubmittedVendorId(res.vendorId);
        showToast('Vendor registration submitted for verification!', 'success');
        if (onRegisteredSuccess) {
          onRegisteredSuccess(res.vendorId);
        }
      } else {
        showToast(res.error || 'Failed to submit registration', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Submission error', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submittedVendorId) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] py-12 px-4 flex items-center justify-center">
        <div className="max-w-lg w-full bg-white rounded-3xl p-8 border border-stone-200 shadow-xl text-center space-y-6">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-bold font-serif text-stone-900">Application Submitted!</h2>
            <p className="text-xs text-stone-500 mt-2">
              Your application for <strong>{businessName}</strong> has been received by PURE SUDH Compliance.
            </p>
          </div>

          <div className="p-4 bg-stone-50 rounded-2xl text-left text-xs space-y-2 text-stone-600">
            <div className="flex justify-between">
              <span>Application Reference:</span>
              <strong className="font-mono text-stone-900">{submittedVendorId}</strong>
            </div>
            <div className="flex justify-between">
              <span>Status:</span>
              <span className="font-bold text-amber-700">PENDING AUDIT</span>
            </div>
            <div className="flex justify-between">
              <span>Compliance Team Review:</span>
              <span>24 - 48 Hours</span>
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <button
              onClick={onBackToStore}
              className="w-full py-3 bg-amber-800 hover:bg-amber-900 text-white rounded-xl font-bold text-xs shadow-md transition"
            >
              Return to Pure Sudh Store
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-stone-900 pb-16 font-sans">
      {/* Top Banner */}
      <div className="bg-stone-900 text-stone-100 border-b border-stone-800">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Store className="w-4 h-4 text-amber-400" />
            <span className="font-bold text-amber-400">PURE SUDH Marketplace Partner Onboarding</span>
          </div>
          <button
            onClick={onBackToStore}
            className="flex items-center gap-1.5 text-stone-300 hover:text-white transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Store
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="text-center space-y-2 mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            Sell on PURE SUDH
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-extrabold text-stone-900">
            Partner with Bihar&apos;s Most Trusted Pure Food Brand
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 max-w-xl mx-auto">
            Join artisans producing homemade Thekua, freshly churned dairy, authentic festival sweets, and pure snacks.
          </p>
        </div>

        {/* Multi-Step Indicator */}
        <div className="flex items-center justify-between mb-8 relative max-w-md mx-auto text-xs font-semibold">
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-stone-200 -z-10" />
          <button
            onClick={() => setCurrentStep(1)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${
              currentStep === 1 ? 'bg-amber-800 text-white' : 'bg-stone-100 text-stone-600'
            }`}
          >
            <span>1. Business Info</span>
          </button>
          <button
            onClick={() => setCurrentStep(2)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${
              currentStep === 2 ? 'bg-amber-800 text-white' : 'bg-stone-100 text-stone-600'
            }`}
          >
            <span>2. Verification</span>
          </button>
          <button
            onClick={() => setCurrentStep(3)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${
              currentStep === 3 ? 'bg-amber-800 text-white' : 'bg-stone-100 text-stone-600'
            }`}
          >
            <span>3. Payout Coordinates</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-sm space-y-6">
          {/* STEP 1: BUSINESS & PROFILE */}
          {currentStep === 1 && (
            <div className="space-y-4 text-xs">
              <h3 className="text-base font-bold font-serif text-stone-900 pb-2 border-b border-stone-100">
                Kitchen & Business Identity
              </h3>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Business Name / Kitchen Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mithila Traditional Thekua & Khasta"
                  value={businessName ?? ''}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-stone-300 text-xs focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Owner Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Full legal name"
                    value={ownerName ?? ''}
                    onChange={(e) => setOwnerName(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-stone-300 text-xs focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Primary Specialty *</label>
                  <select
                    value={specialtyType ?? 'Homemade Thekua/Khasta'}
                    onChange={(e) => setSpecialtyType(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-stone-300 text-xs bg-white"
                  >
                    <option value="Homemade Thekua/Khasta">Homemade Thekua & Khasta</option>
                    <option value="Dairy Products">Dairy & Fresh Milk</option>
                    <option value="Sweets">Desi Sweets (Pedas, Khaja, Gulab Jamun)</option>
                    <option value="Homemade Snacks">Homemade Savory Snacks & Chivda</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="vendor@kitchen.com"
                    value={email ?? ''}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-stone-300 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Phone *</label>
                  <input
                    type="tel"
                    required
                    placeholder="10-digit mobile number"
                    value={phone ?? ''}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-stone-300 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Description & Heritage Story</label>
                <textarea
                  rows={2}
                  placeholder="Tell our customers about your recipes, ingredients, and family heritage..."
                  value={description ?? ''}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-stone-300 text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <MediaUploader
                    preset="vendorLogo"
                    pathParams={{ vendorId: 'registration' }}
                    currentImageUrl={logo}
                    onImageUploaded={(url) => setLogo(url)}
                    label="Upload Store Logo (Optional)"
                    compact
                  />
                </div>
                <div>
                  <MediaUploader
                    preset="vendorCover"
                    pathParams={{ vendorId: 'registration' }}
                    currentImageUrl={coverImage}
                    onImageUploaded={(url) => setCoverImage(url)}
                    label="Upload Store Cover Image (Optional)"
                    compact
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block font-semibold text-stone-700">Kitchen / Facility Address *</label>
                <input
                  type="text"
                  required
                  placeholder="Street / Village / Facility"
                  value={address ?? ''}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-stone-300 text-xs"
                />
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    required
                    placeholder="City"
                    value={city ?? ''}
                    onChange={(e) => setCity(e.target.value)}
                    className="p-2.5 rounded-xl border border-stone-300 text-xs"
                  />
                  <input
                    type="text"
                    required
                    placeholder="State"
                    value={state ?? ''}
                    onChange={(e) => setState(e.target.value)}
                    className="p-2.5 rounded-xl border border-stone-300 text-xs"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Pincode"
                    value={pincode ?? ''}
                    onChange={(e) => setPincode(e.target.value)}
                    className="p-2.5 rounded-xl border border-stone-300 text-xs"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="px-6 py-2.5 bg-amber-800 hover:bg-amber-900 text-white rounded-xl font-bold shadow-xs transition"
                >
                  Continue to Verification →
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: VERIFICATION & COMPLIANCE */}
          {currentStep === 2 && (
            <div className="space-y-4 text-xs">
              <h3 className="text-base font-bold font-serif text-stone-900 pb-2 border-b border-stone-100">
                Compliance & Quality Assurance
              </h3>
              <p className="text-stone-500">
                To guarantee purity under the PURE SUDH promise, we inspect food safety certifications for every kitchen.
              </p>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">FSSAI License / Registration No.</label>
                <input
                  type="text"
                  placeholder="14-digit FSSAI number (or 'Under Application')"
                  value={fssaiNumber ?? ''}
                  onChange={(e) => setFssaiNumber(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-stone-300 font-mono"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">GST Number (Optional)</label>
                  <input
                    type="text"
                    placeholder="GSTIN (if registered)"
                    value={gstNumber ?? ''}
                    onChange={(e) => setGstNumber(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-stone-300 font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Business PAN (Optional)</label>
                  <input
                    type="text"
                    placeholder="PAN number"
                    value={panNumber ?? ''}
                    onChange={(e) => setPanNumber(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-stone-300 font-mono uppercase"
                  />
                </div>
              </div>

              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-800" />
                  Pure Sudh Quality Audit
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Upon registration, your account status will be set to <strong>PENDING</strong>. A Pure Sudh field inspector will verify your kitchen cleanliness, ingredients purity, and packaging hygiene before your account is set to <strong>ACTIVE</strong>.
                </p>
              </div>

              <div className="pt-4 flex justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="px-5 py-2.5 border border-stone-300 rounded-xl text-stone-700 font-semibold"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="px-6 py-2.5 bg-amber-800 hover:bg-amber-900 text-white rounded-xl font-bold shadow-xs transition"
                >
                  Continue to Payouts →
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: PAYOUT COORDINATES */}
          {currentStep === 3 && (
            <div className="space-y-4 text-xs">
              <h3 className="text-base font-bold font-serif text-stone-900 pb-2 border-b border-stone-100">
                Settlement Banking Coordinates
              </h3>
              <p className="text-stone-500">
                Earnings from your sales are directly disbursed to your bank account twice a month.
              </p>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Account Holder Legal Name *</label>
                <input
                  type="text"
                  required
                  placeholder="As printed on bank passbook"
                  value={accountHolderName ?? ''}
                  onChange={(e) => setAccountHolderName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-stone-300"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Bank Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. State Bank of India"
                    value={bankName ?? ''}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-stone-300"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">IFSC Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="SBIN0001234"
                    value={ifscCode ?? ''}
                    onChange={(e) => setIfscCode(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-stone-300 font-mono uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Bank Account Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="Full account number"
                    value={accountNumber ?? ''}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-stone-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">UPI ID (Optional)</label>
                  <input
                    type="text"
                    placeholder="yourshop@upi"
                    value={upiId ?? ''}
                    onChange={(e) => setUpiId(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-stone-300"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="px-5 py-2.5 border border-stone-300 rounded-xl text-stone-700 font-semibold"
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-7 py-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold shadow-md transition flex items-center gap-2"
                >
                  {isSubmitting ? 'Registering Vendor...' : 'Submit Vendor Application'}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
