import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '@/services/api';
import { useUIStore } from '@/store/uiStore';

export default function EmployerManagement() {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', industry: '', website: '', description: '', city: '', province: '', contact_email: '', contact_phone: '' });
  const [editId, setEditId] = useState<string | null>(null);
  const addNotification = useUIStore((s) => s.addNotification);
  const limit = 15;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.companyList({ page, limit, search });
      setData(res.data);
      setTotal(res.total);
    } catch { addNotification('Failed to load companies', 'error'); }
    finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editId) await adminApi.companyUpdate(editId, form);
    else await adminApi.companyCreate(form);
    setShowForm(false); setEditId(null);
    setForm({ name: '', industry: '', website: '', description: '', city: '', province: '', contact_email: '', contact_phone: '' });
    addNotification(editId ? 'Company updated' : 'Company created', 'success');
    load();
  };

  const handleVerify = async (id: string) => {
    await adminApi.companyVerify(id);
    addNotification('Company verified', 'success');
    load();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Deactivate this company?')) return;
    await adminApi.companyDelete(id);
    addNotification('Company deactivated', 'success');
    load();
  };

  const openEdit = (item: any) => {
    setForm({ name: item.name, industry: item.industry || '', website: item.website || '', description: item.description || '', city: item.city || '', province: item.province || '', contact_email: item.contact_email || '', contact_phone: item.contact_phone || '' });
    setEditId(item.id);
    setShowForm(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="section-title">Employer Management</h1>
          <p className="text-gray-500 mt-1">{total} companies</p>
        </div>
        <button onClick={() => { setShowForm(true); setEditId(null); setForm({ name: '', industry: '', website: '', description: '', city: '', province: '', contact_email: '', contact_phone: '' }); }} className="btn-primary text-sm">+ Add Company</button>
      </div>

      <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search companies..." className="input-field max-w-xs text-sm" />

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="card animate-pulse h-16" />)}</div>
      ) : data.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">No companies found</div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Company</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Industry</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">City</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Contact</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Verified</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.map((item: any) => (
                  <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-ctu-charcoal">{item.name}</td>
                    <td className="py-3 px-4 text-gray-500">{item.industry || '---'}</td>
                    <td className="py-3 px-4 text-gray-500">{item.city || '---'}</td>
                    <td className="py-3 px-4 text-gray-500 text-xs">{item.contact_email || '---'}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 text-xs rounded-full ${item.is_verified ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
                        {item.is_verified ? 'Verified' : 'Pending'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => openEdit(item)} className="text-xs text-ctu-blue hover:underline px-1">Edit</button>
                        {!item.is_verified && <button onClick={() => handleVerify(item.id)} className="text-xs text-green-600 hover:underline px-1">Verify</button>}
                        <button onClick={() => handleDelete(item.id)} className="text-xs text-red-600 hover:underline px-1">Deactivate</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-xl max-w-lg w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-ctu-charcoal mb-6">{editId ? 'Edit Company' : 'Add Company'}</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div><label className="block text-sm font-medium text-ctu-charcoal mb-1">Company Name *</label><input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="input-field" required /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-ctu-charcoal mb-1">Industry</label><input type="text" value={form.industry} onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))} className="input-field" /></div>
                <div><label className="block text-sm font-medium text-ctu-charcoal mb-1">Website</label><input type="url" value={form.website} onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))} className="input-field" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-ctu-charcoal mb-1">City</label><input type="text" value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} className="input-field" /></div>
                <div><label className="block text-sm font-medium text-ctu-charcoal mb-1">Province</label><input type="text" value={form.province} onChange={(e) => setForm((f) => ({ ...f, province: e.target.value }))} className="input-field" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-ctu-charcoal mb-1">Contact Email</label><input type="email" value={form.contact_email} onChange={(e) => setForm((f) => ({ ...f, contact_email: e.target.value }))} className="input-field" /></div>
                <div><label className="block text-sm font-medium text-ctu-charcoal mb-1">Contact Phone</label><input type="text" value={form.contact_phone} onChange={(e) => setForm((f) => ({ ...f, contact_phone: e.target.value }))} className="input-field" /></div>
              </div>
              <div><label className="block text-sm font-medium text-ctu-charcoal mb-1">Description</label><textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="input-field" rows={3} /></div>
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
