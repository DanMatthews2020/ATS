/**
 * @file jwt.ts
 * @description JWT signing and verification utilities.
 *
 * Two token types are used:
 *  - Access token  — short-lived (15 min), carries user identity claims
 *  - Refresh token — long-lived (7 days), used only to rotate tokens
 *
 * Secrets are loaded from environment variables at startup.
 */
import jwt from 'jsonwebtoken';
import { env } from './env';

export interface AccessTokenPayload {
  userId: string;
  email: string;
  role: string;
}

export interface RefreshTokenPayload {
  userId: string;
}

/** Signs a short-lived access token containing user identity claims. */
export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRY,
  } as jwt.SignOptions);
}

/** Signs a long-lived refresh token containing only the user ID. */
export function signRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRY,
  } as jwt.SignOptions);
}

/** Verifies and decodes an access token. Throws if expired or invalid. */
export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
}

/** Verifies and decodes a refresh token. Throws if expired or invalid. */
export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
}
