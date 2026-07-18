import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { jobsApi } from '@/services/api';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { MapPinIcon, CurrencyDollarIcon, ClockIcon, BriefcaseIcon, GlobeAltIcon, EnvelopeIcon, BuildingOfficeIcon, AcademicCapIcon, ArrowRightIcon, SparklesIcon } from '@heroicons/react/24/outline';



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

type JobFilter = 'all' | 'full-time' | 'part-time' | 'contract' | 'freelance' | 'internship' | 'exclusive' | 'remote' | 'onsite' | 'hybrid';

function JobCard({ job, onViewDetails }: { job: any; onViewDetails: () => void }) {
  const workModeLabel = job.work_mode === 'remote' ? 'Remote' : job.work_mode === 'hybrid' ? 'Hybrid' : null;
  const workModeColor = job.work_mode === 'remote' ? 'bg-green-100 text-green-700' : job.work_mode === 'hybrid' ? 'bg-purple-100 text-purple-700' : '';

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
          {workModeLabel && (
            <>
              <span className="text-gray-400">&middot;</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${workModeColor}`}>{workModeLabel}</span>
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

function JobDetailView({ job, onBack }: { job: any; onBack: () => void }) {
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

export default function JobsPage() {
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<any[]>([]);
  const [filter, setFilter] = useState<JobFilter>('all');
  const [selectedJob, setSelectedJob] = useState<any>(null);

  useEffect(() => {
    setLoading(true);
    jobsApi.list().then((data) => {
      if (data) setJobs(data);
    }).catch(() => {})
    .finally(() => setLoading(false));
  }, []);

  const now = Date.now();
  const weekAgo = now - 7 * 86400000;
  const companyCount = new Set(jobs.map((j: any) => j.company_name)).size;
  const newThisWeek = jobs.filter((j: any) => new Date(j.created_at).getTime() > weekAgo).length;

  const filteredJobs = jobs.filter((job) => {
    if (filter === 'all') return true;
    if (filter === 'exclusive') return job.is_alumni_exclusive;
    if (filter === 'remote' || filter === 'onsite' || filter === 'hybrid') return job.work_mode === filter;
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
            { value: 'remote', label: 'Remote' },
            { value: 'onsite', label: 'On-site' },
            { value: 'hybrid', label: 'Hybrid' },
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
            <JobDetailView job={selectedJob} onBack={() => setSelectedJob(null)} />
          ) : filteredJobs.length === 0 ? (
            <div className="text-center py-12 text-sm text-gray-500 bg-white border border-gray-200 rounded-lg">
              No job openings match this filter.
            </div>
          ) : (
            filteredJobs.map((job) => (
              <JobCard key={job.id} job={job} onViewDetails={() => setSelectedJob(job)} />
            ))
          )}
        </div>

        <aside className="hidden lg:block w-80 shrink-0">
          <div className="sticky top-16">
            <Sidebar jobs={jobs} onViewAll={handleViewAll} />
          </div>
        </aside>
      </div>
    </div>
  );
}
