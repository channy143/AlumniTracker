import { useEffect, useState, useRef } from 'react';
import {
  ChartBarIcon,
  UserGroupIcon,
  ClockIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';
import { formatExperience } from '@/utils/formatExperience';
import { XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

type Segment = 'employers' | 'career' | 'workforce';

export interface RankCard {
  rank: number;
  name: string;
  count: number;
  metric: string;
  metricLabel: string;
  kind: 'employer' | 'growing' | 'industry' | 'batch' | 'skill' | 'status' | 'career';
  industry?: string | null;
  topEmployer?: string | null;
  experience?: string | null;
  percentage?: number;
  activeJobsCount?: number;
  hiredViaJobsCount?: number;
  details?: { label: string; value: string }[];
}

const SEGMENTS: { key: Segment; label: string; fullTitle: string }[] = [
  { key: 'employers', label: 'Top Employers', fullTitle: 'Top Employers' },
  { key: 'career', label: 'Top Positions', fullTitle: 'Top Job Positions' },
  { key: 'workforce', label: 'Industries & Status', fullTitle: 'Industries & Status' },
];

const GRADIENTS = [
  'from-amber-400 to-orange-500',
  'from-rose-400 to-pink-500',
  'from-violet-400 to-purple-500',
  'from-blue-400 to-indigo-500',
  'from-emerald-400 to-teal-500',
  'from-cyan-400 to-sky-500',
  'from-fuchsia-400 to-pink-600',
  'from-lime-400 to-green-500',
  'from-yellow-400 to-amber-500',
  'from-red-400 to-rose-600',
];

function lookupEmployerIndustry(employerName: string, topCareers: any[]): string | null {
  for (const c of topCareers) {
    if (c.topEmployers?.some((em: any) => em.name === employerName)) {
      const ind = c.topIndustries?.[0];
      if (ind?.name) return ind.name;
    }
  }
  return null;
}

function lookupEmployerCareer(employerName: string, topCareers: any[]): any | null {
  return topCareers.find((c) => c.topEmployers?.some((em: any) => em.name === employerName)) || null;
}

function SummaryStats({ overview }: { overview: any }) {
  if (!overview) return null;
  const stats = [
    { label: 'Top Career', value: overview.topCareer || '—', icon: <ChartBarIcon className="w-3.5 h-3.5 text-orange-600" /> },
    { label: 'Top Industry', value: overview.topIndustry || '—', icon: <ChartBarIcon className="w-3.5 h-3.5 text-orange-600" /> },
    { label: 'Emp. Rate', value: `${overview.employmentRate ?? 0}%`, icon: <UserGroupIcon className="w-3.5 h-3.5 text-orange-600" /> },
    { label: 'Avg Exp.', value: formatExperience(overview.averageExperienceYears, { compact: true }), icon: <ClockIcon className="w-3.5 h-3.5 text-orange-600" /> },
  ];
  return (
    <div className="grid grid-cols-2 gap-2 px-3 pt-3 pb-1">
      {stats.map((s) => (
        <div key={s.label} className="bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-orange-100 flex items-center justify-center shrink-0">{s.icon}</div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-gray-900 leading-tight truncate">{s.value}</p>
            <p className="text-[9px] text-gray-500">{s.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function BatchChart({ batchData }: { batchData: any[] }) {
  if (!batchData || batchData.length === 0) return null;
  return (
    <div className="px-3 pb-3 pt-1">
      <div className="bg-white border border-gray-200 rounded-lg p-2.5">
        <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
          <UserGroupIcon className="w-3 h-3 text-orange-500" />
          Employment by Graduation Batch
        </h4>
        <div className="h-28">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={batchData}>
              <XAxis dataKey="year" tick={{ fontSize: 9 }} />
              <YAxis tick={{ fontSize: 9 }} domain={[0, 100]} allowDecimals={false} tickFormatter={(v: number) => `${v}%`} />
              <Tooltip formatter={(value: number) => [`${Math.round(value)}%`, 'Rate']} />
              <Line type="monotone" dataKey="rate" stroke="#f97316" strokeWidth={2} dot={{ r: 2, fill: '#f97316' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default function CareerLeaderboardNav({
  data,
  selectedCard,
  onCardSelect,
}: {
  data: any;
  selectedCard: RankCard | null;
  onCardSelect: (card: RankCard) => void;
}) {
  const [segment, setSegment] = useState<Segment>('employers');
  const [workforceSubtab, setWorkforceSubtab] = useState<'industries' | 'status'>('industries');
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = (cardKey: string) => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
    }
    hoverTimerRef.current = setTimeout(() => {
      setHoveredCard(cardKey);
    }, 2000);
  };

  const handleMouseLeave = () => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    setHoveredCard(null);
  };

  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
      }
    };
  }, []);

  const employers: any[] = data.topEmployers || [];
  const topCareers: any[] = data.topCareers || [];
  const industries: any[] = data.topIndustries || [];
  const statuses: any[] = data.statusDistribution || [];

  // 1. Top Employers Card Data (Non-redundant details)
  const maxEmployerCount = Math.max(...employers.map((e) => e.alumniCount || 0), 1);
  const totalEmployed = data.overview?.totalEmployed || maxEmployerCount;
  const employerCards: RankCard[] = employers.slice(0, 8).map((e, i) => {
    const ind = e.industry || lookupEmployerIndustry(e.name, topCareers);
    const career = lookupEmployerCareer(e.name, topCareers);
    const pct = Math.round((e.alumniCount / maxEmployerCount) * 100);
    const sharePct = totalEmployed > 0 ? Math.round((e.alumniCount / totalEmployed) * 100) : 0;
    const activeJobs = e.activeJobsCount || 0;
    const hiredCount = e.hiredViaJobsCount || 0;

    return {
      rank: i + 1,
      name: e.name,
      count: e.alumniCount,
      metric: `${e.alumniCount}`,
      metricLabel: activeJobs > 0 ? `${e.alumniCount} alumni • ${activeJobs} open job${activeJobs > 1 ? 's' : ''}` : 'alumni',
      kind: 'employer' as const,
      industry: ind || 'General',
      percentage: pct,
      activeJobsCount: activeJobs,
      hiredViaJobsCount: hiredCount,
      details: [
        { label: 'Industry', value: ind || 'General' },
        { label: 'Top Career', value: career?.position || 'Various' },
        ...(activeJobs > 0 ? [{ label: 'Active Jobs', value: `${activeJobs} open role${activeJobs > 1 ? 's' : ''}` }] : []),
        ...(hiredCount > 0 ? [{ label: 'Hired via Portal', value: `${hiredCount} alumni` }] : []),
        { label: 'Workforce Share', value: `${sharePct}% of employed` },
      ],
    };
  });

  // 2. Top Job Positions Card Data (Non-redundant details)
  const maxCareerCount = Math.max(...topCareers.map((c) => c.alumniCount || 0), 1);
  const careerCards: RankCard[] = topCareers.slice(0, 8).map((c, i) => {
    const topEmp = c.topEmployers?.[0]?.name || null;
    const exp = c.averageExperienceYears != null ? formatExperience(c.averageExperienceYears, { compact: true }) : null;
    const topInd = c.topIndustries?.[0]?.name || null;
    const pct = Math.round((c.alumniCount / maxCareerCount) * 100);
    const sharePct = totalEmployed > 0 ? Math.round((c.alumniCount / totalEmployed) * 100) : 0;
    const activeJobs = c.activeJobsCount || 0;
    const hiredCount = c.hiredViaJobsCount || 0;

    return {
      rank: i + 1,
      name: c.position,
      count: c.alumniCount,
      metric: `${c.alumniCount}`,
      metricLabel: activeJobs > 0 ? `${c.alumniCount} alumni • ${activeJobs} open job${activeJobs > 1 ? 's' : ''}` : 'alumni',
      kind: 'career' as const,
      topEmployer: topEmp,
      experience: exp,
      industry: topInd,
      percentage: pct,
      activeJobsCount: activeJobs,
      hiredViaJobsCount: hiredCount,
      details: [
        { label: 'Top Employer', value: topEmp || 'Various' },
        ...(activeJobs > 0 ? [{ label: 'Active Jobs', value: `${activeJobs} open role${activeJobs > 1 ? 's' : ''}` }] : []),
        ...(hiredCount > 0 ? [{ label: 'Hired via Portal', value: `${hiredCount} alumni` }] : []),
        { label: 'Industry', value: topInd || 'General' },
        { label: 'Workforce Share', value: `${sharePct}% of employed` },
      ],
    };
  });

  // 3. Industries & Status Card Data
  const industryCards: RankCard[] = industries.slice(0, 8).map((ind, i) => {
    const activeJobs = ind.activeJobsCount || 0;
    const hiredCount = ind.hiredViaJobsCount || 0;
    return {
      rank: i + 1,
      name: ind.name,
      count: ind.alumniCount,
      percentage: ind.percentage,
      metric: `${ind.percentage}%`,
      metricLabel: activeJobs > 0 ? `${ind.alumniCount} alumni • ${activeJobs} open job${activeJobs > 1 ? 's' : ''}` : `${ind.alumniCount} alumni`,
      kind: 'industry' as const,
      activeJobsCount: activeJobs,
      hiredViaJobsCount: hiredCount,
      details: [
        { label: 'Industry Sector', value: ind.name },
        { label: 'Alumni Share', value: `${ind.percentage}%` },
        ...(activeJobs > 0 ? [{ label: 'Active Jobs', value: `${activeJobs} open role${activeJobs > 1 ? 's' : ''}` }] : []),
        ...(hiredCount > 0 ? [{ label: 'Hired via Portal', value: `${hiredCount} alumni` }] : []),
        { label: 'Ranking', value: `#${i + 1} of ${industries.length}` },
      ],
    };
  });

  const statusCards: RankCard[] = statuses.map((s, i) => ({
    rank: i + 1,
    name: s.status,
    count: s.count,
    percentage: s.percentage,
    metric: `${s.percentage}%`,
    metricLabel: `${s.count} alumni`,
    kind: 'status' as const,
    details: [
      { label: 'Status', value: s.status },
      { label: 'Overall Share', value: `${s.percentage}%` },
    ],
  }));

  const isSelected = (c: RankCard) => selectedCard?.kind === c.kind && selectedCard?.name === c.name;

  useEffect(() => {
    if (!selectedCard) return;
    const inEmployers = employerCards.some((c) => isSelected(c));
    const inCareer = careerCards.some((c) => isSelected(c));
    const inIndustry = industryCards.some((c) => isSelected(c));
    const inStatus = statusCards.some((c) => isSelected(c));

    if (inEmployers && segment !== 'employers') {
      setSegment('employers');
    } else if (inCareer && segment !== 'career') {
      setSegment('career');
    } else if (inIndustry) {
      if (segment !== 'workforce') setSegment('workforce');
      setWorkforceSubtab('industries');
    } else if (inStatus) {
      if (segment !== 'workforce') setSegment('workforce');
      setWorkforceSubtab('status');
    }
  }, [selectedCard]);

  const activeSegmentMeta = SEGMENTS.find((s) => s.key === segment);

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden h-full flex flex-col shadow-xs">
      <SummaryStats overview={data.overview} />

      {/* 3-Tab Segment Navigation */}
      <div className="flex bg-gray-200/80 shrink-0 mx-3 mt-2 rounded-t-lg overflow-hidden">
        {SEGMENTS.map((seg) => (
          <button
            key={seg.key}
            onClick={() => setSegment(seg.key)}
            onMouseDown={(e) => e.preventDefault()}
            style={{ outline: 'none', border: 'none', boxShadow: 'none' }}
            className={`flex-1 py-2 px-2 text-xs font-bold text-center transition-colors duration-150 leading-tight outline-none focus:outline-none active:outline-none ${
              segment === seg.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'bg-gray-200/80 text-gray-500 hover:text-gray-800'
            }`}
          >
            {seg.label}
          </button>
        ))}
      </div>

      {/* Filter hint header */}
      <div className="px-3 pt-2 pb-1 flex items-center justify-between text-[10px] text-gray-400">
        <span className="font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
          <FunnelIcon className="w-3 h-3 text-orange-500" />
          {activeSegmentMeta?.fullTitle}
        </span>
        <span>Click item to filter</span>
      </div>

      {/* Scrollable Cards Area - overflow-x-hidden strictly prevents horizontal scroll */}
      <div className="px-3 pt-1 pb-2 flex-1 min-h-0 flex flex-col overflow-y-auto overflow-x-hidden">
        {/* TAB 1: Top Employers */}
        {segment === 'employers' && (
          <div className="flex-1 flex flex-col gap-1.5 w-full min-w-0">
            {employerCards.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-6 my-auto">No employers found.</p>
            ) : (
              employerCards.map((c, i) => {
                const isHovered = hoveredCard === `${c.kind}-${c.name}`;
                const selected = isSelected(c);
                return (
                  <div
                    key={`${c.kind}-${c.name}`}
                    className="group flex flex-col overflow-hidden transition-all duration-200 w-full min-w-0"
                    onMouseEnter={() => handleMouseEnter(`${c.kind}-${c.name}`)}
                    onMouseLeave={handleMouseLeave}
                  >
                    <button
                      onClick={() => onCardSelect(c)}
                      onMouseDown={(e) => e.preventDefault()}
                      style={{ outline: 'none', border: 'none', boxShadow: 'none', WebkitTapHighlightColor: 'transparent' }}
                      className={`w-full text-left px-3 py-2.5 bg-gradient-to-r ${GRADIENTS[i % GRADIENTS.length]} cursor-pointer transition-all duration-200 relative outline-none focus:outline-none focus-visible:outline-none active:outline-none focus:ring-0 focus-visible:ring-0 active:ring-0 border-none select-none ${
                        isHovered ? 'shadow-md brightness-105' : ''
                      } ${
                        selected ? 'brightness-105' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-5 h-5 rounded-full bg-white/25 flex items-center justify-center text-[10px] font-bold text-white shrink-0 shadow-xs">
                            {c.rank}
                          </span>
                          <div className="min-w-0">
                            <span className="text-[13px] font-bold text-white truncate block drop-shadow-xs leading-snug">
                              {c.name}
                            </span>
                            {c.industry && (
                              <span className="inline-block text-[10px] text-white/90 font-medium truncate bg-black/15 px-1.5 py-0.2 rounded mt-0.5 max-w-[260px]">
                                {c.industry}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          <span className="text-sm font-extrabold text-white block leading-none drop-shadow-xs">
                            {c.metric}
                          </span>
                          <span className="text-[9px] text-white/75 font-medium block mt-0.5">
                            {c.metricLabel}
                          </span>
                        </div>
                      </div>

                      {/* Integrated progress bar */}
                      <div className="mt-2 w-full bg-black/20 h-1 overflow-hidden">
                        <div
                          className="bg-white/90 h-full transition-all duration-300"
                          style={{ width: `${Math.min(100, c.percentage || 0)}%` }}
                        />
                      </div>
                    </button>

                    {/* Hoverable expand drawer */}
                    <div
                      className={`overflow-hidden transition-all duration-300 ease-in-out w-full min-w-0 ${
                        isHovered ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'
                      }`}
                    >
                      <div className={`px-3 py-2 bg-gradient-to-r ${GRADIENTS[i % GRADIENTS.length]} w-full min-w-0`}>
                        <div className="grid grid-cols-2 gap-2 text-left w-full min-w-0">
                          {c.details?.map((d) => (
                            <div key={d.label} className="min-w-0 overflow-hidden">
                              <p className="text-[9px] text-white/60 uppercase tracking-wider font-semibold truncate">{d.label}</p>
                              <p className="text-[11px] font-semibold text-white truncate">{d.value}</p>
                            </div>
                          ))}
                        </div>
                        <div className="mt-2 pt-1 flex items-center justify-center text-[9px] text-white/80">
                          <span className="flex items-center gap-1 font-medium">
                            <FunnelIcon className="w-2.5 h-2.5" />
                            Click to filter alumni
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TAB 2: Top Job Positions */}
        {segment === 'career' && (
          <div className="flex-1 flex flex-col gap-1.5 w-full min-w-0">
            {careerCards.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-6 my-auto">No job positions found.</p>
            ) : (
              careerCards.map((c, i) => {
                const isHovered = hoveredCard === `${c.kind}-${c.name}`;
                const selected = isSelected(c);
                return (
                  <div
                    key={`${c.kind}-${c.name}`}
                    className="group flex flex-col overflow-hidden transition-all duration-200 w-full min-w-0"
                    onMouseEnter={() => handleMouseEnter(`${c.kind}-${c.name}`)}
                    onMouseLeave={handleMouseLeave}
                  >
                    <button
                      onClick={() => onCardSelect(c)}
                      onMouseDown={(e) => e.preventDefault()}
                      style={{ outline: 'none', border: 'none', boxShadow: 'none', WebkitTapHighlightColor: 'transparent' }}
                      className={`w-full text-left px-3 py-2.5 bg-gradient-to-r ${GRADIENTS[i % GRADIENTS.length]} cursor-pointer transition-all duration-200 relative outline-none focus:outline-none focus-visible:outline-none active:outline-none focus:ring-0 focus-visible:ring-0 active:ring-0 border-none select-none ${
                        isHovered ? 'shadow-md brightness-105' : ''
                      } ${
                        selected ? 'brightness-105' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-5 h-5 rounded-full bg-white/25 flex items-center justify-center text-[10px] font-bold text-white shrink-0 shadow-xs">
                            {c.rank}
                          </span>
                          <div className="min-w-0">
                            <span className="text-[13px] font-bold text-white truncate block drop-shadow-xs leading-snug">
                              {c.name}
                            </span>
                            {c.topEmployer && (
                              <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-white/90 font-medium truncate">
                                <span className="truncate bg-black/15 px-1.5 py-0.2 rounded max-w-[260px]">
                                  {c.topEmployer}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          <span className="text-sm font-extrabold text-white block leading-none drop-shadow-xs">
                            {c.metric}
                          </span>
                          <span className="text-[9px] text-white/75 font-medium block mt-0.5">
                            {c.metricLabel}
                          </span>
                        </div>
                      </div>

                      {/* Integrated progress bar */}
                      <div className="mt-2 w-full bg-black/20 h-1 overflow-hidden">
                        <div
                          className="bg-white/90 h-full transition-all duration-300"
                          style={{ width: `${Math.min(100, c.percentage || 0)}%` }}
                        />
                      </div>
                    </button>

                    {/* Hoverable expand drawer */}
                    <div
                      className={`overflow-hidden transition-all duration-300 ease-in-out w-full min-w-0 ${
                        isHovered ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'
                      }`}
                    >
                      <div className={`px-3 py-2 bg-gradient-to-r ${GRADIENTS[i % GRADIENTS.length]} w-full min-w-0`}>
                        <div className="grid grid-cols-2 gap-2 text-left w-full min-w-0">
                          {c.details?.map((d) => (
                            <div key={d.label} className="min-w-0 overflow-hidden">
                              <p className="text-[9px] text-white/60 uppercase tracking-wider font-semibold truncate">{d.label}</p>
                              <p className="text-[11px] font-semibold text-white truncate">{d.value}</p>
                            </div>
                          ))}
                        </div>
                        <div className="mt-2 pt-1 flex items-center justify-center text-[9px] text-white/80">
                          <span className="flex items-center gap-1 font-medium">
                            <FunnelIcon className="w-2.5 h-2.5" />
                            Click to filter alumni
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TAB 3: Industries & Status */}
        {segment === 'workforce' && (
          <div className="flex-1 flex flex-col gap-1.5 w-full min-w-0">
            {/* Sub-toggle between Industries and Status */}
            <div className="flex items-center justify-between gap-1 mb-1 bg-gray-100 p-0.5 rounded-md text-[11px] font-medium">
              <button
                onClick={() => setWorkforceSubtab('industries')}
                onMouseDown={(e) => e.preventDefault()}
                style={{ outline: 'none', border: 'none', boxShadow: 'none' }}
                className={`flex-1 py-1 rounded transition-all text-center outline-none focus:outline-none active:outline-none ${
                  workforceSubtab === 'industries'
                    ? 'bg-white text-gray-900 font-semibold shadow-xs'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                Industries ({industryCards.length})
              </button>
              <button
                onClick={() => setWorkforceSubtab('status')}
                onMouseDown={(e) => e.preventDefault()}
                style={{ outline: 'none', border: 'none', boxShadow: 'none' }}
                className={`flex-1 py-1 rounded transition-all text-center outline-none focus:outline-none active:outline-none ${
                  workforceSubtab === 'status'
                    ? 'bg-white text-gray-900 font-semibold shadow-xs'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                Status ({statusCards.length})
              </button>
            </div>

            {/* List rendered with gradient style + hoverable drawer */}
            {workforceSubtab === 'industries' &&
              (industryCards.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6 my-auto">No industries found.</p>
              ) : (
                industryCards.map((c, i) => {
                  const isHovered = hoveredCard === `${c.kind}-${c.name}`;
                  const selected = isSelected(c);
                  return (
                    <div
                      key={`${c.kind}-${c.name}`}
                      className="group flex flex-col overflow-hidden transition-all duration-200 w-full min-w-0"
                      onMouseEnter={() => handleMouseEnter(`${c.kind}-${c.name}`)}
                      onMouseLeave={handleMouseLeave}
                    >
                      <button
                        onClick={() => onCardSelect(c)}
                        onMouseDown={(e) => e.preventDefault()}
                        style={{ outline: 'none', border: 'none', boxShadow: 'none', WebkitTapHighlightColor: 'transparent' }}
                        className={`w-full text-left px-3 py-2.5 bg-gradient-to-r ${GRADIENTS[i % GRADIENTS.length]} cursor-pointer transition-all duration-200 relative outline-none focus:outline-none focus-visible:outline-none active:outline-none focus:ring-0 focus-visible:ring-0 active:ring-0 border-none select-none ${
                          isHovered ? 'shadow-md brightness-105' : ''
                        } ${
                          selected ? 'brightness-105' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-5 h-5 rounded-full bg-white/25 flex items-center justify-center text-[10px] font-bold text-white shrink-0 shadow-xs">
                              {c.rank}
                            </span>
                            <div className="min-w-0">
                              <span className="text-[13px] font-bold text-white truncate block drop-shadow-xs leading-snug">
                                {c.name}
                              </span>
                              <span className="text-[10px] text-white/90 font-medium block mt-0.5 opacity-90 truncate max-w-[260px]">
                                {c.metricLabel}
                              </span>
                            </div>
                          </div>

                          <div className="shrink-0 text-right">
                            <span className="text-sm font-extrabold text-white block leading-none drop-shadow-xs">
                              {c.metric}
                            </span>
                          </div>
                        </div>

                        {/* Integrated progress bar */}
                        <div className="mt-2 w-full bg-black/20 h-1 overflow-hidden">
                          <div
                            className="bg-white/90 h-full transition-all duration-300"
                            style={{ width: `${Math.min(100, c.percentage || 0)}%` }}
                          />
                        </div>
                      </button>

                      {/* Hoverable expand drawer */}
                      <div
                        className={`overflow-hidden transition-all duration-300 ease-in-out w-full min-w-0 ${
                          isHovered ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'
                        }`}
                      >
                        <div className={`px-3 py-2 bg-gradient-to-r ${GRADIENTS[i % GRADIENTS.length]} w-full min-w-0`}>
                          <div className="grid grid-cols-2 gap-2 text-left w-full min-w-0">
                            {c.details?.map((d) => (
                              <div key={d.label} className="min-w-0 overflow-hidden">
                                <p className="text-[9px] text-white/60 uppercase tracking-wider font-semibold truncate">{d.label}</p>
                                <p className="text-[11px] font-semibold text-white truncate">{d.value}</p>
                              </div>
                            ))}
                          </div>
                          <div className="mt-2 pt-1 flex items-center justify-center text-[9px] text-white/80">
                            <span className="flex items-center gap-1 font-medium">
                              <FunnelIcon className="w-2.5 h-2.5" />
                              Click to filter alumni
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ))}

            {workforceSubtab === 'status' &&
              (statusCards.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6 my-auto">No status data found.</p>
              ) : (
                statusCards.map((c, i) => {
                  const isHovered = hoveredCard === `${c.kind}-${c.name}`;
                  const selected = isSelected(c);
                  return (
                    <div
                      key={`${c.kind}-${c.name}`}
                      className="group flex flex-col overflow-hidden transition-all duration-200 w-full min-w-0"
                      onMouseEnter={() => handleMouseEnter(`${c.kind}-${c.name}`)}
                      onMouseLeave={handleMouseLeave}
                    >
                      <button
                        onClick={() => onCardSelect(c)}
                        onMouseDown={(e) => e.preventDefault()}
                        style={{ outline: 'none', border: 'none', boxShadow: 'none', WebkitTapHighlightColor: 'transparent' }}
                        className={`w-full text-left px-3 py-2.5 bg-gradient-to-r ${GRADIENTS[i % GRADIENTS.length]} cursor-pointer transition-all duration-200 relative outline-none focus:outline-none focus-visible:outline-none active:outline-none focus:ring-0 focus-visible:ring-0 active:ring-0 border-none select-none ${
                          isHovered ? 'shadow-md brightness-105' : ''
                        } ${
                          selected ? 'brightness-105' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-5 h-5 rounded-full bg-white/25 flex items-center justify-center text-[10px] font-bold text-white shrink-0 shadow-xs">
                              {c.rank}
                            </span>
                            <div className="min-w-0">
                              <span className="text-[13px] font-bold text-white truncate block drop-shadow-xs leading-snug">
                                {c.name}
                              </span>
                              <span className="text-[10px] text-white/90 font-medium block mt-0.5 opacity-90 truncate max-w-[260px]">
                                {c.metricLabel}
                              </span>
                            </div>
                          </div>

                          <div className="shrink-0 text-right">
                            <span className="text-sm font-extrabold text-white block leading-none drop-shadow-xs">
                              {c.metric}
                            </span>
                          </div>
                        </div>

                        {/* Integrated progress bar */}
                        <div className="mt-2 w-full bg-black/20 h-1 overflow-hidden">
                          <div
                            className="bg-white/90 h-full transition-all duration-300"
                            style={{ width: `${Math.min(100, c.percentage || 0)}%` }}
                          />
                        </div>
                      </button>

                      {/* Hoverable expand drawer */}
                      <div
                        className={`overflow-hidden transition-all duration-300 ease-in-out w-full min-w-0 ${
                          isHovered ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'
                        }`}
                      >
                        <div className={`px-3 py-2 bg-gradient-to-r ${GRADIENTS[i % GRADIENTS.length]} w-full min-w-0`}>
                          <div className="grid grid-cols-2 gap-2 text-left w-full min-w-0">
                            {c.details?.map((d) => (
                              <div key={d.label} className="min-w-0 overflow-hidden">
                                <p className="text-[9px] text-white/60 uppercase tracking-wider font-semibold truncate">{d.label}</p>
                                <p className="text-[11px] font-semibold text-white truncate">{d.value}</p>
                              </div>
                            ))}
                          </div>
                          <div className="mt-2 pt-1 flex items-center justify-center text-[9px] text-white/80">
                            <span className="flex items-center gap-1 font-medium">
                              <FunnelIcon className="w-2.5 h-2.5" />
                              Click to filter alumni
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ))}
          </div>
        )}
      </div>

      <BatchChart batchData={data.batchDistribution} />
    </div>
  );
}
