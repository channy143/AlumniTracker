import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, BriefcaseIcon, AcademicCapIcon, MapPinIcon, LinkIcon, StarIcon, CheckBadgeIcon, TrophyIcon, ClockIcon, BuildingOfficeIcon, ChartBarIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { directoryApi } from '@/services/api';
import { addRecentlyViewed } from '@/utils/recentlyViewed';
import { SkeletonCard, SkeletonRow, SkeletonText } from '@/components/ui/Skeleton';

function SectionTitle({ icon, title }: { icon: any; title: string }) {
  const Icon = icon;
  return (
    <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-1.5 mb-3">
      <Icon className="w-4 h-4 text-orange-500" />
      {title}
    </h2>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-xs font-medium text-gray-800 text-right max-w-[60%]">{value}</span>
    </div>
  );
}

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <StarIcon key={i} className={`w-4 h-4 ${i <= rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} />
      ))}
    </span>
  );
}

function TimelineArrow() {
  return (
    <div className="flex flex-col items-center py-0.5">
      <div className="w-2 h-2 rounded-full border-2 border-orange-400" />
      <div className="w-0.5 h-6 bg-orange-200" />
    </div>
  );
}

export default function DirectoryProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    directoryApi.get(id)
      .then((data: any) => {
        setProfile(data);
        if (data && !data.is_admin) addRecentlyViewed({ id: data.id, first_name: data.first_name, last_name: data.last_name, avatar_url: data.avatar_url });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="h-4 w-28 bg-gray-200 animate-pulse rounded" />
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-gray-200 animate-pulse shrink-0" />
            <div className="space-y-2 flex-1">
              <div className="h-4 w-48 bg-gray-200 animate-pulse rounded" />
              <div className="h-3 w-32 bg-gray-200 animate-pulse rounded" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SkeletonCard className="h-40" />
          <SkeletonCard className="h-40" />
        </div>
        <SkeletonCard className="h-32" />
        <SkeletonCard className="h-48" />
      </div>
    );
  }
  if (!profile) return <div className="text-center py-12 text-sm text-gray-500">Profile not found.</div>;

  const current = profile.employment?.find((e: any) => e.is_current);
  const prevEmployments = profile.employment?.filter((e: any) => !e.is_current) || [];
  const timeline = current ? [...prevEmployments, current] : profile.employment || [];

  // Skills grouped by category
  const skillGroups: Record<string, any[]> = {};
  (profile.skills || []).forEach((s: any) => {
    const cat = s.category || 'Other';
    if (!skillGroups[cat]) skillGroups[cat] = [];
    skillGroups[cat].push(s);
  });

  const hasFeedback = profile.career_feedback;

  function calcYears(startDate: string): string {
    if (!startDate) return '';
    const start = new Date(startDate);
    const now = new Date();
    const months = (now.getFullYear() - start.getFullYear()) * 12 + now.getMonth() - start.getMonth();
    if (months < 1) return 'Less than a month';
    if (months < 12) return `${months} month${months > 1 ? 's' : ''}`;
    const years = Math.floor(months / 12);
    const rem = months % 12;
    return rem > 0 ? `${years} year${years > 1 ? 's' : ''} ${rem} month${rem > 1 ? 's' : ''}` : `${years} year${years > 1 ? 's' : ''}`;
  }

  const portfolioLinks = [
    { label: 'LinkedIn', url: profile.linkedin_url, icon: LinkIcon },
    { label: 'GitHub', url: profile.github_url, icon: LinkIcon },
    { label: 'Portfolio', url: profile.portfolio_url, icon: LinkIcon },
    { label: 'Behance', url: profile.behance_url, icon: LinkIcon },
    { label: 'Google Scholar', url: profile.google_scholar_url, icon: LinkIcon },
    { label: 'Personal Website', url: profile.personal_website_url, icon: LinkIcon },
  ].filter((l) => l.url);

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <button onClick={() => navigate('/directory')} className="flex items-center gap-1 text-xs font-medium text-orange-600 hover:text-orange-700 transition-colors">
        <ArrowLeftIcon className="w-4 h-4" />
        Back to Directory
      </button>

      {/* Section 1: Profile Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gray-300 flex items-center justify-center text-xl font-bold text-white shrink-0 overflow-hidden">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              ((profile.first_name?.[0] || '') + (profile.last_name?.[0] || '')).toUpperCase()
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-gray-900">{profile.first_name} {profile.middle_name ? profile.middle_name + ' ' : ''}{profile.last_name}</h1>
            {profile.headline && <p className="text-sm text-gray-500">{profile.headline}</p>}
            {current && (
              <p className="text-xs text-gray-400 mt-0.5">
                {current.position} at {current.company_name}
              </p>
            )}
            {(profile.city || profile.province) && (
              <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                <MapPinIcon className="w-3 h-3" />
                {[profile.city, profile.province].filter(Boolean).join(', ')}
              </p>
            )}
          </div>
        </div>
        {profile.bio && <p className="text-sm text-gray-600 mt-3">{profile.bio}</p>}
      </div>

      {/* Section 2: Career Summary */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <SectionTitle icon={ChartBarIcon} title="Career Summary" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
          <div>
            <InfoRow label="Employment Status" value={profile.employment_status || current?.employment_status || ''} />
            <InfoRow label="Industry" value={profile.industry || current?.company_industry || ''} />
            <InfoRow label="Current Position" value={current?.position || ''} />
            <InfoRow label="Company" value={current?.company_name || ''} />
          </div>
          <div>
            <InfoRow label="Employment Type" value={current?.job_type || ''} />
            <InfoRow label="Location" value={[profile.city, profile.province].filter(Boolean).join(', ')} />
            <InfoRow label="Years in Current Job" value={current?.start_date ? calcYears(current.start_date) : ''} />
          </div>
        </div>
      </div>

      {/* Section 3: Career Timeline */}
      {timeline.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <SectionTitle icon={ClockIcon} title="Career Timeline" />
          <div className="space-y-0">
            {timeline.map((emp: any, i: number) => (
              <div key={emp.id || i}>
                {i > 0 && <TimelineArrow />}
                <div className={`flex items-start gap-3 ${emp.is_current ? 'bg-orange-50 -mx-2 px-2 py-1.5 rounded-lg' : ''}`}>
                  <div className="w-12 h-12 rounded-lg bg-orange-50 flex flex-col items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-orange-600 leading-none">{emp.start_date ? new Date(emp.start_date).getFullYear() : '—'}</span>
                    {emp.is_current && <span className="text-[8px] text-orange-400 mt-0.5">Current</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{emp.position}</p>
                    <p className="text-xs text-gray-500">{emp.company_name}{emp.company_industry ? ` · ${emp.company_industry}` : ''}</p>
                    {emp.start_date && (
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {new Date(emp.start_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                        {emp.end_date ? ` — ${new Date(emp.end_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}` : ' — Present'}
                      </p>
                    )}
                    {emp.description && <p className="text-[11px] text-gray-600 mt-1">{emp.description}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section 4: Skills */}
      {Object.keys(skillGroups).length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <SectionTitle icon={ChartBarIcon} title="Skills" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Object.entries(skillGroups).map(([category, skills]) => (
              <div key={category}>
                <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">{category}</h3>
                <div className="flex flex-wrap gap-1.5">
                  {skills.map((s: any, i: number) => (
                    <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-medium rounded-full">
                      ✓ {s.name}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section 5: Professional Certifications */}
      {profile.certifications?.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <SectionTitle icon={CheckBadgeIcon} title="Professional Certifications" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {profile.certifications.map((cert: any, i: number) => (
              <div key={i} className="border border-gray-100 rounded-lg px-3 py-2">
                <p className="text-xs font-semibold text-gray-800">{cert.name}</p>
                <p className="text-[10px] text-gray-500">{cert.issuer}</p>
                {cert.issue_date && <p className="text-[10px] text-gray-400">{new Date(cert.issue_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })}</p>}
                {cert.credential_url && (
                  <a href={cert.credential_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-orange-600 hover:underline mt-0.5 inline-block">View Credential</a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section 6: Professional Achievements */}
      {profile.achievements?.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <SectionTitle icon={TrophyIcon} title="Professional Achievements" />
          <div className="space-y-2">
            {profile.achievements.map((a: any, i: number) => (
              <div key={i} className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-full bg-amber-50 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[9px]">★</span>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-800">{a.title}</p>
                  {a.description && <p className="text-[10px] text-gray-500">{a.description}</p>}
                  {a.date_achieved && <p className="text-[10px] text-gray-400">{new Date(a.date_achieved).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section 7: Portfolio & Professional Links */}
      {portfolioLinks.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <SectionTitle icon={LinkIcon} title="Portfolio & Professional Links" />
          <div className="flex flex-wrap gap-2">
            {portfolioLinks.map((link, i) => (
              <a
                key={i}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700 hover:bg-orange-50 hover:border-orange-200 hover:text-orange-700 transition-colors"
              >
                <link.icon className="w-3.5 h-3.5" />
                {link.label}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Section 8: Career Feedback */}
      {hasFeedback && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <SectionTitle icon={UserGroupIcon} title="Career Feedback" />
          <div className="space-y-3">
            <div className="flex items-center gap-4 text-sm">
              <span className="text-xs text-gray-500">Degree Relevance:</span>
              <span className="flex items-center gap-1 text-xs font-medium text-gray-800">
                <StarRating rating={hasFeedback.degree_relevance || 0} />
                {hasFeedback.degree_relevance}/5
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-xs text-gray-500">Curriculum Preparedness:</span>
              <span className="flex items-center gap-1 text-xs font-medium text-gray-800">
                <StarRating rating={hasFeedback.curriculum_preparation || 0} />
                {hasFeedback.curriculum_preparation}/5
              </span>
            </div>
            {hasFeedback.recommend_changes !== null && hasFeedback.recommend_changes !== undefined && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-gray-500">Recommend Curriculum Changes:</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${hasFeedback.recommend_changes ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                  {hasFeedback.recommend_changes ? 'Yes' : 'No'}
                </span>
              </div>
            )}
            {hasFeedback.suggested_skills?.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 mb-1.5">Suggested Skills:</p>
                <div className="flex flex-wrap gap-1.5">
                  {hasFeedback.suggested_skills.map((s: string, i: number) => (
                    <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-medium rounded-full">• {s}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Section 9: Employment Information */}
      {profile.employment?.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <SectionTitle icon={BuildingOfficeIcon} title="Employment History" />
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-gray-500">
                  <th className="text-left py-2 pr-3 font-medium">Industry</th>
                  <th className="text-left py-2 pr-3 font-medium">Company</th>
                  <th className="text-left py-2 pr-3 font-medium">Position</th>
                  <th className="text-left py-2 pr-3 font-medium">Type</th>
                  <th className="text-left py-2 pr-3 font-medium">Salary</th>
                  <th className="text-left py-2 pr-3 font-medium">Started</th>
                  <th className="text-left py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {profile.employment.map((emp: any, i: number) => (
                  <tr key={i} className="border-b border-gray-50 last:border-0">
                    <td className="py-2 pr-3 text-gray-700">{emp.company_industry || '—'}</td>
                    <td className="py-2 pr-3 font-medium text-gray-800">{emp.company_name}</td>
                    <td className="py-2 pr-3 text-gray-700">{emp.position}</td>
                    <td className="py-2 pr-3 text-gray-700"><span className="bg-gray-100 px-1.5 py-0.5 rounded text-[10px]">{emp.job_type || '—'}</span></td>
                    <td className="py-2 pr-3 text-gray-500">{emp.salary_range ? `₱${emp.salary_range}` : '—'}</td>
                    <td className="py-2 pr-3 text-gray-500">{emp.start_date ? new Date(emp.start_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—'}</td>
                    <td className="py-2">{emp.is_current ? <span className="text-orange-600 font-medium">Current</span> : <span className="text-gray-400">Past</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Section 10: Curriculum Insights */}
      {hasFeedback && (hasFeedback.skills_used_at_work?.length > 0 || hasFeedback.suggested_subjects?.length > 0) && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <SectionTitle icon={AcademicCapIcon} title="Curriculum Insights" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {hasFeedback.skills_used_at_work?.length > 0 && (
              <div>
                <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Skills used at work</h3>
                <div className="flex flex-wrap gap-1.5">
                  {hasFeedback.skills_used_at_work.map((s: string, i: number) => (
                    <span key={i} className="px-2 py-0.5 bg-orange-50 text-orange-700 text-[10px] font-medium rounded-full">{s}</span>
                  ))}
                </div>
              </div>
            )}
            {hasFeedback.suggested_subjects?.length > 0 && (
              <div>
                <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Suggested subjects</h3>
                <div className="flex flex-wrap gap-1.5">
                  {hasFeedback.suggested_subjects.map((s: string, i: number) => (
                    <span key={i} className="px-2 py-0.5 bg-purple-50 text-purple-700 text-[10px] font-medium rounded-full">{s}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Education Section */}
      {profile.education?.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <SectionTitle icon={AcademicCapIcon} title="Education" />
          <div className="space-y-2">
            {profile.education.map((edu: any, i: number) => (
              <div key={i} className="flex items-start gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                  <AcademicCapIcon className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">{edu.program || edu.major}</p>
                  <p className="text-xs text-gray-500">CTU-Naga{edu.campus ? ` - ${edu.campus}` : ''}</p>
                  <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-0.5">
                    {edu.year_graduated && <span>Class of {edu.year_graduated}</span>}
                    {edu.honors && <><span>·</span><span className="text-amber-600 font-medium">{edu.honors}</span></>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
