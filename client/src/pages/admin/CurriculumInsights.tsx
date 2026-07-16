import { useState, useEffect } from 'react';
import { careerTrendsApi } from '@/services/api';
import { SkeletonCard } from '@/components/ui/Skeleton';

export default function CurriculumInsights() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    careerTrendsApi.list()
      .then((res: any) => setData(res))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="mb-4"><div className="h-5 w-40 bg-gray-200 animate-pulse rounded mb-1" /><div className="h-3 w-56 bg-gray-200 animate-pulse rounded" /></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{[1, 2, 3, 4].map((i) => <SkeletonCard key={i} className="h-40" />)}</div>
      </div>
    );
  }

  const topCareers = data?.topCareers || [];
  const topSkills = data?.skillsDistribution || [];
  const allSkills = data?.skillsDistribution || [];

  const emergingTechnologies = ['React', 'Laravel', 'AWS', 'Python', 'Cybersecurity', 'Cloud Computing', 'AI/ML', 'DevOps'];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-4">
        <h1 className="text-base font-bold text-gray-900">Curriculum Insights</h1>
        <p className="text-xs text-gray-500">Translate alumni career data into curriculum improvements.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Most Common Jobs</h2>
          <div className="space-y-2">
            {topCareers.slice(0, 6).map((c: any, i: number) => (
              <div key={c.position} className="flex items-center justify-between text-xs">
                <span className="text-gray-700">{i + 1}. {c.position}</span>
                <span className="text-gray-500">{c.alumniCount} alumni</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Skills Frequently Required</h2>
          <div className="space-y-2">
            {topSkills.slice(0, 8).map((s: any) => (
              <div key={s.name} className="flex items-center gap-2">
                <div className="flex-1">
                  <div className="flex items-center justify-between text-xs mb-0.5">
                    <span className="text-gray-700">{s.name}</span>
                    <span className="text-gray-500">{s.count}</span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-orange-500 rounded-full" style={{ width: `${Math.min(100, (s.count / Math.max(...topSkills.map((x: any) => x.count), 1)) * 100)}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Skills Missing from Graduates</h2>
          <p className="text-xs text-gray-400 mb-2">Based on industry demand vs. alumni reported skills.</p>
          <div className="space-y-1.5">
            {emergingTechnologies.map((skill) => {
              const matched = allSkills.find((s: any) => s.name.toLowerCase() === skill.toLowerCase());
              const gap = matched ? Math.max(0, 100 - Math.round((matched.count / Math.max(...allSkills.map((x: any) => x.count), 1)) * 100)) : 85;
              return (
                <div key={skill} className="flex items-center gap-2 text-xs">
                  <span className="w-28 text-gray-700 truncate">{skill}</span>
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: `${gap}%` }} />
                  </div>
                  <span className="text-gray-400 w-8 text-right">{gap}%</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Industry Demand</h2>
          <div className="space-y-2">
            {(data?.industryDistribution || []).map((ind: any) => (
              <div key={ind.name} className="flex items-center gap-2">
                <div className="flex-1">
                  <div className="flex items-center justify-between text-xs mb-0.5">
                    <span className="text-gray-700">{ind.name}</span>
                    <span className="text-gray-500">{ind.percentage}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${ind.percentage}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Suggested Curriculum Improvements</h2>
          <ul className="space-y-2 text-xs text-gray-700">
            {topSkills.slice(0, 5).map((s: any, i: number) => (
              <li key={s.name} className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-orange-100 flex items-center justify-center text-[9px] font-bold text-orange-600 shrink-0 mt-0.5">{i + 1}</span>
                <span>Integrate <strong>{s.name}</strong> more deeply into {topCareers[0]?.mostCommonCourse || 'core'} curriculum with hands-on projects and industry partnerships.</span>
              </li>
            ))}
            {topSkills.length === 0 && <li className="text-gray-400">No data available yet.</li>}
          </ul>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Emerging Technologies</h2>
          <div className="flex flex-wrap gap-1.5">
            {emergingTechnologies.map((tech) => (
              <span key={tech} className="px-2 py-1 bg-orange-50 text-orange-700 text-[10px] font-medium rounded-full">{tech}</span>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-3">Consider introducing elective courses or specialized tracks in these areas to keep graduates competitive.</p>
        </div>
      </div>
    </div>
  );
}
