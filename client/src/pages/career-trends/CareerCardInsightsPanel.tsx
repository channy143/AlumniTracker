import { useEffect, useState } from 'react';
import { ArrowLeftIcon, BriefcaseIcon, BuildingOfficeIcon, UserGroupIcon, CurrencyDollarIcon, MapPinIcon, AcademicCapIcon, ClockIcon, TagIcon } from '@heroicons/react/24/outline';
import { careerTrendsApi } from '@/services/api';
import type { RankCard } from './CareerLeaderboardNav';

const KIND_META: Record<string, { label: string; type: string }> = {
  employer: { label: 'Top Employer', type: 'employer' },
  growing: { label: 'Fastest Growing Career', type: 'position' },
  career: { label: 'Career', type: 'position' },
  industry: { label: 'Top Industry', type: 'industry' },
  batch: { label: 'Graduation Batch', type: 'batch' },
  skill: { label: 'Skill', type: 'skill' },
  status: { label: 'Employment Status', type: 'status' },
};

const STATUS_COLORS: Record<string, string> = {
  'Employed': 'bg-emerald-100 text-emerald-700',
  'Self-Employed': 'bg-blue-100 text-blue-700',
  'Unemployed': 'bg-gray-100 text-gray-600',
  'Previous': 'bg-amber-100 text-amber-700',
};

const AVATAR_COLORS = [
  'bg-orange-100 text-orange-600',
  'bg-blue-100 text-blue-600',
  'bg-emerald-100 text-emerald-600',
  'bg-violet-100 text-violet-600',
  'bg-rose-100 text-rose-600',
];

function statusColor(status: string): string {
  return STATUS_COLORS[status] || 'bg-gray-100 text-gray-600';
}

