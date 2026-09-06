import { useState, useEffect } from 'react';
import { communityApi, eventsApi } from '@/services/api';
import { PlusIcon, ChatBubbleLeftRightIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { SkeletonCard } from '@/components/ui/Skeleton';

export default function CommunityPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);
  const [postForm, setPostForm] = useState({ title: '', content: '' });
  const [saving, setSaving] = useState(false);
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    loadGroups();
    eventsApi.list()
      .then((data) => setEvents(data || []))
      .catch(() => setEvents([]));
  }, []);

  const loadGroups = async () => {
    try {
      setLoading(true);
      const data = await communityApi.groups();
      setGroups(data);
    } catch {
      setError('Failed to load community groups');
    } finally {
      setLoading(false);
    }
  };

  const loadPosts = async (groupId: string) => {
    try {
      setPostsLoading(true);
      setSelectedGroup(groupId);
      const data = await communityApi.forums(groupId);
      setPosts(data);
    } catch {
      setError('Failed to load posts');
    } finally {
      setPostsLoading(false);
    }
  };

  const handleCreatePost = async () => {
    if (!selectedGroup || !postForm.title.trim()) return;
    try {
      setSaving(true);
      await communityApi.createPost({ ...postForm, group_id: selectedGroup });
      setShowPostModal(false);
      setPostForm({ title: '', content: '' });
      loadPosts(selectedGroup);
    } catch {
      setError('Failed to create post');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div><h1 className="section-title">Community Hub</h1><p className="text-gray-500 mt-1">Loading...</p></div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2"><SkeletonCard /></div>
          <div><SkeletonCard /></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div><h1 className="section-title">Community Hub</h1></div>
        <div className="card text-center py-12">
          <p className="text-red-600">{error}</p>
          <button onClick={() => window.location.reload()} className="btn-primary mt-4">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="section-title">Community Hub</h1>
        <p className="text-gray-500 mt-1">Connect, share, and grow with fellow CTU-Naga alumni</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-ctu-charcoal">
              {selectedGroup ? (groups.find((g) => g.id === selectedGroup)?.name || 'Discussions') : 'Recent Discussions'}
            </h2>
            <button
              onClick={() => selectedGroup ? setShowPostModal(true) : null}
              disabled={!selectedGroup}
              className="btn-primary text-sm flex items-center gap-2 disabled:opacity-50"
            >
              <PlusIcon className="w-4 h-4" /> New Post
            </button>
          </div>

          {postsLoading ? (
            <div className="space-y-4">
              <SkeletonCard /><SkeletonCard />
            </div>
          ) : posts.length === 0 ? (
            <div className="card text-center py-12">
              <p className="text-gray-400">
                {selectedGroup ? 'No posts yet. Be the first to post!' : 'Select a group from the sidebar to view discussions.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post: any) => (
                <div key={post.id} className="card">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-ctu-blue flex items-center justify-center text-white text-sm font-bold shrink-0">
                      {(post.author_name || post.author || '?').charAt(0)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <span className="font-medium text-ctu-charcoal">{post.author_name || post.author || 'Anonymous'}</span>
                        <span>·</span>
                        <span>{post.created_at ? new Date(post.created_at).toLocaleDateString() : 'Recently'}</span>
                      </div>
                      <h3 className="font-semibold text-ctu-charcoal mt-1">{post.title}</h3>
                      <p className="text-sm text-gray-500 mt-1">{post.content}</p>
                      <div className="flex items-center gap-4 mt-3 text-sm text-gray-400">
                        <span>♥ {post.likes_count || 0}</span>
                        <span>💬 {post.comments_count || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="card">
            <h2 className="text-lg font-semibold text-ctu-charcoal mb-4">Community Groups</h2>
            {groups.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">No groups yet</p>
            ) : (
              <div className="space-y-4">
                {groups.map((group) => (
                  <div
                    key={group.id}
                    onClick={() => loadPosts(group.id)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${selectedGroup === group.id ? 'bg-ctu-blue/10' : 'hover:bg-gray-50'}`}
                  >
                    <h3 className="font-medium text-ctu-charcoal">{group.name}</h3>
                    <p className="text-sm text-gray-400 mt-1">{group.description}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                      <span>{group.member_count || group.members || 0} members</span>
                      <span>{group.post_count || group.posts || 0} posts</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold text-ctu-charcoal mb-4">Upcoming Events</h2>
            {events.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">No upcoming events for now.</p>
            ) : (
              <div className="space-y-3">
                {events.map((event) => (
                  <div key={event.id} className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm font-medium text-ctu-charcoal">{event.name}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {event.date}{event.location ? ` · ${event.location}` : ''}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showPostModal && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4" onClick={() => setShowPostModal(false)}>
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 text-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-xs text-white shrink-0">
                  <ChatBubbleLeftRightIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white leading-tight">Create Community Post</h2>
                  <p className="text-xs text-orange-100 mt-0.5">Share updates, insights, or questions with alumni</p>
                </div>
              </div>
              <button
                onClick={() => setShowPostModal(false)}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors cursor-pointer"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Post Title</label>
                <input
                  value={postForm.title}
                  onChange={(e) => setPostForm({ ...postForm, title: e.target.value })}
                  placeholder="Give your post a concise title..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all placeholder:text-gray-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Content</label>
                <textarea
                  value={postForm.content}
                  onChange={(e) => setPostForm({ ...postForm, content: e.target.value })}
                  rows={5}
                  placeholder="Write your message, questions, or ideas here..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all placeholder:text-gray-400"
                />
              </div>
            </div>

            <div className="px-6 py-3.5 bg-gray-50/80 border-t border-gray-100 flex items-center justify-end gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setShowPostModal(false)}
                className="px-4 py-2 text-xs font-semibold bg-white border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors shadow-2xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreatePost}
                disabled={saving || !postForm.title.trim() || !postForm.content.trim()}
                className="px-4 py-2 text-xs font-semibold bg-orange-600 hover:bg-orange-700 text-white rounded-xl shadow-xs hover:shadow transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {saving ? 'Posting...' : 'Post Update'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
