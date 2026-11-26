import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRightIcon,
  ArrowTopRightOnSquareIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MapPinIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

export interface LandingJobItem {
  id: string;
  position: string;
  company_name: string;
  description_preview?: string | null;
  requirements_preview?: string | null;
  industry?: string | null;
  required_skills?: string[];
  location: string;
  job_type: string;
  is_remote: boolean;
  is_alumni_exclusive: boolean;
  salary_range?: string | null;
  experience_level?: string | null;
  created_at?: string | null;
  vacancies_count?: number | null;
  poster_url?: string | null;
  gallery_images?: string[];
  fb_url?: string | null;
  poster_avatar_url?: string | null;
}

export interface MobileHeroSlide {
  image: string;
  title: string;
  subtitle: string;
  caption: string;
  badge: string;
  description?: string;
}

interface MobileHeroSectionProps {
  activeSlides: MobileHeroSlide[];
  currentSlideIdx: number;
  currentSlide: MobileHeroSlide;
  currentOverviewBarTitle: string;
  currentOverviewDescription: string;
  overviewRightStat: string;
  visibleJobs: LandingJobItem[];
  selectedJob: LandingJobItem | null;
  selectedLandingJobId: string | null;
  onSelectJob: (jobId: string | null) => void;
  onSelectSlide: (idx: number) => void;
  onStepSlide: (delta: number) => void;
  getJobThumb: (job: LandingJobItem) => string | undefined;
  jobTypeLabels: Record<string, string>;
  pesoFbUrl: string;
  totalAlumni: number;
  programsTracked: number;
  activeJobsCount: number;
}

export function MobileHeroSkeleton() {
  return (
    <div className="flex lg:hidden w-full max-w-2xl mx-auto px-2 sm:px-3 flex-col gap-3.5 animate-pulse select-none">
      {/* Compact Header Skeleton */}
      <div className="space-y-1.5">
        <div className="h-3 w-36 rounded bg-ctu-marigold/45" />
        <div className="h-7 w-4/5 rounded-lg bg-white/25" />
        <div className="h-3.5 w-11/12 rounded bg-white/15" />
      </div>

      {/* Unified Spotlight Skeleton */}
      <div className="rounded-2xl overflow-hidden bg-[#0c1528]/85 border border-white/15 shadow-xl">
        <div className="h-[260px] sm:h-[300px] md:h-[320px] bg-slate-900/90 p-3 flex flex-col justify-between">
          <div className="flex gap-1.5">
            <div className="h-[3px] flex-1 rounded-full bg-ctu-marigold/60" />
            <div className="h-[3px] flex-1 rounded-full bg-white/20" />
            <div className="h-[3px] flex-1 rounded-full bg-white/20" />
            <div className="h-[3px] flex-1 rounded-full bg-white/20" />
          </div>
          <div className="space-y-1.5">
            <div className="h-3.5 w-24 rounded bg-ctu-marigold/50" />
            <div className="h-5 w-4/5 rounded bg-white/25" />
          </div>
        </div>
        <div className="px-3.5 py-2.5 space-y-1.5 border-t border-white/10">
          <div className="h-3 w-full rounded bg-white/15" />
          <div className="h-3 w-3/4 rounded bg-white/10" />
        </div>
      </div>

      {/* Compact Job Cards Skeleton */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="h-3.5 w-36 rounded bg-white/20" />
          <div className="h-3.5 w-16 rounded bg-white/15" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`h-[72px] rounded-xl bg-[#0c1528]/80 border border-white/15 p-2 flex items-center gap-2.5 ${
                i > 0 ? 'hidden sm:flex' : ''
              } ${i === 2 ? 'sm:hidden md:flex' : ''}`}
            >
              <div className="w-12 h-12 rounded-lg bg-white/15 shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-2.5 w-20 rounded bg-ctu-marigold/35" />
                <div className="h-3.5 w-4/5 rounded bg-white/20" />
                <div className="h-2.5 w-1/2 rounded bg-white/10" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Action Row Skeleton */}
      <div className="pt-0.5">
        <div className="h-11 w-full rounded-xl bg-ctu-marigold/45" />
      </div>
    </div>
  );
}

