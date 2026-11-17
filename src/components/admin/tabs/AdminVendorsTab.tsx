import React, { useState, useEffect } from 'react';
import {
  Store,
  ShieldCheck,
  Clock,
  Ban,
  CheckCircle,
  XCircle,
  Eye,
  Percent,
  Search,
  Building,
  User,
  Phone,
  Mail,
  MapPin,
  TrendingUp,
  CreditCard,
  FileText,
  DollarSign,
  AlertTriangle,
  RefreshCw,
  Plus,
  ExternalLink,
  Lock,
  Sliders,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Download,
} from 'lucide-react';
import {
  Vendor,
  VendorStatus,
  VendorVerificationStatus,
  VendorCommission,
  VendorPayout,
  Product,
  Order,
  Category,
  CommissionConfig,
  VendorFinancialSummary,
  FinancialLedgerEntry,
  PayoutAdjustmentPayload,
} from '../../../types';
import {
  fetchAllVendors,
  adminUpdateVendorStatus,
  adminUpdateVendorVerification,
  adminUpdateVendorCommission,
  fetchAllCommissionsAdmin,
  fetchAllPayoutsAdmin,
  adminProcessVendorPayout,
  fetchAdminFinancialSummary,
  fetchCommissionConfig,
  updateCommissionConfig,
  fetchPayoutProviderConfig,
  updatePayoutProviderConfig,
  fetchAllLedgerAdmin,
  adminProcessVendorPayoutWithVerification,
  adminCreateFinancialAdjustment,
  fetchFinancialReportsAdmin,
} from '../../../services/vendorMarketplaceService';
import { resolveEffectiveCommissionRate } from '../../../utils/commissionEngine';
import { formatCurrency, formatDate } from '../../../utilities';
import { useToast } from '../../../context/ToastContext';

interface AdminVendorsTabProps {
  products: Product[];
  orders: Order[];
  categories?: Category[];
  onOpenVendorDashboard?: (vendorId: string) => void;
}

