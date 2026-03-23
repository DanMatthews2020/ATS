/**
 * @file password.ts
 * @description Password hashing and verification using bcrypt.
 * Salt rounds are set to 12 — high enough to be secure, low enough to be usable.
 */
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

/** Hashes a plain-text password. Returns a bcrypt hash string. */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/** Compares a plain-text password against a stored bcrypt hash. */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
