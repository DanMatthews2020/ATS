/**
 * @file auth.service.ts
 * @description Authentication business logic.
 *
 * Responsibilities:
 *  - Validate credentials and issue JWT token pairs
 *  - Rotate refresh tokens on each use (prevents token reuse attacks)
 *  - Revoke tokens on logout
 *  - Return safe user profile objects (no password hashes)
 */
import { authRepository } from '../repositories/auth.repository';
import { verifyPassword, hashPassword } from '../utils/password';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';

const REFRESH_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function authError(message: string) {
  return { statusCode: 401, code: 'INVALID_CREDENTIALS', message };
}

export const authService = {
  async login(email: string, password: string) {
    const user = await authRepository.findByEmail(email);
    if (!user) throw authError('Invalid email or password');

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) throw authError('Invalid email or password');

    const accessToken = signAccessToken({ userId: user.id, email: user.email, role: user.role });
    const refreshToken = signRefreshToken({ userId: user.id });
    const expiresAt = new Date(Date.now() + REFRESH_EXPIRY_MS);

    await authRepository.createRefreshToken(user.id, refreshToken, expiresAt);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
    };
  },

  async refresh(refreshToken: string) {
    const stored = await authRepository.findRefreshToken(refreshToken);

    if (!stored || stored.expiresAt < new Date()) {
      if (stored) await authRepository.deleteRefreshToken(refreshToken);
      throw { statusCode: 401, code: 'INVALID_REFRESH_TOKEN', message: 'Refresh token expired' };
    }

    try {
      verifyRefreshToken(refreshToken);
    } catch {
      await authRepository.deleteRefreshToken(refreshToken);
      throw { statusCode: 401, code: 'INVALID_REFRESH_TOKEN', message: 'Refresh token invalid' };
    }

    // Rotate: delete old token, issue fresh pair
    await authRepository.deleteRefreshToken(refreshToken);

    const { user } = stored;
    const newAccessToken = signAccessToken({ userId: user.id, email: user.email, role: user.role });
    const newRefreshToken = signRefreshToken({ userId: user.id });
    const expiresAt = new Date(Date.now() + REFRESH_EXPIRY_MS);

    await authRepository.createRefreshToken(user.id, newRefreshToken, expiresAt);

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  },

  async logout(refreshToken: string): Promise<void> {
    await authRepository.deleteRefreshToken(refreshToken);
  },

  async getMe(userId: string) {
    const user = await authRepository.findById(userId);
    if (!user) throw { statusCode: 404, code: 'USER_NOT_FOUND', message: 'User not found' };

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      avatarUrl: user.avatarUrl,
    };
  },

  // Exposed for seeding / user creation
  hashPassword,
};
