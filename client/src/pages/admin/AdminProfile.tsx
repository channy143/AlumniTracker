import { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';

export default function AdminProfile() {
  const { user } = useAuthStore();
  const addNotification = useUIStore((s) => s.addNotification);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: user?.email || '' });
  const [passwords, setPasswords] = useState({ current: '', newPw: '', confirm: '' });

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    addNotification('Profile updated', 'success');
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.newPw !== passwords.confirm) {
      addNotification('Passwords do not match', 'error');
      return;
    }
    if (passwords.newPw.length < 6) {
      addNotification('Password must be at least 6 characters', 'error');
      return;
    }
    addNotification('Password changed', 'success');
    setPasswords({ current: '', newPw: '', confirm: '' });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="section-title">Admin Profile</h1>
        <p className="text-gray-500 mt-1">Manage your administrator account</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-semibold text-ctu-charcoal mb-4">Profile Information</h2>
          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-ctu-charcoal mb-1">First Name</label>
                <input type="text" value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-ctu-charcoal mb-1">Last Name</label>
                <input type="text" value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} className="input-field" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-ctu-charcoal mb-1">Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className="input-field" />
            </div>
            <button type="submit" className="btn-primary">Save Changes</button>
          </form>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-ctu-charcoal mb-4">Change Password</h2>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-ctu-charcoal mb-1">Current Password</label>
              <input type="password" value={passwords.current} onChange={(e) => setPasswords((p) => ({ ...p, current: e.target.value }))} className="input-field" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-ctu-charcoal mb-1">New Password</label>
              <input type="password" value={passwords.newPw} onChange={(e) => setPasswords((p) => ({ ...p, newPw: e.target.value }))} className="input-field" required minLength={6} />
            </div>
            <div>
              <label className="block text-sm font-medium text-ctu-charcoal mb-1">Confirm New Password</label>
              <input type="password" value={passwords.confirm} onChange={(e) => setPasswords((p) => ({ ...p, confirm: e.target.value }))} className="input-field" required />
            </div>
            <button type="submit" className="btn-primary">Change Password</button>
          </form>
        </div>
      </div>
    </div>
  );
}
