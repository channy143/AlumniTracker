import { useState, useEffect } from 'react';
import { adminApi } from '@/services/api';
import { Link } from 'react-router-dom';

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState<any>(null);
  const [charts, setCharts] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsData, chartsData] = await Promise.all([
        adminApi.dashboardStats(),
        adminApi.dashboardCharts(),
      ]);
      setStats(statsData);
      setCharts(chartsData);
    } catch {
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="section-title">Admin Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => <div key={i} className="card animate-pulse h-24" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="section-title">Admin Dashboard</h1>
        <div className="card text-center py-12">
          <p className="text-red-600">{error}</p>
          <button onClick={loadData} className="btn-primary mt-4">Retry</button>
        </div>
      </div>
    );
  }

  const statCards = [
    { label: 'Total Alumni', value: stats?.totalAlumni?.toLocaleString() || '0', color: 'text-ctu-blue', bg: 'bg-blue-50', href: '/admin/alumni' },
    { label: 'Active Alumni', value: stats?.activeAlumni?.toLocaleString() || '0', color: 'text-green-600', bg: 'bg-green-50', href: '/admin/alumni' },
    { label: 'Verified Alumni', value: stats?.verifiedAlumni?.toLocaleString() || '0', color: 'text-purple-600', bg: 'bg-purple-50', href: '/admin/alumni' },
    { label: 'Companies Connected', value: stats?.companiesConnected?.toLocaleString() || '0', color: 'text-teal-600', bg: 'bg-teal-50', href: '/admin/employers' },
    { label: 'Available for Referral', value: stats?.alumniAvailableForReferral?.toLocaleString() || '0', color: 'text-amber-600', bg: 'bg-amber-50', href: '/admin/alumni' },
    { label: 'Pending Referrals', value: stats?.pendingReferralRequests?.toLocaleString() || '0', color: 'text-orange-600', bg: 'bg-orange-50', href: '/admin/jobs' },
    { label: 'Active Job Listings', value: stats?.activeJobs?.toLocaleString() || '0', color: 'text-indigo-600', bg: 'bg-indigo-50', href: '/admin/jobs' },
    { label: 'Network Connections', value: stats?.alumniNetworkConnections?.toLocaleString() || '0', color: 'text-pink-600', bg: 'bg-pink-50', href: '/admin/analytics' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="section-title">Admin Dashboard</h1>
        <p className="text-gray-500 mt-1">Career Analytics & Alumni Networking Platform</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Link key={stat.label} to={stat.href} className={`card ${stat.bg} hover:shadow-md transition-shadow`}>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-sm text-gray-600 mt-1">{stat.label}</p>
          </Link>
        ))}
      </div>

      {charts && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h2 className="text-lg font-semibold text-ctu-charcoal mb-4">Employment Rate</h2>
            <div className="flex items-center gap-4">
              <div className="relative w-32 h-32">
                <svg className="w-32 h-32 -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="#003366" strokeWidth="3"
                    strokeDasharray={`${charts.employmentRate} ${100 - charts.employmentRate}`}
                    strokeLinecap="round" />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-ctu-blue">
                  {charts.employmentRate}%
                </span>
              </div>
              <div className="space-y-2 text-sm text-gray-600">
                <p>Employed: {stats?.employedAlumni?.toLocaleString() || 0}</p>
                <p>Self-employed: {charts.selfEmployedRate}%</p>
                <p>Total: {stats?.totalAlumni?.toLocaleString() || 0}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold text-ctu-charcoal mb-4">Top Industries</h2>
            <div className="space-y-2">
              {(charts.industryDistribution || []).slice(0, 6).map((item: any, i: number) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 w-32 truncate">{item.industry}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div className="bg-ctu-blue rounded-full h-2 transition-all"
                      style={{ width: `${Math.min(100, (item.count / Math.max(...(charts.industryDistribution || []).map((x: any) => x.count), 1)) * 100)}%` }} />
                  </div>
                  <span className="text-xs text-gray-500 w-8 text-right">{item.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold text-ctu-charcoal mb-4">Alumni by Course</h2>
            <div className="space-y-2">
              {(charts.alumniByCourse || []).slice(0, 8).map((item: any, i: number) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 w-24 truncate">{item.course}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div className="bg-ctu-marigold rounded-full h-2 transition-all"
                      style={{ width: `${Math.min(100, (item.count / Math.max(...(charts.alumniByCourse || []).map((x: any) => x.count), 1)) * 100)}%` }} />
                  </div>
                  <span className="text-xs text-gray-500 w-8 text-right">{item.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold text-ctu-charcoal mb-4">Top Hiring Companies</h2>
            <div className="space-y-2">
              {(charts.topHiringCompanies || []).slice(0, 6).map((item: any, i: number) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 w-36 truncate">{item.company}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div className="bg-green-500 rounded-full h-2 transition-all"
                      style={{ width: `${Math.min(100, (item.count / Math.max(...(charts.topHiringCompanies || []).map((x: any) => x.count), 1)) * 100)}%` }} />
                  </div>
                  <span className="text-xs text-gray-500 w-8 text-right">{item.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold text-ctu-charcoal mb-4">Networking Growth</h2>
            <div className="space-y-2">
              {(charts.monthlyConnections || []).slice(-6).map((item: any, i: number) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 w-16 truncate">{item.month?.slice(5) || item.month}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div className="bg-pink-500 rounded-full h-2 transition-all"
                      style={{ width: `${Math.min(100, (item.count / Math.max(...(charts.monthlyConnections || []).map((x: any) => x.count), 1)) * 100)}%` }} />
                  </div>
                  <span className="text-xs text-gray-500 w-8 text-right">{item.count}</span>
                </div>
              ))}
              {(!charts.monthlyConnections || charts.monthlyConnections.length === 0) && (
                <p className="text-sm text-gray-400 text-center py-4">No connection data yet</p>
              )}
            </div>
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold text-ctu-charcoal mb-4">Referral Activity</h2>
            <div className="space-y-2">
              {(charts.monthlyReferrals || []).slice(-6).map((item: any, i: number) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 w-16 truncate">{item.month?.slice(5) || item.month}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div className="bg-amber-500 rounded-full h-2 transition-all"
                      style={{ width: `${Math.min(100, (item.count / Math.max(...(charts.monthlyReferrals || []).map((x: any) => x.count), 1)) * 100)}%` }} />
                  </div>
                  <span className="text-xs text-gray-500 w-8 text-right">{item.count}</span>
                </div>
              ))}
              {(!charts.monthlyReferrals || charts.monthlyReferrals.length === 0) && (
                <p className="text-sm text-gray-400 text-center py-4">No referral activity yet</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
