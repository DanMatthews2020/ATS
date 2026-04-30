/**
 * @file googleAuth.service.ts
 * @description Google SSO authentication — OAuth URL generation, callback handling,
 * and session cookie issuance.
 *
 * Reuses the existing JWT signing + refresh token creation from auth.service/jwt utils.
 * No token logic is duplicated.
 */
import { google } from 'googleapis';
import { prisma } from '../lib/prisma';
import { authRepository } from '../repositories/auth.repository';
import { googleWorkspaceRepository } from '../repositories/googleWorkspace.repository';
import { signAccessToken, signRefreshToken } from '../utils/jwt';
import { encrypt } from '../utils/encryption';
import { SCOPE_SETS, buildScopeString } from '../config/googleScopes';
import type { Response } from 'express';

// ── Constants ────────────────────────────────────────────────────────────────

const REFRESH_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days — matches auth.service

const isProd = process.env.NODE_ENV === 'production';

const COOKIE_BASE = {
  httpOnly: true,
  secure: isProd,
  sameSite: (isProd ? 'none' : 'lax') as 'none' | 'lax',
  path: '/',
};

const ALLOWED_DOMAIN = 'ordios.com';

// ── OAuth2 client ────────────────────────────────────────────────────────────

function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_SSO_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Missing GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, or GOOGLE_SSO_REDIRECT_URI');
  }
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

// ── Types ────────────────────────────────────────────────────────────────────

interface GoogleUserInfo {
  id: string;
  email: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  hd?: string; // hosted domain
}

// ── Service ──────────────────────────────────────────────────────────────────

export const googleAuthService = {
  /**
   * Generate the Google OAuth consent URL.
   * Requests identity scopes + workspace scopes for initial connect.
   */
  generateAuthUrl(state?: string): string {
    const client = getOAuth2Client();
    const scopes = buildScopeString([...SCOPE_SETS.CALENDAR, ...SCOPE_SETS.GMAIL]);

    return client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: scopes,
      state: state ?? 'login',
    });
  },

  /**
   * Handle the OAuth callback — exchange code for tokens, find-or-create user,
   * store workspace connection, issue JWT session cookies.
   */
  async handleCallback(code: string, res: Response): Promise<{ user: ReturnType<typeof safeUser> }> {
    const client = getOAuth2Client();

    // Exchange authorization code for tokens
    const { tokens } = await client.getToken(code);
    if (!tokens.access_token) {
      throw serviceError(401, 'GOOGLE_AUTH_FAILED', 'Failed to obtain access token from Google');
    }

    // Fetch user info from Google
    client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: 'v2', auth: client });
    const { data: googleUser } = await oauth2.userinfo.get();

    if (!googleUser.email || !googleUser.id) {
      throw serviceError(401, 'GOOGLE_AUTH_FAILED', 'Unable to retrieve Google account info');
    }

    // Domain restriction — ordios.com only
    const domain = googleUser.email.split('@')[1];
    if (domain !== ALLOWED_DOMAIN) {
      throw serviceError(403, 'DOMAIN_NOT_ALLOWED', `Only @${ALLOWED_DOMAIN} accounts are permitted`);
    }

    // Find existing user by email, or create a new one
    let user = await authRepository.findByEmail(googleUser.email);

    if (!user) {
      // Auto-create user for valid domain
      user = await prisma.user.create({
        data: {
          email: googleUser.email,
          firstName: googleUser.given_name ?? googleUser.email.split('@')[0],
          lastName: googleUser.family_name ?? '',
          passwordHash: '__google_sso__', // Placeholder — SSO users don't use password login
          role: 'MANAGER', // Default role for SSO-created users
          avatarUrl: googleUser.picture ?? null,
        },
      });
    }

    // Store / update Google Workspace connection
    const grantedScopes = tokens.scope?.split(' ') ?? [];
    await googleWorkspaceRepository.upsert(user.id, {
      googleEmail: googleUser.email,
      googleUserId: googleUser.id,
      displayName: `${user.firstName} ${user.lastName}`.trim(),
      avatarUrl: googleUser.picture ?? null,
      accessToken: encrypt(tokens.access_token),
      refreshToken: encrypt(tokens.refresh_token ?? ''),
      tokenExpiry: new Date(tokens.expiry_date ?? Date.now() + 3600 * 1000),
      grantedScopes,
      isActive: true,
    });

    // Issue JWT session cookies — exact same pattern as auth.controller
    issueSessionCookies(res, user);

    return { user: safeUser(user) };
  },

  /**
   * Check if Google SSO is available (env vars configured).
   */
  isConfigured(): boolean {
    return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_SSO_REDIRECT_URI);
  },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Issue access + refresh token cookies on the response.
 * Uses the exact same JWT functions, cookie names, options, and expiry as auth.controller.
 */
async function issueSessionCookies(
  res: Response,
  user: { id: string; email: string; role: string },
): Promise<void> {
  const accessToken = signAccessToken({ userId: user.id, email: user.email, role: user.role });
  const refreshToken = signRefreshToken({ userId: user.id });
  const expiresAt = new Date(Date.now() + REFRESH_EXPIRY_MS);

  await authRepository.createRefreshToken(user.id, refreshToken, expiresAt);

  res.cookie('access_token', accessToken, {
    ...COOKIE_BASE,
    maxAge: 15 * 60 * 1000, // 15 min
  });
  res.cookie('refresh_token', refreshToken, {
    ...COOKIE_BASE,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
}

function safeUser(user: { id: string; email: string; firstName: string; lastName: string; role: string; avatarUrl: string | null }) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    avatarUrl: user.avatarUrl,
  };
}

function serviceError(statusCode: number, code: string, message: string) {
  return { statusCode, code, message };
}
