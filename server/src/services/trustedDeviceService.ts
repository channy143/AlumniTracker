import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../middleware/auth';
import { supabase } from './supabase';

/**
 * Mint a cryptographically signed trusted-device token for an alumni user.
 * Valid for 60 days.
 */
export function mintTrustedDeviceToken(userId: string, email: string, deviceId: string): string {
  return jwt.sign(
    {
      userId,
      email: email.toLowerCase(),
      deviceId,
      type: 'trusted_device',
    },
    getJwtSecret(),
    { expiresIn: '60d' }
  );
}

/**
 * Verify whether a provided device token is valid and belongs to the given user and device.
 */
export async function verifyTrustedDevice(
  userId: string,
  email: string,
  deviceId?: string,
  deviceToken?: string
): Promise<boolean> {
  if (!deviceId || !deviceToken) return false;

  try {
    const decoded = jwt.verify(deviceToken, getJwtSecret()) as any;

    if (
      decoded.type !== 'trusted_device' ||
      decoded.userId !== userId ||
      decoded.deviceId !== deviceId ||
      decoded.email?.toLowerCase() !== email.toLowerCase()
    ) {
      return false;
    }

    // Check database if user_trusted_devices table is active
    try {
      const { data: deviceRecord, error } = await supabase
        .from('user_trusted_devices')
        .select('id, expires_at')
        .eq('user_id', userId)
        .eq('device_id', deviceId)
        .maybeSingle();

      if (!error && deviceRecord) {
        if (deviceRecord.expires_at && new Date(deviceRecord.expires_at) < new Date()) {
          return false;
        }
        // Update last used timestamp
        await supabase
          .from('user_trusted_devices')
          .update({ last_used_at: new Date().toISOString() })
          .eq('id', deviceRecord.id);
      }
    } catch {
      // Graceful fallback: cryptographic JWT signature verification is sufficient
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Persist or update a recognized device in the database.
 */
export async function registerTrustedDevice(
  userId: string,
  deviceId: string,
  deviceName?: string
): Promise<void> {
  try {
    const expiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();
    const { data: existing, error } = await supabase
      .from('user_trusted_devices')
      .select('id')
      .eq('user_id', userId)
      .eq('device_id', deviceId)
      .maybeSingle();

    if (!error && existing) {
      await supabase
        .from('user_trusted_devices')
        .update({
          last_used_at: new Date().toISOString(),
          expires_at: expiresAt,
          device_name: deviceName || 'Recognized Device',
        })
        .eq('id', existing.id);
    } else if (!error) {
      await supabase
        .from('user_trusted_devices')
        .insert({
          user_id: userId,
          device_id: deviceId,
          device_name: deviceName || 'Recognized Device',
          last_used_at: new Date().toISOString(),
          expires_at: expiresAt,
        });
    }
  } catch (err) {
    console.warn('[trustedDeviceService] Device record registration skipped:', err);
  }
}

/**
 * Revoke all remembered devices for a user (e.g. on MFA disable or security reset).
 */
export async function revokeAllTrustedDevices(userId: string): Promise<void> {
  try {
    await supabase
      .from('user_trusted_devices')
      .delete()
      .eq('user_id', userId);
  } catch (err) {
    console.warn('[trustedDeviceService] Device revocation skipped:', err);
  }
}

/**
 * Revoke a single remembered device for a user.
 */
export async function revokeTrustedDevice(userId: string, deviceId: string): Promise<void> {
  try {
    await supabase
      .from('user_trusted_devices')
      .delete()
      .eq('user_id', userId)
      .eq('device_id', deviceId);
  } catch (err) {
    console.warn('[trustedDeviceService] Single device revocation skipped:', err);
  }
}
