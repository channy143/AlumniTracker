import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BriefcaseIcon, BuildingOfficeIcon, UserGroupIcon, ChartBarIcon, ArrowRightIcon, ClockIcon, XMarkIcon, AcademicCapIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { careerTrendsApi, jobsApi } from '@/services/api';
import { formatExperience } from '@/utils/formatExperience';
import { formatProgramLongName } from '@/utils/formatProgram';
import CareerLeaderboardNav, { type RankCard } from './CareerLeaderboardNav';
import CareerCardInsightsPanel from './CareerCardInsightsPanel';
import ActiveJobOpeningsNavCard from './ActiveJobOpeningsNavCard';

const JOB_TYPE_LABELS: Record<string, string> = {
  'full-time': 'Full-time',
  'part-time': 'Part-time',
  'contract': 'Contract',
  'freelance': 'Freelance',
  'self-employed': 'Self-employed',
  'internship': 'Internship',
};

const EXPERIENCE_RANGES = [
  { value: '0-1', label: '0\u20131 Years' },
  { value: '2-5', label: '2\u20135 Years' },
  { value: '6-10', label: '6\u201310 Years' },
  { value: '10+', label: '10+ Years' },
];

const SORT_OPTIONS = [
  { value: 'all', label: 'Default' },
  { value: 'newest', label: 'Newest' },
  { value: 'highest-salary', label: 'Highest Salary' },
  { value: 'most-experienced', label: 'Most Experienced' },
  { value: 'least-experienced', label: 'Least Experienced' },
  { value: 'alphabetical', label: 'Alphabetical' },
];

interface CareerTrend {
  position: string;
  alumniCount: number;
  currentInCareer: number;
  topEmployers: { name: string; count: number }[];
  topIndustries: { name: string; count: number }[];
  mostCommonCourse: string | null;
  topSkills: { name: string; count: number }[];
  averageExperienceYears: number;
  jobTypes?: string[];
  employmentStatuses?: string[];
  locations?: string[];
  batches?: number[];
  activeJobsCount?: number;
  activeJobPostings?: {
    id: string;
    position: string;
    company_name: string;
    location?: string;
    is_remote?: boolean;
    salary_range?: string;
    job_type?: string;
  }[];
  hiredViaJobsCount?: number;
}

interface Overview {
  totalAlumni: number;
  totalEmployed: number;
  employmentRate: number;
  topCareer: string;
  topIndustry: string;
  topEmployer: string;
  topSkill: string;
  averageExperienceYears: number;
  totalActiveJobs?: number;
  totalHiredThroughJobs?: number;
}

interface FilterOptions {
  employmentTypes: string[];
  batches: number[];
  locations: string[];
}

function formatNumber(n: number): string {
  return n.toLocaleString();
}

