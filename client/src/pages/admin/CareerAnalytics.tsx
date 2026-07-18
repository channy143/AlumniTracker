import { useState, useEffect } from 'react';
import { adminApi } from '@/services/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';

const COLORS = ['#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#6366f1'];
const STATUS_COLORS: Record<string, string> = {
  'Employed': '#003366',
  'Unemployed': '#ef4444',
  'Self-employed': '#10b981',
  'Seeking Opportunities': '#f59e0b',
  'Retired': '#6b7280',
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

  const statusPie = data?.statusDistribution || [];
  const industryData = data?.byIndustry || [];
  const salaryData = data?.bySalary || [];
  const companyData = data?.topCompanies || [];
  const recentUpdates = data?.recentlyUpdated || [];
  const withoutInfo = data?.withoutInfo || [];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-4">
        <h1 className="text-base font-bold text-gray-900">Career Analytics</h1>
        <p className="text-xs text-gray-500">Comprehensive employment analytics from alumni data.</p>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        <input type="number" value={filters.year} onChange={(e) => setFilters((f) => ({ ...f, year: e.target.value }))} placeholder="Graduation Year" className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-orange-400 w-24" />
        <select value={filters.course} onChange={(e) => setFilters((f) => ({ ...f, course: e.target.value }))} className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-orange-400">
          <option value="">All Courses</option>
          {['BSIT', 'BIT', 'BEEd', 'BSEd-Math', 'BTLED-HE', 'BTLED-ICT'].map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <select value={filters.employment_status} onChange={(e) => setFilters((f) => ({ ...f, employment_status: e.target.value }))} className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-orange-400">
          <option value="">All Status</option>
          {['Employed', 'Unemployed', 'Self-employed', 'Seeking Opportunities', 'Retired'].map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <select value={filters.industry} onChange={(e) => setFilters((f) => ({ ...f, industry: e.target.value }))} className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-orange-400">
          <option value="">All Industries</option>
          {industryData.map((i: any) => (
            <option key={i.industry} value={i.industry}>{i.industry}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="bg-white border border-gray-200 rounded-lg animate-pulse h-48" />)}
        </div>
      ) : !data ? (
        <div className="bg-white border border-gray-200 rounded-lg text-center py-12">
          <p className="text-xs text-gray-400">No analytics data available. Ensure alumni have employment information filled in.</p>
          <button onClick={loadData} className="px-3 py-1.5 text-xs font-medium bg-orange-500 text-white rounded-lg hover:bg-orange-600 mt-3">Retry</button>
        </div>
      ) : (
        <>
          <div className="bg-white border border-gray-200 rounded-lg p-4 mb-3">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Overview</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { label: 'Total Alumni', value: data.overview.totalAlumni },
                { label: 'Employed', value: data.overview.employed },
                { label: 'Unemployed', value: data.overview.unemployed },
                { label: 'Employment Rate', value: `${data.overview.employmentRate}%` },
                { label: 'Missing Info', value: data.overview.missingInfo },
              ].map((card) => (
                <div key={card.label} className="text-center">
                  <p className="text-lg font-bold text-gray-900">{card.value}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">{card.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Employment Status Distribution</h2>
              {statusPie.length > 0 ? (
                <>
                  <div className="h-56">
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
                  <div className="flex flex-wrap justify-center gap-2 text-[10px] text-gray-500 mt-2">
                    {statusPie.map((s: any, i: number) => (
                      <span key={i} className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_COLORS[s.status] || COLORS[i % COLORS.length] }} />
                        {s.status} <strong>{s.count}</strong>
                      </span>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-xs text-gray-400 text-center py-8">No employment status data available.</p>
              )}
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Alumni by Industry</h2>
              {industryData.length > 0 ? (
                <div className="h-56">
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
                <p className="text-xs text-gray-400 text-center py-8">No industry data available.</p>
              )}
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Alumni by Salary Range</h2>
              {salaryData.length > 0 ? (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={salaryData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="range" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(value: number) => [`${value} alumni`, 'Count']} />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]} fill="#f97316" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-xs text-gray-400 text-center py-8">No salary data available.</p>
              )}
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Top Companies Employing Alumni</h2>
              {companyData.length > 0 ? (
                <div className="space-y-1.5 max-h-56 overflow-y-auto">
                  {companyData.map((item: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <div className="w-5 h-5 rounded bg-orange-50 flex items-center justify-center text-[10px] font-bold text-orange-600 shrink-0">
                        {i + 1}
                      </div>
                      <span className="text-gray-700 w-32 truncate">{item.company}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                        <div className="bg-orange-500 rounded-full h-1.5" style={{ width: `${Math.min((item.count / Math.max(...companyData.map((c: any) => c.count))) * 100, 100)}%` }} />
                      </div>
                      <span className="text-[10px] text-gray-500 w-5 text-right">{item.count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 text-center py-8">No company data available.</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-3">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Recently Updated Employment Records</h2>
              {recentUpdates.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 pr-2 font-medium text-gray-500">Name</th>
                        <th className="text-left py-2 pr-2 font-medium text-gray-500">Status</th>
                        <th className="text-left py-2 pr-2 font-medium text-gray-500">Company</th>
                        <th className="text-right py-2 font-medium text-gray-500">Updated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentUpdates.map((row: any) => (
                        <tr key={row.id} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="py-2 pr-2 text-gray-900 font-medium">{row.name}</td>
                          <td className="py-2 pr-2">
                            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                              row.employment_status === 'Employed' ? 'bg-emerald-50 text-emerald-700' :
                              row.employment_status === 'Unemployed' ? 'bg-red-50 text-red-700' :
                              row.employment_status === 'Self-employed' ? 'bg-teal-50 text-teal-700' :
                              row.employment_status === 'Seeking Opportunities' ? 'bg-amber-50 text-amber-700' :
                              'bg-gray-50 text-gray-600'
                            }`}>
                              {row.employment_status || '---'}
                            </span>
                          </td>
                          <td className="py-2 pr-2 text-gray-500">{row.company_name || '---'}</td>
                          <td className="py-2 text-right text-[10px] text-gray-400">{row.last_updated_at ? new Date(row.last_updated_at).toLocaleDateString() : '---'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-gray-400 text-center py-8">No recently updated records.</p>
              )}
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Alumni Without Employment Information</h2>
              {withoutInfo.length > 0 ? (
                <>
                  <p className="text-[10px] text-gray-400 mb-2">{withoutInfo.length} alumni have not filled in their employment information.</p>
                  <div className="max-h-56 overflow-y-auto space-y-1">
                    {withoutInfo.map((row: any) => (
                      <div key={row.id} className="flex items-center gap-2 text-xs py-1 px-2 rounded hover:bg-gray-50">
                        <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-[10px] text-gray-500">
                          {(row.name || '?').charAt(0)}
                        </div>
                        <span className="text-gray-600">{row.name}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <div className="w-8 h-8 mx-auto bg-emerald-50 rounded-full flex items-center justify-center mb-2">
                    <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <p className="text-xs text-gray-400">All alumni have employment information.</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
