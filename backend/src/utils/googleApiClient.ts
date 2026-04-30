/**
 * @file googleApiClient.ts
 * @description Factory for authenticated Google API clients.
 *
 * All Google integration services import these factories —
 * they never handle token management themselves.
 *
 * Each factory:
 *  1. Gets a valid access token via googleWorkspaceService
 *  2. Sets credentials on an OAuth2Client
 *  3. Returns the specific Google API client
 *
 * Requires: npm install googleapis
 */
import { google } from 'googleapis';
import type { OAuth2Client } from 'google-auth-library';
import type { calendar_v3 } from 'googleapis';
import type { gmail_v1 } from 'googleapis';
import type { admin_directory_v1 } from 'googleapis';
import {
  googleWorkspaceService,
  WorkspaceNotConnectedError,
  WorkspaceScopeError,
} from '../services/googleWorkspace.service';
import { SCOPE_SETS, getMissingScopes } from '../config/googleScopes';

// ── OAuth2 client factory ────────────────────────────────────────────────────

function createOAuth2Client(): OAuth2Client {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET');
  }
  return new google.auth.OAuth2(clientId, clientSecret);
}

/**
 * Get an authenticated OAuth2Client for a user.
 * The returned client has valid credentials set and is ready to use.
 */
export async function getOAuth2Client(userId: string): Promise<OAuth2Client> {
  const accessToken = await googleWorkspaceService.getValidAccessToken(userId);
  const client = createOAuth2Client();
  client.setCredentials({ access_token: accessToken });
  return client;
}

// ── Service-specific client factories ────────────────────────────────────────

/**
 * Get an authenticated Google Calendar client.
 * Throws WorkspaceScopeError if calendar scopes are missing.
 */
export async function getCalendarClient(userId: string): Promise<calendar_v3.Calendar> {
  const missing = await googleWorkspaceService.getMissingScopes(userId, [...SCOPE_SETS.CALENDAR]);
  if (missing.length > 0) {
    throw new WorkspaceScopeError(missing);
  }
  const auth = await getOAuth2Client(userId);
  return google.calendar({ version: 'v3', auth });
}

/**
 * Get an authenticated Gmail client.
 * Throws WorkspaceScopeError if Gmail scopes are missing.
 */
export async function getGmailClient(userId: string): Promise<gmail_v1.Gmail> {
  const missing = await googleWorkspaceService.getMissingScopes(userId, [...SCOPE_SETS.GMAIL]);
  if (missing.length > 0) {
    throw new WorkspaceScopeError(missing);
  }
  const auth = await getOAuth2Client(userId);
  return google.gmail({ version: 'v1', auth });
}

/**
 * Get an authenticated Google Directory (Admin SDK) client.
 * Throws WorkspaceScopeError if directory scopes are missing.
 */
export async function getDirectoryClient(userId: string): Promise<admin_directory_v1.Admin> {
  const missing = await googleWorkspaceService.getMissingScopes(userId, [...SCOPE_SETS.DIRECTORY]);
  if (missing.length > 0) {
    throw new WorkspaceScopeError(missing);
  }
  const auth = await getOAuth2Client(userId);
  return google.admin({ version: 'directory_v1', auth });
}

// Re-export error classes for convenience
export { WorkspaceNotConnectedError, WorkspaceScopeError };
