import { useState, useEffect } from 'react';
import { jobsApi } from '@/services/api';
import { BriefcaseIcon, MapPinIcon, CurrencyDollarIcon, ClockIcon } from '@heroicons/react/24/outline';

export default function JobsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [jobs, setJobs] = useState<any[]>([]);
  const [filter, setFilter] = useState('All');
  const [applying, setApplying] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<any>(null);

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    try {
      setLoading(true);
      const data = await jobsApi.list();
      setJobs(data);
    } catch {
      setError('Failed to load job listings');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async (jobId: string) => {
    try {
      setApplying(jobId);
      await jobsApi.apply(jobId);
      setSelectedJob(null);
      loadJobs();
    } catch {
      setError('Failed to apply for job');
    } finally {
      setApplying(null);
    }
  };

  const filters = ['All', 'Full-Time', 'Part-Time', 'Contract', 'Freelance', 'Alumni Exclusive'];
  const filteredJobs = jobs.filter((job) => {
    if (filter === 'All') return true;
    if (filter === 'Alumni Exclusive') return job.is_alumni_exclusive;
    return job.employment_type === filter;
  });
  const alumniExclusiveCount = jobs.filter((j) => j.is_alumni_exclusive).length;

  if (loading) {
    return (
      <div className="space-y-6">
        <div><h1 className="section-title">Job Board</h1><p className="text-gray-500 mt-1">Loading available positions...</p></div>
        <div className="space-y-4">{[1, 2, 3].map((i) => <div key={i} className="card animate-pulse h-28" />)}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div><h1 className="section-title">Job Board</h1></div>
        <div className="card text-center py-12">
          <p className="text-red-600">{error}</p>
          <button onClick={loadJobs} className="btn-primary mt-4">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="section-title">Job Board</h1>
        <p className="text-gray-500 mt-1">Browse and apply to opportunities from our partner companies</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card text-center">
          <p className="text-3xl font-bold text-ctu-blue">{jobs.length}</p>
          <p className="text-sm text-gray-500 mt-1">Total Openings</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-ctu-teal">{alumniExclusiveCount}</p>
          <p className="text-sm text-gray-500 mt-1">Alumni Exclusive</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-ctu-gold">{filters.length - 2}</p>
          <p className="text-sm text-gray-500 mt-1">Job Types Available</p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 text-sm rounded-full border transition-colors ${filter === f ? 'bg-ctu-blue text-white border-ctu-blue' : 'border-gray-300 text-gray-600 hover:border-ctu-blue hover:text-ctu-blue'}`}
          >
            {f}
          </button>
        ))}
      </div>

      {filteredJobs.length === 0 ? (
        <div className="card text-center py-12">
          <div className="w-14 h-14 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <BriefcaseIcon className="w-7 h-7 text-gray-400" />
          </div>
          <p className="text-gray-500 font-medium">No jobs match this filter</p>
          <p className="text-sm text-gray-400 mt-1">Try selecting a different category</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredJobs.map((job) => (
            <div
              key={job.id}
              onClick={() => setSelectedJob(job)}
              className="card hover:shadow-lg transition-all duration-200 cursor-pointer group"
            >
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-ctu-blue to-blue-700 flex items-center justify-center text-white font-bold shrink-0 text-lg shadow-sm">
                  {(job.company_name || '?').charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-ctu-charcoal group-hover:text-ctu-blue transition-colors">{job.position}</h3>
                      <p className="text-ctu-blue font-medium">{job.company_name}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {job.is_alumni_exclusive && (
                        <span className="px-2 py-1 bg-ctu-gold/20 text-ctu-gold text-xs rounded-full font-medium">Exclusive</span>
                      )}
                      <span className="text-sm text-gray-400">{job.created_at ? new Date(job.created_at).toLocaleDateString() : 'Recently'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-3 text-sm text-gray-500 flex-wrap">
                    <span className="flex items-center gap-1"><MapPinIcon className="w-4 h-4" /> {job.location || 'N/A'}</span>
                    <span className="flex items-center gap-1"><ClockIcon className="w-4 h-4" /> {job.employment_type}</span>
                    <span className="flex items-center gap-1"><CurrencyDollarIcon className="w-4 h-4" /> {job.salary_range || 'Negotiable'}</span>
                  </div>
                  <div className="mt-3">
                    <span className="text-sm text-ctu-blue group-hover:underline">View details & apply →</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedJob && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedJob(null)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-ctu-blue to-blue-700 flex items-center justify-center text-white font-bold text-xl shadow-sm">
                    {(selectedJob.company_name || '?').charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-ctu-charcoal">{selectedJob.position}</h2>
                    <p className="text-ctu-blue font-medium">{selectedJob.company_name}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedJob(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <MapPinIcon className="w-4 h-4 mx-auto text-gray-400 mb-1" />
                  <p className="text-xs text-gray-500">Location</p>
                  <p className="text-sm font-medium text-ctu-charcoal">{selectedJob.location || 'N/A'}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <ClockIcon className="w-4 h-4 mx-auto text-gray-400 mb-1" />
                  <p className="text-xs text-gray-500">Type</p>
                  <p className="text-sm font-medium text-ctu-charcoal">{selectedJob.employment_type}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <CurrencyDollarIcon className="w-4 h-4 mx-auto text-gray-400 mb-1" />
                  <p className="text-xs text-gray-500">Salary</p>
                  <p className="text-sm font-medium text-ctu-charcoal">{selectedJob.salary_range || 'Negotiable'}</p>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="font-semibold text-ctu-charcoal mb-2">Description</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{selectedJob.description || 'No description provided.'}</p>
              </div>

              {selectedJob.requirements?.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold text-ctu-charcoal mb-2">Requirements</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                    {selectedJob.requirements.map((req: string, i: number) => (
                      <li key={i}>{req}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <div className="text-sm text-gray-400">
                  {selectedJob.is_alumni_exclusive && <span className="text-ctu-gold font-medium">Alumni Exclusive</span>}
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setSelectedJob(null)} className="btn-secondary">Close</button>
                  <button
                    onClick={() => handleApply(selectedJob.id)}
                    disabled={applying === selectedJob.id}
                    className="btn-primary disabled:opacity-50"
                  >
                    {applying === selectedJob.id ? 'Applying...' : 'Apply Now'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
