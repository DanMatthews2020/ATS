/**
 * @file server.ts
 * @description Express application entry point.
 *
 * Bootstraps the TeamTalent API server with:
 *  - CORS restricted to the configured frontend origin
 *  - JSON + URL-encoded body parsing
 *  - Cookie parsing (required for httpOnly auth tokens)
 *  - All API routes mounted at /api
 *  - Global 404 and error-handler middleware
 */
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import routes from './src/routes';
import { errorHandler, notFound } from './src/middleware/error.middleware';
import { env } from './src/utils/env';
import { prisma } from './src/lib/prisma';

const app = express();

// ── Global middleware ───────────────────────────────────────────────────────
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true, // Required for cross-origin cookies
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── Health check ────────────────────────────────────────────────────────────
app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', database: 'connected', timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'error', database: 'disconnected', timestamp: new Date().toISOString() });
  }
});

// ── API routes ──────────────────────────────────────────────────────────────
app.use('/api', routes);

// ── Error handling (must be last) ───────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`\n🚀 TeamTalent API  →  http://localhost:${env.PORT}`);
  console.log(`   Environment      →  ${env.NODE_ENV}`);
  console.log(`   Frontend origin  →  ${env.FRONTEND_URL}\n`);
});

export default app;
