# Changelog

All notable changes to TeamTalent will be documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.1.0] — 2026-03-23

### Added
- **Render deployment** — Backend deployed to `https://teamtalent-backend.onrender.com`
- **Vercel deployment** — Frontend live at `https://teamtalentats.vercel.app`
- **render.yaml** — Render service configuration file (`buildCommand`, `startCommand`, `NODE_ENV`)
- **Health endpoint** — `GET /health` returns `{ status: "ok", timestamp }` for uptime monitoring
- **.npmrc** — Forces full dependency install regardless of `NODE_ENV` on Render

### Fixed
- **Render build: devDependencies skipped** — Moved all `@types/*`, `prisma`, and `typescript` to `dependencies` so they install under `NODE_ENV=production`
- **Render build: tsc compilation** — Replaced `tsc` compile step with `tsx` runtime to eliminate TypeScript build errors on Render
- **Seed script type error** — Fixed `prismaOptions` type (`{}` → `undefined`) which caused `TS2345` on strict TypeScript builds
- **CORS mismatch** — Updated `FRONTEND_URL` from `localhost:3000` to match actual Vercel deployment URL
- **Parallel seed inserts** — Converted all `Promise.all` bulk inserts to sequential `for...of` loops to avoid Supabase session pooler `MaxClientsInSessionMode` error

---

## [1.0.0] — 2026-03-23

### Added

#### Frontend
- **Authentication** — Login page with JWT-based auth, httpOnly cookie storage, silent token refresh via interceptor, and protected route group
- **Dashboard** — Live KPI stats (open roles, active candidates, interviews, offers), recent job listings, and candidate tracking cards; all data fetched from the live API
- **Job Postings** — Paginated job listing page with status badges and application counts; create job form
- **Candidates** — Candidate tracking list with application status pipeline display
- **Pipeline** — Kanban-style board showing candidates across hiring stages
- **Sourcing Hub** — Landing hub with links to People Search, AI Sourcing Agent, and Unified Search sub-pages
- **People Search** — Searchable candidate directory with filter controls
- **AI Sourcing Agent** — Agent control panel with start/pause toggle, configuration options, and run history
- **Unified Search** — Multi-channel search across LinkedIn, GitHub, Internal Pool, and Referrals
- **Talent Insights** — Analytics page with time-to-hire trends, source breakdown pie chart, and pipeline funnel (Recharts)
- **Performance** — Team performance dashboard with score distribution, competency radar chart, review cycle cards, goals tracker, and team table
- **Reports** — Report library with 20 pre-built reports across 5 categories; search/filter; recent runs table
- **Onboarding** — New-hire onboarding task manager with categories, status tracking, and progress overview
- **UI Component Library** — `Button`, `Card`, `Badge`, `Input`, `Avatar` primitives with Tailwind + CSS custom property theming
- **Sidebar Navigation** — Collapsible sidebar with grouped navigation sections

#### Backend
- **Express API** — RESTful API with CORS, cookie-parser, global error handler, and 404 middleware
- **Authentication endpoints** — Login, refresh (token rotation), logout, and `/me` profile endpoint
- **Dashboard endpoint** — Parallel stat queries for KPI counts
- **Jobs endpoint** — Paginated job postings with application counts
- **Candidates endpoint** — Paginated candidate tracking with application + job data
- **JWT auth** — Access tokens (15 min) + refresh tokens (7 days) stored in httpOnly cookies
- **Zod validation** — Request body validation middleware for all mutating endpoints
- **Prisma ORM** — Full schema for Users, JobPostings, Candidates, Applications, Interviews, Offers, Employees, OnboardingTasks
- **Database migration** — Initial migration (`20260323142457_init`) creating all tables on Supabase PostgreSQL
- **Seed data** — 2 users, 8 job postings, 20 candidates, 30 applications, 10 interviews, 5 offers

#### Infrastructure
- Supabase PostgreSQL with transaction pooler (runtime) and session pooler (migrations)
- PgBouncer-compatible Prisma config (`?pgbouncer=true`)
- Playwright E2E test suite (auth, candidates, navigation, pipeline)
- Comprehensive README, CHANGELOG, and `.env.example` files
