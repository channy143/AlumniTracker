import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { useAuthStore } from '@/store/authStore';
import { feedApi, careerTrendsApi, profileApi, surveyApi } from '@/services/api';
import {
  CalendarDaysIcon,
  MegaphoneIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
  BriefcaseIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  SparklesIcon,
  ClipboardDocumentCheckIcon,
  ChatBubbleOvalLeftIcon,
  HandThumbUpIcon as ThumbUpOutline,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { HandThumbUpIcon as ThumbUpSolid } from '@heroicons/react/24/solid';
import { decodeUnicode } from '@/utils/helpers';
import { formatExperience } from '@/utils/formatExperience';
import CreatePostBox from '@/components/dashboard/CreatePostBox';
import FeedPostCard, { PostItem } from '@/components/dashboard/FeedPostCard';


type PostType = 'text' | 'post' | 'job' | 'announcement' | 'event' | 'discussion' | 'guide';

export type FeedPost = PostItem;

type CategoryFilter = 'all' | 'post' | 'announcement' | 'event';


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

function InfoCard({ post, onViewDetails }: { post: FeedPost; onViewDetails: () => void }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      <div className="py-3 px-4">
        <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0 ${post.author === 'CTU-Naga Alumni Office' ? 'bg-blue-800' : post.author === 'Career Services' ? 'bg-orange-500' : 'bg-gray-500'}`}>
            {post.author_avatar || post.author.charAt(0).toUpperCase()}
          </div>
          <span className="font-medium text-gray-700">{post.author}</span>
          <span className="text-gray-400">&middot;</span>
          <span>{formatDate(post.created_at)}</span>
          {post.tag && (
            <>
              <span className="text-gray-400">&middot;</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${post.tag_color || 'bg-gray-100 text-gray-600'}`}>
                {post.tag}
              </span>
            </>
          )}
        </div>

        <h3 className="text-sm font-semibold text-gray-900 mb-1">{post.title}</h3>

        <p className="text-xs text-gray-600 leading-relaxed mb-1 line-clamp-3">
          {decodeUnicode(post.content)}
        </p>

        {post.image_url && (
          <img src={post.image_url} alt="" className="w-full rounded-lg mb-2 max-h-80 object-cover" />
        )}

        <div className="flex items-center gap-2 mt-2">
          <button
            onClick={onViewDetails}
            className="text-xs font-medium text-orange-600 hover:text-orange-700 transition-colors"
          >
            View Details &rarr;
          </button>
          {(post as any).linked_survey && (
            <button
              onClick={(e) => { e.stopPropagation(); window.location.href = `/surveys/${(post as any).linked_survey.id}`; }}
              className="text-xs font-medium bg-orange-500 text-white px-3 py-1 rounded-lg hover:bg-orange-600 transition-colors"
            >
              Complete Survey
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function PostDetailView({
  post,
  onBack,
  currentUser,
  currentProfile,
}: {
  post: FeedPost;
  onBack: () => void;
  currentUser?: any;
  currentProfile?: any;
}) {
  const [comments, setComments] = useState<any[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [liked, setLiked] = useState(!!post.liked);
  const [likeCount, setLikeCount] = useState(post.like_count || 0);

  useEffect(() => {
    feedApi.get(post.id)
      .then((fullPost) => {
        if (fullPost?.comments) {
          setComments(fullPost.comments);
        }
        if (typeof fullPost?.liked === 'boolean') {
          setLiked(fullPost.liked);
        }
        if (typeof fullPost?.like_count === 'number') {
          setLikeCount(fullPost.like_count);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingComments(false));
  }, [post.id]);

  const handleToggleLike = async () => {
    const nextLiked = !liked;
    setLiked(nextLiked);
    setLikeCount((prev) => (nextLiked ? prev + 1 : Math.max(0, prev - 1)));
    try {
      const res = await feedApi.like(post.id);
      if (res && typeof res.liked === 'boolean') setLiked(res.liked);
    } catch {
      setLiked(!nextLiked);
      setLikeCount((prev) => (!nextLiked ? prev + 1 : Math.max(0, prev - 1)));
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || submittingComment) return;
    setSubmittingComment(true);
    try {
      const newComment = await feedApi.addComment(post.id, commentText.trim());
      setComments((prev) => [...prev, newComment]);
      setCommentText('');
    } catch (err: any) {
      alert(err.message || 'Failed to post comment.');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await feedApi.deleteComment(commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (err: any) {
      alert(err.message || 'Failed to delete comment.');
    }
  };

  // Lock body scroll while post detail modal is open, restore on close
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const userInitial = currentProfile?.first_name?.[0] || currentUser?.first_name?.[0] || currentUser?.email?.[0]?.toUpperCase() || 'U';

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/65 backdrop-blur-sm animate-in fade-in duration-150"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.65)' }}
      onClick={onBack}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-2xl sm:max-w-3xl md:max-w-4xl w-full overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Back & Close header */}
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 text-xs font-semibold text-orange-600 hover:text-orange-700 transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
              <span>Back to network feed</span>
            </button>
            <span className="text-gray-300">|</span>
            <span className="text-xs text-gray-500 font-medium">Alumni post details</span>
          </div>

          <button
            type="button"
            onClick={onBack}
            className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
            title="Close"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Modal Content */}
        <div className="overflow-y-auto flex-1 scrollbar-hover">
          <div className="p-5">
            {/* Post Author Info */}
            <div className="flex items-center gap-2.5 text-xs text-gray-500 mb-1">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-xs font-bold text-white shrink-0 overflow-hidden shadow-xs">
            {post.author_avatar && (post.author_avatar.startsWith('http') || post.author_avatar.startsWith('/')) ? (
              <img src={post.author_avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              post.author_avatar || post.author?.charAt(0)?.toUpperCase() || 'A'
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-900 text-sm">{post.author}</span>
              {post.tag && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${post.tag_color || 'bg-orange-50 text-orange-700'}`}>
                  {post.tag}
                </span>
              )}
            </div>
            <p className="text-[11px] text-gray-400">{formatDate(post.created_at)}</p>
          </div>
        </div>

        {/* Post Title */}
        {post.title && (
          <h3 className="text-base font-bold text-gray-900 mb-2 leading-snug">{post.title}</h3>
        )}

        {/* Post Content */}
        <p className="text-sm text-gray-800 leading-relaxed mb-3 whitespace-pre-line">
          {decodeUnicode(post.content)}
        </p>

        {/* Post Image */}
        {post.image_url && (
          <div className="rounded-xl overflow-hidden mb-3 max-h-96 bg-gray-50 flex items-center justify-center border border-gray-100">
            <img src={post.image_url} alt="" className="w-full object-cover max-h-96" />
          </div>
        )}

        {/* Linked Survey */}
        {(post as any).linked_survey && (
          <div className="px-3.5 py-2.5 bg-orange-50/70 border border-orange-100 rounded-xl flex items-center justify-between mb-3">
            <span className="text-xs text-orange-900 font-medium">
              Survey: {(post as any).linked_survey.title}
            </span>
            <button
              onClick={() => window.location.href = `/surveys/${(post as any).linked_survey.id}`}
              className="text-xs bg-orange-500 hover:bg-orange-600 text-white font-semibold px-3 py-1 rounded-lg transition-colors"
            >
              Complete Survey &rarr;
            </button>
          </div>
        )}

        {/* Endorsement & Discussion bar */}
        <div className="pt-2.5 pb-2 border-t border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-4 text-gray-500">
            <button
              onClick={handleToggleLike}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors cursor-pointer text-xs font-semibold ${
                liked ? 'text-blue-600 bg-blue-50' : 'hover:text-blue-600 hover:bg-gray-100 text-gray-600'
              }`}
              title={liked ? 'Endorsed' : 'Endorse'}
            >
              <span className="text-sm">👍</span>
              <span>{liked ? 'Endorsed' : 'Endorse'}</span>
              {likeCount > 0 && <span className="text-gray-500 font-medium">({likeCount})</span>}
            </button>
            <div className="flex items-center gap-1.5 px-2 py-1 text-gray-600 text-xs font-medium">
              <ChatBubbleOvalLeftIcon className="w-4 h-4 text-gray-400" />
              <span>{comments.length} Comments</span>
            </div>
          </div>

          <div className="flex items-center -space-x-1 select-none">
            <span className="w-5 h-5 rounded-full bg-white ring-1 ring-gray-200 flex items-center justify-center text-xs shadow-2xs">
              👍
            </span>
            <span className="w-5 h-5 rounded-full bg-white ring-1 ring-gray-200 flex items-center justify-center text-xs shadow-2xs">
              👏
            </span>
            <span className="w-5 h-5 rounded-full bg-white ring-1 ring-gray-200 flex items-center justify-center text-xs shadow-2xs">
              🎓
            </span>
          </div>
        </div>
      </div>

      {/* Comments section */}
      <div className="p-4 bg-gray-50/70 border-t border-gray-100">
        <h4 className="text-xs font-bold text-gray-800 mb-3">
          Discussion & Comments ({comments.length})
        </h4>

        {/* Add comment input */}
        <form onSubmit={handleAddComment} className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-full bg-orange-500 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs overflow-hidden">
            {currentProfile?.avatar_url ? (
              <img src={currentProfile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              userInitial
            )}
          </div>
          <input
            type="text"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Write a comment or response..."
            className="flex-1 bg-white border border-gray-200 rounded-full px-4 py-2 text-xs text-gray-800 placeholder-gray-400 outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 transition-all shadow-2xs"
            autoFocus
          />
          <button
            type="submit"
            disabled={!commentText.trim() || submittingComment}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-full text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
          >
            Submit
          </button>
        </form>

        {/* Comments list */}
        {loadingComments ? (
          <div className="py-6 text-center text-xs text-gray-400">Loading comments...</div>
        ) : comments.length === 0 ? (
          <div className="py-6 text-center text-xs text-gray-400 bg-white rounded-xl border border-gray-100 p-4">
            No comments yet. Be the first to join the conversation!
          </div>
        ) : (
          <div className="space-y-3">
            {comments.map((c) => {
              const isOwnComment = currentUser?.id && c.user_id && currentUser.id === c.user_id;
              const canDelete = isOwnComment || currentUser?.role === 'admin';
              return (
                <div key={c.id} className="flex items-start gap-2.5 text-xs group">
                  <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-700 font-bold flex items-center justify-center shrink-0 text-xs overflow-hidden shadow-2xs">
                    {c.author_avatar ? (
                      <img src={c.author_avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      c.author?.[0]?.toUpperCase() || 'U'
                    )}
                  </div>
                  <div className="flex-1 bg-white p-3 rounded-2xl border border-gray-200/70 shadow-2xs">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-bold text-gray-900">{c.author}</span>
                      <span className="text-[10px] text-gray-400">{formatDate(c.created_at)}</span>
                    </div>
                    <p className="text-gray-700 leading-relaxed whitespace-pre-line">{c.content}</p>
                  </div>
                  {canDelete && (
                    <button
                      onClick={() => handleDeleteComment(c.id)}
                      className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600 p-1 transition-opacity cursor-pointer"
                      title="Delete comment"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

function SurveyBanner() {
  const navigate = useNavigate();
  const [active, setActive] = useState<{ survey: any; completed: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    surveyApi.getActive()
      .then((data) => setActive(data))
      .catch((err: any) => setError(err.message || 'Failed to load the active survey'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3 flex items-center gap-2">
        <ExclamationCircleIcon className="w-5 h-5 text-red-600 shrink-0" />
        <div className="text-xs text-red-800">
          <span className="font-medium">Unable to load the active survey.</span>
          <br />
          <span className="text-red-600">{error}</span>
        </div>
      </div>
    );
  }

  if (!active) return null;

  const { survey, completed } = active;

  if (completed) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-3 flex items-center gap-2">
        <CheckCircleIcon className="w-5 h-5 text-emerald-600 shrink-0" />
        <div className="text-xs text-emerald-800">
          <span className="font-medium">You have completed the {survey.title}.</span>
          <br />
          <span className="text-emerald-600">Thank you for participating.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-3 flex items-start gap-3">
      <div className="w-9 h-9 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
        <ClipboardDocumentCheckIcon className="w-5 h-5 text-orange-600" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-gray-900">{survey.title}</h3>
            <div className="flex items-center gap-3 mt-1 text-xs text-gray-600">
              <span><span className="font-medium">Status:</span> Open</span>
              {survey.expires_at && (
                <span><span className="font-medium">Due Date:</span> {new Date(survey.expires_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
              )}
            </div>
          </div>
          <button
            onClick={() => navigate(`/surveys/${survey.id}`)}
            className="px-3 py-1.5 text-xs font-medium bg-orange-500 text-white rounded-lg hover:bg-orange-600 shrink-0"
          >
            Complete Survey
          </button>
        </div>
      </div>
    </div>
  );
}

const STATUS_BAR_COLORS = ['bg-emerald-500', 'bg-amber-500', 'bg-blue-500', 'bg-gray-400'];

const statusMap: Record<string, string> = {
  'Employed': 'Employed',
  'Self-employed': 'Self-employed',
  'Unemployed': 'Seeking Employment',
  'student': 'Unemployed',
  'Student': 'Unemployed',
  'Seeking Opportunities': 'Seeking Employment',
  'Retired': 'Retired',
};

function RightSidebar({ refreshKey }: { refreshKey?: number }) {
  const navigate = useNavigate();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [employers, setEmployers] = useState<any[]>([]);
  const [highlights, setHighlights] = useState<any>({});
  const [statusDist, setStatusDist] = useState<any[]>([]);
  const [snapshot, setSnapshot] = useState<any>({});
  const [profileCompletion, setProfileCompletion] = useState({ pct: 0, personal: false, edu: false, skills: false, employment: false });

  useEffect(() => {
    Promise.all([
      feedApi.list().then((data: any) => {
        if (!data) return;
        const ann = data.filter((p: any) => p.type === 'announcement').slice(0, 3);
        if (ann?.length) setAnnouncements(ann.map((a: any) => ({ id: a.id, title: a.title, date: a.created_at ? new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '' })));
        const evts = data.filter((p: any) => p.type === 'event').slice(0, 3);
        if (evts?.length) setEvents(evts.map((e: any) => ({ id: e.id, name: e.title, date: e.event_date ? new Date(e.event_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : e.created_at ? new Date(e.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '' })));
      }).catch(() => {}),
      careerTrendsApi.list().then((data: any) => {
        if (!data) return;
        setSnapshot({
          totalAlumni: data.overview?.totalAlumni || 0,
          employmentRate: data.overview?.employmentRate || 0,
          companiesHiring: data.topEmployers?.length || 0,
          registeredThisYear: data.overview?.registeredThisYear || 0,
        });
        setEmployers((data.topEmployers || []).slice(0, 5).map((e: any) => ({ name: e.name, count: e.alumniCount })));
        setHighlights({
          mostCommonCareer: data.overview?.topCareerPct != null && data.overview.topCareerPct < 40 ? 'Various' : (data.overview?.topCareer || 'N/A'),
          fastestGrowing: data.fastestGrowing?.[0]?.position || 'N/A',
          topIndustry: data.overview?.topIndustryPct != null && data.overview.topIndustryPct < 40 ? 'Various' : (data.overview?.topIndustry || 'N/A'),
          averageExperience: data.overview?.averageExperienceYears ? formatExperience(data.overview.averageExperienceYears) : 'N/A',
        });
        if (data.statusDistribution?.length) {
          const grouped: Record<string, number> = {};
          data.statusDistribution.forEach((s: any) => {
            const key = statusMap[s.status] || s.status;
            grouped[key] = (grouped[key] || 0) + s.count;
          });
          const total = Object.values(grouped).reduce((a: number, b: number) => a + b, 0);
          setStatusDist(Object.entries(grouped).map(([status, count]) => ({
            status,
            percentage: total > 0 ? Math.round((count as number / total) * 100) : 0,
          })));
        }
      }).catch(() => {}),
      profileApi.get().then((p: any) => {
        if (!p) return;
        const personalFields = [p.first_name, p.last_name, p.email, p.phone, p.city, p.bio, p.employment_status, p.headline];
        const personalFilled = personalFields.filter(Boolean).length;
        const hasEducation = !!(p.education?.length);
        const hasSkills = !!(p.skills?.length);
        const hasEmployment = !!(p.current_job_title || p.company_name || p.employment_status);
        const total = 8 + 3;
        const score = personalFilled + (hasEducation ? 1 : 0) + (hasSkills ? 1 : 0) + (hasEmployment ? 1 : 0);
        const pct = Math.min(100, Math.round((score / total) * 100));
        const personal = !!(p.first_name && p.last_name);
        setProfileCompletion({ pct, personal, edu: hasEducation, skills: hasSkills, employment: hasEmployment });
      }).catch(() => {}),
    ]);
  }, [refreshKey]);

  return (
    <div className="space-y-3">
      <div className="bg-white border border-gray-200 rounded-lg p-3">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">

          <CalendarDaysIcon className="w-4 h-4 text-orange-500" />

          Upcoming Events
        </h3>
        {events.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">No upcoming events for now.</p>
        ) : (
          <div className="space-y-2">
            {events.map((event, i) => (
              <div key={event.id || i} className="flex items-center gap-2 text-xs">
                <div className="w-8 h-8 rounded-lg bg-orange-50 flex flex-col items-center justify-center shrink-0">
                  <span className="text-[10px] font-bold text-orange-600 leading-none">
                    {event.date?.split(',')[0]?.split(' ')[1] || event.date?.split(' ')[0] || ''}
                  </span>
                  <span className="text-[8px] text-orange-400 leading-none">
                    {event.date?.includes('2026') ? '2026' : ''}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-gray-800 truncate">{event.name}</p>
                  <p className="text-gray-400">{event.date}</p>
                </div>
              </div>
            ))}
          </div>
        )}
        <button onClick={() => navigate('/events')} className="mt-2 text-xs font-medium text-orange-600 hover:text-orange-700 transition-colors flex items-center gap-1">
          View All &rarr;
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-3">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <MegaphoneIcon className="w-4 h-4 text-orange-500" />
          Latest Announcements
        </h3>
        {announcements.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">No announcements for now.</p>
        ) : (
          <div className="space-y-2">
            {announcements.map((a) => (
              <div key={a.id} className="flex items-start gap-2 text-xs">
                <div className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-1.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-gray-700 font-medium">{a.title}</p>
                  {a.date && <p className="text-gray-400 text-[10px]">{a.date}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
        <button onClick={() => navigate('/announcements')} className="mt-2 text-xs font-medium text-orange-600 hover:text-orange-700 transition-colors flex items-center gap-1">
          View All &rarr;
        </button>
      </div>

      {snapshot.totalAlumni > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <UserGroupIcon className="w-4 h-4 text-orange-500" />
            Alumni Snapshot
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Total Alumni', value: snapshot.totalAlumni.toLocaleString() },
              { label: 'Employment Rate', value: `${snapshot.employmentRate}%` },
              { label: 'Employing Companies', value: snapshot.companiesHiring.toLocaleString() },
              { label: 'Registered This Year', value: snapshot.registeredThisYear.toLocaleString() },
            ].map((stat, i) => (
              <div key={i} className="bg-gray-50 rounded-lg p-2 text-center">
                <p className="text-sm font-bold text-gray-900">{stat.value}</p>
                <p className="text-[10px] text-gray-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {employers.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <BuildingOfficeIcon className="w-4 h-4 text-orange-500" />
            Top Employers
          </h3>
          <div className="space-y-1">
            {employers.map((emp, i) => (
              <div key={emp.name} className="flex items-center justify-between text-xs py-1">
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-orange-100 flex items-center justify-center text-[9px] font-bold text-orange-600 shrink-0">
                    {i + 1}
                  </span>
                  <span className="text-gray-700">{emp.name}</span>
                </div>
                <span className="text-gray-400">({emp.count})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {highlights.mostCommonCareer && (
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <BriefcaseIcon className="w-4 h-4 text-orange-500" />
            Career Highlights
          </h3>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">Most Common Career</span>
              <span className="font-medium text-gray-800">{highlights.mostCommonCareer}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Fastest Growing</span>
              <span className="font-medium text-orange-600">{highlights.fastestGrowing}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Top Industry</span>
              <span className="font-medium text-gray-800">{highlights.topIndustry}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Average Experience</span>
              <span className="font-medium text-gray-800">{highlights.averageExperience}</span>
            </div>
          </div>
        </div>
      )}

      {statusDist.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <ChartBarIcon className="w-4 h-4 text-orange-500" />
            Employment Status
          </h3>
          <div className="space-y-2">
            {statusDist.map((s, i) => (
              <div key={s.status}>
                <div className="flex items-center justify-between text-xs mb-0.5">
                  <span className="text-gray-700">{s.status}</span>
                  <span className="text-gray-500 font-medium">{s.percentage}%</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${STATUS_BAR_COLORS[i % STATUS_BAR_COLORS.length]}`} style={{ width: `${s.percentage}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg p-3">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <CheckCircleIcon className="w-4 h-4 text-orange-500" />
          Profile Completion
        </h3>
        <div className="text-center mb-2">
          <p className="text-2xl font-bold text-orange-500">{profileCompletion.pct}%</p>
        </div>
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
          <div className="h-full rounded-full bg-orange-500" style={{ width: `${profileCompletion.pct}%` }} />
        </div>
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-1.5">
            {profileCompletion.personal ? (
              <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            ) : (
              <ExclamationCircleIcon className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            )}
            <span className="text-gray-600">Personal Information</span>
          </div>
          <div className="flex items-center gap-1.5">
            {profileCompletion.edu ? (
              <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            ) : (
              <ExclamationCircleIcon className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            )}
            <span className="text-gray-600">Education</span>
          </div>
          <div className="flex items-center gap-1.5">
            {profileCompletion.skills ? (
              <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            ) : (
              <ExclamationCircleIcon className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            )}
            <span className="text-gray-600">Skills</span>
          </div>
          <div className="flex items-center gap-1.5">
            {profileCompletion.employment ? (
              <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            ) : (
              <ExclamationCircleIcon className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            )}
            <span className="text-gray-600">Employment Information</span>
          </div>
        </div>
        <button onClick={() => navigate('/profile')} className="mt-2 w-full text-center text-xs font-medium text-orange-600 hover:text-orange-700 transition-colors block">
          Complete Profile &rarr;
        </button>
      </div>

    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [feedPosts, setFeedPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState('Welcome');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [selectedPost, setSelectedPost] = useState<FeedPost | null>(null);
  const [sidebarRefreshKey, setSidebarRefreshKey] = useState(0);

  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    profileApi.get().then((p) => { if (p) setProfile(p); }).catch(() => {});
  }, []);


  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  useEffect(() => {
    setLoading(true);
    feedApi.list().then((data) => {
      if (data) setFeedPosts(data);
    }).catch(() => {})
    .finally(() => setLoading(false));
  }, []);

  const handlePostCreated = (newPost: any) => {
    setFeedPosts((prev) => [newPost, ...prev]);
  };

  const handlePostDeleted = (postId: string) => {
    setFeedPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  const filtered = feedPosts
    .filter((p) => {
      if (categoryFilter === 'all') return true;
      if (categoryFilter === 'post') {
        return p.type === 'post' || p.type === 'text' || p.type === 'discussion' || (!p.is_official && p.type !== 'announcement' && p.type !== 'event');
      }
      return p.type === categoryFilter;
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const CATEGORY_TABS: { id: CategoryFilter; label: string }[] = [
    { id: 'all', label: 'All Updates' },
    { id: 'post', label: 'Alumni Posts' },
    { id: 'announcement', label: 'Announcements' },
    { id: 'event', label: 'Events' },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-9 h-9 rounded-full bg-orange-500 flex items-center justify-center text-white text-sm font-bold shadow-xs">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
          ) : (
            user?.email ? user.email[0].toUpperCase() : '?'
          )}
        </div>
        <div>
          <h1 className="text-base font-bold text-gray-900">
            {greeting}{profile?.first_name ? `, ${profile.first_name}!` : user?.first_name ? `, ${user.first_name}!` : '!'}
          </h1>
          <p className="text-xs text-gray-500">Welcome to the CTU-Naga Alumni Network</p>
        </div>
      </div>

      <SurveyBanner />

      <div className="flex items-center gap-3 mb-3 bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-xs">
        <SparklesIcon className="w-4 h-4 text-orange-500 shrink-0" />
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setCategoryFilter(tab.id)}
              className={`px-3 py-1 text-xs font-semibold rounded-full transition-all whitespace-nowrap ${
                categoryFilter === tab.id
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <span className="text-gray-200 mx-1 hidden sm:inline">|</span>
        <span className="text-xs text-gray-400 hidden sm:flex items-center gap-1 shrink-0 ml-auto">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
          Alumni Network Updates
        </span>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 min-w-0 space-y-3">
          {/* Post Creation Box */}
          <CreatePostBox
            currentUser={user}
            currentProfile={profile}
            onPostCreated={handlePostCreated}
          />

          {/* Post Detail Modal (Overlaid on top of feed with dimmed background) */}
          {selectedPost && (
            <PostDetailView
              post={selectedPost}
              onBack={() => setSelectedPost(null)}
              currentUser={user}
              currentProfile={profile}
            />
          )}

          {loading ? (
            <div className="space-y-3">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-sm text-gray-500 bg-white border border-gray-200 rounded-xl">
              No {categoryFilter === 'all' ? 'updates' : categoryFilter + 's'} yet. Share a milestone or opportunity with your fellow alumni!
            </div>
          ) : (
            filtered.map((post) => (
              <FeedPostCard
                key={post.id}
                post={post}
                currentUserId={user?.id}
                currentUserRole={user?.role}
                onPostDeleted={handlePostDeleted}
                onViewDetails={setSelectedPost}
              />
            ))
          )}
        </div>

        <aside className="hidden lg:block w-80 shrink-0">
          <div className="sticky top-16 max-h-[calc(100vh-4rem)] scrollbar-hover">
            <div className="pr-1">
              <RightSidebar refreshKey={sidebarRefreshKey} />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );

}
