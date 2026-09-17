import { useState, useEffect, useRef } from 'react';
import { adminApi } from '@/services/api';
import { useUIStore } from '@/store/uiStore';
import { generateYears } from '@/utils/helpers';
import {
  ClipboardDocumentCheckIcon,
  XMarkIcon,
  CheckCircleIcon,
  ShieldCheckIcon,
  StarIcon,
  EyeIcon,
  AcademicCapIcon,
  UserGroupIcon,
  PlusIcon,
  TrashIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ArrowPathIcon,
  PencilSquareIcon,
} from '@heroicons/react/24/outline';

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
  const [detailTab, setDetailTab] = useState<'overview' | 'questions' | 'responses' | 'analytics' | 'settings'>('overview');
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
            <p className="text-xs font-bold text-gray-900">{survey.responseCount || 0}</p>            <p className="text-[10px] text-gray-500">Responses</p>
          </div>
          {survey.targetCount > 0 && (
            <div className="flex-1 bg-gray-50 rounded-lg p-2 text-center">
              <p className="text-xs font-bold text-gray-900">
                {survey.targetCount ? Math.round(((survey.responseCount || 0) / survey.targetCount) * 100) : 0}%
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
          <div className="h-full bg-orange-500 rounded-full transition-all" style={{ width: `${survey.targetCount ? Math.min(100, Math.round(((survey.responseCount || 0) / survey.targetCount) * 100)) : 0}%` }} />
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
              {[
                { key: 'overview', label: 'Overview' },
                { key: 'questions', label: 'Questions & CHED Requirements' },
                { key: 'responses', label: 'Responses' },
                { key: 'analytics', label: 'Analytics' },
                { key: 'settings', label: 'Settings' },
              ].map(({ key, label }) => (
                <button key={key} onClick={() => setDetailTab(key as any)}
                  className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${detailTab === key ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {detailTab === 'overview' && <SurveyOverview survey={survey} />}
        {detailTab === 'questions' && (
          <SurveyQuestionsEditor
            survey={survey}
            onUpdate={(updatedQuestions: any) => {
              setSelectedSurvey((prev: any) => ({ ...prev, questions: updatedQuestions }));
              load();
            }}
          />
        )}
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
  const [questionCount, setQuestionCount] = useState<number | null>(null);
  const years = generateYears(2014, new Date().getFullYear() + 1).map(String);

  useEffect(() => {
    adminApi.surveyStandardQuestions()
      .then((q) => setQuestionCount(Array.isArray(q) ? q.filter((x: any) => x.type !== 'section').length : null))
      .catch(() => setQuestionCount(null));
  }, []);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/55 backdrop-blur-xs" onClick={onClose}>
      <div className="bg-white w-full max-w-[900px] max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl border border-gray-100 flex flex-col animate-in fade-in zoom-in-95 duration-150" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-xs text-white shrink-0">
                <ClipboardDocumentCheckIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white leading-tight">Create Graduate Tracer Survey</h2>
                <p className="text-xs text-orange-100 mt-0.5">Configure institutional tracer study cycle and target cohort</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors cursor-pointer"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto flex-1 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Survey Information</p>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Survey Title *</label>
                  <input type="text" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g. Graduate Tracer Study 2026"
                    className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                  <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Brief description of this survey cycle."
                    className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500" rows={3} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Survey Notes <span className="text-gray-400 font-normal">(Optional, only visible to administrators)</span></label>
                  <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Internal notes about this survey."
                    className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500" rows={2} />
                </div>

                <div className="border-t border-gray-100 pt-4">
                  <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-3">Standard Graduate Tracer Questionnaire</p>
                  <div className="bg-gray-50 rounded-xl p-3 space-y-1">
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
                        <span className="text-emerald-600 font-bold">&#10003;</span>
                        <span className="text-gray-700">{section}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-gray-500 mt-2">Initialized with standard CHED questions. You can add, edit, or customize questions in the Questions tab.</p>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Target Cohort & Schedule</p>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Target Audience</label>
                  <select value={form.target_type} onChange={(e) => setForm({ ...form, target_type: e.target.value, target_value: '' })}
                    className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-orange-500 bg-white">
                    <option value="all">All Alumni</option>
                    <option value="batch">Graduating Batch</option>
                    <option value="course">Specific Course / Program</option>
                  </select>
                </div>

                {form.target_type === 'batch' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Batch Year</label>
                    <select value={form.target_value} onChange={(e) => setForm({ ...form, target_value: e.target.value })}
                      className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-orange-500 bg-white">
                      <option value="">Select year</option>
                      {generateYears(2015, new Date().getFullYear()).map((y) => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                )}
                {form.target_type === 'course' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Course</label>
                    <select value={form.target_value} onChange={(e) => setForm({ ...form, target_value: e.target.value })}
                      className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-orange-500 bg-white">
                      <option value="">Select course</option>
                      {['BSIT', 'BIT', 'BEEd', 'BSEd-Math', 'BTLED-HE', 'BTLED-ICT'].map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Opening Date</label>
                    <input type="date" value={form.opens_at} onChange={(e) => setForm({ ...form, opens_at: e.target.value })}
                      className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Closing Date</label>
                    <input type="date" value={form.closes_at} onChange={(e) => setForm({ ...form, closes_at: e.target.value })}
                      className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                  <div className="flex gap-4 pt-1">
                    <label className="flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer">
                      <input type="radio" name="status" value="draft" checked={form.status === 'draft'} onChange={(e) => setForm({ ...form, status: e.target.value })} className="accent-orange-500" />
                      Draft
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer">
                      <input type="radio" name="status" value="published" checked={form.status === 'published'} onChange={(e) => setForm({ ...form, status: e.target.value })} className="accent-orange-500" />
                      Published
                    </label>
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-4">
                  <div className="bg-gray-50 rounded-xl p-3 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Questions</span>
                      <span className="font-semibold text-gray-900">{questionCount !== null ? questionCount : '—'}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Target</span>
                      <span className="font-semibold text-gray-900">{form.target_type === 'batch' ? `Batch ${form.target_value || '—'}` : form.target_type === 'course' ? form.target_value || '—' : 'All Alumni'}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Status</span>
                      <span className="font-semibold text-gray-900 capitalize">{form.status}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="px-6 py-3.5 bg-gray-50/80 border-t border-gray-100 flex items-center justify-end gap-2.5 shrink-0">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-semibold bg-white border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors shadow-2xs cursor-pointer">Cancel</button>
            <button type="submit" className="px-4 py-2 text-xs font-semibold bg-orange-600 hover:bg-orange-700 text-white rounded-xl shadow-xs hover:shadow transition-all cursor-pointer flex items-center gap-1.5">Create Survey</button>
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
          <div className="flex justify-between py-1 border-b border-gray-50"><span className="text-gray-500">Response Rate</span><span className="font-medium text-gray-900">{survey.targetCount ? `${Math.round(((survey.responseCount || 0) / survey.targetCount) * 100)}%` : '—'}</span></div>
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
                strokeDasharray={`${survey.targetCount ? Math.min(100, Math.round(((survey.responseCount || 0) / survey.targetCount) * 100)) : 0} ${100}`}
                strokeLinecap="round" />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-orange-600">
              {survey.targetCount ? Math.round(((survey.responseCount || 0) / survey.targetCount) * 100) : 0}%
            </span>
          </div>
          <div className="text-xs text-gray-600 space-y-1">
            <p>Responses: <span className="font-medium text-gray-900">{survey.responseCount || 0}</span></p>
            <p>Target: <span className="font-medium text-gray-900">{survey.targetCount || 0}</span></p>
            {Array.isArray(survey.questions) && (
              <p>Questions: <span className="font-medium text-gray-900">{survey.questions.filter((q: any) => q.type !== 'section').length}</span></p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface SurveyQuestionItem {
  id: string;
  section?: string;
  label?: string;
  type: string;
  options?: string[];
  required?: boolean;
}

function SurveyQuestionsEditor({ survey, onUpdate }: { survey: any; onUpdate: (questions: any[]) => void }) {
  const addNotification = useUIStore((s) => s.addNotification);
  const [questions, setQuestions] = useState<SurveyQuestionItem[]>(() => {
    if (Array.isArray(survey.questions) && survey.questions.length > 0) {
      return JSON.parse(JSON.stringify(survey.questions));
    }
    return [];
  });
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newQuestion, setNewQuestion] = useState<SurveyQuestionItem>({
    id: '',
    section: 'general',
    label: '',
    type: 'text',
    required: false,
    options: [],
  });
  const [rawOptions, setRawOptions] = useState('');

  useEffect(() => {
    if (Array.isArray(survey.questions) && survey.questions.length > 0) {
      setQuestions(JSON.parse(JSON.stringify(survey.questions)));
    } else {
      adminApi.surveyStandardQuestions().then((std) => {
        if (Array.isArray(std) && std.length > 0) {
          setQuestions(JSON.parse(JSON.stringify(std)));
        }
      }).catch(() => {});
    }
  }, [survey.id, survey.questions]);

  const handleResetToStandard = async () => {
    if (!window.confirm('Reset all questions to the standard CHED Tracer Study questions? Any custom questions will be overwritten.')) return;
    try {
      const std = await adminApi.surveyStandardQuestions();
      if (Array.isArray(std)) {
        setQuestions(JSON.parse(JSON.stringify(std)));
        addNotification('Reset to standard CHED questions. Click Save to apply.', 'info');
      }
    } catch {
      addNotification('Failed to load standard CHED questions', 'error');
    }
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= questions.length) return;
    const next = [...questions];
    const [moved] = next.splice(index, 1);
    next.splice(targetIndex, 0, moved);
    setQuestions(next);
  };

  const handleDelete = (index: number) => {
    const item = questions[index];
    const label = item.type === 'section' ? `section "${item.section}"` : `question "${item.label || item.id}"`;
    if (!window.confirm(`Are you sure you want to remove this ${label}?`)) return;
    const next = questions.filter((_, i) => i !== index);
    setQuestions(next);
  };

  const handleQuestionChange = (index: number, field: keyof SurveyQuestionItem, value: any) => {
    const next = [...questions];
    next[index] = { ...next[index], [field]: value };
    setQuestions(next);
  };

  const handleAddQuestion = () => {
    if (!newQuestion.id.trim()) {
      newQuestion.id = (newQuestion.label || 'q')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '') || `q_${Date.now()}`;
    }
    const finalItem: SurveyQuestionItem = {
      ...newQuestion,
      options: newQuestion.type === 'choice' && rawOptions.trim()
        ? rawOptions.split(',').map((s) => s.trim()).filter(Boolean)
        : undefined,
    };
    setQuestions([...questions, finalItem]);
    setShowAddModal(false);
    setNewQuestion({ id: '', section: 'general', label: '', type: 'text', required: false, options: [] });
    setRawOptions('');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await adminApi.surveyUpdate(survey.id, { questions });
      addNotification('Survey questions saved successfully!', 'success');
      onUpdate(questions);
    } catch (err: any) {
      addNotification(err.message || 'Failed to save survey questions', 'error');
    } finally {
      setSaving(false);
    }
  };

  const totalQuestions = questions.filter((q) => q.type !== 'section').length;

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-gray-900">CHED & Institutional Tracer Questions</h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-100 text-orange-800">
              {totalQuestions} Questions
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Conforms to CHED Tracer Study guidelines. Easily add, edit, or adjust questions to reflect changing CHED mandates.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetToStandard}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors cursor-pointer"
            title="Reset questions to standard CHED survey template"
          >
            <ArrowPathIcon className="w-3.5 h-3.5" />
            Reset to CHED Standard
          </button>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors shadow-2xs cursor-pointer"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            Add Question
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg transition-colors shadow-2xs cursor-pointer"
          >
            {saving ? 'Saving...' : 'Save Questionnaire'}
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs divide-y divide-gray-100">
        {questions.length === 0 ? (
          <div className="p-8 text-center text-xs text-gray-400">
            No questions configured for this survey. Click &quot;Reset to CHED Standard&quot; or &quot;Add Question&quot; to begin.
          </div>
        ) : (
          questions.map((q, idx) => {
            const isSection = q.type === 'section';
            const isEditing = editingId === q.id || editingId === `${q.id}_${idx}`;

            if (isSection) {
              return (
                <div key={q.id || idx} className="p-3 bg-gray-50/80 border-l-4 border-l-orange-500 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-[10px] font-bold text-orange-600 uppercase tracking-wider bg-orange-100/60 px-2 py-0.5 rounded">
                      Section Header
                    </span>
                    {isEditing ? (
                      <input
                        type="text"
                        value={q.section || ''}
                        onChange={(e) => handleQuestionChange(idx, 'section', e.target.value)}
                        className="text-xs font-bold text-gray-900 border border-gray-300 rounded px-2 py-1 flex-1 max-w-md bg-white"
                      />
                    ) : (
                      <h3 className="text-xs font-bold text-gray-900">{q.section || q.id}</h3>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setEditingId(isEditing ? null : (q.id || `${q.id}_${idx}`))}
                      className="p-1 text-gray-500 hover:text-gray-700 rounded cursor-pointer"
                      title={isEditing ? 'Done editing' : 'Edit section title'}
                    >
                      {isEditing ? <span className="text-xs font-bold text-orange-600">Done</span> : <PencilSquareIcon className="w-4 h-4" />}
                    </button>
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMove(idx, 'up')}
                      className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-20 cursor-pointer"
                      title="Move Up"
                    >
                      <ArrowUpIcon className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === questions.length - 1}
                      onClick={() => handleMove(idx, 'down')}
                      className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-20 cursor-pointer"
                      title="Move Down"
                    >
                      <ArrowDownIcon className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(idx)}
                      className="p-1 text-gray-400 hover:text-red-600 rounded cursor-pointer"
                      title="Delete section"
                    >
                      <TrashIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div key={q.id || idx} className="p-4 hover:bg-gray-50/50 transition-colors">
                {!isEditing ? (
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                          #{idx + 1}
                        </span>
                        <span className="text-xs font-semibold text-gray-900">{q.label || q.id}</span>
                        {q.required && (
                          <span className="text-[10px] font-semibold text-red-500 bg-red-50 px-1.5 py-0.5 rounded">
                            Required
                          </span>
                        )}
                        <span className="text-[10px] font-medium text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded uppercase">
                          {q.type}
                        </span>
                        {q.section && (
                          <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                            Section: {q.section}
                          </span>
                        )}
                      </div>
                      {q.options && q.options.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap pt-1">
                          <span className="text-[10px] text-gray-400">Options:</span>
                          {q.options.map((opt, oIdx) => (
                            <span key={oIdx} className="text-[10px] bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                              {opt}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setEditingId(q.id || `${q.id}_${idx}`)}
                        className="p-1.5 text-gray-400 hover:text-gray-700 rounded hover:bg-gray-100 cursor-pointer"
                        title="Edit question"
                      >
                        <PencilSquareIcon className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMove(idx, 'up')}
                        className="p-1.5 text-gray-400 hover:text-gray-700 disabled:opacity-20 rounded hover:bg-gray-100 cursor-pointer"
                        title="Move Up"
                      >
                        <ArrowUpIcon className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === questions.length - 1}
                        onClick={() => handleMove(idx, 'down')}
                        className="p-1.5 text-gray-400 hover:text-gray-700 disabled:opacity-20 rounded hover:bg-gray-100 cursor-pointer"
                        title="Move Down"
                      >
                        <ArrowDownIcon className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(idx)}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50 cursor-pointer"
                        title="Delete question"
                      >
                        <TrashIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 bg-gray-50 p-3 rounded-xl border border-gray-200">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-900">Editing Question #{idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="text-xs font-semibold text-orange-600 hover:text-orange-700 cursor-pointer"
                      >
                        Done Editing
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-medium text-gray-700 mb-1">Question Label *</label>
                        <input
                          type="text"
                          value={q.label || ''}
                          onChange={(e) => handleQuestionChange(idx, 'label', e.target.value)}
                          className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white outline-none focus:border-orange-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-gray-700 mb-1">Field Key / ID</label>
                        <input
                          type="text"
                          value={q.id || ''}
                          onChange={(e) => handleQuestionChange(idx, 'id', e.target.value)}
                          className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white font-mono outline-none focus:border-orange-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-gray-700 mb-1">Question Type</label>
                        <select
                          value={q.type}
                          onChange={(e) => handleQuestionChange(idx, 'type', e.target.value)}
                          className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white outline-none focus:border-orange-500"
                        >
                          <option value="text">Text Input (Short)</option>
                          <option value="textarea">Textarea (Long)</option>
                          <option value="choice">Choice / Select Dropdown</option>
                          <option value="number">Number</option>
                          <option value="rating">Rating (1-5)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-gray-700 mb-1">Section Identifier</label>
                        <input
                          type="text"
                          value={q.section || ''}
                          onChange={(e) => handleQuestionChange(idx, 'section', e.target.value)}
                          className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white outline-none focus:border-orange-500"
                        />
                      </div>
                    </div>
                    {q.type === 'choice' && (
                      <div>
                        <label className="block text-[11px] font-medium text-gray-700 mb-1">
                          Options (comma-separated)
                        </label>
                        <input
                          type="text"
                          value={(q.options || []).join(', ')}
                          onChange={(e) =>
                            handleQuestionChange(
                              idx,
                              'options',
                              e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                            )
                          }
                          placeholder="e.g. Employed, Self-employed, Unemployed"
                          className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white outline-none focus:border-orange-500"
                        />
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`req_${idx}`}
                        checked={!!q.required}
                        onChange={(e) => handleQuestionChange(idx, 'required', e.target.checked)}
                        className="rounded accent-orange-500"
                      />
                      <label htmlFor={`req_${idx}`} className="text-xs text-gray-700 cursor-pointer">
                        Mark as mandatory/required
                      </label>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs" onClick={() => setShowAddModal(false)}>
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-gray-100 p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900">Add New Survey Question / Section</h3>
              <button type="button" onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-gray-700 mb-1">Item Type *</label>
                <select
                  value={newQuestion.type}
                  onChange={(e) => setNewQuestion({ ...newQuestion, type: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 bg-white outline-none focus:border-orange-500"
                >
                  <option value="text">Question: Text Field</option>
                  <option value="textarea">Question: Paragraph / Feedback</option>
                  <option value="choice">Question: Multiple Choice Options</option>
                  <option value="number">Question: Number</option>
                  <option value="rating">Question: Rating (1-5)</option>
                  <option value="section">Section Break / Category Header</option>
                </select>
              </div>

              {newQuestion.type === 'section' ? (
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Section Title *</label>
                  <input
                    type="text"
                    required
                    value={newQuestion.section || ''}
                    onChange={(e) => setNewQuestion({ ...newQuestion, section: e.target.value })}
                    placeholder="e.g. Employment History & Progression"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-orange-500"
                  />
                </div>
              ) : (
                <>
                  <div>
                    <label className="block font-medium text-gray-700 mb-1">Question Text / Prompt *</label>
                    <input
                      type="text"
                      required
                      value={newQuestion.label || ''}
                      onChange={(e) => setNewQuestion({ ...newQuestion, label: e.target.value })}
                      placeholder="e.g. How long did it take to secure your first job?"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-orange-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-medium text-gray-700 mb-1">Section Assignment</label>
                      <input
                        type="text"
                        value={newQuestion.section || ''}
                        onChange={(e) => setNewQuestion({ ...newQuestion, section: e.target.value })}
                        placeholder="e.g. employment_info"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-gray-700 mb-1">Field Identifier (Optional)</label>
                      <input
                        type="text"
                        value={newQuestion.id || ''}
                        onChange={(e) => setNewQuestion({ ...newQuestion, id: e.target.value })}
                        placeholder="auto-generated if empty"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-orange-500 font-mono"
                      />
                    </div>
                  </div>

                  {newQuestion.type === 'choice' && (
                    <div>
                      <label className="block font-medium text-gray-700 mb-1">Options (comma-separated)</label>
                      <input
                        type="text"
                        value={rawOptions}
                        onChange={(e) => setRawOptions(e.target.value)}
                        placeholder="Option 1, Option 2, Option 3"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-orange-500"
                      />
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="new_req"
                      checked={!!newQuestion.required}
                      onChange={(e) => setNewQuestion({ ...newQuestion, required: e.target.checked })}
                      className="rounded accent-orange-500"
                    />
                    <label htmlFor="new_req" className="text-gray-700 cursor-pointer">
                      Mandatory field (alumni must answer)
                    </label>
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddQuestion}
                className="px-4 py-2 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 rounded-xl shadow-xs cursor-pointer"
              >
                Add to Survey
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ResponseDetailModal({ response, onClose }: { response: any; onClose: () => void }) {
  const profile = response.user?.profile;
  const data = response.responses || {};
  const consent = data.consent || {};
  const fullName = profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Alumnus';
  const email = response.user?.email || data.email || '—';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs" onClick={onClose}>
      <div
        className="bg-white w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl border border-gray-100 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 bg-gradient-to-r from-orange-500 to-amber-600 text-white flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] px-2 py-0.5 rounded bg-white/20 font-medium">Survey Response</span>
              <span className="text-[11px] text-orange-100">
                Submitted {response.submitted_at ? new Date(response.submitted_at).toLocaleString() : '—'}
              </span>
            </div>
            <h2 className="text-base font-bold text-white mt-1">{fullName}</h2>
            <p className="text-xs text-orange-100">{email} {data.phone ? `• ${data.phone}` : ''}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors cursor-pointer"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Section 1: User Consent (Data Privacy Act) */}
          <div className="bg-orange-50/50 border border-orange-200 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-orange-950 flex items-center gap-1.5">
                <ShieldCheckIcon className="w-4 h-4 text-orange-600" />
                Data Privacy Act (RA 10173) Consent
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                {consent.agreed ? 'Consent Accepted' : 'Pending'}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] text-gray-600 pt-1">
              <div className="flex items-center gap-1.5">
                <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Collect, process & retain data</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Congratulatory banners inclusion</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Activities & promotional discounts</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Job opportunities referrals</span>
              </div>
            </div>
          </div>

          {/* Section 2: Personal & Contact Details */}
          <div className="border border-gray-200 rounded-xl p-3.5 space-y-2">
            <h3 className="font-bold text-gray-900 uppercase tracking-wider text-[11px]">Personal & Contact Details</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
              <div><span className="text-gray-400 block text-[10px]">Student ID</span><span className="font-medium text-gray-800">{data.studentId || profile?.id_number || '—'}</span></div>
              <div><span className="text-gray-400 block text-[10px]">Gender</span><span className="font-medium text-gray-800">{data.gender || '—'}</span></div>
              <div><span className="text-gray-400 block text-[10px]">Civil Status</span><span className="font-medium text-gray-800">{data.civilStatus || '—'}</span></div>
              <div><span className="text-gray-400 block text-[10px]">City / Municipality</span><span className="font-medium text-gray-800">{data.city || '—'}</span></div>
              <div><span className="text-gray-400 block text-[10px]">Province</span><span className="font-medium text-gray-800">{data.province || 'Cebu'}</span></div>
              <div><span className="text-gray-400 block text-[10px]">Living Location</span><span className="font-medium text-gray-800">{data.currentResidenceLocation || '—'}</span></div>
            </div>
            {data.address && (
              <div className="pt-1.5 border-t border-gray-100">
                <span className="text-gray-400 block text-[10px]">Street / Barangay Address</span>
                <span className="font-medium text-gray-800">{data.address}</span>
              </div>
            )}
          </div>

          {/* Section 3: Educational Background & Licensure */}
          <div className="border border-gray-200 rounded-xl p-3.5 space-y-2">
            <h3 className="font-bold text-gray-900 uppercase tracking-wider text-[11px]">Degree & Licensure</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="sm:col-span-2"><span className="text-gray-400 block text-[10px]">Degree / Program</span><span className="font-semibold text-gray-900">{data.program || '—'}</span></div>
              <div><span className="text-gray-400 block text-[10px]">Graduation Year</span><span className="font-medium text-gray-800">{data.yearGraduated || '—'}</span></div>
              <div><span className="text-gray-400 block text-[10px]">Honors</span><span className="font-medium text-gray-800">{data.honors || 'None'}</span></div>
              <div><span className="text-gray-400 block text-[10px]">Licensure Status</span><span className="font-medium text-gray-800">{data.licensureStatus || 'N/A'}</span></div>
              <div><span className="text-gray-400 block text-[10px]">License Exam Title</span><span className="font-medium text-gray-800">{data.licensureExamName || '—'}</span></div>
            </div>
            {Array.isArray(data.reasonsForEnrolling) && data.reasonsForEnrolling.length > 0 && (
              <div className="pt-2 border-t border-gray-100">
                <span className="text-gray-400 block text-[10px] mb-1">Primary reasons for choosing CTU:</span>
                <div className="flex flex-wrap gap-1.5">
                  {data.reasonsForEnrolling.map((r: string) => (
                    <span key={r} className="px-2 py-0.5 rounded-md bg-orange-50 text-orange-800 text-[10px] border border-orange-200/60 font-medium">
                      {r}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Section 4: Skills & Lifelong Learning */}
          <div className="border border-gray-200 rounded-xl p-3.5 space-y-2">
            <h3 className="font-bold text-gray-900 uppercase tracking-wider text-[11px]">Skills & Further Studies</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div><span className="text-gray-400 block text-[10px]">Post-Graduate Studies</span><span className="font-medium text-gray-800">{data.furtherStudies || 'No plans at this time'}</span></div>
              <div><span className="text-gray-400 block text-[10px]">Certifications</span><span className="font-medium text-gray-800">{data.postGradCertifications || '—'}</span></div>
            </div>
            {Array.isArray(data.competenciesDeveloped) && data.competenciesDeveloped.length > 0 && (
              <div className="pt-2 border-t border-gray-100">
                <span className="text-gray-400 block text-[10px] mb-1">Core competencies developed at CTU:</span>
                <div className="flex flex-wrap gap-1.5">
                  {data.competenciesDeveloped.map((c: string) => (
                    <span key={c} className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 text-[10px] border border-blue-200/60 font-medium">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Section 5: Institutional Feedback & Ratings */}
          <div className="border border-gray-200 rounded-xl p-3.5 space-y-2.5">
            <h3 className="font-bold text-gray-900 uppercase tracking-wider text-[11px]">Institutional Feedback & Evaluation</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="bg-gray-50 p-2 rounded-lg text-center">
                <span className="text-[10px] text-gray-400 block">Curriculum Relevance</span>
                <span className="font-bold text-orange-600 text-xs mt-0.5 block">{data.curriculumRelevance || '—'}</span>
              </div>
              <div className="bg-gray-50 p-2 rounded-lg text-center">
                <span className="text-[10px] text-gray-400 block">Faculty Evaluation</span>
                <span className="font-bold text-gray-900 text-xs mt-0.5 block">{data.facultyRating ? `${data.facultyRating} / 5` : '—'}</span>
              </div>
              <div className="bg-gray-50 p-2 rounded-lg text-center">
                <span className="text-[10px] text-gray-400 block">Laboratories & Facilities</span>
                <span className="font-bold text-gray-900 text-xs mt-0.5 block">{data.facilitiesRating ? `${data.facilitiesRating} / 5` : '—'}</span>
              </div>
              <div className="bg-gray-50 p-2 rounded-lg text-center">
                <span className="text-[10px] text-gray-400 block">Student Guidance</span>
                <span className="font-bold text-gray-900 text-xs mt-0.5 block">{data.studentServicesRating ? `${data.studentServicesRating} / 5` : '—'}</span>
              </div>
            </div>

            {Array.isArray(data.engagementPreferences) && data.engagementPreferences.length > 0 && (
              <div className="pt-1.5 border-t border-gray-100">
                <span className="text-gray-400 block text-[10px] mb-1">Engagement Preferences with CTU-Naga:</span>
                <div className="flex flex-wrap gap-1.5">
                  {data.engagementPreferences.map((p: string) => (
                    <span key={p} className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-800 text-[10px] border border-purple-200/60 font-medium">
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {data.suggestions && (
              <div className="pt-1.5 border-t border-gray-100 bg-gray-50/70 p-2.5 rounded-lg">
                <span className="text-gray-500 font-semibold block text-[10px]">Suggestions / Feedback:</span>
                <p className="text-gray-800 italic mt-0.5 leading-relaxed">{data.suggestions}</p>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-gray-100 flex justify-end shrink-0 bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-100 cursor-pointer"
          >
            Close
          </button>
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
  const [selectedResponse, setSelectedResponse] = useState<any>(null);
  const limit = 15;

  const isOnboarding = survey.id === '00000000-0000-0000-0000-000000000001' || survey.title?.includes('Registration');

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
          placeholder="Search by name, email, or course..." className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-orange-400 w-64" />
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
                <th className="px-3 py-2 font-medium">Name & Email</th>
                <th className="px-3 py-2 font-medium">Degree / Course</th>
                <th className="px-3 py-2 font-medium">{isOnboarding ? 'Licensure & Honors' : 'Employment Status'}</th>
                <th className="px-3 py-2 font-medium">{isOnboarding ? 'Residence' : 'Industry'}</th>
                <th className="px-3 py-2 font-medium">Submitted</th>
                <th className="px-3 py-2 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {responses.map((r: any) => {
                const profile = r.user?.profile;
                const data = r.responses || {};
                const fullName = profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : (data.firstName ? `${data.firstName} ${data.lastName || ''}`.trim() : r.user?.email || '—');
                return (
                  <tr key={r.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-900">
                      <p className="font-semibold text-gray-900">{fullName}</p>
                      <p className="text-[10px] text-gray-400">{r.user?.email || data.email || '—'}</p>
                    </td>
                    <td className="px-3 py-2 text-gray-600">
                      <span>{data.program || '—'}</span>
                      {data.yearGraduated && <span className="text-[10px] text-gray-400 block">Class of {data.yearGraduated}</span>}
                    </td>
                    <td className="px-3 py-2">
                      {isOnboarding ? (
                        <div>
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${data.licensureStatus === 'Passed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-50 text-gray-600'}`}>
                            {data.licensureStatus || 'N/A'}
                          </span>
                          {data.honors && data.honors !== 'None' && <span className="text-[10px] text-orange-600 block mt-0.5">{data.honors}</span>}
                        </div>
                      ) : (
                        <span className="text-gray-700">{data.employment_status || '—'}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-gray-600">
                      {isOnboarding ? (data.currentResidenceLocation || data.city || '—') : (data.industry || '—')}
                    </td>
                    <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{r.submitted_at ? new Date(r.submitted_at).toLocaleDateString() : '—'}</td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setSelectedResponse(r)}
                        className="px-2.5 py-1 text-xs font-medium bg-orange-50 text-orange-600 hover:bg-orange-100 rounded-lg transition-colors cursor-pointer"
                      >
                        View Details
                      </button>
                    </td>
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

      {selectedResponse && (
        <ResponseDetailModal response={selectedResponse} onClose={() => setSelectedResponse(null)} />
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

  // Onboarding Survey Visual Analytics
  if (data.isOnboarding || (data.ratings && data.competenciesDeveloped)) {
    const totalPassed = data.licensureStatus?.find((x: any) => x.label === 'Passed')?.count || 0;
    const licensureRate = data.total > 0 ? Math.round((totalPassed / data.total) * 100) : 0;
    const relVeryOrExtremely = (data.curriculumRelevance?.find((x: any) => x.label === 'Extremely Relevant')?.count || 0) +
      (data.curriculumRelevance?.find((x: any) => x.label === 'Very Relevant')?.count || 0);
    const relevanceRate = data.total > 0 ? Math.round((relVeryOrExtremely / data.total) * 100) : 0;

    return (
      <div className="space-y-3">
        {/* KPI Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="bg-white border border-gray-200 rounded-lg p-3">
            <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider block">Total Respondents</span>
            <p className="text-xl font-bold text-gray-900 mt-1">{data.total}</p>
            <span className="text-[10px] text-gray-400">Verified Alumni</span>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-3">
            <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider block">Curriculum Relevance</span>
            <p className="text-xl font-bold text-orange-600 mt-1">{relevanceRate}%</p>
            <span className="text-[10px] text-gray-400">Extremely / Very Relevant</span>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-3">
            <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider block">PRC/CSC Licensure</span>
            <p className="text-xl font-bold text-emerald-600 mt-1">{licensureRate}%</p>
            <span className="text-[10px] text-gray-400">Licensed / Eligible</span>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-3">
            <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider block">Data Privacy (DPA)</span>
            <p className="text-xl font-bold text-blue-600 mt-1">{data.dpaCompliance?.rate ?? 100}%</p>
            <span className="text-[10px] text-gray-400">Compliance Rate</span>
          </div>
        </div>

        {/* Institutional Ratings */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-3">Institutional Evaluation (1 to 5 Stars)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { title: 'Faculty Evaluation', stats: data.ratings?.faculty, color: '#f97316' },
              { title: 'Laboratories & Facilities', stats: data.ratings?.facilities, color: '#3b82f6' },
              { title: 'Student Guidance & Services', stats: data.ratings?.studentServices, color: '#10b981' },
            ].map((ratingItem) => (
              <div key={ratingItem.title} className="bg-gray-50 border border-gray-100 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-800">{ratingItem.title}</span>
                  <span className="text-xs font-bold text-orange-600 bg-white px-2 py-0.5 rounded border border-gray-200">
                    {ratingItem.stats?.average ? `${ratingItem.stats.average} / 5` : '—'}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {(ratingItem.stats?.distribution || []).map((dist: any) => (
                    <div key={dist.label} className="text-[11px]">
                      <div className="flex justify-between text-gray-600 mb-0.5">
                        <span>{dist.label}</span>
                        <span>{dist.count} ({dist.percentage}%)</span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${dist.percentage}%`, backgroundColor: ratingItem.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Competencies & Enrollment Reasons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-3">Core Competencies Acquired from CTU</h3>
            <div className="space-y-2">
              {(data.competenciesDeveloped || []).map((c: any) => {
                const max = Math.max(...data.competenciesDeveloped.map((x: any) => x.count), 1);
                return (
                  <div key={c.label}>
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="text-gray-700 truncate pr-2">{c.label}</span>
                      <span className="text-gray-500 font-medium shrink-0">{c.count} alumni</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-orange-500 rounded-full" style={{ width: `${(c.count / max) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-3">Primary Reasons for Enrolling at CTU</h3>
            <div className="space-y-2">
              {(data.reasonsForEnrolling || []).map((r: any) => {
                const max = Math.max(...data.reasonsForEnrolling.map((x: any) => x.count), 1);
                return (
                  <div key={r.label}>
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="text-gray-700 truncate pr-2">{r.label}</span>
                      <span className="text-gray-500 font-medium shrink-0">{r.count} alumni</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(r.count / max) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Licensure, Engagement & Residence */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-3">Professional Licensure</h3>
            <div className="space-y-2">
              {(data.licensureStatus || []).map((l: any) => (
                <div key={l.label} className="flex justify-between text-xs py-1 border-b border-gray-50 last:border-0">
                  <span className="text-gray-700">{l.label}</span>
                  <span className="font-bold text-gray-900">{l.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-3">Engagement Preferences</h3>
            <div className="space-y-2">
              {(data.engagementPreferences || []).map((e: any) => (
                <div key={e.label} className="flex justify-between text-xs py-1 border-b border-gray-50 last:border-0">
                  <span className="text-gray-700 truncate pr-1">{e.label}</span>
                  <span className="font-bold text-gray-900 shrink-0">{e.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-3">Current Living Location</h3>
            <div className="space-y-2">
              {(data.residenceDistribution || []).map((loc: any) => (
                <div key={loc.label} className="flex justify-between text-xs py-1 border-b border-gray-50 last:border-0">
                  <span className="text-gray-700 truncate pr-1">{loc.label}</span>
                  <span className="font-bold text-gray-900 shrink-0">{loc.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Standard tracer survey sections
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
