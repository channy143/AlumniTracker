import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BriefcaseIcon, BuildingOfficeIcon, SparklesIcon, AcademicCapIcon, UserGroupIcon, ChartBarIcon, ArrowRightIcon, ClockIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { careerTrendsApi } from '@/services/api';

const COLORS = ['#f97316', '#fb923c', '#fdba74', '#fed7aa', '#ffedd5', '#ea580c', '#d97706', '#c2410c', '#9a3412', '#7c2d12'];
const STATUS_COLORS = ['#059669', '#d97706', '#dc2626', '#2563eb', '#7c3aed', '#6b7280'];

interface CareerTrend {
  position: string;
  alumniCount: number;
  currentInCareer: number;
  topEmployers: { name: string; count: number }[];
  topIndustries: { name: string; count: number }[];
  mostCommonCourse: string | null;
  topSkills: { name: string; count: number }[];
  averageExperienceYears: number;
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

function formatNumber(n: number): string {
  return n.toLocaleString();
}

const fallbackOverview: Overview = {
  totalAlumni: 2847,
  totalEmployed: 2145,
  employmentRate: 75,
  topCareer: 'Software Engineer',
  topIndustry: 'Information Technology',
  topEmployer: 'Accenture',
  topSkill: 'JavaScript',
  averageExperienceYears: 3.2,
};

const fallbackCareers: CareerTrend[] = [
  { position: 'Software Engineer', alumniCount: 186, currentInCareer: 142, topEmployers: [{ name: 'Accenture', count: 28 }, { name: 'IBM', count: 15 }, { name: 'Lexmark', count: 12 }], topIndustries: [{ name: 'Information Technology', count: 150 }, { name: 'Business Process Outsourcing', count: 20 }], mostCommonCourse: 'BSIT', topSkills: [{ name: 'JavaScript', count: 120 }, { name: 'React', count: 85 }, { name: 'Node.js', count: 60 }], averageExperienceYears: 2.8 },
  { position: 'Web Developer', alumniCount: 74, currentInCareer: 58, topEmployers: [{ name: 'TechStart Solutions', count: 10 }, { name: 'CreativeHub PH', count: 6 }], topIndustries: [{ name: 'Information Technology', count: 50 }, { name: 'Design', count: 10 }], mostCommonCourse: 'BSIT', topSkills: [{ name: 'HTML/CSS', count: 60 }, { name: 'JavaScript', count: 50 }, { name: 'PHP', count: 30 }], averageExperienceYears: 2.1 },
  { position: 'IT Support Specialist', alumniCount: 92, currentInCareer: 71, topEmployers: [{ name: 'Concentrix', count: 18 }, { name: 'Teleperformance', count: 14 }], topIndustries: [{ name: 'Information Technology', count: 60 }, { name: 'Business Process Outsourcing', count: 30 }], mostCommonCourse: 'BSIT', topSkills: [{ name: 'Network Administration', count: 45 }, { name: 'Troubleshooting', count: 40 }], averageExperienceYears: 3.2 },
  { position: 'Data Analyst', alumniCount: 45, currentInCareer: 36, topEmployers: [{ name: 'Accenture', count: 8 }, { name: 'UnionBank', count: 5 }], topIndustries: [{ name: 'Information Technology', count: 25 }, { name: 'Finance', count: 10 }], mostCommonCourse: 'BS Mathematics', topSkills: [{ name: 'SQL', count: 30 }, { name: 'Python', count: 25 }, { name: 'Excel', count: 22 }], averageExperienceYears: 1.9 },
  { position: 'Cybersecurity Analyst', alumniCount: 38, currentInCareer: 31, topEmployers: [{ name: 'Accenture', count: 10 }, { name: 'DOST', count: 4 }], topIndustries: [{ name: 'Information Technology', count: 25 }, { name: 'Government', count: 8 }], mostCommonCourse: 'BSIT', topSkills: [{ name: 'Network Security', count: 25 }, { name: 'Python', count: 15 }], averageExperienceYears: 3.5 },
  { position: 'Civil Engineer', alumniCount: 67, currentInCareer: 52, topEmployers: [{ name: 'DPWH', count: 20 }, { name: 'AECOM', count: 8 }], topIndustries: [{ name: 'Government', count: 25 }, { name: 'Construction', count: 20 }], mostCommonCourse: 'BSCE', topSkills: [{ name: 'AutoCAD', count: 40 }, { name: 'Project Management', count: 25 }], averageExperienceYears: 4.1 },
  { position: 'Teacher', alumniCount: 83, currentInCareer: 68, topEmployers: [{ name: 'DepEd', count: 35 }, { name: 'CTU-Naga', count: 10 }], topIndustries: [{ name: 'Education', count: 60 }, { name: 'Government', count: 15 }], mostCommonCourse: 'BSEd', topSkills: [{ name: 'Classroom Management', count: 40 }, { name: 'Curriculum Design', count: 20 }], averageExperienceYears: 5.2 },
  { position: 'Business Analyst', alumniCount: 41, currentInCareer: 32, topEmployers: [{ name: 'Accenture', count: 10 }, { name: 'IBM', count: 5 }], topIndustries: [{ name: 'Information Technology', count: 20 }, { name: 'Business', count: 15 }], mostCommonCourse: 'BSBA', topSkills: [{ name: 'Data Analysis', count: 25 }, { name: 'Excel', count: 20 }], averageExperienceYears: 2.5 },
];

const fallbackEmployers = [
  { name: 'Accenture', alumniCount: 156 }, { name: 'IBM', alumniCount: 89 }, { name: 'Lexmark', alumniCount: 67 },
  { name: 'Globe', alumniCount: 54 }, { name: 'PLDT', alumniCount: 48 }, { name: 'Concentrix', alumniCount: 42 },
  { name: 'Teleperformance', alumniCount: 38 }, { name: 'DepEd', alumniCount: 35 }, { name: 'UnionBank', alumniCount: 28 },
  { name: 'DOST', alumniCount: 22 }, { name: 'TechStart Solutions', alumniCount: 18 }, { name: 'AECOM', alumniCount: 15 },
];

const fallbackIndustries = [
  { name: 'Information Technology', value: 520, percentage: 52 },
  { name: 'Education', value: 180, percentage: 18 },
  { name: 'Business', value: 130, percentage: 13 },
  { name: 'Government', value: 100, percentage: 10 },
  { name: 'Healthcare', value: 70, percentage: 7 },
];

const fallbackStatus = [
  { status: 'Employed', count: 1800, percentage: 63 },
  { status: 'Self-employed', count: 340, percentage: 12 },
  { status: 'Unemployed', count: 256, percentage: 9 },
  { status: 'Student', count: 200, percentage: 7 },
  { status: 'Seeking Opportunities', count: 170, percentage: 6 },
  { status: 'Retired', count: 81, percentage: 3 },
];

const fallbackSkills = [
  { name: 'JavaScript', count: 245 }, { name: 'React', count: 180 }, { name: 'Java', count: 160 },
  { name: 'Node.js', count: 140 }, { name: 'Python', count: 125 }, { name: 'AWS', count: 110 },
  { name: 'SQL', count: 105 }, { name: 'AutoCAD', count: 85 }, { name: 'PHP', count: 72 }, { name: 'C#', count: 65 },
];

const fallbackBatch = [
  { year: 2019, total: 320, employed: 280, rate: 88 },
  { year: 2020, total: 295, employed: 248, rate: 84 },
  { year: 2021, total: 310, employed: 252, rate: 81 },
  { year: 2022, total: 345, employed: 269, rate: 78 },
  { year: 2023, total: 380, employed: 285, rate: 75 },
  { year: 2024, total: 420, employed: 294, rate: 70 },
  { year: 2025, total: 215, employed: 118, rate: 55 },
];

const fallbackTopBatches = [
  { year: 2024, total: 420, employed: 294 },
  { year: 2023, total: 380, employed: 285 },
  { year: 2022, total: 345, employed: 269 },
  { year: 2021, total: 310, employed: 252 },
  { year: 2020, total: 295, employed: 248 },
];

const fallbackFastestGrowing = [
  { position: 'Software Engineer', newAlumni: 18 },
  { position: 'Data Analyst', newAlumni: 12 },
  { position: 'Cybersecurity Analyst', newAlumni: 9 },
];

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
  const skills = data?.skillsDistribution?.length > 0 ? data.skillsDistribution : fallbackSkills;
  const fastestGrowing = data?.fastestGrowing?.length > 0 ? data.fastestGrowing : fallbackFastestGrowing;
  const employers = data?.topEmployers?.length > 0 ? data.topEmployers : fallbackEmployers;
  const industries = data?.industryDistribution?.length > 0 ? data.industryDistribution : fallbackIndustries;

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
  return text.toLowerCase().includes(query);
}

