import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BriefcaseIcon, AcademicCapIcon, CalendarDaysIcon, FunnelIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { directoryApi } from '@/services/api';
import { addRecentlyViewed } from '@/utils/recentlyViewed';
import { SkeletonRow } from '@/components/ui/Skeleton';

const statusColors: Record<string, string> = {
  'Employed': 'bg-emerald-100 text-emerald-700',
  'Self-employed': 'bg-blue-100 text-blue-700',
  'Unemployed': 'bg-gray-100 text-gray-600',
  'Seeking Opportunities': 'bg-amber-100 text-amber-700',
  'Retired': 'bg-slate-100 text-slate-600',
};

function statusBadge(status?: string) {
  if (!status) return null;
  let s = status.charAt(0).toUpperCase() + status.slice(1);
  if (s.toLowerCase() === 'student') s = 'Unemployed';
  const colors = statusColors[s] || 'bg-gray-100 text-gray-600';
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${colors}`}>{s}</span>
  );
}

function FilterDropdown({ label, options, selected, onChange }: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (vals: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = (val: string) => {
    onChange(selected.includes(val) ? selected.filter((v) => v !== val) : [...selected, val]);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg border transition-colors ${
          selected.length > 0
            ? 'bg-orange-50 border-orange-300 text-orange-700'
            : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
        }`}
      >
        {label}{selected.length > 0 && ` (${selected.length})`}
        <ChevronDownIcon className="w-3 h-3" />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-2 min-w-[180px] max-h-60 overflow-y-auto">
          {options.length === 0 && <p className="text-xs text-gray-400 px-2 py-1">No options</p>}
          {options.map((opt) => (
            <label key={opt} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 cursor-pointer text-xs text-gray-700">
              <input
                type="checkbox"
                checked={selected.includes(opt)}
                onChange={() => toggle(opt)}
                className="w-3.5 h-3.5 rounded border-gray-300 text-orange-500 focus:ring-orange-400"
              />
              {opt}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DirectoryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get('q') || '';
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<any>(null);

  // Filter state from URL
  const [programs, setPrograms] = useState<string[]>(searchParams.get('program')?.split(',').filter(Boolean) || []);
  const [batches, setBatches] = useState<string[]>(searchParams.get('batch')?.split(',').filter(Boolean) || []);
  const [employmentStatuses, setEmploymentStatuses] = useState<string[]>(searchParams.get('employment_status')?.split(',').filter(Boolean) || []);
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'name');

  const programOptions = ['BEEd', 'BSEd-Math', 'BTLED-HE', 'BTLED-ICT', 'BIT', 'BSIT'];
  const [batchOptions, setBatchOptions] = useState<string[]>([]);
  const employmentStatusOptions = ['Employed', 'Self-employed', 'Unemployed', 'Seeking Opportunities', 'Retired'];

  useEffect(() => {
    directoryApi.stats().then(setStats).catch(() => {});
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (programs.length) params.set('program', programs.join(','));
    if (batches.length) params.set('batch', batches.join(','));
    if (employmentStatuses.length) params.set('employment_status', employmentStatuses.join(','));
    if (sortBy !== 'name') params.set('sort', sortBy);
    setSearchParams(params, { replace: true });

    setLoading(true);
    directoryApi.search({
      q: query,
      page: 1,
      limit: 50,
      program: programs.join(','),
      batch: batches.join(','),
      employment_status: employmentStatuses.join(','),
      sort: sortBy,
    })
      .then((res: any) => {
        setResults(res.data || []);
        setTotal(res.total || 0);
        const allBatches = [...new Set((res.data || []).map((p: any) => p.education?.year_graduated?.toString()).filter(Boolean))] as string[];
        if (allBatches.length) setBatchOptions((prev) => prev.length ? prev : allBatches);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [query, programs, batches, employmentStatuses, sortBy]);

  const handleView = (profile: any) => {
    if (!profile.is_admin) {
      addRecentlyViewed({ id: profile.id, first_name: profile.first_name, last_name: profile.last_name, avatar_url: profile.avatar_url });
    }
    navigate(`/directory/${profile.id}`);
  };

  const clearFilters = () => {
    setPrograms([]);
    setBatches([]);
    setEmploymentStatuses([]);
    setSortBy('name');
  };

  const hasFilters = programs.length || batches.length || employmentStatuses.length || sortBy !== 'name';

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-4">
        <h1 className="text-base font-bold text-gray-900">Alumni Directory</h1>
        <p className="text-xs text-gray-500">Browse and search CTU-Naga alumni.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        {[
          { label: 'Total Alumni', value: stats?.totalAlumni?.toLocaleString() || '—', color: 'text-ctu-blue' },
          { label: 'Currently Employed', value: stats?.currentlyEmployed?.toLocaleString() || '—', color: 'text-emerald-600' },
          { label: 'Employment Rate', value: stats ? `${stats.employmentRate}%` : '—', color: 'text-orange-600' },
          { label: 'Programs', value: stats?.programs?.toLocaleString() || '—', color: 'text-purple-600' },
        ].map((card, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-lg px-3 py-2.5">
            <p className={`text-lg font-bold ${card.color}`}>{card.value}</p>
            <p className="text-[10px] text-gray-500 mt-0.5">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Filter Row */}
      <div className="flex flex-wrap items-center gap-2 mb-3 bg-white border border-gray-200 rounded-lg px-3 py-2">
        <FunnelIcon className="w-4 h-4 text-gray-400 shrink-0" />
        <FilterDropdown label="Program" options={programOptions} selected={programs} onChange={setPrograms} />
        <FilterDropdown label="Batch" options={batchOptions} selected={batches} onChange={setBatches} />
        <FilterDropdown label="Status" options={employmentStatusOptions} selected={employmentStatuses} onChange={setEmploymentStatuses} />
        <span className="w-px h-5 bg-gray-200" />
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-600 outline-none focus:border-orange-400"
        >
          <option value="name">Name A-Z</option>
          <option value="name_desc">Name Z-A</option>
        </select>
        {hasFilters && (
          <button onClick={clearFilters} className="text-xs text-orange-600 hover:text-orange-700 ml-1 whitespace-nowrap">
            Clear filters
          </button>
        )}
        <span className="text-xs text-gray-400 ml-auto whitespace-nowrap">
          {loading ? (
            <span className="h-3 w-16 bg-gray-200 animate-pulse rounded inline-block align-middle" />
          ) : `${total} alumni`}
        </span>
      </div>

      {/* Results */}
      {loading && (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => <SkeletonRow key={i} />)}
        </div>
      )}

      {!loading && results.length === 0 && (
        <div className="text-center py-12 text-sm text-gray-500 bg-white border border-gray-200 rounded-lg">
          {query || hasFilters ? 'No alumni match your search or filters.' : 'No alumni profiles found.'}
        </div>
      )}

      <div className="space-y-2">
        {!loading && results.map((profile) => {
          const emp = profile.current_employment;
          const edu = profile.education;
          return (
            <div
              key={profile.id}
              onClick={() => handleView(profile)}
              className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-center gap-3 cursor-pointer hover:border-orange-200 hover:shadow-sm transition-all"
            >
              <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-sm font-bold text-white shrink-0 overflow-hidden">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  ((profile.first_name?.[0] || '') + (profile.last_name?.[0] || '')).toUpperCase()
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-gray-900">
                    {profile.first_name} {profile.middle_name ? profile.middle_name + ' ' : ''}{profile.last_name}
                  </p>
                  {emp?.employment_status && statusBadge(emp.employment_status)}
                </div>

                {profile.headline && (
                  <p className="text-xs text-gray-500 truncate mt-0.5">{profile.headline}</p>
                )}

                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-[11px] text-gray-400">
                  {emp?.position && (
                    <span className="flex items-center gap-1">
                      <BriefcaseIcon className="w-3 h-3" />
                      {emp.position}{emp.company_name ? ` at ${emp.company_name}` : ''}
                    </span>
                  )}
                  {edu?.program && (
                    <span className="flex items-center gap-1">
                      <AcademicCapIcon className="w-3 h-3" />
                      {edu.program}
                    </span>
                  )}
                  {edu?.year_graduated && (
                    <span className="flex items-center gap-1">
                      <CalendarDaysIcon className="w-3 h-3" />
                      Batch {edu.year_graduated}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
