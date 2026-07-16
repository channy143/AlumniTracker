import { useState, useEffect } from 'react';
import { adminApi } from '@/services/api';
import { useUIStore } from '@/store/uiStore';

const questionTypes = ['mcq', 'rating', 'text', 'scale'] as const;

export default function GraduateTracerSurveys() {
  const [tab, setTab] = useState<'current' | 'previous' | 'completion' | 'responses'>('current');
  const [surveys, setSurveys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', description: '', questions: [{ type: 'text', title: '', options: [''] }] });
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

  const tabs = [
    { key: 'current', label: 'Current Survey' },
    { key: 'previous', label: 'Previous Years' },
    { key: 'completion', label: 'Survey Completion' },
    { key: 'responses', label: 'Response Rate' },
  ] as const;

  const activeSurvey = surveys.find((s) => s.is_active);
  const pastSurveys = surveys.filter((s) => !s.is_active);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="mb-4"><div className="h-5 w-48 bg-gray-200 animate-pulse rounded mb-1" /><div className="h-3 w-32 bg-gray-200 animate-pulse rounded" /></div>
        <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-24 bg-gray-200 animate-pulse rounded-lg" />)}</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-4">
        <h1 className="text-base font-bold text-gray-900">Graduate Tracer Surveys</h1>
        <p className="text-xs text-gray-500">Track graduate outcomes and employment data.</p>
      </div>

      <div className="flex items-center gap-1 mb-3 bg-white border border-gray-200 rounded-lg p-1">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${tab === t.key ? 'bg-orange-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
        <button onClick={() => { setShowForm(true); setEditId(null); setForm({ title: '', description: '', questions: [{ type: 'text', title: '', options: [''] }] }); }}
          className="ml-auto px-3 py-1.5 text-xs font-medium bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors">
          + New Survey
        </button>
      </div>

      {tab === 'current' && (
        <div className="space-y-3">
          {activeSurvey ? (
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold text-gray-900">{activeSurvey.title}</h2>
                <span className="px-2 py-0.5 bg-green-50 text-green-700 text-[10px] font-medium rounded-full">Active</span>
              </div>
              <p className="text-xs text-gray-600 mb-3">{activeSurvey.description}</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-orange-500 rounded-full" style={{ width: `${Math.min(100, Math.round((activeSurvey.response_count || 0) / Math.max((activeSurvey.target_count || 1), 1) * 100))}%` }} />
                </div>
                <span className="text-xs text-gray-500">{activeSurvey.response_count || 0} responses</span>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <button onClick={() => adminApi.surveyDeactivate(activeSurvey.id).then(load)} className="text-xs text-gray-500 hover:text-gray-700">Deactivate</button>
                <button onClick={() => { setEditId(activeSurvey.id); setForm({ title: activeSurvey.title, description: activeSurvey.description, questions: activeSurvey.questions || [{ type: 'text', title: '', options: [''] }] }); setShowForm(true); }} className="text-xs text-orange-600 hover:text-orange-700">Edit</button>
                <button onClick={() => handleDelete(activeSurvey.id)} className="text-xs text-red-500 hover:text-red-700">Delete</button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-sm text-gray-500 bg-white border border-gray-200 rounded-lg">No active survey. Create one to start collecting responses.</div>
          )}
        </div>
      )}

      {tab === 'previous' && (
        <div className="space-y-2">
          {pastSurveys.length === 0 ? (
            <div className="text-center py-12 text-sm text-gray-500 bg-white border border-gray-200 rounded-lg">No previous surveys.</div>
          ) : pastSurveys.map((s) => (
            <div key={s.id} className="bg-white border border-gray-200 rounded-lg px-4 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{s.title}</p>
                  <p className="text-xs text-gray-500">{s.response_count || 0} responses</p>
                </div>
                <button onClick={() => handleDelete(s.id)} className="text-xs text-red-500 hover:text-red-700">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'completion' && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900">Survey Completion</h2>
            <button className="text-xs font-medium text-orange-600 hover:text-orange-700">Export Responses</button>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative w-24 h-24">
              <svg className="w-24 h-24 -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="#f97316" strokeWidth="3"
                  strokeDasharray={`${surveys.length > 0 ? Math.round(((activeSurvey?.response_count || 0) / Math.max(activeSurvey?.target_count || 1, 1)) * 100) : 0} ${100}`}
                  strokeLinecap="round" />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-orange-600">
                {surveys.length > 0 ? Math.round(((activeSurvey?.response_count || 0) / Math.max(activeSurvey?.target_count || 1, 1)) * 100) : 0}%
              </span>
            </div>
            <div className="text-xs text-gray-600 space-y-1">
              <p>Total Responses: {activeSurvey?.response_count || 0}</p>
              <p>Target: {activeSurvey?.target_count || 0}</p>
              <p>Questions: {activeSurvey?.questions?.length || 0}</p>
            </div>
          </div>
        </div>
      )}

      {tab === 'responses' && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Response Rate Over Time</h2>
          <p className="text-xs text-gray-400 text-center py-8">Response rate data will appear here as surveys are completed.</p>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-lg p-4 w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-sm font-bold text-gray-900 mb-3">{editId ? 'Edit Survey' : 'New Survey'}</h2>
            <form onSubmit={handleSave} className="space-y-3">
              <input required placeholder="Survey title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-orange-400" />
              <textarea required placeholder="Survey description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-orange-400" rows={3} />
              <p className="text-xs font-medium text-gray-700">Questions</p>
              {form.questions.map((q, i) => (
                <div key={i} className="border border-gray-200 rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <input required placeholder={`Question ${i + 1}`} value={q.title} onChange={(e) => {
                      const qs = [...form.questions]; qs[i] = { ...qs[i], title: e.target.value }; setForm({ ...form, questions: qs });
                    }} className="flex-1 text-xs border border-gray-200 rounded px-2 py-1 outline-none focus:border-orange-400" />
                    <select value={q.type} onChange={(e) => {
                      const qs = [...form.questions]; qs[i] = { ...qs[i], type: e.target.value, options: e.target.value === 'mcq' ? [''] : [] }; setForm({ ...form, questions: qs });
                    }} className="text-xs border border-gray-200 rounded px-2 py-1 outline-none">
                      {questionTypes.map((t) => <option key={t} value={t}>{t.toUpperCase()}</option>)}
                    </select>
                    <button type="button" onClick={() => setForm({ ...form, questions: form.questions.filter((_, j) => j !== i) })}
                      className="text-xs text-red-500 hover:text-red-700">&times;</button>
                  </div>
                  {q.type === 'mcq' && (
                    <div className="space-y-1 pl-2">
                      {(q.options || ['']).map((opt, oi) => (
                        <div key={oi} className="flex items-center gap-1">
                          <input placeholder={`Option ${oi + 1}`} value={opt} onChange={(e) => {
                            const qs = [...form.questions]; const opts = [...(qs[i].options || [''])];
                            opts[oi] = e.target.value; qs[i] = { ...qs[i], options: opts }; setForm({ ...form, questions: qs });
                          }} className="flex-1 text-xs border border-gray-200 rounded px-2 py-1 outline-none focus:border-orange-400" />
                          <button type="button" onClick={() => {
                            const qs = [...form.questions]; qs[i] = { ...qs[i], options: qs[i].options.filter((_: any, j: number) => j !== oi) }; setForm({ ...form, questions: qs });
                          }} className="text-xs text-red-400">&times;</button>
                        </div>
                      ))}
                      <button type="button" onClick={() => {
                        const qs = [...form.questions]; qs[i] = { ...qs[i], options: [...(qs[i].options || []), ''] }; setForm({ ...form, questions: qs });
                      }} className="text-xs text-orange-600 hover:text-orange-700">+ Add option</button>
                    </div>
                  )}
                </div>
              ))}
              <button type="button" onClick={() => setForm({ ...form, questions: [...form.questions, { type: 'text', title: '', options: [''] }] })}
                className="text-xs font-medium text-orange-600 hover:text-orange-700">+ Add Question</button>
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
