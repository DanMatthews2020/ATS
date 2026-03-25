# Changelog

All notable changes to TeamTalent will be documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.4.0] — 2026-03-25

### 🚀 Features Built

- **Scorecard Builder** — Full page at `/settings/scorecards` where recruiters can create, edit, duplicate, and delete interview scorecards. Each scorecard has a name, description, and a draggable list of criteria. Four criterion types are supported: star rating (1–5 stars), yes/no toggle, free-text notes, and multiple choice. A live preview panel on the right shows exactly what the interviewer will see.
- **Scorecard Assignment in Workflow Builder** — Each stage in the job workflow builder now has a "Requires Scorecard" toggle. When turned on, a dropdown appears letting you choose which scorecard applies to that stage.
- **Evaluation Modal** — A `ScorecardModal` component that shows all workflow stages requiring feedback, their submission status (Pending / In Progress / Submitted), and opens an evaluation form for any selected stage. The form includes an overall recommendation grid (Strong Yes / Yes / No / Strong No) and a free-text notes field.
- **Feedback Button on Kanban Cards** — A message icon appears on candidate cards on hover in the job pipeline view. Clicking it opens the scorecard evaluation modal for that candidate.
- **Feedback Tab in Candidate Panel** — The Feedback tab now shows all interview stages with scorecards, their evaluation status, and a Submit Feedback button per stage.
- **Scorecards Link in Settings** — "Scorecards" now appears in the Settings page's left sidebar under a divider, accessible from `/settings`.

### 🔌 Connected to Backend

- Scorecard CRUD — create, read, update, delete all wired to Express API and Supabase via Prisma
- Evaluation submission — saving draft evaluations and final submissions write to `candidate_evaluations` and `evaluation_responses` tables
- Workflow stage `scorecardId` — persisted to `workflow_stages` table and loaded back with stage data
- Candidate evaluations fetched per-candidate in both the Feedback tab and evaluation modal

### 🐛 Bugs Fixed

- **EvalForm empty IDs bug** — When creating a new evaluation, `candidateId` and `jobId` were passed as empty strings instead of real values. Fixed by passing them as explicit props from the parent modal.
- **Scorecards nav not visible** — The Scorecards link was placed inside the main sidebar's fixed bottom section and clipped behind the user profile row. Moved into the Settings page's own nav where it is always visible.
- **TypeScript `Set` iteration error** — `[...new Set(...)]` spread rejected at the TS compilation target. Fixed with `Array.from(new Set(...))`.
- **CriterionType inference bug** — When mapping scorecard criteria from the API response, `type` was inferred as `string` instead of the `CriterionType` union. Fixed with an explicit cast.

### 🏗️ Infrastructure & Config

- **Prisma migration** `20260325222740_add_scorecards_and_evaluations` — adds four new tables: `scorecards`, `scorecard_criteria`, `candidate_evaluations`, `evaluation_responses`
- **Named Prisma relations** — `"StageScorecard"`, `"ScorecardCreatedBy"`, `"EvaluationSubmittedBy"` used to prevent ambiguous-relation errors
- New backend routes: `GET/POST /api/scorecards`, `GET/PATCH/DELETE /api/scorecards/:id`, `GET /api/evaluations/candidate/:candidateId`, `POST /api/evaluations`, `PATCH /api/evaluations/:id`

### 📁 Files Created or Modified

