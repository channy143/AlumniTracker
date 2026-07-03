import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserGroupIcon,
  BriefcaseIcon,
  ChartBarIcon,
  HandRaisedIcon,
  AcademicCapIcon,
  StarIcon,
  ArrowRightIcon,
  CalendarDaysIcon,
  BellAlertIcon,
} from '@heroicons/react/24/outline';
import { analyticsApi, communityApi, jobsApi, employmentApi, profileApi } from '@/services/api';

interface Activity {
  id: string;
  type: 'job' | 'mentorship' | 'event' | 'survey';
  message: string;
  time: string;
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [overview, setOverview] = useState<{ totalAlumni: number; employedPercentage: number; topIndustries: { name: string; count: number }[] } | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [recentJobs, setRecentJobs] = useState<any[]>([]);
  const [employmentRecords, setEmploymentRecords] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [greeting, setGreeting] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    setGreeting(() => {
      const h = new Date().getHours();
      if (h < 12) return 'Good morning';
      if (h < 18) return 'Good afternoon';
      return 'Good evening';
    });
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [overviewData, jobsData, groupsData, employmentData, profileData] = await Promise.allSettled([
          analyticsApi.overview(),
          jobsApi.list(),
          communityApi.groups(),
          employmentApi.list(),
          profileApi.get(),
        ]);

        if (overviewData.status === 'fulfilled') setOverview(overviewData.value);

        if (profileData.status === 'fulfilled') setProfile(profileData.value);

        if (employmentData.status === 'fulfilled') {
          setEmploymentRecords(employmentData.value);
        }

        const acts: Activity[] = [];
        if (jobsData.status === 'fulfilled') {
          setRecentJobs(jobsData.value.slice(0, 3));
          jobsData.value.slice(0, 2).forEach((j: any) => {
            acts.push({ id: `job-${j.id}`, type: 'job', message: `New job posting: ${j.position} at ${j.company_name}`, time: 'Recently' });
          });
        }
        if (groupsData.status === 'fulfilled') {
          groupsData.value.slice(0, 2).forEach((g: any) => {
            acts.push({ id: `group-${g.id}`, type: 'event', message: `Community group: ${g.name}`, time: 'Active' });
          });
        }
        setActivities(acts);
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

  const stats = [
    { name: 'Alumni Network', value: overview ? `${overview.totalAlumni.toLocaleString()}+` : '---', icon: UserGroupIcon, change: 'Registered alumni', color: 'from-blue-600 to-blue-400' },
    { name: 'Employment Rate', value: overview ? `${overview.employedPercentage}%` : '---', icon: BriefcaseIcon, change: 'Of tracked alumni', color: 'from-teal-500 to-teal-400' },
    { name: 'Industries', value: overview ? `${overview.topIndustries.length}` : '---', icon: ChartBarIcon, change: 'Sectors represented', color: 'from-amber-500 to-amber-400' },
    { name: 'Your Position', value: currentPosition ? currentPosition.position : 'Pending', icon: AcademicCapIcon, change: currentPosition ? `at ${currentPosition.company_name}` : 'Update in Employment', color: 'from-purple-500 to-purple-400' },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div><h1 className="section-title">Dashboard</h1><p className="text-gray-500 mt-1">Loading your dashboard...</p></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card animate-pulse"><div className="h-24 bg-gray-100 rounded" /></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div><h1 className="section-title">Dashboard</h1></div>
        <div className="card text-center py-12">
          <p className="text-red-600">{error}</p>
          <button onClick={() => window.location.reload()} className="btn-primary mt-4">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="section-title">
            {greeting}{profile ? `, ${profile.first_name}` : ''} 👋
          </h1>
          <p className="text-gray-500 mt-1">CTU-Naga Alumni Tracker — Bridging Education to Eternity</p>
        </div>
        <div className="hidden sm:flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <CalendarDaysIcon className="w-4 h-4" />
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
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
                Recent Activity
              </h2>
              {activities.length > 0 && (
                <span className="text-xs text-gray-400">{activities.length} updates</span>
              )}
            </div>
            {activities.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-3">
                  <BellAlertIcon className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-gray-400 text-sm">No recent activity</p>
                <p className="text-xs text-gray-300 mt-1">Activity from jobs, groups, and events will appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activities.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className={`w-2 h-2 mt-2 rounded-full shrink-0 ${
                      activity.type === 'job' ? 'bg-ctu-blue' :
                      activity.type === 'mentorship' ? 'bg-ctu-teal' :
                      activity.type === 'event' ? 'bg-ctu-gold' : 'bg-gray-400'
                    }`} />
                    <div className="flex-1">
                      <p className="text-sm text-ctu-charcoal">{activity.message}</p>
                      <p className="text-xs text-gray-400 mt-1">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-ctu-charcoal flex items-center gap-2">
                <BriefcaseIcon className="w-5 h-5 text-ctu-teal" />
                Recent Job Postings
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
                <p className="text-gray-400 text-sm">No job postings yet</p>
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
                      <p className="text-xs text-gray-500">{job.company_name} · {job.location || 'N/A'}</p>
                    </div>
                    <span className="text-xs text-gray-400 shrink-0">{job.employment_type}</span>
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
                    strokeLinecap="round"
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold text-ctu-teal">{profileStrength}%</span>
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-3">
                {profileStrength < 40 ? 'Start building your profile' :
                 profileStrength < 70 ? 'Keep going! Almost there' :
                 'Great profile! Ready to connect'}
              </p>
              <button onClick={() => navigate('/profile')} className="btn-primary text-sm w-full mt-4">
                {profileStrength < 100 ? 'Complete Your Profile' : 'View Profile'}
              </button>
            </div>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Basic Info</span>
                {profile?.first_name && profile?.last_name ? <span className="text-green-600 text-xs">✓</span> : <span className="text-gray-300 text-xs">○</span>}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Contact Details</span>
                {profile?.phone ? <span className="text-green-600 text-xs">✓</span> : <span className="text-gray-300 text-xs">○</span>}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Bio/About</span>
                {profile?.bio && profile.bio.length > 20 ? <span className="text-green-600 text-xs">✓</span> : <span className="text-gray-300 text-xs">○</span>}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Education</span>
                {profile?.education?.length ? <span className="text-green-600 text-xs">✓</span> : <span className="text-gray-300 text-xs">○</span>}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Skills</span>
                {profile?.skills?.length ? <span className="text-green-600 text-xs">✓</span> : <span className="text-gray-300 text-xs">○</span>}
              </div>
            </div>
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold text-ctu-charcoal mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <button onClick={() => navigate('/employment')} className="btn-primary w-full text-left flex items-center gap-2">
                <BriefcaseIcon className="w-4 h-4" /> Update Employment
              </button>
              <button onClick={() => navigate('/mentorship')} className="btn-secondary w-full text-left flex items-center gap-2">
                <HandRaisedIcon className="w-4 h-4" /> Find a Mentor
              </button>
              <button onClick={() => navigate('/jobs')} className="btn-secondary w-full text-left flex items-center gap-2">
                <ChartBarIcon className="w-4 h-4" /> Browse Jobs
              </button>
              <button onClick={() => navigate('/community')} className="btn-secondary w-full text-left flex items-center gap-2">
                <UserGroupIcon className="w-4 h-4" /> Join Community
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
