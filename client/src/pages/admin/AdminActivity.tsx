import { useState, useEffect, useMemo, useRef } from 'react';
import { adminApi } from '@/services/api';
import { SkeletonAuditKpi, SkeletonAuditTableRow } from '@/components/ui/Skeleton';
import {
  ShieldCheckIcon,
  ShieldExclamationIcon,
  ArrowDownTrayIcon,
  ArrowPathIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ExclamationCircleIcon,
  UserIcon,
  ComputerDesktopIcon,
  DocumentDuplicateIcon,
  CheckIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';

function timeAgo(dateStr: string) {
  const then = new Date(dateStr).getTime();
  if (!then) return '';
  const diff = Date.now() - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatFullDate(dateStr: string) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

function formatActionLabel(action: string): string {
  if (!action) return 'System Event';
  return action
    .replace(/^AUTH_/, '')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function SeverityBadge({ severity }: { severity?: string }) {
  const s = (severity || 'info').toLowerCase();
  if (s === 'critical') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 border border-red-200/70">
        <ExclamationCircleIcon className="w-3 h-3" />
        CRITICAL
      </span>
    );
  }
  if (s === 'warning') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200/70">
        <ExclamationTriangleIcon className="w-3 h-3" />
        WARNING
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200/60">
      <ShieldCheckIcon className="w-3 h-3 text-slate-500" />
      INFO
    </span>
  );
}

