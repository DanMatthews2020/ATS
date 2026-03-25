# TeamTalent — Applicant Tracking System

A full-stack Applicant Tracking System built with Next.js 14 and Node.js/Express. TeamTalent covers the entire hiring lifecycle — from sourcing candidates to onboarding new hires — with real-time dashboards, pipeline management, performance tracking, and analytics.

---

## Live URLs

| Service | URL |
|---|---|
| Frontend (Vercel) | https://teamtalentats.vercel.app |
| Backend API (Render) | https://teamtalent-backend.onrender.com/api |
| Health Check | https://teamtalent-backend.onrender.com/health |

---

## Tech Stack

### Frontend
| Layer | Technology |
|---|---|
| Framework | Next.js 14.2.35 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS + CSS custom properties |
| Charts | Recharts |
| Icons | Lucide React |
| Drag & Drop | @dnd-kit/core |
| Testing | Playwright (E2E) |

### Backend
| Layer | Technology |
|---|---|
| Runtime | Node.js 20+ |
| Framework | Express.js |
| Language | TypeScript |
| ORM | Prisma 5 |
| Database | PostgreSQL (Supabase) |
| Auth | JWT (access + refresh tokens, httpOnly cookies) |
| Hashing | bcryptjs (12 rounds) |
| Validation | Zod |
| Dev runner | tsx watch |
| CV Parsing | Anthropic Claude API |

---

## Pages Built

| Route | Status | Description |
|---|---|---|
| `/login` | Live | JWT auth with email + password |
| `/dashboard` | Live · Supabase | KPI stats, recent jobs, recent candidates — all from DB |
| `/jobs` | Live · Supabase | Job postings list with status filter, stat cards |
| `/jobs/create` | Live · Supabase | Create job form (Draft or Publish) → saves to DB |
| `/jobs/[id]` | Live · Supabase | Job detail: description, applicants table, close role |
| `/candidates` | Live · Supabase | Candidate list with search, status filter, add candidate drawer |
| `/candidates/[id]` | Live · Supabase | Full candidate profile: contact, skills, applications, interviews, notes, activity |
| `/pipeline` | Live · Supabase | Kanban board by hiring stage; drag-and-drop updates DB; side panel |
| `/interviews` | UI only | Interview calendar view — backend is in-memory, not yet Prisma |
| `/offers` | UI only | Offer management board — backend is in-memory, not yet Prisma |
| `/employees` | UI only | Employee directory — backend is in-memory, not yet Prisma |
| `/employees/[id]` | UI only | Employee profile — backend is in-memory, not yet Prisma |
| `/inbox` | UI only | Notifications centre — backend is in-memory, not yet Prisma |
| `/onboarding` | UI only | New-hire task manager |
| `/performance` | UI only | Team performance dashboard with charts |
| `/performance/cycles/[id]` | UI only | Review cycle detail |
| `/performance/employees/[id]` | UI only | Employee performance detail |
| `/reports` | UI only | 20 pre-built report library |
| `/settings` | UI only | Account and team settings |
| `/settings/scorecards` | Live · Supabase | Scorecard builder — create, edit, duplicate, delete interview scorecards with draggable criteria |
| `/sourcing` | UI only | Sourcing hub landing page |
| `/sourcing/people` | Mock data | People search interface |
| `/sourcing/ai-agent` | Mock data | AI sourcing agent control panel |
| `/sourcing/unified` | Mock data | Multi-channel search |
| `/talent-insights` | UI only | Analytics charts (Recharts) |

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
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

**Backend** — create `backend/.env` (copy from `.env.example`):
```bash
cp backend/.env.example backend/.env
# then fill in your values
```

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

Creates two demo accounts:
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

| Variable | Description | Example |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Backend API base URL | `http://localhost:3001/api` |

