import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '@/services/api';
import { useUIStore } from '@/store/uiStore';

export default function AlumniManagement() {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ course: '', year: '', status: '', employment_status: '', archived: 'false' });
  const [selected, setSelected] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [detailData, setDetailData] = useState<any>(null);
  const [form, setForm] = useState({ email: '', password: '', firstName: '', lastName: '', idNumber: '', program: '', yearGraduated: '' });
  const [error, setError] = useState('');
  const addNotification = useUIStore((s) => s.addNotification);

  const limit = 15;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.alumniList({ page, limit, search, ...filters, archived: filters.archived });
      setData(res.data);
      setTotal(res.total);
    } catch (err: any) { setError(err.message || 'Failed to load alumni'); }
    finally { setLoading(false); }
  }, [page, search, filters]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(total / limit);

  const handleView = async (id: string) => {
    try {
      const d = await adminApi.alumniGet(id);
      setDetailData(d);
      setShowDetail(true);
    } catch { addNotification('Failed to load alumni details', 'error'); }
  };

  const handleArchive = async (id: string) => {
    await adminApi.alumniArchive(id);
    addNotification('Alumni archived', 'success');
    load();
  };

  const handleRestore = async (id: string) => {
    await adminApi.alumniRestore(id);
    addNotification('Alumni restored', 'success');
    load();
  };

  const handleVerify = async (id: string) => {
    await adminApi.alumniVerify(id);
    addNotification('Alumni verified', 'success');
    load();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Permanently delete this alumni? This cannot be undone.')) return;
    await adminApi.alumniDelete(id);
    addNotification('Alumni deleted', 'success');
    load();
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adminApi.alumniCreate(form);
      setShowForm(false);
      setForm({ email: '', password: '', firstName: '', lastName: '', idNumber: '', program: '', yearGraduated: '' });
      addNotification('Alumni created', 'success');
      load();
    } catch (err: any) { setError(err.message); }
  };

  const handleExport = async () => {
    const blob = await adminApi.alumniExport('csv');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'alumni-export.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="section-title">Alumni Management</h1>
          <p className="text-gray-500 mt-1">{total} total alumni</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setShowForm(true); setError(''); }} className="btn-primary text-sm">+ Add Alumni</button>
          <button onClick={handleExport} className="btn-secondary text-sm">Export CSV</button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search by name, email, or ID..." className="input-field max-w-xs text-sm" />
        <select value={filters.course} onChange={(e) => { setFilters((f) => ({ ...f, course: e.target.value })); setPage(1); }} className="input-field text-sm max-w-[130px]">
          <option value="">All Courses</option>
          <option value="BSIT">BSIT</option>
          <option value="BIT">BIT</option>
          <option value="BEEd">BEEd</option>
          <option value="BSEd-Math">BSEd-Math</option>
          <option value="BTLED-HE">BTLED-HE</option>
          <option value="BTLED-ICT">BTLED-ICT</option>
        </select>
        <input type="number" value={filters.year} onChange={(e) => { setFilters((f) => ({ ...f, year: e.target.value })); setPage(1); }}
          placeholder="Year" className="input-field text-sm max-w-[80px]" />
        <select value={filters.status} onChange={(e) => { setFilters((f) => ({ ...f, status: e.target.value })); setPage(1); }} className="input-field text-sm max-w-[130px]">
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="verified">Verified</option>
          <option value="unverified">Unverified</option>
        </select>
        <select value={filters.archived} onChange={(e) => { setFilters((f) => ({ ...f, archived: e.target.value })); setPage(1); }} className="input-field text-sm max-w-[130px]">
          <option value="false">Active Only</option>
          <option value="true">Archived</option>
        </select>
      </div>

      {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="card animate-pulse h-16" />)}</div>
      ) : data.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">No alumni found</div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Name</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Email</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">ID Number</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Verified</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Joined</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.map((user: any) => (
                  <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-ctu-charcoal">{user.profile?.first_name} {user.profile?.last_name}</td>
                    <td className="py-3 px-4 text-gray-500">{user.email}</td>
                    <td className="py-3 px-4 text-gray-500">{user.profile?.id_number || '---'}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 text-xs rounded-full ${user.is_active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 text-xs rounded-full ${user.is_verified ? 'bg-blue-50 text-blue-700' : 'bg-yellow-50 text-yellow-700'}`}>
                        {user.is_verified ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-400 text-xs">{new Date(user.created_at).toLocaleDateString()}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => handleView(user.id)} className="text-xs text-ctu-blue hover:underline px-1">View</button>
                        {!user.is_verified && <button onClick={() => handleVerify(user.id)} className="text-xs text-green-600 hover:underline px-1">Verify</button>}
                        {user.is_archived
                          ? <button onClick={() => handleRestore(user.id)} className="text-xs text-teal-600 hover:underline px-1">Restore</button>
                          : <button onClick={() => handleArchive(user.id)} className="text-xs text-orange-600 hover:underline px-1">Archive</button>
                        }
                        <button onClick={() => handleDelete(user.id)} className="text-xs text-red-600 hover:underline px-1">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <span className="text-xs text-gray-400">Page {page} of {totalPages}</span>
              <div className="flex gap-1">
                <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="btn-secondary text-xs px-3 py-1">Prev</button>
                <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="btn-secondary text-xs px-3 py-1">Next</button>
              </div>
            </div>
          )}
        </div>
      )}

      {showDetail && detailData && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowDetail(false)}>
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-ctu-charcoal">Alumni Details</h2>
              <button onClick={() => setShowDetail(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-500">Name:</span> <span className="font-medium">{detailData.profile?.first_name} {detailData.profile?.last_name}</span></div>
              <div><span className="text-gray-500">Email:</span> <span>{detailData.email}</span></div>
              <div><span className="text-gray-500">ID Number:</span> <span>{detailData.profile?.id_number || '---'}</span></div>
              <div><span className="text-gray-500">Phone:</span> <span>{detailData.profile?.phone || '---'}</span></div>
              <div><span className="text-gray-500">City:</span> <span>{detailData.profile?.city || '---'}</span></div>
              <div><span className="text-gray-500">Province:</span> <span>{detailData.profile?.province || '---'}</span></div>
              <div><span className="text-gray-500">Role:</span> <span className="capitalize">{detailData.role}</span></div>
              <div><span className="text-gray-500">Verified:</span> <span>{detailData.is_verified ? 'Yes' : 'No'}</span></div>
              <div><span className="text-gray-500">Active:</span> <span>{detailData.is_active ? 'Yes' : 'No'}</span></div>
              <div><span className="text-gray-500">Joined:</span> <span>{new Date(detailData.created_at).toLocaleDateString()}</span></div>
            </div>
            {detailData.education?.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-ctu-charcoal mb-2">Education</h3>
                {detailData.education.map((edu: any, i: number) => (
                  <div key={i} className="text-sm text-gray-600">{edu.program} ({edu.year_graduated})</div>
                ))}
              </div>
            )}
            {detailData.employment?.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-semibold text-ctu-charcoal mb-2">Employment History</h3>
                {detailData.employment.map((emp: any, i: number) => (
                  <div key={i} className="text-sm text-gray-600 border-b border-gray-100 py-2">
                    <div className="font-medium">{emp.position}</div>
                    <div className="text-gray-400">{emp.company_name} {emp.is_current ? '(Current)' : ''}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-xl max-w-lg w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-ctu-charcoal mb-6">Add Alumni</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-ctu-charcoal mb-1">First Name</label><input type="text" value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} className="input-field" required /></div>
                <div><label className="block text-sm font-medium text-ctu-charcoal mb-1">Last Name</label><input type="text" value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} className="input-field" required /></div>
              </div>
              <div><label className="block text-sm font-medium text-ctu-charcoal mb-1">Email</label><input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className="input-field" required /></div>
              <div><label className="block text-sm font-medium text-ctu-charcoal mb-1">ID Number</label><input type="text" value={form.idNumber} onChange={(e) => setForm((f) => ({ ...f, idNumber: e.target.value }))} className="input-field" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-ctu-charcoal mb-1">Course</label><select value={form.program} onChange={(e) => setForm((f) => ({ ...f, program: e.target.value }))} className="input-field"><option value="">Select</option><option value="BSIT">BSIT</option><option value="BIT">BIT</option><option value="BEEd">BEEd</option><option value="BSEd-Math">BSEd-Math</option><option value="BTLED-HE">BTLED-HE</option><option value="BTLED-ICT">BTLED-ICT</option></select></div>
                <div><label className="block text-sm font-medium text-ctu-charcoal mb-1">Year Graduated</label><input type="number" value={form.yearGraduated} onChange={(e) => setForm((f) => ({ ...f, yearGraduated: e.target.value }))} className="input-field" min={2014} /></div>
              </div>
              <div><label className="block text-sm font-medium text-ctu-charcoal mb-1">Password</label><input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} className="input-field" required /></div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Create Alumni</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
