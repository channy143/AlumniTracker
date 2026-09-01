import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CalendarDaysIcon, DocumentTextIcon, ChevronLeftIcon } from '@heroicons/react/24/outline';
import { announcementsApi } from '@/services/api';
import { SkeletonCard } from '@/components/ui/Skeleton';



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
      .then((data: any) => { if (data) setAnnouncements(data); })
      .catch(() => {})
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
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-sm text-gray-500 bg-white border border-gray-200 rounded-lg">
          No announcements for now.
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
