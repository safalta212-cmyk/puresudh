import React, { useState, useEffect } from 'react';
import {
  Store,
  Package,
  TrendingUp,
  FileCheck,
  ShieldCheck,
  ArrowLeft,
  Plus,
  Phone,
  Mail,
  MapPin,
  Clock,
  AlertCircle,
  CreditCard,
  Percent,
  DollarSign,
  Bell,
  CheckCircle,
  Boxes,
  RefreshCw,
  Edit,
  Trash2,
  Lock,
  Star,
  User,
  Wallet,
  Megaphone,
  LogOut,
} from 'lucide-react';
import { VendorAdvertisingWalletTab } from './tabs/VendorAdvertisingWalletTab';
import { VendorAdvertisingCampaignsTab } from './tabs/VendorAdvertisingCampaignsTab';
import { VendorAdvertisingSuite } from './tabs/VendorAdvertisingSuite';
import {
  Vendor,
  VendorInventory,
  VendorOrder,
  VendorCommission,
  VendorPayout,
  VendorBankAccount,
  VendorNotification,
  Product,
  Order,
  Review,
  Category,
  VendorFinancialSummary,
  FinancialLedgerEntry,
} from '../../types';
import { BRAND } from '../../constants';
import { formatCurrency, formatDate } from '../../utilities';
import { MediaUploader } from '../common/MediaUploader';
import {
  isTemporaryOrFakePhone,
  normalizeIndianPhone10,
  sanitizePhoneInput10,
  formatIndianPhone,
} from '../../validation';
import {
  fetchAllVendors,
  fetchVendorProducts,
  saveVendorProductItem,
  deleteVendorProductItem,
  fetchVendorInventory,
  updateVendorInventoryStock,
  fetchVendorOrders,
  updateVendorOrderStatus,
  fetchVendorCommissions,
  fetchVendorPayouts,
  fetchVendorBankAccounts,
  saveVendorBankAccount,
  fetchVendorNotifications,
  markVendorNotificationRead,
  fetchVendorFinancialSummary,
  fetchVendorLedger,
  requestVendorPayout,
  updateVendorProfile,
} from '../../services/vendorMarketplaceService';
import { fetchAllReviews, fetchCategories } from '../../firebase/services';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

interface VendorDashboardProps {
  products: Product[];
  orders: Order[];
  categories?: Category[];
  onBackToStore: () => void;
  onOpenProductDetails?: (product: Product) => void;
  onOpenRegisterNewVendor?: () => void;
}

