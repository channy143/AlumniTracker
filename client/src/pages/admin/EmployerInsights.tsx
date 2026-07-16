import { useState, useEffect } from 'react';
import { careerTrendsApi } from '@/services/api';
import { SkeletonCard } from '@/components/ui/Skeleton';

export default function EmployerInsights() {
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
        <div className="mb-4"><div className="h-5 w-36 bg-gray-200 animate-pulse rounded mb-1" /><div className="h-3 w-48 bg-gray-200 animate-pulse rounded" /></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{[1, 2, 3, 4].map((i) => <SkeletonCard key={i} className="h-36" />)}</div>
      </div>
    );
  }

  const topEmployers = data?.topEmployers || [];
  const industryDistribution = data?.industryDistribution || [];
  const topCareers = data?.topCareers || [];

  const bsitEmployers = topEmployers.filter(() => true);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-4">
        <h1 className="text-base font-bold text-gray-900">Employer Insights</h1>
        <p className="text-xs text-gray-500">Top employers, hiring trends, and industry distribution.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Top Employers</h2>
          <div className="space-y-2">
            {topEmployers.slice(0, 8).map((e: any, i: number) => (
              <div key={e.name} className="flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-orange-100 flex items-center justify-center text-[10px] font-bold text-orange-600 shrink-0">{i + 1}</span>
                <span className="flex-1 text-xs text-gray-700">{e.name}</span>
                <span className="text-xs text-gray-500">{e.alumniCount} alumni</span>
              </div>
            ))}
            {topEmployers.length === 0 && <p className="text-xs text-gray-400 text-center py-4">No employer data yet.</p>}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Industry Distribution</h2>
          <div className="space-y-2">
            {industryDistribution.map((ind: any) => (
              <div key={ind.name}>
                <div className="flex items-center justify-between text-xs mb-0.5">
                  <span className="text-gray-700">{ind.name}</span>
                  <span className="text-gray-500">{ind.percentage}%</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${ind.percentage}%`, backgroundColor: ['#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444'][industryDistribution.indexOf(ind) % 6] }} />
                </div>
              </div>
            ))}
            {industryDistribution.length === 0 && <p className="text-xs text-gray-400 text-center py-4">No industry data yet.</p>}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Hiring Trends</h2>
          <div className="space-y-2">
            {topCareers.slice(0, 6).map((c: any) => (
              <div key={c.position} className="flex items-center justify-between text-xs">
                <span className="text-gray-700">{c.position}</span>
                <span className="text-gray-500">{c.alumniCount} hired</span>
              </div>
            ))}
            {topCareers.length === 0 && <p className="text-xs text-gray-400 text-center py-4">No hiring trend data yet.</p>}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">New Employer Partners</h2>
          <p className="text-xs text-gray-400 text-center py-4">New employer partner data will appear as alumni report their employment.</p>
        </div>
      </div>
    </div>
  );
}
