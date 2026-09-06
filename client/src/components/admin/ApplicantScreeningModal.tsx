import { useState, useEffect, useCallback, useRef } from 'react';
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import * as XLSX from 'xlsx';
import {
  XMarkIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ArrowDownTrayIcon,
  CloudArrowUpIcon,
  CheckIcon,
  FunnelIcon,
  UserIcon,
  TableCellsIcon,
  PaperClipIcon,
  ArrowPathIcon,
  SparklesIcon,
  BuildingOffice2Icon,
  DocumentArrowUpIcon,
  CheckBadgeIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { adminApi } from '@/services/api';
import { useUIStore } from '@/store/uiStore';
import { formatProgramLongName } from '@/utils/formatProgram';

function MatchBar({ pct, label = 'Match Score' }: { pct: number | null | undefined; label?: string }) {
  if (pct === null || pct === undefined) return null;
  const clamped = Math.min(100, Math.max(0, Math.round(Number(pct) || 0)));
  const color = clamped >= 80 ? 'bg-green-500' : clamped >= 50 ? 'bg-amber-500' : 'bg-gray-400';
  const textColor = clamped >= 80 ? 'text-green-600' : clamped >= 50 ? 'text-amber-600' : 'text-gray-500';
  return (
    <div className="mt-1">
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[11px] text-gray-500 font-medium">{label}</span>
        <span className={`text-xs font-bold ${textColor}`}>{clamped}%</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ease-out ${color}`} style={{ width: `${clamped}%` }} />
      </div>
    </div>
  );
}

function CompanyDecisionBadge({ status }: { status?: string }) {
  if (!status || status === 'pending' || status === 'under_review') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
        Awaiting Company Decision
      </span>
    );
  }
  if (status === 'hired' || status === 'accepted') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        Hired by Company
      </span>
    );
  }
  if (status === 'shortlisted' || status === 'screened') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
        <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
        Shortlisted
      </span>
    );
  }
  if (status === 'rejected') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
        <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
        Not Selected
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-700 capitalize">
      {status.replace('_', ' ')}
    </span>
  );
}

interface ParsedDecisionRow {
  email: string;
  name: string;
  applicantId?: string;
  rawDecision: string;
  normalizedStatus: 'hired' | 'shortlisted' | 'rejected' | 'under_review' | 'pending';
  remarks?: string;
  matchedApplicant?: any;
}

function normalizeDecisionStatus(val: string): 'hired' | 'shortlisted' | 'rejected' | 'under_review' | 'pending' {
  const s = String(val || '').toLowerCase().trim();
  if (s.includes('hire') || s.includes('accept') || s.includes('passed') || s.includes('employed') || s === 'hired')
    return 'hired';
  if (s.includes('shortlist') || s.includes('interview') || s.includes('qualif') || s === 'shortlisted')
    return 'shortlisted';
  if (s.includes('reject') || s.includes('not select') || s.includes('decline') || s.includes('fail') || s.includes('denied') || s === 'rejected')
    return 'rejected';
  if (s.includes('pending') || s.includes('hold') || s.includes('wait'))
    return 'pending';
  return 'under_review';
}

interface ApplicantScreeningModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: string;
  jobPosition: string;
  jobCompany?: string;
  requiredSkills?: string[];
}

export default function ApplicantScreeningModal({
  isOpen,
  onClose,
  jobId,
  jobPosition,
  jobCompany,
  requiredSkills = [],
}: ApplicantScreeningModalProps) {
  const [applicants, setApplicants] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [matchedSkills, setMatchedSkills] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [batchFilter, setBatchFilter] = useState<string>('');
  const [decisionFilter, setDecisionFilter] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const addNotification = useUIStore((s) => s.addNotification);

  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [parsedDecisions, setParsedDecisions] = useState<ParsedDecisionRow[] | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [companyFiles, setCompanyFiles] = useState<any[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  const selected = applicants.find((a) => a.id === selectedId) || null;

  const availableBatches = Array.from(
    new Set(applicants.map((a) => a.batch_year).filter(Boolean))
  ).sort((a: any, b: any) => Number(b) - Number(a));

  const filteredApplicants = applicants.filter((a) => {
    if (batchFilter && a.batch_year !== batchFilter) return false;
    if (decisionFilter) {
      if (decisionFilter === 'hired' && a.status !== 'hired' && a.status !== 'accepted') return false;
      if (decisionFilter === 'shortlisted' && a.status !== 'shortlisted') return false;
      if (decisionFilter === 'rejected' && a.status !== 'rejected') return false;
      if (decisionFilter === 'pending' && a.status !== 'pending' && a.status !== 'under_review') return false;
    }
    return true;
  });

  const fetchApplicants = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res: any = await adminApi.jobApplicants(jobId);
      const list = Array.isArray(res?.applicants) ? res.applicants : Array.isArray(res) ? res : [];
      setApplicants(list);
      if (list.length > 0 && !selectedId) {
        setSelectedId(list[0].id);
      }
    } catch {
      setError('Failed to load applicants.');
    } finally {
      setLoading(false);
    }
  }, [jobId, selectedId]);

  const fetchCompanyFiles = useCallback(async () => {
    setLoadingFiles(true);
    try {
      const files = await adminApi.getCompanyFiles(jobId);
      setCompanyFiles(Array.isArray(files) ? files : []);
    } catch {
      setCompanyFiles([]);
    } finally {
      setLoadingFiles(false);
    }
  }, [jobId]);

  useEffect(() => {
    if (isOpen && jobId) {
      fetchApplicants();
      fetchCompanyFiles();
      setSelectedId(null);
      setMatchedSkills([]);
      setNotes('');
      setBatchFilter('');
      setDecisionFilter('');
      setUploadedFile(null);
      setParsedDecisions(null);
    }
  }, [isOpen, jobId]);

  useEffect(() => {
    if (selected) {
      const skills = (selected.matched_skills || []).filter((s: string) =>
        requiredSkills.length === 0 || requiredSkills.includes(s)
      );
      setMatchedSkills(Array.from(new Set(skills)));
      setNotes(selected.screening_notes || '');
    } else {
      setMatchedSkills([]);
      setNotes('');
    }
  }, [selectedId, requiredSkills]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setExportDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleSkill = (skill: string) => {
    setMatchedSkills((prev) => {
      const exists = prev.includes(skill);
      const next = exists ? prev.filter((s) => s !== skill) : [...prev, skill];
      return Array.from(new Set(next));
    });
  };

  const handleSkip = () => {
    const list = filteredApplicants.length > 0 ? filteredApplicants : applicants;
    const idx = list.findIndex((a) => a.id === selectedId);
    if (idx >= 0 && idx < list.length - 1) {
      setSelectedId(list[idx + 1].id);
    } else if (list.length > 0) {
      setSelectedId(list[0].id);
    }
  };

  const matchedCount = matchedSkills.filter((s) => requiredSkills.includes(s)).length;

  const liveSkillsScore = requiredSkills.length > 0
    ? Math.min(100, Math.max(0, Math.round((matchedCount / requiredSkills.length) * 100)))
    : 100;

  const liveExperienceScore = selected
    ? Math.min(100, Math.max(0, Math.round(Number(selected.experience_score ?? selected.experience_match_score ?? 100))))
    : 100;

  const liveEducationScore = selected
    ? Math.min(100, Math.max(0, Math.round(Number(selected.education_score ?? selected.education_match_score ?? 100))))
    : 100;

  const liveOverallScore = Math.min(
    100,
    Math.max(
      0,
      Math.round(
        liveSkillsScore * 0.50 +
        liveExperienceScore * 0.30 +
        liveEducationScore * 0.20
      )
    )
  );

  const handleSaveScreening = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const updated: any = await adminApi.screenApplication(selected.id, {
        matched_skills: matchedSkills,
        screening_notes: notes || undefined,
        skills_match_score: liveSkillsScore,
        experience_match_score: liveExperienceScore,
        education_match_score: liveEducationScore,
        overall_match_score: liveOverallScore,
      });
      setApplicants((prev) =>
        prev.map((a) =>
          a.id === selected.id
            ? {
                ...a,
                matched_skills: updated.matched_skills || matchedSkills,
                missing_skills: updated.missing_skills || [],
                match_percentage: liveOverallScore,
                overall_match_score: liveOverallScore,
                overall_score: liveOverallScore,
                skills_match_score: liveSkillsScore,
                skills_score: liveSkillsScore,
                experience_match_score: liveExperienceScore,
                experience_score: liveExperienceScore,
                education_match_score: liveEducationScore,
                education_score: liveEducationScore,
                screening_notes: updated.screening_notes || notes,
                is_screened: true,
              }
            : a
        )
      );
      addNotification('Applicant qualification verified and match score saved', 'success');
    } catch {
      addNotification('Failed to save screening match', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleExportReport = async (format: 'xlsx' | 'csv' = 'xlsx') => {
    setExportDropdownOpen(false);
    const safeName = jobPosition.replace(/[^a-zA-Z0-9]/g, '_');

    if (format === 'xlsx') {
      try {
        const rows = applicants.map((a) => ({
          'Applicant Name': a.applicant_name || 'Applicant',
          'Email Address': a.applicant_email || '',
          'Batch Year': a.batch_year ? `Batch ${a.batch_year}` : '',
          'Program / Degree': a.program ? (formatProgramLongName(a.program) || a.program) : '',
          'Match Score': a.match_percentage != null ? `${a.match_percentage}%` : 'Not Evaluated',
          'Matched Skills': (a.matched_skills || []).join(', '),
          'Missing Skills': (a.missing_skills || []).join(', '),
          'University Screening Notes': a.screening_notes || '',
          'Resume URL': a.resume_url || 'N/A',
          'Applied Date': a.applied_at ? new Date(a.applied_at).toLocaleDateString() : '',
          'Company Hiring Decision (Hired / Shortlisted / Rejected / Interview)':
            a.status && a.status !== 'pending' && a.status !== 'under_review' ? a.status.toUpperCase() : '',
          'Company Remarks': '',
        }));

        const ws = XLSX.utils.json_to_sheet(rows);
        ws['!cols'] = [
          { wch: 24 },
          { wch: 28 },
          { wch: 14 },
          { wch: 30 },
          { wch: 14 },
          { wch: 30 },
          { wch: 25 },
          { wch: 35 },
          { wch: 35 },
          { wch: 14 },
          { wch: 40 },
          { wch: 35 },
        ];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Candidates');
        XLSX.writeFile(wb, `candidate_referral_${safeName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
        addNotification('Candidate referral spreadsheet (.xlsx) exported successfully', 'success');
      } catch {
        addNotification('Failed to generate Excel report', 'error');
      }
    } else {
      try {
        const res = await adminApi.exportApplicants(jobId, 'csv');
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `candidate_referral_${safeName}_${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        addNotification('Candidate referral report (.csv) exported successfully', 'success');
      } catch {
        addNotification('Failed to export CSV report', 'error');
      }
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFile(file);
    setParsedDecisions(null);

    const isSpreadsheet = /\.(xlsx|xls|csv)$/i.test(file.name);

    if (isSpreadsheet) {
      setIsProcessingFile(true);
      try {
        const buffer = await file.arrayBuffer();
        const wb = XLSX.read(buffer, { type: 'array' });
        const firstSheet = wb.Sheets[wb.SheetNames[0]];
        const jsonRows: Record<string, any>[] = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });

        const parsed: ParsedDecisionRow[] = [];

        for (const row of jsonRows) {
          const keys = Object.keys(row);
          const emailKey = keys.find((k) => /email/i.test(k));
          const nameKey = keys.find((k) => /name/i.test(k) && !/company/i.test(k));
          const idKey = keys.find((k) => /^id$|applicant.*id|application.*id/i.test(k));
          const decisionKey = keys.find(
            (k) => /decision|status|outcome|result|hiring/i.test(k) && !/previous/i.test(k)
          );
          const remarksKey = keys.find(
            (k) => /remark|note|feedback|comment|reason/i.test(k) && !/university/i.test(k)
          );

          const email = emailKey ? String(row[emailKey]).trim() : '';
          const name = nameKey ? String(row[nameKey]).trim() : '';
          const applicantId = idKey ? String(row[idKey]).trim() : '';
          const rawDecision = decisionKey ? String(row[decisionKey]).trim() : '';
          const remarks = remarksKey ? String(row[remarksKey]).trim() : '';

          if (!rawDecision && !email && !name) continue;

          const matched = applicants.find((a) => {
            if (applicantId && String(a.id).toLowerCase() === applicantId.toLowerCase()) return true;
            if (email && a.applicant_email && a.applicant_email.toLowerCase() === email.toLowerCase()) return true;
            if (name && a.applicant_name && a.applicant_name.toLowerCase() === name.toLowerCase()) return true;
            return false;
          });

          parsed.push({
            email: email || matched?.applicant_email || '',
            name: name || matched?.applicant_name || 'Candidate',
            applicantId: matched?.id || applicantId,
            rawDecision: rawDecision || 'Pending',
            normalizedStatus: normalizeDecisionStatus(rawDecision),
            remarks,
            matchedApplicant: matched || null,
          });
        }

        setParsedDecisions(parsed);
      } catch (err: any) {
        addNotification(err?.message || 'Could not parse spreadsheet', 'error');
      } finally {
        setIsProcessingFile(false);
      }
    }
  };

  const handleApplyDecisions = async () => {
    if (!parsedDecisions || parsedDecisions.length === 0) return;
    setIsProcessingFile(true);
    try {
      const decisionsPayload = parsedDecisions.map((p) => ({
        email: p.email,
        name: p.name,
        id: p.applicantId,
        status: p.normalizedStatus,
        remarks: p.remarks,
      }));

      const res = await adminApi.importCompanyDecisions(jobId, { decisions: decisionsPayload });

      if (uploadedFile) {
        const formData = new FormData();
        formData.append('file', uploadedFile);
        try {
          await adminApi.uploadCompanyFile(jobId, formData);
        } catch {}
      }

      addNotification(res?.message || 'Company hiring decisions applied successfully!', 'success');
      setUploadedFile(null);
      setParsedDecisions(null);
      setUploadModalOpen(false);
      await fetchApplicants();
      await fetchCompanyFiles();
    } catch (err: any) {
      addNotification(err?.message || 'Failed to apply company decisions', 'error');
    } finally {
      setIsProcessingFile(false);
    }
  };

  const handleUploadDocument = async () => {
    if (!uploadedFile) return;
    setIsProcessingFile(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadedFile);
      const res = await adminApi.uploadCompanyFile(jobId, formData);
      addNotification(res?.message || `Attached ${uploadedFile.name} successfully`, 'success');
      setUploadedFile(null);
      setUploadModalOpen(false);
      await fetchCompanyFiles();
    } catch (err: any) {
      addNotification(err?.message || 'Failed to upload document', 'error');
    } finally {
      setIsProcessingFile(false);
    }
  };

  const handleDeleteCompanyFile = async (fileId: string) => {
    try {
      await adminApi.deleteCompanyFile(jobId, fileId);
      addNotification('Company file removed.', 'success');
      await fetchCompanyFiles();
    } catch (err: any) {
      addNotification(err?.message || 'Failed to remove file', 'error');
    }
  };

  const screenedCount = applicants.filter((a) => a.is_screened).length;
  const hiredCount = applicants.filter((a) => a.status === 'hired' || a.status === 'accepted').length;
  const shortlistedCount = applicants.filter((a) => a.status === 'shortlisted').length;

  return (
    <>
      <Transition show={isOpen}>
        <Dialog onClose={onClose} className="relative z-50">
          <TransitionChild
            enter="ease-out duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/50" />
          </TransitionChild>

          <div className="fixed inset-0 overflow-hidden">
            <div className="flex min-h-full items-center justify-center p-3 sm:p-4">
              <TransitionChild
                enter="ease-out duration-200"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-150"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <DialogPanel
                  className="w-full max-w-6xl bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-100"
                  style={{ height: '88vh' }}
                >
                  <div className="flex items-center justify-between px-5 py-3.5 shrink-0 bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 text-white">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-xs">
                        <FunnelIcon className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <DialogTitle className="text-sm font-bold text-white flex items-center gap-2">
                          <span>Candidate Referral & Screening</span>
                          {jobCompany && (
                            <span className="text-xs font-normal text-orange-100 bg-white/15 px-2 py-0.5 rounded-md">
                              {jobCompany}
                            </span>
                          )}
                        </DialogTitle>
                        <p className="text-[11px] text-orange-100 mt-0.5">
                          {jobPosition} · {screenedCount}/{applicants.length} screened by admin
                          {hiredCount > 0 && <span className="ml-1.5 font-bold text-white">· {hiredCount} hired</span>}
                          {shortlistedCount > 0 && <span className="ml-1 text-orange-100">· {shortlistedCount} shortlisted</span>}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="relative" ref={exportMenuRef}>
                        <button
                          type="button"
                          onClick={() => setExportDropdownOpen((v) => !v)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white text-orange-700 rounded-lg hover:bg-orange-50 transition-all shadow-xs cursor-pointer"
                        >
                          <ArrowDownTrayIcon className="w-3.5 h-3.5" />
                          <span>Export for Company</span>
                        </button>
                        {exportDropdownOpen && (
                          <div className="absolute right-0 top-full mt-1.5 w-52 bg-white rounded-xl shadow-xl border border-gray-200 py-1 z-50 text-gray-800 animate-fade-in">
                            <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100">
                              Referral Report Formats
                            </div>
                            <button
                              onClick={() => handleExportReport('xlsx')}
                              className="w-full text-left px-3 py-2 text-xs hover:bg-orange-50 hover:text-orange-700 flex items-center gap-2 transition-colors cursor-pointer"
                            >
                              <TableCellsIcon className="w-4 h-4 text-emerald-600" />
                              <div>
                                <p className="font-semibold leading-tight">Excel Spreadsheet (.xlsx)</p>
                                <p className="text-[10px] text-gray-400">Formatted for employer evaluation</p>
                              </div>
                            </button>
                            <button
                              onClick={() => handleExportReport('csv')}
                              className="w-full text-left px-3 py-2 text-xs hover:bg-orange-50 hover:text-orange-700 flex items-center gap-2 transition-colors cursor-pointer"
                            >
                              <DocumentTextIcon className="w-4 h-4 text-blue-600" />
                              <div>
                                <p className="font-semibold leading-tight">CSV File (.csv)</p>
                                <p className="text-[10px] text-gray-400">Universal spreadsheet data</p>
                              </div>
                            </button>
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => setUploadModalOpen(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white/20 hover:bg-white/30 text-white border border-white/30 rounded-lg transition-all shadow-xs cursor-pointer"
                        title="Upload company's returned Excel report or decision document"
                      >
                        <CloudArrowUpIcon className="w-4 h-4" />
                        <span>Upload Company File</span>
                        {companyFiles.length > 0 && (
                          <span className="ml-1 px-1.5 py-0.2 rounded-full bg-white/25 text-[10px] font-bold">
                            {companyFiles.length}
                          </span>
                        )}
                      </button>

                      <button
                        onClick={onClose}
                        className="p-1.5 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors cursor-pointer ml-1"
                      >
                        <XMarkIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <div className="bg-amber-50/70 border-b border-amber-200/80 px-5 py-2 flex items-center justify-between text-xs text-amber-900 gap-3 shrink-0">
                    <div className="flex items-center gap-2">
                      <SparklesIcon className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>
                        <strong>Admin Role:</strong> Review candidate qualifications & match scores, then click{' '}
                        <strong>"Export for Company"</strong> to give the candidate report to the employer. The employer
                        decides who to hire and returns their decision file.
                      </span>
                    </div>
                    <button
                      onClick={() => setUploadModalOpen(true)}
                      className="text-xs font-semibold text-orange-700 hover:text-orange-900 underline shrink-0 cursor-pointer"
                    >
                      Upload company returned file &rarr;
                    </button>
                  </div>

                  <div className="flex-1 flex overflow-hidden">
                    <div className="w-[38%] border-r border-gray-200 flex flex-col overflow-hidden bg-gray-50/30">
                      <div className="p-2.5 border-b border-gray-200 bg-white flex items-center gap-2 shrink-0">
                        <select
                          value={batchFilter}
                          onChange={(e) => setBatchFilter(e.target.value)}
                          className="text-[11px] border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 outline-none flex-1 focus:border-orange-500 font-medium"
                        >
                          <option value="">All Batches</option>
                          {availableBatches.map((b) => (
                            <option key={String(b)} value={String(b)}>
                              Batch {String(b)}
                            </option>
                          ))}
                        </select>
                        <select
                          value={decisionFilter}
                          onChange={(e) => setDecisionFilter(e.target.value)}
                          className="text-[11px] border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 outline-none flex-1 focus:border-orange-500 font-medium"
                        >
                          <option value="">All Outcomes</option>
                          <option value="pending">Awaiting Decision</option>
                          <option value="hired">Hired by Company</option>
                          <option value="shortlisted">Shortlisted</option>
                          <option value="rejected">Not Selected</option>
                        </select>
                      </div>

                      <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
                        {loading ? (
                          <div className="p-2.5 space-y-2">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <div key={i} className="p-3 bg-white border border-gray-100 rounded-xl space-y-2 animate-pulse">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-lg bg-gray-200 shrink-0" />
                                  <div className="flex-1 space-y-1">
                                    <div className="h-3 bg-gray-200 rounded w-3/4" />
                                    <div className="h-2 bg-gray-100 rounded w-1/2" />
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="h-2.5 bg-gray-100 rounded w-12" />
                                  <div className="h-3.5 bg-gray-100 rounded-full w-20" />
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : error ? (
                          <div className="p-3">
                            <div className="bg-red-50 text-red-700 px-3 py-2 rounded-lg text-xs">{error}</div>
                          </div>
                        ) : filteredApplicants.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                            <UserIcon className="w-8 h-8 mb-2 text-gray-300" />
                            <p className="text-xs">
                              {applicants.length === 0 ? 'No applicants found.' : 'No matching applicants.'}
                            </p>
                          </div>
                        ) : (
                          filteredApplicants.map((app) => {
                            const isActive = app.id === selectedId;
                            const initials = (app.applicant_name || 'A')
                              .split(' ')
                              .map((w: string) => w[0])
                              .join('')
                              .slice(0, 2)
                              .toUpperCase();
                            const rawScore = app.overall_score ?? app.overall_match_score ?? app.match_percentage;
                            const score = rawScore != null ? Math.min(100, Math.max(0, Math.round(Number(rawScore) || 0))) : null;
                            return (
                              <button
                                key={app.id}
                                onClick={() => setSelectedId(app.id)}
                                className={`w-full text-left px-3.5 py-3 transition-all cursor-pointer ${
                                  isActive
                                    ? 'bg-orange-50/70 border-l-4 border-l-orange-500'
                                    : 'hover:bg-gray-50 border-l-4 border-l-transparent'
                                }`}
                              >
                                <div className="flex items-start gap-2.5">
                                  <div
                                    className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 ${
                                      app.is_screened ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
                                    }`}
                                  >
                                    {initials}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <p
                                        className={`text-xs font-bold truncate ${
                                          isActive ? 'text-orange-900' : 'text-gray-900'
                                        }`}
                                      >
                                        {app.applicant_name || 'Applicant'}
                                      </p>
                                      {app.is_screened && (
                                        <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" title="Qualifications verified by admin" />
                                      )}
                                    </div>
                                    <p className="text-[10px] text-gray-400 truncate">{app.applicant_email}</p>
                                    {(app.batch_year || app.program) && (
                                        <p className="text-[10px] text-gray-500 truncate mt-0.5">
                                          {app.batch_year ? `Batch ${app.batch_year}` : ''}
                                          {app.batch_year && app.program ? ' · ' : ''}
                                          {formatProgramLongName(app.program) || app.program || ''}
                                        </p>
                                      )}
                                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                      {score != null && (
                                        <span
                                          className={`text-[10px] font-bold ${
                                            score >= 80
                                              ? 'text-emerald-700'
                                              : score >= 50
                                              ? 'text-amber-700'
                                              : 'text-gray-500'
                                          }`}
                                        >
                                          {score}% Match
                                        </span>
                                      )}
                                      <CompanyDecisionBadge status={app.status} />
                                    </div>
                                  </div>
                                </div>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>

                    <div className="w-[62%] flex flex-col overflow-hidden bg-white">
                      {loading ? (
                        <div className="p-6 space-y-5 animate-pulse overflow-y-auto">
                          <div className="flex items-start gap-3 pb-4 border-b border-gray-100">
                            <div className="w-12 h-12 rounded-xl bg-gray-200 shrink-0" />
                            <div className="space-y-2 flex-1">
                              <div className="h-4 bg-gray-200 rounded w-1/3" />
                              <div className="h-3 bg-gray-100 rounded w-1/4" />
                              <div className="h-2.5 bg-gray-100 rounded w-1/2" />
                            </div>
                          </div>
                          <div className="space-y-3">
                            <div className="h-3.5 bg-gray-200 rounded w-28" />
                            <div className="grid grid-cols-2 gap-3">
                              <div className="h-16 bg-gray-100 rounded-xl" />
                              <div className="h-16 bg-gray-100 rounded-xl" />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="h-3.5 bg-gray-200 rounded w-32" />
                            <div className="h-24 bg-gray-100 rounded-xl" />
                          </div>
                        </div>
                      ) : !selected ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-3">
                          <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center border border-gray-100">
                            <UserIcon className="w-8 h-8 text-gray-300" />
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-semibold text-gray-600">Select an applicant</p>
                            <p className="text-[11px] text-gray-400 mt-0.5">
                              Verify their skills and qualification match for this position
                            </p>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="px-6 py-4 border-b border-gray-100 shrink-0 bg-gray-50/40">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-start gap-3">
                                <div
                                  className={`w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${
                                    selected.is_screened
                                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                      : 'bg-gray-100 text-gray-600'
                                  }`}
                                >
                                  {(selected.applicant_name || 'A')
                                    .split(' ')
                                    .map((w: string) => w[0])
                                    .join('')
                                    .slice(0, 2)
                                    .toUpperCase()}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="text-sm font-bold text-gray-900">
                                      {selected.applicant_name || 'Applicant'}
                                    </h3>
                                    <CompanyDecisionBadge status={selected.status} />
                                  </div>
                                  <p className="text-[11px] text-gray-500 mt-0.5">{selected.applicant_email}</p>
                                  {(selected.batch_year || selected.program) && (
                                     <p className="text-[11px] font-medium text-gray-600 mt-0.5">
                                       {selected.batch_year ? `Batch ${selected.batch_year}` : ''}
                                       {selected.batch_year && selected.program ? ' · ' : ''}
                                       {formatProgramLongName(selected.program) || selected.program || ''}
                                     </p>
                                   )}
                                  <p className="text-[10px] text-gray-400 mt-0.5">
                                    Applied on{' '}
                                    {new Date(selected.applied_at).toLocaleDateString('en-US', {
                                      month: 'long',
                                      day: 'numeric',
                                      year: 'numeric',
                                    })}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {selected.resume_url ? (
                                  <a
                                    href={selected.resume_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors shadow-xs"
                                  >
                                    <DocumentTextIcon className="w-3.5 h-3.5" />
                                    <span>View Resume</span>
                                  </a>
                                ) : (
                                  <span className="text-[10px] text-gray-400 italic">No resume attached</span>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 pt-3 border-t border-gray-200/80">
                              <MatchBar
                                pct={liveOverallScore}
                                label="Overall Match"
                              />
                              <MatchBar
                                pct={liveSkillsScore}
                                label="Skills (50%)"
                              />
                              <MatchBar
                                pct={liveExperienceScore}
                                label="Experience (30%)"
                              />
                              <MatchBar
                                pct={liveEducationScore}
                                label="Education (20%)"
                              />
                            </div>
                          </div>

                          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                            {selected.screening_notes?.includes('[Company Decision') && (
                              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-900 shadow-2xs">
                                <p className="font-bold text-emerald-800 flex items-center gap-1.5">
                                  <BuildingOffice2Icon className="w-4 h-4 text-emerald-600" />
                                  <span>Employer Decision & Feedback:</span>
                                </p>
                                <p className="whitespace-pre-line text-emerald-950 mt-1 font-medium">
                                  {selected.screening_notes
                                    .split('[Company Decision')
                                    .pop()
                                    ?.replace(/^ - [^\]]+\]: /, '')}
                                </p>
                              </div>
                            )}

                            {selected.cover_letter && (
                              <div>
                                <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                                  Candidate Statement / Cover Letter
                                </h4>
                                <div className="text-xs text-gray-700 bg-gray-50 rounded-xl p-3.5 whitespace-pre-line leading-relaxed border border-gray-200/70">
                                  {selected.cover_letter}
                                </div>
                              </div>
                            )}

                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                                  Job Requirements vs Alumni Skills
                                </h4>
                                {requiredSkills.length > 0 && (
                                  <span
                                    className={`text-[11px] font-bold ${
                                      matchedCount === requiredSkills.length
                                        ? 'text-emerald-600'
                                        : matchedCount > 0
                                        ? 'text-amber-600'
                                        : 'text-gray-400'
                                    }`}
                                  >
                                    {matchedCount}/{requiredSkills.length} Verified
                                  </span>
                                )}
                              </div>
                              {requiredSkills.length === 0 ? (
                                <p className="text-xs text-gray-400 italic">No required skills defined for this job.</p>
                              ) : (
                                <div className="grid grid-cols-2 gap-2">
                                  {requiredSkills.map((skill) => {
                                    const checked = matchedSkills.includes(skill);
                                    const breakdownItem = selected.skills_breakdown?.find(
                                      (b: any) => b.skill.toLowerCase() === skill.toLowerCase()
                                    );
                                    const breakdownStatus = breakdownItem?.status;
                                    const indicator = checked
                                      ? breakdownStatus === 'partial'
                                        ? '⚠️'
                                        : '✅'
                                      : '❌';

                                    return (
                                      <button
                                        key={skill}
                                        type="button"
                                        onClick={() => toggleSkill(skill)}
                                        className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border text-left transition-all cursor-pointer ${
                                          checked
                                            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900 shadow-2xs'
                                            : 'bg-white border-gray-200 hover:border-gray-300 text-gray-700'
                                        }`}
                                      >
                                        <div
                                          className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 transition-colors ${
                                            checked ? 'bg-emerald-600 text-white' : 'border-2 border-gray-300'
                                          }`}
                                        >
                                          {checked && <CheckIcon className="w-2.5 h-2.5 stroke-[3]" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center justify-between gap-1">
                                            <span className="text-xs font-semibold truncate">{skill}</span>
                                            <span className="text-xs">{indicator}</span>
                                          </div>
                                          {breakdownItem?.alumniSkill && breakdownStatus === 'partial' && (
                                            <p className="text-[10px] text-amber-700 truncate mt-0.5">
                                              Alumni: {breakdownItem.alumniSkill}
                                            </p>
                                          )}
                                        </div>
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>

                            {selected.missing_skills && selected.missing_skills.length > 0 && (
                              <div>
                                <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                                  Identified Skill Gaps
                                </h4>
                                <div className="flex flex-wrap gap-1.5">
                                  {selected.missing_skills.map((skill: string) => (
                                    <span
                                      key={skill}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium bg-red-50 text-red-700 border border-red-200/80"
                                    >
                                      <span className="w-1 h-1 rounded-full bg-red-500" />
                                      {skill}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            <div>
                              <div className="flex items-center justify-between mb-1.5">
                                <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                                  University Screening Notes & Observations
                                </h4>
                                <span className="text-[10px] text-gray-400">{notes.length}/500</span>
                              </div>
                              <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value.slice(0, 500))}
                                placeholder="Add observations about candidate match, endorsements, or interview preparation for the employer..."
                                rows={4}
                                className="text-xs border border-gray-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 w-full resize-none transition-all leading-relaxed"
                              />
                              <p className="text-[10px] text-gray-400 mt-1">
                                These notes are included in the candidate referral report exported for the company.
                              </p>
                            </div>
                          </div>

                          <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 shrink-0 flex items-center justify-between gap-4">
                            <div className="text-xs text-gray-500 flex items-center gap-1.5">
                              {selected.is_screened ? (
                                <span className="text-emerald-700 font-semibold flex items-center gap-1">
                                  <CheckBadgeIcon className="w-4 h-4 text-emerald-600" /> Verified by University Admin
                                </span>
                              ) : (
                                <span className="text-gray-400 italic">Not yet verified</span>
                              )}
                              <span className="text-gray-300">·</span>
                              <span>Hiring decisions are made by employer</span>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={handleSkip}
                                className="px-3.5 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
                              >
                                Skip
                              </button>
                              <button
                                type="button"
                                onClick={handleSaveScreening}
                                disabled={saving}
                                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-orange-600 hover:bg-orange-700 text-white rounded-xl disabled:opacity-50 transition-colors shadow-xs cursor-pointer"
                              >
                                {saving ? (
                                  <>
                                    <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
                                    <span>Saving...</span>
                                  </>
                                ) : (
                                  <>
                                    <CheckIcon className="w-3.5 h-3.5 stroke-[2.5]" />
                                    <span>Verify & Save Match</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </DialogPanel>
              </TransitionChild>
            </div>
          </div>

          <Transition show={uploadModalOpen}>
            <Dialog onClose={() => setUploadModalOpen(false)} className="relative z-[60]">
              <TransitionChild
                enter="ease-out duration-200"
                enterFrom="opacity-0"
                enterTo="opacity-100"
                leave="ease-in duration-150"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <div className="fixed inset-0 bg-black/65 backdrop-blur-xs z-[60]" />
              </TransitionChild>

              <div className="fixed inset-0 overflow-hidden flex items-center justify-center p-4 z-[70]">
                <TransitionChild
                  enter="ease-out duration-200"
                  enterFrom="opacity-0 scale-95"
                  enterTo="opacity-100 scale-100"
                  leave="ease-in duration-150"
                  leaveFrom="opacity-100 scale-100"
                  leaveTo="opacity-0 scale-95"
                >
                  <DialogPanel className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl p-6 border border-gray-100 space-y-5 max-h-[90vh] flex flex-col overflow-hidden relative z-[70]">
                <div className="flex items-start justify-between">
                  <div>
                    <DialogTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
                      <CloudArrowUpIcon className="w-5 h-5 text-orange-600" />
                      <span>Upload Company Decisions & Reports</span>
                    </DialogTitle>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Job: <strong>{jobPosition}</strong> {jobCompany ? `· ${jobCompany}` : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setUploadModalOpen(false);
                      setUploadedFile(null);
                      setParsedDecisions(null);
                    }}
                    className="p-1 text-gray-400 hover:text-gray-600 rounded-lg cursor-pointer"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-5 pr-1">
                  <div className="bg-orange-50/70 border border-orange-200 rounded-xl p-3.5 text-xs text-orange-900">
                    <p className="font-semibold mb-1">How it works:</p>
                    <ul className="list-disc list-inside space-y-0.5 text-orange-800 text-[11px]">
                      <li>
                        <strong>Excel / CSV Spreadsheet:</strong> When you upload the company's returned referral sheet,
                        applicant statuses (Hired, Shortlisted, Rejected) will be automatically imported.
                      </li>
                      <li>
                        <strong>Signed Document / PDF / Word:</strong> Uploading evaluations or signed notices attaches
                        them to this opportunity for records.
                      </li>
                    </ul>
                  </div>

                  <div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      accept=".xlsx,.xls,.csv,.pdf,.docx,.doc"
                      className="hidden"
                    />
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                        uploadedFile
                          ? 'border-orange-500 bg-orange-50/30'
                          : 'border-gray-200 hover:border-orange-400 hover:bg-gray-50'
                      }`}
                    >
                      <DocumentArrowUpIcon className="w-10 h-10 text-orange-500 mx-auto mb-2" />
                      <p className="text-xs font-bold text-gray-800">
                        {uploadedFile ? uploadedFile.name : 'Click to select or drag company file here'}
                      </p>
                      <p className="text-[11px] text-gray-400 mt-1">
                        Supported: Excel (.xlsx, .xls), CSV (.csv), PDF (.pdf), Word (.docx, .doc)
                      </p>
                    </div>
                  </div>

                  {parsedDecisions && parsedDecisions.length > 0 && (
                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                      <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200 flex items-center justify-between text-xs">
                        <span className="font-bold text-gray-800">
                          Found {parsedDecisions.length} candidate decisions in file:
                        </span>
                        <div className="flex items-center gap-2 text-[11px] font-semibold">
                          <span className="text-emerald-700">
                            {parsedDecisions.filter((p) => p.normalizedStatus === 'hired').length} Hired
                          </span>
                          <span>·</span>
                          <span className="text-purple-700">
                            {parsedDecisions.filter((p) => p.normalizedStatus === 'shortlisted').length} Shortlisted
                          </span>
                          <span>·</span>
                          <span className="text-red-700">
                            {parsedDecisions.filter((p) => p.normalizedStatus === 'rejected').length} Rejected
                          </span>
                        </div>
                      </div>

                      <div className="max-h-52 overflow-y-auto divide-y divide-gray-100">
                        {parsedDecisions.map((p, idx) => (
                          <div key={idx} className="px-4 py-2.5 text-xs flex items-center justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-gray-900 truncate">{p.name || p.email}</p>
                              <p className="text-[10px] text-gray-400 truncate">{p.email}</p>
                              {p.remarks && (
                                <p className="text-[10px] text-gray-600 italic truncate mt-0.5">"{p.remarks}"</p>
                              )}
                            </div>
                            <div className="shrink-0 flex items-center gap-2">
                              {p.matchedApplicant ? (
                                <span className="text-[10px] text-emerald-600 font-medium">✓ Matched</span>
                              ) : (
                                <span className="text-[10px] text-amber-600 font-medium">⚠ Not in list</span>
                              )}
                              <CompanyDecisionBadge status={p.normalizedStatus} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <PaperClipIcon className="w-3.5 h-3.5 text-gray-500" />
                      <span>Attached Company Evaluation Files ({companyFiles.length})</span>
                    </h4>

                    {loadingFiles ? (
                      <div className="text-xs text-gray-400 py-3">Loading attached files...</div>
                    ) : companyFiles.length === 0 ? (
                      <p className="text-xs text-gray-400 italic bg-gray-50 rounded-xl p-3 border border-gray-100">
                        No company files attached yet. When the employer sends back their evaluation sheet or document,
                        upload it here.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {companyFiles.map((f: any, idx: number) => (
                          <div
                            key={f.id || idx}
                            className="bg-white border border-gray-200 rounded-xl p-3 flex items-center justify-between gap-3 text-xs shadow-2xs hover:border-orange-300 transition-colors"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                                <DocumentTextIcon className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-gray-900 truncate">{f.file_name || 'Company Report'}</p>
                                <p className="text-[10px] text-gray-400">
                                  {f.file_size ? `${Math.round(f.file_size / 1024)} KB` : ''} · Uploaded{' '}
                                  {f.uploaded_at ? new Date(f.uploaded_at).toLocaleDateString() : ''}
                                </p>
                              </div>
                            </div>
                            <div className="shrink-0 flex items-center gap-2">
                              {f.data_url && (
                                <a
                                  href={f.data_url}
                                  download={f.file_name || 'company-report'}
                                  className="flex items-center gap-1 text-xs font-semibold text-orange-600 hover:text-orange-800 hover:underline"
                                >
                                  <ArrowDownTrayIcon className="w-3.5 h-3.5" /> Download
                                </a>
                              )}
                              <button
                                type="button"
                                onClick={() => handleDeleteCompanyFile(f.id)}
                                className="p-1 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                                title="Remove file"
                              >
                                <TrashIcon className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setUploadModalOpen(false);
                      setUploadedFile(null);
                      setParsedDecisions(null);
                    }}
                    className="px-4 py-2 text-xs font-semibold bg-white border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 cursor-pointer"
                  >
                    Cancel
                  </button>

                  {parsedDecisions && parsedDecisions.length > 0 ? (
                    <button
                      type="button"
                      onClick={handleApplyDecisions}
                      disabled={isProcessingFile}
                      className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl disabled:opacity-50 transition-colors shadow-xs cursor-pointer"
                    >
                      {isProcessingFile ? (
                        <>
                          <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
                          <span>Applying Decisions...</span>
                        </>
                      ) : (
                        <>
                          <CheckIcon className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>Apply Company Decisions ({parsedDecisions.length})</span>
                        </>
                      )}
                    </button>
                  ) : (
                    uploadedFile && (
                      <button
                        type="button"
                        onClick={handleUploadDocument}
                        disabled={isProcessingFile}
                        className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-orange-600 hover:bg-orange-700 text-white rounded-xl disabled:opacity-50 transition-colors shadow-xs cursor-pointer"
                      >
                        {isProcessingFile ? (
                          <>
                            <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
                            <span>Uploading...</span>
                          </>
                        ) : (
                          <>
                            <CloudArrowUpIcon className="w-3.5 h-3.5" />
                            <span>Attach Document to Opportunity</span>
                          </>
                        )}
                      </button>
                    )
                  )}
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </Dialog>
      </Transition>
        </Dialog>
      </Transition>
    </>
  );
}
