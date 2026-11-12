import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PlusIcon,
  ChatBubbleLeftRightIcon,
  GlobeAltIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  HeartIcon,
  ChatBubbleOvalLeftIcon,
  UserGroupIcon,
  SparklesIcon,
  BriefcaseIcon,
  PaperAirplaneIcon,
  TrashIcon,
  CalendarDaysIcon,
  CheckIcon,
  TagIcon,
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';
import { communityApi, eventsApi, profileApi } from '@/services/api';
import { useChatStore } from '@/store/chatStore';
import { SkeletonForumPostCard, SkeletonEventItem } from '@/components/ui/Skeleton';
import { REAL_REACTIONS } from '@/components/dashboard/FeedPostCard';
import { dedupeCommentTree, countAllComments } from '@/utils/helpers';
import { getCached } from '@/utils/apiCache';
import MentionInput from '@/components/ui/MentionInput';
import MentionText from '@/components/ui/MentionText';
import { MentionCandidate } from '@/hooks/useMentionPeople';

const FORUM_TAGS = [
  'Job Opportunity',
  'Referral',
  'Mentorship',
  'Networking',
  'Career Advice',
  'General Discussion',
];

const tagBadgeColor: Record<string, string> = {
  'Job Opportunity': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Referral: 'bg-blue-50 text-blue-700 border-blue-200',
  Mentorship: 'bg-purple-50 text-purple-700 border-purple-200',
  Networking: 'bg-orange-50 text-orange-700 border-orange-200',
  'Career Advice': 'bg-amber-50 text-amber-700 border-amber-200',
  'General Discussion': 'bg-gray-100 text-gray-700 border-gray-200',
};

