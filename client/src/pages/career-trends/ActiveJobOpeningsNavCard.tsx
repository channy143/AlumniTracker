import { useNavigate } from 'react-router-dom';
import { BriefcaseIcon, CheckCircleIcon, ArrowLeftIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { isJobMatch } from '@/utils/isJobMatch';

interface ActiveJobOpeningsNavCardProps {
  cardName: string;
  kindLabel?: string;
  jobs: any[];
  myApplications: any[];
  onClose: () => void;
}

export default function ActiveJobOpeningsNavCard({
  cardName,
  kindLabel,
  jobs,
  myApplications,
  onClose,
}: ActiveJobOpeningsNavCardProps) {
  const navigate = useNavigate();

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs h-full flex flex-col min-h-0 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-gray-100 mb-3 shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-orange-600 transition-colors cursor-pointer"
          title="Back to Leaderboard"
        >
          <ArrowLeftIcon className="w-3.5 h-3.5" />
          <span>Leaderboard</span>
        </button>

        <button
          type="button"
          onClick={() => navigate(`/jobs?filter=${encodeURIComponent(cardName)}`)}
          className="text-xs font-semibold text-orange-600 hover:text-orange-700 transition-colors flex items-center gap-1 cursor-pointer shrink-0"
        >
          <span>View in Jobs</span>
          <span>&rarr;</span>
        </button>
      </div>

      {/* Card Info Banner */}
      <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-3 mb-3 shrink-0 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <BriefcaseIcon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs font-bold text-gray-900 truncate">
              Active Job Openings ({jobs.length})
            </h3>
            <p className="text-[11px] text-emerald-800 font-medium truncate">
              {cardName} {kindLabel ? `• ${kindLabel}` : ''}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-600 rounded-lg transition-colors cursor-pointer"
          title="Close active jobs view"
        >
          <XMarkIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Jobs list */}
      <div className="space-y-3 overflow-y-auto pr-0.5 scrollbar-hover flex-1 min-h-0">
        {jobs.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-xs">
            No active job openings available for {cardName}.
          </div>
        ) : (
          jobs.map((job) => {
            const isApplied = myApplications.some((app) => isJobMatch(app, job));
            return (
              <div
                key={job.id}
                className="bg-gray-50/70 border border-gray-200/80 rounded-xl p-3.5 flex flex-col justify-between hover:border-orange-300 hover:bg-white transition-all shadow-2xs group shrink-0"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className="text-sm font-bold text-gray-900 group-hover:text-orange-600 transition-colors line-clamp-1">
                      {job.position}
                    </h4>
                    {job.is_remote && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-100 shrink-0">
                        Remote
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 font-medium truncate">{job.company_name}</p>
                  <p className="text-[11px] text-gray-400 mt-1 truncate">
                    {[job.location, job.salary_range ? `₱${job.salary_range}` : null, job.job_type]
                      .filter(Boolean)
                      .join(' • ')}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 shrink-0">
                    Hiring Now
                  </span>
                  {isApplied ? (
                    <button
                      type="button"
                      onClick={() => navigate(`/jobs?filter=${encodeURIComponent(job.position)}`)}
                      className="px-2.5 py-1 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                    >
                      <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Applied</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => navigate(`/jobs?filter=${encodeURIComponent(job.position)}`)}
                      className="px-3 py-1 text-xs font-semibold bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors cursor-pointer shadow-xs active:scale-95"
                    >
                      Apply Now
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
