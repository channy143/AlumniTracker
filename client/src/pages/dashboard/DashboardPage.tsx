import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserGroupIcon, BriefcaseIcon, ChartBarIcon, HandRaisedIcon,
  AcademicCapIcon, StarIcon, ArrowRightIcon, CalendarDaysIcon,
  BellAlertIcon, ChatBubbleLeftRightIcon, CurrencyDollarIcon,
  ClockIcon, BuildingOfficeIcon,
} from '@heroicons/react/24/outline';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, Legend,
} from 'recharts';
import { analyticsApi, jobsApi, employmentApi, profileApi, networkingApi, messagesApi, referralsApi } from '@/services/api';

const COLORS = ['#003366', '#D4AF37', '#38B2AC', '#2D3748', '#718096', '#E53E3E', '#DD6B20', '#805AD5'];

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [overview, setOverview] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [salaryStats, setSalaryStats] = useState<any>(null);
  const [userStats, setUserStats] = useState<any>(null);
  const [recentJobs, setRecentJobs] = useState<any[]>([]);
  const [employmentRecords, setEmploymentRecords] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingReferrals, setPendingReferrals] = useState(0);
  const [greeting, setGreeting] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const h = new Date().getHours();
    if (h < 12) setGreeting('Good morning');
    else if (h < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const results = await Promise.allSettled([
          analyticsApi.overview(),
          analyticsApi.statistics(),
          analyticsApi.salaryStatistics(),
          analyticsApi.userCareerStats(),
          jobsApi.list(),
          employmentApi.list(),
          profileApi.get(),
          networkingApi.stats(),
          messagesApi.unreadCount(),
          referralsApi.count(),
        ]);

        if (results[0].status === 'fulfilled') setOverview(results[0].value);
        if (results[1].status === 'fulfilled') setStats(results[1].value);
        if (results[2].status === 'fulfilled') setSalaryStats(results[2].value);
        if (results[3].status === 'fulfilled') setUserStats(results[3].value);
        if (results[4].status === 'fulfilled') setRecentJobs(results[4].value.slice(0, 3));
        if (results[5].status === 'fulfilled') setEmploymentRecords(results[5].value);
        if (results[6].status === 'fulfilled') setProfile(results[6].value);
        if (results[7].status === 'fulfilled') setStats((prev: any) => ({ ...prev, ...results[7].value }));
        if (results[8].status === 'fulfilled') setUnreadCount(results[8].value.count);
        if (results[9].status === 'fulfilled') setPendingReferrals(results[9].value.count);
      } catch {
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const profileStrength = (() => {
    if (!profile) return 0;
    let s = 0;
    if (profile.first_name && profile.last_name) s += 20;
    if (profile.phone) s += 15;
    if (profile.city) s += 10;
    if (profile.bio && profile.bio.length > 20) s += 20;
    if (profile.education?.length) s += 15;
    if (profile.skills?.length) s += 20;
    return s;
  })();

  const currentPosition = employmentRecords.find((r: any) => r.is_current);

  if (loading) {
    return (
      <div className="space-y-6">
        <div><h1 className="section-title">Dashboard</h1><p className="text-gray-500 mt-1">Computing your career analytics...</p></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => <div key={i} className="card animate-pulse"><div className="h-24 bg-gray-100 rounded" /></div>)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div><h1 className="section-title">Dashboard</h1></div>
        <div className="card text-center py-12"><p className="text-red-600">{error}</p>
          <button onClick={() => window.location.reload()} className="btn-primary mt-4">Retry</button>
        </div>
      </div>
    );
  }

  const statusPie = stats?.employment?.statusDistribution || [];
  const salaryPercentiles = salaryStats?.overall ? [
    { name: 'P10', value: salaryStats.overall.percentile10 },
    { name: 'P25', value: salaryStats.overall.percentile25 },
    { name: 'Median', value: salaryStats.overall.median },
    { name: 'P75', value: salaryStats.overall.percentile75 },
    { name: 'P90', value: salaryStats.overall.percentile90 },
  ] : [];

  const statCards = [
    { name: 'Alumni Network', value: overview?.totalAlumni?.toLocaleString() || '---', icon: UserGroupIcon, change: 'Registered alumni', color: 'from-blue-600 to-blue-400' },
    { name: 'Employment Rate', value: stats ? `${stats.employment.employmentRate}%` : '---', icon: BriefcaseIcon, change: `${stats?.employment?.totalEmployed || 0} currently employed`, color: 'from-teal-500 to-teal-400' },
    { name: 'Mean Salary', value: salaryStats?.overall?.mean ? `₱${Math.round(salaryStats.overall.mean / 1000)}k` : '---', icon: CurrencyDollarIcon, change: salaryStats ? `n=${salaryStats.overall.sampleSize}` : '', color: 'from-amber-500 to-amber-400' },
    { name: 'Your Position', value: currentPosition?.position || userStats?.career?.currentPosition || 'Pending', icon: AcademicCapIcon, change: currentPosition ? `at ${currentPosition.company_name}` : userStats?.career?.currentCompany || 'Update Employment', color: 'from-purple-500 to-purple-400' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="section-title">{greeting}{profile ? `, ${profile.first_name}` : ''}</h1>
          <p className="text-gray-500 mt-1">CTU-Naga Alumni Network — Career Analytics & Professional Networking</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-sm text-gray-500">
          <CalendarDaysIcon className="w-4 h-4" />
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <div key={stat.name} className="card group hover:shadow-lg transition-all duration-300 overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br opacity-5 rounded-bl-full group-hover:opacity-10 transition-opacity" />
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${stat.color} bg-opacity-10 flex items-center justify-center shadow-sm`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-ctu-charcoal">{stat.value}</h3>
            <p className="text-sm text-gray-500 mt-1">{stat.name}</p>
            <div className="flex items-center gap-1 mt-2">
              <span className="text-xs text-ctu-teal font-medium">{stat.change}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-ctu-charcoal flex items-center gap-2">
                <BellAlertIcon className="w-5 h-5 text-ctu-blue" />
                Career Hub
              </h2>
              <div className="flex items-center gap-3">
                {pendingReferrals > 0 && <span className="text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded-full font-medium">{pendingReferrals} referral{pendingReferrals > 1 ? 's' : ''} pending</span>}
                {unreadCount > 0 && <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full font-medium">{unreadCount} unread</span>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => navigate('/jobs')} className="p-4 rounded-xl border border-gray-100 hover:border-ctu-blue hover:bg-blue-50/30 transition-all text-left">
                <BriefcaseIcon className="w-5 h-5 text-ctu-blue mb-2" />
                <p className="text-sm font-semibold text-ctu-charcoal">Browse Opportunities</p>
                <p className="text-xs text-gray-400 mt-1">{recentJobs.length} new openings</p>
              </button>
              <button onClick={() => navigate('/mentorship')} className="p-4 rounded-xl border border-gray-100 hover:border-ctu-teal hover:bg-teal-50/30 transition-all text-left">
                <HandRaisedIcon className="w-5 h-5 text-ctu-teal mb-2" />
                <p className="text-sm font-semibold text-ctu-charcoal">Find a Mentor</p>
                <p className="text-xs text-gray-400 mt-1">Get career guidance</p>
              </button>
              <button onClick={() => navigate('/analytics')} className="p-4 rounded-xl border border-gray-100 hover:border-ctu-gold hover:bg-amber-50/30 transition-all text-left">
                <ChartBarIcon className="w-5 h-5 text-ctu-gold mb-2" />
                <p className="text-sm font-semibold text-ctu-charcoal">Career Analytics</p>
                <p className="text-xs text-gray-400 mt-1">Data-driven insights</p>
              </button>
              <button onClick={() => navigate('/employment')} className="p-4 rounded-xl border border-gray-100 hover:border-purple-200 hover:bg-purple-50/30 transition-all text-left">
                <BuildingOfficeIcon className="w-5 h-5 text-purple-500 mb-2" />
                <p className="text-sm font-semibold text-ctu-charcoal">Update Career</p>
                <p className="text-xs text-gray-400 mt-1">Keep your profile current</p>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {stats?.employment?.statusDistribution && (
              <div className="card">
                <h2 className="text-sm font-semibold text-ctu-charcoal mb-3 flex items-center gap-2">
                  <ChartBarIcon className="w-4 h-4 text-ctu-blue" />
                  Employment Distribution
                </h2>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={statusPie} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="count" nameKey="status">
                        {statusPie.map((_: any, i: number) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number, name: string) => [`${value} alumni`, name]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-3 text-[10px] text-gray-500 mt-1">
                  {statusPie.map((s: any, i: number) => (
                    <span key={i} className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      {s.status} {s.percentage}%
                    </span>
                  ))}
                </div>
              </div>
            )}

            {salaryPercentiles.length > 0 && (
              <div className="card">
                <h2 className="text-sm font-semibold text-ctu-charcoal mb-3 flex items-center gap-2">
                  <CurrencyDollarIcon className="w-4 h-4 text-ctu-gold" />
                  Salary Distribution
                </h2>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={salaryPercentiles}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(value: number) => [`₱${Math.round(value).toLocaleString()}`, '']} />
                      <Bar dataKey="value" fill="#D4AF37" radius={[4, 4, 0, 0]}>
                        {salaryPercentiles.map((_: any, i: number) => (
                          <Cell key={i} fill={['#003366', '#2D3748', '#D4AF37', '#2D3748', '#003366'][i]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-ctu-charcoal flex items-center gap-2">
                <BriefcaseIcon className="w-5 h-5 text-ctu-teal" />
                Recent Opportunities
              </h2>
              <button onClick={() => navigate('/jobs')} className="text-sm text-ctu-blue font-medium hover:underline flex items-center gap-1">
                View all <ArrowRightIcon className="w-3 h-3" />
              </button>
            </div>
            {recentJobs.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-3">
                  <BriefcaseIcon className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-gray-400 text-sm">No opportunities yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentJobs.map((job) => (
                  <div key={job.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => navigate('/jobs')}>
                    <div className="w-10 h-10 rounded-lg bg-ctu-blue/10 flex items-center justify-center text-ctu-blue font-bold shrink-0">
                      {(job.company_name || '?').charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ctu-charcoal truncate">{job.position}</p>
                      <p className="text-xs text-gray-500">{job.company_name} &middot; {job.location || 'N/A'}</p>
                    </div>
                    <span className="text-xs text-gray-400 shrink-0">{job.job_type}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="card">
            <h2 className="text-lg font-semibold text-ctu-charcoal mb-4 flex items-center gap-2">
              <StarIcon className="w-5 h-5 text-ctu-gold" />
              Profile Completion
            </h2>
            <div className="text-center">
              <div className="relative w-24 h-24 mx-auto">
                <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="8" />
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#38B2AC" strokeWidth="8"
                    strokeDasharray={`${2 * Math.PI * 40}`}
                    strokeDashoffset={`${2 * Math.PI * 40 * (1 - profileStrength / 100)}`}
                    strokeLinecap="round" className="transition-all duration-1000" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold text-ctu-teal">{profileStrength}%</span>
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-3">
                {profileStrength < 40 ? 'Start building your profile' : profileStrength < 70 ? 'Keep going! Almost there' : 'Great profile! Ready to network'}
              </p>
              <button onClick={() => navigate('/profile')} className="btn-primary text-sm w-full mt-4">
                {profileStrength < 100 ? 'Complete Your Profile' : 'View Profile'}
              </button>
            </div>
            <div className="mt-4 space-y-2 text-sm">
              {[
                { label: 'Basic Info', done: profile?.first_name && profile?.last_name },
                { label: 'Contact Details', done: profile?.phone },
                { label: 'Bio/About', done: profile?.bio && profile.bio.length > 20 },
                { label: 'Education', done: profile?.education?.length },
                { label: 'Skills', done: profile?.skills?.length },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="text-gray-500">{item.label}</span>
                  {item.done ? <span className="text-green-600 text-xs">&#10003;</span> : <span className="text-gray-300 text-xs">&#9675;</span>}
                </div>
              ))}
            </div>
          </div>

          {userStats?.career && (
            <div className="card">
              <h2 className="text-sm font-semibold text-ctu-charcoal mb-3 flex items-center gap-2">
                <ClockIcon className="w-4 h-4 text-ctu-gold" />
                Your Career Math
              </h2>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between py-1.5 border-b border-gray-50">
                  <span className="text-gray-500">Total Experience</span>
                  <span className="font-semibold text-ctu-charcoal">{userStats.career.totalExperienceYears} years</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-gray-50">
                  <span className="text-gray-500">Jobs Held</span>
                  <span className="font-semibold text-ctu-charcoal">{userStats.career.totalJobs}</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-gray-50">
                  <span className="text-gray-500">Avg Job Tenure</span>
                  <span className="font-semibold text-ctu-charcoal">{userStats.career.jobTenureMean} months</span>
                </div>
                {userStats.career.yearsSinceGraduation > 0 && (
                  <div className="flex items-center justify-between py-1.5 border-b border-gray-50">
                    <span className="text-gray-500">Since Graduation</span>
                    <span className="font-semibold text-ctu-charcoal">{userStats.career.yearsSinceGraduation} years</span>
                  </div>
                )}
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-gray-500">Network Size</span>
                  <span className="font-semibold text-ctu-charcoal">{userStats.network.connections} connections</span>
                </div>
              </div>
            </div>
          )}

          {stats?.timeToEmployment?.mean > 0 && (
            <div className="card">
              <h2 className="text-sm font-semibold text-ctu-charcoal mb-3 flex items-center gap-2">
                <ChartBarIcon className="w-4 h-4 text-ctu-teal" />
                Time-to-Employment Stats
              </h2>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between py-1">
                  <span className="text-gray-500">Mean</span>
                  <span className="font-semibold text-ctu-charcoal">{stats.timeToEmployment.mean} months</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-gray-500">Median</span>
                  <span className="font-semibold text-ctu-charcoal">{stats.timeToEmployment.median} months</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-gray-500">Std Deviation</span>
                  <span className="font-semibold text-ctu-charcoal">&sigma; = {stats.timeToEmployment.stdDev}</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-gray-500">Range</span>
                  <span className="font-semibold text-ctu-charcoal">{stats.timeToEmployment.min} &ndash; {stats.timeToEmployment.max} mo</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-gray-500">Sample (n)</span>
                  <span className="font-semibold text-ctu-charcoal">{stats.timeToEmployment.sampleSize}</span>
                </div>
                {stats.timeToEmployment.skewness !== 0 && (
                  <div className="flex items-center justify-between py-1">
                    <span className="text-gray-500">Skewness</span>
                    <span className="font-semibold text-ctu-charcoal">{stats.timeToEmployment.skewness}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="card">
            <h2 className="text-sm font-semibold text-ctu-charcoal mb-3">Quick Actions</h2>
            <div className="space-y-2">
              <button onClick={() => navigate('/employment')} className="btn-primary w-full text-left flex items-center gap-2 text-sm">
                <BriefcaseIcon className="w-4 h-4" /> Update Career
              </button>
              <button onClick={() => navigate('/mentorship')} className="btn-secondary w-full text-left flex items-center gap-2 text-sm">
                <HandRaisedIcon className="w-4 h-4" /> Find a Mentor
              </button>
              <button onClick={() => navigate('/jobs')} className="btn-secondary w-full text-left flex items-center gap-2 text-sm">
                <ChartBarIcon className="w-4 h-4" /> Browse Opportunities
              </button>
              <button onClick={() => navigate('/community')} className="btn-secondary w-full text-left flex items-center gap-2 text-sm">
                <UserGroupIcon className="w-4 h-4" /> Network
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
