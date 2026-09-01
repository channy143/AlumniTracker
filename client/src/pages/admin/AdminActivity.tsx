import { useState, useEffect } from 'react';
import { activitiesApi } from '@/services/api';
import { SkeletonActivityItem } from '@/components/ui/Skeleton';

function timeAgo(dateStr: string) {
  const then = new Date(dateStr).getTime();
  if (!then) return '';
  const diff = Date.now() - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function AdminActivity() {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await activitiesApi.list(100);
      setActivities(Array.isArray(res) ? res : []);
    } catch {
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-4">
        <h1 className="text-base font-bold text-gray-900">Activity Log</h1>
        <p className="text-xs text-gray-500">Latest system activity from alumni and administrators.</p>
      </div>

      {loading ? (
        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-2">
          {[1, 2, 3, 4, 5].map((i) => <SkeletonActivityItem key={i} />)}
        </div>
      ) : activities.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg text-center py-12">
          <p className="text-xs text-gray-400">No recent activity.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {activities.map((a: any, i: number) => (
            <div key={a.id ?? i} className={`flex items-start gap-3 px-4 py-3 ${i > 0 ? 'border-t border-gray-100' : ''}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0 mt-1.5" />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-700 leading-snug">
                  {[a.user, a.action, a.target].filter(Boolean).join(' ')}
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">{timeAgo(a.created_at)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
