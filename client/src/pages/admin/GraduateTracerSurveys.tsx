import { useState, useEffect, useRef } from 'react';
import { adminApi } from '@/services/api';
import { useUIStore } from '@/store/uiStore';
import { generateYears } from '@/utils/helpers';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  published: 'bg-emerald-100 text-emerald-700',
  closed: 'bg-red-100 text-red-700',
};

export default function GraduateTracerSurveys() {
  const [surveys, setSurveys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [batchFilter, setBatchFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedSurvey, setSelectedSurvey] = useState<any>(null);
  const [detailTab, setDetailTab] = useState<'overview' | 'responses' | 'analytics' | 'settings'>('overview');
  const addNotification = useUIStore((s) => s.addNotification);
  const years = generateYears(2014, new Date().getFullYear()).map(String);

  const load = async (filters?: Record<string, string>) => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filters?.status) params.status = filters.status;
      if (filters?.year) params.academic_year = filters.year;
      if (filters?.batch) params.target_batch = filters.batch;
      setSurveys(await adminApi.surveyList(params));
    } catch { addNotification('Failed to load surveys', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const params: Record<string, string> = {};
    if (statusFilter) params.status = statusFilter;
    if (yearFilter) params.year = yearFilter;
    if (batchFilter) params.batch = batchFilter;
    load(params);
  }, [statusFilter, yearFilter, batchFilter]);

  const handleCreate = async (data: any) => {
    try {
      await adminApi.surveyCreate(data);
      setShowCreate(false);
      addNotification('Survey created', 'success');
      load();
    } catch (err: any) { addNotification(err.message || 'Failed to create survey', 'error'); }
  };

  const handleClose = async (id: string) => {
    try {
      await adminApi.surveyClose(id);
      addNotification('Survey closed', 'success');
      if (selectedSurvey?.id === id) setSelectedSurvey((prev: any) => ({ ...prev, is_active: false, is_closed: true, status: 'closed' }));
      load();
    } catch { addNotification('Failed to close survey', 'error'); }
  };

  const handleDuplicate = async (id: string) => {
    try {
      await adminApi.surveyDuplicate(id);
      addNotification('Survey duplicated', 'success');
      load();
    } catch { addNotification('Failed to duplicate survey', 'error'); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this survey permanently?')) return;
    try {
      await adminApi.surveyDelete(id);
      addNotification('Survey deleted', 'success');
      if (selectedSurvey?.id === id) setSelectedSurvey(null);
      load();
    } catch { addNotification('Failed to delete survey', 'error'); }
  };

  const handleExport = (id: string) => {
    adminApi.surveyExportResponses(id).then((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `survey-responses.csv`; a.click();
      URL.revokeObjectURL(url);
    });
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.csv';
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (file) addNotification('Import feature ready — upload CSV to process responses', 'success');
    };
    input.click();
  };

  const handleDownloadTemplate = () => {
    const headers = ['Name', 'Email', 'Employment Status', 'Industry', 'Position', 'Course Alignment', 'Satisfaction', 'Suggestions'];
    const csv = headers.join(',');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'tracer-survey-template.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = surveys.filter((s) =>
    !search || s.title.toLowerCase().includes(search.toLowerCase())
  );

  const SurveyCard = ({ survey }: { survey: any }) => (
    <div className="bg-white border border-gray-200 hover:shadow-md transition-shadow">
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">{survey.title}</h3>
            <p className="text-[10px] text-gray-400 mt-0.5">
              {survey.academic_year && `${survey.academic_year} • `}
              {survey.target_type === 'batch' ? `Batch ${survey.target_value}` : survey.target_type === 'course' ? survey.target_value : 'All Alumni'}
            </p>
          </div>
          <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${STATUS_COLORS[survey.status] || 'bg-gray-100 text-gray-600'}`}>
            {survey.status === 'published' ? 'Active' : survey.status === 'closed' ? 'Closed' : 'Draft'}
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs text-gray-600 mb-3">
          <div className="flex-1 bg-gray-50 rounded-lg p-2 text-center">
            <p className="text-xs font-bold text-gray-900">{survey.responseCount || 0}</p>
            <p className="text-[10px] text-gray-500">Responses</p>
          </div>
          {survey.target_count > 0 && (
            <div className="flex-1 bg-gray-50 rounded-lg p-2 text-center">
              <p className="text-xs font-bold text-gray-900">
                {survey.target_count ? Math.round(((survey.responseCount || 0) / survey.target_count) * 100) : 0}%
              </p>
              <p className="text-[10px] text-gray-500">Rate</p>
            </div>
          )}
          <div className="flex-1 bg-gray-50 rounded-lg p-2 text-center">
            <p className="text-xs font-bold text-gray-900">{survey.starts_at ? new Date(survey.starts_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}</p>
            <p className="text-[10px] text-gray-500">Open</p>
          </div>
          <div className="flex-1 bg-gray-50 rounded-lg p-2 text-center">
            <p className="text-xs font-bold text-gray-900">{survey.expires_at ? new Date(survey.expires_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}</p>
            <p className="text-[10px] text-gray-500">Close</p>
          </div>
        </div>

        {survey.description && (
          <p className="text-[11px] text-gray-500 mb-3 line-clamp-2">{survey.description}</p>
        )}

        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mb-3">
          <div className="h-full bg-orange-500 rounded-full transition-all" style={{ width: `${survey.target_count ? Math.min(100, Math.round(((survey.responseCount || 0) / survey.target_count) * 100)) : 0}%` }} />
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <button onClick={() => { setSelectedSurvey(survey); setDetailTab('overview'); }} className="px-2.5 py-1 text-[10px] font-medium bg-orange-50 text-orange-600 rounded-md hover:bg-orange-100">View</button>
          <button onClick={() => handleExport(survey.id)} className="px-2.5 py-1 text-[10px] font-medium bg-gray-50 text-gray-600 rounded-md hover:bg-gray-100">Export</button>
          {survey.status === 'draft' && (
            <button onClick={async () => { try { await adminApi.surveyActivate(survey.id); addNotification('Survey published!', 'success'); load(); } catch (err: any) { addNotification(err.message || 'Failed to publish', 'error'); } }} className="px-2.5 py-1 text-[10px] font-medium bg-emerald-50 text-emerald-600 rounded-md hover:bg-emerald-100">Publish</button>
          )}
          {survey.status === 'published' && (
            <button onClick={() => handleClose(survey.id)} className="px-2.5 py-1 text-[10px] font-medium bg-red-50 text-red-600 rounded-md hover:bg-red-100">Close</button>
          )}
          <button onClick={() => handleDuplicate(survey.id)} className="px-2.5 py-1 text-[10px] font-medium bg-gray-50 text-gray-600 rounded-md hover:bg-gray-100">Duplicate</button>
          <button onClick={() => handleDelete(survey.id)} className="px-2.5 py-1 text-[10px] font-medium bg-red-50 text-red-500 rounded-md hover:bg-red-100">Delete</button>
        </div>
      </div>
    </div>
  );

  if (selectedSurvey) {
    const survey = selectedSurvey;
    return (
      <div className="max-w-6xl mx-auto">
        <button onClick={() => setSelectedSurvey(null)} className="text-xs text-orange-600 hover:text-orange-700 mb-3 flex items-center gap-1 font-medium">&larr; Back to Surveys</button>

        <div className="bg-white border border-gray-200 mb-4">
          <div className="p-5">
            <div className="flex items-start justify-between gap-2 mb-1">
              <div>
                <h1 className="text-base font-bold text-gray-900">{survey.title}</h1>
                <p className="text-xs text-gray-400 mt-0.5">
                  {survey.academic_year && `${survey.academic_year} • `}
                  {survey.target_type === 'batch' ? `Batch ${survey.target_value}` : survey.target_type === 'course' ? survey.target_value : 'All Alumni'}
                </p>
              </div>
              <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${STATUS_COLORS[survey.status] || 'bg-gray-100 text-gray-600'}`}>
                {survey.status === 'published' ? 'Active' : survey.status === 'closed' ? 'Closed' : 'Draft'}
              </span>
            </div>
            {survey.description && <p className="text-xs text-gray-500 mt-2">{survey.description}</p>}

            <div className="flex items-center gap-1 border-b border-gray-200 mt-4 pb-0">
              {(['overview', 'responses', 'analytics', 'settings'] as const).map((t) => (
                <button key={t} onClick={() => setDetailTab(t)}
                  className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors capitalize ${detailTab === t ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        {detailTab === 'overview' && <SurveyOverview survey={survey} />}
        {detailTab === 'responses' && <SurveyResponses survey={survey} />}
        {detailTab === 'analytics' && <SurveyAnalytics surveyId={survey.id} />}
        {detailTab === 'settings' && <SurveySettings survey={survey} onClose={handleClose} onDuplicate={handleDuplicate} onDelete={handleDelete} onUpdate={(data: any) => { setSelectedSurvey((prev: any) => ({ ...prev, ...data })); load(); }} />}
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <div>
          <h1 className="text-base font-bold text-gray-900">Graduate Tracer Surveys</h1>
          <p className="text-xs text-gray-500">Manage annual graduate tracer studies, monitor responses and generate reports.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleDownloadTemplate} className="px-3 py-1.5 text-xs font-medium bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">Download Template</button>
          <button onClick={handleImport} className="px-3 py-1.5 text-xs font-medium bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">Import Responses</button>
          <button onClick={() => setShowCreate(true)} className="px-3 py-1.5 text-xs font-medium bg-orange-500 text-white rounded-lg hover:bg-orange-600">+ Create Survey</button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search..." className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-orange-400 w-44" />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-orange-400">
          <option value="">Status</option>
          <option value="active">Active</option>
          <option value="draft">Draft</option>
          <option value="closed">Closed</option>
        </select>
        <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}
          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-orange-400">
          <option value="">Academic Year</option>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={batchFilter} onChange={(e) => setBatchFilter(e.target.value)}
          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-orange-400">
          <option value="">Target Batch</option>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white border border-gray-200 animate-pulse p-4">
              <div className="h-4 bg-gray-200 rounded w-2/3 mb-3" />
              <div className="h-3 bg-gray-200 rounded w-1/3 mb-4" />
              <div className="flex gap-2 mb-3">
                {[1, 2, 3, 4].map((j) => <div key={j} className="flex-1 h-14 bg-gray-200 rounded" />)}
              </div>
              <div className="h-2 bg-gray-200 rounded w-full mb-3" />
              <div className="flex gap-1">
                {[1, 2, 3].map((j) => <div key={j} className="h-6 bg-gray-200 rounded w-12" />)}
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-sm text-gray-500 bg-white border border-gray-200 rounded-lg">
          {search || statusFilter || yearFilter || batchFilter ? 'No surveys match your filters' : 'No surveys yet. Create one to start collecting tracer data.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((s) => <SurveyCard key={s.id} survey={s} />)}
        </div>
      )}

      {showCreate && <CreateSurveyModal onClose={() => setShowCreate(false)} onCreate={handleCreate} />}
    </div>
  );
}

