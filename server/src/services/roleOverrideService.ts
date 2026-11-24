import { supabase } from './supabase';
import { AppError } from '../middleware/errorHandler';

const OVERRIDES_SETTINGS_KEY = 'user_role_overrides';
const APPOINTMENTS_SETTINGS_KEY = 'user_role_appointments';

export const INSTITUTIONAL_ROLE_LABELS: Record<string, string> = {
  admin: 'Alumni Chair',
  alumni_officer: 'Alumni Assistant (Officer)',
  registrar: 'Registrar',
  staff: 'Institutional Staff',
  alumni: 'Alumni Member',
};

export interface RoleAppointmentRecord {
  userId: string;
  offeredRole: string;
  offeredRoleLabel: string;
  offeredBy: string;
  status: 'pending' | 'accepted' | 'declined';
  pinHash?: string | null;
  created_at: string;
  accepted_at?: string | null;
}

export async function loadRoleOverrides(): Promise<Record<string, string>> {
  try {
    const { data } = await supabase
      .from('settings')
      .select('value')
      .eq('key', OVERRIDES_SETTINGS_KEY)
      .maybeSingle();
    if (data?.value && typeof data.value === 'object' && !Array.isArray(data.value)) {
      return data.value as Record<string, string>;
    }
    return {};
  } catch {
    return {};
  }
}

export async function setRoleOverride(userId: string, role: string | null): Promise<void> {
  try {
    const current = await loadRoleOverrides();
    if (role) {
      current[userId] = role;
    } else {
      delete current[userId];
    }

    const { data: existing } = await supabase
      .from('settings')
      .select('id')
      .eq('key', OVERRIDES_SETTINGS_KEY)
      .maybeSingle();

    if (existing) {
      await supabase.from('settings').update({ value: current }).eq('id', existing.id);
    } else if (role) {
      await supabase.from('settings').insert({ key: OVERRIDES_SETTINGS_KEY, value: current });
    }
  } catch {
    // Non-fatal if settings table is unavailable
  }
}

export async function resolveUserRole(userId: string, dbRole: string): Promise<string> {
  const overrides = await loadRoleOverrides();
  return overrides[userId] || dbRole;
}

function isRoleCheckConstraintError(error: any): boolean {
  if (!error) return false;
  const msg = String(error.message || '').toLowerCase();
  return error.code === '23514' || msg.includes('users_role_check');
}

export async function updateUserRoleWithFallback(userId: string, targetRole: string): Promise<void> {
  const { error } = await supabase.from('users').update({ role: targetRole }).eq('id', userId);
  if (!error) {
    await setRoleOverride(userId, null);
    return;
  }

  if (isRoleCheckConstraintError(error)) {
    const fallbackDbRole = targetRole === 'admin' ? 'admin' : targetRole === 'alumni' ? 'alumni' : 'staff';
    const { error: retryErr } = await supabase.from('users').update({ role: fallbackDbRole }).eq('id', userId);
    if (retryErr) throw new AppError(retryErr.message, 500);
    await setRoleOverride(userId, targetRole);
    return;
  }

  throw new AppError(error.message, 500);
}

export async function insertUserWithRoleFallback(payload: {
  email: string;
  password_hash: string;
  role: string;
  is_verified: boolean;
}): Promise<any> {
  const selectCols = 'id, email, role, is_verified, is_active, is_archived, last_login, created_at, updated_at';
  const { data: user, error } = await supabase
    .from('users')
    .insert(payload)
    .select(selectCols)
    .single();

  if (!error && user) {
    return user;
  }

  if (isRoleCheckConstraintError(error)) {
    const fallbackDbRole = payload.role === 'admin' ? 'admin' : payload.role === 'alumni' ? 'alumni' : 'staff';
    const { data: retryUser, error: retryErr } = await supabase
      .from('users')
      .insert({ ...payload, role: fallbackDbRole })
      .select(selectCols)
      .single();

    if (retryErr || !retryUser) {
      throw new AppError(retryErr?.message || 'Failed to create user account', 500);
    }

    await setRoleOverride(retryUser.id, payload.role);
    return { ...retryUser, role: payload.role };
  }

  throw new AppError(error?.message || 'Failed to create user account', 500);
}