export const AdminVendorsTab: React.FC<AdminVendorsTabProps> = ({
  products = [],
  orders = [],
  categories = [] as Category[],
  onOpenVendorDashboard,
}: AdminVendorsTabProps) => {
  const { showToast } = useToast();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [commissions, setCommissions] = useState<VendorCommission[]>([]);
  const [payouts, setPayouts] = useState<VendorPayout[]>([]);
  const [vendorSummaries, setVendorSummaries] = useState<VendorFinancialSummary[]>([]);
  const [platformTotals, setPlatformTotals] = useState<any>(null);
  const [commissionConfig, setCommissionConfig] = useState<CommissionConfig | null>(null);
  const [payoutProviderConfig, setPayoutProviderConfig] = useState<any>(null);
  const [financialLedger, setFinancialLedger] = useState<FinancialLedgerEntry[]>([]);
  const [financialReports, setFinancialReports] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [activeSubTab, setActiveSubTab] = useState<
    'vendors' | 'earnings' | 'commissions' | 'payouts' | 'adjustments' | 'reports' | 'products' | 'orders'
  >('vendors');

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedVendorForModal, setSelectedVendorForModal] = useState<Vendor | null>(null);
  const [commissionEditValue, setCommissionEditValue] = useState<number>(10);
  const [verificationNotes, setVerificationNotes] = useState('');

  // Commission Editor States (Tiered: Global, Category, Vendor, Product)
  const [globalRateInput, setGlobalRateInput] = useState<number>(10);
  const [selectedCatForRate, setSelectedCatForRate] = useState<string>(categories[0]?.id || 'cat-homemade');
  const [catRateInput, setCatRateInput] = useState<number>(12);
  const [selectedProdForRate, setSelectedProdForRate] = useState<string>(products[0]?.id || '');
  const [prodRateInput, setProdRateInput] = useState<number>(10);

  // Commission Simulator State
  const [simSaleAmount, setSimSaleAmount] = useState<number>(1000);
  const [simVendorId, setSimVendorId] = useState<string>('');
  const [simCategoryId, setSimCategoryId] = useState<string>(categories[0]?.id || 'cat-homemade');
  const [simProductId, setSimProductId] = useState<string>(products[0]?.id || '');

  // Adjustment Creation State
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [adjVendorId, setAdjVendorId] = useState<string>('');
  const [adjAmount, setAdjAmount] = useState<number>(500);
  const [adjType, setAdjType] = useState<'bonus' | 'penalty' | 'fee_reversal' | 'manual_correction'>('fee_reversal');
  const [adjReason, setAdjReason] = useState<string>('');
  const [isSubmittingAdj, setIsSubmittingAdj] = useState<boolean>(false);

  // Payout Disbursement Modal & Provider Config Modal State
  const [selectedPayoutForDisburse, setSelectedPayoutForDisburse] = useState<VendorPayout | null>(null);
  const [disburseUtr, setDisburseUtr] = useState<string>('');
  const [disburseNotes, setDisburseNotes] = useState<string>('');
  const [isProcessingDisburse, setIsProcessingDisburse] = useState<boolean>(false);
  const [isProviderModalOpen, setIsProviderModalOpen] = useState<boolean>(false);

  const loadMarketplaceData = async () => {
    setIsLoading(true);
    try {
      const [vList, cList, pList, finSummary, commConf, providerConf, ledger, reports] = await Promise.all([
        fetchAllVendors(),
        fetchAllCommissionsAdmin(),
        fetchAllPayoutsAdmin(),
        fetchAdminFinancialSummary(),
        fetchCommissionConfig(),
        fetchPayoutProviderConfig(),
        fetchAllLedgerAdmin(),
        fetchFinancialReportsAdmin(),
      ]);

      setVendors(vList);
      setCommissions(cList);
      setPayouts(pList);
      setVendorSummaries(finSummary.vendorSummaries || []);
      setPlatformTotals(finSummary.platformTotals || null);
      setCommissionConfig(commConf);
      if (commConf) {
        setGlobalRateInput(commConf.globalRate);
      }
      if (vList.length > 0) {
        setSimVendorId((prev) => prev || vList[0].id);
        setAdjVendorId((prev) => prev || vList[0].id);
      }
      setPayoutProviderConfig(providerConf);
      setFinancialLedger(ledger);
      setFinancialReports(reports);
    } catch (err: any) {
      showToast('Error loading marketplace financial data', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMarketplaceData();
  }, []);

  useEffect(() => {
    if (categories.length > 0 && !categories.some((c) => c.id === selectedCatForRate)) {
      setSelectedCatForRate(categories[0].id);
      setSimCategoryId(categories[0].id);
    }
  }, [categories, selectedCatForRate]);

  useEffect(() => {
    if (products.length > 0 && !products.some((p) => p.id === selectedProdForRate)) {
      setSelectedProdForRate(products[0].id);
      setSimProductId(products[0].id);
    }
  }, [products, selectedProdForRate]);

  useEffect(() => {
    if (commissionConfig) {
      setCatRateInput(commissionConfig.categoryRates?.[selectedCatForRate] ?? commissionConfig.globalRate ?? 10);
      setProdRateInput(commissionConfig.productRates?.[selectedProdForRate] ?? commissionConfig.globalRate ?? 10);
    }
  }, [commissionConfig, selectedCatForRate, selectedProdForRate]);

  const handleStatusChange = async (vendorId: string, newStatus: VendorStatus) => {
    try {
      await adminUpdateVendorStatus(vendorId, newStatus);
      showToast(`Vendor status updated to ${newStatus}`, 'success');
      loadMarketplaceData();
    } catch (err: any) {
      showToast('Failed to update status', 'error');
    }
  };

  const handleVerificationChange = async (
    vendorId: string,
    verification: VendorVerificationStatus,
    notes?: string
  ) => {
    try {
      await adminUpdateVendorVerification(vendorId, verification, notes);
      showToast(`Vendor verification marked as ${verification}`, 'success');
      setSelectedVendorForModal(null);
      loadMarketplaceData();
    } catch (err: any) {
      showToast('Failed to update verification', 'error');
    }
  };

  const handleSaveCommission = async (vendorId: string) => {
    try {
      await adminUpdateVendorCommission(vendorId, commissionEditValue);
      showToast(`Commission updated to ${commissionEditValue}%`, 'success');
      loadMarketplaceData();
    } catch (err: any) {
      showToast('Failed to update commission', 'error');
    }
  };

  const handleSaveGlobalCommission = async () => {
    if (!commissionConfig) return;
    try {
      const res = await updateCommissionConfig({ globalRate: globalRateInput });
      if (res.success && res.config) {
        setCommissionConfig(res.config);
        showToast(`Global commission baseline updated to ${globalRateInput}%`, 'success');
        loadMarketplaceData();
      } else {
        showToast(res.error || 'Failed to update global commission', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error updating commission', 'error');
    }
  };

  const handleSaveCategoryCommission = async () => {
    if (!commissionConfig || !selectedCatForRate) return;
    try {
      const updatedRates = {
        ...commissionConfig.categoryRates,
        [selectedCatForRate]: catRateInput,
      };
      const res = await updateCommissionConfig({ categoryRates: updatedRates });
      if (res.success && res.config) {
        setCommissionConfig(res.config);
        showToast(`Category commission rate updated to ${catRateInput}%`, 'success');
        loadMarketplaceData();
      }
    } catch (err: any) {
      showToast(err.message || 'Error updating category commission', 'error');
    }
  };

  const handleSaveProductCommission = async () => {
    if (!commissionConfig || !selectedProdForRate) return;
    try {
      const updatedRates = {
        ...commissionConfig.productRates,
        [selectedProdForRate]: prodRateInput,
      };
      const res = await updateCommissionConfig({ productRates: updatedRates });
      if (res.success && res.config) {
        setCommissionConfig(res.config);
        showToast(`Product commission rate updated to ${prodRateInput}%`, 'success');
        loadMarketplaceData();
      }
    } catch (err: any) {
      showToast(err.message || 'Error updating product commission', 'error');
    }
  };

  const handleToggleProviderVerification = async () => {
    if (!payoutProviderConfig) return;
    try {
      const updatedVerified = !payoutProviderConfig.isVerified;
      const res = await updatePayoutProviderConfig({ isVerified: updatedVerified });
      if (res.success && res.providerConfig) {
        setPayoutProviderConfig(res.providerConfig);
        showToast(
          updatedVerified
            ? 'Payout provider verified! Automated disbursements enabled.'
            : 'Payout provider marked unverified. Disbursements blocked for security.',
          updatedVerified ? 'success' : 'info'
        );
      }
    } catch (err: any) {
      showToast('Failed to update provider status', 'error');
    }
  };

  const handleExecuteDisbursement = async () => {
    if (!selectedPayoutForDisburse) return;

    if (!payoutProviderConfig?.isVerified) {
      showToast('Disbursement blocked: No verified payout provider is currently configured.', 'error');
      return;
    }

    setIsProcessingDisburse(true);
    const ref = disburseUtr.trim() || `UTR${Date.now().toString().slice(-8)}`;

    try {
      const res = await adminProcessVendorPayoutWithVerification(
        selectedPayoutForDisburse.id,
        ref,
        disburseNotes,
        true
      );
      if (res.success) {
        showToast(`Payout ${selectedPayoutForDisburse.id} successfully disbursed with UTR ${ref}!`, 'success');
        setSelectedPayoutForDisburse(null);
        setDisburseUtr('');
        setDisburseNotes('');
        loadMarketplaceData();
      } else {
        showToast(res.error || 'Failed to disburse payout', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error processing disbursement', 'error');
    } finally {
      setIsProcessingDisburse(false);
    }
  };

  const handleCreateAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjReason || adjReason.trim().length < 5) {
      showToast('A descriptive reason (min 5 characters) is required for financial audits', 'error');
      return;
    }

    setIsSubmittingAdj(true);
    try {
      const payload: PayoutAdjustmentPayload = {
        vendorId: adjVendorId,
        amount: Number(adjAmount),
        type: adjType,
        reason: adjReason.trim(),
        adminId: 'admin_user',
      };
      const res = await adminCreateFinancialAdjustment(payload);
      if (res.success) {
        showToast(`Financial adjustment of ${formatCurrency(adjAmount)} recorded!`, 'success');
        setIsAdjustmentModalOpen(false);
        setAdjReason('');
        loadMarketplaceData();
      } else {
        showToast(res.error || 'Failed to apply adjustment', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error creating adjustment', 'error');
    } finally {
      setIsSubmittingAdj(false);
    }
  };

  // Filtered vendors
  const filteredVendors = vendors.filter((v) => {
    const matchesSearch =
      v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.ownerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'ALL' ||
      v.status.toUpperCase() === statusFilter.toUpperCase() ||
      v.verificationStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Simulator Calculation
  const simResult = commissionConfig
    ? resolveEffectiveCommissionRate(commissionConfig, simProductId, simCategoryId, simVendorId)
    : { rate: 10, precedenceLevel: 'global' as const, explanation: '10% baseline' };

  const simPlatformCommission = Math.round((simSaleAmount * simResult.rate) / 100);
  const simVendorEarning = Math.max(0, simSaleAmount - simPlatformCommission);

  // Platform Metrics
  const totalMarketplaceGrossSales = platformTotals?.totalGrossSales ?? orders.reduce((sum, o) => sum + (o.total || 0), 0);
  const totalCommissionEarned = platformTotals?.totalPlatformCommission ?? commissions.reduce((sum, c) => sum + (c.commissionAmount || 0), 0);
  const totalPayoutsDisbursed = platformTotals?.totalPaidPayouts ?? payouts
    .filter((p) => p.status === 'completed')
    .reduce((sum, p) => sum + (p.amount || 0), 0);
  const pendingPayoutsCount = payouts.filter((p) => p.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Top Banner & Stats */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-amber-100 text-amber-900">
                <Store className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-xl font-bold font-serif text-stone-900">
                  Marketplace & Vendor Administration
                </h2>
                <p className="text-xs text-stone-500">
                  Secure vendor commission engine, auditable ledger, refund adjustments & bank disbursements
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAdjustmentModalOpen(true)}
              className="px-3 py-2 bg-amber-800 hover:bg-amber-900 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
            >
              <Plus className="w-3.5 h-3.5" />
              New Adjustment
            </button>
            <button
              onClick={loadMarketplaceData}
              disabled={isLoading}
              className="p-2 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 transition"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* 4 Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
          <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-100">
            <div className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
              Total Active Vendors
            </div>
            <div className="text-2xl font-bold font-serif text-stone-900 mt-1">
              {vendors.filter((v) => v.status === 'ACTIVE' || v.status === 'active').length}
              <span className="text-xs font-normal text-stone-400 ml-1">/ {vendors.length} total</span>
            </div>
          </div>
          <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-100">
            <div className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider">
              Platform Commissions
            </div>
            <div className="text-2xl font-bold font-serif text-emerald-900 mt-1">
              {formatCurrency(totalCommissionEarned)}
            </div>
          </div>
          <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-100">
            <div className="text-[11px] font-semibold text-blue-800 uppercase tracking-wider">
              Disbursed Payouts
            </div>
            <div className="text-2xl font-bold font-serif text-blue-900 mt-1">
              {formatCurrency(totalPayoutsDisbursed)}
            </div>
          </div>
          <div className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-100">
            <div className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider">
              Pending Settlements
            </div>
            <div className="text-2xl font-bold font-serif text-amber-900 mt-1">
              {pendingPayoutsCount}
              <span className="text-xs font-normal text-stone-400 ml-1">batches pending</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sub Tabs Navigation */}
      <div className="flex border-b border-stone-200 gap-2 sm:gap-6 overflow-x-auto text-xs font-semibold">
        <button
          onClick={() => setActiveSubTab('vendors')}
          className={`pb-3 border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
            activeSubTab === 'vendors'
              ? 'border-amber-700 text-amber-900 font-bold'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Store className="w-3.5 h-3.5" />
          <span>Vendors Directory ({vendors.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('earnings')}
          className={`pb-3 border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
            activeSubTab === 'earnings'
              ? 'border-amber-700 text-amber-900 font-bold'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <DollarSign className="w-3.5 h-3.5" />
          <span>Vendor Earnings & Balances</span>
        </button>

        <button
          onClick={() => setActiveSubTab('commissions')}
          className={`pb-3 border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
            activeSubTab === 'commissions'
              ? 'border-amber-700 text-amber-900 font-bold'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Percent className="w-3.5 h-3.5" />
          <span>Commission Rules & Tiers</span>
        </button>

        <button
          onClick={() => setActiveSubTab('payouts')}
          className={`pb-3 border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
            activeSubTab === 'payouts'
              ? 'border-amber-700 text-amber-900 font-bold'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>Payout Records ({payouts.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('adjustments')}
          className={`pb-3 border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
            activeSubTab === 'adjustments'
              ? 'border-amber-700 text-amber-900 font-bold'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Refund Adjustments & Ledger</span>
        </button>

        <button
          onClick={() => setActiveSubTab('reports')}
          className={`pb-3 border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
            activeSubTab === 'reports'
              ? 'border-amber-700 text-amber-900 font-bold'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Financial Reports</span>
        </button>

        <button
          onClick={() => setActiveSubTab('products')}
          className={`pb-3 border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
            activeSubTab === 'products'
              ? 'border-amber-700 text-amber-900 font-bold'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Vendor Products</span>
        </button>
      </div>

      {/* ================= TAB 1: VENDORS DIRECTORY ================= */}
      {activeSubTab === 'vendors' && (
        <div className="space-y-4">
          {/* Filters & Search */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-stone-400" />
              <input
                type="text"
                value={searchQuery ?? ''}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search vendor name, owner, city..."
                className="w-full pl-9 pr-3 py-2 text-xs border border-stone-200 rounded-xl bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <select
                value={statusFilter ?? 'ALL'}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs border border-stone-200 rounded-xl px-3 py-2 bg-white font-medium text-stone-700"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active Vendors</option>
                <option value="PENDING">Pending Compliance</option>
                <option value="SUSPENDED">Suspended</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-stone-700">
                <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Vendor Partner</th>
                    <th className="px-4 py-3">Location & FSSAI</th>
                    <th className="px-4 py-3">Commission %</th>
                    <th className="px-4 py-3">Compliance</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredVendors.map((vendor) => (
                    <tr key={vendor.id} className="hover:bg-amber-50/20">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={vendor.logo}
                            alt={vendor.name}
                            className="w-10 h-10 rounded-xl object-cover border border-stone-200 shrink-0"
                          />
                          <div>
                            <div className="font-bold text-stone-900">{vendor.name}</div>
                            <div className="text-[11px] text-stone-400">
                              {vendor.ownerName} • {vendor.phone}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>{vendor.city}, {vendor.state}</div>
                        <div className="text-[10px] font-mono text-stone-400">FSSAI: {vendor.fssaiNumber}</div>
                      </td>
                      <td className="px-4 py-3 font-bold text-amber-900">
                        {vendor.commissionPercentage}%
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          vendor.verificationStatus === 'VERIFIED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {vendor.verificationStatus || 'PENDING'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          vendor.status === 'ACTIVE' || vendor.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}>
                          {vendor.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedVendorForModal(vendor);
                              setCommissionEditValue(vendor.commissionPercentage || 10);
                            }}
                            className="px-2.5 py-1 text-xs rounded-lg border border-stone-200 hover:bg-stone-50 font-medium"
                          >
                            Review
                          </button>
                          {onOpenVendorDashboard && (
                            <button
                              onClick={() => onOpenVendorDashboard(vendor.id)}
                              className="p-1 text-amber-700 hover:bg-amber-50 rounded"
                              title="Open Portal"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: VENDOR EARNINGS ================= */}
      {activeSubTab === 'earnings' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-stone-900 text-sm">Authoritative Vendor Earnings & Liabilities</h3>
              <p className="text-xs text-stone-500">
                Track Gross Sales, Discounts, Commission, Refunds, Adjustments, Net Earnings & Payout Status
              </p>
            </div>
            <span className="text-xs font-semibold px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full">
              Real-Time Server Computation Active
            </span>
          </div>

          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-stone-700">
                <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Vendor</th>
                    <th className="px-4 py-3">Gross Sales</th>
                    <th className="px-4 py-3">Discounts</th>
                    <th className="px-4 py-3">Commission</th>
                    <th className="px-4 py-3">Refunds</th>
                    <th className="px-4 py-3">Adjustments</th>
                    <th className="px-4 py-3 font-bold text-emerald-900">Net Earnings</th>
                    <th className="px-4 py-3 font-bold text-blue-900">Pending Payout</th>
                    <th className="px-4 py-3">Paid Payout</th>
                    <th className="px-4 py-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {vendorSummaries.map((s) => (
                    <tr key={s.vendorId} className="hover:bg-amber-50/20">
                      <td className="px-4 py-3 font-bold text-stone-900">
                        {s.vendorName}
                        <div className="text-[10px] text-stone-400 font-mono">{s.vendorId}</div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-stone-900">{formatCurrency(s.grossSales)}</td>
                      <td className="px-4 py-3 text-rose-700">-{formatCurrency(s.discounts)}</td>
                      <td className="px-4 py-3 text-amber-800 font-semibold">-{formatCurrency(s.commission)}</td>
                      <td className="px-4 py-3 text-rose-700">-{formatCurrency(s.refunds)}</td>
                      <td className="px-4 py-3 font-medium text-emerald-700">
                        {s.adjustments >= 0 ? `+${formatCurrency(s.adjustments)}` : formatCurrency(s.adjustments)}
                      </td>
                      <td className="px-4 py-3 font-black text-emerald-800 text-sm">
                        {formatCurrency(s.vendorEarnings)}
                      </td>
                      <td className="px-4 py-3 font-bold text-blue-800">
                        {formatCurrency(s.pendingPayout)}
                      </td>
                      <td className="px-4 py-3 text-stone-600 font-medium">
                        {formatCurrency(s.paidPayout)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          s.payoutStatus === 'READY'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {s.payoutStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {vendorSummaries.length === 0 && (
                    <tr>
                      <td colSpan={10} className="text-center py-6 text-stone-400">
                        Loading financial summaries from server...
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 3: COMMISSION RULES & SIMULATOR ================= */}
      {activeSubTab === 'commissions' && (
        <div className="space-y-6">
          {/* Hierarchy Guide & Example Callout */}
          <div className="bg-amber-50/70 rounded-2xl border border-amber-200 p-5 space-y-3 text-xs">
            <div className="flex items-center gap-2 font-bold text-amber-950 text-sm">
              <Percent className="w-4 h-4 text-amber-800" />
              Four-Tier Authoritative Commission Hierarchy
            </div>
            <p className="text-amber-900 leading-relaxed">
              When an order is placed, Pure Sudh’s server resolves the commission percentage in strict priority order:
              <strong> 1. Product-specific → 2. Category-specific → 3. Vendor-specific → 4. Global baseline</strong>.
            </p>
            <div className="p-3 bg-white/80 rounded-xl border border-amber-200 text-stone-800 font-medium">
              <span className="font-bold text-amber-950">Example Calculation (Required Standard):</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
                <div>Sale Amount: <strong>₹1,000</strong></div>
                <div>Commission Rate: <strong>10%</strong></div>
                <div>Platform Commission: <strong className="text-amber-900">₹100</strong></div>
                <div>Vendor Earning: <strong className="text-emerald-800">₹900</strong></div>
              </div>
            </div>
          </div>

          {/* Configuration Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Global Baseline Tier */}
            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-3">
              <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block">
                Tier 4: Global Platform Baseline
              </span>
              <p className="text-xs text-stone-500">
                Fallback percentage applied if no product, category, or vendor specific rule matches.
              </p>
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={globalRateInput ?? 0}
                  onChange={(e) => setGlobalRateInput(Number(e.target.value) || 0)}
                  className="w-24 p-2 text-sm font-bold border border-stone-300 rounded-xl"
                />
                <span className="text-sm font-bold text-stone-700">%</span>
                <button
                  onClick={handleSaveGlobalCommission}
                  className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white font-semibold text-xs rounded-xl transition"
                >
                  Save Global
                </button>
              </div>
            </div>

            {/* Category Tier */}
            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-3">
              <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block">
                Tier 2: Category-Specific Rates
              </span>
              <div className="space-y-2 text-xs">
                <select
                  value={selectedCatForRate ?? ''}
                  onChange={(e) => {
                    setSelectedCatForRate(e.target.value);
                    setCatRateInput(commissionConfig?.categoryRates[e.target.value] ?? commissionConfig?.globalRate ?? 10);
                  }}
                  className="w-full p-2 border border-stone-300 rounded-xl bg-white"
                >
                  {categories.length > 0 ? (
                    categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="cat-homemade">Artisanal Snacks & Thekua</option>
                      <option value="cat-dairy">Fresh Dairy & Paneer</option>
                      <option value="cat-sweets">Traditional Sweets & Mithai</option>
                      <option value="cat-khoya">Pure Khoya & Mawa</option>
                    </>
                  )}
                </select>
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={catRateInput ?? 0}
                    onChange={(e) => setCatRateInput(Number(e.target.value) || 0)}
                    className="w-24 p-2 text-sm font-bold border border-stone-300 rounded-xl"
                  />
                  <span className="text-sm font-bold text-stone-700">%</span>
                  <button
                    onClick={handleSaveCategoryCommission}
                    className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white font-semibold text-xs rounded-xl transition"
                  >
                    Update Category
                  </button>
                </div>
              </div>
            </div>

            {/* Product Tier */}
            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-3">
              <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block">
                Tier 1: Product-Specific Overrides (Highest)
              </span>
              <div className="space-y-2 text-xs">
                <select
                  value={selectedProdForRate ?? ''}
                  onChange={(e) => {
                    setSelectedProdForRate(e.target.value);
                    setProdRateInput(commissionConfig?.productRates[e.target.value] ?? commissionConfig?.globalRate ?? 10);
                  }}
                  className="w-full p-2 border border-stone-300 rounded-xl bg-white"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={prodRateInput ?? 0}
                    onChange={(e) => setProdRateInput(Number(e.target.value) || 0)}
                    className="w-24 p-2 text-sm font-bold border border-stone-300 rounded-xl"
                  />
                  <span className="text-sm font-bold text-stone-700">%</span>
                  <button
                    onClick={handleSaveProductCommission}
                    className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white font-semibold text-xs rounded-xl transition"
                  >
                    Update SKU
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Server-Side Commission Simulator */}
          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-stone-100">
              <h4 className="font-bold text-stone-900 text-sm flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-700" />
                Live Server-Side Commission Simulator
              </h4>
              <span className="text-xs text-stone-400">Hierarchy Resolution Testing</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <label className="block text-stone-600 font-semibold mb-1">Sale Amount (₹)</label>
                <input
                  type="number"
                  min="1"
                  value={simSaleAmount ?? 0}
                  onChange={(e) => setSimSaleAmount(Number(e.target.value) || 0)}
                  className="w-full p-2 border border-stone-300 rounded-xl font-bold text-stone-900 text-sm"
                />
              </div>

              <div>
                <label className="block text-stone-600 font-semibold mb-1">Product SKU (Tier 1)</label>
                <select
                  value={simProductId ?? ''}
                  onChange={(e) => setSimProductId(e.target.value)}
                  className="w-full p-2 border border-stone-300 rounded-xl bg-white"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-stone-600 font-semibold mb-1">Category (Tier 2)</label>
                <select
                  value={simCategoryId ?? ''}
                  onChange={(e) => setSimCategoryId(e.target.value)}
                  className="w-full p-2 border border-stone-300 rounded-xl bg-white"
                >
                  {categories.length > 0 ? (
                    categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="cat-homemade">Homemade / Thekua</option>
                      <option value="cat-dairy">Dairy & Paneer</option>
                      <option value="cat-sweets">Sweets & Mithai</option>
                      <option value="cat-khoya">Khoya</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-stone-600 font-semibold mb-1">Vendor (Tier 3)</label>
                <select
                  value={simVendorId ?? ''}
                  onChange={(e) => setSimVendorId(e.target.value)}
                  className="w-full p-2 border border-stone-300 rounded-xl bg-white"
                >
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.commissionPercentage}%)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Resolved Simulation Result Card */}
            <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-stone-900 text-sm">
                    Effective Resolved Rate: {simResult.rate}%
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-900 border border-amber-200">
                    Tier: {simResult.precedenceLevel}
                  </span>
                </div>
                <p className="text-stone-500 text-[11px] mt-0.5">{simResult.explanation}</p>
              </div>

              <div className="flex items-center gap-6 font-mono text-sm">
                <div>
                  <span className="text-[10px] text-stone-400 uppercase block font-sans">Platform Fee:</span>
                  <strong className="text-amber-800">{formatCurrency(simPlatformCommission)}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-stone-400 uppercase block font-sans">Vendor Earning:</span>
                  <strong className="text-emerald-700">{formatCurrency(simVendorEarning)}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 4: PAYOUT RECORDS & DISBURSEMENT ================= */}
      {activeSubTab === 'payouts' && (
        <div className="space-y-6">
          {/* Payout Provider Status & Safeguard Banner */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className={`p-2 rounded-xl shrink-0 ${
                payoutProviderConfig?.isVerified ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
              }`}>
                <ShieldCheck className="w-5 h-5" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-stone-900 text-sm">
                    Verified Payout Provider: {payoutProviderConfig?.provider || 'BANK_NEFT_MANUAL'}
                  </h3>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    payoutProviderConfig?.isVerified
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}>
                    {payoutProviderConfig?.isVerified ? 'CONFIGURED & VERIFIED' : 'UNVERIFIED / BLOCKED'}
                  </span>
                </div>
                <p className="text-xs text-stone-500 mt-0.5">
                  <strong>Strict Invariant:</strong> "Do not automatically transfer money unless a verified payout provider is configured."
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleToggleProviderVerification}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                  payoutProviderConfig?.isVerified
                    ? 'border-rose-200 text-rose-700 hover:bg-rose-50'
                    : 'bg-emerald-700 text-white hover:bg-emerald-800'
                }`}
              >
                {payoutProviderConfig?.isVerified ? 'Revoke Verification' : 'Verify Payout Provider'}
              </button>
            </div>
          </div>

          {/* Payouts Table */}
          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-stone-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-stone-900 text-sm">Bank Disbursement Queue</h3>
                <p className="text-xs text-stone-500">Marketplace merchant settlement transfers</p>
              </div>
              <div className="text-right">
                <span className="text-xs text-stone-400">Total Settled: </span>
                <strong className="text-stone-900 text-sm">{formatCurrency(totalPayoutsDisbursed)}</strong>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-stone-700">
                <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Payout ID</th>
                    <th className="px-4 py-3">Vendor</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Period</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">UTR Reference</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {payouts.map((p) => {
                    const vendor = vendors.find((v) => v.id === p.vendorId);
                    return (
                      <tr key={p.id} className="hover:bg-amber-50/20">
                        <td className="px-4 py-3 font-mono font-semibold text-stone-900">{p.id}</td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-stone-900">{vendor?.name || p.vendorId}</div>
                          <div className="text-[10px] text-stone-400 font-mono">
                            A/C: {vendor?.payoutInformation?.accountNumberMasked || '•••• 4001'}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-extrabold text-stone-900 text-sm">{formatCurrency(p.amount)}</td>
                        <td className="px-4 py-3 text-stone-500">{p.periodStart} to {p.periodEnd}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            p.status === 'completed'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-stone-600">
                          {p.transactionRef || 'Pending Release'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {p.status === 'pending' ? (
                            <button
                              onClick={() => {
                                setSelectedPayoutForDisburse(p);
                                setDisburseUtr(`UTR${Date.now().toString().slice(-8)}`);
                              }}
                              className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-xs transition"
                            >
                              Disburse
                            </button>
                          ) : (
                            <span className="text-[11px] text-emerald-600 font-semibold flex items-center justify-end gap-1">
                              <CheckCircle className="w-3.5 h-3.5" />
                              Settled
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 5: REFUND ADJUSTMENTS & AUDITABLE LEDGER ================= */}
      {activeSubTab === 'adjustments' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
            <div>
              <h3 className="font-bold text-stone-900 text-sm flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                Auditable Financial Ledger & Refund Adjustments
              </h3>
              <p className="text-xs text-stone-500">
                Cryptographically signed double-entry ledger records. Entries cannot be altered or deleted.
              </p>
            </div>
            <button
              onClick={() => setIsAdjustmentModalOpen(true)}
              className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              Create Adjustment Entry
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-stone-700">
                <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Vendor</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Description & Reason</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Balance After</th>
                    <th className="px-4 py-3">Audit Hash</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-sans">
                  {financialLedger.map((entry) => (
                    <tr key={entry.id} className="hover:bg-stone-50/50">
                      <td className="px-4 py-3 text-stone-500 text-[11px] whitespace-nowrap">
                        {formatDate(entry.createdAt)}
                      </td>
                      <td className="px-4 py-3 font-semibold text-stone-900">
                        {entry.vendorName || entry.vendorId}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          entry.type === 'SALE'
                            ? 'bg-emerald-50 text-emerald-700'
                            : entry.type === 'COMMISSION'
                            ? 'bg-amber-50 text-amber-800'
                            : entry.type === 'REFUND'
                            ? 'bg-rose-50 text-rose-700'
                            : entry.type === 'PAYOUT'
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-purple-50 text-purple-700'
                        }`}>
                          {entry.type}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-stone-800 font-medium">{entry.description}</div>
                        {entry.reason && <div className="text-[10px] text-stone-400 italic">Reason: {entry.reason}</div>}
                      </td>
                      <td className={`px-4 py-3 font-bold ${entry.amount >= 0 ? 'text-emerald-700' : 'text-stone-800'}`}>
                        {entry.amount >= 0 ? `+${formatCurrency(entry.amount)}` : formatCurrency(entry.amount)}
                      </td>
                      <td className="px-4 py-3 font-semibold text-stone-900">{formatCurrency(entry.balanceAfter)}</td>
                      <td className="px-4 py-3 font-mono text-[10px] text-stone-400">{entry.auditHash}</td>
                    </tr>
                  ))}
                  {financialLedger.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-stone-400">
                        No financial ledger records logged.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 6: FINANCIAL REPORTS ================= */}
      {activeSubTab === 'reports' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-stone-900 text-sm">Authoritative Platform Financial Reports</h3>
              <p className="text-xs text-stone-500">Gross revenue, platform margin, refunds, disbursements & liability balances</p>
            </div>
            <span className="text-xs font-semibold px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full">
              Audit Sealed: {financialReports?.auditIntegrity?.status || 'IN_BALANCE'}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
              <span className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider block">
                Gross Marketplace Sales
              </span>
              <div className="text-2xl font-bold font-serif text-stone-900 mt-1">
                {formatCurrency(financialReports?.summary?.totalGrossSales ?? totalMarketplaceGrossSales)}
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
              <span className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider block">
                Platform Commission Earned
              </span>
              <div className="text-2xl font-bold font-serif text-emerald-800 mt-1">
                {formatCurrency(financialReports?.summary?.totalCommission ?? totalCommissionEarned)}
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
              <span className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider block">
                Processed Customer Refunds
              </span>
              <div className="text-2xl font-bold font-serif text-rose-700 mt-1">
                {formatCurrency(financialReports?.summary?.totalRefunds ?? 0)}
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
              <span className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider block">
                Disbursement Liability
              </span>
              <div className="text-2xl font-bold font-serif text-blue-900 mt-1">
                {formatCurrency(financialReports?.summary?.pendingSettlementLiability ?? platformTotals?.totalPendingPayouts ?? 0)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 7: VENDOR PRODUCTS ================= */}
      {activeSubTab === 'products' && (
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-stone-100 flex items-center justify-between">
            <h3 className="font-bold text-stone-900 text-sm">All Marketplace Products by Vendor</h3>
            <span className="text-xs text-stone-500">{products.length} products listed</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-stone-700">
              <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold uppercase text-[10px]">
                <tr>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Vendor / Producer</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Stock</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {products.map((p) => {
                  const assignedVendor = vendors.find((v) => v.id === p.vendorId || v.slug === p.vendorId);
                  return (
                    <tr key={p.id} className="hover:bg-stone-50/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={p.images?.[0] || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=100&q=80'}
                            alt={p.name}
                            className="w-9 h-9 rounded-lg object-cover border border-stone-200"
                          />
                          <div>
                            <div className="font-semibold text-stone-900">{p.name}</div>
                            <div className="text-[11px] text-stone-400">{p.weight}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-amber-900">{assignedVendor?.name || p.vendorId || 'Pure Sudh Central'}</div>
                        <div className="text-[10px] text-stone-400">{assignedVendor?.city || 'Central Warehouse'}</div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-stone-900">
                        {formatCurrency(p.salePrice || p.price)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-medium ${(p.stockQuantity ?? p.stock ?? 0) < 10 ? 'text-rose-600' : 'text-stone-700'}`}>
                          {p.stockQuantity ?? p.stock ?? 0} units
                        </span>
                      </td>
                      <td className="px-4 py-3 text-stone-500 capitalize">{p.categoryId?.replace('cat-', '')}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">
                          ACTIVE
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= MODAL: DISBURSE PAYOUT ================= */}
      {selectedPayoutForDisburse && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-stone-100">
              <h3 className="font-bold text-stone-900 text-sm">Disburse Vendor Payout</h3>
              <button onClick={() => setSelectedPayoutForDisburse(null)} className="text-stone-400">✕</button>
            </div>
            <div className="p-3 bg-stone-50 rounded-xl space-y-1 text-xs">
              <div>Payout ID: <strong className="font-mono">{selectedPayoutForDisburse.id}</strong></div>
              <div>Settlement Amount: <strong className="text-emerald-800 text-sm">{formatCurrency(selectedPayoutForDisburse.amount)}</strong></div>
              <div>Vendor: <strong>{selectedPayoutForDisburse.vendorId}</strong></div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Bank UTR / Transaction Reference *
              </label>
              <input
                type="text"
                value={disburseUtr ?? ''}
                onChange={(e) => setDisburseUtr(e.target.value)}
                placeholder="UTR12345678"
                className="w-full p-2 rounded-xl border border-stone-300 font-mono text-xs uppercase"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Disbursement Notes</label>
              <input
                type="text"
                value={disburseNotes ?? ''}
                onChange={(e) => setDisburseNotes(e.target.value)}
                placeholder="NEFT Transfer processed"
                className="w-full p-2 rounded-xl border border-stone-300 text-xs"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setSelectedPayoutForDisburse(null)}
                className="px-4 py-2 border border-stone-200 text-stone-600 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isProcessingDisburse}
                onClick={handleExecuteDisbursement}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs"
              >
                {isProcessingDisburse ? 'Processing...' : 'Confirm & Disburse'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: CREATE FINANCIAL ADJUSTMENT ================= */}
      {isAdjustmentModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-stone-100">
              <h3 className="font-bold text-stone-900 text-sm flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-700" />
                Create Auditable Financial Adjustment
              </h3>
              <button onClick={() => setIsAdjustmentModalOpen(false)} className="text-stone-400">✕</button>
            </div>
            <form onSubmit={handleCreateAdjustment} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Target Vendor *</label>
                <select
                  value={adjVendorId ?? ''}
                  onChange={(e) => setAdjVendorId(e.target.value)}
                  className="w-full p-2 rounded-xl border border-stone-300 bg-white"
                >
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.id})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Adjustment Type *</label>
                  <select
                    value={adjType ?? 'fee_reversal'}
                    onChange={(e) => setAdjType(e.target.value as any)}
                    className="w-full p-2 rounded-xl border border-stone-300 bg-white font-medium"
                  >
                    <option value="fee_reversal">Fee Reversal (Credit)</option>
                    <option value="bonus">Promotional Bonus (Credit)</option>
                    <option value="penalty">Penalty Deduction (Debit)</option>
                    <option value="manual_correction">Manual Correction</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    value={adjAmount ?? 0}
                    onChange={(e) => setAdjAmount(Number(e.target.value) || 0)}
                    className="w-full p-2 rounded-xl border border-stone-300 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Mandatory Audit Reason (min 5 characters) *
                </label>
                <textarea
                  required
                  minLength={5}
                  value={adjReason ?? ''}
                  onChange={(e) => setAdjReason(e.target.value)}
                  placeholder="e.g. Return fee reimbursement for order PS100004 or compliance penalty"
                  rows={2}
                  className="w-full p-2.5 rounded-xl border border-stone-300 text-xs"
                />
              </div>

              <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900">
                This transaction creates an immutable, cryptographically sealed record in the financial ledger.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsAdjustmentModalOpen(false)}
                  className="px-4 py-2 border border-stone-200 text-stone-600 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAdj}
                  className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl font-bold shadow-xs"
                >
                  {isSubmittingAdj ? 'Recording...' : 'Record Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: COMPLIANCE & REVIEW ================= */}
      {selectedVendorForModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-3">
                <img
                  src={selectedVendorForModal.logo}
                  alt={selectedVendorForModal.name}
                  className="w-12 h-12 rounded-xl object-cover border border-stone-200"
                />
                <div>
                  <h3 className="text-lg font-bold font-serif text-stone-900">
                    {selectedVendorForModal.name}
                  </h3>
                  <p className="text-xs text-stone-500">{selectedVendorForModal.ownerName} • {selectedVendorForModal.city}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedVendorForModal(null)}
                className="p-1.5 rounded-lg text-stone-400 hover:bg-stone-100"
              >
                ✕
              </button>
            </div>

            {/* Business Info Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-stone-50 rounded-xl space-y-1">
                <div className="font-semibold text-stone-600">Business Details</div>
                <div><strong>Email:</strong> {selectedVendorForModal.email}</div>
                <div><strong>Phone:</strong> {selectedVendorForModal.phone}</div>
                <div><strong>Address:</strong> {selectedVendorForModal.address}, {selectedVendorForModal.city} - {selectedVendorForModal.pincode}</div>
              </div>

              <div className="p-3 bg-stone-50 rounded-xl space-y-1">
                <div className="font-semibold text-stone-600">Compliance & Regulatory</div>
                <div><strong>FSSAI Number:</strong> <span className="font-mono">{selectedVendorForModal.fssaiNumber}</span></div>
                <div><strong>GST Number:</strong> <span className="font-mono">{selectedVendorForModal.gstNumber || 'Unregistered'}</span></div>
                <div><strong>Joined Date:</strong> {formatDate(selectedVendorForModal.joinedAt)}</div>
              </div>
            </div>

            {/* Payout Bank Info */}
            <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-100 text-xs space-y-1">
              <div className="font-bold text-amber-900 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5" />
                Settlement Banking Information
              </div>
              <div className="grid grid-cols-3 gap-2 pt-1 text-stone-700">
                <div>
                  <span className="text-stone-400 block text-[10px]">A/C Holder:</span>
                  <strong>{selectedVendorForModal.payoutInformation?.accountHolderName || selectedVendorForModal.ownerName}</strong>
                </div>
                <div>
                  <span className="text-stone-400 block text-[10px]">Bank & IFSC:</span>
                  <span>{selectedVendorForModal.payoutInformation?.bankName || 'SBI'} ({selectedVendorForModal.payoutInformation?.ifscCode || 'SBIN0001234'})</span>
                </div>
                <div>
                  <span className="text-stone-400 block text-[10px]">Account Masked:</span>
                  <span className="font-mono font-semibold">{selectedVendorForModal.payoutInformation?.accountNumberMasked || '•••• 4001'}</span>
                </div>
              </div>
            </div>

            {/* Commission Percentage Edit */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-stone-700">
                Platform Commission Fee (%):
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={commissionEditValue ?? 0}
                  onChange={(e) => setCommissionEditValue(Number(e.target.value) || 0)}
                  className="w-24 p-2 text-xs border border-stone-300 rounded-xl font-bold"
                />
                <button
                  type="button"
                  onClick={() => handleSaveCommission(selectedVendorForModal.id)}
                  className="px-3 py-2 bg-stone-800 hover:bg-stone-900 text-white rounded-xl text-xs font-semibold"
                >
                  Update Rate
                </button>
              </div>
            </div>

            {/* Administrative Verification Notes */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-stone-700">
                Verification & Audit Notes:
              </label>
              <textarea
                value={verificationNotes ?? ''}
                onChange={(e) => setVerificationNotes(e.target.value)}
                placeholder="e.g. Physical kitchen audit passed. FSSAI registration verified against government portal."
                rows={2}
                className="w-full p-2.5 text-xs border border-stone-300 rounded-xl"
              />
            </div>

            {/* Decision Buttons */}
            <div className="pt-2 flex items-center justify-between gap-3 border-t border-stone-100">
              <button
                type="button"
                onClick={() => handleVerificationChange(selectedVendorForModal.id, 'REJECTED', verificationNotes)}
                className="px-4 py-2.5 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-bold transition flex items-center gap-1.5"
              >
                <XCircle className="w-4 h-4" />
                Reject Verification
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleStatusChange(selectedVendorForModal.id, 'SUSPENDED')}
                  className="px-4 py-2.5 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-50 text-xs font-semibold transition"
                >
                  Suspend
                </button>
                <button
                  type="button"
                  onClick={() => handleVerificationChange(selectedVendorForModal.id, 'VERIFIED', verificationNotes)}
                  className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                >
                  <CheckCircle className="w-4 h-4" />
                  Verify & Activate Vendor
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
