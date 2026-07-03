import { useState, useEffect } from 'react';
import { adminApi } from '@/services/api';
import { useUIStore } from '@/store/uiStore';

export default function SystemSettings() {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const addNotification = useUIStore((s) => s.addNotification);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      const data = await adminApi.settingsGet();
      setSettings(data);
    } catch { addNotification('Failed to load settings', 'error'); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await adminApi.settingsUpdate(settings);
      addNotification('Settings saved', 'success');
    } catch { addNotification('Failed to save settings', 'error'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="card animate-pulse h-64" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="section-title">System Settings</h1>
          <p className="text-gray-500 mt-1">Manage platform configuration</p>
        </div>
        <button onClick={handleSave} disabled={saving} className="btn-primary text-sm">
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      <div className="card space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-ctu-charcoal mb-4">University Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ctu-charcoal mb-1">University Name</label>
              <input type="text" value={settings?.university_name || ''} onChange={(e) => setSettings((s: any) => ({ ...s, university_name: e.target.value }))} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-ctu-charcoal mb-1">Tagline</label>
              <input type="text" value={settings?.tagline || ''} onChange={(e) => setSettings((s: any) => ({ ...s, tagline: e.target.value }))} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-ctu-charcoal mb-1">Logo URL</label>
              <input type="url" value={settings?.logo_url || ''} onChange={(e) => setSettings((s: any) => ({ ...s, logo_url: e.target.value }))} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-ctu-charcoal mb-1">Academic Year Start</label>
              <input type="number" value={settings?.academic_year_start || 2014} onChange={(e) => setSettings((s: any) => ({ ...s, academic_year_start: parseInt(e.target.value) }))} className="input-field" />
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-6">
          <h2 className="text-lg font-semibold text-ctu-charcoal mb-4">Colors</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ctu-charcoal mb-1">Primary Color</label>
              <div className="flex gap-3 items-center">
                <input type="color" value={settings?.primary_color || '#003366'} onChange={(e) => setSettings((s: any) => ({ ...s, primary_color: e.target.value }))} className="w-10 h-10 rounded cursor-pointer" />
                <input type="text" value={settings?.primary_color || '#003366'} onChange={(e) => setSettings((s: any) => ({ ...s, primary_color: e.target.value }))} className="input-field flex-1" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-ctu-charcoal mb-1">Secondary Color</label>
              <div className="flex gap-3 items-center">
                <input type="color" value={settings?.secondary_color || '#D4AF37'} onChange={(e) => setSettings((s: any) => ({ ...s, secondary_color: e.target.value }))} className="w-10 h-10 rounded cursor-pointer" />
                <input type="text" value={settings?.secondary_color || '#D4AF37'} onChange={(e) => setSettings((s: any) => ({ ...s, secondary_color: e.target.value }))} className="input-field flex-1" />
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-6">
          <h2 className="text-lg font-semibold text-ctu-charcoal mb-4">Courses</h2>
          <div className="flex flex-wrap gap-2">
            {(settings?.courses || []).map((course: string, i: number) => (
              <span key={i} className="px-3 py-1 bg-blue-50 text-ctu-blue text-sm rounded-full">{course}</span>
            ))}
          </div>
        </div>

        <div className="border-t border-gray-200 pt-6">
          <h2 className="text-lg font-semibold text-ctu-charcoal mb-4">Industries</h2>
          <div className="flex flex-wrap gap-2">
            {(settings?.industries || []).map((ind: string, i: number) => (
              <span key={i} className="px-3 py-1 bg-green-50 text-green-700 text-sm rounded-full">{ind}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
