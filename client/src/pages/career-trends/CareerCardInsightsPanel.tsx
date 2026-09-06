import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, BriefcaseIcon, BuildingOfficeIcon, UserGroupIcon, CurrencyDollarIcon, MapPinIcon, AcademicCapIcon, ClockIcon, TagIcon } from '@heroicons/react/24/outline';
import { careerTrendsApi } from '@/services/api';
import { formatProgramLongName } from '@/utils/formatProgram';
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

export default function CareerCardInsightsPanel({
  card,
  onBack,
  onToggleActiveJobs,
  isActiveJobsNavOpen,
}: {
  card: RankCard;
  onBack: () => void;
  onToggleActiveJobs?: (jobs: any[]) => void;
  isActiveJobsNavOpen?: boolean;
}) {
  const navigate = useNavigate();
  const meta = KIND_META[card.kind] || { label: 'Details', type: 'position' };
  const [data, setData] = useState<any>({ alumni: [], summary: {}, activeJobs: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    careerTrendsApi.alumni(meta.type, card.name)
      .then((res) => {
        if (!cancelled) {
          setData(res);
        }
      })
      .catch(() => { })
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
    if (summary.activeJobsCount) {
      statCards.push({ label: 'Active Jobs', value: summary.activeJobsCount });
    } else {
      statCards.push({ label: 'Salary Share', value: `${summary.salaryShare ?? 0}%` });
    }
  } else if (card.kind === 'industry') {
    statCards.push({ label: 'Companies', value: summary.companies ?? 0 });
    statCards.push({ label: 'Positions', value: summary.positions ?? 0 });
    if (summary.activeJobsCount) {
      statCards.push({ label: 'Active Jobs', value: summary.activeJobsCount });
    } else {
      statCards.push({ label: 'Salary Share', value: `${summary.salaryShare ?? 0}%` });
    }
  } else {
    statCards.push({ label: 'Companies', value: summary.companies ?? 0 });
    statCards.push({ label: 'Industries', value: summary.industries ?? 0 });
    if (summary.activeJobsCount) {
      statCards.push({ label: 'Active Jobs', value: summary.activeJobsCount });
    } else {
      statCards.push({ label: 'Salary Share', value: `${summary.salaryShare ?? 0}%` });
    }
  }
  if (summary.hiredThroughPortalCount > 0) {
    statCards.push({ label: 'Portal Hires', value: summary.hiredThroughPortalCount });
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
        {data.activeJobs && data.activeJobs.length > 0 ? (
          <button
            type="button"
            onClick={() => onToggleActiveJobs?.(data.activeJobs)}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-2xs ${
              isActiveJobsNavOpen
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
            }`}
          >
            <BriefcaseIcon className={`w-3.5 h-3.5 shrink-0 ${isActiveJobsNavOpen ? 'text-white' : 'text-emerald-600'}`} />
            <span>Active Job Openings ({data.activeJobs.length})</span>
          </button>
        ) : (
          <span className="shrink-0 text-xs text-gray-400">{summary.total ?? 0} alumni</span>
        )}
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
                <div className="space-y-3">
                  {data.alumni.map((a: any, idx: number) => (
                    <div
                      key={a.id}
                      className="p-3.5 bg-white border border-gray-200/90 rounded-xl hover:border-orange-300/80 hover:shadow-xs transition-all duration-150"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-full ${AVATAR_COLORS[idx % AVATAR_COLORS.length]} flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden shadow-2xs border border-white`}>
                          {a.avatar_url ? (
                            <img src={a.avatar_url} alt={a.name || ''} className="w-full h-full object-cover" />
                          ) : (
                            (a.name || '?').charAt(0).toUpperCase()
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-bold text-gray-900 text-sm truncate leading-snug">{a.name}</p>
                            <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                              {a.hiredViaJob && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200/80 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                                  Hired via Portal
                                </span>
                              )}
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 border ${statusColor(a.employmentStatus)}`}>
                                {a.employmentStatus}
                              </span>
                            </div>
                          </div>

                          {/* Position & Company */}
                          {(a.position || a.company) && (
                            <p className="text-xs text-gray-700 font-medium mt-0.5 truncate flex items-center gap-1.5">
                              <BriefcaseIcon className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                              <span className="truncate">
                                <span className="font-semibold text-gray-900">{a.position || 'Alumni'}</span>
                                {a.company && <span className="text-gray-500 font-normal"> at <strong className="font-medium text-gray-800">{a.company}</strong></span>}
                              </span>
                            </p>
                          )}

                          {/* Meta Information Section */}
                          <div className="mt-2 pt-2 border-t border-gray-100 flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-xs text-gray-500">
                            {(a.program || a.batch) && (
                              <span
                                className="flex items-center gap-1 text-[11px] text-gray-600"
                                title={`${formatProgramLongName(a.program) || a.program || ''}${a.batch ? ` (Batch ${a.batch})` : ''}`}
                              >
                                <AcademicCapIcon className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                <span className="max-w-[340px] sm:max-w-none truncate sm:whitespace-normal font-medium">
                                  {formatProgramLongName(a.program) || a.program}
                                  {a.batch ? ` (Batch ${a.batch})` : ''}
                                </span>
                              </span>
                            )}

                            {a.location && (
                              <span className="flex items-center gap-1 text-[11px] text-gray-500">
                                <MapPinIcon className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                <span className="truncate">{a.location}</span>
                              </span>
                            )}

                            {a.jobType && (
                              <span className="flex items-center gap-1 text-[11px] text-gray-500 capitalize">
                                <TagIcon className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                <span>{a.jobType}</span>
                              </span>
                            )}

                            {a.salary && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100/80">
                                <CurrencyDollarIcon className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                                <span>₱{a.salary}</span>
                              </span>
                            )}
                          </div>

                          {/* Skills Section */}
                          {a.skills && a.skills.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1 mt-2.5">
                              {a.skills.map((s: string) => (
                                <span key={s} className="px-2 py-0.5 bg-orange-50/80 text-orange-700 rounded-md text-[10px] font-medium border border-orange-100">
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
