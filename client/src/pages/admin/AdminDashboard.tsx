import { useState, useEffect } from 'react';
import { adminApi } from '@/services/api';
import { Link } from 'react-router-dom';
import { SkeletonCard, SkeletonStatCard } from '@/components/ui/Skeleton';
import { 
  BriefcaseIcon, 
  UserGroupIcon, 
  ChartBarIcon, 
  CurrencyDollarIcon, 
  DocumentTextIcon, 
  MegaphoneIcon, 
  CalendarDaysIcon, 
  BuildingOfficeIcon, 
  ClipboardDocumentListIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  FireIcon,
  StarIcon,
  RocketLaunchIcon,
  BoltIcon
} from '@heroicons/react/24/outline';
import { FireIcon as FireSolid, StarIcon as StarSolid } from '@heroicons/react/24/solid';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line } from 'recharts';

const COLORS = ['#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#6366f1'];
const STATUS_COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6'];
const ALIGNMENT_COLORS = ['#10b981', '#f59e0b', '#ef4444'];

function SectionDivider() {
  return <div className="border-t border-gray-200 my-4" />;
}

function SectionHeading({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="w-1 h-4 bg-orange-500 rounded-full" />
      <h2 className="text-xs font-bold text-gray-600 uppercase tracking-wider">{label}</h2>
    </div>
  );
}