function CreateSurveyModal({ onClose, onCreate }: { onClose: () => void; onCreate: (data: any) => void }) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    notes: '',
    academic_year: String(new Date().getFullYear()),
    target_type: 'all',
    target_value: '',
    opens_at: '',
    closes_at: '',
    status: 'draft',
  });
  const years = generateYears(2014, new Date().getFullYear() + 1).map(String);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate({
      ...form,
      target_value: form.target_type === 'batch' ? form.target_value : form.target_type === 'course' ? form.target_value : null,
      opens_at: form.opens_at ? new Date(form.opens_at).toISOString() : null,
      closes_at: form.closes_at ? new Date(form.closes_at).toISOString() : null,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white w-full max-w-[900px] max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-sm font-bold text-gray-900">Create Graduate Tracer Survey</h2>
            <p className="text-xs text-gray-500 mt-0.5">Create a new survey period for alumni.</p>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Survey Information</p>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Survey Title *</label>
                  <input type="text" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g. Graduate Tracer Study 2026"
                    className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-orange-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                  <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Brief description of this survey cycle."
                    className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-orange-400" rows={3} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Survey Notes <span className="text-gray-400 font-normal">(Optional, only visible to administrators)</span></label>
                  <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Internal notes about this survey."
                    className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-orange-400" rows={2} />
                </div>

                <div className="border-t border-gray-100 pt-4">
                  <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-3">Standard Graduate Tracer Questionnaire</p>
                  <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                    {[
                      'Personal Information',
                      'Educational Background',
                      'Employment Information',
                      'Employment History',
                      'Skills',
                      'Work Alignment',
                      'Employment Satisfaction',
                      'Graduate Feedback',
                    ].map((section) => (
                      <div key={section} className="flex items-center gap-2 text-xs">
                        <span className="text-emerald-600">&#10003;</span>
                        <span className="text-gray-700">{section}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-gray-400 mt-2">This survey uses the standardized university tracer questionnaire. Questions cannot be modified.</p>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Survey Settings</p>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Academic Year *</label>
                  <select required value={form.academic_year} onChange={(e) => setForm({ ...form, academic_year: e.target.value })}
                    className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-orange-400">
                    {years.map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Target Alumni</label>
                  <select value={form.target_type} onChange={(e) => setForm({ ...form, target_type: e.target.value, target_value: '' })}
                    className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-orange-400">
                    <option value="all">All Alumni</option>
                    <option value="course">Specific Course</option>
                    <option value="batch">Specific Batch</option>
                  </select>
                </div>
                {form.target_type === 'batch' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Graduation Batch</label>
                    <select value={form.target_value} onChange={(e) => setForm({ ...form, target_value: e.target.value })}
                      className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-orange-400">
                      <option value="">Select batch</option>
                      {years.map((y) => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                )}
                {form.target_type === 'course' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Course</label>
                    <select value={form.target_value} onChange={(e) => setForm({ ...form, target_value: e.target.value })}
                      className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-orange-400">
                      <option value="">Select course</option>
                      {['BSIT', 'BIT', 'BEEd', 'BSEd-Math', 'BTLED-HE', 'BTLED-ICT'].map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Opening Date</label>
                    <input type="date" value={form.opens_at} onChange={(e) => setForm({ ...form, opens_at: e.target.value })}
                      className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-orange-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Closing Date</label>
                    <input type="date" value={form.closes_at} onChange={(e) => setForm({ ...form, closes_at: e.target.value })}
                      className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-orange-400" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                  <div className="flex gap-3">
                    <label className="flex items-center gap-1.5 text-xs text-gray-700">
                      <input type="radio" name="status" value="draft" checked={form.status === 'draft'} onChange={(e) => setForm({ ...form, status: e.target.value })} className="accent-orange-500" />
                      Draft
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-gray-700">
                      <input type="radio" name="status" value="published" checked={form.status === 'published'} onChange={(e) => setForm({ ...form, status: e.target.value })} className="accent-orange-500" />
                      Published
                    </label>
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-4">
                  <div className="bg-gray-50 rounded-lg p-3 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Questions</span>
                      <span className="font-medium text-gray-900">24</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Target</span>
                      <span className="font-medium text-gray-900">{form.target_type === 'batch' ? `Batch ${form.target_value || '—'}` : form.target_type === 'course' ? form.target_value || '—' : 'All Alumni'}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Estimated Time</span>
                      <span className="font-medium text-gray-900">8-10 min</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Status</span>
                      <span className="font-medium text-gray-900 capitalize">{form.status}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
            <button type="submit" className="px-4 py-2 text-xs font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600">Create Survey</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SurveyOverview({ survey }: { survey: any }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="bg-white border border-gray-200 p-4">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Survey Status</h3>
        <div className="space-y-2 text-xs">
          <div className="flex justify-between py-1 border-b border-gray-50"><span className="text-gray-500">Status</span><span className={`font-medium capitalize ${survey.status === 'published' ? 'text-emerald-600' : survey.status === 'closed' ? 'text-red-600' : 'text-gray-600'}`}>{survey.status}</span></div>
          <div className="flex justify-between py-1 border-b border-gray-50"><span className="text-gray-500">Response Rate</span><span className="font-medium text-gray-900">{survey.target_count ? `${Math.round(((survey.responseCount || 0) / survey.target_count) * 100)}%` : '—'}</span></div>
          <div className="flex justify-between py-1 border-b border-gray-50"><span className="text-gray-500">Target Alumni</span><span className="font-medium text-gray-900">{survey.target_type === 'batch' ? `Batch ${survey.target_value}` : survey.target_type === 'course' ? survey.target_value || 'All' : 'All Alumni'}</span></div>
          <div className="flex justify-between py-1 border-b border-gray-50"><span className="text-gray-500">Opening Date</span><span className="font-medium text-gray-900">{survey.starts_at ? new Date(survey.starts_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}</span></div>
          <div className="flex justify-between py-1"><span className="text-gray-500">Closing Date</span><span className="font-medium text-gray-900">{survey.expires_at ? new Date(survey.expires_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}</span></div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 p-4">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Response Progress</h3>
        <div className="flex items-center gap-4">
          <div className="relative w-28 h-28 shrink-0">
            <svg className="w-28 h-28 -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15.5" fill="none" stroke="#e5e7eb" strokeWidth="3" />
              <circle cx="18" cy="18" r="15.5" fill="none" stroke="#f97316" strokeWidth="3"
                strokeDasharray={`${survey.target_count ? Math.min(100, Math.round(((survey.responseCount || 0) / survey.target_count) * 100)) : 0} ${100}`}
                strokeLinecap="round" />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-orange-600">
              {survey.target_count ? Math.round(((survey.responseCount || 0) / survey.target_count) * 100) : 0}%
            </span>
          </div>
          <div className="text-xs text-gray-600 space-y-1">
            <p>Responses: <span className="font-medium text-gray-900">{survey.responseCount || 0}</span></p>
            <p>Target: <span className="font-medium text-gray-900">{survey.target_count || 0}</span></p>
            <p>Questions: <span className="font-medium text-gray-900">24</span></p>
            <p>Est. Time: <span className="font-medium text-gray-900">8-10 min</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SurveyResponses({ survey }: { survey: any }) {
  const [responses, setResponses] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const limit = 15;

  useEffect(() => {
    setLoading(true);
    adminApi.surveyResponses(survey.id, { page, limit, search }).then((res) => {
      setResponses(res.data || []);
      setTotal(res.total || 0);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [survey.id, page, search]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search by name or email..." className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-orange-400 w-64" />
        <button onClick={() => { const a = document.createElement('a'); a.href = `/admin/surveys/${survey.id}/responses/export`; a.click(); }} className="px-3 py-1.5 text-xs font-medium bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 ml-auto">Export CSV</button>
      </div>

      {loading ? (
        <div className="bg-white border border-gray-200">
          {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-10 bg-gray-100 animate-pulse border-b border-gray-200 last:border-0" />)}
        </div>
      ) : responses.length === 0 ? (
        <div className="text-center py-12 text-sm text-gray-500 bg-white border border-gray-200">No responses yet.</div>
      ) : (
        <div className="bg-white border border-gray-200 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-left">
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Course</th>
                <th className="px-3 py-2 font-medium">Employment Status</th>
                <th className="px-3 py-2 font-medium">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {responses.map((r: any) => {
                const profile = r.user?.profile;
                const data = r.responses || {};
                return (
                  <tr key={r.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium text-gray-900">{profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : r.user?.email || '—'}</td>
                    <td className="px-3 py-2 text-gray-600">{data.program || '—'}</td>
                    <td className="px-3 py-2">{data.employment_status || '—'}</td>
                    <td className="px-3 py-2 text-gray-500">{r.submitted_at ? new Date(r.submitted_at).toLocaleDateString() : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-3 py-2 border-t border-gray-200">
              <span className="text-xs text-gray-400">Page {page} of {totalPages}</span>
              <div className="flex gap-1">
                <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-2 py-1 text-xs font-medium border border-gray-200 rounded text-gray-600 hover:bg-gray-50 disabled:opacity-40">Prev</button>
                <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="px-2 py-1 text-xs font-medium border border-gray-200 rounded text-gray-600 hover:bg-gray-50 disabled:opacity-40">Next</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SurveyAnalytics({ surveyId }: { surveyId: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.surveyAnalytics(surveyId).then(setData).catch(() => {}).finally(() => setLoading(false));
  }, [surveyId]);

  if (loading) return <div className="bg-white border border-gray-200 p-6 text-center text-xs text-gray-400">Loading analytics...</div>;
  if (!data || data.total === 0) return <div className="bg-white border border-gray-200 p-6 text-center text-xs text-gray-400">No data to analyze yet.</div>;

  const sections = [
    { label: 'Employment Status', data: data.employmentStatus, color: '#f97316' },
    { label: 'Industry Distribution', data: data.industryDistribution, color: '#3b82f6' },
    { label: 'Work Alignment', data: data.workAlignment, color: '#10b981' },
    { label: 'Satisfaction', data: data.satisfaction, color: '#8b5cf6' },
    { label: 'Curriculum Relevance', data: data.curriculumRelevance, color: '#f59e0b' },
  ].filter((s) => s.data?.length > 0);

  return (
    <div className="space-y-3">
      <div className="bg-white border border-gray-200 p-3">
        <p className="text-xs text-gray-500">Based on <span className="font-medium text-gray-900">{data.total}</span> responses</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {sections.map((section) => (
          <div key={section.label} className="bg-white border border-gray-200 p-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{section.label}</h3>
            <div className="space-y-2">
              {section.data.map((d: any, i: number) => {
                const maxCount = Math.max(...section.data.map((x: any) => x.count));
                return (
                  <div key={d.label || i}>
                    <div className="flex items-center justify-between text-xs mb-0.5">
                      <span className="text-gray-700">{d.label}</span>
                      <span className="text-gray-500">{d.count}</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${(d.count / maxCount) * 100}%`, backgroundColor: section.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SurveySettings({ survey, onClose, onDuplicate, onDelete, onUpdate }: {
  survey: any;
  onClose: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (data: any) => void;
}) {
  const addNotification = useUIStore((s) => s.addNotification);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    title: survey.title || '',
    description: survey.description || '',
    notes: survey.notes || '',
    academic_year: survey.academic_year || '',
    target_type: survey.target_type || 'all',
    target_value: survey.target_value || '',
    opens_at: survey.starts_at ? survey.starts_at.split('T')[0] : '',
    closes_at: survey.expires_at ? survey.expires_at.split('T')[0] : '',
    status: survey.status || 'draft',
  });

  const handleSave = async () => {
    try {
      await adminApi.surveyUpdate(survey.id, {
        ...form,
        opens_at: form.opens_at ? new Date(form.opens_at).toISOString() : null,
        closes_at: form.closes_at ? new Date(form.closes_at).toISOString() : null,
      });
      addNotification('Survey updated', 'success');
      onUpdate(form);
      setEditing(false);
    } catch { addNotification('Failed to update survey', 'error'); }
  };

  return (
    <div className="bg-white border border-gray-200 p-4 max-w-lg">
      {!editing ? (
        <div className="space-y-3">
          <button onClick={() => setEditing(true)} className="w-full px-3 py-2 text-xs font-medium bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100 text-left">Edit Survey</button>
          {survey.status !== 'closed' && (
            <button onClick={() => { if (window.confirm('Close this survey? Alumni will no longer be able to submit responses.')) onClose(survey.id); }}
              className="w-full px-3 py-2 text-xs font-medium bg-red-50 text-red-600 rounded-lg hover:bg-red-100 text-left">Close Survey</button>
          )}
          <button onClick={() => onDuplicate(survey.id)} className="w-full px-3 py-2 text-xs font-medium bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 text-left">Duplicate Survey</button>
          <button onClick={() => onDelete(survey.id)} className="w-full px-3 py-2 text-xs font-medium bg-red-50 text-red-500 rounded-lg hover:bg-red-100 text-left">Delete Survey</button>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Title</label>
            <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-orange-400" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-orange-400" rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Academic Year</label>
              <input type="text" value={form.academic_year} onChange={(e) => setForm({ ...form, academic_year: e.target.value })}
                className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-orange-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-orange-400">
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <button type="button" onClick={handleSave} className="px-3 py-1.5 text-xs font-medium bg-orange-500 text-white rounded-lg hover:bg-orange-600">Save</button>
            <button type="button" onClick={() => setEditing(false)} className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
