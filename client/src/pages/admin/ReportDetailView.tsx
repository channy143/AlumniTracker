import { useMemo, useState, useEffect, type ComponentType, type SVGProps } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  ArrowDownTrayIcon,
  TableCellsIcon,
  PrinterIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  MagnifyingGlassIcon,
  UserGroupIcon,
  ClipboardDocumentCheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  FunnelIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { analyzeReportDataset, type KpiTone, type MissingGapGroup } from './reportAnalytics';

export interface ReportCardMeta {
  id: string;
  title: string;
  badge: string;
  desc: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  accent: string;
  hasSurveyPicker?: boolean;
  defaultFilename: string;
}

interface ReportDetailViewProps {
  report: ReportCardMeta;
  payload: any;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  generating: string | null;
  activeFilterLabels: string[];
  surveysList?: any[];
  selectedSurveyId?: string;
  onChangeSurveyId?: (id: string) => void;
  onBack: () => void;
  onRefresh: () => void;
  onExportCsv: () => void;
  onExportExcel: (rows: Record<string, any>[]) => void;
  onExportJson: () => void;
  onPrint: (rows: Record<string, any>[]) => void;
}

const KPI_TONE_CLASSES: Record<KpiTone, { border: string; value: string; chip: string }> = {
  orange: { border: 'border-orange-200/80', value: 'text-orange-600', chip: 'bg-orange-50 text-orange-700' },
  emerald: { border: 'border-emerald-200/80', value: 'text-emerald-600', chip: 'bg-emerald-50 text-emerald-700' },
  blue: { border: 'border-blue-200/80', value: 'text-blue-600', chip: 'bg-blue-50 text-blue-700' },
  amber: { border: 'border-amber-200/80', value: 'text-amber-600', chip: 'bg-amber-50 text-amber-700' },
  rose: { border: 'border-rose-200/80', value: 'text-rose-600', chip: 'bg-rose-50 text-rose-700' },
  purple: { border: 'border-purple-200/80', value: 'text-purple-600', chip: 'bg-purple-50 text-purple-700' },
  indigo: { border: 'border-indigo-200/80', value: 'text-indigo-600', chip: 'bg-indigo-50 text-indigo-700' },
};

const SEVERITY_STYLE: Record<MissingGapGroup['severity'], { badge: string; label: string; card: string }> = {
  critical: {
    badge: 'bg-rose-100 text-rose-700 border border-rose-200',
    label: 'Critical',
    card: 'border-rose-200/80 bg-rose-50/30',
  },
  warning: {
    badge: 'bg-amber-100 text-amber-800 border border-amber-200',
    label: 'Incomplete',
    card: 'border-amber-200/80 bg-amber-50/30',
  },
  info: {
    badge: 'bg-sky-100 text-sky-700 border border-sky-200',
    label: 'Recommended',
    card: 'border-sky-200/80 bg-sky-50/30',
  },
};

