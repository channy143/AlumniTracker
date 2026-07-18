import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '@/services/api';
import { useUIStore } from '@/store/uiStore';
import { generateYears } from '@/utils/helpers';

export default function AlumniManagement() {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [employers, setEmployers] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ course: '', year: '', employment_status: '', employer: '', location: '', archived: 'false' });
  const [selected, setSelected] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [detailData, setDetailData] = useState<any>(null);
  const [editingDetail, setEditingDetail] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [savingDetail, setSavingDetail] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', firstName: '', lastName: '', idNumber: '', program: '', yearGraduated: '' });
  const [error, setError] = useState('');
  const addNotification = useUIStore((s) => s.addNotification);
  const batchYears = generateYears(2014, new Date().getFullYear());

  const normalizeStatus = (s: string) => {
    if (!s) return '';
    const lower = s.toLowerCase();
    if (lower === 'student') return 'Unemployed';
    if (lower === 'seeking') return 'Seeking Opportunities';
    return s.charAt(0).toUpperCase() + s.slice(1);
  };

  const statusBadge = (status: string) => {
    const normal = normalizeStatus(status);
    const styles: Record<string, string> = {
      'Employed': 'bg-emerald-100 text-emerald-700',
      'Self-employed': 'bg-blue-100 text-blue-700',
      'Unemployed': 'bg-gray-100 text-gray-600',
      'Seeking Opportunities': 'bg-amber-100 text-amber-700',
      'Retired': 'bg-slate-100 text-slate-600',
    };
    return styles[normal] || 'bg-gray-100 text-gray-600';
  };

  const limit = 15;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.alumniList({ page, limit, search, ...filters, archived: filters.archived });
      setData(res.data);
      setTotal(res.total);
      if (res.employers) setEmployers(res.employers);
      if (res.locations) setLocations(res.locations);
    } catch (err: any) { setError(err.message || 'Failed to load alumni'); }
    finally { setLoading(false); }
  }, [page, search, filters]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(total / limit);

  const handleView = async (id: string) => {
    try {
      const d = await adminApi.alumniGet(id);
      setDetailData(d);
      setEditingDetail(false);
      setShowDetail(true);
    } catch { addNotification('Failed to load alumni details', 'error'); }
  };

  const handleEditDetail = () => {
    const p = detailData?.profile || {};
    const edu = (detailData?.education || [])[0] || {};
    setEditForm({
      id_number: p.id_number || '',
      phone: p.phone || '',
      city: p.city || '',
      province: p.province || '',
      program: edu.program || '',
      year_graduated: edu.year_graduated || '',
      email: detailData.email || '',
    });
    setEditingDetail(true);
  };

  const handleSaveDetail = async () => {
    setSavingDetail(true);
    try {
      const edu = (detailData.education || [])[0] || {};
      const hasEduChanges = editForm.program !== (edu.program || '') || editForm.year_graduated !== (edu.year_graduated || '');
      await adminApi.alumniUpdate(detailData.id, {
        email: editForm.email !== detailData.email ? editForm.email : undefined,
        profile: {
          id_number: editForm.id_number || null,
          phone: editForm.phone || null,
          city: editForm.city || null,
          province: editForm.province || null,
        },
        education: hasEduChanges ? { program: editForm.program, year_graduated: editForm.year_graduated ? parseInt(editForm.year_graduated) : null } : undefined,
      });
      addNotification('Alumni updated', 'success');
      setEditingDetail(false);
      const fresh = await adminApi.alumniGet(detailData.id);
      setDetailData(fresh);
      load();
    } catch (err: any) { addNotification(err.message || 'Failed to update', 'error'); }
    finally { setSavingDetail(false); }
  };

  const handleArchive = async (id: string) => {
    try {
      await adminApi.alumniArchive(id);
      addNotification('Alumni archived', 'success');
      load();
    } catch (err: any) { addNotification(err.message || 'Failed to archive', 'error'); }
  };

  const handleRestore = async (id: string) => {
    try {
      await adminApi.alumniRestore(id);
      addNotification('Alumni restored', 'success');
      load();
    } catch (err: any) { addNotification(err.message || 'Failed to restore', 'error'); }
  };

  const handleVerify = async (id: string) => {
    try {
      await adminApi.alumniVerify(id);
      addNotification('Alumni verified', 'success');
      load();
    } catch (err: any) { addNotification(err.message || 'Failed to verify', 'error'); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Permanently delete this alumni? This cannot be undone.')) return;
    try {
      await adminApi.alumniDelete(id);
      addNotification('Alumni deleted', 'success');
      load();
    } catch (err: any) { addNotification(err.message || 'Failed to delete', 'error'); }
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

  const courseShort = (name: string) => {
    const normalized = name.toLowerCase().trim();
    if (normalized.includes('bsit') || normalized.includes('bachelor of science in information technology')) return 'BSIT';
    if (normalized.includes('bit') || normalized.includes('bachelor in industrial technology')) return 'BIT';
    if (normalized.includes('beed') || normalized.includes('bachelor of elementary education')) return 'BEEd';
    if (normalized.includes('bsed') || normalized.includes('bachelor of secondary education')) return 'BSEd-Math';
    if (normalized.includes('btled-he') || normalized.includes('home economics')) return 'BTLED-HE';
    if (normalized.includes('btled-ict') || normalized.includes('information and communications technology') || normalized.includes('ict')) return 'BTLED-ICT';
    return name;
  };

  return (
    <div className="max-w-7xl mx-auto">
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
          placeholder="Search by name, email, or ID..." className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-orange-400 w-56" />
        <select value={filters.course} onChange={(e) => { setFilters((f) => ({ ...f, course: e.target.value })); setPage(1); }}
          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-orange-400">
          <option value="">All Courses</option>
          {['BSIT', 'BIT', 'BEEd', 'BSEd-Math', 'BTLED-HE', 'BTLED-ICT'].map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <select value={filters.year} onChange={(e) => { setFilters((f) => ({ ...f, year: e.target.value })); setPage(1); }}
          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-orange-400">
          <option value="">All Batches</option>
          {batchYears.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={filters.employment_status} onChange={(e) => { setFilters((f) => ({ ...f, employment_status: e.target.value })); setPage(1); }}
          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-orange-400">
          <option value="">All Status</option>
          {['Employed', 'Self-employed', 'Unemployed', 'Seeking Opportunities', 'Retired'].map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <select value={filters.employer} onChange={(e) => { setFilters((f) => ({ ...f, employer: e.target.value })); setPage(1); }}
          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-orange-400">
          <option value="">All Employers</option>
          {employers.map((e) => <option key={e} value={e}>{e}</option>)}
        </select>
        <select value={filters.location} onChange={(e) => { setFilters((f) => ({ ...f, location: e.target.value })); setPage(1); }}
          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-orange-400">
          <option value="">All Locations</option>
          {locations.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
        <select value={filters.archived} onChange={(e) => { setFilters((f) => ({ ...f, archived: e.target.value })); setPage(1); }}
          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-orange-400">
          <option value="">All</option>
          <option value="false">Active</option>
          <option value="true">Archived</option>
        </select>
      </div>

      {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-xs mb-3">{error}</div>}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map((i) => (
            <div key={i} className="bg-white border border-gray-200 animate-pulse">
              <div className="w-full h-44 bg-gray-200" />
              <div className="p-[13px] space-y-2">
                <div className="h-3 bg-gray-200 rounded w-3/4" />
                <div className="h-2 bg-gray-200 rounded w-1/2" />
                <div className="h-2 bg-gray-200 rounded w-2/3" />
                <div className="h-2 bg-gray-200 rounded w-1/3" />
                <div className="h-2 bg-gray-200 rounded w-1/2" />
                <div className="h-2 bg-gray-200 rounded w-3/4" />
              </div>
              <div className="px-2.5 pb-2.5 flex gap-1">
                <div className="h-5 bg-gray-200 rounded w-10" />
                <div className="h-5 bg-gray-200 rounded w-12" />
                <div className="h-5 bg-gray-200 rounded w-14" />
              </div>
            </div>
          ))}
        </div>
      ) : data.length === 0 ? (
        <div className="text-center py-12 text-sm text-gray-500 bg-white border border-gray-200 rounded-lg">
          {search || filters.course || filters.year || filters.employment_status ? 'No alumni match your filters' : 'No alumni registered yet'}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {data.map((user: any) => {
              const p = user.profile || {};
              const emp = (p.employment || [])[0] || {};
              const edu = (p.education || [])[0] || {};
              const initials = ((p.first_name?.[0] || '') + (p.last_name?.[0] || '')).toUpperCase();
  return (
                <div key={user.id} className="bg-white border border-gray-200 hover:shadow-md transition-shadow flex flex-col">
                  <div className="relative">
                    <div className="w-full h-44 bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center overflow-hidden">
                      {p.avatar_url ? (
                        <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-2xl font-bold text-orange-400">{initials}</span>
                      )}
                    </div>
                    <div className="absolute top-1.5 right-1.5">
                      <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded-full ${statusBadge(emp?.employment_status || p.employment_status)}`}>
                        {normalizeStatus(emp?.employment_status || p.employment_status) || 'N/A'}
                      </span>
                    </div>
                  </div>
                  <div className="p-[15px] flex-1 flex flex-col gap-1">
                    <p className="text-xs font-semibold text-gray-900 leading-tight">{p.first_name || ''} {p.last_name || ''}</p>
                    <div className="space-y-0.5 text-[10px] text-gray-500">
                      <p><span className="text-gray-400">ID:</span> {p.id_number || '---'}</p>
                      <p><span className="text-gray-400">Course:</span> {edu?.program ? courseShort(edu.program) : '---'}</p>
                      <p><span className="text-gray-400">Batch:</span> {edu?.year_graduated || '---'}</p>
                      <p><span className="text-gray-400">Employer:</span> {emp?.company_name || '---'}</p>
                      <p className="truncate"><span className="text-gray-400">Email:</span> {user.email}</p>
                    </div>
                  </div>
                  <div className="px-2.5 pb-2.5 flex flex-wrap gap-1">
                    <button onClick={() => handleView(user.id)} className="text-[10px] px-2 py-1 font-medium bg-orange-50 text-orange-600 rounded-md hover:bg-orange-100">View</button>
                    {!user.is_verified && (
                      <button onClick={() => handleVerify(user.id)} className="text-[10px] px-2 py-1 font-medium bg-emerald-50 text-emerald-600 rounded-md hover:bg-emerald-100">Verify</button>
                    )}
                    {user.is_archived ? (
                      <button onClick={() => handleRestore(user.id)} className="text-[10px] px-2 py-1 font-medium bg-teal-50 text-teal-600 rounded-md hover:bg-teal-100">Restore</button>
                    ) : (
                      <button onClick={() => handleArchive(user.id)} className="text-[10px] px-2 py-1 font-medium bg-amber-50 text-amber-600 rounded-md hover:bg-amber-100">Archive</button>
                    )}
                    <button onClick={() => handleDelete(user.id)} className="text-[10px] px-2 py-1 font-medium bg-red-50 text-red-500 rounded-md hover:bg-red-100">Delete</button>
                  </div>
                </div>
              );
            })}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-3 px-3 py-2.5 bg-white border border-gray-200 rounded-lg">
              <span className="text-xs text-gray-400">Page {page} of {totalPages}</span>
              <div className="flex gap-1">
                <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-2.5 py-1 text-xs font-medium border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-40">Prev</button>
                <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="px-2.5 py-1 text-xs font-medium border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-40">Next</button>
              </div>
            </div>
          )}
        </>
      )}

      {showDetail && detailData && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowDetail(false)}>
          <div className="bg-white max-w-5xl w-full flex flex-col" style={{ height: '80vh' }} onClick={(e) => e.stopPropagation()}>
            {/* Header bar */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-gray-50 sticky top-0 z-10">
              <h2 className="text-sm font-bold text-gray-900">Alumni Details</h2>
              <div className="flex items-center gap-2">
                {!editingDetail ? (
                  <button onClick={handleEditDetail} className="px-3 py-1 text-xs font-medium bg-orange-500 text-white hover:bg-orange-600">Edit</button>
                ) : (
                  <>
                    <button onClick={handleSaveDetail} disabled={savingDetail} className="px-3 py-1 text-xs font-medium bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50">{savingDetail ? 'Saving...' : 'Save'}</button>
                    <button onClick={() => setEditingDetail(false)} className="px-3 py-1 text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-100">Cancel</button>
                  </>
                )}
                <button onClick={() => setShowDetail(false)} className="text-gray-400 hover:text-gray-600 text-lg leading-none ml-1">&times;</button>
              </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
              {/* Left panel - 70% - scrollable */}
              <div className="w-full md:w-[70%] p-6 border-r border-gray-200 overflow-y-auto">
                {/* Quick summary */}
                <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100">
                  <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center text-sm font-bold text-orange-600 shrink-0">
                    {((detailData.profile?.first_name?.[0] || '') + (detailData.profile?.last_name?.[0] || '')).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{detailData.profile?.first_name} {detailData.profile?.last_name}</p>
                    <p className="text-xs text-gray-500">{detailData.email}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[10px] px-1.5 py-0.5 font-medium ${detailData.is_verified ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>{detailData.is_verified ? 'Verified' : 'Unverified'}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 font-medium ${detailData.is_active !== false ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>{detailData.is_active !== false ? 'Active' : 'Inactive'}</span>
                      <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 font-medium capitalize">{detailData.role}</span>
                    </div>
                  </div>
                </div>

                {/* Career Summary */}
                <div className="mb-4">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Career Summary</h3>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                    {[
                      { label: 'Employment Status', value: detailData.profile?.employment_status, badge: detailData.profile?.employment_status },
                      { label: 'Industry', value: detailData.profile?.industry },
                      { label: 'Current Position', value: (detailData.employment || []).find((e: any) => e.is_current)?.position },
                      { label: 'Company', value: (detailData.employment || []).find((e: any) => e.is_current)?.company_name },
                      { label: 'Employment Type', value: (detailData.employment || []).find((e: any) => e.is_current)?.job_type },
                      { label: 'Location', value: [detailData.profile?.city, detailData.profile?.province].filter(Boolean).join(', ') },
                      { label: 'Years in Current Job', value: (() => {
                        const cur = (detailData.employment || []).find((e: any) => e.is_current);
                        if (!cur?.start_date) return '';
                        const start = new Date(cur.start_date);
                        const now = new Date();
                        const months = (now.getFullYear() - start.getFullYear()) * 12 + now.getMonth() - start.getMonth();
                        if (months < 1) return 'Less than a month';
                        const yrs = Math.floor(months / 12);
                        const m = months % 12;
                        return yrs > 0 ? `${yrs} yr${yrs > 1 ? 's' : ''}${m > 0 ? ` ${m} mo${m > 1 ? 's' : ''}` : ''}` : `${months} mo${months > 1 ? 's' : ''}`;
                      })() },
                    ].map((item: any) => (
                      item.value ? (
                        <div key={item.label} className="flex justify-between py-1 border-b border-gray-50">
                          <span className="text-gray-500">{item.label}</span>
                          {item.badge ? (
                            <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded-full ${statusBadge(item.badge)}`}>{normalizeStatus(item.badge)}</span>
                          ) : (
                            <span className="font-medium text-gray-800 text-right max-w-[60%] truncate">{item.value}</span>
                          )}
                        </div>
                      ) : null
                    ))}
                  </div>
                </div>

                {/* Career Timeline */}
                {detailData.employment?.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Career Timeline</h3>
                    <div className="space-y-2">
                      {detailData.employment.map((emp: any, i: number) => (
                        <div key={i} className="text-xs bg-gray-50 px-3 py-2">
                          <div className="flex items-center gap-1.5">
                            {emp.start_date && <span className="text-gray-400">{new Date(emp.start_date).getFullYear()}</span>}
                            <span className="text-gray-300">·</span>
                            <p className="font-medium text-gray-800">{emp.position || 'N/A'}</p>
                            {emp.is_current && <span className="text-[10px] px-1 py-0.5 bg-emerald-100 text-emerald-700 font-medium">Current</span>}
                          </div>
                          <p className="text-gray-500 mt-0.5">
                            {emp.company_name && `${emp.company_name}`}{emp.company_industry ? ` · ${emp.company_industry}` : ''}
                          </p>
                          {emp.start_date && (
                            <p className="text-gray-400 mt-0.5">
                              {new Date(emp.start_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })}
                              {' — '}
                              {emp.is_current ? 'Present' : emp.end_date ? new Date(emp.end_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' }) : ''}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Employment History Table */}
                {detailData.employment?.length > 0 && (
                  <div className="mb-4 overflow-x-auto">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Employment History</h3>
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-gray-50 text-gray-500 text-left">
                          <th className="px-2 py-1.5 font-medium">Industry</th>
                          <th className="px-2 py-1.5 font-medium">Company</th>
                          <th className="px-2 py-1.5 font-medium">Position</th>
                          <th className="px-2 py-1.5 font-medium">Type</th>
                          <th className="px-2 py-1.5 font-medium">Salary</th>
                          <th className="px-2 py-1.5 font-medium">Started</th>
                          <th className="px-2 py-1.5 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailData.employment.map((emp: any, i: number) => (
                          <tr key={i} className="border-b border-gray-100">
                            <td className="px-2 py-1.5 text-gray-700">{emp.company_industry || '---'}</td>
                            <td className="px-2 py-1.5 text-gray-700">{emp.company_name || '---'}</td>
                            <td className="px-2 py-1.5 text-gray-700 font-medium">{emp.position || '---'}</td>
                            <td className="px-2 py-1.5 text-gray-700">{emp.job_type || '---'}</td>
                            <td className="px-2 py-1.5 text-gray-700">{emp.salary_range ? `₱${emp.salary_range}` : '---'}</td>
                            <td className="px-2 py-1.5 text-gray-700">{emp.start_date ? new Date(emp.start_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' }) : '---'}</td>
                            <td className="px-2 py-1.5">{emp.is_current ? <span className="text-emerald-600 font-medium">Current</span> : <span className="text-gray-400">Past</span>}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Education */}
                {detailData.education?.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Education</h3>
                    <div className="space-y-2">
                      {detailData.education.map((edu: any, i: number) => (
                        <div key={i} className="text-xs bg-gray-50 px-3 py-2">
                          <p className="font-medium text-gray-800">{edu.program || edu.course || 'N/A'}</p>
                          <p className="text-gray-500 mt-0.5">
                            {[edu.institution, edu.campus].filter(Boolean).join(' - ')}
                          </p>
                          {edu.year_graduated && <p className="text-gray-400 mt-0.5">Class of {edu.year_graduated}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Skills */}
                {detailData.skills?.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Skills</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {detailData.skills.map((s: any, i: number) => (
                        <span key={i} className="px-2 py-1 bg-orange-50 text-orange-700 text-[10px] font-medium">{s.name}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Bio */}
                {detailData.profile?.bio && (
                  <div className="mb-4">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">About</h3>
                    <p className="text-xs text-gray-600 leading-relaxed">{detailData.profile.bio}</p>
                  </div>
                )}
              </div>

              {/* Right panel - 30% */}
              <div className="w-full md:w-[30%] p-6 bg-gray-50">
                {/* Avatar */}
                <div className="flex flex-col items-center mb-4">
                  <div className="w-20 h-20 rounded-full bg-orange-100 flex items-center justify-center text-xl font-bold text-orange-600 mb-2">
                    {detailData.profile?.avatar_url ? (
                      <img src={detailData.profile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      ((detailData.profile?.first_name?.[0] || '') + (detailData.profile?.last_name?.[0] || '')).toUpperCase()
                    )}
                  </div>
                  <p className="text-sm font-bold text-gray-900 text-center">{detailData.profile?.first_name} {detailData.profile?.last_name}</p>
                  <p className="text-xs text-gray-500 text-center">{detailData.profile?.id_number || ''}</p>
                </div>

                {/* Personal Information */}
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Personal Information</h3>
                  {editingDetail ? (
                    <div className="space-y-2 text-xs">
                      <div><label className="text-gray-500 block mb-0.5">Email</label><input type="email" value={editForm.email} onChange={(e) => setEditForm((f: any) => ({ ...f, email: e.target.value }))} className="w-full border border-gray-200 px-2 py-1 outline-none focus:border-orange-400 text-xs" /></div>
                      <div><label className="text-gray-500 block mb-0.5">ID Number</label><input type="text" value={editForm.id_number} onChange={(e) => setEditForm((f: any) => ({ ...f, id_number: e.target.value }))} className="w-full border border-gray-200 px-2 py-1 outline-none focus:border-orange-400 text-xs" placeholder="e.g. CTU-2020-0001" /></div>
                      <div><label className="text-gray-500 block mb-0.5">Phone</label><input type="text" value={editForm.phone} onChange={(e) => setEditForm((f: any) => ({ ...f, phone: e.target.value }))} className="w-full border border-gray-200 px-2 py-1 outline-none focus:border-orange-400 text-xs" /></div>
                      <div><label className="text-gray-500 block mb-0.5">City</label><input type="text" value={editForm.city} onChange={(e) => setEditForm((f: any) => ({ ...f, city: e.target.value }))} className="w-full border border-gray-200 px-2 py-1 outline-none focus:border-orange-400 text-xs" /></div>
                      <div><label className="text-gray-500 block mb-0.5">Province</label><input type="text" value={editForm.province} onChange={(e) => setEditForm((f: any) => ({ ...f, province: e.target.value }))} className="w-full border border-gray-200 px-2 py-1 outline-none focus:border-orange-400 text-xs" /></div>
                      <div><label className="text-gray-500 block mb-0.5">Course</label>
                        <select value={editForm.program} onChange={(e) => setEditForm((f: any) => ({ ...f, program: e.target.value }))} className="w-full border border-gray-200 px-2 py-1 outline-none focus:border-orange-400 text-xs">
                          <option value="">Select</option>
                          {['BSIT', 'BIT', 'BEEd', 'BSEd-Math', 'BTLED-HE', 'BTLED-ICT'].map((o) => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </div>
                      <div><label className="text-gray-500 block mb-0.5">Year Graduated</label><input type="number" value={editForm.year_graduated} onChange={(e) => setEditForm((f: any) => ({ ...f, year_graduated: e.target.value }))} className="w-full border border-gray-200 px-2 py-1 outline-none focus:border-orange-400 text-xs" min={2014} /></div>
                    </div>
                  ) : (
                    <div className="space-y-2 text-xs">
                      {[
                        { label: 'Email', value: detailData.email },
                        { label: 'ID Number', value: detailData.profile?.id_number },
                        { label: 'Phone', value: detailData.profile?.phone },
                        { label: 'City', value: detailData.profile?.city },
                        { label: 'Province', value: detailData.profile?.province },
                      { label: 'Employment Status', value: detailData.profile?.employment_status, badge: detailData.profile?.employment_status },
                        { label: 'Joined', value: detailData.created_at ? new Date(detailData.created_at).toLocaleDateString() : '---' },
                      ].map((item) => (
                        <div key={item.label} className="flex justify-between py-1 border-b border-gray-200 last:border-0">
                          <span className="text-gray-500">{item.label}</span>
                          <span className="font-medium text-gray-800 text-right max-w-[55%] truncate">{item.value || '---'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-lg max-w-lg w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-sm font-bold text-gray-900 mb-4">Add Alumni</h2>
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div><label className="block text-xs font-medium text-gray-700 mb-0.5">First Name</label><input type="text" value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} className="w-full text-xs border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-orange-400" required /></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-0.5">Last Name</label><input type="text" value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} className="w-full text-xs border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-orange-400" required /></div>
              </div>
              <div><label className="block text-xs font-medium text-gray-700 mb-0.5">Email</label><input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className="w-full text-xs border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-orange-400" required /></div>
              <div><label className="block text-xs font-medium text-gray-700 mb-0.5">ID Number</label><input type="text" value={form.idNumber} onChange={(e) => setForm((f) => ({ ...f, idNumber: e.target.value }))} className="w-full text-xs border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-orange-400" placeholder="e.g. CTU-2020-0001" /></div>
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