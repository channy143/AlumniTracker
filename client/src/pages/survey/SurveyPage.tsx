import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { surveyApi } from '@/services/api';
import { useUIStore } from '@/store/uiStore';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { CheckCircleIcon } from '@heroicons/react/24/outline';

export default function SurveyPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const addNotification = useUIStore((s) => s.addNotification);
  const [survey, setSurvey] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [currentSection, setCurrentSection] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    surveyApi.get(id).then((data) => {
      setSurvey(data);
      setCompleted(data.completed);
      if (data.completed) return;
      const defaults: Record<string, any> = {};
      (data.questions || []).forEach((q: any) => {
        if (q.type === 'section' || q.type === 'choice') return;
        defaults[q.id] = '';
      });
      setResponses(defaults);
    }).catch(() => {
      addNotification('Survey not found or unavailable', 'error');
      navigate('/');
    }).finally(() => setLoading(false));
  }, [id, navigate, addNotification]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto py-6">
        <SkeletonCard />
      </div>
    );
  }

  if (!survey) return null;

  if (completed) {
    return (
      <div className="max-w-3xl mx-auto py-6">
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
          <div className="w-16 h-16 mx-auto bg-emerald-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircleIcon className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">You have completed the {survey.title}</h2>
          <p className="text-sm text-gray-500 mb-4">Thank you for participating. Your responses have been recorded.</p>
          <button onClick={() => navigate('/')} className="px-4 py-2 text-xs font-medium bg-orange-500 text-white rounded-lg hover:bg-orange-600">Back to Home</button>
        </div>
      </div>
    );
  }

  const questions = survey.questions || [];
  const sections = questions.filter((q: any) => q.type === 'section');
  const currentSectionTitle = sections[currentSection]?.section || sections[currentSection]?.id || 'Questions';
  const sectionQuestions = questions.filter((q: any) => q.section === sections[currentSection]?.id);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    sectionQuestions.forEach((q: any) => {
      if (q.required && !responses[q.id]) {
        newErrors[q.id] = `${q.label} is required`;
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validate()) return;
    if (currentSection < sections.length - 1) {
      setCurrentSection((s) => s + 1);
    }
  };

  const handlePrev = () => {
    if (currentSection > 0) setCurrentSection((s) => s - 1);
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      await surveyApi.submit(id!, responses);
      setCompleted(true);
      addNotification('Survey submitted successfully!', 'success');
    } catch (err: any) {
      if (err.message?.includes('already completed')) {
        setCompleted(true);
      } else {
        addNotification(err.message || 'Failed to submit survey', 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const isLastSection = currentSection === sections.length - 1;

  return (
    <div className="max-w-3xl mx-auto py-6">
      <div className="bg-white border border-gray-200 rounded-lg mb-3 p-4">
        <h1 className="text-base font-bold text-gray-900">{survey.title}</h1>
        <p className="text-xs text-gray-500 mt-1">{survey.description}</p>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-2">
            {sections.map((_: any, i: number) => (
              <div key={i} className={`w-2 h-2 rounded-full ${i <= currentSection ? 'bg-orange-500' : 'bg-gray-200'}`} />
            ))}
          </div>
          <span className="text-xs text-gray-400">Section {currentSection + 1} of {sections.length}</span>
        </div>
        <div className="w-full h-1 bg-gray-100 rounded-full mt-2 overflow-hidden">
          <div className="h-full bg-orange-500 rounded-full transition-all" style={{ width: `${((currentSection + 1) / sections.length) * 100}%` }} />
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <h2 className="text-sm font-bold text-gray-900 mb-4">{currentSectionTitle}</h2>

        <div className="space-y-5">
          {sectionQuestions.map((q: any) => {
            if (q.type === 'section') return null;
            return (
              <div key={q.id}>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  {q.label}
                  {q.required && <span className="text-red-500 ml-0.5">*</span>}
                </label>
                {q.type === 'choice' && q.options ? (
                  <div className="space-y-1.5">
                    {q.options.map((opt: string) => (
                      <label key={opt} className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer hover:bg-gray-50 rounded px-2 py-1.5">
                        <input
                          type="radio"
                          name={q.id}
                          value={opt}
                          checked={responses[q.id] === opt}
                          onChange={(e) => setResponses((r) => ({ ...r, [q.id]: e.target.value }))}
                          className="accent-orange-500"
                        />
                        {opt}
                      </label>
                    ))}
                  </div>
                ) : (
                  q.type === 'choice' ? (
                    <select
                      value={responses[q.id] || ''}
                      onChange={(e) => setResponses((r) => ({ ...r, [q.id]: e.target.value }))}
                      className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-orange-400"
                    >
                      <option value="">Select...</option>
                      {(q.options || []).map((opt: string) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={responses[q.id] || ''}
                      onChange={(e) => setResponses((r) => ({ ...r, [q.id]: e.target.value }))}
                      placeholder={`Enter ${q.label.toLowerCase()}`}
                      className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-orange-400"
                    />
                  )
                )}
                {errors[q.id] && <p className="text-[10px] text-red-500 mt-0.5">{errors[q.id]}</p>}
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
          <button
            onClick={handlePrev}
            disabled={currentSection === 0}
            className="px-4 py-2 text-xs font-medium border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          {isLastSection ? (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-6 py-2 text-xs font-medium bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit Survey'}
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="px-4 py-2 text-xs font-medium bg-orange-500 text-white rounded-lg hover:bg-orange-600"
            >
              Next Section
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
