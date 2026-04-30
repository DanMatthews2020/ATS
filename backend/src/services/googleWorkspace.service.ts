/**
 * @file googleWorkspace.service.ts
 * @description Core Google Workspace token management service.
 *
 * ALL future Google integration services (Calendar, Gmail, Drive, etc)
 * consume this service for token management. They never manage tokens
 * or scopes directly.
 *
 * Tokens never leave this service layer — callers get a decrypted
 * access token string via getValidAccessToken() and nothing else.
 */
import { googleWorkspaceRepository } from '../repositories/googleWorkspace.repository';
import { encrypt, decrypt } from '../utils/encryption';
import { SCOPE_SETS, hasAllScopes, getMissingScopes as getMissing } from '../config/googleScopes';

// ── Google OAuth constants ─────────────────────────────────────────────────

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_REVOKE_URL = 'https://oauth2.googleapis.com/revoke';

function getGoogleCredentials() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET');
  }
  return { clientId, clientSecret };
}

// ── Error classes ────────────────────────────────────────────────────────────

export class WorkspaceNotConnectedError extends Error {
  constructor(userId?: string) {
    super(userId
      ? `No active Google Workspace connection for user ${userId}`
      : 'No active Google Workspace connection');
    this.name = 'WorkspaceNotConnectedError';
  }
}

export class WorkspaceScopeError extends Error {
  public readonly missingScopes: string[];
  constructor(missingScopes: string[]) {
    super(`Missing required Google scopes: ${missingScopes.join(', ')}`);
    this.name = 'WorkspaceScopeError';
    this.missingScopes = missingScopes;
  }
}

export class WorkspaceTokenRefreshError extends Error {
  constructor(message = 'Google token refresh failed') {
    super(message);
    this.name = 'WorkspaceTokenRefreshError';
  }
}

// ── Types ────────────────────────────────────────────────────────────────────

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope?: string;
}

interface ConnectionStatus {
  connected: boolean;
  googleEmail?: string;
  displayName?: string;
  avatarUrl?: string | null;
  grantedScopes: string[];
  connectedAt?: string;
  features: {
    calendar: boolean;
    gmail: boolean;
    directory: boolean;
    drive: boolean;
  };
}

// ── Service ──────────────────────────────────────────────────────────────────

export const googleWorkspaceService = {
  /**
   * Get a valid (decrypted) access token for a user.
   * Automatically refreshes if within 5 min of expiry.
   * Throws WorkspaceNotConnectedError if no connection exists.
   */
  async getValidAccessToken(userId: string): Promise<string> {
    const record = await googleWorkspaceRepository.findByUserId(userId);
    if (!record || !record.isActive) {
      throw new WorkspaceNotConnectedError(userId);
    }

    // Check if token expires within 5 minutes
    const fiveMinFromNow = new Date(Date.now() + 5 * 60 * 1000);
    if (record.tokenExpiry > fiveMinFromNow) {
      return decrypt(record.accessToken);
    }

    // Refresh and return new token
    await googleWorkspaceService.refreshAccessToken(userId);
    const refreshed = await googleWorkspaceRepository.findByUserId(userId);
    if (!refreshed) throw new WorkspaceNotConnectedError(userId);
    return decrypt(refreshed.accessToken);
  },

  /**
   * Refresh the Google access token using the stored refresh token.
   * Updates encrypted tokens and lastRefreshedAt in DB.
   */
  async refreshAccessToken(userId: string): Promise<void> {
    const record = await googleWorkspaceRepository.findByUserId(userId);
    if (!record || !record.isActive) {
      throw new WorkspaceNotConnectedError(userId);
    }

    const { clientId, clientSecret } = getGoogleCredentials();
    const refreshToken = decrypt(record.refreshToken);

    const res = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!res.ok) {
      // Mark as inactive — token likely revoked by user in Google
      await googleWorkspaceRepository.deactivate(userId);
      throw new WorkspaceTokenRefreshError(
        'Token refresh failed — Google Workspace disconnected',
      );
    }

    const tokens = (await res.json()) as GoogleTokenResponse;

    await googleWorkspaceRepository.updateTokens(userId, {
      accessToken: encrypt(tokens.access_token),
      refreshToken: tokens.refresh_token
        ? encrypt(tokens.refresh_token)
        : record.refreshToken,
      tokenExpiry: new Date(Date.now() + tokens.expires_in * 1000),
    });
  },

  /**
   * Revoke the Google connection and deactivate locally.
   */
  async revokeConnection(userId: string): Promise<void> {
    const record = await googleWorkspaceRepository.findByUserId(userId);
    if (!record) return;

    // Best-effort revocation with Google
    try {
      const accessToken = decrypt(record.accessToken);
      await fetch(`${GOOGLE_REVOKE_URL}?token=${accessToken}`, { method: 'POST' });
    } catch {
      // Revocation failure is non-critical — deactivate locally regardless
    }

    await googleWorkspaceRepository.deactivate(userId);
  },

  /**
   * Check if a user has granted all the specified scopes.
   * Does NOT decrypt tokens — only reads the grantedScopes array.
   */
  async hasGrantedScopes(userId: string, scopes: string[]): Promise<boolean> {
    const profile = await googleWorkspaceRepository.getPublicProfile(userId);
    if (!profile || !profile.isActive) return false;
    return hasAllScopes(profile.grantedScopes, scopes);
  },

  /**
   * Return which required scopes are not yet granted.
   */
  async getMissingScopes(userId: string, required: string[]): Promise<string[]> {
    const profile = await googleWorkspaceRepository.getPublicProfile(userId);
    if (!profile || !profile.isActive) return required;
    return getMissing(profile.grantedScopes, required);
  },

  /**
   * Get full connection status including per-feature flags.
   */
  async getConnectionStatus(userId: string): Promise<ConnectionStatus> {
    const profile = await googleWorkspaceRepository.getPublicProfile(userId);

    if (!profile || !profile.isActive) {
      return {
        connected: false,
        grantedScopes: [],
        features: { calendar: false, gmail: false, directory: false, drive: false },
      };
    }

    const scopes = profile.grantedScopes;

    return {
      connected: true,
      googleEmail: profile.googleEmail,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
      grantedScopes: scopes,
      connectedAt: profile.connectedAt.toISOString(),
      features: {
        calendar: hasAllScopes(scopes, [...SCOPE_SETS.CALENDAR]),
        gmail: hasAllScopes(scopes, [...SCOPE_SETS.GMAIL]),
        directory: hasAllScopes(scopes, [...SCOPE_SETS.DIRECTORY]),
        drive: hasAllScopes(scopes, [...SCOPE_SETS.DRIVE]),
      },
    };
  },
};
