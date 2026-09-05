import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { jobsApi, profileApi } from '@/services/api';
import { useUIStore } from '@/store/uiStore';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { calculateMatchScore } from '@/utils/matchScoring';
import { MapPinIcon, CurrencyDollarIcon, ClockIcon, BriefcaseIcon, GlobeAltIcon, EnvelopeIcon, BuildingOfficeIcon, AcademicCapIcon, ArrowRightIcon, SparklesIcon, DocumentTextIcon, XMarkIcon, CheckCircleIcon, PaperClipIcon, BookmarkIcon } from '@heroicons/react/24/outline';
import { BookmarkIcon as BookmarkSolidIcon } from '@heroicons/react/24/solid';

const JOB_TYPE_LABELS: Record<string, string> = {
  'full-time': 'Full-time',
  'part-time': 'Part-time',
  'contract': 'Contract',
  'freelance': 'Freelance',
  'internship': 'Internship',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  under_review: 'bg-blue-100 text-blue-700',
  reviewed: 'bg-blue-100 text-blue-700',
  screened: 'bg-indigo-100 text-indigo-700',
  shortlisted: 'bg-purple-100 text-purple-700',
  hired: 'bg-emerald-100 text-emerald-700',
  accepted: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Submitted',
  under_review: 'Under Review',
  reviewed: 'Under Review',
  screened: 'Screened',
  shortlisted: 'Shortlisted',
  hired: 'Hired',
  accepted: 'Accepted',
  rejected: 'Closed / Not Selected',
};

