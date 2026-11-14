import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Search,
  UserCheck,
  UserX,
  ShieldAlert,
  Eye,
  ShoppingBag,
  MapPin,
  Calendar,
  Mail,
  Phone,
  RefreshCw,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { CustomerSummary, Order } from '../../../types';
import { fetchCustomers, updateCustomerStatus } from '../../../firebase/services';
import { auditAndPurgeTemporaryAccounts } from '../../../services/accountAuditService';
import { isTemporaryEmail, isTemporaryOrFakePhone } from '../../../validation';

interface AdminCustomersTabProps {
  orders: Order[];
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onViewCustomerOrders?: (customerEmailOrId: string) => void;
}

export const AdminCustomersTab: React.FC<AdminCustomersTabProps> = ({
  orders,
  showToast,
  onViewCustomerOrders,
}) => {
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended' | 'blocked'>('all');

  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSummary | null>(null);

  const [isPurging, setIsPurging] = useState(false);

  const loadCustomerData = async () => {
    setLoading(true);
    try {
      const data = await fetchCustomers();
      setCustomers(data);
    } catch (err) {
      console.error('Error fetching customers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePurgeTemporaryAccounts = async () => {
    if (!window.confirm('Scan database now and permanently remove any accounts created with temporary/disposable emails or fake phone numbers?')) {
      return;
    }
    setIsPurging(true);
    try {
      const result = await auditAndPurgeTemporaryAccounts();
      if (result.totalPurged > 0) {
        showToast(
          `Security Audit Complete: Successfully purged ${result.totalPurged} temporary/fake account(s).`,
          'success'
        );
      } else {
        showToast(
          `Security Audit Complete: All ${result.totalAudited} audited accounts are genuine and verified.`,
          'success'
        );
      }
      await loadCustomerData();
    } catch (err: any) {
      showToast(`Error auditing accounts: ${err.message || 'Audit failed'}`, 'error');
    } finally {
      setIsPurging(false);
    }
  };

  useEffect(() => {
    loadCustomerData();
  }, []);

  const handleUpdateStatus = async (
    customerId: string,
    status: 'active' | 'suspended' | 'blocked'
  ) => {
    await updateCustomerStatus(customerId, status);
    setCustomers((prev) =>
      prev.map((c) => (c.id === customerId || c.uid === customerId ? { ...c, status } : c))
    );
    if (selectedCustomer && (selectedCustomer.id === customerId || selectedCustomer.uid === customerId)) {
      setSelectedCustomer((prev) => (prev ? { ...prev, status } : null));
    }
    showToast(`Customer status updated to ${status}`, 'info');
  };

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        c.displayName?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phone?.includes(q);

      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [customers, searchQuery, statusFilter]);

  const customerOrders = useMemo(() => {
    if (!selectedCustomer) return [];
    return orders.filter(
      (o) =>
        o.customerId === selectedCustomer.id ||
        o.customerId === selectedCustomer.uid ||
        o.customerEmail?.toLowerCase() === selectedCustomer.email?.toLowerCase()
    );
  }, [orders, selectedCustomer]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
            Registered Customers
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-900 font-semibold border border-purple-200">
              {filteredCustomers.length} accounts
            </span>
          </h2>
          <p className="text-sm text-stone-500 mt-0.5">
            Customer directories, addresses on file, total lifetime value, and access control
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePurgeTemporaryAccounts}
            disabled={isPurging || loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors border border-rose-200 cursor-pointer disabled:opacity-50"
            title="Scan database and remove any temporary email accounts or dummy phone numbers"
          >
            <ShieldCheck className={`w-3.5 h-3.5 text-rose-600 ${isPurging ? 'animate-spin' : ''}`} />
            <span>{isPurging ? 'Purging Flagged Accounts...' : 'Purge Fake/Temp Accounts'}</span>
          </button>
          <button
            onClick={loadCustomerData}
            disabled={loading || isPurging}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors border border-stone-300 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Customers
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-stone-200/80 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-stone-400" />
            <input
              type="text"
              placeholder="Search by customer name, email, or phone number..."
              value={searchQuery ?? ''}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-stone-50 rounded-lg border border-stone-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
            />
          </div>

          <div>
            <select
              value={statusFilter ?? 'all'}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-3 py-2 text-xs bg-stone-50 rounded-lg border border-stone-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 text-stone-700"
            >
              <option value="all">All Account Statuses</option>
              <option value="active">Active Accounts</option>
              <option value="suspended">Suspended</option>
              <option value="blocked">Blocked</option>
            </select>
          </div>
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider bg-stone-50/80 border-b border-stone-200">
              <tr>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-3">Contact</th>
                <th className="py-3 px-3">Orders Placed</th>
                <th className="py-3 px-3">Lifetime Value</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-stone-400">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-40 text-stone-400" />
                    No customers found matching your search.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((cust) => {
                  return (
                    <tr key={cust.id} className="hover:bg-amber-50/20 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-purple-100 text-purple-800 font-bold flex items-center justify-center text-xs shrink-0">
                            {cust.displayName?.charAt(0) || 'C'}
                          </div>
                          <div>
                            <div className="font-bold text-stone-900">{cust.displayName}</div>
                            <div className="text-[11px] text-stone-400">
                              Joined{' '}
                              {cust.createdAt
                                ? new Date(cust.createdAt).toLocaleDateString('en-IN')
                                : 'Recent'}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="text-stone-800 font-medium">{cust.email}</div>
                        <div className="text-[11px] text-stone-500">{cust.phone || 'No phone'}</div>
                      </td>

                      <td className="py-3 px-3">
                        <span className="font-bold text-stone-900">{cust.totalOrders || 0}</span> orders
                      </td>

                      <td className="py-3 px-3 font-bold text-stone-900 text-sm">
                        ₹{(cust.totalSpent || 0).toLocaleString('en-IN')}
                      </td>

                      <td className="py-3 px-3">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                            cust.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : cust.status === 'suspended'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-rose-50 text-rose-800 border-rose-200'
                          }`}
                        >
                          {cust.status || 'active'}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setSelectedCustomer(cust)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-purple-800 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors border border-purple-200"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View Profile
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Profile Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 border border-stone-200 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex items-start justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-800 text-lg font-bold flex items-center justify-center">
                  {selectedCustomer.displayName?.charAt(0) || 'C'}
                </div>
                <div>
                  <h3 className="text-base font-bold text-stone-900">{selectedCustomer.displayName}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className={`inline-block px-2 py-0.2 rounded-full text-[10px] font-bold border ${
                        selectedCustomer.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-rose-50 text-rose-800 border-rose-200'
                      }`}
                    >
                      {selectedCustomer.status || 'active'}
                    </span>
                    <span className="text-stone-400">UID: {selectedCustomer.id}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="text-stone-400 hover:text-stone-700 text-xl font-bold leading-none p-1"
              >
                ×
              </button>
            </div>

            {/* Profile Info Grid */}
            <div className="grid grid-cols-2 gap-3 p-3 bg-stone-50 rounded-xl border border-stone-200">
              <div>
                <span className="text-[11px] text-stone-500 block">Email Address:</span>
                <span className="font-semibold text-stone-900">{selectedCustomer.email}</span>
              </div>
              <div>
                <span className="text-[11px] text-stone-500 block">Phone Number:</span>
                <span className="font-semibold text-stone-900">
                  {selectedCustomer.phone || 'Not provided'}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-stone-500 block">Lifetime Orders:</span>
                <span className="font-bold text-stone-900">
                  {customerOrders.length || selectedCustomer.totalOrders} orders
                </span>
              </div>
              <div>
                <span className="text-[11px] text-stone-500 block">Total Revenue:</span>
                <span className="font-bold text-emerald-700">
                  ₹{selectedCustomer.totalSpent.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Addresses on File */}
            <div className="space-y-2">
              <h4 className="font-bold text-stone-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-amber-700" />
                Delivery Addresses on File
              </h4>
              {selectedCustomer.addresses && selectedCustomer.addresses.length > 0 ? (
                <div className="space-y-2">
                  {selectedCustomer.addresses.map((addr, i) => (
                    <div
                      key={i}
                      className="p-3 bg-white rounded-xl border border-stone-200 text-stone-700"
                    >
                      <div className="font-semibold text-stone-900">{addr.name} ({addr.phone})</div>
                      <div>{addr.addressLine}</div>
                      <div>
                        {addr.city}, {addr.state} - <span className="font-bold">{addr.pincode}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-stone-400 italic">No custom addresses saved yet.</p>
              )}
            </div>

            {/* Orders Summary */}
            <div className="space-y-2">
              <h4 className="font-bold text-stone-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <ShoppingBag className="w-3.5 h-3.5 text-amber-700" />
                Order History ({customerOrders.length})
              </h4>
              {customerOrders.length > 0 ? (
                <div className="border border-stone-200 rounded-xl divide-y divide-stone-100 max-h-48 overflow-y-auto">
                  {customerOrders.map((ord) => (
                    <div key={ord.id} className="p-2.5 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-stone-900">#{ord.orderNumber}</div>
                        <div className="text-[10px] text-stone-400">
                          {new Date(ord.createdAt).toLocaleDateString('en-IN')} • {ord.items?.length || 0} items
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-stone-900">₹{ord.total}</div>
                        <span className="text-[10px] font-semibold text-amber-800">{ord.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-stone-400 italic">No past orders in queue for this profile.</p>
              )}
            </div>

            {/* Status Control */}
            <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
              <span className="font-semibold text-stone-700">Account Access Control:</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleUpdateStatus(selectedCustomer.id, 'active')}
                  className={`px-3 py-1 rounded-lg font-semibold border ${
                    selectedCustomer.status === 'active'
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-stone-100 text-stone-700 border-stone-200 hover:bg-emerald-50'
                  }`}
                >
                  Active
                </button>
                <button
                  onClick={() => handleUpdateStatus(selectedCustomer.id, 'suspended')}
                  className={`px-3 py-1 rounded-lg font-semibold border ${
                    selectedCustomer.status === 'suspended'
                      ? 'bg-amber-600 text-white border-amber-600'
                      : 'bg-stone-100 text-stone-700 border-stone-200 hover:bg-amber-50'
                  }`}
                >
                  Suspend
                </button>
                <button
                  onClick={() => handleUpdateStatus(selectedCustomer.id, 'blocked')}
                  className={`px-3 py-1 rounded-lg font-semibold border ${
                    selectedCustomer.status === 'blocked'
                      ? 'bg-rose-600 text-white border-rose-600'
                      : 'bg-stone-100 text-stone-700 border-stone-200 hover:bg-rose-50'
                  }`}
                >
                  Block
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
