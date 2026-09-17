import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { surveyApi } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import {
  DocumentTextIcon,
  CheckCircleIcon,
  ClockIcon,
  AcademicCapIcon,
  BriefcaseIcon,
  ChartBarIcon,
  ArrowRightIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';

export default function TracerSurveyPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [activeData, setActiveData] = useState<{ survey: any; completed: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    surveyApi
      .getActive()
      .then((data) => setActiveData(data))
      .catch((err: any) => setError(err.message || 'Failed to load survey information'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-4 py-4 animate-pulse">
        <div className="h-20 bg-gray-100 rounded-2xl" />
        <div className="h-64 bg-gray-100 rounded-2xl" />
      </div>
    );
  }

  const hasActiveSurvey = !!activeData?.survey;
  const isCompleted = !!activeData?.completed;
  const activeSurvey = activeData?.survey;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
            <DocumentTextIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Graduate Tracer Survey</h1>
            <p className="text-xs text-gray-500">
              CTU-Naga Institutional Alumni Career &amp; Employment Tracking
            </p>
          </div>
        </div>

        {hasActiveSurvey && (
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold self-start sm:self-auto ${
              isCompleted
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-orange-100 text-orange-800 animate-pulse'
            }`}
          >
            {isCompleted ? (
              <>
                <CheckCircleIcon className="w-4 h-4" />
                Completed
              </>
            ) : (
              <>
                <ClockIcon className="w-4 h-4" />
                Active Cycle Open
              </>
            )}
          </span>
        )}
      </div>

      {/* Error state if any */}
      {error && !hasActiveSurvey && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl text-xs flex items-center gap-2">
          <InformationCircleIcon className="w-4 h-4 text-amber-600 shrink-0" />
          <span>Notice: Unable to check live survey server status ({error}). Displaying standard tracer survey information below.</span>
        </div>
      )}

      {/* Active Survey Available (Not Yet Completed) */}
      {hasActiveSurvey && !isCompleted && (
        <div className="bg-gradient-to-br from-orange-500 via-orange-600 to-amber-600 rounded-2xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
          <div className="absolute -right-8 -bottom-8 w-44 h-44 rounded-full bg-white/10 blur-2xl pointer-events-none" />
          <div className="relative z-10 max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-xs font-medium text-white backdrop-blur-xs">
              <ClockIcon className="w-3.5 h-3.5" />
              Action Required
            </div>

            <h2 className="text-2xl font-bold tracking-tight">{activeSurvey.title}</h2>
            <p className="text-sm text-white/90 leading-relaxed">
              {activeSurvey.description ||
                'Please take a few moments to complete this official Graduate Tracer Survey. Your responses are directly used to assess alumni career pathways, curriculum alignment, and university accreditation.'}
            </p>

            <div className="flex flex-wrap items-center gap-4 text-xs text-white/80 pt-2">
              {activeSurvey.expires_at && (
                <span>
                  <strong>Due Date:</strong>{' '}
                  {new Date(activeSurvey.expires_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              )}
              {activeSurvey.target_batch && (
                <span>
                  <strong>Target Batch:</strong> Class of {activeSurvey.target_batch}
                </span>
              )}
            </div>

            <div className="pt-2">
              <button
                onClick={() => navigate(`/surveys/${activeSurvey.id}`)}
                className="px-6 py-3 rounded-xl bg-white text-orange-600 font-semibold text-sm hover:bg-orange-50 hover:shadow-md transition-all inline-flex items-center gap-2 cursor-pointer"
              >
                <span>Complete Survey Now</span>
                <ArrowRightIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Survey Completed */}
      {hasActiveSurvey && isCompleted && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircleIcon className="w-7 h-7" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-gray-900">Survey Completed</h3>
              <p className="text-sm text-gray-700">
                You have already submitted your response for <strong>{activeSurvey.title}</strong>.
              </p>
              <p className="text-xs text-gray-500 leading-relaxed">
                Thank you for contributing to CTU-Naga&apos;s institutional assessment. Your input
                helps ensure future students benefit from an industry-relevant curriculum.
              </p>
              <div className="pt-2 flex items-center gap-3">
                <Link
                  to="/"
                  className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Return to Dashboard
                </Link>
                <Link
                  to="/career-trends"
                  className="px-4 py-2 text-xs font-semibold text-orange-600 hover:text-orange-700 transition-colors"
                >
                  View Career Trends &rarr;
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* No Active Survey Cycle */}
      {!hasActiveSurvey && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-ctu-blue flex items-center justify-center shrink-0">
              <AcademicCapIcon className="w-7 h-7" />
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-bold text-gray-900">No Active Tracer Survey Cycle</h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                There are currently no open Graduate Tracer Surveys requiring your submission.
                The CTU-Naga Alumni Relations and Placement Office initiates tracer study cycles
                periodically.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="border border-gray-100 rounded-xl p-4 bg-gray-50/50 space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <InformationCircleIcon className="w-4 h-4 text-ctu-blue" />
                <span>About the Tracer Study</span>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                The Graduate Tracer Survey is an institutional research endeavor conducted to assess
                employability, career transitions, and the professional relevance of CTU-Naga degree
                programs.
              </p>
            </div>

            <div className="border border-gray-100 rounded-xl p-4 bg-gray-50/50 space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <CheckCircleIcon className="w-4 h-4 text-emerald-600" />
                <span>Alumni Record Status</span>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                {user?.survey_completed
                  ? 'Your initial alumni registration and onboarding tracer survey has been verified.'
                  : 'Your alumni profile is active. You can keep your employment records up to date anytime.'}
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-gray-400">
              Need to update your current job or contact details?
            </span>
            <div className="flex items-center gap-3">
              <Link
                to="/profile"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-ctu-blue rounded-lg hover:bg-blue-900 transition-colors"
              >
                <BriefcaseIcon className="w-3.5 h-3.5" />
                Update Profile &amp; Career
              </Link>
              <Link
                to="/career-trends"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <ChartBarIcon className="w-3.5 h-3.5" />
                Explore Career Trends
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
