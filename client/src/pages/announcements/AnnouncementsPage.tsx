import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CalendarDaysIcon, DocumentTextIcon, ChevronLeftIcon } from '@heroicons/react/24/outline';
import { announcementsApi } from '@/services/api';

const fallbackAnnouncements = [
  { id: 'a1', title: 'Graduation Tracer Survey is now open', content: 'The CTU-Naga Alumni Office invites all recent graduates to participate in the Graduation Tracer Survey. Your feedback helps us improve our programs and services. The survey takes only 10 minutes to complete. All responses are kept confidential and will be used solely for institutional development purposes. Participants will receive a certificate of completion.', created_at: '2026-07-10T08:00:00Z', is_pinned: true, created_by: 'Alumni Office', image_url: '', document_url: '' },
  { id: 'a2', title: 'Alumni ID claiming starts July 20', content: 'Good news! The new batch of Alumni IDs is now available for claiming at the Alumni Office. Please bring your valid ID and claim receipt. Claiming period runs until August 30, 2026. For those who have not yet applied, you may still submit your application online and schedule an appointment for ID capture.', created_at: '2026-07-08T10:00:00Z', is_pinned: true, created_by: 'Alumni Office', image_url: '', document_url: '' },
  { id: 'a3', title: 'Accenture Campus Recruitment 2026', content: 'Accenture is holding a campus recruitment event exclusively for CTU-Naga alumni. Positions available for Software Engineers, Data Analysts, and Cybersecurity Associates. Walk-in interviews on July 25, 2026 at the University Gymnasium from 8:00 AM to 5:00 PM. Bring your resume, transcript of records, and portfolio if applicable. Fresh graduates are encouraged to apply.', created_at: '2026-07-05T09:00:00Z', is_pinned: false, created_by: 'Career Services', image_url: '', document_url: '' },
  { id: 'a4', title: 'Enrollment for 2nd Semester now open', content: 'Enrollment for the 2nd Semester of AY 2026-2027 is now open. Alumni availing of graduate studies are encouraged to enroll early. Deadline for late enrollment is August 15, 2026. Online enrollment is available through the university portal. For assistance, contact the Registrar\'s Office at registrar@ctu-naga.edu.ph.', created_at: '2026-06-28T07:00:00Z', is_pinned: false, created_by: 'Registrar', image_url: '', document_url: '' },
  { id: 'a5', title: 'Scholarship Opportunities for Graduate Studies', content: 'The Alumni Association is proud to announce five (5) scholarship grants for alumni pursuing graduate studies. Each grant covers 50% of tuition fees for the entire program. Fields include Education, Engineering, Business Administration, and Information Technology. Deadline for applications is August 30, 2026. See the Alumni Office for details and application forms.', created_at: '2026-06-20T14:00:00Z', is_pinned: false, created_by: 'Scholarship Committee', image_url: '', document_url: '' },
  { id: 'a6', title: 'Job Fair 2026 — Register Now', content: 'The annual CTU-Naga Job Fair is happening on September 15, 2026. Over 30 companies will be participating, including Accenture, IBM, Google, UnionBank, and many more. Pre-registration is required. Register at the Alumni Office or online through the link provided. Bring multiple copies of your resume and dress professionally.', created_at: '2026-06-15T11:00:00Z', is_pinned: false, created_by: 'Career Services', image_url: '', document_url: '' },
  { id: 'a7', title: 'Alumni Mentorship Program — Mentors Needed', content: 'We are looking for experienced alumni to serve as mentors for current students and recent graduates. This is a great opportunity to give back to the CTU-Naga community and help shape the next generation of professionals. Mentors are expected to commit at least 2 hours per month for a minimum of 6 months. Sign up by August 1, 2026.', created_at: '2026-06-10T08:30:00Z', is_pinned: false, created_by: 'Alumni Office', image_url: '', document_url: '' },
  { id: 'a8', title: 'CTU-Naga Extension Campus Foundation Day', content: 'Join us in celebrating the CTU-Naga Extension Campus Foundation Day on July 30, 2026. Activities include a thanksgiving mass, cultural presentations, alumni networking, and a community outreach program. All alumni are invited to attend and participate. Please confirm your attendance by July 25.', created_at: '2026-06-05T06:00:00Z', is_pinned: false, created_by: 'Alumni Office', image_url: '', document_url: '' },
];

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Survey': ['survey', 'tracer'],
  'Scholarship': ['scholarship', 'grant', 'financial'],
  'Recruitment': ['recruitment', 'hiring', 'job fair', 'campus recruitment'],
  'Enrollment': ['enrollment', 'registration', 'enroll'],
  'Event': ['foundation day', 'homecoming', 'celebration'],
  'Mentorship': ['mentor', 'mentorship'],
  'ID & Documents': ['alumni id', 'claiming', 'id claiming'],
};

