import { useState, useEffect } from 'react';
import { jobsApi, networkingApi, connectionsApi, referralsApi } from '@/services/api';
import { MapPinIcon, CurrencyDollarIcon, ClockIcon, BuildingOfficeIcon, GlobeAltIcon, UserGroupIcon, ArrowTopRightOnSquareIcon, ChatBubbleLeftRightIcon, HandRaisedIcon } from '@heroicons/react/24/outline';

export default function JobsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [jobs, setJobs] = useState<any[]>([]);
  const [filter, setFilter] = useState('All');
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [alumniAtCompany, setAlumniAtCompany] = useState<any[]>([]);
  const [loadingAlumni, setLoadingAlumni] = useState(false);
  const [showAlumni, setShowAlumni] = useState(false);
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [referralTarget, setReferralTarget] = useState<any>(null);
  const [referralMsg, setReferralMsg] = useState('');
  const [sendingReferral, setSendingReferral] = useState(false);

  useEffect(() => { loadJobs(); }, []);

  const loadJobs = async () => {
    try {
      setLoading(true);
      const data = await jobsApi.list();
      setJobs(data);
    } catch {
      setError('Failed to load job listings');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (job: any) => {
    setSelectedJob(job);
    setShowAlumni(false);
    setAlumniAtCompany([]);
  };

  const handleViewAlumni = async (companyName: string) => {
    try {
      setLoadingAlumni(true);
      setShowAlumni(true);
      const data = await networkingApi.alumniAtCompanyName(companyName);
      setAlumniAtCompany(data);
    } catch {
      setAlumniAtCompany([]);
    } finally {
      setLoadingAlumni(false);
    }
  };

  const handleRequestReferral = (alumni: any) => {
    setReferralTarget(alumni);
    setReferralMsg('');
    setShowReferralModal(true);
  };

  const handleSendReferral = async () => {
    if (!referralTarget || !selectedJob) return;
    try {
      setSendingReferral(true);
      await referralsApi.create({
        recipient_id: referralTarget.id,
        job_id: selectedJob.id,
        company_name: selectedJob.company_name,
        position_title: selectedJob.position,
        message: referralMsg || undefined,
      });
      setShowReferralModal(false);
      setReferralTarget(null);
    } catch (err: any) {
      setError(err.message || 'Failed to send referral request');
    } finally {
      setSendingReferral(false);
    }
  };

  const handleConnect = async (alumni: any) => {
    try {
      await connectionsApi.request(alumni.id, `Hi ${alumni.first_name}, I'd love to connect and learn more about your experience at ${selectedJob?.company_name || 'your company'}.`);
    } catch (err: any) {
      setError(err.message || 'Failed to send connection request');
    }
  };

  const filters = ['All', 'Full-Time', 'Part-Time', 'Contract', 'Freelance', 'Alumni Exclusive'];
  const filteredJobs = jobs.filter((job) => {
    if (filter === 'All') return true;
    if (filter === 'Alumni Exclusive') return job.is_alumni_exclusive;
    return job.job_type === filter;
  });
  const alumniExclusiveCount = jobs.filter((j) => j.is_alumni_exclusive).length;

  if (loading) {
    return (
      <div className="space-y-6">
        <div><h1 className="section-title">Career Opportunities</h1><p className="text-gray-500 mt-1">Loading available positions...</p></div>
        <div className="space-y-4">{[1, 2, 3].map((i) => <div key={i} className="card animate-pulse h-28" />)}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="section-title">Career Opportunities</h1>
          <p className="text-gray-500 mt-1">Discover opportunities and connect with alumni at top companies</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card text-center">
          <p className="text-3xl font-bold text-ctu-blue">{jobs.length}</p>
          <p className="text-sm text-gray-500 mt-1">Total Openings</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-ctu-teal">{alumniExclusiveCount}</p>
          <p className="text-sm text-gray-500 mt-1">Alumni Exclusive</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-ctu-gold">{filters.length - 2}</p>
          <p className="text-sm text-gray-500 mt-1">Job Types Available</p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {filters.map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 text-sm rounded-full border transition-colors ${filter === f ? 'bg-ctu-blue text-white border-ctu-blue' : 'border-gray-300 text-gray-600 hover:border-ctu-blue hover:text-ctu-blue'}`}>
            {f}
          </button>
        ))}
      </div>

      {filteredJobs.length === 0 ? (
        <div className="card text-center py-12">
          <div className="w-14 h-14 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <BuildingOfficeIcon className="w-7 h-7 text-gray-400" />
          </div>
          <p className="text-gray-500 font-medium">No opportunities match this filter</p>
          <p className="text-sm text-gray-400 mt-1">Try selecting a different category</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredJobs.map((job) => (
            <div key={job.id} onClick={() => handleViewDetails(job)}
              className="card hover:shadow-lg transition-all duration-200 cursor-pointer group">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-ctu-blue to-blue-700 flex items-center justify-center text-white font-bold shrink-0 text-lg shadow-sm">
                  {(job.company_name || '?').charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-ctu-charcoal group-hover:text-ctu-blue transition-colors">{job.position}</h3>
                      <p className="text-ctu-blue font-medium">{job.company_name}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {job.is_alumni_exclusive && <span className="px-2 py-1 bg-ctu-gold/20 text-ctu-gold text-xs rounded-full font-medium">Exclusive</span>}
                      <span className="text-sm text-gray-400">{job.created_at ? new Date(job.created_at).toLocaleDateString() : 'Recently'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-3 text-sm text-gray-500 flex-wrap">
                    <span className="flex items-center gap-1"><MapPinIcon className="w-4 h-4" /> {job.location || 'N/A'}</span>
                    <span className="flex items-center gap-1"><ClockIcon className="w-4 h-4" /> {job.job_type}</span>
                    <span className="flex items-center gap-1"><CurrencyDollarIcon className="w-4 h-4" /> {job.salary_range || 'Negotiable'}</span>
                    {job.industry && <span className="flex items-center gap-1"><BuildingOfficeIcon className="w-4 h-4" /> {job.industry}</span>}
                  </div>
                  <div className="mt-3">
                    <span className="text-sm text-ctu-blue group-hover:underline">View Details →</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedJob && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setSelectedJob(null)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>

            <div className="bg-gradient-to-r from-ctu-blue to-blue-800 px-6 pt-6 pb-16 relative">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center text-white font-bold text-2xl shadow-lg shrink-0 border border-white/10">
                    {(selectedJob.company_name || '?').charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white leading-tight">{selectedJob.position}</h2>
                    <p className="text-blue-200 font-medium text-sm mt-0.5">{selectedJob.company_name}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedJob(null)} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-all text-lg shrink-0">&times;</button>
              </div>

              <div className="absolute -bottom-7 left-6 right-6 grid grid-cols-3 gap-3">
                <div className="bg-white rounded-xl shadow-lg py-3 px-3 text-center">
                  <MapPinIcon className="w-4 h-4 mx-auto text-ctu-blue mb-1" />
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">Location</p>
                  <p className="text-xs font-bold text-ctu-charcoal mt-0.5 truncate">{selectedJob.location || 'N/A'}</p>
                </div>
                <div className="bg-white rounded-xl shadow-lg py-3 px-3 text-center">
                  <ClockIcon className="w-4 h-4 mx-auto text-ctu-blue mb-1" />
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">Type</p>
                  <p className="text-xs font-bold text-ctu-charcoal mt-0.5 capitalize">{selectedJob.job_type}</p>
                </div>
                <div className="bg-white rounded-xl shadow-lg py-3 px-3 text-center">
                  <CurrencyDollarIcon className="w-4 h-4 mx-auto text-ctu-blue mb-1" />
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">Salary</p>
                  <p className="text-xs font-bold text-ctu-charcoal mt-0.5 truncate">{selectedJob.salary_range || 'Negotiable'}</p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pt-10 pb-4">
              <div className="flex flex-wrap items-center gap-2 mb-5">
                {selectedJob.is_alumni_exclusive && <span className="px-3 py-1 bg-ctu-gold/15 text-ctu-gold text-xs rounded-full font-bold uppercase tracking-wider">Alumni Exclusive</span>}
                {selectedJob.industry && <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs rounded-full font-medium">{selectedJob.industry}</span>}
                {selectedJob.experience_level && <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded-full font-medium capitalize">{selectedJob.experience_level} level</span>}
                {selectedJob.is_remote && <span className="px-3 py-1 bg-green-50 text-green-700 text-xs rounded-full font-medium">Remote</span>}
                {selectedJob.expires_at && <span className="text-[11px] text-gray-400 ml-auto">Closes {new Date(selectedJob.expires_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>}
              </div>

              <div className="mb-6">
                <h3 className="text-sm font-bold text-ctu-charcoal uppercase tracking-wider mb-3">About This Role</h3>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{selectedJob.description || 'No description provided.'}</p>
                </div>
              </div>

              {selectedJob.requirements?.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-bold text-ctu-charcoal uppercase tracking-wider mb-3">Requirements</h3>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <ul className="space-y-2">
                      {selectedJob.requirements.map((req: string, i: number) => (
                        <li key={i} className="flex items-start gap-2.5 text-sm text-gray-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-ctu-blue mt-1.5 shrink-0" />
                          {req}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {selectedJob.required_skills?.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-bold text-ctu-charcoal uppercase tracking-wider mb-3">Required Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedJob.required_skills.map((skill: string, i: number) => (
                      <span key={i} className="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 text-xs rounded-lg font-medium shadow-sm">{skill}</span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-gray-100">
                {selectedJob.application_url && (
                  <a href={selectedJob.application_url} target="_blank" rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-ctu-blue text-white rounded-xl text-sm font-semibold hover:bg-blue-800 transition-colors shadow-sm">
                    <ArrowTopRightOnSquareIcon className="w-4 h-4" /> Apply Externally
                  </a>
                )}
                <button onClick={() => {
                  if (!showAlumni) handleViewAlumni(selectedJob.company_name);
                  setShowAlumni(!showAlumni);
                }}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm ${
                    showAlumni ? 'bg-ctu-blue text-white' : 'border-2 border-ctu-blue text-ctu-blue hover:bg-blue-50'
                  }`}>
                  <UserGroupIcon className="w-4 h-4" /> {showAlumni ? 'Hide Alumni' : 'See Alumni Here'}
                </button>
              </div>

              {showAlumni && (
                <div className="mt-6 bg-gray-50 rounded-xl p-4">
                  <h3 className="text-sm font-bold text-ctu-charcoal mb-4 flex items-center gap-2">
                    <UserGroupIcon className="w-4 h-4 text-ctu-blue" />
                    Alumni at {selectedJob.company_name}
                    <span className="text-xs font-normal text-gray-400 ml-1">({alumniAtCompany.length})</span>
                  </h3>
                  {loadingAlumni ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => <div key={i} className="animate-pulse h-16 bg-white rounded-lg" />)}
                    </div>
                  ) : alumniAtCompany.length === 0 ? (
                    <div className="text-center py-6">
                      <UserGroupIcon className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                      <p className="text-sm text-gray-400">No alumni currently listed at this company</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {alumniAtCompany.map((alumni: any) => (
                        <div key={alumni.id} className="flex items-center gap-3 bg-white rounded-lg p-3 border border-gray-100 hover:border-blue-200 transition-all">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-ctu-blue to-blue-700 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-sm">
                            {((alumni.first_name || '')[0] + (alumni.last_name || '')[0]).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-ctu-charcoal">{alumni.first_name} {alumni.last_name}</p>
                            {alumni.current_position && <p className="text-xs text-gray-500 truncate">{alumni.current_position}</p>}
                            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-400">
                              {alumni.graduation_year && <span>Batch {alumni.graduation_year}</span>}
                              {alumni.program && <span>&middot; {alumni.program}</span>}
                              {alumni.years_at_company > 0 && <span>&middot; {alumni.years_at_company}yr</span>}
                            </div>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <button onClick={() => handleConnect(alumni)}
                              className="px-2.5 py-1.5 text-[11px] font-semibold rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors whitespace-nowrap">
                              Connect
                            </button>
                            {alumni.available_for_referral && (
                              <button onClick={() => handleRequestReferral(alumni)}
                                className="px-2.5 py-1.5 text-[11px] font-semibold rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors whitespace-nowrap">
                                Referral
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showReferralModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowReferralModal(false)}>
          <div className="bg-white rounded-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-ctu-charcoal mb-2">Request Referral</h3>
            <p className="text-sm text-gray-500 mb-4">Request a referral from {referralTarget?.first_name} {referralTarget?.last_name} for {selectedJob?.position} at {selectedJob?.company_name}</p>
            <textarea value={referralMsg} onChange={(e) => setReferralMsg(e.target.value)}
              className="input-field w-full h-24 resize-none text-sm" placeholder="Add a personal message (optional)..." />
            <div className="flex gap-3 justify-end mt-4">
              <button onClick={() => setShowReferralModal(false)} className="btn-secondary text-sm">Cancel</button>
              <button onClick={handleSendReferral} disabled={sendingReferral}
                className="btn-primary text-sm disabled:opacity-50">
                {sendingReferral ? 'Sending...' : 'Send Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="fixed bottom-6 right-6 bg-red-50 text-red-700 px-4 py-3 rounded-lg shadow-lg text-sm max-w-sm">
          {error}
          <button onClick={() => setError('')} className="ml-3 text-red-500 hover:text-red-700">&times;</button>
        </div>
      )}
    </div>
  );
}
