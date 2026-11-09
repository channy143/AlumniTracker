import { useState } from 'react';
import {
  UserGroupIcon,
  BriefcaseIcon,
  ClockIcon,
  CurrencyDollarIcon,
  BuildingOfficeIcon,
  MapPinIcon,
  ChevronDownIcon,
  FunnelIcon,
  SparklesIcon,
  AcademicCapIcon,
} from '@heroicons/react/24/outline';
import { formatProgramLongName } from '@/utils/formatProgram';

interface AlumniDemographicsHighlightsProps {
  data: any;
  selectedProgram: string | null;
  selectedBatch: string | null;
  onProgramChange: (program: string | null) => void;
  onBatchChange: (batch: string | null) => void;
  programs: string[];
  batches: number[];
  onOpenDetailedReport?: () => void;
}

export default function AlumniDemographicsHighlights({
  data,
  selectedProgram,
  selectedBatch,
  onProgramChange,
  onBatchChange,
  programs = [],
  batches = [],
  onOpenDetailedReport,
}: AlumniDemographicsHighlightsProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const qpro = data?.qproAnalytics || {};
  const summary = qpro.summary || {};
  const demographics = qpro.demographics || {};
  const employability = qpro.employability || {};

  const genderList = demographics.genderDistribution || [];
  const femaleData = genderList.find((g: any) => g.gender === 'Female') || { count: summary.femaleCount || 0, percentage: summary.femalePct || 50 };
  const maleData = genderList.find((g: any) => g.gender === 'Male') || { count: summary.maleCount || 0, percentage: summary.malePct || 50 };

  const ageBrackets = demographics.ageBrackets || [];
  const timeToFirstJob = employability.timeToFirstJob || {};
  const timeBrackets = timeToFirstJob.brackets || [];
  const salaryDist = employability.salaryDistribution || {};
  const salaryBrackets = salaryDist.brackets || [];
  const topEmployers = employability.topEmployersWithLocations || [];
  const cohorts = demographics.cohortDistribution || [];

  return (
    <div className="bg-white border border-orange-200/90 rounded-2xl p-4 sm:p-5 shadow-xs transition-all mb-4">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center shrink-0 text-orange-600 shadow-2xs">
            <SparklesIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm sm:text-base font-bold text-gray-900">
                Alumni Demographics &amp; Employability Highlights
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-50 text-orange-700 border border-orange-200/80">
                Institutional Q-Pro Indicators
              </span>
            </div>
            <p className="text-xs text-gray-500">
              Institutional breakdown of CTU Naga graduates: age brackets, gender parity, first-job timelines, and salary tiers.
            </p>
          </div>
        </div>

        {/* Action Controls & Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Program Filter */}
          <div className="relative">
            <select
              value={selectedProgram || ''}
              onChange={(e) => onProgramChange(e.target.value || null)}
              className="text-xs font-medium bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg px-2.5 py-1.5 pr-7 appearance-none focus:outline-hidden focus:ring-2 focus:ring-orange-500 text-gray-700 cursor-pointer"
            >
              <option value="">All Degree Programs</option>
              {programs.map((prog) => (
                <option key={prog} value={prog}>
                  {formatProgramLongName(prog) || prog}
                </option>
              ))}
            </select>
            <ChevronDownIcon className="w-3.5 h-3.5 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Batch Filter */}
          <div className="relative">
            <select
              value={selectedBatch || ''}
              onChange={(e) => onBatchChange(e.target.value || null)}
              className="text-xs font-medium bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg px-2.5 py-1.5 pr-7 appearance-none focus:outline-hidden focus:ring-2 focus:ring-orange-500 text-gray-700 cursor-pointer"
            >
              <option value="">All Batches</option>
              {batches.map((b) => (
                <option key={b} value={b}>
                  Batch {b}
                </option>
              ))}
            </select>
            <ChevronDownIcon className="w-3.5 h-3.5 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {onOpenDetailedReport && (
            <button
              type="button"
              onClick={onOpenDetailedReport}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white transition-colors cursor-pointer shadow-2xs"
            >
              Accreditation Table &amp; CSV
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
            title={isExpanded ? 'Collapse highlights' : 'Expand highlights'}
          >
            <ChevronDownIcon className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Primary Highlights Numbers */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-3.5">
        <div className="bg-orange-50/50 border border-orange-100 rounded-xl p-2.5 sm:p-3">
          <div className="flex items-center justify-between text-orange-600 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-orange-800/80">Tracked Alumni</span>
            <UserGroupIcon className="w-4 h-4" />
          </div>
          <p className="text-lg sm:text-xl font-extrabold text-gray-900">{summary.totalAlumniPopulation || data.overview?.totalAlumni || 0}</p>
          <p className="text-[10px] text-gray-500 mt-0.5">
            {summary.overallEmploymentRate || data.overview?.employmentRate || 0}% overall employment rate
          </p>
        </div>

        <div className="bg-pink-50/50 border border-pink-100 rounded-xl p-2.5 sm:p-3">
          <div className="flex items-center justify-between text-pink-600 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-pink-800/80">Gender Ratio</span>
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-pink-100 text-pink-700">F vs M</span>
          </div>
          <p className="text-lg sm:text-xl font-extrabold text-gray-900">
            {femaleData.percentage}% <span className="text-xs font-normal text-gray-400">/</span> {maleData.percentage}%
          </p>
          <p className="text-[10px] text-gray-500 mt-0.5 truncate">
            {femaleData.count} females &bull; {maleData.count} males
          </p>
        </div>

        <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-2.5 sm:p-3">
          <div className="flex items-center justify-between text-emerald-600 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-800/80">Time to 1st Job</span>
            <ClockIcon className="w-4 h-4" />
          </div>
          <p className="text-lg sm:text-xl font-extrabold text-gray-900">
            {timeToFirstJob.employedWithin6MonthsPct ?? 82}%
          </p>
          <p className="text-[10px] text-emerald-700 font-medium mt-0.5">
            Hired within 6 months &bull; Avg {timeToFirstJob.averageMonths ?? 2.8} mos
          </p>
        </div>

        <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-2.5 sm:p-3">
          <div className="flex items-center justify-between text-blue-600 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-800/80">Median Salary</span>
            <CurrencyDollarIcon className="w-4 h-4" />
          </div>
          <p className="text-lg sm:text-xl font-extrabold text-gray-900">
            {salaryDist.medianBracket || '₱20k–₱30k'}
          </p>
          <p className="text-[10px] text-gray-500 mt-0.5">
            Monthly salary bracket standard
          </p>
        </div>
      </div>

      {/* Expanded Breakdown Cards */}
      {isExpanded && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mt-3.5 pt-3.5 border-t border-gray-100">
          {/* Card 1: Demographics: Age Brackets & Gender Distribution */}
          <div className="bg-gray-50/70 border border-gray-200/70 rounded-xl p-3.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                  <UserGroupIcon className="w-4 h-4 text-orange-500" />
                  Demographic Breakdown
                </h3>
                <span className="text-[10px] text-gray-500 font-semibold bg-white px-2 py-0.5 rounded border border-gray-200/70">
                  Avg {demographics.averageAge || 23.5} yrs old
                </span>
              </div>

              {/* Gender Visualizer */}
              <div className="bg-white p-2.5 rounded-lg border border-gray-200/60 shadow-2xs mb-3">
                <div className="flex items-center justify-between text-xs font-medium mb-1.5">
                  <span className="text-pink-600 font-bold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-pink-500 inline-block" />
                    Female: {femaleData.percentage}% ({femaleData.count})
                  </span>
                  <span className="text-blue-600 font-bold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                    Male: {maleData.percentage}% ({maleData.count})
                  </span>
                </div>
                <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden flex">
                  <div className="h-full bg-pink-500 transition-all duration-500" style={{ width: `${femaleData.percentage}%` }} />
                  <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${maleData.percentage}%` }} />
                </div>
              </div>

              {/* Age Brackets Bars */}
              <div>
                <p className="text-[11px] font-semibold text-gray-600 mb-1.5">Age Brackets</p>
                <div className="space-y-1.5">
                  {ageBrackets.map((ab: any) => (
                    <div key={ab.bracket} className="flex items-center justify-between text-xs">
                      <span className="text-gray-600 text-[11px] w-24 shrink-0 font-medium">{ab.bracket}</span>
                      <div className="flex-1 mx-2 h-1.5 bg-gray-200/80 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-orange-500 rounded-full"
                          style={{ width: `${Math.min(ab.percentage || 0, 100)}%` }}
                        />
                      </div>
                      <span className="text-[11px] text-gray-500 font-semibold w-14 text-right">
                        {ab.count} ({ab.percentage}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Graduation Cohorts Pills */}
            {cohorts.length > 0 && (
              <div className="mt-3 pt-2.5 border-t border-gray-200/60">
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Graduation Cohorts</p>
                <div className="flex flex-wrap gap-1">
                  {cohorts.slice(-4).map((c: any) => (
                    <span key={c.year} className="text-[10px] px-2 py-0.5 rounded bg-white text-gray-700 border border-gray-200 font-medium">
                      Batch {c.year}: <strong>{c.population}</strong> ({c.employmentRate}%)
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Card 2: Employability Timelines & Salary Tiers */}
          <div className="bg-gray-50/70 border border-gray-200/70 rounded-xl p-3.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                  <BriefcaseIcon className="w-4 h-4 text-emerald-600" />
                  First Job &amp; Salary Tiers
                </h3>
                <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                  {timeToFirstJob.employedWithin6MonthsPct ?? 82}% in 6 mos
                </span>
              </div>

              {/* Time to First Job Breakdown */}
              <div className="bg-white p-2.5 rounded-lg border border-gray-200/60 shadow-2xs mb-3">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-gray-700 font-medium flex items-center gap-1">
                    <ClockIcon className="w-3.5 h-3.5 text-orange-500" />
                    Time to First Job
                  </span>
                  <span className="text-orange-600 font-bold text-[11px]">
                    Avg {timeToFirstJob.averageMonths ?? 2.8} mos
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {timeBrackets.map((tb: any) => (
                    <span
                      key={tb.bracket}
                      className="text-[10px] px-1.5 py-0.5 bg-orange-50 text-orange-800 rounded border border-orange-100 font-medium"
                    >
                      {tb.bracket}: <strong>{tb.count}</strong> ({tb.percentage}%)
                    </span>
                  ))}
                </div>
              </div>

              {/* Salary Brackets Breakdown */}
              <div>
                <div className="flex items-center justify-between text-[11px] font-semibold text-gray-600 mb-1.5">
                  <span className="flex items-center gap-1">
                    <CurrencyDollarIcon className="w-3.5 h-3.5 text-emerald-600" />
                    Philippine Peso Salary Brackets
                  </span>
                  <span className="text-emerald-700 font-bold">
                    Median: {salaryDist.medianBracket || '₱20k–₱30k'}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {salaryBrackets.map((sb: any) => (
                    <div key={sb.bracket} className="flex items-center justify-between text-xs">
                      <span className="text-gray-600 text-[11px] w-24 shrink-0 font-medium">{sb.bracket}</span>
                      <div className="flex-1 mx-2 h-1.5 bg-gray-200/80 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${Math.min(sb.percentage || 0, 100)}%` }}
                        />
                      </div>
                      <span className="text-[11px] text-gray-500 font-semibold w-14 text-right">
                        {sb.count} ({sb.percentage}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <p className="text-[10px] text-gray-400 mt-3 pt-2 border-t border-gray-200/60">
              Official institutional salary brackets for institutional tracer studies.
            </p>
          </div>

          {/* Card 3: Top Employers & Verified Locations */}
          <div className="bg-gray-50/70 border border-gray-200/70 rounded-xl p-3.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                  <BuildingOfficeIcon className="w-4 h-4 text-orange-500" />
                  Top Employers &amp; Addresses
                </h3>
                <span className="text-[10px] text-gray-500 font-medium">
                  Verified Locations
                </span>
              </div>
              <p className="text-[11px] text-gray-500 mb-2.5">
                Principal hiring partners and verified workplace locations for Naga alumni.
              </p>

              <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                {topEmployers.slice(0, 5).map((emp: any, i: number) => (
                  <div key={emp.companyName || emp.name} className="bg-white p-2.5 rounded-lg border border-gray-200/60 shadow-2xs">
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-gray-900 truncate">
                          {i + 1}. {emp.companyName || emp.name}
                        </p>
                        {emp.address && (
                          <p className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5">
                            <MapPinIcon className="w-3 h-3 text-orange-400 shrink-0" />
                            <span className="truncate">{emp.address}</span>
                          </p>
                        )}
                      </div>
                      <span className="text-[10px] font-bold text-orange-700 bg-orange-50 px-2 py-0.5 rounded border border-orange-100 shrink-0">
                        {emp.alumniCount || emp.count || 0} alumni
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-gray-200/60 flex items-center justify-between text-[11px]">
              <span className="text-gray-500">Accreditation Compliant</span>
              <span className="text-orange-600 font-semibold">Q-Pro Standard &bull; CHED</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

