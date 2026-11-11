import { clsx, type ClassValue } from 'clsx';
import { format, parseISO } from 'date-fns';

const NOTIFICATION_SOUND_URL = '/samsung_fart.mp3';

let sharedAudioCtx: AudioContext | null = null;
let cachedSoundBuffer: AudioBuffer | null = null;
let loadingBufferPromise: Promise<AudioBuffer | null> | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
    sharedAudioCtx = new AudioContextClass();
  }
  if (sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
}

function loadNotificationBuffer(): Promise<AudioBuffer | null> {
  if (cachedSoundBuffer) return Promise.resolve(cachedSoundBuffer);
  if (loadingBufferPromise) return loadingBufferPromise;

  const ctx = getAudioContext();
  if (!ctx || typeof fetch === 'undefined') return Promise.resolve(null);

  loadingBufferPromise = fetch(NOTIFICATION_SOUND_URL)
    .then((res) => res.arrayBuffer())
    .then((arr) => ctx.decodeAudioData(arr))
    .then((decoded) => {
      cachedSoundBuffer = decoded;
      return decoded;
    })
    .catch(() => null);

  return loadingBufferPromise;
}

// Unlock the shared AudioContext and preload /samsung_fart.mp3 on first user interaction
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    const ctx = getAudioContext();
    loadNotificationBuffer();
    if (ctx && ctx.state === 'running') {
      window.removeEventListener('mousedown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    }
  };
  window.addEventListener('mousedown', unlockAudio, { passive: true });
  window.addEventListener('keydown', unlockAudio, { passive: true });
  window.addEventListener('touchstart', unlockAudio, { passive: true });
}

let lastSoundPlayedAt = 0;

export function playTing() {
  try {
    const now = Date.now();
    if (now - lastSoundPlayedAt < 350) return;
    lastSoundPlayedAt = now;

    const ctx = getAudioContext();
    if (ctx && cachedSoundBuffer) {
      const source = ctx.createBufferSource();
      source.buffer = cachedSoundBuffer;
      source.connect(ctx.destination);
      source.start(0);
      return;
    }

    // Preload buffer for future plays and play immediately via HTMLAudioElement
    loadNotificationBuffer();
    const audio = new Audio(NOTIFICATION_SOUND_URL);
    audio.volume = 1.0;
    audio.play().catch(() => {});
  } catch {}
}

export const playNotificationSound = playTing;

// Web Worker-backed interval so background/minimized browser windows keep polling without tab throttling
let timerWorker: Worker | null = null;
let nextTimerId = 1;
const timerCallbacks = new Map<number, () => void>();

function getTimerWorker(): Worker | null {
  if (typeof window === 'undefined' || typeof Worker === 'undefined') return null;
  if (!timerWorker) {
    try {
      const workerCode = `
        const intervals = new Map();
        self.onmessage = function(e) {
          const { action, id, ms } = e.data || {};
          if (action === 'start') {
            if (intervals.has(id)) clearInterval(intervals.get(id));
            intervals.set(id, setInterval(() => self.postMessage({ id }), ms));
          } else if (action === 'stop') {
            if (intervals.has(id)) {
              clearInterval(intervals.get(id));
              intervals.delete(id);
            }
          }
        };
      `;
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      timerWorker = new Worker(URL.createObjectURL(blob));
      timerWorker.onmessage = (e) => {
        const id = e.data?.id;
        const cb = timerCallbacks.get(id);
        if (cb) cb();
      };
    } catch {
      timerWorker = null;
    }
  }
  return timerWorker;
}

export function setBackgroundInterval(callback: () => void, ms: number): () => void {
  const worker = getTimerWorker();
  const handleWake = () => {
    if (document.visibilityState === 'visible') {
      callback();
    }
  };
  document.addEventListener('visibilitychange', handleWake);
  window.addEventListener('focus', callback);

  if (worker) {
    const id = nextTimerId++;
    timerCallbacks.set(id, callback);
    worker.postMessage({ action: 'start', id, ms });
    return () => {
      timerCallbacks.delete(id);
      worker.postMessage({ action: 'stop', id });
      document.removeEventListener('visibilitychange', handleWake);
      window.removeEventListener('focus', callback);
    };
  }

  const fallback = window.setInterval(callback, ms);
  return () => {
    window.clearInterval(fallback);
    document.removeEventListener('visibilitychange', handleWake);
    window.removeEventListener('focus', callback);
  };
}

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatDate(date: string | Date, fmt: string = 'MMM d, yyyy') {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, fmt);
}

export function getInitials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function truncate(str: string, length: number = 100) {
  return str.length > length ? `${str.substring(0, length)}...` : str;
}

export function generateYears(start: number = 1990, end: number = Math.max(2027, new Date().getFullYear())) {
  return Array.from({ length: end - start + 1 }, (_, i) => String(start + i));
}

export const employmentStatusLabels: Record<string, string> = {
  employed: 'Employed',
  'self-employed': 'Self-Employed',
  unemployed: 'Unemployed',
  seeking: 'Seeking Opportunities',
  student: 'Further Studies',
  entrepreneur: 'Entrepreneur',
  retired: 'Retired',
};

export function decodeUnicode(str: string) {
  return str.replace(/\\u(\w{4})/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)));
}

export const jobTypeLabels: Record<string, string> = {
  'full-time': 'Full-Time',
  'part-time': 'Part-Time',
  contract: 'Contract',
  freelance: 'Freelance',
  internship: 'Internship',
};

export function dedupeCommentTree<T extends { id: string; parent_id?: string | null; replies?: any[] }>(
  list: T[]
): T[] {
  const seenComments = new Set<string>();
  const result: T[] = [];

  for (const c of list || []) {
    if (!c || !c.id || c.parent_id || seenComments.has(c.id)) continue;
    seenComments.add(c.id);

    const rawReplies = Array.isArray(c.replies) ? c.replies : [];
    const seenReplies = new Set<string>();
    const dedupedReplies: any[] = [];
    for (const r of rawReplies) {
      if (!r || !r.id || seenReplies.has(r.id)) continue;
      seenReplies.add(r.id);
      dedupedReplies.push(r);
    }

    result.push({ ...c, replies: dedupedReplies });
  }

  return result;
}

export function countAllComments(list: Array<{ replies?: any[] }>): number {
  return (list || []).reduce(
    (sum, c) => sum + 1 + (Array.isArray(c.replies) ? c.replies.length : 0),
    0
  );
}
