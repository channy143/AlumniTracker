import { useState, useEffect } from 'react';
import { adminApi } from '@/services/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import {
  UserGroupIcon, BriefcaseIcon, ChartBarIcon, CurrencyDollarIcon,
  BuildingOfficeIcon, ExclamationCircleIcon,
} from '@heroicons/react/24/outline';

const COLORS = ['#003366', '#D4AF37', '#38B2AC', '#2D3748', '#718096', '#E53E3E', '#DD6B20', '#805AD5', '#3182CE', '#319795'];
const STATUS_COLORS: Record<string, string> = {
  'Employed': '#003366',
  'Unemployed': '#E53E3E',
  'Self-employed': '#38B2AC',
  'Seeking Opportunities': '#DD6B20',
  'Student': '#805AD5',
  'Retired': '#718096',
};

export default function CareerAnalytics() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [filters, setFilters] = useState({ year: '', course: '', employment_status: '', industry: '' });

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await adminApi.careerStatistics(filters);
      setData(result);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  const overviewCards = data ? [
    { label: 'Total Alumni', value: data.overview.totalAlumni, icon: UserGroupIcon, color: 'from-blue-600 to-blue-400' },
    { label: 'Employed', value: data.overview.employed, icon: BriefcaseIcon, color: 'from-teal-500 to-teal-400' },
    { label: 'Unemployed', value: data.overview.unemployed, icon: ExclamationCircleIcon, color: 'from-red-500 to-red-400' },
    { label: 'Employment Rate', value: `${data.overview.employmentRate}%`, icon: ChartBarIcon, color: 'from-amber-500 to-amber-400' },
    { label: 'Missing Info', value: data.overview.missingInfo, icon: ExclamationCircleIcon, color: 'from-purple-500 to-purple-400' },
  ] : [];

  const statusPie = data?.statusDistribution || [];
  const industryData = data?.byIndustry || [];
  const salaryData = data?.bySalary || [];
  const companyData = data?.topCompanies || [];
  const recentUpdates = data?.recentlyUpdated || [];
  const withoutInfo = data?.withoutInfo || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="section-title">Career Analytics</h1>
        <p className="text-gray-500 mt-1">Comprehensive employment analytics from alumni data</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <input type="number" value={filters.year} onChange={(e) => setFilters((f) => ({ ...f, year: e.target.value }))} placeholder="Graduation Year" className="input-field text-sm max-w-[150px]" />
        <select value={filters.course} onChange={(e) => setFilters((f) => ({ ...f, course: e.target.value }))} className="input-field text-sm max-w-[140px]">
          <option value="">All Courses</option>
          <option value="BSIT">BSIT</option>
          <option value="BIT">BIT</option>
          <option value="BEEd">BEEd</option>
          <option value="BSEd-Math">BSEd-Math</option>
          <option value="BTLED-HE">BTLED-HE</option>
          <option value="BTLED-ICT">BTLED-ICT</option>
        </select>
        <select value={filters.employment_status} onChange={(e) => setFilters((f) => ({ ...f, employment_status: e.target.value }))} className="input-field text-sm max-w-[170px]">
          <option value="">All Status</option>
          <option value="Employed">Employed</option>
          <option value="Unemployed">Unemployed</option>
          <option value="Self-employed">Self-employed</option>
          <option value="Seeking Opportunities">Seeking Opportunities</option>
          <option value="Student">Student</option>
          <option value="Retired">Retired</option>
        </select>
        <select value={filters.industry} onChange={(e) => setFilters((f) => ({ ...f, industry: e.target.value }))} className="input-field text-sm max-w-[150px]">
          <option value="">All Industries</option>
          {industryData.map((i: any) => (
            <option key={i.industry} value={i.industry}>{i.industry}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="card animate-pulse h-48" />)}
        </div>
      ) : !data ? (
        <div className="card text-center py-12">
          <p className="text-gray-400">No analytics data available. Ensure alumni have employment information filled in.</p>
          <button onClick={loadData} className="btn-primary mt-4">Retry</button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {overviewCards.map((card) => (
              <div key={card.label} className="card text-center py-4 group hover:shadow-md transition-shadow">
                <div className={`w-10 h-10 mx-auto rounded-lg bg-gradient-to-br ${card.color} bg-opacity-10 flex items-center justify-center mb-2`}>
                  <card.icon className="w-5 h-5 text-white" />
                </div>
                <p className="text-2xl font-bold text-ctu-charcoal">{card.value}</p>
                <p className="text-xs text-gray-500 mt-1">{card.label}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h2 className="text-base font-semibold text-ctu-charcoal mb-3 flex items-center gap-2">
                <ChartBarIcon className="w-4 h-4 text-ctu-blue" />
                Employment Status Distribution
              </h2>
              {statusPie.length > 0 ? (
                <>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={statusPie} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="count" nameKey="status" label={({ status, percent }) => `${status} ${(percent * 100).toFixed(1)}%`}>
                          {statusPie.map((entry: any, i: number) => (
                            <Cell key={i} fill={STATUS_COLORS[entry.status] || COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => [`${value} alumni`, '']} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-wrap justify-center gap-3 text-xs text-gray-500 mt-2">
                    {statusPie.map((s: any, i: number) => (
                      <span key={i} className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[s.status] || COLORS[i % COLORS.length] }} />
                        {s.status} <strong>{s.count}</strong>
                      </span>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-400 text-center py-12">No employment status data available</p>
              )}
            </div>

            <div className="card">
              <h2 className="text-base font-semibold text-ctu-charcoal mb-3 flex items-center gap-2">
                <BuildingOfficeIcon className="w-4 h-4 text-ctu-gold" />
                Alumni by Industry
              </h2>
              {industryData.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={industryData.slice(0, 10)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="industry" width={110} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(value: number) => [`${value} alumni`, 'Count']} />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                        {industryData.slice(0, 10).map((_: any, i: number) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center py-12">No industry data available</p>
              )}
            </div>

            <div className="card">
              <h2 className="text-base font-semibold text-ctu-charcoal mb-3 flex items-center gap-2">
                <CurrencyDollarIcon className="w-4 h-4 text-emerald-600" />
                Alumni by Salary Range
              </h2>
              {salaryData.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={salaryData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="range" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(value: number) => [`${value} alumni`, 'Count']} />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]} fill="#D4AF37" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center py-12">No salary data available</p>
              )}
            </div>

            <div className="card">
              <h2 className="text-base font-semibold text-ctu-charcoal mb-3 flex items-center gap-2">
                <BuildingOfficeIcon className="w-4 h-4 text-purple-600" />
                Top Companies Employing Alumni
              </h2>
              {companyData.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {companyData.map((item: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 text-sm">
                      <div className="w-6 h-6 rounded bg-ctu-blue/10 flex items-center justify-center text-xs font-bold text-ctu-blue shrink-0">
                        {i + 1}
                      </div>
                      <span className="text-gray-700 w-36 truncate">{item.company}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-2">
                        <div className="bg-purple-500 rounded-full h-2" style={{ width: `${Math.min((item.count / Math.max(...companyData.map((c: any) => c.count))) * 100, 100)}%` }} />
                      </div>
                      <span className="text-xs text-gray-500 w-6 text-right">{item.count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center py-12">No company data available</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h2 className="text-base font-semibold text-ctu-charcoal mb-3 flex items-center gap-2">
                <ChartBarIcon className="w-4 h-4 text-ctu-teal" />
                Recently Updated Employment Records
              </h2>
              {recentUpdates.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-2 font-medium text-gray-500">Name</th>
                        <th className="text-left py-2 px-2 font-medium text-gray-500">Status</th>
                        <th className="text-left py-2 px-2 font-medium text-gray-500">Company</th>
                        <th className="text-right py-2 px-2 font-medium text-gray-500">Updated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentUpdates.map((row: any) => (
                        <tr key={row.id} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="py-2 px-2 text-ctu-charcoal font-medium">{row.name}</td>
                          <td className="py-2 px-2">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              row.employment_status === 'Employed' ? 'bg-green-50 text-green-700' :
                              row.employment_status === 'Unemployed' ? 'bg-red-50 text-red-700' :
                              row.employment_status === 'Self-employed' ? 'bg-teal-50 text-teal-700' :
                              row.employment_status === 'Seeking Opportunities' ? 'bg-amber-50 text-amber-700' :
                              'bg-gray-50 text-gray-600'
                            }`}>
                              {row.employment_status || '---'}
                            </span>
                          </td>
                          <td className="py-2 px-2 text-gray-600">{row.company_name || '---'}</td>
                          <td className="py-2 px-2 text-right text-xs text-gray-400">{row.last_updated_at ? new Date(row.last_updated_at).toLocaleDateString() : '---'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center py-8">No recently updated records</p>
              )}
            </div>

            <div className="card">
              <h2 className="text-base font-semibold text-ctu-charcoal mb-3 flex items-center gap-2">
                <ExclamationCircleIcon className="w-4 h-4 text-amber-500" />
                Alumni Without Employment Information
              </h2>
              {withoutInfo.length > 0 ? (
                <>
                  <p className="text-xs text-gray-400 mb-3">{withoutInfo.length} alumni have not filled in their employment information</p>
                  <div className="max-h-64 overflow-y-auto space-y-1">
                    {withoutInfo.map((row: any) => (
                      <div key={row.id} className="flex items-center gap-2 text-sm py-1.5 px-2 rounded hover:bg-gray-50">
                        <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs text-gray-500">
                          {(row.name || '?').charAt(0)}
                        </div>
                        <span className="text-gray-600">{row.name}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <div className="w-12 h-12 mx-auto bg-green-50 rounded-full flex items-center justify-center mb-3">
                    <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <p className="text-sm text-gray-400">All alumni have employment information</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}