export function MobileHeroSection({
  activeSlides,
  currentSlideIdx,
  currentSlide,
  currentOverviewDescription,
  overviewRightStat,
  visibleJobs,
  selectedJob,
  selectedLandingJobId,
  onSelectJob,
  onSelectSlide,
  onStepSlide,
  getJobThumb,
  jobTypeLabels,
  pesoFbUrl,
}: MobileHeroSectionProps) {
  const spotlightRef = useRef<HTMLDivElement>(null);

  const handleJobTap = (jobId: string) => {
    if (selectedLandingJobId === jobId) {
      onSelectJob(null);
    } else {
      onSelectJob(jobId);
      requestAnimationFrame(() => {
        spotlightRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    }
  };

  const selectedJobTypeLabel = selectedJob
    ? jobTypeLabels[selectedJob.job_type] ||
      (selectedJob.job_type
        ? selectedJob.job_type.charAt(0).toUpperCase() + selectedJob.job_type.slice(1)
        : 'Full-Time')
    : '';

  return (
    <div className="flex lg:hidden w-full max-w-2xl mx-auto px-2 sm:px-3 flex-col gap-3.5 sm:gap-4">
      {/* ─── 1. Clean Compact Editorial Header ─── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.2em] text-ctu-marigold flex items-center gap-2">
          <span className="w-5 h-px bg-ctu-marigold/70" />
          CTU-Naga Extension Campus
        </p>
        <h2 className="text-[1.6rem] sm:text-3xl md:text-4xl font-bold font-display text-white leading-[1.1] tracking-tight mt-1">
          Alumni Tracking &amp;{' '}
          <span className="text-ctu-marigold">Career Portal</span>
        </h2>
        <p className="text-xs sm:text-[13px] text-white/75 mt-1.5 leading-relaxed">
          Official CTU-Naga graduate community, online Registrar requests &amp; PESO-Naga career opportunities.
        </p>
      </motion.div>

      {/* ─── 2. Clean Unified Spotlight Card ─── */}
      <motion.div
        ref={spotlightRef}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
        className="rounded-2xl overflow-hidden bg-[#0c1528]/90 backdrop-blur-xl border border-white/15 shadow-[0_18px_40px_rgba(0,0,0,0.42)] scroll-mt-24"
      >
        {/* Media Viewport — taller vertical framing so the featured photo/poster shines */}
        <div className="relative w-full h-[260px] sm:h-[300px] md:h-[320px] bg-slate-950 overflow-hidden select-none">
          <AnimatePresence initial={false}>
            <motion.img
              key={`mobile-${selectedJob ? selectedJob.id : 'peso-ctu'}-${currentSlideIdx}`}
              src={currentSlide.image}
              alt={currentSlide.title}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7, ease: 'easeInOut' }}
              className="absolute inset-0 w-full h-full object-cover"
            />
          </AnimatePresence>

          <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/55 to-transparent pointer-events-none" />
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#0c1528] via-[#0c1528]/65 to-transparent pointer-events-none" />

          {/* Slim Story Progress Bars */}
          <div className="absolute top-0 inset-x-0 px-3 pt-2 z-20 flex items-center gap-1.5">
            {activeSlides.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onSelectSlide(idx)}
                aria-label={`Slide ${idx + 1}`}
                className="flex-1 py-1 cursor-pointer"
              >
                <span
                  className={`block h-[3px] w-full rounded-full transition-all duration-300 ${
                    idx === currentSlideIdx ? 'bg-ctu-marigold' : 'bg-white/30'
                  }`}
                />
              </button>
            ))}
          </div>

          {/* Top Controls: Tag + Prev/Next */}
          <div className="absolute top-5 inset-x-3 z-20 flex items-center justify-between gap-2">
            <span className="px-2 py-0.5 rounded-md bg-ctu-marigold text-slate-950 text-[9px] font-extrabold uppercase tracking-wider max-w-[65%] truncate">
              {selectedJob ? 'Job Spotlight' : currentSlide.badge}
            </span>

            <div className="flex items-center gap-1 shrink-0">
              {selectedJob && (
                <button
                  type="button"
                  onClick={() => onSelectJob(null)}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-black/55 hover:bg-black/75 backdrop-blur-md border border-white/20 text-white text-[10px] font-semibold transition-colors"
                >
                  <XMarkIcon className="w-3 h-3" />
                  <span>Overview</span>
                </button>
              )}
              {activeSlides.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => onStepSlide(-1)}
                    aria-label="Previous slide"
                    className="w-6 h-6 rounded-full bg-black/45 hover:bg-black/70 backdrop-blur-md border border-white/20 text-white flex items-center justify-center transition-colors"
                  >
                    <ChevronLeftIcon className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onStepSlide(1)}
                    aria-label="Next slide"
                    className="w-6 h-6 rounded-full bg-black/45 hover:bg-black/70 backdrop-blur-md border border-white/20 text-white flex items-center justify-center transition-colors"
                  >
                    <ChevronRightIcon className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Bottom Title */}
          <div className="absolute bottom-0 inset-x-0 px-3.5 pb-2.5 z-10">
            <h3 className="text-[15px] sm:text-lg font-bold text-white leading-snug line-clamp-2">
              {currentSlide.title}
            </h3>
          </div>
        </div>

        {/* Clean Single-Layer Description Strip */}
        <div className="px-3.5 py-2.5 border-t border-white/10 space-y-1.5">
          {selectedJob ? (
            <>
              <div className="flex items-center justify-between gap-2 text-[10px]">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="px-1.5 py-0.5 rounded bg-ctu-blue text-white font-bold uppercase tracking-wider shrink-0">
                    {selectedJobTypeLabel}
                  </span>
                  <span className="text-slate-300 truncate flex items-center gap-0.5">
                    <MapPinIcon className="w-3 h-3 text-ctu-marigold shrink-0" />
                    <span className="truncate">{selectedJob.location}</span>
                  </span>
                </div>
                {selectedJob.salary_range && (
                  <span className="font-bold text-ctu-marigold shrink-0">
                    {selectedJob.salary_range}
                  </span>
                )}
              </div>
              <p className="text-[11px] sm:text-xs text-slate-300 leading-relaxed line-clamp-2">
                {selectedJob.description_preview ||
                  `${selectedJob.position} at ${selectedJob.company_name} (${selectedJob.location}).`}
              </p>
            </>
          ) : (
            <>
              <p className="text-[11px] sm:text-xs text-slate-300 leading-relaxed line-clamp-2">
                {currentOverviewDescription}
              </p>
              <div className="flex items-center justify-between gap-2 pt-0.5 text-[10px]">
                <span className="font-bold text-ctu-marigold uppercase tracking-wider truncate">
                  {overviewRightStat}
                </span>
                <span className="text-slate-400 font-medium tabular-nums shrink-0">
                  {currentSlideIdx + 1} / {activeSlides.length}
                </span>
              </div>
            </>
          )}
        </div>
      </motion.div>

      {/* ─── 3. Compact PESO-Naga Job Strip (Clean Horizontal Cards / 3-Col Tablet Grid) ─── */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
        className="space-y-2"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/85">
            PESO-Naga Job Picks
          </span>
          <a
            href={pesoFbUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[10px] font-semibold text-ctu-marigold hover:underline shrink-0"
          >
            <span>PESO FB</span>
            <ArrowTopRightOnSquareIcon className="w-3 h-3" />
          </a>
        </div>

        <div className="flex gap-2.5 overflow-x-auto snap-x snap-mandatory pb-0.5 no-scrollbar md:grid md:grid-cols-3 md:overflow-visible">
          {visibleJobs.map((job) => {
            const isSelected = Boolean(selectedJob && String(selectedJob.id) === String(job.id));
            const thumbUrl = getJobThumb(job);

            return (
              <button
                key={job.id}
                type="button"
                onClick={() => handleJobTap(String(job.id))}
                className={`w-[82%] max-w-[270px] sm:w-[250px] md:w-auto md:max-w-none shrink-0 snap-start rounded-xl p-2 text-left transition-all border flex items-center gap-2.5 cursor-pointer active:scale-[0.985] ${
                  isSelected
                    ? 'bg-[#162744]/95 border-ctu-marigold ring-1 ring-ctu-marigold/50 shadow-md'
                    : 'bg-[#0c1528]/80 backdrop-blur-md border-white/15 hover:border-white/30'
                }`}
              >
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-900 shrink-0 border border-white/10">
                  {thumbUrl && (
                    <img
                      src={thumbUrl}
                      alt={job.position}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="text-[9px] font-bold uppercase tracking-wider text-ctu-marigold truncate">
                    {job.company_name}
                  </div>
                  <div className="text-xs font-bold text-white leading-tight line-clamp-1 mt-0.5">
                    {job.position}
                  </div>
                  <div className="text-[10px] text-slate-300/90 truncate mt-0.5">
                    {job.salary_range || job.location}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* ─── 4. Explore More Jobs CTA ─── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="pt-0.5"
      >
        <Link
          to="/auth/register"
          className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-ctu-marigold hover:bg-[#d4893a] active:scale-[0.98] text-slate-950 text-xs sm:text-sm font-extrabold uppercase tracking-wider shadow-lg shadow-ctu-marigold/20 transition-all whitespace-nowrap"
        >
          <span>Explore More Jobs</span>
          <ArrowRightIcon className="w-4 h-4 stroke-[2.5] shrink-0" />
        </Link>
      </motion.div>
    </div>
  );
}
