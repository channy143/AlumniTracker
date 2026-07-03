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
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ company_name: '', position: '', description: '', location: '', job_type: 'full-time', salary_range: '', industry: '', experience_level: 'entry', required_skills: '', application_url: '', is_alumni_exclusive: false, is_remote: false });
  const [formError, setFormError] = useState('');
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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adminApi.jobCreate({
        ...form,
        required_skills: form.required_skills ? form.required_skills.split(',').map((s: string) => s.trim()) : [],
      });
      setShowForm(false);
      setForm({ company_name: '', position: '', description: '', location: '', job_type: 'full-time', salary_range: '', industry: '', experience_level: 'entry', required_skills: '', application_url: '', is_alumni_exclusive: false, is_remote: false });
      addNotification('Job posted successfully', 'success');
      load();
    } catch (err: any) { setFormError(err.message); }
  };

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="section-title">Job Postings</h1>
          <p className="text-gray-500 mt-1">{total} active listings</p>
        </div>
        <button onClick={() => { setShowForm(true); setFormError(''); }} className="btn-primary text-sm">+ Post Opportunity</button>
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
        <div className="card text-center py-12 text-gray-400">No job postings found</div>
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
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Referrals</th>
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
                      <td className="py-3 px-4">
                        <span className="text-xs text-amber-600 font-medium">{job.referral_count || 0} referrals</span>
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-400">{new Date(job.expires_at).toLocaleDateString()}</td>
                      <td className="py-3 px-4 text-xs text-gray-400">{job.profiles?.first_name} {job.profiles?.last_name}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex gap-1 justify-end">
                          {!isExpired && <button onClick={() => handleClose(job.id)} className="text-xs text-orange-600 hover:underline px-1">Close</button>}
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

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-xl max-w-lg w-full p-6 overflow-y-auto max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-ctu-charcoal mb-6">Post a Job Opportunity</h2>
            {formError && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{formError}</div>}
            <form onSubmit={handleCreate} className="space-y-4">
              <div><label className="block text-sm font-medium text-ctu-charcoal mb-1">Company Name</label><input type="text" value={form.company_name} onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))} className="input-field" required /></div>
              <div><label className="block text-sm font-medium text-ctu-charcoal mb-1">Position</label><input type="text" value={form.position} onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))} className="input-field" required /></div>
              <div><label className="block text-sm font-medium text-ctu-charcoal mb-1">Description</label><textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="input-field" rows={3} required /></div>
              <div><label className="block text-sm font-medium text-ctu-charcoal mb-1">Location</label><input type="text" value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} className="input-field" required /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-ctu-charcoal mb-1">Job Type</label><select value={form.job_type} onChange={(e) => setForm((f) => ({ ...f, job_type: e.target.value }))} className="input-field"><option value="full-time">Full-Time</option><option value="part-time">Part-Time</option><option value="contract">Contract</option><option value="freelance">Freelance</option><option value="internship">Internship</option></select></div>
                <div><label className="block text-sm font-medium text-ctu-charcoal mb-1">Experience Level</label><select value={form.experience_level} onChange={(e) => setForm((f) => ({ ...f, experience_level: e.target.value }))} className="input-field"><option value="entry">Entry</option><option value="junior">Junior</option><option value="mid">Mid-Level</option><option value="senior">Senior</option><option value="lead">Lead</option><option value="executive">Executive</option></select></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-ctu-charcoal mb-1">Industry</label><input type="text" value={form.industry} onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))} className="input-field" placeholder="e.g. Technology" /></div>
                <div><label className="block text-sm font-medium text-ctu-charcoal mb-1">Salary Range</label><input type="text" value={form.salary_range} onChange={(e) => setForm((f) => ({ ...f, salary_range: e.target.value }))} className="input-field" placeholder="e.g. ₱20k-₱40k" /></div>
              </div>
              <div><label className="block text-sm font-medium text-ctu-charcoal mb-1">Required Skills (comma separated)</label><input type="text" value={form.required_skills} onChange={(e) => setForm((f) => ({ ...f, required_skills: e.target.value }))} className="input-field" placeholder="e.g. JavaScript, Python, SQL" /></div>
              <div><label className="block text-sm font-medium text-ctu-charcoal mb-1">External Application URL</label><input type="url" value={form.application_url} onChange={(e) => setForm((f) => ({ ...f, application_url: e.target.value }))} className="input-field" placeholder="https://company.com/careers" /></div>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.is_alumni_exclusive} onChange={(e) => setForm((f) => ({ ...f, is_alumni_exclusive: e.target.checked }))} className="w-4 h-4 rounded border-gray-300 text-ctu-blue" /><span className="text-sm text-gray-600">Alumni Exclusive</span></label>
                <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.is_remote} onChange={(e) => setForm((f) => ({ ...f, is_remote: e.target.checked }))} className="w-4 h-4 rounded border-gray-300 text-ctu-blue" /><span className="text-sm text-gray-600">Remote</span></label>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Post Job</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
