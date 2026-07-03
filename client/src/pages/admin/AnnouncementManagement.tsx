import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '@/services/api';
import { useUIStore } from '@/store/uiStore';

export default function AnnouncementManagement() {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', content: '', image_url: '', document_url: '', is_pinned: false, status: 'draft', send_to_all: true });
  const addNotification = useUIStore((s) => s.addNotification);
  const limit = 15;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.announcementList({ page, limit });
      setData(res.data);
      setTotal(res.total);
    } catch { addNotification('Failed to load announcements', 'error'); }
    finally { setLoading(false); }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editId) await adminApi.announcementUpdate(editId, form);
      else await adminApi.announcementCreate(form);
      setShowForm(false); setEditId(null);
      setForm({ title: '', content: '', image_url: '', document_url: '', is_pinned: false, status: 'draft', send_to_all: true });
      addNotification(editId ? 'Announcement updated' : 'Announcement created', 'success');
      load();
    } catch { addNotification('Failed to save announcement', 'error'); }
  };

  const handlePublish = async (id: string) => {
    await adminApi.announcementPublish(id);
    addNotification('Announcement published', 'success');
    load();
  };

  const handleArchive = async (id: string) => {
    await adminApi.announcementDelete(id);
    addNotification('Announcement archived', 'success');
    load();
  };

  const handlePin = async (id: string, pinned: boolean) => {
    await adminApi.announcementPin(id, !pinned);
    addNotification(pinned ? 'Announcement unpinned' : 'Announcement pinned', 'success');
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="section-title">Announcement Management</h1>
          <p className="text-gray-500 mt-1">{total} announcements</p>
        </div>
        <button onClick={() => { setShowForm(true); setEditId(null); setForm({ title: '', content: '', image_url: '', document_url: '', is_pinned: false, status: 'draft', send_to_all: true }); }} className="btn-primary text-sm">+ Create Announcement</button>
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="card animate-pulse h-20" />)}</div>
      ) : data.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">No announcements</div>
      ) : (
        <div className="space-y-3">
          {data.map((item: any) => (
            <div key={item.id} className={`card flex items-start justify-between ${item.is_pinned ? 'ring-2 ring-ctu-marigold/30' : ''}`}>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  {item.is_pinned && <span className="text-xs text-ctu-marigold font-medium">PINNED</span>}
                  <h3 className="font-semibold text-ctu-charcoal">{item.title}</h3>
                  <span className={`px-2 py-0.5 text-xs rounded-full ${item.status === 'published' ? 'bg-green-50 text-green-700' : item.status === 'draft' ? 'bg-gray-50 text-gray-600' : 'bg-yellow-50 text-yellow-700'}`}>
                    {item.status}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">{item.content}</p>
                <p className="text-xs text-gray-400 mt-2">By {item.user?.email} &middot; {new Date(item.created_at).toLocaleDateString()}</p>
              </div>
              <div className="flex gap-2 ml-4 shrink-0">
                {item.status === 'draft' && <button onClick={() => handlePublish(item.id)} className="text-xs text-green-600 hover:underline">Publish</button>}
                <button onClick={() => handlePin(item.id, item.is_pinned)} className="text-xs text-ctu-marigold hover:underline">{item.is_pinned ? 'Unpin' : 'Pin'}</button>
                <button onClick={() => handleArchive(item.id)} className="text-xs text-red-600 hover:underline">Archive</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 pt-10 overflow-y-auto" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-xl max-w-2xl w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-ctu-charcoal mb-6">{editId ? 'Edit Announcement' : 'Create Announcement'}</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div><label className="block text-sm font-medium text-ctu-charcoal mb-1">Title *</label><input type="text" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className="input-field" required /></div>
              <div><label className="block text-sm font-medium text-ctu-charcoal mb-1">Content *</label><textarea value={form.content} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))} className="input-field" rows={5} required /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-ctu-charcoal mb-1">Image URL</label><input type="url" value={form.image_url} onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))} className="input-field" /></div>
                <div><label className="block text-sm font-medium text-ctu-charcoal mb-1">Document URL</label><input type="url" value={form.document_url} onChange={(e) => setForm((f) => ({ ...f, document_url: e.target.value }))} className="input-field" /></div>
              </div>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_pinned} onChange={(e) => setForm((f) => ({ ...f, is_pinned: e.target.checked }))} className="w-4 h-4" /> Pin Announcement</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.send_to_all} onChange={(e) => setForm((f) => ({ ...f, send_to_all: e.target.checked }))} className="w-4 h-4" /> Send to All Alumni</label>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">{editId ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
