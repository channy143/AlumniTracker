import { useState, useEffect } from 'react';
import { adminApi } from '@/services/api';
import { useUIStore } from '@/store/uiStore';

export default function AdminEvents() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', description: '', date: '', time: '', location: '' });
  const addNotification = useUIStore((s) => s.addNotification);

  useEffect(() => { load(); }, []);

  const getToken = () => sessionStorage.getItem('access_token') || localStorage.getItem('access_token');

  const headers = () => {
    const token = getToken();
    return token ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } : { 'Content-Type': 'application/json' };
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/events', { headers: headers() });
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

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="mb-4"><div className="h-5 w-32 bg-gray-200 animate-pulse rounded mb-1" /><div className="h-3 w-48 bg-gray-200 animate-pulse rounded" /></div>
        <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-20 bg-gray-200 animate-pulse rounded-lg" />)}</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-4">
        <h1 className="text-base font-bold text-gray-900">Events</h1>
        <p className="text-xs text-gray-500">Manage alumni events, career fairs, and deadlines.</p>
      </div>

      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1">{['upcoming', 'past'].map((f) => (
          <span key={f} className="px-3 py-1.5 text-xs font-medium text-gray-500">{f.charAt(0).toUpperCase() + f.slice(1)}</span>
        ))}</div>
        <button onClick={() => { setShowForm(true); setEditId(null); setForm({ name: '', description: '', date: '', time: '', location: '' }); }}
          className="px-3 py-1.5 text-xs font-medium bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors">+ New Event</button>
      </div>

      <div className="space-y-2">
        {events.length === 0 ? (
          <div className="text-center py-12 text-sm text-gray-500 bg-white border border-gray-200 rounded-lg">No events for now.</div>
        ) : events.slice(0, 10).map((e) => (
          <div key={e.id} className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-50 flex flex-col items-center justify-center shrink-0">
                <span className="text-xs font-bold text-orange-600 leading-none">{e.date?.split(' ')[0]?.slice(0, 3) || 'N/A'}</span>
                <span className="text-[9px] text-orange-400">{e.date?.split(' ')[1]?.replace(',', '') || ''}</span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{e.name}</p>
                <p className="text-xs text-gray-500">{e.date}{e.time ? ` · ${e.time}` : ''}</p>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-lg p-4 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-sm font-bold text-gray-900 mb-3">{editId ? 'Edit Event' : 'New Event'}</h2>
            <form onSubmit={handleSave} className="space-y-3">
              <input required placeholder="Event name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-orange-400" />
              <textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-orange-400" rows={3} />
              <div className="grid grid-cols-2 gap-2">
                <input type="date" required placeholder="Date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="text-xs border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-orange-400" />
                <input type="time" placeholder="Time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })}
                  className="text-xs border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-orange-400" />
              </div>
              <input placeholder="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}
                className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-orange-400" />
              <div className="flex items-center gap-2 pt-2">
                <button type="submit" className="px-4 py-2 text-xs font-medium bg-orange-500 text-white rounded-lg hover:bg-orange-600">{editId ? 'Update' : 'Create'}</button>
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-xs font-medium text-gray-600 hover:text-gray-800">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
