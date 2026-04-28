/**
 * @file calendarIntegration.service.ts
 * @description Google Calendar OAuth + FreeBusy business logic.
 *
 * Handles the full OAuth2 flow, token encryption/refresh, and
 * Google Calendar API calls. Tokens are never exposed outside this layer.
 */
import { randomBytes } from 'crypto';
import { calendarIntegrationRepository } from '../repositories/calendarIntegration.repository';
import { encrypt, decrypt } from '../utils/encryption';

// ─── Google OAuth constants ─────────────────────────────────────────────────

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_REVOKE_URL = 'https://oauth2.googleapis.com/revoke';
const GOOGLE_FREEBUSY_URL = 'https://www.googleapis.com/calendar/v3/freeBusy';
const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.readonly',
].join(' ');

function getGoogleCredentials() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Missing Google OAuth environment variables');
  }
  return { clientId, clientSecret, redirectUri };
}

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CalendarStatus {
  connected: boolean;
  email?: string;
  calendarId?: string;
  provider?: string;
}

export interface BusyInterval {
  start: string;
  end: string;
}

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

// ─── Service ────────────────────────────────────────────────────────────────

export const calendarIntegrationService = {
  generateGoogleAuthUrl(userId: string): string {
    const { clientId, redirectUri } = getGoogleCredentials();
    const csrf = randomBytes(16).toString('hex');
    const state = Buffer.from(JSON.stringify({ userId, csrf })).toString('base64url');
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: SCOPES,
      access_type: 'offline',
      prompt: 'consent',
      state,
    });
    return `${GOOGLE_AUTH_URL}?${params.toString()}`;
  },

  async handleGoogleCallback(code: string, state: string) {
    // Decode and validate state
    let stateData: { userId: string; csrf: string };
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64url').toString('utf8'));
    } catch {
      throw Object.assign(new Error('Invalid OAuth state parameter'), { code: 'INVALID_STATE' });
    }
    if (!stateData.userId || !stateData.csrf) {
      throw Object.assign(new Error('Malformed OAuth state'), { code: 'INVALID_STATE' });
    }

    // Exchange code for tokens
    const { clientId, clientSecret, redirectUri } = getGoogleCredentials();
    const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      throw Object.assign(new Error('Failed to exchange authorization code'), { code: 'TOKEN_EXCHANGE_FAILED' });
    }

    const tokens: GoogleTokenResponse = await tokenRes.json();
    if (!tokens.access_token) {
      throw Object.assign(new Error('No access token received'), { code: 'TOKEN_EXCHANGE_FAILED' });
    }

    // Fetch primary calendar ID (email)
    const calendarId = await fetchPrimaryCalendarId(tokens.access_token);

    // Encrypt tokens and store
    const record = await calendarIntegrationRepository.upsert(stateData.userId, {
      provider: 'GOOGLE',
      accessToken: encrypt(tokens.access_token),
      refreshToken: encrypt(tokens.refresh_token ?? ''),
      tokenExpiry: new Date(Date.now() + tokens.expires_in * 1000),
      calendarId,
      isActive: true,
    });

    return record;
  },

  async refreshTokenIfExpired(userId: string): Promise<string> {
    const record = await calendarIntegrationRepository.findByUserId(userId);
    if (!record || !record.isActive) {
      throw Object.assign(new Error('No active calendar integration'), { code: 'NOT_CONNECTED' });
    }

    // Check if token expires within 5 minutes
    const fiveMinFromNow = new Date(Date.now() + 5 * 60 * 1000);
    if (record.tokenExpiry > fiveMinFromNow) {
      return decrypt(record.accessToken);
    }

    // Refresh the token
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
      // Mark as inactive if refresh fails (revoked by user in Google)
      await calendarIntegrationRepository.deactivate(userId);
      throw Object.assign(new Error('Token refresh failed — calendar disconnected'), { code: 'REFRESH_FAILED' });
    }

    const tokens: GoogleTokenResponse = await res.json();

    await calendarIntegrationRepository.updateTokens(userId, {
      accessToken: encrypt(tokens.access_token),
      refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : record.refreshToken,
      tokenExpiry: new Date(Date.now() + tokens.expires_in * 1000),
    });

    return tokens.access_token;
  },

  async disconnectCalendar(userId: string): Promise<void> {
    const record = await calendarIntegrationRepository.findByUserId(userId);
    if (!record) return;

    // Revoke the token with Google (best-effort)
    try {
      const accessToken = decrypt(record.accessToken);
      await fetch(`${GOOGLE_REVOKE_URL}?token=${accessToken}`, { method: 'POST' });
    } catch {
      // Revocation failure is non-critical — deactivate locally regardless
    }

    await calendarIntegrationRepository.deactivate(userId);
  },

  async getCalendarStatus(userId: string): Promise<CalendarStatus> {
    const record = await calendarIntegrationRepository.findStatusByUserId(userId);
    if (!record || !record.isActive) {
      return { connected: false };
    }
    return {
      connected: true,
      calendarId: record.calendarId,
      email: record.calendarId, // Google primary calendar ID is the email
      provider: record.provider,
    };
  },

  async getFreeBusy(
    userIds: string[],
    timeMin: Date,
    timeMax: Date,
  ): Promise<Record<string, BusyInterval[]>> {
    const result: Record<string, BusyInterval[]> = {};

    await Promise.all(
      userIds.map(async (userId) => {
        try {
          const accessToken = await calendarIntegrationService.refreshTokenIfExpired(userId);
          const record = await calendarIntegrationRepository.findStatusByUserId(userId);
          if (!record) {
            result[userId] = [];
            return;
          }

          const res = await fetch(GOOGLE_FREEBUSY_URL, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              timeMin: timeMin.toISOString(),
              timeMax: timeMax.toISOString(),
              items: [{ id: record.calendarId }],
            }),
          });

          if (!res.ok) {
            result[userId] = [];
            return;
          }

          const body = await res.json() as {
            calendars: Record<string, { busy: Array<{ start: string; end: string }> }>;
          };
          const calendarBusy = body.calendars?.[record.calendarId]?.busy ?? [];
          result[userId] = calendarBusy.map((b) => ({ start: b.start, end: b.end }));
        } catch {
          result[userId] = [];
        }
      }),
    );

    return result;
  },
};

// ─── Helpers ────────────────────────────────────────────────────────────────

async function fetchPrimaryCalendarId(accessToken: string): Promise<string> {
  const res = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary',
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok) return 'primary';
  const body = await res.json() as { id?: string };
  return body.id ?? 'primary';
}
