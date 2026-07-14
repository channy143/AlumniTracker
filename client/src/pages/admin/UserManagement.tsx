import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '@/services/api';
import { useUIStore } from '@/store/uiStore';

export default function UserManagement() {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showResetPw, setShowResetPw] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [form, setForm] = useState({ email: '', password: '', firstName: '', lastName: '', role: 'staff' });
  const addNotification = useUIStore((s) => s.addNotification);
  const limit = 15;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.userList({ page, limit, search, role });
      setData(res.data);
      setTotal(res.total);
    } catch { addNotification('Failed to load users', 'error'); }
    finally { setLoading(false); }
  }, [page, search, role]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adminApi.userCreate(form);
      setShowForm(false);
      setForm({ email: '', password: '', firstName: '', lastName: '', role: 'staff' });
      addNotification('User created', 'success');
      load();
    } catch { addNotification('Failed to create user', 'error'); }
  };

  const handleToggleActive = async (id: string, current: boolean) => {
    if (current) await adminApi.userDisable(id);
    else await adminApi.userEnable(id);
    addNotification(current ? 'Account disabled' : 'Account enabled', 'success');
    load();
  };

  const handleSetRole = async (id: string, newRole: string) => {
    await adminApi.userSetRole(id, newRole);
    addNotification(`Role updated to ${newRole}`, 'success');
    load();
  };

  const handleResetPassword = async (id: string) => {
    if (!newPassword || newPassword.length < 6) { addNotification('Password must be at least 6 characters', 'error'); return; }
    await adminApi.userResetPassword(id, newPassword);
    setShowResetPw(null); setNewPassword('');
    addNotification('Password reset successfully', 'success');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="section-title">User Management</h1>
          <p className="text-gray-500 mt-1">{total} users</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary text-sm">+ Create User</button>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search users..." className="input-field max-w-xs text-sm" />
        <select value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }} className="input-field text-sm max-w-[130px]">
          <option value="">All Roles</option>
          <option value="admin">Admin</option>
          <option value="staff">Staff</option>
          <option value="alumni">Alumni</option>
        </select>
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="card animate-pulse h-16" />)}</div>
      ) : data.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">No users found</div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Name</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Email</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Role</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.map((user: any) => (
                  <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-ctu-charcoal">{user.profile?.first_name} {user.profile?.last_name}</td>
                    <td className="py-3 px-4 text-gray-500">{user.email}</td>
                    <td className="py-3 px-4">
                      <select value={user.role} onChange={(e) => handleSetRole(user.id, e.target.value)}
                        className="border border-gray-300 rounded px-2 py-0.5 text-xs focus:ring-2 focus:ring-ctu-blue/20 focus:border-ctu-blue outline-none">
                        <option value="alumni">Alumni</option>
                        <option value="staff">Staff</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 text-xs rounded-full ${user.is_active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => handleToggleActive(user.id, user.is_active)} className="text-xs text-orange-600 hover:underline">
                          {user.is_active ? 'Disable' : 'Enable'}
                        </button>
                        <button onClick={() => { setShowResetPw(user.id); setNewPassword(''); }} className="text-xs text-ctu-blue hover:underline">
                          Reset PW
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-ctu-charcoal mb-6">Create User</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-ctu-charcoal mb-1">First Name *</label><input type="text" value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} className="input-field" required /></div>
                <div><label className="block text-sm font-medium text-ctu-charcoal mb-1">Last Name *</label><input type="text" value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} className="input-field" required /></div>
              </div>
              <div><label className="block text-sm font-medium text-ctu-charcoal mb-1">Email *</label><input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className="input-field" required /></div>
              <div><label className="block text-sm font-medium text-ctu-charcoal mb-1">Password *</label><input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} className="input-field" required /></div>
              <div><label className="block text-sm font-medium text-ctu-charcoal mb-1">Role</label><select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} className="input-field"><option value="staff">Staff</option><option value="admin">Admin</option></select></div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Create User</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showResetPw && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowResetPw(null)}>
          <div className="bg-white rounded-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-ctu-charcoal mb-6">Reset Password</h2>
            <div className="space-y-4">
              <div><label className="block text-sm font-medium text-ctu-charcoal mb-1">New Password *</label><input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="input-field" minLength={6} required /></div>
              <div className="flex gap-3 justify-end pt-2">
                <button onClick={() => setShowResetPw(null)} className="btn-secondary">Cancel</button>
                <button onClick={() => handleResetPassword(showResetPw)} className="btn-primary">Reset</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