function FilterDropdown({ label, options, selected, onChange, formatLabel }: {
  label: string;
  options: string[];
  selected: string | null;
  onChange: (val: string | null) => void;
  formatLabel?: (val: string) => string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg border transition-colors whitespace-nowrap ${selected
            ? 'bg-orange-50 border-orange-300 text-orange-700 font-medium'
            : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
          }`}
      >
        {label}{selected && `: ${formatLabel ? formatLabel(selected) : selected}`}
        <svg className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-1 min-w-[160px] max-h-60 overflow-y-auto">
          <button
            onClick={() => { onChange(null); setOpen(false); }}
            className={`w-full text-left px-3 py-1.5 text-xs rounded transition-colors ${!selected ? 'bg-orange-50 text-orange-700 font-semibold' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            All {label}
          </button>
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => { onChange(opt); setOpen(false); }}
              className={`w-full text-left px-3 py-1.5 text-xs rounded transition-colors ${selected === opt
                  ? 'bg-orange-50 text-orange-700 font-semibold'
                  : 'text-gray-700 hover:bg-gray-50'
                }`}
            >
              {formatLabel ? formatLabel(opt) : opt}
              {selected === opt && <span className="float-right text-orange-500">&#10003;</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CareerCard({ career }: { career: CareerTrend }) {
  const navigate = useNavigate();
  return (
    <div className="bg-white border border-gray-200/90 hover:border-orange-300 rounded-xl p-4 transition-all duration-150 hover:shadow-xs group">
      {/* Top Header Row */}
      <div className="flex items-start justify-between gap-3 mb-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-orange-100/80 text-orange-600 flex items-center justify-center shrink-0">
            <BriefcaseIcon className="w-4 h-4" />
          </div>
          <h3 className="text-base font-bold text-gray-900 group-hover:text-orange-600 transition-colors truncate">
            {career.position}
          </h3>
        </div>

        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-100 shrink-0">
          <UserGroupIcon className="w-3.5 h-3.5 text-orange-500" />
          {formatNumber(career.alumniCount)} alumni
        </span>
      </div>

      {/* Middle Grid of Structured Information */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-2 text-xs py-2.5 border-t border-b border-gray-100 mb-3">
        {career.topEmployers.length > 0 && (
          <div className="flex items-start gap-1.5 text-gray-600 min-w-0">
            <BuildingOfficeIcon className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <span className="text-gray-400 text-[11px] block font-medium">Top Employers</span>
              <span className="font-semibold text-gray-800 truncate block" title={career.topEmployers.map((e) => e.name).join(', ')}>
                {career.topEmployers.map((e) => e.name).join(', ')}
              </span>
            </div>
          </div>
        )}

        {career.mostCommonCourse && (
          <div className="flex items-start gap-1.5 text-gray-600 min-w-0">
            <AcademicCapIcon className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <span className="text-gray-400 text-[11px] block font-medium">Common Program</span>
              <span className="font-semibold text-gray-800 truncate block" title={formatProgramLongName(career.mostCommonCourse)}>
                {formatProgramLongName(career.mostCommonCourse)}
              </span>
            </div>
          </div>
        )}

        {career.averageExperienceYears > 0 && (
          <div className="flex items-start gap-1.5 text-gray-600 min-w-0">
            <ClockIcon className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <span className="text-gray-400 text-[11px] block font-medium">Average Experience</span>
              <span className="font-semibold text-gray-800 truncate block">
                {formatExperience(career.averageExperienceYears)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Footer Action */}
      <div className="flex items-center justify-between flex-wrap gap-2 pt-0.5">
        <div className="flex items-center gap-2 flex-wrap">
          {career.activeJobsCount && career.activeJobsCount > 0 ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/jobs?filter=${encodeURIComponent(career.position)}`);
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/90 hover:bg-emerald-100 hover:border-emerald-300 transition-colors shadow-2xs cursor-pointer"
              title="View matching active job postings on CTU Naga Job Postings"
            >
              <BriefcaseIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>{career.activeJobsCount} Active Job{career.activeJobsCount > 1 ? 's' : ''}</span>
            </button>
          ) : null}

          {career.hiredViaJobsCount && career.hiredViaJobsCount > 0 ? (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200/80"
              title="Alumni hired through CTU Naga job postings"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
              <span>{career.hiredViaJobsCount} hired via portal</span>
            </span>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => navigate(`/career-trends/${encodeURIComponent(career.position)}`)}
          className="text-xs font-semibold text-orange-600 hover:text-orange-700 transition-colors flex items-center gap-1.5 py-1 px-2.5 rounded-lg hover:bg-orange-50/60 ml-auto cursor-pointer"
        >
          View Career Insights <ArrowRightIcon className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function matchQuery(text: string, query: string): boolean {
  return text.toLowerCase().includes(query.toLowerCase());
}

export default function CareerTrendsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>({
    overview: null,
    topCareers: [],
    topEmployers: [],
    topIndustries: [],
    industryDistribution: [],
    skillsDistribution: [],
    batchDistribution: [],
    statusDistribution: [],
    fastestGrowing: [],
    topBatches: [],
  });

  useEffect(() => {
    let cancelled = false;
    careerTrendsApi.list()
      .then((res) => { if (!cancelled) setData(res); })
      .catch(() => { })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const query = (searchParams.get('q') || '').toLowerCase().trim();
  const isSearching = query.length > 0;

  const allCareers: CareerTrend[] = data.topCareers;
  const filterOptions: FilterOptions = data.filterOptions || { employmentTypes: [], batches: [], locations: [] };

  const [selectedPosition, setSelectedPosition] = useState<string | null>(null);
  const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null);
  const [selectedEmploymentType, setSelectedEmploymentType] = useState<string | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<string | null>(null);
  const [selectedExperience, setSelectedExperience] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<string>('all');
  const [selectedCard, setSelectedCard] = useState<RankCard | null>(null);
  const [myApplications, setMyApplications] = useState<any[]>([]);
  const [activeJobsNav, setActiveJobsNav] = useState<{ cardName: string; kindLabel?: string; jobs: any[] } | null>(null);

  useEffect(() => {
    jobsApi.myApplications()
      .then((res) => setMyApplications(Array.isArray(res) ? res : []))
      .catch(() => setMyApplications([]));
  }, []);

  const handleSelectCard = (card: RankCard | null) => {
    setSelectedCard(card);
    if (!card) {
      setActiveJobsNav(null);
    }
  };

  const handleToggleActiveJobs = (jobs: any[]) => {
    if (activeJobsNav && activeJobsNav.cardName === selectedCard?.name) {
      setActiveJobsNav(null);
    } else if (selectedCard) {
      setActiveJobsNav({
        cardName: selectedCard.name,
        kindLabel: selectedCard.metricLabel || selectedCard.kind,
        jobs,
      });
    }
  };

  const careerNames = [...new Set(allCareers.map((c) => c.position))];
  const careerIndustryNames = [...new Set(allCareers.flatMap((c) => c.topIndustries?.map((ind) => ind.name) || []))];
  const hasAnyFilter = selectedPosition || selectedIndustry || selectedEmploymentType || selectedBatch || selectedExperience || selectedLocation;

  const clearAllFilters = () => {
    setSelectedPosition(null);
    setSelectedIndustry(null);
    setSelectedEmploymentType(null);
    setSelectedBatch(null);
    setSelectedExperience(null);
    setSelectedLocation(null);
    setSortBy('all');
  };

  const matchesExperience = (career: CareerTrend, range: string): boolean => {
    const yrs = career.averageExperienceYears;
    switch (range) {
      case '0-1': return yrs >= 0 && yrs <= 1;
      case '2-5': return yrs >= 2 && yrs <= 5;
      case '6-10': return yrs >= 6 && yrs <= 10;
      case '10+': return yrs > 10;
      default: return true;
    }
  };

  const filteredCareers = (() => {
    let list = isSearching
      ? allCareers.filter((c) =>
        matchQuery(c.position, query) ||
        c.topEmployers.some((e) => matchQuery(e.name, query)) ||
        (c.mostCommonCourse && (matchQuery(c.mostCommonCourse, query) || matchQuery(formatProgramLongName(c.mostCommonCourse), query))) ||
        c.topSkills.some((s) => matchQuery(s.name, query))
      )
      : [...allCareers];

    if (selectedPosition) list = list.filter((c) => c.position === selectedPosition);
    if (selectedIndustry) list = list.filter((c) => c.topIndustries?.some((ind) => matchQuery(ind.name, selectedIndustry)));
    if (selectedEmploymentType) {
      if (selectedEmploymentType === 'self-employed') {
        list = list.filter((c) => c.employmentStatuses?.includes('self-employed'));
      } else {
        list = list.filter((c) => c.jobTypes?.includes(selectedEmploymentType));
      }
    }
    if (selectedBatch) list = list.filter((c) => c.batches?.includes(Number(selectedBatch)));
    if (selectedExperience) list = list.filter((c) => matchesExperience(c, selectedExperience));
    if (selectedLocation) list = list.filter((c) => c.locations?.some((loc) => matchQuery(loc, selectedLocation)));

    switch (sortBy) {
      case 'most-experienced':
        list.sort((a, b) => b.averageExperienceYears - a.averageExperienceYears);
        break;
      case 'least-experienced':
        list.sort((a, b) => a.averageExperienceYears - b.averageExperienceYears);
        break;
      case 'alphabetical':
        list.sort((a, b) => a.position.localeCompare(b.position));
        break;
      case 'newest':
        list.sort((a, b) => (b.batches?.[0] || 0) - (a.batches?.[0] || 0));
        break;
    }
    return list;
  })();

  const hasResults = filteredCareers.length > 0;

  const clearSearch = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('q');
    setSearchParams(next, { replace: true });
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="mb-4">
          <div className="h-5 w-32 bg-gray-200 animate-pulse rounded mb-1" />
          <div className="h-3 w-64 bg-gray-200 animate-pulse rounded" />
        </div>
        <div className="flex gap-4">
          <div className="flex-1 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-4 h-4 bg-gray-200 animate-pulse rounded" />
                  <div className="h-3 w-24 bg-gray-200 animate-pulse rounded" />
                  <div className="h-3 w-12 bg-gray-200 animate-pulse rounded ml-auto" />
                </div>
                <div className="h-4 w-1/2 bg-gray-200 animate-pulse rounded mb-3" />
                <div className="h-3 w-3/4 bg-gray-200 animate-pulse rounded mb-1.5" />
                <div className="h-3 w-2/3 bg-gray-200 animate-pulse rounded mb-1.5" />
                <div className="h-3 w-1/3 bg-gray-200 animate-pulse rounded mb-3" />
                <div className="h-4 w-28 bg-orange-100 animate-pulse rounded" />
              </div>
            ))}
          </div>
          <aside className="hidden lg:block w-96 xl:w-[410px] shrink-0 self-stretch">
            <div className="sticky top-16 bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="grid grid-cols-2 gap-2 p-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="bg-gray-50 rounded-lg p-2.5">
                    <div className="h-3 w-8 bg-gray-200 animate-pulse rounded mb-1.5" />
                    <div className="h-2.5 w-12 bg-gray-200 animate-pulse rounded" />
                  </div>
                ))}
              </div>
              <div className="mx-3 h-9 bg-gray-200 animate-pulse rounded-t-lg" />
              <div className="p-3 space-y-1.5">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-11 bg-gradient-to-r from-orange-200 to-amber-200 animate-pulse rounded-lg" />
                ))}
              </div>
              <div className="px-3 pb-3">
                <div className="h-32 bg-gray-100 animate-pulse rounded-lg" />
              </div>
            </div>
          </aside>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-4">
        <h1 className="text-base font-bold text-gray-900">Career Trends</h1>
        <p className="text-xs text-gray-500">Employment insights and career trends based on alumni data.</p>
      </div>

      {isSearching && (
        <div className="flex items-center gap-2 mb-3 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
          <span className="text-xs text-orange-700">
            Showing results for <strong>"{query}"</strong>
            {!hasResults && ' — no results found'}
          </span>
          <button onClick={clearSearch} className="ml-auto p-0.5 text-orange-500 hover:text-orange-700 hover:bg-orange-100 rounded">
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 mb-3 bg-white border border-gray-200 rounded-lg px-3 py-2">
        <BriefcaseIcon className="w-4 h-4 text-gray-400 shrink-0" />
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => { clearAllFilters(); }}
            className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${!hasAnyFilter && sortBy === 'all'
                ? 'bg-orange-500 text-white shadow-sm'
                : 'text-gray-500 hover:bg-gray-100'
              }`}
          >
            All Careers
          </button>
          <span className="w-px h-4 bg-gray-300 mx-0.5" />

          <FilterDropdown
            label="Job Position"
            options={careerNames}
            selected={selectedPosition}
            onChange={setSelectedPosition}
          />
          <span className="w-px h-4 bg-gray-300 mx-0.5" />

          <FilterDropdown
            label="Industry"
            options={careerIndustryNames}
            selected={selectedIndustry}
            onChange={setSelectedIndustry}
          />
          <span className="w-px h-4 bg-gray-300 mx-0.5" />

          <FilterDropdown
            label="Employment Type"
            options={filterOptions.employmentTypes}
            selected={selectedEmploymentType}
            onChange={setSelectedEmploymentType}
            formatLabel={(v) => JOB_TYPE_LABELS[v] || v}
          />
          <span className="w-px h-4 bg-gray-300 mx-0.5" />

          <FilterDropdown
            label="Batch"
            options={filterOptions.batches.map(String)}
            selected={selectedBatch}
            onChange={setSelectedBatch}
          />
          <span className="w-px h-4 bg-gray-300 mx-0.5" />

          <FilterDropdown
            label="Experience"
            options={EXPERIENCE_RANGES.map((r) => r.value)}
            selected={selectedExperience}
            onChange={setSelectedExperience}
            formatLabel={(v) => EXPERIENCE_RANGES.find((r) => r.value === v)?.label || v}
          />
          <span className="w-px h-4 bg-gray-300 mx-0.5" />

          <FilterDropdown
            label="Location"
            options={filterOptions.locations}
            selected={selectedLocation}
            onChange={setSelectedLocation}
          />
          <span className="w-px h-4 bg-gray-300 mx-0.5" />

          <FilterDropdown
            label="Sort"
            options={SORT_OPTIONS.map((s) => s.value)}
            selected={sortBy}
            onChange={(v) => setSortBy(v || 'all')}
            formatLabel={(v) => SORT_OPTIONS.find((s) => s.value === v)?.label || v}
          />
        </div>
      </div>

      {hasAnyFilter && (
        <div className="flex items-center gap-2 mb-3 bg-orange-50 border border-orange-200 rounded-lg px-3 py-1.5">
          <span className="text-xs text-orange-700">
            Filters active
          </span>
          <button
            onClick={() => { clearAllFilters(); }}
            className="ml-auto p-0.5 text-orange-500 hover:text-orange-700 rounded flex items-center gap-1 text-xs"
          >
            <XMarkIcon className="w-3.5 h-3.5" /> Clear all
          </button>
        </div>
      )}

      <div className="flex gap-4">
        <div className="flex-1 min-w-0 space-y-3">
          {selectedCard ? (
            <CareerCardInsightsPanel
              card={selectedCard}
              onBack={() => handleSelectCard(null)}
              onToggleActiveJobs={handleToggleActiveJobs}
              isActiveJobsNavOpen={!!activeJobsNav && activeJobsNav.cardName === selectedCard.name}
            />
          ) : (
            filteredCareers.length > 0 && filteredCareers.map((career) => (
              <CareerCard key={career.position} career={career} />
            ))
          )}
        </div>

        <aside className="hidden lg:block w-96 xl:w-[410px] shrink-0 self-stretch">
          <div className="sticky top-16 h-[calc(100vh-4rem)]">
            {activeJobsNav ? (
              <ActiveJobOpeningsNavCard
                cardName={activeJobsNav.cardName}
                kindLabel={activeJobsNav.kindLabel}
                jobs={activeJobsNav.jobs}
                myApplications={myApplications}
                onClose={() => setActiveJobsNav(null)}
              />
            ) : (
              <CareerLeaderboardNav
                data={data}
                selectedCard={selectedCard}
                onCardSelect={handleSelectCard}
              />
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
