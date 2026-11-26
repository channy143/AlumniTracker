import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AcademicCapIcon,
  ArrowRightIcon,
  BriefcaseIcon,
  ChartBarIcon,
  HandRaisedIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { useCountUp } from '@/hooks/useCountUp';

interface MobileNumbersSectionProps {
  revealed: boolean;
  totalAlumni: number;
  employmentRate: number;
  mentorshipMatches: number;
  programsTracked: number;
  activeJobsCount: number;
  employmentBreakdown?: {
    employedCount: number;
    unemployedCount: number;
    unreportedCount: number;
  };
  onViewJobs: () => void;
}

function CompactStatRing({ value, max }: { value: number; max: number }) {
  const { count, ref } = useCountUp(value);
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const [offset, setOffset] = useState(circumference);

  useEffect(() => {
    const progress = Math.min(count / Math.max(max, 1), 1);
    setOffset(circumference * (1 - progress));
  }, [count, max, circumference]);

  return (
    <div className="relative w-[88px] h-[88px] sm:w-24 sm:h-24 shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 90 90">
        <circle
          cx="45"
          cy="45"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="5"
          className="text-white/10"
        />
        <motion.circle
          cx="45"
          cy="45"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="5"
          strokeLinecap="round"
          className="text-ctu-marigold"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          initial={false}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          ref={ref}
          className="text-xl sm:text-2xl font-bold font-display text-ctu-marigold leading-none"
        >
          {count}+
        </span>
        <span className="text-[8px] uppercase tracking-widest text-gray-300 mt-1">
          Alumni
        </span>
      </div>
    </div>
  );
}

