import { useState, useEffect } from 'react';
import { adminApi } from '@/services/api';
import { useUIStore } from '@/store/uiStore';

const questionTypes = ['mcq', 'rating', 'text', 'scale'] as const;

export default function SurveyManagement() {
  const [surveys, setSurveys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', description: '', questions: [{ type: 'text', title: '', options: [''] }] });
  const [responses, setResponses] = useState<any>(null);
  const addNotification = useUIStore((s) => s.addNotification);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try { setSurveys(await adminApi.surveyList()); }
    catch { addNotification('Failed to load surveys', 'error'); }
    finally { setLoading(false); }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editId) await adminApi.surveyUpdate(editId, form);
      else await adminApi.surveyCreate(form);
      setShowForm(false); setEditId(null);
      setForm({ title: '', description: '', questions: [{ type: 'text', title: '', options: [''] }] });
      addNotification(editId ? 'Survey updated' : 'Survey created', 'success');
      load();
    } catch { addNotification('Failed to save survey', 'error'); }
  };

  const handleToggle = async (id: string, active: boolean) => {
    if (active) await adminApi.surveyDeactivate(id);
    else await adminApi.surveyActivate(id);
    addNotification(active ? 'Survey deactivated' : 'Survey activated', 'success');
    load();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this survey?')) return;
    await adminApi.surveyDelete(id);
    addNotification('Survey deleted', 'success');
    load();
  };

  const handleViewResponses = async (id: string) => {
    try {
      const res = await adminApi.surveyResponses(id, { page: 1, limit: 100 });
      setResponses(res);
    } catch { addNotification('Failed to load responses', 'error'); }
  };

  const addQuestion = () => setForm((f) => ({ ...f, questions: [...f.questions, { type: 'text', title: '', options: [''] }] }));
  const removeQuestion = (i: number) => setForm((f) => ({ ...f, questions: f.questions.filter((_: any, idx: number) => idx !== i) }));
  const updateQuestion = (i: number, field: string, value: any) => setForm((f) => {
    const qs = [...f.questions];
    qs[i] = { ...qs[i], [field]: value };
    return { ...f, questions: qs };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="section-title">Survey Management</h1>
          <p className="text-gray-500 mt-1">{surveys.length} surveys</p>
        </div>
        <button onClick={() => { setShowForm(true); setEditId(null); setForm({ title: '', description: '', questions: [{ type: 'text', title: '', options: [''] }] }); }} className="btn-primary text-sm">+ Create Survey</button>
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="card animate-pulse h-24" />)}</div>
      ) : surveys.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">No surveys yet</div>
      ) : (
        <div className="grid gap-4">
          {surveys.map((s: any) => (
            <div key={s.id} className="card flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-ctu-charcoal">{s.title}</h3>
                <p className="text-sm text-gray-400 mt-1">{s.description || 'No description'}</p>
                <div className="flex gap-3 mt-2 text-xs text-gray-400">
                  <span>{s.questions?.length || 0} questions</span>
                  <span>{s.responseCount || 0} responses</span>
                  <span className={s.is_active ? 'text-green-600' : 'text-yellow-600'}>{s.is_active ? 'Active' : 'Inactive'}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleViewResponses(s.id)} className="text-xs text-ctu-blue hover:underline">Responses</button>
                <button onClick={() => handleToggle(s.id, s.is_active)} className="text-xs text-orange-600 hover:underline">{s.is_active ? 'Deactivate' : 'Activate'}</button>
                <button onClick={() => handleDelete(s.id)} className="text-xs text-red-600 hover:underline">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 pt-10 overflow-y-auto" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-xl max-w-2xl w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-ctu-charcoal mb-6">{editId ? 'Edit Survey' : 'Create Survey'}</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div><label className="block text-sm font-medium text-ctu-charcoal mb-1">Title *</label><input type="text" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className="input-field" required /></div>
              <div><label className="block text-sm font-medium text-ctu-charcoal mb-1">Description</label><textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="input-field" rows={2} /></div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-ctu-charcoal">Questions</label>
                  <button type="button" onClick={addQuestion} className="text-xs text-ctu-blue hover:underline">+ Add Question</button>
                </div>
                {form.questions.map((q: any, i: number) => (
                  <div key={i} className="border border-gray-200 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">Q{i + 1}</span>
                      {form.questions.length > 1 && <button type="button" onClick={() => removeQuestion(i)} className="text-xs text-red-500">Remove</button>}
                    </div>
                    <input type="text" value={q.title} onChange={(e) => updateQuestion(i, 'title', e.target.value)} placeholder="Question text" className="input-field text-sm" />
                    <select value={q.type} onChange={(e) => updateQuestion(i, 'type', e.target.value)} className="input-field text-sm">
                      {questionTypes.map((t) => <option key={t} value={t}>{t.toUpperCase()}</option>)}
                    </select>
                    {(q.type === 'mcq' || q.type === 'scale') && (
                      <div className="space-y-1">
                        {(q.options || ['']).map((opt: string, oi: number) => (
                          <div key={oi} className="flex gap-2 items-center">
                            <input type="text" value={opt} onChange={(e) => {
                              const opts = [...(form.questions[i].options || [''])];
                              opts[oi] = e.target.value;
                              updateQuestion(i, 'options', opts);
                            }} placeholder={`Option ${oi + 1}`} className="input-field text-sm flex-1" />
                            {oi > 0 && <button type="button" onClick={() => {
                              const opts = form.questions[i].options.filter((_: any, idx: number) => idx !== oi);
                              updateQuestion(i, 'options', opts);
                            }} className="text-xs text-red-500">&times;</button>}
                          </div>
                        ))}
                        <button type="button" onClick={() => {
                          const opts = [...(form.questions[i].options || []), ''];
                          updateQuestion(i, 'options', opts);
                        }} className="text-xs text-ctu-blue hover:underline">+ Add Option</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">{editId ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {responses && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setResponses(null)}>
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-ctu-charcoal">Responses ({responses.total || responses.data?.length || 0})</h2>
              <button onClick={() => setResponses(null)} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            {(responses.data || []).length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">No responses yet</p>
            ) : (
              <div className="space-y-3">
                {(responses.data || []).map((r: any) => (
                  <div key={r.id} className="border-b border-gray-100 pb-3">
                    <p className="text-xs text-gray-400">{r.user?.email} &middot; {new Date(r.submitted_at).toLocaleString()}</p>
                    <p className="text-sm mt-1">{JSON.stringify(r.responses)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
