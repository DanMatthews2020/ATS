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
import { startFeedbackReminderJob } from './src/jobs/feedbackReminder.job';

const app = express();

// ── CORS ────────────────────────────────────────────────────────────────────
// Public feed endpoints (/api/feed/*) are open to any origin so external
// career pages and embed widgets can fetch the job feed.
// All other routes remain restricted to the frontend origin.
const feedPathPattern = /^\/api\/feed(\/|$)/;
app.use(
  cors({
    origin(origin, callback) {
      // Allow requests with no origin (server-to-server, curl, etc.)
      if (!origin) return callback(null, true);
      // Always allow the frontend origin
      if (origin === env.FRONTEND_URL) return callback(null, true);
      // For non-frontend origins, only allow feed routes (handled per-request below)
      // We accept all origins here; the path check happens in the next middleware
      callback(null, true);
    },
    credentials: true, // Required for cross-origin cookies on authenticated routes
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  }),
);
// Block non-frontend origins on non-feed routes
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && origin !== env.FRONTEND_URL && !feedPathPattern.test(req.path)) {
    res.status(403).json({ success: false, error: { code: 'CORS_BLOCKED', message: 'Origin not allowed' } });
    return;
  }
  next();
});
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
  startFeedbackReminderJob();
});

export default app;