export default function CareerCardInsightsPanel({ card, onBack }: {
  card: RankCard;
  onBack: () => void;
}) {
  const meta = KIND_META[card.kind] || { label: 'Details', type: 'position' };
  const [data, setData] = useState<any>({ alumni: [], summary: {} });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    careerTrendsApi.alumni(meta.type, card.name)
      .then((res) => { if (!cancelled) setData(res); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [card.name, card.kind, meta.type]);

  const summary = data.summary || {};

  const statCards: { label: string; value: string | number }[] = [
    { label: 'Alumni', value: summary.total ?? 0 },
  ];
  if (card.kind === 'employer') {
    statCards.push({ label: 'Positions', value: summary.positions ?? 0 });
    statCards.push({ label: 'Industries', value: summary.industries ?? 0 });
    statCards.push({ label: 'Salary Share', value: `${summary.salaryShare ?? 0}%` });
  } else if (card.kind === 'industry') {
    statCards.push({ label: 'Companies', value: summary.companies ?? 0 });
    statCards.push({ label: 'Positions', value: summary.positions ?? 0 });
    statCards.push({ label: 'Salary Share', value: `${summary.salaryShare ?? 0}%` });
  } else {
    statCards.push({ label: 'Companies', value: summary.companies ?? 0 });
    statCards.push({ label: 'Industries', value: summary.industries ?? 0 });
    statCards.push({ label: 'Salary Share', value: `${summary.salaryShare ?? 0}%` });
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onBack}
            className="shrink-0 flex items-center gap-1 text-xs font-medium text-orange-600 hover:text-orange-700 transition-colors"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Back</span>
          </button>
          <div className="w-9 h-9 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
            <BuildingOfficeIcon className="w-4 h-4 text-orange-600" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold text-orange-600 uppercase tracking-wider">{meta.label}</p>
            <h2 className="text-sm font-bold text-gray-900 truncate">{card.name}</h2>
          </div>
        </div>
        <span className="shrink-0 text-xs text-gray-400">{summary.total ?? 0} alumni</span>
      </div>

      <div className="px-4 py-3">
        {loading ? (
          <div className="space-y-4" aria-busy="true" aria-label="Loading alumni details">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-gray-50 rounded-lg p-2.5 text-center">
                  <div className="h-5 w-10 mx-auto bg-gray-200 animate-pulse rounded mb-1.5" />
                  <div className="h-2.5 w-14 mx-auto bg-gray-200 animate-pulse rounded" />
                </div>
              ))}
            </div>

            <div>
              <div className="h-3 w-14 bg-gray-200 animate-pulse rounded mb-2.5" />
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 text-xs py-2.5 px-1 border border-gray-100 rounded-lg"
                  >
                    <div className="w-9 h-9 rounded-full bg-gray-200 animate-pulse shrink-0" />
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="h-3 w-1/3 bg-gray-200 animate-pulse rounded" />
                        <div className="h-4 w-16 bg-gray-200 animate-pulse rounded-full" />
                      </div>
                      <div className="h-2.5 w-2/3 bg-gray-200 animate-pulse rounded" />
                      <div className="h-2.5 w-1/2 bg-gray-200 animate-pulse rounded" />
                      <div className="flex gap-1.5">
                        <div className="h-4 w-12 bg-orange-100 animate-pulse rounded-md" />
                        <div className="h-4 w-16 bg-orange-100 animate-pulse rounded-md" />
                        <div className="h-4 w-10 bg-orange-100 animate-pulse rounded-md" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
              {statCards.map((s) => (
                <div key={s.label} className="bg-gray-50 rounded-lg p-2.5 text-center">
                  <p className="text-lg font-bold text-gray-900">{s.value}</p>
                  <p className="text-[10px] text-gray-500">{s.label}</p>
                </div>
              ))}
            </div>

            {data.alumni.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No alumni found for "{card.name}".</p>
            ) : (
              <>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <UserGroupIcon className="w-4 h-4 text-orange-500" />
                  Alumni
                </h3>
                <div className="space-y-2">
                  {data.alumni.map((a: any, idx: number) => (
                    <div
                      key={a.id}
                      className="flex items-start gap-3 text-xs py-2.5 px-1 border border-gray-100 rounded-lg hover:bg-orange-50/40 transition-colors"
                    >
                      <div className={`w-9 h-9 rounded-full ${AVATAR_COLORS[idx % AVATAR_COLORS.length]} flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden`}>
                        {a.avatar_url ? (
                          <img src={a.avatar_url} alt={a.name || ''} className="w-full h-full object-cover" />
                        ) : (
                          (a.name || '?').charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-gray-800 truncate">{a.name}</p>
                          <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-medium shrink-0 ${statusColor(a.employmentStatus)}`}>
                            {a.employmentStatus}
                          </span>
                        </div>

                        <div className="mt-1 space-y-0.5">
                          {a.position && (
                            <p className="text-gray-600 flex items-center gap-1">
                              <BriefcaseIcon className="w-3 h-3 text-gray-400 shrink-0" />
                              <span className="truncate">{a.position}</span>
                            </p>
                          )}
                          {a.company && (
                            <p className="text-gray-500 flex items-center gap-1">
                              <BuildingOfficeIcon className="w-3 h-3 text-gray-400 shrink-0" />
                              <span className="truncate">{a.company}</span>
                            </p>
                          )}
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-gray-500">
                            {a.salary && (
                              <span className="flex items-center gap-1 text-emerald-600 font-medium">
                                <CurrencyDollarIcon className="w-3 h-3 shrink-0" />
                                {a.salary}
                              </span>
                            )}
                            {a.location && (
                              <span className="flex items-center gap-1">
                                <MapPinIcon className="w-3 h-3 text-gray-400 shrink-0" />
                                {a.location}
                              </span>
                            )}
                            {a.jobType && (
                              <span className="flex items-center gap-1 capitalize">
                                <TagIcon className="w-3 h-3 text-gray-400 shrink-0" />
                                {a.jobType}
                              </span>
                            )}
                            {a.batch && (
                              <span className="flex items-center gap-1">
                                <AcademicCapIcon className="w-3 h-3 text-gray-400 shrink-0" />
                                Batch {a.batch}
                              </span>
                            )}
                            {a.program && (
                              <span className="flex items-center gap-1 truncate max-w-full">
                                <ClockIcon className="w-3 h-3 text-gray-400 shrink-0" />
                                {a.program}
                              </span>
                            )}
                          </div>
                          {a.skills && a.skills.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {a.skills.map((s: string) => (
                                <span key={s} className="px-1.5 py-0.5 bg-orange-50 text-orange-700 rounded-md text-[9px] font-medium">
                                  {s}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
