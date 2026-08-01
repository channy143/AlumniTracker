import { useState, useEffect, useRef, type ReactNode } from 'react';
import { adminApi } from '@/services/api';
import { Link } from 'react-router-dom';
import { SkeletonCard } from '@/components/ui/Skeleton';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line,
} from 'recharts';
import {
  BriefcaseIcon,
  BanknotesIcon,
  ClockIcon,
  CheckBadgeIcon,
  BuildingOfficeIcon,
  ClipboardDocumentCheckIcon,
  ArrowRightIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';

const ORANGE = '#f97316';
const COLORS = ['#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#6366f1'];
const STATUS_COLORS: Record<string, string> = {
  'Employed': '#003366',
  'Self-employed': '#f97316',
  'Unemployed': '#ef4444',
  'Pursuing Further Studies': '#8b5cf6',
};

const inputCls = 'text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-orange-400 bg-white';

function formatPeso(n: number | null | undefined) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  return `₱${Number(n).toLocaleString()}`;
}

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

function Card({ title, children, footer }: { title: string; children: ReactNode; footer?: { label: string; to: string } }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col">
      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{title}</h2>
      <div className="flex-1">{children}</div>
      {footer && (
        <Link to={footer.to} className="mt-3 text-xs font-medium text-orange-600 hover:text-orange-700 inline-flex items-center gap-1 shrink-0">
          {footer.label} <ArrowRightIcon className="w-3 h-3" />
        </Link>
      )}
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

function StatusDoughnut({ data }: { data: any[] }) {
  if (data.length === 0) return <p className="text-xs text-gray-400 text-center py-8">No employment status data available.</p>;
  return (
    <>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="count" nameKey="status">
              {data.map((entry: any, i: number) => (
                <Cell key={i} fill={STATUS_COLORS[entry.status] || COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number) => [`${value} alumni`, '']} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-gray-500 mt-2">
        {data.map((s: any, i: number) => (
          <span key={s.status} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[s.status] || COLORS[i % COLORS.length] }} />
            {s.status} <strong className="text-gray-900">{s.count}</strong>
            <span className="text-gray-400">({s.percentage}%)</span>
          </span>
        ))}
      </div>
    </>
  );
}

function RankedList({ title, items }: { title: string; items: any[] }) {
  if (items.length === 0) {
    return (
      <div>
        <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">{title}</h3>
        <p className="text-xs text-gray-400 text-center py-6">No {title.toLowerCase()} data available.</p>
      </div>
    );
  }
  const max = Math.max(...items.map((i) => i.count));
  return (
    <div>
      <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">{title}</h3>
      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
        {items.map((item, i) => (
          <div key={item.name} className="flex items-center gap-2 text-xs">
            <span className="text-gray-400 w-4 text-right shrink-0">{i + 1}</span>
            <span className="text-gray-700 truncate shrink-0 max-w-[130px]">{item.name}</span>
            <div className="flex-1 bg-gray-100 rounded-full h-1.5">
              <div className="bg-orange-500 rounded-full h-1.5" style={{ width: `${Math.round((item.count / max) * 100)}%` }} />
            </div>
            <span className="text-[10px] text-gray-500 w-5 text-right shrink-0">{item.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CareerAnalytics() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<any>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [filters, setFilters] = useState({
    academic_year: '',
    batch: '',
    course: '',
    employment_status: '',
    employment_type: '',
    industry: '',
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
      adminApi.careerStatistics(filters)
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
    academic_year: '', batch: '', course: '', employment_status: '', employment_type: '', industry: '', date_from: '', date_to: '',
  });

  const hasActiveFilters = Object.values(filters).some((v) => v !== '');

  const f = data?.filters || {};
  const overview = data?.overview || {};
  const statusDistribution = data?.statusDistribution || [];
  const employmentTypeDistribution = data?.employmentTypeDistribution || [];
  const salaryDistribution = data?.salaryDistribution || [];
  const salarySummary = data?.salarySummary || {};
  const timeToEmployment = data?.timeToEmployment || [];
  const averageTimeToEmployment = data?.averageTimeToEmployment ?? null;
  const employmentTrend = data?.employmentTrend || [];
  const employmentTimeline = data?.employmentTimeline || [];
  const cities = data?.geographicDistribution?.cities || [];
  const provinces = data?.geographicDistribution?.provinces || [];
  const missingInfo = data?.missingInfo || { withoutEmployment: 0, withoutSurvey: 0, withoutEmploymentList: [], withoutSurveyList: [] };
  const recentlyUpdated = data?.recentlyUpdated || [];

  const buildReport = () => [
    {
      title: 'Overview', headers: ['Metric', 'Value'],
      rows: [
        { Metric: 'Total Alumni', Value: overview.totalAlumni },
        { Metric: 'Employment Rate', Value: `${overview.employmentRate}%` },
        { Metric: 'Average Salary', Value: formatPeso(overview.averageSalary) },
        { Metric: 'Average Time to Employment', Value: formatMonths(overview.averageTimeToEmployment) },
        { Metric: 'Work Alignment Rate', Value: `${overview.workAlignmentRate}%` },
        { Metric: 'Average Years of Experience', Value: overview.averageYearsExperience ? `${overview.averageYearsExperience} yrs` : 'N/A' },
        { Metric: 'Tracer Survey Response Rate', Value: `${overview.tracerSurveyResponseRate}%` },
      ],
    },
    { title: 'Employment Status Distribution', headers: ['Status', 'Count', 'Percentage'], rows: statusDistribution.map((s: any) => ({ Status: s.status, Count: s.count, Percentage: `${s.percentage}%` })) },
    { title: 'Employment Type Distribution', headers: ['Type', 'Count'], rows: employmentTypeDistribution.map((t: any) => ({ Type: t.type, Count: t.count })) },
    { title: 'Salary Distribution', headers: ['Range', 'Count'], rows: salaryDistribution.map((s: any) => ({ Range: s.range, Count: s.count })) },
    { title: 'Time to Employment', headers: ['Time Range', 'Count'], rows: timeToEmployment.map((t: any) => ({ 'Time Range': t.label, Count: t.count })) },
    { title: 'Employment Trend', headers: ['Graduation Year', 'Total', 'Employed', 'Rate'], rows: employmentTrend.map((t: any) => ({ 'Graduation Year': t.year, Total: t.total, Employed: t.employed, Rate: `${t.rate}%` })) },
    { title: 'Employment Timeline', headers: ['Year', 'Graduates Employed'], rows: employmentTimeline.map((t: any) => ({ Year: t.year, 'Graduates Employed': t.count })) },
    { title: 'Geographic Distribution - Cities', headers: ['City', 'Count'], rows: cities.map((c: any) => ({ City: c.name, Count: c.count })) },
    { title: 'Geographic Distribution - Provinces', headers: ['Province', 'Count'], rows: provinces.map((c: any) => ({ Province: c.name, Count: c.count })) },
    { title: 'Recently Updated Employment Records', headers: ['Name', 'Position', 'Company', 'Updated'], rows: recentlyUpdated.map((r: any) => ({ Name: r.name, Position: r.position || '', Company: r.company || '', Updated: r.updated_at ? new Date(r.updated_at).toLocaleDateString() : '' })) },
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
    download(`career-analytics-${new Date().toISOString().slice(0, 10)}.csv`, lines.join('\n'), 'text/csv;charset=utf-8');
  };

  const handleExportExcel = () => {
    if (!data) return;
    const sections = buildReport();
    const html = `<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"><style>table{border-collapse:collapse}th,td{border:1px solid #ccc;padding:4px 8px;font-size:12px}</style></head><body>${sections.map((s) => `<h3>${s.title}</h3><table><thead><tr>${s.headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead><tbody>${s.rows.map((r: any) => `<tr>${s.headers.map((h) => `<td>${escapeHtml(r[h] ?? '')}</td>`).join('')}</tr>`).join('')}</tbody></table>`).join('')}</body></html>`;
    download(`career-analytics-${new Date().toISOString().slice(0, 10)}.xls`, html, 'application/vnd.ms-excel;charset=utf-8');
  };

  const handleExportPDF = () => {
    if (!data) return;
    const sections = buildReport();
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Career Analytics Report</title><style>body{font-family:Arial,sans-serif;color:#111;padding:24px}h1{font-size:20px;margin:0 0 4px}h2{font-size:14px;margin:24px 0 8px;border-bottom:2px solid #f97316;padding-bottom:4px}p{font-size:11px;color:#555;margin:0}table{width:100%;border-collapse:collapse;margin-top:8px}th,td{border:1px solid #ddd;padding:6px 8px;text-align:left;font-size:11px}th{background:#f9fafb;font-size:11px}</style></head><body><h1>Career Analytics Report</h1><p>Generated ${new Date().toLocaleString()}</p>${sections.map((s) => `<h2>${s.title}</h2><table><thead><tr>${s.headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead><tbody>${s.rows.map((r: any) => `<tr>${s.headers.map((h) => `<td>${escapeHtml(r[h] ?? '')}</td>`).join('')}</tr>`).join('')}</tbody></table>`).join('')}</body></html>`;
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
          <h1 className="text-base font-bold text-gray-900">Career Analytics</h1>
          <p className="text-xs text-gray-500">Analyze graduate employment outcomes and workforce trends using Graduate Tracer Survey data.</p>
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
          <FilterField label="Employment Status">
            <select className={inputCls} value={filters.employment_status} onChange={(e) => setFilter('employment_status', e.target.value)}>
              <option value="">All Status</option>
              {(f.statuses || []).map((s: any) => <option key={s} value={s}>{s}</option>)}
            </select>
          </FilterField>
          <FilterField label="Employment Type">
            <select className={inputCls} value={filters.employment_type} onChange={(e) => setFilter('employment_type', e.target.value)}>
              <option value="">All Types</option>
              {(f.employmentTypes || []).map((t: any) => <option key={t} value={t}>{t}</option>)}
            </select>
          </FilterField>
          <FilterField label="Industry">
            <select className={inputCls} value={filters.industry} onChange={(e) => setFilter('industry', e.target.value)}>
              <option value="">All Industries</option>
              {(f.industries || []).map((i: any) => <option key={i} value={i}>{i}</option>)}
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
            {[1, 2].map((i) => <SkeletonCard key={i} />)}
          </div>
        </>
      ) : !data ? (
        <div className="bg-white border border-gray-200 rounded-lg text-center py-12">
          <p className="text-xs text-gray-400">No analytics data available. Ensure alumni have employment information filled in.</p>
          <button onClick={() => setReloadKey((k) => k + 1)} className="px-3 py-1.5 text-xs font-medium bg-orange-500 text-white rounded-lg hover:bg-orange-600 mt-3">Retry</button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-3">
            <KpiCard icon={BriefcaseIcon} label="Employment Rate" value={`${overview.employmentRate}%`} sub={`${overview.totalAlumni} alumni`} />
            <KpiCard icon={BanknotesIcon} label="Average Salary" value={formatPeso(overview.averageSalary)} />
            <KpiCard icon={ClockIcon} label="Time to Employment" value={formatMonths(overview.averageTimeToEmployment)} />
            <KpiCard icon={CheckBadgeIcon} label="Work Alignment Rate" value={`${overview.workAlignmentRate}%`} />
            <KpiCard icon={BuildingOfficeIcon} label="Avg Years Experience" value={overview.averageYearsExperience ? `${overview.averageYearsExperience} yrs` : '—'} />
            <KpiCard icon={ClipboardDocumentCheckIcon} label="Tracer Response Rate" value={`${overview.tracerSurveyResponseRate}%`} sub={overview.activeSurveyCount ? `${overview.activeSurveyCount} active survey(s)` : undefined} />
          </div>

          <div className="lg:flex lg:gap-3 lg:items-start">
            <div className="flex-1 min-w-0 space-y-3">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <Card title="Employment Status">
              <StatusDoughnut data={statusDistribution} />
            </Card>

            <Card title="Employment Type">
              {employmentTypeDistribution.length > 0 ? (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={employmentTypeDistribution}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="type" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip formatter={(value: number) => [`${value} alumni`, 'Count']} />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]} fill={ORANGE} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : <p className="text-xs text-gray-400 text-center py-8">No employment type data available.</p>}
            </Card>

            <Card title="Salary Distribution">
              {salaryDistribution.some((s: any) => s.count > 0) ? (
                <>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <div className="bg-orange-50 rounded-lg px-3 py-1.5">
                      <p className="text-[10px] text-orange-600 uppercase tracking-wider">Average</p>
                      <p className="text-sm font-bold text-gray-900">{formatPeso(salarySummary.averageSalary)}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg px-3 py-1.5">
                      <p className="text-[10px] text-gray-500 uppercase tracking-wider">Highest</p>
                      <p className="text-sm font-bold text-gray-900">{formatPeso(salarySummary.highestSalary)}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg px-3 py-1.5">
                      <p className="text-[10px] text-gray-500 uppercase tracking-wider">Lowest</p>
                      <p className="text-sm font-bold text-gray-900">{formatPeso(salarySummary.lowestSalary)}</p>
                    </div>
                  </div>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={salaryDistribution}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="range" tick={{ fontSize: 9 }} angle={-20} textAnchor="end" height={55} interval={0} />
                        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                        <Tooltip formatter={(value: number) => [`${value} alumni`, 'Count']} />
                        <Bar dataKey="count" radius={[4, 4, 0, 0]} fill={ORANGE} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </>
              ) : <p className="text-xs text-gray-400 text-center py-8">No salary information available.</p>}
            </Card>

            <Card title="Time to Employment">
              {timeToEmployment.some((t: any) => t.count > 0) ? (
                <>
                  <div className="bg-orange-50 rounded-lg px-3 py-1.5 mb-3 inline-block">
                    <p className="text-[10px] text-orange-600 uppercase tracking-wider">Average Time to Employment</p>
                    <p className="text-sm font-bold text-gray-900">{formatMonths(averageTimeToEmployment)}</p>
                  </div>
                  <div className="h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={timeToEmployment}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" tick={{ fontSize: 9 }} angle={-20} textAnchor="end" height={55} interval={0} />
                        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                        <Tooltip formatter={(value: number) => [`${value} alumni`, 'Count']} />
                        <Bar dataKey="count" radius={[4, 4, 0, 0]} fill="#8b5cf6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </>
              ) : <p className="text-xs text-gray-400 text-center py-8">No time to employment data available.</p>}
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-3 mt-3">
            <Card title="Employment Trend">
              {employmentTrend.length > 0 ? (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={employmentTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} unit="%" />
                      <Tooltip formatter={(value: number) => [`${value}%`, 'Employment Rate']} labelFormatter={(l) => `Batch ${l}`} />
                      <Line type="monotone" dataKey="rate" stroke={ORANGE} strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : <p className="text-xs text-gray-400 text-center py-8">No employment trend data available.</p>}
            </Card>

            <Card title="Employment Timeline">
              {employmentTimeline.length > 0 ? (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={employmentTimeline}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip formatter={(value: number) => [`${value} graduates`, 'Employed']} labelFormatter={(l) => `Year ${l}`} />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]} fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : <p className="text-xs text-gray-400 text-center py-8">No employment timeline data available.</p>}
            </Card>
          </div>
            </div>

            <aside className="lg:w-80 shrink-0 space-y-3 mt-3 lg:mt-0">
          {loading ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : data ? (
            <>
              <Card title="Geographic Distribution">
                {cities.length === 0 && provinces.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-8">No geographic data available.</p>
                ) : (
                  <div className="space-y-4">
                    <RankedList title="Top Cities" items={cities} />
                    <RankedList title="Top Provinces" items={provinces} />
                  </div>
                )}
              </Card>

              <Card title="Missing Employment Information" footer={{ label: 'View Alumni', to: '/admin/alumni' }}>
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-xs font-medium text-gray-700">Without Employment Records</p>
                      <span className="text-xs font-bold text-gray-900">{missingInfo.withoutEmployment}</span>
                    </div>
                    {missingInfo.withoutEmployment > 0 ? (
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {missingInfo.withoutEmploymentList.map((a: any) => (
                          <div key={a.id} className="flex items-center gap-2 text-xs py-1 px-2 rounded hover:bg-gray-50">
                            <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-[10px] text-gray-500 shrink-0">{a.name.charAt(0)}</div>
                            <span className="text-gray-600 truncate">{a.name}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400">All filtered alumni have employment records.</p>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-xs font-medium text-gray-700">Without Completed Tracer Survey</p>
                      <span className="text-xs font-bold text-gray-900">{missingInfo.withoutSurvey}</span>
                    </div>
                    {missingInfo.withoutSurvey > 0 ? (
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {missingInfo.withoutSurveyList.map((a: any) => (
                          <div key={a.id} className="flex items-center gap-2 text-xs py-1 px-2 rounded hover:bg-gray-50">
                            <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-[10px] text-gray-500 shrink-0">{a.name.charAt(0)}</div>
                            <span className="text-gray-600 truncate">{a.name}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400">All filtered alumni have completed tracer surveys.</p>
                    )}
                  </div>
                </div>
              </Card>

              <Card title="Recently Updated Employment Records" footer={{ label: 'View All', to: '/admin/alumni' }}>
                {recentlyUpdated.length > 0 ? (
                  <div className="space-y-1">
                    {recentlyUpdated.map((r: any) => (
                      <div key={r.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                        <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center text-xs font-bold text-orange-600 shrink-0">
                          {r.name.charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-gray-900 truncate">{r.name}</p>
                          <p className="text-[11px] text-gray-500 truncate">
                            {r.position || 'No position listed'}{r.company ? ` · ${r.company}` : ''}
                          </p>
                        </div>
                        <span className="text-[10px] text-gray-400 shrink-0">{r.updated_at ? new Date(r.updated_at).toLocaleDateString() : ''}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 text-center py-8">No recently updated employment records.</p>
                )}
              </Card>
            </>
          ) : null}
        </aside>
        </div>
        </>
        )}
      </div>
    </div>
  );
}
