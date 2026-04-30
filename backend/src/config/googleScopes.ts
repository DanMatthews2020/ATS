/**
 * @file googleScopes.ts
 * @description Central scope registry — the single source of truth for
 * every Google OAuth scope TeamTalent uses.
 *
 * Rules:
 *  - Never hardcode scope strings elsewhere in the codebase
 *  - Import GOOGLE_SCOPES or SCOPE_SETS from this file
 *  - Use hasScope() / getMissingScopes() for permission checks
 */

// ── Individual scopes ────────────────────────────────────────────────────────

export const GOOGLE_SCOPES = {
  // Identity — always requested on initial connect
  OPENID: 'openid',
  EMAIL: 'email',
  PROFILE: 'profile',

  // Calendar
  CALENDAR_EVENTS: 'https://www.googleapis.com/auth/calendar.events',
  CALENDAR_READONLY: 'https://www.googleapis.com/auth/calendar.readonly',

  // Gmail
  GMAIL_MODIFY: 'https://www.googleapis.com/auth/gmail.modify',
  GMAIL_READONLY: 'https://www.googleapis.com/auth/gmail.readonly',

  // Directory (hiring manager / team member lookup)
  DIRECTORY_READONLY: 'https://www.googleapis.com/auth/admin.directory.user.readonly',

  // Drive (future — document storage)
  DRIVE_FILE: 'https://www.googleapis.com/auth/drive.file',

  // Google Chat (future — notifications)
  CHAT_MESSAGES: 'https://www.googleapis.com/auth/chat.messages',
} as const;

export type GoogleScope = (typeof GOOGLE_SCOPES)[keyof typeof GOOGLE_SCOPES];

// ── Scope sets per feature ───────────────────────────────────────────────────

export const SCOPE_SETS = {
  AUTH_ONLY: [GOOGLE_SCOPES.OPENID, GOOGLE_SCOPES.EMAIL, GOOGLE_SCOPES.PROFILE],
  CALENDAR: [GOOGLE_SCOPES.CALENDAR_EVENTS, GOOGLE_SCOPES.CALENDAR_READONLY],
  GMAIL: [GOOGLE_SCOPES.GMAIL_MODIFY],
  DIRECTORY: [GOOGLE_SCOPES.DIRECTORY_READONLY],
  DRIVE: [GOOGLE_SCOPES.DRIVE_FILE],
  CHAT: [GOOGLE_SCOPES.CHAT_MESSAGES],
} as const;

export type ScopeSetKey = keyof typeof SCOPE_SETS;

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Check if a user has a specific scope granted. */
export function hasScope(grantedScopes: string[], scope: string): boolean {
  return grantedScopes.includes(scope);
}

/** Check if a user has ALL scopes in a set. */
export function hasAllScopes(grantedScopes: string[], required: string[]): boolean {
  return required.every((s) => grantedScopes.includes(s));
}

/** Return which required scopes are not yet granted. */
export function getMissingScopes(grantedScopes: string[], required: string[]): string[] {
  return required.filter((s) => !grantedScopes.includes(s));
}

/** Build the full scope string for an OAuth request that includes base identity + feature scopes. */
export function buildScopeString(featureScopes: readonly string[]): string {
  const all = new Set([...SCOPE_SETS.AUTH_ONLY, ...featureScopes]);
  return Array.from(all).join(' ');
}