export default function ReportDetailView({
  report,
  payload,
  loading,
  error,
  lastUpdated,
  generating,
  activeFilterLabels,
  surveysList = [],
  selectedSurveyId = '',
  onChangeSurveyId,
  onBack,
  onRefresh,
  onExportCsv,
  onExportExcel,
  onExportJson,
  onPrint,
}: ReportDetailViewProps) {
  const Icon = report.icon;

  const [completenessFilter, setCompletenessFilter] = useState<'all' | 'incomplete' | 'complete'>('all');
  const [selectedGapKey, setSelectedGapKey] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sortCol, setSortCol] = useState<string>('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Reset table controls when switching reports
  useEffect(() => {
    setCompletenessFilter('all');
    setSelectedGapKey(null);
    setSearch('');
    setSortCol('');
    setSortDir('asc');
    setPage(1);
  }, [report.id]);

  // Reset pagination when filters/search change
  useEffect(() => {
    setPage(1);
  }, [completenessFilter, selectedGapKey, search, pageSize]);

  const analysis = useMemo(() => {
    if (!payload) return null;
    return analyzeReportDataset(report.id, payload);
  }, [report.id, payload]);

  const headers = useMemo(() => {
    if (!analysis || analysis.rows.length === 0) return [];
    return Object.keys(analysis.rows[0]);
  }, [analysis]);

  const filteredAnalyzedRows = useMemo(() => {
    if (!analysis) return [];
    let list = analysis.analyzedRows;

    if (selectedGapKey) {
      list = list.filter((ar) => ar.missingKeys.includes(selectedGapKey));
    } else if (completenessFilter === 'incomplete') {
      list = list.filter((ar) => !ar.isComplete);
    } else if (completenessFilter === 'complete') {
      list = list.filter((ar) => ar.isComplete);
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (ar) =>
          Object.values(ar.row).some((val) => String(val ?? '').toLowerCase().includes(q)) ||
          ar.missingLabels.some((lbl) => lbl.toLowerCase().includes(q))
      );
    }

    if (sortCol) {
      list = [...list].sort((a, b) => {
        const av = a.row[sortCol];
        const bv = b.row[sortCol];
        const aNum = Number(String(av ?? '').replace(/[^0-9.-]/g, ''));
        const bNum = Number(String(bv ?? '').replace(/[^0-9.-]/g, ''));
        if (String(av ?? '').trim() !== '' && String(bv ?? '').trim() !== '' && Number.isFinite(aNum) && Number.isFinite(bNum)) {
          return sortDir === 'asc' ? aNum - bNum : bNum - aNum;
        }
        const cmp = String(av ?? '').localeCompare(String(bv ?? ''), undefined, { sensitivity: 'base', numeric: true });
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }

    return list;
  }, [analysis, selectedGapKey, completenessFilter, search, sortCol, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredAnalyzedRows.length / pageSize));
  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredAnalyzedRows.slice(start, start + pageSize);
  }, [filteredAnalyzedRows, page, pageSize]);

  const activeGapMeta = useMemo(
    () => analysis?.missingGroups.find((g) => g.key === selectedGapKey) || null,
    [analysis, selectedGapKey]
  );

  const toggleSort = (col: string) => {
    if (sortCol === col) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  };

  const handleToggleGapFilter = (gapKey: string) => {
    if (selectedGapKey === gapKey) {
      setSelectedGapKey(null);
      setCompletenessFilter('all');
    } else {
      setSelectedGapKey(gapKey);
      setCompletenessFilter('incomplete');
      // Smooth scroll to the table section
      document.getElementById('report-detail-table-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      {/* Top Workspace Header */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <button
              type="button"
              onClick={onBack}
              className="mt-0.5 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer shrink-0"
            >
              <ArrowLeftIcon className="w-3.5 h-3.5" />
              Back to Reports
            </button>

            <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
              <Icon className="w-5 h-5" />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-gray-900">{report.title}</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                  {report.badge}
                </span>
                {activeFilterLabels.map((lbl) => (
                  <span key={lbl} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                    Filter: {lbl}
                  </span>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">{report.desc}</p>
              {lastUpdated && (
                <p className="text-[11px] text-gray-400 mt-1">
                  Live snapshot fetched {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50"
            >
              <ArrowPathIcon className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-orange-500' : ''}`} />
              Refresh
            </button>

            <button
              type="button"
              onClick={onExportCsv}
              disabled={generating !== null || loading}
              className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <ArrowDownTrayIcon className="w-3.5 h-3.5" />
              CSV
            </button>

            <button
              type="button"
              onClick={() => onExportExcel(filteredAnalyzedRows.map((ar) => ar.row))}
              disabled={generating !== null || loading || !analysis || analysis.rows.length === 0}
              className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <TableCellsIcon className="w-3.5 h-3.5" />
              Excel
            </button>

            <button
              type="button"
              onClick={onExportJson}
              disabled={generating !== null || loading}
              className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl border border-gray-200 transition-colors cursor-pointer disabled:opacity-50"
            >
              JSON
            </button>

            <button
              type="button"
              onClick={() => onPrint(filteredAnalyzedRows.map((ar) => ar.row))}
              disabled={loading || !analysis || analysis.rows.length === 0}
              className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl border border-gray-200 transition-colors cursor-pointer disabled:opacity-50"
              title="Print filtered or full report"
            >
              <PrinterIcon className="w-3.5 h-3.5" />
              Print
            </button>
          </div>
        </div>

        {/* Survey Cycle Picker inside Detail View when applicable */}
        {report.hasSurveyPicker && onChangeSurveyId && (
          <div className="bg-violet-50/70 border border-violet-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold text-violet-950">Active Tracer Survey Dataset:</span>
            <select
              value={selectedSurveyId}
              onChange={(e) => onChangeSurveyId(e.target.value)}
              className="text-xs border border-violet-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-800 outline-none min-w-[260px] cursor-pointer"
            >
              {surveysList.map((s) => (
                <option key={s['Survey ID'] || s.id} value={s['Survey ID'] || s.id}>
                  {s['Survey Title'] || s.title}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Loading / Error State */}
      {loading && !analysis && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-2xl p-4 h-24 animate-pulse">
              <div className="h-3 w-28 bg-gray-200 rounded mb-3" />
              <div className="h-7 w-20 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl p-4 text-xs flex items-center justify-between gap-3">
          <span>{error}</span>
          <button
            type="button"
            onClick={onRefresh}
            className="px-3 py-1.5 bg-rose-600 text-white rounded-lg font-semibold hover:bg-rose-700 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loaded Report Detail Workspace */}
      {analysis && (
        <>
          {/* 1. Tailored KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {analysis.kpis.map((kpi) => {
              const style = KPI_TONE_CLASSES[kpi.tone];
              return (
                <div
                  key={kpi.label}
                  className={`bg-white border ${style.border} rounded-2xl p-4 shadow-2xs flex flex-col justify-between`}
                >
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">{kpi.label}</p>
                  <p className={`text-2xl font-bold mt-1.5 ${style.value}`}>{kpi.value}</p>
                  <span className={`inline-block self-start mt-2 text-[11px] font-medium px-2 py-0.5 rounded-md ${style.chip}`}>
                    {kpi.subtext}
                  </span>
                </div>
              );
            })}
          </div>

          {/* 2. Analytics & Field Coverage Row */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Domain Bar Chart */}
            <div className="lg:col-span-7 bg-white border border-gray-200 rounded-2xl p-4 shadow-2xs">
              <div className="mb-3">
                <h3 className="text-sm font-bold text-gray-900">{analysis.chartTitle}</h3>
                <p className="text-xs text-gray-500">{analysis.chartSubtitle}</p>
              </div>
              {analysis.chartData.length === 0 ? (
                <div className="h-60 flex items-center justify-center text-xs text-gray-400">
                  No data available for visualization.
                </div>
              ) : (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analysis.chartData} margin={{ top: 8, right: 12, left: -12, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 11, fill: '#475569' }}
                        interval={0}
                        angle={analysis.chartData.length > 5 ? -15 : 0}
                        textAnchor={analysis.chartData.length > 5 ? 'end' : 'middle'}
                        height={analysis.chartData.length > 5 ? 46 : 28}
                      />
                      <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{
                          borderRadius: '12px',
                          border: '1px solid #e2e8f0',
                          fontSize: '12px',
                          boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)',
                        }}
                      />
                      {analysis.secondarySeriesName && <Legend wrapperStyle={{ fontSize: '11px' }} />}
                      <Bar
                        dataKey="primary"
                        name={analysis.primarySeriesName}
                        fill="#ea580c"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={44}
                      />
                      {analysis.secondarySeriesName && (
                        <Bar
                          dataKey="secondary"
                          name={analysis.secondarySeriesName}
                          fill="#cbd5e1"
                          radius={[6, 6, 0, 0]}
                          maxBarSize={44}
                        />
                      )}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Field Coverage Breakdown */}
            <div className="lg:col-span-5 bg-white border border-gray-200 rounded-2xl p-4 shadow-2xs flex flex-col">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Field Coverage Audit</h3>
                  <p className="text-xs text-gray-500">Fill rate per report column across {analysis.rows.length} rows</p>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-800">
                  {analysis.completenessPct}% overall
                </span>
              </div>

              {analysis.fieldCoverage.length === 0 ? (
                <p className="text-xs text-gray-400 my-auto text-center py-8">No columns to audit.</p>
              ) : (
                <div className="space-y-2.5 overflow-y-auto pr-1 max-h-64">
                  {analysis.fieldCoverage.map((fc) => {
                    const barColor =
                      fc.pct >= 85 ? 'bg-emerald-500' : fc.pct >= 50 ? 'bg-amber-500' : 'bg-rose-500';
                    const textColor =
                      fc.pct >= 85 ? 'text-emerald-700' : fc.pct >= 50 ? 'text-amber-700' : 'text-rose-700';
                    return (
                      <div key={fc.field}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-medium text-gray-700 truncate pr-2">{fc.field}</span>
                          <span className={`font-semibold tabular-nums shrink-0 ${textColor}`}>
                            {fc.pct}% <span className="text-[10px] font-normal text-gray-400">({fc.filled}/{fc.total})</span>
                          </span>
                        </div>
                        <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${fc.pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* 3. Missing Data Audit & Action Plan */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left: Missing & Pending Data */}
            <div className="lg:col-span-7 bg-white border border-gray-200 rounded-2xl p-4 shadow-2xs">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                    <ExclamationTriangleIcon className="w-4 h-4 text-amber-500" />
                    Missing &amp; Pending Data Audit
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Click any gap item below to filter the record table directly to affected records.
                  </p>
                </div>
                {analysis.missingGroups.length > 0 && (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 shrink-0">
                    {analysis.missingGroups.length} issue type{analysis.missingGroups.length === 1 ? '' : 's'}
                  </span>
                )}
              </div>

              {analysis.missingGroups.length === 0 ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 flex items-center gap-3">
                  <CheckCircleIcon className="w-6 h-6 text-emerald-600 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-emerald-900">All audited criteria are complete!</p>
                    <p className="text-xs text-emerald-800/85 mt-0.5">
                      No missing fields or pending submissions detected across {analysis.rows.length} live records.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {analysis.missingGroups.map((g) => {
                    const sev = SEVERITY_STYLE[g.severity];
                    const isSelected = selectedGapKey === g.key;
                    return (
                      <div
                        key={g.key}
                        className={`rounded-xl border p-3 transition-all ${
                          isSelected ? 'ring-2 ring-orange-500 border-orange-400 bg-orange-50/40' : sev.card
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${sev.badge}`}>
                              {sev.label}
                            </span>
                            <p className="text-xs font-bold text-gray-900">{g.label}</p>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleToggleGapFilter(g.key)}
                            className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors cursor-pointer shrink-0 ${
                              isSelected
                                ? 'bg-orange-600 text-white'
                                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            <FunnelIcon className="w-3 h-3" />
                            {isSelected ? 'Showing' : 'View'} {g.count} ({g.pct}%)
                          </button>
                        </div>

                        <p className="text-[11px] text-gray-600 mt-1.5 leading-relaxed">
                          <strong className="text-gray-800">User action:</strong> {g.userAction}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right: Required Action Steps */}
            <div className="lg:col-span-5 bg-white border border-gray-200 rounded-2xl p-4 shadow-2xs space-y-4">
              <div>
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                  <ClipboardDocumentCheckIcon className="w-4 h-4 text-orange-600" />
                  Required Actions (To Complete Data)
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Required steps for users and coordinators to close the gaps in this report.
                </p>
              </div>

              <div className="rounded-xl bg-orange-50/60 border border-orange-200/80 p-3 space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-orange-900 flex items-center gap-1.5">
                  <UserGroupIcon className="w-4 h-4 text-orange-600" />
                  For Students / Alumni / Partners
                </p>
                {analysis.userSteps.length === 0 ? (
                  <p className="text-xs text-gray-600">No outstanding user submissions needed right now.</p>
                ) : (
                  <ul className="space-y-1.5 text-xs text-gray-700 list-disc list-inside">
                    {analysis.userSteps.map((step) => (
                      <li key={step} className="leading-relaxed">{step}</li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <InformationCircleIcon className="w-4 h-4 text-slate-600" />
                  For Admin / Coordinators
                </p>
                {analysis.adminSteps.length === 0 ? (
                  <p className="text-xs text-gray-600">Dataset is clean and ready for official institutional export.</p>
                ) : (
                  <ul className="space-y-1.5 text-xs text-gray-700 list-disc list-inside">
                    {analysis.adminSteps.map((step) => (
                      <li key={step} className="leading-relaxed">{step}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* 4. Interactive Audit & Record Table */}
          <div id="report-detail-table-section" className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-2xs">
            <div className="p-4 border-b border-gray-100 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedGapKey(null);
                      setCompletenessFilter('all');
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      completenessFilter === 'all' && !selectedGapKey
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    All Records ({analysis.rows.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedGapKey(null);
                      setCompletenessFilter('incomplete');
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      completenessFilter === 'incomplete' && !selectedGapKey
                        ? 'bg-rose-600 text-white'
                        : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                    }`}
                  >
                    Incomplete / Missing ({analysis.incompleteCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedGapKey(null);
                      setCompletenessFilter('complete');
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      completenessFilter === 'complete' && !selectedGapKey
                        ? 'bg-emerald-600 text-white'
                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    }`}
                  >
                    Complete ({analysis.completeCount})
                  </button>

                  {activeGapMeta && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-orange-100 text-orange-800 border border-orange-200">
                      Gap: {activeGapMeta.label}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedGapKey(null);
                          setCompletenessFilter('all');
                        }}
                        className="hover:text-orange-950 cursor-pointer"
                        title="Clear gap filter"
                      >
                        <XMarkIcon className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-64">
                    <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search records or missing fields..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg outline-none focus:border-orange-500"
                    />
                  </div>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 outline-none cursor-pointer"
                  >
                    <option value={25}>25 / page</option>
                    <option value={50}>50 / page</option>
                    <option value={100}>100 / page</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              {pagedRows.length === 0 ? (
                <div className="text-center py-12 text-xs text-gray-400">
                  No records match the selected filters or search query.
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-gray-50 border-b border-gray-200 text-gray-700 font-semibold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3 border-r border-gray-200 whitespace-nowrap bg-gray-50">
                        Audit Status / Missing Fields
                      </th>
                      {headers.map((h) => (
                        <th
                          key={h}
                          onClick={() => toggleSort(h)}
                          className="py-2.5 px-3 border-r border-gray-200 last:border-r-0 whitespace-nowrap cursor-pointer hover:bg-gray-100 select-none"
                          title="Click to sort"
                        >
                          <span className="inline-flex items-center gap-1">
                            {h}
                            {sortCol === h && (
                              <span className="text-orange-600">{sortDir === 'asc' ? '↑' : '↓'}</span>
                            )}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {pagedRows.map((ar) => (
                      <tr key={ar.index} className="hover:bg-gray-50/80 transition-colors">
                        <td className="py-2 px-3 border-r border-gray-100 align-top min-w-[180px] max-w-[260px]">
                          {ar.isComplete ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                              <CheckCircleIcon className="w-3 h-3" />
                              Complete
                            </span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {ar.missingLabels.map((lbl) => (
                                <span
                                  key={lbl}
                                  className="inline-block text-[10px] font-medium text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded leading-tight"
                                >
                                  {lbl}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        {headers.map((h) => {
                          const raw = ar.row[h];
                          const isEmpty = raw === null || raw === undefined || String(raw).trim() === '';
                          const strVal = isEmpty ? '---' : String(raw);
                          const isHttpUrl = !isEmpty && (strVal.startsWith('http://') || strVal.startsWith('https://'));
                          return (
                            <td
                              key={h}
                              className={`py-2 px-3 border-r border-gray-100 last:border-r-0 whitespace-nowrap ${
                                isEmpty ? 'text-amber-600/70 italic' : 'text-gray-700'
                              }`}
                            >
                              {isHttpUrl ? (
                                <a
                                  href={strVal}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline font-medium"
                                >
                                  View Link
                                </a>
                              ) : (
                                strVal
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination Footer */}
            <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/60 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-600">
              <span>
                Showing{' '}
                <strong>
                  {filteredAnalyzedRows.length === 0 ? 0 : (page - 1) * pageSize + 1}
                </strong>
                –
                <strong>{Math.min(page * pageSize, filteredAnalyzedRows.length)}</strong> of{' '}
                <strong>{filteredAnalyzedRows.length}</strong> filtered records
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-40 cursor-pointer"
                >
                  <ChevronLeftIcon className="w-3.5 h-3.5" />
                  Prev
                </button>
                <span className="px-2 font-medium">
                  Page {page} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-40 cursor-pointer"
                >
                  Next
                  <ChevronRightIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
