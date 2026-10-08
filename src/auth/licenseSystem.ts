/**
 * Halqa Tracker - Offline License & Integrity System
 * Self-verifying cryptographic license keys, hardware device binding,
 * clock-rollback defense, renewal codes, and administrative control.
 */

import { LicenseRecord, LicenseType } from '../types';

export const LICENSE_CONFIG = {
  SECRET_SALT: 'HALQA-QURAN-OFFLINE-SECURITY-SALT-2026-M1',
  ADMIN_DEFAULT_PIN: '1984',
  MAX_MASTER_LOGINS: 1,
  MAX_TIME_LIMITED_LOGINS: 2
};

/**
 * Fast deterministic HMAC-like signature for offline verification
 */
export function computeSignature(data: string, salt: string = LICENSE_CONFIG.SECRET_SALT): string {
  let hash1 = 0x811c9dc5;
  let hash2 = 0x55555555;
  const combined = `${salt}:${data}:${salt}`;
  for (let i = 0; i < combined.length; i++) {
    const code = combined.charCodeAt(i);
    hash1 ^= code;
    hash1 = (hash1 * 0x01000193) >>> 0;
    hash2 = (hash2 * 31 + code) >>> 0;
  }
  const hex1 = hash1.toString(16).padStart(8, '0');
  const hex2 = hash2.toString(16).padStart(8, '0');
  return `${hex1}${hex2}`.toUpperCase().slice(0, 12);
}

/**
 * Key format:
 * HQ-{TYPE}-{USERNAME}-{DAYS}-{ISSUE_EPOCH}-{SIGNATURE}
 * Example: HQ-TIME-BILAL-30-1742080000-8F92A1B70C34
 * Example: HQ-MSTR-ADMIN-0-1742080000-4C91E5B09A22
 */
export function generateLicenseKey(
  username: string,
  type: LicenseType,
  durationDays: number
): { key: string; record: LicenseRecord } {
  const cleanUser = username.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  const typeCode = type === 'master' ? 'MSTR' : 'TIME';
  const days = type === 'master' ? 0 : Math.max(1, durationDays);
  const issueEpoch = Math.floor(Date.now() / 1000);
  const uid = Math.random().toString(36).substring(2, 6).toUpperCase();
  const payload = `${typeCode}:${cleanUser}:${days}:${issueEpoch}:${uid}`;
  const signature = computeSignature(payload);

  const key = `HQ-${typeCode}-${cleanUser}-${days}-${issueEpoch}-${uid}-${signature}`;
  const record: LicenseRecord = {
    id: `lic_${cleanUser}_${issueEpoch}`,
    username: cleanUser,
    key,
    type,
    durationDays: days,
    issuedAt: new Date(issueEpoch * 1000).toISOString(),
    status: 'active'
  };

  return { key, record };
}

export interface VerificationResult {
  valid: boolean;
  type?: LicenseType;
  username?: string;
  durationDays?: number;
  error?: string;
}

/**
 * Validates the self-verifying signature on any device offline
 */
export function verifyLicenseKeyFormat(key: string): VerificationResult {
  if (!key || typeof key !== 'string') {
    return { valid: false, error: 'Key is required' };
  }

  const parts = key.trim().split('-');
  if (parts.length !== 7 || parts[0] !== 'HQ') {
    return { valid: false, error: 'Invalid key structure. Format: HQ-TYPE-USER-DAYS-EPOCH-ID-SIGNATURE' };
  }

  const [, typeCode, username, daysStr, epochStr, uid, signature] = parts;
  const days = parseInt(daysStr, 10);
  const issueEpoch = parseInt(epochStr, 10);

  if (isNaN(days) || isNaN(issueEpoch)) {
    return { valid: false, error: 'Malformed numeric parameters in key' };
  }

  const payload = `${typeCode}:${username}:${days}:${issueEpoch}:${uid}`;
  const expectedSig = computeSignature(payload);

  if (signature !== expectedSig) {
    return { valid: false, error: 'Cryptographic signature mismatch. Key is invalid or tampered with.' };
  }

  const type: LicenseType = typeCode === 'MSTR' ? 'master' : 'time_limited';

  return {
    valid: true,
    type,
    username,
    durationDays: days
  };
}

