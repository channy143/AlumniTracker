import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '@/services/api';
import { useUIStore } from '@/store/uiStore';
import { MegaphoneIcon } from '@heroicons/react/24/outline';

const EMPTY_FORM = { title: '', content: '', image_url: '', document_url: '', is_pinned: false, send_to_all: true, linked_survey_id: '' };

export default function AnnouncementManagement() {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<any>({ ...EMPTY_FORM });
  const [availableSurveys, setAvailableSurveys] = useState<any[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const addNotification = useUIStore((s) => s.addNotification);
  const limit = 15;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page, limit };
      if (statusFilter !== 'all') params.status = statusFilter;
      const res = await adminApi.announcementList(params);
      setData(res.data);
      setTotal(res.total);
    } catch { addNotification('Failed to load announcements', 'error'); }
    finally { setLoading(false); }
  }, [page, statusFilter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    adminApi.surveyList({ status: 'active' }).then(setAvailableSurveys).catch(() => {});
  }, []);

  const openCreate = () => {
    setEditId(null);
    setForm({ ...EMPTY_FORM });
    setShowForm(true);
  };

  const openEdit = (item: any) => {
    setEditId(item.id);
    setForm({
      title: item.title || '',
      content: item.content || '',
      image_url: item.image_url || '',
      document_url: item.document_url || '',
      is_pinned: !!item.is_pinned,
      send_to_all: item.send_to_all !== false,
      linked_survey_id: item.linked_survey_id || '',
    });
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editId) await adminApi.announcementUpdate(editId, { ...form, linked_survey_id: form.linked_survey_id || null });
      else await adminApi.announcementCreate({ ...form, linked_survey_id: form.linked_survey_id || null });
      setShowForm(false); setEditId(null);
      setForm({ ...EMPTY_FORM });
      addNotification(editId ? 'Announcement updated' : 'Announcement created', 'success');
      load();
    } catch { addNotification('Failed to save announcement', 'error'); }
  };

  const handlePublish = async (id: string) => {
    try {
      await adminApi.announcementPublish(id);
      addNotification('Announcement published', 'success');
      load();
    } catch { addNotification('Failed to publish announcement', 'error'); }
  };

  const handlePin = async (item: any) => {
    try {
      const newPinned = !item.is_pinned;
      await adminApi.announcementPin(item.id, newPinned);
      addNotification(newPinned ? 'Announcement pinned' : 'Announcement unpinned', 'success');
      load();
    } catch { addNotification('Failed to update pin', 'error'); }
  };

  const handleArchive = async (id: string) => {
    try {
      await adminApi.announcementDelete(id);
      addNotification('Announcement archived', 'success');
      load();
    } catch { addNotification('Failed to archive announcement', 'error'); }
  };

  const handleRestore = async (item: any) => {
    try {
      const wasPublished = item.status === 'published';
      await adminApi.announcementRestore(item.id, wasPublished ? 'published' : undefined);
      addNotification('Announcement restored', 'success');
      load();
    } catch { addNotification('Failed to restore announcement', 'error'); }
  };

  const handleHardDelete = async (id: string) => {
    if (deletingId) return;
    setDeletingId(id);
    try {
      await adminApi.announcementHardDelete(id);
      addNotification('Announcement permanently deleted', 'success');
      load();
    } catch { addNotification('Failed to delete announcement', 'error'); }
    finally { setDeletingId(null); }
  };

  const handleSort = async (id: string, dir: 'up' | 'down') => {
    const idx = data.findIndex((d) => d.id === id);
    const target = dir === 'up' ? idx - 1 : idx + 1;
    if (idx < 0 || target < 0 || target >= data.length) return;
    const current = data[idx];
    const other = data[target];
    const batch: any[] = [{ id: current.id, is_pinned: other.is_pinned }, { id: other.id, is_pinned: current.is_pinned }];
    try {
      await Promise.all(batch.map((b) => adminApi.announcementPin(b.id, b.is_pinned)));
      addNotification('Pin order updated', 'success');
      load();
    } catch { addNotification('Failed to reorder pins', 'error'); }
  };

  const tabs = [
    { key: 'all', label: 'All' },
    { key: 'published', label: 'Published' },
    { key: 'draft', label: 'Draft' },
    { key: 'archived', label: 'Archived' },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <div>
          <h1 className="text-base font-bold text-gray-900">Announcement Management</h1>
          <p className="text-xs text-gray-500">{total} announcements</p>
        </div>
        <button onClick={openCreate} className="px-3 py-1.5 text-xs font-medium bg-orange-500 text-white rounded-lg hover:bg-orange-600">+ Create Announcement</button>
      </div>

      <div className="flex gap-1 mb-3 flex-wrap">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => { setStatusFilter(t.key); setPage(1); }} className={`px-3 py-1 text-xs rounded-full font-medium ${statusFilter === t.key ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
            {t.label}
          </button>
        ))}
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
          {data.map((item: any, idx) => (
            <div key={item.id} className={`bg-white border border-gray-200 rounded-lg p-3 flex items-start justify-between ${item.is_pinned ? 'ring-1 ring-orange-300' : ''}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {item.is_pinned && <span className="text-[10px] text-orange-600 font-medium uppercase">Pinned</span>}
                    <h3 className="text-sm font-semibold text-gray-900 truncate">{item.title}</h3>
                    <span className={`px-1.5 py-0.5 text-[10px] rounded-full ${item.status === 'published' ? 'bg-emerald-50 text-emerald-700' : item.status === 'draft' ? 'bg-gray-100 text-gray-600' : 'bg-amber-50 text-amber-700'}`}>
                      {item.status}
                    </span>
                    {item.linked_survey_id && <span className="text-[10px] text-orange-600 font-medium">Has Survey</span>}
                  </div>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.content}</p>
                  <p className="text-[10px] text-gray-400 mt-1">By {item.user?.email || 'Admin'} &middot; {item.created_at ? new Date(item.created_at).toLocaleDateString() : ''}</p>
                </div>
              <div className="flex flex-col gap-1 ml-3 shrink-0">
                <div className="flex justify-end gap-1.5">
                  {item.status === 'draft' && <button onClick={() => handlePublish(item.id)} className="text-[10px] text-emerald-600 hover:underline font-medium">Publish</button>}
                  {item.status === 'archived' && <button onClick={() => handleRestore(item)} className="text-[10px] text-blue-600 hover:underline font-medium">Restore</button>}
                  <button onClick={() => openEdit(item)} className="text-[10px] text-gray-600 hover:underline font-medium">Edit</button>
                </div>
                <div className="flex justify-end gap-1.5">
                  {item.is_pinned && (
                    <span className="flex gap-1">
                      <button onClick={() => handleSort(item.id, 'up')} disabled={idx === 0} className="text-[10px] text-gray-400 hover:text-gray-700 font-medium disabled:opacity-30">Up</button>
                      <button onClick={() => handleSort(item.id, 'down')} disabled={idx === data.length - 1 || !data[idx + 1]?.is_pinned} className="text-[10px] text-gray-400 hover:text-gray-700 font-medium disabled:opacity-30">Down</button>
                    </span>
                  )}
                  <button onClick={() => handlePin(item)} className="text-[10px] text-orange-600 hover:underline font-medium">{item.is_pinned ? 'Unpin' : 'Pin'}</button>
                  {item.status === 'archived' ? (
                    <button onClick={() => { if (window.confirm('Permanently delete this announcement? This cannot be undone.')) handleHardDelete(item.id); }} disabled={deletingId === item.id} className="text-[10px] text-red-600 hover:underline font-medium">Delete</button>
                  ) : (
                    <button onClick={() => handleArchive(item.id)} className="text-[10px] text-red-600 hover:underline font-medium">Archive</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {total > limit && (
        <div className="flex items-center justify-center gap-3 mt-4">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 text-xs font-medium bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-40">Prev</button>
          <span className="text-xs text-gray-500">Page {page} of {Math.ceil(total / limit)}</span>
          <button onClick={() => setPage((p) => p + 1)} disabled={page >= Math.ceil(total / limit)} className="px-3 py-1 text-xs font-medium bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-40">Next</button>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 pt-10 overflow-y-auto" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-xl max-w-2xl w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-sm font-bold text-gray-900 mb-4">{editId ? 'Edit Announcement' : 'Create Announcement'}</h2>
            <form onSubmit={handleSave} className="space-y-3">
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Title *</label><input type="text" value={form.title} onChange={(e) => setForm((f: any) => ({ ...f, title: e.target.value }))} className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-orange-400 w-full" required /></div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Content *</label><textarea value={form.content} onChange={(e) => setForm((f: any) => ({ ...f, content: e.target.value }))} className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-orange-400 w-full" rows={5} required /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Image URL</label><input type="url" value={form.image_url} onChange={(e) => setForm((f: any) => ({ ...f, image_url: e.target.value }))} className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-orange-400 w-full" /></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Document URL</label><input type="url" value={form.document_url} onChange={(e) => setForm((f: any) => ({ ...f, document_url: e.target.value }))} className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-orange-400 w-full" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Link to Survey <span className="text-gray-400 font-normal">(optional)</span></label>
                  <select value={form.linked_survey_id} onChange={(e) => setForm((f: any) => ({ ...f, linked_survey_id: e.target.value }))} className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-orange-400 w-full">
                    <option value="">No survey linked</option>
                    {availableSurveys.map((s: any) => <option key={s.id} value={s.id}>{s.title}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-4 pt-5">
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer"><input type="checkbox" checked={form.is_pinned} onChange={(e) => setForm((f: any) => ({ ...f, is_pinned: e.target.checked }))} className="w-3.5 h-3.5 text-orange-500" /> Pin Announcement</label>
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer"><input type="checkbox" checked={form.send_to_all} onChange={(e) => setForm((f: any) => ({ ...f, send_to_all: e.target.checked }))} className="w-3.5 h-3.5 text-orange-500" /> Send to All</label>
                </div>
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