export default function CommunityPage() {
  const navigate = useNavigate();
  const { openChat, setHeaderDropdownOpen } = useChatStore();

  const cachedGroups = getCached<any[]>('/community/groups');
  const cachedPosts = getCached<any[]>('/community/posts');

  const [loading, setLoading] = useState(() => cachedGroups === undefined || cachedPosts === undefined);
  const [error, setError] = useState('');
  const [groups, setGroups] = useState<any[]>(() => cachedGroups || []);
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [posts, setPosts] = useState<any[]>(() => cachedPosts || []);
  const [postsLoading, setPostsLoading] = useState(false);

  const [showPostModal, setShowPostModal] = useState(false);
  const [postForm, setPostForm] = useState({
    group_id: cachedGroups?.[0]?.id || '',
    title: '',
    content: '',
    tags: ['Job Opportunity'] as string[],
  });
  const [postFormMentions, setPostFormMentions] = useState<Array<{ id: string; name: string }>>([]);
  const [saving, setSaving] = useState(false);

  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupForm, setGroupForm] = useState({
    name: '',
    description: '',
    category: 'general',
  });
  const [creatingGroup, setCreatingGroup] = useState(false);

  const [expandedPostIds, setExpandedPostIds] = useState<Record<string, boolean>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [commentMentionsMap, setCommentMentionsMap] = useState<Record<string, Array<{ id: string; name: string }>>>({});
  const [submittingCommentMap, setSubmittingCommentMap] = useState<Record<string, boolean>>({});
  const submittingCommentKeysRef = useRef<Set<string>>(new Set());
  const [replyingCommentMap, setReplyingCommentMap] = useState<Record<string, { parentCommentId: string; authorName: string } | null>>({});
  const [replyInputs, setReplyInputs] = useState<Record<string, string>>({});
  const [replyMentionsMap, setReplyMentionsMap] = useState<Record<string, Array<{ id: string; name: string }>>>({});
  const [submittingReplyMap, setSubmittingReplyMap] = useState<Record<string, boolean>>({});
  const submittingReplyKeysRef = useRef<Set<string>>(new Set());
  const [activeCommentReactionPickerId, setActiveCommentReactionPickerId] = useState<string | null>(null);
  const commentPickerTimeoutRef = useRef<any>(null);
  const [joiningGroupMap, setJoiningGroupMap] = useState<Record<string, boolean>>({});
  const [myProfileId, setMyProfileId] = useState<string | null>(() => getCached<any>('/profile')?.id || null);
  const [events, setEvents] = useState<any[]>(() => getCached<any[]>('/events') || []);

  useEffect(() => {
    profileApi
      .get()
      .then((p) => {
        if (p?.id) setMyProfileId(p.id);
      })
      .catch(() => {});

    eventsApi
      .list()
      .then((data) => setEvents(data || []))
      .catch(() => setEvents([]));

    initForum();
  }, []);

  const initForum = async () => {
    try {
      if (getCached('/community/groups') === undefined || getCached('/community/posts') === undefined) {
        setLoading(true);
      }
      setError('');
      const [grpData, postData] = await Promise.all([
        communityApi.groups(),
        communityApi.allPosts(),
      ]);
      const groupList = grpData || [];
      setGroups(groupList);
      setPosts(postData || []);
      if (groupList.length > 0) {
        setPostForm((prev) => ({ ...prev, group_id: prev.group_id || groupList[0].id }));
      }
    } catch {
      if (groups.length === 0 && posts.length === 0) {
        setError('Failed to load Alumni Forum discussions.');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadPostsForGroup = async (groupId: string) => {
    const endpoint = groupId === 'all' ? '/community/posts' : `/community/groups/${groupId}/posts`;
    const hit = getCached<any[]>(endpoint);
    try {
      setSelectedGroup(groupId);
      if (hit !== undefined) {
        setPosts(hit);
        setPostsLoading(false);
      } else {
        setPostsLoading(true);
      }
      if (groupId !== 'all') {
        setPostForm((prev) => ({ ...prev, group_id: groupId }));
      }
      const data = await communityApi.forums(groupId);
      setPosts(data || []);
    } catch {
      if (hit === undefined) setError('Failed to load discussions for this channel.');
    } finally {
      setPostsLoading(false);
    }
  };

  const handleToggleJoinGroup = async (groupId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (joiningGroupMap[groupId]) return;
    setJoiningGroupMap((prev) => ({ ...prev, [groupId]: true }));
    try {
      const res = await communityApi.toggleJoinGroup(groupId);
      setGroups((prev) =>
        prev.map((g) =>
          g.id === groupId
            ? {
                ...g,
                is_member: res.joined,
                member_count: res.member_count,
              }
            : g
        )
      );
    } catch {
      // ignore
    } finally {
      setJoiningGroupMap((prev) => ({ ...prev, [groupId]: false }));
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupForm.name.trim() || creatingGroup) return;
    setCreatingGroup(true);
    try {
      const created = await communityApi.createGroup(groupForm);
      if (created) {
        setGroups((prev) => [...prev, created]);
        setShowGroupModal(false);
        setGroupForm({ name: '', description: '', category: 'general' });
        loadPostsForGroup(created.id);
      }
    } catch {
      alert('Failed to create forum channel.');
    } finally {
      setCreatingGroup(false);
    }
  };

  const toggleFormTag = (tag: string) => {
    setPostForm((prev) => {
      const exists = prev.tags.includes(tag);
      if (exists) {
        return { ...prev, tags: prev.tags.filter((t) => t !== tag) };
      }
      return { ...prev, tags: [...prev.tags, tag] };
    });
  };

  const handleCreatePost = async () => {
    const targetGroupId = postForm.group_id || groups[0]?.id;
    if (!targetGroupId || !postForm.title.trim() || !postForm.content.trim()) return;
    try {
      setSaving(true);
      const activeMentions = postFormMentions.filter((m) =>
        postForm.content.toLowerCase().includes(`@${m.name.toLowerCase()}`)
      );
      const created = await communityApi.createPost({
        group_id: targetGroupId,
        title: postForm.title.trim(),
        content: postForm.content.trim(),
        tags: postForm.tags,
        mentions: activeMentions,
      });
      setShowPostModal(false);
      setPostForm((prev) => ({ ...prev, title: '', content: '' }));
      setPostFormMentions([]);
      if (created) {
        setPosts((prev) => [created, ...prev]);
        setGroups((prev) =>
          prev.map((g) =>
            g.id === targetGroupId
              ? { ...g, post_count: (g.post_count || 0) + 1, is_member: true }
              : g
          )
        );
      } else {
        loadPostsForGroup(selectedGroup);
      }
    } catch {
      alert('Failed to publish forum discussion.');
    } finally {
      setSaving(false);
    }
  };

  const handleLikePost = async (postId: string) => {
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        const nextLiked = !p.liked;
        const nextCount = Math.max(0, (p.like_count || 0) + (nextLiked ? 1 : -1));
        return { ...p, liked: nextLiked, like_count: nextCount, likes_count: nextCount };
      })
    );

    try {
      const res = await communityApi.likePost(postId);
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, liked: res.liked, like_count: res.like_count, likes_count: res.like_count }
            : p
        )
      );
    } catch {
      // ignore
    }
  };

  const handleAddComment = async (postId: string) => {
    const text = (commentInputs[postId] || '').trim();
    if (!text || submittingCommentMap[postId] || submittingCommentKeysRef.current.has(postId)) return;

    submittingCommentKeysRef.current.add(postId);
    setSubmittingCommentMap((prev) => ({ ...prev, [postId]: true }));
    try {
      const activeMentions = (commentMentionsMap[postId] || []).filter((m) =>
        text.toLowerCase().includes(`@${m.name.toLowerCase()}`)
      );
      const res = await communityApi.addComment(postId, text, undefined, activeMentions);
      setCommentInputs((prev) => ({ ...prev, [postId]: '' }));
      setCommentMentionsMap((prev) => ({ ...prev, [postId]: [] }));
      setExpandedPostIds((prev) => ({ ...prev, [postId]: true }));
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                comments: dedupeCommentTree(res.comments || [...(p.comments || []), res.comment]),
                comment_count: res.comment_count,
                comments_count: res.comment_count,
              }
            : p
        )
      );
    } catch {
      alert('Failed to post comment.');
    } finally {
      submittingCommentKeysRef.current.delete(postId);
      setSubmittingCommentMap((prev) => ({ ...prev, [postId]: false }));
    }
  };

  const handleAddReply = async (postId: string, parentCommentId: string, replyText: string) => {
    const text = (replyText || '').trim();
    const replyKey = `${postId}-${parentCommentId}`;
    if (!text || submittingReplyMap[replyKey] || submittingReplyKeysRef.current.has(replyKey)) return;

    submittingReplyKeysRef.current.add(replyKey);
    setSubmittingReplyMap((prev) => ({ ...prev, [replyKey]: true }));
    try {
      const activeMentions = (replyMentionsMap[replyKey] || []).filter((m) =>
        text.toLowerCase().includes(`@${m.name.toLowerCase()}`)
      );
      const res = await communityApi.addComment(postId, text, parentCommentId, activeMentions);
      setReplyInputs((prev) => ({ ...prev, [replyKey]: '' }));
      setReplyMentionsMap((prev) => ({ ...prev, [replyKey]: [] }));
      setReplyingCommentMap((prev) => ({ ...prev, [postId]: null }));
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                comments: dedupeCommentTree(res.comments || p.comments || []),
                comment_count: res.comment_count,
                comments_count: res.comment_count,
              }
            : p
        )
      );
    } catch {
      alert('Failed to post reply.');
    } finally {
      submittingReplyKeysRef.current.delete(replyKey);
      setSubmittingReplyMap((prev) => ({ ...prev, [replyKey]: false }));
    }
  };

  const handleReactComment = async (postId: string, commentId: string, emoji = '👍') => {
    // Instant optimistic update
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        const updateC = (c: any): any => {
          if (c.id === commentId) {
            const isSame = c.liked && c.user_reaction === emoji;
            const nextLiked = !isSame;
            const nextReaction = nextLiked ? emoji : null;
            const delta = isSame ? -1 : (c.liked ? 0 : 1);
            return {
              ...c,
              liked: nextLiked,
              user_reaction: nextReaction,
              like_count: Math.max(0, (c.like_count || 0) + delta),
            };
          }
          if (c.replies) {
            return {
              ...c,
              replies: c.replies.map(updateC),
            };
          }
          return c;
        };

        return {
          ...p,
          comments: (p.comments || []).map(updateC),
        };
      })
    );

    try {
      const res = await communityApi.reactComment(postId, commentId, emoji);
      if (res?.post) {
        setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, ...res.post } : p)));
      }
    } catch {
      // ignore
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!window.confirm('Delete this forum discussion?')) return;
    try {
      await communityApi.deletePost(postId);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch {
      alert('Failed to delete discussion.');
    }
  };

  const handleChatWithAuthor = (authorId?: string, authorName?: string, authorAvatar?: string | null, authorHeadline?: string | null) => {
    if (!authorId || authorId === myProfileId) return;
    openChat({
      profileId: authorId,
      name: authorName || 'CTU-Naga Alumnus',
      avatar: authorAvatar || undefined,
      headline: authorHeadline || undefined,
    });
  };

  const filteredPosts = useMemo(() => {
    return posts.filter((p) => {
      if (selectedGroup !== 'all' && p.group_id !== selectedGroup) return false;
      if (selectedTag !== 'All') {
        const postTags: string[] = Array.isArray(p.tags) ? p.tags : [];
        if (!postTags.includes(selectedTag)) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = (p.title || '').toLowerCase().includes(q);
        const contentMatch = (p.content || '').toLowerCase().includes(q);
        const authorMatch = (p.author_name || '').toLowerCase().includes(q);
        return titleMatch || contentMatch || authorMatch;
      }
      return true;
    });
  }, [posts, selectedGroup, selectedTag, searchQuery]);

  const activeGroupObj = groups.find((g) => g.id === selectedGroup);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-5">
        <div className="h-32 bg-gradient-to-r from-orange-400/70 via-orange-500/70 to-amber-500/70 rounded-2xl p-6 animate-pulse flex flex-col justify-between">
          <div className="h-5 w-48 bg-white/30 rounded-full" />
          <div className="space-y-2">
            <div className="h-6 w-64 bg-white/40 rounded" />
            <div className="h-3.5 w-96 max-w-full bg-white/25 rounded" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white border border-gray-200 rounded-xl p-3 space-y-2.5 animate-pulse">
              <div className="h-9 bg-gray-100 rounded-lg" />
              <div className="flex gap-2">
                {[1, 2, 3, 4].map((i) => <div key={i} className="h-6 w-20 bg-gray-100 rounded-lg" />)}
              </div>
            </div>
            <SkeletonForumPostCard />
            <SkeletonForumPostCard />
          </div>
          <div className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3 animate-pulse">
              <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                <div className="h-4 w-28 bg-gray-200 rounded" />
                <div className="h-6 w-20 bg-orange-100 rounded-lg" />
              </div>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-10 bg-gray-100 rounded-xl" />
              ))}
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
              <SkeletonEventItem />
              <SkeletonEventItem />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto space-y-5">
        <div className="bg-white border border-gray-200 rounded-2xl text-center py-12 px-4">
          <p className="text-sm text-red-600 font-medium">{error}</p>
          <button
            onClick={initForum}
            className="mt-4 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-4 pb-8">
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 rounded-2xl p-4 sm:p-6 text-white shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-[11px] font-semibold backdrop-blur-xs">
              <SparklesIcon className="w-3.5 h-3.5" />
              <span>CTU-Naga Alumni Networking &amp; Opportunity Hub</span>
            </div>
            <h1 className="text-lg sm:text-xl font-bold leading-snug">
              Alumni Forum &amp; Opportunity Board
            </h1>
            <p className="text-xs sm:text-sm text-orange-100 max-w-2xl">
              Connect with fellow graduates, share job leads and referrals, ask career questions, or start a live chat directly with alumni.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                if (selectedGroup !== 'all') {
                  setPostForm((prev) => ({ ...prev, group_id: selectedGroup }));
                } else if (!postForm.group_id && groups[0]?.id) {
                  setPostForm((prev) => ({ ...prev, group_id: groups[0].id }));
                }
                setShowPostModal(true);
              }}
              className="h-9 px-3.5 bg-white text-orange-600 hover:bg-orange-50 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              <PlusIcon className="w-4 h-4 stroke-2" />
              <span>Share Opportunity / Post</span>
            </button>
            <button
              type="button"
              onClick={() => setHeaderDropdownOpen(true)}
              className="h-9 px-3.5 bg-white/15 hover:bg-white/25 text-white border border-white/30 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <ChatBubbleLeftRightIcon className="w-4 h-4" />
              <span>Live Alumni Chat</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Horizontal Channel Selector */}
      <div className="flex lg:hidden items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        <button
          type="button"
          onClick={() => loadPostsForGroup('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors shrink-0 cursor-pointer ${
            selectedGroup === 'all'
              ? 'bg-orange-500 text-white shadow-2xs'
              : 'bg-white border border-gray-200 text-gray-700'
          }`}
        >
          All Channels
        </button>
        {groups.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => loadPostsForGroup(g.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors shrink-0 cursor-pointer ${
              selectedGroup === g.id
                ? 'bg-orange-500 text-white shadow-2xs'
                : 'bg-white border border-gray-200 text-gray-700'
            }`}
          >
            {g.name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        {/* Main Forum Feed */}
        <div className="lg:col-span-2 space-y-4 min-w-0">
          {/* Search & Topic Tag Filters */}
          <div className="bg-white border border-gray-200 rounded-xl p-3 sm:p-4 space-y-3 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-gray-900">
                  {selectedGroup === 'all'
                    ? 'All Alumni Discussions & Opportunities'
                    : activeGroupObj?.name || 'Channel Discussions'}
                </h2>
                {activeGroupObj?.description && (
                  <p className="text-xs text-gray-500 mt-0.5">{activeGroupObj.description}</p>
                )}
              </div>

              <div className="relative w-full sm:w-60 shrink-0">
                <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search forum topics..."
                  className="w-full h-8 pl-8 pr-7 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 placeholder-gray-400 outline-none focus:bg-white focus:border-orange-400"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Topic Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
              {['All', ...FORUM_TAGS].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setSelectedTag(tag)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    selectedTag === tag
                      ? 'bg-orange-100 text-orange-700 border border-orange-300'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200/80'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Discussions List */}
          {postsLoading ? (
            <div className="space-y-3">
              <SkeletonForumPostCard />
              <SkeletonForumPostCard />
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl text-center py-12 px-4 shadow-2xs">
              <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-500 mx-auto flex items-center justify-center mb-3">
                <GlobeAltIcon className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-gray-800">No discussions found</h3>
              <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                Be the first to share a job opportunity, referral lead, or discussion topic with fellow CTU-Naga alumni!
              </p>
              <button
                type="button"
                onClick={() => setShowPostModal(true)}
                className="mt-4 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <PlusIcon className="w-4 h-4" />
                <span>Start a Discussion</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPosts.map((post: any) => {
                const isMyPost = Boolean(myProfileId && post.author_id === myProfileId);
                const isExpanded = !!expandedPostIds[post.id];
                const commentsList: any[] = Array.isArray(post.comments) ? post.comments : [];
                const postTags: string[] = Array.isArray(post.tags) ? post.tags : [];

                return (
                  <div
                    key={post.id}
                    className="bg-white border border-gray-200 rounded-xl p-4 shadow-2xs hover:border-gray-300 transition-all space-y-3"
                  >
                    {/* Author Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          onClick={() => post.author_id && navigate(`/directory/${post.author_id}`)}
                          className="w-9 h-9 rounded-full bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-white text-xs font-bold shrink-0 overflow-hidden cursor-pointer ring-1 ring-gray-200"
                        >
                          {post.author_avatar ? (
                            <img src={post.author_avatar} alt="" className="w-full h-full object-cover" />
                          ) : (
                            (post.author_name || 'A').charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              type="button"
                              onClick={() => post.author_id && navigate(`/directory/${post.author_id}`)}
                              className="text-xs sm:text-sm font-bold text-gray-900 hover:text-orange-600 truncate cursor-pointer"
                            >
                              {post.author_name || 'CTU-Naga Alumnus'}
                            </button>
                            {post.group_name && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                                {post.group_name}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                            {post.author_headline && (
                              <>
                                <span className="truncate max-w-[180px] sm:max-w-xs">{post.author_headline}</span>
                                <span>·</span>
                              </>
                            )}
                            <span>
                              {post.created_at
                                ? new Date(post.created_at).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                  })
                                : 'Recently'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {!isMyPost && post.author_id && (
                          <button
                            type="button"
                            onClick={() =>
                              handleChatWithAuthor(
                                post.author_id,
                                post.author_name,
                                post.author_avatar,
                                post.author_headline
                              )
                            }
                            className="h-7 px-2.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-[11px] font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
                            title={`Chat with ${post.author_name}`}
                          >
                            <ChatBubbleLeftRightIcon className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Chat</span>
                          </button>
                        )}
                        {isMyPost && (
                          <button
                            type="button"
                            onClick={() => handleDeletePost(post.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete discussion"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Tags */}
                    {postTags.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        {postTags.map((t) => (
                          <span
                            key={t}
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
                              tagBadgeColor[t] || 'bg-orange-50 text-orange-700 border-orange-200'
                            }`}
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Title & Body */}
                    <div>
                      <h3 className="text-sm sm:text-base font-bold text-gray-900 leading-snug">
                        {post.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-600 mt-1 whitespace-pre-wrap break-words leading-relaxed">
                        <MentionText
                          text={post.content}
                          mentionedProfiles={post.mentioned_profiles}
                        />
                      </p>
                    </div>

                    {/* Footer Actions: Like, Reply/Comments, Direct Connect */}
                    <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-2 text-xs text-gray-500">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleLikePost(post.id)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                            post.liked
                              ? 'bg-red-50 text-red-600'
                              : 'hover:bg-gray-100 text-gray-600'
                          }`}
                        >
                          {post.liked ? (
                            <HeartSolidIcon className="w-4 h-4 text-red-500" />
                          ) : (
                            <HeartIcon className="w-4 h-4" />
                          )}
                          <span>{post.like_count || 0}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setExpandedPostIds((prev) => ({ ...prev, [post.id]: !prev[post.id] }))
                          }
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold hover:bg-gray-100 text-gray-600 transition-colors cursor-pointer"
                        >
                          <ChatBubbleOvalLeftIcon className="w-4 h-4" />
                          <span>
                            {countAllComments(commentsList)}{' '}
                            {countAllComments(commentsList) === 1 ? 'Reply' : 'Replies'}
                          </span>
                        </button>
                      </div>

                      {!isMyPost && post.author_id && (
                        <button
                          type="button"
                          onClick={() => navigate(`/directory/${post.author_id}`)}
                          className="text-[11px] font-semibold text-orange-600 hover:text-orange-700 hover:underline cursor-pointer"
                        >
                          View Profile →
                        </button>
                      )}
                    </div>

                    {/* Threaded Replies Section */}
                    {isExpanded && (
                      <div className="pt-2 space-y-2.5 border-t border-gray-100 bg-gray-50/60 -mx-4 -mb-4 p-3 sm:p-4 rounded-b-xl">
                        {commentsList.length > 0 && (
                          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                            {commentsList.map((c: any) => {
                              const replyKey = `${post.id}-${c.id}`;
                              const isReplyingThis = replyingCommentMap[post.id]?.parentCommentId === c.id;

                              return (
                                <div key={c.id} className="space-y-2">
                                  {/* Top Comment Card */}
                                  <div className="bg-white border border-gray-200/80 rounded-xl p-2.5 shadow-2xs">
                                    <div className="flex items-start gap-2.5">
                                      <div
                                        onClick={() => c.author_id && navigate(`/directory/${c.author_id}`)}
                                        className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0 overflow-hidden cursor-pointer shadow-2xs"
                                      >
                                        {c.author_avatar ? (
                                          <img src={c.author_avatar} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                          (c.author_name || 'A').charAt(0).toUpperCase()
                                        )}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                          <button
                                            type="button"
                                            onClick={() => c.author_id && navigate(`/directory/${c.author_id}`)}
                                            className="text-xs font-bold text-gray-900 hover:text-orange-600 truncate cursor-pointer"
                                          >
                                            {c.author_name || 'Alumnus'}
                                          </button>
                                          <div className="flex items-center gap-2 shrink-0">
                                            {c.author_id && c.author_id !== myProfileId && (
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  handleChatWithAuthor(
                                                    c.author_id,
                                                    c.author_name,
                                                    c.author_avatar,
                                                    c.author_headline
                                                  )
                                                }
                                                className="text-[10px] font-semibold text-blue-600 hover:underline cursor-pointer"
                                              >
                                                Message
                                              </button>
                                            )}
                                            <span className="text-[10px] text-gray-400">
                                              {c.created_at
                                                ? new Date(c.created_at).toLocaleTimeString([], {
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                  })
                                                : ''}
                                            </span>
                                          </div>
                                        </div>
                                        <p className="text-xs text-gray-700 mt-0.5 break-words whitespace-pre-wrap leading-relaxed">
                                          <MentionText
                                            text={c.content}
                                            mentionedProfiles={c.mentioned_profiles}
                                          />
                                        </p>
                                      </div>
                                    </div>

                                    {/* Action Links & Reactions */}
                                    <div className="flex items-center justify-between pt-1.5 mt-1 border-t border-gray-100 text-[11px] font-semibold text-gray-500">
                                      <div className="flex items-center gap-3">
                                        {/* Reaction Picker Button */}
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
                                            onClick={() => handleReactComment(post.id, c.id, c.user_reaction || '👍')}
                                            className={`hover:underline cursor-pointer flex items-center gap-1 transition-colors ${
                                              c.liked ? 'text-blue-600 font-bold' : 'text-gray-500 hover:text-gray-700'
                                            }`}
                                          >
                                            <span>{c.user_reaction || '👍'}</span>
                                            <span>{c.liked ? 'Endorsed' : 'Endorse'}</span>
                                          </button>

                                          {/* Floating Picker */}
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
                                                    handleReactComment(post.id, c.id, r.emoji);
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
                                            if (isReplyingThis) {
                                              setReplyingCommentMap((prev) => ({ ...prev, [post.id]: null }));
                                            } else {
                                              setReplyingCommentMap((prev) => ({
                                                ...prev,
                                                [post.id]: { parentCommentId: c.id, authorName: c.author_name || 'Alumnus' },
                                              }));
                                              setReplyInputs((prev) => ({ ...prev, [replyKey]: '' }));
                                            }
                                          }}
                                          className="hover:underline cursor-pointer text-gray-600 hover:text-orange-600 transition-colors"
                                        >
                                          Reply
                                        </button>
                                      </div>

                                      {(c.like_count || 0) > 0 && (
                                        <div className="flex items-center gap-0.5 bg-gray-100 rounded-full px-1.5 py-0.5 text-[10px] text-gray-600 font-medium">
                                          <span>
                                            {c.top_reactions && c.top_reactions.length > 0
                                              ? c.top_reactions.join('')
                                              : c.user_reaction || '👍'}
                                          </span>
                                          <span className="text-[9px] font-semibold">{c.like_count}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Nested Replies List */}
                                  {c.replies && c.replies.length > 0 && (
                                    <div className="ml-5 sm:ml-9 pl-3 border-l-2 border-gray-200 space-y-2">
                                      {c.replies.map((reply: any) => (
                                        <div key={reply.id} className="bg-white border border-gray-200/80 rounded-xl p-2 shadow-2xs">
                                          <div className="flex items-start gap-2">
                                            <div
                                              onClick={() => reply.author_id && navigate(`/directory/${reply.author_id}`)}
                                              className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-white font-bold flex items-center justify-center text-[9px] shrink-0 overflow-hidden cursor-pointer"
                                            >
                                              {reply.author_avatar ? (
                                                <img src={reply.author_avatar} alt="" className="w-full h-full object-cover" />
                                              ) : (
                                                (reply.author_name || 'A').charAt(0).toUpperCase()
                                              )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                              <div className="flex items-center justify-between gap-2">
                                                <button
                                                  type="button"
                                                  onClick={() => reply.author_id && navigate(`/directory/${reply.author_id}`)}
                                                  className={`font-bold text-gray-900 text-[11px] truncate text-left ${
                                                    reply.author_id ? 'hover:text-orange-600 hover:underline cursor-pointer' : ''
                                                  }`}
                                                >
                                                  {reply.author_name}
                                                </button>
                                                <span className="text-[9px] text-gray-400 shrink-0">
                                                  {reply.created_at ? new Date(reply.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                                </span>
                                              </div>
                                              <p className="text-xs text-gray-700 mt-0.5 break-words">
                                                <MentionText
                                                  text={reply.content}
                                                  mentionedProfiles={reply.mentioned_profiles}
                                                />
                                              </p>
                                            </div>
                                          </div>

                                          <div className="flex items-center justify-between pt-1 mt-1 border-t border-gray-100 text-[10px] font-semibold text-gray-500">
                                            <div className="flex items-center gap-3">
                                              {/* Reply Reaction */}
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
                                                  onClick={() => handleReactComment(post.id, reply.id, reply.user_reaction || '👍')}
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
                                                          handleReactComment(post.id, reply.id, r.emoji);
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
                                                  setReplyingCommentMap((prev) => ({
                                                    ...prev,
                                                    [post.id]: { parentCommentId: c.id, authorName: reply.author_name || 'Alumnus' },
                                                  }));
                                                  setReplyInputs((prev) => ({
                                                    ...prev,
                                                    [replyKey]: `@${reply.author_name || 'Alumnus'} `,
                                                  }));
                                                }}
                                                className="hover:underline cursor-pointer text-gray-600 hover:text-orange-600 transition-colors"
                                              >
                                                Reply
                                              </button>
                                            </div>

                                            {(reply.like_count || 0) > 0 && (
                                              <div className="flex items-center gap-0.5 bg-gray-100 rounded-full px-1.5 py-0.5 text-[9px] text-gray-600 font-medium">
                                                <span>
                                                  {reply.top_reactions && reply.top_reactions.length > 0
                                                    ? reply.top_reactions.join('')
                                                    : reply.user_reaction || '👍'}
                                                </span>
                                                <span className="text-[8px] font-semibold">{reply.like_count}</span>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {/* Inline Reply Input for Comment Thread */}
                                  {isReplyingThis && (
                                    <div className="ml-5 sm:ml-9 pt-1 animate-in fade-in space-y-1">
                                      <div className="flex items-center justify-between text-[11px] text-gray-500 px-1">
                                        <span>
                                          Replying to <span className="font-semibold text-orange-600">{replyingCommentMap[post.id]?.authorName}</span>
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => setReplyingCommentMap((prev) => ({ ...prev, [post.id]: null }))}
                                          className="text-gray-400 hover:text-gray-600 text-[10px]"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                      <div className="flex items-center gap-1.5">
                                        <MentionInput
                                          as="input"
                                          value={replyInputs[replyKey] || ''}
                                          onChange={(val) => setReplyInputs((prev) => ({ ...prev, [replyKey]: val }))}
                                          onMentionSelect={(candidate: MentionCandidate) => {
                                            setReplyMentionsMap((prev) => {
                                              const current = prev[replyKey] || [];
                                              return current.some((m) => m.id === candidate.id)
                                                ? prev
                                                : {
                                                    ...prev,
                                                    [replyKey]: [...current, { id: candidate.id, name: candidate.name }],
                                                  };
                                            });
                                          }}
                                          dropdownPosition="top"
                                          placeholder={`Reply to ${replyingCommentMap[post.id]?.authorName}... (type @ to mention)`}
                                          className="w-full h-8 px-3 bg-white border border-gray-200 rounded-full text-xs text-gray-800 placeholder-gray-400 outline-none focus:border-orange-400"
                                          autoFocus
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                              e.preventDefault();
                                              handleAddReply(post.id, c.id, replyInputs[replyKey]);
                                            }
                                          }}
                                        />
                                        <button
                                          type="button"
                                          onClick={() => handleAddReply(post.id, c.id, replyInputs[replyKey])}
                                          disabled={submittingReplyMap[replyKey] || !(replyInputs[replyKey] || '').trim()}
                                          className="px-3.5 py-1.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white rounded-full text-xs font-semibold cursor-pointer shadow-2xs"
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

                        {/* Add Reply Input */}
                        <div className="flex items-center gap-2">
                          <MentionInput
                            as="input"
                            value={commentInputs[post.id] || ''}
                            onChange={(val) =>
                              setCommentInputs((prev) => ({ ...prev, [post.id]: val }))
                            }
                            onMentionSelect={(candidate: MentionCandidate) => {
                              setCommentMentionsMap((prev) => {
                                const current = prev[post.id] || [];
                                return current.some((m) => m.id === candidate.id)
                                  ? prev
                                  : {
                                      ...prev,
                                      [post.id]: [...current, { id: candidate.id, name: candidate.name }],
                                    };
                              });
                            }}
                            dropdownPosition="top"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleAddComment(post.id);
                              }
                            }}
                            placeholder="Write a comment or share details... (type @ to mention)"
                            className="w-full h-8 px-3 bg-white border border-gray-200 rounded-full text-xs text-gray-800 placeholder-gray-400 outline-none focus:border-orange-400"
                          />
                          <button
                            type="button"
                            onClick={() => handleAddComment(post.id)}
                            disabled={
                              submittingCommentMap[post.id] || !(commentInputs[post.id] || '').trim()
                            }
                            className="h-8 px-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-full text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <PaperAirplaneIcon className="w-3.5 h-3.5" />
                            <span>Comment</span>
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

        {/* Right Sidebar: Forum Channels, Quick Networking, Upcoming Events */}
        <div className="space-y-4">
          {/* Forum Channels Card */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                <UserGroupIcon className="w-4 h-4 text-orange-500" />
                <span>Forum Channels</span>
              </h2>
              <button
                type="button"
                onClick={() => setShowGroupModal(true)}
                className="text-[11px] font-semibold text-orange-600 hover:text-orange-700 inline-flex items-center gap-1 cursor-pointer"
              >
                <PlusIcon className="w-3.5 h-3.5" />
                <span>New Channel</span>
              </button>
            </div>

            <div className="space-y-1.5">
              <div
                onClick={() => loadPostsForGroup('all')}
                className={`p-2.5 rounded-xl cursor-pointer transition-colors flex items-center justify-between ${
                  selectedGroup === 'all'
                    ? 'bg-orange-50 border border-orange-200 text-orange-700'
                    : 'hover:bg-gray-50 border border-transparent text-gray-800'
                }`}
              >
                <div>
                  <h3 className="text-xs font-bold">All Forum Channels</h3>
                  <p className="text-[11px] text-gray-500">Browse all alumni discussions &amp; leads</p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white border border-gray-200 text-gray-600">
                  {posts.length}
                </span>
              </div>

              {groups.map((group) => (
                <div
                  key={group.id}
                  onClick={() => loadPostsForGroup(group.id)}
                  className={`p-2.5 rounded-xl cursor-pointer transition-colors border ${
                    selectedGroup === group.id
                      ? 'bg-orange-50 border-orange-200'
                      : 'hover:bg-gray-50 border-transparent'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="text-xs font-bold text-gray-900 truncate">{group.name}</h3>
                      {group.description && (
                        <p className="text-[11px] text-gray-500 line-clamp-2 mt-0.5">
                          {group.description}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => handleToggleJoinGroup(group.id, e)}
                      disabled={joiningGroupMap[group.id]}
                      className={`px-2 py-1 rounded-lg text-[10px] font-semibold shrink-0 transition-colors cursor-pointer ${
                        group.is_member
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-orange-50 text-orange-600 hover:bg-orange-500 hover:text-white border border-orange-200'
                      }`}
                    >
                      {group.is_member ? (
                        <span className="inline-flex items-center gap-0.5">
                          <CheckIcon className="w-3 h-3" /> Joined
                        </span>
                      ) : (
                        '+ Join'
                      )}
                    </button>
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 text-[10px] text-gray-400">
                    <span>{group.member_count || 0} members</span>
                    <span>·</span>
                    <span>{group.post_count || 0} posts</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Opportunity Links */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-2xs space-y-2.5">
            <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
              <BriefcaseIcon className="w-4 h-4 text-orange-500" />
              <span>Share &amp; Connect</span>
            </h2>
            <p className="text-xs text-gray-500 leading-relaxed">
              Looking to hire fellow CTU-Naga graduates or expand your professional network?
            </p>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => navigate('/jobs')}
                className="h-8 px-3 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <BriefcaseIcon className="w-3.5 h-3.5" />
                <span>Job Board</span>
              </button>
              <button
                type="button"
                onClick={() => navigate('/connections')}
                className="h-8 px-3 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <UserGroupIcon className="w-3.5 h-3.5" />
                <span>My Network</span>
              </button>
            </div>
          </div>

          {/* Upcoming Events */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-2xs space-y-3">
            <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
              <CalendarDaysIcon className="w-4 h-4 text-orange-500" />
              <span>Upcoming Events</span>
            </h2>
            {events.length === 0 ? (
              <p className="text-gray-400 text-xs text-center py-3">No upcoming events right now.</p>
            ) : (
              <div className="space-y-2">
                {events.slice(0, 4).map((event) => (
                  <div
                    key={event.id}
                    onClick={() => navigate('/events')}
                    className="p-2.5 bg-gray-50 hover:bg-orange-50/60 rounded-xl cursor-pointer transition-colors"
                  >
                    <p className="text-xs font-semibold text-gray-800">{event.name || event.title}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {event.date}
                      {event.location ? ` · ${event.location}` : ''}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Forum Post Modal */}
      {showPostModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-3 sm:p-4"
          onClick={() => setShowPostModal(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 text-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-white shrink-0">
                  <GlobeAltIcon className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-white leading-tight">
                    Share Opportunity or Start Discussion
                  </h2>
                  <p className="text-[11px] text-orange-100 mt-0.5">
                    Post to the CTU-Naga Alumni Forum
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPostModal(false)}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors cursor-pointer"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Forum Channel
                </label>
                <select
                  value={postForm.group_id}
                  onChange={(e) => setPostForm({ ...postForm, group_id: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-800 focus:ring-1 focus:ring-orange-500 focus:border-orange-500 outline-none bg-white"
                >
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1">
                  <TagIcon className="w-3.5 h-3.5 text-orange-500" />
                  <span>Topic Tags</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {FORUM_TAGS.map((tag) => {
                    const active = postForm.tags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleFormTag(tag)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer ${
                          active
                            ? 'bg-orange-500 text-white border-orange-500'
                            : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Discussion / Opportunity Title
                </label>
                <input
                  value={postForm.title}
                  onChange={(e) => setPostForm({ ...postForm, title: e.target.value })}
                  placeholder="e.g., Hiring Junior Web Developer at Cebu IT Park (Referral Available)"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all placeholder:text-gray-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Details &amp; How to Connect
                </label>
                <MentionInput
                  as="textarea"
                  value={postForm.content}
                  onChange={(val) => setPostForm({ ...postForm, content: val })}
                  onMentionSelect={(candidate: MentionCandidate) => {
                    setPostFormMentions((prev) =>
                      prev.some((m) => m.id === candidate.id)
                        ? prev
                        : [...prev, { id: candidate.id, name: candidate.name }]
                    );
                  }}
                  dropdownPosition="bottom"
                  rows={5}
                  placeholder="Share role details, qualifications, application links, or your question for fellow alumni... (type @ to mention)"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all placeholder:text-gray-400"
                />
              </div>
            </div>

            <div className="px-5 py-3.5 bg-gray-50/80 border-t border-gray-100 flex items-center justify-end gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setShowPostModal(false)}
                className="px-4 py-2 text-xs font-semibold bg-white border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreatePost}
                disabled={saving || !postForm.title.trim() || !postForm.content.trim()}
                className="px-4 py-2 text-xs font-semibold bg-orange-600 hover:bg-orange-700 text-white rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {saving ? 'Publishing...' : 'Publish Discussion'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create New Forum Channel Modal */}
      {showGroupModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-3 sm:p-4"
          onClick={() => setShowGroupModal(false)}
        >
          <form
            onSubmit={handleCreateGroup}
            className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 sm:py-4 bg-gradient-to-r from-orange-500 to-amber-600 text-white shrink-0">
              <div>
                <h2 className="text-sm font-bold">Create Forum Channel</h2>
                <p className="text-[11px] text-orange-100">
                  Start a dedicated topic channel for alumni
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowGroupModal(false)}
                className="p-1 text-white/80 hover:text-white rounded-lg"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-3.5 overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Channel Name
                </label>
                <input
                  required
                  value={groupForm.name}
                  onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                  placeholder="e.g., Cebu Tech & Startup Referrals"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Category</label>
                <select
                  value={groupForm.category}
                  onChange={(e) => setGroupForm({ ...groupForm, category: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-orange-500 bg-white"
                >
                  <option value="general">General &amp; Opportunities</option>
                  <option value="tech">Technology &amp; Engineering</option>
                  <option value="entrepreneurship">Entrepreneurship &amp; Startups</option>
                  <option value="business">Business &amp; Management</option>
                  <option value="education">Education &amp; Research</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={groupForm.description}
                  onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })}
                  placeholder="What opportunities or discussions belong in this channel?"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-orange-500"
                />
              </div>
            </div>

            <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowGroupModal(false)}
                className="px-3.5 py-1.5 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creatingGroup || !groupForm.name.trim()}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 disabled:opacity-50 rounded-xl cursor-pointer"
              >
                {creatingGroup ? 'Creating...' : 'Create Channel'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