// Quick Actions Carousel Component
function QuickActionsCarousel({ onActionClick }: { onActionClick?: (route: string) => void }) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const actions = [
    {
      id: 1,
      title: 'Create Announcement',
      subtitle: 'Share important updates',
      icon: MegaphoneIcon,
      gradient: 'from-red-500 to-orange-500',
      image: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=400&h=300&fit=crop',
      fallback: 'https://picsum.photos/seed/megaphone/400/300',
      badge: 'Most Used',
      badgeIcon: FireSolid,
      route: '/admin/announcements'
    },
    {
      id: 2,
      title: 'Create Event',
      subtitle: 'Schedule alumni activities',
      icon: CalendarDaysIcon,
      gradient: 'from-teal-400 to-cyan-500',
      image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400&h=300&fit=crop',
      fallback: 'https://picsum.photos/seed/events/400/300',
      badge: 'Quick',
      badgeIcon: RocketLaunchIcon,
      route: '/admin/events'
    },
    {
      id: 3,
      title: 'Create Tracer Survey',
      subtitle: 'Launch employment surveys',
      icon: ClipboardDocumentListIcon,
      gradient: 'from-purple-400 to-indigo-500',
      image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400&h=300&fit=crop',
      fallback: 'https://picsum.photos/seed/survey/400/300',
      badge: 'New',
      badgeIcon: StarSolid,
      route: '/admin/surveys'
    },
    {
      id: 4,
      title: 'Export Reports',
      subtitle: 'Download analytics reports',
      icon: DocumentTextIcon,
      gradient: 'from-pink-400 to-rose-500',
      image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=300&fit=crop',
      fallback: 'https://picsum.photos/seed/reports/400/300',
      badge: 'Popular',
      badgeIcon: FireIcon,
      route: '/admin/reports'
    },
    {
      id: 5,
      title: 'View Career Analytics',
      subtitle: 'Explore employment trends',
      icon: ChartBarIcon,
      gradient: 'from-amber-400 to-orange-500',
      image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=300&fit=crop',
      fallback: 'https://picsum.photos/seed/analytics/400/300',
      badge: 'Essential',
      badgeIcon: StarIcon,
      route: '/admin/analytics'
    },
    {
      id: 6,
      title: 'Generate Report',
      subtitle: 'Create institutional reports',
      icon: DocumentTextIcon,
      gradient: 'from-blue-400 to-indigo-600',
      image: 'https://images.unsplash.com/photo-1512314889357-e157c22f938d?w=400&h=300&fit=crop',
      fallback: 'https://picsum.photos/seed/documents/400/300',
      badge: 'Premium',
      badgeIcon: BoltIcon,
      route: '/admin/reports/generate'
    }
  ];

  const goTo = (index: number) => {
    setSelectedIndex(((index % actions.length) + actions.length) % actions.length);
  };

  const handleCardClick = (route: string) => {
    if (onActionClick) {
      onActionClick(route);
    } else {
      window.location.href = route;
    }
  };

  const CARD_W = 670;
  const CARD_H = 380;
  const CARD_GAP = 635;

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 bg-orange-500 rounded-full" />
          <h2 className="text-xs font-bold text-gray-600 uppercase tracking-wider">Quick Actions</h2>
          <span className="text-[10px] text-gray-400">Admin shortcuts</span>
        </div>
      </div>

      <div className="relative" style={{ height: `${CARD_H + 20}px` }}>
        <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
          {actions.map((action, index) => {
            const rawOffset = index - selectedIndex;
            const half = actions.length / 2;
            const offset = rawOffset > half ? rawOffset - actions.length : rawOffset < -half ? rawOffset + actions.length : rawOffset;
            const isSelected = offset === 0;
            const isSide = Math.abs(offset) === 1;
            return (
              <div
                key={action.id}
                className="absolute cursor-pointer transition-all duration-500 ease-in-out"
                style={{
                  width: `${CARD_W}px`,
                  height: `${CARD_H}px`,
                  borderRadius: 0,
                  transform: `translateX(${offset * CARD_GAP}px) scale(${isSelected ? 1 : 0.85})`,
                  opacity: isSelected ? 1 : (isSide ? 0.2 : 0),
                  zIndex: actions.length - Math.abs(offset),
                  pointerEvents: isSelected ? 'auto' : 'none',
                }}
                onClick={() => {
                  if (isSelected) handleCardClick(action.route);
                  else goTo(index);
                }}
              >
                <div className={`relative h-full flex bg-gradient-to-br ${action.gradient}`}>
                  <div className="absolute inset-0 bg-white/0 transition-colors duration-300 hover:bg-white/10" />
                  <div className="w-[70%] h-full relative overflow-hidden">
                    <img src={action.image} alt="" className="absolute inset-0 w-full h-full object-cover" onError={(e) => { (e.currentTarget.src = action.fallback); e.currentTarget.onerror = null; }} />
                    <div className="absolute inset-0 bg-black/20" />
                  </div>
                  <div className="w-[30%] h-full relative flex flex-col justify-center px-3 py-4">
                    <div className="absolute top-[17px] right-3">
                      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-white/20 border border-white/25 text-white text-[10px] font-medium backdrop-blur-sm">
                        <action.badgeIcon className="w-3 h-3" />
                        {action.badge}
                      </span>
                    </div>
                    <div className="-mt-[150px]">
                      <h3 className="text-sm font-bold text-white drop-shadow-md leading-tight mb-1">
                        {action.title}
                      </h3>
                      <p className="text-[10px] text-white/70 drop-shadow-sm leading-relaxed">
                        {action.subtitle}. Quick access to manage and configure this feature directly from your dashboard.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={() => goTo(selectedIndex - 1)}
          className="absolute top-1/2 -translate-y-1/2 z-20 p-2 text-orange-500 hover:text-orange-400 transition-all duration-300 hover:drop-shadow-[0_0_10px_rgba(249,115,22,0.6)]"
          style={{ left: `calc(50% - ${CARD_W / 2 + 50 + 16}px)`, borderRadius: 0 }}
        >
          <ChevronLeftIcon className="w-12 h-12" />
        </button>
        <button
          onClick={() => goTo(selectedIndex + 1)}
          className="absolute top-1/2 -translate-y-1/2 z-20 p-2 text-orange-500 hover:text-orange-400 transition-all duration-300 hover:drop-shadow-[0_0_10px_rgba(249,115,22,0.6)]"
          style={{ left: `calc(50% + ${CARD_W / 2 + 20}px)`, borderRadius: 0 }}
        >
          <ChevronRightIcon className="w-12 h-12" />
        </button>
      </div>

      <div className="flex justify-center gap-1.5 mt-3">
        {actions.map((_, index) => (
          <button
            key={index}
            onClick={() => goTo(index)}
            className={`transition-all duration-300 ${
              selectedIndex === index ? 'w-4 bg-orange-500' : 'w-1.5 bg-gray-300 hover:bg-gray-400'
            }`}
            style={{ height: '6px', borderRadius: 0 }}
          />
        ))}
      </div>
    </>
  );
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>({});
  const [charts, setCharts] = useState<any>({});
  const [surveys, setSurveys] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      adminApi.dashboardStats().then(setStats).catch(() => {}),
      adminApi.dashboardCharts().then(setCharts).catch(() => {}),
      adminApi.surveyList().then(setSurveys).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const statCards = [
    { label: 'Total Alumni', value: stats?.totalAlumni?.toLocaleString() || '0', icon: UserGroupIcon, color: 'text-orange-600', bg: 'bg-orange-50', href: '/admin/alumni' },
    { label: 'Employment Rate', value: stats?.employedPercentage ? `${stats.employedPercentage}%` : '0%', icon: BriefcaseIcon, color: 'text-emerald-600', bg: 'bg-emerald-50', href: '/admin/alumni' },
    { label: 'Survey Completion', value: `${stats?.tracerSurveyCompletionRate || 0}%`, icon: DocumentTextIcon, color: 'text-purple-600', bg: 'bg-purple-50', href: '/admin/surveys' },
    { label: 'Average Salary', value: stats?.averageSalary ? `₱${Number(stats.averageSalary).toLocaleString()}` : '—', icon: CurrencyDollarIcon, color: 'text-green-600', bg: 'bg-green-50', href: '/admin/analytics' },
    { label: 'Alumni Tracked This Year', value: stats?.registeredThisYear?.toLocaleString() || '0', icon: UserGroupIcon, color: 'text-cyan-600', bg: 'bg-cyan-50', href: '/admin/alumni' },
    { label: 'Partner Companies', value: stats?.partnerCompanies?.toLocaleString() || '0', icon: BuildingOfficeIcon, color: 'text-indigo-600', bg: 'bg-indigo-50', href: '/admin/companies' },
    { label: 'Open Tracer Surveys', value: stats?.activeSurveyCount?.toLocaleString() || '0', icon: ClipboardDocumentListIcon, color: 'text-amber-600', bg: 'bg-amber-50', href: '/admin/surveys' },
    { label: 'Total Employed', value: stats?.employedCount?.toLocaleString() || '0', icon: BriefcaseIcon, color: 'text-pink-600', bg: 'bg-pink-50', href: '/admin/alumni' },
  ];

  const statusData = charts?.statusDistribution || [];
  const courseData = charts?.alumniByCourse || [];
  const industryData = charts?.industryDistribution || [];
  const topEmployers = charts?.topHiringCompanies || [];
  const salaryData = charts?.salaryDistribution || [];
  const batchData = charts?.batchEmploymentData || [];
  const skillsData = charts?.skillsInDemand || [];
  const geoData = charts?.geographicDistribution || [];
  const employmentTypeData = charts?.employmentTypeDistribution || [];
  const alignmentData = charts?.workAlignmentDistribution || [];

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="mb-4"><div className="h-5 w-36 bg-gray-200 animate-pulse rounded mb-1" /><div className="h-3 w-48 bg-gray-200 animate-pulse rounded" /></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => <SkeletonStatCard key={i} className="h-20" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-3">{[1, 2].map((i) => <SkeletonCard key={i} />)}</div>
          <div className="space-y-3">{[1, 2, 3].map((i) => <SkeletonCard key={i} className="h-32" />)}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-5">
        <h1 className="text-base font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-xs text-gray-500 mt-0.5">Alumni tracer overview and key career analytics</p>
      </div>

      {/* KPI Cards - Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {statCards.map((stat) => (
          <Link key={stat.label} to={stat.href} className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-center gap-3 hover:shadow-sm transition-shadow">
            <div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center shrink-0`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <div>
              <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-[11px] text-gray-500 mt-0.5">{stat.label}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Actions Carousel */}
      <QuickActionsCarousel />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-3">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Employment Trend by Graduation Year</h2>
            {batchData.length > 0 ? (
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={batchData}>
                    <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} />
                    <Tooltip formatter={(v: number) => [`${Math.round(v)}%`, 'Employment Rate']} />
                    <Line type="monotone" dataKey="rate" stroke="#f97316" strokeWidth={2} dot={{ r: 3, fill: '#f97316' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : <p className="text-xs text-gray-400 text-center py-8">No batch data yet.</p>}
          </div>

          <SectionHeading label="Program & Industry Insights" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Alumni by Course</h2>
              {courseData.length > 0 ? (
                <div className="space-y-2">
                  {courseData.slice(0, 6).map((c: any) => (
                    <div key={c.course}>
                      <div className="flex items-center justify-between text-xs mb-0.5">
                        <span className="text-gray-700">{c.course}</span>
                        <span className="text-gray-500">{c.count}</span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-orange-500 rounded-full" style={{ width: `${Math.min(100, (c.count / Math.max(...courseData.map((x: any) => x.count), 1)) * 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="text-xs text-gray-400 text-center py-4">No course data yet.</p>}
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Top Employers</h2>
              {topEmployers.length > 0 ? (
                <div className="space-y-2">
                  {topEmployers.slice(0, 6).map((e: any, i: number) => (
                    <div key={e.company || i} className="flex items-center gap-2 text-xs">
                      <span className="w-5 h-5 rounded bg-emerald-100 flex items-center justify-center text-[10px] font-bold text-emerald-600 shrink-0">{i + 1}</span>
                      <span className="flex-1 text-gray-700">{e.company}</span>
                      <span className="text-gray-500">{e.count}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-xs text-gray-400 text-center py-4">No employer data yet.</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Industry Distribution</h2>
              {industryData.length > 0 ? (
                <div className="space-y-2">
                  {industryData.slice(0, 6).map((ind: any, i: number) => (
                    <div key={ind.industry || i}>
                      <div className="flex items-center justify-between text-xs mb-0.5">
                        <span className="text-gray-700">{ind.industry}</span>
                        <span className="text-gray-500">{ind.count}</span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${Math.min(100, (ind.count / Math.max(...industryData.map((x: any) => x.count), 1)) * 100)}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="text-xs text-gray-400 text-center py-4">No industry data yet.</p>}
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Skills in Demand</h2>
              {skillsData.length > 0 ? (
                <div className="space-y-1.5">
                  {skillsData.slice(0, 8).map((s: any) => (
                    <div key={s.name} className="flex items-center justify-between text-xs">
                      <span className="text-gray-700">{s.name}</span>
                      <span className="text-gray-500 font-medium">{s.count}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-xs text-gray-400 text-center py-4">No skills data yet.</p>}
            </div>
          </div>

          <SectionDivider />
          <SectionHeading label="Compensation & Trends" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Salary Distribution</h2>
              {salaryData.length > 0 ? (
                <div className="h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={salaryData}>
                      <XAxis dataKey="range" tick={{ fontSize: 9 }} angle={-20} textAnchor="end" height={40} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#f97316" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : <p className="text-xs text-gray-400 text-center py-4">No salary data yet.</p>}
              <div className="grid grid-cols-3 gap-2 mt-3">
                <div className="bg-gray-50 rounded-lg p-2 text-center">
                  <p className="text-[10px] text-gray-500">Average</p>
                  <p className="text-xs font-bold text-gray-900">{stats?.averageSalary ? `₱${Number(stats.averageSalary).toLocaleString()}` : '—'}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2 text-center">
                  <p className="text-[10px] text-gray-500">Highest</p>
                  <p className="text-xs font-bold text-gray-900">{stats?.highestSalary ? `₱${Number(stats.highestSalary).toLocaleString()}` : '—'}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2 text-center">
                  <p className="text-[10px] text-gray-500">Lowest</p>
                  <p className="text-xs font-bold text-gray-900">{stats?.lowestSalary ? `₱${Number(stats.lowestSalary).toLocaleString()}` : '—'}</p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Geographic Distribution</h2>
              {geoData.length > 0 ? (
                <div className="space-y-2">
                  {geoData.slice(0, 5).map((g: any) => (
                    <div key={g.location}>
                      <div className="flex items-center justify-between text-xs mb-0.5">
                        <span className="text-gray-700">{g.location}</span>
                        <span className="text-gray-500">{g.count} ({g.percentage || 0}%)</span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${Math.min(100, g.percentage || 0)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="text-xs text-gray-400 text-center py-4">No location data yet.</p>}
            </div>
          </div>

        </div>

        <div className="space-y-3">
          <div className="bg-white border border-gray-200 rounded-lg p-3 border-l-4 border-l-orange-400">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <DocumentTextIcon className="w-4 h-4 text-orange-500" />
              Survey Progress
            </h3>
            {surveys.find((s) => s.is_active) ? (
              <div>
                <p className="text-xs text-gray-700 mb-1.5 font-medium">{surveys.find((s) => s.is_active)?.title}</p>
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-orange-500 rounded-full" style={{ width: `${Math.min(100, stats?.tracerSurveyCompletionRate || 0)}%` }} />
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  Responses: <span className="font-medium text-gray-700">{stats?.surveyResponsesCount || 0}</span> / {stats?.surveyTargetCount || 1} <span className="text-gray-400">({stats?.tracerSurveyCompletionRate || 0}%)</span>
                </p>
              </div>
            ) : <p className="text-xs text-gray-400 text-center py-4">No active survey.</p>}
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-3 border-l-4 border-l-orange-400">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <CalendarDaysIcon className="w-4 h-4 text-orange-500" />
              Upcoming Events
            </h3>
            <p className="text-xs text-gray-400 text-center py-4">No upcoming events for now.</p>
          </div>

          <SectionDivider />
          <SectionHeading label="Graduate Outcomes" />

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Employment Status</h2>
            {statusData.length > 0 ? (
              <div className="flex flex-col items-center gap-4">
                <div className="h-40 w-40 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={statusData} dataKey="count" nameKey="status" cx="50%" cy="50%" innerRadius={36} outerRadius={64} paddingAngle={2}>
                        {statusData.map((_: any, i: number) => <Cell key={i} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-1.5 w-full">
                  {statusData.map((d: any, i: number) => (
                    <div key={d.status} className="flex items-center gap-2 text-xs">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: STATUS_COLORS[i % STATUS_COLORS.length] }} />
                      <span className="text-gray-700 w-24 capitalize">{d.status}</span>
                      <span className="font-medium text-gray-900">{d.count || 0}</span>
                      <span className="text-gray-400 ml-auto">{d.percentage || 0}%</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : <p className="text-xs text-gray-400 text-center py-8">No employment data yet.</p>}
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Work Alignment</h2>
            {alignmentData.length > 0 ? (
              <div className="flex flex-col items-center gap-3">
                <div className="h-32 w-32 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={alignmentData} dataKey="count" nameKey="label" cx="50%" cy="50%" innerRadius={26} outerRadius={54} paddingAngle={2}>
                        {alignmentData.map((_: any, i: number) => <Cell key={i} fill={ALIGNMENT_COLORS[i % ALIGNMENT_COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-1.5 w-full">
                  {alignmentData.map((d: any, i: number) => (
                    <div key={d.label} className="flex items-center gap-2 text-xs">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: ALIGNMENT_COLORS[i % ALIGNMENT_COLORS.length] }} />
                      <span className="text-gray-700 w-24">{d.label}</span>
                      <span className="font-medium text-gray-900">{d.count || 0}</span>
                      <span className="text-gray-400 ml-auto">{d.percentage || 0}%</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : <p className="text-xs text-gray-400 text-center py-8">No work alignment data yet.</p>}
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Employment Type</h2>
            {employmentTypeData.length > 0 ? (
              <div className="space-y-2">
                {employmentTypeData.map((t: any, i: number) => (
                  <div key={t.type}>
                    <div className="flex items-center justify-between text-xs mb-0.5">
                      <span className="text-gray-700 capitalize">{t.type.replace('-', ' ')}</span>
                      <span className="text-gray-500">{t.count}</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${Math.min(100, (t.count / Math.max(...employmentTypeData.map((x: any) => x.count), 1)) * 100)}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="text-xs text-gray-400 text-center py-4">No employment type data yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
