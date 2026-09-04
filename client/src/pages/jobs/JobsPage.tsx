import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { jobsApi, profileApi } from '@/services/api';
import { useUIStore } from '@/store/uiStore';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { MapPinIcon, CurrencyDollarIcon, ClockIcon, BriefcaseIcon, GlobeAltIcon, EnvelopeIcon, BuildingOfficeIcon, AcademicCapIcon, ArrowRightIcon, SparklesIcon, DocumentTextIcon, XMarkIcon, CheckCircleIcon, PaperClipIcon } from '@heroicons/react/24/outline';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  reviewed: 'bg-blue-100 text-blue-700',
  screened: 'bg-green-100 text-green-700',
  shortlisted: 'bg-purple-100 text-purple-700',
  accepted: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending Review',
  reviewed: 'Reviewed',
  screened: 'Screened',
  shortlisted: 'Shortlisted',
  accepted: 'Qualified / Accepted',
  rejected: 'Rejected',
};

function StatusBadge({ status }: { status?: string }) {
  if (!status) return null;
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_COLORS[status] || STATUS_COLORS.pending}`}>
      {STATUS_LABELS[status] || 'Pending'}
    </span>
  );
}

function ApplicationStatusCard({ application }: { application: any }) {
  if (!application) return null;

  const isScreened = application.is_screened;
  const pct = application.match_percentage;
  const matchedSkills: string[] = application.matched_skills || [];
  const missingSkills: string[] = application.missing_skills || [];

  const badgeLabel = isScreened ? 'Screened' : (STATUS_LABELS[application.status] || 'Pending Review');
  const badgeColor = isScreened
    ? 'bg-green-100 text-green-800'
    : (STATUS_COLORS[application.status] || STATUS_COLORS.pending);

  return (
    <div className="bg-gray-50 rounded-lg p-4 mt-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-700">Application Status</span>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${badgeColor}`}>
          {badgeLabel}
        </span>
      </div>

      {isScreened && pct !== null && pct !== undefined && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600">Match Score</span>
            <span className={`font-bold ${
              pct >= 80 ? 'text-green-600' :
              pct >= 50 ? 'text-yellow-600' : 'text-gray-600'
            }`}>
              {pct}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
            <div
              className={`h-2 rounded-full transition-all ${
                pct >= 80 ? 'bg-green-500' :
                pct >= 50 ? 'bg-yellow-500' : 'bg-gray-500'
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {isScreened && matchedSkills.length > 0 && (
        <div className="mt-3">
          <p className="text-xs text-gray-500 mb-1">Matched Skills</p>
          <div className="flex flex-wrap gap-1">
            {matchedSkills.map((skill: string) => (
              <span key={skill} className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs">
                ✓ {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {isScreened && missingSkills.length > 0 && (
        <div className="mt-2">
          <p className="text-xs text-gray-500 mb-1">Missing Skills</p>
          <div className="flex flex-wrap gap-1">
            {missingSkills.map((skill: string) => (
              <span key={skill} className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs">
                ✗ {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {!isScreened && (
        <p className="text-xs text-gray-500 mt-2 leading-relaxed">
          Your application has been submitted and is pending review by the admin. You'll be notified when your application is screened.
        </p>
      )}
    </div>
  );
}



function formatDate(dateStr: string): string {
  const now = Date.now();
  const d = new Date(dateStr).getTime();
  const diff = now - d;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return new Date(dateStr).toLocaleDateString();
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return '1 day ago';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return new Date(dateStr).toLocaleDateString();
}

type JobFilter = 'all' | 'full-time' | 'part-time' | 'contract' | 'freelance' | 'internship' | 'exclusive';

function JobCard({ job, onViewDetails }: { job: any; onViewDetails: () => void }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      <div className="py-3 px-4">
        <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
          <div className="w-5 h-5 rounded-full bg-blue-800 flex items-center justify-center text-[9px] font-bold text-white shrink-0">
            {job.company_name?.charAt(0) || '?'}
          </div>
          <span className="font-medium text-gray-700">{job.company_name}</span>
          <span className="text-gray-400">&middot;</span>
          <span>{formatDate(job.created_at)}</span>
          {job.is_alumni_exclusive && (
            <>
              <span className="text-gray-400">&middot;</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700">Alumni Exclusive</span>
            </>
          )}
        </div>

        <h3 className="text-sm font-semibold text-gray-900 mb-1">{job.position}</h3>

        <p className="text-xs text-gray-600 leading-relaxed mb-2 line-clamp-2">
          {job.description}
        </p>

        <div className="flex items-center gap-3 text-[11px] text-gray-500 flex-wrap mb-2">
          <span className="flex items-center gap-1"><MapPinIcon className="w-3.5 h-3.5" /> {job.location || 'N/A'}</span>
          <span className="flex items-center gap-1"><ClockIcon className="w-3.5 h-3.5" /> {job.job_type}</span>
          {job.salary_range && <span className="flex items-center gap-1"><CurrencyDollarIcon className="w-3.5 h-3.5" /> {job.salary_range}</span>}
        </div>

        <button
          onClick={onViewDetails}
          className="text-xs font-medium text-orange-600 hover:text-orange-700 transition-colors"
        >
          View Details &rarr;
        </button>
      </div>
    </div>
  );
}

function JobDetailView({ job, onBack, application, onApply }: { job: any; onBack: () => void; application?: any; onApply?: () => void }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      <div className="px-4 py-2 border-b border-gray-100">
        <button onClick={onBack} className="flex items-center gap-1 text-xs font-medium text-orange-600 hover:text-orange-700 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Back to listings
        </button>
      </div>

      <div className="px-4 py-3">
        <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2">
          <div className="w-6 h-6 rounded-full bg-blue-800 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
            {job.company_name?.charAt(0) || '?'}
          </div>
          <span className="font-medium text-gray-700">{job.company_name}</span>
          <span className="text-gray-400">&middot;</span>
          <span>{formatDate(job.created_at)}</span>
          {job.is_alumni_exclusive && (
            <>
              <span className="text-gray-400">&middot;</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700">Alumni Exclusive</span>
            </>
          )}
        </div>

        <h3 className="text-base font-bold text-gray-900 mb-1">{job.position}</h3>

        <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap mb-3">
          <span className="flex items-center gap-1"><MapPinIcon className="w-4 h-4" /> {job.location || 'N/A'}</span>
          <span className="flex items-center gap-1"><BriefcaseIcon className="w-4 h-4" /> {job.job_type}</span>
          {job.salary_range && <span className="flex items-center gap-1"><CurrencyDollarIcon className="w-4 h-4" /> {job.salary_range}</span>}
        </div>

        <div className="flex items-center justify-between gap-3 flex-wrap bg-orange-50 border border-orange-100 rounded-lg px-3 py-2.5 mb-4">
          {application ? (
            <div className="flex items-center gap-2 text-xs">
              <CheckCircleIcon className="w-4 h-4 text-emerald-600" />
              <span className="font-medium text-gray-700">Application submitted</span>
              <StatusBadge status={application.is_screened ? 'screened' : application.status} />
            </div>
          ) : (
            <p className="text-xs text-gray-600">Ready to take the next step?</p>
          )}
          {!application && onApply && (
            <button
              onClick={onApply}
              className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-medium rounded-lg transition-colors"
            >
              Apply for this Job
            </button>
          )}
        </div>

        {application && <ApplicationStatusCard application={application} />}

        <div className="text-sm text-gray-700 leading-relaxed mb-4 whitespace-pre-line">
          {job.description}
        </div>

        {job.requirements?.length > 0 && (
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Requirements</h4>
            <ul className="space-y-1">
              {job.requirements.map((req: string, i: number) => (
                <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-1.5 shrink-0" />
                  {req}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="border-t border-gray-100 pt-3 mt-3 space-y-2">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Reach Out to the Employer</h4>
          {job.company_website && (
            <a
              href={job.company_website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              <GlobeAltIcon className="w-4 h-4" />
              {job.company_website}
            </a>
          )}
          {job.company_email && (
            <a
              href={`mailto:${job.company_email}`}
              className="flex items-center gap-2 text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              <EnvelopeIcon className="w-4 h-4" />
              {job.company_email}
            </a>
          )}
          {!job.company_website && !job.company_email && (
            <p className="text-xs text-gray-400">Contact the company directly through their official channels.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function Sidebar({ jobs, onViewAll }: { jobs: any[]; onViewAll: () => void }) {
  const navigate = useNavigate();
  const sorted = [...jobs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const recent = sorted.slice(0, 3);

  return (
    <div className="space-y-3">
      <div className="bg-white border border-gray-200 rounded-lg p-3">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <BriefcaseIcon className="w-4 h-4 text-orange-500" />
          Application Guidelines
        </h3>
        <ul className="space-y-1.5 text-xs text-gray-600">
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-1 shrink-0" />
            This portal does not process job applications.
          </li>
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-1 shrink-0" />
            Contact the employer using the information provided.
          </li>
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-1 shrink-0" />
            Keep your employment information updated.
          </li>
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-1 shrink-0" />
            Verify job details before applying.
          </li>
        </ul>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-3">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <SparklesIcon className="w-4 h-4 text-orange-500" />
          Recently Added Jobs
        </h3>
        <div className="space-y-2">
          {recent.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-2">No jobs posted yet.</p>
          ) : (
            recent.map((job, i) => (
              <div key={job.id}>
                <div className="text-xs">
                  <p className="font-medium text-gray-800 truncate">{job.position}</p>
                  <p className="text-gray-500 truncate">{job.company_name}</p>
                  <p className="text-[10px] text-gray-400">{timeAgo(job.created_at)}</p>
                </div>
                {i < recent.length - 1 && <div className="mt-2 border-t border-gray-100" />}
              </div>
            ))
          )}
        </div>
        {recent.length > 0 && (
          <button
            onClick={onViewAll}
            className="mt-2 text-xs font-medium text-orange-600 hover:text-orange-700 transition-colors flex items-center gap-1"
          >
            View All <ArrowRightIcon className="w-3 h-3" />
          </button>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-3">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <AcademicCapIcon className="w-4 h-4 text-orange-500" />
          Employment Resources
        </h3>
        <div className="space-y-1.5">
          {[
            { label: 'Resume Writing Guide', url: 'https://www.canva.com/resumes/templates/' },
            { label: 'Interview Preparation', url: 'https://www.indeed.com/career-advice/interviewing' },
            { label: 'TESDA Scholarships', url: 'https://www.tesda.gov.ph' },
            { label: 'DOLE Employment Portal', url: 'https://www.dole.gov.ph' },
            { label: 'LinkedIn Profile Tips', url: 'https://www.linkedin.com/help/linkedin/answer/a548441' },
          ].map((link) => (
            <a
              key={link.label}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              <span className="w-1 h-1 rounded-full bg-blue-400 shrink-0" />
              {link.label}
            </a>
          ))}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-3">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <BuildingOfficeIcon className="w-4 h-4 text-orange-500" />
          Employment Reminder
        </h3>
        <p className="text-xs text-gray-600 mb-2">
          Have you recently changed jobs? Keep your employment information updated to help improve alumni analytics.
        </p>
        <button
          onClick={() => navigate('/profile')}
          className="w-full px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-medium rounded-lg transition-colors"
        >
          Update Employment
        </button>
      </div>
    </div>
  );
}

function ApplyModal({ job, onClose, onApplied }: { job: any; onClose: () => void; onApplied: (application: any) => void }) {
  const [resume, setResume] = useState<File | null>(null);
  const [profileResume, setProfileResume] = useState<string | null>(null);
  const [coverLetter, setCoverLetter] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const addNotification = useUIStore((s) => s.addNotification);

  useEffect(() => {
    profileApi.get().then((p) => {
      if (p && p.resume_url) setProfileResume(p.resume_url);
    }).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resume && !profileResume) {
      setError('You need a resume to apply. Attach one below or add it to your profile.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const app = await jobsApi.apply(job.id, { cover_letter: coverLetter || undefined, resume: resume || undefined });
      addNotification('Application submitted successfully', 'success');
      onApplied(app);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit application. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-lg w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between px-6 py-4 bg-orange-500">
          <div>
            <h2 className="text-sm font-bold text-white">Apply for {job.position}</h2>
            <p className="text-xs text-orange-100">{job.company_name}</p>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white hover:bg-white/20 p-1.5 rounded-lg transition-colors"><XMarkIcon className="w-5 h-5" /></button>
        </div>
        <div className="p-6">

        {error && <div className="bg-red-50 text-red-700 px-3 py-2 rounded-lg mb-3 text-xs">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-3">
          {profileResume ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2.5">
              <p className="flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
                <CheckCircleIcon className="w-4 h-4" /> Your profile resume will be used
              </p>
              <p className="text-[11px] text-emerald-600 mt-0.5">No need to upload again. Use the option below only if you want to attach a different resume for this application.</p>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
              <p className="text-xs text-amber-700 font-medium">Upload a resume to apply</p>
              <p className="text-[11px] text-amber-600 mt-0.5">You don't have a resume on your profile yet, so please attach one below.</p>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Resume (PDF or DOC/DOCX){!profileResume && <span className="text-red-500"> *</span>}</label>
            <label className="flex items-center gap-2 border border-dashed border-gray-300 rounded-lg px-3 py-3 cursor-pointer hover:border-orange-400">
              <PaperClipIcon className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-600 truncate">
                {resume
                  ? resume.name
                  : profileResume
                    ? 'Choose a file (optional — attaches a different resume)'
                    : 'Choose a file (required)'}
              </span>
              <input type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="hidden" onChange={(e) => setResume(e.target.files?.[0] || null)} />
            </label>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Cover Letter (optional)</label>
            <textarea
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-orange-400 w-full"
              rows={4}
              placeholder="Why are you a great fit for this role?"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <a href={job.company_website || '#'} target="_blank" rel="noreferrer" className="text-xs text-gray-500 hover:underline flex items-center gap-1">
              <GlobeAltIcon className="w-3.5 h-3.5" /> Learn more about {job.company_name}
            </a>
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="px-3 py-1.5 text-xs font-medium bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={submitting} className="px-3 py-1.5 text-xs font-medium bg-orange-500 hover:bg-orange-600 text-white rounded-lg disabled:opacity-50">
                {submitting ? 'Submitting...' : 'Submit Application'}
              </button>
            </div>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
}

export default function JobsPage() {
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<any[]>([]);
  const [filter, setFilter] = useState<JobFilter>('all');
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [applyJob, setApplyJob] = useState<any>(null);
  const [application, setApplication] = useState<any>(null);
  const addNotification = useUIStore((s) => s.addNotification);

  const loadMyApplication = async (job: any) => {
    try {
      const app = await jobsApi.myApplication(job.id);
      setApplication(app || null);
    } catch { setApplication(null); }
  };

  useEffect(() => {
    setLoading(true);
    jobsApi.list().then((data) => {
      if (data) setJobs(data);
    }).catch(() => {})
    .finally(() => setLoading(false));
  }, []);

  const handleViewDetails = (job: any) => {
    setSelectedJob(job);
    setApplication(null);
    loadMyApplication(job);
  };

  const handleApplied = (app: any) => {
    setApplication(app);
  };

  const now = Date.now();
  const weekAgo = now - 7 * 86400000;
  const companyCount = new Set(jobs.map((j: any) => j.company_name)).size;
  const newThisWeek = jobs.filter((j: any) => new Date(j.created_at).getTime() > weekAgo).length;

  const filteredJobs = jobs.filter((job) => {
    if (filter === 'all') return true;
    if (filter === 'exclusive') return job.is_alumni_exclusive;
    return job.job_type === filter;
  });

  const handleViewAll = () => {
    setSelectedJob(null);
    setFilter('all');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-4">
        <h1 className="text-base font-bold text-gray-900">Career Hub</h1>
        <p className="text-xs text-gray-500">Discover opportunities from companies hiring CTU-Naga alumni</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
            <BriefcaseIcon className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900 leading-none">{jobs.length}</p>
            <p className="text-[11px] text-gray-500 mt-0.5">Total Job Opportunities</p>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
            <BuildingOfficeIcon className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900 leading-none">{companyCount}</p>
            <p className="text-[11px] text-gray-500 mt-0.5">Companies Hiring</p>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
            <ClockIcon className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900 leading-none">{newThisWeek}</p>
            <p className="text-[11px] text-gray-500 mt-0.5">New This Week</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-3 bg-white border border-gray-200 rounded-lg px-3 py-2">
        <BriefcaseIcon className="w-4 h-4 text-gray-400 shrink-0" />
        <div className="flex items-center gap-1 flex-wrap">
          {([
            { value: 'all', label: 'All' },
            { type: 'divider' },
            { value: 'full-time', label: 'Full-Time' },
            { value: 'part-time', label: 'Part-Time' },
            { value: 'contract', label: 'Contract' },
            { value: 'freelance', label: 'Freelance' },
            { value: 'internship', label: 'Internship' },
            { type: 'divider' },
            { value: 'exclusive', label: 'Alumni Exclusive' },
          ] as const).map((item: any, i: number) =>
            item.type === 'divider' ? (
              <span key={i} className="w-px h-4 bg-gray-300 mx-1" />
            ) : (
              <button
                key={item.value}
                onClick={() => setFilter(item.value as JobFilter)}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                  filter === item.value
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                {item.label}
              </button>
            )
          )}
        </div>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 min-w-0 space-y-3">
          {loading ? (
            <div className="space-y-3">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : selectedJob ? (
            <JobDetailView job={selectedJob} onBack={() => setSelectedJob(null)} application={application} onApply={() => setApplyJob(selectedJob)} />
          ) : filteredJobs.length === 0 ? (
            <div className="text-center py-12 text-sm text-gray-500 bg-white border border-gray-200 rounded-lg">
              No job openings match this filter.
            </div>
          ) : (
            filteredJobs.map((job) => (
              <JobCard key={job.id} job={job} onViewDetails={() => handleViewDetails(job)} />
            ))
          )}
        </div>

        <aside className="hidden lg:block w-80 shrink-0">
          <div className="sticky top-16">
            <Sidebar jobs={jobs} onViewAll={handleViewAll} />
          </div>
        </aside>
      </div>

      {applyJob && (
        <ApplyModal
          job={applyJob}
          onClose={() => setApplyJob(null)}
          onApplied={handleApplied}
        />
      )}
    </div>
  );
}
