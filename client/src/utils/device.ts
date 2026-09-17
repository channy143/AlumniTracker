/**
 * Utilities for client-side device identification and trusted device token storage.
 */

const DEVICE_ID_KEY = 'ctu_device_id';
const DEVICE_TOKEN_PREFIX = 'ctu_trusted_device_';

/**
 * Get or generate a persistent unique device ID for this browser.
 */
export function getOrCreateDeviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        id = crypto.randomUUID();
      } else {
        id = 'dev_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
      }
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  } catch {
    // Fallback if localStorage is restricted
    return 'dev_ephemeral_' + Date.now();
  }
}

/**
 * Retrieve a stored trusted device token for the specified user email.
 */
export function getTrustedDeviceToken(email: string): string | undefined {
  try {
    if (!email) return undefined;
    const key = `${DEVICE_TOKEN_PREFIX}${email.trim().toLowerCase()}`;
    return localStorage.getItem(key) || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Persist a trusted device token for the specified user email.
 */
export function saveTrustedDeviceToken(email: string, token: string): void {
  try {
    if (!email || !token) return;
    const key = `${DEVICE_TOKEN_PREFIX}${email.trim().toLowerCase()}`;
    localStorage.setItem(key, token);
  } catch {
    // Ignore storage errors
  }
}

/**
 * Remove the trusted device token for the specified user email.
 */
export function clearTrustedDeviceToken(email: string): void {
  try {
    if (!email) return;
    const key = `${DEVICE_TOKEN_PREFIX}${email.trim().toLowerCase()}`;
    localStorage.removeItem(key);
  } catch {
    // Ignore storage errors
  }
}

/**
 * Clear all remembered device tokens on this browser.
 */
export function clearAllTrustedDeviceTokens(): void {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(DEVICE_TOKEN_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch {
    // Ignore storage errors
  }
}
