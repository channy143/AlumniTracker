import { useState, useEffect } from 'react';
import { employmentApi } from '@/services/api';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

export default function EmploymentPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [records, setRecords] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    company_name: '',
    position: '',
    employment_type: 'Full-Time',
    start_date: '',
    end_date: '',
    description: '',
    is_current: false,
  });

  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = async () => {
    try {
      setLoading(true);
      const data = await employmentApi.list();
      setRecords(data);
    } catch {
      setError('Failed to load employment history');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setForm({ company_name: '', position: '', employment_type: 'Full-Time', start_date: '', end_date: '', description: '', is_current: false });
    setShowModal(true);
  };

  const openEdit = (r: any) => {
    setEditingId(r.id);
    setForm({
      company_name: r.company_name || '',
      position: r.position || '',
      employment_type: r.employment_type || 'Full-Time',
      start_date: r.start_date || '',
      end_date: r.end_date || '',
      description: r.description || '',
      is_current: r.is_current || false,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      if (editingId) {
        await employmentApi.update(editingId, form);
      } else {
        await employmentApi.create(form);
      }
      setShowModal(false);
      loadRecords();
    } catch {
      setError('Failed to save employment record');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this employment record?')) return;
    try {
      await employmentApi.delete(id);
      loadRecords();
    } catch {
      setError('Failed to delete record');
    }
  };

  const current = records.find((r) => r.is_current);
  const totalPositions = records.length;
  const totalYears = records.reduce((acc, r) => {
    if (r.is_current) {
      const start = new Date(r.start_date);
      return acc + (new Date().getFullYear() - start.getFullYear());
    }
    if (r.start_date && r.end_date) {
      return acc + (new Date(r.end_date).getFullYear() - new Date(r.start_date).getFullYear());
    }
    return acc;
  }, 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <div><h1 className="section-title">Employment History</h1><p className="text-gray-500 mt-1">Loading...</p></div>
        <div className="animate-pulse space-y-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="card h-24" />)}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div><h1 className="section-title">Employment History</h1></div>
        <div className="card text-center py-12">
          <p className="text-red-600">{error}</p>
          <button onClick={loadRecords} className="btn-primary mt-4">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="section-title">Employment History</h1>
          <p className="text-gray-500 mt-1">Track your career journey and professional growth</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <PlusIcon className="w-4 h-4" /> Add Employment
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="card text-center">
          <p className="text-3xl font-bold text-ctu-teal">{current ? 'Employed' : '---'}</p>
          <p className="text-sm text-gray-500 mt-1">Current Status</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-ctu-blue">{totalPositions}</p>
          <p className="text-sm text-gray-500 mt-1">Total Positions</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-ctu-gold">{totalYears}yrs</p>
          <p className="text-sm text-gray-500 mt-1">Total Experience</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-ctu-charcoal">{current?.employment_type || '---'}</p>
          <p className="text-sm text-gray-500 mt-1">Current Industry</p>
        </div>
      </div>

      {records.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-400">No employment records yet. Add your first position!</p>
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200" />
          <div className="space-y-8">
            {records.map((job) => (
              <div key={job.id} className="relative pl-16 group">
                <div className={`absolute left-4 w-9 h-9 rounded-full border-4 flex items-center justify-center ${job.is_current ? 'bg-ctu-teal border-green-100' : 'bg-white border-gray-200'}`}>
                  <div className={`w-3 h-3 rounded-full ${job.is_current ? 'bg-white' : 'bg-gray-400'}`} />
                </div>
                <div className="card">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-ctu-charcoal">{job.position}</h3>
                      <p className="text-ctu-blue font-medium">{job.company_name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(job)} className="p-1 text-gray-400 hover:text-ctu-blue transition-colors"><PencilIcon className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(job.id)} className="p-1 text-gray-400 hover:text-red-500 transition-colors"><TrashIcon className="w-4 h-4" /></button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">{job.description}</p>
                  <div className="flex items-center gap-4 mt-3 text-sm text-gray-400">
                    <span>{job.start_date ? new Date(job.start_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : ''} - {job.is_current ? 'Present' : job.end_date ? new Date(job.end_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : ''}</span>
                    <span className="px-2 py-1 bg-ctu-blue/10 text-ctu-blue text-xs rounded-full">{job.employment_type}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl max-w-lg w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-semibold text-ctu-charcoal mb-4">{editingId ? 'Edit Employment' : 'Add Employment'}</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm text-gray-500 mb-1">Company</label>
                  <input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-ctu-blue/20 focus:border-ctu-blue outline-none" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm text-gray-500 mb-1">Position</label>
                  <input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-ctu-blue/20 focus:border-ctu-blue outline-none" />
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Type</label>
                  <select value={form.employment_type} onChange={(e) => setForm({ ...form, employment_type: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-ctu-blue/20 focus:border-ctu-blue outline-none">
                    <option>Full-Time</option>
                    <option>Part-Time</option>
                    <option>Contract</option>
                    <option>Freelance</option>
                    <option>Internship</option>
                  </select>
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.is_current} onChange={(e) => setForm({ ...form, is_current: e.target.checked })} className="rounded" />
                    <span className="text-sm text-gray-600">Current position</span>
                  </label>
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Start Date</label>
                  <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-ctu-blue/20 focus:border-ctu-blue outline-none" />
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">End Date</label>
                  <input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} disabled={form.is_current} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-ctu-blue/20 focus:border-ctu-blue outline-none disabled:bg-gray-50 disabled:text-gray-400" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm text-gray-500 mb-1">Description</label>
                  <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-ctu-blue/20 focus:border-ctu-blue outline-none" />
                </div>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
