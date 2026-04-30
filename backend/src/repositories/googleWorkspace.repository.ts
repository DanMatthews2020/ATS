/**
 * @file googleWorkspace.repository.ts
 * @description Database access for GoogleWorkspaceConnection records.
 *
 * Tokens (accessToken, refreshToken) are stored encrypted. This repository
 * returns them as-is (encrypted) — the service layer handles decryption.
 * Public-facing methods strip tokens before returning.
 */
import { prisma } from '../lib/prisma';

// ── Types ────────────────────────────────────────────────────────────────────

export interface GoogleWorkspaceUpsertData {
  googleEmail: string;
  googleUserId: string;
  displayName: string;
  avatarUrl?: string | null;
  accessToken: string;   // already encrypted
  refreshToken: string;  // already encrypted
  tokenExpiry: Date;
  grantedScopes: string[];
  isActive: boolean;
}

export interface TokenUpdateData {
  accessToken: string;   // already encrypted
  refreshToken: string;  // already encrypted
  tokenExpiry: Date;
}

// Token-safe projection — used for all external responses
const PUBLIC_SELECT = {
  id: true,
  userId: true,
  googleEmail: true,
  googleUserId: true,
  displayName: true,
  avatarUrl: true,
  grantedScopes: true,
  isActive: true,
  connectedAt: true,
  lastRefreshedAt: true,
  createdAt: true,
  updatedAt: true,
  // accessToken and refreshToken deliberately omitted
} as const;

// ── Repository ───────────────────────────────────────────────────────────────

export const googleWorkspaceRepository = {
  /**
   * Full record including encrypted tokens.
   * For internal service-layer use only — never return to controllers.
   */
  async findByUserId(userId: string) {
    return prisma.googleWorkspaceConnection.findUnique({
      where: { userId },
    });
  },

  /**
   * Full record by Google user ID (for OAuth callback dedup).
   * Internal use only.
   */
  async findByGoogleUserId(googleUserId: string) {
    return prisma.googleWorkspaceConnection.findUnique({
      where: { googleUserId },
    });
  },

  /**
   * Create or update connection. Used during OAuth callback.
   */
  async upsert(userId: string, data: GoogleWorkspaceUpsertData) {
    return prisma.googleWorkspaceConnection.upsert({
      where: { userId },
      create: { userId, ...data },
      update: {
        googleEmail: data.googleEmail,
        displayName: data.displayName,
        avatarUrl: data.avatarUrl,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        tokenExpiry: data.tokenExpiry,
        grantedScopes: data.grantedScopes,
        isActive: data.isActive,
      },
    });
  },

  /**
   * Update encrypted tokens and expiry after a refresh.
   */
  async updateTokens(userId: string, data: TokenUpdateData) {
    await prisma.googleWorkspaceConnection.update({
      where: { userId },
      data: {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        tokenExpiry: data.tokenExpiry,
        lastRefreshedAt: new Date(),
      },
    });
  },

  /**
   * Merge newly-granted scopes into the existing set.
   */
  async updateGrantedScopes(userId: string, scopes: string[]) {
    const existing = await prisma.googleWorkspaceConnection.findUnique({
      where: { userId },
      select: { grantedScopes: true },
    });
    const merged = Array.from(new Set([...(existing?.grantedScopes ?? []), ...scopes]));
    await prisma.googleWorkspaceConnection.update({
      where: { userId },
      data: { grantedScopes: merged },
    });
  },

  /**
   * Deactivate connection (token revoked or user disconnected).
   */
  async deactivate(userId: string) {
    await prisma.googleWorkspaceConnection.updateMany({
      where: { userId },
      data: { isActive: false },
    });
  },

  /**
   * Token-safe public profile — for API responses and status checks.
   */
  async getPublicProfile(userId: string) {
    return prisma.googleWorkspaceConnection.findUnique({
      where: { userId },
      select: PUBLIC_SELECT,
    });
  },
};