export function MobileNumbersSection({
  revealed,
  totalAlumni,
  employmentRate,
  mentorshipMatches,
  programsTracked,
  activeJobsCount,
  employmentBreakdown,
  onViewJobs,
}: MobileNumbersSectionProps) {
  const [outcomeTab, setOutcomeTab] = useState<'overview' | 'breakdown'>('overview');

  const employedCount = employmentBreakdown?.employedCount ?? 0;
  const unemployedCount = employmentBreakdown?.unemployedCount ?? 0;
  const unreportedCount = employmentBreakdown?.unreportedCount ?? totalAlumni;
  const employedPct = totalAlumni > 0 ? Math.round((employedCount / totalAlumni) * 100) : 0;
  const unreportedPct = totalAlumni > 0 ? Math.round((unreportedCount / totalAlumni) * 100) : 0;

  return (
    <div className="lg:hidden w-full max-w-lg md:max-w-xl mx-auto px-2 sm:px-3 space-y-3">
      {/* ─── 1. Compact Header ─── */}
      <motion.div
        initial={false}
        animate={revealed ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <span className="text-ctu-gold text-[10px] sm:text-xs uppercase tracking-[0.22em] font-semibold flex items-center gap-2.5">
          <span className="w-6 h-px bg-ctu-gold/60" />
          By the Numbers
        </span>
        <h2 className="text-[1.75rem] sm:text-4xl font-bold font-display text-white mt-1.5 leading-[1.06]">
          <span className="text-ctu-marigold">{totalAlumni.toLocaleString()}+</span>{' '}
          Alumni Strong
        </h2>
        <p className="text-xs sm:text-[13px] text-gray-400 mt-1 leading-relaxed">
          Verified graduates learning, connecting, and building a lasting legacy.
        </p>
      </motion.div>

      {/* ─── 2. Horizontal Verified Network Ring Card ─── */}
      <motion.div
        initial={false}
        animate={revealed ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
        transition={{ duration: 0.55, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
        className="rounded-2xl bg-gradient-to-br from-ctu-blue/50 via-[#13223b] to-[#0b1324] border border-ctu-gold/25 p-4 flex items-center gap-4 shadow-xl"
      >
        <CompactStatRing value={totalAlumni} max={Math.max(totalAlumni * 1.2, 100)} />

        <div className="min-w-0 flex-1">
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-ctu-marigold">
            <SparklesIcon className="w-3 h-3" />
            Verified Network
          </span>
          <h3 className="text-sm sm:text-base font-bold font-display text-white mt-0.5 leading-snug">
            Registrar-Matched Directory
          </h3>
          <p className="text-[11px] text-gray-300 mt-0.5 leading-snug line-clamp-2">
            Verified against CTU-Naga Registrar records and active across industries.
          </p>
          <Link
            to="/auth/register"
            className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-ctu-marigold hover:underline"
          >
            <span>Join Cross-Batch Directory</span>
            <ArrowRightIcon className="w-3 h-3" />
          </Link>
        </div>
      </motion.div>

      {/* ─── 3. 3-Column Live Telemetry Strip ─── */}
      <motion.div
        initial={false}
        animate={revealed ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
        transition={{ duration: 0.55, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
        className="grid grid-cols-3 gap-2.5"
      >
        {/* Connections */}
        <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold uppercase tracking-wider text-blue-300">
              Links
            </span>
            <HandRaisedIcon className="w-3.5 h-3.5 text-blue-300 shrink-0" />
          </div>
          <div className="mt-2">
            <div className="text-2xl sm:text-3xl font-bold font-display text-white leading-none">
              {mentorshipMatches.toLocaleString()}
            </div>
            <div className="text-[10px] text-gray-400 mt-1 truncate">Connections</div>
          </div>
        </div>

        {/* Active Jobs */}
        <button
          type="button"
          onClick={onViewJobs}
          className="rounded-2xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/10 hover:border-ctu-marigold/40 p-3 flex flex-col justify-between text-left transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold uppercase tracking-wider text-ctu-marigold">
              Jobs
            </span>
            <BriefcaseIcon className="w-3.5 h-3.5 text-ctu-marigold shrink-0" />
          </div>
          <div className="mt-2">
            <div className="text-2xl sm:text-3xl font-bold font-display text-white leading-none">
              {activeJobsCount}
            </div>
            <div className="text-[10px] text-ctu-marigold font-medium mt-1 inline-flex items-center gap-0.5">
              <span>View</span>
              <ArrowRightIcon className="w-2.5 h-2.5" />
            </div>
          </div>
        </button>

        {/* Programs */}
        <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold uppercase tracking-wider text-ctu-gold">
              Degrees
            </span>
            <AcademicCapIcon className="w-3.5 h-3.5 text-ctu-gold shrink-0" />
          </div>
          <div className="mt-2">
            <div className="text-2xl sm:text-3xl font-bold font-display text-white leading-none">
              {programsTracked}+
            </div>
            <div className="text-[10px] text-gray-400 mt-1 truncate">Programs</div>
          </div>
        </div>
      </motion.div>

      {/* ─── 4. Touch-Toggle Career Outcomes Card (Distinct from Desktop Hover Slide) ─── */}
      <motion.div
        initial={false}
        animate={revealed ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
        transition={{ duration: 0.55, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
        className="rounded-2xl bg-white/[0.05] border border-white/10 p-4 backdrop-blur-sm"
      >
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5">
            <ChartBarIcon className="w-4 h-4 text-emerald-300 shrink-0" />
            <span className="text-[10px] uppercase tracking-[0.18em] text-emerald-300 font-bold">
              Career Outcomes
            </span>
          </div>

          <div className="inline-flex items-center rounded-full bg-white/[0.06] border border-white/10 p-0.5 text-[10px] font-semibold">
            <button
              type="button"
              onClick={() => setOutcomeTab('overview')}
              className={`px-2.5 py-0.5 rounded-full transition-colors cursor-pointer ${
                outcomeTab === 'overview'
                  ? 'bg-emerald-400 text-slate-950 font-bold'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              Rate
            </button>
            <button
              type="button"
              onClick={() => setOutcomeTab('breakdown')}
              className={`px-2.5 py-0.5 rounded-full transition-colors cursor-pointer ${
                outcomeTab === 'breakdown'
                  ? 'bg-ctu-marigold text-slate-950 font-bold'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              Breakdown
            </button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {outcomeTab === 'overview' ? (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="space-y-2.5 min-h-[104px] flex flex-col justify-between"
            >
              <div className="flex items-end justify-between gap-3">
                <div>
                  <div className="text-4xl font-bold font-display text-ctu-marigold leading-none">
                    {employmentRate}%
                  </div>
                  <p className="text-xs font-semibold text-white mt-1">
                    Reported Employment Rate
                  </p>
                </div>
                <p className="text-[11px] text-gray-400 text-right leading-snug max-w-[165px]">
                  Employed, self-employed, or leading businesses.
                </p>
              </div>

              <div>
                <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-ctu-marigold to-emerald-400 transition-all duration-700"
                    style={{ width: `${Math.min(100, employmentRate)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                  <span>0%</span>
                  <button
                    type="button"
                    onClick={() => setOutcomeTab('breakdown')}
                    className="text-emerald-300 font-medium hover:underline cursor-pointer"
                  >
                    Tap Breakdown for details →
                  </button>
                  <span>100%</span>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="breakdown"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="space-y-2.5 min-h-[104px] flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-emerald-300 font-medium">Employed / Self-Employed</span>
                    <span className="text-white font-semibold tabular-nums">
                      {employedCount} of {totalAlumni}
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-400"
                      style={{ width: `${employedPct}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-gray-300 font-medium">Unreported / Pending Survey</span>
                    <span className="text-white font-semibold tabular-nums">{unreportedCount}</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-ctu-marigold/80"
                      style={{ width: `${unreportedPct}%` }}
                    />
                  </div>
                </div>

                {unemployedCount > 0 && (
                  <div className="flex justify-between text-[11px] text-gray-400">
                    <span>Seeking Employment</span>
                    <span className="text-white font-medium tabular-nums">{unemployedCount}</span>
                  </div>
                )}
              </div>

              <p className="text-[10px] text-gray-400 leading-snug border-t border-white/10 pt-2">
                Most tracked profiles haven&apos;t submitted their current job or tracer survey yet.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ─── 5. Slim Tracked Pillars Pill Row ─── */}
      <motion.div
        initial={false}
        animate={revealed ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
        transition={{ duration: 0.45, delay: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-wrap items-center justify-center gap-1.5 pt-0.5"
      >
        {['CHED Tracer Surveys', 'Registrar Verified', 'Career Placement', 'Batch Analytics'].map(
          (item) => (
            <span
              key={item}
              className="px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/10 text-[10px] font-medium text-gray-300"
            >
              {item}
            </span>
          ),
        )}
      </motion.div>
    </div>
  );
}
