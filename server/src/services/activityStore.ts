import { supabase } from './supabase';

interface Activity {
  id: number;
  user: string;
  action: string;
  target: string;
  created_at: string;
}

const memoryStore: Activity[] = [];
let idCounter = 1;

export async function addActivity(userName: string, action: string, target: string) {
  const entry = { id: idCounter++, user: userName, action, target, created_at: new Date().toISOString() };
  memoryStore.unshift(entry);
  if (memoryStore.length > 50) memoryStore.length = 50;

  try {
    await supabase.from('activity_log').insert({ user_name: userName, action, target });
  } catch {
    // DB not available, in-memory fallback works
  }
}

export async function getRecentActivities(limit = 10) {
  try {
    const { data } = await supabase
      .from('activity_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (data && data.length > 0) {
      return data.map((a: any) => ({
        id: a.id,
        user: a.user_name,
        action: a.action,
        target: a.target,
        created_at: a.created_at,
      }));
    }
  } catch {
    // DB not available, fall through to memory
  }

  return memoryStore.slice(0, limit);
}
