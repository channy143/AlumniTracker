import { useState, useEffect, useRef, useMemo, type ReactNode } from 'react';
import { adminApi } from '@/services/api';
import { Link } from 'react-router-dom';
import { SkeletonCard } from '@/components/ui/Skeleton';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line,
} from 'recharts';
import {
  BuildingOfficeIcon,
  HandRaisedIcon,
  Squares2X2Icon,
  SparklesIcon,
  UserGroupIcon,
  ArrowPathIcon,
  ArrowRightIcon,
  ArrowDownTrayIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

const ORANGE = '#f97316';
const COLORS = ['#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#6366f1'];

const inputCls = 'text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-orange-400 bg-white';

const JOB_TYPE_LABELS: Record<string, string> = {
  'full-time': 'Full-time',
  'part-time': 'Part-time',
  contract: 'Contractual',
  contractual: 'Contractual',
  freelance: 'Freelance',
  internship: 'Internship',
};

function formatDate(d: string | null | undefined) {
  if (!d) return '—';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
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

function Card({ title, children, footer }: { title: string; children: ReactNode; footer?: { label: string; to?: string; onClick?: () => void } }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col">
      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{title}</h2>
      <div className="flex-1">{children}</div>
      {footer && (
        footer.onClick
          ? <button onClick={footer.onClick} className="mt-3 text-xs font-medium text-orange-600 hover:text-orange-700 inline-flex items-center gap-1 shrink-0">
              {footer.label} <ArrowRightIcon className="w-3 h-3" />
            </button>
          : footer.to && footer.to.startsWith('#')
          ? <a href={footer.to} className="mt-3 text-xs font-medium text-orange-600 hover:text-orange-700 inline-flex items-center gap-1 shrink-0">
              {footer.label} <ArrowRightIcon className="w-3 h-3" />
            </a>
          : <Link to={footer.to || ''} className="mt-3 text-xs font-medium text-orange-600 hover:text-orange-700 inline-flex items-center gap-1 shrink-0">
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

function EmployerBarList({ items }: { items: any[] }) {
  if (items.length === 0) return <p className="text-xs text-gray-400 text-center py-8">No employer data available.</p>;
  const max = Math.max(...items.map((i) => i.alumniCount));
  return (
    <div className="space-y-2 max-h-72 overflow-y-auto overflow-x-hidden pr-1">
      {items.map((e, i) => (
        <Link
          key={e.name}
          to={`/admin/employers/${encodeURIComponent(e.name)}`}
          className="group flex items-center gap-2 text-xs rounded-lg hover:bg-orange-50 px-1.5 py-1 -mx-1.5"
          title={`View ${e.name} details`}
        >
          <span className="text-gray-400 w-4 text-right shrink-0">{i + 1}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-0.5">
              <span className="text-gray-700 font-medium truncate group-hover:text-orange-600">{e.name}</span>
              <span className="text-[10px] text-gray-500 shrink-0">{e.alumniCount} alumni</span>
            </div>
            <div className="flex-1 bg-gray-100 rounded-full h-1.5">
              <div className="bg-orange-500 rounded-full h-1.5 transition-all" style={{ width: `${Math.max((e.alumniCount / max) * 100, 4)}%` }} />
            </div>
          </div>
          <ArrowRightIcon className="w-3.5 h-3.5 text-gray-300 group-hover:text-orange-500 shrink-0" />
        </Link>
      ))}
    </div>
  );
}

function IndustryDoughnut({ data }: { data: any[] }) {
  if (data.length === 0) return <p className="text-xs text-gray-400 text-center py-8">No industry data available.</p>;
  const total = data.reduce((a: number, d: any) => a + d.count, 0) || 1;
  return (
    <>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={3} dataKey="count" nameKey="industry">
              {data.map((entry: any, i: number) => (
                <Cell key={entry.industry} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number, _n: any, item: any) => [`${value} records (${item?.payload?.percentage || 0}%)`, item?.payload?.industry]} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-gray-500 mt-2">
        {data.map((d: any, i: number) => (
          <span key={d.industry} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
            {d.industry} <strong className="text-gray-900">{d.count}</strong>
            <span className="text-gray-400">({d.percentage}%)</span>
          </span>
        ))}
      </div>
    </>
  );
}

function RankedList({ title, items, empty = 'No data available.' }: { title: string; items: any[]; empty?: string }) {
  if (items.length === 0) {
    return (
      <div>
        <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">{title}</h3>
        <p className="text-xs text-gray-400 text-center py-6">{empty}</p>
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

function PartnershipBadge({ status }: { status: string | null }) {
  if (status === 'partner') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-50 text-green-700">
        <HandRaisedIcon className="w-3 h-3" /> Partner
      </span>
    );
  }
  if (status === 'non-partner') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-500">
        <BuildingOfficeIcon className="w-3 h-3" /> Non-partner
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700">
      <BuildingOfficeIcon className="w-3 h-3" /> Not tracked
    </span>
  );
}

function EmployerDirectoryModal({ open, onClose, directory, filteredDirectory, dirQuery, onQueryChange }: {
  open: boolean;
  onClose: () => void;
  directory: any[];
  filteredDirectory: any[];
  dirQuery: string;
  onQueryChange: (q: string) => void;
}) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between gap-3 px-5 py-4 shrink-0 bg-orange-500 rounded-t-lg">
          <div>
            <h2 className="text-sm font-bold text-white">Employer Directory</h2>
            <p className="text-[11px] text-orange-100">{directory.length} companies</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/20 border border-white/30 flex items-center justify-center text-white hover:bg-white/30 shrink-0 transition-colors" aria-label="Close directory">
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 py-4 shrink-0">
          <div className="relative max-w-sm">
            <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={dirQuery}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="Search company, industry, or city..."
              className="w-full text-xs border border-gray-200 rounded-lg pl-9 pr-3 py-2 outline-none focus:border-orange-400 bg-white"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-5 pb-5">
          {filteredDirectory.length > 0 ? (
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-white">
                <tr className="text-left text-[10px] uppercase tracking-wider text-gray-500 border-b border-gray-100">
                  <th className="py-2 pr-3 font-medium">Company</th>
                  <th className="py-2 pr-3 font-medium">Industry</th>
                  <th className="py-2 pr-3 font-medium text-right"># Alumni</th>
                  <th className="py-2 pr-3 font-medium">City</th>
                  <th className="py-2 font-medium">Partnership Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredDirectory.map((d: any) => (
                  <tr key={d.name} className="border-b border-gray-50 hover:bg-orange-50/40">
                    <td className="py-2 pr-3">
                      <Link to={`/admin/employers/${encodeURIComponent(d.name)}`} className="font-medium text-orange-600 hover:text-orange-700">
                        {d.name}
                      </Link>
                    </td>
                    <td className="py-2 pr-3 text-gray-600">{d.industry || '—'}</td>
                    <td className="py-2 pr-3 text-right text-gray-700 font-medium">{d.alumniCount}</td>
                    <td className="py-2 pr-3 text-gray-600">{d.city || '—'}</td>
                    <td className="py-2"><PartnershipBadge status={d.partnershipStatus} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-xs text-gray-400 text-center py-8">
              {directory.length === 0 ? 'No employer data available.' : 'No employers match your search.'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function EmployerInsights() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<any>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [filters, setFilters] = useState({
    academic_year: '',
    batch: '',
    course: '',
    industry: '',
    company: '',
    employment_type: '',
    date_from: '',
    date_to: '',
  });
  const [sortBy, setSortBy] = useState<'alumni' | 'recent' | 'alpha'>('alumni');
  const [dirQuery, setDirQuery] = useState('');
  const [dirOpen, setDirOpen] = useState(false);
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
      adminApi.employerStatistics(filters)
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
    academic_year: '', batch: '', course: '', industry: '', company: '', employment_type: '', date_from: '', date_to: '',
  });

  const hasActiveFilters = Object.values(filters).some((v) => v !== '');

  const openDirectory = () => {
    setDirQuery('');
    setDirOpen(true);
  };

  const f = data?.filters || {};
  const overview = data?.overview || {};
  const topEmployers = data?.topEmployers || [];
  const industryDistribution = data?.industryDistribution || [];
  const employerGrowthTrend = data?.employerGrowthTrend || [];
  const locations = data?.locations || [];
  const topHiringCompanies = data?.topHiringCompanies || [];
  const newEmployerPartners = data?.newEmployerPartners || [];
  const directory = data?.directory || [];

  const sortedHiring = useMemo(() => {
    const list = [...topHiringCompanies];
    if (sortBy === 'alumni') list.sort((a, b) => b.alumniCount - a.alumniCount || (b.lastHireDate || '').localeCompare(a.lastHireDate || ''));
    else if (sortBy === 'recent') list.sort((a, b) => (b.firstHireDate || '').localeCompare(a.firstHireDate || ''));
    else list.sort((a, b) => a.name.localeCompare(b.name));
    return list.slice(0, 6);
  }, [topHiringCompanies, sortBy]);

  const filteredDirectory = useMemo(() => {
    const q = dirQuery.trim().toLowerCase();
    if (!q) return directory;
    return directory.filter((d: any) =>
      d.name.toLowerCase().includes(q) ||
      d.industry.toLowerCase().includes(q) ||
      d.city.toLowerCase().includes(q)
    );
  }, [directory, dirQuery]);

  const buildReport = () => [
    {
      title: 'Overview', headers: ['Metric', 'Value'],
      rows: [
        { Metric: 'Employing Companies', Value: overview.employingCompanies },
        { Metric: 'Partner Companies', Value: overview.partnerCompanies === null ? 'Not tracked' : overview.partnerCompanies },
        { Metric: 'Industries Represented', Value: overview.industriesRepresented },
        { Metric: 'New Employers This Year', Value: overview.newEmployersThisYear },
        { Metric: 'Average Alumni per Employer', Value: overview.averageAlumniPerEmployer },
        { Metric: 'Employer Retention Rate', Value: `${overview.retentionRate}%` },
      ],
    },
    { title: 'Top Employers', headers: ['Company', 'Alumni', 'Employment Records', 'Industry'], rows: topEmployers.map((e: any) => ({ Company: e.name, Alumni: e.alumniCount, 'Employment Records': e.employmentCount, Industry: e.industry })) },
    { title: 'Industry Distribution', headers: ['Industry', 'Count', 'Percentage'], rows: industryDistribution.map((d: any) => ({ Industry: d.industry, Count: d.count, Percentage: `${d.percentage}%` })) },
    { title: 'Employer Growth Trend', headers: ['Year', 'New Employers'], rows: employerGrowthTrend.map((t: any) => ({ Year: t.year, 'New Employers': t.count })) },
    { title: 'Employer Locations', headers: ['City', 'Employers'], rows: locations.map((l: any) => ({ City: l.name, Employers: l.count })) },
    { title: 'Top Hiring Companies', headers: ['Company', 'Industry', 'Alumni', 'First Hire', 'Last Hire'], rows: topHiringCompanies.map((c: any) => ({ Company: c.name, Industry: c.industry, Alumni: c.alumniCount, 'First Hire': c.firstHireDate ? new Date(c.firstHireDate).toLocaleDateString() : '', 'Last Hire': c.lastHireDate ? new Date(c.lastHireDate).toLocaleDateString() : '' })) },
    { title: 'New Employer Partners', headers: ['Company', 'Industry', 'Alumni', 'First Hire'], rows: newEmployerPartners.map((e: any) => ({ Company: e.name, Industry: e.industry, Alumni: e.alumniCount, 'First Hire': e.firstHireDate ? new Date(e.firstHireDate).toLocaleDateString() : '' })) },
    { title: 'Employer Directory', headers: ['Company', 'Industry', 'Alumni', 'City', 'Partnership Status'], rows: directory.map((d: any) => ({ Company: d.name, Industry: d.industry, Alumni: d.alumniCount, City: d.city, 'Partnership Status': d.partnershipStatus === 'partner' ? 'Partner' : d.partnershipStatus === 'non-partner' ? 'Non-partner' : 'Not tracked' })) },
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
    download(`employer-insights-${new Date().toISOString().slice(0, 10)}.csv`, lines.join('\n'), 'text/csv;charset=utf-8');
  };

  const handleExportExcel = () => {
    if (!data) return;
    const sections = buildReport();
    const html = `<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"><style>table{border-collapse:collapse}th,td{border:1px solid #ccc;padding:4px 8px;font-size:12px}</style></head><body>${sections.map((s) => `<h3>${s.title}</h3><table><thead><tr>${s.headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead><tbody>${s.rows.map((r: any) => `<tr>${s.headers.map((h) => `<td>${escapeHtml(r[h] ?? '')}</td>`).join('')}</tr>`).join('')}</tbody></table>`).join('')}</body></html>`;
    download(`employer-insights-${new Date().toISOString().slice(0, 10)}.xls`, html, 'application/vnd.ms-excel;charset=utf-8');
  };

  const handleExportPDF = () => {
    if (!data) return;
    const sections = buildReport();
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Employer Insights Report</title><style>body{font-family:Arial,sans-serif;color:#111;padding:24px}h1{font-size:20px;margin:0 0 4px}h2{font-size:14px;margin:24px 0 8px;border-bottom:2px solid #f97316;padding-bottom:4px}p{font-size:11px;color:#555;margin:0}table{width:100%;border-collapse:collapse;margin-top:8px}th,td{border:1px solid #ddd;padding:6px 8px;text-align:left;font-size:11px}th{background:#f9fafb;font-size:11px}</style></head><body><h1>Employer Insights Report</h1><p>Generated ${new Date().toLocaleString()}</p>${sections.map((s) => `<h2>${s.title}</h2><table><thead><tr>${s.headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead><tbody>${s.rows.map((r: any) => `<tr>${s.headers.map((h) => `<td>${escapeHtml(r[h] ?? '')}</td>`).join('')}</tr>`).join('')}</tbody></table>`).join('')}</body></html>`;
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
          <h1 className="text-base font-bold text-gray-900">Employer Insights</h1>
          <p className="text-xs text-gray-500">Analyze employer networks, industry engagement, and hiring trends based on Graduate Tracer Survey data.</p>
        </div>
        {data && (
          <div className="flex items-center gap-2">
            <button onClick={openDirectory} className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-orange-500 text-white hover:bg-orange-600">
              <BuildingOfficeIcon className="w-3.5 h-3.5" /> View Employer Directory
            </button>
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
            <FilterField label="Company">
              <select className={inputCls} value={filters.company} onChange={(e) => setFilter('company', e.target.value)}>
                <option value="">All Companies</option>
                {(f.companies || []).map((c: any) => <option key={c} value={c}>{c}</option>)}
              </select>
            </FilterField>
            <FilterField label="Employment Type">
              <select className={inputCls} value={filters.employment_type} onChange={(e) => setFilter('employment_type', e.target.value)}>
                <option value="">All Types</option>
                {(f.employmentTypes || []).map((t: any) => <option key={t} value={t}>{t}</option>)}
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
              <KpiCard icon={BuildingOfficeIcon} label="Employing Companies" value={String(overview.employingCompanies)} />
              <KpiCard icon={HandRaisedIcon} label="Partner Companies" value={overview.partnerCompanies === null ? '—' : String(overview.partnerCompanies)} sub={overview.partnerCompanies !== null && overview.employingCompanies ? `${Math.round((overview.partnerCompanies / overview.employingCompanies) * 100)}% of employers` : overview.partnerCompanies === null ? 'Not tracked' : undefined} />
              <KpiCard icon={Squares2X2Icon} label="Industries Represented" value={String(overview.industriesRepresented)} />
              <KpiCard icon={SparklesIcon} label="New Employers This Year" value={String(overview.newEmployersThisYear)} />
              <KpiCard icon={UserGroupIcon} label="Avg Alumni per Employer" value={String(overview.averageAlumniPerEmployer)} />
              <KpiCard icon={ArrowPathIcon} label="Employer Retention Rate" value={`${overview.retentionRate}%`} sub="Hired across 2+ years" />
            </div>

            <div className="lg:flex lg:gap-3 lg:items-start">
              <div className="flex-1 min-w-0 space-y-3">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  <Card title="Top Employers" footer={{ label: 'View Employer Directory', onClick: openDirectory }}>
                    <EmployerBarList items={topEmployers} />
                  </Card>

                  <Card title="Industry Distribution">
                    <IndustryDoughnut data={industryDistribution} />
                  </Card>

                  <Card title="Employer Growth Trend">
                    {employerGrowthTrend.length > 0 ? (
                      <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={employerGrowthTrend}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                            <Tooltip formatter={(value: number) => [`${value} new employer(s)`, 'New Employers']} labelFormatter={(l) => `Year ${l}`} />
                            <Line type="monotone" dataKey="count" stroke={ORANGE} strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    ) : <p className="text-xs text-gray-400 text-center py-8">No employer growth data available.</p>}
                  </Card>

                  <Card title="Top Hiring Companies">
                    {topHiringCompanies.length > 0 ? (
                      <>
                        <div className="flex items-center gap-1 mb-3">
                          {([
                            { key: 'alumni', label: 'Most Alumni' },
                            { key: 'recent', label: 'Recently Added' },
                            { key: 'alpha', label: 'Alphabetical' },
                          ] as const).map((opt) => (
                            <button
                              key={opt.key}
                              onClick={() => setSortBy(opt.key)}
                              className={`text-[10px] font-medium px-2 py-1 rounded-md ${sortBy === opt.key ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                          {sortedHiring.map((c: any) => (
                            <Link key={c.name} to={`/admin/employers/${encodeURIComponent(c.name)}`} className="group flex items-center gap-3 p-2 rounded-lg hover:bg-orange-50">
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-medium text-gray-900 truncate group-hover:text-orange-600">{c.name}</p>
                                <p className="text-[10px] text-gray-500 truncate">
                                  {c.industry || 'No industry listed'} · {c.alumniCount} alumni
                                </p>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-[10px] text-gray-400">Last hired</p>
                                <p className="text-[10px] font-medium text-gray-700">{formatDate(c.lastHireDate)}</p>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </>
                    ) : <p className="text-xs text-gray-400 text-center py-8">No hiring data available.</p>}
                  </Card>
                </div>

              </div>

              <aside className="lg:w-80 shrink-0 space-y-3 mt-3 lg:mt-0">
                {loading ? (
                  <>
                    <SkeletonCard />
                    <SkeletonCard />
                  </>
                ) : data ? (
                  <>
                    <Card title="Employer Locations">
                      {locations.length > 0 ? (
                        <RankedList title="Top Cities" items={locations} empty="No employer locations available." />
                      ) : (
                        <p className="text-xs text-gray-400 text-center py-8">No employer locations available.</p>
                      )}
                    </Card>

                    <Card title="New Employer Partners" footer={{ label: 'View Employer Directory', onClick: openDirectory }}>
                      {data?.partnershipTracked === false ? (
                        <p className="text-xs text-gray-400 text-center py-8">Partnership status is not tracked yet. Run the partnership migration to enable this report.</p>
                      ) : newEmployerPartners.length > 0 ? (
                        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                          {newEmployerPartners.map((e: any) => (
                            <Link key={e.name} to={`/admin/employers/${encodeURIComponent(e.name)}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-orange-50">
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-medium text-gray-900 truncate">{e.name}</p>
                                <p className="text-[10px] text-gray-500 truncate">{e.industry || 'No industry listed'}</p>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-[10px] text-gray-400">First hire</p>
                                <p className="text-[10px] font-medium text-gray-700">{e.firstHireYear || '—'}</p>
                              </div>
                            </Link>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 text-center py-8">No employer partnerships recorded.</p>
                      )}
                    </Card>
                  </>
                ) : null}
              </aside>
            </div>
          </>
        )}
      </div>

      <EmployerDirectoryModal
        open={dirOpen}
        onClose={() => setDirOpen(false)}
        directory={directory}
        filteredDirectory={filteredDirectory}
        dirQuery={dirQuery}
        onQueryChange={setDirQuery}
      />
    </div>
  );
}