### Backend — `backend/.env`

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | Supabase **transaction pooler** URL (port 6543) — used at runtime |
| `DIRECT_URL` | Yes | Supabase **session pooler** URL (port 5432) — used by Prisma migrate |
| `JWT_ACCESS_SECRET` | Yes | 64-byte hex secret for access tokens |
| `JWT_REFRESH_SECRET` | Yes | 64-byte hex secret for refresh tokens |
| `FRONTEND_URL` | Yes | Allowed CORS origin — must exactly match your deployed frontend URL |
| `NODE_ENV` | Yes | Set to `production` on Render — enables `SameSite=None` cookies for cross-origin auth |
| `JWT_ACCESS_EXPIRY` | No | Access token TTL (default: `15m`) |
| `JWT_REFRESH_EXPIRY` | No | Refresh token TTL (default: `7d`) |
| `PORT` | No | API server port (default: `3001`) |
| `ANTHROPIC_API_KEY` | No | Enables CV parsing in Add Candidate drawer — graceful fallback if absent |

Generate JWT secrets:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

> **Important:** `NODE_ENV=production` is required on Render. Without it, auth cookies use `SameSite=lax` which is dropped by the browser on cross-origin requests (Vercel → Render), causing every API call to return 401 after login.

---

## API Endpoints

All routes are prefixed with `/api` and require authentication (JWT cookie) unless noted.

### Auth — `/api/auth`
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/login` | No | Login; sets httpOnly access + refresh token cookies |
| POST | `/refresh` | No | Rotate refresh token; issues new access token |
| POST | `/logout` | No | Clears auth cookies |
| GET | `/me` | Yes | Returns authenticated user profile |

### Dashboard — `/api/dashboard`
| Method | Path | Description |
|---|---|---|
| GET | `/stats` | Live counts: open roles, active candidates, interviews scheduled, offers sent |

### Jobs — `/api/jobs`
| Method | Path | Description |
|---|---|---|
| GET | `/stats` | Open positions, total applicants, interviews this week, offers extended |
| GET | `/` | Paginated job postings with applicant counts |
| POST | `/` | Create job posting (Zod validated) |
| GET | `/:id` | Full job detail with applicants list |
| GET | `/:id/applications` | All applications for a job (for Pipeline) |
| PATCH | `/:id` | Update job status (OPEN / CLOSED / DRAFT) |

### Candidates — `/api/candidates`
| Method | Path | Description |
|---|---|---|
| GET | `/` | Paginated candidate list with search |
| POST | `/` | Create candidate (Zod validated) |
| POST | `/parse-cv` | Parse uploaded CV with Claude API; returns extracted fields |
| GET | `/tracking` | Applications tracking view (for Dashboard) |
| GET | `/:id` | Full candidate profile with application + interview history |

### Applications — `/api/applications`
| Method | Path | Description |
|---|---|---|
| POST | `/` | Create application (link candidate to job) |
| PATCH | `/:id/stage` | Update application stage (Zod validates DB enum) |
| PATCH | `/:id/notes` | Update internal notes on an application |

### Scorecards — `/api/scorecards`
| Method | Path | Description |
|---|---|---|
| GET | `/` | List all scorecards with criteria and usage count |
| POST | `/` | Create scorecard with nested criteria |
| GET | `/:id` | Get single scorecard with full criteria |
| PATCH | `/:id` | Update scorecard name, description, and criteria |
| DELETE | `/:id` | Delete scorecard |

### Evaluations — `/api/evaluations`
| Method | Path | Description |
|---|---|---|
| GET | `/candidate/:candidateId` | All evaluations for a candidate |
| POST | `/` | Create evaluation with criterion responses |
| PATCH | `/:id` | Update evaluation status or responses |

### Health
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/health` | No | Returns `{ status, database, timestamp }` — 503 if DB unreachable |

---

## Database

- **Provider:** Supabase (PostgreSQL)
- **ORM:** Prisma 5
- **Schema location:** `backend/prisma/schema.prisma`
- **Migrations:** `backend/prisma/migrations/`

### Models
`User` · `JobPosting` · `Candidate` · `Application` · `Interview` · `Offer` · `Employee` · `OnboardingTask` · `WorkflowStage` · `Scorecard` · `ScorecardCriterion` · `CandidateEvaluation` · `EvaluationResponse`

### Run migrations against production:
```bash
cd backend
npx prisma migrate deploy
```

### Open Prisma Studio (local DB browser):
```bash
cd backend
npx prisma studio
```

---

## Folder Structure

