import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { adminApi } from '@/services/api';
import { SkeletonCard } from '@/components/ui/Skeleton';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  ArrowLeftIcon,
  BuildingOfficeIcon,
  HandRaisedIcon,
  GlobeAltIcon,
  MapPinIcon,
  TagIcon,
} from '@heroicons/react/24/outline';

const ORANGE = '#f97316';

const JOB_TYPE_LABELS: Record<string, string> = {
  'full-time': 'Full-time',
  'part-time': 'Part-time',
  contract: 'Contractual',
  contractual: 'Contractual',
  freelance: 'Freelance',
  internship: 'Internship',
};

function formatDate(d: string | null | undefined) {
  if (!d) return '—';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-sm font-bold text-gray-900 truncate" title={value}>{value}</p>
    </div>
  );
}

export default function EmployerDetail() {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);

  const load = () => {
    if (!name) return;
    setLoading(true);
    adminApi.employerDetail(name)
      .then(setData)
      .catch((e: any) => setError(e?.message || 'Failed to load employer details'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [name]);

  const togglePartnership = async () => {
    if (!data) return;
    setUpdating(true);
    try {
      const current = data.partnershipStatus === 'partner' ? 'partner' : 'non-partner';
      const next = current === 'partner' ? 'non-partner' : 'partner';
      await adminApi.employerUpdatePartnership(data.name, next);
      setData({ ...data, partnershipStatus: next, partnershipTracked: true });
    } catch (e: any) {
      alert(e?.message || 'Failed to update partnership status.');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="mb-4"><div className="h-5 w-40 bg-gray-200 animate-pulse rounded mb-1" /><div className="h-3 w-56 bg-gray-200 animate-pulse rounded" /></div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-6xl mx-auto bg-white border border-gray-200 rounded-lg text-center py-12">
        <p className="text-xs text-gray-400 mb-4">{error || 'Employer not found.'}</p>
        <Link to="/admin/employers" className="px-3 py-1.5 text-xs font-medium bg-orange-500 text-white rounded-lg hover:bg-orange-600">Back to Employer Insights</Link>
      </div>
    );
  }

  const isPartner = data.partnershipStatus === 'partner';
  const isNonPartner = data.partnershipStatus === 'non-partner';
  const partnershipTracked = data.partnershipTracked === true || isPartner || isNonPartner;
  const overview = data.overview || {};

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 shrink-0" aria-label="Go back">
            <ArrowLeftIcon className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-gray-900">{data.name}</h1>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${isPartner ? 'bg-green-50 text-green-700' : isNonPartner ? 'bg-gray-100 text-gray-500' : 'bg-amber-50 text-amber-700'}`}>
                {isPartner ? <HandRaisedIcon className="w-3 h-3" /> : <BuildingOfficeIcon className="w-3 h-3" />}
                {isPartner ? 'Partner' : isNonPartner ? 'Non-partner' : 'Not tracked'}
              </span>
            </div>
            <p className="text-xs text-gray-500">Employer details based on Graduate Tracer Survey data.</p>
          </div>
        </div>
        {partnershipTracked ? (
          <button
            onClick={togglePartnership}
            disabled={updating}
            className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${isPartner
              ? 'border-gray-200 text-gray-600 hover:bg-gray-50'
              : 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100'}`}
          >
            <HandRaisedIcon className="w-3.5 h-3.5" />
            {updating ? 'Saving...' : isPartner ? 'Mark as Non-partner' : 'Mark as Partner'}
          </button>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-700">
            <BuildingOfficeIcon className="w-3.5 h-3.5" />
            Partnership tracking not enabled
          </span>
        )}
      </div>

      <div className="space-y-3">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Company Overview</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="flex items-center gap-2">
              <TagIcon className="w-4 h-4 text-orange-500 shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">Industry</p>
                <p className="text-xs font-medium text-gray-900 truncate">{data.industry || '—'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <MapPinIcon className="w-4 h-4 text-orange-500 shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">Location</p>
                <p className="text-xs font-medium text-gray-900 truncate">
                  {[data.city, data.province].filter(Boolean).join(', ') || '—'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <GlobeAltIcon className="w-4 h-4 text-orange-500 shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">Website</p>
                {data.website ? (
                  <a href={data.website} target="_blank" rel="noreferrer" className="text-xs font-medium text-orange-600 hover:text-orange-700 truncate block">{data.website}</a>
                ) : <p className="text-xs font-medium text-gray-900">—</p>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <HandRaisedIcon className="w-4 h-4 text-orange-500 shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">Partnership Status</p>
                <p className="text-xs font-medium text-gray-900">{isPartner ? 'Partner' : isNonPartner ? 'Non-partner' : 'Not tracked'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatBox label="Alumni Working Here" value={String(overview.alumniCount ?? 0)} />
          <StatBox label="Employment Records" value={String(overview.employmentCount ?? 0)} />
          <StatBox label="First Alumni Hired" value={formatDate(overview.firstHireDate)} />
          <StatBox label="Last Alumni Hired" value={formatDate(overview.lastHireDate)} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Hiring History</h2>
            {data.hiringHistory && data.hiringHistory.length > 0 ? (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.hiringHistory}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip formatter={(value: number) => [`${value} hire(s)`, 'Hires']} labelFormatter={(l) => `Year ${l}`} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]} fill={ORANGE} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : <p className="text-xs text-gray-400 text-center py-8">No hiring history available.</p>}
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Programs Represented</h2>
            {data.programs && data.programs.length > 0 ? (
              <div className="space-y-2">
                {data.programs.map((p: any) => (
                  <div key={p.program} className="flex items-center justify-between text-xs">
                    <span className="text-gray-700 font-medium">{p.program}</span>
                    <span className="text-gray-500">{p.count} alumni</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-xs text-gray-400 text-center py-8">No program data available.</p>}
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Alumni Working Here</h2>
            {data.alumni && data.alumni.length > 0 ? (
              <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
                {data.alumni.map((a: any) => (
                  <div key={a.profileId} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                    <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center text-xs font-bold text-orange-600 shrink-0">
                      {a.name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-gray-900 truncate">{a.name}</p>
                      <p className="text-[11px] text-gray-500 truncate">
                        {a.position || 'No position listed'}{a.graduationYear ? ` · Class of ${a.graduationYear}` : ''}
                      </p>
                    </div>
                    <span className="text-[10px] text-gray-400 shrink-0">{a.jobType ? JOB_TYPE_LABELS[a.jobType] || a.jobType : '—'}</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-xs text-gray-400 text-center py-8">No alumni data available.</p>}
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Employment Types</h2>
            {data.employmentTypes && data.employmentTypes.length > 0 ? (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.employmentTypes}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="type" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip formatter={(value: number) => [`${value} record(s)`, 'Count']} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]} fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : <p className="text-xs text-gray-400 text-center py-8">No employment type data available.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