| File | What Changed |
|------|-------------|
| `backend/prisma/schema.prisma` | Added Scorecard, ScorecardCriterion, CandidateEvaluation, EvaluationResponse models; updated User, WorkflowStage, Candidate, JobPosting with new relations |
| `backend/prisma/migrations/20260325222740_.../migration.sql` | New migration — four new tables |
| `backend/src/repositories/scorecards.repository.ts` | New — Prisma queries for scorecard CRUD |
| `backend/src/services/scorecards.service.ts` | New — business logic and DTOs for scorecards |
| `backend/src/controllers/scorecards.controller.ts` | New — HTTP handlers for scorecard endpoints |
| `backend/src/routes/scorecards.routes.ts` | New — route definitions for /api/scorecards |
| `backend/src/repositories/evaluations.repository.ts` | New — Prisma queries for evaluation CRUD |
| `backend/src/services/evaluations.service.ts` | New — business logic and DTOs for evaluations |
| `backend/src/controllers/evaluations.controller.ts` | New — HTTP handlers for evaluation endpoints |
| `backend/src/routes/evaluations.routes.ts` | New — route definitions for /api/evaluations |
| `backend/src/repositories/workflows.repository.ts` | Updated to include `scorecardId` and scorecard name in stage queries |
| `backend/src/services/workflows.service.ts` | Extended `WorkflowStageDto` with `scorecardId` and `scorecardName` |
| `backend/src/routes/index.ts` | Registered scorecards and evaluations route modules |
| `src/lib/api.ts` | Added `ScorecardDto`, `EvaluationDto` types and `scorecardsApi`, `evaluationsApi` client functions; extended `WorkflowStageDto` |
| `src/app/(dashboard)/settings/scorecards/page.tsx` | New — full scorecard builder page with draggable criteria and live preview |
| `src/app/(dashboard)/settings/page.tsx` | Added Scorecards link to left nav with `ClipboardList` icon |
| `src/app/(dashboard)/jobs/[id]/workflow/page.tsx` | Added requiresScorecard toggle and scorecard dropdown per stage |
| `src/app/(dashboard)/jobs/[id]/page.tsx` | Added feedback button to kanban cards; wired ScorecardModal; passed `jobId` to CandidatePanel |
| `src/components/CandidatePanel.tsx` | Added `jobId` prop, evaluation state, Interview Scorecards section in Feedback tab |
| `src/components/ScorecardModal.tsx` | New — two-view modal for stage list and evaluation form submission |
| `src/components/layout/Sidebar.tsx` | Removed broken Scorecards sub-nav from bottom section; cleaned up Settings highlight logic |

### ⚠️ Known Issues & Incomplete Work

- Candidate Panel Feedback tab only loads evaluations when `jobId` is provided — does not load from the global Candidates page (no `jobId` available in that context)
- Interviews page is UI-only — not connected to backend
- Offers page is UI-only — not connected to backend
- Talent Insights analytics uses static/mock data — not querying real database aggregations
- People Search and AI Sourcing Agent pages are placeholder stubs
- Onboarding tasks UI exists but tasks are not persisted to a database table
- No email or in-app notifications when evaluations are submitted

### 🔜 Next Session Priority List

