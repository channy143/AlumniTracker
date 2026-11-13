import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { jobsApi, profileApi } from '@/services/api';
import { useUIStore } from '@/store/uiStore';
import { SkeletonJobCard } from '@/components/ui/Skeleton';
import { getCached } from '@/utils/apiCache';
import { calculateMatchScore } from '@/utils/matchScoring';
import {
  MapPinIcon,
  CurrencyDollarIcon,
  ClockIcon,
  BriefcaseIcon,
  GlobeAltIcon,
  EnvelopeIcon,
  BuildingOfficeIcon,
  AcademicCapIcon,
  ArrowRightIcon,
  SparklesIcon,
  DocumentTextIcon,
  XMarkIcon,
  CheckCircleIcon,
  PaperClipIcon,
  BookmarkIcon,
  ArrowTopRightOnSquareIcon,
  InformationCircleIcon,
  PhoneIcon,
  ComputerDesktopIcon,
  CheckIcon,
  EyeIcon,
  UserGroupIcon,
  ArrowsPointingOutIcon,
} from '@heroicons/react/24/outline';
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

export const INDUSTRY_PRESETS = [
  { id: 'bpo', name: 'BPO', aliases: ['bpo', 'call center', 'outsourcing', 'customer service'], label: 'Call centers & outsourcing', icon: PhoneIcon },
  { id: 'education', name: 'Education', aliases: ['education', 'esl', 'teacher', 'academic', 'school'], label: 'ESL & academic institutions', icon: AcademicCapIcon },
  { id: 'agriculture', name: 'Agriculture', aliases: ['agriculture', 'farming', 'agribusiness', 'crop'], label: 'Farming & agribusiness', icon: SparklesIcon },
  { id: 'it', name: 'Information Technology', aliases: ['tech', 'software', 'developer', 'engineer', 'it'], label: 'Software, cloud & IT support', icon: ComputerDesktopIcon },
];

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
    <div className="relative bg-white border border-gray-200 rounded-xl sm:rounded-none p-4 sm:p-6 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden">
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
          {job.vacancies_count && Number(job.vacancies_count) > 1 && (
            <span className="px-3 py-1 text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
              {job.vacancies_count} Openings
            </span>
          )}
          {job.poster_url && (
            <span className="px-3 py-1 text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
              Flyer
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

          <div className="shrink-0 flex items-center gap-1.5">
            {job.application_url && (
              <a
                href={job.application_url.startsWith('http') ? job.application_url : `https://${job.application_url}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="p-2.5 border border-gray-200 hover:border-orange-300 hover:bg-orange-50 text-gray-500 hover:text-orange-600 transition-colors flex items-center justify-center cursor-pointer"
                title="Open external job posting / application link"
              >
                <GlobeAltIcon className="w-4 h-4" />
              </a>
            )}
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

function renderTextWithLinks(text?: string) {
  if (!text) return null;
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
  const parts = text.split(urlRegex);
  return parts.map((part, index) => {
    if (part.match(urlRegex)) {
      const href = part.startsWith('http') ? part : `https://${part}`;
      return (
        <a
          key={index}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-orange-600 hover:text-orange-700 underline font-medium break-all"
        >
          {part}
        </a>
      );
    }
    return part;
  });
}

function JobDetailView({
  job,
  userProfile,
  onBack,
  isSaved,
  onToggleSave,
}: {
  job: any;
  userProfile?: any;
  onBack: () => void;
  isSaved?: boolean;
  onToggleSave?: () => void;
}) {
  const [showPosterModal, setShowPosterModal] = useState(false);
  const matchResult = userProfile ? calculateMatchScore(job, userProfile) : null;
  const matchScore = matchResult?.overall_score ?? null;

  // Compute matched and missing skills
  const userSkillNames = (userProfile?.skills || []).map((s: any) =>
    (typeof s === 'string' ? s : s.name || '').toLowerCase().trim()
  );

  const matchedSkills: string[] = [];
  const missingSkills: string[] = [];

  (job.required_skills || []).forEach((reqSkill: string) => {
    const norm = reqSkill.toLowerCase().trim();
    if (userSkillNames.some((us: string) => us === norm || us.includes(norm) || norm.includes(us))) {
      matchedSkills.push(reqSkill);
    } else {
      missingSkills.push(reqSkill);
    }
  });

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs">
      {/* Top Header: Back navigation & Actions */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-3 bg-gray-50/60">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-semibold text-orange-600 hover:text-orange-700 transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          <span>Back to listings</span>
        </button>

        <div className="flex items-center gap-2">
          {job.poster_url && (
            <button
              type="button"
              onClick={() => setShowPosterModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 text-xs font-semibold shadow-2xs transition-all cursor-pointer"
              title="View original hiring advertisement flyer"
            >
              <EyeIcon className="w-3.5 h-3.5 text-orange-600" />
              <span>View Original Flyer</span>
            </button>
          )}

          <button
            type="button"
            onClick={onToggleSave}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
              isSaved
                ? 'bg-orange-50 border-orange-300 text-orange-600 shadow-2xs'
                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {isSaved ? <BookmarkSolidIcon className="w-4 h-4 text-orange-600" /> : <BookmarkIcon className="w-4 h-4 text-gray-500" />}
            <span>{isSaved ? 'Saved Opportunity' : 'Save Opportunity'}</span>
          </button>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-6">
        {/* 1. THE CORE IDENTITY (The "Hook") */}
        <div className="pb-5 border-b border-gray-100">
          <div className="min-w-0">
            {/* Job Title - Large */}
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight leading-tight">
              {job.position}
            </h1>

            {/* Company Name: Right under the title */}
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="text-base font-bold text-gray-800">{job.company_name}</span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-600" />
                Verified employer
              </span>
              {job.company_website && (
                <a
                  href={job.company_website.startsWith('http') ? job.company_website : `https://${job.company_website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-orange-600 hover:text-orange-700 hover:underline font-medium inline-flex items-center gap-1"
                >
                  <GlobeAltIcon className="w-3.5 h-3.5" />
                  Website ↗
                </a>
              )}
            </div>

            {/* Key Details: Location, Salary, Job Type, Industry grouped in one clean horizontal row */}
            <div className="flex items-center gap-2 sm:gap-2.5 text-xs text-gray-700 mt-3 flex-wrap">
              {job.location && (
                <span className="inline-flex items-center gap-1 bg-gray-50 border border-gray-200/90 px-2.5 py-1 rounded-lg font-medium">
                  <MapPinIcon className="w-3.5 h-3.5 text-gray-400" />
                  <span>{job.location}</span>
                </span>
              )}
              {job.salary_range && (
                <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-lg font-bold">
                  <CurrencyDollarIcon className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{job.salary_range}</span>
                </span>
              )}
              <span className="inline-flex items-center gap-1 bg-gray-50 border border-gray-200/90 px-2.5 py-1 rounded-lg font-medium">
                <BriefcaseIcon className="w-3.5 h-3.5 text-gray-400" />
                <span>{JOB_TYPE_LABELS[job.job_type] || job.job_type || 'Full-time'}</span>
              </span>
              {job.industry && (
                <span className="px-2.5 py-1 rounded-lg font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  {job.industry}
                </span>
              )}
              {job.experience_level && (
                <span className="px-2.5 py-1 rounded-lg font-medium bg-gray-100 text-gray-700 capitalize">
                  {job.experience_level} Level
                </span>
              )}
              {job.is_remote && (
                <span className="px-2.5 py-1 rounded-lg font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                  Remote
                </span>
              )}
              {job.is_alumni_exclusive && (
                <span className="px-2.5 py-1 rounded-lg font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                  Alumni Exclusive
                </span>
              )}
            </div>

            {/* Meta Data: Subtle smaller text line below key details */}
            <div className="text-xs text-gray-400 mt-3 flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-gray-600">
                Available vacancies: <span className="text-orange-600 font-bold">{job.vacancies_count ? `${job.vacancies_count} position${Number(job.vacancies_count) > 1 ? 's' : ''}` : '1 position'}</span>
              </span>
              <span>&middot;</span>
              <span>Posted {formatDate(job.created_at)}</span>
              {job.expires_at && (
                <>
                  <span>&middot;</span>
                  <span className="font-medium text-gray-600">
                    Application deadline: {new Date(job.expires_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* 2. THE FLYER IMAGE (Big, placed right before About the Role) */}
        {job.poster_url && (
          <div className="rounded-2xl border border-gray-200/90 bg-gray-50/70 p-3 sm:p-4 shadow-2xs group transition-all">
            <div className="w-full flex items-center justify-between pb-3 px-0.5">
              <div className="px-3 py-1 bg-white rounded-full text-gray-800 text-[11px] font-semibold flex items-center gap-1.5 border border-gray-200 shadow-2xs">
                <SparklesIcon className="w-3.5 h-3.5 text-orange-500" />
                <span>Official Hiring Flyer</span>
              </div>

              <button
                type="button"
                onClick={() => setShowPosterModal(true)}
                className="px-2.5 py-1 bg-white hover:bg-gray-100 text-gray-800 text-xs font-semibold rounded-lg shadow-2xs border border-gray-200 transition-all flex items-center gap-1.5 cursor-pointer hover:border-gray-300"
                title="Click to view full size in lightbox"
              >
                <EyeIcon className="w-3.5 h-3.5 text-orange-600" />
                <span>Fullscreen Lightbox</span>
              </button>
            </div>

            <div
              className="w-full flex items-center justify-center cursor-pointer overflow-hidden rounded-xl bg-white border border-gray-100 shadow-xs"
              onClick={() => setShowPosterModal(true)}
            >
              <img
                src={job.poster_url}
                alt={`${job.company_name} - ${job.position}`}
                className="w-full h-auto block rounded-xl transition-transform duration-200 hover:opacity-95"
              />
            </div>
          </div>
        )}

        {/* 3. THE JOB DESCRIPTION (The "Meat") */}
        <div className="space-y-4">
          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">About the Role</h3>
            <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-line bg-gray-50/70 p-4 sm:p-5 rounded-xl border border-gray-200/80">
              {renderTextWithLinks(job.description)}
            </div>
          </div>

          {/* Required Skills Tags */}
          {Array.isArray(job.required_skills) && job.required_skills.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Required Skills</h3>
              <div className="flex flex-wrap gap-1.5">
                {job.required_skills.map((skill: string, idx: number) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-lg border border-gray-200"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Qualifications & Requirements */}
          {job.requirements?.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Qualifications & Requirements</h3>
              <ul className="space-y-2 bg-gray-50/70 p-4 sm:p-5 rounded-xl border border-gray-200/80">
                {job.requirements.map((req: string, i: number) => (
                  <li key={i} className="flex items-start gap-2.5 text-xs text-gray-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1.5 shrink-0" />
                    <span>{req}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* 4. THE COMPATIBILITY SCORE (The "Value Add") - Placed below the job description */}
        {matchResult && matchScore !== null && (
          <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-900">Your Job Compatibility</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  Career Guidance
                </span>
              </div>
              <span className={`text-sm font-bold ${
                matchScore >= 80 ? 'text-green-600' : matchScore >= 50 ? 'text-amber-600' : 'text-gray-500'
              }`}>
                {matchScore}% Match
              </span>
            </div>

            <div className="w-full bg-gray-100 rounded-full h-2 mb-3 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  matchScore >= 80 ? 'bg-green-500' : matchScore >= 50 ? 'bg-amber-500' : 'bg-gray-400'
                }`}
                style={{ width: `${matchScore}%` }}
              />
            </div>

            <div className="grid grid-cols-3 gap-2.5 mb-3.5">
              <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100 text-center">
                <p className="text-[10px] text-gray-500 font-medium">Skills Match (50%)</p>
                <p className="text-xs font-bold text-gray-800 mt-0.5">{matchResult.skills_score}%</p>
              </div>
              <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100 text-center">
                <p className="text-[10px] text-gray-500 font-medium">Experience (30%)</p>
                <p className="text-xs font-bold text-gray-800 mt-0.5">{matchResult.experience_score}%</p>
              </div>
              <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100 text-center">
                <p className="text-[10px] text-gray-500 font-medium">Education (20%)</p>
                <p className="text-xs font-bold text-gray-800 mt-0.5">{matchResult.education_score}%</p>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100 space-y-2">
              <p className="text-xs font-semibold text-gray-800">Skills Comparison:</p>
              <div className="flex flex-wrap gap-1.5">
                {matchedSkills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200"
                  >
                    <CheckIcon className="w-3 h-3 text-emerald-600" />
                    <span>{skill} (Matched)</span>
                  </span>
                ))}
                {missingSkills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200"
                  >
                    <span className="font-bold text-amber-600">+</span>
                    <span>{skill} (Recommended to develop)</span>
                  </span>
                ))}
              </div>
            </div>

            <p className="text-[10px] text-gray-400 mt-3 italic">
              * This compatibility score is an informational estimate to help evaluate your qualifications against the job requirements. The hiring employer independently conducts candidate review and selection.
            </p>
          </div>
        )}

        {/* 5. THE WARNINGS & ALERTS + OFFICIAL APPLICATION CHANNELS (The "Rules & Apply") - Moved to the very bottom */}
        <div className="bg-gradient-to-r from-orange-50/90 via-amber-50/60 to-orange-50/90 border border-orange-200/90 rounded-2xl p-4 sm:p-5 shadow-xs">
          <div className="mb-2">
            <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <ArrowTopRightOnSquareIcon className="w-4 h-4 text-orange-600" />
              Official Application Channels
            </h4>
            <p className="text-xs text-gray-600 mt-0.5">
              {job.application_url
                ? "Apply directly through the employer's official website or recruitment channels below."
                : "Apply directly through the employer's official contact information below."}
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap mt-3.5">
            {job.application_url && (
              <a
                href={job.application_url.startsWith('http') ? job.application_url : `https://${job.application_url}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <span>Visit company application page</span>
                <ArrowTopRightOnSquareIcon className="w-4 h-4" />
              </a>
            )}

            {job.contact_email && (
              <a
                href={`mailto:${job.contact_email}?subject=${encodeURIComponent(`Application for ${job.position} - CTU Naga Alumni`)}`}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white hover:bg-gray-50 border border-gray-200 text-gray-800 text-xs font-semibold rounded-xl shadow-xs transition-colors"
              >
                <EnvelopeIcon className="w-4 h-4 text-blue-600" />
                <span>Email HR ({job.contact_email})</span>
              </a>
            )}

            {job.contact_phone && (
              <a
                href={`tel:${job.contact_phone}`}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white hover:bg-gray-50 border border-gray-200 text-gray-800 text-xs font-semibold rounded-xl shadow-xs transition-colors"
              >
                <PhoneIcon className="w-4 h-4 text-emerald-600" />
                <span>Call Recruitment ({job.contact_phone})</span>
              </a>
            )}
          </div>

          {/* Direct Employer Screening notice combined near the apply button */}
          <div className="mt-3.5 pt-3 border-t border-orange-200/60 flex items-start gap-2 text-[11px] text-gray-600 leading-relaxed">
            <InformationCircleIcon className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
            <span>
              <strong>Direct Employer Screening:</strong> Candidates submit applications and resumes directly to the employer. <strong>{job.company_name}</strong> conducts all applicant screening, interviews, and hiring decisions independently.
            </span>
          </div>
        </div>

        {/* Lightbox Modal (Shows full flyer uncropped in high-res modal) */}
        {showPosterModal && job.poster_url && (
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150"
            onClick={() => setShowPosterModal(false)}
          >
            <div
              className="bg-gray-900 rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl border border-white/10"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-4 py-3 bg-gray-800 text-white flex items-center justify-between">
                <span className="text-xs font-semibold flex items-center gap-1.5">
                  <SparklesIcon className="w-4 h-4 text-orange-400" />
                  {job.company_name} — {job.position}
                </span>
                <div className="flex items-center gap-2">
                  <a
                    href={job.poster_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 text-xs bg-white/10 hover:bg-white/20 rounded-md text-white transition-colors"
                  >
                    Open Original ↗
                  </a>
                  <button
                    type="button"
                    onClick={() => setShowPosterModal(false)}
                    className="text-gray-400 hover:text-white p-1 rounded-md cursor-pointer"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-black/60">
                <img
                  src={job.poster_url}
                  alt={job.position}
                  className="max-h-[80vh] w-auto object-contain rounded-lg shadow-lg"
                />
              </div>
            </div>
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
              Browse verified employment opportunities by industry and position.
            </p>
          </div>

          {/* Flow Step 2 */}
          <div className="relative">
            <span className="absolute -left-5 top-0 w-[18px] h-[18px] rounded-full bg-orange-500 text-white flex items-center justify-center text-[10px] font-bold ring-2 ring-white">
              2
            </span>
            <p className="text-xs font-medium text-gray-800">
              Review personal Job Compatibility and identify missing skills to develop.
            </p>
          </div>

          {/* Flow Step 3 */}
          <div className="relative">
            <span className="absolute -left-5 top-0 w-[18px] h-[18px] rounded-full bg-orange-500 text-white flex items-center justify-center text-[10px] font-bold ring-2 ring-white">
              3
            </span>
            <p className="text-xs font-medium text-gray-800">
              Connect with fellow CTU alumni working at the company for guidance.
            </p>
          </div>

          {/* Flow Step 4 */}
          <div className="relative">
            <span className="absolute -left-5 top-0 w-[18px] h-[18px] rounded-full bg-orange-500 text-white flex items-center justify-center text-[10px] font-bold ring-2 ring-white">
              4
            </span>
            <p className="text-xs font-medium text-gray-800">
              Apply directly to the employer via their official careers portal or HR email.
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

export default function JobsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlFilter = searchParams.get('q') || searchParams.get('filter') || searchParams.get('search') || searchParams.get('company') || searchParams.get('industry') || '';
  const [queryFilter, setQueryFilter] = useState(urlFilter);

  useEffect(() => {
    setQueryFilter(urlFilter);
  }, [urlFilter]);

  const [loading, setLoading] = useState(() => getCached('/jobs') === undefined);
  const [jobs, setJobs] = useState<any[]>(() => getCached<any[]>('/jobs') || []);
  const [userProfile, setUserProfile] = useState<any>(() => getCached('/profile') || null);
  const [activeTab, setActiveTab] = useState<'opportunities' | 'saved'>('opportunities');
  const [filter, setFilter] = useState<JobFilter>('all');
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const addNotification = useUIStore((s) => s.addNotification);

  useEffect(() => {
    if (getCached('/jobs') === undefined) setLoading(true);
    Promise.all([
      jobsApi.list().catch(() => []),
      profileApi.get().catch(() => null),
    ]).then(([jobsData, profileData]: any) => {
      if (jobsData) setJobs(jobsData);
      if (profileData) setUserProfile(profileData);
    }).finally(() => setLoading(false));
  }, []);

  const tabParam = searchParams.get('tab');
  const targetJobId = searchParams.get('job') || searchParams.get('id');

  useEffect(() => {
    if (tabParam === 'saved' || tabParam === 'opportunities') {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  useEffect(() => {
    if (targetJobId && jobs.length > 0) {
      const match = jobs.find((j) => j.id === targetJobId);
      if (match) {
        setSelectedJob(match);
      }
    }
  }, [targetJobId, jobs]);

  const [savedJobIds, setSavedJobIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('alumni_saved_jobs');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  const handleToggleSave = (jobId: string) => {
    const isCurrentlySaved = savedJobIds.has(jobId);
    const next = new Set(savedJobIds);
    if (isCurrentlySaved) {
      next.delete(jobId);
      addNotification('Job removed from saved', 'info');
    } else {
      next.add(jobId);
      addNotification('Job saved successfully', 'success');
    }
    setSavedJobIds(next);
    try {
      localStorage.setItem('alumni_saved_jobs', JSON.stringify([...next]));
    } catch {}
  };

  const handleViewDetails = (job: any) => {
    setSelectedJob(job);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleApplyClick = (job: any) => {
    handleViewDetails(job);
  };

  const now = Date.now();
  const weekAgo = now - 7 * 86400000;
  const companyCount = new Set(jobs.map((j: any) => j.company_name)).size;
  const newThisWeek = jobs.filter((j: any) => new Date(j.created_at).getTime() > weekAgo).length;

  const filteredJobs = jobs.filter((job) => {
    if (filter === 'exclusive' && !job.is_alumni_exclusive) return false;
    if (filter !== 'all' && filter !== 'exclusive' && job.job_type !== filter) return false;
    if (queryFilter) {
      const q = queryFilter.toLowerCase().trim();
      const posMatch = (job.position || '').toLowerCase().includes(q);
      const compMatch = (job.company_name || '').toLowerCase().includes(q);
      const indMatch = (job.industry || '').toLowerCase().includes(q);
      const preset = INDUSTRY_PRESETS.find((p) => p.name.toLowerCase() === q || p.aliases.includes(q));
      const aliasMatch = preset ? preset.aliases.some((a) => (job.industry || '').toLowerCase().includes(a) || (job.position || '').toLowerCase().includes(a)) : false;
      return posMatch || compMatch || indMatch || aliasMatch;
    }
    return true;
  });

  const savedJobs = jobs.filter((job) => savedJobIds.has(job.id));

  const handleViewAll = () => {
    setSelectedJob(null);
    setFilter('all');
    setQueryFilter('');
    setActiveTab('opportunities');
    const next = new URLSearchParams(searchParams);
    next.delete('q');
    next.delete('filter');
    next.delete('search');
    next.delete('company');
    next.delete('industry');
    setSearchParams(next, { replace: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="max-w-7xl mx-auto pb-8">
      <div className="mb-4 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-base font-bold text-gray-900">Job Opportunities</h1>
          <p className="text-xs text-gray-500">Discover verified employment opportunities directly from employers hiring CTU-Naga alumni</p>
        </div>

        {/* View Switcher Tabs: Job Opportunities & SAVED */}
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg w-full sm:w-auto overflow-x-auto scrollbar-none">
          <button
            onClick={() => { setActiveTab('opportunities'); setSelectedJob(null); }}
            className={`flex-1 sm:flex-initial justify-center whitespace-nowrap px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center cursor-pointer ${
              activeTab === 'opportunities'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Job Opportunities
          </button>
          <button
            onClick={() => { setActiveTab('saved'); setSelectedJob(null); }}
            className={`flex-1 sm:flex-initial justify-center whitespace-nowrap px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'saved'
                ? 'bg-white text-gray-900 shadow-xs'
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

      {/* Metrics Row (visible on opportunities when no job is selected) */}
      {activeTab === 'opportunities' && !selectedJob && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-center gap-3 shadow-2xs">
            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
              <BriefcaseIcon className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900 leading-none">{jobs.length}</p>
              <p className="text-[11px] text-gray-500 mt-0.5">Total Job Opportunities</p>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-center gap-3 shadow-2xs">
            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
              <BuildingOfficeIcon className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900 leading-none">{companyCount}</p>
              <p className="text-[11px] text-gray-500 mt-0.5">Companies Hiring</p>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-center gap-3 shadow-2xs">
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

      {/* Browse by Industry Quick Bar (as suggested by Ma'am) */}
      {activeTab === 'opportunities' && !selectedJob && (
        <div className="mb-4 bg-white border border-gray-200 rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-900 tracking-tight">Browse by industry</span>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-semibold px-2 py-0.2 rounded-full">New</span>
            </div>
            {queryFilter && (
              <button
                onClick={() => {
                  setQueryFilter('');
                  const next = new URLSearchParams(searchParams);
                  next.delete('q');
                  next.delete('filter');
                  next.delete('search');
                  next.delete('company');
                  next.delete('industry');
                  setSearchParams(next, { replace: true });
                }}
                className="text-[11px] font-medium text-orange-600 hover:text-orange-700 flex items-center gap-1 cursor-pointer"
              >
                Reset industry filter <XMarkIcon className="w-3 h-3" />
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {INDUSTRY_PRESETS.map((ind) => {
              const Icon = ind.icon;
              const isSelected = queryFilter.toLowerCase() === ind.name.toLowerCase() || ind.aliases.some((a) => queryFilter.toLowerCase().includes(a));
              return (
                <button
                  key={ind.id}
                  onClick={() => {
                    if (isSelected) {
                      setQueryFilter('');
                      const next = new URLSearchParams(searchParams);
                      next.delete('industry');
                      setSearchParams(next, { replace: true });
                    } else {
                      setQueryFilter(ind.name);
                      const next = new URLSearchParams(searchParams);
                      next.set('industry', ind.name);
                      setSearchParams(next, { replace: true });
                    }
                  }}
                  className={`p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                    isSelected
                      ? 'border-orange-500 bg-orange-50/70 text-orange-900 shadow-xs ring-1 ring-orange-400'
                      : 'border-blue-100/70 bg-gradient-to-b from-blue-50/50 to-indigo-50/20 text-gray-800 hover:border-blue-300 hover:shadow-2xs'
                  }`}
                >
                  <Icon className={`w-5 h-5 mb-1.5 ${isSelected ? 'text-orange-600' : 'text-slate-600'}`} />
                  <span className="text-xs font-bold leading-tight">{ind.name}</span>
                  <span className="text-[10px] text-gray-500 mt-0.5 leading-tight truncate max-w-full">{ind.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Active Filter Banner */}
      {queryFilter && activeTab === 'opportunities' && !selectedJob && (
        <div className="flex items-center justify-between gap-2 mb-3 bg-orange-50 border border-orange-200 rounded-lg px-3.5 py-2">
          <div className="flex items-center gap-2 min-w-0">
            <BriefcaseIcon className="w-4 h-4 text-orange-600 shrink-0" />
            <span className="text-xs text-orange-800">
              Showing opportunities matching <strong>"{queryFilter}"</strong> ({filteredJobs.length} found)
            </span>
          </div>
          <button
            onClick={() => {
              setQueryFilter('');
              const next = new URLSearchParams(searchParams);
              next.delete('q');
              next.delete('filter');
              next.delete('search');
              next.delete('company');
              next.delete('industry');
              setSearchParams(next, { replace: true });
            }}
            className="text-xs font-semibold text-orange-600 hover:text-orange-800 flex items-center gap-1 hover:underline cursor-pointer shrink-0"
          >
            Clear Filter <XMarkIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Job Type Filters */}
      {activeTab === 'opportunities' && !selectedJob && (
        <div data-tour="jobs-search" className="flex flex-wrap items-center gap-2 mb-3 bg-white border border-gray-200 rounded-lg px-3 py-2">
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
                      ? 'bg-orange-500 text-white shadow-xs'
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
        <div data-tour="jobs-grid" className="flex-1 min-w-0 space-y-3">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <SkeletonJobCard />
              <SkeletonJobCard />
              <SkeletonJobCard />
              <SkeletonJobCard />
            </div>
          ) : activeTab === 'saved' ? (
            /* Saved Jobs View */
            savedJobs.length === 0 ? (
              <div className="text-center py-16 text-sm text-gray-500 bg-white border border-gray-200 px-4 rounded-xl">
                <BookmarkIcon className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="font-semibold text-gray-700">No saved opportunities yet</p>
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
                {savedJobs.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    userProfile={userProfile}
                    isSaved={true}
                    onToggleSave={() => handleToggleSave(job.id)}
                    onViewDetails={() => handleViewDetails(job)}
                    onApply={() => handleApplyClick(job)}
                  />
                ))}
              </div>
            )
          ) : selectedJob ? (
            <JobDetailView
              job={selectedJob}
              userProfile={userProfile}
              onBack={() => {
                setSelectedJob(null);
                if (searchParams.has('job') || searchParams.has('id')) {
                  const next = new URLSearchParams(searchParams);
                  next.delete('job');
                  next.delete('id');
                  setSearchParams(next, { replace: true });
                }
              }}
              isSaved={savedJobIds.has(selectedJob.id)}
              onToggleSave={() => handleToggleSave(selectedJob.id)}
            />
          ) : filteredJobs.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-8 sm:p-12 text-center shadow-xs flex flex-col items-center justify-center">
              <BriefcaseIcon className="w-10 h-10 text-gray-300 mx-auto mb-3 stroke-1" />
              <h3 className="text-base font-bold text-gray-900">
                {queryFilter
                  ? `No ${queryFilter} job openings right now`
                  : filter !== 'all' && filter !== 'exclusive'
                    ? `No ${JOB_TYPE_LABELS[filter] || filter} job openings right now`
                    : filter === 'exclusive'
                      ? 'No Alumni Exclusive job openings right now'
                      : 'No matching job openings right now'}
              </h3>
              <p className="text-xs sm:text-sm text-gray-500 mt-1.5 max-w-md mx-auto leading-relaxed">
                We don't have verified openings in this category yet. Explore other industries or view all {jobs.length} active job opportunities.
              </p>
              <button
                type="button"
                onClick={handleViewAll}
                className="mt-4 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-xs inline-flex items-center gap-1.5"
              >
                <span>View All Jobs</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredJobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  userProfile={userProfile}
                  isSaved={savedJobIds.has(job.id)}
                  onToggleSave={() => handleToggleSave(job.id)}
                  onViewDetails={() => handleViewDetails(job)}
                  onApply={() => handleApplyClick(job)}
                />
              ))}
            </div>
          )}
        </div>

        <aside className="hidden lg:block w-80 shrink-0">
          <div className="sticky top-16">
            <Sidebar jobs={jobs} onViewAll={handleViewAll} />
          </div>
        </aside>
      </div>
    </div>
  );
}
