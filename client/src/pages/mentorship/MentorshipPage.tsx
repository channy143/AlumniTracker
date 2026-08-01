import { useState, useEffect } from 'react';
import { mentorshipApi } from '@/services/api';

export default function MentorshipPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mentorships, setMentorships] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'find' | 'my'>('find');
  const [applying, setApplying] = useState<string | null>(null);

  useEffect(() => {
    loadMentorships();
  }, []);

  const loadMentorships = async () => {
    try {
      setLoading(true);
      const data = await mentorshipApi.list();
      setMentorships(data);
    } catch {
      setError('Failed to load mentorship data');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async (mentorId: string) => {
    try {
      setApplying(mentorId);
      await mentorshipApi.apply({ mentor_id: mentorId });
      loadMentorships();
    } catch {
      setError('Failed to apply for mentorship');
    } finally {
      setApplying(null);
    }
  };

  const availableMentors = mentorships.filter(
    (m) => m.role === 'mentor' && m.status === 'available'
  );

  const myMentorships = mentorships.filter(
    (m) => m.role === 'mentee' || m.status === 'active' || m.status === 'pending'
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div><h1 className="section-title">Mentorship Platform</h1><p className="text-gray-500 mt-1">Loading...</p></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => <div key={i} className="card animate-pulse h-48" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div><h1 className="section-title">Mentorship Platform</h1></div>
        <div className="card text-center py-12">
          <p className="text-red-600">{error}</p>
          <button onClick={loadMentorships} className="btn-primary mt-4">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="section-title">Mentorship Platform</h1>
        <p className="text-gray-500 mt-1">Connect with experienced alumni who can guide your career journey</p>
      </div>

      <div className="flex gap-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('find')}
          className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${activeTab === 'find' ? 'border-ctu-blue text-ctu-blue' : 'border-transparent text-gray-500 hover:text-ctu-charcoal'}`}
        >
          Find a Mentor
        </button>
        <button
          onClick={() => setActiveTab('my')}
          className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${activeTab === 'my' ? 'border-ctu-blue text-ctu-blue' : 'border-transparent text-gray-500 hover:text-ctu-charcoal'}`}
        >
          My Mentorships ({myMentorships.length})
        </button>
      </div>

      {activeTab === 'find' && (
        availableMentors.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-gray-400">No mentors available at the moment. Check back later!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {availableMentors.map((mentor) => {
              const profile = mentor.mentor_profile || mentor.profile || {};
              const name = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Mentor';
              const title = profile.current_position || profile.bio || 'Alumni Mentor';
              const expertise = mentor.expertise || [];
              return (
                <div key={mentor.id} className="card">
                  <div className="flex items-start justify-between">
                    <div className="w-14 h-14 rounded-full bg-ctu-gold/20 flex items-center justify-center text-ctu-gold font-bold text-xl">
                      {name.charAt(0)}
                    </div>
                    <span className="px-2 py-1 text-xs rounded-full bg-green-50 text-green-700">Available</span>
                  </div>
                  <h3 className="text-lg font-semibold text-ctu-charcoal mt-4">{name}</h3>
                  <p className="text-sm text-ctu-blue">{title}</p>
                  {expertise.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <p className="text-xs text-gray-500 font-medium uppercase">Expertise</p>
                      <div className="flex flex-wrap gap-2">
                        {expertise.map((exp: string, i: number) => (
                          <span key={i} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">{exp}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-sm text-gray-400">{mentor.mentee_count || 0} mentees</span>
                    <button
                      onClick={() => handleApply(mentor.id)}
                      disabled={applying === mentor.id}
                      className="btn-primary text-sm disabled:opacity-50"
                    >
                      {applying === mentor.id ? 'Applying...' : 'Request Mentorship'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {activeTab === 'my' && (
        myMentorships.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-gray-500">
              You haven't joined any mentorship programs yet.{' '}
              <button onClick={() => setActiveTab('find')} className="text-ctu-blue font-medium hover:underline">
                Find a mentor
              </button>
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myMentorships.map((m) => {
              const profile = m.mentor_profile || m.mentee_profile || m.profile || {};
              const name = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Alumni';
              const title = profile.current_position || '';
              return (
                <div key={m.id} className="card">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-ctu-blue/10 flex items-center justify-center text-ctu-blue font-bold">
                      {name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-ctu-charcoal">{name}</h3>
                      <p className="text-sm text-gray-500">{title}</p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <span className={`px-2 py-1 text-xs rounded-full ${m.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
                      {m.status === 'active' ? 'Active' : 'Pending'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}
