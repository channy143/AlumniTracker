import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BriefcaseIcon, BuildingOfficeIcon, AcademicCapIcon, ClockIcon, ArrowLeftIcon, SparklesIcon, ChartBarIcon, UserGroupIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { careerTrendsApi, jobsApi } from '@/services/api';
import { formatExperience } from '@/utils/formatExperience';
import { formatProgramLongName } from '@/utils/formatProgram';
import { SkeletonCard, SkeletonText, SkeletonStatCard } from '@/components/ui/Skeleton';
import { isJobMatch } from '@/utils/isJobMatch';

const INDUSTRY_COLORS = ['#059669', '#2563eb', '#d97706', '#7c3aed', '#dc2626', '#0891b2', '#6b7280'];

export default function CareerInsightsPage() {
  const { position } = useParams<{ position: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [myApplications, setMyApplications] = useState<any[]>([]);

  useEffect(() => {
    jobsApi.myApplications()
      .then((res) => setMyApplications(Array.isArray(res) ? res : []))
      .catch(() => setMyApplications([]));
  }, []);

  useEffect(() => {
    if (!position) return;
    setLoading(true);
    careerTrendsApi.get(position)
      .then((res) => setData(res))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [position]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="h-4 w-32 bg-gray-200 animate-pulse rounded mb-4" />
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-gray-200 animate-pulse" />
            <div className="space-y-1.5 flex-1">
              <div className="h-4 w-40 bg-gray-200 animate-pulse rounded" />
              <div className="h-3 w-24 bg-gray-200 animate-pulse rounded" />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
            {[1, 2, 3, 4].map((i) => <SkeletonStatCard key={i} />)}
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SkeletonCard className="h-64" />
          <SkeletonCard className="h-64" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-7xl mx-auto text-center py-12">
        <p className="text-gray-500">Career data not found.</p>
        <button onClick={() => navigate('/career-trends')} className="mt-4 text-sm text-orange-600 hover:underline">Back to Career Trends</button>
      </div>
    );
  }

  const hasActiveJobs = Boolean(data.activeJobs && data.activeJobs.length > 0);

  return (
    <div className="max-w-7xl mx-auto pb-8">
      <button
        onClick={() => navigate('/career-trends')}
        className="flex items-center gap-1 text-xs font-medium text-orange-600 hover:text-orange-700 transition-colors mb-4"
      >
        <ArrowLeftIcon className="w-4 h-4" />
        Back to Career Trends
      </button>

      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
            <BriefcaseIcon className="w-4 h-4 text-orange-600" />
          </div>
          <div>
            <h1 className="text-base font-bold text-gray-900">{position}</h1>
            <p className="text-xs text-gray-500">{data.alumniCount} alumni tracked &middot; {data.currentCount} currently employed</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mt-3">
          <div className="bg-gray-50 rounded-lg p-2.5 text-center">
            <p className="text-sm font-bold text-gray-900">{data.alumniCount}</p>
            <p className="text-[10px] text-gray-500">Total Alumni</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-2.5 text-center">
            <p className="text-sm font-bold text-gray-900">{data.currentCount}</p>
            <p className="text-[10px] text-gray-500">Currently Employed</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-2.5 text-center">
            <p className="text-sm font-bold text-gray-900">{formatExperience(data.averageExperienceYears)}</p>
            <p className="text-[10px] text-gray-500">Avg Experience</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-2.5 text-center">
            <p className="text-sm font-bold text-gray-900 truncate" title={data.topIndustry || 'N/A'}>{data.topIndustry || 'N/A'}</p>
            <p className="text-[10px] text-gray-500">Top Industry</p>
          </div>
          <div className="bg-emerald-50/80 border border-emerald-100 rounded-lg p-2.5 text-center">
            <p className="text-sm font-bold text-emerald-700">{data.activeJobs?.length || 0}</p>
            <p className="text-[10px] text-emerald-600 font-medium">Active Openings</p>
          </div>
        </div>
      </div>

      {/* Overview + Course + Hiring Connection (Full Width) */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <SparklesIcon className="w-4 h-4 text-orange-500" />
          Career Overview
        </h3>
        <p className="text-sm text-gray-700 leading-relaxed">{data.careerOverview}</p>
        
        {data.hiredCount > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2 text-xs text-amber-900 bg-amber-50/70 px-3 py-2 rounded-lg border border-amber-200/60">
            <SparklesIcon className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>{data.hiredCount} alumni</strong> were directly hired into this role through CTU Naga Job Postings, driving this career's growth in Career Trends!
            </span>
          </div>
        )}

        {data.mostCommonCourse && (
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2 text-xs">
            <AcademicCapIcon className="w-4 h-4 text-orange-500 shrink-0" />
            <span className="text-gray-500">Most Common Course:</span>
            <span className="font-semibold text-gray-800">{formatProgramLongName(data.mostCommonCourse)}</span>
          </div>
        )}
      </div>

      {/* Main Content Layout: Left Insights Column + Conditional Right Nav (placed under Career Overview) */}
      <div className="flex flex-col lg:flex-row gap-4 items-stretch">
        <div className="flex-1 min-w-0 w-full space-y-4">

          {/* Where They Work: Top Employers & Alumni */}
          {(data.topEmployers?.length > 0 || data.recentAlumni?.length > 0) && (
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Where They Work</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
                {/* Top Employers */}
                {data.topEmployers?.length > 0 && (
                  <div className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <BuildingOfficeIcon className="w-4 h-4 text-orange-500" />
                      Top Employers
                    </h4>
                    <div className="space-y-1.5 flex-1">
                      {data.topEmployers.map((emp: any, i: number) => (
                        <div key={emp.name} className="flex items-center justify-between text-xs py-2 px-2.5 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-100 transition-colors">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="w-5 h-5 rounded bg-orange-100 flex items-center justify-center text-[9px] font-bold text-orange-600 shrink-0">{i + 1}</span>
                            <span className="text-gray-700 font-medium truncate">{emp.name}</span>
                          </div>
                          <span className="text-gray-400 shrink-0 text-[11px] font-medium">{emp.count} alumni</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Alumni Working as [Position] */}
                {data.recentAlumni?.length > 0 && (
                  <div className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <UserGroupIcon className="w-4 h-4 text-orange-500" />
                      Alumni Working as {position}
                    </h4>
                    <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1 flex-1">
                      {data.recentAlumni.slice(0, 10).map((alumni: any) => (
                        <div key={alumni.id} className="flex items-center justify-between gap-3 text-xs p-2 rounded-lg hover:bg-gray-50 border border-gray-50 transition-colors">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center text-[10px] font-bold text-orange-600 shrink-0">
                              {alumni.name?.charAt(0) || 'A'}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-gray-800 truncate">{alumni.name}</p>
                              <p className="text-[11px] text-gray-500 truncate">
                                {alumni.position || position}
                                {alumni.company && <span> at {alumni.company}</span>}
                              </p>
                            </div>
                          </div>
                          <div className="text-right shrink-0 text-xs leading-tight flex flex-col items-end gap-1">
                            <div className="flex items-center gap-1 flex-wrap justify-end">
                              {alumni.hiredViaJob && (
                                <span className="inline-block text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/80">
                                  Hired via Portal
                                </span>
                              )}
                              {alumni.employmentStatus && (
                                <span className="inline-block text-[10px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                                  {alumni.employmentStatus}
                                </span>
                              )}
                            </div>
                            {alumni.batch && <p className="text-[11px] text-gray-400 mt-0.5">Batch {alumni.batch}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Skills & Industry: Skills Distribution & Industry Distribution */}
          {(data.topSkills?.length > 0 || data.industryDistribution?.length > 0) && (
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Skills & Industry</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
                {/* Skills Distribution */}
                {data.topSkills?.length > 0 && (
                  <div className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <AcademicCapIcon className="w-4 h-4 text-orange-500" />
                      Skills Distribution
                    </h4>
                    <div className="space-y-2.5 flex-1">
                      {data.topSkills.slice(0, 6).map((skill: any) => (
                        <div key={skill.name}>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-gray-700 font-medium">{skill.name}</span>
                            <span className="text-gray-500">{skill.percentage}%</span>
                          </div>
                          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-orange-500" style={{ width: `${Math.min(skill.percentage, 100)}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Industry Distribution */}
                {data.industryDistribution?.length > 0 && (
                  <div className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <ChartBarIcon className="w-4 h-4 text-orange-500" />
                      Industry Distribution
                    </h4>
                    <div className="space-y-2.5 flex-1">
                      {data.industryDistribution.map((ind: any, i: number) => (
                        <div key={ind.name}>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: INDUSTRY_COLORS[i % INDUSTRY_COLORS.length] }} />
                              <span className="text-gray-700 font-medium">{ind.name}</span>
                            </div>
                            <span className="text-gray-500">{ind.percentage}%</span>
                          </div>
                          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${Math.min(ind.percentage, 100)}%`, backgroundColor: INDUSTRY_COLORS[i % INDUSTRY_COLORS.length] }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Career Paths & Growth: Career Paths & Employment Growth */}
          {(data.suggestedSkills?.length > 0 || data.relatedCareers?.length > 0 || data.employmentTimeline?.length > 0) && (
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Career Paths & Growth</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
                {/* Career Paths (Suggested Skills + Related Careers) */}
                {(data.suggestedSkills?.length > 0 || data.relatedCareers?.length > 0) && (
                  <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4 flex flex-col">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                      <SparklesIcon className="w-4 h-4 text-orange-500" />
                      Career Paths
                    </h4>

                    {data.suggestedSkills?.length > 0 && (
                      <div>
                        <h5 className="text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
                          <CheckCircleIcon className="w-3.5 h-3.5 text-orange-500" />
                          Suggested Skills
                        </h5>
                        <p className="text-[11px] text-gray-500 mb-2.5">
                          If you want to become a {position}, the most common skills among alumni are:
                        </p>
                        <div className="space-y-1.5">
                          {data.suggestedSkills.map((skill: any) => (
                            <div key={skill.name} className="flex items-center justify-between text-xs py-1 px-2 rounded bg-gray-50">
                              <div className="flex items-center gap-2">
                                <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                <span className="text-gray-700 font-medium">{skill.name}</span>
                              </div>
                              <span className="text-gray-400">{skill.percentage}% of alumni</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {data.relatedCareers?.length > 0 && (
                      <div className="pt-3 border-t border-gray-100">
                        <h5 className="text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
                          <BriefcaseIcon className="w-3.5 h-3.5 text-orange-500" />
                          Related Careers
                        </h5>
                        <p className="text-[11px] text-gray-500 mb-2">
                          Alumni who work as {position} also pursue these roles:
                        </p>
                        <div className="space-y-1">
                          {data.relatedCareers.map((rc: any) => (
                            <button
                              key={rc.name}
                              onClick={() => navigate(`/career-trends/${encodeURIComponent(rc.name)}`)}
                              className="flex items-center justify-between w-full text-xs px-2 py-1.5 rounded hover:bg-orange-50 transition-colors text-left"
                            >
                              <span className="text-orange-700 font-medium">{rc.name}</span>
                              <span className="text-gray-400">{rc.count} alumni</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Employment Growth */}
                {data.employmentTimeline?.length > 0 && (
                  <div className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <ClockIcon className="w-4 h-4 text-orange-500" />
                      Employment Growth
                    </h4>
                    <div className="h-48 flex-1 min-h-[180px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data.employmentTimeline}>
                          <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                          <Tooltip formatter={(value: number) => [Math.round(value), 'Alumni']} />
                          <Line type="monotone" dataKey="count" stroke="#f97316" strokeWidth={2} dot={{ r: 3, fill: '#f97316' }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Nav: Active Job Openings (only appears when there's a job on this specific field) */}
        {hasActiveJobs && (
          <aside className="w-full lg:w-80 xl:w-96 shrink-0 flex flex-col">
            <div className="hidden lg:block text-xs font-semibold uppercase tracking-wider mb-2 invisible select-none" aria-hidden="true">
              &nbsp;
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between gap-2 pb-3 border-b border-gray-100 mb-3 shrink-0">
                <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-1.5 min-w-0 truncate">
                  <BriefcaseIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="truncate">Openings in this Field ({data.activeJobs.length})</span>
                </h3>
                <button
                  onClick={() => navigate(`/jobs?filter=${encodeURIComponent(position || '')}`)}
                  className="text-xs font-semibold text-orange-600 hover:text-orange-700 transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                >
                  Browse &rarr;
                </button>
              </div>

              <div className="space-y-3 overflow-y-auto pr-0.5 scrollbar-hover flex-1 min-h-0">
                {data.activeJobs.map((job: any) => (
                  <div
                    key={job.id}
                    className="bg-gray-50/70 border border-gray-200/80 rounded-xl p-3.5 flex flex-col justify-between hover:border-orange-300 hover:bg-white transition-all shadow-2xs group shrink-0"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="text-sm font-bold text-gray-900 group-hover:text-orange-600 transition-colors line-clamp-1">
                          {job.position}
                        </h4>
                        {job.is_remote && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-100 shrink-0">
                            Remote
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 font-medium truncate">{job.company_name}</p>
                      <p className="text-[11px] text-gray-400 mt-1 truncate">
                        {[job.location, job.salary_range ? `₱${job.salary_range}` : null, job.job_type].filter(Boolean).join(' • ')}
                      </p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between gap-2">
                      <span className="text-[10px] text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 shrink-0">
                        Hiring Now
                      </span>
                      {(() => {
                        const isApplied = myApplications.some((app) => isJobMatch(app, job));
                        if (isApplied) {
                          return (
                            <button
                              type="button"
                              onClick={() => navigate(`/jobs?filter=${encodeURIComponent(job.position)}`)}
                              className="px-2.5 py-1 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                            >
                              <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Applied</span>
                            </button>
                          );
                        }
                        return (
                          <button
                            type="button"
                            onClick={() => navigate(`/jobs?filter=${encodeURIComponent(job.position)}`)}
                            className="px-3 py-1 text-xs font-semibold bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors cursor-pointer shadow-xs active:scale-95"
                          >
                            Apply Now
                          </button>
                        );
                      })()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
