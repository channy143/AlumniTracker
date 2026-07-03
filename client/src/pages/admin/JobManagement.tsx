import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '@/services/api';
import { useUIStore } from '@/store/uiStore';

export default function JobManagement() {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [applicants, setApplicants] = useState<any[] | null>(null);
  const addNotification = useUIStore((s) => s.addNotification);
  const limit = 15;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.jobList({ page, limit, search, status });
      setData(res.data);
      setTotal(res.total);
    } catch { addNotification('Failed to load jobs', 'error'); }
    finally { setLoading(false); }
  }, [page, search, status]);

  useEffect(() => { load(); }, [load]);

  const handleClose = async (id: string) => {
    await adminApi.jobClose(id);
    addNotification('Job posting closed', 'success');
    load();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this job posting?')) return;
    await adminApi.jobDelete(id);
    addNotification('Job deleted', 'success');
    load();
  };

  const handleViewApplicants = async (id: string) => {
    try {
      const res = await adminApi.jobApplicants(id);
      setApplicants(res);
    } catch { addNotification('Failed to load applicants', 'error'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="section-title">Job Management</h1>
          <p className="text-gray-500 mt-1">{total} job postings</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search jobs..." className="input-field max-w-xs text-sm" />
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="input-field text-sm max-w-[130px]">
          <option value="">All</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="card animate-pulse h-16" />)}</div>
      ) : data.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">No jobs found</div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Position</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Company</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Location</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Type</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Expires</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Posted By</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.map((job: any) => {
                  const isExpired = new Date(job.expires_at) < new Date();
                  return (
                    <tr key={job.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium text-ctu-charcoal">{job.position}</td>
                      <td className="py-3 px-4 text-gray-500">{job.company_name}</td>
                      <td className="py-3 px-4 text-gray-500">{job.location}</td>
                      <td className="py-3 px-4"><span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">{job.job_type}</span></td>
                      <td className="py-3 px-4 text-xs text-gray-400">{new Date(job.expires_at).toLocaleDateString()}</td>
                      <td className="py-3 px-4 text-xs text-gray-400">{job.profiles?.first_name} {job.profiles?.last_name}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex gap-1 justify-end">
                          {!isExpired && <button onClick={() => handleClose(job.id)} className="text-xs text-orange-600 hover:underline px-1">Close</button>}
                          <button onClick={() => handleViewApplicants(job.id)} className="text-xs text-ctu-blue hover:underline px-1">Applicants</button>
                          <button onClick={() => handleDelete(job.id)} className="text-xs text-red-600 hover:underline px-1">Delete</button>
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

      {applicants !== null && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setApplicants(null)}>
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[80vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-ctu-charcoal">Applicants ({applicants.length})</h2>
              <button onClick={() => setApplicants(null)} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            {applicants.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">No applicants yet</p>
            ) : (
              <div className="space-y-3">
                {applicants.map((app: any) => (
                  <div key={app.id} className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <div>
                      <p className="text-sm font-medium">{app.user?.profile?.first_name} {app.user?.profile?.last_name}</p>
                      <p className="text-xs text-gray-400">{app.user?.email}</p>
                    </div>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${app.status === 'pending' ? 'bg-yellow-50 text-yellow-700' : app.status === 'accepted' ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-600'}`}>
                      {app.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