function StatusBadge({ status }: { status?: string }) {
  if (!status) return null;
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_COLORS[status] || STATUS_COLORS.pending}`}>
      {STATUS_LABELS[status] || 'Submitted'}
    </span>
  );
}

function MatchScoreBar({ pct, label = 'Your Match' }: { pct: number | null | undefined; label?: string }) {
  if (pct === null || pct === undefined) return null;
  const color = pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-500' : 'bg-gray-400';
  const textColor = pct >= 80 ? 'text-green-600' : pct >= 50 ? 'text-amber-600' : 'text-gray-500';
  return (
    <div className="mt-2">
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

function isJobMatch(app: any, job: any): boolean {
  if (!app || !job) return false;
  const targetId = String(job.id || job.job_id || '').trim();
  if (!targetId) return false;

  const candidateIds = [
    app.job_id,
    app.job?.id,
    app.job_postings?.id,
    app.job_posting_id,
    app.jobId,
    app.jobPostingId,
  ].filter(Boolean).map((id) => String(id).trim());

  return candidateIds.includes(targetId);
}

function NextStepsStepper({ status }: { status: string }) {
  const steps = [
    { step: 'Step 1', title: 'Submitted', desc: 'Application received' },
    { step: 'Step 2', title: 'Screening', desc: 'Admin review' },
    { step: 'Step 3', title: 'Shortlisted', desc: 'Sent to employer' },
    { step: 'Step 4', title: 'Decision', desc: 'Final outcome' },
  ];

  let currentStepIdx = 0;
  let allCompleted = false;
  if (status === 'pending') currentStepIdx = 0;
  else if (status === 'under_review' || status === 'reviewed' || status === 'screened') currentStepIdx = 1;
  else if (status === 'shortlisted') currentStepIdx = 2;
  else if (status === 'hired' || status === 'accepted') {
    currentStepIdx = 3;
    allCompleted = true;
  } else if (status === 'rejected') {
    currentStepIdx = 3;
  }

  return (
    <div className="mt-4 pt-3 border-t border-gray-100">
      <h5 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-3">Application Progress</h5>

      <div className="bg-white border border-gray-200/80 rounded-2xl p-4 shadow-sm">
        <div className="relative">
          {/* Background connecting line spanning across step centers */}
          <div className="absolute left-[12.5%] right-[12.5%] top-[18px] h-[3px] bg-gray-200 -z-0">
            {/* Active colored line fill */}
            <div
              className="h-full bg-teal-500 transition-all duration-500 ease-out"
              style={{
                width: allCompleted
                  ? '100%'
                  : `${(currentStepIdx / (steps.length - 1)) * 100}%`,
              }}
            />
          </div>

          {/* Steps in 4-column grid */}
          <div className="grid grid-cols-4 relative z-10">
            {steps.map((s, idx) => {
              const isCompleted = allCompleted || idx < currentStepIdx;
              const isCurrent = !allCompleted && idx === currentStepIdx;

              return (
                <div key={s.step} className="flex flex-col items-center text-center px-1">
                  {/* Step badge */}
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all shadow-sm ${
                      isCompleted
                        ? 'bg-teal-500 text-white'
                        : isCurrent
                          ? 'bg-teal-500 text-white ring-4 ring-teal-100'
                          : 'bg-white border-2 border-gray-200 text-gray-300'
                    }`}
                  >
                    {isCompleted ? (
                      <svg className="w-4 h-4 stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    ) : isCurrent ? (
                      <div className="w-4 h-4 rounded-[4px] border-2 border-white flex items-center justify-center">
                        <div className="w-1.5 h-1.5 bg-white rounded-[1.5px]" />
                      </div>
                    ) : (
                      <div className="w-2.5 h-2.5 bg-gray-300 rounded-[2px]" />
                    )}
                  </div>

                  {/* Step texts */}
                  <div className="mt-2.5">
                    <p className={`text-xs font-bold ${isCurrent ? 'text-teal-700' : isCompleted ? 'text-gray-900' : 'text-gray-400'}`}>
                      {s.step}
                    </p>
                    <p className={`text-[11px] font-semibold leading-tight mt-0.5 ${isCurrent ? 'text-teal-900' : isCompleted ? 'text-gray-800' : 'text-gray-500'}`}>
                      {s.title}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5 leading-snug hidden sm:block">
                      {s.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function ApplicationStatusCard({
  application,
}: {
  application: any;
}) {
  if (!application) return null;

  const isScreened = application.is_screened;
  const pct = application.overall_match_score ?? application.match_percentage;
  const matchedSkills: string[] = application.matched_skills || [];
  const missingSkills: string[] = application.missing_skills || [];

  return (
    <div className="bg-gray-50 rounded-lg p-4 mt-4 border border-gray-100">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-700">Application Status</span>
        <StatusBadge status={application.status || (isScreened ? 'screened' : 'pending')} />
      </div>

      {pct !== null && pct !== undefined && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600">Overall Match Score</span>
            <span className={`font-bold ${
              pct >= 80 ? 'text-green-600' :
              pct >= 50 ? 'text-yellow-600' : 'text-gray-600'
            }`}>
              {pct}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
            <div
              className={`h-2 rounded-full transition-all ${
                pct >= 80 ? 'bg-green-500' :
                pct >= 50 ? 'bg-yellow-500' : 'bg-gray-500'
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {/* Sub-scores if available */}
      {(application.skills_match_score != null || application.experience_match_score != null || application.education_match_score != null) && (
        <div className="grid grid-cols-3 gap-2 mt-3 pt-2 border-t border-gray-200/60">
          <div className="bg-white p-2 rounded border border-gray-100 text-center">
            <p className="text-[10px] text-gray-400">Skills (50%)</p>
            <p className="text-xs font-bold text-gray-800">{application.skills_match_score ?? 0}%</p>
          </div>
          <div className="bg-white p-2 rounded border border-gray-100 text-center">
            <p className="text-[10px] text-gray-400">Experience (30%)</p>
            <p className="text-xs font-bold text-gray-800">{application.experience_match_score ?? 0}%</p>
          </div>
          <div className="bg-white p-2 rounded border border-gray-100 text-center">
            <p className="text-[10px] text-gray-400">Education (20%)</p>
            <p className="text-xs font-bold text-gray-800">{application.education_match_score ?? 0}%</p>
          </div>
        </div>
      )}

      {matchedSkills.length > 0 && (
        <div className="mt-3">
          <p className="text-xs text-gray-500 mb-1 font-medium">Matched Skills</p>
          <div className="flex flex-wrap gap-1">
            {matchedSkills.map((skill: string) => (
              <span key={skill} className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs font-medium">
                ✓ {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {missingSkills.length > 0 && (
        <div className="mt-2">
          <p className="text-xs text-gray-500 mb-1 font-medium">Skills Gaps</p>
          <div className="flex flex-wrap gap-1">
            {missingSkills.map((skill: string) => (
              <span key={skill} className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs">
                ✗ {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Stepper Progress matching reference image */}
      <NextStepsStepper status={application.status || (isScreened ? 'screened' : 'pending')} />
    </div>
  );
}

function formatDate(dateStr: string): string {
  const now = Date.now();
  const d = new Date(dateStr).getTime();
  const diff = now - d;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return new Date(dateStr).toLocaleDateString();
}

function timeAgo(dateStr: string): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return 'just now';
  const hours = Math.floor(diff / 3600000);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(diff / 86400000);
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months === 1) return '1 month ago';
  if (months < 12) return `${months} months ago`;
  return new Date(dateStr).toLocaleDateString();
}

const WAVY_LINE_PALETTES = [
  { stroke: '#fb923c', bgTint: '#fffaf5' }, // light warm orange
  { stroke: '#f59e0b', bgTint: '#fffdf5' }, // light amber / gold
  { stroke: '#38bdf8', bgTint: '#f5fbff' }, // light sky blue
  { stroke: '#34d399', bgTint: '#f4fdf8' }, // light emerald mint
  { stroke: '#a78bfa', bgTint: '#faf8ff' }, // light violet / purple
  { stroke: '#f472b6', bgTint: '#fff5f9' }, // light rose / pink
  { stroke: '#2dd4bf', bgTint: '#f2fcf9' }, // light teal
  { stroke: '#818cf8', bgTint: '#f6f7ff' }, // light indigo
  { stroke: '#fb7185', bgTint: '#fff5f6' }, // light coral
  { stroke: '#22d3ee', bgTint: '#f2fcfe' }, // light cyan
  { stroke: '#e879f9', bgTint: '#fdf4fe' }, // light fuchsia
  { stroke: '#a3e635', bgTint: '#f9fef2' }, // light lime
];

function getJobWavyPalette(jobId: string | number) {
  const str = String(jobId || '0');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % WAVY_LINE_PALETTES.length;
  return WAVY_LINE_PALETTES[idx];
}

// 32 parallel undulating contour waves matching the reference image
const WAVY_CONTOUR_LINES = Array.from({ length: 32 }, (_, i) => {
  const baseY = -55 + i * 9.8;
  // Smooth swell in stroke weight across the wave bands: larger lines (up to 3.8px) and smaller lines (down to 1.4px)
  const widthFactor = Math.pow(Math.sin((i / 32) * Math.PI * 2.8 + 0.35), 2);
  const strokeWidth = Number((1.4 + 2.4 * widthFactor).toFixed(1));

  // Consistent multi-cycle sinusoidal wave across the card width
  const halfW = 145;
  const amp = 25;
  const tilt = 0.085;

  let d = `M -60 ${Number((baseY - 60 * tilt).toFixed(1))}`;
  for (let k = 0; k < 8; k++) {
    const startX = -60 + k * halfW;
    const endX = startX + halfW;
    const isCrest = k % 2 === 0;
    const peakY = baseY + (startX + halfW * 0.5) * tilt + (isCrest ? -amp : amp);
    const endY = baseY + endX * tilt;

    const cp1x = Number((startX + halfW * 0.36).toFixed(1));
    const cp2x = Number((startX + halfW * 0.64).toFixed(1));
    const cp1y = Number(peakY.toFixed(1));
    const cp2y = Number(peakY.toFixed(1));

    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${Number(endX.toFixed(1))} ${Number(endY.toFixed(1))}`;
  }

  return {
    id: i,
    d,
    strokeWidth,
  };
});

function getCompanyInitials(name: string): string {
  if (!name) return 'JB';
  const clean = name.trim().replace(/[^a-zA-Z0-9\s]/g, '');
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'JB';
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
}

type JobFilter = 'all' | 'full-time' | 'part-time' | 'contract' | 'freelance' | 'internship' | 'exclusive';

function JobCard({
  job,
  userProfile,
  isApplied,
  appliedStatus,
  isSaved,
  onToggleSave,
  onViewDetails,
  onApply,
}: {
  job: any;
  userProfile: any;
  isApplied?: boolean;
  appliedStatus?: string;
  isSaved?: boolean;
  onToggleSave?: () => void;
  onViewDetails: () => void;
  onApply: () => void;
}) {
  const matchResult = userProfile ? calculateMatchScore(job, userProfile) : null;
  const matchScore = matchResult?.overall_score ?? null;
  const palette = getJobWavyPalette(job.id);
  const initials = getCompanyInitials(job.company_name);

  const jobTypeLabel = JOB_TYPE_LABELS[job.job_type] || (
    job.job_type ? job.job_type.charAt(0).toUpperCase() + job.job_type.slice(1) : 'Full-time'
  );

  return (
    <div className="relative bg-white border border-gray-200 rounded-none p-6 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden">
      {/* Wavy Contour Lines Background (consistent wave ripples, smooth thickness variations, 70% opacity, and enlarged fade-out) */}
      <div className="absolute top-0 left-0 right-0 h-48 overflow-hidden pointer-events-none z-0">
        <div className="absolute -inset-6 animate-slow-wave origin-center">
          <svg
            viewBox="0 0 900 260"
            className="w-full h-full"
            preserveAspectRatio="xMidYMid slice"
            fill="none"
          >
            {WAVY_CONTOUR_LINES.map((line) => (
              <path
                key={line.id}
                d={line.d}
                stroke={palette.stroke}
                strokeWidth={line.strokeWidth}
                strokeOpacity={0.7}
                strokeLinecap="round"
              />
            ))}
          </svg>
        </div>
        {/* Enlarged smooth bottom fade-out for seamless background blending */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent from-25% via-white/45 via-60% to-white" />
      </div>

      {/* Main Card Content (relative z-10 for interactivity and clean contrast) */}
      <div className="relative z-10">
        {/* Top Header: Logo with Capslock Initials & Save Button */}
        <div className="flex items-center justify-between gap-3">
          {/* Circular Company Icon with Initials or Logo */}
          <div className="w-14 h-14 rounded-full border border-gray-200/90 p-1 bg-white shadow-xs flex items-center justify-center shrink-0">
            {job.poster_avatar_url ? (
              <img src={job.poster_avatar_url} alt={job.company_name} className="w-full h-full rounded-full object-cover" />
            ) : (
              <div className="w-full h-full rounded-full bg-orange-600 text-white flex items-center justify-center text-sm font-bold tracking-widest uppercase">
                {initials}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleSave?.();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 border text-xs font-medium transition-colors cursor-pointer ${
              isSaved
                ? 'bg-orange-50 border-orange-300 text-orange-600 font-semibold shadow-xs'
                : 'bg-white/90 backdrop-blur-xs border-gray-200 text-gray-600 hover:text-orange-600 hover:border-orange-200 hover:bg-orange-50/50'
            }`}
          >
            <span>{isSaved ? 'Saved' : 'Save'}</span>
            {isSaved ? (
              <BookmarkSolidIcon className="w-3.5 h-3.5 text-orange-600" />
            ) : (
              <BookmarkIcon className="w-3.5 h-3.5 text-gray-500" />
            )}
          </button>
        </div>

        {/* Company & Relative Time */}
        <div className="mt-5 flex items-center gap-2 text-xs">
          <span className="font-bold text-gray-900 text-sm">{job.company_name}</span>
          <span className="text-gray-400 font-normal">{timeAgo(job.created_at)}</span>
        </div>

        {/* Job Title */}
        <h3
          onClick={onViewDetails}
          className="text-xl font-bold text-gray-900 mt-1 mb-3 leading-snug line-clamp-1 hover:text-orange-600 transition-colors cursor-pointer"
          title={job.position}
        >
          {job.position}
        </h3>

        {/* Badges / Pills Row */}
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="px-3 py-1 text-xs font-medium bg-gray-100 text-gray-800">
            {jobTypeLabel}
          </span>
          <span className="px-3 py-1 text-xs font-medium bg-gray-100 text-gray-800">
            {job.experience_level || 'Senior level'}
          </span>
          {job.is_remote && (
            <span className="px-3 py-1 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
              Remote
            </span>
          )}
          {job.is_alumni_exclusive && (
            <span className="px-3 py-1 text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200">
              Alumni Exclusive
            </span>
          )}
          {matchScore !== null && (
            <span className="px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
              {matchScore}% match
            </span>
          )}
        </div>
      </div>

      {/* Bottom Section */}
      <div className="relative z-10">
        {/* Divider */}
        <hr className="border-gray-100 my-4" />

        {/* Bottom Row: Salary, Location & Apply Now Button */}
        <div className="flex items-center justify-between gap-3 pt-0.5">
          <div className="min-w-0">
            <p className="text-base font-bold text-gray-900 leading-tight truncate">
              {job.salary_range || 'Competitive'}
            </p>
            <p className="text-xs text-gray-500 mt-0.5 truncate">
              {job.location || 'San Francisco, CA'}
            </p>
          </div>

          <div className="shrink-0">
            {isApplied ? (
              <button
                type="button"
                onClick={onViewDetails}
                className="bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-semibold px-4 py-2.5 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-600" />
                Applied
              </button>
            ) : (
              <button
                type="button"
                onClick={onApply}
                className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold px-5 py-2.5 transition-all shadow-xs cursor-pointer active:scale-95"
              >
                Apply now
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function JobDetailView({
  job,
  userProfile,
  onBack,
  application,
  loadingApplication,
  onApply,
  onWithdraw,
}: {
  job: any;
  userProfile?: any;
  onBack: () => void;
  application?: any;
  loadingApplication?: boolean;
  onApply?: () => void;
  onWithdraw?: (id: string) => void;
}) {
  const matchResult = userProfile ? calculateMatchScore(job, userProfile) : null;
  const matchScore = matchResult?.overall_score ?? null;

  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      <div className="px-4 py-2 border-b border-gray-100">
        <button onClick={onBack} className="flex items-center gap-1 text-xs font-medium text-orange-600 hover:text-orange-700 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Back to listings
        </button>
      </div>

      <div className="px-4 py-3">
        <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2">
          <div className="w-6 h-6 rounded-full bg-blue-800 flex items-center justify-center text-[10px] font-bold text-white shrink-0 overflow-hidden" title={job.poster_name || job.company_name}>
            {job.poster_avatar_url ? (
              <img src={job.poster_avatar_url} alt={job.poster_name || ''} className="w-full h-full object-cover" />
            ) : (
              (job.company_name?.charAt(0) || '?').toUpperCase()
            )}
          </div>
          <span className="font-medium text-gray-700">{job.company_name}</span>
          <span className="text-gray-400">&middot;</span>
          <span>{formatDate(job.created_at)}</span>
          {job.is_alumni_exclusive && (
            <>
              <span className="text-gray-400">&middot;</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700">Alumni Exclusive</span>
            </>
          )}
        </div>

        <h3 className="text-base font-bold text-gray-900 mb-1">{job.position}</h3>

        <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap mb-3">
          <span className="flex items-center gap-1"><MapPinIcon className="w-4 h-4" /> {job.location || 'N/A'}</span>
          <span className="flex items-center gap-1"><BriefcaseIcon className="w-4 h-4" /> {job.job_type}</span>
          {job.experience_level && (
            <span className="flex items-center gap-1"><AcademicCapIcon className="w-4 h-4" /> {job.experience_level}</span>
          )}
          {job.is_remote && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-100">Remote</span>
          )}
          {job.salary_range && <span className="flex items-center gap-1"><CurrencyDollarIcon className="w-4 h-4" /> {job.salary_range}</span>}
        </div>

        {/* Match Breakdown if profile available */}
        {matchResult && matchScore !== null && (
          <div className="mb-4 bg-gray-50 border border-gray-200 rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-gray-800">Your Compatibility Match</span>
              <span className={`text-sm font-bold ${
                matchScore >= 80 ? 'text-green-600' : matchScore >= 50 ? 'text-amber-600' : 'text-gray-500'
              }`}>{matchScore}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-2.5">
              <div
                className={`h-2 rounded-full transition-all ${
                  matchScore >= 80 ? 'bg-green-500' : matchScore >= 50 ? 'bg-amber-500' : 'bg-gray-400'
                }`}
                style={{ width: `${matchScore}%` }}
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white p-2 rounded border border-gray-100 text-center">
                <p className="text-[10px] text-gray-400">Skills (50%)</p>
                <p className="text-xs font-bold text-gray-700">{matchResult.skills_score}%</p>
              </div>
              <div className="bg-white p-2 rounded border border-gray-100 text-center">
                <p className="text-[10px] text-gray-400">Experience (30%)</p>
                <p className="text-xs font-bold text-gray-700">{matchResult.experience_score}%</p>
              </div>
              <div className="bg-white p-2 rounded border border-gray-100 text-center">
                <p className="text-[10px] text-gray-400">Education (20%)</p>
                <p className="text-xs font-bold text-gray-700">{matchResult.education_score}%</p>
              </div>
            </div>
          </div>
        )}

        {/* Application Action Banner with Skeleton Loading */}
        {loadingApplication ? (
          <div className="bg-orange-50/70 border border-orange-100 rounded-lg px-3 py-2.5 mb-4 animate-pulse">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-orange-200 rounded-full" />
                <div className="h-3.5 w-36 bg-orange-200/80 rounded" />
              </div>
              <div className="h-7 w-28 bg-orange-200/80 rounded-lg" />
            </div>
          </div>
        ) : application ? (
          <div className="flex items-center justify-between gap-3 flex-wrap bg-orange-50 border border-orange-100 rounded-lg px-3 py-2.5 mb-4">
            <div className="flex items-center gap-2 text-xs">
              <CheckCircleIcon className="w-4 h-4 text-emerald-600" />
              <span className="font-medium text-gray-700">Application submitted</span>
              <StatusBadge status={application.status || (application.is_screened ? 'screened' : 'pending')} />
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3 flex-wrap bg-orange-50 border border-orange-100 rounded-lg px-3 py-2.5 mb-4">
            <p className="text-xs text-gray-600">Ready to take the next step?</p>
            {onApply && (
              <button
                onClick={onApply}
                className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer"
              >
                Apply for this Job
              </button>
            )}
          </div>
        )}

        {/* Stepper Skeleton while checking application status */}
        {loadingApplication && (
          <div className="bg-white border border-gray-200/80 rounded-2xl p-4 mb-4 animate-pulse space-y-3">
            <div className="flex justify-between items-center">
              <div className="h-3.5 w-28 bg-gray-200 rounded" />
              <div className="h-4 w-16 bg-gray-200 rounded-full" />
            </div>
            <div className="h-2 w-full bg-gray-100 rounded" />
            <div className="grid grid-cols-4 gap-2 pt-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <div className="w-9 h-9 bg-gray-200 rounded-xl" />
                  <div className="h-2.5 w-12 bg-gray-100 rounded" />
                </div>
              ))}
            </div>
          </div>
        )}

        {!loadingApplication && application && <ApplicationStatusCard application={application} />}

        <div className="text-sm text-gray-700 leading-relaxed mb-4 whitespace-pre-line">
          {job.description}
        </div>

        {/* Required Skills */}
        {job.required_skills && job.required_skills.length > 0 && (
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Required Skills</h4>
            <div className="flex flex-wrap gap-1.5">
              {job.required_skills.map((skill: string) => {
                const hasSkill = userProfile?.skills?.some((s: any) =>
                  (typeof s === 'string' ? s : s.name || '').toLowerCase() === skill.toLowerCase()
                );
                return (
                  <span
                    key={skill}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                      hasSkill
                        ? 'bg-green-50 text-green-700 border border-green-200'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {hasSkill && <span>✓</span>}
                    {skill}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {job.requirements?.length > 0 && (
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Requirements</h4>
            <ul className="space-y-1">
              {job.requirements.map((req: string, i: number) => (
                <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-1.5 shrink-0" />
                  {req}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Withdraw Application section at the bottom */}
        {!loadingApplication && application && ['pending', 'under_review', 'reviewed', 'screened'].includes(application.status || 'pending') && onWithdraw && (
          <div className="border-t border-gray-100 pt-4 mt-4 flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="text-xs font-semibold text-gray-800">Need to cancel your submission?</p>
              <p className="text-[11px] text-gray-400">You can withdraw your application while it is still under review.</p>
            </div>
            <button
              type="button"
              onClick={() => onWithdraw(application.id)}
              className="px-4 py-2 text-xs font-medium text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors cursor-pointer"
            >
              Withdraw Application
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Sidebar({ jobs, onViewAll }: { jobs: any[]; onViewAll: () => void }) {
  const navigate = useNavigate();
  const sorted = [...jobs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const recent = sorted.slice(0, 3);

  return (
    <div className="space-y-3">
      <div className="bg-white border border-gray-200 rounded-lg p-3.5">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <BriefcaseIcon className="w-4 h-4 text-orange-500" />
          How to Apply
        </h3>
        <div className="relative pl-5 space-y-3.5">
          {/* Vertical continuous flow connector line */}
          <div className="absolute left-[9px] top-2 bottom-3 w-0.5 bg-orange-200" />

          {/* Flow Step 1 */}
          <div className="relative">
            <span className="absolute -left-5 top-0 w-[18px] h-[18px] rounded-full bg-orange-500 text-white flex items-center justify-center text-[10px] font-bold ring-2 ring-white">
              1
            </span>
            <p className="text-xs font-medium text-gray-800">
              Apply directly through the portal with your profile or uploaded resume.
            </p>
          </div>

          {/* Flow Step 2 */}
          <div className="relative">
            <span className="absolute -left-5 top-0 w-[18px] h-[18px] rounded-full bg-orange-500 text-white flex items-center justify-center text-[10px] font-bold ring-2 ring-white">
              2
            </span>
            <p className="text-xs font-medium text-gray-800">
              Your profile, education, and skills are automatically matched to job requirements.
            </p>
          </div>

          {/* Flow Step 3 */}
          <div className="relative">
            <span className="absolute -left-5 top-0 w-[18px] h-[18px] rounded-full bg-orange-500 text-white flex items-center justify-center text-[10px] font-bold ring-2 ring-white">
              3
            </span>
            <p className="text-xs font-medium text-gray-800">
              Admins screen applications, verify qualifications, and shortlist candidates.
            </p>
          </div>

          {/* Flow Step 4 */}
          <div className="relative">
            <span className="absolute -left-5 top-0 w-[18px] h-[18px] rounded-full bg-orange-500 text-white flex items-center justify-center text-[10px] font-bold ring-2 ring-white">
              4
            </span>
            <p className="text-xs font-medium text-gray-800">
              Track your application status and screening feedback in real-time.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-3">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <SparklesIcon className="w-4 h-4 text-orange-500" />
          Recently Added Jobs
        </h3>
        <div className="space-y-2">
          {recent.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-2">No jobs posted yet.</p>
          ) : (
            recent.map((job, i) => (
              <div key={job.id}>
                <div className="text-xs">
                  <p className="font-medium text-gray-800 truncate">{job.position}</p>
                  <p className="text-gray-500 truncate">{job.company_name}</p>
                  <p className="text-[10px] text-gray-400">{timeAgo(job.created_at)}</p>
                </div>
                {i < recent.length - 1 && <div className="mt-2 border-t border-gray-100" />}
              </div>
            ))
          )}
        </div>
        {recent.length > 0 && (
          <button
            onClick={onViewAll}
            className="mt-2 text-xs font-medium text-orange-600 hover:text-orange-700 transition-colors flex items-center gap-1"
          >
            View All <ArrowRightIcon className="w-3 h-3" />
          </button>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-3">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <AcademicCapIcon className="w-4 h-4 text-orange-500" />
          Employment Resources
        </h3>
        <div className="space-y-1.5">
          {[
            { label: 'Resume Writing Guide', url: 'https://www.canva.com/resumes/templates/' },
            { label: 'Interview Preparation', url: 'https://www.indeed.com/career-advice/interviewing' },
            { label: 'TESDA Scholarships', url: 'https://www.tesda.gov.ph' },
            { label: 'DOLE Employment Portal', url: 'https://www.dole.gov.ph' },
            { label: 'LinkedIn Profile Tips', url: 'https://www.linkedin.com/help/linkedin/answer/a548441' },
          ].map((link) => (
            <a
              key={link.label}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              <span className="w-1 h-1 rounded-full bg-blue-400 shrink-0" />
              {link.label}
            </a>
          ))}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-3">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <BuildingOfficeIcon className="w-4 h-4 text-orange-500" />
          Employment Reminder
        </h3>
        <p className="text-xs text-gray-600 mb-2">
          Have you recently changed jobs? Keep your employment information updated to help improve alumni analytics.
        </p>
        <button
          onClick={() => navigate('/profile')}
          className="w-full px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-medium rounded-lg transition-colors"
        >
          Update Employment
        </button>
      </div>
    </div>
  );
}

function ApplyModal({ job, onClose, onApplied }: { job: any; onClose: () => void; onApplied: (application: any, job?: any) => void }) {
  const [resume, setResume] = useState<File | null>(null);
  const [profileResume, setProfileResume] = useState<string | null>(null);
  const [coverLetter, setCoverLetter] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submittedApp, setSubmittedApp] = useState<any>(null);
  const [countdown, setCountdown] = useState(5);
  const addNotification = useUIStore((s) => s.addNotification);

  useEffect(() => {
    profileApi.get().then((p) => {
      if (p && p.resume_url) setProfileResume(p.resume_url);
    }).catch(() => {});
  }, []);

  // 5-second countdown & auto-close after successful submission
  useEffect(() => {
    if (!submittedApp) return;
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [submittedApp, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resume && !profileResume) {
      setError('You need a resume to apply. Attach one below or add it to your profile.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const app = await jobsApi.apply(job.id, { cover_letter: coverLetter || undefined, resume: resume || undefined });
      addNotification('Application submitted successfully', 'success');
      onApplied(app, job);
      setSubmittedApp(app);
    } catch (err: any) {
      setError(err.message || 'Failed to submit application. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submittedApp) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
        <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center shadow-xl transform transition-all" onClick={(e) => e.stopPropagation()}>
          <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-xs">
            <CheckCircleIcon className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-gray-900 mb-1">Application submitted</h3>
          <span className="inline-block px-3 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-semibold mb-3">
            Submitted
          </span>
          <p className="text-xs text-gray-500 mb-4 leading-relaxed">
            Your application for <span className="font-semibold text-gray-800">{job.position}</span> at <span className="font-semibold text-gray-800">{job.company_name}</span> has been received.
          </p>
          <div className="w-full bg-gray-100 rounded-full h-1.5 mb-3 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-1000 ease-linear"
              style={{ width: `${(countdown / 5) * 100}%` }}
            />
          </div>
          <p className="text-[11px] text-gray-400 mb-4">
            Closing in {countdown}s...
          </p>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 px-4 bg-gray-900 hover:bg-black text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Close Now
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-lg w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between px-6 py-4 bg-orange-500">
          <div>
            <h2 className="text-sm font-bold text-white">Apply for {job.position}</h2>
            <p className="text-xs text-orange-100">{job.company_name}</p>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white hover:bg-white/20 p-1.5 rounded-lg transition-colors"><XMarkIcon className="w-5 h-5" /></button>
        </div>
        <div className="p-6">

        {error && <div className="bg-red-50 text-red-700 px-3 py-2 rounded-lg mb-3 text-xs">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-3">
          {profileResume ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2.5">
              <p className="flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
                <CheckCircleIcon className="w-4 h-4" /> Your profile resume will be used
              </p>
              <p className="text-[11px] text-emerald-600 mt-0.5">No need to upload again. Use the option below only if you want to attach a different resume for this application.</p>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
              <p className="text-xs text-amber-700 font-medium">Upload a resume to apply</p>
              <p className="text-[11px] text-amber-600 mt-0.5">You don't have a resume on your profile yet, so please attach one below.</p>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Resume (PDF or DOC/DOCX){!profileResume && <span className="text-red-500"> *</span>}</label>
            <label className="flex items-center gap-2 border border-dashed border-gray-300 rounded-lg px-3 py-3 cursor-pointer hover:border-orange-400">
              <PaperClipIcon className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-600 truncate">
                {resume
                  ? resume.name
                  : profileResume
                    ? 'Choose a file (optional — attaches a different resume)'
                    : 'Choose a file (required)'}
              </span>
              <input type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="hidden" onChange={(e) => setResume(e.target.files?.[0] || null)} />
            </label>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Cover Letter (optional)</label>
            <textarea
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-orange-400 w-full"
              rows={4}
              placeholder="Why are you a great fit for this role?"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <a href={job.company_website || '#'} target="_blank" rel="noreferrer" className="text-xs text-gray-500 hover:underline flex items-center gap-1">
              <GlobeAltIcon className="w-3.5 h-3.5" /> Learn more about {job.company_name}
            </a>
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="px-3 py-1.5 text-xs font-medium bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={submitting} className="px-3 py-1.5 text-xs font-medium bg-orange-500 hover:bg-orange-600 text-white rounded-lg disabled:opacity-50">
                {submitting ? 'Submitting...' : 'Submit Application'}
              </button>
            </div>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
}

export default function JobsPage() {
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<any[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [myApplications, setMyApplications] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'opportunities' | 'applications' | 'saved'>('opportunities');
  const [filter, setFilter] = useState<JobFilter>('all');
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [applyJob, setApplyJob] = useState<any>(null);
  const [application, setApplication] = useState<any>(null);
  const [loadingApplication, setLoadingApplication] = useState<boolean>(false);
  const addNotification = useUIStore((s) => s.addNotification);

  const loadMyApplications = async () => {
    try {
      const list: any = await jobsApi.myApplications();
      setMyApplications(Array.isArray(list) ? list : []);
    } catch {
      setMyApplications([]);
    }
  };

  const loadMyApplication = async (job: any, shouldSetLoading = true) => {
    try {
      const app = await jobsApi.myApplication(job.id);
      if (app) {
        setApplication(app);
        setMyApplications((prev) => {
          const idx = prev.findIndex((a) => isJobMatch(a, job));
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = { ...next[idx], ...app };
            return next;
          }
          return [app, ...prev];
        });
      } else if (shouldSetLoading) {
        setApplication(null);
      }
    } catch {
      // keep current application state if fetch fails
    } finally {
      if (shouldSetLoading) {
        setLoadingApplication(false);
      }
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([
      jobsApi.list().catch(() => []),
      profileApi.get().catch(() => null),
      jobsApi.myApplications().catch(() => []),
    ]).then(([jobsData, profileData, appsData]: any) => {
      if (jobsData) setJobs(jobsData);
      if (profileData) setUserProfile(profileData);
      if (appsData) setMyApplications(Array.isArray(appsData) ? appsData : []);
    }).finally(() => setLoading(false));
  }, []);

  // Synchronize application state if myApplications arrives after selectedJob is chosen
  useEffect(() => {
    if (selectedJob && myApplications.length > 0 && !application) {
      const existing = myApplications.find((a) => isJobMatch(a, selectedJob));
      if (existing) {
        setApplication(existing);
        setLoadingApplication(false);
      }
    }
  }, [myApplications, selectedJob, application]);

  const [savedJobIds, setSavedJobIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('alumni_saved_jobs');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  const handleToggleSave = (jobId: string) => {
    setSavedJobIds((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) {
        next.delete(jobId);
        addNotification('Job removed from saved', 'info');
      } else {
        next.add(jobId);
        addNotification('Job saved successfully', 'success');
      }
      try {
        localStorage.setItem('alumni_saved_jobs', JSON.stringify([...next]));
      } catch {}
      return next;
    });
  };

  const handleWithdraw = async (appId: string) => {
    if (!window.confirm('Are you sure you want to withdraw this application?')) return;
    try {
      await jobsApi.withdraw(appId);
      addNotification('Application withdrawn successfully', 'success');
      setApplication(null);
      setMyApplications((prev) => prev.filter((a) => a.id !== appId));
      loadMyApplications();
    } catch (err: any) {
      addNotification(err.message || 'Failed to withdraw application', 'error');
    }
  };

  const handleViewDetails = (job: any, prefoundApp?: any) => {
    setSelectedJob(job);
    const existing = prefoundApp || myApplications.find((a) => isJobMatch(a, job));

    if (existing) {
      setApplication(existing);
      setLoadingApplication(false);
      loadMyApplication(job, false);
    } else {
      setApplication(null);
      setLoadingApplication(true);
      loadMyApplication(job, true);
    }
  };

  const handleApplyClick = (job: any, prefoundApp?: any) => {
    const existing = prefoundApp || myApplications.find((a) => isJobMatch(a, job));
    if (existing) {
      handleViewDetails(job, existing);
    } else {
      // Open application modal first without opening the full details yet
      setApplyJob(job);
    }
  };

  const handleApplied = (app: any, jobTarget?: any) => {
    const target = jobTarget || applyJob || selectedJob;
    setApplication(app);
    setLoadingApplication(false);
    setMyApplications((prev) => [app, ...prev]);
    // Once application is confirmed and submitted, open the full details of the job
    if (target) {
      setSelectedJob(target);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    loadMyApplications();
  };

  const now = Date.now();
  const weekAgo = now - 7 * 86400000;
  const companyCount = new Set(jobs.map((j: any) => j.company_name)).size;
  const newThisWeek = jobs.filter((j: any) => new Date(j.created_at).getTime() > weekAgo).length;

  const filteredJobs = jobs.filter((job) => {
    if (filter === 'all') return true;
    if (filter === 'exclusive') return job.is_alumni_exclusive;
    return job.job_type === filter;
  });

  const savedJobs = jobs.filter((job) => savedJobIds.has(job.id));

  const handleViewAll = () => {
    setSelectedJob(null);
    setFilter('all');
    setActiveTab('opportunities');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="max-w-7xl mx-auto pb-8">
      <div className="mb-4 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-base font-bold text-gray-900">Job Postings</h1>
          <p className="text-xs text-gray-500">Discover opportunities from companies hiring CTU-Naga alumni</p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => { setActiveTab('opportunities'); setSelectedJob(null); }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              activeTab === 'opportunities'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Job Opportunities
          </button>
          <button
            onClick={() => { setActiveTab('applications'); setSelectedJob(null); }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'applications'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <span>My Applications</span>
            {myApplications.length > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                activeTab === 'applications' ? 'bg-orange-100 text-orange-700' : 'bg-gray-200 text-gray-700'
              }`}>
                {myApplications.length}
              </span>
            )}
          </button>
          <button
            onClick={() => { setActiveTab('saved'); setSelectedJob(null); }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'saved'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <BookmarkIcon className="w-3.5 h-3.5" />
            <span>SAVED</span>
            {savedJobIds.size > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                activeTab === 'saved' ? 'bg-orange-100 text-orange-700 font-bold' : 'bg-gray-200 text-gray-700'
              }`}>
                {savedJobIds.size}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Metrics Row (visible on opportunities) */}
      {activeTab === 'opportunities' && !selectedJob && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
              <BriefcaseIcon className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900 leading-none">{jobs.length}</p>
              <p className="text-[11px] text-gray-500 mt-0.5">Total Job Opportunities</p>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
              <BuildingOfficeIcon className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900 leading-none">{companyCount}</p>
              <p className="text-[11px] text-gray-500 mt-0.5">Companies Hiring</p>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
              <ClockIcon className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900 leading-none">{newThisWeek}</p>
              <p className="text-[11px] text-gray-500 mt-0.5">New This Week</p>
            </div>
          </div>
        </div>
      )}

      {/* Filters (visible on opportunities list) */}
      {activeTab === 'opportunities' && !selectedJob && (
        <div className="flex flex-wrap items-center gap-2 mb-3 bg-white border border-gray-200 rounded-lg px-3 py-2">
          <BriefcaseIcon className="w-4 h-4 text-gray-400 shrink-0" />
          <div className="flex items-center gap-1 flex-wrap">
            {([
              { value: 'all', label: 'All' },
              { type: 'divider' },
              { value: 'full-time', label: 'Full-Time' },
              { value: 'part-time', label: 'Part-Time' },
              { value: 'contract', label: 'Contract' },
              { value: 'freelance', label: 'Freelance' },
              { value: 'internship', label: 'Internship' },
              { type: 'divider' },
              { value: 'exclusive', label: 'Alumni Exclusive' },
            ] as const).map((item: any, i: number) =>
              item.type === 'divider' ? (
                <span key={i} className="w-px h-4 bg-gray-300 mx-1" />
              ) : (
                <button
                  key={item.value}
                  onClick={() => setFilter(item.value as JobFilter)}
                  className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                    filter === item.value
                      ? 'bg-orange-500 text-white shadow-sm'
                      : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  {item.label}
                </button>
              )
            )}
          </div>
        </div>
      )}

      <div className="flex gap-4">
        <div className="flex-1 min-w-0 space-y-3">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <SkeletonCard className="h-64 rounded-3xl" />
              <SkeletonCard className="h-64 rounded-3xl" />
              <SkeletonCard className="h-64 rounded-3xl" />
              <SkeletonCard className="h-64 rounded-3xl" />
            </div>
          ) : activeTab === 'applications' ? (
            /* My Applications View */
            myApplications.length === 0 ? (
              <div className="text-center py-12 text-sm text-gray-500 bg-white border border-gray-200 rounded-lg px-4">
                <BriefcaseIcon className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="font-semibold text-gray-700">No applications submitted yet</p>
                <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                  Browse open job opportunities and apply directly through the portal to track your status here.
                </p>
                <button
                  onClick={() => setActiveTab('opportunities')}
                  className="mt-3 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-medium rounded-lg transition-colors"
                >
                  Browse Job Opportunities
                </button>
              </div>
            ) : (
              myApplications.map((app) => {
                const isScreened = app.is_screened;
                const pct = app.overall_match_score ?? app.match_percentage;
                const canWithdraw = ['pending', 'under_review', 'reviewed'].includes(app.status || 'pending');

                return (
                  <div key={app.id} className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-gray-900">{app.position || app.job_postings?.position || 'Job Opening'}</h3>
                          <StatusBadge status={app.status || (isScreened ? 'screened' : 'pending')} />
                        </div>
                        <p className="text-xs text-gray-600 mt-0.5">{app.company_name || app.job_postings?.company_name}</p>
                        <p className="text-[11px] text-gray-400 mt-1">
                          Applied on {new Date(app.applied_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>

                      {canWithdraw && (
                        <button
                          onClick={() => handleWithdraw(app.id)}
                          className="px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 border border-red-200 rounded-lg font-medium transition-colors"
                        >
                          Withdraw
                        </button>
                      )}
                    </div>

                    {/* Match Score & Sub-scores */}
                    {pct != null && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-gray-600 font-medium">Screening Match Score</span>
                          <span className={`font-bold ${
                            pct >= 80 ? 'text-green-600' : pct >= 50 ? 'text-amber-600' : 'text-gray-500'
                          }`}>{pct}%</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-500' : 'bg-gray-400'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>

                        {(app.skills_match_score != null || app.experience_match_score != null || app.education_match_score != null) && (
                          <div className="grid grid-cols-3 gap-2 mt-2">
                            <div className="bg-gray-50 p-2 rounded border border-gray-100 text-center">
                              <p className="text-[10px] text-gray-400">Skills (50%)</p>
                              <p className="text-xs font-bold text-gray-700">{app.skills_match_score ?? 0}%</p>
                            </div>
                            <div className="bg-gray-50 p-2 rounded border border-gray-100 text-center">
                              <p className="text-[10px] text-gray-400">Experience (30%)</p>
                              <p className="text-xs font-bold text-gray-700">{app.experience_match_score ?? 0}%</p>
                            </div>
                            <div className="bg-gray-50 p-2 rounded border border-gray-100 text-center">
                              <p className="text-[10px] text-gray-400">Education (20%)</p>
                              <p className="text-xs font-bold text-gray-700">{app.education_match_score ?? 0}%</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Matched & Missing Skills */}
                    {app.matched_skills?.length > 0 && (
                      <div className="mt-3">
                        <p className="text-[11px] text-gray-500 font-medium mb-1">Matched Skills</p>
                        <div className="flex flex-wrap gap-1">
                          {app.matched_skills.map((s: string) => (
                            <span key={s} className="bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded text-[11px] font-medium">
                              ✓ {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {app.missing_skills?.length > 0 && (
                      <div className="mt-2">
                        <p className="text-[11px] text-gray-500 font-medium mb-1">Skill Gaps</p>
                        <div className="flex flex-wrap gap-1">
                          {app.missing_skills.map((s: string) => (
                            <span key={s} className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-[11px]">
                              ✗ {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Application Progress Stepper */}
                    <NextStepsStepper status={app.status || (isScreened ? 'screened' : 'pending')} />
                  </div>
                );
              })
            )
          ) : activeTab === 'saved' ? (
            /* Saved Jobs View */
            savedJobs.length === 0 ? (
              <div className="text-center py-16 text-sm text-gray-500 bg-white border border-gray-200 px-4">
                <BookmarkIcon className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="font-semibold text-gray-700">No saved jobs yet</p>
                <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                  Click the "Save" button on any job card to bookmark opportunities you want to revisit later.
                </p>
                <button
                  onClick={() => setActiveTab('opportunities')}
                  className="mt-4 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer"
                >
                  Browse Job Opportunities
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {savedJobs.map((job) => {
                  const matchedApp = myApplications.find((a) => isJobMatch(a, job));
                  return (
                    <JobCard
                      key={job.id}
                      job={job}
                      userProfile={userProfile}
                      isApplied={!!matchedApp}
                      appliedStatus={matchedApp?.status}
                      isSaved={true}
                      onToggleSave={() => handleToggleSave(job.id)}
                      onViewDetails={() => handleViewDetails(job, matchedApp)}
                      onApply={() => handleApplyClick(job, matchedApp)}
                    />
                  );
                })}
              </div>
            )
          ) : selectedJob ? (
            <JobDetailView
              job={selectedJob}
              userProfile={userProfile}
              onBack={() => {
                setSelectedJob(null);
                setApplication(null);
                setLoadingApplication(false);
              }}
              application={application}
              loadingApplication={loadingApplication}
              onApply={() => setApplyJob(selectedJob)}
              onWithdraw={handleWithdraw}
            />
          ) : filteredJobs.length === 0 ? (
            <div className="text-center py-12 text-sm text-gray-500 bg-white border border-gray-200 rounded-lg">
              No job openings match this filter.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredJobs.map((job) => {
                const matchedApp = myApplications.find((a) => isJobMatch(a, job));
                return (
                  <JobCard
                    key={job.id}
                    job={job}
                    userProfile={userProfile}
                    isApplied={!!matchedApp}
                    appliedStatus={matchedApp?.status}
                    isSaved={savedJobIds.has(job.id)}
                    onToggleSave={() => handleToggleSave(job.id)}
                    onViewDetails={() => handleViewDetails(job, matchedApp)}
                    onApply={() => handleApplyClick(job, matchedApp)}
                  />
                );
              })}
            </div>
          )}
        </div>

        <aside className="hidden lg:block w-80 shrink-0">
          <div className="sticky top-16">
            <Sidebar jobs={jobs} onViewAll={handleViewAll} />
          </div>
        </aside>
      </div>

      {applyJob && (
        <ApplyModal
          job={applyJob}
          onClose={() => setApplyJob(null)}
          onApplied={handleApplied}
        />
      )}
    </div>
  );
}
