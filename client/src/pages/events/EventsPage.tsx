import { useState, useEffect } from 'react';
import { CalendarDaysIcon, MapPinIcon, ClockIcon, UserIcon, LinkIcon, XMarkIcon, PhotoIcon, ChevronLeftIcon } from '@heroicons/react/24/outline';
import { eventsApi } from '@/services/api';
import { SkeletonCard } from '@/components/ui/Skeleton';



export default function EventsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('upcoming');
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  useEffect(() => {
    eventsApi.list()
      .then((data: any) => { if (data) setEvents(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const now = new Date();
  const filtered = events.filter((e) => {
    const eventDate = new Date(e.date || e.created_at);
    if (filter === 'upcoming') return eventDate >= now;
    if (filter === 'past') return eventDate < now;
    return true;
  });

  if (selectedEvent) {
    const e = selectedEvent;
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-4">
          <button onClick={() => setSelectedEvent(null)} className="flex items-center gap-1 text-xs font-medium text-orange-600 hover:text-orange-700 transition-colors mb-2">
            <ChevronLeftIcon className="w-4 h-4" />
            Back to Events
          </button>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {e.banner ? (
            <img src={e.banner} alt={e.name} className="w-full h-48 object-cover" />
          ) : (
            <div className="w-full h-32 bg-gradient-to-r from-orange-500 to-amber-500 flex items-center justify-center">
              <CalendarDaysIcon className="w-12 h-12 text-white/60" />
            </div>
          )}

          <div className="px-5 py-4">
            <h1 className="text-lg font-bold text-gray-900 mb-3">{e.name}</h1>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <div className="flex items-start gap-2.5 text-sm">
                <CalendarDaysIcon className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500">Date</p>
                  <p className="text-sm font-medium text-gray-800">{e.date || 'To be announced'}</p>
                </div>
              </div>
              {e.time && (
                <div className="flex items-start gap-2.5 text-sm">
                  <ClockIcon className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500">Time</p>
                    <p className="text-sm font-medium text-gray-800">{e.time}</p>
                  </div>
                </div>
              )}
              {e.location && (
                <div className="flex items-start gap-2.5 text-sm">
                  <MapPinIcon className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500">Venue</p>
                    <p className="text-sm font-medium text-gray-800">{e.location}</p>
                  </div>
                </div>
              )}
              {e.organizer && (
                <div className="flex items-start gap-2.5 text-sm">
                  <UserIcon className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500">Organizer</p>
                    <p className="text-sm font-medium text-gray-800">{e.organizer}</p>
                  </div>
                </div>
              )}
            </div>

            {e.description && (
              <div className="mb-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Description</h3>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{e.description}</p>
              </div>
            )}

            {e.registration_link && (
              <a
                href={e.registration_link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition-colors"
              >
                <LinkIcon className="w-4 h-4" />
                Register Now
              </a>
            )}
          </div>

          {e.gallery && e.gallery.length > 0 && (
            <div className="border-t border-gray-200 px-5 py-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <PhotoIcon className="w-4 h-4 text-orange-500" />
                Event Gallery
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {e.gallery.map((url: string, i: number) => (
                  <img key={i} src={url} alt={`Event photo ${i + 1}`} className="w-full h-28 object-cover rounded-lg" />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-4">
        <h1 className="text-base font-bold text-gray-900">Events</h1>
        <p className="text-xs text-gray-500">Complete event history for CTU-Naga alumni.</p>
      </div>

      <div className="flex items-center gap-2 mb-3 bg-white border border-gray-200 rounded-lg px-3 py-2">
        <CalendarDaysIcon className="w-4 h-4 text-gray-400 shrink-0" />
        <div className="flex items-center gap-1">
          {(['upcoming', 'all', 'past'] as const).map((option) => (
            <button
              key={option}
              onClick={() => setFilter(option)}
              className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                filter === option
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {option === 'all' ? 'All' : option.charAt(0).toUpperCase() + option.slice(1)}
            </button>
          ))}
        </div>
        <span className="text-xs text-gray-400 ml-auto">{filtered.length} event{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-sm text-gray-500 bg-white border border-gray-200 rounded-lg">
          No {filter} events for now.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((event) => (
            <div key={event.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-sm transition-shadow">
              {event.banner ? (
                <img src={event.banner} alt={event.name} className="w-full h-32 sm:h-40 object-cover" />
              ) : null}
              <div className="px-4 py-3">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-lg bg-orange-50 flex flex-col items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-orange-600 leading-none">
                      {new Date(event.date || event.created_at).getDate()}
                    </span>
                    <span className="text-[10px] text-orange-400 leading-none uppercase">
                      {new Date(event.date || event.created_at).toLocaleString('default', { month: 'short' })}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900">{event.name}</h3>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500 mt-0.5">
                      <span className="flex items-center gap-1">
                        <CalendarDaysIcon className="w-3.5 h-3.5" />
                        {event.date || new Date(event.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                      </span>
                      {event.time && (
                        <span className="flex items-center gap-1">
                          <ClockIcon className="w-3.5 h-3.5" />
                          {event.time}
                        </span>
                      )}
                      {event.location && (
                        <span className="flex items-center gap-1">
                          <MapPinIcon className="w-3.5 h-3.5" />
                          {event.location}
                        </span>
                      )}
                    </div>
                    {event.description && (
                      <p className="text-xs text-gray-600 mt-1 line-clamp-2">{event.description}</p>
                    )}
                    <button
                      onClick={() => setSelectedEvent(event)}
                      className="mt-2 text-xs font-medium text-orange-600 hover:text-orange-700 transition-colors"
                    >
                      Read More &rarr;
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
