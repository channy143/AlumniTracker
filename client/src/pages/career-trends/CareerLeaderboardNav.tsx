import { useEffect, useState } from 'react';
import { ChartBarIcon, UserGroupIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

type Segment = 'employers' | 'career' | 'workforce';

export interface RankCard {
  rank: number;
  name: string;
  metric: string;
  metricLabel: string;
  kind: 'employer' | 'growing' | 'industry' | 'batch' | 'skill' | 'status' | 'career';
  details: { label: string; value: string }[];
}

const SEGMENTS: { key: Segment; label: string }[] = [
  { key: 'employers', label: 'Employers' },
  { key: 'career', label: 'Career' },
  { key: 'workforce', label: 'Workforce' },
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
    { label: 'Top Career', value: overview.topCareer || '—', icon: <ChartBarIcon className="w-4 h-4 text-orange-600" /> },
    { label: 'Top Industry', value: overview.topIndustry || '—', icon: <ChartBarIcon className="w-4 h-4 text-orange-600" /> },
    { label: 'Emp. Rate', value: `${overview.employmentRate ?? 0}%`, icon: <UserGroupIcon className="w-4 h-4 text-orange-600" /> },
    { label: 'Avg Exp.', value: `${overview.averageExperienceYears ?? 0}yrs`, icon: <ChartBarIcon className="w-4 h-4 text-orange-600" /> },
  ];
  return (
    <div className="grid grid-cols-2 gap-2 px-3 pt-3 pb-1">
      {stats.map((s) => (
        <div key={s.label} className="bg-white border border-gray-200 rounded-lg px-2.5 py-2 flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-orange-100 flex items-center justify-center shrink-0">{s.icon}</div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-gray-900 leading-none truncate">{s.value}</p>
            <p className="text-[9px] text-gray-500 mt-0.5">{s.label}</p>
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
        <div className="h-32">
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

export default function CareerLeaderboardNav({ data, selectedCard, onCardSelect }: {
  data: any;
  selectedCard: RankCard | null;
  onCardSelect: (card: RankCard) => void;
}) {
  const [segment, setSegment] = useState<Segment>('employers');
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  const employers: any[] = data.topEmployers || [];
  const topCareers: any[] = data.topCareers || [];
  const growing: any[] = data.fastestGrowing || [];
  const industries: any[] = data.topIndustries || [];
  const batches: any[] = data.topBatches || [];
  const skills: any[] = data.skillsDistribution || [];
  const statuses: any[] = data.statusDistribution || [];

  const employerCards: RankCard[] = employers.slice(0, 6).map((e, i) => ({
    rank: i + 1,
    name: e.name,
    metric: `${e.alumniCount}`,
    metricLabel: 'alumni',
    kind: 'employer' as const,
    details: (() => {
      const industry = lookupEmployerIndustry(e.name, topCareers);
      const career = lookupEmployerCareer(e.name, topCareers);
      const items: { label: string; value: string }[] = [];
      if (industry) items.push({ label: 'Top Industry', value: industry });
      if (career?.position) items.push({ label: 'Top Career', value: career.position });
      if (career?.averageExperienceYears) items.push({ label: 'Avg Experience', value: `${career.averageExperienceYears} yrs` });
      return items;
    })(),
  }));

  const careerCards: RankCard[] = [
    ...growing.slice(0, 3).map((g, i) => ({
      rank: i + 1,
      name: g.position,
      metric: `+${g.newAlumni}`,
      metricLabel: 'new this yr',
      kind: 'growing' as const,
      details: (() => {
        const career = topCareers.find((c) => c.position === g.position);
        const items: { label: string; value: string }[] = [];
        items.push({ label: 'New This Year', value: `${g.newAlumni}` });
        if (career?.alumniCount) items.push({ label: 'Total Alumni', value: `${career.alumniCount}` });
        if (career?.averageExperienceYears) items.push({ label: 'Avg Experience', value: `${career.averageExperienceYears} yrs` });
        if (career?.topEmployers?.length) items.push({ label: 'Top Employer', value: career.topEmployers[0].name });
        return items;
      })(),
    })),
    ...industries.slice(0, 4).map((ind, i) => ({
      rank: i + 1,
      name: ind.name,
      metric: `${ind.percentage}%`,
      metricLabel: 'of alumni',
      kind: 'industry' as const,
      details: [
        { label: 'Total Alumni', value: `${ind.alumniCount}` },
        { label: 'Share', value: `${ind.percentage}%` },
      ],
    })),
    ...batches.slice(0, 4).map((b, i) => ({
      rank: i + 1,
      name: `Batch ${b.year}`,
      metric: `${b.total}`,
      metricLabel: 'alumni',
      kind: 'batch' as const,
      details: [
        { label: 'Employed', value: `${b.employed}` },
        { label: 'Rate', value: `${b.total > 0 ? Math.round((b.employed / b.total) * 100) : 0}%` },
      ],
    })),
  ];

  const workforceCards: RankCard[] = [
    ...skills.slice(0, 5).map((s, i) => ({
      rank: i + 1,
      name: s.name,
      metric: `${s.count}`,
      metricLabel: 'used by',
      kind: 'skill' as const,
      details: (() => {
        const careerCount = topCareers.filter((c) => c.topSkills?.some((sk: any) => sk.name === s.name)).length;
        const items: { label: string; value: string }[] = [];
        items.push({ label: 'Alumni', value: `${s.count}` });
        items.push({ label: 'Careers', value: `${careerCount} positions` });
        return items;
      })(),
    })),
    ...statuses.slice(0, 4).map((s, i) => ({
      rank: i + 1,
      name: s.status,
      metric: `${s.percentage}%`,
      metricLabel: 'of alumni',
      kind: 'status' as const,
      details: [
        { label: 'Count', value: `${s.count}` },
        { label: 'Share', value: `${s.percentage}%` },
      ],
    })),
  ];

  const normalizeRanks = (cards: RankCard[]): RankCard[] =>
    cards.filter((c, i, arr) => arr.findIndex((x) => x.name === c.name) === i)
      .map((c, idx) => ({ ...c, rank: idx + 1 }));

  const employersFinal = normalizeRanks(employerCards);
  const careerFinal = normalizeRanks(careerCards);
  const workforceFinal = normalizeRanks(workforceCards);

  const isSelected = (c: RankCard) => selectedCard?.kind === c.kind && selectedCard?.name === c.name;

  useEffect(() => {
    if (!selectedCard) return;
    const inEmployers = employersFinal.some((c) => isSelected(c));
    const inCareer = careerFinal.some((c) => isSelected(c));
    const inWorkforce = workforceFinal.some((c) => isSelected(c));
    if (inEmployers && segment !== 'employers') setSegment('employers');
    else if (inCareer && segment !== 'career') setSegment('career');
    else if (inWorkforce && segment !== 'workforce') setSegment('workforce');
  }, [selectedCard]);

  const currentCards = segment === 'employers' ? employersFinal : segment === 'career' ? careerFinal : workforceFinal;

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden h-full flex flex-col">
      <SummaryStats overview={data.overview} />

      <div className="flex bg-gray-200/80 shrink-0 mx-3 mt-2 rounded-t-lg overflow-hidden">
        {SEGMENTS.map((seg) => (
          <button
            key={seg.key}
            onClick={() => setSegment(seg.key)}
            className={`flex-1 py-2.5 text-[13px] font-bold text-center transition-colors duration-150 ${
              segment === seg.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'bg-gray-200/80 text-gray-500 hover:text-gray-700'
            }`}
          >
            {seg.label}
          </button>
        ))}
      </div>

      <div className="px-3 pt-2 pb-1 flex-1 min-h-0 flex flex-col overflow-y-auto">
        {currentCards.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-6 my-auto">No data available.</p>
        ) : (
          <div className="flex-1 flex flex-col gap-1.5">
            {currentCards.map((c, i) => {
              const isHovered = hoveredCard === `${c.kind}-${c.name}`;
              const selected = isSelected(c);
              return (
                <div
                  key={`${c.kind}-${c.name}`}
                  className="group flex flex-col"
                  onMouseEnter={() => setHoveredCard(`${c.kind}-${c.name}`)}
                  onMouseLeave={() => setHoveredCard(null)}
                >
                  <button
                    onClick={() => onCardSelect(c)}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 bg-gradient-to-r ${GRADIENTS[i % GRADIENTS.length]} text-left cursor-pointer transition-all duration-200 ${isHovered ? 'shadow-lg' : ''} ${selected ? 'ring-2 ring-offset-1 ring-gray-900/70 scale-[1.01] z-10' : ''}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[9px] font-bold text-white shrink-0">
                        {c.rank}
                      </span>
                      <div className="min-w-0">
                        <span className="text-[13px] font-semibold text-white truncate block">{c.name}</span>
                        {c.metricLabel && <span className="text-[9px] text-white/70 block">{c.metricLabel}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 leading-tight">
                      <span className="text-sm font-bold text-white">{c.metric}</span>
                      <ChevronRightIcon className={`w-4 h-4 text-white/70 transition-transform ${selected ? 'rotate-90' : ''}`} />
                    </div>
                  </button>

                  <div
                    className={`overflow-hidden transition-all duration-300 ease-in-out ${
                      isHovered ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'
                    }`}
                  >
                    <div className={`px-3 py-2.5 bg-gradient-to-r ${GRADIENTS[i % GRADIENTS.length]} border-t border-white/10`}>
                      <div className="grid grid-cols-2 gap-2">
                        {c.details.map((d) => (
                          <div key={d.label}>
                            <p className="text-[9px] text-white/50 uppercase tracking-wider">{d.label}</p>
                            <p className="text-[11px] font-medium text-white">{d.value}</p>
                          </div>
                        ))}
                      </div>
                      <p className="text-[9px] text-white/40 mt-1.5">Click to view full details</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <BatchChart batchData={data.batchDistribution} />
    </div>
  );
}
