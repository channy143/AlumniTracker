import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, Legend,
  ScatterChart, Scatter, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import { analyticsApi } from '@/services/api';
import {
  ChartBarIcon, BriefcaseIcon, CurrencyDollarIcon, ClockIcon,
  UserGroupIcon, AcademicCapIcon, BuildingOfficeIcon,
} from '@heroicons/react/24/outline';

const COLORS = ['#003366', '#D4AF37', '#38B2AC', '#2D3748', '#718096', '#E53E3E', '#DD6B20', '#805AD5', '#3182CE', '#319795'];
const COLORS_RANGE = ['#003366', '#1a4d7a', '#336699', '#4d80b3', '#6699cc', '#80b3e6', '#99ccff'];

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [overview, setOverview] = useState<any>(null);
  const [industries, setIndustries] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [salaryStats, setSalaryStats] = useState<any>(null);
  const [industryTrends, setIndustryTrends] = useState<any>(null);
  const [timeSeries, setTimeSeries] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const results = await Promise.allSettled([
          analyticsApi.overview(),
          analyticsApi.industryDistribution(),
          analyticsApi.statistics(),
          analyticsApi.salaryStatistics(),
          analyticsApi.industryTrends(),
          analyticsApi.employmentTimeSeries(),
        ]);
        if (results[0].status === 'fulfilled') setOverview(results[0].value);
        if (results[1].status === 'fulfilled') setIndustries(results[1].value);
        if (results[2].status === 'fulfilled') setStats(results[2].value);
        if (results[3].status === 'fulfilled') setSalaryStats(results[3].value);
        if (results[4].status === 'fulfilled') setIndustryTrends(results[4].value);
        if (results[5].status === 'fulfilled') setTimeSeries(results[5].value);
      } catch {
        setError('Failed to load analytics data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div><h1 className="section-title">Career Analytics</h1><p className="text-gray-500 mt-1">Computing statistical models...</p></div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="card animate-pulse h-64" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div><h1 className="section-title">Career Analytics</h1></div>
        <div className="card text-center py-12">
          <p className="text-red-600">{error}</p>
          <button onClick={() => window.location.reload()} className="btn-primary mt-4">Retry</button>
        </div>
      </div>
    );
  }

  const industryData = industries.length ? industries : [{ name: 'No Data', value: 1 }];
  const topIndustries = overview?.topIndustries || [];
  const statusPie = stats?.employment?.statusDistribution || [];
  const industryDist = stats?.industries?.distribution || [];

  const salaryIndustryData = salaryStats?.byIndustry || [];

  const timeSeriesMonthly = timeSeries?.monthly || [];
  const timeSeriesCumulative = timeSeries?.cumulative || [];

  const trends = industryTrends?.trends || [];

  const employmentRate = stats?.employment?.employmentRate || 0;
  const unemploymentRate = stats?.employment?.unemploymentRate || 0;
  const selfEmployRate = stats?.employment?.selfEmploymentRate || 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="section-title">Career Analytics</h1>
        <p className="text-gray-500 mt-1">Data-driven career insights with statistical analysis</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="card text-center py-4">
          <p className="text-2xl font-bold text-ctu-blue">{stats?.sampleSize || overview?.totalAlumni || 0}</p>
          <p className="text-[10px] text-gray-500 mt-0.5 uppercase tracking-wider">Total Alumni</p>
        </div>
        <div className="card text-center py-4">
          <p className="text-2xl font-bold text-teal-600">{employmentRate}%</p>
          <p className="text-[10px] text-gray-500 mt-0.5 uppercase tracking-wider">Employment Rate</p>
        </div>
        <div className="card text-center py-4">
          <p className="text-2xl font-bold text-amber-600">{selfEmployRate}%</p>
          <p className="text-[10px] text-gray-500 mt-0.5 uppercase tracking-wider">Self-Employed</p>
        </div>
        <div className="card text-center py-4">
          <p className="text-2xl font-bold text-red-600">{unemploymentRate}%</p>
          <p className="text-[10px] text-gray-500 mt-0.5 uppercase tracking-wider">Unemployment Rate</p>
        </div>
        <div className="card text-center py-4">
          <p className="text-2xl font-bold text-ctu-gold">{stats?.industries?.total || 0}</p>
          <p className="text-[10px] text-gray-500 mt-0.5 uppercase tracking-wider">Industries</p>
        </div>
        <div className="card text-center py-4">
          <p className="text-2xl font-bold text-purple-600">{stats?.networking?.totalConnections || 0}</p>
          <p className="text-[10px] text-gray-500 mt-0.5 uppercase tracking-wider">Connections</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <div className="card">
          <h3 className="text-base font-semibold text-ctu-charcoal mb-3 flex items-center gap-2">
            <ChartBarIcon className="w-4 h-4 text-ctu-blue" />
            Employment Status Distribution
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusPie} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={4} dataKey="count" nameKey="status" label={({ status, percent }) => `${status} ${(percent * 100).toFixed(1)}%`}>
                  {statusPie.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(value: number) => [`${value} alumni`, '']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-3 text-xs text-gray-500 mt-2">
            {statusPie.map((s: any, i: number) => (
              <span key={i} className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                {s.status} <strong>{s.count}</strong> ({s.percentage}%)
              </span>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 className="text-base font-semibold text-ctu-charcoal mb-3 flex items-center gap-2">
            <BuildingOfficeIcon className="w-4 h-4 text-ctu-gold" />
            Industry Distribution
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={industryDist.slice(0, 10)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value: number) => [`${value} alumni`, 'Count']} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {industryDist.slice(0, 10).map((_: any, i: number) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {salaryIndustryData.length > 0 && (
          <div className="card">
            <h3 className="text-base font-semibold text-ctu-charcoal mb-3 flex items-center gap-2">
              <CurrencyDollarIcon className="w-4 h-4 text-emerald-600" />
              Mean Salary by Industry
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salaryIndustryData.slice(0, 8)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="industry" width={100} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value: number) => [`₱${Math.round(value).toLocaleString()}`, 'Mean Salary']} />
                  <Bar dataKey="mean" radius={[0, 4, 4, 0]} fill="#38B2AC" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {salaryStats?.overall && (
          <div className="card">
            <h3 className="text-base font-semibold text-ctu-charcoal mb-3 flex items-center gap-2">
              <CurrencyDollarIcon className="w-4 h-4 text-ctu-gold" />
              Salary Percentile Distribution
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={[
                  { name: 'P10', value: salaryStats.overall.percentile10 },
                  { name: 'P25', value: salaryStats.overall.percentile25 },
                  { name: 'Median', value: salaryStats.overall.median },
                  { name: 'P75', value: salaryStats.overall.percentile75 },
                  { name: 'P90', value: salaryStats.overall.percentile90 },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value: number) => [`₱${Math.round(value).toLocaleString()}`, '']} />
                  <defs>
                    <linearGradient id="salaryGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#D4AF37" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="value" stroke="#D4AF37" fill="url(#salaryGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-3 gap-3 mt-2 text-xs">
              <div className="text-center"><span className="text-gray-400">Mean</span><p className="font-semibold text-ctu-charcoal">₱{Math.round(salaryStats.overall.mean).toLocaleString()}</p></div>
              <div className="text-center"><span className="text-gray-400">Median</span><p className="font-semibold text-ctu-charcoal">₱{Math.round(salaryStats.overall.median).toLocaleString()}</p></div>
              <div className="text-center"><span className="text-gray-400">&sigma;</span><p className="font-semibold text-ctu-charcoal">{Math.round(salaryStats.overall.stdDev).toLocaleString()}</p></div>
            </div>
          </div>
        )}

        {trends.length > 0 && (
          <div className="card">
            <h3 className="text-base font-semibold text-ctu-charcoal mb-3 flex items-center gap-2">
              <ChartBarIcon className="w-4 h-4 text-purple-600" />
              Industry Hiring Trends by Graduation Year
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  {industryTrends.industries.slice(0, 5).map((ind: string, i: number) => (
                    <Bar key={ind} dataKey={ind} stackId="a" fill={COLORS[i % COLORS.length]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {timeSeriesMonthly.length > 0 && (
          <div className="card">
            <h3 className="text-base font-semibold text-ctu-charcoal mb-3 flex items-center gap-2">
              <ClockIcon className="w-4 h-4 text-ctu-teal" />
              Employment Growth Over Time
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeSeriesCumulative}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="total" stroke="#003366" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {stats?.timeToEmployment && (
          <div className="card">
            <h3 className="text-base font-semibold text-ctu-charcoal mb-3 flex items-center gap-2">
              <ClockIcon className="w-4 h-4 text-amber-600" />
              Time to First Employment Statistics
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <p className="text-xs text-blue-600 font-medium uppercase tracking-wider">Mean</p>
                <p className="text-xl font-bold text-ctu-charcoal">{stats.timeToEmployment.mean}</p>
                <p className="text-[10px] text-gray-400">months</p>
              </div>
              <div className="bg-amber-50 rounded-lg p-3 text-center">
                <p className="text-xs text-amber-600 font-medium uppercase tracking-wider">Median</p>
                <p className="text-xl font-bold text-ctu-charcoal">{stats.timeToEmployment.median}</p>
                <p className="text-[10px] text-gray-400">months</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-3 text-center">
                <p className="text-xs text-purple-600 font-medium uppercase tracking-wider">Std Dev</p>
                <p className="text-xl font-bold text-ctu-charcoal">&sigma;={stats.timeToEmployment.stdDev}</p>
                <p className="text-[10px] text-gray-400">dispersion</p>
              </div>
              <div className="bg-teal-50 rounded-lg p-3 text-center">
                <p className="text-xs text-teal-600 font-medium uppercase tracking-wider">Range</p>
                <p className="text-xl font-bold text-ctu-charcoal">{stats.timeToEmployment.range}</p>
                <p className="text-[10px] text-gray-400">months</p>
              </div>
            </div>
            <div className="text-xs text-gray-400 space-y-1">
              <p>25th&ndash;75th percentile: {stats.timeToEmployment.percentile25}&ndash;{stats.timeToEmployment.percentile75} months</p>
              <p>Skewness: {stats.timeToEmployment.skewness} ({stats.timeToEmployment.skewness > 0.5 ? 'Right-skewed (most find jobs quickly, some take longer)' : stats.timeToEmployment.skewness < -0.5 ? 'Left-skewed' : 'Approximately symmetric'})</p>
              <p>Sample: n = {stats.timeToEmployment.sampleSize} alumni</p>
            </div>
          </div>
        )}

        {stats?.industries?.herfindahlIndex > 0 && (
          <div className="card">
            <h3 className="text-base font-semibold text-ctu-charcoal mb-3 flex items-center gap-2">
              <BuildingOfficeIcon className="w-4 h-4 text-indigo-600" />
              Industry Concentration Analysis
            </h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-center">
                <p className="text-xs text-gray-400 uppercase tracking-wider">Herfindahl Index</p>
                <p className="text-2xl font-bold text-ctu-charcoal">{stats.industries.herfindahlIndex}</p>
                <p className="text-[10px] text-gray-400">
                  {stats.industries.herfindahlIndex < 0.01 ? 'Highly diversified' :
                   stats.industries.herfindahlIndex < 0.05 ? 'Moderately diversified' :
                   stats.industries.herfindahlIndex < 0.1 ? 'Moderately concentrated' : 'Highly concentrated'}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-400 uppercase tracking-wider">Total Industries</p>
                <p className="text-2xl font-bold text-ctu-charcoal">{stats.industries.total}</p>
                <p className="text-[10px] text-gray-400">sectors represented</p>
              </div>
            </div>
            <div className="space-y-1.5">
              {industryDist.slice(0, 5).map((ind: any, i: number) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-gray-600 w-28 truncate">{ind.name}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                    <div className="h-1.5 rounded-full" style={{ width: `${ind.percentage}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                  </div>
                  <span className="text-gray-400 w-10 text-right">{ind.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {stats?.networking && (
          <div className="card">
            <h3 className="text-base font-semibold text-ctu-charcoal mb-3 flex items-center gap-2">
              <UserGroupIcon className="w-4 h-4 text-pink-600" />
              Network Growth Statistics
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 bg-pink-50 rounded-lg">
                <p className="text-xl font-bold text-pink-600">{stats.networking.totalConnections}</p>
                <p className="text-[10px] text-gray-500">Connections</p>
              </div>
              <div className="text-center p-3 bg-amber-50 rounded-lg">
                <p className="text-xl font-bold text-amber-600">{stats.networking.totalReferrals}</p>
                <p className="text-[10px] text-gray-500">Referrals</p>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <p className="text-xl font-bold text-blue-600">{stats.networking.connectionRate}%</p>
                <p className="text-[10px] text-gray-500">Connection Rate</p>
              </div>
            </div>
          </div>
        )}

        {stats?.growth && stats.growth.length > 0 && (
          <div className="card">
            <h3 className="text-base font-semibold text-ctu-charcoal mb-3 flex items-center gap-2">
              <UserGroupIcon className="w-4 h-4 text-ctu-blue" />
              Alumni Registration Growth
            </h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.growth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <defs>
                    <linearGradient id="regGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#003366" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#003366" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="count" stroke="#003366" fill="url(#regGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <h3 className="text-base font-semibold text-ctu-charcoal mb-3 flex items-center gap-2">
          <AcademicCapIcon className="w-4 h-4 text-ctu-gold" />
          Statistical Summary
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 font-medium text-gray-500">Metric</th>
                <th className="text-right py-2 px-3 font-medium text-gray-500">n</th>
                <th className="text-right py-2 px-3 font-medium text-gray-500">Mean</th>
                <th className="text-right py-2 px-3 font-medium text-gray-500">Median</th>
                <th className="text-right py-2 px-3 font-medium text-gray-500">Std Dev</th>
                <th className="text-right py-2 px-3 font-medium text-gray-500">Min</th>
                <th className="text-right py-2 px-3 font-medium text-gray-500">Max</th>
                <th className="text-right py-2 px-3 font-medium text-gray-500">P25</th>
                <th className="text-right py-2 px-3 font-medium text-gray-500">P75</th>
                <th className="text-right py-2 px-3 font-medium text-gray-500">Skew</th>
              </tr>
            </thead>
            <tbody>
              {stats?.timeToEmployment?.mean > 0 && (
                <tr className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-2 px-3 font-medium text-ctu-charcoal">Time to Employment (months)</td>
                  <td className="text-right py-2 px-3 text-gray-600">{stats.timeToEmployment.sampleSize}</td>
                  <td className="text-right py-2 px-3 font-medium">{stats.timeToEmployment.mean}</td>
                  <td className="text-right py-2 px-3">{stats.timeToEmployment.median}</td>
                  <td className="text-right py-2 px-3">{stats.timeToEmployment.stdDev}</td>
                  <td className="text-right py-2 px-3">{stats.timeToEmployment.min}</td>
                  <td className="text-right py-2 px-3">{stats.timeToEmployment.max}</td>
                  <td className="text-right py-2 px-3">{stats.timeToEmployment.percentile25}</td>
                  <td className="text-right py-2 px-3">{stats.timeToEmployment.percentile75}</td>
                  <td className="text-right py-2 px-3">{stats.timeToEmployment.skewness}</td>
                </tr>
              )}
              {salaryStats?.overall?.mean > 0 && (
                <tr className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-2 px-3 font-medium text-ctu-charcoal">Salary (₱)</td>
                  <td className="text-right py-2 px-3 text-gray-600">{salaryStats.overall.sampleSize}</td>
                  <td className="text-right py-2 px-3 font-medium">₱{Math.round(salaryStats.overall.mean).toLocaleString()}</td>
                  <td className="text-right py-2 px-3">₱{Math.round(salaryStats.overall.median).toLocaleString()}</td>
                  <td className="text-right py-2 px-3">₱{Math.round(salaryStats.overall.stdDev).toLocaleString()}</td>
                  <td className="text-right py-2 px-3">₱{Math.round(salaryStats.overall.min).toLocaleString()}</td>
                  <td className="text-right py-2 px-3">₱{Math.round(salaryStats.overall.max).toLocaleString()}</td>
                  <td className="text-right py-2 px-3">₱{Math.round(salaryStats.overall.percentile25).toLocaleString()}</td>
                  <td className="text-right py-2 px-3">₱{Math.round(salaryStats.overall.percentile75).toLocaleString()}</td>
                  <td className="text-right py-2 px-3">{salaryStats.overall.skewness}</td>
                </tr>
              )}
              {stats?.jobTenure?.mean > 0 && (
                <tr className="hover:bg-gray-50">
                  <td className="py-2 px-3 font-medium text-ctu-charcoal">Job Tenure (months)</td>
                  <td className="text-right py-2 px-3 text-gray-600">{stats.jobTenure.sampleSize}</td>
                  <td className="text-right py-2 px-3 font-medium">{stats.jobTenure.mean}</td>
                  <td className="text-right py-2 px-3">{stats.jobTenure.median || 'N/A'}</td>
                  <td className="text-right py-2 px-3">{stats.jobTenure.stdDev}</td>
                  <td className="text-right py-2 px-3">{stats.jobTenure.min}</td>
                  <td className="text-right py-2 px-3">{stats.jobTenure.max}</td>
                  <td className="text-right py-2 px-3" colSpan={3}>N/A</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