function inferCategory(title: string, content: string): string {
  const text = `${title} ${content}`.toLowerCase();
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((k) => text.includes(k))) return cat;
  }
  return 'General';
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export default function AnnouncementsPage() {
  const [searchParams] = useSearchParams();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const search = searchParams.get('q') || '';
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selected, setSelected] = useState<any>(null);

  useEffect(() => {
    announcementsApi.list()
      .then((data: any) => { if (data?.length) setAnnouncements(data); else setAnnouncements(fallbackAnnouncements); })
      .catch(() => setAnnouncements(fallbackAnnouncements))
      .finally(() => setLoading(false));
  }, []);

  const years = [...new Set(announcements.map((a) => new Date(a.created_at).getFullYear().toString()))].sort((a, b) => Number(b) - Number(a));
  const categories = [...new Set(announcements.map((a) => inferCategory(a.title, a.content)))];

  const filtered = announcements.filter((a) => {
    const matchesSearch = !search || `${a.title} ${a.content}`.toLowerCase().includes(search.toLowerCase());
    const matchesYear = yearFilter === 'all' || new Date(a.created_at).getFullYear().toString() === yearFilter;
    const matchesCategory = categoryFilter === 'all' || inferCategory(a.title, a.content) === categoryFilter;
    return matchesSearch && matchesYear && matchesCategory;
  });

  const pinned = filtered.filter((a) => a.is_pinned);
  const unpinned = filtered.filter((a) => !a.is_pinned);

  if (selected) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-4">
          <button onClick={() => setSelected(null)} className="flex items-center gap-1 text-xs font-medium text-orange-600 hover:text-orange-700 transition-colors mb-2">
            <ChevronLeftIcon className="w-4 h-4" />
            Back to Announcements
          </button>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg px-5 py-4">
          {selected.is_pinned && (
            <div className="flex items-center gap-1.5 text-xs text-orange-600 font-medium mb-2">
              <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor"><path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z"/></svg>
              Pinned Announcement
            </div>
          )}

          <h1 className="text-base font-bold text-gray-900 mb-2">{selected.title}</h1>

          <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
            <span>{formatDate(selected.created_at)}</span>
            <span>&middot;</span>
            <span>{selected.created_by || 'Admin'}</span>
            <span>&middot;</span>
            <span className="px-1.5 py-0.5 bg-orange-50 text-orange-600 rounded font-medium">{inferCategory(selected.title, selected.content)}</span>
          </div>

          {selected.image_url && (
            <img src={selected.image_url} alt="" className="w-full rounded-lg mb-3 max-h-72 object-cover" />
          )}

          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{selected.content}</p>

          {selected.document_url && (
            <a
              href={selected.document_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-4 px-3 py-1.5 bg-orange-50 text-orange-700 text-xs font-medium rounded-lg hover:bg-orange-100 transition-colors"
            >
              <DocumentTextIcon className="w-4 h-4" />
              View Attached Document
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-4">
        <h1 className="text-base font-bold text-gray-900">Announcements</h1>
        <p className="text-xs text-gray-500">Complete announcement history for CTU-Naga alumni.</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-3 mb-3">
        <div className="flex flex-wrap items-center gap-2">
          <CalendarDaysIcon className="w-4 h-4 text-gray-400 shrink-0" />
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 outline-none focus:border-orange-400"
          >
            <option value="all">All Years</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <span className="w-px h-4 bg-gray-300" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 outline-none focus:border-orange-400"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <span className="text-xs text-gray-400 ml-auto">{filtered.length} announcement{filtered.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-sm text-gray-500">Loading announcements...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-sm text-gray-500 bg-white border border-gray-200 rounded-lg">
          No announcements match your filters.
        </div>
      ) : (
        <div className="space-y-3">
          {pinned.map((a) => (
            <div key={a.id} className="bg-white border border-orange-200 border-l-4 border-l-orange-500 rounded-lg px-4 py-3">
              <div className="flex items-center gap-1.5 text-xs text-orange-600 font-medium mb-0.5">
                <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor"><path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z"/></svg>
                Pinned
              </div>
              <h3 className="text-sm font-semibold text-gray-900 mb-1">{a.title}</h3>
              <p className="text-xs text-gray-600 leading-relaxed mb-1 line-clamp-3">{a.content}</p>
              <div className="flex items-center gap-2 text-[10px] text-gray-400">
                <span>{formatDate(a.created_at)}</span>
                <span>&middot;</span>
                <span>{a.created_by || 'Admin'}</span>
                <span>&middot;</span>
                <span className="px-1.5 py-0.5 bg-orange-50 text-orange-600 rounded font-medium">{inferCategory(a.title, a.content)}</span>
              </div>
              <button onClick={() => setSelected(a)} className="mt-2 text-xs font-medium text-orange-600 hover:text-orange-700 transition-colors">
                Read Full Announcement &rarr;
              </button>
            </div>
          ))}
          {unpinned.map((a) => (
            <div key={a.id} className="bg-white border border-gray-200 rounded-lg px-4 py-3">
              <h3 className="text-sm font-semibold text-gray-900 mb-1">{a.title}</h3>
              <p className="text-xs text-gray-600 leading-relaxed mb-1 line-clamp-3">{a.content}</p>
              <div className="flex items-center gap-2 text-[10px] text-gray-400">
                <span>{formatDate(a.created_at)}</span>
                <span>&middot;</span>
                <span>{a.created_by || 'Admin'}</span>
                <span>&middot;</span>
                <span className="px-1.5 py-0.5 bg-orange-50 text-orange-600 rounded font-medium">{inferCategory(a.title, a.content)}</span>
              </div>
              <button onClick={() => setSelected(a)} className="mt-2 text-xs font-medium text-orange-600 hover:text-orange-700 transition-colors">
                Read Full Announcement &rarr;
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
