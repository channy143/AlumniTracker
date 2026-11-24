import { useState, useEffect, useCallback } from 'react';
import { documentRequestsApi } from '@/services/api';
import { useUIStore } from '@/store/uiStore';
import {
  DocumentTextIcon,
  ClipboardDocumentCheckIcon,
  CheckCircleIcon,
  ClockIcon,
  BuildingLibraryIcon,
  PrinterIcon,
  PlusIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  QrCodeIcon,
  CalendarDaysIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

const DOCUMENT_CATALOG = [
  {
    type: 'Official Transcript of Records (TOR)',
    desc: 'Complete academic record with official Registrar seal',
    processingDays: '3–5 working days',
  },
  {
    type: 'PRC Board Examination TOR / Certification',
    desc: 'With official remarks "For Board Examination Purposes Only"',
    processingDays: '3–5 working days',
  },
  {
    type: 'Diploma / Certificate of Graduation',
    desc: 'Official graduation certification or authenticated copy',
    processingDays: '3–5 working days',
  },
  {
    type: 'Certificate of Good Moral Character',
    desc: 'Institutional character clearance for employment or board exam',
    processingDays: '1–2 working days',
  },
  {
    type: 'Certification of Grades / GWA',
    desc: 'Official General Weighted Average & semester grade summary',
    processingDays: '1–3 working days',
  },
  {
    type: 'CAV (Certification, Authentication & Verification — CHED)',
    desc: 'Endorsement package for CHED / DFA Apostille authentication',
    processingDays: '5–7 working days',
  },
  {
    type: 'Honorable Dismissal / Transfer Credentials',
    desc: 'Official release credentials for postgraduate or further studies',
    processingDays: '3–5 working days',
  },
  {
    type: 'Certified True Copy of Academic Documents',
    desc: 'Registrar-authenticated true copy of existing diploma or TOR',
    processingDays: '1–2 working days',
  },
];

const PURPOSE_OPTIONS = [
  'PRC Licensure / Board Examination (LET / CPA / Engineering)',
  'Local Employment / Job Application',
  'Overseas Employment / Abroad / Apostille',
  'Postgraduate Studies (Master’s / MS / MA / Ph.D.)',
  'Promotion / Civil Service / DepEd Ranking',
  'Scholarship / Fellowship Application',
  'Personal File / Reference',
];

export default function AlumniDocumentRequestsPage() {
  const addNotification = useUIStore((s) => s.addNotification);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [selectedClaimSlip, setSelectedClaimSlip] = useState<any | null>(null);

  // Selected documents map: type -> copies
  const [selectedDocs, setSelectedDocs] = useState<Record<string, number>>({
    'Official Transcript of Records (TOR)': 1,
  });
  const [purpose, setPurpose] = useState(PURPOSE_OPTIONS[0]);
  const [preferredDate, setPreferredDate] = useState('');
  const [studentId, setStudentId] = useState('');
  const [program, setProgram] = useState('');
  const [yearGraduated, setYearGraduated] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [notes, setNotes] = useState('');

  const loadMyRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await documentRequestsApi.myList();
      setRequests(Array.isArray(res?.requests) ? res.requests : []);
      if (res?.applicant) {
        setStudentId((prev) => prev || res.applicant.student_id || '');
        setProgram((prev) => prev || res.applicant.program || '');
        setYearGraduated((prev) => prev || (res.applicant.year_graduated ? String(res.applicant.year_graduated) : ''));
        setContactNumber((prev) => prev || res.applicant.phone || '');
      }
    } catch {
      addNotification('Failed to load your document requests', 'error');
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  useEffect(() => {
    loadMyRequests();
  }, [loadMyRequests]);

  const toggleDocSelection = (docType: string) => {
    setSelectedDocs((prev) => {
      const next = { ...prev };
      if (next[docType]) {
        delete next[docType];
      } else {
        next[docType] = 1;
      }
      return next;
    });
  };

  const updateDocCopies = (docType: string, copies: number) => {
    setSelectedDocs((prev) => ({
      ...prev,
      [docType]: Math.max(1, Math.min(10, copies || 1)),
    }));
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    const docEntries = Object.entries(selectedDocs).map(([type, copies]) => ({ type, copies }));
    if (docEntries.length === 0) {
      addNotification('Please select at least one official document to request.', 'warning');
      return;
    }
    if (!purpose.trim()) {
      addNotification('Please select a purpose for your document request.', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const res = await documentRequestsApi.create({
        documents: docEntries,
        purpose,
        preferred_pickup_date: preferredDate || undefined,
        contact_number: contactNumber || undefined,
        student_id: studentId || undefined,
        program: program || undefined,
        year_graduated: yearGraduated || undefined,
        notes: notes.trim() || undefined,
      });
      addNotification(
        `Request submitted! Reference Code: ${res.request?.reference_code || ''}`,
        'success'
      );
      setNotes('');
      await loadMyRequests();
      if (res?.request) {
        setSelectedClaimSlip(res.request);
      }
    } catch (err: any) {
      addNotification(err?.message || 'Failed to submit document request', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelRequest = async (id: string) => {
    setCancellingId(id);
    try {
      await documentRequestsApi.cancel(id);
      addNotification('Document request cancelled', 'info');
      await loadMyRequests();
    } catch (err: any) {
      addNotification(err?.message || 'Failed to cancel request', 'error');
    } finally {
      setCancellingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <ClockIcon className="w-3.5 h-3.5" />
            Pending Registrar Review
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200">
            <SparklesIcon className="w-3.5 h-3.5" />
            Processing at Registrar
          </span>
        );
      case 'ready_for_pickup':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs">
            <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-600" />
            Ready for Pick-Up at Registrar&apos;s Office
          </span>
        );
      case 'claimed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-800 border border-indigo-200">
            <CheckCircleIcon className="w-3.5 h-3.5" />
            Released / Claimed
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
            <ExclamationTriangleIcon className="w-3.5 h-3.5" />
            Action Required / Returned
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200">
            Cancelled
          </span>
        );
      default:
        return null;
    }
  };

  const getStepIndex = (status: string) => {
    if (status === 'pending') return 1;
    if (status === 'processing') return 2;
    if (status === 'ready_for_pickup') return 3;
    if (status === 'claimed') return 4;
    return 0;
  };

  const minDateStr = new Date().toISOString().split('T')[0];

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      {/* Top Institutional Policy Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-[#1c2740] via-[#233354] to-[#1e3a5f] text-white p-5 sm:p-6 shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-500/20 border border-orange-400/30 text-orange-300 text-[11px] font-bold uppercase tracking-wider">
              <BuildingLibraryIcon className="w-3.5 h-3.5" />
              <span>CTU-Naga Registrar&apos;s Office Online Requisition</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              Official Alumni Document Request Portal
            </h1>
            <p className="text-xs sm:text-sm text-gray-200 leading-relaxed">
              Per institutional policy, all alumni must submit their document requests through this portal{' '}
              <span className="font-bold text-orange-300 underline decoration-orange-400/60">first</span> and wait for
              the <span className="font-semibold text-emerald-300">&ldquo;Ready for Pick-Up&rdquo;</span> notification
              before proceeding to the Registrar&apos;s Office window to claim their documents.
            </p>
          </div>

          {/* 4-Step Visual Workflow */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 shrink-0">
            {[
              { step: '1', title: 'Submit Online', sub: 'Select documents & purpose' },
              { step: '2', title: 'Registrar Review', sub: 'Verification & preparation' },
              { step: '3', title: 'Ready Notice', sub: 'Get Claim Reference Code' },
              { step: '4', title: 'Visit Registrar', sub: 'Present Claim Slip & ID' },
            ].map((s) => (
              <div
                key={s.step}
                className="bg-white/10 backdrop-blur-xs border border-white/15 rounded-xl p-2.5 text-left"
              >
                <div className="w-5 h-5 rounded-full bg-orange-500 text-white text-[11px] font-bold flex items-center justify-center mb-1">
                  {s.step}
                </div>
                <div className="text-xs font-bold text-white leading-tight">{s.title}</div>
                <div className="text-[10px] text-gray-300 mt-0.5 leading-snug">{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Submit Document Request Form */}
        <form
          onSubmit={handleSubmitRequest}
          className="lg:col-span-6 bg-white border border-gray-200 rounded-2xl p-5 shadow-2xs space-y-4"
        >
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <PlusIcon className="w-4 h-4 text-orange-600" />
                Submit New Document Request
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Check the official documents you need and specify the number of copies.
              </p>
            </div>
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-orange-50 text-orange-700 border border-orange-200">
              {Object.keys(selectedDocs).length} selected
            </span>
          </div>

          {/* Document Checklist */}
          <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
            {DOCUMENT_CATALOG.map((doc) => {
              const isSelected = Boolean(selectedDocs[doc.type]);
              const copies = selectedDocs[doc.type] || 1;
              return (
                <div
                  key={doc.type}
                  onClick={() => toggleDocSelection(doc.type)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-orange-50/60 border-orange-300 shadow-2xs'
                      : 'bg-gray-50/50 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="mt-0.5 rounded border-gray-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gray-900 leading-snug">{doc.type}</p>
                      <p className="text-[11px] text-gray-500 leading-snug mt-0.5">{doc.desc}</p>
                      <span className="inline-block mt-1 text-[10px] font-medium text-gray-400">
                        Est. Processing: {doc.processingDays}
                      </span>
                    </div>
                  </div>

                  {isSelected && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1.5 shrink-0 bg-white border border-orange-200 rounded-lg px-2 py-1"
                    >
                      <span className="text-[10px] font-semibold text-gray-600">Copies:</span>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={copies}
                        onChange={(e) => updateDocCopies(doc.type, parseInt(e.target.value, 10))}
                        className="w-11 text-center text-xs font-bold text-gray-900 border border-gray-200 rounded py-0.5 outline-none focus:border-orange-500"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Academic & Contact Verification Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                Student ID Number
              </label>
              <input
                type="text"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                placeholder="e.g. 1338411"
                className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                Contact Number
              </label>
              <input
                type="text"
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
                placeholder="e.g. 0917-XXX-XXXX"
                className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                Degree / Program Graduated
              </label>
              <input
                type="text"
                value={program}
                onChange={(e) => setProgram(e.target.value)}
                placeholder="e.g. BSIT / BEEd / BTLED"
                className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                Year Graduated
              </label>
              <input
                type="number"
                value={yearGraduated}
                onChange={(e) => setYearGraduated(e.target.value)}
                placeholder="e.g. 2024"
                className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg outline-none focus:border-orange-500"
              />
            </div>
          </div>

          {/* Purpose & Preferred Pick-Up Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                Purpose of Request <span className="text-red-500">*</span>
              </label>
              <select
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg outline-none focus:border-orange-500 bg-white"
              >
                {PURPOSE_OPTIONS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                Preferred Pick-Up Date (Optional)
              </label>
              <input
                type="date"
                min={minDateStr}
                value={preferredDate}
                onChange={(e) => setPreferredDate(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg outline-none focus:border-orange-500 bg-white"
              />
            </div>
          </div>

          {/* Special Remarks */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-700 mb-1">
              Special Instructions / Remarks for Registrar (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Please include remarks 'For LET Board Examination Purposes Only' or specify if an authorized representative will claim."
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg outline-none focus:border-orange-500 resize-none"
            />
          </div>

          <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200/70 flex items-start gap-2.5 text-[11px] text-blue-900">
            <InformationCircleIcon className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Once submitted, you will receive an official <strong>Claim Reference Code</strong>. Please wait for the
              Registrar&apos;s Office to mark your request as <strong>Ready for Pick-Up</strong> before going to the
              Registrar&apos;s Office window.
            </p>
          </div>

          <button
            type="submit"
            disabled={submitting || Object.keys(selectedDocs).length === 0}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white text-xs font-bold shadow-sm disabled:opacity-50 cursor-pointer transition-all flex items-center justify-center gap-2"
          >
            <ClipboardDocumentCheckIcon className="w-4 h-4" />
            <span>{submitting ? 'Submitting Request to Registrar...' : 'Submit Document Request'}</span>
          </button>
        </form>

        {/* Right Column: My Document Requests Tracker */}
        <div className="lg:col-span-6 space-y-3">
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-2xs">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <div>
                <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <DocumentTextIcon className="w-4 h-4 text-orange-600" />
                  My Registrar Document Requests
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Track real-time verification status and print your Registrar Claim Slip
                </p>
              </div>
              <button
                type="button"
                onClick={loadMyRequests}
                className="text-xs font-semibold text-orange-600 hover:text-orange-700 cursor-pointer"
              >
                Refresh
              </button>
            </div>

            {loading ? (
              <div className="py-12 text-center space-y-2">
                <div className="w-7 h-7 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs text-gray-500">Loading your Registrar document requests...</p>
              </div>
            ) : requests.length === 0 ? (
              <div className="py-12 px-4 text-center border border-dashed border-gray-200 rounded-xl bg-gray-50/50 space-y-2">
                <BuildingLibraryIcon className="w-9 h-9 text-gray-300 mx-auto" />
                <p className="text-xs font-semibold text-gray-700">No document requests submitted yet</p>
                <p className="text-[11px] text-gray-500 max-w-xs mx-auto">
                  Select your needed documents on the left form to generate your Registrar Claim Reference Code.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {requests.map((reqItem) => {
                  const stepIdx = getStepIndex(reqItem.status);
                  const isReady = reqItem.status === 'ready_for_pickup';

                  return (
                    <div
                      key={reqItem.id}
                      className={`rounded-xl border p-4 transition-all space-y-3 ${
                        isReady
                          ? 'bg-emerald-50/40 border-emerald-300 shadow-xs'
                          : 'bg-white border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-gray-900 text-white">
                              {reqItem.reference_code}
                            </span>
                            <span className="text-[11px] text-gray-400">
                              {new Date(reqItem.created_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </span>
                          </div>
                          <p className="text-xs font-bold text-gray-900 mt-1.5 leading-snug">
                            {reqItem.document_summary}
                          </p>
                          <p className="text-[11px] text-gray-500 mt-0.5">
                            Purpose: <span className="font-medium text-gray-700">{reqItem.purpose}</span>
                          </p>
                        </div>
                        {getStatusBadge(reqItem.status)}
                      </div>

                      {/* 4-Step Progress Bar for active requests */}
                      {stepIdx > 0 && (
                        <div className="pt-1">
                          <div className="grid grid-cols-4 gap-1.5">
                            {[
                              { idx: 1, label: 'Submitted' },
                              { idx: 2, label: 'Processing' },
                              { idx: 3, label: 'Ready at Registrar' },
                              { idx: 4, label: 'Claimed' },
                            ].map((st) => {
                              const active = stepIdx >= st.idx;
                              return (
                                <div key={st.idx} className="space-y-1">
                                  <div
                                    className={`h-1.5 rounded-full transition-colors ${
                                      active
                                        ? isReady && st.idx === 3
                                          ? 'bg-emerald-500'
                                          : 'bg-orange-500'
                                        : 'bg-gray-200'
                                    }`}
                                  />
                                  <p
                                    className={`text-[10px] font-semibold text-center ${
                                      active ? 'text-gray-800' : 'text-gray-400'
                                    }`}
                                  >
                                    {st.label}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Registrar Schedule & Remarks Notice */}
                      {(reqItem.pickup_schedule || reqItem.registrar_remarks || isReady) && (
                        <div
                          className={`p-3 rounded-xl border text-xs space-y-1 ${
                            isReady
                              ? 'bg-emerald-100/70 border-emerald-300 text-emerald-950'
                              : reqItem.status === 'rejected'
                              ? 'bg-red-50 border-red-200 text-red-900'
                              : 'bg-gray-50 border-gray-200 text-gray-700'
                          }`}
                        >
                          {isReady && (
                            <p className="font-bold text-emerald-800 flex items-center gap-1.5">
                              <CheckCircleIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                              You may now proceed to the Registrar&apos;s Office to claim your document(s)!
                            </p>
                          )}
                          {reqItem.pickup_schedule && (
                            <p className="text-[11px] flex items-center gap-1.5">
                              <CalendarDaysIcon className="w-3.5 h-3.5 shrink-0" />
                              <span>
                                <strong>Scheduled Pick-Up Date:</strong> {reqItem.pickup_schedule}
                              </span>
                            </p>
                          )}
                          {reqItem.pickup_window && isReady && (
                            <p className="text-[11px]">
                              <strong>Location / Window:</strong> {reqItem.pickup_window}
                            </p>
                          )}
                          {reqItem.registrar_remarks && (
                            <p className="text-[11px]">
                              <strong>Registrar Remarks:</strong> &ldquo;{reqItem.registrar_remarks}&rdquo;
                            </p>
                          )}
                        </div>
                      )}

                      {/* Footer Actions */}
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100">
                        <span className="text-[11px] text-gray-500">
                          {reqItem.status === 'pending'
                            ? 'Wait for Registrar approval before visiting campus'
                            : reqItem.status === 'processing'
                            ? 'Registrar is preparing your documents'
                            : reqItem.status === 'ready_for_pickup'
                            ? 'Present Claim Slip at the Registrar window'
                            : reqItem.processed_by
                            ? `Processed by ${reqItem.processed_by}`
                            : ''}
                        </span>
                        <div className="flex items-center gap-2">
                          {reqItem.status === 'pending' && (
                            <button
                              type="button"
                              disabled={cancellingId === reqItem.id}
                              onClick={() => handleCancelRequest(reqItem.id)}
                              className="px-2.5 py-1.5 text-[11px] font-semibold text-red-600 hover:bg-red-50 rounded-lg border border-red-200 cursor-pointer"
                            >
                              {cancellingId === reqItem.id ? 'Cancelling...' : 'Cancel'}
                            </button>
                          )}
                          {reqItem.status !== 'cancelled' && (
                            <button
                              type="button"
                              onClick={() => setSelectedClaimSlip(reqItem)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                                isReady
                                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs'
                                  : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                              }`}
                            >
                              <PrinterIcon className="w-3.5 h-3.5" />
                              <span>{isReady ? 'Open Official Claim Slip' : 'View Claim Pass'}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Printable Official Registrar Claim Slip Modal */}
      {selectedClaimSlip && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setSelectedClaimSlip(null)}
        >
          <div
            className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-lg w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 py-4 bg-gradient-to-r from-[#1c2740] to-[#283b63] text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <img src="/logo.png" alt="CTU" className="w-8 h-8 rounded-md bg-white p-0.5 object-contain" />
                <div>
                  <h3 className="text-sm font-bold">CTU-Naga Registrar&apos;s Office — Claim Slip</h3>
                  <p className="text-[11px] text-gray-300">Official Online Document Requisition Pass</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedClaimSlip(null)}
                className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              {/* Reference Code Banner */}
              <div className="p-4 rounded-xl bg-gray-50 border-2 border-dashed border-gray-300 flex items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    Official Claim Reference Code
                  </span>
                  <div className="text-lg font-mono font-extrabold text-gray-900 mt-0.5">
                    {selectedClaimSlip.reference_code}
                  </div>
                  <div className="mt-1">{getStatusBadge(selectedClaimSlip.status)}</div>
                </div>
                <div className="w-14 h-14 rounded-xl bg-white border border-gray-200 flex flex-col items-center justify-center text-gray-700 shrink-0 shadow-2xs">
                  <QrCodeIcon className="w-8 h-8 text-gray-800" />
                  <span className="text-[8px] font-mono font-bold text-gray-400">VERIFIED</span>
                </div>
              </div>

              {/* Alumni & Document Details */}
              <div className="grid grid-cols-2 gap-3 text-xs bg-white border border-gray-200 rounded-xl p-3.5">
                <div>
                  <span className="text-[10px] text-gray-400 font-semibold uppercase">Alumni Name</span>
                  <p className="font-bold text-gray-900 mt-0.5">{selectedClaimSlip.alumni_name}</p>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 font-semibold uppercase">Student ID</span>
                  <p className="font-semibold text-gray-800 mt-0.5">
                    {selectedClaimSlip.student_id || 'On File'}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 font-semibold uppercase">Program &amp; Batch</span>
                  <p className="font-semibold text-gray-800 mt-0.5">
                    {selectedClaimSlip.program || 'CTU Graduate'}{' '}
                    {selectedClaimSlip.year_graduated ? `(${selectedClaimSlip.year_graduated})` : ''}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 font-semibold uppercase">Scheduled Pick-Up</span>
                  <p className="font-bold text-emerald-700 mt-0.5">
                    {selectedClaimSlip.pickup_schedule || 'Await Ready Notice'}
                  </p>
                </div>
                <div className="col-span-2 pt-2 border-t border-gray-100">
                  <span className="text-[10px] text-gray-400 font-semibold uppercase">Requested Document(s)</span>
                  <p className="font-bold text-gray-900 mt-0.5">{selectedClaimSlip.document_summary}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-[10px] text-gray-400 font-semibold uppercase">Purpose</span>
                  <p className="font-medium text-gray-700 mt-0.5">{selectedClaimSlip.purpose}</p>
                </div>
                {selectedClaimSlip.registrar_remarks && (
                  <div className="col-span-2 pt-2 border-t border-gray-100">
                    <span className="text-[10px] text-orange-600 font-bold uppercase">
                      Registrar Window Remarks
                    </span>
                    <p className="font-medium text-gray-800 mt-0.5">{selectedClaimSlip.registrar_remarks}</p>
                  </div>
                )}
              </div>

              {/* Instructions Notice */}
              <div
                className={`p-3 rounded-xl border text-[11px] leading-relaxed ${
                  selectedClaimSlip.status === 'ready_for_pickup'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-amber-50 border-amber-200 text-amber-900'
                }`}
              >
                {selectedClaimSlip.status === 'ready_for_pickup' ? (
                  <>
                    <strong>✅ Approved for Pick-Up:</strong> Present this Claim Slip (printed or on your phone) along
                    with a <strong>Valid Government / Alumni ID</strong> at{' '}
                    <strong>{selectedClaimSlip.pickup_window || "the Registrar's Office Window"}</strong>.
                  </>
                ) : (
                  <>
                    <strong>⏳ Important Reminder:</strong> Your request is currently{' '}
                    <span className="font-bold uppercase">{selectedClaimSlip.status}</span>. Please wait until the
                    status changes to <strong>&ldquo;Ready for Pick-Up&rdquo;</strong> before proceeding to the
                    Registrar&apos;s Office.
                  </>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setSelectedClaimSlip(null)}
                  className="px-3.5 py-2 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-xl shadow-xs cursor-pointer"
                >
                  <PrinterIcon className="w-4 h-4" />
                  <span>Print Claim Slip</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
