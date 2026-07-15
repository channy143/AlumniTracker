import { useState, useEffect } from 'react';
import { adminApi, careerTrendsApi, feedApi } from '@/services/api';
import { Link } from 'react-router-dom';
import { SkeletonCard, SkeletonStatCard } from '@/components/ui/Skeleton';
import { BriefcaseIcon, AcademicCapIcon, UserGroupIcon, ChartBarIcon, BuildingOfficeIcon, CurrencyDollarIcon, DocumentTextIcon, SparklesIcon, MegaphoneIcon, CalendarDaysIcon } from '@heroicons/react/24/outline';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line } from 'recharts';

const COLORS = ['#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#6366f1'];
const STATUS_COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6'];

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>({});
  const [charts, setCharts] = useState<any>({});
  const [activities, setActivities] = useState<any[]>([]);
  const [surveys, setSurveys] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      adminApi.dashboardStats().then(setStats).catch(() => {}),
      adminApi.dashboardCharts().then(setCharts).catch(() => {}),
      feedApi.list().then((data: any) => {
        if (data) setActivities(data.slice(0, 5).map((a: any) => ({ text: `${a.author} posted "${a.title}"`, time: a.created_at })));
      }).catch(() => {}),
      adminApi.surveyList().then(setSurveys).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const statCards = [
    { label: 'Total Alumni', value: stats?.totalAlumni?.toLocaleString() || '0', icon: UserGroupIcon, color: 'text-orange-600', bg: 'bg-orange-50', href: '/admin/alumni' },
    { label: 'Employment Rate', value: stats?.employedPercentage ? `${stats.employedPercentage}%` : '0%', icon: BriefcaseIcon, color: 'text-emerald-600', bg: 'bg-emerald-50', href: '/admin/alumni' },
    { label: 'Unemployment Rate', value: stats?.unemployedPercentage ? `${stats.unemployedPercentage}%` : '0%', icon: ChartBarIcon, color: 'text-red-600', bg: 'bg-red-50', href: '/admin/alumni' },
    { label: 'Survey Completion', value: surveys.length > 0 ? `${Math.round(((surveys.find((s) => s.is_active)?.response_count || 0) / Math.max(surveys.find((s) => s.is_active)?.target_count || 1, 1)) * 100)}%` : '0%', icon: DocumentTextIcon, color: 'text-purple-600', bg: 'bg-purple-50', href: '/admin/surveys' },
    { label: 'Alumni Tracked This Year', value: stats?.registeredThisYear?.toLocaleString() || '0', icon: UserGroupIcon, color: 'text-blue-600', bg: 'bg-blue-50', href: '/admin/alumni' },
    { label: 'Average Salary', value: stats?.averageSalary ? `₱${Number(stats.averageSalary).toLocaleString()}` : '—', icon: CurrencyDollarIcon, color: 'text-green-600', bg: 'bg-green-50', href: '/admin/analytics' },
    { label: 'Active Opportunities', value: stats?.activeJobs?.toLocaleString() || '0', icon: BriefcaseIcon, color: 'text-amber-600', bg: 'bg-amber-50', href: '/admin/jobs' },
    { label: 'Partner Employers', value: stats?.companiesConnected?.toLocaleString() || '0', icon: BuildingOfficeIcon, color: 'text-indigo-600', bg: 'bg-indigo-50', href: '/admin/employers' },
  ];

  const statusData = charts?.statusDistribution || [];
  const courseData = charts?.alumniByCourse || [];
  const topJobs = charts?.topJobPositions || [];
  const topEmployers = charts?.topHiringCompanies || [];
  const industryData = charts?.industryDistribution || [];
  const salaryData = charts?.salaryDistribution || [];
  const batchData = charts?.batchEmploymentData || [];
  const skillsData = charts?.skillsInDemand || [];
  const geoData = charts?.geographicDistribution || [];

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="mb-4"><div className="h-5 w-36 bg-gray-200 animate-pulse rounded mb-1" /><div className="h-3 w-48 bg-gray-200 animate-pulse rounded" /></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => <SkeletonStatCard key={i} className="h-20" />)}
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
      <div className="mb-4">
        <h1 className="text-base font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-xs text-gray-500">Alumni tracking overview and key metrics.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {statCards.map((stat) => (
          <Link key={stat.label} to={stat.href} className={`bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-center gap-3 hover:shadow-sm transition-shadow`}>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-3">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Employment Status</h2>
            {statusData.length > 0 ? (
              <div className="flex items-center gap-6">
                <div className="h-44 w-44 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={statusData} dataKey="count" nameKey="status" cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2}>
                        {statusData.map((_: any, i: number) => <Cell key={i} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-1.5">
                  {statusData.map((d: any, i: number) => (
                    <div key={d.status} className="flex items-center gap-2 text-xs">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: STATUS_COLORS[i % STATUS_COLORS.length] }} />
                      <span className="text-gray-700 w-28">{d.status}</span>
                      <span className="font-medium text-gray-900">{d.count || 0}</span>
                      <span className="text-gray-400">{d.percentage || 0}%</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : <p className="text-xs text-gray-400 text-center py-8">No employment data yet.</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Alumni by Course</h2>
              {courseData.length > 0 ? (
                <div className="space-y-2">
                  {courseData.slice(0, 6).map((c: any) => (
                    <div key={c.course || c.name}>
                      <div className="flex items-center justify-between text-xs mb-0.5">
                        <span className="text-gray-700">{c.course || c.name}</span>
                        <span className="text-gray-500">{c.count || c.value}</span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-orange-500 rounded-full" style={{ width: `${Math.min(100, ((c.count || c.value) / Math.max(...courseData.map((x: any) => x.count || x.value), 1)) * 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="text-xs text-gray-400 text-center py-4">No course data yet.</p>}
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Top Job Positions</h2>
              {topJobs.length > 0 ? (
                <div className="space-y-2">
                  {topJobs.slice(0, 6).map((j: any, i: number) => (
                    <div key={j.position || i} className="flex items-center gap-2 text-xs">
                      <span className="w-5 h-5 rounded bg-orange-100 flex items-center justify-center text-[10px] font-bold text-orange-600 shrink-0">{i + 1}</span>
                      <span className="flex-1 text-gray-700">{j.position || j.name}</span>
                      <span className="text-gray-500">{j.count || j.value}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-xs text-gray-400 text-center py-4">No job position data yet.</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Top Employers</h2>
              {topEmployers.length > 0 ? (
                <div className="space-y-2">
                  {topEmployers.slice(0, 6).map((e: any, i: number) => (
                    <div key={e.company || i} className="flex items-center gap-2 text-xs">
                      <span className="w-5 h-5 rounded bg-emerald-100 flex items-center justify-center text-[10px] font-bold text-emerald-600 shrink-0">{i + 1}</span>
                      <span className="flex-1 text-gray-700">{e.company || e.name}</span>
                      <span className="text-gray-500">{e.count || e.value}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-xs text-gray-400 text-center py-4">No employer data yet.</p>}
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Industry Distribution</h2>
              {industryData.length > 0 ? (
                <div className="space-y-2">
                  {industryData.slice(0, 6).map((ind: any, i: number) => (
                    <div key={ind.industry || i}>
                      <div className="flex items-center justify-between text-xs mb-0.5">
                        <span className="text-gray-700">{ind.industry || ind.name}</span>
                        <span className="text-gray-500">{ind.percentage || Math.round((ind.count || ind.value || 0) / Math.max(...industryData.map((x: any) => x.count || x.value), 1) * 100)}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${ind.percentage || Math.round((ind.count || ind.value || 0) / Math.max(...industryData.map((x: any) => x.count || x.value), 1) * 100)}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="text-xs text-gray-400 text-center py-4">No industry data yet.</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Salary Distribution</h2>
              {salaryData.length > 0 ? (
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={salaryData}>
                      <XAxis dataKey="range || name" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Bar dataKey="count || value" fill="#f97316" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : <p className="text-xs text-gray-400 text-center py-8">No salary data yet.</p>}
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Employment by Graduation Year</h2>
              {batchData.length > 0 ? (
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={batchData}>
                      <XAxis dataKey="year || name" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} />
                      <Tooltip formatter={(v: number) => [`${Math.round(v)}%`, 'Employment Rate']} />
                      <Line type="monotone" dataKey="rate || value" stroke="#f97316" strokeWidth={2} dot={{ r: 3, fill: '#f97316' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : <p className="text-xs text-gray-400 text-center py-8">No batch data yet.</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Skills in Demand</h2>
              {skillsData.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {skillsData.slice(0, 10).map((s: any) => (
                    <span key={s.name || s.skill} className="px-2 py-1 bg-orange-50 text-orange-700 text-[10px] font-medium rounded-full">
                      {s.name || s.skill}
                    </span>
                  ))}
                </div>
              ) : <p className="text-xs text-gray-400 text-center py-4">No skills data yet.</p>}
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Geographic Distribution</h2>
              {geoData.length > 0 ? (
                <div className="space-y-2">
                  {geoData.slice(0, 5).map((g: any) => (
                    <div key={g.location || g.name}>
                      <div className="flex items-center justify-between text-xs mb-0.5">
                        <span className="text-gray-700">{g.location || g.name}</span>
                        <span className="text-gray-500">{g.count || g.value}</span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${Math.min(100, ((g.count || g.value) / Math.max(...geoData.map((x: any) => x.count || x.value), 1)) * 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="text-xs text-gray-400 text-center py-4">No location data yet.</p>}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="bg-white border border-gray-200 rounded-lg p-3">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <SparklesIcon className="w-4 h-4 text-orange-500" />
              Recent Activity
            </h3>
            <div className="space-y-2">
              {activities.length > 0 ? activities.slice(0, 4).map((a, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-1.5 shrink-0" />
                  <div>
                    <p className="text-gray-700">{a.text}</p>
                    <p className="text-gray-400 text-[10px]">{a.time ? new Date(a.time).toLocaleDateString() : ''}</p>
                  </div>
                </div>
              )) : <p className="text-xs text-gray-400 text-center py-4">No recent activity.</p>}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-3">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <DocumentTextIcon className="w-4 h-4 text-orange-500" />
              Survey Progress
            </h3>
            {surveys.find((s) => s.is_active) ? (
              <div>
                <p className="text-xs text-gray-700 mb-1">{surveys.find((s) => s.is_active)?.title}</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-orange-500 rounded-full" style={{ width: `${Math.min(100, Math.round(((surveys.find((s) => s.is_active)?.response_count || 0) / Math.max(surveys.find((s) => s.is_active)?.target_count || 1, 1)) * 100))}%` }} />
                  </div>
                  <span className="text-xs text-gray-500">{Math.round(((surveys.find((s) => s.is_active)?.response_count || 0) / Math.max(surveys.find((s) => s.is_active)?.target_count || 1, 1)) * 100)}%</span>
                </div>
              </div>
            ) : <p className="text-xs text-gray-400 text-center py-4">No active survey.</p>}
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-3">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <CalendarDaysIcon className="w-4 h-4 text-orange-500" />
              Upcoming Events
            </h3>
            <p className="text-xs text-gray-400 text-center py-4">No upcoming events for now.</p>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-3">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <MegaphoneIcon className="w-4 h-4 text-orange-500" />
              Quick Actions
            </h3>
            <div className="space-y-1.5">
              <Link to="/admin/announcements" className="block text-xs text-orange-600 hover:text-orange-700 py-1">Create Announcement</Link>
              <Link to="/admin/events" className="block text-xs text-orange-600 hover:text-orange-700 py-1">Add Event</Link>
              <Link to="/admin/reports" className="block text-xs text-orange-600 hover:text-orange-700 py-1">Export Report</Link>
              <Link to="/admin/analytics" className="block text-xs text-orange-600 hover:text-orange-700 py-1">View Career Analytics</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
