import { useState, useEffect, useRef } from 'react';
import { profileApi } from '@/services/api';
import { CameraIcon } from '@heroicons/react/24/outline';

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [profile, setProfile] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({});
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const data = await profileApi.get();
      setProfile(data);
      setForm({
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        email: data.email || '',
        phone: data.phone || '',
        address: data.address || '',
        city: data.city || '',
        province: data.province || '',
        bio: data.bio || '',
      });
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
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
      const updated = await profileApi.update(payload);
      setProfile(updated);
      setEditing(false);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setError('');
      const result = await profileApi.uploadPhoto(file);
      setProfile((prev: any) => ({ ...prev, avatar_url: result.url }));
    } catch (err: any) {
      setError(err.message || 'Failed to upload photo');
    }
  };

  const calcStrength = (p: any) => {
    let score = 0;
    if (p?.first_name && p?.last_name) score += 20;
    if (p?.phone) score += 15;
    if (p?.city) score += 10;
    if (p?.bio && p.bio.length > 20) score += 20;
    if (p?.education?.length) score += 15;
    if (p?.skills?.length) score += 20;
    return score;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div><h1 className="section-title">My Profile</h1><p className="text-gray-500 mt-1">Loading profile...</p></div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1"><div className="card animate-pulse h-64" /></div>
          <div className="lg:col-span-2"><div className="card animate-pulse h-96" /></div>
        </div>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="space-y-6">
        <div><h1 className="section-title">My Profile</h1></div>
        <div className="card text-center py-12">
          <p className="text-red-600">{error}</p>
          <button onClick={loadProfile} className="btn-primary mt-4">Retry</button>
        </div>
      </div>
    );
  }

  const initials = profile
    ? `${(profile.first_name || '')[0] || ''}${(profile.last_name || '')[0] || ''}`
    : '?';
  const strength = calcStrength(profile);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="section-title">My Profile</h1>
          <p className="text-gray-500 mt-1">Manage your alumni profile and preferences</p>
        </div>
        <button
          onClick={() => (editing ? handleSave() : setEditing(true))}
          disabled={saving}
          className={editing ? 'btn-primary' : 'btn-secondary'}
        >
          {saving ? 'Saving...' : editing ? 'Save Changes' : 'Edit Profile'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="card text-center">
            <div className="relative inline-block">
              <div className="w-24 h-24 rounded-full bg-ctu-blue mx-auto flex items-center justify-center text-white text-3xl font-bold overflow-hidden">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  initials
                )}
              </div>
              <button
                onClick={() => fileRef.current?.click()}
                className="absolute -bottom-1 -right-1 w-8 h-8 bg-ctu-gold rounded-full flex items-center justify-center text-white hover:bg-ctu-gold/90 transition-colors shadow-md"
              >
                <CameraIcon className="w-4 h-4" />
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            </div>
            <h2 className="text-xl font-semibold text-ctu-charcoal mt-4">
              {profile?.first_name} {profile?.last_name}
            </h2>
            <p className="text-gray-500">{profile?.education?.[0]?.program ? `${profile.education[0].program} '${profile.education[0].year_graduated || ''}` : ''}</p>
            <p className="text-sm text-gray-400 mt-2">{profile?.headline || ''}</p>

            <div className="mt-6 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Profile Strength</span>
                <span className="font-medium text-ctu-teal">{strength}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-ctu-teal h-2 rounded-full transition-all" style={{ width: `${strength}%` }} />
              </div>
            </div>
          </div>

          <div className="card mt-6">
            <h3 className="font-semibold text-ctu-charcoal mb-3">Skills</h3>
            {profile?.skills?.length ? (
              <div className="flex flex-wrap gap-2">
                {profile.skills.map((s: any) => (
                  <span key={s.id || s.name} className="px-3 py-1 bg-ctu-blue/10 text-ctu-blue text-sm rounded-full">
                    {s.name || s}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No skills added yet</p>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <h3 className="font-semibold text-ctu-charcoal mb-4">Personal Information</h3>
            {editing ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-500 mb-1">First Name</label>
                  <input
                    value={form.first_name}
                    onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-ctu-blue/20 focus:border-ctu-blue outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Last Name</label>
                  <input
                    value={form.last_name}
                    onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-ctu-blue/20 focus:border-ctu-blue outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Email</label>
                  <input
                    value={form.email}
                    disabled
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Phone</label>
                  <input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-ctu-blue/20 focus:border-ctu-blue outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">City</label>
                  <input
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-ctu-blue/20 focus:border-ctu-blue outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Province</label>
                  <input
                    value={form.province}
                    onChange={(e) => setForm({ ...form, province: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-ctu-blue/20 focus:border-ctu-blue outline-none"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm text-gray-500 mb-1">Address</label>
                  <input
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-ctu-blue/20 focus:border-ctu-blue outline-none"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-500">First Name</label>
                  <p className="text-ctu-charcoal font-medium">{profile?.first_name || '---'}</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-500">Last Name</label>
                  <p className="text-ctu-charcoal font-medium">{profile?.last_name || '---'}</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-500">Email</label>
                  <p className="text-ctu-charcoal font-medium">{profile?.email || '---'}</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-500">Phone</label>
                  <p className="text-ctu-charcoal font-medium">{profile?.phone || '---'}</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-500">City</label>
                  <p className="text-ctu-charcoal font-medium">{profile?.city || '---'}</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-500">Province</label>
                  <p className="text-ctu-charcoal font-medium">{profile?.province || '---'}</p>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm text-gray-500">Address</label>
                  <p className="text-ctu-charcoal font-medium">{profile?.address || '---'}</p>
                </div>
              </div>
            )}
          </div>

          <div className="card">
            <h3 className="font-semibold text-ctu-charcoal mb-4">About</h3>
            {editing ? (
              <textarea
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                rows={4}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-ctu-blue/20 focus:border-ctu-blue outline-none"
              />
            ) : (
              <p className="text-gray-600">{profile?.bio || 'No bio added yet.'}</p>
            )}
          </div>

          <div className="card">
            <h3 className="font-semibold text-ctu-charcoal mb-4">Education</h3>
            {profile?.education?.length ? (
              profile.education.map((edu: any, i: number) => (
                <div key={i} className="flex items-start gap-4 pb-4 mb-4 border-b border-gray-100 last:border-0 last:pb-0 last:mb-0">
                  <div className="w-12 h-12 rounded-lg bg-ctu-gold/20 flex items-center justify-center shrink-0">
                    <span className="text-ctu-gold font-bold text-sm">CTU</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-ctu-charcoal">{edu.program || edu.degree}</h4>
                    <p className="text-sm text-gray-500">{edu.campus || 'Cebu Technological University - Naga Extension Campus'}</p>
                    <p className="text-sm text-gray-400">{edu.year_started || ''}{edu.year_started && edu.year_graduated ? ' - ' : ''}{edu.year_graduated || ''}</p>
                    {edu.honors && <p className="text-xs text-ctu-gold mt-1">{edu.honors}</p>}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-400 text-sm">No education records</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
