import { useState, useEffect } from 'react';
import { adminApi } from '@/services/api';

export default function CareerAnalytics() {
  const [filters, setFilters] = useState({ year: '', course: '', employment_status: '', industry: '' });
  const [employmentRate, setEmploymentRate] = useState<any>(null);
  const [byCourse, setByCourse] = useState<any[]>([]);
  const [byBatch, setByBatch] = useState<any[]>([]);
  const [industryDist, setIndustryDist] = useState<any[]>([]);
  const [topEmployers, setTopEmployers] = useState<any[]>([]);
  const [salaryDist, setSalaryDist] = useState<any[]>([]);
  const [degreeAlign, setDegreeAlign] = useState<any[]>([]);
  const [avgTime, setAvgTime] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAll();
  }, [filters]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [rate, course, batch, ind, emp, sal, align, time] = await Promise.all([
        adminApi.employmentRate({ year: filters.year, course: filters.course }),
        adminApi.employmentByCourse({ year: filters.year }),
        adminApi.employmentByBatch(),
        adminApi.industryDistribution(),
        adminApi.topEmployers(),
        adminApi.salaryDistribution(),
        adminApi.degreeAlignment(),
        adminApi.avgTimeEmployment(),
      ]);
      setEmploymentRate(rate);
      setByCourse(course);
      setByBatch(batch);
      setIndustryDist(ind);
      setTopEmployers(emp);
      setSalaryDist(sal);
      setDegreeAlign(align);
      setAvgTime(time);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  const maxIndustry = Math.max(...industryDist.map((i) => i.count), 1);
  const maxCourse = Math.max(...byCourse.map((c) => c.total), 1);
  const maxEmployer = Math.max(...topEmployers.map((e) => e.count), 1);
  const maxSalary = Math.max(...salaryDist.map((s) => s.count), 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="section-title">Career Analytics</h1>
        <p className="text-gray-500 mt-1">Interactive analytics dashboard</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <input type="number" value={filters.year} onChange={(e) => setFilters((f) => ({ ...f, year: e.target.value }))} placeholder="Graduation Year" className="input-field text-sm max-w-[150px]" />
        <select value={filters.course} onChange={(e) => setFilters((f) => ({ ...f, course: e.target.value }))} className="input-field text-sm max-w-[130px]">
          <option value="">All Courses</option>
          <option value="BSIT">BSIT</option>
          <option value="BIT">BIT</option>
          <option value="BEEd">BEEd</option>
          <option value="BSEd-Math">BSEd-Math</option>
          <option value="BTLED-HE">BTLED-HE</option>
          <option value="BTLED-ICT">BTLED-ICT</option>
        </select>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="card animate-pulse h-48" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h2 className="text-lg font-semibold text-ctu-charcoal mb-4">Employment Rate</h2>
            {employmentRate && (
              <div className="flex items-center gap-6">
                <div className="relative w-28 h-28">
                  <svg className="w-28 h-28 -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15.5" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                    <circle cx="18" cy="18" r="15.5" fill="none" stroke="#003366" strokeWidth="3"
                      strokeDasharray={`${employmentRate.rate} ${100 - employmentRate.rate}`} strokeLinecap="round" />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-xl font-bold text-ctu-blue">{employmentRate.rate}%</span>
                </div>
                <div className="text-sm text-gray-600">
                  <p>Employed: {employmentRate.employed}</p>
                  <p>Unemployed: {employmentRate.unemployed}</p>
                  <p>Total Alumni: {employmentRate.total}</p>
                </div>
              </div>
            )}
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold text-ctu-charcoal mb-4">Employment by Course</h2>
            <div className="space-y-2">
              {byCourse.slice(0, 8).map((item, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <span className="w-24 truncate text-gray-600">{item.course}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2.5">
                    <div className="bg-ctu-blue rounded-full h-2.5" style={{ width: `${(item.total / maxCourse) * 100}%` }} />
                  </div>
                  <span className="text-xs text-gray-500 w-16 text-right">{item.employed}/{item.total}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold text-ctu-charcoal mb-4">Employment by Batch</h2>
            <div className="space-y-2">
              {byBatch.slice(-10).map((item, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <span className="w-12 text-gray-600">{item.year}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2.5">
                    <div className="bg-ctu-marigold rounded-full h-2.5" style={{ width: `${item.rate}%` }} />
                  </div>
                  <span className="text-xs text-gray-500 w-16 text-right">{item.rate}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold text-ctu-charcoal mb-4">Industry Distribution</h2>
            <div className="space-y-2">
              {industryDist.slice(0, 8).map((item, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <span className="w-32 truncate text-gray-600">{item.industry}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2.5">
                    <div className="bg-green-500 rounded-full h-2.5" style={{ width: `${(item.count / maxIndustry) * 100}%` }} />
                  </div>
                  <span className="text-xs text-gray-500 w-8 text-right">{item.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold text-ctu-charcoal mb-4">Top Employers</h2>
            <div className="space-y-2">
              {topEmployers.slice(0, 8).map((item, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <span className="w-36 truncate text-gray-600">{item.company}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2.5">
                    <div className="bg-purple-500 rounded-full h-2.5" style={{ width: `${(item.count / maxEmployer) * 100}%` }} />
                  </div>
                  <span className="text-xs text-gray-500 w-8 text-right">{item.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold text-ctu-charcoal mb-4">Salary Distribution</h2>
            <div className="space-y-2">
              {salaryDist.map((item, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <span className="w-28 text-gray-600">₱{item.range}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2.5">
                    <div className="bg-orange-500 rounded-full h-2.5" style={{ width: `${(item.count / Math.max(maxSalary, 1)) * 100}%` }} />
                  </div>
                  <span className="text-xs text-gray-500 w-8 text-right">{item.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold text-ctu-charcoal mb-4">Degree Alignment</h2>
            <div className="space-y-2">
              {degreeAlign.map((item, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <span className="w-24 truncate text-gray-600">{item.course}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2.5">
                    <div className="bg-teal-500 rounded-full h-2.5" style={{ width: `${item.rate}%` }} />
                  </div>
                  <span className="text-xs text-gray-500 w-16 text-right">{item.rate}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold text-ctu-charcoal mb-4">Average Time to Employment</h2>
            {avgTime && (
              <div className="text-center py-6">
                <p className="text-4xl font-bold text-ctu-blue">{avgTime.averageMonths}</p>
                <p className="text-gray-500 mt-2">Months after graduation</p>
                <p className="text-xs text-gray-400 mt-2">Based on {avgTime.sampleSize} alumni</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