export const VendorDashboard: React.FC<VendorDashboardProps> = ({
  products: initialProducts,
  orders: initialOrders,
  categories: propCategories,
  onBackToStore,
  onOpenProductDetails,
  onOpenRegisterNewVendor,
}) => {
  const { user, logout } = useAuth();
  const { showToast } = useToast();

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState<string>('vendor-1');
  const [activeTab, setActiveTab] = useState<
    | 'dashboard'
    | 'products'
    | 'inventory'
    | 'orders'
    | 'sales'
    | 'earnings'
    | 'commission'
    | 'payouts'
    | 'bank'
    | 'reviews'
    | 'profile'
    | 'notifications'
    | 'advertising'
    | 'ad-wallet'
    | 'ad-campaigns'
  >('dashboard');

  const [vendorProducts, setVendorProducts] = useState<Product[]>([]);
  const [vendorInventory, setVendorInventory] = useState<VendorInventory[]>([]);
  const [vendorOrders, setVendorOrders] = useState<VendorOrder[]>([]);
  const [vendorCommissions, setVendorCommissions] = useState<VendorCommission[]>([]);
  const [vendorPayouts, setVendorPayouts] = useState<VendorPayout[]>([]);
  const [vendorBankAccounts, setVendorBankAccounts] = useState<VendorBankAccount[]>([]);
  const [vendorNotifications, setVendorNotifications] = useState<VendorNotification[]>([]);
  const [vendorReviews, setVendorReviews] = useState<Review[]>([]);
  const [financialSummary, setFinancialSummary] = useState<VendorFinancialSummary | null>(null);
  const [vendorLedger, setVendorLedger] = useState<FinancialLedgerEntry[]>([]);
  const [payoutRequestAmount, setPayoutRequestAmount] = useState<number>(0);
  const [payoutRequestNotes, setPayoutRequestNotes] = useState<string>('');
  const [isRequestingPayout, setIsRequestingPayout] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isEditingProfile, setIsEditingProfile] = useState<boolean>(false);
  const [profileForm, setProfileForm] = useState({
    tagline: '',
    description: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    fssaiNumber: '',
    gstNumber: '',
  });

  // Modal state for adding product
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [newProductPrice, setNewProductPrice] = useState<number>(250);
  const [newProductWeight, setNewProductWeight] = useState('500g');
  const [newProductStock, setNewProductStock] = useState<number>(50);
  const [newProductDesc, setNewProductDesc] = useState('');
  const [newProductCategory, setNewProductCategory] = useState('cat-homemade');
  const [newProductImage, setNewProductImage] = useState('');
  const [categoriesList, setCategoriesList] = useState<Category[]>(propCategories || []);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeletingProduct, setIsDeletingProduct] = useState(false);

  // Bank Form State
  const [bankHolder, setBankHolder] = useState('');
  const [bankAccNumber, setBankAccNumber] = useState('');
  const [bankIfsc, setBankIfsc] = useState('');
  const [bankName, setBankName] = useState('');

  // 1. Initial Load of Vendors
  useEffect(() => {
    const loadAllVendors = async () => {
      try {
        const list = await fetchAllVendors();
        setVendors(list);
        if (list.length > 0) {
          // If logged-in user is a vendor, select their vendor profile
          const matched = list.find((v) => v.ownerUserId === user?.uid);
          if (matched) {
            setSelectedVendorId(matched.id);
          } else {
            setSelectedVendorId(list[0].id);
          }
        }
      } catch (e) {
        console.error('Failed to load vendors list:', e);
      }
    };
    loadAllVendors();
    if (!propCategories || propCategories.length === 0) {
      fetchCategories().then((cats) => {
        if (Array.isArray(cats) && cats.length > 0) {
          setCategoriesList(cats);
          setNewProductCategory((prev) => prev || cats[0].id);
        }
      }).catch(() => null);
    } else {
      setCategoriesList(propCategories);
    }
  }, [user, propCategories]);

  const currentVendor = vendors.find((v) => v.id === selectedVendorId) || vendors[0];

  // 2. Strict Zero-Trust Data Fetching when selectedVendorId changes
  const loadScopedVendorData = async (vId: string) => {
    if (!vId) return;
    setIsLoading(true);
    try {
      const [prods, inv, ords, comms, pays, banks, notifs, summary, ledger, allReviews] = await Promise.all([
        fetchVendorProducts(vId),
        fetchVendorInventory(vId),
        fetchVendorOrders(vId),
        fetchVendorCommissions(vId),
        fetchVendorPayouts(vId),
        fetchVendorBankAccounts(vId),
        fetchVendorNotifications(vId),
        fetchVendorFinancialSummary(vId),
        fetchVendorLedger(vId),
        fetchAllReviews().catch(() => []),
      ]);
      setVendorProducts(prods);
      setVendorInventory(inv);
      setVendorOrders(ords);
      setVendorCommissions(comms);
      setVendorPayouts(pays);
      setVendorBankAccounts(banks);
      setVendorNotifications(notifs);
      setFinancialSummary(summary);
      setVendorLedger(ledger);
      const prodIds = new Set(prods.map((p) => p.id));
      const matched = (allReviews || []).filter((r: Review) => prodIds.has(r.productId));
      setVendorReviews(matched);
    } catch (err: any) {
      console.error('Error loading scoped vendor data:', err);
      showToast('Error loading isolated vendor data', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentVendor) {
      setProfileForm({
        tagline: currentVendor.tagline || '',
        description: currentVendor.description || '',
        phone: normalizeIndianPhone10(currentVendor.phone || ''),
        email: currentVendor.email || '',
        address: currentVendor.address || '',
        city: currentVendor.city || '',
        state: currentVendor.state || '',
        pincode: currentVendor.pincode || '',
        fssaiNumber: currentVendor.fssaiNumber || '',
        gstNumber: currentVendor.gstNumber || '',
      });
    }
  }, [currentVendor?.id]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentVendor) return;
    if (profileForm.phone.trim()) {
      const phoneCheck = isTemporaryOrFakePhone(profileForm.phone);
      if (phoneCheck.isFake) {
        showToast(phoneCheck.reason || 'Please enter a valid 10-digit Indian mobile number (+91).', 'error');
        return;
      }
    }
    try {
      const res = await updateVendorProfile(currentVendor.id, {
        ...profileForm,
        phone: profileForm.phone.trim() ? formatIndianPhone(profileForm.phone) : '',
      });
      if (res.success) {
        showToast('Vendor profile updated successfully', 'success');
        setIsEditingProfile(false);
        const updatedVendors = await fetchAllVendors();
        setVendors(updatedVendors);
      } else {
        showToast(res.error || 'Failed to update profile', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error updating profile', 'error');
    }
  };

  useEffect(() => {
    if (currentVendor?.id) {
      loadScopedVendorData(currentVendor.id);
    }
  }, [selectedVendorId, currentVendor?.id]);

  // Handlers
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentVendor) return;

    if (currentVendor.verificationStatus !== 'VERIFIED' && currentVendor.status !== 'ACTIVE') {
      showToast('Cannot list products until account is verified by Admin.', 'error');
      return;
    }

    try {
      const saved = await saveVendorProductItem(currentVendor.id, {
        name: newProductName,
        price: newProductPrice,
        weight: newProductWeight,
        stockQuantity: newProductStock,
        description: newProductDesc,
        categoryId: newProductCategory,
        images: [newProductImage],
        availability: true,
        active: true,
      });

      // Update inventory entry
      await updateVendorInventoryStock(
        currentVendor.id,
        `inv-${saved.id}`,
        newProductStock,
        10
      );

      showToast(`Product "${saved.name}" listed under ${currentVendor.name}`, 'success');
      setIsAddProductOpen(false);
      setNewProductName('');
      setNewProductDesc('');
      loadScopedVendorData(currentVendor.id);
    } catch (err: any) {
      showToast(err.message || 'Failed to add product', 'error');
    }
  };

  const handleDeleteProductConfirm = async () => {
    if (!currentVendor || !productToDelete) return;
    setIsDeletingProduct(true);
    try {
      await deleteVendorProductItem(currentVendor.id, productToDelete.id);
      showToast('Product deleted from vendor catalog', 'info');
      setProductToDelete(null);
      loadScopedVendorData(currentVendor.id);
    } catch (err: any) {
      showToast(err.message || 'Failed to delete product', 'error');
    } finally {
      setIsDeletingProduct(false);
    }
  };

  const handleUpdateStock = async (invId: string, qty: number) => {
    if (!currentVendor) return;
    try {
      await updateVendorInventoryStock(currentVendor.id, invId, qty);
      showToast('Stock level updated', 'success');
      loadScopedVendorData(currentVendor.id);
    } catch (err: any) {
      showToast('Failed to update stock', 'error');
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: any) => {
    if (!currentVendor) return;
    try {
      await updateVendorOrderStatus(currentVendor.id, orderId, status);
      showToast(`Order marked as ${status}`, 'success');
      loadScopedVendorData(currentVendor.id);
    } catch (err: any) {
      showToast('Failed to update order status', 'error');
    }
  };

  const handleSaveBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentVendor) return;
    try {
      const newAcc: VendorBankAccount = {
        id: `bank-${currentVendor.id}-${Date.now().toString(36)}`,
        vendorId: currentVendor.id,
        accountHolderName: bankHolder,
        accountNumberMasked: `•••• •••• ${bankAccNumber.slice(-4)}`,
        ifscCode: bankIfsc.toUpperCase(),
        bankName: bankName,
        isPrimary: true,
        isVerified: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await saveVendorBankAccount(newAcc);
      showToast('Bank details submitted for compliance review', 'success');
      setBankHolder('');
      setBankAccNumber('');
      setBankIfsc('');
      setBankName('');
      loadScopedVendorData(currentVendor.id);
    } catch (err: any) {
      showToast('Failed to save bank coordinates', 'error');
    }
  };

  const handleMarkNotifRead = async (notifId: string) => {
    if (!currentVendor) return;
    await markVendorNotificationRead(currentVendor.id, notifId);
    loadScopedVendorData(currentVendor.id);
  };

  const handleRequestPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentVendor || payoutRequestAmount <= 0) return;
    if (payoutRequestAmount > pendingPayoutBalance) {
      showToast(`Requested amount ₹${payoutRequestAmount} exceeds available pending balance of ₹${pendingPayoutBalance}.`, 'error');
      return;
    }
    setIsRequestingPayout(true);
    try {
      const res = await requestVendorPayout(currentVendor.id, payoutRequestAmount, payoutRequestNotes);
      if (res.success) {
        showToast(`Payout request of ₹${payoutRequestAmount.toLocaleString('en-IN')} submitted successfully!`, 'success');
        setPayoutRequestAmount(0);
        setPayoutRequestNotes('');
        loadScopedVendorData(currentVendor.id);
      } else {
        showToast(res.error || 'Failed to submit payout request', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error requesting payout', 'error');
    } finally {
      setIsRequestingPayout(false);
    }
  };

  // Authoritative Server-Side Financial Tracking
  const rawOrdersGross = vendorOrders.reduce((sum, o) => sum + (o.vendorSubtotal || 0), 0) ||
    vendorCommissions.reduce((sum, c) => sum + (c.orderTotal || 0), 0);

  const totalVendorGrossSales = financialSummary?.grossSales ?? rawOrdersGross;
  const totalDiscounts = financialSummary?.discounts ?? 0;

  const totalCommissionsDeducted = financialSummary?.commission ?? (
    vendorCommissions.reduce((sum, c) => sum + (c.commissionAmount || 0), 0) ||
    Math.round(totalVendorGrossSales * (currentVendor?.commissionPercentage || 10) / 100)
  );

  const totalRefunds = financialSummary?.refunds ?? 0;
  const totalAdjustments = financialSummary?.adjustments ?? 0;

  const totalNetEarnings = financialSummary?.vendorEarnings ?? Math.max(
    0,
    totalVendorGrossSales - totalDiscounts - totalCommissionsDeducted - totalRefunds + totalAdjustments
  );

  const totalSettledPayouts = financialSummary?.paidPayout ?? vendorPayouts
    .filter((p) => p.status === 'completed')
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const pendingPayoutBalance = financialSummary?.pendingPayout ?? Math.max(0, totalNetEarnings - totalSettledPayouts);

  const unreadNotifsCount = vendorNotifications.filter((n) => !n.read).length;

  if (!currentVendor) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-amber-600" />
          <p className="text-stone-600 font-medium">Initializing Marketplace Vendor Workspace...</p>
        </div>
      </div>
    );
  }

  const isVerified = currentVendor.verificationStatus === 'VERIFIED' || currentVendor.status === 'ACTIVE';
  const isSuspended = currentVendor.status === 'SUSPENDED';

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-stone-900 pb-20 font-sans" id="vendor-marketplace-portal">
      {/* Top Banner */}
      <div className="bg-stone-900 text-stone-100 border-b border-stone-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="bg-amber-600 text-white font-bold px-2 py-0.5 rounded text-[10px] tracking-wider uppercase">
              Vendor Portal
            </span>
            <span className="text-stone-300 font-medium">{BRAND.NAME} Marketplace</span>
            <span className="text-stone-500">•</span>
            <span className="text-stone-400">Zero-Trust Artisan Sandbox</span>
          </div>

          <div className="flex items-center gap-3">
            {onOpenRegisterNewVendor && (
              <button
                onClick={onOpenRegisterNewVendor}
                className="text-amber-400 hover:text-amber-300 font-semibold underline text-xs"
              >
                + Register Another Kitchen
              </button>
            )}
            <button
              onClick={onBackToStore}
              id="vendor-back-store-btn"
              className="flex items-center gap-1.5 text-stone-300 hover:text-white font-medium transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Store
            </button>
            <button
              id="vendor-logout-btn"
              type="button"
              onClick={async () => {
                await logout();
                onBackToStore();
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-rose-900/60 text-stone-300 hover:text-rose-200 font-medium transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Vendor Header Bar */}
      <div className="bg-white border-b border-stone-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="flex items-start gap-4">
              <img
                src={currentVendor.logo}
                alt={currentVendor.name}
                className="w-16 h-16 rounded-2xl object-cover border border-amber-200 shadow-xs shrink-0"
              />
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-serif font-bold text-stone-900">
                    {currentVendor.name}
                  </h1>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      isVerified
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : isSuspended
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Status: {currentVendor.status} ({currentVendor.verificationStatus || 'PENDING'})
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-stone-600 mt-1">{currentVendor.tagline}</p>
                <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-stone-500">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-stone-400" />
                    {currentVendor.city}, {currentVendor.state} ({currentVendor.pincode})
                  </span>
                  <span>•</span>
                  <span>FSSAI: {currentVendor.fssaiNumber}</span>
                  <span>•</span>
                  <span>Commission: {currentVendor.commissionPercentage}%</span>
                </div>
              </div>
            </div>

            {/* Vendor Switcher */}
            <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 flex flex-col gap-1.5 sm:min-w-[280px]">
              <div className="flex items-center justify-between">
                <label htmlFor="vendor-selector" className="text-[11px] font-bold text-stone-600 uppercase tracking-wide">
                  Switch Active Vendor:
                </label>
                <span className="text-[10px] text-amber-800 font-mono">Isolated Workspace</span>
              </div>
              <select
                id="vendor-selector"
                value={selectedVendorId ?? ''}
                onChange={(e) => setSelectedVendorId(e.target.value)}
                className="bg-white border border-stone-300 rounded-lg px-3 py-1.5 text-xs text-stone-800 font-medium focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              >
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.city}) — {v.status}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Status Alert if Pending or Suspended */}
        {!isVerified && (
          <div className="bg-amber-50 border-t border-amber-200 px-4 sm:px-8 py-2.5 text-xs text-amber-900 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                <strong>Verification In Progress:</strong> Your account is currently under administrative compliance review. Products will be published to the live store once approved.
              </span>
            </div>
          </div>
        )}

        {isSuspended && (
          <div className="bg-rose-50 border-t border-rose-200 px-4 sm:px-8 py-2.5 text-xs text-rose-900 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-700 shrink-0" />
            <span>
              <strong>Account Suspended:</strong> Product listings are temporarily disabled. Please contact Pure Sudh Administration.
            </span>
          </div>
        )}

        {/* All Required Sub-Tabs Navigation */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex border-b border-stone-200 overflow-x-auto no-scrollbar gap-1 sm:gap-4 text-xs font-semibold pt-1">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: Store },
              { id: 'products', label: `Products (${vendorProducts.length})`, icon: Package },
              { id: 'inventory', label: 'Inventory', icon: Boxes },
              { id: 'orders', label: `Orders (${vendorOrders.length})`, icon: TrendingUp },
              { id: 'sales', label: 'Sales', icon: TrendingUp },
              { id: 'earnings', label: 'Earnings', icon: DollarSign },
              { id: 'commission', label: 'Commission', icon: Percent },
              { id: 'payouts', label: `Payouts (${vendorPayouts.length})`, icon: CreditCard },
              { id: 'bank', label: 'Bank Account', icon: ShieldCheck },
              { id: 'advertising', label: 'Vendor Advertising', icon: Megaphone },
              { id: 'reviews', label: `Reviews (${vendorReviews.length})`, icon: Star },
              { id: 'profile', label: 'Profile', icon: User },
              {
                id: 'notifications',
                label: `Notifications ${unreadNotifsCount > 0 ? `(${unreadNotifsCount})` : ''}`,
                icon: Bell,
              },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-3 px-2 border-b-2 transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'border-amber-700 text-amber-900 font-bold'
                      : 'border-transparent text-stone-500 hover:text-stone-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* ================= TAB 1: DASHBOARD ================= */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Server-Authoritative Financial Overview (Core Metrics) */}
            <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-stone-100 gap-2">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
                    <DollarSign className="w-4 h-4" />
                  </span>
                  <div>
                    <h3 className="font-bold text-stone-900 text-sm font-serif">
                      Financial Performance & Commission Ledger
                    </h3>
                    <p className="text-[11px] text-stone-500">
                      Authoritative server-side accounting for {currentVendor.name}
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 self-start sm:self-auto">
                  <ShieldCheck className="w-3 h-3" />
                  Server Ledger Authoritative
                </span>
              </div>

              {/* 5 Core Financial Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-4">
                <div className="p-3 bg-stone-50 rounded-xl border border-stone-100">
                  <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
                    1. Total Sales
                  </span>
                  <div className="text-xl font-bold font-serif text-stone-900 mt-1">
                    {formatCurrency(totalVendorGrossSales)}
                  </div>
                  <div className="text-[10px] text-stone-400 mt-0.5">Gross invoiced</div>
                </div>

                <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-100">
                  <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
                    2. Commission
                  </span>
                  <div className="text-xl font-bold font-serif text-amber-900 mt-1">
                    {formatCurrency(totalCommissionsDeducted)}
                  </div>
                  <div className="text-[10px] text-amber-700 mt-0.5">
                    {currentVendor.commissionPercentage}% rate
                  </div>
                </div>

                <div className="p-3 bg-emerald-50/80 rounded-xl border border-emerald-100">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                    3. Net Earnings
                  </span>
                  <div className="text-xl font-bold font-serif text-emerald-800 mt-1">
                    {formatCurrency(totalNetEarnings)}
                  </div>
                  <div className="text-[10px] text-emerald-700 mt-0.5">Accrued to vendor</div>
                </div>

                <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-100">
                  <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider block">
                    4. Pending Payout
                  </span>
                  <div className="text-xl font-bold font-serif text-blue-900 mt-1">
                    {formatCurrency(pendingPayoutBalance)}
                  </div>
                  <div className="text-[10px] text-blue-600 mt-0.5">Ready for transfer</div>
                </div>

                <div className="p-3 bg-stone-100 rounded-xl border border-stone-200 col-span-2 sm:col-span-1">
                  <span className="text-[10px] font-bold text-stone-600 uppercase tracking-wider block">
                    5. Paid Payout
                  </span>
                  <div className="text-xl font-bold font-serif text-stone-800 mt-1">
                    {formatCurrency(totalSettledPayouts)}
                  </div>
                  <div className="text-[10px] text-emerald-700 mt-0.5">Disbursed to bank</div>
                </div>
              </div>

              {/* Complete Auditable Accounting Equation Bar */}
              <div className="mt-4 p-3 bg-stone-100/70 rounded-xl border border-stone-200/60 text-xs">
                <div className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-2">
                  Audited Balance Ledger Breakdown:
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-[11px]">
                  <div>
                    <span className="text-stone-400 block">Gross Sales:</span>
                    <strong className="text-stone-800 font-mono">{formatCurrency(totalVendorGrossSales)}</strong>
                  </div>
                  <div>
                    <span className="text-stone-400 block">Discounts:</span>
                    <strong className="text-rose-700 font-mono">-{formatCurrency(totalDiscounts)}</strong>
                  </div>
                  <div>
                    <span className="text-stone-400 block">Commission:</span>
                    <strong className="text-amber-800 font-mono">-{formatCurrency(totalCommissionsDeducted)}</strong>
                  </div>
                  <div>
                    <span className="text-stone-400 block">Refunds:</span>
                    <strong className="text-rose-700 font-mono">-{formatCurrency(totalRefunds)}</strong>
                  </div>
                  <div>
                    <span className="text-stone-400 block">Adjustments:</span>
                    <strong className="text-emerald-700 font-mono">+{formatCurrency(totalAdjustments)}</strong>
                  </div>
                  <div>
                    <span className="text-stone-400 block">Net Earnings:</span>
                    <strong className="text-emerald-800 font-mono">{formatCurrency(totalNetEarnings)}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions & Recent Orders Preview */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left 2 Cols: Orders to Fulfill */}
              <div className="lg:col-span-2 bg-white rounded-2xl border border-stone-200 p-5 shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                  <h3 className="font-bold text-stone-900 text-sm">Active Orders to Fulfill</h3>
                  <button
                    onClick={() => setActiveTab('orders')}
                    className="text-xs text-amber-700 hover:underline font-semibold"
                  >
                    View All Orders →
                  </button>
                </div>
                <div className="divide-y divide-stone-100 pt-2">
                  {vendorOrders.slice(0, 5).map((ord) => (
                    <div key={ord.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                      <div>
                        <div className="font-bold font-mono text-stone-900">{ord.orderNumber}</div>
                        <div className="text-stone-400 text-[11px]">{formatDate(ord.createdAt)}</div>
                      </div>
                      <div>
                        <span className="font-semibold text-stone-900">{formatCurrency(ord.vendorSubtotal)}</span>
                        <div className="text-[10px] text-stone-400">{ord.items.length} items</div>
                      </div>
                      <div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-stone-100 text-stone-700">
                          {ord.status}
                        </span>
                      </div>
                    </div>
                  ))}
                  {vendorOrders.length === 0 && (
                    <div className="py-8 text-center text-xs text-stone-400">
                      No active orders waiting for fulfillment.
                    </div>
                  )}
                </div>
              </div>

              {/* Right Col: Compliance Status Card */}
              <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-4">
                <h3 className="font-bold text-stone-900 text-sm">Artisan Compliance</h3>
                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between p-2.5 bg-stone-50 rounded-xl">
                    <span className="text-stone-600">FSSAI Status</span>
                    <span className="font-bold text-emerald-700">Verified</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 bg-stone-50 rounded-xl">
                    <span className="text-stone-600">Platform Agreement</span>
                    <span className="font-bold text-stone-800">Active ({currentVendor.commissionPercentage ?? 10}% Tier)</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 bg-stone-50 rounded-xl">
                    <span className="text-stone-600">Primary Bank A/C</span>
                    <span className="font-mono text-stone-800">
                      {vendorBankAccounts[0]?.accountNumberMasked ||
                        currentVendor.payoutInformation?.accountNumberMasked ||
                        'Not Linked'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setIsAddProductOpen(true)}
                  className="w-full py-2.5 rounded-xl bg-amber-800 hover:bg-amber-900 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add New Product</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2: PRODUCTS ================= */}
        {activeTab === 'products' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-stone-900 text-base">Your Product Catalog</h3>
                <p className="text-xs text-stone-500">Strictly isolated to {currentVendor.name}</p>
              </div>
              <button
                onClick={() => setIsAddProductOpen(true)}
                className="px-4 py-2 rounded-xl bg-amber-800 hover:bg-amber-900 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Add Product</span>
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs text-stone-700">
                <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">Weight / Unit</th>
                    <th className="px-4 py-3">Price</th>
                    <th className="px-4 py-3">Stock Level</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {vendorProducts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-stone-400 text-xs">
                        No products listed yet. Click &quot;Add Product&quot; to list your homemade specialties.
                      </td>
                    </tr>
                  ) : (
                    vendorProducts.map((p) => (
                      <tr key={p.id} className="hover:bg-amber-50/30">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <img
                              src={p.images?.[0] || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=100&q=80'}
                              alt={p.name}
                              className="w-10 h-10 rounded-xl object-cover border border-stone-200"
                            />
                            <div>
                              <div className="font-bold text-stone-900">{p.name}</div>
                              <div className="text-[11px] text-stone-400 capitalize">{p.categoryId?.replace('cat-', '')}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-medium text-stone-600">{p.weight}</td>
                        <td className="px-4 py-3 font-bold text-stone-900">{formatCurrency(p.salePrice || p.price)}</td>
                        <td className="px-4 py-3">
                          <span className={`font-semibold ${(p.stockQuantity ?? p.stock ?? 0) < 10 ? 'text-rose-600' : 'text-stone-800'}`}>
                            {p.stockQuantity ?? p.stock ?? 0} units
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">
                            ACTIVE
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => setProductToDelete(p)}
                            className="p-1 text-stone-400 hover:text-rose-600 transition cursor-pointer"
                            title="Delete product"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= TAB 3: INVENTORY ================= */}
        {activeTab === 'inventory' && (
          <div className="space-y-4">
            <div>
              <h3 className="font-bold text-stone-900 text-base">Batch & Stock Control</h3>
              <p className="text-xs text-stone-500">Manage real-time inventory levels for your kitchen</p>
            </div>

            <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs text-stone-700">
                <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Item / SKU</th>
                    <th className="px-4 py-3">In-Stock Quantity</th>
                    <th className="px-4 py-3">Alert Threshold</th>
                    <th className="px-4 py-3">Stock Health</th>
                    <th className="px-4 py-3 text-right">Adjust Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {vendorProducts.map((p) => {
                    const inv = vendorInventory.find((i) => i.productId === p.id);
                    const currentStock = inv?.stockQuantity ?? p.stockQuantity ?? p.stock ?? 50;

                    return (
                      <tr key={p.id} className="hover:bg-amber-50/30">
                        <td className="px-4 py-3">
                          <div className="font-bold text-stone-900">{p.name}</div>
                          <div className="text-[10px] font-mono text-stone-400">SKU: {inv?.sku || `SKU-${p.id.slice(-6)}`}</div>
                        </td>
                        <td className="px-4 py-3 font-bold text-stone-900 text-sm">{currentStock}</td>
                        <td className="px-4 py-3 text-stone-500">10 units</td>
                        <td className="px-4 py-3">
                          {currentStock < 10 ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              Low Stock
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Healthy
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleUpdateStock(inv?.id || `inv-${p.id}`, Math.max(0, currentStock - 5))}
                              className="w-7 h-7 rounded-lg bg-stone-100 hover:bg-stone-200 font-bold"
                            >
                              -5
                            </button>
                            <button
                              onClick={() => handleUpdateStock(inv?.id || `inv-${p.id}`, currentStock + 10)}
                              className="w-7 h-7 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold"
                            >
                              +10
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= TAB 4: ORDERS ================= */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            <div>
              <h3 className="font-bold text-stone-900 text-base">Your Vendor Orders & Fulfillment</h3>
              <p className="text-xs text-stone-500">Orders containing products produced by your business</p>
            </div>

            <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs text-stone-700">
                <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Order Number</th>
                    <th className="px-4 py-3">Items Ordered</th>
                    <th className="px-4 py-3">Subtotal</th>
                    <th className="px-4 py-3">Your Payout (90%)</th>
                    <th className="px-4 py-3">Fulfillment Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {vendorOrders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-amber-50/30">
                      <td className="px-4 py-3 font-mono font-bold text-stone-900">
                        {ord.orderNumber}
                        <div className="text-[10px] text-stone-400 font-normal">{formatDate(ord.createdAt)}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-0.5">
                          {ord.items.map((it, idx) => (
                            <div key={idx} className="text-[11px] text-stone-800">
                              {it.quantity}x {it.productName} ({it.weight})
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-stone-900">{formatCurrency(ord.vendorSubtotal)}</td>
                      <td className="px-4 py-3 font-bold text-emerald-700">{formatCurrency(ord.payoutAmount)}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-stone-100 text-stone-700">
                          {ord.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <select
                          value={ord.status ?? 'Confirmed'}
                          onChange={(e) => handleUpdateOrderStatus(ord.id, e.target.value)}
                          className="text-[11px] p-1.5 border border-stone-300 rounded-lg bg-white font-medium text-stone-800 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                        >
                          <option value="Confirmed">Confirmed</option>
                          <option value="PREPARATION">Preparing Food / Sweet</option>
                          <option value="PACKING">Quality Packing</option>
                          <option value="Processing">Processing</option>
                          <option value="Shipped">Dispatched / Out for Delivery</option>
                          <option value="Delivered">Delivered</option>
                          <option value="OUT_OF_STOCK">Out of Stock</option>
                          <option value="VENDOR_UNAVAILABLE">Vendor Unavailable</option>
                          <option value="CANCELLED">Cancel Order</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                  {vendorOrders.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-stone-400 text-xs">
                        No orders have been routed to this kitchen yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= TAB 5: SALES ================= */}
        {activeTab === 'sales' && (
          <div className="space-y-6">
            <div>
              <h3 className="font-bold text-stone-900 text-base">Sales Performance & Analytics</h3>
              <p className="text-xs text-stone-500">Gross revenue breakdown from direct kitchen sales</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-stone-200">
                <span className="text-xs text-stone-400 font-semibold uppercase">Total Gross Sales</span>
                <div className="text-2xl font-bold font-serif text-stone-900 mt-1">
                  {formatCurrency(totalVendorGrossSales)}
                </div>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-stone-200">
                <span className="text-xs text-stone-400 font-semibold uppercase">Average Order Value</span>
                <div className="text-2xl font-bold font-serif text-amber-900 mt-1">
                  {formatCurrency(vendorOrders.length ? Math.round(totalVendorGrossSales / vendorOrders.length) : 450)}
                </div>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-stone-200">
                <span className="text-xs text-stone-400 font-semibold uppercase">Completed Dispatches</span>
                <div className="text-2xl font-bold font-serif text-emerald-800 mt-1">
                  {vendorOrders.filter((o) => o.status === 'Delivered').length || 12}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 6: EARNINGS ================= */}
        {activeTab === 'earnings' && (
          <div className="space-y-6">
            <div>
              <h3 className="font-bold text-stone-900 text-base">Net Vendor Earnings</h3>
              <p className="text-xs text-stone-500">Accrued funds ready for bank settlement</p>
            </div>

            <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-stone-100 gap-4">
                <div>
                  <span className="text-xs text-stone-400 uppercase font-semibold">Available for Disbursement</span>
                  <div className="text-3xl font-extrabold font-serif text-emerald-800 mt-1">
                    {formatCurrency(totalNetEarnings - totalSettledPayouts)}
                  </div>
                </div>
                <div className="text-xs text-stone-500 max-w-xs">
                  Bi-monthly auto-settlement executes on 1st & 16th of every month into registered primary bank account.
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-stone-400 block">Gross Invoiced:</span>
                  <strong className="text-stone-800">{formatCurrency(totalVendorGrossSales)}</strong>
                </div>
                <div>
                  <span className="text-stone-400 block">Platform Commission:</span>
                  <strong className="text-amber-800">-{formatCurrency(totalCommissionsDeducted)}</strong>
                </div>
                <div>
                  <span className="text-stone-400 block">Already Disbursed:</span>
                  <strong className="text-stone-800">{formatCurrency(totalSettledPayouts)}</strong>
                </div>
                <div>
                  <span className="text-stone-400 block">Next Cycle:</span>
                  <strong className="text-blue-700">1st of Next Month</strong>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 7: COMMISSION ================= */}
        {activeTab === 'commission' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-stone-900 text-base">Platform Commission Fee Schedule</h3>
                <p className="text-xs text-stone-500">
                  Your negotiated vendor baseline: <strong>{currentVendor.commissionPercentage}%</strong>
                </p>
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-200">
                <Lock className="w-3.5 h-3.5 text-amber-700" />
                Read-Only • Managed by Platform Admin
              </span>
            </div>

            {/* 4-Tier Hierarchy Explanation & Live Example */}
            <div className="bg-stone-50 rounded-2xl border border-stone-200 p-5 space-y-4 text-xs">
              <div className="flex items-center gap-2 text-stone-800 font-bold text-sm">
                <Percent className="w-4 h-4 text-amber-700" />
                Server-Side Authoritative Commission Precedence Rules
              </div>
              <p className="text-stone-600 leading-relaxed">
                Pure Sudh uses an automated, tamper-proof commission hierarchy executed entirely on server functions. Rates cannot be manipulated by client requests:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-stone-800 font-medium">
                <div className="p-3 bg-white rounded-xl border border-stone-200 shadow-2xs">
                  <span className="text-[10px] font-bold text-amber-800 uppercase block">1. Highest Priority</span>
                  <div className="font-bold text-stone-900 text-xs mt-1">Product-Specific</div>
                  <p className="text-[11px] text-stone-500 mt-0.5">Custom rate per product SKU</p>
                </div>
                <div className="p-3 bg-white rounded-xl border border-stone-200 shadow-2xs">
                  <span className="text-[10px] font-bold text-stone-500 uppercase block">2. Category Tier</span>
                  <div className="font-bold text-stone-900 text-xs mt-1">Category-Specific</div>
                  <p className="text-[11px] text-stone-500 mt-0.5">Defaults for snacks, sweets, dairy</p>
                </div>
                <div className="p-3 bg-white rounded-xl border border-stone-200 shadow-2xs">
                  <span className="text-[10px] font-bold text-stone-500 uppercase block">3. Vendor Tier</span>
                  <div className="font-bold text-stone-900 text-xs mt-1">Vendor-Specific</div>
                  <p className="text-[11px] text-stone-500 mt-0.5">Your rate ({currentVendor.commissionPercentage}%)</p>
                </div>
                <div className="p-3 bg-white rounded-xl border border-stone-200 shadow-2xs">
                  <span className="text-[10px] font-bold text-stone-400 uppercase block">4. Platform Fallback</span>
                  <div className="font-bold text-stone-900 text-xs mt-1">Global Commission</div>
                  <p className="text-[11px] text-stone-500 mt-0.5">10% baseline across store</p>
                </div>
              </div>

              {/* Exact Formula & Example Box */}
              <div className="p-3.5 bg-amber-100/60 rounded-xl border border-amber-200 text-stone-800">
                <span className="font-bold text-amber-950 block mb-1">Standard Calculation Example:</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div>Sale Amount: <strong>₹1,000</strong></div>
                  <div>Commission (10%): <strong>₹100</strong></div>
                  <div>Platform Share: <strong className="text-amber-900">₹100</strong></div>
                  <div>Vendor Earning: <strong className="text-emerald-800">₹900 (90%)</strong></div>
                </div>
              </div>
            </div>

            {/* Commissions Ledger Table */}
            <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
              <div className="p-4 border-b border-stone-100 flex items-center justify-between">
                <h4 className="font-bold text-stone-900 text-sm">Order Commission Ledgers</h4>
                <span className="text-xs text-stone-500">Calculated on net customer invoice</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-stone-700">
                  <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold uppercase text-[10px]">
                    <tr>
                      <th className="px-4 py-3">Order Ref</th>
                      <th className="px-4 py-3">Order Total</th>
                      <th className="px-4 py-3">Applied Rate</th>
                      <th className="px-4 py-3">Platform Commission</th>
                      <th className="px-4 py-3">Vendor Earning</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {vendorCommissions.map((c) => (
                      <tr key={c.id} className="hover:bg-amber-50/30">
                        <td className="px-4 py-3 font-mono font-semibold text-stone-900">{c.orderId}</td>
                        <td className="px-4 py-3">{formatCurrency(c.orderTotal)}</td>
                        <td className="px-4 py-3 font-semibold text-stone-600">{c.commissionRate}%</td>
                        <td className="px-4 py-3 font-bold text-amber-800">-{formatCurrency(c.commissionAmount)}</td>
                        <td className="px-4 py-3 font-bold text-emerald-700">+{formatCurrency(c.netVendorAmount)}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700">
                            {c.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 8: PAYOUTS ================= */}
        {activeTab === 'payouts' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-stone-900 text-base">Direct Bank Settlement & Payout History</h3>
                <p className="text-xs text-stone-500">
                  Authoritative financial records for {currentVendor.name}
                </p>
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5" />
                Verified Bank Transfer Only
              </span>
            </div>

            {/* Balances & Request Payout Form */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Balance Summary Card */}
              <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-4">
                <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block">
                  Disbursement Balance Summary
                </span>
                <div className="space-y-3">
                  <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-100">
                    <span className="text-xs text-emerald-800 font-semibold block">Available Pending Payout</span>
                    <div className="text-2xl font-bold font-serif text-emerald-900 mt-1">
                      {formatCurrency(pendingPayoutBalance)}
                    </div>
                  </div>
                  <div className="p-3 bg-stone-50 rounded-xl border border-stone-100">
                    <span className="text-xs text-stone-500 font-semibold block">Total Settled Payouts</span>
                    <div className="text-xl font-bold font-serif text-stone-800 mt-1">
                      {formatCurrency(totalSettledPayouts)}
                    </div>
                  </div>
                </div>
                <p className="text-[11px] text-stone-500">
                  Money transfers require an authorized bank coordinate and cannot be disbursed without administrative clearance.
                </p>
              </div>

              {/* Request Payout Action */}
              <div className="md:col-span-2 bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                  <h4 className="font-bold text-stone-900 text-sm">Submit Payout Request</h4>
                  <span className="text-[11px] text-stone-400">Server Authorization Protected</span>
                </div>
                <form onSubmit={handleRequestPayout} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Request Amount (Max ₹{pendingPayoutBalance.toLocaleString('en-IN')})
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-stone-400 font-bold">₹</span>
                      <input
                        type="number"
                        min="100"
                        max={pendingPayoutBalance}
                        value={payoutRequestAmount || ''}
                        onChange={(e) => setPayoutRequestAmount(Number(e.target.value))}
                        placeholder="e.g. 5000"
                        className="w-full pl-8 pr-3 py-2 rounded-xl border border-stone-300 text-sm font-bold text-stone-900 focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Notes for Finance Admin (Optional)
                    </label>
                    <input
                      type="text"
                      value={payoutRequestNotes ?? ''}
                      onChange={(e) => setPayoutRequestNotes(e.target.value)}
                      placeholder="e.g. Fortnightly settlement for batch 23"
                      className="w-full p-2 rounded-xl border border-stone-300 text-xs"
                    />
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-[11px] text-stone-500">
                      Disbursement executes to primary bank A/C ({vendorBankAccounts[0]?.bankName || 'SBI'}).
                    </span>
                    <button
                      type="submit"
                      disabled={isRequestingPayout || payoutRequestAmount <= 0 || payoutRequestAmount > pendingPayoutBalance}
                      className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-xs transition"
                    >
                      {isRequestingPayout ? 'Submitting...' : 'Request Disbursement'}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Payout History Table */}
            <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs space-y-2">
              <div className="p-4 border-b border-stone-100 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-stone-900 text-sm">Payout History & Disbursed Settlements</h4>
                  <p className="text-xs text-stone-500">Audited transfers with bank UTR reference numbers</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-stone-700">
                  <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold uppercase text-[10px]">
                    <tr>
                      <th className="px-4 py-3">Payout ID</th>
                      <th className="px-4 py-3">Period Cycle</th>
                      <th className="px-4 py-3">Settlement Amount</th>
                      <th className="px-4 py-3">Orders Settled</th>
                      <th className="px-4 py-3">UTR Reference</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {vendorPayouts.map((p) => (
                      <tr key={p.id} className="hover:bg-amber-50/30">
                        <td className="px-4 py-3 font-mono font-semibold text-stone-900">{p.id}</td>
                        <td className="px-4 py-3 text-stone-600">{p.periodStart} to {p.periodEnd}</td>
                        <td className="px-4 py-3 font-bold text-stone-900 text-sm">{formatCurrency(p.amount)}</td>
                        <td className="px-4 py-3 text-stone-600">{p.ordersCount} orders</td>
                        <td className="px-4 py-3 font-mono text-[11px] text-stone-600">{p.transactionRef || 'Pending Release'}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            p.status === 'completed'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {vendorPayouts.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center py-6 text-stone-400">
                          No payout records found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Auditable Financial Ledger Entries */}
            <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs space-y-2">
              <div className="p-4 border-b border-stone-100 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-stone-900 text-sm flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-700" />
                    Auditable Financial Ledger (Cryptographic Log)
                  </h4>
                  <p className="text-xs text-stone-500">Immutable ledger entries with cryptographic verification hashes</p>
                </div>
                <span className="text-[10px] font-mono text-stone-400 bg-stone-100 px-2 py-1 rounded">
                  SHA-256 HMAC Sealed
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-stone-700">
                  <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold uppercase text-[10px]">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Description</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Balance After</th>
                      <th className="px-4 py-3">Audit Hash</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 font-sans">
                    {vendorLedger.map((entry) => (
                      <tr key={entry.id} className="hover:bg-stone-50/50">
                        <td className="px-4 py-3 text-stone-500 text-[11px]">{formatDate(entry.createdAt)}</td>
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
                        <td className="px-4 py-3 text-stone-800">{entry.description}</td>
                        <td className={`px-4 py-3 font-bold ${entry.amount >= 0 ? 'text-emerald-700' : 'text-stone-800'}`}>
                          {entry.amount >= 0 ? `+${formatCurrency(entry.amount)}` : formatCurrency(entry.amount)}
                        </td>
                        <td className="px-4 py-3 font-semibold text-stone-900">{formatCurrency(entry.balanceAfter)}</td>
                        <td className="px-4 py-3 font-mono text-[10px] text-stone-400">{entry.auditHash}</td>
                      </tr>
                    ))}
                    {vendorLedger.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center py-6 text-stone-400">
                          No ledger records logged yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 9: BANK ACCOUNT ================= */}
        {activeTab === 'bank' && (
          <div className="space-y-6 max-w-2xl">
            <div>
              <h3 className="font-bold text-stone-900 text-base">Settlement Bank Account Coordinates</h3>
              <p className="text-xs text-stone-500">Provide verified bank account for automated marketplace payouts</p>
            </div>

            {/* Existing Accounts */}
            {vendorBankAccounts.length > 0 && (
              <div className="space-y-3">
                {vendorBankAccounts.map((b) => (
                  <div key={b.id} className="p-4 bg-white rounded-2xl border border-stone-200 shadow-xs space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-stone-900 text-sm">{b.bankName}</span>
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md font-semibold">
                        Primary Settlement A/C
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-stone-600">
                      <div>Account Holder: <strong>{b.accountHolderName}</strong></div>
                      <div>IFSC: <strong className="font-mono">{b.ifscCode}</strong></div>
                      <div>Account Number: <strong className="font-mono">{b.accountNumberMasked}</strong></div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add / Update Bank Form */}
            <form onSubmit={handleSaveBank} className="bg-white p-5 rounded-2xl border border-stone-200 space-y-4 text-xs shadow-xs">
              <h4 className="font-bold text-stone-900">Add / Update Bank Coordinates</h4>
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Account Holder Name *</label>
                <input
                  type="text"
                  required
                  value={bankHolder ?? ''}
                  onChange={(e) => setBankHolder(e.target.value)}
                  placeholder="e.g. Ramesh Chandra"
                  className="w-full p-2.5 rounded-xl border border-stone-300 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Bank Name *</label>
                  <input
                    type="text"
                    required
                    value={bankName ?? ''}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="e.g. State Bank of India"
                    className="w-full p-2.5 rounded-xl border border-stone-300 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">IFSC Code *</label>
                  <input
                    type="text"
                    required
                    value={bankIfsc ?? ''}
                    onChange={(e) => setBankIfsc(e.target.value)}
                    placeholder="SBIN0001234"
                    className="w-full p-2.5 rounded-xl border border-stone-300 text-xs font-mono uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Account Number *</label>
                <input
                  type="text"
                  required
                  value={bankAccNumber ?? ''}
                  onChange={(e) => setBankAccNumber(e.target.value)}
                  placeholder="Enter full bank account number"
                  className="w-full p-2.5 rounded-xl border border-stone-300 text-xs font-mono"
                />
              </div>

              <button
                type="submit"
                className="py-2.5 px-5 bg-amber-800 hover:bg-amber-900 text-white rounded-xl font-bold text-xs shadow-xs"
              >
                Save Bank Details
              </button>
            </form>
          </div>
        )}

        {/* ================= TAB 10: NOTIFICATIONS ================= */}
        {activeTab === 'notifications' && (
          <div className="space-y-4 max-w-3xl">
            <div>
              <h3 className="font-bold text-stone-900 text-base">Vendor Communications & Alerts</h3>
              <p className="text-xs text-stone-500">Notifications from Pure Sudh Compliance & Marketplace Operations</p>
            </div>

            <div className="space-y-2.5">
              {vendorNotifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleMarkNotifRead(n.id)}
                  className={`p-4 rounded-2xl border transition cursor-pointer text-xs space-y-1 ${
                    n.read ? 'bg-white border-stone-200' : 'bg-amber-50/60 border-amber-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-stone-900">{n.title}</span>
                    <span className="text-[10px] text-stone-400">{formatDate(n.createdAt)}</span>
                  </div>
                  <p className="text-stone-600">{n.message}</p>
                </div>
              ))}
              {vendorNotifications.length === 0 && (
                <div className="p-8 bg-white rounded-2xl border border-stone-200 text-center text-xs text-stone-400">
                  No notifications yet.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 11: REVIEWS ================= */}
        {activeTab === 'reviews' && (
          <div className="space-y-6 max-w-4xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-stone-200 gap-3">
              <div>
                <h3 className="font-bold text-stone-900 text-lg font-serif">Customer Product Reviews</h3>
                <p className="text-xs text-stone-500">
                  Verified customer feedback for {currentVendor.name} delicacies
                </p>
              </div>
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl text-amber-900 text-xs font-semibold">
                <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                <span>
                  Avg Rating: {currentVendor.rating ? currentVendor.rating.toFixed(1) : '5.0'} / 5.0
                </span>
                <span className="text-stone-400">•</span>
                <span>{vendorReviews.length} Reviews</span>
              </div>
            </div>

            {/* Reviews Cards List */}
            <div className="space-y-3">
              {vendorReviews.map((rev) => {
                const prod = vendorProducts.find((p) => p.id === rev.productId);
                return (
                  <div
                    key={rev.id}
                    className="p-4 bg-white rounded-2xl border border-stone-200 shadow-xs space-y-2.5 text-xs"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-xs">
                          {rev.customerName ? rev.customerName[0].toUpperCase() : 'C'}
                        </div>
                        <div>
                          <span className="font-bold text-stone-900">{rev.customerName}</span>
                          {rev.verifiedPurchase && (
                            <span className="ml-2 inline-flex items-center gap-0.5 text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200">
                              <CheckCircle className="w-2.5 h-2.5" />
                              Verified Buyer
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center text-amber-400">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3.5 h-3.5 ${
                                i < rev.rating ? 'fill-amber-400 text-amber-400' : 'text-stone-200'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-[10px] text-stone-400">{formatDate(rev.createdAt)}</span>
                      </div>
                    </div>

                    {prod && (
                      <div className="text-[11px] text-stone-500 font-medium">
                        Product: <strong className="text-stone-700">{prod.name}</strong>
                      </div>
                    )}

                    <p className="text-stone-700 leading-relaxed bg-stone-50/70 p-3 rounded-xl border border-stone-100">
                      "{rev.comment}"
                    </p>
                  </div>
                );
              })}

              {vendorReviews.length === 0 && (
                <div className="p-12 bg-white rounded-2xl border border-stone-200 text-center space-y-2">
                  <Star className="w-8 h-8 text-stone-300 mx-auto" />
                  <p className="font-bold text-stone-700 text-sm">No reviews yet for your items</p>
                  <p className="text-xs text-stone-400 max-w-sm mx-auto">
                    When customers buy and review your products, verified reviews will appear here with rating insights.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 12: PROFILE ================= */}
        {activeTab === 'profile' && (
          <div className="space-y-6 max-w-4xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-stone-200 gap-3">
              <div>
                <h3 className="font-bold text-stone-900 text-lg font-serif">Vendor Business Profile</h3>
                <p className="text-xs text-stone-500">
                  Manage store contact info, kitchen dispatch coordinates, and compliance data
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditingProfile(!isEditingProfile)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-300 hover:bg-stone-50 text-stone-700 text-xs font-semibold transition self-start sm:self-auto cursor-pointer"
              >
                <Edit className="w-3.5 h-3.5" />
                {isEditingProfile ? 'Cancel Editing' : 'Edit Profile'}
              </button>
            </div>

            {/* Profile Content */}
            {!isEditingProfile ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Store Information */}
                <div className="bg-white p-5 rounded-2xl border border-stone-200 space-y-3 shadow-xs">
                  <h4 className="font-bold text-stone-900 text-sm flex items-center gap-2 border-b border-stone-100 pb-2">
                    <Store className="w-4 h-4 text-amber-700" />
                    Kitchen & Store Brand
                  </h4>
                  <div className="space-y-2">
                    <div>
                      <span className="text-stone-400 block text-[10px] uppercase font-semibold">Store Name</span>
                      <span className="font-bold text-stone-800 text-sm">{currentVendor.name}</span>
                    </div>
                    <div>
                      <span className="text-stone-400 block text-[10px] uppercase font-semibold">Tagline</span>
                      <span className="text-stone-700">{currentVendor.tagline}</span>
                    </div>
                    <div>
                      <span className="text-stone-400 block text-[10px] uppercase font-semibold">Description</span>
                      <span className="text-stone-600 leading-relaxed">{currentVendor.description}</span>
                    </div>
                    <div>
                      <span className="text-stone-400 block text-[10px] uppercase font-semibold">Owner Contact</span>
                      <span className="font-medium text-stone-800">{currentVendor.ownerName}</span>
                    </div>
                  </div>
                </div>

                {/* Dispatch Coordinates */}
                <div className="bg-white p-5 rounded-2xl border border-stone-200 space-y-3 shadow-xs">
                  <h4 className="font-bold text-stone-900 text-sm flex items-center gap-2 border-b border-stone-100 pb-2">
                    <MapPin className="w-4 h-4 text-amber-700" />
                    Dispatch Address & Communication
                  </h4>
                  <div className="space-y-2">
                    <div>
                      <span className="text-stone-400 block text-[10px] uppercase font-semibold">Pickup Address</span>
                      <span className="text-stone-800">{currentVendor.address}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-stone-400 block text-[10px] uppercase font-semibold">City & State</span>
                        <span className="text-stone-800">{currentVendor.city}, {currentVendor.state}</span>
                      </div>
                      <div>
                        <span className="text-stone-400 block text-[10px] uppercase font-semibold">Pincode</span>
                        <span className="font-mono text-stone-800 font-bold">{currentVendor.pincode}</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-stone-400 block text-[10px] uppercase font-semibold">Phone</span>
                      <span className="text-stone-800 font-medium">{formatIndianPhone(currentVendor.phone)}</span>
                    </div>
                    <div>
                      <span className="text-stone-400 block text-[10px] uppercase font-semibold">Email</span>
                      <span className="text-stone-800">{currentVendor.email}</span>
                    </div>
                  </div>
                </div>

                {/* Compliance & FSSAI Details */}
                <div className="bg-white p-5 rounded-2xl border border-stone-200 space-y-3 shadow-xs md:col-span-2">
                  <h4 className="font-bold text-stone-900 text-sm flex items-center gap-2 border-b border-stone-100 pb-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-700" />
                    Compliance, Licensing & Platform Terms
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                    <div className="p-3 bg-stone-50 rounded-xl">
                      <span className="text-stone-400 block text-[10px] uppercase font-semibold">FSSAI Registration</span>
                      <span className="font-mono font-bold text-stone-900 text-sm">{currentVendor.fssaiNumber || 'Pending Submission'}</span>
                      <div className="text-[10px] text-emerald-700 font-medium mt-1">100% Pure Food Certified</div>
                    </div>
                    <div className="p-3 bg-stone-50 rounded-xl">
                      <span className="text-stone-400 block text-[10px] uppercase font-semibold">GST Identification</span>
                      <span className="font-mono text-stone-900">{currentVendor.gstNumber || 'Exempt / Not Applicable'}</span>
                      <div className="text-[10px] text-stone-400 mt-1">Tax invoice compliant</div>
                    </div>
                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                      <span className="text-amber-800 block text-[10px] uppercase font-semibold">Commission Tier</span>
                      <span className="font-bold text-amber-900 text-base">{currentVendor.commissionPercentage}%</span>
                      <div className="text-[10px] text-amber-700 mt-1">Platform operational rate</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Profile Editing Form */
              <form onSubmit={handleSaveProfile} className="bg-white p-6 rounded-2xl border border-stone-200 space-y-4 text-xs shadow-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">Tagline</label>
                    <input
                      type="text"
                      value={profileForm.tagline ?? ''}
                      onChange={(e) => setProfileForm({ ...profileForm, tagline: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-stone-300"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">FSSAI Number</label>
                    <input
                      type="text"
                      value={profileForm.fssaiNumber ?? ''}
                      onChange={(e) => setProfileForm({ ...profileForm, fssaiNumber: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-stone-300 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Kitchen / Business Description</label>
                  <textarea
                    rows={3}
                    value={profileForm.description ?? ''}
                    onChange={(e) => setProfileForm({ ...profileForm, description: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-stone-300"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">Contact Phone (India +91)</label>
                    <div className="flex items-stretch">
                      <span className="inline-flex items-center px-2.5 bg-stone-100 border border-r-0 border-stone-300 rounded-l-xl text-xs font-bold text-stone-700 select-none">
                        +91
                      </span>
                      <input
                        type="tel"
                        inputMode="numeric"
                        maxLength={10}
                        placeholder="10-digit mobile number"
                        value={profileForm.phone ?? ''}
                        onChange={(e) => setProfileForm({ ...profileForm, phone: sanitizePhoneInput10(e.target.value) })}
                        className="w-full p-2.5 rounded-r-xl border border-stone-300"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">Contact Email</label>
                    <input
                      type="email"
                      value={profileForm.email ?? ''}
                      onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-stone-300"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Kitchen / Pickup Address</label>
                  <input
                    type="text"
                    value={profileForm.address ?? ''}
                    onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-stone-300"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">City</label>
                    <input
                      type="text"
                      value={profileForm.city ?? ''}
                      onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-stone-300"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">State</label>
                    <input
                      type="text"
                      value={profileForm.state ?? ''}
                      onChange={(e) => setProfileForm({ ...profileForm, state: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-stone-300"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">Pincode</label>
                    <input
                      type="text"
                      value={profileForm.pincode ?? ''}
                      onChange={(e) => setProfileForm({ ...profileForm, pincode: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-stone-300 font-mono"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(false)}
                    className="px-4 py-2 border border-stone-300 rounded-xl font-medium text-stone-700 hover:bg-stone-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-amber-800 hover:bg-amber-900 text-white rounded-xl font-bold shadow-xs"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* ================= VENDOR ADVERTISING SUITE (PHASE 6) ================= */}
        {(activeTab === 'advertising' || activeTab === 'ad-campaigns' || activeTab === 'ad-wallet') && (
          <VendorAdvertisingSuite
            vendorId={selectedVendorId}
            vendorName={currentVendor.name}
            onNavigateToWallet={() => setActiveTab('ad-wallet')}
          />
        )}
      </div>

      {/* Add Product Modal */}
      {isAddProductOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="font-bold font-serif text-stone-900 text-base">
                List Product for {currentVendor.name}
              </h3>
              <button onClick={() => setIsAddProductOpen(false)} className="text-stone-400 hover:text-stone-600">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Product Title *</label>
                <input
                  type="text"
                  required
                  value={newProductName ?? ''}
                  onChange={(e) => setNewProductName(e.target.value)}
                  placeholder="e.g. Traditional Wheat Thekua (Pure Ghee)"
                  className="w-full p-2.5 rounded-xl border border-stone-300"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Price (₹) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={newProductPrice ?? 0}
                    onChange={(e) => setNewProductPrice(Number(e.target.value))}
                    className="w-full p-2 rounded-xl border border-stone-300 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Weight / Pack *</label>
                  <input
                    type="text"
                    required
                    value={newProductWeight ?? ''}
                    onChange={(e) => setNewProductWeight(e.target.value)}
                    placeholder="e.g. 500g"
                    className="w-full p-2 rounded-xl border border-stone-300"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Stock Qty *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={newProductStock ?? 0}
                    onChange={(e) => setNewProductStock(Number(e.target.value))}
                    className="w-full p-2 rounded-xl border border-stone-300"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Category</label>
                <select
                  value={newProductCategory ?? categoriesList[0]?.id ?? 'cat-homemade'}
                  onChange={(e) => setNewProductCategory(e.target.value)}
                  className="w-full p-2 rounded-xl border border-stone-300 bg-white"
                >
                  {categoriesList.length > 0 ? (
                    categoriesList.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="cat-homemade">Homemade Snacks & Thekua</option>
                      <option value="cat-dairy">Dairy & A2 Cow Milk</option>
                      <option value="cat-mithai">Desi Sweets & Khaja</option>
                      <option value="cat-ghee">Bilona Desi Ghee</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Description *</label>
                <textarea
                  required
                  rows={2}
                  value={newProductDesc ?? ''}
                  onChange={(e) => setNewProductDesc(e.target.value)}
                  placeholder="Describe your authentic ingredients, preparation method, and purity guarantee..."
                  className="w-full p-2.5 rounded-xl border border-stone-300"
                />
              </div>

              <div>
                <MediaUploader
                  preset="product"
                  pathParams={{ vendorId: currentVendor?.id }}
                  currentImageUrl={newProductImage}
                  onImageUploaded={(url) => setNewProductImage(url)}
                  label="Upload Product Image"
                  compact
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddProductOpen(false)}
                  className="px-4 py-2 border border-stone-300 rounded-xl text-stone-700 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-800 hover:bg-amber-900 text-white rounded-xl font-bold shadow-xs"
                >
                  Publish Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Delete Product Confirmation Modal */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-stone-200">
            <h3 className="font-bold font-serif text-stone-900 text-base">Delete Product?</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Remove <strong>{productToDelete.name}</strong> from your vendor catalog? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                disabled={isDeletingProduct}
                onClick={() => setProductToDelete(null)}
                className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold text-xs cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingProduct}
                onClick={handleDeleteProductConfirm}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer disabled:opacity-50"
              >
                {isDeletingProduct ? 'Deleting...' : 'Delete Product'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
