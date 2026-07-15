import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '@/services/api';
import { useUIStore } from '@/store/uiStore';

export default function AlumniManagement() {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ course: '', year: '', status: '', employment_status: '', employer: '', industry: '', salary_range: '', location: '', archived: 'false' });
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

  const filterFields = [
    { key: 'course', placeholder: 'Course', type: 'select', options: ['BSIT', 'BIT', 'BEEd', 'BSEd-Math', 'BTLED-HE', 'BTLED-ICT'] },
    { key: 'year', placeholder: 'Batch', type: 'number' },
    { key: 'employment_status', placeholder: 'Employment Status', type: 'select', options: ['Employed', 'Self-employed', 'Unemployed', 'Student', 'Seeking Opportunities', 'Retired'] },
    { key: 'employer', placeholder: 'Employer', type: 'text' },
    { key: 'industry', placeholder: 'Industry', type: 'text' },
    { key: 'salary_range', placeholder: 'Salary Range', type: 'select', options: ['<20k', '20-30k', '30-40k', '40-50k', '50k+'] },
    { key: 'location', placeholder: 'Location', type: 'text' },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <div>
          <h1 className="text-base font-bold text-gray-900">Alumni Management</h1>
          <p className="text-xs text-gray-500">{total} total alumni</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} className="px-3 py-1.5 text-xs font-medium bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">Export CSV</button>
          <button onClick={() => { setShowForm(true); setError(''); }} className="px-3 py-1.5 text-xs font-medium bg-orange-500 text-white rounded-lg hover:bg-orange-600">+ Add Alumni</button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search by name, email, or ID..." className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-orange-400 w-48" />
        <select value={filters.course} onChange={(e) => { setFilters((f) => ({ ...f, course: e.target.value })); setPage(1); }}
          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-orange-400">
          <option value="">All Courses</option>
          {['BSIT', 'BIT', 'BEEd', 'BSEd-Math', 'BTLED-HE', 'BTLED-ICT'].map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <input type="number" value={filters.year} onChange={(e) => { setFilters((f) => ({ ...f, year: e.target.value })); setPage(1); }}
          placeholder="Batch" className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-orange-400 w-16" />
        <select value={filters.employment_status} onChange={(e) => { setFilters((f) => ({ ...f, employment_status: e.target.value })); setPage(1); }}
          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-orange-400">
          <option value="">All Status</option>
          {['Employed', 'Self-employed', 'Unemployed', 'Student', 'Seeking Opportunities', 'Retired'].map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <input type="text" value={filters.employer} onChange={(e) => { setFilters((f) => ({ ...f, employer: e.target.value })); setPage(1); }}
          placeholder="Employer" className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-orange-400 w-24" />
        <input type="text" value={filters.location} onChange={(e) => { setFilters((f) => ({ ...f, location: e.target.value })); setPage(1); }}
          placeholder="Location" className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-orange-400 w-20" />
        <select value={filters.archived} onChange={(e) => { setFilters((f) => ({ ...f, archived: e.target.value })); setPage(1); }}
          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-orange-400">
          <option value="false">Active</option>
          <option value="true">Archived</option>
        </select>
      </div>

      {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-xs mb-3">{error}</div>}

      {loading ? (
        <div className="space-y-2">{[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-12 bg-gray-200 animate-pulse rounded-lg" />)}</div>
      ) : data.length === 0 ? (
        <div className="text-center py-12 text-sm text-gray-500 bg-white border border-gray-200 rounded-lg">No alumni found</div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-2.5 px-3 font-medium text-gray-500">Name</th>
                  <th className="text-left py-2.5 px-3 font-medium text-gray-500">Email</th>
                  <th className="text-left py-2.5 px-3 font-medium text-gray-500">ID Number</th>
                  <th className="text-left py-2.5 px-3 font-medium text-gray-500">Course</th>
                  <th className="text-left py-2.5 px-3 font-medium text-gray-500">Batch</th>
                  <th className="text-left py-2.5 px-3 font-medium text-gray-500">Status</th>
                  <th className="text-left py-2.5 px-3 font-medium text-gray-500">Employer</th>
                  <th className="text-right py-2.5 px-3 font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.map((user: any) => {
                  const emp = user.profile?.employment?.[0] || user.employment?.[0] || user.current_employment || {};
                  const edu = user.profile?.education?.[0] || user.education?.[0] || {};
                  return (
                    <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2.5 px-3 font-medium text-gray-900 whitespace-nowrap">{user.profile?.first_name || user.first_name} {user.profile?.last_name || user.last_name}</td>
                      <td className="py-2.5 px-3 text-gray-500 whitespace-nowrap">{user.email}</td>
                      <td className="py-2.5 px-3 text-gray-500">{user.profile?.id_number || '---'}</td>
                      <td className="py-2.5 px-3 text-gray-600">{edu?.program || '---'}</td>
                      <td className="py-2.5 px-3 text-gray-600">{edu?.year_graduated || '---'}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded-full ${emp?.employment_status === 'Employed' ? 'bg-emerald-50 text-emerald-700' : emp?.employment_status === 'Unemployed' ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-600'}`}>
                          {emp?.employment_status || 'N/A'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-gray-500 whitespace-nowrap">{emp?.company_name || emp?.employer || '---'}</td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <button onClick={() => handleView(user.id)} className="text-xs text-orange-600 hover:text-orange-700 px-1">View</button>
                        {!user.is_verified && <button onClick={() => handleVerify(user.id)} className="text-xs text-emerald-600 hover:text-emerald-700 px-1">Verify</button>}
                        {user.is_archived
                          ? <button onClick={() => handleRestore(user.id)} className="text-xs text-teal-600 hover:text-teal-700 px-1">Restore</button>
                          : <button onClick={() => handleArchive(user.id)} className="text-xs text-amber-600 hover:text-amber-700 px-1">Archive</button>}
                        <button onClick={() => handleDelete(user.id)} className="text-xs text-red-500 hover:text-red-700 px-1">Delete</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-3 py-2.5 border-t border-gray-100">
              <span className="text-xs text-gray-400">Page {page} of {totalPages}</span>
              <div className="flex gap-1">
                <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-2.5 py-1 text-xs font-medium border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-40">Prev</button>
                <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="px-2.5 py-1 text-xs font-medium border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-40">Next</button>
              </div>
            </div>
          )}
        </div>
      )}

      {showDetail && detailData && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowDetail(false)}>
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-gray-900">Alumni Details</h2>
              <button onClick={() => setShowDetail(false)} className="text-gray-400 hover:text-gray-600 text-lg">&times;</button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
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
              <div className="mt-4">
                <h3 className="text-xs font-semibold text-gray-800 mb-2">Education</h3>
                {detailData.education.map((edu: any, i: number) => (
                  <div key={i} className="text-xs text-gray-600 py-1">{edu.program} ({edu.year_graduated})</div>
                ))}
              </div>
            )}
            {detailData.employment?.length > 0 && (
              <div className="mt-3">
                <h3 className="text-xs font-semibold text-gray-800 mb-2">Employment History</h3>
                {detailData.employment.map((emp: any, i: number) => (
                  <div key={i} className="text-xs text-gray-600 border-b border-gray-100 py-1.5">
                    <span className="font-medium">{emp.position}</span> at {emp.company_name} {emp.is_current ? '(Current)' : ''}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-lg max-w-lg w-full p-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-sm font-bold text-gray-900 mb-4">Add Alumni</h2>
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div><label className="block text-xs font-medium text-gray-700 mb-0.5">First Name</label><input type="text" value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} className="w-full text-xs border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-orange-400" required /></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-0.5">Last Name</label><input type="text" value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} className="w-full text-xs border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-orange-400" required /></div>
              </div>
              <div><label className="block text-xs font-medium text-gray-700 mb-0.5">Email</label><input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className="w-full text-xs border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-orange-400" required /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="block text-xs font-medium text-gray-700 mb-0.5">Course</label><select value={form.program} onChange={(e) => setForm((f) => ({ ...f, program: e.target.value }))} className="w-full text-xs border border-gray-200 rounded-lg px-3 py-1.5 outline-none"><option value="">Select</option><option value="BSIT">BSIT</option><option value="BIT">BIT</option><option value="BEEd">BEEd</option><option value="BSEd-Math">BSEd-Math</option><option value="BTLED-HE">BTLED-HE</option><option value="BTLED-ICT">BTLED-ICT</option></select></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-0.5">Year Graduated</label><input type="number" value={form.yearGraduated} onChange={(e) => setForm((f) => ({ ...f, yearGraduated: e.target.value }))} className="w-full text-xs border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-orange-400" min={2014} /></div>
              </div>
              <div><label className="block text-xs font-medium text-gray-700 mb-0.5">Password</label><input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} className="w-full text-xs border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-orange-400" required /></div>
              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">Cancel</button>
                <button type="submit" className="px-3 py-1.5 text-xs font-medium bg-orange-500 text-white rounded-lg hover:bg-orange-600">Create Alumni</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
