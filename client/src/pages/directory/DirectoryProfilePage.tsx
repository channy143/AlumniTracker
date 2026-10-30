import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  BriefcaseIcon,
  AcademicCapIcon,
  MapPinIcon,
  LinkIcon,
  StarIcon,
  CheckBadgeIcon,
  TrophyIcon,
  ClockIcon,
  BuildingOfficeIcon,
  ChartBarIcon,
  UserGroupIcon,
  DocumentTextIcon,
  ChatBubbleLeftRightIcon,
  UserPlusIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { directoryApi, feedApi, connectionsApi } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { useChatStore } from '@/store/chatStore';
import FeedPostCard, { PostItem } from '@/components/dashboard/FeedPostCard';
import { addRecentlyViewed } from '@/utils/recentlyViewed';
import { formatExperienceFromDate } from '@/utils/formatExperience';
import { SkeletonCard, SkeletonRow, SkeletonText } from '@/components/ui/Skeleton';
import { formatProgramLongName } from '@/utils/formatProgram';

function normalizeStatus(s?: string): string {
  if (!s) return '';
  let result = s.charAt(0).toUpperCase() + s.slice(1);
  if (result.toLowerCase() === 'student') return 'Unemployed';
  return result;
}

function SectionTitle({ icon, title }: { icon: any; title: string }) {
  const Icon = icon;
  return (
    <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-1.5 mb-3">
      <Icon className="w-4 h-4 text-orange-500" />
      {title}
    </h2>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-xs font-medium text-gray-800 text-right max-w-[60%]">{value}</span>
    </div>
  );
}

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <StarIcon key={i} className={`w-4 h-4 ${i <= rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} />
      ))}
    </span>
  );
}

function TimelineArrow() {
  return (
    <div className="flex flex-col items-center py-0.5">
      <div className="w-2 h-2 rounded-full border-2 border-orange-400" />
      <div className="w-0.5 h-6 bg-orange-200" />
    </div>
  );
}

export default function DirectoryProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'posts'>('overview');
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [postsLoaded, setPostsLoaded] = useState(false);
  const [connectionLoading, setConnectionLoading] = useState(false);

  const handleConnect = async () => {
    if (!profile?.id || connectionLoading) return;
    setConnectionLoading(true);
    try {
      const created = await connectionsApi.request(profile.id);
      setProfile((prev: any) =>
        prev
          ? {
              ...prev,
              connection_status: 'pending',
              connection_id: created?.id || prev.id,
              connection_is_requester: true,
            }
          : prev
      );
    } catch (err: any) {
      alert(err.message || 'Connection request failed or already exists.');
    } finally {
      setConnectionLoading(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!profile?.id || connectionLoading) return;
    const targetId = profile.connection_id || profile.id;
    setConnectionLoading(true);
    try {
      await connectionsApi.remove(targetId);
      setProfile((prev: any) =>
        prev
          ? {
              ...prev,
              connection_status: null,
              connection_id: null,
              connection_is_requester: false,
            }
          : prev
      );
    } catch (err: any) {
      alert(err.message || 'Failed to cancel connection request.');
    } finally {
      setConnectionLoading(false);
    }
  };

  const handleRespondRequest = async (status: 'accepted' | 'declined') => {
    if (!profile?.connection_id || connectionLoading) return;
    setConnectionLoading(true);
    try {
      await connectionsApi.respond(profile.connection_id, status);
      setProfile((prev: any) =>
        prev
          ? {
              ...prev,
              connection_status: status === 'accepted' ? 'accepted' : null,
              connection_id: status === 'accepted' ? prev.connection_id : null,
            }
          : prev
      );
    } catch (err: any) {
      alert(err.message || 'Failed to respond to connection request.');
    } finally {
      setConnectionLoading(false);
    }
  };

  const handleMessage = () => {
    if (!profile?.id) return;
    useChatStore.getState().openChat({
      profileId: profile.id,
      name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Alumnus',
      avatar: profile.avatar_url,
      headline: profile.headline,
    });
  };

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setProfile(null);
    setPosts([]);
    setPostsLoaded(false);
    directoryApi.get(id)
      .then((data: any) => {
        setProfile(data);
        if (data && !data.is_admin) addRecentlyViewed({ id: data.id, first_name: data.first_name, last_name: data.last_name, avatar_url: data.avatar_url });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    const targetUserId = profile?.user_id || profile?.id;
    if (targetUserId) {
      setLoadingPosts(true);
      feedApi.userPosts(targetUserId)
        .then((res: any) => {
          const list = Array.isArray(res) ? res : (res as any)?.posts || [];
          // Filter strictly so only posts authored by this specific alumnus are displayed
          const authorFiltered = list.filter((p: any) => {
            if (profile?.user_id && p.user_id === profile.user_id) return true;
            if (profile?.id && p.user_id === profile.id) return true;
            return false;
          });
          setPosts(authorFiltered);
          setPostsLoaded(true);
        })
        .catch((err) => {
          console.error('Failed to load user posts:', err);
          setPosts([]);
        })
        .finally(() => setLoadingPosts(false));
    } else {
      setPosts([]);
    }
  }, [profile?.user_id, profile?.id]);

  const handlePostDeleted = (postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  const handlePostUpdated = (updatedPost: PostItem) => {
    setPosts((prev) => prev.map((p) => (p.id === updatedPost.id ? updatedPost : p)));
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="h-4 w-28 bg-gray-200 animate-pulse rounded" />
        <div className="bg-white border border-gray-200 rounded-xl p-5 sm:p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gray-200 animate-pulse shrink-0" />
            <div className="space-y-2 flex-1">
              <div className="h-5 w-52 bg-gray-200 animate-pulse rounded" />
              <div className="h-3.5 w-36 bg-gray-200 animate-pulse rounded" />
              <div className="h-3 w-28 bg-gray-200 animate-pulse rounded" />
            </div>
          </div>
        </div>
        <div className="flex flex-col lg:flex-row gap-5 items-start">
          <div className="flex-1 space-y-4 w-full">
            <SkeletonCard className="h-64" />
            <SkeletonCard className="h-56" />
          </div>
          <div className="w-full lg:w-80 xl:w-96 space-y-4 shrink-0">
            <SkeletonCard className="h-56" />
            <SkeletonCard className="h-36" />
            <SkeletonCard className="h-36" />
          </div>
        </div>
      </div>
    );
  }
  if (!profile) return <div className="text-center py-12 text-sm text-gray-500">Profile not found.</div>;

  const current = profile.employment?.find((e: any) => e.is_current);
  const prevEmployments = profile.employment?.filter((e: any) => !e.is_current) || [];
  const timeline = current ? [...prevEmployments, current] : profile.employment || [];

  // Skills grouped by category
  const skillGroups: Record<string, any[]> = {};
  (profile.skills || []).forEach((s: any) => {
    const cat = s.category || 'Other';
    if (!skillGroups[cat]) skillGroups[cat] = [];
    skillGroups[cat].push(s);
  });

  const hasFeedback = profile.career_feedback;

  function calcYears(startDate: string): string {
    return formatExperienceFromDate(startDate);
  }

  const portfolioLinks = [
    { label: 'LinkedIn', url: profile.linkedin_url, icon: LinkIcon },
    { label: 'GitHub', url: profile.github_url, icon: LinkIcon },
    { label: 'Portfolio', url: profile.portfolio_url, icon: LinkIcon },
    { label: 'Behance', url: profile.behance_url, icon: LinkIcon },
    { label: 'Google Scholar', url: profile.google_scholar_url, icon: LinkIcon },
    { label: 'Personal Website', url: profile.personal_website_url, icon: LinkIcon },
  ].filter((l) => l.url);

  return (
    <div className="max-w-6xl mx-auto space-y-4 pb-8">
      <button onClick={() => navigate('/directory')} className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-600 hover:text-orange-700 transition-colors py-1 cursor-pointer">
        <ArrowLeftIcon className="w-4 h-4" />
        Back to Directory
      </button>

      {/* Section 1: Profile Header (Full Width Hero Card) */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5 flex-1 min-w-0">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-2xl font-bold text-white shrink-0 overflow-hidden shadow-xs border-2 border-white ring-2 ring-orange-100">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                ((profile.first_name?.[0] || '') + (profile.last_name?.[0] || '')).toUpperCase()
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-gray-900 leading-snug">
                {profile.first_name} {profile.middle_name ? profile.middle_name + ' ' : ''}{profile.last_name}
              </h1>
              {profile.headline && <p className="text-sm font-medium text-gray-600 mt-0.5">{profile.headline}</p>}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-gray-500">
                {current && (
                  <span className="flex items-center gap-1.5 text-gray-700 font-medium">
                    <BriefcaseIcon className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                    <span>{current.position} at <strong className="font-semibold text-gray-900">{current.company_name}</strong></span>
                  </span>
                )}
                {(profile.city || profile.province) && (
                  <span className="flex items-center gap-1 text-gray-500">
                    <MapPinIcon className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span>{[profile.city, profile.province].filter(Boolean).join(', ')}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-2 sm:mt-0">
            {profile.resume_url && (
              <a
                href={profile.resume_url.startsWith('http') ? profile.resume_url : `/api/directory/${profile.id}/resume`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 border border-orange-200 text-orange-700 hover:bg-orange-100 rounded-lg text-xs font-semibold transition-colors shadow-xs"
              >
                <DocumentTextIcon className="w-4 h-4 text-orange-600" />
                View Resume / CV
              </a>
            )}
            {currentUser?.id !== profile.user_id && (
              <>
                {profile.connection_status === 'accepted' ? (
                  <>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-xs font-semibold shadow-xs">
                      <CheckIcon className="w-4 h-4 text-emerald-600" />
                      Connected
                    </span>
                    <button
                      type="button"
                      onClick={handleMessage}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-semibold transition-colors shadow-xs cursor-pointer"
                    >
                      <ChatBubbleLeftRightIcon className="w-4 h-4 text-blue-600" />
                      Message
                    </button>
                  </>
                ) : profile.connection_status === 'pending' ? (
                  profile.connection_is_requester === false ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleRespondRequest('accepted')}
                        disabled={connectionLoading}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                      >
                        <CheckIcon className="w-4 h-4" />
                        Confirm Request
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRespondRequest('declined')}
                        disabled={connectionLoading}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
                      >
                        Decline
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg text-xs font-semibold">
                        <ClockIcon className="w-4 h-4" />
                        Requested
                      </span>
                      <button
                        type="button"
                        onClick={handleCancelRequest}
                        disabled={connectionLoading}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-red-50 border border-red-200 text-red-600 rounded-lg text-xs font-semibold transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                      >
                        <XMarkIcon className="w-4 h-4" />
                        {connectionLoading ? 'Canceling...' : 'Cancel Request'}
                      </button>
                    </>
                  )
                ) : (
                  <button
                    type="button"
                    onClick={handleConnect}
                    disabled={connectionLoading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    <UserPlusIcon className="w-4 h-4" />
                    {connectionLoading ? 'Connecting...' : 'Add Connection'}
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {profile.bio && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-sm text-gray-600 leading-relaxed">{profile.bio}</p>
          </div>
        )}
      </div>

      {/* Main 2-Column Split: Left (Timeline + Employment History OR Alumni Posts) & Right Nav (Summary, Education, Certifications, Achievements, Links, Skills) */}
      <div className="flex flex-col lg:flex-row gap-4 lg:items-stretch">
        {/* Left Primary Column */}
        <div className="flex-1 min-w-0 w-full flex flex-col gap-4">
          {/* Segmented View Selector */}
          <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'bg-white text-gray-600 hover:text-gray-900 border border-gray-200'
              }`}
            >
              <BriefcaseIcon className="w-4 h-4" />
              Career & Experience
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('posts')}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'posts'
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'bg-white text-gray-600 hover:text-gray-900 border border-gray-200'
              }`}
            >
              <ChatBubbleLeftRightIcon className="w-4 h-4" />
              Alumni Posts
              {posts.length > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  activeTab === 'posts' ? 'bg-orange-600 text-white' : 'bg-orange-100 text-orange-700'
                }`}>
                  {posts.length}
                </span>
              )}
            </button>
          </div>

          {activeTab === 'posts' ? (
            <div className="space-y-4">
              {loadingPosts ? (
                <div className="space-y-3">
                  <SkeletonCard className="h-44" />
                  <SkeletonCard className="h-44" />
                </div>
              ) : posts.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-xl p-8 text-center shadow-xs">
                  <ChatBubbleLeftRightIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <h3 className="text-sm font-semibold text-gray-800">No alumni posts yet</h3>
                  <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                    This alumnus hasn't shared any posts or updates yet.
                  </p>
                </div>
              ) : (
                posts.map((post) => (
                  <FeedPostCard
                    key={post.id}
                    post={post}
                    currentUserId={currentUser?.id}
                    currentUserRole={currentUser?.role}
                    onPostDeleted={handlePostDeleted}
                    onPostUpdated={handlePostUpdated}
                  />
                ))
              )}
            </div>
          ) : (
            <>
              {/* Career Timeline */}
          {timeline.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs shrink-0">
              <SectionTitle icon={ClockIcon} title="Career Timeline" />
              <div className="space-y-0 mt-3">
                {timeline.map((emp: any, i: number) => (
                  <div key={emp.id || i}>
                    {i > 0 && <TimelineArrow />}
                    <div className={`flex items-start gap-3.5 p-2.5 rounded-xl transition-colors ${emp.is_current ? 'bg-orange-50/70 border border-orange-100' : 'hover:bg-gray-50'}`}>
                      <div className="w-12 h-12 rounded-lg bg-orange-100/70 flex flex-col items-center justify-center shrink-0 border border-orange-200/50">
                        <span className="text-xs font-bold text-orange-700 leading-none">{emp.start_date ? new Date(emp.start_date).getFullYear() : '—'}</span>
                        {emp.is_current && <span className="text-[8px] font-semibold text-orange-600 uppercase tracking-wider mt-0.5">Current</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-bold text-gray-900 leading-snug">{emp.position}</p>
                          {emp.is_current && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                              Current Role
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 font-medium mt-0.5">
                          {emp.company_name}{emp.company_industry ? ` · ${emp.company_industry}` : ''}
                        </p>
                        {emp.start_date && (
                          <p className="text-[11px] text-gray-400 mt-1">
                            {new Date(emp.start_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                            {emp.end_date ? ` — ${new Date(emp.end_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}` : ' — Present'}
                          </p>
                        )}
                        {emp.description && <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">{emp.description}</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Employment History - stretches to align with Skills card */}
          {profile.employment?.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs lg:flex-1 flex flex-col">
              <SectionTitle icon={BuildingOfficeIcon} title="Employment History" />
              <div className="overflow-x-auto mt-2 flex-1">
                {(() => {
                  const showSalaryColumn = profile.employment.some((e: any) => Boolean(e.salary_range));
                  return (
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-100 text-gray-400 uppercase tracking-wider text-[10px]">
                          <th className="text-left py-2.5 pr-3 font-semibold">Industry</th>
                          <th className="text-left py-2.5 pr-3 font-semibold">Company</th>
                          <th className="text-left py-2.5 pr-3 font-semibold">Position</th>
                          <th className="text-left py-2.5 pr-3 font-semibold">Type</th>
                          {showSalaryColumn && <th className="text-left py-2.5 pr-3 font-semibold">Salary</th>}
                          <th className="text-left py-2.5 pr-3 font-semibold">Started</th>
                          <th className="text-left py-2.5 font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {profile.employment.map((emp: any, i: number) => (
                          <tr key={i} className="hover:bg-gray-50/70 transition-colors">
                            <td className="py-2.5 pr-3 text-gray-600">{emp.company_industry || '—'}</td>
                            <td className="py-2.5 pr-3 font-semibold text-gray-800">{emp.company_name}</td>
                            <td className="py-2.5 pr-3 font-medium text-gray-700">{emp.position}</td>
                            <td className="py-2.5 pr-3 text-gray-600">
                              <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-[10px] font-medium uppercase">
                                {emp.job_type || '—'}
                              </span>
                            </td>
                            {showSalaryColumn && (
                              <td className="py-2.5 pr-3 text-gray-500 font-medium">
                                {emp.salary_range ? `₱${emp.salary_range}` : '—'}
                              </td>
                            )}
                            <td className="py-2.5 pr-3 text-gray-500">{emp.start_date ? new Date(emp.start_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—'}</td>
                            <td className="py-2.5">
                              {emp.is_current ? (
                                <span className="text-orange-600 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full text-[10px] font-semibold">Current</span>
                              ) : (
                                <span className="text-gray-400 text-[10px]">Past</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  );
                })()}
              </div>
            </div>
          )}
            </>
          )}
        </div>

        {/* Right Nav / Sidebar Column */}
        <div className="w-full lg:w-80 xl:w-96 shrink-0 flex flex-col gap-4">
          {/* Career Summary */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs shrink-0">
            <SectionTitle icon={ChartBarIcon} title="Career Summary" />
            <div className="space-y-0.5 mt-2">
              <InfoRow label="Employment Status" value={normalizeStatus(profile.employment_status) || normalizeStatus(current?.employment_status) || ''} />
              <InfoRow label="Industry" value={profile.industry || current?.company_industry || ''} />
              <InfoRow label="Current Position" value={current?.position || ''} />
              <InfoRow label="Company" value={current?.company_name || ''} />
              <InfoRow label="Employment Type" value={current?.job_type || ''} />
              <InfoRow label="Location" value={[profile.city, profile.province].filter(Boolean).join(', ')} />
              <InfoRow label="Time in Current Job" value={current?.start_date ? calcYears(current.start_date) : ''} />
            </div>
          </div>

          {/* Education */}
          {profile.education?.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs shrink-0">
              <SectionTitle icon={AcademicCapIcon} title="Education" />
              <div className="space-y-3 mt-2">
                {profile.education.map((edu: any, i: number) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                      <AcademicCapIcon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-gray-900 leading-snug">{formatProgramLongName(edu.program) || edu.program || edu.major}</p>
                      <p className="text-[11px] text-gray-500 truncate">CTU-Naga{edu.campus ? ` - ${edu.campus}` : ''}</p>
                      <div className="flex items-center gap-1.5 text-[10px] text-gray-400 mt-1">
                        {edu.year_graduated && <span className="bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded font-medium">Class of {edu.year_graduated}</span>}
                        {edu.honors && <span className="text-amber-600 font-semibold">• {edu.honors}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Portfolio & Professional Links */}
          {portfolioLinks.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs shrink-0">
              <SectionTitle icon={LinkIcon} title="Portfolio & Professional Links" />
              <div className="flex flex-wrap gap-2 mt-2">
                {portfolioLinks.map((link, i) => (
                  <a
                    key={i}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-700 hover:bg-orange-50 hover:border-orange-200 hover:text-orange-700 transition-colors"
                  >
                    <link.icon className="w-3.5 h-3.5" />
                    {link.label}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Professional Certifications */}
          {profile.certifications?.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs shrink-0">
              <SectionTitle icon={CheckBadgeIcon} title="Professional Certifications" />
              <div className="space-y-2.5 mt-2">
                {profile.certifications.map((cert: any, i: number) => (
                  <div key={i} className="border border-gray-100 rounded-lg p-2.5 bg-gray-50/50">
                    <p className="text-xs font-semibold text-gray-800">{cert.name}</p>
                    <p className="text-[10px] text-gray-500">{cert.issuer}</p>
                    {cert.issue_date && <p className="text-[10px] text-gray-400 mt-0.5">{new Date(cert.issue_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })}</p>}
                    {cert.credential_url && (
                      <a href={cert.credential_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-orange-600 hover:underline mt-1 inline-block font-medium">View Credential &rarr;</a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Professional Achievements */}
          {profile.achievements?.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs shrink-0">
              <SectionTitle icon={TrophyIcon} title="Professional Achievements" />
              <div className="space-y-2 mt-2">
                {profile.achievements.map((a: any, i: number) => (
                  <div key={i} className="flex items-start gap-2 border-b border-gray-50 pb-2 last:border-0 last:pb-0">
                    <div className="w-5 h-5 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 mt-0.5 text-[9px] font-bold">
                      ★
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-800">{a.title}</p>
                      {a.description && <p className="text-[10px] text-gray-500 mt-0.5">{a.description}</p>}
                      {a.date_achieved && <p className="text-[10px] text-gray-400 mt-0.5">{new Date(a.date_achieved).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Skills - stretches to align with Employment History card */}
          {Object.keys(skillGroups).length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs lg:flex-1 flex flex-col">
              <SectionTitle icon={ChartBarIcon} title="Skills" />
              <div className="space-y-3 mt-2 flex-1">
                {Object.entries(skillGroups).map(([category, skills]) => (
                  <div key={category}>
                    <h3 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">{category}</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {skills.map((s: any, i: number) => (
                        <span key={i} className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 text-[11px] font-medium rounded-full">
                          ✓ {s.name}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tracer Survey Feedback & Curriculum Insights (below main profile split) */}
      {hasFeedback && (
        <div className={`grid gap-4 ${hasFeedback.skills_used_at_work?.length > 0 || hasFeedback.suggested_subjects?.length > 0 ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
          {/* Career Feedback */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
            <SectionTitle icon={UserGroupIcon} title="Career Feedback" />
            <div className="space-y-3 mt-2">
              <div className="flex items-center gap-4 text-sm">
                <span className="text-xs text-gray-500">Degree Relevance:</span>
                <span className="flex items-center gap-1 text-xs font-medium text-gray-800">
                  <StarRating rating={hasFeedback.degree_relevance || 0} />
                  {hasFeedback.degree_relevance}/5
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-xs text-gray-500">Curriculum Preparedness:</span>
                <span className="flex items-center gap-1 text-xs font-medium text-gray-800">
                  <StarRating rating={hasFeedback.curriculum_preparation || 0} />
                  {hasFeedback.curriculum_preparation}/5
                </span>
              </div>
              {hasFeedback.recommend_changes !== null && hasFeedback.recommend_changes !== undefined && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-gray-500">Recommend Curriculum Changes:</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${hasFeedback.recommend_changes ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                    {hasFeedback.recommend_changes ? 'Yes' : 'No'}
                  </span>
                </div>
              )}
              {hasFeedback.suggested_skills?.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 mb-1.5">Suggested Skills:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {hasFeedback.suggested_skills.map((s: string, i: number) => (
                      <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-medium rounded-full">• {s}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Curriculum Insights */}
          {(hasFeedback.skills_used_at_work?.length > 0 || hasFeedback.suggested_subjects?.length > 0) && (
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
              <SectionTitle icon={AcademicCapIcon} title="Curriculum Insights" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                {hasFeedback.skills_used_at_work?.length > 0 && (
                  <div>
                    <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Skills used at work</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {hasFeedback.skills_used_at_work.map((s: string, i: number) => (
                        <span key={i} className="px-2 py-0.5 bg-orange-50 text-orange-700 text-[10px] font-medium rounded-full">{s}</span>
                      ))}
                    </div>
                  </div>
                )}
                {hasFeedback.suggested_subjects?.length > 0 && (
                  <div>
                    <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Suggested subjects</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {hasFeedback.suggested_subjects.map((s: string, i: number) => (
                        <span key={i} className="px-2 py-0.5 bg-purple-50 text-purple-700 text-[10px] font-medium rounded-full">{s}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
