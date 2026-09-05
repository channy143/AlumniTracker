import { useState, useEffect } from 'react';
import { employerApi } from '@/services/api';
import { useUIStore } from '@/store/uiStore';
import {
  BriefcaseIcon,
  UserGroupIcon,
  CheckBadgeIcon,
  ArrowDownTrayIcon,
  DocumentTextIcon,
  BuildingOfficeIcon,
} from '@heroicons/react/24/outline';

export default function EmployerDashboard() {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [selectedJobId, setSelectedJobId] = useState<string>('all');
  const [downloading, setDownloading] = useState(false);
  const addNotification = useUIStore((s) => s.addNotification);

  const loadData = async () => {
    setLoading(true);
    try {
      const res: any = await employerApi.dashboard();
      setDashboardData(res);
      if (res?.jobs?.length > 0 && selectedJobId === 'all') {
        setSelectedJobId(res.jobs[0].id);
      }
    } catch {
      addNotification('Failed to load employer dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDownloadReport = async (jobId: string) => {
    if (!jobId || jobId === 'all') {
      addNotification('Please select a specific job posting to download its report', 'warning');
      return;
    }
    setDownloading(true);
    try {
      const res = await employerApi.downloadReport(jobId);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `shortlisted-report-${jobId.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      addNotification('Report downloaded successfully', 'success');
    } catch {
      addNotification('Failed to download report', 'error');
    } finally {
      setDownloading(false);
    }
  };

  const metrics = dashboardData?.metrics || {
    active_jobs: 0,
    total_applicants: 0,
    shortlisted_applicants: 0,
  };

  const jobs: any[] = dashboardData?.jobs || [];
  const allCandidates: any[] = dashboardData?.shortlisted_candidates || [];

  const filteredCandidates = selectedJobId === 'all'
    ? allCandidates
    : allCandidates.filter((c) => c.job_posting_id === selectedJobId);

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-base font-bold text-gray-900">Employer Portal</h1>
          <p className="text-xs text-gray-500">
            {dashboardData?.employer?.company_name
              ? `${dashboardData.employer.company_name} · Review pre-screened and shortlisted alumni candidates`
              : 'Review pre-screened and shortlisted alumni candidates'}
          </p>
        </div>

        {selectedJobId !== 'all' && (
          <button
            onClick={() => handleDownloadReport(selectedJobId)}
            disabled={downloading}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 transition-colors shadow-sm"
          >
            <ArrowDownTrayIcon className="w-3.5 h-3.5" />
            {downloading ? 'Downloading...' : 'Export Shortlisted CSV'}
          </button>
        )}
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
            <BriefcaseIcon className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900 leading-none">{metrics.active_jobs}</p>
            <p className="text-[11px] text-gray-500 mt-0.5">Active Job Postings</p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
            <UserGroupIcon className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900 leading-none">{metrics.total_applicants}</p>
            <p className="text-[11px] text-gray-500 mt-0.5">Total Received Applications</p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
            <CheckBadgeIcon className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900 leading-none">{metrics.shortlisted_applicants}</p>
            <p className="text-[11px] text-gray-500 mt-0.5">Shortlisted Candidates</p>
          </div>
        </div>
      </div>

      {/* Filter / Selector Bar */}
      {jobs.length > 0 && (
        <div className="flex items-center justify-between gap-3 bg-white border border-gray-200 rounded-lg px-3 py-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-600">Filter by Position:</span>
            <select
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-orange-400 bg-white"
            >
              <option value="all">All Jobs ({allCandidates.length} shortlisted)</option>
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.position}
                </option>
              ))}
            </select>
          </div>

          <span className="text-[11px] text-gray-400">
            Showing {filteredCandidates.length} candidate{filteredCandidates.length === 1 ? '' : 's'}
          </span>
        </div>
      )}

      {/* Candidates List */}
      <div className="space-y-3">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-lg animate-pulse h-28" />
            ))}
          </div>
        ) : filteredCandidates.length === 0 ? (
          <div className="text-center py-12 text-sm text-gray-500 bg-white border border-gray-200 rounded-lg p-6">
            <BuildingOfficeIcon className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="font-semibold text-gray-700">No shortlisted candidates yet</p>
            <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">
              When university administrators review and shortlist qualified alumni for your job postings, their detailed profiles and match metrics will appear here.
            </p>
          </div>
        ) : (
          filteredCandidates.map((c) => {
            const score = c.overall_match_score ?? c.match_percentage;
            return (
              <div key={c.id} className="bg-white border border-gray-200 rounded-lg p-4 transition-all hover:border-orange-200 hover:shadow-sm">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">
                      {(c.candidate_name || 'A').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-gray-900">{c.candidate_name}</h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-100 text-purple-700 capitalize">
                          {c.status?.replace('_', ' ') || 'Shortlisted'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">{c.candidate_email}</p>
                      {(c.batch_year || c.program) && (
                        <p className="text-[11px] font-medium text-gray-600 mt-0.5">
                          {c.batch_year ? `Batch ${c.batch_year}` : ''}
                          {c.batch_year && c.program ? ' · ' : ''}
                          {c.program || ''}
                        </p>
                      )}
                      <p className="text-[10px] text-gray-400 mt-1">
                        Applied for <span className="font-medium text-gray-600">{c.job_position}</span> on {new Date(c.applied_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {c.resume_url ? (
                      <a
                        href={c.resume_url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                      >
                        <DocumentTextIcon className="w-3.5 h-3.5" /> Resume
                      </a>
                    ) : (
                      <span className="text-xs text-gray-400 italic">No resume</span>
                    )}
                  </div>
                </div>

                {/* Match Sub-scores */}
                {score != null && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-gray-600 font-medium">Screening Match Score</span>
                      <span className={`font-bold ${
                        score >= 80 ? 'text-green-600' : score >= 50 ? 'text-amber-600' : 'text-gray-500'
                      }`}>
                        {score}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          score >= 80 ? 'bg-green-500' : score >= 50 ? 'bg-amber-500' : 'bg-gray-400'
                        }`}
                        style={{ width: `${score}%` }}
                      />
                    </div>

                    {(c.skills_match_score != null || c.experience_match_score != null || c.education_match_score != null) && (
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        <div className="bg-gray-50 p-2 rounded border border-gray-100 text-center">
                          <p className="text-[10px] text-gray-400">Skills (50%)</p>
                          <p className="text-xs font-bold text-gray-700">{c.skills_match_score ?? 0}%</p>
                        </div>
                        <div className="bg-gray-50 p-2 rounded border border-gray-100 text-center">
                          <p className="text-[10px] text-gray-400">Experience (30%)</p>
                          <p className="text-xs font-bold text-gray-700">{c.experience_match_score ?? 0}%</p>
                        </div>
                        <div className="bg-gray-50 p-2 rounded border border-gray-100 text-center">
                          <p className="text-[10px] text-gray-400">Education (20%)</p>
                          <p className="text-xs font-bold text-gray-700">{c.education_match_score ?? 0}%</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Matched Skills */}
                {c.matched_skills?.length > 0 && (
                  <div className="mt-3">
                    <p className="text-[11px] text-gray-500 font-medium mb-1">Matched Skills</p>
                    <div className="flex flex-wrap gap-1">
                      {c.matched_skills.map((s: string) => (
                        <span key={s} className="bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded text-[11px] font-medium">
                          ✓ {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