export default function CareerTrendsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState<any>({
    overview: fallbackOverview,
    topCareers: fallbackCareers,
    topEmployers: fallbackEmployers,
    topIndustries: fallbackIndustries.map((i) => ({ name: i.name, alumniCount: i.value, percentage: i.percentage })),
    industryDistribution: fallbackIndustries,
    skillsDistribution: fallbackSkills,
    batchDistribution: fallbackBatch,
    statusDistribution: fallbackStatus,
    fastestGrowing: fallbackFastestGrowing,
    topBatches: fallbackTopBatches,
  });

  useEffect(() => {
    let cancelled = false;
    careerTrendsApi.list()
      .then((res) => { if (!cancelled) setData(res); })
      .catch(() => {})
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

  const [sort, setSort] = useState<string>('all');
  const [showFilter, setShowFilter] = useState<'career' | 'industry' | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);

  const careerNames = [...new Set(allCareers.map((c) => c.position))];
  const careerIndustryNames = [...new Set(allCareers.flatMap((c) => c.topIndustries?.map((ind) => ind.name) || []))];

  const filteredCareers = (() => {
    let list = isSearching
      ? allCareers.filter((c) =>
          matchQuery(c.position, query) ||
          c.topEmployers.some((e) => matchQuery(e.name, query)) ||
          (c.mostCommonCourse && matchQuery(c.mostCommonCourse, query)) ||
          c.topSkills.some((s) => matchQuery(s.name, query))
        )
      : [...allCareers];

    if (selectedFilter && showFilter === 'career') {
      list = list.filter((c) => c.position === selectedFilter);
    }

    if (selectedFilter && showFilter === 'industry') {
      list = list.filter((c) =>
        c.topIndustries?.some((ind) => matchQuery(ind.name, selectedFilter))
      );
    }

    switch (sort) {
      case 'experienced':
        list.sort((a, b) => b.averageExperienceYears - a.averageExperienceYears);
        break;
      case 'least-experienced':
        list.sort((a, b) => a.averageExperienceYears - b.averageExperienceYears);
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

  const toggleFilter = (type: 'career' | 'industry') => {
    if (showFilter === type) {
      setShowFilter(null);
      setSelectedFilter(null);
    } else {
      setShowFilter(type);
      setSelectedFilter(null);
    }
  };

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
            <p className="text-lg font-bold text-gray-900 leading-none">{overview.topCareer}</p>
            <p className="text-[11px] text-gray-500 mt-0.5">Top Career</p>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
            <BuildingOfficeIcon className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900 leading-none">{overview.topIndustry}</p>
            <p className="text-[11px] text-gray-500 mt-0.5">Top Industry</p>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
            <UserGroupIcon className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900 leading-none">{overview.employmentRate}%</p>
            <p className="text-[11px] text-gray-500 mt-0.5">Employment Rate</p>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
            <ClockIcon className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900 leading-none">{overview.averageExperienceYears}yrs</p>
            <p className="text-[11px] text-gray-500 mt-0.5">Avg Experience</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-3 bg-white border border-gray-200 rounded-lg px-3 py-2">
        <BriefcaseIcon className="w-4 h-4 text-gray-400 shrink-0" />
        <div className="flex items-center gap-1 flex-wrap">
          <button
            onClick={() => { setSort('all'); setShowFilter(null); setSelectedFilter(null); }}
            className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
              sort === 'all' && showFilter === null
                ? 'bg-orange-500 text-white shadow-sm'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            All Careers
          </button>
          <span className="w-px h-4 bg-gray-300 mx-1" />

          <div className="relative">
            <button
              onClick={() => toggleFilter('career')}
              className={`px-3 py-1 text-xs font-medium rounded-full transition-colors flex items-center gap-1 ${
                showFilter === 'career'
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              Type of Career
              <svg className={`w-3 h-3 transition-transform ${showFilter === 'career' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            {showFilter === 'career' && (
              <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                {careerNames.map((name) => (
                  <button
                    key={name}
                    onClick={() => setSelectedFilter(selectedFilter === name ? null : name)}
                    className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                      selectedFilter === name
                        ? 'bg-orange-50 text-orange-700 font-semibold'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {name}
                    {selectedFilter === name && <span className="float-right text-orange-500">&#10003;</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
          <span className="w-px h-4 bg-gray-300 mx-1" />

          <div className="relative">
            <button
              onClick={() => toggleFilter('industry')}
              className={`px-3 py-1 text-xs font-medium rounded-full transition-colors flex items-center gap-1 ${
                showFilter === 'industry'
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              Type of Industry
              <svg className={`w-3 h-3 transition-transform ${showFilter === 'industry' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            {showFilter === 'industry' && (
              <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                {careerIndustryNames.map((name) => (
                  <button
                    key={name}
                    onClick={() => setSelectedFilter(selectedFilter === name ? null : name)}
                    className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                      selectedFilter === name
                        ? 'bg-orange-50 text-orange-700 font-semibold'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {name}
                    {selectedFilter === name && <span className="float-right text-orange-500">&#10003;</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
          <span className="w-px h-4 bg-gray-300 mx-1" />

          <button
            onClick={() => { setSort('experienced'); setShowFilter(null); setSelectedFilter(null); }}
            className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
              sort === 'experienced'
                ? 'bg-orange-500 text-white shadow-sm'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            Most Experienced
          </button>
          <button
            onClick={() => { setSort('least-experienced'); setShowFilter(null); setSelectedFilter(null); }}
            className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
              sort === 'least-experienced'
                ? 'bg-orange-500 text-white shadow-sm'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            Least Experienced
          </button>
        </div>
      </div>

      {selectedFilter && (
        <div className="flex items-center gap-2 mb-3 bg-orange-50 border border-orange-200 rounded-lg px-3 py-1.5">
          <span className="text-xs text-orange-700">
            Filtered by: <strong>{selectedFilter}</strong>
          </span>
          <button
            onClick={() => { setSelectedFilter(null); setShowFilter(null); }}
            className="ml-auto p-0.5 text-orange-500 hover:text-orange-700 rounded"
          >
            <XMarkIcon className="w-4 h-4" />
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
