# TeamTalent — Applicant Tracking System

A full-stack Applicant Tracking System built with Next.js 14 and Node.js/Express. TeamTalent covers the entire hiring lifecycle — from sourcing candidates to onboarding new hires — with real-time dashboards, pipeline management, performance tracking, and analytics.

---

## Features

- **Dashboard** — Live KPIs: open roles, active candidates, interviews scheduled, offers pending
- **Job Postings** — Create and manage job listings with status tracking (Draft → Open → Closed)
- **Candidates** — Candidate profiles, application tracking, status pipeline
- **Pipeline** — Kanban-style hiring pipeline (Applied → Screening → Interview → Offer → Hired)
- **Sourcing Hub** — People Search, AI Sourcing Agent, Unified multi-channel search
- **Talent Insights** — Analytics charts: time-to-hire, source breakdown, pipeline funnel
- **Performance** — Team performance scores, review cycles, competency radar, goals tracker
- **Reports** — 20 pre-built reports across Workforce, Talent Acquisition, Performance, Compensation, L&D
- **Onboarding** — Task management for new-hire onboarding workflows
- **Authentication** — JWT-based auth with httpOnly cookies and silent token refresh

---

## Tech Stack

### Frontend
| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS + CSS custom properties |
| Charts | Recharts |
| Icons | Lucide React |
| Testing | Playwright (E2E) |

### Backend
| Layer | Technology |
|---|---|
| Runtime | Node.js 20+ |
| Framework | Express.js |
| Language | TypeScript |
| ORM | Prisma |
| Database | PostgreSQL (Supabase) |
| Auth | JWT (access + refresh tokens, httpOnly cookies) |
| Hashing | bcryptjs (12 rounds) |
| Validation | Zod |
| Dev runner | tsx watch |

---

## Prerequisites

- Node.js 20+
- npm 9+
- A [Supabase](https://supabase.com) project (free tier works)

---

## Installation

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd ATS
```

### 2. Install frontend dependencies

```bash
npm install
```

### 3. Install backend dependencies

```bash
cd backend
npm install
```

### 4. Configure environment variables

**Frontend** — create `.env.local` in the project root:
```bash
cp .env.local.example .env.local
```

**Backend** — create `.env` in the `backend/` directory:
```bash
cp backend/.env.example backend/.env
```
Fill in your Supabase connection strings, JWT secrets, and port (see [Environment Variables](#environment-variables)).

### 5. Run database migrations

```bash
cd backend
npx prisma migrate deploy
```

### 6. Seed the database (optional)

```bash
cd backend
npx tsx prisma/seed.ts
```

This creates two demo accounts:
- `admin@teamtalent.com` / `Admin123!` (Admin)
- `hr@teamtalent.com` / `Admin123!` (HR)

---

## Running Locally

Open **two terminals**:

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev
# API running at http://localhost:3001
```

**Terminal 2 — Frontend:**
```bash
npm run dev
# App running at http://localhost:3000
```

Navigate to `http://localhost:3000` and log in with the seed credentials above.

---

## Environment Variables

### Frontend — `.env.local`

| Variable | Description | Default |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Backend API base URL | `http://localhost:3001/api` |

### Backend — `backend/.env`

| Variable | Description |
|---|---|
| `DATABASE_URL` | Supabase transaction pooler URL (port 6543, add `?pgbouncer=true`) |
| `DIRECT_URL` | Supabase session pooler URL (port 5432, used by Prisma migrate) |
| `JWT_ACCESS_SECRET` | 64-byte hex secret for access tokens |
| `JWT_REFRESH_SECRET` | 64-byte hex secret for refresh tokens |
| `JWT_ACCESS_EXPIRY` | Access token TTL (default: `15m`) |
| `JWT_REFRESH_EXPIRY` | Refresh token TTL (default: `7d`) |
| `PORT` | API server port (default: `3001`) |
| `NODE_ENV` | `development` or `production` |
| `FRONTEND_URL` | Allowed CORS origin (e.g. `http://localhost:3000`) |

Generate JWT secrets:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## API Endpoints

All routes are prefixed with `/api`.

### Auth — `/api/auth`
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/login` | No | Login with email + password; sets httpOnly cookies |
| POST | `/refresh` | No | Rotate refresh token; issues new access token |
| POST | `/logout` | No | Clears auth cookies |
| GET | `/me` | Yes | Returns authenticated user profile |

### Dashboard — `/api/dashboard`
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/stats` | Yes | Returns KPI counts (open roles, candidates, interviews, offers) |

### Jobs — `/api/jobs`
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | Yes | Paginated list of job postings with application counts |

### Candidates — `/api/candidates`
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/tracking` | Yes | Paginated list of candidate applications with job/status info |

---

## Folder Structure

```
ATS/
├── src/                          # Next.js frontend source
│   ├── app/
│   │   ├── (auth)/login/         # Login page (unauthenticated route group)
│   │   └── (dashboard)/          # Protected route group
│   │       ├── layout.tsx        # Dashboard shell with sidebar
│   │       ├── dashboard/        # Main dashboard page
│   │       ├── job-postings/     # Job listings + create form
│   │       ├── candidates/       # Candidate tracking list
│   │       ├── pipeline/         # Kanban hiring pipeline
│   │       ├── sourcing/         # Sourcing hub + sub-pages
│   │       ├── talent-insights/  # Analytics charts
│   │       ├── performance/      # Team performance dashboard
│   │       ├── reports/          # Report library
│   │       └── onboarding/       # Onboarding task manager
│   ├── components/
│   │   ├── ui/                   # Reusable primitives (Button, Card, Badge, Input, Avatar)
│   │   ├── layout/               # Sidebar navigation
│   │   ├── dashboard/            # JobListingCard, CandidateCard
│   │   ├── candidates/           # CandidateDrawer
│   │   └── pipeline/             # PipelineCandidateCard
│   ├── contexts/AuthContext.tsx  # Global auth state (login, logout, user)
│   ├── hooks/useAuth.ts          # Convenience hook for AuthContext
│   ├── lib/
│   │   ├── api.ts                # Typed fetch wrapper + API clients
│   │   └── constants.ts          # Shared constants
│   └── types/index.ts            # Shared TypeScript types
│
├── backend/
│   ├── server.ts                 # Express entry point
│   ├── prisma/
│   │   ├── schema.prisma         # Database schema
│   │   ├── seed.ts               # Demo data seeder
│   │   └── migrations/           # SQL migration history
│   └── src/
│       ├── controllers/          # HTTP request handlers
│       ├── services/             # Business logic
│       ├── repositories/         # Database queries (Prisma)
│       ├── routes/               # Express route definitions
│       ├── middleware/           # Auth, validation, error handling
│       ├── lib/prisma.ts         # Singleton PrismaClient
│       ├── types/                # Shared types + Zod schemas
│       └── utils/                # JWT, password, env, response helpers
│
├── tests/                        # Playwright E2E tests
├── documentation/                # Additional project docs
├── .env.local.example            # Frontend env template
└── backend/.env.example          # Backend env template
```

---

## Running Tests

```bash
# Run all Playwright E2E tests
npm test

# Open Playwright UI mode
npm run test:ui

# View last test report
npm run test:report
```

---

## Production Build

**Frontend:**
```bash
npm run build
npm start
```

**Backend:**
```bash
cd backend
npm run build     # compiles TypeScript → dist/
npm start         # runs dist/server.js
```

Set `NODE_ENV=production` and update `FRONTEND_URL` to your deployed frontend domain.

---

## License

Private — all rights reserved.