export async function loadRoleAppointments(): Promise<Record<string, RoleAppointmentRecord>> {
  try {
    const { data } = await supabase
      .from('settings')
      .select('value')
      .eq('key', APPOINTMENTS_SETTINGS_KEY)
      .maybeSingle();
    if (data?.value && typeof data.value === 'object' && !Array.isArray(data.value)) {
      return data.value as Record<string, RoleAppointmentRecord>;
    }
    return {};
  } catch {
    return {};
  }
}

export async function saveRoleAppointments(map: Record<string, RoleAppointmentRecord>): Promise<void> {
  try {
    const { data: existing } = await supabase
      .from('settings')
      .select('id')
      .eq('key', APPOINTMENTS_SETTINGS_KEY)
      .maybeSingle();

    if (existing) {
      await supabase.from('settings').update({ value: map }).eq('id', existing.id);
    } else {
      await supabase.from('settings').insert({ key: APPOINTMENTS_SETTINGS_KEY, value: map });
    }
  } catch {
    // Non-fatal
  }
}

export async function createRoleAppointmentOffer(
  userId: string,
  offeredRole: string,
  offeredBy = 'Sheila Marie C Lopez (Alumni Chair)'
): Promise<RoleAppointmentRecord | null> {
  const appointments = await loadRoleAppointments();
  if (offeredRole === 'alumni') {
    delete appointments[userId];
    await saveRoleAppointments(appointments);
    await updateUserRoleWithFallback(userId, 'alumni');
    return null;
  }

  const prev = appointments[userId];
  const record: RoleAppointmentRecord = {
    userId,
    offeredRole,
    offeredRoleLabel: INSTITUTIONAL_ROLE_LABELS[offeredRole] || offeredRole,
    offeredBy,
    status: 'pending',
    pinHash: prev?.pinHash || null,
    created_at: new Date().toISOString(),
    accepted_at: null,
  };
  appointments[userId] = record;
  await saveRoleAppointments(appointments);
  return record;
}

export async function respondToRoleAppointment(
  userId: string,
  action: 'accept' | 'decline'
): Promise<RoleAppointmentRecord | null> {
  const appointments = await loadRoleAppointments();
  const record = appointments[userId];
  if (!record) return null;

  if (action === 'accept') {
    record.status = 'accepted';
    record.accepted_at = new Date().toISOString();
    appointments[userId] = record;
    await saveRoleAppointments(appointments);
    await updateUserRoleWithFallback(userId, record.offeredRole);
    return record;
  } else {
    record.status = 'declined';
    appointments[userId] = record;
    await saveRoleAppointments(appointments);
    await updateUserRoleWithFallback(userId, 'alumni');
    return record;
  }
}

export async function saveUserAdminPin(
  userId: string,
  effectiveRole: string,
  pinHash: string
): Promise<RoleAppointmentRecord> {
  const appointments = await loadRoleAppointments();
  const existing = appointments[userId];
  const updated: RoleAppointmentRecord = existing
    ? {
        ...existing,
        status: 'accepted',
        pinHash,
      }
    : {
        userId,
        offeredRole: effectiveRole,
        offeredRoleLabel: INSTITUTIONAL_ROLE_LABELS[effectiveRole] || effectiveRole,
        offeredBy: 'Sheila Marie C Lopez (Alumni Chair)',
        status: 'accepted',
        pinHash,
        created_at: new Date().toISOString(),
        accepted_at: new Date().toISOString(),
      };
  appointments[userId] = updated;
  await saveRoleAppointments(appointments);
  return updated;
}
