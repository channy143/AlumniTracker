import { useState, useEffect, useRef, type ReactNode } from 'react';
import { adminApi } from '@/services/api';
import { SkeletonCard } from '@/components/ui/Skeleton';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import {
  CheckCircleIcon,
  ClockIcon,
  StarIcon,
  WrenchScrewdriverIcon,
  BoltIcon,
  LightBulbIcon,
  ArrowDownTrayIcon,
  ArrowTrendingUpIcon,
  SparklesIcon,
  MinusIcon,
  ChatBubbleLeftRightIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

const ORANGE = '#f97316';
const COLORS = ['#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#6366f1'];
const ALIGNMENT_COLORS: Record<string, string> = {
  'Aligned with Degree': '#10b981',
  'Partially Aligned': '#f97316',
  'Not Aligned': '#ef4444',
};

const inputCls = 'text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-orange-400 bg-white';

const PRIORITY_STYLES: Record<string, string> = {
  High: 'bg-red-50 text-red-700',
  Medium: 'bg-amber-50 text-amber-700',
  Low: 'bg-gray-100 text-gray-600',
};

const GROWTH_STYLES: Record<string, { label: string; cls: string; icon: any }> = {
  'Trending Up': { label: 'Trending Up', cls: 'text-green-600', icon: ArrowTrendingUpIcon },
  'New': { label: 'New', cls: 'text-blue-600', icon: SparklesIcon },
  'Stable': { label: 'Stable', cls: 'text-gray-500', icon: MinusIcon },
};

function formatMonths(m: number | null | undefined) {
  if (m === null || m === undefined || Number.isNaN(m)) return '—';
  if (m < 12) return `${m} mo`;
  const y = Math.floor(m / 12);
  const r = m % 12;
  return r > 0 ? `${y}y ${r}m` : `${y}y`;
}

function escapeHtml(s: string) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

function escapeCsv(v: any) {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function download(filename: string, content: string, mime: string) {
  const blob = new Blob(['\ufeff' + content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col">
      <div className="mb-3">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{title}</h2>
        {subtitle && <p className="text-[11px] text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-orange-500" />
        </span>
        <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider leading-tight">{label}</p>
      </div>
      <p className="text-xl font-bold text-gray-900 truncate" title={value}>{value}</p>
      {sub && <p className="text-[10px] text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function KpiSkeleton() {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-gray-100 animate-pulse" />
        <div className="h-2.5 w-20 bg-gray-100 rounded animate-pulse" />
      </div>
      <div className="h-5 w-16 bg-gray-100 rounded animate-pulse" />
    </div>
  );
}

function FilterField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );
}

function AlignmentDoughnut({ data }: { data: any[] }) {
  if (data.length === 0) return <p className="text-xs text-gray-400 text-center py-8">No work alignment information available.</p>;
  return (
    <>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={3} dataKey="count" nameKey="category">
              {data.map((entry: any, i: number) => (
                <Cell key={entry.category} fill={ALIGNMENT_COLORS[entry.category] || COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number, _n: any, item: any) => [`${value} alumni (${item?.payload?.percentage || 0}%)`, item?.payload?.category]} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-gray-500 mt-2">
        {data.map((d: any, i: number) => (
          <span key={d.category} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ALIGNMENT_COLORS[d.category] || COLORS[i % COLORS.length] }} />
            {d.category} <strong className="text-gray-900">{d.count}</strong>
            <span className="text-gray-400">({d.percentage}%)</span>
          </span>
        ))}
      </div>
    </>
  );
}

function RankedBarList({ items }: { items: any[] }) {
  if (items.length === 0) return <p className="text-xs text-gray-400 text-center py-8">No skills data available.</p>;
  const max = Math.max(...items.map((i) => i.count));
  return (
    <div className="space-y-2 max-h-72 overflow-y-auto overflow-x-hidden pr-1">
      {items.map((item, i) => (
        <div key={item.name} className="flex items-center gap-2 text-xs">
          <span className="text-gray-400 w-4 text-right shrink-0">{i + 1}</span>
          <span className="text-gray-700 truncate shrink-0 max-w-[130px]" title={item.name}>{item.name}</span>
          <div className="flex-1 bg-gray-100 rounded-full h-2">
            <div className="bg-orange-500 rounded-full h-2" style={{ width: `${Math.max((item.count / max) * 100, 4)}%` }} />
          </div>
          <span className="text-[10px] text-gray-500 shrink-0 w-12 text-right">{item.count} ({item.percentage}%)</span>
        </div>
      ))}
    </div>
  );
}

function TechCard({ tech }: { tech: any }) {
  const g = GROWTH_STYLES[tech.growth] || GROWTH_STYLES['Stable'];
  const Icon = g.icon;
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 flex flex-col gap-2 hover:border-orange-300 transition-colors">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-gray-900 truncate">{tech.technology}</p>
        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold ${g.cls} shrink-0`}>
          <Icon className="w-3 h-3" /> {g.label}
        </span>
      </div>
      <p className="text-[11px] text-gray-500"><strong className="text-gray-900">{tech.count}</strong> alumni using it</p>
    </div>
  );
}

function RecommendationCard({ rec }: { rec: any }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col">
      <div className="flex items-center justify-between gap-2 mb-2">
        <h3 className="text-sm font-bold text-gray-900">{rec.title}</h3>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${PRIORITY_STYLES[rec.priority] || PRIORITY_STYLES.Low}`}>
          {rec.priority} Priority
        </span>
      </div>
      <p className="text-xs text-gray-500 mb-2">{rec.supportingData}</p>
      <div className="mt-auto flex items-start gap-2 bg-orange-50 rounded-lg p-2.5">
        <LightBulbIcon className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
        <p className="text-xs text-orange-900 leading-relaxed">{rec.suggestedImprovement}</p>
      </div>
    </div>
  );
}

function PrioritySection({ priority, items, color }: { priority: string; items: string[]; color: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
        <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">{priority} Priority</h3>
      </div>
      {items.length > 0 ? (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item} className="flex items-start gap-2 text-xs text-gray-700">
              <CheckCircleIcon className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-gray-400">No actions in this category.</p>
      )}
    </div>
  );
}

