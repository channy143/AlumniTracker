import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { profileApi, feedApi, analyticsApi, activitiesApi, eventsApi } from '@/services/api';
import {
  ChatBubbleLeftRightIcon,
  ShareIcon,
  BookmarkIcon,
  CalendarDaysIcon,
  FireIcon,
  SparklesIcon,
  BriefcaseIcon,
  UserGroupIcon,
  PaperAirplaneIcon,
  HeartIcon,
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';
import { AcademicCapIcon } from '@heroicons/react/24/solid';

const filters = ['Best', 'Hot', 'New', 'Top', 'Rising'];

const fallbackPosts: FeedPost[] = [
  {
    id: 'fb-1',
    type: 'announcement',
    title: 'Welcome to the CTU-Naga Alumni Network!',
    content: 'We are excited to launch this new platform for all CTU-Naga alumni to connect, collaborate, and stay updated. This community is built for you — share your achievements, post job opportunities, and reconnect with old classmates. Make sure to complete your profile to get the most out of your experience!',
    author: 'CTU-Naga Alumni Office',
    author_avatar: '',
    created_at: new Date().toISOString(),
    like_count: 24,
    comment_count: 3,
    liked: false,
    image_url: '/image/ChatGPT Image May 27, 2026, 04_38_30 AM.png',
    tag: 'Announcement',
    tag_color: 'bg-blue-100 text-blue-700',
  },
  {
    id: 'fb-2',
    type: 'guide',
    title: 'Career Development Resources Now Available',
    content: 'The Career Hub now offers resume templates, interview preparation guides, and job search strategies. Visit the Career Development section to access these resources and schedule a mock interview session with our career counselors. Members who have used our services report a 40% higher interview callback rate.',
    author: 'Career Services',
    author_avatar: '',
    created_at: new Date(Date.now() - 3600000).toISOString(),
    like_count: 18,
    comment_count: 2,
    liked: false,
    image_url: '',
    tag: 'Guide',
    tag_color: 'bg-purple-100 text-purple-700',
  },
  {
    id: 'fb-3',
    type: 'discussion',
    title: 'What skills are most in demand for IT graduates in 2026?',
    content: 'With the rapid changes in tech, I wanted to start a discussion on what skills we think are most valuable for new graduates entering the job market. From my experience in software development, cloud computing and AI/ML skills are becoming essential. What are your thoughts?',
    author: 'Miguel Santos',
    author_avatar: '',
    created_at: new Date(Date.now() - 7200000).toISOString(),
    like_count: 31,
    comment_count: 7,
    liked: false,
    image_url: '',
    tag: 'Discussion',
    tag_color: 'bg-green-100 text-green-700',
  },
  {
    id: 'fb-4',
    type: 'event',
    title: 'Annual Alumni Homecoming 2026',
    content: 'Save the date! The CTU-Naga Annual Alumni Homecoming will be held on August 15, 2026 at the university main campus. This year\'s theme is "Building Bridges: Connecting Generations." Activities include a networking fair, faculty meet-and-greet, sportsfest, and the Grand Alumni Night. Register early to secure your slot!',
    author: 'Alumni Relations',
    author_avatar: '',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    like_count: 45,
    comment_count: 12,
    liked: false,
    image_url: '',
    tag: 'Event',
    tag_color: 'bg-amber-100 text-amber-700',
  },
  {
    id: 'fb-5',
    type: 'job',
    title: 'Hiring: Junior Software Developer at TechStart Philippines',
    content: 'TechStart Ph is looking for a Junior Software Developer with knowledge of React, Node.js, and PostgreSQL. Fresh graduates are encouraged to apply. We offer competitive salary, hybrid work setup, and professional development opportunities. Location: Cebu City. Send your resume to careers@techstart.ph',
    author: 'Maria Reyes',
    author_avatar: '',
    created_at: new Date(Date.now() - 172800000).toISOString(),
    like_count: 15,
    comment_count: 4,
    liked: false,
    image_url: '',
    tag: 'Job Posting',
    tag_color: 'bg-red-100 text-red-700',
  },
  {
    id: 'fb-6',
    type: 'text',
    title: 'Finally passed the board exam!',
    content: 'After months of preparation and review, I\'m happy to share that I passed the Civil Engineering Licensure Examination! Thank you to all the professors at CTU-Naga who prepared us well. For those currently reviewing, keep pushing — it will all be worth it in the end. If anyone needs review tips, feel free to message me!',
    author: 'Josefa Dimatulac',
    author_avatar: '',
    created_at: new Date(Date.now() - 259200000).toISOString(),
    like_count: 62,
    comment_count: 8,
    liked: false,
    image_url: '',
    tag: 'Achievement',
    tag_color: 'bg-yellow-100 text-yellow-700',
  },
  {
    id: 'fb-7',
    type: 'job',
    title: 'Remote Graphic Designer Position Open',
    content: 'Our creative agency is expanding and we need a talented graphic designer. Must be proficient in Adobe Creative Suite, Figma, and have a strong portfolio. Work-from-home arrangement with monthly team meetups in Naga City. Competitive compensation package. Apply at creativehub.ph/careers',
    author: 'Carlos Mendez',
    author_avatar: '',
    created_at: new Date(Date.now() - 345600000).toISOString(),
    like_count: 9,
    comment_count: 1,
    liked: false,
    image_url: '',
    tag: 'Job Posting',
    tag_color: 'bg-red-100 text-red-700',
  },
  {
    id: 'fb-8',
    type: 'announcement',
    title: 'Scholarship Opportunities for Graduate Studies',
    content: 'The Alumni Association is proud to announce five (5) scholarship grants for alumni pursuing graduate studies. Each grant covers 50% of tuition fees for the entire program. Fields include Education, Engineering, Business Administration, and Information Technology. Deadline for applications is March 30, 2026. See the Alumni Office for details.',
    author: 'Scholarship Committee',
    author_avatar: '',
    created_at: new Date(Date.now() - 432000000).toISOString(),
    like_count: 37,
    comment_count: 15,
    liked: false,
    image_url: '',
    tag: 'Announcement',
    tag_color: 'bg-blue-100 text-blue-700',
  },
];

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

interface Comment {
  id: string;
  author: string;
  author_avatar: string;
  content: string;
  like_count: number;
  created_at: string;
}

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

function PostCard({ post, onViewDetails }: { post: FeedPost; onViewDetails: () => void }) {
  const navigate = useNavigate();

  const typeIcon = () => {
    switch (post.type) {
      case 'job': return <BriefcaseIcon className="w-3.5 h-3.5 inline mr-1" />;
      case 'announcement': return <SparklesIcon className="w-3.5 h-3.5 inline mr-1" />;
      case 'event': return <CalendarDaysIcon className="w-3.5 h-3.5 inline mr-1" />;
      case 'guide': return <AcademicCapIcon className="w-3.5 h-3.5 inline mr-1" />;
      case 'discussion': return <ChatBubbleLeftRightIcon className="w-3.5 h-3.5 inline mr-1" />;
      default: return null;
    }
  };

  const handleTitleClick = () => {
    if (post.job_url) {
      navigate(post.job_url);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      <div className="py-2 px-3 min-w-0">
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
                {typeIcon()}{post.tag}
              </span>
            </>
          )}
        </div>

        <h3
          className={`text-sm font-semibold text-gray-900 mb-1 ${post.job_url ? 'cursor-pointer hover:text-orange-600' : ''}`}
          onClick={handleTitleClick}
        >
          {post.title}
        </h3>

        <p className="text-xs text-gray-600 leading-relaxed mb-1 line-clamp-3">
          {post.content}
        </p>

        {post.image_url && (
          <img src={post.image_url} alt="" className="w-full rounded-lg mb-2" />
        )}

        {post.company && (
          <p className="text-xs text-gray-500 mb-1">
            <BriefcaseIcon className="w-3.5 h-3.5 inline mr-0.5 text-gray-400" />
            {post.company}
          </p>
        )}

        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
          <button onClick={onViewDetails} className="flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100 transition-colors">
            <ChatBubbleLeftRightIcon className="w-4 h-4" />
            <span>{post.comment_count} Comments</span>
          </button>
          <button className="flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100 transition-colors">
            <ShareIcon className="w-4 h-4" />
            <span>Share</span>
          </button>
          <button className="flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100 transition-colors">
            <BookmarkIcon className="w-4 h-4" />
            <span>Save</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function PostDetailView({ post, onBack, onCommentAdded, onLikeToggled }: { post: FeedPost; onBack: () => void; onCommentAdded?: () => void; onLikeToggled?: () => void }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [liked, setLiked] = useState(post.liked || false);
  const [likeCount, setLikeCount] = useState(post.like_count);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    feedApi.get(post.id).then((data) => {
      setComments(data.comments || []);
      setLiked(data.liked || false);
      setLikeCount(data.like_count);
    }).catch(() => {
      const fallbackCommentsByPost: Record<string, Comment[]> = {
        'fb-1': [
          { id: 'fc-1', author: 'Anna Marie Cruz', author_avatar: '', content: 'So excited about this new platform! Great initiative from the alumni office.', like_count: 5, created_at: new Date(Date.now() - 86400000).toISOString() },
          { id: 'fc-2', author: 'Pedro Reyes', author_avatar: '', content: 'Finally a way to connect with fellow CTU-Naga graduates!', like_count: 3, created_at: new Date(Date.now() - 43200000).toISOString() },
          { id: 'fc-3', author: 'Luzviminda Santos', author_avatar: '', content: 'I\'ve been waiting for something like this. Looking forward to networking!', like_count: 7, created_at: new Date(Date.now() - 3600000).toISOString() },
        ],
        'fb-2': [
          { id: 'fc-4', author: 'Carlos Mendez', author_avatar: '', content: 'The resume templates are really helpful. I just updated mine!', like_count: 4, created_at: new Date(Date.now() - 7200000).toISOString() },
          { id: 'fc-5', author: 'Josefa Dimatulac', author_avatar: '', content: 'Can we also get cover letter templates? That would be great.', like_count: 6, created_at: new Date(Date.now() - 1800000).toISOString() },
        ],
        'fb-3': [
          { id: 'fc-6', author: 'Kevin Ramos', author_avatar: '', content: 'Cloud computing is definitely the way to go. AWS certifications are incredibly valuable right now.', like_count: 12, created_at: new Date(Date.now() - 14400000).toISOString() },
          { id: 'fc-7', author: 'Sarah Lim', author_avatar: '', content: 'Don\'t forget about soft skills! Communication and teamwork are just as important.', like_count: 9, created_at: new Date(Date.now() - 10800000).toISOString() },
          { id: 'fc-8', author: 'Miguel Santos', author_avatar: '', content: 'Great points everyone! I think data literacy is another underrated skill.', like_count: 8, created_at: new Date(Date.now() - 7200000).toISOString() },
          { id: 'fc-9', author: 'Anna Marie Cruz', author_avatar: '', content: 'Cybersecurity is also booming. Lots of opportunities for new grads.', like_count: 6, created_at: new Date(Date.now() - 3600000).toISOString() },
          { id: 'fc-28', author: 'David Tan', author_avatar: '', content: 'What about AI/ML? That seems to be the hottest field right now.', like_count: 11, created_at: new Date(Date.now() - 1800000).toISOString() },
          { id: 'fc-29', author: 'Luzviminda Santos', author_avatar: '', content: 'I think full-stack development is still a safe bet for job security.', like_count: 4, created_at: new Date(Date.now() - 600000).toISOString() },
          { id: 'fc-31', author: 'Mike Chua', author_avatar: '', content: 'DevOps and CI/CD pipelines are increasingly in demand too.', like_count: 5, created_at: new Date(Date.now() - 300000).toISOString() },
        ],
        'fb-4': [
          { id: 'fc-10', author: 'Luzviminda Santos', author_avatar: '', content: 'Can\'t wait for the homecoming! Already marked my calendar.', like_count: 15, created_at: new Date(Date.now() - 172800000).toISOString() },
          { id: 'fc-11', author: 'Kevin Ramos', author_avatar: '', content: 'Will there be a virtual option for those who can\'t attend in person?', like_count: 8, created_at: new Date(Date.now() - 86400000).toISOString() },
          { id: 'fc-12', author: 'Alumni Relations', author_avatar: '', content: 'Yes! We will have a hybrid setup for those who prefer to join online.', like_count: 20, created_at: new Date(Date.now() - 43200000).toISOString() },
          { id: 'fc-13', author: 'Maria Reyes', author_avatar: '', content: 'The Grand Alumni Night is always the best part!', like_count: 12, created_at: new Date(Date.now() - 21600000).toISOString() },
          { id: 'fc-14', author: 'Pedro Reyes', author_avatar: '', content: 'I\'ll be bringing my family this year. Excited to show them the campus!', like_count: 9, created_at: new Date(Date.now() - 7200000).toISOString() },
          { id: 'fc-15', author: 'Josefa Dimatulac', author_avatar: '', content: 'Will there be booths for each department? Would love to visit the engineering booth.', like_count: 7, created_at: new Date(Date.now() - 3600000).toISOString() },
          { id: 'fc-16', author: 'Alumni Relations', author_avatar: '', content: 'Yes, each college will have their own booth. See you there!', like_count: 11, created_at: new Date(Date.now() - 1800000).toISOString() },
          { id: 'fc-17', author: 'Sarah Lim', author_avatar: '', content: 'I\'m organizing the alumni from Batch 2019. We already have 20 confirmed!', like_count: 14, created_at: new Date(Date.now() - 600000).toISOString() },
        ],
        'fb-5': [
          { id: 'fc-18', author: 'Kevin Ramos', author_avatar: '', content: 'Applied last week! The interview process was smooth and professional.', like_count: 4, created_at: new Date(Date.now() - 86400000).toISOString() },
          { id: 'fc-19', author: 'Maria Reyes', author_avatar: '', content: 'We\'re looking for passionate developers who want to grow with the team!', like_count: 3, created_at: new Date(Date.now() - 43200000).toISOString() },
          { id: 'fc-20', author: 'David Tan', author_avatar: '', content: 'Is this a full remote position or hybrid?', like_count: 2, created_at: new Date(Date.now() - 21600000).toISOString() },
          { id: 'fc-21', author: 'Maria Reyes', author_avatar: '', content: 'It\'s hybrid — 2 days onsite in Cebu, 3 days remote.', like_count: 5, created_at: new Date(Date.now() - 10800000).toISOString() },
        ],
        'fb-6': [
          { id: 'fc-22', author: 'Luzviminda Santos', author_avatar: '', content: 'Congratulations, Josefa! So proud of you!', like_count: 15, created_at: new Date(Date.now() - 172800000).toISOString() },
          { id: 'fc-23', author: 'Carlos Mendez', author_avatar: '', content: 'Amazing achievement! The review tips will be really helpful for those preparing.', like_count: 10, created_at: new Date(Date.now() - 86400000).toISOString() },
          { id: 'fc-24', author: 'Anna Marie Cruz', author_avatar: '', content: 'Congratulations! CTU-Naga produces the best engineers!', like_count: 18, created_at: new Date(Date.now() - 43200000).toISOString() },
          { id: 'fc-25', author: 'Josefa Dimatulac', author_avatar: '', content: 'Thank you everyone! Your support means so much to me. ❤️', like_count: 22, created_at: new Date(Date.now() - 21600000).toISOString() },
        ],
        'fb-7': [
          { id: 'fc-26', author: 'Anna Marie Cruz', author_avatar: '', content: 'This is a great opportunity for creative alumni!', like_count: 3, created_at: new Date(Date.now() - 43200000).toISOString() },
        ],
        'fb-8': [
          { id: 'fc-27', author: 'Pedro Reyes', author_avatar: '', content: 'This is wonderful news! Will the scholarship cover thesis-related expenses as well?', like_count: 7, created_at: new Date(Date.now() - 259200000).toISOString() },
          { id: 'fc-32', author: 'Scholarship Committee', author_avatar: '', content: 'The scholarship covers tuition only, but we can help connect you with other funding sources for research.', like_count: 5, created_at: new Date(Date.now() - 172800000).toISOString() },
          { id: 'fc-33', author: 'Kevin Ramos', author_avatar: '', content: 'I\'m interested in the IT program. When does the application open?', like_count: 4, created_at: new Date(Date.now() - 86400000).toISOString() },
          { id: 'fc-34', author: 'Scholarship Committee', author_avatar: '', content: 'Applications are now open until March 30, 2026. Visit the alumni office for forms.', like_count: 8, created_at: new Date(Date.now() - 43200000).toISOString() },
          { id: 'fc-35', author: 'Maria Reyes', author_avatar: '', content: 'This is a great initiative! I will apply for the Business Admin program.', like_count: 6, created_at: new Date(Date.now() - 21600000).toISOString() },
          { id: 'fc-36', author: 'Luzviminda Santos', author_avatar: '', content: 'Are there any GPA requirements?', like_count: 3, created_at: new Date(Date.now() - 7200000).toISOString() },
          { id: 'fc-37', author: 'Scholarship Committee', author_avatar: '', content: 'Yes, a minimum GPA of 2.5 is required for eligibility.', like_count: 7, created_at: new Date(Date.now() - 3600000).toISOString() },
          { id: 'fc-38', author: 'David Tan', author_avatar: '', content: 'I\'ll spread the word to my batchmates!', like_count: 5, created_at: new Date(Date.now() - 1800000).toISOString() },
          { id: 'fc-39', author: 'Sarah Lim', author_avatar: '', content: 'The Engineering program is very competitive. I hope I qualify!', like_count: 4, created_at: new Date(Date.now() - 600000).toISOString() },
        ],
      };
      setComments(fallbackCommentsByPost[post.id] || []);
    });
  }, [post.id]);

  const handleLike = async () => {
    try {
      const res = await feedApi.toggleLike(post.id);
      setLiked(res.liked);
      setLikeCount((c) => res.liked ? c + 1 : c - 1);
      onLikeToggled?.();
    } catch {
      setLiked((prev) => !prev);
      setLikeCount((c) => liked ? c - 1 : c + 1);
      onLikeToggled?.();
    }
  };

  const handleComment = async () => {
    if (!newComment.trim() || sending) return;
    setSending(true);
    try {
      const res = await feedApi.addComment(post.id, newComment.trim());
      setComments((prev) => [...prev, res]);
      setNewComment('');
      onCommentAdded?.();
    } catch {
      setComments((prev) => [...prev, { id: 'tmp-' + Date.now(), author: 'You', author_avatar: '', content: newComment.trim(), like_count: 0, created_at: new Date().toISOString() }]);
      setNewComment('');
      onCommentAdded?.();
      activitiesApi.add({ user: 'You', action: 'commented on', target: post.title }).catch(() => {});
    }
    setSending(false);
  };

  const typeIcon = () => {
    switch (post.type) {
      case 'job': return <BriefcaseIcon className="w-4 h-4 inline mr-1" />;
      case 'announcement': return <SparklesIcon className="w-4 h-4 inline mr-1" />;
      case 'event': return <CalendarDaysIcon className="w-4 h-4 inline mr-1" />;
      case 'guide': return <AcademicCapIcon className="w-4 h-4 inline mr-1" />;
      case 'discussion': return <ChatBubbleLeftRightIcon className="w-4 h-4 inline mr-1" />;
      default: return null;
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-1 text-xs font-medium text-orange-600 hover:text-orange-700 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Back to feed
        </button>
        <button onClick={handleLike} className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded transition-colors ${liked ? 'text-orange-600 bg-orange-50' : 'text-gray-500 hover:bg-gray-100'}`}>
          {liked ? <HeartIconSolid className="w-4 h-4" /> : <HeartIcon className="w-4 h-4" />}
          <span>{likeCount}</span>
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
                {typeIcon()}{post.tag}
              </span>
            </>
          )}
        </div>

        <h3 className="text-base font-bold text-gray-900 mb-2">{post.title}</h3>

        <p className="text-sm text-gray-700 leading-relaxed mb-3 whitespace-pre-line">
          {post.content}
        </p>

        {post.image_url && (
          <img src={post.image_url} alt="" className="w-full rounded-lg mb-3" />
        )}

        {post.company && (
          <p className="text-xs text-gray-500 mb-3">
            <BriefcaseIcon className="w-3.5 h-3.5 inline mr-0.5 text-gray-400" />
            {post.company}
          </p>
        )}
      </div>

      <div className="border-t border-gray-100 px-4 py-3">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Comments ({comments.length})
        </h4>

        {comments.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-6">No comments yet. Be the first to share your thoughts!</p>
        ) : (
          <div className="space-y-3 max-h-64 overflow-y-auto scrollbar-hover">
            {comments.map((c) => (
              <div key={c.id} className="flex gap-2">
                <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-[9px] font-bold text-white shrink-0 mt-0.5">
                  {c.author_avatar || c.author.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-gray-800">{c.author}</span>
                    <span className="text-[10px] text-gray-400">{formatDate(c.created_at)}</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-0.5">{c.content}</p>
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-400">
                    <button className="hover:text-gray-600 transition-colors">Like</button>
                    <span>{c.like_count}</span>
                    <button className="hover:text-gray-600 transition-colors">Reply</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-gray-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleComment()}
            placeholder="Add a comment..."
            className="flex-1 h-9 px-3 bg-gray-50 border border-gray-200 rounded-full text-sm outline-none focus:border-blue-400 focus:bg-white focus:ring-1 focus:ring-blue-200 transition-all"
          />
          <button
            onClick={handleComment}
            disabled={!newComment.trim() || sending}
            className="w-9 h-9 rounded-full bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <PaperAirplaneIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function RightSidebar({ refreshKey }: { refreshKey?: number }) {
  const [stats, setStats] = useState({ totalAlumni: 2847, onlineNow: 156, newThisWeek: 89, activeDiscussions: 47 });
  const [activities, setActivities] = useState<{ id: number; user: string; action: string; target: string; created_at: string }[]>([]);
  const [events, setEvents] = useState<{ id: string; name: string; date: string }[]>([]);

  useEffect(() => {
    analyticsApi.statistics().then((data: any) => {
      if (data) {
        setStats({
          totalAlumni: data.total_alumni || data.totalUsers || 2847,
          onlineNow: data.online_now || 156,
          newThisWeek: data.new_this_week || 89,
          activeDiscussions: data.active_discussions || 47,
        });
      }
    }).catch(() => {});
    activitiesApi.list(7).then(setActivities).catch(() => {});
    eventsApi.list().then(setEvents).catch(() => {});
  }, [refreshKey]);

  function formatActivityTime(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString();
  }

  return (
    <div className="space-y-3">
      <div className="bg-white border border-gray-200 rounded-lg p-3">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <FireIcon className="w-4 h-4 text-orange-500" />
          Recent Alumni Activity
        </h3>
        <div className="space-y-2">
          {activities.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">No recent activity</p>
          ) : (
            activities.map((item) => (
              <div key={item.id} className="flex items-start gap-2 text-xs">
                <div className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-1.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-gray-700"><span className="font-medium">{item.user}</span> {item.action} {item.target}</p>
                  <p className="text-gray-400 text-[10px]">{formatActivityTime(item.created_at)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-3">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <CalendarDaysIcon className="w-4 h-4 text-orange-500" />
          Upcoming Events
        </h3>
        <div className="space-y-2">
          {events.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">No upcoming events. Check back later!</p>
          ) : (
            events.map((event, i) => (
              <div key={event.id || i} className="flex items-center gap-2 text-xs">
                <div className="w-8 h-8 rounded-lg bg-orange-50 flex flex-col items-center justify-center shrink-0">
                  <span className="text-[10px] font-bold text-orange-600 leading-none">
                    {event.date.split(',')[0].split(' ')[1] || event.date.split(' ')[0]}
                  </span>
                  <span className="text-[8px] text-orange-400 leading-none">
                    {event.date.includes('2026') ? '2026' : ''}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-gray-800 truncate">{event.name}</p>
                  <p className="text-gray-400">{event.date}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-3">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <UserGroupIcon className="w-4 h-4 text-orange-500" />
          Community Statistics
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Total Alumni', value: stats.totalAlumni.toLocaleString() },
            { label: 'Online Now', value: stats.onlineNow.toLocaleString() },
            { label: 'New This Week', value: stats.newThisWeek.toLocaleString() },
            { label: 'Active Discussions', value: stats.activeDiscussions.toLocaleString() },
          ].map((stat, i) => (
            <div key={i} className="bg-gray-50 rounded-lg p-2 text-center">
              <p className="text-sm font-bold text-gray-900">{stat.value}</p>
              <p className="text-[10px] text-gray-500">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [feedFilter, setFeedFilter] = useState('Best');
  const [selectedPost, setSelectedPost] = useState<FeedPost | null>(null);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState('Welcome');
  const [profile, setProfile] = useState<any>(null);
  const [sidebarRefreshKey, setSidebarRefreshKey] = useState(0);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  useEffect(() => {
    profileApi.get().then(setProfile).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const sortParam = feedFilter === 'New' ? 'new' : feedFilter === 'Top' ? 'top' : feedFilter === 'Rising' ? 'top' : '';
    feedApi.list(sortParam).then((data) => {
      if (data && data.length > 0) setPosts(data);
      else setPosts(fallbackPosts);
    }).catch(() => {
      setPosts(fallbackPosts);
    }).finally(() => setLoading(false));
  }, [feedFilter]);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-9 h-9 rounded-full bg-orange-500 flex items-center justify-center text-white text-sm font-bold">
          {user?.email ? user.email[0].toUpperCase() : '?'}
        </div>
        <div>
          <h1 className="text-base font-bold text-gray-900">
            {greeting}{profile ? `, ${profile.first_name}!` : '!'}
          </h1>
          <p className="text-xs text-gray-500">Welcome to the CTU-Naga Alumni Network</p>
        </div>
      </div>

      {!selectedPost && (
        <div className="flex items-center gap-1 mb-3 bg-white border border-gray-200 rounded-lg px-3 py-2">
          <label className="text-xs text-gray-500 font-medium shrink-0">Sort by:</label>
          <select
            value={feedFilter}
            onChange={(e) => setFeedFilter(e.target.value)}
            className="text-sm font-medium text-gray-900 bg-transparent border-none outline-none cursor-pointer focus:ring-0 p-0"
          >
            {filters.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>
      )}

      <div className="flex gap-4">
        <div className="flex-1 min-w-0 space-y-3">
          {selectedPost ? (
            <PostDetailView
              post={selectedPost}
              onBack={() => setSelectedPost(null)}
              onCommentAdded={() => {
                setPosts((prev) => prev.map((p) =>
                  p.id === selectedPost.id ? { ...p, comment_count: p.comment_count + 1 } : p
                ));
                setSelectedPost((prev) => prev ? { ...prev, comment_count: prev.comment_count + 1 } : null);
                setTimeout(() => setSidebarRefreshKey((k) => k + 1), 2000);
              }}
              onLikeToggled={() => {
                setPosts((prev) => prev.map((p) =>
                  p.id === selectedPost.id ? { ...p, liked: !p.liked, like_count: p.liked ? p.like_count - 1 : p.like_count + 1 } : p
                ));
                setSelectedPost((prev) => prev ? { ...prev, liked: !prev.liked, like_count: prev.liked ? prev.like_count - 1 : prev.like_count + 1 } : null);
                setTimeout(() => setSidebarRefreshKey((k) => k + 1), 2000);
              }}
            />
          ) : loading ? (
            <div className="text-center py-12 text-sm text-gray-500">Loading posts...</div>
          ) : posts.length === 0 ? (
            <div className="text-center py-12 text-sm text-gray-500">No posts yet. Check back soon!</div>
          ) : (
            posts.map((post) => (
              <PostCard key={post.id} post={post} onViewDetails={() => setSelectedPost(post)} />
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