```
ATS/
├── src/                          # Next.js frontend source
│   ├── app/
│   │   ├── (auth)/login/         # Login page (unauthenticated route group)
│   │   └── (dashboard)/          # Protected route group
│   │       ├── layout.tsx        # Dashboard shell with sidebar
│   │       ├── dashboard/        # Main dashboard
│   │       ├── jobs/             # Job listings + create form + detail
│   │       ├── candidates/       # Candidate list + add drawer + profile
│   │       ├── pipeline/         # Kanban hiring pipeline (dnd-kit)
│   │       ├── interviews/       # Interview calendar
│   │       ├── offers/           # Offer management
│   │       ├── employees/        # Employee directory + profiles
│   │       ├── inbox/            # Notifications centre
│   │       ├── sourcing/         # Sourcing hub + sub-pages
│   │       ├── talent-insights/  # Analytics charts
│   │       ├── performance/      # Team performance + cycles + profiles
│   │       ├── reports/          # Report library
│   │       ├── onboarding/       # Onboarding task manager
│   │       └── settings/         # Account + team settings
│   │           └── scorecards/   # Scorecard builder (fully connected)
│   ├── components/
│   │   ├── ui/                   # Button, Card, Badge, Input, Avatar
│   │   ├── layout/               # Sidebar navigation
│   │   ├── dashboard/            # JobListingCard, CandidateCard
│   │   ├── pipeline/             # PipelineCandidateCard
│   │   ├── CandidatePanel.tsx    # Candidate side panel with tabs (incl. Feedback)
│   │   └── ScorecardModal.tsx    # Evaluation modal (stage list + evaluation form)
│   ├── contexts/
│   │   ├── AuthContext.tsx       # Global auth state (login, logout, user)
│   │   └── ToastContext.tsx      # Global toast notifications
│   ├── lib/
│   │   ├── api.ts                # Typed fetch wrapper + all API clients
│   │   └── constants.ts          # Nav items, shared constants
│   └── types/index.ts            # Shared TypeScript types
│
├── backend/
│   ├── server.ts                 # Express entry point (CORS, middleware, routes)
│   ├── prisma/
│   │   ├── schema.prisma         # Database schema (8 models)
│   │   ├── seed.ts               # Demo data seeder
│   │   └── migrations/           # SQL migration history
│   └── src/
│       ├── controllers/          # HTTP request handlers
│       ├── services/             # Business logic + DTO mapping
│       ├── repositories/         # Prisma database queries
│       ├── routes/               # Express route definitions
│       ├── middleware/           # Auth, Zod validation, error handling
│       ├── lib/prisma.ts         # Singleton PrismaClient
│       ├── types/schemas.ts      # Zod validation schemas
│       └── utils/                # JWT, bcrypt, env, response helpers
│
├── tests/                        # Playwright E2E tests
├── CHANGELOG.md                  # Version history
└── backend/.env.example          # Backend env variable template
```

---

## Current Status

### Working end-to-end with Supabase
- Login / logout / session refresh
- Dashboard KPI stats
- Jobs: list, create, view detail, close role
- Candidates: list, search, add, view profile, move stage, save notes
- Pipeline: kanban board, drag-and-drop stage moves, candidate side panel with feedback tab
- Workflow Builder: per-job interview stage configuration with scorecard assignment
- Scorecards: full CRUD builder at `/settings/scorecards` with draggable criteria
- Evaluations: interviewers can submit structured feedback against candidates per stage; draft and final submission supported

### UI built but not yet connected to Supabase
- Interviews, Offers, Employees, Inbox (all backed by in-memory stores that reset on deploy)
- Onboarding, Performance, Reports, Talent Insights (static UI, no real data)
- Sourcing pages (mock data, no external integration)

### Not yet built
- Edit job (`PUT /api/jobs/:id`)
- Schedule interview from candidate profile
- Send offer from job detail
- Notifications persistence (unread count resets on deploy)
- Email/in-app notifications when evaluations are submitted

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
npm run build   # builds to .next/
npm start
```

**Backend (runs via tsx at runtime — no compile step needed):**
```bash
cd backend
npm start       # runs server.ts via npx tsx
```

Set `NODE_ENV=production` and all required env vars before starting.

---

## License

Private — all rights reserved.
