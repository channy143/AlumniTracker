import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  XMarkIcon,
  GlobeAltIcon,
  PhotoIcon,
  ArrowUpTrayIcon,
} from '@heroicons/react/24/outline';
import { SkeletonStatCard, SkeletonJobCard } from '@/components/ui/Skeleton';
import { getCached, buildQueryEndpoint } from '@/utils/apiCache';

const EMPTY_FORM = {
  employer_id: '', company_name: '', position: '', description: '', location: '', job_type: 'full-time',
  salary_range: '', industry: '', experience_level: 'entry', required_skills: [] as string[],
  application_url: '', poster_url: '', vacancies_count: 1, contact_email: '', contact_phone: '',
  is_alumni_exclusive: false, is_remote: false, expires_at: '',
};

function daysLeft(expiresAt: string): number {
  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000));
}

export default function JobManagement() {
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get('q') || '';
  const limit = 15;
  const initialJobsKey = buildQueryEndpoint('/admin/jobs', { page: 1, limit, search });
  const initialJobsRes = getCached<any>(initialJobsKey);
  const initialEmployers = getCached<any[]>('/admin/jobs/employers');
  const initialSkills = getCached<string[]>('/jobs/skills');

  const [data, setData] = useState<any[]>(initialJobsRes?.data ?? []);
  const [total, setTotal] = useState(initialJobsRes?.total ?? 0);
  const [loading, setLoading] = useState(!initialJobsRes);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<any>({ ...EMPTY_FORM });
  const [formError, setFormError] = useState('');
  const [employers, setEmployers] = useState<any[]>(Array.isArray(initialEmployers) ? initialEmployers : []);
  const [showNewEmployer, setShowNewEmployer] = useState(false);
  const [newEmployer, setNewEmployer] = useState({ company_name: '', industry: '', contact_person: '', contact_email: '' });
  const [creatingEmployer, setCreatingEmployer] = useState(false);
  const [availableSkills, setAvailableSkills] = useState<string[]>(Array.isArray(initialSkills) ? initialSkills : []);
  const [skillInput, setSkillInput] = useState('');
  const addNotification = useUIStore((s) => s.addNotification);

  const stats = useMemo(() => {
    const activeCount = data.filter((j) => new Date(j.expires_at).getTime() >= Date.now()).length;
    const totalVacancies = data.reduce((acc, j) => acc + (Number(j.vacancies_count) || 1), 0);
    return {
      totalPostings: total,
      activePostings: activeCount,
      totalVacancies,
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
    const cacheKey = buildQueryEndpoint('/admin/jobs', { page, limit, search, status });
    const cached = getCached<any>(cacheKey);
    if (cached) {
      setData(cached.data ?? []);
      setTotal(cached.total ?? 0);
      setLoading(false);
    } else {
      setLoading(true);
    }
    try {
      const res = await adminApi.jobList({ page, limit, search, status });
      setData(res.data);
      setTotal(res.total);
    } catch { if (!cached) addNotification('Failed to load jobs', 'error'); }
    finally { setLoading(false); }
  }, [page, search, status]);

  useEffect(() => {
    load();
    loadEmployers();
    loadSkills();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [search]);

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
      poster_url: job.poster_url || '',
      vacancies_count: job.vacancies_count ?? 1,
      contact_email: job.contact_email || '',
      contact_phone: job.contact_phone || '',
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
        vacancies_count: form.vacancies_count ? Number(form.vacancies_count) : 1,
        poster_url: form.poster_url?.trim() || null,
        contact_email: form.contact_email?.trim() || null,
        contact_phone: form.contact_phone?.trim() || null,
        application_url: form.application_url?.trim() || null,
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

  const [uploadingPoster, setUploadingPoster] = useState(false);

  const handlePosterUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      addNotification('Please select a valid image file (PNG, JPG, JPEG, WEBP)', 'error');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      addNotification('Poster file is too large (maximum size is 15MB)', 'error');
      return;
    }

    setUploadingPoster(true);
    try {
      const res = await adminApi.jobUploadPoster(file);
      if (res?.url) {
        setForm((f: any) => ({ ...f, poster_url: res.url }));
        addNotification('Hiring poster uploaded successfully', 'success');
      }
    } catch (err: any) {
      // Local fallback: convert to base64 data URL so it never fails
      try {
        const reader = new FileReader();
        reader.onload = (re) => {
          const dataUrl = re.target?.result as string;
          if (dataUrl) {
            setForm((f: any) => ({ ...f, poster_url: dataUrl }));
            addNotification('Poster image attached', 'success');
          }
        };
        reader.readAsDataURL(file);
      } catch {
        addNotification(err?.message || 'Failed to attach poster image', 'error');
      }
    } finally {
      setUploadingPoster(false);
      e.target.value = '';
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-1">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Career Opportunities</h1>
          <p className="text-xs text-gray-500 mt-0.5">Manage employer job listings, available vacancies, and external application channels.</p>
        </div>
        <div data-tour="jobs-header-actions">
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-orange-500 text-white rounded-lg hover:bg-orange-600 active:bg-orange-700 shadow-xs hover:shadow transition-all"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Post Opportunity</span>
          </button>
        </div>
      </div>

      {/* Overview KPI Cards */}
      <div data-tour="jobs-kpi-grid" className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {loading ? (
          [1, 2, 3, 4].map((i) => <SkeletonStatCard key={i} className="p-3.5" />)
        ) : (
          <>
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
                <p className="text-[11px] font-medium text-gray-500">Available Vacancies</p>
                <p className="text-lg font-bold text-blue-700 leading-tight">{stats.totalVacancies}</p>
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
          </>
        )}
      </div>

      {/* Filter Bar */}
      <div data-tour="jobs-filters" className="bg-white border border-gray-200/90 rounded-xl p-3 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {search && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 border border-orange-200 rounded-lg text-xs text-orange-800 font-medium shrink-0">
              <MagnifyingGlassIcon className="w-3.5 h-3.5 text-orange-600 shrink-0" />
              <span>Search: <strong>"{search}"</strong></span>
              <button
                type="button"
                onClick={() => {
                  const next = new URLSearchParams(searchParams);
                  next.delete('q');
                  setSearchParams(next, { replace: true });
                }}
                className="ml-0.5 text-orange-600 hover:text-orange-900 p-0.5 rounded cursor-pointer transition-colors"
                title="Clear search"
              >
                <XMarkIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
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
              onClick={() => {
                setStatus('');
                setPage(1);
                if (search) {
                  const next = new URLSearchParams(searchParams);
                  next.delete('q');
                  setSearchParams(next, { replace: true });
                }
              }}
              className="text-xs text-orange-600 hover:text-orange-700 font-medium px-2 py-1 cursor-pointer transition-colors"
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
      <div data-tour="jobs-list">
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonJobCard key={i} />
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

                    {job.vacancies_count && Number(job.vacancies_count) > 1 ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-800 border border-orange-200">
                        {job.vacancies_count} Openings
                      </span>
                    ) : null}

                    {job.poster_url && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
                        Poster Attached
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

                {/* Card Action Footer: Vacancies (Left) & Unified Action Buttons (Right) */}
                <div className="border-t border-gray-100 pt-3 flex items-center justify-between flex-wrap gap-3 mt-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200/70 rounded-lg text-xs font-semibold">
                      <UserGroupIcon className="w-3.5 h-3.5 text-blue-600" />
                      <span>{job.vacancies_count ? `${job.vacancies_count} Vacanc${Number(job.vacancies_count) > 1 ? 'ies' : 'y'}` : '1 Vacancy'}</span>
                    </div>

                    {job.application_url && (
                      <a
                        href={job.application_url.startsWith('http') ? job.application_url : `https://${job.application_url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200 rounded-lg text-xs font-medium transition-colors"
                        title="External application page"
                      >
                        <GlobeAltIcon className="w-3.5 h-3.5 text-gray-500" />
                        <span>Application Link ↗</span>
                      </a>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => openEdit(job)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-900 transition-colors flex items-center gap-1 cursor-pointer"
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
      </div>

      {total > limit && (
        <div className="flex items-center justify-center gap-3 mt-4">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 text-xs font-medium bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-40">Prev</button>
          <span className="text-xs text-gray-500">Page {page} of {Math.ceil(total / limit)}</span>
          <button onClick={() => setPage((p) => p + 1)} disabled={page >= Math.ceil(total / limit)} className="px-3 py-1 text-xs font-medium bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-40">Next</button>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 text-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-xs text-white shrink-0">
                  <BriefcaseIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">{editId ? 'Edit Job Opportunity' : 'Post Job Opportunity'}</h3>
                  <p className="text-xs text-orange-100 mt-0.5">Publish new career opportunities and internships for alumni</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors cursor-pointer"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 overflow-y-auto space-y-4 flex-1">
                {formError && <div className="bg-red-50 text-red-700 px-3 py-2 rounded-xl text-xs border border-red-100">{formError}</div>}
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
                    <div className="flex gap-2 items-center">
                      <input
                        type="email"
                        placeholder="Contact Email"
                        value={newEmployer.contact_email}
                        onChange={(e) => setNewEmployer((ne) => ({ ...ne, contact_email: e.target.value }))}
                        className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white flex-1 outline-none focus:border-orange-400"
                      />
                      <button
                        type="button"
                        onClick={handleCreateEmployer}
                        disabled={creatingEmployer || !newEmployer.company_name}
                        className="px-3 py-1.5 text-xs font-medium bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-40"
                      >
                        {creatingEmployer ? 'Adding...' : 'Add'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <select
                    value={form.employer_id}
                    onChange={(e) => {
                      const emp = employers.find((x) => x.id === e.target.value);
                      setForm((f: any) => ({
                        ...f,
                        employer_id: e.target.value,
                        company_name: emp?.company_name || f.company_name,
                        industry: emp?.industry || f.industry,
                      }));
                    }}
                    className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white w-full outline-none focus:border-orange-400"
                    required
                  >
                    <option value="">Select an Employer</option>
                    {employers.map((emp) => (
                      <option key={emp.id} value={emp.id}>{emp.company_name}{emp.industry ? ` (${emp.industry})` : ''}</option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-0.5">Position / Job Title *</label>
                <input
                  type="text"
                  value={form.position}
                  onChange={(e) => setForm((f: any) => ({ ...f, position: e.target.value }))}
                  placeholder="e.g. Junior Web Developer"
                  className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white w-full outline-none focus:border-orange-400"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">Industry Sector</label>
                  <input
                    type="text"
                    list="industry-datalist"
                    value={form.industry}
                    onChange={(e) => setForm((f: any) => ({ ...f, industry: e.target.value }))}
                    placeholder="Select or type industry..."
                    className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white w-full outline-none focus:border-orange-400"
                  />
                  <datalist id="industry-datalist">
                    <option value="Information Technology & Software" />
                    <option value="Business Process Outsourcing (BPO)" />
                    <option value="Education & Academics" />
                    <option value="Industrial Technology & Manufacturing" />
                    <option value="Engineering & Construction" />
                    <option value="Agriculture & Agribusiness" />
                    <option value="Hospitality, Hotel & Tourism" />
                    <option value="Financial Services & Accounting" />
                    <option value="Healthcare & Allied Medicine" />
                    <option value="Government & Public Administration" />
                    <option value="Retail, Sales & Marketing" />
                  </datalist>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">Location</label>
                  <input
                    type="text"
                    value={form.location}
                    onChange={(e) => setForm((f: any) => ({ ...f, location: e.target.value }))}
                    placeholder="e.g. Cebu City, Philippines"
                    className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white w-full outline-none focus:border-orange-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">Job Type</label>
                  <select
                    value={form.job_type}
                    onChange={(e) => setForm((f: any) => ({ ...f, job_type: e.target.value }))}
                    className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white w-full outline-none focus:border-orange-400"
                  >
                    <option value="full-time">Full-time</option>
                    <option value="part-time">Part-time</option>
                    <option value="contract">Contract</option>
                    <option value="internship">Internship</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">Experience Level</label>
                  <select
                    value={form.experience_level}
                    onChange={(e) => setForm((f: any) => ({ ...f, experience_level: e.target.value }))}
                    className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white w-full outline-none focus:border-orange-400"
                  >
                    <option value="entry">Entry Level</option>
                    <option value="mid">Mid Level</option>
                    <option value="senior">Senior Level</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">Salary Range</label>
                  <input
                    type="text"
                    value={form.salary_range}
                    onChange={(e) => setForm((f: any) => ({ ...f, salary_range: e.target.value }))}
                    placeholder="e.g. 25,000 - 35,000"
                    className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white w-full outline-none focus:border-orange-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">Application Deadline *</label>
                  <input
                    type="date"
                    value={form.expires_at ? form.expires_at.slice(0, 10) : ''}
                    onChange={(e) => setForm((f: any) => ({ ...f, expires_at: e.target.value }))}
                    className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white w-full outline-none focus:border-orange-400"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">Number of Openings / Vacancies</label>
                  <input
                    type="number"
                    min="1"
                    max="9999"
                    value={form.vacancies_count}
                    onChange={(e) => setForm((f: any) => ({ ...f, vacancies_count: e.target.value }))}
                    placeholder="e.g. 20 (Mass hiring)"
                    className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white w-full outline-none focus:border-orange-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-0.5">External Application URL / Portal</label>
                <input
                  type="url"
                  value={form.application_url}
                  onChange={(e) => setForm((f: any) => ({ ...f, application_url: e.target.value }))}
                  placeholder="https://company.com/careers/apply"
                  className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white w-full outline-none focus:border-orange-400"
                />
              </div>

              {/* Official Hiring Poster / Recruitment Flyer Upload */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-gray-700">
                    Official Recruitment Flyer / Poster (Image File)
                  </label>
                  <span className="text-[10px] text-gray-400">PNG, JPG, WEBP · Max 15MB</span>
                </div>

                {form.poster_url ? (
                  <div className="border border-orange-200 bg-orange-50/40 rounded-xl p-3 flex items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={form.poster_url}
                        alt="Poster Preview"
                        className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg border border-gray-200 bg-white shrink-0 shadow-xs"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-gray-900">Flyer Image Uploaded</span>
                          <span className="px-1.5 py-0.2 rounded-full text-[9px] font-semibold bg-emerald-100 text-emerald-800">Ready</span>
                        </div>
                        <p className="text-[11px] text-gray-500 mt-0.5 truncate">
                          Will be displayed as the main promotional flyer in alumni job details.
                        </p>
                        <div className="flex items-center gap-3 mt-2">
                          <label className="text-xs font-semibold text-orange-600 hover:text-orange-700 hover:underline cursor-pointer flex items-center gap-1">
                            <ArrowUpTrayIcon className="w-3.5 h-3.5" />
                            <span>Replace File</span>
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/jpg,image/webp"
                              className="hidden"
                              onChange={handlePosterUpload}
                            />
                          </label>
                          <span className="text-gray-300">·</span>
                          <button
                            type="button"
                            onClick={() => setForm((f: any) => ({ ...f, poster_url: '' }))}
                            className="text-xs font-semibold text-red-600 hover:text-red-700 hover:underline cursor-pointer flex items-center gap-1"
                          >
                            <XMarkIcon className="w-3.5 h-3.5" />
                            <span>Remove</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <label className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                    uploadingPoster
                      ? 'border-orange-400 bg-orange-50/40 pointer-events-none'
                      : 'border-gray-300 hover:border-orange-400 hover:bg-orange-50/20 bg-gray-50/50'
                  }`}>
                    {uploadingPoster ? (
                      <div className="flex items-center gap-2 py-2 text-xs font-medium text-orange-600">
                        <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                        <span>Uploading flyer image...</span>
                      </div>
                    ) : (
                      <>
                        <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 mb-2">
                          <PhotoIcon className="w-5 h-5" />
                        </div>
                        <p className="text-xs font-semibold text-gray-800">
                          Click to upload hiring poster / flyer image
                        </p>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          Drag & drop or browse image from your computer (PNG, JPG, WEBP up to 15MB)
                        </p>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      className="hidden"
                      disabled={uploadingPoster}
                      onChange={handlePosterUpload}
                    />
                  </label>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">Direct Contact Email (HR)</label>
                  <input
                    type="email"
                    value={form.contact_email}
                    onChange={(e) => setForm((f: any) => ({ ...f, contact_email: e.target.value }))}
                    placeholder="e.g. careers@company.com"
                    className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white w-full outline-none focus:border-orange-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">Direct Contact Phone / Hotline</label>
                  <input
                    type="text"
                    value={form.contact_phone}
                    onChange={(e) => setForm((f: any) => ({ ...f, contact_phone: e.target.value }))}
                    placeholder="e.g. 0917-123-4567 or (032) 234-5678"
                    className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white w-full outline-none focus:border-orange-400"
                  />
                </div>
              </div>

              {/* Skills Tag Input */}
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

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-0.5">Job Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f: any) => ({ ...f, description: e.target.value }))}
                  placeholder="Describe the job role, responsibilities, culture..."
                  className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white w-full outline-none focus:border-orange-400"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-0.5">Qualifications & Requirements</label>
                <textarea
                  value={form.requirements}
                  onChange={(e) => setForm((f: any) => ({ ...f, requirements: e.target.value }))}
                  placeholder="Degrees, certifications, minimum years of experience..."
                  className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white w-full outline-none focus:border-orange-400"
                  rows={2}
                />
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" checked={form.is_alumni_exclusive} onChange={toggleField('is_alumni_exclusive')} className="w-3.5 h-3.5 rounded border-gray-300 text-orange-500" /><span className="text-xs text-gray-500">Alumni Exclusive</span></label>
                <label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" checked={form.is_remote} onChange={toggleField('is_remote')} className="w-3.5 h-3.5 rounded border-gray-300 text-orange-500" /><span className="text-xs text-gray-500">Remote</span></label>
              </div>
              </div>

              <div className="px-6 py-3.5 bg-gray-50/80 border-t border-gray-100 flex items-center justify-end gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-xs font-semibold bg-white border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors shadow-2xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-orange-600 hover:bg-orange-700 text-white rounded-xl shadow-xs hover:shadow transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {editId ? 'Update Opportunity' : 'Post Opportunity'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
