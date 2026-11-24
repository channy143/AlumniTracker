import { useState, useEffect, useCallback } from 'react';
import { documentRequestsApi } from '@/services/api';
import { useUIStore } from '@/store/uiStore';
import {
  DocumentTextIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  ClockIcon,
  SparklesIcon,
  ExclamationTriangleIcon,
  BuildingLibraryIcon,
  XMarkIcon,
  CalendarDaysIcon,
  CheckBadgeIcon,
} from '@heroicons/react/24/outline';

export default function AdminDocumentRequests() {
  const addNotification = useUIStore((s) => s.addNotification);
  const [requests, setRequests] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({
    total: 0,
    pending: 0,
    processing: 0,
    ready_for_pickup: 0,
    claimed: 0,
    rejected: 0,
  });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  // Modal state for updating request status / pickup schedule / remarks
  const [activeRequest, setActiveRequest] = useState<any | null>(null);
  const [modalStatus, setModalStatus] = useState<'pending' | 'processing' | 'ready_for_pickup' | 'claimed' | 'rejected'>('ready_for_pickup');
  const [modalSchedule, setModalSchedule] = useState('');
  const [modalWindow, setModalWindow] = useState("Registrar's Office — Window 1 & 2 (Bring Valid ID & Claim Slip)");
  const [modalRemarks, setModalRemarks] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await documentRequestsApi.adminList({
        status: statusFilter || undefined,
        search: search.trim() || undefined,
      });
      setRequests(Array.isArray(res?.requests) ? res.requests : []);
      if (res?.stats) setStats(res.stats);
    } catch {
      addNotification('Failed to load Registrar document requests', 'error');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search, addNotification]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const openManageModal = (
    reqItem: any,
    defaultNextStatus?: 'pending' | 'processing' | 'ready_for_pickup' | 'claimed' | 'rejected'
  ) => {
    setActiveRequest(reqItem);
    setModalStatus(defaultNextStatus || reqItem.status || 'ready_for_pickup');
    setModalSchedule(
      reqItem.pickup_schedule ||
        reqItem.preferred_pickup_date ||
        new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0]
    );
    setModalWindow(
      reqItem.pickup_window || "Registrar's Office — Window 1 & 2 (Bring Valid ID & Claim Slip)"
    );
    setModalRemarks(reqItem.registrar_remarks || '');
  };

  const handleQuickStatusUpdate = async (
    reqItem: any,
    nextStatus: 'processing' | 'claimed'
  ) => {
    setUpdatingId(reqItem.id);
    try {
      await documentRequestsApi.adminUpdateStatus(reqItem.id, {
        status: nextStatus,
      });
      addNotification(
        nextStatus === 'processing'
          ? `Marked ${reqItem.reference_code} as Processing & notified alumnus`
          : `Marked ${reqItem.reference_code} as Claimed / Released`,
        'success'
      );
      await loadRequests();
    } catch (err: any) {
      addNotification(err?.message || 'Failed to update status', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleSaveModalUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRequest) return;
    setUpdatingId(activeRequest.id);
    try {
      await documentRequestsApi.adminUpdateStatus(activeRequest.id, {
        status: modalStatus,
        pickup_schedule: modalSchedule || undefined,
        pickup_window: modalWindow || undefined,
        registrar_remarks: modalRemarks.trim() || undefined,
      });
      addNotification(
        modalStatus === 'ready_for_pickup'
          ? `Approved ${activeRequest.reference_code} for pick-up! Alumni notified via portal & Gmail.`
          : `Updated request ${activeRequest.reference_code} to ${modalStatus.replace(/_/g, ' ')}`,
        'success'
      );
      setActiveRequest(null);
      await loadRequests();
    } catch (err: any) {
      addNotification(err?.message || 'Failed to save status update', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <ClockIcon className="w-3 h-3" />
            Pending Review
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
            <SparklesIcon className="w-3 h-3" />
            Processing
          </span>
        );
      case 'ready_for_pickup':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
            <CheckCircleIcon className="w-3 h-3 text-emerald-600" />
            Ready for Pick-Up
          </span>
        );
      case 'claimed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-800 border border-indigo-200">
            <CheckBadgeIcon className="w-3 h-3" />
            Claimed / Released
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200">
            <ExclamationTriangleIcon className="w-3 h-3" />
            Action Required
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-500">
            Cancelled
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <BuildingLibraryIcon className="w-5 h-5 text-orange-600" />
            Registrar Alumni Document Requests
          </h1>
          <p className="text-xs text-gray-500">
            Verify online alumni document requisitions, schedule pick-up windows, and verify Claim Reference Codes
          </p>
        </div>
      </div>

      {/* 5 KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { key: '', label: 'Total Requests', value: stats.total || 0, color: 'border-gray-200 bg-white text-gray-900' },
          { key: 'pending', label: 'Pending Review', value: stats.pending || 0, color: 'border-amber-200 bg-amber-50/50 text-amber-900' },
          { key: 'processing', label: 'In Preparation', value: stats.processing || 0, color: 'border-blue-200 bg-blue-50/50 text-blue-900' },
          { key: 'ready_for_pickup', label: 'Ready for Pick-Up', value: stats.ready_for_pickup || 0, color: 'border-emerald-200 bg-emerald-50/50 text-emerald-900' },
          { key: 'claimed', label: 'Claimed / Released', value: stats.claimed || 0, color: 'border-indigo-200 bg-indigo-50/50 text-indigo-900' },
        ].map((card) => (
          <button
            key={card.label}
            type="button"
            onClick={() => setStatusFilter(card.key)}
            className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer shadow-2xs ${card.color} ${
              statusFilter === card.key ? 'ring-2 ring-orange-500' : 'hover:border-gray-300'
            }`}
          >
            <div className="text-[11px] font-semibold opacity-75">{card.label}</div>
            <div className="text-xl font-extrabold mt-1">{card.value}</div>
          </button>
        ))}
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white border border-gray-200 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        <div className="relative flex-1 min-w-[240px]">
          <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Claim Reference Code (e.g. CTU-REG-2026-...), alumni name, student ID, or document..."
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg outline-none focus:border-orange-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-orange-500 bg-white"
          >
            <option value="">All Request Statuses</option>
            <option value="pending">Pending Review</option>
            <option value="processing">Processing</option>
            <option value="ready_for_pickup">Ready for Pick-Up</option>
            <option value="claimed">Claimed / Released</option>
            <option value="rejected">Action Required / Returned</option>
          </select>
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-2xs">
        {loading ? (
          <div className="p-10 text-center space-y-2">
            <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-gray-500">Loading alumni document requests...</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <DocumentTextIcon className="w-9 h-9 text-gray-300 mx-auto" />
            <p className="text-xs font-semibold text-gray-700">No alumni document requests found</p>
            <p className="text-[11px] text-gray-500">
              Online requests submitted by alumni through the portal will appear here for verification and scheduling.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-600 font-semibold">
                  <th className="py-2.5 px-3">Claim Ref Code</th>
                  <th className="py-2.5 px-3">Alumni / Student ID</th>
                  <th className="py-2.5 px-3">Requested Document(s) &amp; Purpose</th>
                  <th className="py-2.5 px-3">Pick-Up Schedule</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Registrar Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {requests.map((reqItem) => {
                  const isBusy = updatingId === reqItem.id;
                  return (
                    <tr key={reqItem.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="py-3 px-3 align-top">
                        <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-gray-900 text-white">
                          {reqItem.reference_code}
                        </span>
                        <div className="text-[10px] text-gray-400 mt-1">
                          {new Date(reqItem.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </div>
                      </td>
                      <td className="py-3 px-3 align-top">
                        <div className="font-bold text-gray-900">{reqItem.alumni_name}</div>
                        <div className="text-[11px] text-gray-500">
                          ID: <span className="font-semibold text-gray-700">{reqItem.student_id || 'N/A'}</span>
                          {reqItem.program ? ` · ${reqItem.program}` : ''}
                          {reqItem.year_graduated ? ` (${reqItem.year_graduated})` : ''}
                        </div>
                        <div className="text-[10px] text-gray-400">{reqItem.email}</div>
                      </td>
                      <td className="py-3 px-3 align-top max-w-xs">
                        <div className="font-semibold text-gray-900 leading-snug">{reqItem.document_summary}</div>
                        <div className="text-[11px] text-gray-500 mt-0.5">Purpose: {reqItem.purpose}</div>
                        {reqItem.notes && (
                          <div className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 mt-1">
                            Note: &ldquo;{reqItem.notes}&rdquo;
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 align-top">
                        {reqItem.pickup_schedule ? (
                          <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-800">
                            <CalendarDaysIcon className="w-3.5 h-3.5 text-orange-500" />
                            <span>{reqItem.pickup_schedule}</span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-gray-400 italic">Not scheduled</span>
                        )}
                        {reqItem.registrar_remarks && (
                          <div className="text-[10px] text-gray-500 mt-0.5 truncate max-w-[160px]" title={reqItem.registrar_remarks}>
                            &ldquo;{reqItem.registrar_remarks}&rdquo;
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 align-top">{getStatusBadge(reqItem.status)}</td>
                      <td className="py-3 px-3 align-top text-right">
                        <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                          {reqItem.status === 'pending' && (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleQuickStatusUpdate(reqItem, 'processing')}
                              className="px-2.5 py-1 text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 cursor-pointer"
                            >
                              Mark Processing
                            </button>
                          )}
                          {(reqItem.status === 'pending' || reqItem.status === 'processing') && (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => openManageModal(reqItem, 'ready_for_pickup')}
                              className="px-2.5 py-1 text-[11px] font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 shadow-2xs cursor-pointer"
                            >
                              Approve for Pick-Up
                            </button>
                          )}
                          {reqItem.status === 'ready_for_pickup' && (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleQuickStatusUpdate(reqItem, 'claimed')}
                              className="px-2.5 py-1 text-[11px] font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-2xs cursor-pointer"
                            >
                              Release / Claimed
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => openManageModal(reqItem)}
                            className="px-2.5 py-1 text-[11px] font-medium bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 cursor-pointer"
                          >
                            Manage
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Manage / Approve Document Request Modal */}
      {activeRequest && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setActiveRequest(null)}
        >
          <div
            className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-md w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 bg-gradient-to-r from-emerald-700 to-teal-700 text-white flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold">Update Registrar Document Request</h3>
                <p className="text-[11px] text-emerald-100 font-mono">{activeRequest.reference_code}</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveRequest(null)}
                className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveModalUpdate} className="p-5 space-y-3.5">
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs space-y-1">
                <p className="font-bold text-gray-900">{activeRequest.alumni_name}</p>
                <p className="text-gray-600">{activeRequest.document_summary}</p>
                <p className="text-[11px] text-gray-500">Purpose: {activeRequest.purpose}</p>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  Request Status
                </label>
                <select
                  value={modalStatus}
                  onChange={(e) => setModalStatus(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg outline-none focus:border-emerald-600 bg-white font-semibold"
                >
                  <option value="pending">Pending Review</option>
                  <option value="processing">Processing / Preparing Document</option>
                  <option value="ready_for_pickup">✅ Approved — Ready for Pick-Up at Registrar</option>
                  <option value="claimed">🎓 Released / Claimed by Alumnus</option>
                  <option value="rejected">⚠️ Action Required / Return with Remarks</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  Scheduled Pick-Up Date
                </label>
                <input
                  type="date"
                  value={modalSchedule}
                  onChange={(e) => setModalSchedule(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  Registrar Window / Claim Instructions
                </label>
                <input
                  type="text"
                  value={modalWindow}
                  onChange={(e) => setModalWindow(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  Registrar Remarks / Fee &amp; Clearance Instructions
                </label>
                <textarea
                  rows={3}
                  value={modalRemarks}
                  onChange={(e) => setModalRemarks(e.target.value)}
                  placeholder="e.g. Please pay the documentary stamp & TOR fee at the Cashier Window first and present the Official Receipt along with your Claim Slip at Window 2."
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg outline-none focus:border-emerald-600 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setActiveRequest(null)}
                  className="px-3.5 py-2 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingId === activeRequest.id}
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {updatingId === activeRequest.id ? 'Saving & Notifying...' : 'Save & Notify Alumnus'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
