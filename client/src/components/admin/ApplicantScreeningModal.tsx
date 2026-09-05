import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import { XMarkIcon, DocumentTextIcon, CheckCircleIcon, ArrowDownTrayIcon, CheckIcon, FunnelIcon, UserIcon } from '@heroicons/react/24/outline';
import { adminApi } from '@/services/api';
import { useUIStore } from '@/store/uiStore';

function MatchBar({ pct, label = 'Match Score' }: { pct: number | null | undefined; label?: string }) {
  if (pct === null || pct === undefined) return null;
  const color = pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-500' : 'bg-gray-400';
  const textColor = pct >= 80 ? 'text-green-600' : pct >= 50 ? 'text-amber-600' : 'text-gray-500';
  return (
    <div className="mt-1">
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[11px] text-gray-500 font-medium">{label}</span>
        <span className={`text-xs font-bold ${textColor}`}>{pct}%</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ease-out ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function ApplicantScreeningModal({
  isOpen,
  onClose,
  jobId,
  jobPosition,
  requiredSkills = [],
}: ApplicantScreeningModalProps) {
  const [applicants, setApplicants] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [matchedSkills, setMatchedSkills] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [currentStatus, setCurrentStatus] = useState<string>('pending');
  const [batchFilter, setBatchFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const addNotification = useUIStore((s) => s.addNotification);

  const selected = applicants.find((a) => a.id === selectedId) || null;

  const availableBatches = Array.from(
    new Set(applicants.map((a) => a.batch_year).filter(Boolean))
  ).sort((a: any, b: any) => Number(b) - Number(a));

  const filteredApplicants = applicants.filter((a) => {
    if (batchFilter && a.batch_year !== batchFilter) return false;
    if (statusFilter && a.status !== statusFilter) return false;
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
  }, [jobId]);

  useEffect(() => {
    if (isOpen && jobId) {
      fetchApplicants();
      setSelectedId(null);
      setMatchedSkills([]);
      setNotes('');
      setBatchFilter('');
      setStatusFilter('');
    }
  }, [isOpen, jobId]);

  useEffect(() => {
    if (selected) {
      setMatchedSkills(selected.matched_skills || []);
      setNotes(selected.screening_notes || '');
      setCurrentStatus(selected.status || 'pending');
    } else {
      setMatchedSkills([]);
      setNotes('');
      setCurrentStatus('pending');
    }
  }, [selectedId]);

  const toggleSkill = (skill: string) => {
    setMatchedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
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

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const updated: any = await adminApi.screenApplication(selected.id, {
        matched_skills: matchedSkills,
        screening_notes: notes || undefined,
        status: currentStatus,
      });
      setApplicants((prev) =>
        prev.map((a) =>
          a.id === selected.id
            ? {
                ...a,
                status: currentStatus,
                matched_skills: updated.matched_skills || matchedSkills,
                missing_skills: updated.missing_skills || [],
                match_percentage: updated.match_percentage ?? a.match_percentage,
                overall_match_score: updated.overall_match_score ?? a.overall_match_score,
                skills_match_score: updated.skills_match_score ?? a.skills_match_score,
                experience_match_score: updated.experience_match_score ?? a.experience_match_score,
                education_match_score: updated.education_match_score ?? a.education_match_score,
                screening_notes: updated.screening_notes || notes,
                is_screened: updated.is_screened ?? true,
              }
            : a
        )
      );
      addNotification('Screening saved successfully', 'success');
    } catch {
      addNotification('Failed to save screening', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleExportCsv = async () => {
    try {
      const res = await adminApi.exportApplicants(jobId);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `screening-${jobPosition.replace(/\s+/g, '_')}-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      addNotification('CSV exported', 'success');
    } catch {
      addNotification('Failed to export CSV', 'error');
    }
  };

  const screenedCount = applicants.filter((a) => a.is_screened).length;
  const matchedCount = matchedSkills.filter((s) => requiredSkills.includes(s)).length;
  const selectedPct = selected?.match_percentage ?? null;

  return (
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
          <div className="flex min-h-full items-center justify-center p-4">
            <TransitionChild
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <DialogPanel className="w-full max-w-6xl bg-white rounded-xl shadow-xl flex flex-col overflow-hidden" style={{ height: '85vh' }}>
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-3 shrink-0 bg-orange-500">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center">
                      <FunnelIcon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <DialogTitle className="text-sm font-bold text-white">Screen Applicants</DialogTitle>
                      <p className="text-[11px] text-orange-100">{jobPosition} · {screenedCount}/{applicants.length} screened</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleExportCsv}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white/20 border border-white/30 rounded-lg text-white hover:bg-white/30 transition-colors"
                    >
                      <ArrowDownTrayIcon className="w-3.5 h-3.5" /> Export CSV
                    </button>
                    <button onClick={onClose} className="p-1.5 text-white/70 hover:text-white hover:bg-white/20 rounded-lg transition-colors">
                      <XMarkIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Body */}
                <div className="flex-1 flex overflow-hidden">
                  {/* Left Panel — Applicant List */}
                  <div className="w-[38%] border-r border-gray-200 flex flex-col overflow-hidden">
                    {/* Filters */}
                    <div className="p-2.5 border-b border-gray-200 bg-gray-50 flex items-center gap-2 shrink-0">
                      <select
                        value={batchFilter}
                        onChange={(e) => setBatchFilter(e.target.value)}
                        className="text-[11px] border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 outline-none flex-1 focus:border-blue-400"
                      >
                        <option value="">All Batches</option>
                        {availableBatches.map((b) => (
                          <option key={String(b)} value={String(b)}>Batch {String(b)}</option>
                        ))}
                      </select>
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="text-[11px] border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 outline-none flex-1 focus:border-blue-400"
                      >
                        <option value="">All Statuses</option>
                        <option value="pending">Pending</option>
                        <option value="under_review">Under Review</option>
                        <option value="shortlisted">Shortlisted</option>
                        <option value="rejected">Rejected</option>
                        <option value="hired">Hired</option>
                      </select>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                      {loading ? (
                        <div className="p-3 space-y-2">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="bg-gray-100 rounded-lg animate-pulse h-16" />
                          ))}
                        </div>
                      ) : error ? (
                        <div className="p-3">
                          <div className="bg-red-50 text-red-700 px-3 py-2 rounded-lg text-xs">{error}</div>
                        </div>
                      ) : filteredApplicants.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                          <UserIcon className="w-8 h-8 mb-2 text-gray-300" />
                          <p className="text-xs">{applicants.length === 0 ? 'No applicants found.' : 'No matching applicants.'}</p>
                        </div>
                      ) : (
                        filteredApplicants.map((app) => {
                          const isActive = app.id === selectedId;
                          const initials = (app.applicant_name || 'A').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
                          const score = app.overall_score ?? app.overall_match_score ?? app.match_percentage;
                          return (
                            <button
                              key={app.id}
                              onClick={() => setSelectedId(app.id)}
                              className={`w-full text-left px-3 py-3 border-b border-gray-50 transition-all ${
                                isActive
                                  ? 'bg-blue-50/80 border-l-[3px] border-l-blue-600'
                                  : 'hover:bg-gray-50/80 border-l-[3px] border-l-transparent'
                              }`}
                            >
                              <div className="flex items-start gap-2.5">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 ${
                                  app.is_screened ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                                }`}>
                                  {initials}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <p className={`text-xs font-semibold truncate ${isActive ? 'text-blue-900' : 'text-gray-900'}`}>
                                      {app.applicant_name || 'Applicant'}
                                    </p>
                                    {app.is_screened && <CheckCircleIcon className="w-3 h-3 text-green-500 shrink-0" />}
                                  </div>
                                  <p className="text-[10px] text-gray-400 truncate mt-0.5">{app.applicant_email}</p>
                                  {(app.batch_year || app.program) && (
                                    <p className="text-[9px] text-gray-500 truncate mt-0.5">
                                      {app.batch_year ? `Batch ${app.batch_year}` : ''}
                                      {app.batch_year && app.program ? ' · ' : ''}
                                      {app.program || ''}
                                    </p>
                                  )}
                                  <div className="flex items-center gap-1.5 mt-1.5">
                                    {score != null && (
                                      <span className={`text-[10px] font-bold ${
                                        score >= 80 ? 'text-green-600' :
                                        score >= 50 ? 'text-amber-600' : 'text-gray-400'
                                      }`}>
                                        {score}%
                                      </span>
                                    )}
                                    {app.status && (
                                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 capitalize">
                                        {app.status.replace('_', ' ')}
                                      </span>
                                    )}
                                    <span className="text-[9px] text-gray-300 ml-auto">
                                      {new Date(app.applied_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Right Panel — Screening */}
                  <div className="w-[62%] flex flex-col overflow-hidden">
                    {!selected ? (
                      <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-3">
                        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                          <UserIcon className="w-8 h-8 text-gray-300" />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-medium text-gray-500">Select an applicant</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">Choose from the list to begin screening</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Applicant Header */}
                        <div className="px-6 py-4 border-b border-gray-100 shrink-0">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                                selected.is_screened ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                              }`}>
                                {(selected.applicant_name || 'A').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <h3 className="text-sm font-bold text-gray-900">{selected.applicant_name || 'Applicant'}</h3>
                                <p className="text-[11px] text-gray-500">{selected.applicant_email}</p>
                                {(selected.batch_year || selected.program) && (
                                  <p className="text-[11px] font-medium text-gray-600 mt-0.5">
                                    {selected.batch_year ? `Batch ${selected.batch_year}` : ''}
                                    {selected.batch_year && selected.program ? ' · ' : ''}
                                    {selected.program || ''}
                                  </p>
                                )}
                                <p className="text-[10px] text-gray-400 mt-0.5">
                                  Applied {new Date(selected.applied_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {selected.resume_url ? (
                                <a
                                  href={selected.resume_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                                >
                                  <DocumentTextIcon className="w-3.5 h-3.5" /> Resume
                                </a>
                              ) : (
                                <span className="text-[10px] text-gray-400 italic">No resume</span>
                              )}
                            </div>
                          </div>

                          {/* 4 Match score bars */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 pt-3 border-t border-gray-100">
                            <MatchBar pct={selected.overall_score ?? selected.overall_match_score ?? selectedPct} label="Overall Match" />
                            <MatchBar pct={selected.skills_score ?? selected.skills_match_score} label="Skills (50%)" />
                            <MatchBar pct={selected.experience_score ?? selected.experience_match_score} label="Experience (30%)" />
                            <MatchBar pct={selected.education_score ?? selected.education_match_score} label="Education (20%)" />
                          </div>
                        </div>

                        {/* Screening Content */}
                        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
                          {/* Cover Letter */}
                          {selected.cover_letter && (
                            <div>
                              <h4 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Cover Letter</h4>
                              <div className="text-xs text-gray-600 bg-gray-50 rounded-lg p-3.5 whitespace-pre-line leading-relaxed border border-gray-100">
                                {selected.cover_letter}
                              </div>
                            </div>
                          )}

                          {/* Required Skills vs Alumni Skills Checklist */}
                          <div>
                            <div className="flex items-center justify-between mb-2.5">
                              <h4 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                                Required Skills vs Alumni Skills
                              </h4>
                              {requiredSkills.length > 0 && (
                                <span className={`text-[11px] font-bold ${
                                  matchedCount === requiredSkills.length ? 'text-green-600' :
                                  matchedCount > 0 ? 'text-amber-600' : 'text-gray-400'
                                }`}>
                                  {matchedCount}/{requiredSkills.length} matched
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
                                  const breakdownStatus = breakdownItem?.status; // 'full' | 'partial' | 'missing'
                                  const indicator = checked
                                    ? (breakdownStatus === 'partial' ? '⚠️' : '✅')
                                    : '❌';

                                  return (
                                    <button
                                      key={skill}
                                      type="button"
                                      onClick={() => toggleSkill(skill)}
                                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-left transition-all ${
                                        checked
                                          ? 'bg-green-50 border-green-200 shadow-sm'
                                          : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
                                      }`}
                                    >
                                      <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 transition-colors ${
                                        checked ? 'bg-green-500' : 'border-2 border-gray-300'
                                      }`}>
                                        {checked && <CheckIcon className="w-2.5 h-2.5 text-white" />}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-1">
                                          <span className={`text-xs font-medium truncate ${checked ? 'text-green-800' : 'text-gray-700'}`}>
                                            {skill}
                                          </span>
                                          <span className="text-xs">{indicator}</span>
                                        </div>
                                        {breakdownItem?.alumniSkill && breakdownStatus === 'partial' && (
                                          <p className="text-[10px] text-amber-700 truncate mt-0.5">
                                            Alumni has: {breakdownItem.alumniSkill}
                                          </p>
                                        )}
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          {/* Missing Skills */}
                          {selected.is_screened && selected.missing_skills?.length > 0 && (
                            <div>
                              <h4 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                Missing Skills
                                <span className="ml-2 text-red-400 normal-case tracking-normal font-normal">
                                  {selected.missing_skills.length} gap{selected.missing_skills.length !== 1 ? 's' : ''}
                                </span>
                              </h4>
                              <div className="flex flex-wrap gap-1.5">
                                {selected.missing_skills.map((skill: string) => (
                                  <span key={skill} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium bg-red-50 text-red-600 border border-red-100">
                                    <span className="w-1 h-1 rounded-full bg-red-400" />
                                    {skill}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Screening Notes */}
                          <div>
                            <h4 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Screening Notes</h4>
                            <textarea
                              value={notes}
                              onChange={(e) => setNotes(e.target.value.slice(0, 500))}
                              placeholder="Add notes about this applicant's qualifications, experience, or concerns..."
                              rows={4}
                              className="text-xs border border-gray-200 rounded-lg px-3.5 py-2.5 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 w-full resize-none transition-all"
                            />
                            <div className="flex items-center justify-between mt-1">
                              <p className="text-[10px] text-gray-300">Private — only visible to admins</p>
                              <p className="text-[10px] text-gray-400">{notes.length}/500</p>
                            </div>
                          </div>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-3 border-t border-gray-200 bg-gray-50/80 shrink-0 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-medium text-gray-600">Status:</span>
                            <select
                              value={currentStatus}
                              onChange={(e) => setCurrentStatus(e.target.value)}
                              className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-800 outline-none focus:border-blue-400"
                            >
                              <option value="pending">Pending</option>
                              <option value="under_review">Under Review</option>
                              <option value="shortlisted">Shortlisted</option>
                              <option value="rejected">Rejected</option>
                              <option value="hired">Hired</option>
                            </select>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={handleSkip}
                              className="px-4 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                              Skip
                            </button>
                            <button
                              type="button"
                              onClick={handleSave}
                              disabled={saving}
                              className="flex items-center gap-1.5 px-5 py-2 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
                            >
                              {saving ? (
                                <>
                                  <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                                  Saving...
                                </>
                              ) : (
                                <>
                                  <CheckIcon className="w-3.5 h-3.5" />
                                  Save Screening
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
      </Dialog>
    </Transition>
  );
}

interface ApplicantScreeningModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: string;
  jobPosition: string;
  requiredSkills?: string[];
}