/**
 * Renewal code generation:
 * Format: RNEW-{USERNAME}-{DAYS}-{SIGNATURE}
 */
export function generateRenewalCode(username: string, additionalDays: number): string {
  const cleanUser = username.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  const epoch = Math.floor(Date.now() / 1000);
  const payload = `RENEW:${cleanUser}:${additionalDays}:${epoch}`;
  const sig = computeSignature(payload).slice(0, 8);
  return `RNEW-${cleanUser}-${additionalDays}-${epoch}-${sig}`;
}

export function verifyRenewalCode(code: string, targetUsername: string): { valid: boolean; addedDays?: number; error?: string } {
  if (!code) return { valid: false, error: 'Renewal code is required' };
  const parts = code.trim().split('-');
  if (parts.length !== 5 || parts[0] !== 'RNEW') {
    return { valid: false, error: 'Invalid renewal code format' };
  }

  const [, username, daysStr, epochStr, sig] = parts;
  if (username !== targetUsername.trim().toUpperCase()) {
    return { valid: false, error: `This renewal code was generated for ${username}, not ${targetUsername}` };
  }

  const days = parseInt(daysStr, 10);
  const epoch = parseInt(epochStr, 10);

  if (isNaN(days) || isNaN(epoch)) {
    return { valid: false, error: 'Malformed renewal code numbers' };
  }

  const payload = `RENEW:${username}:${days}:${epoch}`;
  const expectedSig = computeSignature(payload).slice(0, 8);

  if (sig !== expectedSig) {
    return { valid: false, error: 'Invalid signature on renewal code' };
  }

  return { valid: true, addedDays: days };
}

/**
 * Block code generation:
 * Format: BLK-{USERNAME}-{SIGNATURE}
 */
export function generateBlockCode(username: string): string {
  const cleanUser = username.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  const payload = `BLOCK:${cleanUser}`;
  const sig = computeSignature(payload).slice(0, 8);
  return `BLK-${cleanUser}-${sig}`;
}

export function verifyBlockCode(code: string, targetUsername: string): { valid: boolean; error?: string } {
  if (!code) return { valid: false, error: 'Block code is required' };
  const parts = code.trim().split('-');
  if (parts.length !== 3 || parts[0] !== 'BLK') {
    return { valid: false, error: 'Invalid block code format' };
  }

  const [, username, sig] = parts;
  if (username !== targetUsername.trim().toUpperCase()) {
    return { valid: false, error: `This block code applies to ${username}, not ${targetUsername}` };
  }

  const payload = `BLOCK:${username}`;
  const expectedSig = computeSignature(payload).slice(0, 8);

  if (sig !== expectedSig) {
    return { valid: false, error: 'Invalid signature on block code' };
  }

  return { valid: true };
}

/**
 * Date integrity / Clock-rollback defense check
 */
export function checkClockIntegrity(currentDateStr: string, lastSeenDateStr: string | null): { rollbackDetected: boolean; error?: string } {
  if (!lastSeenDateStr) return { rollbackDetected: false };

  const current = new Date(currentDateStr).getTime();
  const lastSeen = new Date(lastSeenDateStr).getTime();

  // Allow a tiny 1-minute margin for micro clock adjustments
  if (current < lastSeen - 60000) {
    return {
      rollbackDetected: true,
      error: 'Date change detected. Device clock is set behind the last recorded session. Please contact the administrator.'
    };
  }

  return { rollbackDetected: false };
}

/**
 * Unlock code for clock rollback or lockouts
 */
export function generateUnlockCode(adminPin: string): string {
  const epoch = Math.floor(Date.now() / (1000 * 60 * 60 * 24)); // Daily rotating unlock
  const payload = `UNLOCK:${adminPin}:${epoch}`;
  return computeSignature(payload).slice(0, 6);
}

export function verifyUnlockCode(code: string, adminPin: string): boolean {
  const expected = generateUnlockCode(adminPin);
  return code.trim().toUpperCase() === expected.toUpperCase();
}
