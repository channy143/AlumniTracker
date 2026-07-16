import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { useAuthStore } from '@/store/authStore';
import { feedApi, careerTrendsApi, profileApi } from '@/services/api';
import { CalendarDaysIcon, MegaphoneIcon, UserGroupIcon, BuildingOfficeIcon, BriefcaseIcon, ChartBarIcon, CheckCircleIcon, ExclamationCircleIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { decodeUnicode } from '@/utils/helpers';



type PostType = 'text' | 'job' | 'announcement' | 'event' | 'discussion' | 'guide';

interface FeedPost {
  id: string;
  type: PostType;
  title: string;
  content: string;
  author: string;
  author_avatar: string;
  created_at: string;
  like_count: number;
  comment_count: number;
  liked?: boolean;
  tag?: string;
  tag_color?: string;
  image_url?: string;
  company?: string;
  job_url?: string;
}

type CategoryFilter = 'all' | 'announcement' | 'event';

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

        <button
          onClick={onViewDetails}
          className="mt-2 text-xs font-medium text-orange-600 hover:text-orange-700 transition-colors"
        >
          View Details &rarr;
        </button>
      </div>
    </div>
  );
}

function PostDetailView({ post, onBack }: { post: FeedPost; onBack: () => void }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      <div className="px-4 py-2 border-b border-gray-100">
        <button onClick={onBack} className="flex items-center gap-1 text-xs font-medium text-orange-600 hover:text-orange-700 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Back to feed
        </button>
      </div>

      <div className="px-4 py-3">
        <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 ${post.author === 'CTU-Naga Alumni Office' ? 'bg-blue-800' : post.author === 'Career Services' ? 'bg-orange-500' : 'bg-gray-500'}`}>
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

        <h3 className="text-base font-bold text-gray-900 mb-2">{post.title}</h3>

        <p className="text-sm text-gray-700 leading-relaxed mb-3 whitespace-pre-line">
          {decodeUnicode(post.content)}
        </p>

        {post.image_url && (
          <img src={post.image_url} alt="" className="w-full rounded-lg mb-3" />
        )}
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
          registeredThisYear: data.overview?.totalAlumni ? Math.round(data.overview.totalAlumni * 0.03) : 0,
        });
        setEmployers((data.topEmployers || []).slice(0, 5).map((e: any) => ({ name: e.name, count: e.alumniCount })));
        setHighlights({
          mostCommonCareer: data.overview?.topCareerPct != null && data.overview.topCareerPct < 40 ? 'Various' : (data.overview?.topCareer || 'N/A'),
          fastestGrowing: data.fastestGrowing?.[0]?.position || 'N/A',
          topIndustry: data.overview?.topIndustryPct != null && data.overview.topIndustryPct < 40 ? 'Various' : (data.overview?.topIndustry || 'N/A'),
          averageExperience: data.overview?.averageExperienceYears ? `${data.overview.averageExperienceYears} Years` : 'N/A',
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

  const filtered = feedPosts
    .filter((p) => p.type === 'announcement' || p.type === 'event')
    .filter((p) => categoryFilter === 'all' || p.type === categoryFilter)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-9 h-9 rounded-full bg-orange-500 flex items-center justify-center text-white text-sm font-bold">
          {user?.email ? user.email[0].toUpperCase() : '?'}
        </div>
        <div>
          <h1 className="text-base font-bold text-gray-900">
            {greeting}{user?.first_name ? `, ${user.first_name}!` : '!'}
          </h1>
          <p className="text-xs text-gray-500">Welcome to the CTU-Naga Alumni Network</p>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-3 bg-white border border-gray-200 rounded-lg px-3 py-2">
        <SparklesIcon className="w-4 h-4 text-orange-500 shrink-0" />
        <div className="flex items-center gap-1">
          {(['all', 'announcement', 'event'] as const).map((option) => (
            <button
              key={option}
              onClick={() => setCategoryFilter(option)}
              className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                categoryFilter === option
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {option === 'all' ? 'All Posts' : option === 'announcement' ? 'Announcements' : 'Events'}
            </button>
          ))}
        </div>
        <span className="text-gray-300 mx-1">|</span>
        <span className="text-xs text-gray-400 flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
          Latest
        </span>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 min-w-0 space-y-3">
          {selectedPost ? (
            <PostDetailView post={selectedPost} onBack={() => setSelectedPost(null)} />
          ) : loading ? (
            <div className="space-y-3">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-sm text-gray-500 bg-white border border-gray-200 rounded-lg">
              No {categoryFilter === 'all' ? 'posts' : categoryFilter + 's'} yet. Check back soon!
            </div>
          ) : (
            filtered.map((post) => (
              <InfoCard key={post.id} post={post} onViewDetails={() => setSelectedPost(post)} />
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
