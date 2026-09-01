import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BriefcaseIcon, BuildingOfficeIcon, AcademicCapIcon, ClockIcon, ArrowLeftIcon, SparklesIcon, ChartBarIcon, UserGroupIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { careerTrendsApi } from '@/services/api';
import { SkeletonCard, SkeletonText, SkeletonStatCard } from '@/components/ui/Skeleton';

const INDUSTRY_COLORS = ['#059669', '#2563eb', '#d97706', '#7c3aed', '#dc2626', '#0891b2', '#6b7280'];

export default function CareerInsightsPage() {
  const { position } = useParams<{ position: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
      <div className="max-w-5xl mx-auto">
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <SkeletonCard className="h-48" />
          <SkeletonCard className="h-48" />
        </div>
        <SkeletonCard className="h-40" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-5xl mx-auto text-center py-12">
        <p className="text-gray-500">Career data not found.</p>
        <button onClick={() => navigate('/career-trends')} className="mt-4 text-sm text-orange-600 hover:underline">Back to Career Trends</button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
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

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
          <div className="bg-gray-50 rounded-lg p-2.5 text-center">
            <p className="text-sm font-bold text-gray-900">{data.alumniCount}</p>
            <p className="text-[10px] text-gray-500">Total Alumni</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-2.5 text-center">
            <p className="text-sm font-bold text-gray-900">{data.currentCount}</p>
            <p className="text-[10px] text-gray-500">Currently Employed</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-2.5 text-center">
            <p className="text-sm font-bold text-gray-900">{data.averageExperienceYears}yrs</p>
            <p className="text-[10px] text-gray-500">Avg Experience</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-2.5 text-center">
            <p className="text-sm font-bold text-gray-900 truncate" title={data.topIndustry || 'N/A'}>{data.topIndustry || 'N/A'}</p>
            <p className="text-[10px] text-gray-500">Top Industry</p>
          </div>
        </div>
      </div>

      {/* Overview + Course */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <SparklesIcon className="w-4 h-4 text-orange-500" />
          Career Overview
        </h3>
        <p className="text-sm text-gray-700 leading-relaxed">{data.careerOverview}</p>
        {data.mostCommonCourse && (
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2 text-xs">
            <AcademicCapIcon className="w-4 h-4 text-orange-500 shrink-0" />
            <span className="text-gray-500">Most Common Course:</span>
            <span className="font-semibold text-gray-800">{data.mostCommonCourse}</span>
          </div>
        )}
      </div>

      {/* Where They Work */}
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Where They Work</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {data.topEmployers?.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-3">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <BuildingOfficeIcon className="w-4 h-4 text-orange-500" />
              Top Employers
            </h4>
            <div className="space-y-1">
              {data.topEmployers.map((emp: any, i: number) => (
                <div key={emp.name} className="flex items-center justify-between text-xs py-1.5 px-2 rounded hover:bg-gray-50">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded bg-orange-100 flex items-center justify-center text-[9px] font-bold text-orange-600 shrink-0">{i + 1}</span>
                    <span className="text-gray-700 font-medium">{emp.name}</span>
                  </div>
                  <span className="text-gray-400">{emp.count} alumni</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {data.industryDistribution?.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-3">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <ChartBarIcon className="w-4 h-4 text-orange-500" />
              Industry Distribution
            </h4>
            <div className="space-y-2">
              {data.industryDistribution.map((ind: any, i: number) => (
                <div key={ind.name}>
                  <div className="flex items-center justify-between text-xs mb-0.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: INDUSTRY_COLORS[i % INDUSTRY_COLORS.length] }} />
                      <span className="text-gray-700 font-medium">{ind.name}</span>
                    </div>
                    <span className="text-gray-500">{ind.percentage}%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden ml-4">
                    <div className="h-full rounded-full" style={{ width: `${ind.percentage}%`, backgroundColor: INDUSTRY_COLORS[i % INDUSTRY_COLORS.length] }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Skills & Growth */}
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Skills & Growth</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {data.topSkills?.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-3">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <AcademicCapIcon className="w-4 h-4 text-orange-500" />
              Skills Distribution
            </h4>
            <div className="space-y-2">
              {data.topSkills.slice(0, 6).map((skill: any) => (
                <div key={skill.name}>
                  <div className="flex items-center justify-between text-xs mb-0.5">
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

        {data.employmentTimeline?.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-3">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <ClockIcon className="w-4 h-4 text-orange-500" />
              Employment Growth
            </h4>
            <div className="h-40">
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

      {/* Career Paths */}
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Career Paths</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {data.relatedCareers?.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-3">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <BriefcaseIcon className="w-4 h-4 text-orange-500" />
              Related Careers
            </h4>
            <p className="text-[11px] text-gray-500 mb-2">Alumni who work as {position} also pursue these roles:</p>
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

        {data.suggestedSkills?.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-3">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <CheckCircleIcon className="w-4 h-4 text-orange-500" />
              Suggested Skills
            </h4>
            <p className="text-[11px] text-gray-500 mb-2">
              If you want to become a {position}, the most common skills among alumni are:
            </p>
            <div className="space-y-1.5">
              {data.suggestedSkills.map((skill: any) => (
                <div key={skill.name} className="flex items-center gap-2 text-xs">
                  <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span className="text-gray-700 font-medium flex-1">{skill.name}</span>
                  <span className="text-gray-400">{skill.percentage}% of alumni</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Alumni List */}
      {data.recentAlumni?.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <UserGroupIcon className="w-4 h-4 text-orange-500" />
            Alumni Working as {position}
          </h3>
          <div className="space-y-2">
            {data.recentAlumni.slice(0, 10).map((alumni: any) => (
              <div key={alumni.id} className="flex items-center gap-3 text-xs py-1.5 border-b border-gray-50 last:border-0">
                <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center text-[10px] font-bold text-orange-600 shrink-0">
                  {alumni.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 truncate">{alumni.name}</p>
                  <p className="text-gray-500 truncate">
                    {alumni.position || position}
                    {alumni.company && <span> at {alumni.company}</span>}
                  </p>
                </div>
                <div className="text-right shrink-0 text-xs leading-relaxed">
                  {alumni.batch && <p className="text-gray-500">Batch {alumni.batch}</p>}
                  {alumni.employmentStatus && <p className="text-emerald-600 font-medium">{alumni.employmentStatus}</p>}
                  {alumni.location && <p className="text-gray-400">{alumni.location}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
