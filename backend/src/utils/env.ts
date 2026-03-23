import 'dotenv/config';

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

export const env = {
  DATABASE_URL: requireEnv('DATABASE_URL'),
  JWT_ACCESS_SECRET: requireEnv('JWT_ACCESS_SECRET'),
  JWT_REFRESH_SECRET: requireEnv('JWT_REFRESH_SECRET'),
  JWT_ACCESS_EXPIRY: process.env.JWT_ACCESS_EXPIRY ?? '15m',
  JWT_REFRESH_EXPIRY: process.env.JWT_REFRESH_EXPIRY ?? '7d',
  PORT: Number(process.env.PORT ?? 3001),
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  FRONTEND_URL: process.env.FRONTEND_URL ?? 'http://localhost:3000',
};
