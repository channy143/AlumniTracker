import { useState, useEffect } from 'react';
import { adminApi } from '@/services/api';
import { useUIStore } from '@/store/uiStore';
import { CalendarDaysIcon, XMarkIcon } from '@heroicons/react/24/outline';

export default function AdminEvents() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', description: '', date: '', time: '', location: '' });
  const [filter, setFilter] = useState<'upcoming' | 'past'>('upcoming');
  const addNotification = useUIStore((s) => s.addNotification);

  useEffect(() => { load(); }, []);

  const getToken = () => sessionStorage.getItem('access_token') || localStorage.getItem('access_token');

  const headers = (): HeadersInit => {
    const token = getToken();
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) h['Authorization'] = `Bearer ${token}`;
    return h;
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/events', { headers: headers() });
      const data = await res.json();
      setEvents(Array.isArray(data) ? data : []);
    } catch { setEvents([]); addNotification('Failed to load events', 'error'); }
    finally { setLoading(false); }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/events', {
        method: editId ? 'PUT' : 'POST',
        headers: headers(),
        body: JSON.stringify({ ...form, id: editId }),
      });
      if (!res.ok) throw new Error('Failed');
      addNotification(editId ? 'Event updated' : 'Event created', 'success');
      setShowForm(false); setEditId(null);
      setForm({ name: '', description: '', date: '', time: '', location: '' });
      load();
    } catch { addNotification('Failed to save event', 'error'); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this event?')) return;
    try {
      const token = getToken();
      await fetch(`/api/admin/events/${id}`, { method: 'DELETE', headers: token ? { Authorization: `Bearer ${token}` } : {} });
      addNotification('Event deleted', 'success');
      load();
    } catch { addNotification('Failed to delete event', 'error'); }
  };

  const formatDate = (d: string) => {
    if (!d) return '';
    const dt = new Date(d);
    return Number.isNaN(dt.getTime()) ? d : dt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };
  const dateParts = (d: string) => {
    if (!d) return { day: 'N/A', month: '' };
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return { day: d.slice(0, 3), month: '' };
    return {
      day: dt.getDate().toString().padStart(2, '0'),
      month: dt.toLocaleString('default', { month: 'short' }),
    };
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="mb-4"><div className="h-5 w-32 bg-gray-200 animate-pulse rounded mb-1" /><div className="h-3 w-48 bg-gray-200 animate-pulse rounded" /></div>
        <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-20 bg-gray-200 animate-pulse rounded-lg" />)}</div>
      </div>
    );
  }

  const now = new Date();
  const filteredEvents = events.filter((e: any) => {
    const eventDate = new Date(e.date);
    if (filter === 'upcoming') return eventDate >= now;
    return eventDate < now;
  });

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-4">
        <h1 className="text-base font-bold text-gray-900">Events</h1>
        <p className="text-xs text-gray-500">Manage alumni events, career fairs, and deadlines.</p>
      </div>

      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1">{['upcoming', 'past'].map((f) => (
          <button key={f} onClick={() => setFilter(f as 'upcoming' | 'past')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              filter === f ? 'bg-orange-500 text-white' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}</div>
        <button onClick={() => { setShowForm(true); setEditId(null); setForm({ name: '', description: '', date: '', time: '', location: '' }); }}
          className="px-3 py-1.5 text-xs font-medium bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors">+ New Event</button>
      </div>

      <div className="space-y-2">
        {loading ? (
          [1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-center justify-between animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gray-200" />
                <div className="space-y-1.5">
                  <div className="h-3.5 w-40 bg-gray-200 rounded" />
                  <div className="h-2.5 w-24 bg-gray-200 rounded" />
                </div>
              </div>
              <div className="h-4 w-16 bg-gray-200 rounded" />
            </div>
          ))
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-12 text-sm text-gray-500 bg-white border border-gray-200 rounded-lg">No {filter} events for now.</div>
        ) : filteredEvents.slice(0, 10).map((e: any) => (
          <div key={e.id} className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-50 flex flex-col items-center justify-center shrink-0">
                <span className="text-xs font-bold text-orange-600 leading-none">{dateParts(e.date).day}</span>
                <span className="text-[9px] text-orange-400">{dateParts(e.date).month}</span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{e.name}</p>
                <p className="text-xs text-gray-500">{formatDate(e.date)}{e.time ? ` · ${e.time}` : ''}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => { setEditId(e.id); setForm({ name: e.name, description: e.description || '', date: e.date || '', time: e.time || '', location: e.location || '' }); setShowForm(true); }}
                className="text-xs text-orange-600 hover:text-orange-700">Edit</button>
              <button onClick={() => handleDelete(e.id)} className="text-xs text-red-500 hover:text-red-700">Delete</button>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/55 backdrop-blur-xs" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 text-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-xs text-white shrink-0">
                  <CalendarDaysIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">{editId ? 'Edit Event' : 'Create New Event'}</h3>
                  <p className="text-xs text-orange-100 mt-0.5">Schedule campus reunions, homecomings, and job fairs</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors cursor-pointer"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 overflow-y-auto space-y-3.5 flex-1 text-xs">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Event Name *</label>
                  <input required placeholder="e.g. Annual Grand Alumni Homecoming 2026" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                  <textarea placeholder="Provide details about the event schedule, program, and attendees..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500" rows={3} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Date *</label>
                    <input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
                      className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Time</label>
                    <input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })}
                      className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Location / Venue</label>
                  <input placeholder="e.g. CTU Main Campus Gymnasium or Zoom Link" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}
                    className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500" />
                </div>
              </div>

              <div className="px-6 py-3.5 bg-gray-50/80 border-t border-gray-100 flex items-center justify-end gap-2.5 shrink-0">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-xs font-semibold bg-white border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors shadow-2xs cursor-pointer">Cancel</button>
                <button type="submit" className="px-4 py-2 text-xs font-semibold bg-orange-600 hover:bg-orange-700 text-white rounded-xl shadow-xs hover:shadow transition-all cursor-pointer flex items-center gap-1.5">{editId ? 'Update Event' : 'Create Event'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}