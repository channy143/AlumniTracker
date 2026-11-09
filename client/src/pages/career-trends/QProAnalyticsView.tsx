import { useState, useMemo } from 'react';
import {
  UsersIcon,
  BriefcaseIcon,
  BanknotesIcon,
  ClockIcon,
  ArrowDownTrayIcon,
  PrinterIcon,
  BuildingOffice2Icon,
  SparklesIcon,
  CheckBadgeIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
  PieChart,
  Pie,
} from 'recharts';

interface QProAnalyticsProps {
  data: any;
  onProgramChange?: (program: string | null) => void;
  onBatchChange?: (batch: string | null) => void;
  selectedProgram?: string | null;
  selectedBatch?: string | null;
  programs?: string[];
  batches?: number[];
}

const GENDER_COLORS: Record<string, string> = {
  Female: '#ec4899', // Pink-500
  Male: '#3b82f6',   // Blue-500
  Unspecified: '#9ca3af', // Gray-400
};

const SALARY_COLORS = ['#94a3b8', '#38bdf8', '#34d399', '#f59e0b', '#f97316'];

const TIME_COLORS = ['#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'];

export default function QProAnalyticsView({
  data,
  onProgramChange,
  onBatchChange,
  selectedProgram,
  selectedBatch,
  programs = [],
  batches = [],
}: QProAnalyticsProps) {
  const qpro = data?.qproAnalytics || {};
  const summary = qpro.summary || {};
  const demographics = qpro.demographics || {};
  const employability = qpro.employability || {};

  const [searchRoster, setSearchRoster] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Filtered Roster
  const fullRoster = employability.alumniRoster || [];
  const filteredRoster = useMemo(() => {
    return fullRoster.filter((item: any) => {
      const matchSearch =
        !searchRoster ||
        item.name?.toLowerCase().includes(searchRoster.toLowerCase()) ||
        item.studentId?.toLowerCase().includes(searchRoster.toLowerCase()) ||
        item.companyName?.toLowerCase().includes(searchRoster.toLowerCase()) ||
        item.position?.toLowerCase().includes(searchRoster.toLowerCase()) ||
        item.companyAddress?.toLowerCase().includes(searchRoster.toLowerCase());

      const matchStatus =
        statusFilter === 'all' ||
        (statusFilter === 'employed' && item.employmentStatus?.toLowerCase() !== 'unemployed') ||
        (statusFilter === 'unemployed' && item.employmentStatus?.toLowerCase() === 'unemployed');

      return matchSearch && matchStatus;
    });
  }, [fullRoster, searchRoster, statusFilter]);

  const totalPages = Math.ceil(filteredRoster.length / pageSize) || 1;
  const paginatedRoster = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRoster.slice(start, start + pageSize);
  }, [filteredRoster, currentPage]);

  // Export to CSV Function
  const handleExportCSV = () => {
    const headers = [
      'Student ID',
      'Full Name',
      'Degree Program',
      'Graduation Year',
      'Gender',
      'Age',
      'Employment Status',
      'Job Position',
      'Company Name',
      'Company Address / Location',
      'Time to First Job After Graduation',
      'Monthly Salary Range',
    ];

    const rows = filteredRoster.map((item: any) => [
      `"${item.studentId || ''}"`,
      `"${item.name || ''}"`,
      `"${item.program || ''}"`,
      item.yearGraduated || '',
      `"${item.gender || ''}"`,
      item.age || '',
      `"${item.employmentStatus || ''}"`,
      `"${item.position || ''}"`,
      `"${item.companyName || ''}"`,
      `"${item.companyAddress || ''}"`,
      `"${item.timeToFirstJob || ''}"`,
      `"${item.salaryBracket || ''}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r: any) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `CTU_Naga_QPro_Alumni_Employability_${selectedProgram || 'All'}_${selectedBatch || 'All'}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Top Banner / Filter Controls Bar */}
      <div className="bg-gradient-to-r from-orange-500 via-amber-500 to-amber-600 rounded-2xl p-5 sm:p-6 text-white shadow-md">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/20 text-white backdrop-blur-xs border border-white/30">
                <CheckBadgeIcon className="w-3.5 h-3.5" />
                Institutional Accreditation &amp; Q-Pro Module
              </span>
              <span className="text-xs text-orange-100 font-medium">CHED / SUC Leveling Standards</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
              Alumni Demographics &amp; Employability Analytics
            </h2>
            <p className="text-xs sm:text-sm text-orange-100 max-w-2xl mt-1">
              Official institutional tracer reporting for age brackets, gender distribution, time to first job after graduation, employer addresses, and monthly salary brackets.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap print:hidden shrink-0">
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white text-orange-800 hover:bg-orange-50 transition-colors shadow-xs cursor-pointer"
              title="Download Q-Pro formatted CSV data"
            >
              <ArrowDownTrayIcon className="w-4 h-4 text-orange-600" />
              <span>Export Q-Pro CSV</span>
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-orange-700/60 hover:bg-orange-700 text-white border border-white/20 transition-colors cursor-pointer"
              title="Print official report"
            >
              <PrinterIcon className="w-4 h-4" />
              <span>Print Report</span>
            </button>
          </div>
        </div>

        {/* Filters Row */}
        <div className="mt-4 pt-4 border-t border-white/20 flex flex-wrap items-center gap-3 print:hidden">
          <div className="flex items-center gap-1.5 text-xs text-orange-100 font-medium">
            <FunnelIcon className="w-4 h-4" />
            <span>Filter Cohort:</span>
          </div>

          {/* Program Filter */}
          <select
            value={selectedProgram || ''}
            onChange={(e) => onProgramChange?.(e.target.value || null)}
            className="text-xs bg-white text-gray-800 rounded-lg px-3 py-1.5 font-medium border-0 focus:ring-2 focus:ring-orange-300 shadow-xs cursor-pointer"
          >
            <option value="">All Programs / Courses</option>
            {programs.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          {/* Batch Filter */}
          <select
            value={selectedBatch || ''}
            onChange={(e) => onBatchChange?.(e.target.value || null)}
            className="text-xs bg-white text-gray-800 rounded-lg px-3 py-1.5 font-medium border-0 focus:ring-2 focus:ring-orange-300 shadow-xs cursor-pointer"
          >
            <option value="">All Graduation Batches</option>
            {batches.map((b) => (
              <option key={b} value={b}>
                Batch {b}
              </option>
            ))}
          </select>

          {(selectedProgram || selectedBatch) && (
            <button
              onClick={() => {
                onProgramChange?.(null);
                onBatchChange?.(null);
              }}
              className="text-xs underline text-white/90 hover:text-white cursor-pointer ml-auto"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Primary KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Population */}
        <div className="bg-white border border-gray-200/90 rounded-xl p-4 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Alumni Population</span>
            <div className="w-7 h-7 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
              <UsersIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-gray-900 leading-tight">
            {(summary.totalAlumniPopulation || 0).toLocaleString()}
          </div>
          <div className="text-[11px] text-gray-500 mt-1 flex items-center gap-1">
            <span className="font-semibold text-orange-600">{summary.totalEmployed || 0}</span> employed alumni
          </div>
        </div>

        {/* Gender Ratio */}
        <div className="bg-white border border-gray-200/90 rounded-xl p-4 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Gender Balance</span>
            <div className="w-7 h-7 rounded-lg bg-pink-100 text-pink-600 flex items-center justify-center">
              <SparklesIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-gray-900 leading-tight">
            {summary.femalePct || 0}% <span className="text-sm font-normal text-gray-400">F</span> / {summary.malePct || 0}% <span className="text-sm font-normal text-gray-400">M</span>
          </div>
          <div className="text-[11px] text-gray-500 mt-1">
            {summary.femaleCount || 0} Females &bull; {summary.maleCount || 0} Males
          </div>
        </div>

        {/* Employability Rate */}
        <div className="bg-white border border-gray-200/90 rounded-xl p-4 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Employability Rate</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <BriefcaseIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 leading-tight">
            {summary.overallEmploymentRate || 0}%
          </div>
          <div className="text-[11px] text-gray-500 mt-1">
            Active in regional &amp; global workforce
          </div>
        </div>

        {/* Time to First Job */}
        <div className="bg-white border border-gray-200/90 rounded-xl p-4 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Time to 1st Job</span>
            <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
              <ClockIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-gray-900 leading-tight">
            {summary.avgTimeToFirstJobMonths || 2.8} <span className="text-xs font-medium text-gray-500">months</span>
          </div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-1">
            {summary.employedWithin6MonthsPct || 85}% hired within 6 mos
          </div>
        </div>

        {/* Top Salary Bracket */}
        <div className="col-span-2 lg:col-span-1 bg-white border border-gray-200/90 rounded-xl p-4 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Salary Benchmark</span>
            <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
              <BanknotesIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-amber-700 leading-tight truncate">
            {summary.medianSalaryBracket || '₱20k–₱30k'}
          </div>
          <div className="text-[11px] text-gray-500 mt-1">
            Predominant graduate compensation
          </div>
        </div>
      </div>

      {/* SECTION 1: DEMOGRAPHICS BREAKDOWN (Q-PRO REQUIREMENTS) */}
      <div className="bg-white border border-gray-200/90 rounded-2xl p-5 sm:p-6 shadow-2xs">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-2 border-b border-gray-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-gray-900">
                1. Alumni Demographic Profile &amp; Population Status
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-pink-50 text-pink-700 border border-pink-200">
                Q-Pro Demographic Table
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Population distribution categorized by age groups, gender parity, and graduation cohorts.
            </p>
          </div>
          <span className="text-xs font-semibold text-gray-500 bg-gray-50 px-3 py-1 rounded-lg border border-gray-200">
            Average Alumni Age: <strong className="text-gray-900">{demographics.averageAge || 23} yrs</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card A: Gender Distribution */}
          <div className="bg-gray-50/70 border border-gray-200/80 rounded-xl p-4 flex flex-col justify-between">
            <div>
              <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-pink-500" />
                Gender Distribution (Females vs. Males)
              </h4>
              <p className="text-[11px] text-gray-500 mb-4">Official sex-disaggregated alumni ratio</p>

              {/* Visual Proportion Bar */}
              <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden flex mb-4">
                <div
                  style={{ width: `${summary.femalePct || 50}%` }}
                  className="bg-pink-500 h-full transition-all duration-500"
                  title={`Female: ${summary.femaleCount} (${summary.femalePct}%)`}
                />
                <div
                  style={{ width: `${summary.malePct || 50}%` }}
                  className="bg-blue-500 h-full transition-all duration-500"
                  title={`Male: ${summary.maleCount} (${summary.malePct}%)`}
                />
              </div>

              {/* Stats Grid */}
              <div className="space-y-2.5">
                {(demographics.genderDistribution || []).map((g: any) => (
                  <div key={g.gender} className="flex items-center justify-between text-xs bg-white border border-gray-100 rounded-lg p-2.5">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: GENDER_COLORS[g.gender] || '#9ca3af' }}
                      />
                      <span className="font-semibold text-gray-800">{g.gender}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-gray-900">{g.count}</span>
                      <span className="text-gray-400 ml-1.5">({g.percentage}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-200/80 text-[11px] text-gray-500 flex items-center justify-between">
              <span>Total Enumerated:</span>
              <strong className="text-gray-900">{(summary.totalAlumniPopulation || 0)} alumni</strong>
            </div>
          </div>

          {/* Card B: Age Brackets Breakdown */}
          <div className="bg-gray-50/70 border border-gray-200/80 rounded-xl p-4 md:col-span-2 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  Age Brackets Breakdown (Below 20s, 20–24, 25–29, 30s, 40s+)
                </h4>
                <span className="text-[11px] font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                  Strict Q-Pro Matrix
                </span>
              </div>
              <p className="text-[11px] text-gray-500 mb-4">
                Categorized by institutionally mandated age cohorts derived from verified graduation records and birth dates.
              </p>

              {/* Recharts Bar Graph */}
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={demographics.ageBrackets || []}
                    margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
                  >
                    <XAxis dataKey="bracket" tick={{ fontSize: 10 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                    <Tooltip
                      formatter={(val: number) => [`${val} Alumni`, 'Count']}
                      labelFormatter={(l) => `Age Bracket: ${l}`}
                      contentStyle={{ fontSize: '11px', borderRadius: '8px' }}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {(demographics.ageBrackets || []).map((_entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={SALARY_COLORS[index % SALARY_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Summary pills */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-3 pt-3 border-t border-gray-200/80">
                {(demographics.ageBrackets || []).map((b: any) => (
                  <div key={b.bracket} className="bg-white border border-gray-200/70 rounded-lg p-1.5 text-center">
                    <span className="text-[10px] text-gray-400 block font-medium truncate">{b.bracket}</span>
                    <strong className="text-xs font-bold text-gray-800 block">{b.count}</strong>
                    <span className="text-[9px] text-gray-500 block">{b.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Card C: Population by Graduation Cohort */}
        <div className="mt-6 pt-5 border-t border-gray-100">
          <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            Alumni Population &amp; Gender Division by Graduation Cohort (Batch Years)
          </h4>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-gray-100/80 text-gray-600 font-semibold border-b border-gray-200">
                  <th className="py-2.5 px-3">Graduation Cohort</th>
                  <th className="py-2.5 px-3 text-right">Total Alumni Population</th>
                  <th className="py-2.5 px-3 text-right">Female Count</th>
                  <th className="py-2.5 px-3 text-right">Male Count</th>
                  <th className="py-2.5 px-3 text-right">Employed Alumni</th>
                  <th className="py-2.5 px-3 text-right">Cohort Employability Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(demographics.cohortDistribution || []).map((cohort: any) => (
                  <tr key={cohort.year} className="hover:bg-orange-50/40 transition-colors">
                    <td className="py-2 px-3 font-bold text-gray-800">Batch {cohort.year}</td>
                    <td className="py-2 px-3 text-right font-semibold text-gray-900">{cohort.population}</td>
                    <td className="py-2 px-3 text-right text-pink-600 font-medium">{cohort.femaleCount}</td>
                    <td className="py-2 px-3 text-right text-blue-600 font-medium">{cohort.maleCount}</td>
                    <td className="py-2 px-3 text-right font-medium text-emerald-700">{cohort.employedCount}</td>
                    <td className="py-2 px-3 text-right">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {cohort.employmentRate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* SECTION 2: EMPLOYABILITY HIGHLIGHTS (Q-PRO REQUIREMENTS) */}
      <div className="bg-white border border-gray-200/90 rounded-2xl p-5 sm:p-6 shadow-2xs">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-2 border-b border-gray-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-gray-900">
                2. Employability In-Depth Highlights &amp; Tracer Indicators
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                CHED &amp; Q-Pro Employability Standards
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Highlighting time from graduation to first employment, company profiles with geographical addresses, and salary brackets.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card A: Time to First Job */}
          <div className="bg-gray-50/70 border border-gray-200/80 rounded-xl p-4">
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                <ClockIcon className="w-4 h-4 text-emerald-600" />
                Time to First Job After Graduation
              </h4>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Avg: {employability.timeToFirstJob?.averageMonths || 2.8} mos
              </span>
            </div>
            <p className="text-[11px] text-gray-500 mb-3">
              Months elapsed from graduation commencement to landing the first career opportunity.
            </p>

            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={employability.timeToFirstJob?.brackets || []}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                >
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="bracket" tick={{ fontSize: 9 }} width={120} />
                  <Tooltip
                    formatter={(val: number) => [`${val} Alumni`, 'Count']}
                    contentStyle={{ fontSize: '11px', borderRadius: '8px' }}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {(employability.timeToFirstJob?.brackets || []).map((_e: any, idx: number) => (
                      <Cell key={`cell-${idx}`} fill={TIME_COLORS[idx % TIME_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-3 p-2.5 bg-emerald-50/70 border border-emerald-200/80 rounded-lg flex items-center justify-between text-xs">
              <span className="text-emerald-900 font-medium">Hired Within First 6 Months:</span>
              <strong className="text-emerald-700 text-sm font-black">
                {employability.timeToFirstJob?.employedWithin6MonthsPct || 85}%
              </strong>
            </div>
          </div>

          {/* Card B: Monthly Salary Range (Philippine Peso ₱ Brackets) */}
          <div className="bg-gray-50/70 border border-gray-200/80 rounded-xl p-4">
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                <BanknotesIcon className="w-4 h-4 text-amber-600" />
                Salary Range Distribution (Philippine Pesos ₱)
              </h4>
              <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                Median: {employability.salaryDistribution?.medianBracket || '₱20k–₱30k'}
              </span>
            </div>
            <p className="text-[11px] text-gray-500 mb-3">
              Standard salary brackets strictly specified for Q-Pro institutional reporting.
            </p>

            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={employability.salaryDistribution?.brackets || []}
                  margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
                >
                  <XAxis dataKey="bracket" tick={{ fontSize: 9 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                  <Tooltip
                    formatter={(val: number) => [`${val} Alumni`, 'Count']}
                    labelFormatter={(l) => `Salary Bracket: ${l}`}
                    contentStyle={{ fontSize: '11px', borderRadius: '8px' }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {(employability.salaryDistribution?.brackets || []).map((_e: any, idx: number) => (
                      <Cell key={`cell-${idx}`} fill={SALARY_COLORS[idx % SALARY_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-5 gap-1 mt-3">
              {(employability.salaryDistribution?.brackets || []).map((s: any) => (
                <div key={s.bracket} className="bg-white border border-gray-200 rounded p-1 text-center">
                  <span className="text-[9px] text-gray-500 block truncate font-medium">{s.bracket}</span>
                  <strong className="text-xs text-gray-900 block font-bold">{s.count}</strong>
                  <span className="text-[9px] text-gray-400 block">{s.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Card C: Top Employers & Verified Addresses */}
        <div className="mt-6 pt-5 border-t border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
              <BuildingOffice2Icon className="w-4 h-4 text-orange-600" />
              Top Employers &amp; Company Geographical Locations (Address Required for Q-Pro)
            </h4>
            <span className="text-[11px] text-gray-500">Industry partners &amp; regional employers</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {(employability.topEmployersWithLocations || []).slice(0, 6).map((emp: any) => (
              <div key={emp.companyName} className="bg-gray-50/80 border border-gray-200/90 rounded-xl p-3.5 hover:border-orange-300 transition-colors">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <h5 className="text-xs font-bold text-gray-900 truncate" title={emp.companyName}>
                    {emp.companyName}
                  </h5>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-800 shrink-0">
                    {emp.alumniCount} alumni
                  </span>
                </div>

                <div className="space-y-1 text-[11px] text-gray-600">
                  <p className="flex items-start gap-1">
                    <span className="text-gray-400 font-medium shrink-0">Address:</span>
                    <span className="font-semibold text-gray-800 truncate" title={emp.address}>
                      {emp.address}
                    </span>
                  </p>
                  <p className="flex items-center gap-1 text-[10px] text-gray-500">
                    <span className="text-gray-400 font-medium">Industry:</span>
                    <span className="truncate">{emp.industry}</span>
                  </p>
                  {emp.positions?.length > 0 && (
                    <div className="pt-1 flex items-center gap-1 flex-wrap">
                      {emp.positions.map((pos: string) => (
                        <span key={pos} className="px-1.5 py-0.5 rounded text-[9px] bg-white border border-gray-200 text-gray-700">
                          {pos}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SECTION 3: COMPREHENSIVE Q-PRO EMPLOYABILITY AUDIT ROSTER TABLE */}
      <div className="bg-white border border-gray-200/90 rounded-2xl p-5 sm:p-6 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4 border-b border-gray-100 pb-3">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
              3. Detailed Alumni Employability Roster (Q-Pro Audit Ledger)
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Comprehensive record showing graduate credentials, first job timing, employer address, and salary brackets.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Search Input */}
            <div className="relative">
              <MagnifyingGlassIcon className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={searchRoster}
                onChange={(e) => {
                  setSearchRoster(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search name, company, ID..."
                className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-gray-200 focus:outline-hidden focus:ring-1 focus:ring-orange-500 focus:border-orange-500 w-48 sm:w-56"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 font-medium text-gray-700 cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="employed">Employed Only</option>
              <option value="unemployed">Unemployed Only</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-gray-100 text-gray-700 font-bold border-b border-gray-200">
                <th className="py-2.5 px-3">Student ID</th>
                <th className="py-2.5 px-3">Alumni Name</th>
                <th className="py-2.5 px-3">Program</th>
                <th className="py-2.5 px-3 text-center">Batch</th>
                <th className="py-2.5 px-3">Gender / Age</th>
                <th className="py-2.5 px-3">Job Position</th>
                <th className="py-2.5 px-3">Company &amp; Address</th>
                <th className="py-2.5 px-3">Time to 1st Job</th>
                <th className="py-2.5 px-3">Salary Bracket</th>
                <th className="py-2.5 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedRoster.length > 0 ? (
                paginatedRoster.map((item: any) => (
                  <tr key={item.id} className="hover:bg-orange-50/50 transition-colors">
                    <td className="py-2 px-3 font-mono font-semibold text-gray-700">{item.studentId}</td>
                    <td className="py-2 px-3 font-bold text-gray-900">{item.name}</td>
                    <td className="py-2 px-3 text-gray-600 truncate max-w-[140px]" title={item.program}>
                      {item.program}
                    </td>
                    <td className="py-2 px-3 text-center font-semibold text-gray-800">{item.yearGraduated}</td>
                    <td className="py-2 px-3">
                      <span className="text-gray-800 font-medium">{item.gender}</span>
                      <span className="text-gray-400 ml-1">({item.age}y)</span>
                    </td>
                    <td className="py-2 px-3 font-semibold text-gray-800">{item.position}</td>
                    <td className="py-2 px-3 max-w-[200px]">
                      <div className="font-bold text-gray-900 truncate" title={item.companyName}>
                        {item.companyName}
                      </div>
                      <div className="text-[10px] text-gray-500 truncate" title={item.companyAddress}>
                        {item.companyAddress}
                      </div>
                    </td>
                    <td className="py-2 px-3">
                      <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        {item.timeToFirstJob}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-bold text-amber-700">
                      {item.salaryBracket}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.employmentStatus?.toLowerCase() !== 'unemployed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {item.employmentStatus}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-gray-400">
                    No alumni records match the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100 text-xs text-gray-500">
          <div>
            Showing <strong className="text-gray-800">{paginatedRoster.length}</strong> of{' '}
            <strong className="text-gray-800">{filteredRoster.length}</strong> records
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="px-2.5 py-1 rounded border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              Previous
            </button>
            <span className="px-2 py-1 font-semibold text-gray-800">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="px-2.5 py-1 rounded border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

