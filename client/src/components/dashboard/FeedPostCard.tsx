import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  ChatBubbleOvalLeftIcon,
  TrashIcon,
  EllipsisHorizontalIcon,
  LinkIcon,
  XMarkIcon,
  PaperAirplaneIcon,
  PencilSquareIcon,
  GlobeAmericasIcon,
  UserGroupIcon,
  LockClosedIcon,
  FlagIcon,
  ChatBubbleLeftRightIcon,
  NoSymbolIcon,
  ArrowUturnLeftIcon,
  PhotoIcon,
  ArrowUpTrayIcon,
  FaceSmileIcon,
} from '@heroicons/react/24/outline';
import { feedApi, connectionsApi, messagesApi, directoryApi } from '@/services/api';
import { decodeUnicode } from '@/utils/helpers';
import { useChatStore } from '@/store/chatStore';
import EmojiPicker from '@/components/ui/EmojiPicker';

export const REAL_REACTIONS = [
  { emoji: '👍', label: 'Endorse', color: 'text-blue-600', activeBg: 'bg-blue-50 text-blue-600' },
  { emoji: '👏', label: 'Applaud', color: 'text-emerald-600', activeBg: 'bg-emerald-50 text-emerald-600' },
  { emoji: '🎓', label: 'Proud Alum', color: 'text-orange-600', activeBg: 'bg-orange-50 text-orange-600' },
  { emoji: '💡', label: 'Insightful', color: 'text-amber-600', activeBg: 'bg-amber-50 text-amber-600' },
  { emoji: '❤️', label: 'Support', color: 'text-red-500', activeBg: 'bg-red-50 text-red-500' },
  { emoji: '🤝', label: 'Connect', color: 'text-indigo-600', activeBg: 'bg-indigo-50 text-indigo-600' },
  { emoji: '🚀', label: 'Inspire', color: 'text-purple-600', activeBg: 'bg-purple-50 text-purple-600' },
];

interface CommentReply {
  id: string;
  user_id?: string;
  author: string;
  author_avatar?: string;
  content: string;
  created_at: string;
  like_count?: number;
  liked?: boolean;
  user_reaction?: string | null;
}

interface CommentItem {
  id: string;
  author: string;
  author_avatar?: string;
  content: string;
  created_at: string;
  user_id?: string;
  like_count?: number;
  liked?: boolean;
  user_reaction?: string | null;
  replies?: CommentReply[];
}

export interface PostItem {
  id: string;
  user_id?: string;
  type: string;
  title?: string;
  content: string;
  author: string;
  author_avatar?: string;
  created_at: string;
  like_count: number;
  comment_count: number;
  share_count?: number;
  liked?: boolean;
  user_reaction?: string | null;
  reactions_summary?: Record<string, number>;
  top_reactions?: string[];
  audience?: 'public' | 'friends' | 'only_me';
  feeling?: string | null;
  location?: string | null;
  tagged_friends?: Array<{ id: string; name: string }>;
  media_type?: 'photo' | 'video';
  video_url?: string | null;
  comments_disabled?: boolean;
  tag?: string;
  tag_color?: string;
  image_url?: string;
  is_official?: boolean;
  linked_survey?: any;
  author_profile_id?: string;
}

interface FeedPostCardProps {
  post: PostItem;
  currentUserId?: string;
  currentUserRole?: string;
  onPostDeleted?: (postId: string) => void;
  onPostUpdated?: (updatedPost: PostItem) => void;
  onViewDetails?: (post: PostItem) => void;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const now = Date.now();
  const d = new Date(dateStr).getTime();
  const diff = Math.max(0, now - d);
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function FeedPostCard({
  post,
  currentUserId,
  currentUserRole,
  onPostDeleted,
  onPostUpdated,
  onViewDetails,
}: FeedPostCardProps) {
  // Post core state
  const [currentPost, setCurrentPost] = useState<PostItem>(post);
  const [liked, setLiked] = useState(!!post.liked);
  const [userReaction, setUserReaction] = useState<string | null>(post.user_reaction || (post.liked ? '👍' : null));
  const [likeCount, setLikeCount] = useState(post.like_count || 0);
  const [shareCount, setShareCount] = useState(post.share_count || 0);
  const [commentCount, setCommentCount] = useState(post.comment_count || 0);
  const [reactionsSummary, setReactionsSummary] = useState<Record<string, number>>(post.reactions_summary || {});
  const [topReactions, setTopReactions] = useState<string[]>(post.top_reactions || (post.like_count > 0 ? ['👍'] : []));

  // Reaction picker hover
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const pickerTimeoutRef = useRef<any>(null);

  // Dynamic emoji bursts state
  const [bursts, setBursts] = useState<Array<{ id: number; emoji: string; offset: number; rotation: number; delay: number }>>([]);
  const [showCommentEmojiPicker, setShowCommentEmojiPicker] = useState(false);

  // Reactions Breakdown Modal
  const [showReactionsModal, setShowReactionsModal] = useState(false);
  const [reactionsList, setReactionsList] = useState<any[]>([]);
  const [loadingReactions, setLoadingReactions] = useState(false);
  const [selectedReactionTab, setSelectedReactionTab] = useState<string>('all');

  // Comments state
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  // Replying to a specific comment
  const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);

  // Edit Post Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [editAudience, setEditAudience] = useState<'public' | 'friends' | 'only_me'>(post.audience || 'public');
  const [editLocation, setEditLocation] = useState(post.location || '');
  const [editImageUrl, setEditImageUrl] = useState(post.image_url || '');
  const [editVideoUrl, setEditVideoUrl] = useState(post.video_url || '');
  const [editMediaType, setEditMediaType] = useState<'photo' | 'video'>(post.media_type || 'photo');
  const [uploadingEditMedia, setUploadingEditMedia] = useState(false);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  // Report Modal
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('Spam');
  const [reportDetails, setReportDetails] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

