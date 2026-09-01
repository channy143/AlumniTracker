import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '@/services/api';
import { useUIStore } from '@/store/uiStore';
import { BriefcaseIcon, MapPinIcon, CalendarDaysIcon, ClockIcon, CurrencyDollarIcon, BuildingOfficeIcon, UserGroupIcon, DocumentTextIcon, XMarkIcon } from '@heroicons/react/24/outline';

const EMPTY_FORM = {
  company_name: '', position: '', description: '', location: '', job_type: 'full-time',
  salary_range: '', industry: '', experience_level: 'entry', required_skills: '',
  application_url: '', is_alumni_exclusive: false, is_remote: false, expires_at: '',
};

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'reviewed', label: 'Reviewed' },
  { value: 'shortlisted', label: 'Shortlisted' },
  { value: 'accepted', label: 'Qualified / Accepted' },
  { value: 'rejected', label: 'Rejected' },
];

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  reviewed: 'bg-blue-100 text-blue-700',
  shortlisted: 'bg-purple-100 text-purple-700',
  accepted: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
};

function daysLeft(expiresAt: string): number {
  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000));
}

function statusLabel(status?: string): string {
  return STATUS_OPTIONS.find((s) => s.value === status)?.label || 'Pending';
}

export default function JobManagement() {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<any>({ ...EMPTY_FORM });
  const [formError, setFormError] = useState('');
  const addNotification = useUIStore((s) => s.addNotification);
  const limit = 15;

  const [applicantsJob, setApplicantsJob] = useState<any>(null);
  const [applicants, setApplicants] = useState<any[]>([]);
  const [applicantsLoading, setApplicantsLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

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

  const openCreate = () => {
    setEditId(null);
    setForm({ ...EMPTY_FORM });
    setFormError('');
    setShowForm(true);
  };

  const openEdit = (job: any) => {
    setEditId(job.id);
    setForm({
      company_name: job.company_name || '',
      position: job.position || '',
      description: job.description || '',
      location: job.location || '',
      job_type: job.job_type || 'full-time',
      salary_range: job.salary_range || '',
      industry: job.industry || '',
      experience_level: job.experience_level || 'entry',
      required_skills: (job.required_skills || []).join(', '),
      application_url: job.application_url || '',
      is_alumni_exclusive: !!job.is_alumni_exclusive,
      is_remote: !!job.is_remote,
      expires_at: job.expires_at ? job.expires_at.slice(0, 10) : '',
    });
    setFormError('');
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        required_skills: form.required_skills ? form.required_skills.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
        expires_at: form.expires_at ? new Date(form.expires_at + 'T23:59:59').toISOString() : undefined,
      };
      if (editId) await adminApi.jobUpdate(editId, payload);
      else await adminApi.jobCreate(payload);
      setShowForm(false);
      setEditId(null);
      setForm({ ...EMPTY_FORM });
      addNotification(editId ? 'Job updated successfully' : 'Job posted successfully', 'success');
      load();
    } catch (err: any) { setFormError(err.message || 'Failed to save job'); }
  };

  const handleClose = async (id: string) => {
    if (!window.confirm('Close this job posting? It will no longer appear on the alumni career hub.')) return;
    try {
      await adminApi.jobClose(id);
      addNotification('Job posting closed', 'success');
      load();
    } catch { addNotification('Failed to close job', 'error'); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this job posting? This cannot be undone.')) return;
    try {
      await adminApi.jobDelete(id);
      addNotification('Job deleted', 'success');
      load();
    } catch { addNotification('Failed to delete job', 'error'); }
  };

  const setField = (key: string) => (e: any) => setForm((f: any) => ({ ...f, [key]: e.target.value }));
  const toggleField = (key: string) => (e: any) => setForm((f: any) => ({ ...f, [key]: e.target.checked }));

  const openApplicants = async (job: any) => {
    setApplicantsJob(job);
    setApplicants([]);
    setApplicantsLoading(true);
    try {
      const res = await adminApi.jobApplicants(job.id);
      setApplicants(Array.isArray(res) ? res : []);
    } catch { addNotification('Failed to load applicants', 'error'); }
    finally { setApplicantsLoading(false); }
  };

  const handleStatusChange = async (applicationId: string, status: string) => {
    setUpdatingId(applicationId);
    try {
      await adminApi.jobUpdateApplicantStatus(applicationId, status);
      setApplicants((prev) => prev.map((a) => (a.id === applicationId ? { ...a, status } : a)));
      addNotification(`Application marked as ${statusLabel(status)}`, 'success');
    } catch { addNotification('Failed to update application status', 'error'); }
    finally { setUpdatingId(null); }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <div>
          <h1 className="text-base font-bold text-gray-900">Career Opportunities</h1>
          <p className="text-xs text-gray-500">{total} job listing{total === 1 ? '' : 's'}</p>
        </div>
        <button onClick={openCreate} className="px-3 py-1.5 text-xs font-medium bg-orange-500 text-white rounded-lg hover:bg-orange-600">+ Post Opportunity</button>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search jobs..." className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-orange-400 w-48" />
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-orange-400">
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="bg-white border border-gray-200 rounded-lg animate-pulse h-20" />)}</div>
      ) : data.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg text-center py-12">
          <BriefcaseIcon className="w-8 h-8 mx-auto text-gray-300 mb-2" />
          <p className="text-xs text-gray-400">No job postings found for now.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {data.map((job: any) => {
            const isExpired = new Date(job.expires_at) < new Date();
            const dLeft = daysLeft(job.expires_at);
            return (
              <div key={job.id} className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-center gap-3 hover:border-orange-200 hover:shadow-sm transition-all">
                <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-sm font-bold text-white shrink-0 overflow-hidden">
                  {job.company_logo ? (
                    <img src={job.company_logo} alt="" className="w-full h-full object-cover" />
                  ) : (
                    (job.company_name?.charAt(0) || '?').toUpperCase()
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-gray-900 truncate">{job.position}</p>
                    {job.is_alumni_exclusive && <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700">Alumni Exclusive</span>}
                    {job.is_remote && <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700">Remote</span>}
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${isExpired ? 'bg-gray-100 text-gray-600' : 'bg-emerald-50 text-emerald-700'}`}>
                      {isExpired ? 'Expired' : `${dLeft} day${dLeft === 1 ? '' : 's'} left`}
                    </span>
                  </div>

                  <p className="text-xs text-gray-500 truncate mt-0.5">{job.company_name}</p>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-[11px] text-gray-400">
                    {job.location && <span className="flex items-center gap-1"><MapPinIcon className="w-3 h-3" />{job.location}</span>}
                    <span className="flex items-center gap-1"><BriefcaseIcon className="w-3 h-3" />{job.job_type}</span>
                    {job.industry && <span className="flex items-center gap-1"><BuildingOfficeIcon className="w-3 h-3" />{job.industry}</span>}
                    {job.experience_level && <span className="flex items-center gap-1"><ClockIcon className="w-3 h-3" />{job.experience_level}</span>}
                    {job.salary_range && <span className="flex items-center gap-1"><CurrencyDollarIcon className="w-3 h-3" />{job.salary_range}</span>}
                    <span className="flex items-center gap-1"><CalendarDaysIcon className="w-3 h-3" />Expires {job.expires_at ? new Date(job.expires_at).toLocaleDateString() : 'N/A'}</span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1 shrink-0">
                  <div className="flex gap-2 flex-wrap justify-end">
                    <button onClick={() => openApplicants(job)} className="text-xs text-gray-700 hover:underline font-medium flex items-center gap-1">
                      <UserGroupIcon className="w-3.5 h-3.5" /> Applicants
                    </button>
                    <button onClick={() => openEdit(job)} className="text-xs text-gray-600 hover:underline font-medium">Edit</button>
                    {!isExpired && <button onClick={() => handleClose(job.id)} className="text-xs text-orange-600 hover:underline font-medium">Close</button>}
                    <button onClick={() => handleDelete(job.id)} className="text-xs text-red-600 hover:underline font-medium">Delete</button>
                  </div>
                  <div className="flex gap-2">
                    {typeof job.referral_count === 'number' && (
                      <span className="text-[10px] text-gray-400">{job.referral_count} referral{job.referral_count === 1 ? '' : 's'}</span>
                    )}
                    {typeof job.applicant_count === 'number' && job.applicant_count > 0 && (
                      <span className="text-[10px] text-gray-400">{job.applicant_count} applicant{job.applicant_count === 1 ? '' : 's'}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {total > limit && (
        <div className="flex items-center justify-center gap-3 mt-4">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 text-xs font-medium bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-40">Prev</button>
          <span className="text-xs text-gray-500">Page {page} of {Math.ceil(total / limit)}</span>
          <button onClick={() => setPage((p) => p + 1)} disabled={page >= Math.ceil(total / limit)} className="px-3 py-1 text-xs font-medium bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-40">Next</button>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-xl max-w-lg w-full p-6 overflow-y-auto max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-sm font-bold text-gray-900 mb-4">{editId ? 'Edit Job Opportunity' : 'Post a Job Opportunity'}</h2>
            {formError && <div className="bg-red-50 text-red-700 px-3 py-2 rounded-lg mb-3 text-xs">{formError}</div>}
            <form onSubmit={handleSave} className="space-y-3">
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Company Name *</label><input type="text" value={form.company_name} onChange={setField('company_name')} className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-orange-400 w-full" required /></div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Position *</label><input type="text" value={form.position} onChange={setField('position')} className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-orange-400 w-full" required /></div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Description *</label><textarea value={form.description} onChange={setField('description')} className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-orange-400 w-full" rows={3} required /></div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Location *</label><input type="text" value={form.location} onChange={setField('location')} className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-orange-400 w-full" required /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Job Type</label><select value={form.job_type} onChange={setField('job_type')} className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-orange-400 w-full"><option value="full-time">Full-Time</option><option value="part-time">Part-Time</option><option value="contract">Contract</option><option value="freelance">Freelance</option><option value="internship">Internship</option></select></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Experience Level</label><select value={form.experience_level} onChange={setField('experience_level')} className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-orange-400 w-full"><option value="entry">Entry</option><option value="junior">Junior</option><option value="mid">Mid-Level</option><option value="senior">Senior</option><option value="lead">Lead</option><option value="executive">Executive</option></select></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Industry</label><input type="text" value={form.industry} onChange={setField('industry')} className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-orange-400 w-full" placeholder="e.g. Technology" /></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Salary Range</label><input type="text" value={form.salary_range} onChange={setField('salary_range')} className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-orange-400 w-full" placeholder="e.g. ₱20k-₱40k" /></div>
              </div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Required Skills (comma separated)</label><input type="text" value={form.required_skills} onChange={setField('required_skills')} className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-orange-400 w-full" placeholder="e.g. JavaScript, Python, SQL" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-gray-700 mb-1">External Application URL</label><input type="url" value={form.application_url} onChange={setField('application_url')} className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-orange-400 w-full" placeholder="https://company.com/careers" /></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Expiry Date</label><input type="date" value={form.expires_at} onChange={setField('expires_at')} className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-orange-400 w-full" /></div>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" checked={form.is_alumni_exclusive} onChange={toggleField('is_alumni_exclusive')} className="w-3.5 h-3.5 rounded border-gray-300 text-orange-500" /><span className="text-xs text-gray-500">Alumni Exclusive</span></label>
                <label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" checked={form.is_remote} onChange={toggleField('is_remote')} className="w-3.5 h-3.5 rounded border-gray-300 text-orange-500" /><span className="text-xs text-gray-500">Remote</span></label>
              </div>
              <div className="flex gap-2 justify-end pt-1">
                <button type="button" onClick={() => setShowForm(false)} className="px-3 py-1.5 text-xs font-medium bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">Cancel</button>
                <button type="submit" className="px-3 py-1.5 text-xs font-medium bg-orange-500 text-white rounded-lg hover:bg-orange-600">{editId ? 'Update Job' : 'Post Job'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {applicantsJob && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setApplicantsJob(null)}>
          <div className="bg-white rounded-xl max-w-2xl w-full flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-sm font-bold text-gray-900">Applicants — {applicantsJob.position}</h2>
                <p className="text-xs text-gray-500">{applicantsJob.company_name}</p>
              </div>
              <button onClick={() => setApplicantsJob(null)} className="text-gray-400 hover:text-gray-600"><XMarkIcon className="w-5 h-5" /></button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {applicantsLoading ? (
                <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="bg-gray-100 rounded-lg animate-pulse h-16" />)}</div>
              ) : applicants.length === 0 ? (
                <div className="text-center py-12">
                  <UserGroupIcon className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                  <p className="text-xs text-gray-400">No applicants yet for this opportunity.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {applicants.map((app: any) => (
                    <div key={app.id} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-orange-500/15 flex items-center justify-center text-xs font-bold text-orange-600 shrink-0 uppercase">
                            {(app.applicant_name || '?').charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{app.applicant_name || 'Applicant'}</p>
                            <p className="text-[11px] text-gray-500">Applied {new Date(app.applied_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_COLORS[app.status] || STATUS_COLORS.pending}`}>
                            {statusLabel(app.status)}
                          </span>
                        </div>
                      </div>

                      {app.cover_letter && (
                        <p className="text-xs text-gray-600 mt-2 bg-gray-50 rounded-lg p-2 line-clamp-3">{app.cover_letter}</p>
                      )}

                      <div className="flex items-center justify-between gap-3 mt-2 flex-wrap">
                        <div className="flex items-center gap-3 text-xs">
                          {app.resume_url ? (
                            <a href={app.resume_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-orange-600 hover:underline font-medium">
                              <DocumentTextIcon className="w-3.5 h-3.5" /> View Resume
                            </a>
                          ) : (
                            <span className="text-gray-400 text-[11px]">No resume</span>
                          )}
                          {app.applicant_email && <a href={`mailto:${app.applicant_email}`} className="text-gray-500 hover:underline">{app.applicant_email}</a>}
                        </div>
                        <select
                          value={app.status}
                          disabled={updatingId === app.id}
                          onChange={(e) => handleStatusChange(app.id, e.target.value)}
                          className="text-xs border border-gray-200 rounded-lg px-2 py-1 outline-none focus:border-orange-400 disabled:opacity-50"
                        >
                          {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
