import { useState, useEffect, useCallback, useMemo } from 'react';
import { adminApi, jobsApi } from '@/services/api';
import { useUIStore } from '@/store/uiStore';
import {
  BriefcaseIcon,
  MapPinIcon,
  CalendarDaysIcon,
  ClockIcon,
  CurrencyDollarIcon,
  BuildingOfficeIcon,
  UserGroupIcon,
  PencilSquareIcon,
  TrashIcon,
  XCircleIcon,
  CheckCircleIcon,
  SparklesIcon,
  MagnifyingGlassIcon,
  TagIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import ApplicantScreeningModal from '@/components/admin/ApplicantScreeningModal';

const EMPTY_FORM = {
  employer_id: '', company_name: '', position: '', description: '', location: '', job_type: 'full-time',
  salary_range: '', industry: '', experience_level: 'entry', required_skills: [] as string[],
  application_url: '', is_alumni_exclusive: false, is_remote: false, expires_at: '',
};

function daysLeft(expiresAt: string): number {
  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000));
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
  const [employers, setEmployers] = useState<any[]>([]);
  const [showNewEmployer, setShowNewEmployer] = useState(false);
  const [newEmployer, setNewEmployer] = useState({ company_name: '', industry: '', contact_person: '', contact_email: '' });
  const [creatingEmployer, setCreatingEmployer] = useState(false);
  const [availableSkills, setAvailableSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const addNotification = useUIStore((s) => s.addNotification);
  const limit = 15;

  const [screeningJob, setScreeningJob] = useState<any>(null);

  const stats = useMemo(() => {
    const activeCount = data.filter((j) => new Date(j.expires_at).getTime() >= Date.now()).length;
    const totalApplicants = data.reduce((acc, j) => acc + (Number(j.applicant_count) || 0), 0);
    return {
      totalPostings: total,
      activePostings: activeCount,
      totalApplicants,
      totalEmployers: employers.length,
    };
  }, [data, total, employers]);

  const loadEmployers = async () => {
    try {
      const list: any = await adminApi.employersList();
      setEmployers(Array.isArray(list) ? list : []);
    } catch {
      setEmployers([]);
    }
  };

  const loadSkills = async () => {
    try {
      const list: any = await jobsApi.skills();
      setAvailableSkills(Array.isArray(list) ? list : []);
    } catch {
      setAvailableSkills([]);
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.jobList({ page, limit, search, status });
      setData(res.data);
      setTotal(res.total);
    } catch { addNotification('Failed to load jobs', 'error'); }
    finally { setLoading(false); }
  }, [page, search, status]);

  useEffect(() => {
    load();
    loadEmployers();
    loadSkills();
  }, [load]);

  const handleCreateEmployer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmployer.company_name.trim()) return;
    setCreatingEmployer(true);
    try {
      const created: any = await adminApi.createEmployer(newEmployer);
      setEmployers((prev) => [created, ...prev]);
      setForm((f: any) => ({
        ...f,
        employer_id: created.id,
        company_name: created.company_name,
        industry: created.industry || f.industry,
      }));
      setShowNewEmployer(false);
      setNewEmployer({ company_name: '', industry: '', contact_person: '', contact_email: '' });
      addNotification('Employer created successfully', 'success');
    } catch (err: any) {
      addNotification(err.message || 'Failed to create employer', 'error');
    } finally {
      setCreatingEmployer(false);
    }
  };

  const openCreate = () => {
    setEditId(null);
    setForm({ ...EMPTY_FORM });
    setFormError('');
    setShowNewEmployer(false);
    setSkillInput('');
    setShowForm(true);
  };

  const openEdit = (job: any) => {
    setEditId(job.id);
    setForm({
      employer_id: job.employer_id || '',
      company_name: job.company_name || '',
      position: job.position || '',
      description: job.description || '',
      location: job.location || '',
      job_type: job.job_type || 'full-time',
      salary_range: job.salary_range || '',
      industry: job.industry || '',
      experience_level: job.experience_level || 'entry',
      required_skills: Array.isArray(job.required_skills) ? [...job.required_skills] : [],
      application_url: job.application_url || '',
      is_alumni_exclusive: !!job.is_alumni_exclusive,
      is_remote: !!job.is_remote,
      expires_at: job.expires_at ? job.expires_at.slice(0, 10) : '',
    });
    setFormError('');
    setShowNewEmployer(false);
    setSkillInput('');
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        required_skills: form.required_skills,
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
    if (!window.confirm('Close this job posting? It will no longer appear on the alumni job postings.')) return;
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

  const openScreening = (job: any) => {
    setScreeningJob(job);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-1">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Career Opportunities</h1>
          <p className="text-xs text-gray-500 mt-0.5">Manage employer job listings, track applicant pipelines, and screen candidates.</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-orange-500 text-white rounded-lg hover:bg-orange-600 active:bg-orange-700 shadow-xs hover:shadow transition-all"
        >
          <PlusIcon className="w-4 h-4" />
          <span>Post Opportunity</span>
        </button>
      </div>

      {/* Overview KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-gray-200/80 rounded-xl p-3.5 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600 shrink-0">
            <BriefcaseIcon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-gray-500">Total Postings</p>
            <p className="text-lg font-bold text-gray-900 leading-tight">{total}</p>
          </div>
        </div>

        <div className="bg-white border border-gray-200/80 rounded-xl p-3.5 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
            <CheckCircleIcon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-gray-500">Active Listings</p>
            <p className="text-lg font-bold text-emerald-700 leading-tight">{stats.activePostings}</p>
          </div>
        </div>

        <div className="bg-white border border-gray-200/80 rounded-xl p-3.5 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
            <UserGroupIcon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-gray-500">Total Candidates</p>
            <p className="text-lg font-bold text-blue-700 leading-tight">{stats.totalApplicants}</p>
          </div>
        </div>

        <div className="bg-white border border-gray-200/80 rounded-xl p-3.5 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shrink-0">
            <BuildingOfficeIcon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-gray-500">Registered Employers</p>
            <p className="text-lg font-bold text-purple-700 leading-tight">{stats.totalEmployers}</p>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white border border-gray-200/90 rounded-xl p-3 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by position, company, or skills..."
              className="text-xs border border-gray-200 rounded-lg pl-9 pr-3 py-2 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 w-full"
            />
          </div>
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="text-xs border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 bg-white text-gray-700 font-medium cursor-pointer"
          >
            <option value="">All Status</option>
            <option value="active">Active Only</option>
            <option value="expired">Expired Only</option>
          </select>
          {(search || status) && (
            <button
              onClick={() => { setSearch(''); setStatus(''); setPage(1); }}
              className="text-xs text-orange-600 hover:text-orange-700 font-medium px-2 py-1"
            >
              Reset Filters
            </button>
          )}
        </div>

        <div className="text-xs text-gray-500">
          Showing <span className="font-semibold text-gray-800">{data.length}</span> of <span className="font-semibold text-gray-800">{total}</span> opportunities
        </div>
      </div>

      {/* Job Cards List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-xl p-5 animate-pulse space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gray-200" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-gray-200 rounded w-1/3" />
                  <div className="h-3 bg-gray-200 rounded w-1/4" />
                </div>
              </div>
              <div className="h-3 bg-gray-100 rounded w-3/4" />
              <div className="h-8 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      ) : data.length === 0 ? (
        <div className="bg-white border border-gray-200/90 rounded-xl text-center py-14 px-4 shadow-2xs">
          <div className="w-14 h-14 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center mx-auto text-orange-500 mb-3">
            <BriefcaseIcon className="w-7 h-7" />
          </div>
          <h3 className="text-sm font-bold text-gray-900 mb-1">No Career Opportunities Found</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto mb-4">
            {search || status ? 'No job postings match your current filter criteria. Try resetting the filters.' : 'Get started by posting a new job opportunity for alumni.'}
          </p>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-orange-500 text-white rounded-lg hover:bg-orange-600 shadow-xs transition-all"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Post an Opportunity</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3.5">
          {data.map((job: any) => {
            const isExpired = new Date(job.expires_at) < new Date();
            const dLeft = daysLeft(job.expires_at);
            return (
              <div
                key={job.id}
                className="bg-white border border-gray-200/90 hover:border-orange-300 rounded-xl p-5 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col gap-3.5"
              >
                {/* Card Top: Avatar, Title, Company & Status/Badges */}
                <div className="flex items-start justify-between gap-3.5 flex-wrap sm:flex-nowrap">
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div
                      className="w-12 h-12 rounded-xl bg-orange-50 border border-orange-200/80 flex items-center justify-center font-bold text-orange-600 text-base shadow-2xs shrink-0 overflow-hidden"
                      title={job.company_name}
                    >
                      {job.profiles?.avatar_url ? (
                        <img src={job.profiles.avatar_url} alt={job.company_name} className="w-full h-full object-cover" />
                      ) : job.company_logo ? (
                        <img src={job.company_logo} alt={job.company_name} className="w-full h-full object-cover" />
                      ) : (
                        (job.company_name?.charAt(0) || '?').toUpperCase()
                      )}
                    </div>

                    <div className="min-w-0">
                      <h2
                        onClick={() => openEdit(job)}
                        className="text-base font-bold text-gray-900 leading-snug hover:text-orange-600 cursor-pointer transition-colors"
                      >
                        {job.position}
                      </h2>

                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-600 flex-wrap">
                        <span className="font-semibold text-gray-800 flex items-center gap-1">
                          <BuildingOfficeIcon className="w-3.5 h-3.5 text-gray-400" />
                          {job.company_name}
                        </span>
                        {job.industry && (
                          <>
                            <span className="text-gray-300">•</span>
                            <span className="text-gray-500 font-medium">{job.industry}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="flex items-center gap-1.5 flex-wrap sm:justify-end shrink-0">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        isExpired
                          ? 'bg-gray-100 text-gray-600 border border-gray-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      {!isExpired && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      )}
                      {isExpired ? 'Expired' : `${dLeft} day${dLeft === 1 ? '' : 's'} left`}
                    </span>

                    {job.is_alumni_exclusive && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                        <SparklesIcon className="w-3.5 h-3.5 text-amber-500" />
                        Alumni Exclusive
                      </span>
                    )}

                    {job.is_remote && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        Remote
                      </span>
                    )}

                    {job.job_type && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200 capitalize">
                        <BriefcaseIcon className="w-3 h-3 text-gray-400" />
                        {job.job_type}
                      </span>
                    )}
                  </div>
                </div>

                {/* Description Overview */}
                {job.description && (
                  <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                    {job.description}
                  </p>
                )}

                {/* Metadata Chips */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-gray-600">
                  {job.location && (
                    <span className="inline-flex items-center gap-1.5 text-gray-600 bg-gray-50 border border-gray-200/60 px-2.5 py-1 rounded-md">
                      <MapPinIcon className="w-3.5 h-3.5 text-gray-400" />
                      <span>{job.location}</span>
                    </span>
                  )}
                  {job.experience_level && (
                    <span className="inline-flex items-center gap-1.5 text-gray-600 bg-gray-50 border border-gray-200/60 px-2.5 py-1 rounded-md capitalize">
                      <ClockIcon className="w-3.5 h-3.5 text-gray-400" />
                      <span>{job.experience_level} Level</span>
                    </span>
                  )}
                  {job.salary_range && (
                    <span className="inline-flex items-center gap-1.5 text-emerald-700 bg-emerald-50/70 border border-emerald-200 px-2.5 py-1 rounded-md font-semibold">
                      <CurrencyDollarIcon className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{job.salary_range}</span>
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5 text-gray-500 bg-gray-50 border border-gray-200/60 px-2.5 py-1 rounded-md">
                    <CalendarDaysIcon className="w-3.5 h-3.5 text-gray-400" />
                    <span>Expires {job.expires_at ? new Date(job.expires_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}</span>
                  </span>
                </div>

                {/* Required Skills Badges */}
                {Array.isArray(job.required_skills) && job.required_skills.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-medium text-gray-400 flex items-center gap-1 mr-1">
                      <TagIcon className="w-3 h-3 text-gray-400" /> Required Skills:
                    </span>
                    {job.required_skills.slice(0, 5).map((skill: string, idx: number) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 text-[11px] font-medium bg-orange-50/80 text-orange-800 border border-orange-200/70 rounded-md"
                      >
                        {skill}
                      </span>
                    ))}
                    {job.required_skills.length > 5 && (
                      <span className="text-[10px] text-gray-400 font-medium px-1.5 py-0.5 bg-gray-100 rounded-md">
                        +{job.required_skills.length - 5} more
                      </span>
                    )}
                  </div>
                )}

                {/* Card Action Footer: Pipeline Counts (Left) & Unified Action Buttons (Right) */}
                <div className="border-t border-gray-100 pt-3 flex items-center justify-between flex-wrap gap-3 mt-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200/70 rounded-lg text-xs font-semibold">
                      <UserGroupIcon className="w-3.5 h-3.5 text-blue-600" />
                      <span>{job.applicant_count || 0} Candidate{job.applicant_count === 1 ? '' : 's'}</span>
                    </div>

                    {typeof job.referral_count === 'number' && job.referral_count > 0 && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-50 text-purple-700 border border-purple-200/70 rounded-lg text-xs font-medium">
                        {job.referral_count} Referral{job.referral_count === 1 ? '' : 's'}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => openScreening(job)}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 shadow-xs hover:shadow transition-all flex items-center gap-1.5"
                    >
                      <UserGroupIcon className="w-4 h-4" />
                      <span>Screen Applicants</span>
                      <span className="ml-0.5 px-1.5 py-0.2 bg-blue-700 rounded-full text-[10px] font-bold">
                        {job.applicant_count || 0}
                      </span>
                    </button>

                    <button
                      onClick={() => openEdit(job)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-900 transition-colors flex items-center gap-1"
                    >
                      <PencilSquareIcon className="w-3.5 h-3.5 text-gray-500" />
                      <span>Edit</span>
                    </button>

                    {!isExpired && (
                      <button
                        onClick={() => handleClose(job.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium text-amber-700 bg-amber-50/70 border border-amber-200 hover:bg-amber-100 hover:border-amber-300 transition-colors flex items-center gap-1"
                      >
                        <XCircleIcon className="w-3.5 h-3.5 text-amber-600" />
                        <span>Close</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleDelete(job.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 bg-white border border-gray-200 hover:bg-red-50 hover:border-red-200 hover:text-red-700 transition-colors flex items-center gap-1"
                    >
                      <TrashIcon className="w-3.5 h-3.5 text-red-500" />
                      <span>Delete</span>
                    </button>
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
              {/* Employer Selection */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-gray-700">Employer *</label>
                  <button
                    type="button"
                    onClick={() => setShowNewEmployer(!showNewEmployer)}
                    className="text-[11px] font-medium text-orange-600 hover:text-orange-700"
                  >
                    {showNewEmployer ? 'Cancel New Employer' : '+ Add New Employer'}
                  </button>
                </div>

                {showNewEmployer ? (
                  <div className="p-3 bg-orange-50/70 border border-orange-200 rounded-lg space-y-2 mb-2">
                    <p className="text-[11px] font-semibold text-orange-900">New Employer Information</p>
                    <input
                      type="text"
                      placeholder="Company Name *"
                      value={newEmployer.company_name}
                      onChange={(e) => setNewEmployer((ne) => ({ ...ne, company_name: e.target.value }))}
                      className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white w-full outline-none focus:border-orange-400"
                      required
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Industry (e.g. Technology)"
                        value={newEmployer.industry}
                        onChange={(e) => setNewEmployer((ne) => ({ ...ne, industry: e.target.value }))}
                        className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white w-full outline-none focus:border-orange-400"
                      />
                      <input
                        type="text"
                        placeholder="Contact Person"
                        value={newEmployer.contact_person}
                        onChange={(e) => setNewEmployer((ne) => ({ ...ne, contact_person: e.target.value }))}
                        className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white w-full outline-none focus:border-orange-400"
                      />
                    </div>
                    <input
                      type="email"
                      placeholder="Contact Email"
                      value={newEmployer.contact_email}
                      onChange={(e) => setNewEmployer((ne) => ({ ...ne, contact_email: e.target.value }))}
                      className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white w-full outline-none focus:border-orange-400"
                    />
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowNewEmployer(false)}
                        className="px-2.5 py-1 text-xs text-gray-600 bg-white border border-gray-200 rounded hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleCreateEmployer}
                        disabled={creatingEmployer || !newEmployer.company_name.trim()}
                        className="px-2.5 py-1 text-xs font-medium text-white bg-orange-500 rounded hover:bg-orange-600 disabled:opacity-50"
                      >
                        {creatingEmployer ? 'Saving...' : 'Save Employer'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <select
                      value={form.employer_id || ''}
                      onChange={(e) => {
                        const empId = e.target.value;
                        const found = employers.find((emp) => emp.id === empId);
                        setForm((f: any) => ({
                          ...f,
                          employer_id: empId,
                          company_name: found ? found.company_name : f.company_name,
                          industry: found?.industry || f.industry,
                        }));
                      }}
                      className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-orange-400 w-full bg-white"
                    >
                      <option value="">Select an Existing Employer (or type below)</option>
                      {employers.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.company_name} {emp.industry ? `(${emp.industry})` : ''}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="Company Name (auto-filled or custom) *"
                      value={form.company_name}
                      onChange={setField('company_name')}
                      className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-orange-400 w-full"
                      required
                    />
                  </div>
                )}
              </div>

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
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Required Skills</label>
                <div className="border border-gray-200 rounded-lg px-2 py-1.5 focus-within:ring-1 focus-within:ring-orange-400 focus-within:border-orange-400">
                  <div className="flex flex-wrap gap-1">
                    {form.required_skills.map((skill: string, index: number) => (
                      <span key={index} className="inline-flex items-center gap-1 bg-orange-100 text-orange-800 px-2 py-0.5 rounded text-xs font-medium">
                        {skill}
                        <button type="button" onClick={() => setForm((f: any) => ({ ...f, required_skills: f.required_skills.filter((_: string, i: number) => i !== index) }))} className="text-orange-500 hover:text-orange-700 text-sm leading-none">&times;</button>
                      </span>
                    ))}
                    <input
                      type="text"
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      placeholder={form.required_skills.length === 0 ? 'Type skill and press Enter...' : ''}
                      className="flex-1 min-w-[120px] outline-none text-xs p-0.5"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ',') {
                          e.preventDefault();
                          const value = skillInput.replace(/,/g, '').trim();
                          if (value && !form.required_skills.includes(value)) {
                            setForm((f: any) => ({ ...f, required_skills: [...f.required_skills, value] }));
                          }
                          setSkillInput('');
                        } else if (e.key === 'Backspace' && !skillInput && form.required_skills.length > 0) {
                          setForm((f: any) => ({ ...f, required_skills: f.required_skills.slice(0, -1) }));
                        }
                      }}
                    />
                  </div>

                  {/* Suggestions list */}
                  {skillInput.trim() && (
                    <div className="flex flex-wrap items-center gap-1 mt-1.5 pt-1.5 border-t border-gray-100">
                      <span className="text-[10px] text-gray-400 mr-1">Suggestions:</span>
                      {availableSkills
                        .filter((s) => s.toLowerCase().includes(skillInput.toLowerCase()) && !form.required_skills.includes(s))
                        .slice(0, 6)
                        .map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => {
                              setForm((f: any) => ({ ...f, required_skills: [...f.required_skills, s] }));
                              setSkillInput('');
                            }}
                            className="px-2 py-0.5 rounded text-[10px] bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200 transition-colors"
                          >
                            + {s}
                          </button>
                        ))}
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-gray-400 mt-1">Press Enter or comma to add. Backspace to remove last.</p>
              </div>
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
      {screeningJob && (
        <ApplicantScreeningModal
          isOpen={true}
          onClose={() => setScreeningJob(null)}
          jobId={screeningJob.id}
          jobPosition={screeningJob.position}
          requiredSkills={screeningJob.required_skills || []}
        />
      )}
    </div>
  );
}
