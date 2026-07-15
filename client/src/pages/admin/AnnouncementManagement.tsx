import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '@/services/api';
import { useUIStore } from '@/store/uiStore';
import { MegaphoneIcon } from '@heroicons/react/24/outline';

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
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <div>
          <h1 className="text-base font-bold text-gray-900">Announcement Management</h1>
          <p className="text-xs text-gray-500">{total} announcements</p>
        </div>
        <button onClick={() => { setShowForm(true); setEditId(null); setForm({ title: '', content: '', image_url: '', document_url: '', is_pinned: false, status: 'draft', send_to_all: true }); }} className="px-3 py-1.5 text-xs font-medium bg-orange-500 text-white rounded-lg hover:bg-orange-600">+ Create Announcement</button>
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="bg-white border border-gray-200 rounded-lg animate-pulse h-16" />)}</div>
      ) : data.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg text-center py-12">
          <MegaphoneIcon className="w-8 h-8 mx-auto text-gray-300 mb-2" />
          <p className="text-xs text-gray-400">No announcements for now.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {data.map((item: any) => (
            <div key={item.id} className={`bg-white border border-gray-200 rounded-lg p-3 flex items-start justify-between ${item.is_pinned ? 'ring-1 ring-orange-300' : ''}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {item.is_pinned && <span className="text-[10px] text-orange-600 font-medium uppercase">Pinned</span>}
                  <h3 className="text-sm font-semibold text-gray-900 truncate">{item.title}</h3>
                  <span className={`px-1.5 py-0.5 text-[10px] rounded-full ${item.status === 'published' ? 'bg-emerald-50 text-emerald-700' : item.status === 'draft' ? 'bg-gray-100 text-gray-600' : 'bg-amber-50 text-amber-700'}`}>
                    {item.status}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.content}</p>
                <p className="text-[10px] text-gray-400 mt-1">By {item.user?.email} &middot; {new Date(item.created_at).toLocaleDateString()}</p>
              </div>
              <div className="flex gap-1.5 ml-3 shrink-0">
                {item.status === 'draft' && <button onClick={() => handlePublish(item.id)} className="text-[10px] text-emerald-600 hover:underline font-medium">Publish</button>}
                <button onClick={() => handlePin(item.id, item.is_pinned)} className="text-[10px] text-orange-600 hover:underline font-medium">{item.is_pinned ? 'Unpin' : 'Pin'}</button>
                <button onClick={() => handleArchive(item.id)} className="text-[10px] text-red-600 hover:underline font-medium">Archive</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 pt-10 overflow-y-auto" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-xl max-w-2xl w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-sm font-bold text-gray-900 mb-4">{editId ? 'Edit Announcement' : 'Create Announcement'}</h2>
            <form onSubmit={handleSave} className="space-y-3">
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Title *</label><input type="text" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-orange-400 w-full" required /></div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Content *</label><textarea value={form.content} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))} className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-orange-400 w-full" rows={5} required /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Image URL</label><input type="url" value={form.image_url} onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))} className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-orange-400 w-full" /></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Document URL</label><input type="url" value={form.document_url} onChange={(e) => setForm((f) => ({ ...f, document_url: e.target.value }))} className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-orange-400 w-full" /></div>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-1.5 text-xs cursor-pointer"><input type="checkbox" checked={form.is_pinned} onChange={(e) => setForm((f) => ({ ...f, is_pinned: e.target.checked }))} className="w-3.5 h-3.5 text-orange-500" /> Pin Announcement</label>
                <label className="flex items-center gap-1.5 text-xs cursor-pointer"><input type="checkbox" checked={form.send_to_all} onChange={(e) => setForm((f) => ({ ...f, send_to_all: e.target.checked }))} className="w-3.5 h-3.5 text-orange-500" /> Send to All Alumni</label>
              </div>
              <div className="flex gap-2 justify-end pt-1">
                <button type="button" onClick={() => setShowForm(false)} className="px-3 py-1.5 text-xs font-medium bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">Cancel</button>
                <button type="submit" className="px-3 py-1.5 text-xs font-medium bg-orange-500 text-white rounded-lg hover:bg-orange-600">{editId ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
