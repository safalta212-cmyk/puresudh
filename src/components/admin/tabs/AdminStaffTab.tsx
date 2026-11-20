import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Plus,
  Edit2,
  Trash2,
  User,
  Mail,
  Phone,
  CheckCircle2,
  XCircle,
  Key,
  RefreshCw,
} from 'lucide-react';
import { StaffMember } from '../../../types';
import {
  fetchStaffMembers,
  saveStaffMember,
  deleteStaffMember,
  toggleStaffStatus,
} from '../../../firebase/services';
import { isTemporaryEmail } from '../../../validation';
import { formatFirestorePermissionMessage } from '../../../firebase/config';

interface AdminStaffTabProps {
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const AdminStaffTab: React.FC<AdminStaffTabProps> = ({ showToast }) => {
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [staffToDelete, setStaffToDelete] = useState<StaffMember | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'staff' as StaffMember['role'],
    department: 'Fulfillment & Logistics',
    permissions: ['orders:read', 'orders:write'] as string[],
    active: true,
  });

  const availablePermissions = [
    { key: 'orders:read', label: 'View Orders' },
    { key: 'orders:write', label: 'Update Order Status' },
    { key: 'products:read', label: 'View Catalog' },
    { key: 'products:write', label: 'Edit Products & Stock' },
    { key: 'coupons:manage', label: 'Manage Coupons & Offers' },
    { key: 'reviews:moderate', label: 'Moderate Reviews' },
    { key: 'reports:view', label: 'View Financial Reports' },
    { key: 'settings:manage', label: 'Store Settings Access' },
  ];

  const loadStaff = async () => {
    setLoading(true);
    try {
      const data = await fetchStaffMembers();
      setStaffList(data);
    } catch (err) {
      console.error('Error fetching staff:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStaff();
  }, []);

  const handleOpenAdd = () => {
    setEditingStaff(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      role: 'staff',
      department: 'Fulfillment & Logistics',
      permissions: ['orders:read', 'orders:write'],
      active: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (s: StaffMember) => {
    setEditingStaff(s);
    setFormData({
      name: s.name,
      email: s.email,
      phone: s.phone || '',
      role: s.role,
      department: s.department || 'Operations',
      permissions: s.permissions || ['orders:read'],
      active: s.active,
    });
    setIsModalOpen(true);
  };

  const handleTogglePermission = (permKey: string) => {
    setFormData((prev) => {
      const perms = prev.permissions.includes(permKey)
        ? prev.permissions.filter((p) => p !== permKey)
        : [...prev.permissions, permKey];
      return { ...prev, permissions: perms };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) {
      showToast('Name and email are required', 'error');
      return;
    }

    const emailCheck = isTemporaryEmail(formData.email);
    if (emailCheck.isTemporary) {
      showToast(emailCheck.reason || 'Please enter a valid work email address', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const sId = editingStaff?.id || `stf-${Date.now()}`;
      const staffToSave: StaffMember = {
        id: sId,
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim() || undefined,
        role: formData.role,
        department: formData.department.trim(),
        permissions: formData.permissions,
        active: formData.active,
        createdAt: editingStaff?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await saveStaffMember(staffToSave);
      await loadStaff();
      showToast(`Staff member "${staffToSave.name}" saved!`, 'success');
      setIsModalOpen(false);
    } catch (err: any) {
      showToast(formatFirestorePermissionMessage(err, 'Failed to save staff member'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (s: StaffMember) => {
    if (togglingId === s.id) return;
    setTogglingId(s.id);
    try {
      await toggleStaffStatus(s.id, !s.active);
      setStaffList((prev) =>
        prev.map((item) => (item.id === s.id ? { ...item, active: !item.active } : item))
      );
      showToast(`Staff member "${s.name}" is now ${!s.active ? 'Active' : 'Inactive'}`, 'info');
    } catch (err: any) {
      showToast(formatFirestorePermissionMessage(err, 'Failed to update staff status'), 'error');
    } finally {
      setTogglingId(null);
    }
  };

  const confirmDeleteStaff = async () => {
    if (!staffToDelete) return;
    try {
      await deleteStaffMember(staffToDelete.id);
      setStaffList((prev) => prev.filter((item) => item.id !== staffToDelete.id));
      showToast(`Staff member "${staffToDelete.name}" removed`, 'info');
    } catch (err) {
      showToast(formatFirestorePermissionMessage(err, 'Failed to delete staff member'), 'error');
    } finally {
      setStaffToDelete(null);
    }
  };

  const roleBadges: Record<string, string> = {
    admin: 'bg-rose-100 text-rose-900 border-rose-200',
    manager: 'bg-purple-100 text-purple-900 border-purple-200',
    catalog_manager: 'bg-amber-100 text-amber-900 border-amber-200',
    delivery_lead: 'bg-blue-100 text-blue-900 border-blue-200',
    staff: 'bg-stone-100 text-stone-800 border-stone-200',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
            Staff & Kitchen Team Roster
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-semibold border border-amber-200">
              {staffList.length} members
            </span>
          </h2>
          <p className="text-sm text-stone-500 mt-0.5">
            Role-based access control, kitchen leads, delivery drivers, and catalog permissions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadStaff}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors border border-stone-300"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 rounded-xl transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Add Staff Member
          </button>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-10 text-center text-stone-400 text-xs">
          <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin text-amber-600" />
          Loading team roster...
        </div>
      ) : staffList.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-10 text-center text-stone-400 text-xs">
          <User className="w-8 h-8 mx-auto mb-2 opacity-40" />
          No staff members configured yet. Click &quot;Add Staff Member&quot; to assign team permissions.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {staffList.map((staff) => {
            return (
              <div
                key={staff.id}
                className={`bg-white rounded-2xl border p-5 shadow-xs flex flex-col justify-between transition-colors ${
                  staff.active ? 'border-stone-200/80 hover:border-amber-400' : 'border-stone-200 opacity-60'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-900 font-bold flex items-center justify-center text-sm">
                        {staff.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-bold text-stone-900 text-sm">{staff.name}</h3>
                        <span
                          className={`inline-block px-2 py-0.2 rounded text-[10px] font-bold border mt-0.5 ${
                            roleBadges[staff.role] || 'bg-stone-100 text-stone-700'
                          }`}
                        >
                          {staff.role.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={togglingId === staff.id}
                      onClick={() => handleToggleActive(staff)}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-colors cursor-pointer disabled:opacity-50 ${
                        staff.active
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                          : 'bg-stone-100 text-stone-600 border-stone-200 hover:bg-stone-200'
                      }`}
                    >
                      {togglingId === staff.id ? 'Updating...' : staff.active ? 'Active' : 'Disabled'}
                    </button>
                  </div>

                  <div className="mt-3.5 space-y-1 text-xs text-stone-600">
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-stone-400" />
                      <span>{staff.email}</span>
                    </div>
                    {staff.phone && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-stone-400" />
                        <span>{staff.phone}</span>
                      </div>
                    )}
                    <div className="text-[11px] text-stone-400 pt-0.5">
                      Dept: <span className="text-stone-700 font-medium">{staff.department}</span>
                    </div>
                  </div>

                  <div className="mt-3.5 pt-3 border-t border-stone-100">
                    <span className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider block mb-1.5">
                      Assigned Privileges
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {staff.permissions?.map((p, i) => (
                        <span
                          key={i}
                          className="text-[10px] font-medium px-2 py-0.5 rounded bg-stone-100 text-stone-700 border border-stone-200"
                        >
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-end gap-1.5">
                  <button
                    onClick={() => handleOpenEdit(staff)}
                    className="p-1.5 rounded-lg text-stone-600 hover:text-amber-800 hover:bg-amber-50 transition-colors cursor-pointer"
                    title="Edit Staff Member"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setStaffToDelete(staff)}
                    className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Delete Staff Access"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Staff Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 border border-stone-200 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="text-base font-bold text-stone-900">
                {editingStaff ? 'Edit Staff Member' : 'Add Staff Member'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 text-lg leading-none"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Chandra"
                    value={formData.name ?? ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 rounded-lg border border-stone-300 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Work Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="ramesh@puresudh.com"
                    value={formData.email ?? ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 rounded-lg border border-stone-300 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={formData.phone ?? ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 rounded-lg border border-stone-300 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Department</label>
                  <input
                    type="text"
                    placeholder="e.g. Dispatch & Delivery Fleet"
                    value={formData.department ?? ''}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 rounded-lg border border-stone-300 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Assigned Role</label>
                <select
                  value={formData.role ?? 'staff'}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                  className="w-full px-3 py-2 bg-stone-50 rounded-lg border border-stone-300 focus:outline-none"
                >
                  <option value="admin">Administrator (Full Access)</option>
                  <option value="manager">Store Manager (Operations & Orders)</option>
                  <option value="catalog_manager">Catalog Manager (Products & Prices)</option>
                  <option value="delivery_lead">Delivery Lead (Dispatch & Routes)</option>
                  <option value="staff">Staff (Orders processing)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-2">
                  Granular Permissions
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 bg-stone-50 rounded-xl border border-stone-200">
                  {availablePermissions.map((perm) => (
                    <label
                      key={perm.key}
                      className="flex items-center gap-2 cursor-pointer text-stone-700 hover:text-stone-900"
                    >
                      <input
                        type="checkbox"
                        checked={formData.permissions.includes(perm.key)}
                        onChange={() => handleTogglePermission(perm.key)}
                        className="rounded text-amber-700 focus:ring-amber-500"
                      />
                      <span>{perm.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="staff-active-check"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="rounded text-amber-700 focus:ring-amber-500"
                />
                <label htmlFor="staff-active-check" className="font-semibold text-stone-800">
                  Staff member is active and authorized to log into admin console
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 font-semibold text-stone-600 hover:bg-stone-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 font-bold text-white bg-amber-700 hover:bg-amber-800 disabled:opacity-50 rounded-lg shadow-xs"
                >
                  {submitting ? 'Saving...' : editingStaff ? 'Update Staff' : 'Save Staff Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Delete Staff Confirmation Modal */}
      {staffToDelete && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 border border-stone-200 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-stone-900">Revoke Staff Access</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Are you sure you want to remove staff access for <strong>{staffToDelete.name}</strong> ({staffToDelete.email})?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setStaffToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteStaff}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs cursor-pointer"
              >
                Remove Staff Member
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