export default function CurriculumInsights() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<any>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [filters, setFilters] = useState({
    academic_year: '',
    batch: '',
    course: '',
    industry: '',
    employment_status: '',
    work_alignment: '',
    date_from: '',
    date_to: '',
  });
  const dataRef = useRef<any>(null);
  const cacheRef = useRef(new Map<string, any>());

  const filterKey = JSON.stringify(filters);

  useEffect(() => {
    const cached = cacheRef.current.get(filterKey);
    if (cached) {
      dataRef.current = cached;
      setData(cached);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      if (!dataRef.current) setLoading(true);
      else setRefreshing(true);
      adminApi.curriculumStatistics(filters)
        .then((result) => {
          if (cancelled) return;
          cacheRef.current.set(filterKey, result);
          if (cacheRef.current.size > 30) {
            const oldest = cacheRef.current.keys().next().value;
            if (oldest !== undefined) cacheRef.current.delete(oldest);
          }
          dataRef.current = result;
          setData(result);
        })
        .catch(() => {})
        .finally(() => {
          if (!cancelled) { setLoading(false); setRefreshing(false); }
        });
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [filterKey, reloadKey]);

  const setFilter = (key: string, value: string) => setFilters((f) => ({ ...f, [key]: value }));

  const resetFilters = () => setFilters({
    academic_year: '', batch: '', course: '', industry: '', employment_status: '', work_alignment: '', date_from: '', date_to: '',
  });

  const hasActiveFilters = Object.values(filters).some((v) => v !== '');

  const f = data?.filters || {};
  const overview = data?.overview || {};
  const degreeAlignment = data?.degreeAlignment || [];
  const skillsFrequentlyUsed = data?.skillsFrequentlyUsed || [];
  const emergingTechnologies = data?.emergingTechnologies || [];
  const skillsGap = data?.skillsGap || [];
  const recommendations = data?.recommendations || [];
  const careerPaths = data?.careerPaths || [];
  const industryAlignment = data?.industryAlignment || [];
  const feedbackThemes = data?.feedbackThemes || [];
  const actions = data?.actions || { high: [], medium: [], low: [] };

  const buildReport = () => [
    {
      title: 'Overview', headers: ['Metric', 'Value'],
      rows: [
        { Metric: 'Total Alumni', Value: overview.totalAlumni },
        { Metric: 'Work Alignment Rate', Value: `${overview.workAlignmentRate}%` },
        { Metric: 'Average Time to Employment', Value: formatMonths(overview.averageTimeToEmployment) },
        { Metric: 'Average Graduate Satisfaction', Value: overview.averageSatisfaction ? `${overview.averageSatisfaction} / 5` : 'N/A' },
        { Metric: 'Skills Identified', Value: overview.skillsIdentified },
        { Metric: 'Emerging Technologies', Value: overview.emergingTechnologies },
        { Metric: 'Recommendations Generated', Value: overview.recommendationsGenerated },
      ],
    },
    { title: 'Degree Alignment', headers: ['Category', 'Count', 'Percentage'], rows: degreeAlignment.map((d: any) => ({ Category: d.category, Count: d.count, Percentage: `${d.percentage}%` })) },
    { title: 'Skills Frequently Used', headers: ['Skill', 'Alumni', 'Percentage'], rows: skillsFrequentlyUsed.map((s: any) => ({ Skill: s.name, Alumni: s.count, Percentage: `${s.percentage}%` })) },
    { title: 'Emerging Technologies', headers: ['Technology', 'Alumni', 'Growth'], rows: emergingTechnologies.map((t: any) => ({ Technology: t.technology, Alumni: t.count, Growth: t.growth })) },
    { title: 'Skills Gap Analysis', headers: ['Skill', 'Workplace Usage', 'Curriculum Coverage', 'Gap'], rows: skillsGap.map((g: any) => ({ Skill: g.skill, 'Workplace Usage': g.workplaceUsage, 'Curriculum Coverage': g.curriculumCoverage, Gap: g.gap })) },
    { title: 'Curriculum Recommendations', headers: ['Recommendation', 'Priority', 'Supporting Data', 'Suggested Improvement'], rows: recommendations.map((r: any) => ({ Recommendation: r.title, Priority: r.priority, 'Supporting Data': r.supportingData, 'Suggested Improvement': r.suggestedImprovement })) },
    { title: 'Common Career Paths', headers: ['Position', 'Alumni'], rows: careerPaths.map((c: any) => ({ Position: c.position, Alumni: c.count })) },
    { title: 'Industry Alignment', headers: ['Industry', 'Alumni', 'Percentage'], rows: industryAlignment.map((i: any) => ({ Industry: i.industry, Alumni: i.count, Percentage: `${i.percentage}%` })) },
    { title: 'Graduate Feedback Summary', headers: ['Theme', 'Alumni Mentions', 'Example'], rows: feedbackThemes.map((t: any) => ({ Theme: t.theme, 'Alumni Mentions': t.count, Example: t.example || '' })) },
    { title: 'Suggested Curriculum Actions', headers: ['Priority', 'Actions'], rows: [...['High', 'Medium', 'Low'].map((p) => ({ Priority: p, Actions: (actions[p.toLowerCase()] || []).join('; ') }))] },
  ];

  const handleExportCSV = () => {
    if (!data) return;
    const sections = buildReport();
    const lines: string[] = [];
    sections.forEach((s) => {
      lines.push(s.title);
      lines.push(s.headers.join(','));
      s.rows.forEach((r: any) => lines.push(s.headers.map((h) => escapeCsv(r[h] ?? '')).join(',')));
      lines.push('');
    });
    download(`curriculum-insights-${new Date().toISOString().slice(0, 10)}.csv`, lines.join('\n'), 'text/csv;charset=utf-8');
  };

  const handleExportExcel = () => {
    if (!data) return;
    const sections = buildReport();
    const html = `<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"><style>table{border-collapse:collapse}th,td{border:1px solid #ccc;padding:4px 8px;font-size:12px}</style></head><body>${sections.map((s) => `<h3>${s.title}</h3><table><thead><tr>${s.headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead><tbody>${s.rows.map((r: any) => `<tr>${s.headers.map((h) => `<td>${escapeHtml(r[h] ?? '')}</td>`).join('')}</tr>`).join('')}</tbody></table>`).join('')}</body></html>`;
    download(`curriculum-insights-${new Date().toISOString().slice(0, 10)}.xls`, html, 'application/vnd.ms-excel;charset=utf-8');
  };

  const handleExportPDF = () => {
    if (!data) return;
    const sections = buildReport();
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Curriculum Insights Report</title><style>body{font-family:Arial,sans-serif;color:#111;padding:24px}h1{font-size:20px;margin:0 0 4px}h2{font-size:14px;margin:24px 0 8px;border-bottom:2px solid #f97316;padding-bottom:4px}p{font-size:11px;color:#555;margin:0}table{width:100%;border-collapse:collapse;margin-top:8px}th,td{border:1px solid #ddd;padding:6px 8px;text-align:left;font-size:11px}th{background:#f9fafb;font-size:11px}</style></head><body><h1>Curriculum Insights Report</h1><p>Generated ${new Date().toLocaleString()}</p>${sections.map((s) => `<h2>${s.title}</h2><table><thead><tr>${s.headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead><tbody>${s.rows.map((r: any) => `<tr>${s.headers.map((h) => `<td>${escapeHtml(r[h] ?? '')}</td>`).join('')}</tr>`).join('')}</tbody></table>`).join('')}</body></html>`;
    const win = window.open('', '_blank');
    if (!win) { alert('Please allow popups to export the PDF report.'); return; }
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h1 className="text-base font-bold text-gray-900">Curriculum Insights</h1>
          <p className="text-xs text-gray-500">Analyze alumni outcomes and workforce trends to support curriculum evaluation and continuous program improvement.</p>
        </div>
        {data && (
          <div className="flex items-center gap-2">
            <button onClick={handleExportPDF} className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-orange-300">
              <ArrowDownTrayIcon className="w-3.5 h-3.5" /> PDF
            </button>
            <button onClick={handleExportExcel} className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-orange-300">
              <ArrowDownTrayIcon className="w-3.5 h-3.5" /> Excel
            </button>
            <button onClick={handleExportCSV} className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-orange-300">
              <ArrowDownTrayIcon className="w-3.5 h-3.5" /> CSV
            </button>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {refreshing && (
          <div className="h-0.5 bg-orange-100 rounded overflow-hidden">
            <div className="h-full w-1/3 bg-orange-500 rounded animate-pulse" />
          </div>
        )}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex flex-wrap gap-3 items-end">
            <FilterField label="Academic Year">
              <select className={inputCls} value={filters.academic_year} onChange={(e) => setFilter('academic_year', e.target.value)}>
                <option value="">All Academic Years</option>
                {(f.academicYears || []).map((y: any) => <option key={y} value={y}>{y}</option>)}
              </select>
            </FilterField>
            <FilterField label="Graduation Batch">
              <select className={inputCls} value={filters.batch} onChange={(e) => setFilter('batch', e.target.value)}>
                <option value="">All Batches</option>
                {(f.batches || []).map((b: any) => <option key={b} value={b}>{b}</option>)}
              </select>
            </FilterField>
            <FilterField label="Program / Course">
              <select className={inputCls} value={filters.course} onChange={(e) => setFilter('course', e.target.value)}>
                <option value="">All Programs</option>
                {(f.programs || []).map((p: any) => <option key={p} value={p}>{p}</option>)}
              </select>
            </FilterField>
            <FilterField label="Industry">
              <select className={inputCls} value={filters.industry} onChange={(e) => setFilter('industry', e.target.value)}>
                <option value="">All Industries</option>
                {(f.industries || []).map((i: any) => <option key={i} value={i}>{i}</option>)}
              </select>
            </FilterField>
            <FilterField label="Employment Status">
              <select className={inputCls} value={filters.employment_status} onChange={(e) => setFilter('employment_status', e.target.value)}>
                <option value="">All Status</option>
                {(f.employmentStatuses || []).map((s: any) => <option key={s} value={s}>{s}</option>)}
              </select>
            </FilterField>
            <FilterField label="Work Alignment">
              <select className={inputCls} value={filters.work_alignment} onChange={(e) => setFilter('work_alignment', e.target.value)}>
                <option value="">All Alignment</option>
                {(f.workAlignmentOptions || []).map((w: any) => <option key={w} value={w}>{w}</option>)}
              </select>
            </FilterField>
            <FilterField label="Date From">
              <input type="date" className={inputCls} value={filters.date_from} onChange={(e) => setFilter('date_from', e.target.value)} />
            </FilterField>
            <FilterField label="Date To">
              <input type="date" className={inputCls} value={filters.date_to} onChange={(e) => setFilter('date_to', e.target.value)} />
            </FilterField>
            {hasActiveFilters && (
              <button onClick={resetFilters} className="text-xs font-medium text-orange-600 hover:text-orange-700 px-3 py-1.5">
                Reset Filters
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
              {[1, 2, 3, 4, 5, 6].map((i) => <KpiSkeleton key={i} />)}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
            </div>
            <div className="grid grid-cols-1 gap-3">
              {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
            </div>
          </>
        ) : !data ? (
          <div className="bg-white border border-gray-200 rounded-lg text-center py-12">
            <p className="text-xs text-gray-400">No curriculum insights available.</p>
            <button onClick={() => setReloadKey((k) => k + 1)} className="px-3 py-1.5 text-xs font-medium bg-orange-500 text-white rounded-lg hover:bg-orange-600 mt-3">Retry</button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-3">
              <KpiCard icon={CheckCircleIcon} label="Work Alignment Rate" value={`${overview.workAlignmentRate}%`} sub={`${overview.totalAlumni} alumni`} />
              <KpiCard icon={ClockIcon} label="Avg Time to Employment" value={formatMonths(overview.averageTimeToEmployment)} />
              <KpiCard icon={StarIcon} label="Avg Graduate Satisfaction" value={overview.averageSatisfaction ? `${overview.averageSatisfaction} / 5` : '—'} sub={overview.averageSatisfaction ? undefined : 'Not collected'} />
              <KpiCard icon={WrenchScrewdriverIcon} label="Skills Identified" value={String(overview.skillsIdentified)} />
              <KpiCard icon={BoltIcon} label="Emerging Technologies" value={String(overview.emergingTechnologies)} />
              <KpiCard icon={LightBulbIcon} label="Recommendations Generated" value={String(overview.recommendationsGenerated)} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <Card title="Degree Alignment" subtitle="Is alumni work aligned with their degree?">
                <AlignmentDoughnut data={degreeAlignment} />
              </Card>

              <Card title="Skills Frequently Used" subtitle="Skills alumni report using in the workplace">
                <RankedBarList items={skillsFrequentlyUsed} />
              </Card>

              <Card title="Common Career Paths" subtitle="Most common job roles among graduates">
                {careerPaths.length > 0 ? (
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={careerPaths} layout="vertical" margin={{ left: 12, right: 12 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                        <YAxis type="category" dataKey="position" tick={{ fontSize: 10 }} width={110} />
                        <Tooltip formatter={(value: number) => [`${value} alumni`, 'Count']} />
                        <Bar dataKey="count" radius={[0, 4, 4, 0]} fill={ORANGE} barSize={14} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : <p className="text-xs text-gray-400 text-center py-8">No career path data available.</p>}
              </Card>

              <Card title="Industry Alignment" subtitle="Industries where graduates work">
                {industryAlignment.length > 0 ? (
                  <div className="space-y-2">
                    {industryAlignment.map((ind: any) => (
                      <div key={ind.industry} className="flex items-center gap-2 text-xs">
                        <span className="text-gray-700 truncate shrink-0 max-w-[150px]">{ind.industry}</span>
                        <div className="flex-1 bg-gray-100 rounded-full h-2">
                          <div className="bg-blue-500 rounded-full h-2" style={{ width: `${Math.max(ind.percentage, 4)}%` }} />
                        </div>
                        <span className="text-[10px] text-gray-500 shrink-0 w-12 text-right">{ind.count} ({ind.percentage}%)</span>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-xs text-gray-400 text-center py-8">No industry alignment data available.</p>}
              </Card>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <Card title="Emerging Technologies" subtitle="Technologies becoming more common among alumni">
                {emergingTechnologies.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {emergingTechnologies.map((t: any) => <TechCard key={t.technology} tech={t} />)}
                  </div>
                ) : <p className="text-xs text-gray-400 text-center py-8">No emerging technology data available.</p>}
              </Card>
            </div>

            <Card title="Skills Gap Analysis" subtitle="Skills used at work vs. skills learned in the program">
              {skillsGap.length > 0 ? (
                <div className="space-y-3">
                  {skillsGap.map((g: any) => {
                    const maxVal = Math.max(g.workplaceUsage, g.curriculumCoverage, 1);
                    return (
                      <div key={g.skill} className="border border-gray-100 rounded-lg p-3">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <p className="text-xs font-semibold text-gray-900">{g.skill}</p>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-semibold">
                            <ExclamationTriangleIcon className="w-3 h-3" /> {g.gap} alumni gap
                          </span>
                        </div>
                        <div className="space-y-1.5 mb-2">
                          <div className="flex items-center gap-2 text-[11px]">
                            <span className="text-gray-500 w-20 shrink-0">Used at work</span>
                            <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                              <div className="bg-orange-500 rounded-full h-1.5" style={{ width: `${(g.workplaceUsage / maxVal) * 100}%` }} />
                            </div>
                            <span className="text-gray-700 font-medium w-6 text-right shrink-0">{g.workplaceUsage}</span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px]">
                            <span className="text-gray-500 w-20 shrink-0">In curriculum</span>
                            <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                              <div className="bg-gray-400 rounded-full h-1.5" style={{ width: `${(g.curriculumCoverage / maxVal) * 100}%` }} />
                            </div>
                            <span className="text-gray-700 font-medium w-6 text-right shrink-0">{g.curriculumCoverage}</span>
                          </div>
                        </div>
                        <div className="flex items-start gap-2 bg-orange-50 rounded-lg p-2.5">
                          <LightBulbIcon className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                          <p className="text-xs text-orange-900 leading-relaxed">{g.recommendation}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : <p className="text-xs text-gray-400 text-center py-8">No skills gap data available.</p>}
            </Card>

            <Card title="Curriculum Recommendations" subtitle="Recommended actions generated from tracer data">
              {recommendations.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {recommendations.map((r: any) => <RecommendationCard key={r.title} rec={r} />)}
                </div>
              ) : <p className="text-xs text-gray-400 text-center py-8">No recommendations generated yet.</p>}
            </Card>

            <Card title="Graduate Feedback Summary" subtitle="Common themes from tracer survey feedback">
              {feedbackThemes.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {feedbackThemes.map((t: any) => (
                    <div key={t.theme} className="border border-gray-100 rounded-lg p-3 flex flex-col">
                      <div className="flex items-center gap-2 mb-1.5">
                        <ChatBubbleLeftRightIcon className="w-4 h-4 text-orange-500 shrink-0" />
                        <p className="text-xs font-semibold text-gray-900">{t.theme}</p>
                      </div>
                      <p className="text-[11px] text-gray-500 mb-2"><strong className="text-gray-900">{t.count}</strong> alumni mentioned this</p>
                      {t.example && <p className="text-[11px] text-gray-400 italic leading-relaxed">"{t.example}"</p>}
                    </div>
                  ))}
                </div>
              ) : <p className="text-xs text-gray-400 text-center py-8">No graduate feedback available.</p>}
            </Card>

            <Card title="Suggested Curriculum Actions" subtitle="Summary of all insights presented above">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <PrioritySection priority="High" items={actions.high || []} color="#ef4444" />
                <PrioritySection priority="Medium" items={actions.medium || []} color="#f59e0b" />
                <PrioritySection priority="Low" items={actions.low || []} color="#9ca3af" />
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
