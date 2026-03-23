import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import routes from './src/routes';
import { errorHandler, notFound } from './src/middleware/error.middleware';
import { env } from './src/utils/env';

const app = express();

// ── Global middleware ───────────────────────────────────────────────────────
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true, // Required for cross-origin cookies
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── Health check ────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
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
