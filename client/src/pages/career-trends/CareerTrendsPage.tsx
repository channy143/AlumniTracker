import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BriefcaseIcon, BuildingOfficeIcon, SparklesIcon, AcademicCapIcon, UserGroupIcon, ChartBarIcon, ArrowRightIcon, ClockIcon, XMarkIcon, FunnelIcon } from '@heroicons/react/24/outline';
import { XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { careerTrendsApi } from '@/services/api';
import { SkeletonCard, SkeletonStatCard, SkeletonRow } from '@/components/ui/Skeleton';

const COLORS = ['#f97316', '#fb923c', '#fdba74', '#fed7aa', '#ffedd5', '#ea580c', '#d97706', '#c2410c', '#9a3412', '#7c2d12'];
const STATUS_COLORS = ['#059669', '#d97706', '#dc2626', '#2563eb', '#7c3aed', '#6b7280'];

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
}

interface FilterOptions {
  employmentTypes: string[];
  batches: number[];
  locations: string[];
}

function formatNumber(n: number): string {
  return n.toLocaleString();
}

function FilterDropdown({ label, icon, options, selected, onChange, formatLabel }: {
  label: string;
  icon?: React.ReactNode;
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
        className={`flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg border transition-colors whitespace-nowrap ${
          selected
            ? 'bg-orange-50 border-orange-300 text-orange-700 font-medium'
            : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
        }`}
      >
        {icon}{label}{selected && `: ${formatLabel ? formatLabel(selected) : selected}`}
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
              className={`w-full text-left px-3 py-1.5 text-xs rounded transition-colors ${
                selected === opt
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
    <div className="bg-white border border-gray-200 rounded-lg">
      <div className="py-3 px-4">
        <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
          <BriefcaseIcon className="w-4 h-4 text-orange-500" />
          <span className="font-medium text-gray-700">Career Trend</span>
          <span className="text-gray-400">&middot;</span>
          <span>{formatNumber(career.alumniCount)} alumni</span>
        </div>

        <h3 className="text-sm font-semibold text-gray-900 mb-2">{career.position}</h3>

        <div className="space-y-1 text-xs text-gray-600 mb-2">
          {career.topEmployers.length > 0 && (
            <div>
              <span className="text-gray-500">Top Employers: </span>
              {career.topEmployers.map((e) => e.name).join(', ')}
            </div>
          )}
          {career.mostCommonCourse && (
            <div className="whitespace-nowrap overflow-hidden text-ellipsis">
              <span className="text-gray-500">Common Course: </span>
              {career.mostCommonCourse}
            </div>
          )}
          {career.averageExperienceYears > 0 && (
            <div>
              <span className="text-gray-500">Avg Experience: </span>
              {career.averageExperienceYears} years
            </div>
          )}
        </div>

        <button
          onClick={() => navigate(`/career-trends/${encodeURIComponent(career.position)}`)}
          className="text-xs font-medium text-orange-600 hover:text-orange-700 transition-colors flex items-center gap-1"
        >
          View Career Insights <ArrowRightIcon className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

function SidebarWidgets({ data }: { data: any }) {
  const { skillsDistribution = [], fastestGrowing = [], topEmployers = [], industryDistribution = [] } = data || {};
  const skills = skillsDistribution;
  const employers = topEmployers;
  const industries = industryDistribution;

  return (
    <div className="space-y-3">
      <div className="bg-white border border-gray-200 rounded-lg p-3">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <SparklesIcon className="w-4 h-4 text-orange-500" />
          Career Highlights
        </h3>
        {fastestGrowing.length > 0 && (
          <div className="text-xs">
            <span className="text-gray-500">Fastest Growing:</span>
            <p className="font-semibold text-gray-800">{fastestGrowing[0].position}</p>
            <p className="text-orange-600 font-medium">+{fastestGrowing[0].newAlumni} Alumni This Year</p>
          </div>
        )}
        {fastestGrowing.length > 1 && (
          <div className="mt-2 pt-2 border-t border-gray-100 space-y-1">
            {fastestGrowing.slice(1).map((fg: any) => (
              <p key={fg.position} className="text-xs text-gray-600">
                {fg.position} <span className="text-orange-600 font-medium">+{fg.newAlumni}</span>
              </p>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-3">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <BuildingOfficeIcon className="w-4 h-4 text-orange-500" />
          Top Employers
        </h3>
        <div className="space-y-1.5">
          {employers.slice(0, 5).map((emp: any, i: number) => (
            <div key={emp.name} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-orange-100 flex items-center justify-center text-[9px] font-bold text-orange-600 shrink-0">
                  {i + 1}
                </span>
                <span className="text-gray-700 truncate">{emp.name}</span>
              </div>
              <span className="text-gray-400 shrink-0 ml-2">{formatNumber(emp.alumniCount)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-3">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <ChartBarIcon className="w-4 h-4 text-orange-500" />
          Top Industries
        </h3>
        <div className="space-y-1.5">
          {industries.slice(0, 4).map((ind: any, i: number) => (
            <div key={ind.name}>
              <div className="flex items-center justify-between text-xs mb-0.5">
                <span className="text-gray-700 truncate">{ind.name}</span>
                <span className="text-gray-400 shrink-0 ml-2">{ind.percentage}%</span>
              </div>
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${ind.percentage}%`, backgroundColor: COLORS[i % COLORS.length] }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-3">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <AcademicCapIcon className="w-4 h-4 text-orange-500" />
          Trending Skills
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {skills.slice(0, 8).map((skill: any) => (
            <span key={skill.name} className="px-2 py-1 bg-orange-50 text-orange-700 text-[10px] font-medium rounded-full">
              {skill.name}
            </span>
          ))}
        </div>
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
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const query = (searchParams.get('q') || '').toLowerCase().trim();
  const isSearching = query.length > 0;

  const overview: Overview = data.overview;
  const allCareers: CareerTrend[] = data.topCareers;
  const batchData = data.batchDistribution;
  const allIndustryData: any[] = data.industryDistribution;
  const allStatusData: any[] = data.statusDistribution;
  const allCompanies: any[] = data.topEmployers;
  const topBatches = data.topBatches;
  const filterOptions: FilterOptions = data.filterOptions || { employmentTypes: [], batches: [], locations: [] };

  const [selectedPosition, setSelectedPosition] = useState<string | null>(null);
  const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null);
  const [selectedEmploymentType, setSelectedEmploymentType] = useState<string | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<string | null>(null);
  const [selectedExperience, setSelectedExperience] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<string>('all');
  const [showMobileFilters, setShowMobileFilters] = useState(false);

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
          (c.mostCommonCourse && matchQuery(c.mostCommonCourse, query)) ||
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

  const filteredCompanies = isSearching
    ? allCompanies.filter((c) => matchQuery(c.name, query))
    : allCompanies;

  const filteredIndustries = isSearching
    ? allIndustryData.filter((i) => matchQuery(i.name, query))
    : allIndustryData;

  const filteredStatus = isSearching
    ? allStatusData.filter((s) => matchQuery(s.status, query))
    : allStatusData;

  const hasResults = filteredCareers.length > 0 || filteredCompanies.length > 0 || filteredIndustries.length > 0 || filteredStatus.length > 0;

  const clearSearch = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('q');
    setSearchParams(next, { replace: true });
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="mb-4">
          <div className="h-5 w-32 bg-gray-200 animate-pulse rounded mb-1" />
          <div className="h-3 w-64 bg-gray-200 animate-pulse rounded" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          {[1, 2, 3, 4].map((i) => <SkeletonStatCard key={i} className="h-20" />)}
        </div>
        <div className="flex gap-4">
          <div className="flex-1 space-y-3">
            {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
          </div>
          <aside className="hidden lg:block w-80 shrink-0">
            <div className="sticky top-16 space-y-3">
              {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} className="h-32" />)}
            </div>
          </aside>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
            <ChartBarIcon className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900 leading-none">{overview?.topCareer ?? '—'}</p>
            <p className="text-[11px] text-gray-500 mt-0.5">Top Career</p>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
            <BuildingOfficeIcon className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900 leading-none">{overview?.topIndustry ?? '—'}</p>
            <p className="text-[11px] text-gray-500 mt-0.5">Top Industry</p>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
            <UserGroupIcon className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900 leading-none">{overview?.employmentRate ?? 0}%</p>
            <p className="text-[11px] text-gray-500 mt-0.5">Employment Rate</p>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
            <ClockIcon className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900 leading-none">{overview?.averageExperienceYears ?? 0}yrs</p>
            <p className="text-[11px] text-gray-500 mt-0.5">Avg Experience</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-3 bg-white border border-gray-200 rounded-lg px-3 py-2">
        <BriefcaseIcon className="w-4 h-4 text-gray-400 shrink-0" />
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => { clearAllFilters(); }}
            className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
              !hasAnyFilter && sortBy === 'all'
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
            options={['full-time', 'part-time', 'contract', 'freelance', 'self-employed']}
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
          {filteredCareers.length > 0 && filteredCareers.map((career) => (
            <CareerCard key={career.position} career={career} />
          ))}

          {filteredStatus.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-white border border-gray-200 rounded-lg p-3">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <UserGroupIcon className="w-4 h-4 text-orange-500" />
                  Employment Status
                </h3>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="h-44 w-44 shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={filteredStatus}
                          dataKey="count"
                          nameKey="status"
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={70}
                          paddingAngle={2}
                        >
                          {filteredStatus.map((_: any, i: number) => (
                            <Cell key={i} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number, _: any, entry: any) => {
                          const total = filteredStatus.reduce((s: number, d: any) => s + d.count, 0);
                          const pct = total > 0 ? Math.round((value / total) * 100) : 0;
                          return [`${Math.round(value)} alumni (${pct}%)`, entry.payload.status];
                        }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1 min-w-0 space-y-1.5 w-full">
                    {filteredStatus.map((d: any, i: number) => {
                      const total = filteredStatus.reduce((s: number, x: any) => s + x.count, 0);
                      const pct = total > 0 ? Math.round((d.count / total) * 100) : 0;
                      return (
                        <div key={d.status} className="flex items-center gap-2 text-xs">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: STATUS_COLORS[i % STATUS_COLORS.length] }} />
                          <span className="flex-1 truncate text-gray-700">{d.status}</span>
                          <span className="font-medium text-gray-900">{Math.round(d.count)}</span>
                          <span className="text-gray-400 w-8 text-right">{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {filteredCompanies.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-3">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <BuildingOfficeIcon className="w-4 h-4 text-orange-500" />
                    Top Companies Employing Alumni
                  </h3>
                  <div className="space-y-1">
                    {filteredCompanies.slice(0, 8).map((emp: any, i: number) => (
                      <div key={emp.name} className="flex items-center justify-between text-xs py-1.5 px-2 rounded hover:bg-gray-50">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded bg-orange-100 flex items-center justify-center text-[10px] font-bold text-orange-600 shrink-0">
                            {i + 1}
                          </span>
                          <span className="text-gray-700 font-medium">{emp.name}</span>
                        </div>
                        <span className="text-gray-500">{formatNumber(emp.alumniCount)} alumni</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {filteredIndustries.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-white border border-gray-200 rounded-lg p-3">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <ChartBarIcon className="w-4 h-4 text-orange-500" />
                  Employment by Industry
                </h3>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="h-44 w-44 shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={filteredIndustries}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={70}
                          paddingAngle={2}
                        >
                          {filteredIndustries.map((_: any, i: number) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number, _: any, entry: any) => {
                          const total = filteredIndustries.reduce((s: number, d: any) => s + d.value, 0);
                          const pct = total > 0 ? Math.round((value / total) * 100) : 0;
                          return [`${Math.round(value)} alumni (${pct}%)`, entry.payload.name];
                        }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1 min-w-0 space-y-1.5 w-full">
                    {filteredIndustries.map((d: any, i: number) => {
                      const total = filteredIndustries.reduce((s: number, x: any) => s + x.value, 0);
                      const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
                      return (
                        <div key={d.name} className="flex items-center gap-2 text-xs">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                          <span className="flex-1 truncate text-gray-700">{d.name}</span>
                          <span className="font-medium text-gray-900">{Math.round(d.value)}</span>
                          <span className="text-gray-400 w-8 text-right">{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-3">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <AcademicCapIcon className="w-4 h-4 text-orange-500" />
                  Top 5 Most Active Batches
                </h3>
                <div className="space-y-2">
                  {topBatches.map((b: any, i: number) => (
                    <div key={b.year} className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded bg-orange-100 flex items-center justify-center text-[10px] font-bold text-orange-600 shrink-0">
                        {i + 1}
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between text-xs mb-0.5">
                          <span className="font-medium text-gray-800">Batch {b.year}</span>
                          <span className="text-gray-500">{formatNumber(b.total)} alumni</span>
                        </div>
                        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-orange-500"
                            style={{ width: `${topBatches.length > 0 ? Math.round((b.total / topBatches[0].total) * 100) : 0}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="bg-white border border-gray-200 rounded-lg p-3">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <UserGroupIcon className="w-4 h-4 text-orange-500" />
              Employment by Graduation Batch
            </h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={batchData}>
                  <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} allowDecimals={false} tickFormatter={(v: number) => `${v}%`} />
                  <Tooltip formatter={(value: number) => [`${Math.round(value)}%`, 'Employment Rate']} />
                  <Line type="monotone" dataKey="rate" stroke="#f97316" strokeWidth={2} dot={{ r: 3, fill: '#f97316' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <aside className="hidden lg:block w-80 shrink-0">
          <div className="sticky top-16">
            <SidebarWidgets data={data} />
          </div>
        </aside>
      </div>
    </div>
  );
}
