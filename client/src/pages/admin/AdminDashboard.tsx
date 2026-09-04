import { useState, useEffect } from 'react';
import { adminApi, activitiesApi } from '@/services/api';
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
  BoltIcon,
  ClockIcon,
  UserPlusIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';
import { FireIcon as FireSolid, StarIcon as StarSolid } from '@heroicons/react/24/solid';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const STATUS_COLORS = ['#10b981', '#f59e0b', '#ef4444'];
const ALIGNMENT_COLORS = ['#10b981', '#f59e0b', '#ef4444'];

function timeAgo(dateStr: string) {
  const then = new Date(dateStr).getTime();
  if (!then) return '';
  const diff = Date.now() - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function SummaryCard({ title, icon, children, footer }: {
  title: string;
  icon?: any;
  children: React.ReactNode;
  footer?: { label: string; to: string };
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col">
      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
        {icon && (() => { const Icon = icon; return <span className="text-orange-500"><Icon className="w-4 h-4" /></span>; })()}
        {title}
      </h2>
      <div className="flex-1">{children}</div>
      {footer && (
        <Link to={footer.to} className="mt-3 text-xs font-medium text-orange-600 hover:text-orange-700 inline-flex items-center gap-1 shrink-0">
          {footer.label} <ArrowRightIcon className="w-3 h-3" />
        </Link>
      )}
    </div>
  );
}

function MiniDoughnut({ data, colors }: { data: { label: string; value: number }[]; colors: string[] }) {
  const total = data.reduce((a, b) => a + b.value, 0);
  if (total <= 0) {
    return <p className="text-xs text-gray-400 text-center py-6">No data available.</p>;
  }
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="w-28 h-28 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="label" cx="50%" cy="50%" innerRadius={28} outerRadius={44} paddingAngle={2}>
              {data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="space-y-1.5 w-full">
        {data.map((d, i) => (
          <div key={d.label} className="flex items-center gap-2 text-xs">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: colors[i % colors.length] }} />
            <span className="text-gray-700">{d.label}</span>
            <span className="font-medium text-gray-900 ml-auto">{d.value}</span>
            <span className="text-gray-400 w-9 text-right">{Math.round((d.value / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function aggregateEmploymentStatus(data: any[]) {
  let employed = 0, selfEmployed = 0, unemployed = 0;
  (data || []).forEach((d: any) => {
    const s = String(d.status || '').toLowerCase();
    if (['employed', 'entrepreneur'].includes(s) || s.includes('employed')) employed += d.count || 0;
    else if (s.includes('self-employed')) selfEmployed += d.count || 0;
    else unemployed += d.count || 0;
  });
  return [
    { label: 'Employed', value: employed },
    { label: 'Self-employed', value: selfEmployed },
    { label: 'Unemployed', value: unemployed },
  ];
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
                    <img src={action.image} alt="" className="absolute inset-0 w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
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
  const [events, setEvents] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      adminApi.dashboardStats().then(setStats).catch(() => {}),
      adminApi.dashboardCharts().then(setCharts).catch(() => {}),
      adminApi.surveyList().then(setSurveys).catch(() => {}),
      adminApi.dashboardUpcomingEvents().then(setEvents).catch(() => {}),
      activitiesApi.list(5).then(setActivities).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const kpis = [
    { label: 'Total Alumni', value: stats?.totalAlumni != null ? stats.totalAlumni.toLocaleString() : '—', icon: UserGroupIcon, color: 'text-orange-600', bg: 'bg-orange-50', href: '/admin/alumni' },
    { label: 'Employment Rate', value: stats?.employedPercentage != null ? `${stats.employedPercentage}%` : '—', icon: BriefcaseIcon, color: 'text-emerald-600', bg: 'bg-emerald-50', href: '/admin/analytics' },
    { label: 'Survey Completion Rate', value: stats?.tracerSurveyCompletionRate != null ? `${stats.tracerSurveyCompletionRate}%` : '—', icon: DocumentTextIcon, color: 'text-purple-600', bg: 'bg-purple-50', href: '/admin/surveys' },
    { label: 'Average Salary', value: stats?.averageSalary ? `₱${Number(stats.averageSalary).toLocaleString()}` : '—', icon: CurrencyDollarIcon, color: 'text-green-600', bg: 'bg-green-50', href: '/admin/analytics' },
    { label: 'Time to Employment', value: stats?.averageTimeToEmployment != null ? `${stats.averageTimeToEmployment} mo` : '—', icon: ClockIcon, color: 'text-blue-600', bg: 'bg-blue-50', href: '/admin/analytics' },
    { label: 'Open Tracer Surveys', value: stats?.activeSurveyCount != null ? stats.activeSurveyCount.toLocaleString() : '—', icon: ClipboardDocumentListIcon, color: 'text-amber-600', bg: 'bg-amber-50', href: '/admin/surveys' },
    { label: 'Alumni Registered This Year', value: stats?.registeredThisYear != null ? stats.registeredThisYear.toLocaleString() : '—', icon: UserPlusIcon, color: 'text-cyan-600', bg: 'bg-cyan-50', href: '/admin/alumni' },
    { label: 'Partner Companies', value: stats?.partnerCompanies != null ? stats.partnerCompanies.toLocaleString() : '—', icon: BuildingOfficeIcon, color: 'text-indigo-600', bg: 'bg-indigo-50', href: '/admin/companies' },
  ];

  const statusData = aggregateEmploymentStatus(charts?.statusDistribution || []);
  const alignmentData = (charts?.workAlignmentDistribution || []).map((d: any) => ({ label: d.label, value: d.count || 0 }));
  const topSkills = (charts?.skillsInDemand || []).slice(0, 5);

  const activeSurvey = surveys.find((s: any) => s.is_active);
  const surveyCompletion = activeSurvey && activeSurvey.targetCount > 0
    ? Math.round((activeSurvey.responseCount / activeSurvey.targetCount) * 100)
    : 0;

  const statsLoaded = !loading && Object.keys(stats).length > 0;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-5">
        <h1 className="text-base font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-xs text-gray-500 mt-0.5">Executive overview of alumni, employment, surveys, and system activity.</p>
      </div>

      {/* KPI Cards - Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {loading ? (
          [1, 2, 3, 4, 5, 6, 7, 8].map((i) => <SkeletonStatCard key={i} />)
        ) : kpis.map((stat) => (
          <Link key={stat.label} to={stat.href} className="bg-white border border-gray-200 rounded-lg px-4 py-3 hover:shadow-sm transition-shadow">
            <div className="flex items-start justify-between gap-2">
              <div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center shrink-0`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              {statsLoaded && <span className="text-[10px] text-gray-400 mt-0.5">Live data</span>}
            </div>
            <p className={`text-lg font-bold ${stat.color} mt-2`}>{stat.value}</p>
            <p className="text-[11px] text-gray-500 mt-0.5">{stat.label}</p>
          </Link>
        ))}
      </div>

      {/* Quick Actions Carousel */}
      <QuickActionsCarousel />

      {/* Summary Widgets */}
      <div className="flex items-center gap-2 mt-6 mb-3">
        <div className="w-1 h-4 bg-orange-500 rounded-full" />
        <h2 className="text-xs font-bold text-gray-600 uppercase tracking-wider">Dashboard Summary</h2>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => <SkeletonCard key={i} className="h-44" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <SummaryCard title="Employment Status" icon={BriefcaseIcon} footer={{ label: 'View Career Analytics', to: '/admin/analytics' }}>
            <MiniDoughnut data={statusData} colors={STATUS_COLORS} />
          </SummaryCard>

          <SummaryCard title="Work Alignment" icon={ChartBarIcon} footer={{ label: 'View Curriculum Insights', to: '/admin/curriculum' }}>
            <MiniDoughnut data={alignmentData} colors={ALIGNMENT_COLORS} />
          </SummaryCard>

          <SummaryCard title="Survey Progress" icon={DocumentTextIcon} footer={{ label: 'Manage Surveys', to: '/admin/surveys' }}>
            {activeSurvey ? (
              <div>
                <p className="text-xs text-gray-700 mb-2 font-medium line-clamp-1">{activeSurvey.title}</p>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-gray-500">Responses</span>
                  <span className="font-medium text-gray-900">{activeSurvey.responseCount || 0} / {activeSurvey.targetCount || 1}</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
                  <div className="h-full bg-orange-500 rounded-full transition-all" style={{ width: `${Math.min(100, surveyCompletion)}%` }} />
                </div>
                <p className="text-xs text-gray-500">Completion: <span className="font-medium text-gray-900">{surveyCompletion}%</span></p>
              </div>
            ) : (
              <p className="text-xs text-gray-400 text-center py-6">No active Graduate Tracer Survey.</p>
            )}
          </SummaryCard>

          <SummaryCard title="Upcoming Events" icon={CalendarDaysIcon} footer={{ label: 'Manage Events', to: '/admin/events' }}>
            {events.length > 0 ? (
              <div className="space-y-2">
                {events.slice(0, 3).map((e: any) => (
                  <div key={e.id} className="flex items-start gap-2 text-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0 mt-1.5" />
                    <div>
                      <p className="text-gray-700 font-medium leading-tight">{e.title}</p>
                      <p className="text-gray-400 text-[11px] mt-0.5">{e.date}{e.time ? ` · ${e.time}` : ''}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 text-center py-6">No upcoming events.</p>
            )}
          </SummaryCard>

          <SummaryCard title="Recent Activity" icon={ClockIcon} footer={{ label: 'View All Activity', to: '/admin/activity' }}>
            {activities.length > 0 ? (
              <div className="space-y-2.5">
                {activities.slice(0, 5).map((a: any, i: number) => (
                  <div key={a.id ?? i} className="flex items-start gap-2 text-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0 mt-1.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-gray-700 leading-snug truncate">
                        {[a.user, a.action, a.target].filter(Boolean).join(' ')}
                      </p>
                      <p className="text-gray-400 text-[11px] mt-0.5">{timeAgo(a.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 text-center py-6">No recent activity.</p>
            )}
          </SummaryCard>

          <SummaryCard title="Top Skills Snapshot" icon={ChartBarIcon} footer={{ label: 'View Curriculum Insights', to: '/admin/curriculum' }}>
            {topSkills.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {topSkills.map((s: any) => (
                  <span key={s.name} className="px-2.5 py-1 bg-orange-50 text-orange-700 text-xs font-medium rounded-full">
                    {s.name}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 text-center py-6">No skills data available.</p>
            )}
          </SummaryCard>
        </div>
      )}
    </div>
  );
}
