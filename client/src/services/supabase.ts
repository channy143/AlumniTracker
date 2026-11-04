import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const rawUrl = import.meta.env.VITE_SUPABASE_URL;
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Checks whether valid Supabase credentials were provided at build or runtime.
 * If not configured (e.g. static preview, CI/CD, or deployment without env vars),
 * safe placeholders are used to prevent constructor crashes (`Uncaught Error: supabaseUrl is required`).
 */
export const isSupabaseConfigured = Boolean(
  rawUrl &&
  typeof rawUrl === 'string' &&
  rawUrl.trim() !== '' &&
  rawUrl.trim() !== 'your_supabase_url_here' &&
  /^https?:\/\//i.test(rawUrl.trim()) &&
  rawKey &&
  typeof rawKey === 'string' &&
  rawKey.trim() !== '' &&
  rawKey.trim() !== 'your_supabase_anon_key_here'
);

const supabaseUrl = isSupabaseConfigured ? (rawUrl as string).trim() : 'https://placeholder.supabase.co';
const supabaseAnonKey = isSupabaseConfigured ? (rawKey as string).trim() : 'placeholder-anon-key';

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: isSupabaseConfigured,
    autoRefreshToken: isSupabaseConfigured,
  },
});

export const supabaseStorage = {
  upload: async (bucket: string, path: string, file: File) => {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase Storage is not configured.');
    }
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file);
    if (error) throw error;
    return data;
  },

  getUrl: (bucket: string, path: string) => {
    if (!isSupabaseConfigured) {
      return '';
    }
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data?.publicUrl || '';
  },

  delete: async (bucket: string, path: string) => {
    if (!isSupabaseConfigured) return;
    const { error } = await supabase.storage.from(bucket).remove([path]);
    if (error) throw error;
  },
};
