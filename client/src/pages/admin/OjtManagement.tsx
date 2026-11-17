import { useCallback, useEffect, useMemo, useState } from 'react';
import { adminApi } from '@/services/api';
import { invalidateCachePrefixes } from '@/utils/apiCache';
import { useUIStore } from '@/store/uiStore';
import { SkeletonStatCard, SkeletonTableRows } from '@/components/ui/Skeleton';
import {
  AcademicCapIcon,
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ArrowTopRightOnSquareIcon,
  BuildingOfficeIcon,
  CheckBadgeIcon,
  ClockIcon,
  DocumentCheckIcon,
  MagnifyingGlassIcon,
  ShieldCheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

interface OjtRecord {
  userId: string;
  employmentId: string | null;
  idNumber: string;
  studentName: string;
  email: string;
  program: string;
  programRaw?: string;
  batchYear: string;
  ojtSite: string;
  ojtRole: string;
  ojtIndustry: string;
  ojtStartDate: string;
  proofUploaded: boolean;
  proofUrl: string | null;
  concurrentWork: string;
  clearanceVerified: boolean;
  clearanceStatus: string;
  hasOjt: boolean;
}

interface OjtSummary {
  totalStudents: number;
  updatedCount: number;
  clearedCount: number;
  readyToClearCount?: number;
  pendingCount: number;
  proofCount?: number;
  practiceTeachingCount?: number;
}

type StatusFilter = 'all' | 'updated' | 'awaiting_proof' | 'ready' | 'cleared' | 'pending';

function getSafeExternalUrl(raw?: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (trimmed.startsWith('https://') || trimmed.startsWith('http://') || trimmed.startsWith('/')) {
    return trimmed;
  }
  return null;
}

function formatDateLabel(raw?: string): string {
  if (!raw) return '—';
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function OjtManagement() {
  const addNotification = useUIStore((s) => s.addNotification);

  const [records, setRecords] = useState<OjtRecord[]>([]);
  const [summary, setSummary] = useState<OjtSummary>({
    totalStudents: 0,
    updatedCount: 0,
    clearedCount: 0,
    readyToClearCount: 0,
    pendingCount: 0,
    proofCount: 0,
    practiceTeachingCount: 0,
  });
  const [availableBatches, setAvailableBatches] = useState<string[]>([]);
  const [availablePrograms, setAvailablePrograms] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [batchFilter, setBatchFilter] = useState<string>('');
  const [programFilter, setProgramFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const fetchOjtData = useCallback(
    async (force = false) => {
      try {
        if (force) setRefreshing(true);
        else setLoading(true);

        const params: Record<string, any> = { status: statusFilter };
        if (batchFilter) params.batch = batchFilter;
        if (programFilter) params.program = programFilter;

        const res = await adminApi.reportOjtClearance(params, force ? { force: true } : undefined);
        setRecords(Array.isArray(res?.records) ? res.records : []);
        if (res?.summary) {
          setSummary(res.summary);
        }
        if (Array.isArray(res?.availableBatches)) {
          setAvailableBatches(res.availableBatches);
        }
        if (Array.isArray(res?.availablePrograms)) {
          setAvailablePrograms(res.availablePrograms);
        }
      } catch (err: any) {
        addNotification(err?.message || 'Failed to load OJT deployment records.', 'error');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [addNotification, statusFilter, batchFilter, programFilter]
  );

  useEffect(() => {
    fetchOjtData();
  }, [fetchOjtData]);

  const filteredRecords = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records.filter((rec) => {
      if (statusFilter === 'ready' && (!rec.hasOjt || !rec.proofUploaded || rec.clearanceVerified)) {
        return false;
      }
      if (statusFilter === 'awaiting_proof' && (!rec.hasOjt || rec.proofUploaded || rec.clearanceVerified)) {
        return false;
      }
      if (!q) return true;
      const haystack = [
        rec.studentName,
        rec.idNumber,
        rec.email,
        rec.program,
        rec.batchYear,
        rec.ojtSite,
        rec.ojtRole,
        rec.ojtIndustry,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [records, search, statusFilter]);

  const handleToggleClearance = async (rec: OjtRecord) => {
    if (!rec.employmentId) return;
    const nextCleared = !rec.clearanceVerified;
    if (nextCleared && !rec.proofUploaded) {
      addNotification('Student must upload a Certificate of Completion / proof before clearing.', 'error');
      return;
    }
    setVerifyingId(rec.employmentId);
    try {
      await adminApi.verifyOjtClearance(rec.employmentId, nextCleared);
      invalidateCachePrefixes(['/admin/reports/ojt-clearance', '/admin/reports']);
      await fetchOjtData(true);
      addNotification(
        nextCleared
          ? `Cleared OJT graduation requirement for ${rec.studentName}.`
          : `Removed OJT clearance verification for ${rec.studentName}.`,
        'success'
      );
    } catch (err: any) {
      addNotification(err?.message || 'Failed to update OJT clearance status.', 'error');
    } finally {
      setVerifyingId(null);
    }
  };

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const params: Record<string, any> = {
        format: 'csv',
        status: statusFilter,
      };
      if (batchFilter) params.batch = batchFilter;
      if (programFilter) params.program = programFilter;

      const blob = await adminApi.reportOjtClearance(params);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ojt-clearance-${batchFilter || 'active-cohort'}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      addNotification(err?.message || 'Failed to export OJT clearance CSV.', 'error');
    } finally {
      setExporting(false);
    }
  };

  const readyToClearCount =
    summary.readyToClearCount ??
    records.filter((r) => r.hasOjt && r.proofUploaded && !r.clearanceVerified).length;
  const proofCount =
    summary.proofCount ?? records.filter((r) => r.hasOjt && r.proofUploaded).length;

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">OJT &amp; Practice Teaching</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200">
              {summary.updatedCount} Logged Deployments
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Monitor graduating students&apos; OJT / Practice Teaching deployments, certificates of completion, and graduation clearance. OJT deployments are excluded from graduate employment rates.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => fetchOjtData(true)}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-white border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors shadow-2xs cursor-pointer disabled:opacity-60"
          >
            <ArrowPathIcon className={`w-3.5 h-3.5 text-gray-500 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            disabled={exporting || loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-orange-600 hover:bg-orange-700 text-white rounded-xl transition-colors shadow-xs cursor-pointer disabled:opacity-50"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            <span>{exporting ? 'Exporting...' : 'Export CSV'}</span>
          </button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {loading ? (
          [1, 2, 3, 4].map((i) => <SkeletonStatCard key={i} />)
        ) : (
          <>
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`bg-white border rounded-xl p-4 shadow-2xs flex flex-col justify-between text-left transition-all cursor-pointer ${
                statusFilter === 'all'
                  ? 'border-orange-400 ring-2 ring-orange-100'
                  : 'border-gray-200/90 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between gap-2 w-full">
                <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center shrink-0">
                  <AcademicCapIcon className="w-5 h-5 text-orange-600" />
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200/60">
                  Cohort
                </span>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-bold tracking-tight text-orange-600 leading-none">
                  {summary.totalStudents}
                </p>
                <p className="text-xs font-semibold text-gray-600 mt-1.5">Tracked Students</p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-gray-100 text-[11px] text-gray-400 w-full">
                {summary.pendingCount} pending OJT entry
              </div>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('updated')}
              className={`bg-white border rounded-xl p-4 shadow-2xs flex flex-col justify-between text-left transition-all cursor-pointer ${
                statusFilter === 'updated'
                  ? 'border-indigo-400 ring-2 ring-indigo-100'
                  : 'border-gray-200/90 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between gap-2 w-full">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                  <BuildingOfficeIcon className="w-5 h-5 text-indigo-600" />
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                  Deployments
                </span>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-bold tracking-tight text-indigo-600 leading-none">
                  {summary.updatedCount}
                </p>
                <p className="text-xs font-semibold text-gray-600 mt-1.5">OJT / Practice Teaching</p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-gray-100 text-[11px] text-gray-400 w-full">
                {summary.practiceTeachingCount ?? 0} practice teacher / educ
              </div>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('ready')}
              className={`bg-white border rounded-xl p-4 shadow-2xs flex flex-col justify-between text-left transition-all cursor-pointer ${
                statusFilter === 'ready'
                  ? 'border-amber-400 ring-2 ring-amber-100'
                  : 'border-gray-200/90 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between gap-2 w-full">
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
                  <DocumentCheckIcon className="w-5 h-5 text-amber-600" />
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200/60">
                  Proof Ready
                </span>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-bold tracking-tight text-amber-600 leading-none">
                  {proofCount}
                </p>
                <p className="text-xs font-semibold text-gray-600 mt-1.5">Certificates Uploaded</p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-gray-100 text-[11px] text-gray-400 w-full">
                {readyToClearCount} ready for clearance sign-off
              </div>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('cleared')}
              className={`bg-white border rounded-xl p-4 shadow-2xs flex flex-col justify-between text-left transition-all cursor-pointer ${
                statusFilter === 'cleared'
                  ? 'border-emerald-400 ring-2 ring-emerald-100'
                  : 'border-gray-200/90 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between gap-2 w-full">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                  <CheckBadgeIcon className="w-5 h-5 text-emerald-600" />
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                  Cleared
                </span>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-bold tracking-tight text-emerald-600 leading-none">
                  {summary.clearedCount}
                </p>
                <p className="text-xs font-semibold text-gray-600 mt-1.5">Cleared for Graduation</p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-gray-100 text-[11px] text-gray-400 w-full">
                Verified with proof of completion
              </div>
            </button>
          </>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search student name, ID, school/company, role..."
              className="w-full text-xs border border-gray-200 rounded-xl pl-9 pr-8 py-2 outline-none focus:border-orange-500 bg-white font-medium text-gray-700"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 rounded cursor-pointer"
                title="Clear search"
              >
                <XMarkIcon className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={programFilter}
              onChange={(e) => setProgramFilter(e.target.value)}
              className="text-xs border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-orange-500 bg-white font-medium text-gray-700 cursor-pointer"
            >
              <option value="">All Degree Programs</option>
              {availablePrograms.map((prog) => (
                <option key={prog} value={prog}>
                  {prog}
                </option>
              ))}
            </select>

            <select
              value={batchFilter}
              onChange={(e) => setBatchFilter(e.target.value)}
              className="text-xs border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-orange-500 bg-white font-medium text-gray-700 cursor-pointer"
            >
              <option value="">Active Cohort &amp; OJT Filers</option>
              <option value="all">All Batch Years</option>
              {availableBatches.map((yr) => (
                <option key={yr} value={yr}>
                  Batch {yr}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Status Filter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-gray-100 text-xs">
          <span className="text-gray-400 text-[11px] font-medium mr-1">Clearance Status:</span>

          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-gray-900 text-white shadow-2xs'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200/70'
            }`}
          >
            All Tracked
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('updated')}
            className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
              statusFilter === 'updated'
                ? 'bg-orange-600 text-white shadow-2xs'
                : 'bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100'
            }`}
          >
            <BuildingOfficeIcon className="w-3.5 h-3.5" />
            <span>Logged OJT</span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('awaiting_proof')}
            className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
              statusFilter === 'awaiting_proof'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
            }`}
          >
            <ClockIcon className="w-3.5 h-3.5" />
            <span>Awaiting Certificate</span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('ready')}
            className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
              statusFilter === 'ready'
                ? 'bg-amber-600 text-white shadow-2xs'
                : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
            }`}
          >
            <DocumentCheckIcon className="w-3.5 h-3.5" />
            <span>Ready to Clear</span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('cleared')}
            className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
              statusFilter === 'cleared'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            <CheckBadgeIcon className="w-3.5 h-3.5" />
            <span>Cleared</span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('pending')}
            className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
              statusFilter === 'pending'
                ? 'bg-gray-700 text-white shadow-2xs'
                : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200/70'
            }`}
          >
            <span>Pending Update</span>
          </button>

          <div className="ml-auto text-[11px] text-gray-500 font-medium">
            Showing <span className="font-bold text-gray-800">{filteredRecords.length}</span> record{filteredRecords.length === 1 ? '' : 's'}
          </div>
        </div>
      </div>

      {/* Records Table */}
      {loading ? (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-2xs">
          <SkeletonTableRows rows={6} cols={6} />
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center space-y-3 shadow-2xs">
          <div className="w-14 h-14 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center mx-auto border border-orange-100">
            <AcademicCapIcon className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-gray-900">No matching OJT records found</h3>
          <p className="text-xs text-gray-500 max-w-md mx-auto leading-relaxed">
            Try clearing the search query or switching the batch year, degree program, or clearance status filter.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Student</th>
                  <th className="py-3.5 px-4 font-semibold">Program &amp; Batch</th>
                  <th className="py-3.5 px-4 font-semibold">OJT Site &amp; Role</th>
                  <th className="py-3.5 px-4 font-semibold">Certificate / Proof</th>
                  <th className="py-3.5 px-4 font-semibold">Clearance Status</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredRecords.map((rec) => {
                  const safeProofUrl = getSafeExternalUrl(rec.proofUrl);
                  const isBusy = Boolean(rec.employmentId && verifyingId === rec.employmentId);
                  const initial = (rec.studentName || rec.email || '?').charAt(0).toUpperCase();

                  return (
                    <tr
                      key={`${rec.userId}-${rec.employmentId || 'none'}`}
                      className="hover:bg-gray-50/70 transition-colors"
                    >
                      <td className="py-3.5 px-4 align-top">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                              rec.clearanceVerified
                                ? 'bg-emerald-100 text-emerald-700'
                                : rec.hasOjt
                                  ? 'bg-orange-100 text-orange-700'
                                  : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {initial}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="font-bold text-gray-900 leading-snug">{rec.studentName}</p>
                              {rec.clearanceVerified && (
                                <CheckBadgeIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" title="Cleared" />
                              )}
                            </div>
                            <p className="text-[11px] text-gray-500">
                              {rec.idNumber || 'No ID'} • {rec.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 align-top">
                        <p className="font-medium text-gray-800">{rec.program || '—'}</p>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          {rec.batchYear ? `Batch ${rec.batchYear}` : 'No batch'}
                        </p>
                      </td>

                      <td className="py-3.5 px-4 align-top">
                        {rec.hasOjt ? (
                          <div>
                            <p className="font-bold text-gray-900">{rec.ojtSite || '—'}</p>
                            <p className="text-[11px] text-gray-600 mt-0.5">
                              {rec.ojtRole || 'Intern'}
                              {rec.ojtIndustry ? ` • ${rec.ojtIndustry}` : ''}
                            </p>
                            <p className="text-[10px] text-gray-400 mt-0.5">
                              Started {formatDateLabel(rec.ojtStartDate)}
                            </p>
                            {rec.concurrentWork && (
                              <span className="mt-1 inline-block text-[10px] font-medium px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/70">
                                Working: {rec.concurrentWork}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-gray-400 italic">No OJT deployment logged yet</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 align-top">
                        {rec.hasOjt ? (
                          safeProofUrl ? (
                            <a
                              href={safeProofUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-semibold text-orange-600 hover:text-orange-800 hover:underline"
                            >
                              <DocumentCheckIcon className="w-4 h-4 shrink-0" />
                              <span>View Certificate</span>
                              <ArrowTopRightOnSquareIcon className="w-3 h-3 shrink-0" />
                            </a>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600">
                              <ClockIcon className="w-3.5 h-3.5 shrink-0" />
                              <span>Not uploaded</span>
                            </span>
                          )
                        ) : (
                          <span className="text-[11px] text-gray-400">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 align-top">
                        {rec.clearanceVerified ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <ShieldCheckIcon className="w-3 h-3" />
                            <span>Cleared</span>
                          </span>
                        ) : rec.hasOjt && rec.proofUploaded ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-50 text-amber-700 border border-amber-200">
                            <span>Ready to Clear</span>
                          </span>
                        ) : rec.hasOjt ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-50 text-blue-700 border border-blue-200">
                            <span>Awaiting Certificate</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-gray-100 text-gray-600 border border-gray-200">
                            <span>Pending OJT Update</span>
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 align-top text-right whitespace-nowrap">
                        {rec.hasOjt && rec.employmentId ? (
                          rec.clearanceVerified || rec.proofUploaded ? (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleToggleClearance(rec)}
                              className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-colors cursor-pointer disabled:opacity-50 ${
                                rec.clearanceVerified
                                  ? 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
                                  : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-2xs'
                              }`}
                            >
                              {isBusy
                                ? 'Updating...'
                                : rec.clearanceVerified
                                  ? 'Unverify'
                                  : 'Mark Cleared'}
                            </button>
                          ) : (
                            <span
                              title="Certificate of completion / proof must be uploaded first"
                              className="inline-block px-3 py-1.5 rounded-xl text-[11px] font-semibold bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed"
                            >
                              Needs Certificate
                            </span>
                          )
                        ) : (
                          <span className="text-[11px] text-gray-400">Awaiting entry</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
