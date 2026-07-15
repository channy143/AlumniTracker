import { useState, useEffect } from 'react';
import { adminApi } from '@/services/api';
import { useUIStore } from '@/store/uiStore';
import { Cog6ToothIcon } from '@heroicons/react/24/outline';

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

  if (loading) return <div className="bg-white border border-gray-200 rounded-lg animate-pulse h-48" />;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
        <div>
          <h1 className="text-base font-bold text-gray-900">System Settings</h1>
          <p className="text-xs text-gray-500">Manage platform configuration</p>
        </div>
        <button onClick={handleSave} disabled={saving} className="px-3 py-1.5 text-xs font-medium bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50">
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-200">
        <div className="p-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">University Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">University Name</label>
              <input type="text" value={settings?.university_name || ''} onChange={(e) => setSettings((s: any) => ({ ...s, university_name: e.target.value }))} className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-orange-400 w-full" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Tagline</label>
              <input type="text" value={settings?.tagline || ''} onChange={(e) => setSettings((s: any) => ({ ...s, tagline: e.target.value }))} className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-orange-400 w-full" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Logo URL</label>
              <input type="url" value={settings?.logo_url || ''} onChange={(e) => setSettings((s: any) => ({ ...s, logo_url: e.target.value }))} className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-orange-400 w-full" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Academic Year Start</label>
              <input type="number" value={settings?.academic_year_start || 2014} onChange={(e) => setSettings((s: any) => ({ ...s, academic_year_start: parseInt(e.target.value) }))} className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-orange-400 w-full" />
            </div>
          </div>
        </div>

        <div className="p-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Colors</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Primary Color</label>
              <div className="flex gap-2 items-center">
                <input type="color" value={settings?.primary_color || '#003366'} onChange={(e) => setSettings((s: any) => ({ ...s, primary_color: e.target.value }))} className="w-8 h-8 rounded cursor-pointer border border-gray-200" />
                <input type="text" value={settings?.primary_color || '#003366'} onChange={(e) => setSettings((s: any) => ({ ...s, primary_color: e.target.value }))} className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-orange-400 flex-1" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Secondary Color</label>
              <div className="flex gap-2 items-center">
                <input type="color" value={settings?.secondary_color || '#D4AF37'} onChange={(e) => setSettings((s: any) => ({ ...s, secondary_color: e.target.value }))} className="w-8 h-8 rounded cursor-pointer border border-gray-200" />
                <input type="text" value={settings?.secondary_color || '#D4AF37'} onChange={(e) => setSettings((s: any) => ({ ...s, secondary_color: e.target.value }))} className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-orange-400 flex-1" />
              </div>
            </div>
          </div>
        </div>

        <div className="p-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Courses</h2>
          <div className="flex flex-wrap gap-1.5">
            {(settings?.courses || []).map((course: string, i: number) => (
              <span key={i} className="px-2 py-1 bg-orange-50 text-orange-700 text-xs rounded-full">{course}</span>
            ))}
            {(settings?.courses || []).length === 0 && <p className="text-xs text-gray-400">No courses configured.</p>}
          </div>
        </div>

        <div className="p-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Industries</h2>
          <div className="flex flex-wrap gap-1.5">
            {(settings?.industries || []).map((ind: string, i: number) => (
              <span key={i} className="px-2 py-1 bg-orange-50 text-orange-700 text-xs rounded-full">{ind}</span>
            ))}
            {(settings?.industries || []).length === 0 && <p className="text-xs text-gray-400">No industries configured.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
