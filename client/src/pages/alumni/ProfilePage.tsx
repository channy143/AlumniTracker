import { useState, useEffect, useRef, useCallback } from 'react';
import { profileApi, employmentApi, activitiesApi, authApi } from '@/services/api';
import {
  CameraIcon, PencilIcon, BriefcaseIcon, MapPinIcon,
  AcademicCapIcon, CheckBadgeIcon, UserIcon, ClockIcon,
  BuildingOfficeIcon, ChartBarIcon, LinkIcon, CalendarDaysIcon,
  TrophyIcon, ArrowTrendingUpIcon
} from '@heroicons/react/24/outline';
import { SkeletonCard } from '@/components/ui/Skeleton';

const tabs = [
  { id: 'overview', label: 'Overview', icon: UserIcon },
  { id: 'career', label: 'Career', icon: ArrowTrendingUpIcon },
  { id: 'education', label: 'Education', icon: AcademicCapIcon },
  { id: 'activity', label: 'Activity', icon: ClockIcon },
  { id: 'history', label: 'History', icon: ClockIcon },
];

function calcYears(startDate: string): number {
  if (!startDate) return 0;
  const start = new Date(startDate);
  const now = new Date();
  return Math.floor((now.getTime() - start.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
}

function calcProfileCompletion(profile: any): number {
  if (!profile) return 0;
  const fields = [
    profile.first_name, profile.last_name, profile.email,
    profile.phone, profile.city, profile.bio,
    profile.employment_status, profile.headline,
  ];
  const filled = fields.filter(Boolean).length;
  const hasEducation = (profile.education || []).length > 0;
  const hasSkills = (profile.skills || []).length > 0;
  const hasEmployment = (profile.employment || []).length > 0;
  const total = 8 + 3;
  let score = filled + (hasEducation ? 1 : 0) + (hasSkills ? 1 : 0) + (hasEmployment ? 1 : 0);
  return Math.min(100, Math.round((score / total) * 100));
}

function SectionLine({ label }: { label: string }) {
  return (
    <span className="text-black text-xs uppercase tracking-[0.25em] font-semibold flex items-center gap-3 mb-3">
      <span className="w-6 h-px bg-black/20" />
      {label}
    </span>
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

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [profile, setProfile] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [activities, setActivities] = useState<any[]>([]);
  const [form, setForm] = useState<any>({});
  const fileRef = useRef<HTMLInputElement>(null);
  const resumeRef = useRef<HTMLInputElement>(null);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [editSkills, setEditSkills] = useState<string[]>([]);
  const [editEducation, setEditEducation] = useState<any[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [showSkillDropdown, setShowSkillDropdown] = useState(false);
  const skillRef = useRef<HTMLDivElement>(null);
  const [certifications, setCertifications] = useState<any[]>([]);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [showCertForm, setShowCertForm] = useState(false);
  const [showAchievementForm, setShowAchievementForm] = useState(false);
  const [certForm, setCertForm] = useState<any>({ name: '', issuer: '', issue_date: '', expiry_date: '', credential_url: '' });
  const [achievementForm, setAchievementForm] = useState<any>({ title: '', description: '', category: 'other', date_achieved: '' });
  const [trainings, setTrainings] = useState<any[]>([]);
  const [editSection, setEditSection] = useState<'personal' | 'security'>('personal');
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });


  const COMMON_SKILLS = [
    'React', 'Angular', 'Vue.js', 'Next.js', 'Nuxt.js', 'Svelte', 'Solid.js',
    'TypeScript', 'JavaScript', 'HTML', 'CSS', 'SCSS', 'Tailwind CSS', 'Bootstrap',
    'Node.js', 'Express', 'NestJS', 'Fastify', 'Deno', 'Bun',
    'Python', 'Django', 'Flask', 'FastAPI', 'Ruby on Rails', 'PHP', 'Laravel', 'Symfony',
    'Java', 'Spring Boot', 'Kotlin', 'C#', '.NET', 'Go', 'Rust', 'C++', 'C', 'Swift',
    'PostgreSQL', 'MySQL', 'MongoDB', 'SQLite', 'Redis', 'Firebase', 'Supabase',
    'Docker', 'Kubernetes', 'AWS', 'Google Cloud', 'Azure', 'Terraform', 'CI/CD',
    'Git', 'GitHub', 'GitLab', 'Figma', 'Adobe XD', 'Sketch', 'Photoshop', 'Illustrator',
    'After Effects', 'Premiere Pro', 'Blender', 'Canva', 'Notion', 'Jira', 'Trello',
    'REST API', 'GraphQL', 'WebSocket', 'gRPC', 'MQTT',
    'Linux', 'Nginx', 'Apache', 'Webpack', 'Vite', 'Babel', 'ESLint', 'Prettier',
    'Jest', 'Vitest', 'Cypress', 'Playwright', 'Selenium', 'Testing Library',
    'Data Science', 'Machine Learning', 'AI', 'Deep Learning', 'TensorFlow', 'PyTorch',
    'Agile', 'Scrum', 'Project Management', 'UI/UX Design', 'Product Management',
    'Digital Marketing', 'SEO', 'Content Writing', 'Data Analysis', 'Excel',
    'AutoCAD', 'SolidWorks', 'MATLAB', 'R', 'Tableau', 'Power BI',
    'Accounting', 'Finance', 'Human Resources', 'Customer Service', 'Sales',
    'Public Speaking', 'Leadership', 'Team Management', 'Research', 'Technical Writing',
  ];

  const closeSkillDropdown = useCallback(() => setShowSkillDropdown(false), []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (skillRef.current && !skillRef.current.contains(e.target as Node)) {
        closeSkillDropdown();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [closeSkillDropdown]);

  useEffect(() => {
    loadProfile();
    loadActivities();
    loadCareerData();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const data = await profileApi.get();
      setProfile(data);
      if (data) {
        setForm({
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          email: data.email || '',
          phone: data.phone || '',
          address: data.address || '',
          city: data.city || '',
          province: data.province || '',
          bio: data.bio || '',
          employment_status: data.employment_status || '',
          current_job_title: data.current_job_title || '',
          company_name: data.company_name || '',
          industry: data.industry || '',
          salary_range: data.salary_range || '',
        });
      }
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const loadActivities = async () => {
    try {
      const data = await activitiesApi.list();
      setActivities(data || []);
    } catch {}
  };

  const loadCareerData = async () => {
    try {
      const [certs, achievs] = await Promise.all([
        profileApi.get().then(p => p?.certifications || []),
        profileApi.listAchievements(),
      ]);
      setCertifications(certs);
      setAchievements(achievs || []);
    } catch {}
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      const payload: any = {};
      if (form.first_name !== undefined) payload.first_name = form.first_name;
      if (form.last_name !== undefined) payload.last_name = form.last_name;
      if (form.phone !== undefined) payload.phone = form.phone;
      if (form.address !== undefined) payload.address = form.address;
      if (form.city !== undefined) payload.city = form.city;
      if (form.province !== undefined) payload.province = form.province;
      if (form.bio !== undefined) payload.bio = form.bio;
      const careerFields: any = {};
      const careerKeys = ['employment_status', 'current_job_title', 'company_name', 'industry', 'salary_range'];
      let hasCareerChanges = false;
      for (const key of careerKeys) {
        if (form[key] !== profile?.[key]) {
          careerFields[key] = form[key] || null;
          hasCareerChanges = true;
        }
      }
      const updated = await profileApi.update(payload);
      if (hasCareerChanges) {
        await profileApi.updateCareer(careerFields);
        const mapStatus = (s: string) => {
          const map: Record<string, string> = {
            'Employed': 'employed',
            'Self-employed': 'self-employed',
            'Unemployed': 'unemployed',
            'Student': 'student',
            'Seeking Opportunities': 'seeking',
            'Retired': 'retired',
          };
          return map[s] || s?.toLowerCase().replace(/\s+/g, '-') || 'employed';
        };
        try {
          const finalStatus = careerFields.employment_status || profile?.employment_status || 'Employed';
          const records = await employmentApi.list();
          const current = records.find((r: any) => r.is_current);
          const empPayload = {
            position: form.current_job_title || 'Not specified',
            company_name: form.company_name || 'Not specified',
            company_industry: form.industry || 'Not specified',
            employment_status: mapStatus(finalStatus),
            is_current: true,
            start_date: current?.start_date || new Date().toISOString().split('T')[0],
          };
          if (current) {
            await employmentApi.update(current.id, empPayload);
          } else {
            await employmentApi.create(empPayload);
          }
        } catch (e) {
          console.warn('Failed to sync employment record:', e);
        }
      }
      await profileApi.batchSkills(editSkills.map((name: string) => ({ name })));
      const origEdu = profile?.education || [];
      const origIds = origEdu.map((e: any) => e.id);
      const currIds = editEducation.filter((e: any) => e.id).map((e: any) => e.id);
      const toDelete = origIds.filter((id: string) => !currIds.includes(id));
      for (const id of toDelete) {
        await profileApi.deleteEducation(id);
      }
      for (const edu of editEducation) {
        const { program, major, year_started, year_graduated, campus, institution, honors } = edu;
        const p: any = { program, major, year_started, year_graduated, campus: campus || institution, honors };
        if (edu.id) {
          await profileApi.updateEducation(edu.id, p);
        } else {
          await profileApi.addEducation(p);
        }
      }
      const fresh = await profileApi.get();
      setProfile(fresh);
      setEditing(false);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }
    try {
      setSaving(true);
      setError('');
      await authApi.changePassword(passwordForm.currentPassword, passwordForm.newPassword);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setEditSection('personal');
    } catch (err: any) {
      setError(err.message || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowed.includes(file.type)) {
      setError('Only PDF and DOC/DOCX files are allowed');
      return;
    }
    try {
      setUploadingResume(true);
      setError('');
      const result = await profileApi.uploadResume(file);
      setProfile((prev: any) => ({ ...prev, resume_url: result.url }));
    } catch (err: any) {
      setError(err.message || 'Failed to upload resume');
    } finally {
      setUploadingResume(false);
    }
  };

  const handleDeleteResume = async () => {
    try {
      await profileApi.deleteResume();
      setProfile((prev: any) => ({ ...prev, resume_url: null }));
    } catch (err: any) {
      setError(err.message || 'Failed to delete resume');
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setError('');
      const result = await profileApi.uploadPhoto(file);
      setProfile((prev: any) => ({ ...prev, avatar_url: result.url }));
      window.dispatchEvent(new CustomEvent('avatar-updated', { detail: { url: result.url } }));
    } catch (err: any) {
      setError(err.message || 'Failed to upload photo');
    }
  };

  const handleAddCertification = async () => {
    try {
      setError('');
      const data = await profileApi.addCertification(certForm);
      setCertifications(prev => [data, ...prev]);
      setCertForm({ name: '', issuer: '', issue_date: '', expiry_date: '', credential_url: '' });
      setShowCertForm(false);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteCertification = async (id: string) => {
    try {
      await profileApi.deleteCertification(id);
      setCertifications(prev => prev.filter(c => c.id !== id));
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleAddAchievement = async () => {
    try {
      setError('');
      const data = await profileApi.addAchievement(achievementForm);
      setAchievements(prev => [data, ...prev]);
      setAchievementForm({ title: '', description: '', category: 'other', date_achieved: '' });
      setShowAchievementForm(false);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteAchievement = async (id: string) => {
    try {
      await profileApi.deleteAchievement(id);
      setAchievements(prev => prev.filter(a => a.id !== id));
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-9 h-9 rounded-full bg-orange-500 flex items-center justify-center text-white text-sm font-bold">
            <UserIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-black">My Profile</h1>
            <p className="text-xs text-black/60">Loading profile...</p>
          </div>
        </div>
        <SkeletonCard />
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-9 h-9 rounded-full bg-orange-500 flex items-center justify-center text-white text-sm font-bold">
            <UserIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-black">My Profile</h1>
            <p className="text-xs text-black/60">An error occurred</p>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg text-center py-12">
          <p className="text-red-600">{error}</p>
          <button onClick={loadProfile} className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors">Retry</button>
        </div>
      </div>
    );
  }

  const initials = profile
    ? `${(profile.first_name || '')[0] || ''}${(profile.last_name || '')[0] || ''}`
    : '?';
  const fullName = profile ? `${profile.first_name || ''} ${profile.last_name || ''}` : '';
  const firstEdu = profile?.education?.[0];
  const programInfo = firstEdu ? firstEdu.program || '' : '';
  const batchInfo = firstEdu?.year_graduated || '';
  const currentEmp = profile?.employment?.find((e: any) => e.is_current);
  const totalYearsExp = (() => {
    const emps = profile?.employment || [];
    if (emps.length === 0) return 0;
    const startDates = emps.map((e: any) => e.start_date).filter(Boolean).sort();
    if (startDates.length === 0) return 0;
    return calcYears(startDates[0]);
  })();
  const careerPositions = (profile?.employment || []).length;
  const profileCompletion = calcProfileCompletion(profile);

  const profileStats = [
    {
      label: 'Employment Status',
      value: profile?.employment_status || 'Not set',
      icon: BriefcaseIcon,
    },
    {
      label: 'Years of Experience',
      value: `${totalYearsExp} Year${totalYearsExp !== 1 ? 's' : ''}`,
      icon: ChartBarIcon,
    },
    {
      label: 'Career Positions',
      value: careerPositions,
      icon: TrophyIcon,
    },
    {
      label: 'Profile Completion',
      value: `${profileCompletion}%`,
      icon: CheckBadgeIcon,
    },
  ];

  const professionalLinks = [
    { key: 'linkedin_url', label: 'LinkedIn', icon: LinkIcon, url: profile?.linkedin_url },
    { key: 'github_url', label: 'GitHub', icon: LinkIcon, url: profile?.github_url },
    { key: 'personal_website_url', label: 'Personal Website', icon: LinkIcon, url: profile?.personal_website_url },
  ].filter(l => l.url);

  const employment = profile?.employment || [];
  const sortedEmployment = [...employment].sort((a: any, b: any) => {
    if (a.is_current) return -1;
    if (b.is_current) return 1;
    return new Date(b.start_date || 0).getTime() - new Date(a.start_date || 0).getTime();
  });

  const renderOverview = () => (
    <div className="flex-1 space-y-5">
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <SectionLine label="About" />
        <p className="text-sm text-gray-700 leading-relaxed">{profile?.bio || 'No bio added yet.'}</p>
      </div>

      {professionalLinks.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <SectionLine label="Professional Links" />
          <div className="flex flex-wrap gap-2">
            {professionalLinks.map((link, i) => (
              <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700 hover:bg-orange-50 hover:border-orange-200 hover:text-orange-700 transition-colors">
                <LinkIcon className="w-3.5 h-3.5" />
                {link.label}
              </a>
            ))}
            {profile?.resume_url && (
              <a href={profile.resume_url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700 hover:bg-orange-50 hover:border-orange-200 hover:text-orange-700 transition-colors">
                <CheckBadgeIcon className="w-3.5 h-3.5" />
                Resume
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const renderEditModal = () => {
    if (!editing) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 pb-10">
        <div className="fixed inset-0 bg-black/50" onClick={() => setEditing(false)} />
        <div className="relative bg-white rounded-xl max-w-4xl w-full mx-4 max-h-[90vh] shadow-2xl flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 shrink-0">
            <h3 className="text-base font-bold text-gray-900">Edit Profile</h3>
          </div>

          {/* Body */}
          <div className="flex flex-1 min-h-0">
            {/* Left Sidebar */}
            <div className="w-52 shrink-0 border-r border-gray-200 p-4 space-y-1">
              <button onClick={() => setEditSection('personal')} className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-left transition-colors cursor-pointer ${
                editSection === 'personal' ? 'bg-orange-50 text-orange-700 font-semibold' : 'text-gray-600 hover:bg-gray-50 font-medium'
              }`}>
                <UserIcon className="w-4 h-4" />
                Personal Information
              </button>
              <button onClick={() => setEditSection('security')} className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-left transition-colors cursor-pointer ${
                editSection === 'security' ? 'bg-orange-50 text-orange-700 font-semibold' : 'text-gray-600 hover:bg-gray-50 font-medium'
              }`}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                Security &amp; Password
              </button>
            </div>

            {/* Form Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {editSection === 'personal' ? (
                <div className="space-y-6">
                  <div>
                    <SectionLine label="Personal Information" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">First Name</label>
                        <input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-400" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Last Name</label>
                        <input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-400" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Phone</label>
                        <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-400" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">City</label>
                        <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-400" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Province</label>
                        <input value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-400" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Address</label>
                        <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-400" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <SectionLine label="Bio" />
                    <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-400 mt-3" placeholder="Brief professional summary" />
                  </div>

                  <div>
                    <SectionLine label="Employment" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Status</label>
                        <select value={form.employment_status} onChange={(e) => setForm((f: any) => ({ ...f, employment_status: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-400">
                          <option value="">Select...</option>
                          <option value="Employed">Employed</option>
                          <option value="Self-employed">Self-employed</option>
                          <option value="Unemployed">Unemployed</option>
                          <option value="Student">Student</option>
                          <option value="Seeking Opportunities">Seeking Opportunities</option>
                          <option value="Retired">Retired</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Current Position</label>
                        <input value={form.current_job_title} onChange={(e) => setForm((f: any) => ({ ...f, current_job_title: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-400" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Company</label>
                        <input value={form.company_name} onChange={(e) => setForm((f: any) => ({ ...f, company_name: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-400" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Industry</label>
                        <input value={form.industry} onChange={(e) => setForm((f: any) => ({ ...f, industry: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-400" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Salary Range</label>
                        <input value={form.salary_range} onChange={(e) => setForm((f: any) => ({ ...f, salary_range: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-400" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <SectionLine label="Skills" />
                    <div ref={skillRef} className="relative mt-3">
                      <div className="flex flex-wrap gap-2 mb-2">
                        {editSkills.map((name, i) => (
                          <span key={i} className="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-50 text-black text-sm rounded-full border border-orange-200">
                            {name}
                            <button onClick={() => setEditSkills(prev => prev.filter((_, idx) => idx !== i))} className="text-black/30 hover:text-red-500 ml-0.5 cursor-pointer">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          </span>
                        ))}
                      </div>
                      <input value={skillInput} onChange={(e) => { setSkillInput(e.target.value); setShowSkillDropdown(true); }}
                        onFocus={() => setShowSkillDropdown(true)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && skillInput.trim()) {
                            e.preventDefault();
                            const val = skillInput.trim();
                            if (!editSkills.includes(val)) setEditSkills(prev => [...prev, val]);
                            setSkillInput(''); setShowSkillDropdown(false);
                          }
                        }}
                        placeholder="Type or select a skill..." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-400" />
                      {showSkillDropdown && (
                        <div className="absolute z-10 top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          {COMMON_SKILLS.filter(s => s.toLowerCase().includes(skillInput.toLowerCase()) && !editSkills.includes(s)).slice(0, 20).map(s => (
                            <button key={s} className="w-full text-left px-3 py-2 text-sm text-black hover:bg-orange-50 transition-colors cursor-pointer"
                              onClick={() => { setEditSkills(prev => [...prev, s]); setSkillInput(''); setShowSkillDropdown(false); }}>{s}</button>
                          ))}
                          {skillInput.trim() && !COMMON_SKILLS.some(s => s.toLowerCase() === skillInput.trim().toLowerCase()) && (
                            <button className="w-full text-left px-3 py-2 text-sm text-orange-600 font-medium hover:bg-orange-50 border-t border-gray-100 cursor-pointer"
                              onClick={() => { const val = skillInput.trim(); if (!editSkills.includes(val)) setEditSkills(prev => [...prev, val]); setSkillInput(''); setShowSkillDropdown(false); }}>
                              Add &ldquo;{skillInput.trim()}&rdquo;
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <SectionLine label="Education" />
                    <div className="space-y-2 mt-3">
                      {editEducation.map((edu: any, i: number) => (
                        <div key={i} className="flex items-start gap-1.5 pb-2 mb-2 border-b border-gray-100 last:border-0 last:pb-0 last:mb-0">
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                              <input value={edu.program || ''} onChange={(e) => { const next = [...editEducation]; next[i] = { ...next[i], program: e.target.value }; setEditEducation(next); }} placeholder="Program / Degree" className="w-full border border-gray-300 rounded px-2 py-1 text-sm outline-none focus:border-orange-400" />
                              <input type="number" value={edu.year_graduated || ''} onChange={(e) => { const next = [...editEducation]; next[i] = { ...next[i], year_graduated: parseInt(e.target.value) || '' }; setEditEducation(next); }} placeholder="Year" className="w-full border border-gray-300 rounded px-2 py-1 text-sm outline-none focus:border-orange-400" />
                            </div>
                            <input value={edu.institution || edu.campus || ''} onChange={(e) => { const next = [...editEducation]; next[i] = { ...next[i], institution: e.target.value, campus: e.target.value }; setEditEducation(next); }} placeholder="Institution" className="w-full border border-gray-300 rounded px-2 py-1 text-sm outline-none focus:border-orange-400" />
                            <input value={edu.honors || ''} onChange={(e) => { const next = [...editEducation]; next[i] = { ...next[i], honors: e.target.value }; setEditEducation(next); }} placeholder="Honors" className="w-full border border-gray-300 rounded px-2 py-1 text-sm outline-none focus:border-orange-400" />
                          </div>
                          <button onClick={() => setEditEducation(prev => prev.filter((_, idx) => idx !== i))} className="text-black/30 hover:text-red-500 shrink-0 mt-1 p-0.5 cursor-pointer">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        </div>
                      ))}
                      {editEducation.length === 0 && <p className="text-xs text-black/50">No education entries.</p>}
                      <button onClick={() => setEditEducation(prev => [...prev, { program: '', year_graduated: '', campus: 'CTU-Naga Extension Campus', institution: 'CTU-Naga Extension Campus' }])} className="text-xs text-orange-600 hover:text-orange-700 font-medium cursor-pointer">+ Add Education</button>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button onClick={handleSave} disabled={saving} className="px-5 py-2 bg-orange-500 text-white text-sm font-semibold rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 cursor-pointer">
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button onClick={() => setEditing(false)} className="px-5 py-2 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Change Password */}
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
                    <SectionLine label="Change Password" />
                    <div className="space-y-4 mt-3 max-w-md">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Current Password</label>
                        <input type="password" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-400" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">New Password</label>
                        <input type="password" value={passwordForm.newPassword} onChange={(e) => {
                          setPasswordForm({ ...passwordForm, newPassword: e.target.value });
                        }} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-400" />
                        {passwordForm.newPassword && (
                          <div className="mt-2">
                            <div className="flex gap-1">
                              {[1, 2, 3, 4].map((level) => {
                                const strength = passwordForm.newPassword.length < 6 ? 1 : passwordForm.newPassword.length < 8 ? 2 : passwordForm.newPassword.length < 12 ? 3 : 4;
                                const colors = ['bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-green-500'];
                                const labels = ['Weak', 'Fair', 'Good', 'Strong'];
                                return (
                                  <div key={level} className={`flex-1 h-1.5 rounded-full ${level <= strength ? colors[strength - 1] : 'bg-gray-200'} transition-colors`} />
                                );
                              })}
                            </div>
                            <p className="text-[10px] text-gray-400 mt-1">
                              {passwordForm.newPassword.length < 6 ? 'Weak — at least 6 characters' : passwordForm.newPassword.length < 8 ? 'Fair' : passwordForm.newPassword.length < 12 ? 'Good' : 'Strong'}
                            </p>
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Confirm New Password</label>
                        <input type="password" value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-400" />
                        {passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword && (
                          <p className="text-[10px] text-red-500 mt-1">Passwords do not match</p>
                        )}
                      </div>
                      <div className="pt-2">
                        <button onClick={handleChangePassword} disabled={saving || !passwordForm.currentPassword || !passwordForm.newPassword || passwordForm.newPassword !== passwordForm.confirmPassword} className="px-5 py-2 bg-orange-500 text-white text-sm font-semibold rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 cursor-pointer">
                          {saving ? 'Changing...' : 'Change Password'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderCareer = () => (
    <div className="max-w-3xl space-y-6">
      {/* Career Timeline */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <SectionLine label="Career Timeline" />
        <div className="relative pl-8 space-y-0">
          <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-orange-200" />

          {/* Graduation entry */}
          {programInfo && batchInfo && (
            <div className="relative pb-6">
              <div className="absolute left-[-23px] top-1 w-4 h-4 rounded-full bg-orange-100 border-2 border-orange-400 flex items-center justify-center">
                <AcademicCapIcon className="w-2 h-2 text-orange-600" />
              </div>
              <p className="text-[11px] text-gray-400 font-medium">{batchInfo}</p>
              <p className="text-sm font-semibold text-gray-800">Graduated</p>
              <p className="text-xs text-gray-500">{programInfo}</p>
              <p className="text-xs text-gray-400">CTU-Naga Extension Campus</p>
            </div>
          )}

          {/* Employment entries */}
          {sortedEmployment.map((emp: any, i: number) => (
            <div key={emp.id || i} className="relative pb-6 last:pb-0">
              <div className={`absolute left-[-23px] top-1 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                emp.is_current ? 'bg-orange-400 border-orange-400' : 'bg-white border-orange-300'
              }`}>
                <div className={`w-1.5 h-1.5 rounded-full ${emp.is_current ? 'bg-white' : 'bg-orange-300'}`} />
              </div>
              <div className={`${emp.is_current ? 'bg-orange-50 -ml-3 -mr-3 px-3 py-2 rounded-lg' : ''}`}>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-[11px] text-gray-400 font-medium">
                    {emp.start_date ? new Date(emp.start_date).getFullYear() : '—'}
                    {emp.is_current ? ' - Present' : emp.end_date ? ` - ${new Date(emp.end_date).getFullYear()}` : ''}
                  </p>
                  {emp.is_current && <span className="text-[10px] font-medium text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded">Current</span>}
                </div>
                <p className="text-sm font-semibold text-gray-800 mt-0.5">{emp.position}</p>
                <p className="text-xs text-gray-500">{emp.company_name}{emp.company_industry ? ` · ${emp.company_industry}` : ''}</p>
                {emp.salary_range && <p className="text-[11px] text-gray-400">{emp.salary_range}</p>}
                {emp.start_date && (
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {calcYears(emp.start_date)} year{calcYears(emp.start_date) !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
            </div>
          ))}

          {sortedEmployment.length === 0 && !programInfo && (
            <p className="text-sm text-gray-500 py-4">No career entries yet. Add your employment history in Edit Profile.</p>
          )}
        </div>
      </div>

      {/* Certifications */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <SectionLine label="Certifications" />
          <button onClick={() => setShowCertForm(!showCertForm)} className="flex items-center gap-1 text-xs text-orange-600 hover:text-orange-700 font-medium cursor-pointer">
            {showCertForm ? 'Cancel' : '+ Add'}
          </button>
        </div>
        {showCertForm && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input value={certForm.name} onChange={(e) => setCertForm((f: any) => ({ ...f, name: e.target.value }))} placeholder="Certification name" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-400" />
              <input value={certForm.issuer} onChange={(e) => setCertForm((f: any) => ({ ...f, issuer: e.target.value }))} placeholder="Issuer" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-400" />
              <input type="date" value={certForm.issue_date} onChange={(e) => setCertForm((f: any) => ({ ...f, issue_date: e.target.value }))} placeholder="Issue date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-400" />
              <input type="date" value={certForm.expiry_date} onChange={(e) => setCertForm((f: any) => ({ ...f, expiry_date: e.target.value }))} placeholder="Expiry date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-400" />
            </div>
            <input value={certForm.credential_url} onChange={(e) => setCertForm((f: any) => ({ ...f, credential_url: e.target.value }))} placeholder="Credential URL" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-400" />
            <button onClick={handleAddCertification} className="px-4 py-1.5 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition-colors cursor-pointer">Add Certification</button>
          </div>
        )}
        {certifications.length === 0 ? (
          <p className="text-sm text-black/50 font-light">No certifications added yet.</p>
        ) : (
          <div className="space-y-2">
            {certifications.map((cert: any) => (
              <div key={cert.id} className="flex items-start gap-3 pb-2 border-b border-gray-100 last:border-0 group">
                <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
                  <CheckBadgeIcon className="w-4 h-4 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-black">{cert.name}</p>
                  <p className="text-xs text-black/50">{cert.issuer}{cert.issue_date ? ` · ${new Date(cert.issue_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })}` : ''}</p>
                  {cert.credential_url && (
                    <a href={cert.credential_url} target="_blank" rel="noopener noreferrer" className="text-xs text-orange-600 hover:underline">View Credential</a>
                  )}
                </div>
                <button onClick={() => handleDeleteCertification(cert.id)} className="opacity-0 group-hover:opacity-100 text-black/30 hover:text-red-500 transition-all p-1 cursor-pointer">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Achievements */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <SectionLine label="Achievements" />
          <button onClick={() => setShowAchievementForm(!showAchievementForm)} className="flex items-center gap-1 text-xs text-orange-600 hover:text-orange-700 font-medium cursor-pointer">
            {showAchievementForm ? 'Cancel' : '+ Add'}
          </button>
        </div>
        {showAchievementForm && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
            <input value={achievementForm.title} onChange={(e) => setAchievementForm((f: any) => ({ ...f, title: e.target.value }))} placeholder="Achievement title" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-400" />
            <textarea value={achievementForm.description} onChange={(e) => setAchievementForm((f: any) => ({ ...f, description: e.target.value }))} placeholder="Description" rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-400" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <select value={achievementForm.category} onChange={(e) => setAchievementForm((f: any) => ({ ...f, category: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-400">
                <option value="other">Other</option>
                <option value="award">Award</option>
                <option value="recognition">Recognition</option>
                <option value="publication">Publication</option>
                <option value="speaker">Speaker</option>
                <option value="promotion">Promotion</option>
                <option value="leadership">Leadership</option>
              </select>
              <input type="date" value={achievementForm.date_achieved} onChange={(e) => setAchievementForm((f: any) => ({ ...f, date_achieved: e.target.value }))} placeholder="Date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-400" />
            </div>
            <button onClick={handleAddAchievement} className="px-4 py-1.5 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition-colors cursor-pointer">Add Achievement</button>
          </div>
        )}
        {achievements.length === 0 ? (
          <p className="text-sm text-black/50 font-light">No achievements added yet.</p>
        ) : (
          <div className="space-y-2">
            {achievements.map((a: any) => (
              <div key={a.id} className="flex items-start gap-3 pb-2 border-b border-gray-100 last:border-0 group">
                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                  <TrophyIcon className="w-4 h-4 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-black">{a.title}</p>
                  {a.description && <p className="text-xs text-black/50">{a.description}</p>}
                  {a.date_achieved && <p className="text-xs text-gray-400 mt-0.5">{new Date(a.date_achieved).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })}</p>}
                </div>
                <button onClick={() => handleDeleteAchievement(a.id)} className="opacity-0 group-hover:opacity-100 text-black/30 hover:text-red-500 transition-all p-1 cursor-pointer">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );

  const renderEducation = () => (
    <div className="max-w-3xl space-y-5">
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <SectionLine label="Education" />
        {profile?.education?.length ? (
          <div className="space-y-4">
            {profile.education.map((edu: any, i: number) => (
              <div key={i} className="flex items-start gap-4 pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
                  <AcademicCapIcon className="w-6 h-6 text-orange-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-gray-900">{edu.program || edu.degree}</h3>
                  <p className="text-sm text-gray-500">CTU-Naga{edu.campus ? ` - ${edu.campus}` : ''}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    {edu.year_graduated && (
                      <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                        <CalendarDaysIcon className="w-3.5 h-3.5" />
                        Class of {edu.year_graduated}
                      </span>
                    )}
                    {edu.year_started && (
                      <span className="text-xs text-gray-400">(Enrolled {edu.year_started})</span>
                    )}
                    {edu.honors && (
                      <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-medium rounded-full">{edu.honors}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-black/50 font-light">No education records added yet.</p>
        )}
      </div>

      {/* Certifications in Education */}
      {certifications.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <SectionLine label="Certifications" />
          <div className="space-y-2">
            {certifications.map((cert: any) => (
              <div key={cert.id} className="flex items-start gap-3 pb-2 border-b border-gray-100 last:border-0">
                <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
                  <CheckBadgeIcon className="w-4 h-4 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-black">{cert.name}</p>
                  <p className="text-xs text-black/50">{cert.issuer}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trainings placeholder */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <SectionLine label="Trainings / Seminars" />
        {trainings.length === 0 ? (
          <p className="text-sm text-black/50 font-light">No trainings or seminars recorded yet.</p>
        ) : (
          <div className="space-y-2">
            {trainings.map((t: any, i: number) => (
              <div key={i} className="flex items-start gap-3 pb-2 border-b border-gray-100 last:border-0">
                <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
                  <TrophyIcon className="w-4 h-4 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-black">{t.name}</p>
                  <p className="text-xs text-black/50">{t.provider}{t.date ? ` · ${t.date}` : ''}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderActivity = () => (
    <div className="max-w-3xl">
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <SectionLine label="Alumni Engagement Timeline" />
        <div className="relative pl-8 space-y-0">
          <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-orange-200" />

          {profile?.employment?.map((emp: any, i: number) => (
            <div key={emp.id || i} className="relative pb-6 last:pb-0">
              <div className="absolute left-[-23px] top-1 w-4 h-4 rounded-full bg-emerald-100 border-2 border-emerald-400 flex items-center justify-center">
                <BriefcaseIcon className="w-2 h-2 text-emerald-600" />
              </div>
              <p className="text-[11px] text-gray-400 font-medium">
                {emp.start_date ? new Date(emp.start_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' }) : '—'}
              </p>
              <p className="text-sm font-medium text-gray-800">{emp.is_current ? 'Started New Position' : 'Employment Updated'}</p>
              <p className="text-xs text-gray-500">{emp.position} at {emp.company_name}</p>
            </div>
          ))}

          {activities.length > 0 ? (
            activities.map((a: any, i: number) => (
              <div key={a.id || i} className="relative pb-6 last:pb-0">
                <div className="absolute left-[-23px] top-1 w-4 h-4 rounded-full bg-gray-100 border-2 border-gray-300 flex items-center justify-center">
                  <ClockIcon className="w-2 h-2 text-gray-500" />
                </div>
                <p className="text-[11px] text-gray-400 font-medium">
                  {a.created_at ? new Date(a.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short' }) : '—'}
                </p>
                <p className="text-sm font-medium text-gray-800">{a.action || 'Activity'}</p>
                <p className="text-xs text-gray-500">{a.target || ''}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500 py-4">No activity recorded yet. Your alumni engagement will appear here.</p>
          )}
        </div>
      </div>
    </div>
  );

  const renderHistory = () => (
    <div className="max-w-3xl">
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <SectionLine label="Profile History" />
        <div className="relative pl-8 space-y-0">
          <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-orange-200" />

          {profile?.updated_at && (
            <div className="relative pb-6">
              <div className="absolute left-[-23px] top-1 w-4 h-4 rounded-full bg-orange-100 border-2 border-orange-400 flex items-center justify-center">
                <PencilIcon className="w-2 h-2 text-orange-600" />
              </div>
              <p className="text-[11px] text-gray-400 font-medium">{new Date(profile.updated_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
              <p className="text-sm font-medium text-gray-800">Profile Edited</p>
              <p className="text-xs text-gray-500">Personal information updated</p>
            </div>
          )}

          {profile?.created_at && (
            <div className="relative pb-6 last:pb-0">
              <div className="absolute left-[-23px] top-1 w-4 h-4 rounded-full bg-green-100 border-2 border-green-400 flex items-center justify-center">
                <UserIcon className="w-2 h-2 text-green-600" />
              </div>
              <p className="text-[11px] text-gray-400 font-medium">{new Date(profile.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
              <p className="text-sm font-medium text-gray-800">Account Created</p>
              <p className="text-xs text-gray-500">Alumni profile registered</p>
            </div>
          )}

          {/* Employment history changes */}
          {profile?.employment?.map((emp: any, i: number) => (
            <div key={emp.id || i} className="relative pb-6 last:pb-0">
              <div className="absolute left-[-23px] top-1 w-4 h-4 rounded-full bg-blue-100 border-2 border-blue-400 flex items-center justify-center">
                <BuildingOfficeIcon className="w-2 h-2 text-blue-600" />
              </div>
              <p className="text-[11px] text-gray-400 font-medium">
                {emp.start_date ? new Date(emp.start_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' }) : '—'}
              </p>
              <p className="text-sm font-medium text-gray-800">Employment {emp.is_current ? 'Updated' : 'Added'}</p>
              <p className="text-xs text-gray-500">{emp.position} at {emp.company_name}</p>
            </div>
          ))}

          {!profile?.updated_at && (!profile?.employment || profile.employment.length === 0) && (
            <p className="text-sm text-gray-500 py-4">No history recorded yet.</p>
          )}
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview': return renderOverview();
      case 'career': return renderCareer();
      case 'education': return renderEducation();
      case 'activity': return renderActivity();
      case 'history': return renderHistory();
      default: return null;
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-9 h-9 rounded-full bg-orange-500 flex items-center justify-center text-white text-sm font-bold">
          <UserIcon className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-base font-bold text-black">My Profile</h1>
          <p className="text-xs text-black/60">Alumni career record</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">{error}</div>
      )}

      {/* Hero Card */}
      <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 sm:p-8 mb-0 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-1/3 w-48 h-48 bg-white rounded-full translate-y-1/3" />
        </div>

        <div className="relative flex flex-col sm:flex-row gap-6">
          {/* Left - Avatar + Basic Info */}
          <div className="flex items-center gap-5 flex-1">
            <div className="relative shrink-0">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-white/60 shadow-lg overflow-hidden bg-white/20 flex items-center justify-center">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white text-3xl sm:text-4xl font-bold font-display">{initials}</span>
                )}
              </div>
              <button
                onClick={() => fileRef.current?.click()}
                className="absolute -bottom-1 -right-1 w-9 h-9 bg-white rounded-full flex items-center justify-center text-orange-600 hover:bg-orange-50 transition-colors shadow-md border-2 border-orange-500 cursor-pointer"
              >
                <CameraIcon className="w-4 h-4" />
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            </div>

            <div className="min-w-0">
              <h2 className="text-xl sm:text-2xl font-bold font-display text-white">{fullName}</h2>
              {programInfo && (
                <p className="text-orange-100 text-sm mt-0.5 flex items-center gap-1.5">
                  <AcademicCapIcon className="w-4 h-4 shrink-0" />
                  {programInfo}{batchInfo ? ` · Class of ${batchInfo}` : ''}
                </p>
              )}
              {currentEmp && (
                <p className="text-sm text-white/90 mt-1 flex items-center gap-1.5">
                  <BriefcaseIcon className="w-3.5 h-3.5 shrink-0" />
                  {currentEmp.position}{currentEmp.company_name ? ` at ${currentEmp.company_name}` : ''}
                </p>
              )}
              {(profile?.city || profile?.province) && (
                <p className="text-xs text-white/70 mt-1 flex items-center gap-1">
                  <MapPinIcon className="w-3 h-3" />
                  {[profile.city, profile.province].filter(Boolean).join(', ')}
                </p>
              )}

              {/* Edit Profile button */}
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => {
                    setEditSkills(profile?.skills?.map((s: any) => s.name || s) || []);
                    const eduList = profile?.education?.map((e: any) => ({ ...e })) || [];
                    if (eduList.length === 0) {
                      eduList.push({ program: '', year_graduated: '', campus: 'CTU-Naga Extension Campus', institution: 'CTU-Naga Extension Campus' });
                    }
                    setEditEducation(eduList);
                    setEditing(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-white text-orange-600 rounded-lg text-sm font-semibold hover:bg-orange-50 transition-colors shadow-sm cursor-pointer"
                >
                  <PencilIcon className="w-4 h-4" /> Edit Profile
                </button>

                {/* Resume upload */}
                <input ref={resumeRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleResumeUpload} />
                {profile?.resume_url ? (
                  <div className="flex items-center gap-2">
                    <a href={profile.resume_url} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-white/70 hover:text-white underline underline-offset-2 transition-colors font-light">View Resume</a>
                    <span className="text-white/30 text-xs">|</span>
                    <button onClick={handleDeleteResume} className="text-xs text-white/50 hover:text-red-300 underline underline-offset-2 transition-colors font-light cursor-pointer">Remove</button>
                  </div>
                ) : (
                  <button onClick={() => resumeRef.current?.click()} disabled={uploadingResume}
                    className="text-xs text-white/70 hover:text-white underline underline-offset-2 transition-colors disabled:opacity-50 font-light cursor-pointer">
                    {uploadingResume ? 'Uploading...' : 'Add Resume'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
        {profileStats.map((stat) => (
          <div key={stat.label} className="bg-white border border-gray-200 rounded-xl px-4 py-3">
            <div className="flex items-center gap-2 mb-1">
              <stat.icon className="w-4 h-4 text-orange-500" />
              <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">{stat.label}</span>
            </div>
            <p className="text-lg font-bold text-gray-900">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="sticky top-0 z-30 -mt-px">
        <div className="px-2">
          <nav className="flex overflow-x-auto gap-1 py-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all cursor-pointer ${
                    activeTab === tab.id
                      ? 'bg-black/5 text-black shadow-sm'
                      : 'text-black/50 hover:text-black hover:bg-black/5'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

        {/* Tab Content + Sidebar */}
      <div className="mt-6 flex flex-col lg:flex-row gap-6">
        <div className="flex-1 min-w-0">
          {renderTabContent()}
        </div>
        {/* Right Sidebar — persistent across all tabs */}
        <div className="w-full lg:w-80 shrink-0 space-y-5">
          {/* Skills */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <SectionLine label="Skills" />
            {profile?.skills?.length ? (
              <div className="flex flex-wrap gap-2">
                {profile.skills.map((s: any) => (
                  <span key={s.id || s.name} className="px-3 py-1.5 bg-orange-50 text-black text-sm rounded-full border border-orange-200">
                    {s.name || s}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-black/50 font-light">No skills added yet</p>
            )}
          </div>

          {/* Current Employment */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <SectionLine label="Current Employment" />
            {currentEmp || profile?.employment_status ? (
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-[11px] text-gray-500 block">Employment Status</span>
                  <span className="font-medium text-gray-800">{profile?.employment_status || currentEmp?.employment_status || 'Employed'}</span>
                </div>
                <InfoRow label="Position" value={currentEmp?.position || form.current_job_title} />
                <InfoRow label="Company" value={currentEmp?.company_name || form.company_name} />
                <InfoRow label="Industry" value={currentEmp?.company_industry || form.industry} />
                <InfoRow label="Location" value={profile?.city ? `${profile.city}${profile.province ? `, ${profile.province}` : ''}` : ''} />
                {currentEmp?.start_date && (
                  <InfoRow label="Started" value={new Date(currentEmp.start_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} />
                )}
              </div>
            ) : (
              <p className="text-sm text-black/50 font-light">No employment record yet.</p>
            )}
          </div>
        </div>
      </div>

      {renderEditModal()}
    </div>
  );
}