1. Connect the Interviews page to the backend — scheduled interviews linked to candidates and workflow stages, with the ability to add/edit interview slots
2. Connect the Offers page — create, send, and track offers for candidates moving to Pending Offer stage
3. Fix Candidate Panel Feedback tab to work from the global Candidates page (needs job resolution from the candidate's active application)
4. Wire Talent Insights to real database aggregations — hire rate, time-to-hire, pipeline velocity, source breakdown
5. Add in-app notifications when an evaluation is submitted, so hiring managers are alerted

---

## [1.3.0] — 2026-03-25

### 🚀 New Features
- **Interviews page** (`/interviews`) — Calendar-style view of scheduled interviews with status badges and candidate details
- **Offers page** (`/offers`) — Offer management board showing offer status, salary, and expiry dates
- **Employees page** (`/employees`) — Employee directory with profile cards and department filter
- **Employee Profile page** (`/employees/[id]`) — Individual employee detail page
- **Inbox page** (`/inbox`) — Notifications centre with unread count badge in sidebar
- **Sidebar unread badge** — Live unread count on the Inbox nav item, polling every 30 seconds
- **People Search page** (`/sourcing/people`) — Sourcing search interface with candidate result cards

### 🔌 Connected to Backend (Supabase)
- **Candidates list** (`/candidates`) — Replaced hardcoded data with `GET /api/candidates` (Prisma `candidate.findMany`)
- **Add Candidate form** — `POST /api/candidates` creates a real `Candidate` record in Supabase; new candidate appears in list immediately
- **Candidate Profile** (`/candidates/[id]`) — `GET /api/candidates/:id` fetches full profile with application and interview history
- **Move Stage (Candidate)** — `PATCH /api/applications/:id/stage` correctly maps display status → DB enum (`new→APPLIED`, `screening→SCREENING`, etc.)
- **Jobs list** (`/jobs`) — `GET /api/jobs` + `GET /api/jobs/stats` both read live from Supabase
- **Create Job form** (`/jobs/create`) — `POST /api/jobs` creates a real `JobPosting` record; redirects to `/jobs/[id]` on success
- **Job Detail** (`/jobs/[id]`) — `GET /api/jobs/:id` with applicant list; Close Role → `PATCH /api/jobs/:id` updates status with `closedAt` timestamp
- **Dashboard stats** — `GET /api/dashboard/stats` returns 4 live Prisma counts from Supabase (no hardcoded values)
- **Pipeline kanban** — `GET /api/jobs/:id/applications` loads real applications; drag-and-drop calls `PATCH /api/applications/:id/stage` with optimistic update and revert on failure
- **Pipeline side panel** — Save Notes → `PATCH /api/applications/:id/notes`; Reject → `PATCH /api/applications/:id/stage { status: REJECTED }`

### 🐛 Bug Fixes
- **MoveStageModal status mismatch** — `PATCH /api/applications/:id/stage` was receiving lowercase display values (`'new'`, `'screening'`) instead of the Zod-required uppercase DB enum values (`'APPLIED'`, `'SCREENING'`). Added `STATUS_TO_DB` map in `candidates/[id]/page.tsx` applied before every API call. Previously caused a 400 error on every stage change.
- **SameSite cookie blocked cross-origin** — Auth cookies set with `SameSite=lax` were silently dropped by the browser on cross-origin fetch requests (Vercel → Render). Fixed by switching to `SameSite=none; Secure` in production via `NODE_ENV` check in `auth.controller.ts`.
- **`use(params)` runtime crash** — Four dynamic route pages (`/candidates/[id]`, `/jobs/[id]`, `/performance/cycles/[id]`, `/performance/employees/[id]`) used the Next.js 15 `React.use(params)` pattern which throws at runtime in Next.js 14 where `params` is a plain synchronous object. Fixed by using direct `params.id` access.
- **SSR crash on `/jobs/create`** — `document?.activeElement?.id` called directly in JSX render threw `ReferenceError: document is not defined` during Vercel's prerender pass. Optional chaining (`?.`) handles `null`/`undefined` but not undeclared globals in Node.js. Fixed with a React `criteriaFocused` boolean state driven by `onFocus`/`onBlur`.
- **Email format validation missing** — Add Candidate form only checked for empty email, not valid format. Added regex check that shows "Enter a valid email address" inline before the POST is sent.

### 🏗️ Infrastructure
- **Health endpoint upgraded** — `GET /health` now calls `prisma.$queryRaw\`SELECT 1\`` and returns `{ status, database: "connected"|"disconnected", timestamp }`. Returns 503 if Supabase is unreachable.
- **CORS explicit methods** — Added `methods: ['GET','POST','PUT','PATCH','DELETE']` to Express CORS config to prevent method-based rejections.
- **Next.js security upgrade** — Bumped Next.js from `14.2.3` → `14.2.35` to patch 12 CVEs including an authorization bypass vulnerability.
- **Job Postings renamed to Jobs** — Route `/job-postings` → `/jobs`, nav label updated, all internal links and redirects updated across 7 files.

### 📁 Files Changed

**Backend**
- `backend/server.ts` — Added `prisma` import; upgraded `/health` to verify DB connectivity; added explicit CORS methods
- `backend/src/controllers/auth.controller.ts` — `SameSite: 'lax'` → conditional `SameSite: 'none'` in production for cross-origin cookie support
- `backend/src/controllers/candidates.controller.ts` — New: GET, POST, parse-cv, tracking endpoints
- `backend/src/controllers/jobs.controller.ts` — New: GET, POST, GET/:id, PATCH/:id, GET/:id/applications
- `backend/src/controllers/applications.controller.ts` — New: POST, PATCH/:id/stage, PATCH/:id/notes
- `backend/src/controllers/interviews.controller.ts` — New (in-memory store)
- `backend/src/controllers/offers.controller.ts` — New (in-memory store)
- `backend/src/controllers/employees.controller.ts` — New (in-memory store)
- `backend/src/controllers/notifications.controller.ts` — New (in-memory store)
- `backend/src/services/candidates.service.ts` — New: business logic with DTO mapping
- `backend/src/services/jobs.service.ts` — New: business logic with DTO mapping and stats
- `backend/src/services/applications.service.ts` — New: updateStage, updateNotes, createApplication
- `backend/src/services/interviews.service.ts` — New (in-memory)
- `backend/src/services/offers.service.ts` — New (in-memory)
- `backend/src/services/employees.service.ts` — New (in-memory)
- `backend/src/services/notifications.service.ts` — New (in-memory)
- `backend/src/repositories/candidates.repository.ts` — New: findMany, findById, create, findApplications
- `backend/src/repositories/jobs.repository.ts` — New: findMany, findById, create, update, getStats
- `backend/src/routes/candidates.routes.ts` — New: all candidate routes with auth + Zod + multer
- `backend/src/routes/jobs.routes.ts` — New: all job routes with auth + Zod
- `backend/src/routes/applications.routes.ts` — New: all application routes
- `backend/src/routes/interviews.routes.ts` — New
- `backend/src/routes/offers.routes.ts` — New
- `backend/src/routes/employees.routes.ts` — New
- `backend/src/routes/notifications.routes.ts` — New
- `backend/src/routes/index.ts` — Registered all new route modules

**Frontend**
- `src/app/(dashboard)/candidates/page.tsx` — Added email format validation in Add Candidate form
- `src/app/(dashboard)/candidates/[id]/page.tsx` — Fixed `STATUS_TO_DB` mapping for Move Stage; fixed `use(params)` → direct `params.id`
- `src/app/(dashboard)/jobs/page.tsx` — Full API integration (was referencing old mock data indirectly)
- `src/app/(dashboard)/jobs/create/page.tsx` — Fixed SSR crash; updated redirects to `/jobs/`
- `src/app/(dashboard)/jobs/[id]/page.tsx` — New: full detail view fetching from Prisma; correct status→enum mapping
- `src/app/(dashboard)/interviews/page.tsx` — New page
- `src/app/(dashboard)/offers/page.tsx` — New page
- `src/app/(dashboard)/employees/page.tsx` — New page
- `src/app/(dashboard)/employees/[id]/page.tsx` — New page
- `src/app/(dashboard)/inbox/page.tsx` — New page
- `src/app/(dashboard)/sourcing/people/page.tsx` — New page
- `src/components/layout/Sidebar.tsx` — Added unread notification badge polling `/notifications/unread-count`
- `src/lib/api.ts` — Added candidatesApi, applicationsApi, full jobsApi; added `downloadBlob`/`exportCsv` SSR guards
- `src/lib/constants.ts` — Updated nav item: `Job Postings → Jobs`, `href: /job-postings → /jobs`
- `src/types/index.ts` — Added Calendar, FileCheck, Building2, Bell to IconName union; renamed JobPostingFormData → JobFormData
- `package.json` — Next.js bumped to 14.2.35

### ⚠️ Known Issues
- **Interviews, Offers, Employees, Inbox pages** use in-memory stores on the backend — data resets on every Render deployment. These need Prisma repository layers wired to Supabase to persist.
- **Sourcing pages** (`/sourcing/people`, `/sourcing/ai-agent`, `/sourcing/unified`) still show mock data — no external data source is integrated yet.
- **Schedule Interview button** on candidate profiles shows "coming soon" toast — not yet wired to the Interviews table.
- **Send Offer button** on job detail shows "coming soon" toast — not yet wired to the Offers table.
- **Edit job** button on `/jobs/[id]` shows "coming soon" — `PUT /api/jobs/:id` endpoint not yet built.
- **CV parsing** requires `ANTHROPIC_API_KEY` set on Render — currently shows a graceful fallback to manual entry if not configured.
- **4 remaining `high` CVEs** in Next.js — require upgrading to Next.js 15 which involves breaking changes; deferred.

### 🔜 Next Session — To Do
1. **Wire Interviews page to Supabase** — Build `interviews.repository.ts` with Prisma, connect `POST /api/interviews` and `GET /api/interviews` to real DB; wire the "Schedule Interview" button on candidate profiles
2. **Wire Offers page to Supabase** — Build `offers.repository.ts`, connect the "Send Offer" button on job detail pages; link offer status to the Pipeline
3. **Edit Job functionality** — Build `PUT /api/jobs/:id` endpoint and wire the Edit button on `/jobs/[id]` to a form pre-populated with existing job data
4. **Add Anthropic API key to Render** — Set `ANTHROPIC_API_KEY` env var on Render to enable CV parsing in the Add Candidate drawer
5. **Upgrade to Next.js 15** — Resolve the 4 remaining high CVEs; update `params` type signatures from `{ id: string }` to `Promise<{ id: string }>` across all dynamic pages

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
