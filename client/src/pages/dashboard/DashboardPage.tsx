import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { SkeletonCard, SkeletonCommentList } from '@/components/ui/Skeleton';
import { getCached } from '@/utils/apiCache';
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
  ArrowsPointingOutIcon,
  FaceSmileIcon,
} from '@heroicons/react/24/outline';
import { HandThumbUpIcon as ThumbUpSolid } from '@heroicons/react/24/solid';
import { decodeUnicode, setBackgroundInterval, dedupeCommentTree, countAllComments } from '@/utils/helpers';
import { formatExperience } from '@/utils/formatExperience';
import { supabase, isSupabaseConfigured } from '@/services/supabase';
import CreatePostBox from '@/components/dashboard/CreatePostBox';
import FeedPostCard, { PostItem, REAL_REACTIONS } from '@/components/dashboard/FeedPostCard';
import EmojiPicker from '@/components/ui/EmojiPicker';
import { JellyBlobMascot } from '@/components/ui/feral-blob/JellyBlobMascot';
import '@/styles/blob.css';


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
          <img src={post.image_url} alt="" className="w-full h-auto rounded-lg mb-2 max-h-80 md:max-h-none object-cover md:object-contain" />
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
  onPostUpdated,
}: {
  post: FeedPost;
  onBack: () => void;
  currentUser?: any;
  currentProfile?: any;
  onPostUpdated?: (updated: any) => void;
}) {
  const [comments, setComments] = useState<any[]>(() => {
    const cachedPost = getCached<any>(`/feed/${post.id}`);
    return cachedPost?.comments ? dedupeCommentTree(cachedPost.comments) : [];
  });
  const [hasLoadedComments, setHasLoadedComments] = useState<boolean>(() => {
    const cachedPost = getCached<any>(`/feed/${post.id}`);
    return Boolean(cachedPost?.comments);
  });
  const [loadingComments, setLoadingComments] = useState<boolean>(() => {
    const cachedPost = getCached<any>(`/feed/${post.id}`);
    return !cachedPost?.comments;
  });
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const submittingCommentRef = useRef(false);
  const [liked, setLiked] = useState(!!post.liked);
  const [likeCount, setLikeCount] = useState(post.like_count || 0);
  const [showDetailImageLightbox, setShowDetailImageLightbox] = useState(false);
  const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(null);
  const [replyingToAuthorName, setReplyingToAuthorName] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const submittingReplyRef = useRef(false);
  const [showReplyEmojiPicker, setShowReplyEmojiPicker] = useState(false);
  const [activeCommentReactionPickerId, setActiveCommentReactionPickerId] = useState<string | null>(null);
  const commentPickerTimeoutRef = useRef<any>(null);
  const commentMutationSeqRef = useRef(0);

  const totalCommentCount = hasLoadedComments ? countAllComments(comments) : (post.comment_count || 0);
  const lastSyncedCountRef = useRef<number | null>(null);

  // Sync accurate comment count back to parent card only when it actually changes
  useEffect(() => {
    if (hasLoadedComments) {
      const nextCount = countAllComments(comments);
      if (lastSyncedCountRef.current !== nextCount) {
        lastSyncedCountRef.current = nextCount;
        onPostUpdated?.({ id: post.id, comment_count: nextCount });
      }
    }
  }, [comments, hasLoadedComments, post.id, onPostUpdated]);

  // Live refresh for post details, comments, and likes
  useEffect(() => {
    let isCancelled = false;

    const refreshPostDetails = async () => {
      const seqBefore = commentMutationSeqRef.current;
      try {
        const fullPost = await feedApi.get(post.id, { force: true });
        if (isCancelled || !fullPost || commentMutationSeqRef.current !== seqBefore) return;

        if (typeof fullPost.liked === 'boolean') {
          setLiked(fullPost.liked);
        }
        if (typeof fullPost.like_count === 'number') {
          setLikeCount(fullPost.like_count);
        }
        if (fullPost.comments) {
          const cleaned = dedupeCommentTree(fullPost.comments);
          setHasLoadedComments(true);
          setComments((prev) => {
            if (JSON.stringify(prev) === JSON.stringify(cleaned)) {
              return prev;
            }
            return cleaned;
          });
        }
      } catch {
        // Non-blocking live refresh
      }
    };

    // Initial fetch
    refreshPostDetails().finally(() => {
      if (!isCancelled) setLoadingComments(false);
    });

    // Supabase Realtime channel for this specific post (if configured)
    let channel: any = null;
    if (isSupabaseConfigured) {
      try {
        channel = supabase
          .channel(`live_modal_post_${post.id}`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'feed_post_comments', filter: `post_id=eq.${post.id}` },
            () => { refreshPostDetails(); }
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'feed_comment_reactions' },
            () => { refreshPostDetails(); }
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'feed_post_likes', filter: `post_id=eq.${post.id}` },
            () => { refreshPostDetails(); }
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'feed_posts', filter: `id=eq.${post.id}` },
            () => { refreshPostDetails(); }
          )
          .subscribe();
      } catch {
        // Fallback to background interval polling
      }
    }

    // Background interval poll every 3 seconds while modal is open
    const stopInterval = setBackgroundInterval(refreshPostDetails, 3000);

    return () => {
      isCancelled = true;
      stopInterval();
      if (channel && isSupabaseConfigured) {
        try {
          supabase.removeChannel(channel);
        } catch {}
      }
    };
  }, [post.id]);

  const handleToggleLike = async () => {
    const nextLiked = !liked;
    const nextCount = nextLiked ? likeCount + 1 : Math.max(0, likeCount - 1);
    setLiked(nextLiked);
    setLikeCount(nextCount);
    onPostUpdated?.({ id: post.id, liked: nextLiked, like_count: nextCount });
    try {
      const res = await feedApi.like(post.id);
      if (res && typeof res.liked === 'boolean') {
        setLiked(res.liked);
        if (typeof res.like_count === 'number') {
          setLikeCount(res.like_count);
          onPostUpdated?.({ id: post.id, liked: res.liked, like_count: res.like_count });
        }
      }
    } catch {
      setLiked(!nextLiked);
      setLikeCount(likeCount);
      onPostUpdated?.({ id: post.id, liked: !nextLiked, like_count: likeCount });
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || submittingComment || submittingCommentRef.current) return;
    submittingCommentRef.current = true;
    setSubmittingComment(true);
    commentMutationSeqRef.current += 1;
    try {
      const newComment = await feedApi.addComment(post.id, commentText.trim());
      commentMutationSeqRef.current += 1;
      setHasLoadedComments(true);
      setComments((prev) => dedupeCommentTree([...prev, newComment]));
      setCommentText('');
    } catch (err: any) {
      alert(err.message || 'Failed to post comment.');
    } finally {
      submittingCommentRef.current = false;
      setSubmittingComment(false);
    }
  };

  const handleAddReply = async (commentId: string) => {
    if (!replyText.trim() || submittingReply || submittingReplyRef.current) return;

    submittingReplyRef.current = true;
    setSubmittingReply(true);
    commentMutationSeqRef.current += 1;
    try {
      const newReply = await feedApi.addComment(post.id, replyText.trim(), commentId);
      commentMutationSeqRef.current += 1;
      setHasLoadedComments(true);
      setComments((prev) =>
        dedupeCommentTree(
          prev.map((c) =>
            c.id === commentId ? { ...c, replies: [...(c.replies || []), newReply] } : c
          )
        )
      );
      setReplyText('');
      setReplyingToCommentId(null);
      setReplyingToAuthorName(null);
      setShowReplyEmojiPicker(false);
    } catch (err: any) {
      alert(err.message || 'Failed to post reply.');
    } finally {
      submittingReplyRef.current = false;
      setSubmittingReply(false);
    }
  };

  const handleReactComment = async (commentId: string, emoji = '👍') => {
    commentMutationSeqRef.current += 1;
    // Instant optimistic update
    setComments((prev) =>
      prev.map((c) => {
        if (c.id === commentId) {
          const isSame = c.liked && c.user_reaction === emoji;
          const nextLiked = !isSame;
          const nextReaction = nextLiked ? emoji : null;
          const delta = isSame ? -1 : (c.liked ? 0 : 1);
          const nextCount = Math.max(0, (c.like_count || 0) + delta);
          return { ...c, liked: nextLiked, user_reaction: nextReaction, like_count: nextCount };
        }
        if (c.replies) {
          return {
            ...c,
            replies: c.replies.map((r: any) => {
              if (r.id === commentId) {
                const isSame = r.liked && r.user_reaction === emoji;
                const nextLiked = !isSame;
                const nextReaction = nextLiked ? emoji : null;
                const delta = isSame ? -1 : (r.liked ? 0 : 1);
                const nextCount = Math.max(0, (r.like_count || 0) + delta);
                return { ...r, liked: nextLiked, user_reaction: nextReaction, like_count: nextCount };
              }
              return r;
            }),
          };
        }
        return c;
      })
    );

    try {
      const res = await feedApi.reactComment(commentId, emoji);
      commentMutationSeqRef.current += 1;
      setComments((prev) =>
        prev.map((c) => {
          if (c.id === commentId) {
            return {
              ...c,
              liked: res.liked,
              user_reaction: res.user_reaction,
              like_count: res.like_count,
              reactions_summary: res.reactions_summary || c.reactions_summary,
              top_reactions: res.top_reactions || (res.user_reaction ? [res.user_reaction] : []),
            };
          }
          if (c.replies) {
            return {
              ...c,
              replies: c.replies.map((r: any) =>
                r.id === commentId
                  ? {
                      ...r,
                      liked: res.liked,
                      user_reaction: res.user_reaction,
                      like_count: res.like_count,
                      reactions_summary: res.reactions_summary || r.reactions_summary,
                      top_reactions: res.top_reactions || (res.user_reaction ? [res.user_reaction] : []),
                    }
                  : r
              ),
            };
          }
          return c;
        })
      );
    } catch {
      // ignore
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    commentMutationSeqRef.current += 1;
    try {
      await feedApi.deleteComment(commentId);
      commentMutationSeqRef.current += 1;
      setHasLoadedComments(true);
      setComments((prev) =>
        prev
          .filter((c) => c.id !== commentId)
          .map((c) => ({
            ...c,
            replies: (c.replies || []).filter((r: any) => r.id !== commentId),
          }))
      );
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
        <div className="px-3.5 sm:px-5 py-3 sm:py-3.5 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 text-xs font-semibold text-orange-600 hover:text-orange-700 transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
              <span>Back to network feed</span>
            </button>
            <span className="text-gray-300 hidden sm:inline">|</span>
            <span className="text-xs text-gray-500 font-medium hidden sm:inline">Alumni post details</span>
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
          <div className="p-3.5 sm:p-5">
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
          <div className="relative group rounded-xl overflow-hidden mb-3 bg-gray-50 flex items-center justify-center border border-gray-100 max-h-96 md:max-h-none">
            <img
              src={post.image_url}
              alt=""
              className="w-full h-auto max-h-96 md:max-h-none object-cover md:object-contain cursor-pointer hover:opacity-95 transition-opacity"
              onClick={() => setShowDetailImageLightbox(true)}
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowDetailImageLightbox(true);
              }}
              className="hidden md:flex absolute top-2.5 right-2.5 items-center gap-1.5 px-2.5 py-1 bg-black/60 hover:bg-black/80 text-white text-[11px] font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-xs shadow-md cursor-pointer border border-white/20"
              title="View full size image"
            >
              <ArrowsPointingOutIcon className="w-3.5 h-3.5" />
              <span>Full Size</span>
            </button>
          </div>
        )}

        {/* Linked Survey */}
        {(post as any).linked_survey && (
          <div className="px-3.5 py-2.5 bg-orange-50/70 border border-orange-100 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <span className="text-xs text-orange-900 font-medium">
              Survey: {(post as any).linked_survey.title}
            </span>
            <button
              onClick={() => window.location.href = `/surveys/${(post as any).linked_survey.id}`}
              className="text-xs bg-orange-500 hover:bg-orange-600 text-white font-semibold px-3 py-1.5 rounded-lg transition-colors self-start sm:self-auto"
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
              <span>{totalCommentCount} Comments</span>
            </div>
          </div>

          {likeCount > 0 && (
            <div className="flex items-center -space-x-1 select-none">
              {(post.top_reactions && post.top_reactions.length > 0 ? post.top_reactions : ['👍']).map((emoji: string, idx: number) => (
                <span
                  key={idx}
                  className="w-5 h-5 rounded-full bg-white ring-1 ring-gray-200 flex items-center justify-center text-xs shadow-2xs"
                >
                  {emoji}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Comments section */}
      <div className="p-4 bg-gray-50/70 border-t border-gray-100">
        <h4 className="text-xs font-bold text-gray-800 mb-3">
          Discussion & Comments ({totalCommentCount})
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
          <div className="py-2">
            <SkeletonCommentList count={3} />
          </div>
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
                <div key={c.id} className="space-y-2">
                  <div className="flex items-start gap-2.5 text-xs group">
                    <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-700 font-bold flex items-center justify-center shrink-0 text-xs overflow-hidden shadow-2xs">
                      {c.author_avatar ? (
                        <img src={c.author_avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        c.author?.[0]?.toUpperCase() || 'U'
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="relative inline-block max-w-full bg-white p-3 rounded-2xl border border-gray-200/70 shadow-2xs">
                        <div className="flex items-center justify-between gap-3 mb-0.5">
                          <span className="font-bold text-gray-900 truncate">{c.author}</span>
                          <span className="text-[10px] text-gray-400 shrink-0">{formatDate(c.created_at)}</span>
                        </div>
                        <p className="text-gray-700 leading-relaxed whitespace-pre-line break-words">{c.content}</p>

                        {/* Reaction badge */}
                        {(c.like_count || 0) > 0 && (
                          <div className="absolute -bottom-2.5 right-2 flex items-center gap-0.5 bg-white border border-gray-200/90 rounded-full px-1.5 py-0.5 text-[10px] shadow-2xs text-gray-700 font-medium">
                            <span>
                              {c.top_reactions && c.top_reactions.length > 0
                                ? c.top_reactions.join('')
                                : c.user_reaction || '👍'}
                            </span>
                            <span className="text-[9px] font-semibold text-gray-600">{c.like_count}</span>
                          </div>
                        )}
                      </div>

                      {/* Action Links: Endorse, Reply, Delete */}
                      <div className="flex items-center gap-3 px-2 pt-1 text-[11px] font-semibold text-gray-500">
                        <div
                          className="relative inline-block"
                          onMouseEnter={() => {
                            if (commentPickerTimeoutRef.current) clearTimeout(commentPickerTimeoutRef.current);
                            setActiveCommentReactionPickerId(c.id);
                          }}
                          onMouseLeave={() => {
                            commentPickerTimeoutRef.current = setTimeout(() => {
                              setActiveCommentReactionPickerId((curr) => (curr === c.id ? null : curr));
                            }, 350);
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => handleReactComment(c.id, c.user_reaction || '👍')}
                            className={`hover:underline cursor-pointer flex items-center gap-1 transition-colors ${
                              c.liked ? 'text-blue-600 font-bold' : 'text-gray-500 hover:text-gray-700'
                            }`}
                          >
                            <span>{c.user_reaction || '👍'}</span>
                            <span>{c.liked ? 'Endorsed' : 'Endorse'}</span>
                          </button>

                          {/* Floating Reaction Picker */}
                          {activeCommentReactionPickerId === c.id && (
                            <div
                              className="absolute -top-10 left-0 z-30 bg-white border border-gray-200/90 rounded-full px-2 py-0.5 shadow-xl flex items-center gap-1 animate-in fade-in zoom-in-95 duration-150"
                              onMouseEnter={() => {
                                if (commentPickerTimeoutRef.current) clearTimeout(commentPickerTimeoutRef.current);
                              }}
                            >
                              {REAL_REACTIONS.map((r) => (
                                <button
                                  key={r.emoji}
                                  type="button"
                                  onClick={() => {
                                    handleReactComment(c.id, r.emoji);
                                    setActiveCommentReactionPickerId(null);
                                  }}
                                  className="text-base p-1 rounded-full hover:scale-130 transition-transform duration-150 cursor-pointer active:scale-110"
                                  title={r.label}
                                >
                                  {r.emoji}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            if (replyingToCommentId === c.id && !replyText) {
                              setReplyingToCommentId(null);
                              setReplyingToAuthorName(null);
                            } else {
                              setReplyingToCommentId(c.id);
                              setReplyingToAuthorName(c.author);
                              setReplyText('');
                            }
                          }}
                          className="hover:underline cursor-pointer text-gray-600 hover:text-orange-600 transition-colors"
                        >
                          Reply
                        </button>

                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => handleDeleteComment(c.id)}
                            className="text-gray-400 hover:text-red-600 cursor-pointer"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Nested Replies */}
                  {c.replies && c.replies.length > 0 && (
                    <div className="ml-5 sm:ml-10 pl-3 border-l-2 border-gray-200 space-y-2.5">
                      {c.replies.map((reply: any) => {
                        const isOwnReply = currentUser?.id && reply.user_id && currentUser.id === reply.user_id;
                        const canDeleteReply = isOwnReply || currentUser?.role === 'admin';

                        return (
                          <div key={reply.id} className="flex items-start gap-2 text-xs">
                            <div className="w-6 h-6 rounded-full bg-gray-200 text-gray-700 font-bold flex items-center justify-center shrink-0 text-[9px] overflow-hidden">
                              {reply.author_avatar ? (
                                <img src={reply.author_avatar} alt="" className="w-full h-full object-cover" />
                              ) : (
                                reply.author?.[0]?.toUpperCase() || 'U'
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="relative inline-block max-w-full bg-white p-2 rounded-xl border border-gray-200/80 shadow-2xs">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-bold text-gray-900 text-[11px] truncate">{reply.author}</span>
                                  <span className="text-[9px] text-gray-400 shrink-0">{formatDate(reply.created_at)}</span>
                                </div>
                                <p className="text-gray-700 mt-0.5 text-xs break-words">{reply.content}</p>

                                {(reply.like_count || 0) > 0 && (
                                  <div className="absolute -bottom-2.5 right-2 flex items-center gap-0.5 bg-white border border-gray-200/90 rounded-full px-1.5 py-0.5 text-[9px] shadow-2xs text-gray-700 font-medium">
                                    <span>
                                      {reply.top_reactions && reply.top_reactions.length > 0
                                        ? reply.top_reactions.join('')
                                        : reply.user_reaction || '👍'}
                                    </span>
                                    <span className="text-[8px] font-semibold text-gray-600">{reply.like_count}</span>
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center gap-3 px-2 pt-1 text-[10px] font-semibold text-gray-500">
                                <div
                                  className="relative inline-block"
                                  onMouseEnter={() => {
                                    if (commentPickerTimeoutRef.current) clearTimeout(commentPickerTimeoutRef.current);
                                    setActiveCommentReactionPickerId(reply.id);
                                  }}
                                  onMouseLeave={() => {
                                    commentPickerTimeoutRef.current = setTimeout(() => {
                                      setActiveCommentReactionPickerId((curr) => (curr === reply.id ? null : curr));
                                    }, 350);
                                  }}
                                >
                                  <button
                                    type="button"
                                    onClick={() => handleReactComment(reply.id, reply.user_reaction || '👍')}
                                    className={`hover:underline cursor-pointer flex items-center gap-1 transition-colors ${
                                      reply.liked ? 'text-blue-600 font-bold' : 'text-gray-500 hover:text-gray-700'
                                    }`}
                                  >
                                    <span>{reply.user_reaction || '👍'}</span>
                                    <span>{reply.liked ? 'Endorsed' : 'Endorse'}</span>
                                  </button>

                                  {activeCommentReactionPickerId === reply.id && (
                                    <div
                                      className="absolute -top-10 left-0 z-30 bg-white border border-gray-200/90 rounded-full px-2 py-0.5 shadow-xl flex items-center gap-1 animate-in fade-in zoom-in-95 duration-150"
                                      onMouseEnter={() => {
                                        if (commentPickerTimeoutRef.current) clearTimeout(commentPickerTimeoutRef.current);
                                      }}
                                    >
                                      {REAL_REACTIONS.map((r) => (
                                        <button
                                          key={r.emoji}
                                          type="button"
                                          onClick={() => {
                                            handleReactComment(reply.id, r.emoji);
                                            setActiveCommentReactionPickerId(null);
                                          }}
                                          className="text-base p-1 rounded-full hover:scale-130 transition-transform duration-150 cursor-pointer active:scale-110"
                                          title={r.label}
                                        >
                                          {r.emoji}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setReplyingToCommentId(c.id);
                                    setReplyingToAuthorName(reply.author);
                                    setReplyText(`@${reply.author} `);
                                  }}
                                  className="hover:underline cursor-pointer text-gray-600 hover:text-orange-600 transition-colors"
                                >
                                  Reply
                                </button>

                                {canDeleteReply && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteComment(reply.id)}
                                    className="text-gray-400 hover:text-red-600 cursor-pointer"
                                  >
                                    Delete
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Inline Reply Input */}
                  {replyingToCommentId === c.id && (
                    <div className="ml-5 sm:ml-10 pt-1.5 animate-in fade-in space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-gray-500 px-1">
                        <span>
                          Replying to <span className="font-semibold text-orange-600">{replyingToAuthorName || c.author}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setReplyingToCommentId(null);
                            setReplyText('');
                            setReplyingToAuthorName(null);
                          }}
                          className="text-gray-400 hover:text-gray-600 cursor-pointer text-[10px]"
                        >
                          Cancel
                        </button>
                      </div>
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <div className="flex-1 min-w-0 relative flex items-center bg-white border border-gray-200 rounded-full px-3 py-1 focus-within:border-orange-500 focus-within:ring-1 focus-within:ring-orange-500 transition-all">
                          <input
                            type="text"
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder={`Reply to ${replyingToAuthorName || c.author}...`}
                            className="flex-1 min-w-0 bg-transparent text-xs outline-none pr-1"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleAddReply(c.id);
                              }
                            }}
                          />
                          <div className="relative shrink-0">
                            <button
                              type="button"
                              onClick={() => setShowReplyEmojiPicker((prev) => !prev)}
                              className="p-1 text-gray-400 hover:text-gray-600 rounded-full transition-colors cursor-pointer"
                              title="Insert emoji"
                            >
                              <FaceSmileIcon className="w-3.5 h-3.5" />
                            </button>
                            {showReplyEmojiPicker && (
                              <EmojiPicker
                                position="top"
                                className="right-0"
                                onSelect={(emoji) => {
                                  setReplyText((prev) => prev + emoji);
                                }}
                                onClose={() => setShowReplyEmojiPicker(false)}
                              />
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAddReply(c.id)}
                          disabled={!replyText.trim() || submittingReply}
                          className="px-3.5 py-1 bg-orange-500 text-white rounded-full text-xs font-semibold hover:bg-orange-600 disabled:opacity-40 cursor-pointer transition-colors shadow-2xs"
                        >
                          Reply
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
        </div>
      </div>

      {/* Lightbox / Fullscreen Image Viewer Modal */}
      {showDetailImageLightbox && post.image_url && (
        <div
          className="fixed inset-0 bg-black/85 backdrop-blur-xs z-[10001] flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150"
          onClick={() => setShowDetailImageLightbox(false)}
        >
          <div className="relative max-w-5xl max-h-[92vh] flex flex-col items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
              <a
                href={post.image_url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 text-xs bg-black/60 hover:bg-black/80 text-white rounded-lg transition-colors border border-white/20 shadow-md backdrop-blur-xs"
              >
                Open original ↗
              </a>
              <button
                type="button"
                onClick={() => setShowDetailImageLightbox(false)}
                className="p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-lg transition-colors border border-white/20 shadow-md cursor-pointer"
                aria-label="Close"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <img
              src={post.image_url}
              alt=""
              className="max-h-[88vh] max-w-full w-auto h-auto object-contain rounded-xl shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}

function SurveyBanner() {
  const navigate = useNavigate();
  const [active, setActive] = useState<{ survey: any; completed: boolean } | null>(
    () => getCached<{ survey: any; completed: boolean }>('/surveys/active') ?? null
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(() => getCached('/surveys/active') === undefined);

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
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-gray-900">{survey.title}</h3>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-gray-600">
              <span><span className="font-medium">Status:</span> Open</span>
              {survey.expires_at && (
                <span><span className="font-medium">Due Date:</span> {new Date(survey.expires_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
              )}
            </div>
          </div>
          <button
            onClick={() => navigate(`/surveys/${survey.id}`)}
            className="px-3 py-1.5 text-xs font-medium bg-orange-500 text-white rounded-lg hover:bg-orange-600 shrink-0 self-start"
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

function extractFeedSidebarData(data: any[]) {
  const ann = (data || [])
    .filter((p: any) => p.type === 'announcement')
    .slice(0, 3)
    .map((a: any) => ({
      id: a.id,
      title: a.title,
      date: a.created_at ? new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '',
    }));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const evts = (data || [])
    .filter((p: any) => {
      if (p.type !== 'event') return false;
      const eventTime = p.event_date ? new Date(p.event_date).getTime() : (p.created_at ? new Date(p.created_at).getTime() : 0);
      return eventTime >= today.getTime();
    })
    .slice(0, 3)
    .map((e: any) => ({
      id: e.id,
      name: e.title,
      date: e.event_date
        ? new Date(e.event_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
        : e.created_at
        ? new Date(e.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
        : '',
    }));
  return { ann, evts };
}

function extractTrendsSidebarData(data: any) {
  if (!data) return null;
  const snapshot = {
    totalAlumni: data.overview?.totalAlumni || 0,
    employmentRate: data.overview?.employmentRate || 0,
    companiesHiring: data.topEmployers?.length || 0,
    registeredThisYear: data.overview?.registeredThisYear || 0,
  };
  const employers = (data.topEmployers || []).slice(0, 5).map((e: any) => ({ name: e.name, count: e.alumniCount }));
  const highlights = {
    mostCommonCareer: data.overview?.topCareerPct != null && data.overview.topCareerPct < 40 ? 'Various' : (data.overview?.topCareer || 'N/A'),
    fastestGrowing: data.fastestGrowing?.[0]?.position || 'N/A',
    topIndustry: data.overview?.topIndustryPct != null && data.overview.topIndustryPct < 40 ? 'Various' : (data.overview?.topIndustry || 'N/A'),
    averageExperience: data.overview?.averageExperienceYears ? formatExperience(data.overview.averageExperienceYears) : 'N/A',
  };
  let statusDist: any[] = [];
  if (data.statusDistribution?.length) {
    const grouped: Record<string, number> = {};
    data.statusDistribution.forEach((s: any) => {
      const key = statusMap[s.status] || s.status;
      grouped[key] = (grouped[key] || 0) + s.count;
    });
    const total = Object.values(grouped).reduce((a: number, b: number) => a + b, 0);
    statusDist = Object.entries(grouped).map(([status, count]) => ({
      status,
      percentage: total > 0 ? Math.round((count as number / total) * 100) : 0,
    }));
  }
  return { snapshot, employers, highlights, statusDist };
}

function extractProfileCompletionData(p: any) {
  if (!p) return { pct: 0, personal: false, edu: false, skills: false, employment: false };
  const personalFields = [p.first_name, p.last_name, p.email, p.phone, p.city, p.bio, p.employment_status, p.headline];
  const personalFilled = personalFields.filter(Boolean).length;
  const hasEducation = !!(p.education?.length);
  const hasSkills = !!(p.skills?.length);
  const hasEmployment = !!(p.current_job_title || p.company_name || p.employment_status);
  const total = 8 + 3;
  const score = personalFilled + (hasEducation ? 1 : 0) + (hasSkills ? 1 : 0) + (hasEmployment ? 1 : 0);
  const pct = Math.min(100, Math.round((score / total) * 100));
  const personal = !!(p.first_name && p.last_name);
  return { pct, personal, edu: hasEducation, skills: hasSkills, employment: hasEmployment };
}

function RightSidebar({ refreshKey }: { refreshKey?: number }) {
  const navigate = useNavigate();
  const [announcements, setAnnouncements] = useState<any[]>(() => {
    const cached = getCached<any[]>('/feed');
    return cached ? extractFeedSidebarData(cached).ann : [];
  });
  const [events, setEvents] = useState<any[]>(() => {
    const cached = getCached<any[]>('/feed');
    return cached ? extractFeedSidebarData(cached).evts : [];
  });
  const [employers, setEmployers] = useState<any[]>(() => {
    const cached = getCached<any>('/career-trends');
    return cached ? extractTrendsSidebarData(cached)?.employers || [] : [];
  });
  const [highlights, setHighlights] = useState<any>(() => {
    const cached = getCached<any>('/career-trends');
    return cached ? extractTrendsSidebarData(cached)?.highlights || {} : {};
  });
  const [statusDist, setStatusDist] = useState<any[]>(() => {
    const cached = getCached<any>('/career-trends');
    return cached ? extractTrendsSidebarData(cached)?.statusDist || [] : [];
  });
  const [snapshot, setSnapshot] = useState<any>(() => {
    const cached = getCached<any>('/career-trends');
    return cached ? extractTrendsSidebarData(cached)?.snapshot || {} : {};
  });
  const [profileCompletion, setProfileCompletion] = useState(() => {
    const cached = getCached<any>('/profile');
    return extractProfileCompletionData(cached);
  });

  useEffect(() => {
    Promise.all([
      feedApi.list().then((data: any) => {
        if (!data) return;
        const { ann, evts } = extractFeedSidebarData(data);
        if (ann.length) setAnnouncements(ann);
        if (evts.length) setEvents(evts);
      }).catch(() => {}),
      careerTrendsApi.list().then((data: any) => {
        const parsed = extractTrendsSidebarData(data);
        if (!parsed) return;
        setSnapshot(parsed.snapshot);
        setEmployers(parsed.employers);
        setHighlights(parsed.highlights);
        if (parsed.statusDist.length) setStatusDist(parsed.statusDist);
      }).catch(() => {}),
      profileApi.get().then((p: any) => {
        if (!p) return;
        setProfileCompletion(extractProfileCompletionData(p));
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
                    {event.date?.match(/\d{4}/)?.[0] || ''}
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

      {Boolean(
        (highlights.mostCommonCareer && highlights.mostCommonCareer !== 'N/A') ||
        (highlights.fastestGrowing && highlights.fastestGrowing !== 'N/A') ||
        (highlights.topIndustry && highlights.topIndustry !== 'N/A') ||
        (highlights.averageExperience && highlights.averageExperience !== 'N/A')
      ) && (
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <BriefcaseIcon className="w-4 h-4 text-orange-500" />
            Career Highlights
          </h3>
          <div className="space-y-1.5 text-xs">
            {highlights.mostCommonCareer && highlights.mostCommonCareer !== 'N/A' && (
              <div className="flex justify-between">
                <span className="text-gray-500">Most Common Career</span>
                <span className="font-medium text-gray-800">{highlights.mostCommonCareer}</span>
              </div>
            )}
            {highlights.fastestGrowing && highlights.fastestGrowing !== 'N/A' && (
              <div className="flex justify-between">
                <span className="text-gray-500">Fastest Growing</span>
                <span className="font-medium text-orange-600">{highlights.fastestGrowing}</span>
              </div>
            )}
            {highlights.topIndustry && highlights.topIndustry !== 'N/A' && (
              <div className="flex justify-between">
                <span className="text-gray-500">Top Industry</span>
                <span className="font-medium text-gray-800">{highlights.topIndustry}</span>
              </div>
            )}
            {highlights.averageExperience && highlights.averageExperience !== 'N/A' && (
              <div className="flex justify-between">
                <span className="text-gray-500">Average Experience</span>
                <span className="font-medium text-gray-800">{highlights.averageExperience}</span>
              </div>
            )}
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

      <div data-tour="profile-completion-card" className="bg-white border border-gray-200 rounded-lg p-3">
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [feedPosts, setFeedPosts] = useState<FeedPost[]>(() => getCached<FeedPost[]>('/feed') || []);
  const [loading, setLoading] = useState(() => getCached('/feed') === undefined);
  const [greeting, setGreeting] = useState('Welcome');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [selectedPost, setSelectedPost] = useState<FeedPost | null>(null);
  const [sidebarRefreshKey, setSidebarRefreshKey] = useState(0);

  const [profile, setProfile] = useState<any>(() => getCached('/profile') || null);
  const [greetingMood, setGreetingMood] = useState<'neutral' | 'happy' | 'angry'>('neutral');
  const overpokeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (overpokeTimerRef.current) clearTimeout(overpokeTimerRef.current);
    };
  }, []);

  const targetPostId = searchParams.get('post');

  // Handle deep-linking from notification or URL query (?post=<id>)
  useEffect(() => {
    if (!targetPostId) {
      return;
    }

    if (selectedPost && selectedPost.id === targetPostId) {
      return;
    }

    // 1. Try finding in current in-memory feedPosts
    const found = feedPosts.find((p) => p.id === targetPostId);
    if (found) {
      setSelectedPost(found);
      return;
    }

    // 2. Fetch directly from backend (supports older posts or when feed is still loading)
    let isCancelled = false;
    feedApi.get(targetPostId)
      .then((postData) => {
        if (!isCancelled && postData) {
          setSelectedPost(postData);
          setFeedPosts((prev) => {
            if (prev.some((p) => p.id === postData.id)) return prev;
            return [postData, ...prev];
          });
        }
      })
      .catch((err) => {
        console.warn('Could not load target post from notification query:', err);
      });

    return () => {
      isCancelled = true;
    };
  }, [targetPostId, feedPosts, selectedPost]);

  // Scroll to post card in feed if present
  useEffect(() => {
    if (!targetPostId) return;
    const timer = setTimeout(() => {
      const el = document.getElementById(`post-${targetPostId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [targetPostId, feedPosts]);

  const handleOpenPost = useCallback((post: FeedPost) => {
    setSelectedPost(post);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('post', post.id);
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const handleClosePost = useCallback(() => {
    setSelectedPost(null);
    setSearchParams((prev) => {
      if (!prev.has('post')) return prev;
      const next = new URLSearchParams(prev);
      next.delete('post');
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  useEffect(() => {
    profileApi.get().then((p) => { if (p) setProfile(p); }).catch(() => {});
  }, []);


  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  const refreshFeedData = useCallback(async (force = false) => {
    try {
      const data = await feedApi.list(undefined, force ? { force: true } : undefined);
      if (!data || !Array.isArray(data)) return;

      setFeedPosts((prev) => {
        if (!prev || prev.length === 0) return data;

        const newMap = new Map<string, FeedPost>(data.map((p) => [p.id, p]));
        const prevIds = new Set(prev.map((p) => p.id));
        let changed = false;

        if (prev.length !== data.length) {
          changed = true;
        }

        const merged = prev
          .filter((p) => newMap.has(p.id))
          .map((oldPost) => {
            const fresh = newMap.get(oldPost.id)!;
            const isDifferent =
              oldPost.like_count !== fresh.like_count ||
              oldPost.comment_count !== fresh.comment_count ||
              oldPost.share_count !== fresh.share_count ||
              oldPost.liked !== fresh.liked ||
              oldPost.user_reaction !== fresh.user_reaction ||
              oldPost.content !== fresh.content ||
              oldPost.title !== fresh.title ||
              oldPost.image_url !== fresh.image_url ||
              oldPost.video_url !== fresh.video_url ||
              oldPost.tag !== fresh.tag ||
              JSON.stringify(oldPost.reactions_summary) !== JSON.stringify(fresh.reactions_summary) ||
              JSON.stringify(oldPost.top_reactions) !== JSON.stringify(fresh.top_reactions);

            if (isDifferent) {
              changed = true;
              return { ...oldPost, ...fresh };
            }
            return oldPost;
          });

        const newlyAdded = data.filter((p) => !prevIds.has(p.id));
        if (newlyAdded.length > 0) {
          changed = true;
          return [...newlyAdded, ...merged];
        }

        return changed ? merged : prev;
      });
    } catch {
      // Non-blocking live refresh error
    }
  }, []);

  // Live real-time subscription & resilient background refresh
  useEffect(() => {
    if (getCached('/feed') === undefined) {
      setLoading(true);
    }
    refreshFeedData(false).finally(() => setLoading(false));

    // Supabase Realtime WebSocket channel for instant home page updates (if configured)
    let channel: any = null;
    if (isSupabaseConfigured) {
      try {
        channel = supabase
          .channel('home_page_live_feed')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'feed_posts' },
            () => { refreshFeedData(true); }
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'feed_post_likes' },
            () => { refreshFeedData(true); }
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'feed_post_comments' },
            () => { refreshFeedData(true); }
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'announcements' },
            () => {
              refreshFeedData(true);
              setSidebarRefreshKey((k) => k + 1);
            }
          )
          .subscribe();
      } catch {
        // Fallback to background interval polling
      }
    }

    // Background interval poll every 3.5 seconds
    const stopInterval = setBackgroundInterval(() => refreshFeedData(true), 3500);

    // Instant refresh when user returns to tab
    const handleFocus = () => {
      refreshFeedData(true);
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      stopInterval();
      if (channel && isSupabaseConfigured) {
        try {
          supabase.removeChannel(channel);
        } catch {}
      }
      window.removeEventListener('focus', handleFocus);
    };
  }, [refreshFeedData]);

  const handlePostCreated = (newPost: any) => {
    setFeedPosts((prev) => [newPost, ...prev]);
  };

  const handlePostDeleted = (postId: string) => {
    setFeedPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  const handlePostUpdated = useCallback((updated: any) => {
    setFeedPosts((prev) =>
      prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p))
    );
  }, []);

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
      <div className="flex items-center gap-2.5 mb-4">
        <div
          className="w-12 h-11 flex items-center justify-center shrink-0 overflow-visible"
          onMouseEnter={() => {
            if (greetingMood !== 'angry') setGreetingMood('happy');
          }}
          onMouseLeave={() => {
            if (greetingMood !== 'angry') setGreetingMood('neutral');
          }}
        >
          <JellyBlobMascot
            mood={greetingMood}
            onOverpoke={() => {
              setGreetingMood('angry');
              if (overpokeTimerRef.current) clearTimeout(overpokeTimerRef.current);
              overpokeTimerRef.current = setTimeout(() => setGreetingMood('neutral'), 1600);
            }}
            className="w-[74px] h-auto shrink-0"
          />
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
              onBack={handleClosePost}
              currentUser={user}
              currentProfile={profile}
              onPostUpdated={handlePostUpdated}
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
                onPostUpdated={handlePostUpdated}
                onViewDetails={handleOpenPost}
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