  // Share Modal
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [sendToOthersOpen, setSendToOthersOpen] = useState(false);
  const [sharingFeed, setSharingFeed] = useState(false);
  const [alumniList, setAlumniList] = useState<any[]>([]);
  const [loadingAlumni, setLoadingAlumni] = useState(false);
  const [searchRecipient, setSearchRecipient] = useState('');
  const [sendingMessage, setSendingMessage] = useState<string | null>(null);
  const [sentMap, setSentMap] = useState<Record<string, boolean>>({});

  // Options menu
  const [menuOpen, setMenuOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const isAuthor = Boolean(currentUserId && currentPost.user_id && currentUserId === currentPost.user_id);
  const canDelete = isAuthor || currentUserRole === 'admin';

  // Sync props if changed
  useEffect(() => {
    setCurrentPost(post);
    setLiked(!!post.liked);
    setUserReaction(post.user_reaction || (post.liked ? '👍' : null));
    setLikeCount(post.like_count || 0);
    setShareCount(post.share_count || 0);
    setCommentCount(post.comment_count || 0);
    setReactionsSummary(post.reactions_summary || {});
    setTopReactions(post.top_reactions || (post.like_count > 0 ? ['👍'] : []));
    setEditContent(post.content);
    setEditAudience(post.audience || 'public');
    setEditLocation(post.location || '');
    setEditImageUrl(post.image_url || '');
    setEditVideoUrl(post.video_url || '');
    setEditMediaType(post.media_type || 'photo');
  }, [post]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // React to post with real emoji
  const handleReact = async (emoji: string) => {
    setShowReactionPicker(false);
    const wasLikedSame = userReaction === emoji;
    const nextReaction = wasLikedSame ? null : emoji;
    const nextLiked = !wasLikedSame;

    setUserReaction(nextReaction);
    setLiked(nextLiked);

    if (wasLikedSame) {
      setLikeCount((prev) => Math.max(0, prev - 1));
    } else {
      if (!userReaction) {
        setLikeCount((prev) => prev + 1);
      }
      // Dynamic bursting emoji particles
      const offsets = [-34, -18, -4, 12, 26, 40];
      const rotations = [-16, -9, 0, 8, 15, 22];
      const newBursts = offsets.map((off, i) => ({
        id: Date.now() + i,
        emoji,
        offset: off,
        rotation: rotations[i],
        delay: i * 35,
      }));
      setBursts(newBursts);
      setTimeout(() => setBursts([]), 1000);
    }

    try {
      const res = await feedApi.react(currentPost.id, emoji);
      if (res) {
        setLiked(res.liked);
        setUserReaction(res.user_reaction);
        setLikeCount(res.like_count);
        if (res.reactions_summary) setReactionsSummary(res.reactions_summary);
        if (res.top_reactions) setTopReactions(res.top_reactions);
      }
    } catch {
      // Revert on error
      setUserReaction(userReaction);
      setLiked(liked);
    }
  };

  // Open Reactions Modal
  const handleOpenReactionsModal = async () => {
    setShowReactionsModal(true);
    setLoadingReactions(true);
    try {
      const list = await feedApi.getReactions(currentPost.id);
      setReactionsList(list || []);
    } catch {
      // fallback
    } finally {
      setLoadingReactions(false);
    }
  };

  // Toggle inline comments
  const handleToggleComments = async () => {
    if (!commentsOpen) {
      setCommentsOpen(true);
      setLoadingComments(true);
      try {
        const fullPost = await feedApi.get(currentPost.id);
        if (fullPost?.comments) {
          setComments(fullPost.comments);
        }
      } catch {
        // Fallback
      } finally {
        setLoadingComments(false);
      }
    } else {
      setCommentsOpen(false);
    }
  };

  // Add Comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || submittingComment) return;

    setSubmittingComment(true);
    try {
      const newComment = await feedApi.addComment(currentPost.id, commentText.trim());
      setComments((prev) => [...prev, newComment]);
      setCommentCount((prev) => prev + 1);
      setCommentText('');
    } catch (err: any) {
      alert(err.message || 'Failed to post comment.');
    } finally {
      setSubmittingComment(false);
    }
  };

  // Reply to Comment
  const handleAddReply = async (commentId: string) => {
    if (!replyText.trim() || submittingReply) return;

    setSubmittingReply(true);
    try {
      const newReply = await feedApi.addComment(currentPost.id, replyText.trim(), commentId);
      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? { ...c, replies: [...(c.replies || []), newReply] } : c))
      );
      setCommentCount((prev) => prev + 1);
      setReplyText('');
      setReplyingToCommentId(null);
    } catch (err: any) {
      alert(err.message || 'Failed to post reply.');
    } finally {
      setSubmittingReply(false);
    }
  };

  // React to Comment
  const handleReactComment = async (commentId: string, emoji = '👍') => {
    try {
      const res = await feedApi.reactComment(commentId, emoji);
      setComments((prev) =>
        prev.map((c) => {
          if (c.id === commentId) {
            return { ...c, liked: res.liked, user_reaction: res.user_reaction, like_count: res.like_count };
          }
          if (c.replies) {
            return {
              ...c,
              replies: c.replies.map((r) =>
                r.id === commentId ? { ...r, liked: res.liked, user_reaction: res.user_reaction, like_count: res.like_count } : r
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

  // Delete Comment
  const handleDeleteComment = async (commentId: string) => {
    try {
      await feedApi.deleteComment(commentId);
      setComments((prev) =>
        prev
          .filter((c) => c.id !== commentId)
          .map((c) => ({
            ...c,
            replies: (c.replies || []).filter((r) => r.id !== commentId),
          }))
      );
      setCommentCount((prev) => Math.max(0, prev - 1));
    } catch (err: any) {
      alert(err.message || 'Failed to delete comment.');
    }
  };

  // Edit media upload handler
  const handleEditFileSelected = async (file: File) => {
    if (!file) return;
    const isVid = file.type.startsWith('video/');
    const localUrl = URL.createObjectURL(file);
    if (isVid) {
      setEditVideoUrl(localUrl);
      setEditImageUrl('');
      setEditMediaType('video');
    } else {
      setEditImageUrl(localUrl);
      setEditVideoUrl('');
      setEditMediaType('photo');
    }
    setUploadingEditMedia(true);
    try {
      const res = await feedApi.uploadMedia(file);
      if (res.media_type === 'video') {
        setEditVideoUrl(res.url);
        setEditImageUrl('');
        setEditMediaType('video');
      } else {
        setEditImageUrl(res.url);
        setEditVideoUrl('');
        setEditMediaType('photo');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to upload media');
    } finally {
      setUploadingEditMedia(false);
    }
  };

  // Save Edit Post
  const handleSaveEdit = async () => {
    if (uploadingEditMedia) {
      alert('Please wait for the media upload to complete.');
      return;
    }
    setSavingEdit(true);
    try {
      const payload: any = {
        content: editContent,
        audience: editAudience,
        location: editLocation || null,
        image_url: editMediaType === 'photo' ? (editImageUrl || null) : null,
        video_url: editMediaType === 'video' ? (editVideoUrl || null) : null,
        media_type: editMediaType,
      };
      await feedApi.update(currentPost.id, payload);
      const updatedPost = {
        ...currentPost,
        ...payload,
      };
      setCurrentPost(updatedPost);
      onPostUpdated?.(updatedPost);
      setShowEditModal(false);
      showToast('Post updated successfully!');
    } catch (err: any) {
      alert(err.message || 'Failed to edit post');
    } finally {
      setSavingEdit(false);
    }
  };

  // Toggle comments disabled setting
  const handleToggleCommentsSetting = async () => {
    setMenuOpen(false);
    const nextDisabled = !currentPost.comments_disabled;
    try {
      await feedApi.update(currentPost.id, { comments_disabled: nextDisabled });
      setCurrentPost((prev) => ({ ...prev, comments_disabled: nextDisabled }));
      showToast(nextDisabled ? 'Comments turned off for this post' : 'Comments turned on for this post');
    } catch (err: any) {
      alert(err.message || 'Failed to update comment settings');
    }
  };

  // Submit Report
  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingReport(true);
    try {
      await feedApi.report(currentPost.id, reportReason, reportDetails);
      setShowReportModal(false);
      setReportDetails('');
      showToast('Report submitted. Thank you for helping keep our community safe.');
    } catch (err: any) {
      alert(err.message || 'Failed to submit report');
    } finally {
      setSubmittingReport(false);
    }
  };

  // Share to Feed
  const handleShareToFeed = async () => {
    setSharingFeed(true);
    try {
      await feedApi.share(currentPost.id);
      setShareCount((prev) => prev + 1);
      setShareModalOpen(false);
      showToast('Post shared to your feed!');
    } catch (err: any) {
      alert(err.message || 'Failed to share post');
    } finally {
      setSharingFeed(false);
    }
  };

  // Copy link
  const handleCopyLink = () => {
    const url = `${window.location.origin}/dashboard?post=${currentPost.id}`;
    navigator.clipboard?.writeText(url).catch(() => {});
    setShareCount((prev) => prev + 1);
    feedApi.share(currentPost.id).catch(() => {});
    setShareModalOpen(false);
    showToast('Post link copied to clipboard!');
  };

  // Open "Send to others"
  const handleOpenSendToOthers = async () => {
    setSendToOthersOpen(true);
    if (alumniList.length === 0) {
      setLoadingAlumni(true);
      try {
        const conns = await connectionsApi.list();
        let list: any[] = [];
        if (Array.isArray(conns) && conns.length > 0) {
          list = conns
            .map((c: any) => {
              const partner = c.recipient_id === currentUserId ? c.requester : c.recipient;
              return partner || c.recipient || c.requester;
            })
            .filter(Boolean);
        }
        if (list.length === 0) {
          const dirRes: any = await directoryApi.search({ limit: 20 });
          list = dirRes.data || [];
        }
        setAlumniList(list);
      } catch {
        // Fallback
      } finally {
        setLoadingAlumni(false);
      }
    }
  };

  const handleSendToAlumnus = async (alumnus: any) => {
    setSendingMessage(alumnus.id);
    try {
      const postUrl = `${window.location.origin}/dashboard?post=${currentPost.id}`;
      const text = `Shared a post: "${currentPost.content.slice(0, 80)}..."\n${postUrl}`;
      await messagesApi.send(alumnus.id, text);
      setSentMap((prev) => ({ ...prev, [alumnus.id]: true }));
      setShareCount((prev) => prev + 1);
      feedApi.share(currentPost.id).catch(() => {});
      showToast(`Sent to ${alumnus.first_name || 'alumnus'}!`);
    } catch (err: any) {
      alert(err.message || 'Failed to send message');
    } finally {
      setSendingMessage(null);
    }
  };

  // Delete Post
  const handleDeletePost = async () => {
    if (!confirm('Are you sure you want to delete this post?')) return;
    try {
      await feedApi.delete(currentPost.id);
      onPostDeleted?.(currentPost.id);
    } catch (err: any) {
      alert(err.message || 'Failed to delete post');
    }
  };

  const authorInitials = currentPost.author
    ? currentPost.author
        .split(' ')
        .map((w) => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'A';

  const currentReactionObj = REAL_REACTIONS.find((r) => r.emoji === userReaction);

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-xs overflow-hidden transition-all hover:border-gray-300">
      {/* Post Header */}
      <div className="p-4 pb-2">
        <div className="flex items-start justify-between gap-3">
          {/* Author avatar & info */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative shrink-0">
              {currentPost.author_avatar && (currentPost.author_avatar.startsWith('http') || currentPost.author_avatar.startsWith('/')) ? (
                <img
                  src={currentPost.author_avatar}
                  alt={currentPost.author}
                  className="w-10 h-10 rounded-full object-cover ring-1 ring-gray-200"
                />
              ) : (
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-xs ${
                    currentPost.is_official || currentPost.author === 'CTU-Naga Alumni Office'
                      ? 'bg-blue-800'
                      : 'bg-gradient-to-tr from-orange-500 to-amber-500'
                  }`}
                >
                  {currentPost.author_avatar || authorInitials}
                </div>
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-sm text-gray-900 truncate">
                  {currentPost.author}
                </span>

                {/* Milestone indicator */}
                {currentPost.feeling && (
                  <span className="text-xs text-gray-600 font-normal truncate">
                    &middot; {currentPost.feeling.startsWith('is ') ? currentPost.feeling.slice(3) : currentPost.feeling}
                  </span>
                )}

                {/* Tagged Alumni indicator */}
                {currentPost.tagged_friends && currentPost.tagged_friends.length > 0 && (
                  <span className="text-xs text-gray-600 font-normal">
                    with{' '}
                    <span className="font-medium text-gray-800">
                      {currentPost.tagged_friends.map((f) => f.name).join(', ')}
                    </span>
                  </span>
                )}

                {/* Location indicator */}
                {currentPost.location && (
                  <span className="text-xs text-gray-600 font-normal">
                    at <span className="font-medium text-gray-800">{currentPost.location}</span>
                  </span>
                )}

                {/* Tag / Category Badge */}
                {currentPost.tag && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide ${
                      currentPost.tag_color || 'bg-orange-50 text-orange-700'
                    }`}
                  >
                    {currentPost.tag}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5">
                <span>{formatDate(currentPost.created_at)}</span>
                <span>&middot;</span>

                {/* Audience Indicator Icon */}
                <span className="flex items-center gap-1" title={`Audience: ${currentPost.audience || 'public'}`}>
                  {currentPost.audience === 'only_me' ? (
                    <LockClosedIcon className="w-3.5 h-3.5 text-gray-400" />
                  ) : currentPost.audience === 'friends' ? (
                    <UserGroupIcon className="w-3.5 h-3.5 text-gray-400" />
                  ) : (
                    <GlobeAmericasIcon className="w-3.5 h-3.5 text-gray-400" />
                  )}
                  <span className="capitalize text-[11px] text-gray-400">
                    {currentPost.audience === 'friends' ? 'Connections' : currentPost.audience === 'only_me' ? 'Only me' : 'Public'}
                  </span>
                </span>

                {currentPost.is_official && (
                  <>
                    <span>&middot;</span>
                    <span className="text-[11px] font-medium text-blue-600">Official</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right Header: Options Menu */}
          <div className="relative shrink-0">
            <button
              onClick={() => setMenuOpen((prev) => !prev)}
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
              title="Post options"
            >
              <EllipsisHorizontalIcon className="w-5 h-5" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-gray-200 rounded-xl shadow-xl z-30 py-1.5 text-xs">
                {/* Copy Link */}
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    handleCopyLink();
                  }}
                  className="w-full text-left px-3.5 py-2 text-gray-700 hover:bg-gray-50 flex items-center gap-2.5 cursor-pointer"
                >
                  <LinkIcon className="w-4 h-4 text-gray-500" />
                  <span>Copy post link</span>
                </button>

                {/* Edit Post (for author) */}
                {isAuthor && (
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      setShowEditModal(true);
                    }}
                    className="w-full text-left px-3.5 py-2 text-gray-700 hover:bg-gray-50 flex items-center gap-2.5 cursor-pointer"
                  >
                    <PencilSquareIcon className="w-4 h-4 text-blue-500" />
                    <span>Edit post</span>
                  </button>
                )}

                {/* Turn on/off comments (for author) */}
                {isAuthor && (
                  <button
                    onClick={handleToggleCommentsSetting}
                    className="w-full text-left px-3.5 py-2 text-gray-700 hover:bg-gray-50 flex items-center gap-2.5 cursor-pointer"
                  >
                    {currentPost.comments_disabled ? (
                      <>
                        <ChatBubbleLeftRightIcon className="w-4 h-4 text-emerald-500" />
                        <span>Turn on comments</span>
                      </>
                    ) : (
                      <>
                        <NoSymbolIcon className="w-4 h-4 text-amber-500" />
                        <span>Turn off comments</span>
                      </>
                    )}
                  </button>
                )}

                {/* Report post (if not author) */}
                {!isAuthor && (
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      setShowReportModal(true);
                    }}
                    className="w-full text-left px-3.5 py-2 text-red-600 hover:bg-red-50 flex items-center gap-2.5 cursor-pointer"
                  >
                    <FlagIcon className="w-4 h-4" />
                    <span>Report post</span>
                  </button>
                )}

                {/* Delete Post */}
                {canDelete && (
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      handleDeletePost();
                    }}
                    className="w-full text-left px-3.5 py-2 text-red-600 hover:bg-red-50 flex items-center gap-2.5 border-t border-gray-100 cursor-pointer"
                  >
                    <TrashIcon className="w-4 h-4" />
                    <span>Delete post</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Post Title */}
        {currentPost.title && (
          <h3 className="text-base font-bold text-gray-900 mt-2.5 mb-1 leading-snug">
            {currentPost.title}
          </h3>
        )}

        {/* Post Content */}
        <p className="text-sm text-gray-800 leading-relaxed mt-1.5 whitespace-pre-line">
          {decodeUnicode(currentPost.content)}
        </p>
      </div>

      {/* Post Photo */}
      {currentPost.image_url && (
        <div className="mt-2 bg-gray-50 max-h-96 flex items-center justify-center overflow-hidden border-y border-gray-100">
          <img
            src={currentPost.image_url}
            alt=""
            className="w-full object-cover max-h-96 hover:opacity-95 transition-opacity cursor-pointer"
            onClick={() => onViewDetails?.(currentPost)}
          />
        </div>
      )}

      {/* Post Video */}
      {currentPost.video_url && (
        <div className="mt-2 bg-black max-h-96 flex items-center justify-center overflow-hidden border-y border-gray-100">
          <video src={currentPost.video_url} controls className="max-h-96 w-full" />
        </div>
      )}

      {/* Linked Survey button */}
      {currentPost.linked_survey && (
        <div className="px-4 py-2 bg-orange-50/60 border-t border-orange-100 flex items-center justify-between">
          <span className="text-xs text-orange-900 font-medium">
            Survey: {currentPost.linked_survey.title}
          </span>
          <button
            onClick={() => (window.location.href = `/surveys/${currentPost.linked_survey.id}`)}
            className="text-xs bg-orange-500 hover:bg-orange-600 text-white font-semibold px-3 py-1 rounded-lg transition-colors cursor-pointer"
          >
            Complete Survey &rarr;
          </button>
        </div>
      )}

      {/* Bottom Action Bar (Image 3 format with real emojis) */}
      <div className="px-4 py-2.5 border-t border-gray-100 flex items-center justify-between relative">
        {/* Left: Like / Real Emoji Reaction Button + Comments count + Share */}
        <div className="flex items-center gap-3 sm:gap-4 text-gray-500 text-sm">
          {/* Reaction Button with Floating Real Emojis Bar on Hover */}
          <div
            className="relative"
            onMouseEnter={() => {
              if (pickerTimeoutRef.current) clearTimeout(pickerTimeoutRef.current);
              setShowReactionPicker(true);
            }}
            onMouseLeave={() => {
              pickerTimeoutRef.current = setTimeout(() => setShowReactionPicker(false), 300);
            }}
          >
            {/* Dynamic Burst Particles on React */}
            {bursts.length > 0 && (
              <div className="absolute inset-x-0 bottom-full pointer-events-none flex justify-center z-50">
                {bursts.map((b) => (
                  <span
                    key={b.id}
                    className="absolute text-2xl select-none animate-emoji-burst pointer-events-none"
                    style={{
                      left: '50%',
                      bottom: '8px',
                      ['--dx' as any]: `${b.offset}px`,
                      ['--rot' as any]: `${b.rotation}deg`,
                      animationDelay: `${b.delay}ms`,
                    }}
                  >
                    {b.emoji}
                  </span>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => handleReact(userReaction || '👍')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer select-none font-semibold text-xs active:scale-95 ${
                liked && currentReactionObj
                  ? `${currentReactionObj.activeBg} animate-emoji-pop`
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
              title={liked ? `Reacted ${userReaction}` : 'Endorse / React'}
            >
              <span className={`text-sm ${liked ? 'animate-emoji-pop' : ''}`}>{userReaction || '👍'}</span>
              <span>{userReaction ? currentReactionObj?.label || 'Endorsed' : 'Endorse'}</span>
            </button>

            {/* Floating Real Emojis Reaction Picker */}
            {showReactionPicker && (
              <div
                className="absolute -top-12 left-0 z-40 bg-white border border-gray-200/90 rounded-full px-2 py-1 shadow-2xl flex items-center gap-1 animate-in fade-in zoom-in-90 duration-150"
                onMouseEnter={() => {
                  if (pickerTimeoutRef.current) clearTimeout(pickerTimeoutRef.current);
                }}
              >
                {REAL_REACTIONS.map((r) => (
                  <button
                    key={r.emoji}
                    type="button"
                    onClick={() => handleReact(r.emoji)}
                    className="text-xl p-1.5 rounded-full hover:scale-135 transition-transform duration-150 cursor-pointer active:scale-110"
                    title={r.label}
                  >
                    {r.emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Comment Button */}
          <button
            type="button"
            onClick={() => {
              if (onViewDetails) {
                onViewDetails(currentPost);
              } else {
                handleToggleComments();
              }
            }}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:text-orange-600 hover:bg-gray-100 transition-colors cursor-pointer text-xs font-semibold text-gray-700"
            title="Comments"
          >
            <ChatBubbleOvalLeftIcon className="w-4 h-4 text-gray-500" />
            <span>{commentCount}</span>
          </button>

          {/* Share Button (Respects audience: disabled if "Only me") */}
          <button
            type="button"
            disabled={currentPost.audience === 'only_me'}
            onClick={() => {
              setShareModalOpen(true);
              setSendToOthersOpen(false);
            }}
            className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-colors text-xs font-semibold ${
              currentPost.audience === 'only_me'
                ? 'opacity-40 cursor-not-allowed text-gray-400'
                : 'hover:text-blue-600 hover:bg-gray-100 text-gray-700 cursor-pointer'
            }`}
            title={currentPost.audience === 'only_me' ? 'Private post cannot be shared' : 'Share post'}
          >
            <svg
              className="w-4 h-4 text-gray-500"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3" />
            </svg>
            <span>{shareCount}</span>
          </button>
        </div>

        {/* Right: Overlapping Real Emojis (Clickable to view who reacted!) */}
        {likeCount > 0 ? (
          <button
            type="button"
            onClick={handleOpenReactionsModal}
            className="flex items-center gap-1.5 cursor-pointer hover:underline text-xs text-gray-600"
            title="View who reacted"
          >
            <div className="flex items-center -space-x-1 select-none">
              {(topReactions.length > 0 ? topReactions : ['👍']).map((emoji, idx) => (
                <span
                  key={idx}
                  className="w-5 h-5 rounded-full bg-white ring-1 ring-gray-200 flex items-center justify-center text-xs shadow-2xs"
                >
                  {emoji}
                </span>
              ))}
            </div>
            <span className="font-semibold text-gray-700 text-xs">{likeCount}</span>
          </button>
        ) : (
          <div className="flex items-center -space-x-1 select-none opacity-60">
            <span className="w-5 h-5 rounded-full bg-white ring-1 ring-gray-200 flex items-center justify-center text-xs">
              👍
            </span>
            <span className="w-5 h-5 rounded-full bg-white ring-1 ring-gray-200 flex items-center justify-center text-xs">
              ❤️
            </span>
          </div>
        )}
      </div>

      {/* Expandable Comments Drawer with Threaded Replies */}
      {commentsOpen && (
        <div className="p-4 bg-gray-50/80 border-t border-gray-100 animate-in fade-in duration-150">
          {/* Add top-level comment form */}
          {!currentPost.comments_disabled ? (
            <form onSubmit={handleAddComment} className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-orange-500 text-white font-bold text-xs flex items-center justify-center shrink-0">
                Me
              </div>
              <div className="flex-1 relative flex items-center bg-white border border-gray-200 rounded-full px-3 py-1 focus-within:ring-1 focus-within:ring-orange-500 focus-within:border-orange-500 transition-all">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Write a comment..."
                  className="flex-1 bg-transparent text-xs text-gray-800 placeholder-gray-400 outline-none pr-1"
                />
                <div className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowCommentEmojiPicker((prev) => !prev)}
                    className={`p-1 rounded-full transition-colors cursor-pointer ${
                      showCommentEmojiPicker
                        ? 'text-orange-600 bg-orange-100'
                        : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                    }`}
                    title="Insert emoji"
                  >
                    <FaceSmileIcon className="w-4 h-4" />
                  </button>

                  {showCommentEmojiPicker && (
                    <EmojiPicker
                      position="top"
                      className="right-0"
                      onSelect={(emoji) => {
                        setCommentText((prev) => prev + emoji);
                      }}
                      onClose={() => setShowCommentEmojiPicker(false)}
                    />
                  )}
                </div>
              </div>
              <button
                type="submit"
                disabled={!commentText.trim() || submittingComment}
                className="px-3.5 py-1.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-full text-xs font-semibold transition-colors cursor-pointer"
              >
                Post
              </button>
            </form>
          ) : (
            <div className="py-2 text-center text-xs text-gray-400 mb-2 bg-gray-100 rounded-lg">
              Comments are turned off for this post.
            </div>
          )}

          {/* Comments List */}
          {loadingComments ? (
            <div className="py-3 text-center text-xs text-gray-400">Loading comments...</div>
          ) : comments.length === 0 ? (
            <div className="py-2 text-center text-xs text-gray-400">
              No comments yet. Be the first to share your thoughts!
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1 scrollbar-hover">
              {comments.map((c) => {
                const isOwnComment = currentUserId && c.user_id && currentUserId === c.user_id;
                const canDeleteComment = isOwnComment || currentUserRole === 'admin';

                return (
                  <div key={c.id} className="space-y-2">
                    {/* Top Comment Bubble */}
                    <div className="flex items-start gap-2.5 text-xs group">
                      <div className="w-7 h-7 rounded-full bg-gray-200 text-gray-700 font-bold flex items-center justify-center shrink-0 text-[10px] overflow-hidden">
                        {c.author_avatar ? (
                          <img src={c.author_avatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          c.author?.[0]?.toUpperCase() || 'U'
                        )}
                      </div>

                      <div className="flex-1">
                        <div className="bg-white p-2.5 rounded-2xl border border-gray-200/80 shadow-2xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-gray-900">{c.author}</span>
                            <span className="text-[10px] text-gray-400">
                              {formatDate(c.created_at)}
                            </span>
                          </div>
                          <p className="text-gray-700 mt-0.5 leading-relaxed">{c.content}</p>
                        </div>

                        {/* Comment Action Links: Like, Reply */}
                        <div className="flex items-center gap-3 px-2 pt-1 text-[11px] font-semibold text-gray-500">
                          <button
                            type="button"
                            onClick={() => handleReactComment(c.id, '👍')}
                            className={`hover:underline cursor-pointer flex items-center gap-1 ${
                              c.liked ? 'text-blue-600 font-bold' : ''
                            }`}
                          >
                            <span>{c.user_reaction || '👍'}</span>
                            <span>Endorse</span>
                            {(c.like_count || 0) > 0 && <span className="text-[10px]">({c.like_count})</span>}
                          </button>

                          {!currentPost.comments_disabled && (
                            <button
                              type="button"
                              onClick={() => {
                                setReplyingToCommentId(replyingToCommentId === c.id ? null : c.id);
                                setReplyText('');
                              }}
                              className="hover:underline cursor-pointer text-gray-600"
                            >
                              Reply
                            </button>
                          )}

                          {canDeleteComment && (
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

                    {/* Nested Replies List */}
                    {c.replies && c.replies.length > 0 && (
                      <div className="ml-9 pl-3 border-l-2 border-gray-200 space-y-2">
                        {c.replies.map((reply) => {
                          const isOwnReply = currentUserId && reply.user_id && currentUserId === reply.user_id;
                          const canDeleteReply = isOwnReply || currentUserRole === 'admin';

                          return (
                            <div key={reply.id} className="flex items-start gap-2 text-xs">
                              <div className="w-6 h-6 rounded-full bg-gray-200 text-gray-700 font-bold flex items-center justify-center shrink-0 text-[9px] overflow-hidden">
                                {reply.author_avatar ? (
                                  <img src={reply.author_avatar} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  reply.author?.[0]?.toUpperCase() || 'U'
                                )}
                              </div>
                              <div className="flex-1">
                                <div className="bg-white p-2 rounded-xl border border-gray-200/80 shadow-2xs">
                                  <div className="flex items-center justify-between">
                                    <span className="font-bold text-gray-900 text-[11px]">{reply.author}</span>
                                    <span className="text-[9px] text-gray-400">{formatDate(reply.created_at)}</span>
                                  </div>
                                  <p className="text-gray-700 mt-0.5 text-xs">{reply.content}</p>
                                </div>
                                <div className="flex items-center gap-3 px-2 pt-0.5 text-[10px] text-gray-500">
                                  <button
                                    type="button"
                                    onClick={() => handleReactComment(reply.id, '👍')}
                                    className={`hover:underline cursor-pointer ${reply.liked ? 'text-blue-600 font-bold' : ''}`}
                                  >
                                    Endorse {(reply.like_count || 0) > 0 && `(${reply.like_count})`}
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

                    {/* Inline Reply Input Box */}
                    {replyingToCommentId === c.id && (
                      <div className="ml-9 flex items-center gap-2 pt-1 animate-in fade-in">
                        <input
                          type="text"
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder={`Reply to ${c.author}...`}
                          className="flex-1 bg-white border border-gray-200 rounded-full px-3 py-1 text-xs outline-none focus:border-orange-500"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => handleAddReply(c.id)}
                          disabled={!replyText.trim() || submittingReply}
                          className="px-3 py-1 bg-orange-500 text-white rounded-full text-xs font-semibold hover:bg-orange-600 disabled:opacity-40 cursor-pointer"
                        >
                          Reply
                        </button>
                        <button
                          type="button"
                          onClick={() => setReplyingToCommentId(null)}
                          className="text-gray-400 hover:text-gray-600 text-xs px-1"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Reactions Breakdown Modal */}
      {showReactionsModal &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-in fade-in duration-150"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.65)' }}
            onClick={() => setShowReactionsModal(false)}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h4 className="text-sm font-bold text-gray-900">People who reacted</h4>
              <button
                type="button"
                onClick={() => setShowReactionsModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-full cursor-pointer"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Reaction Tabs: All, 👍, ❤️, etc. */}
            <div className="flex items-center gap-1 px-3 py-2 border-b border-gray-100 overflow-x-auto text-xs">
              <button
                type="button"
                onClick={() => setSelectedReactionTab('all')}
                className={`px-2.5 py-1 rounded-full font-semibold cursor-pointer ${
                  selectedReactionTab === 'all' ? 'bg-orange-500 text-white' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                All ({reactionsList.length})
              </button>
              {Array.from(new Set(reactionsList.map((r) => r.reaction_type))).map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setSelectedReactionTab(emoji)}
                  className={`px-2.5 py-1 rounded-full font-semibold flex items-center gap-1 cursor-pointer ${
                    selectedReactionTab === emoji ? 'bg-orange-500 text-white' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <span>{emoji}</span>
                  <span>{reactionsList.filter((r) => r.reaction_type === emoji).length}</span>
                </button>
              ))}
            </div>

            {/* Reactions Users List */}
            <div className="p-3 space-y-2 max-h-60 overflow-y-auto">
              {loadingReactions ? (
                <p className="text-xs text-gray-400 text-center py-6">Loading reactions...</p>
              ) : reactionsList.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6">No reactions yet.</p>
              ) : (
                reactionsList
                  .filter((r) => selectedReactionTab === 'all' || r.reaction_type === selectedReactionTab)
                  .map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-1.5 rounded-lg hover:bg-gray-50">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="relative">
                          <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-700 font-bold flex items-center justify-center text-xs overflow-hidden shrink-0">
                            {item.avatar ? (
                              <img src={item.avatar} alt="" className="w-full h-full object-cover" />
                            ) : (
                              item.name.charAt(0)
                            )}
                          </div>
                          <span className="absolute -bottom-1 -right-1 text-xs">{item.reaction_type}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-gray-900 truncate">{item.name}</p>
                          {item.headline && <p className="text-[10px] text-gray-400 truncate">{item.headline}</p>}
                        </div>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Edit Post Modal */}
      {showEditModal &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-in fade-in duration-150"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.65)' }}
            onClick={() => setShowEditModal(false)}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl max-w-2xl sm:max-w-3xl w-full overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-150 p-5 flex flex-col max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h4 className="text-sm font-bold text-gray-900">Edit Alumni Post</h4>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-full cursor-pointer"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 py-3 overflow-y-auto flex-1 scrollbar-hover pr-1">
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Update Content</label>
                <textarea
                  rows={4}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full p-2.5 text-xs border border-gray-200 rounded-lg outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Audience</label>
                <select
                  value={editAudience}
                  onChange={(e: any) => setEditAudience(e.target.value)}
                  className="w-full p-2 text-xs border border-gray-200 rounded-lg outline-none focus:border-orange-500 bg-white"
                >
                  <option value="public">🌐 Public (Anyone on Alumni Network)</option>
                  <option value="friends">👥 Connections only</option>
                  <option value="only_me">🔒 Only me (Private)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Location</label>
                <input
                  type="text"
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  placeholder="e.g. CTU-Naga Campus"
                  className="w-full p-2 text-xs border border-gray-200 rounded-lg outline-none focus:border-orange-500"
                />
              </div>

              {/* Edit Media Attachment */}
              <div>
                <input
                  ref={editFileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleEditFileSelected(file);
                  }}
                />
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-gray-700">Attached Media</label>
                  <button
                    type="button"
                    onClick={() => editFileInputRef.current?.click()}
                    className="text-xs text-orange-600 hover:text-orange-700 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowUpTrayIcon className="w-3.5 h-3.5" />
                    <span>{editImageUrl || editVideoUrl ? 'Change' : 'Upload photo/video'}</span>
                  </button>
                </div>

                {editImageUrl && editMediaType === 'photo' && (
                  <div className="relative rounded-lg overflow-hidden max-h-40 bg-black/5 border border-gray-200">
                    <img src={editImageUrl} alt="" className="max-h-40 w-full object-cover" />
                    {uploadingEditMedia && (
                      <div className="absolute inset-0 bg-black/50 backdrop-blur-2xs flex items-center justify-center text-white text-xs">
                        Uploading photo...
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => setEditImageUrl('')}
                      className="absolute top-1.5 right-1.5 bg-black/70 hover:bg-black text-white p-1 rounded-full cursor-pointer"
                    >
                      <XMarkIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {editVideoUrl && editMediaType === 'video' && (
                  <div className="relative rounded-lg overflow-hidden max-h-40 bg-black border border-gray-800">
                    <video src={editVideoUrl} controls className="max-h-40 w-full bg-black" />
                    {uploadingEditMedia && (
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-2xs flex items-center justify-center text-white text-xs">
                        Uploading video...
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => setEditVideoUrl('')}
                      className="absolute top-1.5 right-1.5 bg-black/70 hover:bg-black text-white p-1 rounded-full cursor-pointer"
                    >
                      <XMarkIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={savingEdit || uploadingEditMedia || !editContent.trim()}
                className="px-4 py-1.5 text-xs font-semibold bg-orange-500 hover:bg-orange-600 text-white rounded-lg disabled:opacity-40 cursor-pointer"
              >
                {savingEdit ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Report Post Modal */}
      {showReportModal &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-in fade-in duration-150"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.65)' }}
            onClick={() => setShowReportModal(false)}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-150 p-4 max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h4 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                <FlagIcon className="w-4 h-4 text-red-500" />
                <span>Report post</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-full cursor-pointer"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitReport} className="py-3 space-y-3 overflow-y-auto flex-1 scrollbar-hover pr-1">
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">
                  Why are you reporting this post?
                </label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full p-2 text-xs border border-gray-200 rounded-lg outline-none focus:border-orange-500 bg-white"
                >
                  <option value="Spam">Spam or unwanted advertising</option>
                  <option value="Harassment">Harassment or bullying</option>
                  <option value="Inappropriate">Inappropriate or offensive content</option>
                  <option value="Misinformation">False or misleading information</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">
                  Additional Details (Optional)
                </label>
                <textarea
                  rows={3}
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  placeholder="Tell us what is wrong with this post..."
                  className="w-full p-2 text-xs border border-gray-200 rounded-lg outline-none focus:border-orange-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReport}
                  className="px-4 py-1.5 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-40 cursor-pointer"
                >
                  {submittingReport ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Share Modal */}
      {shareModalOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-in fade-in duration-150"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.65)' }}
            onClick={() => {
              setShareModalOpen(false);
              setSendToOthersOpen(false);
            }}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">Share Post</h3>
              <button
                type="button"
                onClick={() => {
                  setShareModalOpen(false);
                  setSendToOthersOpen(false);
                }}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {!sendToOthersOpen ? (
              <div className="p-4 space-y-2">
                {/* Post snippet */}
                <div className="bg-gray-50 border border-gray-200/70 rounded-xl p-3 flex items-start gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-orange-500 to-amber-500 text-white font-bold flex items-center justify-center text-xs shrink-0">
                    {currentPost.author_avatar || authorInitials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-gray-900 truncate">{currentPost.author}</p>
                    <p className="text-xs text-gray-600 line-clamp-2 mt-0.5">{decodeUnicode(currentPost.content)}</p>
                  </div>
                </div>

                {/* Option 1: Repost to Alumni Feed */}
                <button
                  type="button"
                  onClick={handleShareToFeed}
                  disabled={sharingFeed}
                  className="w-full flex items-center gap-3.5 p-3 rounded-xl hover:bg-gray-50 text-left transition-colors group cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:bg-blue-100 transition-colors">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                      Repost to Alumni Feed
                    </p>
                    <p className="text-xs text-gray-500">Publish immediately to the alumni network feed</p>
                  </div>
                </button>

                {/* Option 2: Send via Direct Message */}
                <button
                  type="button"
                  onClick={handleOpenSendToOthers}
                  className="w-full flex items-center gap-3.5 p-3 rounded-xl hover:bg-gray-50 text-left transition-colors group cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 group-hover:bg-purple-100 transition-colors">
                    <PaperAirplaneIcon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 group-hover:text-purple-600 transition-colors">
                      Send via Direct Message
                    </p>
                    <p className="text-xs text-gray-500">Share privately with an alumnus via chat</p>
                  </div>
                </button>

                {/* Option 3: Copy Link */}
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="w-full flex items-center gap-3.5 p-3 rounded-xl hover:bg-gray-50 text-left transition-colors group cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center shrink-0 group-hover:bg-gray-200 transition-colors">
                    <LinkIcon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 group-hover:text-gray-700 transition-colors">
                      Copy link
                    </p>
                    <p className="text-xs text-gray-500">Copy link to this alumni post</p>
                  </div>
                </button>
              </div>
            ) : (
              /* Subview: Send to others */
              <div className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setSendToOthersOpen(false)}
                    className="text-xs font-semibold text-orange-600 hover:text-orange-700 flex items-center gap-1 cursor-pointer"
                  >
                    &larr; Back
                  </button>
                  <span className="text-xs text-gray-400">|</span>
                  <span className="text-xs font-medium text-gray-700">Select Alumnus to Message</span>
                </div>

                <input
                  type="text"
                  value={searchRecipient}
                  onChange={(e) => setSearchRecipient(e.target.value)}
                  placeholder="Search alumni by name..."
                  className="w-full px-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg mb-3 outline-none focus:border-orange-500 transition-all"
                />

                <div className="space-y-1.5 max-h-56 overflow-y-auto">
                  {loadingAlumni ? (
                    <p className="text-xs text-gray-400 text-center py-4">Loading alumni...</p>
                  ) : alumniList.filter((a) => {
                      if (!searchRecipient.trim()) return true;
                      const q = searchRecipient.toLowerCase();
                      const name = `${a.first_name || ''} ${a.last_name || ''}`.toLowerCase();
                      return name.includes(q);
                    }).length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-4">No alumni found.</p>
                  ) : (
                    alumniList
                      .filter((a) => {
                        if (!searchRecipient.trim()) return true;
                        const q = searchRecipient.toLowerCase();
                        const name = `${a.first_name || ''} ${a.last_name || ''}`.toLowerCase();
                        return name.includes(q);
                      })
                      .map((alumnus) => {
                        const isSent = sentMap[alumnus.id];
                        return (
                          <div
                            key={alumnus.id}
                            className="flex items-center justify-between p-2 rounded-xl hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-700 overflow-hidden shrink-0">
                                {alumnus.avatar_url ? (
                                  <img src={alumnus.avatar_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  (alumnus.first_name?.[0] || '') + (alumnus.last_name?.[0] || '')
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-gray-900 truncate">
                                  {alumnus.first_name} {alumnus.last_name}
                                </p>
                                {alumnus.headline && (
                                  <p className="text-[10px] text-gray-400 truncate">{alumnus.headline}</p>
                                )}
                              </div>
                            </div>

                            <button
                              type="button"
                              disabled={isSent || sendingMessage === alumnus.id}
                              onClick={() => handleSendToAlumnus(alumnus)}
                              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                                isSent
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default'
                                  : 'bg-orange-500 hover:bg-orange-600 text-white cursor-pointer active:scale-95'
                              }`}
                            >
                              {isSent ? 'Sent' : sendingMessage === alumnus.id ? 'Sending...' : 'Send'}
                            </button>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Floating Feedback Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-60 bg-gray-900 text-white text-xs px-4 py-2.5 rounded-xl shadow-xl animate-in fade-in slide-in-from-bottom-2 flex items-center gap-2">
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
