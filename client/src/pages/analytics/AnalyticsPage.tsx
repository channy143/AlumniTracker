import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts';
import { analyticsApi } from '@/services/api';

const COLORS = ['#003366', '#D4AF37', '#38B2AC', '#2D3748', '#718096'];

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [overview, setOverview] = useState<any>(null);
  const [industries, setIndustries] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [overviewData, industryData] = await Promise.all([
          analyticsApi.overview(),
          analyticsApi.industryDistribution(),
        ]);
        setOverview(overviewData);
        setIndustries(industryData);
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
        <div><h1 className="section-title">Career Analytics</h1><p className="text-gray-500 mt-1">Loading analytics...</p></div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => <div key={i} className="card animate-pulse h-80" />)}
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

  const industryData = industries.length
    ? industries
    : [{ name: 'No Data', value: 1 }];

  const topIndustries = overview?.topIndustries || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="section-title">Career Analytics</h1>
        <p className="text-gray-500 mt-1">Data-driven insights for your career journey</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card text-center">
          <p className="text-3xl font-bold text-ctu-blue">{overview?.totalAlumni || 0}</p>
          <p className="text-sm text-gray-500 mt-1">Total Alumni Tracked</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-ctu-teal">{overview?.employedPercentage || 0}%</p>
          <p className="text-sm text-gray-500 mt-1">Employment Rate</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-ctu-gold">{topIndustries.length}</p>
          <p className="text-sm text-gray-500 mt-1">Industries Represented</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-ctu-charcoal mb-4">Industry Distribution</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={industryData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="count || value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {industryData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-ctu-charcoal mb-4">Top Industries</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topIndustries.length ? topIndustries : [{ name: 'No Data', count: 1 }]} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={120} />
                <Tooltip />
                <Bar dataKey="count" fill="#003366" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-ctu-charcoal mb-4">Employment Rate by Batch</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[{ batch: 'All', rate: overview?.employedPercentage || 0 }]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="batch" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Bar dataKey="rate" fill="#003366" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-ctu-charcoal mb-4">Skills Gap Analysis</h3>
          <div className="space-y-4">
            {topIndustries.length ? (
              topIndustries.map((item: any, i: number) => (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-ctu-charcoal">{item.name}</span>
                    <span className="text-gray-400">{item.count} alumni</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-ctu-teal h-2 rounded-full" style={{ width: `${Math.min(100, (item.count / (overview?.totalAlumni || 1)) * 100)}%` }} />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-400 text-sm text-center py-8">No industry data available</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