function StatusBadge({ status }: { status?: string }) {
  const isFailure = (status || 'success').toLowerCase() === 'failure';
  if (isFailure) {
    return (
      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-600 border border-red-100">
        FAIL
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
      OK
    </span>
  );
}

function RoleBadge({ role }: { role?: string }) {
  const r = (role || 'user').toLowerCase();
  let color = 'bg-gray-100 text-gray-700';
  if (r === 'admin') color = 'bg-purple-100 text-purple-700 font-bold';
  else if (r === 'moderator') color = 'bg-blue-100 text-blue-700 font-medium';
  else if (r === 'alumni') color = 'bg-orange-100 text-orange-700 font-medium';
  else if (r === 'system') color = 'bg-slate-200 text-slate-800 font-semibold';
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider ${color}`}>
      {role || 'User'}
    </span>
  );
}

function ActorAvatar({
  name,
  email,
  role,
  avatarUrl,
  size = 'sm',
}: {
  name?: string;
  email?: string;
  role?: string;
  avatarUrl?: string | null;
  size?: 'sm' | 'md';
}) {
  const [imgError, setImgError] = useState(false);
  const isSystem = (role || '').toLowerCase() === 'system' || (!name && !email && !avatarUrl);

  const sizeClasses = size === 'md' ? 'w-10 h-10 text-xs' : 'w-6 h-6 text-[10px]';
  const iconClasses = size === 'md' ? 'w-5 h-5 text-slate-500' : 'w-3.5 h-3.5 text-slate-500';

  if (avatarUrl && !imgError) {
    return (
      <img
        src={avatarUrl}
        alt={name || 'User'}
        onError={() => setImgError(true)}
        className={`${sizeClasses} rounded-full object-cover shrink-0 border border-gray-200/80 shadow-2xs`}
      />
    );
  }

  if (isSystem) {
    return (
      <div
        className={`${sizeClasses} rounded-full bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200/60`}
        title="System Automated Action"
      >
        <ComputerDesktopIcon className={iconClasses} />
      </div>
    );
  }

  const initial = (name || email || 'U').charAt(0).toUpperCase();
  const r = (role || '').toLowerCase();
  let bg = 'bg-orange-50 text-orange-600 border-orange-100';
  if (r === 'admin') bg = 'bg-purple-50 text-purple-700 border-purple-100';
  else if (r === 'moderator') bg = 'bg-blue-50 text-blue-700 border-blue-100';

  return (
    <div
      className={`${sizeClasses} rounded-full ${bg} font-bold flex items-center justify-center shrink-0 border`}
      title={name || email || 'User'}
    >
      {initial}
    </div>
  );
}


// Modal for deep audit inspection
function AuditDetailModal({ log, onClose }: { log: any; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  if (!log) return null;

  const copyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(log, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const oldState = log.details?.old || null;
  const newState = log.details?.new || null;
  const hasDiff = oldState && newState;

  // Extract changed keys if both old and new exist
  const changedKeys = useMemo(() => {
    if (!hasDiff) return [];
    const keys = new Set([...Object.keys(oldState), ...Object.keys(newState)]);
    return [...keys].filter(
      (k) => JSON.stringify(oldState[k]) !== JSON.stringify(newState[k])
    );
  }, [oldState, newState, hasDiff]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
      <div className="bg-white border border-gray-200 rounded-2xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-2">
            <ShieldCheckIcon className="w-5 h-5 text-orange-500" />
            <div>
              <h3 className="text-sm font-bold text-gray-900">Audit Trail Inspector</h3>
              <p className="text-[11px] text-gray-500">Record ID: {log.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {/* Top Key Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-gray-50 p-3 rounded-xl border border-gray-100">
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Severity</span>
              <div className="mt-1">
                <SeverityBadge severity={log.severity} />
              </div>
            </div>
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status</span>
              <div className="mt-1">
                <StatusBadge status={log.status} />
              </div>
            </div>
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Timestamp (UTC)</span>
              <p className="text-[11px] font-medium text-gray-800 mt-1">{formatFullDate(log.created_at)}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Action Code</span>
              <p className="text-[11px] font-mono font-bold text-orange-600 mt-1 truncate" title={log.action}>
                {log.action}
              </p>
            </div>
          </div>

          {/* Actor & Environment */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="border border-gray-100 rounded-xl p-3 bg-white">
              <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <UserIcon className="w-3.5 h-3.5 text-gray-400" />
                Actor Identity
              </h4>
              <div className="flex items-start gap-2.5">
                <ActorAvatar
                  name={log.actor_name}
                  email={log.actor_email}
                  role={log.actor_role}
                  avatarUrl={log.actor_avatar}
                  size="md"
                />
                <div className="space-y-0.5 text-xs min-w-0 flex-1">
                  <p className="font-semibold text-gray-900 truncate">{log.actor_name || 'System / Anonymous'}</p>
                  {log.actor_email && <p className="text-gray-500 truncate">{log.actor_email}</p>}
                  <div className="flex items-center gap-1.5 pt-1">
                    <RoleBadge role={log.actor_role} />
                    {log.user_id && <span className="text-[10px] text-gray-400 font-mono">UID: {log.user_id}</span>}
                  </div>
                </div>
              </div>
            </div>

            <div className="border border-gray-100 rounded-xl p-3 bg-white">
              <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <ComputerDesktopIcon className="w-3.5 h-3.5 text-gray-400" />
                Network Origin & Client
              </h4>
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-500">Client IP:</span>
                  <span className="font-mono font-semibold text-gray-800 bg-gray-100 px-1.5 py-0.5 rounded text-[11px]">
                    {log.ip_address || 'Unknown'}
                  </span>
                </div>
                <div className="text-gray-500 truncate" title={log.user_agent || 'Unknown'}>
                  <span className="text-gray-400">Browser:</span> {log.user_agent || 'Not captured'}
                </div>
                {log.entity && (
                  <div className="text-gray-500">
                    <span className="text-gray-400">Target Entity:</span>{' '}
                    <span className="font-semibold text-gray-700">{log.entity}</span>
                    {log.entity_id && ` (${log.entity_id})`}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Visual Diff if Old & New states exist */}
          {hasDiff && (
            <div className="border border-gray-100 rounded-xl p-3.5 bg-white">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">
                  State Changes ({changedKeys.length} field{changedKeys.length !== 1 ? 's' : ''} modified)
                </h4>
              </div>
              {changedKeys.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {changedKeys.map((key) => (
                    <div key={key} className="bg-gray-50 rounded-lg p-2 text-[11px] border border-gray-100">
                      <span className="font-mono font-bold text-gray-700 block mb-1">{key}</span>
                      <div className="grid grid-cols-2 gap-2 font-mono">
                        <div className="bg-red-50/70 text-red-700 p-1.5 rounded border border-red-100 break-all">
                          <span className="text-[9px] block text-red-500 font-sans font-bold">PREVIOUS</span>
                          {JSON.stringify(oldState[key])}
                        </div>
                        <div className="bg-emerald-50/70 text-emerald-800 p-1.5 rounded border border-emerald-100 break-all">
                          <span className="text-[9px] block text-emerald-600 font-sans font-bold">UPDATED</span>
                          {JSON.stringify(newState[key])}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 py-2">No field differences detected between snapshots.</p>
              )}
            </div>
          )}

          {/* Raw JSON viewer */}
          <div className="border border-gray-100 rounded-xl p-3 bg-gray-900 text-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider">
                Full Sanitized JSON Payload
              </span>
              <button
                onClick={copyJson}
                className="inline-flex items-center gap-1 text-[11px] text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 px-2 py-0.5 rounded transition-colors"
              >
                {copied ? <CheckIcon className="w-3.5 h-3.5 text-emerald-400" /> : <DocumentDuplicateIcon className="w-3.5 h-3.5" />}
                {copied ? 'Copied!' : 'Copy JSON'}
              </button>
            </div>
            <pre className="text-[11px] font-mono overflow-x-auto max-h-48 p-2 rounded bg-gray-950 text-emerald-400">
              {JSON.stringify(log.details || {}, null, 2)}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminActivity() {
  const [logs, setLogs] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [severity, setSeverity] = useState('all');
  const [status, setStatus] = useState('all');
  const [datePreset, setDatePreset] = useState('all');
  const [page, setPage] = useState(1);
  const limit = 25;

  const queryIdRef = useRef(0);

  // Debounced search - only triggers when search actually changes, not on initial mount
  useEffect(() => {
    if (search === debouncedSearch) return;
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, debouncedSearch]);

  const loadData = async (isRefresh = false) => {
    const currentQueryId = ++queryIdRef.current;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const params: Record<string, any> = { page, limit };
      if (debouncedSearch) params.search = debouncedSearch;
      if (category !== 'all') params.category = category;
      if (severity !== 'all') params.severity = severity;
      if (status !== 'all') params.status = status;

      if (datePreset === 'today') {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        params.from = start.toISOString();
      } else if (datePreset === '7days') {
        const start = new Date(Date.now() - 7 * 86400000);
        params.from = start.toISOString();
      } else if (datePreset === '30days') {
        const start = new Date(Date.now() - 30 * 86400000);
        params.from = start.toISOString();
      }

      const shouldFetchStats = !stats || isRefresh;
      const [logRes, statsRes] = await Promise.all([
        adminApi.auditLogs(params),
        shouldFetchStats ? adminApi.auditLogStats().catch(() => null) : Promise.resolve(null),
      ]);

      // Guard against race conditions from rapid filter/page changes
      if (currentQueryId !== queryIdRef.current) return;

      setLogs(logRes.data || []);
      setTotalCount(logRes.total || 0);
      if (statsRes) setStats(statsRes);
    } catch {
      if (currentQueryId === queryIdRef.current) {
        setLogs([]);
        setTotalCount(0);
      }
    } finally {
      if (currentQueryId === queryIdRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  };

  useEffect(() => {
    loadData();
  }, [page, category, severity, status, datePreset, debouncedSearch]);

  const handleExportCsv = () => {
    const params: Record<string, any> = {};
    if (debouncedSearch) params.search = debouncedSearch;
    if (category !== 'all') params.category = category;
    if (severity !== 'all') params.severity = severity;
    if (status !== 'all') params.status = status;
    if (datePreset === 'today') {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      params.from = start.toISOString();
    } else if (datePreset === '7days') {
      params.from = new Date(Date.now() - 7 * 86400000).toISOString();
    } else if (datePreset === '30days') {
      params.from = new Date(Date.now() - 30 * 86400000).toISOString();
    }

    const exportUrl = adminApi.exportAuditLogsUrl(params);
    window.open(exportUrl, '_blank');
  };

  const totalPages = Math.ceil(totalCount / limit) || 1;

  const categories = [
    { id: 'all', label: 'All Events' },
    { id: 'auth', label: 'Auth & Security' },
    { id: 'admin', label: 'Admin Actions' },
    { id: 'alumni', label: 'Alumni & Profile' },
    { id: 'survey', label: 'Surveys & Tracer' },
    { id: 'jobs', label: 'Jobs & Career' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-4 pb-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <ShieldCheckIcon className="w-5 h-5 text-orange-500" />
            Audit & Security Logs
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Immutable, compliance-grade trail of authentication, data modifications, and administrative operations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 transition-colors shadow-2xs"
          >
            <ArrowPathIcon className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-orange-500' : 'text-gray-500'}`} />
            Refresh
          </button>
          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white transition-colors shadow-2xs"
          >
            <ArrowDownTrayIcon className="w-3.5 h-3.5" />
            Export Audit Trail (CSV)
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {loading && !stats ? (
          <>
            <SkeletonAuditKpi />
            <SkeletonAuditKpi />
            <SkeletonAuditKpi />
            <SkeletonAuditKpi />
          </>
        ) : (
          <>
            <div className="bg-white border border-gray-200 rounded-xl p-3.5 shadow-2xs">
              <div className="flex items-center gap-1.5 text-gray-500 mb-1">
                <ShieldCheckIcon className="w-4 h-4 text-orange-500" />
                <span className="text-[11px] font-semibold uppercase tracking-wider">Total Audited Events</span>
              </div>
              <p className="text-2xl font-black text-gray-900">
                {stats ? stats.totalEvents.toLocaleString() : totalCount.toLocaleString()}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">Appended immutable logs</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-3.5 shadow-2xs">
              <div className="flex items-center gap-1.5 text-red-600 mb-1">
                <ShieldExclamationIcon className="w-4 h-4" />
                <span className="text-[11px] font-semibold uppercase tracking-wider">Security Alerts</span>
              </div>
              <p className="text-2xl font-black text-gray-900">
                {stats ? stats.securityAlerts.toLocaleString() : '0'}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">Warnings & critical events</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-3.5 shadow-2xs">
              <div className="flex items-center gap-1.5 text-purple-600 mb-1">
                <UserIcon className="w-4 h-4" />
                <span className="text-[11px] font-semibold uppercase tracking-wider">Admin Operations</span>
              </div>
              <p className="text-2xl font-black text-gray-900">
                {stats ? stats.adminActions.toLocaleString() : '0'}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">Staff & admin modifications</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-3.5 shadow-2xs">
              <div className="flex items-center gap-1.5 text-blue-600 mb-1">
                <CalendarDaysIcon className="w-4 h-4" />
                <span className="text-[11px] font-semibold uppercase tracking-wider">Today's Activity</span>
              </div>
              <p className="text-2xl font-black text-gray-900">
                {stats ? stats.todayCount.toLocaleString() : '0'}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">Logged in last 24 hours</p>
            </div>
          </>
        )}
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border border-gray-200 rounded-xl p-3.5 shadow-2xs space-y-3">
        {/* Category Pills */}
        <div className="flex flex-wrap gap-1.5">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                setCategory(c.id);
                setPage(1);
              }}
              className={`text-xs px-3 py-1 rounded-lg font-medium transition-colors ${
                category === c.id
                  ? 'bg-orange-500 text-white shadow-2xs'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Search & Dropdown Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 pt-1">
          {/* Search Input */}
          <div className="relative">
            <MagnifyingGlassIcon className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search action, actor, IP..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs pl-8 pr-7 py-1.5 border border-gray-200 rounded-lg outline-none focus:border-orange-400 bg-white"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setDebouncedSearch('');
                  setPage(1);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 rounded-full"
                title="Clear search"
              >
                <XMarkIcon className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Severity Dropdown */}
          <select
            value={severity}
            onChange={(e) => {
              setSeverity(e.target.value);
              setPage(1);
            }}
            className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-orange-400 bg-white"
          >
            <option value="all">All Severities</option>
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="critical">Critical</option>
          </select>

          {/* Status Dropdown */}
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-orange-400 bg-white"
          >
            <option value="all">All Statuses</option>
            <option value="success">Success</option>
            <option value="failure">Failure</option>
          </select>

          {/* Date Preset */}
          <select
            value={datePreset}
            onChange={(e) => {
              setDatePreset(e.target.value);
              setPage(1);
            }}
            className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-orange-400 bg-white"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-2xs overflow-hidden relative">
        {refreshing && (
          <div className="h-0.5 w-full bg-orange-100 overflow-hidden">
            <div className="h-full bg-orange-500 animate-pulse w-full" />
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50/75 border-b border-gray-100 text-gray-500 uppercase text-[10px] tracking-wider font-semibold">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-3 py-3">Severity & Status</th>
                <th className="px-3 py-3">Event Action</th>
                <th className="px-3 py-3">Actor</th>
                <th className="px-3 py-3">Entity</th>
                <th className="px-3 py-3">Origin IP</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <SkeletonAuditTableRow key={i} />
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 px-4">
                    <ShieldCheckIcon className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-gray-700">No matching audit logs found</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">Try adjusting your filters, search term, or date range.</p>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className="hover:bg-gray-50/70 transition-colors cursor-pointer group"
                  >
                    {/* Timestamp */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="font-semibold text-gray-900">{timeAgo(log.created_at)}</p>
                      <p className="text-[10px] text-gray-400">{formatFullDate(log.created_at)}</p>
                    </td>

                    {/* Severity & Status */}
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <SeverityBadge severity={log.severity} />
                        <StatusBadge status={log.status} />
                      </div>
                    </td>

                    {/* Action */}
                    <td className="px-3 py-3">
                      <p className="font-medium text-gray-800">{formatActionLabel(log.action)}</p>
                      <span className="font-mono text-[10px] text-gray-400">{log.action}</span>
                    </td>

                    {/* Actor */}
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <ActorAvatar
                          name={log.actor_name}
                          email={log.actor_email}
                          role={log.actor_role}
                          avatarUrl={log.actor_avatar}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate max-w-[140px]">
                            {log.actor_name || log.actor_email || 'System'}
                          </p>
                          <RoleBadge role={log.actor_role} />
                        </div>
                      </div>
                    </td>

                    {/* Entity */}
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className="font-semibold text-gray-700">{log.entity || '—'}</span>
                      {log.entity_id && (
                        <span className="block font-mono text-[10px] text-gray-400 truncate max-w-[120px]">
                          #{log.entity_id.slice(0, 8)}
                        </span>
                      )}
                    </td>

                    {/* Origin IP */}
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className="font-mono text-[11px] bg-gray-50 border border-gray-100 px-1.5 py-0.5 rounded text-gray-600">
                        {log.ip_address || '127.0.0.1'}
                      </span>
                    </td>

                    {/* Inspect button */}
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLog(log);
                        }}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 px-2.5 py-1 rounded-md transition-colors"
                      >
                        <EyeIcon className="w-3.5 h-3.5" />
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {!loading && logs.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/50 text-xs">
            <span className="text-gray-500">
              Showing <strong className="text-gray-900">{(page - 1) * limit + 1}</strong> to{' '}
              <strong className="text-gray-900">{Math.min(page * limit, totalCount)}</strong> of{' '}
              <strong className="text-gray-900">{totalCount.toLocaleString()}</strong> events
            </span>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-2.5 py-1 text-xs font-medium border border-gray-200 rounded-md bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <span className="px-2 text-xs text-gray-500">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-2.5 py-1 text-xs font-medium border border-gray-200 rounded-md bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detailed Inspection Modal */}
      {selectedLog && <AuditDetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />}
    </div>
  );
}
