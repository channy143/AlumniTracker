import { useState, useEffect } from 'react';
import { adminApi, analyticsApi } from '@/services/api';

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [overview, setOverview] = useState<any>(null);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editRole, setEditRole] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersData, overviewData] = await Promise.all([
        adminApi.users(),
        analyticsApi.overview(),
      ]);
      setUsers(usersData);
      setOverview(overviewData);
    } catch {
      setError('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleUpdate = async (userId: string) => {
    try {
      setSaving(true);
      await adminApi.updateUser(userId, { role: editRole });
      setEditingUser(null);
      loadData();
    } catch {
      setError('Failed to update user role');
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async (format: string) => {
    try {
      const blob = await adminApi.exportData(format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `alumni-export.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('Failed to export data');
    }
  };

  const stats = [
    { label: 'Total Alumni', value: overview?.totalAlumni?.toLocaleString() || '---' },
    { label: 'Employment Rate', value: `${overview?.employedPercentage || 0}%` },
    { label: 'Industries', value: overview?.topIndustries?.length || '---' },
    { label: 'Registered Users', value: users.length.toLocaleString() },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div><h1 className="section-title">Admin Dashboard</h1><p className="text-gray-500 mt-1">Loading...</p></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => <div key={i} className="card animate-pulse h-24" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div><h1 className="section-title">Admin Dashboard</h1></div>
        <div className="card text-center py-12">
          <p className="text-red-600">{error}</p>
          <button onClick={loadData} className="btn-primary mt-4">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="section-title">Admin Dashboard</h1>
        <p className="text-gray-500 mt-1">Manage alumni data, content, and system settings</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="card text-center">
            <p className="text-3xl font-bold text-ctu-blue">{stat.value}</p>
            <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card">
          <h2 className="text-lg font-semibold text-ctu-charcoal mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <button className="btn-primary w-full text-left">Approve New Registrations</button>
            <button className="btn-secondary w-full text-left">Create Announcement</button>
            <button className="btn-secondary w-full text-left" onClick={() => handleExport('csv')}>Export Data (CSV)</button>
            <button className="btn-secondary w-full text-left" onClick={() => handleExport('json')}>Export Data (JSON)</button>
          </div>
        </div>

        <div className="lg:col-span-2 card">
          <h2 className="text-lg font-semibold text-ctu-charcoal mb-4">User Management</h2>
          {users.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No users registered yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 font-medium text-gray-500">Name</th>
                    <th className="text-left py-3 font-medium text-gray-500">Email</th>
                    <th className="text-left py-3 font-medium text-gray-500">Role</th>
                    <th className="text-left py-3 font-medium text-gray-500">Status</th>
                    <th className="text-left py-3 font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user: any) => {
                    const name = `${user.profile?.first_name || ''} ${user.profile?.last_name || ''}`.trim() || user.email || 'Unknown';
                    return (
                      <tr key={user.id} className="border-b border-gray-100">
                        <td className="py-3 font-medium text-ctu-charcoal">{name}</td>
                        <td className="py-3 text-gray-500">{user.email}</td>
                        <td className="py-3">
                          {editingUser === user.id ? (
                            <select
                              value={editRole}
                              onChange={(e) => setEditRole(e.target.value)}
                              className="border border-gray-300 rounded px-2 py-1 text-xs focus:ring-2 focus:ring-ctu-blue/20 focus:border-ctu-blue outline-none"
                            >
                              <option value="alumni">Alumni</option>
                              <option value="admin">Admin</option>
                            </select>
                          ) : (
                            <span className={`px-2 py-1 text-xs rounded-full ${user.role === 'admin' ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'}`}>
                              {user.role}
                            </span>
                          )}
                        </td>
                        <td className="py-3">
                          <span className={`px-2 py-1 text-xs rounded-full ${user.is_active !== false ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
                            {user.is_active !== false ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="py-3">
                          {editingUser === user.id ? (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleRoleUpdate(user.id)}
                                disabled={saving}
                                className="text-xs text-ctu-blue font-medium hover:underline"
                              >
                                {saving ? 'Saving...' : 'Save'}
                              </button>
                              <button onClick={() => setEditingUser(null)} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
                            </div>
                          ) : (
                            <button
                              onClick={() => { setEditingUser(user.id); setEditRole(user.role || 'alumni'); }}
                              className="text-xs text-ctu-blue font-medium hover:underline"
                            >
                              Edit Role
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
