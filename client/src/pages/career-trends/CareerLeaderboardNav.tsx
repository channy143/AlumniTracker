import { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

type Segment = 'employers' | 'career' | 'workforce';

interface RankCard {
  rank: number;
  name: string;
  metric: string;
  metricLabel: string;
  kind: 'employer' | 'growing' | 'industry' | 'batch' | 'skill' | 'status' | 'career';
  details: { label: string; value: string }[];
}

interface DrawerSection { label: string; items: { name: string; value: string }[]; }
interface DrawerData { title: string; subtitle: string; metric: string; metricLabel: string; sections: DrawerSection[]; }

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

export default function CareerLeaderboardNav({ data }: { data: any }) {
  const [segment, setSegment] = useState<Segment>('employers');
  const [drawer, setDrawer] = useState<DrawerData | null>(null);
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

  // Deduplicate and assign unique sequential ranks across the combined lists
  const normalizeRanks = (cards: RankCard[]): RankCard[] =>
    cards.filter((c, i, arr) => arr.findIndex((x) => x.name === c.name) === i)
      .map((c, idx) => ({ ...c, rank: idx + 1 }));

  const employersFinal = normalizeRanks(employerCards);
  const careerFinal = normalizeRanks(careerCards);
  const workforceFinal = normalizeRanks(workforceCards);

  const buildDrawer = (card: RankCard): DrawerData => {
    const base = { title: card.name, metric: card.metric, metricLabel: card.metricLabel };
    const sections: DrawerSection[] = [];

    if (card.kind === 'employer') {
      const emp = employers.find((e) => e.name === card.name);
      const career = lookupEmployerCareer(card.name, topCareers);
      const industry = lookupEmployerIndustry(card.name, topCareers);
      sections.push({ label: 'Alumni Employed', items: [{ name: 'Total', value: `${emp?.alumniCount ?? 0}` }] });
      if (industry) sections.push({ label: 'Represented Industry', items: [{ name: industry, value: '—' }] });
      if (career?.position) {
        const careerItems: { name: string; value: string }[] = [{ name: 'Position', value: career.position }];
        if (career.averageExperienceYears) careerItems.push({ name: 'Avg Experience', value: `${career.averageExperienceYears} yrs` });
        if (career.topEmployers?.length) careerItems.push({ name: 'Other Employers', value: `${career.topEmployers.length}` });
        sections.push({ label: 'Associated Career', items: careerItems });
      }
      return { ...base, subtitle: 'Top Employer', sections };
    }

    if (card.kind === 'growing') {
      const grow = growing.find((g) => g.position === card.name);
      const career = topCareers.find((c) => c.position === card.name);
      const items: { name: string; value: string }[] = [{ name: 'Gained', value: `+${grow?.newAlumni ?? 0}` }];
      if (career?.alumniCount) items.push({ name: 'Total Alumni', value: `${career.alumniCount}` });
      if (career?.averageExperienceYears) items.push({ name: 'Avg Experience', value: `${career.averageExperienceYears} yrs` });
      sections.push({ label: 'Growth', items });
      return { ...base, subtitle: 'Fastest Growing', sections };
    }

    if (card.kind === 'industry') {
      const ind = industries.find((i) => i.name === card.name);
      sections.push({
        label: 'Distribution',
        items: [
          { name: 'Alumni', value: `${ind?.alumniCount ?? 0}` },
          { name: 'Share', value: `${ind?.percentage ?? 0}%` },
        ],
      });
      return { ...base, subtitle: 'Top Industry', sections };
    }

    if (card.kind === 'batch') {
      const b = batches.find((x) => `Batch ${x.year}` === card.name);
      const rate = b?.total ? Math.round((b.employed / b.total) * 100) : 0;
      sections.push({
        label: 'Participation',
        items: [
          { name: 'Total Alumni', value: `${b?.total ?? 0}` },
          { name: 'Employed', value: `${b?.employed ?? 0}` },
          { name: 'Employment Rate', value: `${rate}%` },
        ],
      });
      return { ...base, subtitle: 'Top Batch', sections };
    }

    if (card.kind === 'skill') {
      const sk = skills.find((s) => s.name === card.name);
      const careerCount = topCareers.filter((c) => c.topSkills?.some((skk: any) => skk.name === card.name)).length;
      sections.push({
        label: 'Usage',
        items: [
          { name: 'Alumni', value: `${sk?.count ?? 0}` },
          { name: 'Related Careers', value: `${careerCount}` },
        ],
      });
      return { ...base, subtitle: 'Trending Skill', sections };
    }

    const st = statuses.find((s) => s.status === card.name);
    sections.push({
      label: 'Status Breakdown',
      items: [
        { name: 'Alumni', value: `${st?.count ?? 0}` },
        { name: 'Share', value: `${st?.percentage ?? 0}%` },
      ],
    });
    return { ...base, subtitle: 'Employment Status', sections };
  };

  const openDrawer = (card: RankCard) => setDrawer(buildDrawer(card));
  const closeDrawer = () => setDrawer(null);

  useEffect(() => {
    if (!drawer) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') closeDrawer(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [drawer]);

  const currentCards = segment === 'employers' ? employersFinal : segment === 'career' ? careerFinal : workforceFinal;

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden h-full flex flex-col">
        <div className="flex bg-gray-200/80 shrink-0">
          {SEGMENTS.map((seg) => (
            <button
              key={seg.key}
              onClick={() => setSegment(seg.key)}
              className={`flex-1 py-3 text-[15px] font-bold text-center transition-colors duration-150 ${
                segment === seg.key
                  ? 'bg-white text-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {seg.label}
            </button>
          ))}
        </div>

        <div className="px-3 pt-3 pb-3 flex-1 min-h-0 flex flex-col overflow-y-auto">
          {currentCards.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8 my-auto">No data available.</p>
          ) : (
            <div className="flex-1 flex flex-col gap-2">
              {currentCards.map((c, i) => {
                const isHovered = hoveredCard === `${c.kind}-${c.name}`;
                return (
                  <div
                    key={`${c.kind}-${c.name}`}
                    className="group flex flex-col"
                    onMouseEnter={() => setHoveredCard(`${c.kind}-${c.name}`)}
                    onMouseLeave={() => setHoveredCard(null)}
                  >
                    <button
                      onClick={() => openDrawer(c)}
                      className={`w-full flex items-center justify-between gap-2 px-4 py-3 bg-gradient-to-r ${GRADIENTS[i % GRADIENTS.length]} text-left cursor-pointer transition-all duration-200 ${isHovered ? 'shadow-lg' : ''}`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                          {c.rank}
                        </span>
                        <div className="min-w-0">
                          <span className="text-sm font-semibold text-white truncate block">{c.name}</span>
                          {c.metricLabel && <span className="text-[10px] text-white/70 block">{c.metricLabel}</span>}
                        </div>
                      </div>
                      <div className="text-right shrink-0 leading-tight">
                        <span className="text-sm font-bold text-white">{c.metric}</span>
                      </div>
                    </button>

                    <div
                      className={`overflow-hidden transition-all duration-300 ease-in-out ${
                        isHovered ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'
                      }`}
                    >
                      <div className={`px-4 py-3 bg-gradient-to-r ${GRADIENTS[i % GRADIENTS.length]} border-t border-white/10`}>
                        <div className="grid grid-cols-2 gap-2">
                          {c.details.map((d) => (
                            <div key={d.label}>
                              <p className="text-[10px] text-white/50 uppercase tracking-wider">{d.label}</p>
                              <p className="text-xs font-medium text-white">{d.value}</p>
                            </div>
                          ))}
                        </div>
                        <p className="text-[10px] text-white/40 mt-2">Click to view full details</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {drawer && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/30" onClick={closeDrawer} />
          <div className="absolute top-0 right-0 h-full w-full max-w-sm bg-white shadow-xl border-l border-gray-200 flex flex-col animate-[slideInRight_0.25s_ease-out]">
            <style>{`@keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
            <div className="px-5 py-4 flex items-start justify-between gap-3 border-b border-gray-100 shrink-0 bg-white">
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-gray-900">{drawer.title}</h2>
                <p className="text-[11px] text-orange-600 font-medium">{drawer.subtitle}</p>
              </div>
              <button onClick={closeDrawer} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 shrink-0" aria-label="Close">
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <div className="bg-gray-50 rounded-lg p-3 mb-4 text-center">
                <p className="text-2xl font-bold text-orange-500 leading-none">{drawer.metric}</p>
                <p className="text-[11px] text-gray-500 mt-1">{drawer.metricLabel}</p>
              </div>
              {drawer.sections.map((section) => (
                <div key={section.label} className="mb-4">
                  <h4 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">{section.label}</h4>
                  <div className="space-y-1.5">
                    {section.items.map((it) => (
                      <div key={it.name} className="flex items-center justify-between text-xs">
                        <span className="text-gray-700">• {it.name}</span>
                        <span className="text-gray-500 font-medium">{it.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
